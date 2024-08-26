import React, { useState, useEffect, useContext } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { AccountContext } from "../User/Account.js";
import EventModal from "../Modals/EventModal.js";
import "./MyCalendar.css";
import Header from "./Header.js";

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
  const { getSession, addStudySessions, editUserEvent, deleteCalendarEvent } =
    useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState(new Set());
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState(new Set());

  const classColors = [
    "#007bff",
    "#28a745",
    "#dc3545",
    "#ffc107",
    "#6f42c1",
    "#20c997",
    "#fd7e14",
    "#17a2b8",
  ];

  const getClassColor = (className) => {
    const index = classes.indexOf(className);
    return classColors[index % classColors.length];
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSessionData(session);
        await fetchEvents(session);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [calendarEvents, selectedTypes, selectedClasses]);

  const fetchEvents = async (userSession) => {
    const accessToken = userSession.accessToken;
    const userId = userSession.userId;
    try {
      const response = await fetch(
        `https://api.studymaster.io/api/users/${userId}/calendarevents`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        const userEvents = data.content.map((item) => ({
          title:
            item.type === "Study Session"
              ? item.content.split("\n")[0]
              : item.title,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate),
          content: item.content,
          className: item.className,
          type: item.type,
          color: getClassColor(item.className),
          id: item.id,
          contentGenerated: item.contentGenerated,
          practiceProblems: item.practiceProblems,
          examFor: item.examFor,
        }));
        setCalendarEvents(userEvents);

        const classSet = new Set(data.content.map((item) => item.className));
        setClasses([...classSet]);
        setSelectedClasses(new Set([...classSet])); // Select all classes by default

        const typeSet = new Set(data.content.map((item) => item.type));
        setEventTypes([...typeSet]);
        setSelectedTypes(new Set([...typeSet]));
      } else {
        console.error("Failed to fetch Calendar Events:", data.error);
      }
    } catch (err) {
      console.error("Error fetching Calendar Events:", err);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleClassToggle = (className) => {
    const updatedClasses = new Set(selectedClasses);
    if (updatedClasses.has(className)) {
      updatedClasses.delete(className);
    } else {
      updatedClasses.add(className);
    }
    setSelectedClasses(updatedClasses);
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = getClassColor(event.className);
    const style = {
      backgroundColor,
      borderRadius: "0px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    };
    return {
      style: style,
    };
  };

  const handleTypeChange = (type) => {
    const updatedTypes = new Set(selectedTypes);
    if (updatedTypes.has(type)) {
      updatedTypes.delete(type);
    } else {
      updatedTypes.add(type);
    }
    setSelectedTypes(updatedTypes);
  };

  const filterEvents = () => {
    const filtered = calendarEvents.filter(
      (event) =>
        selectedTypes.has(event.type) && selectedClasses.has(event.className)
    );
    setFilteredEvents(filtered);
  };

  const parseCalendarResponse = async (response, className) => {
    const cleanedResponse = response.replace(/```json|```/g, "");
    const parsedResponse = JSON.parse(cleanedResponse);
    const events = [];
    parsedResponse.forEach((week) => {
      week.sessions.forEach((session) => {
        events.push({
          title: session.title,
          startDate: new Date(`${session.date}T${session.startTime}:00`),
          endDate: new Date(`${session.date}T${session.endTime}:00`),
          content: session.content,
          className: className,
          type: "Study Session",
        });
      });
    });
    return events;
  };

  const addStudySessionsToCalendar = async (
    classContent,
    examEvent,
    lectureEvents
  ) => {
    const studySessions = await addStudySessions(
      classContent,
      examEvent,
      lectureEvents
    );

    const updatedCalendarEvents = [...calendarEvents, ...studySessions];
    setCalendarEvents(updatedCalendarEvents);
    setFilteredEvents(
      updatedCalendarEvents.filter((event) => selectedTypes.has(event.type))
    );

    const session = await getSession();
    await fetchEvents(session);

    if (!eventTypes.includes("Study Session")) {
      setEventTypes([...eventTypes, "Study Session"]);
      setSelectedTypes(new Set([...selectedTypes, "Study Session"]));
    }
  };

  return (
    <div className="main-container">
      <Header />
      <div className={`calendar ${isSidebarVisible ? "with-sidebar" : ""}`}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="startDate"
          endAccessor="endDate"
          style={{ height: "900px", width: "100%" }}
          onSelectEvent={handleEventClick}
          defaultView="month"
          date={viewDate}
          onNavigate={(date) => setViewDate(date)}
          eventPropGetter={eventStyleGetter}
        />
      </div>
      {isSidebarVisible && (
        <div className="class-list">
          <h3>Classes</h3>
          <ul>
            {classes.map((className, index) => (
              <li key={index}>
                <div
                  className="class-color-circle"
                  style={{
                    backgroundColor: selectedClasses.has(className)
                      ? getClassColor(className)
                      : "white",
                    border: `2px solid ${getClassColor(className)}`,
                  }}
                  onClick={() => handleClassToggle(className)}
                ></div>
                <span onClick={() => handleClassToggle(className)}>
                  {className}
                </span>
              </li>
            ))}
          </ul>
          <h3>Filter by Type</h3>
          <ul className="filter-list">
            {eventTypes.map((type, index) => (
              <li key={index}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type)}
                    onChange={() => handleTypeChange(type)}
                  />
                  {type}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        className={"toggle-filters"}
        onClick={() => setSidebarVisible(!isSidebarVisible)}
      >
        {isSidebarVisible ? "Hide" : "Filters"}
      </button>
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          closeModal={() => setSelectedEvent(null)}
          updateEvent={async (
            event,
            newContent,
            contentGenerated,
            practiceProblems
          ) => {
            const [
              updatedContent,
              updatedContentGenerated,
              updatedPracticeProblems,
            ] = await editUserEvent(
              event,
              newContent,
              contentGenerated,
              practiceProblems
            );
            const updatedEvents = calendarEvents.map((e) =>
              e === event
                ? {
                    ...e,
                    content: updatedContent,
                    contentGenerated: updatedContentGenerated,
                    practiceProblems: updatedPracticeProblems,
                  }
                : e
            );
            setCalendarEvents(updatedEvents);
            setSelectedEvent({
              ...event,
              content: updatedContent,
              contentGenerated: updatedContentGenerated,
              practiceProblems: updatedPracticeProblems,
            });
          }}
          addStudySessions={async (classContent, event, lectureEvents) => {
            await addStudySessionsToCalendar(
              classContent,
              event,
              lectureEvents
            );
            fetchEvents(sessionData);
            setSelectedEvent(null);
          }}
          deleteEvent={async (event) => {
            if (event.type === "Exam" && event.contentGenerated) {
              for (const calendarEvent of calendarEvents) {
                if (
                  calendarEvent.examFor ===
                  event.title + ", " + event.className
                ) {
                  await deleteCalendarEvent(calendarEvent);
                }
              }
            }
            await deleteCalendarEvent(event);
            fetchEvents(sessionData);
            setSelectedEvent(null);
          }}
          calendarEvents={calendarEvents}
        />
      )}
    </div>
  );
};

export default MyCalendar;
