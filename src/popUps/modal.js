import React, { useState, useEffect, useCallback, useContext } from "react";
import "./modal.css";
import DragDrop from "./DragDrop";
import openai from "../openai";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { CalendarContext } from "../CalendarContext";
import { AccountContext } from "../Account";
const scheduleStringResponse = `[
{
      "week": "Week 1",
      "sessions": [
        {
          "title": "Session1",
          "date": "2022-01-23",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Section 1.1 - The Geometry and Algebra of Vectors"
        },
        {
          "title": "Session2",
          "date": "2022-01-25",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Section 1.2 - Length and Angle: The Dot Product"
        }
      ]
    },
    {
      "week": "Week 2",
      "sessions": [
        {
          "title": "Session3",
          "date": "2022-01-30",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Section 2.1 - Introduction to Linear Systems"
        },
        {
          "title": "Session4",
          "date": "2022-02-01",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Section 2.2 - Direct Methods for Solving Linear Systems"
        }
      ]
    },
    {
      "week": "Week 3",
      "sessions": [
        {
          "title": "Session5",
          "date": "2022-02-06",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Section 2.3 - Spanning Sets Linear Independence"
        },
        {
          "title": "Session6",
          "date": "2022-02-08",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Review for Section 2.2 - Direct Methods for Solving Linear Systems and prep for quiz"
        }
      ]
    },
   {
      "week": "Week 4",
      "sessions": [
        {
          "title": "Session7",
          "date": "2022-02-13",
          "startTime": "16:00",
          "endTime": "18:00",
          "content": "Section 3.1 - Matrix Operations"
        },
       {
          "title": "Session8",
           "date": "2022-02-15",
           "startTime": "16:00", 
          "endTime": "18:00",
          "content": "Section 3.2 - Matrix Algebra"
        }
      ]
    }
]`;

const response =
  "True {What is the subject or topics of this class?} {What are the specific learning objectives or outcomes for each week?} {What are the homework or assignments with their specific requirements and due dates?} {When are the exact dates for the exams?} {What are the specifics of the project or projects for this class?}";

const Modal = ({ addClassToList, closeModal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [duration, setDuration] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [chatMessages, updateChat] = useState([
    {
      role: "system",
      content:
        "Create a week-by-week study planner for the first 4 weeks of this class, with varying amounts of study sessions per week depending on the workload (e.g., homework due, exam coming up). Each study session should include the date, duration, and specific content to cover for the next homework, exam, or project. If you need additional information to create a detailed planner with specific content for each study session, respond with the format: True {Question1} {Question2} ... {Last Question}. If you can create a specific week-by-week planner with specific content for each study session, respond in the following exact format (JSON format):" +
        `[{
          "week": "Week X",
          "sessions": [
            {
              "title": "Study Session 1",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Specific content to cover"
            },
            {
              "title": "Study Session 2",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Specific content to cover"
            }
            ...
          ]
        }
        **Repeat for each week**
    ]`,
    },
  ]);
  const [userMessage, updateUserMessage] = useState("");
  const [chatResponse, updateResponse] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState([]);
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
      const questions = response.substring(5).split("} {");
      questions[0] = questions[0].replace("{", ""); // Clean up the first element
      questions[questions.length - 1] = questions[questions.length - 1].replace(
        "}",
        ""
      ); // Clean up the last element
      return questions;
    }
    return [];
  };

  const onSubmit = (event) => {
    event.preventDefault();
    //addClassToList(className);
  };

  const onFilesAdded = useCallback((files) => {
    setUploadedFiles(files);
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
      })
      .catch((error) => console.error("Error reading files:", error));
  }, []);

  const processQuestion = async () => {
    const filesContent = fileContents.join("\n\n");
    const newMessage = {
      role: "user",
      content: userMessage + filesContent,
    };
    const updatedChatMessages = [...chatMessages, newMessage];
    updateChat(updatedChatMessages);
    console.log(updatedChatMessages);
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: updatedChatMessages,
    // });
    updateResponse(response);
    const extractedQuestions = parseResponseForQuestions(
      response //response.choices[0].message.content
    );
    setQuestions(extractedQuestions);
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

  const updateAnswersArray = (newValue, index) => {
    setQuestionAnswers(() => {
      const updatedAnswers = [...questionAnswers];
      updatedAnswers[index] = newValue;
      console.log(updatedAnswers);
      return updatedAnswers;
    });
  };

  const submitAdditionalQuestions = async (event) => {
    event.preventDefault();
    // const answersString = questionAnswers
    //   .map((answer, index) => `Question ${index + 1} answer: ${answer}`)
    //   .join(" ");
    // const newMessage = {
    //   role: "user",
    //   content:
    //     "Here are the answers to the additional questions you asked. If additional questions are needed, or more clarification is needed on a certain question, give me the questions in the same format. If not then make the class schedule in the same format as given perviously" +
    //     answersString,
    // };

    // const updatedChatMessages = [...chatMessages, newMessage];
    // updateChat(updatedChatMessages);
    // console.log(updatedChatMessages);
    // const airesponse = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: updatedChatMessages,
    // });
    // console.log(airesponse.choices[0].message.content);
    // updateResponse(airesponse.choices[0].message.content);

    const calendarEvents = parseCalendarResponse(scheduleStringResponse);
    console.log(calendarEvents);
    for (let i = 0; i < calendarEvents.length; i++) {
      addCalendarEvent(calendarEvents[i]);
    }
    //setCalendarEvents(calendarEvents);
  };

  const parseCalendarResponse = (response) => {
    const parsedResponse = JSON.parse(response);
    const events = [];
    parsedResponse.forEach((week) => {
      week.sessions.forEach((session) => {
        events.push({
          title: session.title,
          startDate: new Date(`${session.date}T${session.startTime}:00`),
          endDate: new Date(`${session.date}T${session.endTime}:00`),
          content: session.content,
        });
      });
    });
    closeModal();
    setQuestions([]);
    setQuestionAnswers([]);
    return events;
  };

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <form className="form">
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
                          updateAnswersArray(e.target.value, index);
                        }}
                        required
                      />
                      <label className="label">{question}</label>
                    </div>
                  </div>
                ))}
                <button
                  className="button"
                  onClick={submitAdditionalQuestions}
                >
                  Submit
                </button>
              </>
            ) : (
              <>
                <div className="input-group">
                  <input
                    type="test"
                    name="ClassName"
                    className="input"
                    onChange={(e) => {
                      setClassName(e.target.value);
                    }}
                    required
                  />
                  <label className="label">Name of Class</label>
                </div>
                <div id="drag-and-drop">
                  <DragDrop onFilesAdded={onFilesAdded} />
                  <br></br>
                </div>
              </>
            )}
          </div>
          {questions.length === 0 && (
            <div className="modal-footer">
              <button
                type="button"
                className="button toggleButton"
                onClick={closeModal}
              >
                Close
              </button>
              <button
                type="submit"
                onClick={processQuestion}
                className="button"
              >
                Add
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Modal;