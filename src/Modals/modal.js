import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DragDrop from "./DragDrop";
import openai from "../openai";
import * as pdfjsLib from "pdfjs-dist/webpack";
import Tesseract from "tesseract.js";
import { AccountContext } from "../User/Account";
import EnterManuallyModal from "./EnterManuallyModal";
import "./modal.css";

const Modal = ({ addClassToList, closeModal }) => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const [className, setClassName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [assignmentTypes, setAssignmentTypes] = useState([
    { name: "Exam", checked: true, required: true },
    { name: "Lecture", checked: true, required: true },
    { name: "Homework", checked: false, required: false },
    { name: "Project", checked: false, required: false },
  ]);
  const [newAssignmentType, setNewAssignmentType] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, updateChat] = useState([]);
  const [userMessage, updateUserMessage] = useState("");
  const [chatResponse, updateResponse] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [calendarEvents, setCalendarEvents] = useState([]);
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formattedFileContent, setFormattedFileContent] = useState("");
  const [checkWarning, setCheckWarning] = useState(false);
  const [syllabusContents, setSyllabusContents] = useState("");
  const navigate = useNavigate();

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
    console.log(syllabusContents);
  }, []);

  const assignmentTypesToString = () => {
    return assignmentTypes
      .filter((type) => type.checked)
      .map((type) => type.name)
      .join(", ");
  };

  const addCalendarEvent = async (calendarEvent) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;
      try {
        const response = await fetch(
          `https://api.studymaster.io/api/users/${userId}/calendarevents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
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
    let filesContent = syllabusContents;
    if (fileContents.length !== 0) {
      filesContent = fileContents.join("\n\n");
    }
    const newMessage = [
      {
        role: "system",
        content:
          "Given the information on this class, extract events for the course syllabus. Categorize all events into one of the specified event types for the class (" +
          assignmentTypesToString() +
          ", or 'Other'). All events from the syllabus must be in this schedule, if an event does not fit any of the specified event types for the class, then its type should be 'Other'. The output must be provided strictly in the JSON format specified below. Do not include any additional information, explanations, or text outside of the JSON structure. The JSON must adhere exactly to the structure provided, without any deviations:" +
          `[
              {
                "week": "Week X",
                "sessions": [
                  {
                    "title": "{title of event}",
                    "date": "YYYY-MM-DD",
                    "startTime": "XX:XX",
                    "endTime": "XX:XX",
                    "content": "{Content / topic covered for this event}",
                    "type": "{One of the types provided, or 'Other' if it does not fit any of the provided categories}"
                  },
                  {
                    "title": "{title of event}",
                    "date": "YYYY-MM-DD",
                    "startTime": "XX:XX",
                    "endTime": "XX:XX",
                    "content": "{Content / topic covered for this event}",
                    "type": "{One of the types provided, or 'Other' if it does not fit any of the provided categories}"
                  }
                  // Add more sessions as necessary, each following the same structure.
                ]
              }
              // Repeat the above structure for each week, ensuring that:
              // 1. No session has the same title.
              // 2. The start time for each event is 10:00, and the end time is 12:00.
              // 3. The class start date is ${startDate.toString()}. The first event from the syllabus should be close to the start date for the course, if not then adjust all dates for these events to start at this classes start date.
            ]`,
      },
      {
        role: "user",
        content: filesContent,
      },
    ];
    updateChat(newMessage);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: newMessage,
    });
    updateResponse(response);
    console.log(response.choices[0].message.content);
    await parseResponse(response.choices[0].message.content);
    setCurrentStep(3);
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
    setFormattedFileContent(result.data.text);
    return result.data.text;
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

  const submitEvents = async (filteredEvents) => {
    setIsLoading(true);
    await addEventsForUser(filteredEvents);
    await addClassToList(className, formattedFileContent);
    setClassName("");
    closeModal();
    setQuestions([]);
    setQuestionAnswers({});
    setCalendarEvents([]);
    setIsLoading(false);
    setFileContents([]);
    setFormattedFileContent("");
  };

  const handleCheckboxChange = (index) => {
    const updatedAssignmentTypes = [...assignmentTypes];
    const type = updatedAssignmentTypes[index];

    if (type.required) {
      setCheckWarning(true);
      return;
    }
    setCheckWarning(false);

    updatedAssignmentTypes[index].checked =
      !updatedAssignmentTypes[index].checked;
    setAssignmentTypes(updatedAssignmentTypes);
  };

  const handleAddAssignmentType = () => {
    if (newAssignmentType.trim()) {
      setAssignmentTypes([
        ...assignmentTypes,
        { name: newAssignmentType, checked: true, required: false },
      ]);
      setNewAssignmentType("");
    }
  };

  const renderInitialStep = () => (
    <>
      <div className="modal-header">
        <h2>Enter Course Details</h2>
        <div className="close-icon toggleButton" onClick={closeModal}>
          &times;
        </div>
      </div>
      <div className="modal-content">
        <div className="d-flex flex-row">
          <div
            className="d-flex flex-column justify-content-center"
            style={{ width: "50%" }}
          >
            <div className="input-group">
              <input
                className="input"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
              <label className="label">Name of Course</label>
            </div>
            <div className="input-group">
              <h5>Course Start Date: </h5>
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="assignment-types">
            <h5>Course Event Types</h5>
            {checkWarning && (
              <p>You must have Exam and Lecture Topics event types</p>
            )}
            {assignmentTypes.map((type, index) => (
              <div key={index} className="checkbox-group">
                <input
                  type="checkbox"
                  checked={type.checked}
                  onChange={() => handleCheckboxChange(index)}
                />
                <label>{type.name}</label>
              </div>
            ))}
            <div className="input-group new-assignment-type">
              <input
                type="text"
                value={newAssignmentType}
                onChange={(e) => setNewAssignmentType(e.target.value)}
                placeholder="Add new type"
              />
              <button
                onClick={handleAddAssignmentType}
                className="button add-button"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div
          className="d-flex flex-column align-items-center justify-content-center"
          style={{ height: "100%", marginBottom: "140px" }}
        >
          <h3>How will you enter course information?</h3>
          <br />
          <div className="d-flex justify-content-center align-items-center">
            <button
              className="button"
              onClick={() => {
                setCurrentStep(2);
                setIsManualEntry(false);
              }}
            >
              Upload Syllabus
            </button>
            <h5>or</h5>
            <button
              className="button"
              onClick={() => {
                setIsManualEntry(true);
                setCurrentStep(2);
              }}
            >
               Enter Events Manually
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="modal open">
      <div className="modal-overlay"></div>
      <div className="modal-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="loading-message">Loading content...</div>
          </div>
        )}
        <div className={`form ${isLoading ? "blurred" : ""}`}>
          {currentStep === 0 && renderInitialStep()}
          {currentStep === 2 && !isManualEntry && (
            <>
              <div className="modal-header">
                <h2>Upload Syllabus</h2>
                <div
                  className="small-back-button"
                  onClick={() => {
                    setCurrentStep(0);
                  }}
                >
                  Back
                </div>
              </div>
              <div
                style={{ width: "100%" }}
                className="modal-content d-flex flex-column align-items-center justify-content-between"
              >
                <div style={{ width: "100%" }} id="drag-and-drop">
                  <DragDrop
                    onFilesAdded={onFilesAdded}
                    resetFilesUploaded={syllabusContents}
                  />
                  <br />
                </div>
                <h2>or</h2>
                <textarea
                  value={syllabusContents}
                  onChange={(e) => {
                    setSyllabusContents(e.target.value);
                  }}
                  style={{ height: "200px" }}
                  placeholder="Paste Syllabus Details"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button onClick={processQuestion} className="button">
                  Add
                </button>
              </div>
            </>
          )}
          {currentStep === 2 && isManualEntry && (
            <EnterManuallyModal
              closeModal={() => {
                setCurrentStep(0);
              }}
              addEvent={(event) => {
                setCalendarEvents([...calendarEvents, event]);
              }}
              className={className}
              calendarEvents={calendarEvents}
              assignmentTypes={assignmentTypes}
              uploadEvents={async (updatedCalendarEvents) => {
                submitEvents(updatedCalendarEvents);
              }}
            />
          )}
          {currentStep === 3 && (
            <EnterManuallyModal
              closeModal={async () => {
                const filteredEvents = calendarEvents.filter(
                  (event) => event.type !== "Other"
                );
                await submitEvents(filteredEvents);
                closeModal();
              }}
              addEvent={(event) => {
                setCalendarEvents([...calendarEvents, event]);
              }}
              className={className}
              calendarEvents={calendarEvents}
              assignmentTypes={assignmentTypes}
              deleteEvent={(event) => {
                const updatedEvents = calendarEvents.filter(
                  (calendarEvent) =>
                    calendarEvent.title !== event.title ||
                    calendarEvent.className !== event.className
                );
                setCalendarEvents(updatedEvents);
              }}
              uploadEvents={async (updatedCalendarEvents) => {
                await submitEvents(updatedCalendarEvents);
                navigate("../");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
