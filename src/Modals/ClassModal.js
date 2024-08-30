import React, { useState, useContext, useEffect } from "react";
import "./modal.css";
import "./ClassModal.css";
import EventModal from "./EventModal";
import AddEventModal from "./AddEventModal";
import { AccountContext } from "../User/Account";

const ClassModal = ({
  className,
  closeModal,
  deleteClass,
  calendarEvents,
  fetchEvents,
  assignmentTypes,
}) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [addingEventType, setAddingEventType] = useState(null);
  const { getSession, deleteCalendarEvent } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [updatedCalendarEvents, setUpdatedCalendarEvents] = useState(calendarEvents);

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
    console.log(updatedCalendarEvents);
  }, []);

  const formatDate = (date) => {
    const options = { weekday: "short", month: "numeric", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
  };

  const getEventsByType = (className) => {
    const eventTypes = [
      ...new Set(
        updatedCalendarEvents
          .filter((event) => event.className === className)  // Filter by className first
          .map((event) => event.type)
      )
    ];

    const eventsByType = {};
    eventTypes.forEach((type) => {
      eventsByType[type] = updatedCalendarEvents
        .filter((event) => event.type === type && event.className === className)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    });

    return eventsByType;
  };


  const eventsByType = getEventsByType(className);

  const editUserEvent = async (event, newContent) => {
    console.log(event);
    if (!sessionData) return;
    const accessToken = sessionData.accessToken;
    const userId = sessionData.userId;
    try {
      const response = await fetch(
        `https://api.studymaster.io/api/users/${userId}/calendarevents/${event.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            className: event.className,
            endDate: event.endDate,
            startDate: event.startDate,
            id: event.id,
            title: event.title,
            type: event.type,
            content: newContent,
            contentGenerated: event.contentGenerated
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log("Response from API:", data);
      } else {
        console.error("Failed to edit event:", data.error);
      }
    } catch (err) {
      console.error("Error editing event:", err);
    }
  };

  const addCalendarEvent = async (calendarEvent) => {
    if (!sessionData) return;
    const accessToken = sessionData.accessToken;
    const userId = sessionData.userId;
    try {
      const response = await fetch(
        `https://api.studymaster.io/api/users/${userId}/calendarevents`,
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
        console.error("Failed to add event:", data.error);
      }
    } catch (err) {
      console.error("Error adding event:", err);
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
                <div className="event-type-container" key={type}>
                  <div className="event-list">
                    <div className="event-list-header">
                      <h4>{type}s</h4>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setAddingEventType(type)}
                      >
                        Add
                      </button>
                    </div>
                    <ul className="no-bullet">
                      {eventsByType[type].map((event, index) => (
                        <li
                          key={index}
                          onClick={() => setSelectedEvent(event)}
                          className="clickable"
                        >
                          {event.title} ({formatDate(new Date(event.startDate))})
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
              className="button delete-button"
              onClick={() => {
                deleteClass(className)
              }}
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
          updateEvent={async (updatedEvent, newContent) => {
            const updatedEvents = updatedCalendarEvents.map((event) =>
              event.id === updatedEvent.id ? { ...updatedEvent, content: newContent } : event
            );
            setSelectedEvent(updatedEvent);
            setUpdatedCalendarEvents(updatedEvents);
            await editUserEvent(updatedEvent, newContent);
          }}
          deleteEvent={(deletedEvent) => {
            setUpdatedCalendarEvents(updatedCalendarEvents.filter((event) => event.id !== deletedEvent.id));
            setSelectedEvent(null);
            deleteCalendarEvent(deletedEvent);
          }}
          addStudySessions={null}
          backToClassModal={() => setSelectedEvent(null)}
          fromClassModal={true}
        />
      )}
      {addingEventType && (
        <AddEventModal
          className={className}
          eventType={addingEventType}
          closeModal={() => setAddingEventType(null)}
          addEvent={addCalendarEvent}
          fetchEvents={fetchEvents}
        />
      )}
    </>
  );
};

export default ClassModal;
