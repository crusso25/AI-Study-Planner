import React, { useState } from 'react';
import "./EventModal.css";

const EventModal = ({ event, closeModal }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateClick = () => {
    setIsGenerating(true);
  };

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2>{event.title}</h2>
            <p className="class-name">{event.className}</p>
          </div>
          <div className="close-icon toggleButton" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-content">
          {isGenerating ? (
            <p><strong>Current Exam Content:</strong> {event.content}</p>
          ) : (
            <>
              <p><strong>Type:</strong> {event.type}</p>
              <p><strong>Start:</strong> {event.start.toString()}</p>
              <p><strong>End:</strong> {event.end.toString()}</p>
              <p><strong>Content:</strong> {event.content}</p>
            </>
          )}
        </div>
        <div className="modal-footer">
          {isGenerating ? (
            <>
              <button className="button edit-button" onClick={() => setIsGenerating(false)}>
                Edit Content
              </button>
              <button className="button continue-button" onClick={closeModal}>
                Continue
              </button>
            </>
          ) : (
            event.type === "Exam" && (
              <button className="button generate-button" onClick={handleGenerateClick}>
                Generate Study Plan
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;