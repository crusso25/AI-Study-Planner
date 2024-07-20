import React from "react";
import "./modal.css";

const EventModal = ({ event, closeModal }) => {
  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <div className="modal-header">
          <h2>{event.title}</h2>
          <div className="close-icon" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-content">
          <p><strong>Start:</strong> {new Date(event.start).toLocaleString()}</p>
          <p><strong>End:</strong> {new Date(event.end).toLocaleString()}</p>
          <p>{event.content}</p>
        </div>
        <div className="modal-footer">
          <button className="button" onClick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
