import React, { useState, useEffect, useContext } from "react";
import "./EventModal.css";
import { AccountContext } from "../Account";
import Latex from "react-latex-next";

const EventModal = ({ event, closeModal, updateEventContent, addStudySessions, backToClassModal }) => {
  const { getSession } = useContext(AccountContext);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(event.content);
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleGenerateClick = () => {
    setIsGenerating(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleDoneClick = async () => {
    setIsEditing(false);
    await updateEventContent(event, content);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const getClassContent = async () => {
    setIsLoading(true);
    const idToken = sessionData.getIdToken().getJwtToken();
    const userId = sessionData.getIdToken().payload.sub;
    try {
      const response = await fetch(
        "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/searchUserClass/",
        {
          method: "POST",
          headers: {
            Authorization: idToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userId, className: event.className }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log("Response from API:", data.Items[0].classContent[0]);
        await addStudySessions(data.Items[0].classContent[0], event);
        closeModal();
      } else {
        console.error("Failed to fetch classes:", data.error);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
    setIsLoading(false);
  };

  const formatContent = (content) => {
    let formattedContent = content.replace(/\*\*(.*?)\*\*/g, "<br/><b>$1</b>");
    formattedContent = formattedContent.replace(/(\d+\.)/g, "<br/>$1");
    formattedContent = formattedContent.replace(/-\s/g, "<br/>- ");
    formattedContent = formattedContent.replace(/\n/g, "<br/>");
    return formattedContent;
  };

  return (
    <div className="modal open">
      <div className="modal-overlay"></div>
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2>{event.title}</h2>
            <p className="class-name">{event.className}</p>
          </div>
          <div
            className={`close-icon toggleButton ${backToClassModal ? "small-back-button" : ""}`}
            onClick={backToClassModal ? backToClassModal : closeModal}
          >
            {backToClassModal ? "Back" : "×"}
          </div>
        </div>
        <div className="modal-content">
          {isGenerating ? (
            <>
              <p>
                Before making a study schedule for this exam, please confirm
                that we have all content covered on this exam.
              </p>
              <h3>
                <strong>Current Exam Content:</strong>
              </h3>
              {isEditing ? (
                <>
                  <textarea value={content} onChange={handleContentChange} />
                  <button
                    className="button done-button"
                    onClick={handleDoneClick}
                  >
                    Done
                  </button>
                </>
              ) : (
                <Latex>{formatContent(content)}</Latex>
              )}
            </>
          ) : (
            <>
              <p>
                <strong>Type:</strong> {event.type}
              </p>
              <p>
                <strong>Content:</strong> <Latex>{formatContent(event.content)}</Latex>
              </p>
              {isEditing ? (
                <>
                  <textarea value={content} onChange={handleContentChange} />
                  <button
                    className="button done-button"
                    onClick={handleDoneClick}
                  >
                    Done
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
        <div className="modal-footer">
          {isLoading ? (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {isEditing ? null : (
                <button className="button edit-button" onClick={handleEditClick}>
                  Edit Content
                </button>
              )}
              {isGenerating && !isEditing ? (
                <button
                  className="button continue-button"
                  onClick={getClassContent}
                >
                  Continue
                </button>
              ) : event.type === "Exam" ? (
                <button className="button generate-button" onClick={handleGenerateClick}>
                  Generate Study Plan
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
