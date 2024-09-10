import React, { useState, useContext, useEffect } from "react";
import "./AddExamModal.css";
import { AccountContext } from "../User/Account";

const AddExamModal = ({ closeModal, updateStudyGuides }) => {
  const {
    addStudySessions,
    addCalendarEvent,
    addClass,
    numTotalEvents,
    numGeneratedEvents,
  } = useContext(AccountContext);
  const [className, setClassName] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [studyStartDate, setStudyStartDate] = useState(formatDateToString(new Date()));
  const [classNameError, setClassNameError] = useState(false);
  const [examDateError, setExamDateError] = useState(false);
  const [topicsWarning, setTopicsWarning] = useState(false);
  const [examNameError, setExamNameError] = useState(false);

  function formatDateToString(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  const handleAddTopic = () => {
    setTopics([...topics, ""]);
  };

  const handleTopicChange = (index, value) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
    setTopicsWarning(false); // Remove error when a change is made
  };

  const handleNextStep = async () => {
    const trimmedClassName = className.trim();
    const trimmedExamDate = examDate.trim();
    const trimmedTopics = topics.map((topic) => topic.trim());
    const trimmedExamName = examName.trim();

    let classError, dateError, topicError, examNameErr;

    // Check for className error
    if (trimmedClassName === "") {
      setClassNameError(true);
      classError = true;
    } else {
      setClassName(trimmedClassName);
      setClassNameError(false);
      classError = false;
    }

    // Check for examDate error
    if (trimmedExamDate === "") {
      setExamDateError(true);
      dateError = true;
    } else {
      setExamDate(trimmedExamDate);
      setExamDateError(false);
      dateError = false;
    }

    // Check for topics error
    if (trimmedTopics.length > 1 || (trimmedTopics.length === 1 && trimmedTopics[0] !== "")) {
      setTopicsWarning(false);
      topicError = false;
    } else {
      setTopicsWarning(true);
      topicError = true;
    }

    if (trimmedExamName === "") {
      setExamNameError(true);
      examNameErr = true;
    } else {
      setExamNameError(false);
      examNameErr = false;
    }

    if (!classError && !dateError && !topicError && !examNameErr) {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const startDate = new Date(`${examDate}T21:00:00.000Z`);
    const endDate = new Date(`${examDate}T22:00:00.000Z`);
    const newExam = {
      className: className.trim(),
      title: examName.trim(),
      type: "Exam",
      startDate: startDate,
      endDate: endDate,
      content: topics.filter((topic) => topic.trim() !== "").join(", "),
      contentGenerated: true,
      examFor: `${examName.trim()}, ${className.trim()}`,
      practiceProblems: null,
    };
    await addClass(newExam.className, "");
    await addCalendarEvent(newExam);
    await addStudySessions("", newExam, newExam.content, studyStartDate);
    updateStudyGuides(newExam);
    setIsLoading(false);
    closeModal();
  };

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        {isLoading && (
          <div className="loading-overlay d-flex flex-column">
            <div className="spinner"></div>
            {numGeneratedEvents === null ? (
              <div>Making Study Guide Starting at: {studyStartDate}</div>
            ) : (
              <div>
                {numGeneratedEvents + 1}/{numTotalEvents} Topics Generated
              </div>
            )}
          </div>
        )}
        <div className="modal-header">
          <h2>Enter Exam Details</h2>
          <div className="close-icon toggleButton" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-content">
          <div className="d-flex flex-row">
            <div className="d-flex flex-column" style={{ width: "50%" }}>
              <div className="input-group">
                <input
                  className={`input ${classNameError ? 'input-error' : ''}`}
                  type="text"
                  value={className}
                  onChange={(e) => {
                    setClassName(e.target.value);
                    setClassNameError(false); // Remove error when a change is made
                  }}
                  required
                />
                <label className="label">Name of Course</label>
              </div>
              <div className="input-group">
                <input
                  className={`input ${examNameError ? 'input-error' : ''}`}
                  type="text"
                  value={examName}
                  onChange={(e) => {
                    setExamName(e.target.value);
                    setExamNameError(false); // Remove error when a change is made
                  }}
                  required
                />
                <label className="label">Exam Name</label>
              </div>
              <div className={`input-group`}>
                <h5>Exam Date:</h5>
                <input
                  className={`input ${examDateError ? 'input-error' : ''}`}
                  type="date"
                  value={examDate}
                  onChange={(e) => {
                    setExamDate(e.target.value);
                    setExamDateError(false); // Remove error when a change is made
                  }}
                  required
                />
              </div>
              <div className="input-group">
                <h5>Start Studying: </h5>
                <input
                  className="input"
                  type="date"
                  value={studyStartDate}
                  onChange={(e) => setStudyStartDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="topics-section">
              <h5>Topics Covered in the Exam</h5>
              <div className="topics-list">
                {topics.map((topic, index) => (
                  <div key={index} className={`input-group topic-group`}>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => handleTopicChange(index, e.target.value)}
                      className={`input ${topicsWarning ? 'input-error' : ''}`}
                      placeholder={`Topic ${index + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddTopic}
                className="button add-topic-button"
              >
                + Add Topic
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleNextStep} className="button submit-button">
            Add Exam
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddExamModal;
