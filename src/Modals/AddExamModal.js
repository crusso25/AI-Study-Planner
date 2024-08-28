import React, { useState, useContext } from "react";
import "./AddExamModal.css";
import { AccountContext } from "../User/Account";

const AddExamModal = ({ closeModal, updateStudyGuides }) => {
  const { addStudySessions, addCalendarEvent, addClass } =
    useContext(AccountContext);
  const [className, setClassName] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState([""]); // Initialize with one empty topic
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTopic = () => {
    setTopics([...topics, ""]);
  };

  const handleTopicChange = (index, value) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const startDate = new Date(`${examDate}T21:00:00.000Z`);
    const endDate = new Date(`${examDate}T22:00:00.000Z`);
    // Construct the exam event with the required structure
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
    await addStudySessions("", newExam, newExam.content);
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
            <div>This may take a couple minutes...</div>
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
                  className="input"
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
                <label className="label">Name of Course</label>
              </div>
              <div className="input-group">
                <input
                  className="input"
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  required
                />
                <label className="label">Exam Name</label>
              </div>
              <div className="input-group">
                <h5>Exam Date:</h5>
                <input
                  className="input"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="topics-section">
              <h5>Topics Covered in the Exam</h5>
              <div className="topics-list">
                {topics.map((topic, index) => (
                  <div key={index} className="input-group topic-group">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => handleTopicChange(index, e.target.value)}
                      className="input"
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
          <button onClick={handleSubmit} className="button submit-button">
            Add Exam
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddExamModal;
