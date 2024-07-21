import React, { useState, useEffect, useCallback, useContext } from "react";
import "./modal.css";
import DragDrop from "./DragDrop";
import openai from "../openai";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { CalendarContext } from "../CalendarContext";
import { AccountContext } from "../Account";

const Modal = ({ addClassToList, closeModal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [duration, setDuration] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, updateChat] = useState([
    {
      role: "system",
      content:
        "Create a week-by-week study planner for the first 4 weeks of this class, with varying amounts of study sessions per week depending on the workload (e.g., homework due, exam coming up). Each study session should include the date, duration, and specific content to cover for the next homework, exam, or project. If you need additional information to create a detailed planner with specific content for each study session, respond with the format: True {\"questions\": [\"Question1\", \"Question2\", \"Last Question\"]}. If you can create a specific week-by-week planner with specific content for each study session, respond in the following exact format (JSON format). Nothing other than these exact formats should be given in the response, it must be exactly as stated in the formats given. Maximum of 2 study sessions per week" +
        `[{
          "week": "Week X",
          "sessions": [
            {
              "title": "StudySessionA",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Specific content to cover"
            },
            {
              "title": "StudySessionB",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Specific content to cover"
            }
            ...
          ]
        }
        **Repeat for each week, label each study session the next letter, I.E: StudySession A, B, C, D, E, ... Make sure no study session's have the same title**
    ]`,
    },
  ]);
  const [userMessage, updateUserMessage] = useState("");
  const [chatResponse, updateResponse] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const { setCalendarEvents } = useContext(CalendarContext);
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSessionData(session);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    console.log(chatMessages);
  }, [chatMessages]);

  const addCalendarEvent = async (calendarEvent) => {
    if (sessionData) {
      const idToken = sessionData.getIdToken().getJwtToken();
      const userId = sessionData.getIdToken().payload.sub;
      try {
        const response = await fetch(
          "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/addCalendarEvents/",
          {
            method: "POST",
            headers: {
              Authorization: idToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
              title: calendarEvent.title,
              startDate: calendarEvent.startDate,
              endDate: calendarEvent.endDate,
              content: calendarEvent.content,
              className: calendarEvent.className,
            }),
          }
        );
        const data = await response.json();
        if (response.ok) {
          console.log("Response from API:", data);
        } else {
          console.error("Failed to add class:", data.error);
        }
      } catch (err) {
        console.error("Error adding class:", err);
      }
    } else {
      console.error("User is not authenticated");
    }
  };

  const parseResponseForQuestions = (response) => {
    if (response.startsWith("True")) {
      const jsonResponse = response.substring(5);
      const parsedQuestions = JSON.parse(jsonResponse);
      setQuestions(parsedQuestions.questions);
      return parsedQuestions.questions;
    } else {
      const calendarEvents = parseCalendarResponse(response);
      for (let i = 0; i < calendarEvents.length; i++) {
        addCalendarEvent(calendarEvents[i]);
      }
      setQuestions([]);
    }
    return [];
  };

  const onFilesAdded = useCallback((files) => {
    setUploadedFiles(files);
    setIsLoading(true); // Show loading spinner
    const readers = files.map(async (file) => {
      if (file.type === "application/pdf") {
        return await readPDF(file);
      } else if (file.type === "image/png") {
        return await readPNG(file);
      } else {
        throw new Error("Unsupported file type");
      }
    });
    Promise.all(readers)
      .then((contents) => {
        setFileContents(contents);
        setIsLoading(false); // Hide loading spinner
      })
      .catch((error) => {
        console.error("Error reading files:", error);
        setIsLoading(false); // Hide loading spinner
      });
  }, []);

  const processQuestion = async () => {
    const filesContent = fileContents.join("\n\n");
    const newMessage = {
      role: "user",
      content: userMessage + filesContent,
    };
    const updatedChatMessages = [...chatMessages, newMessage];
    updateChat(updatedChatMessages);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: updatedChatMessages,
    });
    updateResponse(response);
    console.log(response.choices[0].message.content);
    parseResponseForQuestions(response.choices[0].message.content);
  };

  const readPDF = async (file) => {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ");
    }
    return text;
  };

  const readPNG = async (file) => {
    const result = await Tesseract.recognize(URL.createObjectURL(file), "eng");
    console.log(result.data.text);
    return result.data.text;
  };

  const updateAnswersArray = (newValue, question) => {
    setQuestionAnswers((prevAnswers) => ({
      ...prevAnswers,
      [question]: newValue,
    }));
  };

  const submitAdditionalQuestions = async (event) => {
    event.preventDefault();
    const answersString = JSON.stringify(questionAnswers);
    const newMessage = {
      role: "user",
      content:
        "Here are the answers to the additional questions you asked. If additional questions are needed, or more clarification is needed on a certain question, give me the questions in the same format. If not then make the class schedule in the same format as given previously" +
        answersString,
    };

    const updatedChatMessages = [...chatMessages, newMessage];
    updateChat(updatedChatMessages);
    console.log(updatedChatMessages);
    const airesponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: updatedChatMessages,
    });
    console.log(airesponse.choices[0].message.content);
    updateResponse(airesponse.choices[0].message.content);

    parseResponseForQuestions(airesponse.choices[0].message.content);
  };

  const parseCalendarResponse = (response) => {
    const cleanedResponse = response.replace(/```json|```/g, '');
    const parsedResponse = JSON.parse(cleanedResponse);
    const events = [];
    parsedResponse.forEach((week) => {
      week.sessions.forEach((session) => {
        events.push({
          title: session.title,
          startDate: new Date(`${session.date}T${session.startTime}:00`),
          endDate: new Date(`${session.date}T${session.endTime}:00`),
          content: session.content,
          className: className,
        });
      });
    });
    closeModal();
    setQuestions([]);
    setQuestionAnswers([]);
    addClassToList(className);
    setClassName("");
    return events;
  };

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        {isLoading && <div className="loading-overlay"><div className="spinner"></div></div>}
        <div className={`form ${isLoading ? "blurred" : ""}`}>
          <div className="modal-header">
            <h2>Enter Class Details</h2>
            <div className="close-icon toggleButton" onClick={closeModal}>
              &times;
            </div>
          </div>
          <div className="modal-content">
            {questions.length !== 0 ? (
              <>
                <h2>Please answer additional questions</h2>
                {questions.map((question, index) => (
                  <div className="row" key={index}>
                    <div className="input-group">
                      <input
                        type="text"
                        name={question}
                        className="input"
                        onChange={(e) => {
                          updateAnswersArray(e.target.value, question);
                        }}
                        required
                      />
                      <label className="label">{question}</label>
                    </div>
                  </div>
                ))}
                <button className="button" onClick={submitAdditionalQuestions}>
                  Submit
                </button>
              </>
            ) : (
              <>
                <div className="input-group">
                  <input
                    name="ClassName"
                    className="input"
                    onChange={(e) => {
                      setClassName(e.target.value);
                    }}
                  />
                  <label className="label">Name of Class</label>
                </div>
                <div id="drag-and-drop">
                  <DragDrop onFilesAdded={onFilesAdded} />
                  <br />
                </div>
              </>
            )}
          </div>
          {questions.length === 0 && (
            <div className="modal-footer">
              <button onClick={processQuestion} className="button">
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
