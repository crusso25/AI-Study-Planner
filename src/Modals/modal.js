import React, { useState, useEffect, useCallback, useContext } from "react";
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
    { name: "Exam", checked: true },
    { name: "Lecture", checked: true },
    { name: "Homework", checked: true },
    { name: "Project", checked: true },
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
    console.log(fileContents);
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
          `http://localhost:8080/api/users/${userId}/calendarevents`,
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
    const filesContent = fileContents.join("\n\n");
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
    console.log(result.data.text);
    const reformatPng = [
      {
        role: "system",
        content:
          "I am going to give you a course syllabus that was given as a png and parsed to text. Give this syllabus back in human readable format. Do not include anything other than the syllabus in human readable format in your response. ",
      },
      {
        role: "user",
        content: "Here is the png parsed syllabus: " + result.data.text,
      },
    ];
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: reformatPng,
    });
    setFormattedFileContent(response.choices[0].message.content);
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
    updatedAssignmentTypes[index].checked =
      !updatedAssignmentTypes[index].checked;
    setAssignmentTypes(updatedAssignmentTypes);
  };

  const handleAddAssignmentType = () => {
    if (newAssignmentType.trim()) {
      setAssignmentTypes([
        ...assignmentTypes,
        { name: newAssignmentType, checked: true },
      ]);
      setNewAssignmentType("");
    }
  };

  const renderInitialStep = () => (
    <>
      <div className="modal-header">
        <h2>Enter Class Details</h2>
        <div className="close-icon toggleButton" onClick={closeModal}>
          &times;
        </div>
      </div>
      <div className="modal-content">
        <div className="input-group">
          <input
            className="input"
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            required
          />
          <label className="label">Name of Class</label>
        </div>
        <div className="input-group">
          <h5>Start date</h5>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="assignment-types">
          <h5>Edit Class's Type of Events</h5>
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
      <div className="modal-footer">
        <button
          className="button"
          onClick={() => {
            setCurrentStep(1);
          }}
        >
          Next
        </button>
      </div>
    </>
  );

  const renderUploadOptions = () => (
    <>
      <div className="modal-header">
        <h2>How do you want to enter the schedule?</h2>
        <div className="close-icon toggleButton" onClick={closeModal}>
          &times;
        </div>
      </div>
      <div className="modal-content">
        <button
          className="button"
          onClick={() => {
            setCurrentStep(2);
            setIsManualEntry(false);
          }}
        >
          Upload Syllabus
        </button>
        <button
          className="button"
          onClick={() => {
            setIsManualEntry(true);
            setCurrentStep(2);
          }}
        >
          Enter Manually
        </button>
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
          {currentStep === 1 && renderUploadOptions()}
          {currentStep === 2 && !isManualEntry && (
            <>
              <div className="modal-header">
                <h2>Upload Syllabus</h2>
                <div className="close-icon toggleButton" onClick={closeModal}>
                  &times;
                </div>
              </div>
              <div className="modal-content">
                <div id="drag-and-drop">
                  <DragDrop onFilesAdded={onFilesAdded} />
                  <br />
                </div>
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
              closeModal={async (updatedCalendarEvents) => {
                await submitEvents(updatedCalendarEvents);
                closeModal();
              }}
              addEvent={(event) => {
                setCalendarEvents([...calendarEvents, event]);
              }}
              className={className}
              calendarEvents={calendarEvents}
              assignmentTypes={assignmentTypes}
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
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
