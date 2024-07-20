import React, { useState } from "react";
import "./modal.css";
import './ClassModal.css'

const ClassModal = ({ className, closeModal, deleteClass }) => {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <div className="modal-header">
          <h2>{className}</h2>
          <div className="close-icon" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-tabs">
          <button
            className={activeTab === "summary" ? "active" : ""}
            onClick={() => setActiveTab("summary")}
          >
            Class Summary
          </button>
          <button
            className={activeTab === "edit" ? "active" : ""}
            onClick={() => setActiveTab("edit")}
          >
            Edit/Add Class Info
          </button>
        </div>
        <div className="modal-content">
          {activeTab === "summary" ? (
            <div>
              <h3>Class Summary</h3>
              <p>Details about the class {className}.</p>
            </div>
          ) : (
            <div>
              <h3>Edit/Add Class Info</h3>
              <div className="input-group">
                <input
                  type="text"
                  name="ClassInfo"
                  className="input"
                  placeholder="Edit class info here..."
                />
                <label className="label">Class Info</label>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button"
            onClick={deleteClass}
          >
            Delete Class
          </button>
          <button
            type="button"
            className="button"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassModal;
