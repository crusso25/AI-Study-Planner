import React, { useState, useEffect } from "react";
import "./modal.css";
import "./EnterManuallyModal.css";
import AddEventModal from "./AddEventModal";
import EventModal from "./EventModal";

const EnterManuallyModal = ({
  closeModal,
  addEvent,
  className,
  startDate,
  calendarEvents,
  assignmentTypes,
  deleteEvent,
  uploadEvents,
}) => {
  const [addingEventType, setAddingEventType] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [newEventType, setNewEventType] = useState("");
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [updatedCalendarEvents, setUpdatedCalendarEvents] =
    useState(calendarEvents);

  useEffect(() => {
    console.log(updatedCalendarEvents);
  }, [updatedCalendarEvents]);

  const handleAddEvent = (newEvent) => {
    setUpdatedCalendarEvents([...updatedCalendarEvents, newEvent]);
    setAddingEventType(null);
  };

  const handleAddNewEventType = () => {
    if (newEventType.trim() !== "") {
      assignmentTypes.push({ name: newEventType, checked: true });
      setNewEventType("");
      setIsAddingNewType(false);
    }
  };

  const formatDate = (date) => {
    const options = { weekday: "short", month: "numeric", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
  };

  const getEventsByType = (className) => {
    const eventTypes = assignmentTypes
      .filter((e) => e.checked)
      .map((e) => e.name);

    const calendarEventsForClass = updatedCalendarEvents.filter(
      (calendarEvent) => calendarEvent.className === className
    );

    const eventsByType = {};

    eventTypes.forEach((type) => {
      eventsByType[type] = calendarEventsForClass
        .filter((event) => event.type === type)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    });

    return eventsByType;
  };

  const handleDrop = (event, newAssignmentType) => {
    event.preventDefault();
    const eventId = event.dataTransfer.getData("text");
    const draggedEvent = updatedCalendarEvents.find(
      (evt) => evt.title === eventId
    );

    if (draggedEvent) {
      console.log("Dropping event", draggedEvent, "into", newAssignmentType);
      setUpdatedCalendarEvents((prevEvents) =>
        prevEvents
          .filter((evt) => evt.title !== eventId)
          .concat({ ...draggedEvent, type: newAssignmentType })
      );
      setDragging(false); // Stop flashing border when the event is dropped
    } else {
      console.error("Dragged event not found");
    }
  };

  const handleDragStart = (event, eventId) => {
    event.dataTransfer.setData("text", eventId);
    console.log("Dragging event with title:", eventId);
    setDragging(true); // Start flashing border
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  const eventsByType = getEventsByType(className);

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <>
          <div className="modal-header">
            <h2>Add Dates For {className}</h2>
            <div
              className="small-back-button"
              onClick={closeModal}
            >
              Back
            </div>
          </div>
          <div className="modal-content">
            <div>
              Don't worry if any dates are missed, this can all be edited later.
            </div>
            <br />
            <div className="class-summary-container">
              {Object.keys(eventsByType).map((type) => (
                <div
                  className={`event-type-container ${
                    dragging ? "flashing-border" : ""
                  }`}
                  key={type}
                  onDrop={(event) => handleDrop(event, type)}
                  onDragOver={(event) => event.preventDefault()}
                >
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, event.title)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedEvent(event)}
                          className="clickable"
                        >
                          {event.title} ({formatDate(new Date(event.startDate))}
                          )
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Event Type Section */}
            <div className="add-event-type-container">
              {isAddingNewType ? (
                <>
                  <textarea
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    placeholder="Enter new event type"
                    className="new-event-type-textarea"
                  />
                  <button
                    className="btn btn-success btn-sm"
                    onClick={handleAddNewEventType}
                  >
                    Done
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAddingNewType(true)}
                >
                  Add Another Event Type
                </button>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button
              className="button"
              onClick={() => {
                uploadEvents(updatedCalendarEvents);
              }}
            >
              Finish
            </button>
          </div>
        </>
        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            closeModal={() => setSelectedEvent(null)}
            updateEvent={async (updatedEvent, newContent) => {
              const updatedEvents = updatedCalendarEvents.map((event) =>
                event === updatedEvent
                  ? { ...event, content: newContent }
                  : event
              );
              setSelectedEvent({ ...updatedEvent, content: newContent });
              setUpdatedCalendarEvents(updatedEvents);
            }}
            addStudySessions={null}
            backToClassModal={() => setSelectedEvent(null)}
            deleteEvent={(event) => {
              deleteEvent(event);
              setSelectedEvent(null);
            }}
          />
        )}
        {addingEventType && (
          <AddEventModal
            className={className}
            eventType={addingEventType}
            closeModal={() => setAddingEventType(null)}
            addEvent={handleAddEvent}
            fetchEvents={null}
          />
        )}
      </div>
    </div>
  );
};

export default EnterManuallyModal;
