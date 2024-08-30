import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AccountContext } from "../User/Account";
import Latex from "react-latex-next";
import "./EventModal.css";
import PracticeModal from "./PracticeModal";
import openai from "../openai";

const EventModal = ({
  event,
  closeModal,
  updateEvent,
  backToClassModal,
  deleteEvent,
  calendarEvents,
  fromModal,
}) => {
  const { getSession, numTotalEvents, numGeneratedEvents, addStudySessions } = useContext(AccountContext);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(event.content);
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [chatResponse, updateChatResponse] = useState("");
  const [chatMessages, updateMessages] = useState([
    {
      role: "system",
      content: `You will be given a course, along with a specific topic from that course. 
        Make a list of five total practice problems / questions from the given topic that could be asked on an exam for the given course. 
        Do not include anything else in your response other than the study guide. Use LaTeX syntax if there is any mathematical notation needed.
        (I.E. Don't include an intro or outro to your response saying "Here are practice questions ..." or anything along those lines. Keep the problem list clean.)
        Make the practice problem list labels each practice problem with a number before it. For example: 1. {practice problem 1}. \n 2. {practice problem 2} ...`,
    },
  ]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showLecturePrompt, setShowLecturePrompt] = useState(false);
  const [lectureEvents, setLectureEvents] = useState([]);
  const [useLectureContent, setUseLectureContent] = useState(false);
  const [checkedTopics, setCheckedTopics] = useState([]);
  const [newTopic, setNewTopic] = useState({});
  const [otherTopics, setOtherTopics] = useState([]);
  const [title, setTitle] = useState(event.title);
  const [startDate, setStartDate] = useState(event.startDate);
  const [filteredLectureEvents, setFilteredLectureEvents] = useState([]);
  const [studyStartDate, setStudyStartDate] = useState(null);
  const [allLectureEvents, setAllLectureEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        console.log(event);
        setSessionData(session);
        getPracticeProblems();
        if (event.type === "Exam") {
          setAllLectureEvents(calendarEvents.filter(
            (evt) =>
              evt.type === "Lecture" &&
              evt.className === event.className));
          setFilteredLectureEvents(calendarEvents.filter(
            (evt) =>
              evt.type === "Lecture" &&
              evt.className === event.className &&
              new Date(evt.startDate) <= new Date(event.startDate)
          ));
          setStudyStartDate(findStudyStartDate());
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
    };
    fetchSession();
  }, []);


  const findStudyStartDate = () => {
    const examsForClass = calendarEvents
      .filter((evt) => evt.type === "Exam" && evt.className === event.className)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const index = examsForClass.indexOf(event);
    if (index > 0) {
      return new Date(examsForClass[index - 1].startDate).toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  }

  const handleGenerateClick = async () => {
    if (allLectureEvents.length > 0) {
      setLectureEvents(filteredLectureEvents);
      setShowLecturePrompt(true);
      handleUseLectureContent(filteredLectureEvents);
    } else {
      setIsGenerating(true);
    }
  };

  const handleUseLectureContent = (filteredLectureEvents) => {
    setUseLectureContent(true);
    const mappedTopics = filteredLectureEvents.map((event) => ({
      topic: event.title,
      checked: true,
    }));
    setCheckedTopics(mappedTopics);
    const allLectureEvents = calendarEvents.filter((evt) =>
      evt.type === "Lecture" && evt.className === event.className);
    const otherLectureEvents = allLectureEvents.filter((evt) => !filteredLectureEvents.includes(evt));
    setOtherTopics(otherLectureEvents);
  };

  const contentListToString = async (selectedLectureEvents) => {
    let str = '';
    for (let i = 0; i < selectedLectureEvents.length; i++) {
      str += `(Section ${i + 1}: ${selectedLectureEvents[i].title}. Content covered in Section ${i + 1}: ${selectedLectureEvents[i].content}.) `
    }
    return str;
  }

  const handleConfirmLectureContent = async () => {
    const selectedTopics = checkedTopics.filter((topic) => topic.checked === true).map((topic) => topic.topic);
    const selectedLectureEvents = await calendarEvents.filter((evt) => selectedTopics.includes(evt.title));

    const topicList = await contentListToString(selectedLectureEvents);
    setLectureEvents(selectedLectureEvents);
    setShowLecturePrompt(false);
    await getClassContent(topicList, studyStartDate);
  };

  const handleSpecifyContentManually = () => {
    setUseLectureContent(false);
    setShowLecturePrompt(false);
    setLectureEvents([]);
    setIsGenerating(true);
    setIsEditing(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleDoneClick = async () => {
    setIsEditing(false);
    if (startDate === event.startDate) {
      console.log(startDate);
      console.log(event.startDate);
      const updatedEvent = {
        ...event,
        title,
        startDate: event.startDate,
        endDate: event.endDate,
        content: content
      };
      await updateEvent(updatedEvent, content, event.contentGenerated);
    }
    else {
      // Parse the existing startDate to get the time components
      const originalStartDate = new Date(event.startDate);
      const originalEndDate = new Date(event.endDate);

      // Parse the edited startDate (which only has the date part)
      const newStartDate = new Date(startDate);

      // Create new Date objects with the same time as original but new date
      const updatedStartDate = new Date(
        newStartDate.getFullYear(),
        newStartDate.getMonth(),
        newStartDate.getDate() + 1,
        originalStartDate.getHours(),
        originalStartDate.getMinutes(),
        originalStartDate.getSeconds()
      );

      const updatedEndDate = new Date(
        newStartDate.getFullYear(),
        newStartDate.getMonth(),
        newStartDate.getDate() + 1,
        originalEndDate.getHours(),
        originalEndDate.getMinutes(),
        originalEndDate.getSeconds()
      );

      // Ensure endDate is adjusted if needed (e.g., if it spans over multiple days)
      if (originalEndDate.getTime() > originalStartDate.getTime()) {
        const duration = originalEndDate.getTime() - originalStartDate.getTime();
        updatedEndDate.setTime(updatedStartDate.getTime() + duration);
      }
      const updatedEvent = {
        ...event,
        title,
        startDate: updatedStartDate,
        endDate: updatedEndDate,
        content: content
      };
      setStartDate(updatedStartDate);
      await updateEvent(updatedEvent, content, event.contentGenerated);
    }
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleStudyStartDateChange = (e) => {
    setStudyStartDate(e.target.value);
  }

  const handleDateChange = (e) => {
    setStartDate(e.target.value);
  };

  const deleteLectureEvents = async () => {
    for (let i = 0; i < lectureEvents.length; i++) {
      await deleteEvent(lectureEvents[i]);
    }
  };


  const getClassContent = async (topicList, dateString) => {
    setIsLoading(true);
    const accessToken = sessionData.accessToken;
    const userId = sessionData.userId;
    try {
      const response = await fetch(
        `https://api.studymaster.io/api/users/${userId}/userclasses`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        const userClass = data.content.find(
          (c) => c.className === event.className
        );
        if (userClass) {
          await addStudySessions('', event, topicList, dateString);
          await updateEvent(event, null, true, null);
          if (lectureEvents.length > 0) {
            await deleteLectureEvents();
          }
        } else {
          console.error("Class not found");
        }
      } else {
        console.error("Failed to fetch class content:", data.error);
      }
    } catch (err) {
      console.error("Error fetching class content:", err);
    }
    setIsLoading(false);
  };

  const makePractice = async () => {
    setIsLoading(true);
    const newMessage = {
      role: "user",
      content:
        "The course is " +
        event.className +
        ", and the content that these problems should be based off of is " +
        event.content.split("\n")[0] +
        ".",
    };
    const updatedChatMessages = [...chatMessages, newMessage];
    updateMessages(updatedChatMessages);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: updatedChatMessages,
    });
    const parsedResponse = response.choices[0].message.content;
    updateChatResponse(parsedResponse);
    await updateEvent(event, null, true, response.choices[0].message.content);
    setIsGenerating(false);
    setIsLoading(false);
    setPracticeOpen(true);
  };

  const closePracticeModal = () => {
    setPracticeOpen(false);
  };

  const getPracticeProblems = () => {
    if (event.practiceProblems) {
      updateChatResponse(event.practiceProblems);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    deleteEvent(event);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const formatContent = (content) => {
    const parts = content.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);

    const formattedParts = parts.map((part) => {
      if (part.startsWith("\\[") || part.startsWith("\\(")) {
        return part.replace("\\[\n", "<br/>\\[");
      } else {
        return part
          .replace(/###\s*(.*)/g, "<h4>$1</h4>")
          .replace(/####\s*(.*)/g, "<h5>$1</h5>")
          .replace(/##\s*(.*)/g, "<h3>$1</h3>")
          .replace(/#\s*(.*)/g, "<h2>$1</h2>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/_(.*?)_/g, "<em>$1</em>")
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
          .replace(/(\d+\.)/g, "<br/>$1")
          .replace(/-\s/g, "<br/>- ")
          .replace(/\n/g, "<br/>");
      }
    });
    return formattedParts
      .join("")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  };

  const handleCheckboxChange = (index) => {
    const updatedCheckedTopics = [...checkedTopics];
    updatedCheckedTopics[index].checked = !updatedCheckedTopics[index].checked;
    setCheckedTopics(updatedCheckedTopics);
  };

  return (
    <div className="modal open">
      <div className="modal-overlay"></div>
      <div className="modal-container">
        <div className="modal-header">
          <div>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="title-input"
                />
              </>
            ) : (
              <h2>{title}</h2>
            )}
            <p className="class-name">{event.className}</p>
          </div>
          <div
            className={`close-icon toggleButton ${backToClassModal ? "small-back-button" : ""
              }`}
            onClick={closeModal}
          >
            {backToClassModal ? "Back" : "×"}
          </div>
        </div>
        <div className="modal-content">
          {showLecturePrompt ? (
            <>
              {useLectureContent ? (
                <div>
                  <h4>Topics used for exam:</h4>
                  {checkedTopics.map((lecture, index) => (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={lecture.checked}
                        onChange={() => handleCheckboxChange(index)}
                      />
                      <label>
                        <strong>{lecture.topic}</strong>
                      </label>
                    </div>
                  ))}
                  <select
                    value={newTopic}
                    onChange={(e) => {
                      const newCheckedTopic = { topic: e.target.value, checked: true };
                      setCheckedTopics((checkedTopics) => [
                        ...checkedTopics, newCheckedTopic,
                      ]);
                      setOtherTopics(otherTopics.filter((topic) => topic.title !== e.target.value))
                      setNewTopic("");
                    }}
                  >
                    <option value="" hidden>
                      Other Course Topics
                    </option>
                    {otherTopics.map((obj, index) => (
                      <option key={index} value={obj.title}>
                        {obj.title}
                      </option>
                    ))}
                  </select>
                  <p>
                    Please confirm that the above lecture topics cover the exam
                    content.
                  </p>
                  <div className="d-flex justify-content-start" >
                    <button
                      className="button" style={{ marginLeft: "0px" }}
                      onClick={handleConfirmLectureContent}
                    >
                      Confirm
                    </button>
                    <button
                      className="button" style={{ marginLeft: "0px" }}
                      onClick={handleSpecifyContentManually}
                    >
                      Enter exam content manually
                    </button>
                  </div>
                  <br />
                  <span>Start studying: {" "}</span><input
                    type="date"
                    value={studyStartDate}
                    onChange={handleStudyStartDateChange}
                    className="date-input"
                  />
                </div>
              ) : (
                <div>
                  <p>
                    We found lecture content between now and the exam date.
                    Would you like to use this lecture content as the exam
                    content, or would you prefer to specify the content
                    manually?
                  </p>
                  <div className="d-flex justify-content-between">
                    <button
                      className="button"
                      onClick={handleUseLectureContent}
                    >
                      Use Lecture Content
                    </button>
                    <button
                      className="button"
                      onClick={handleSpecifyContentManually}
                    >
                      Specify Manually
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : isGenerating && event.type === "Exam" ? (
            <>
              <div className="d-flex justify-content-between align-items-center">
                <p>
                  Before making a study schedule for this exam, please confirm
                  that we have all content covered on this exam.
                </p>
                {isGenerating && !isEditing && (
                  <button
                    className="button continue-button"
                    onClick={getClassContent}
                  >
                    Continue
                  </button>
                )}
              </div>
              <h3>
                <strong>Specify exam content:</strong>
              </h3>
              {isEditing ? (
                <>
                  <textarea value={content} onChange={handleContentChange} />
                </>
              ) : (content)}
            </>
          ) : isGenerating && event.type === "Study Session" ? (
            <>
              <div className="d-flex justify-content-between align-items-center">
                <p>
                  Review the content we have for {event.content.split("\n")[0]}{" "}
                  so far, and add any additional material that's not covered
                  before generating practice.
                </p>
                {isGenerating && !isEditing && (
                  <button
                    className="button continue-button"
                    onClick={makePractice}
                  >
                    Continue
                  </button>
                )}
              </div>
              {isEditing ? (
                <>
                  <textarea value={content} onChange={handleContentChange} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center">
                <p>
                  <strong>Type:</strong> {event.type}
                </p>
                {event.type === "Study Session" ? (
                  <div>
                    <button
                      className={`button ${!event.contentGenerated && "generate-button"
                        }`}
                      onClick={() => {
                        navigate(`/practice/${event.id}`);
                      }}
                    >
                      Take Practice Quiz
                    </button>
                  </div>
                ) : event.type === "Exam" && !isEditing && !fromModal ? (
                  <div>
                    <button
                      onClick={event.contentGenerated ? () => navigate(`/exams/${event.id}`) : handleGenerateClick}
                      className={event.contentGenerated ? "button" : "button generate-button"}
                    >
                      {event.contentGenerated ? "View Study Plan" : "Generate Study Plan"}
                    </button>
                  </div>
                ) : null}
              </div>
              <br />
              <p>
                <strong>Date:</strong> {isEditing ? (
                  <input
                    type="date"
                    value={new Date(startDate).toISOString().split("T")[0]}
                    onChange={handleDateChange}
                    className="date-input"
                  />
                ) : (
                  new Date(startDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                )}
              </p>
              <br />
              {isEditing ? (
                <textarea value={content} onChange={handleContentChange} />
              ) : event.type === "Exam" ? (
                <></>
              ) : (
                <Latex>{formatContent(content)}</Latex>
              )}
            </>
          )}
        </div>
        {isLoading && (
          <div className="loading-overlay d-flex flex-column">
            <div className="spinner"></div>
            {numGeneratedEvents === null ? (
              <div>Making Study Guide Starting at: {studyStartDate}</div>
            ) : (
              <div>{numGeneratedEvents + 1}/{numTotalEvents} Topics Generated</div>
            )}
          </div>
        )}
        <div className="modal-footer">
          {!showLecturePrompt && (
            <>
              {!isEditing ? (
                <>
                  {event.type !== "Study Session" && (
                    <button
                      className="button edit-button"
                      onClick={handleEditClick}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="button delete-button"
                    onClick={handleDeleteClick}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  className="button done-button"
                  onClick={handleDoneClick}
                >
                  Done
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {practiceOpen && (
        <PracticeModal
          event={event}
          closePracticeModal={closePracticeModal}
          problems={chatResponse}
        />
      )}
      {showDeleteConfirmation && (
        <div className="delete-confirmation">
          <p>
            {event.type === "Exam" && event.contentGenerated
              ? "Are you sure you want to delete this event? Deleting this event will delete all generated study sessions made for this exam."
              : "Are you sure you want to delete this event?"}
          </p>
          <button className="button confirm-button" onClick={confirmDelete}>
            Yes
          </button>
          <button className="button cancel-button" onClick={cancelDelete}>
            No
          </button>
        </div>
      )}
    </div>
  );
};

export default EventModal;
