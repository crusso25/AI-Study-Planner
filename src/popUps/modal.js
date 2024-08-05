import React, { useState, useEffect, useCallback, useContext } from "react";
import "./modal.css";
import DragDrop from "./DragDrop";
import openai from "../openai";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { AccountContext } from "../Account";
import AddEventModal from "./AddEventModal";

const Modal = ({ addClassToList, closeModal }) => {
  const [className, setClassName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, updateChat] = useState([
    {
      role: "system",
      content:
        'Given information on this class, extract the due dates for the whole semester (Exams, Quizes, Projects, Assignments, etc...). If you need additional information, respond with the format: True {"questions": ["Question1", "Question2", "Last Question"]}. If enough information is given the, give your response in this exact format (JSON format). Nothing other than these exact formats should be given in the response, it must be exactly as stated in the formats given.' +
        `[{
          "week": "Week X",
          "sessions": [
            {
              "title": "Exam/Quiz/Project/Assignment-1",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Content covered for this event",
              "type": "(Exam/Quiz/Project/Assignment etc...)"
            },
            {
              "title": "Exam/Quiz/Project/Assignment-1",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Content covered for this event",
              "type": "(Exam/Quiz/Project/Assignment etc...)"
            }
            ...
          ]
        }
        **Repeat for each week, make sure that no title has the same name for any session. For testing purposes make start time 10:00 and end time 12:00.**
    ]`,
    },
  ]);
  const [userMessage, updateUserMessage] = useState("");
  const [chatResponse, updateResponse] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [reviewStep, setReviewStep] = useState(0);
  const [isEditing, setIsEditing] = useState({});
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [addingEventType, setAddingEventType] = useState(null);

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
              type: calendarEvent.type,
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

  const parseResponse = async (response) => {
    if (response.startsWith("True")) {
      const jsonResponse = response.substring(5);
      const parsedQuestions = JSON.parse(jsonResponse);
      setQuestions(parsedQuestions.questions);
      return parsedQuestions.questions;
    } else {
      const calendarEvents = parseCalendarResponse(response);
      setCalendarEvents(calendarEvents);
      setReviewStep(1);
    }
    return [];
  };

  const addEventsForUser = async (calendarEvents) => {
    for (let i = 0; i < calendarEvents.length; i++) {
      await addCalendarEvent(calendarEvents[i]);
    }
  };

  const onFilesAdded = useCallback((files) => {
    setUploadedFiles(files);
    setIsLoading(true);
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
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error reading files:", error);
        setIsLoading(false);
      });
  }, []);

  const processQuestion = async () => {
    setIsLoading(true);
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
    await parseResponse(response.choices[0].message.content);
    setIsLoading(false);
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
    setIsLoading(true);
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

    parseResponse(airesponse.choices[0].message.content);
    setIsLoading(false);
  };

  const parseCalendarResponse = (response) => {
    const cleanedResponse = response.replace(/```json|```/g, "");
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
          type: session.type,
        });
      });
    });
    return events;
  };

  const submitEvents = async () => {
    setIsLoading(true);
    await addEventsForUser(calendarEvents);
    await addClassToList(className, fileContents);
    setClassName("");
    closeModal();
    setQuestions([]);
    setQuestionAnswers([]);
    setCalendarEvents([]);
    setIsLoading(false);
    setFileContents("");
  };

  const eventTypes = ["Exam", "Project", "Assignment"];

  const handleEditClick = (index) => {
    setIsEditing((prev) => ({ ...prev, [index]: true }));
  };

  const handleTitleChange = (e, globalIndex) => {
    const updatedEvents = [...calendarEvents];
    updatedEvents[globalIndex].title = e.target.value;
    setCalendarEvents(updatedEvents);
  };

  const handleDateChange = (e, globalIndex) => {
    const updatedEvents = [...calendarEvents];
    updatedEvents[globalIndex].startDate = new Date(e.target.value);
    updatedEvents[globalIndex].endDate = new Date(e.target.value);
    setCalendarEvents(updatedEvents);
  };

  const handleContentChange = (event, globalIndex) => {
    const updatedEvents = [...calendarEvents];
    updatedEvents[globalIndex].content = event.target.value;
    setCalendarEvents(updatedEvents);
  };

  const handleDoneClick = (index) => {
    setIsEditing((prev) => ({ ...prev, [index]: false }));
  };

  const renderReviewStep = () => {
    if (reviewStep > eventTypes.length) {
      return (
        <>
          <div className="modal-content">
            <h2>All Events Reviewed</h2>
          </div>
          <div className="modal-footer">
            <button className="button" onClick={submitEvents}>
              Finish
            </button>
          </div>
        </>
      );
    }

    const currentType = eventTypes[reviewStep - 1];
    const eventsOfType = calendarEvents.filter(
      (event) => event.type.toLowerCase() === currentType.toLowerCase()
    );

    return (
      <>
        <div className="modal-header">
          <h2>Review {currentType} Information</h2>
          <div className="close-icon toggleButton" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-content">
          <span>
            Please make sure that all {currentType}s for this class were picked
            up.{" "}
          </span>
          {currentType == "Exam" && (
            <p>
              Make sure that all of the content covered on the exams is
              included. This will make the generated study plans more helpful.
            </p>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAddingEventType(currentType)}
          >
            Add
          </button>
          {eventsOfType.map((event, index) => {
            const globalIndex = calendarEvents.indexOf(event);
            return (
              <div key={index} className="event-review">
                <p className="event-title">{event.title}</p>
                <p className="event-date">
                  {event.startDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {addingEventType && (
                  <AddEventModal
                    className={className}
                    eventType={currentType}
                    closeModal={() => {
                      setAddingEventType(false);
                    }}
                    addEvent={async (newEvent, session) => {
                      const updatedEvents = [...calendarEvents, newEvent];
                      setCalendarEvents(updatedEvents);
                      console.log(updatedEvents);
                    }}
                    fetchEvents={null}
                  />
                )}
                {isEditing[globalIndex] ? (
                  <>
                    <input
                      type="text"
                      value={event.title}
                      onChange={(e) => handleTitleChange(e, globalIndex)}
                    />
                    <input
                      type="date"
                      value={event.startDate.toISOString().split("T")[0]}
                      onChange={(e) => handleDateChange(e, globalIndex)}
                    />
                    <textarea
                      value={event.content}
                      onChange={(e) => handleContentChange(e, globalIndex)}
                    />
                    <button className="button done-button" onClick={() => handleDoneClick(globalIndex)}>
                      Done
                    </button>
                  </>
                ) : (
                  <p>{event.content}</p>
                )}
                {!isEditing[globalIndex] && (
                  <button className="button edit-button" onClick={() => handleEditClick(globalIndex)}>
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="modal-footer">
          <button
            className="button continue-button"
            onClick={() => setReviewStep(reviewStep + 1)}
          >
            Continue
          </button>
        </div>
        
      </>
    );
  };

  return (
    <div className="modal open">
      <div className="modal-overlay"></div>
      <div className="modal-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        <div className={`form ${isLoading ? "blurred" : ""}`}>
          {reviewStep === 0 && (
            <>
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
            </>
          )}
          {questions.length === 0 && reviewStep === 0 && (
            <div className="modal-footer">
              <button onClick={processQuestion} className="button">
                Add
              </button>
            </div>
          )}
          {reviewStep > 0 && renderReviewStep()}
        </div>
      </div>
    </div>
  );
};

export default Modal;
