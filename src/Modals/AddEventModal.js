import React, { useState, useContext } from "react";
import "./AddEventModal.css";
import { AccountContext } from "../User/Account";

const AddEventModal = ({
  className,
  eventType,
  closeModal,
  addEvent,
  fetchEvents,
}) => {
  const { getSession } = useContext(AccountContext);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddEvent = async () => {
    setIsLoading(true);
    const session = await getSession();
    const newEvent = {
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      content,
      className,
      type: eventType,
    };
    await addEvent(newEvent, session);
    if (fetchEvents != null) {
      await fetchEvents(session);
    }
    setIsLoading(false);
    closeModal();
  };

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Add {eventType}</h2>
          <div className="close-icon" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-content">
          <label>Class: {className}</label>
          <label>Type: {eventType}</label>
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Start Date:
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            End Date:
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label>
            Content:
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </label>
        </div>
        <div className="modal-footer">
          {isLoading ? (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          ) : (
            <button
              type="button"
              className="button"
              onClick={handleAddEvent}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEventModal;
