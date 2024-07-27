import React, { useState, useContext, useEffect } from "react";
import "./modal.css";
import "./ClassModal.css";
import EventModal from "./EventModal";
import { AccountContext } from "../Account";

const ClassModal = ({ className, closeModal, deleteClass, calendarEvents }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);

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

  const formatDate = (date) => {
    const options = { weekday: "short", month: "numeric", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
  };

  const getEventsByType = (className) => {
    const eventTypes = [...new Set(calendarEvents.map((event) => event.type))];
    const eventsByType = {};
    eventTypes.forEach((type) => {
      eventsByType[type] = calendarEvents
        .filter((event) => event.className === className && event.type === type)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    });
    return eventsByType;
  };

  const eventsByType = getEventsByType(className);

  const editUserEvent = async (event, newContent) => {
    const idToken = sessionData.getIdToken().getJwtToken();
    const userId = sessionData.getIdToken().payload.sub;
    try {
      const response = await fetch(
        "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/editUserEvent",
        {
          method: "POST",
          headers: {
            Authorization: idToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            title: event.title,
            content: newContent,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log("Response from API:", data);
      } else {
        console.error("Failed to Edit Event:", data.error);
      }
    } catch (err) {
      console.error("Error Editing Event:", err);
    }
  };

  return (
    <>
      <div className="modal open">
        <div className="modal-overlay" onClick={closeModal}></div>
        <div className="modal-container">
          <div className="modal-header">
            <h2>{className}</h2>
            <div className="close-icon" onClick={closeModal}>
              &times;
            </div>
          </div>
          <div className="modal-content">
            <div className="class-summary-container">
              {Object.keys(eventsByType).map((type) => (
                <div className="event-type-container">
                  <div className="event-list" key={type}>
                    <h4>{type}s</h4>
                    <ul className="no-bullet">
                      {eventsByType[type].map((event, index) => (
                        <li
                          key={index}
                          onClick={() => setSelectedEvent(event)}
                          className="clickable"
                        >
                          {event.title} ({formatDate(new Date(event.start))})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="button delete-class"
              onClick={deleteClass}
            >
              Delete Class
            </button>
          </div>
        </div>
      </div>
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          closeModal={() => setSelectedEvent(null)}
          updateEventContent={async (updatedEvent, newContent) => {
            const updatedEvents = calendarEvents.map((event) =>
              event === updatedEvent ? { ...event, content: newContent } : event
            );
            setSelectedEvent({ ...updatedEvent, content: newContent });
            await editUserEvent(updatedEvent, newContent);
          }}
          addStudySessions={null}
          backToClassModal={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
};

export default ClassModal;
