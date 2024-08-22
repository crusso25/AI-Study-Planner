import React, { useState, useEffect, useContext } from "react";
import Header from "./Header.js";
import { AccountContext } from "../User/Account";
import "./Home.css";
import EventModal from "../Modals/EventModal";

const Home = () => {
  const { getSession, editUserEvent, addStudySessions, deleteCalendarEvent } =
    useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSessionData(session);
      await fetchEvents(session);
    };
    fetchSession();
  }, []);

  const getClassColor = (className) => {
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
    const index = classes.indexOf(className);
    return classColors[index % classColors.length];
  };

  const fetchEvents = async (userSession) => {
    const accessToken = userSession.accessToken;
    const userId = userSession.userId;
    try {
      const response = await fetch(
        `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/calendarevents`,
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
      } else {
        console.error("Failed to fetch Calendar Events:", data.error);
      }
    } catch (err) {
      console.error("Error fetching Calendar Events:", err);
    }
  };

  const getUpcomingEvents = (className) => {
    return calendarEvents.filter(
      (event) =>
        event.className === className &&
        event.startDate >= startDate &&
        event.startDate <=
          new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  const handleNextWeek = () => {
    setStartDate(new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleLastWeek = () => {
    setStartDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const classesWithEvents = classes.filter(
    (className) => getUpcomingEvents(className).length > 0
  );

  const getSortedExams = () => {
    const today = new Date();
    return calendarEvents
      .filter((event) => event.type === "Exam" && event.startDate >= today)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  return (
    <div className="main-container">
      <Header />
      <div className="home-container">
        <div className="date-control">
          <label>Date: </label>
          <input
            type="date"
            value={startDate.toISOString().split("T")[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))}
          />
          <button className="week-button" onClick={handleLastWeek}>
            Last Week
          </button>
          <button className="week-button" onClick={handleNextWeek}>
            Next Week
          </button>
        </div>
        {classesWithEvents.length === 0 ? (
          <div className="no-events">
            <p>No events scheduled for this week.</p>
          </div>
        ) : (
          <div className="home-class-list">
            {classesWithEvents.map((className) => (
              <div key={className}>
                <h3>{className}</h3>
                <ul>
                  {getUpcomingEvents(className).map((event, index) => (
                    <li
                      onClick={() => {
                        setSelectedEvent(event);
                      }}
                      key={index}
                    >
                      {event.type}: {event.title} -{" "}
                      {event.startDate.toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <h2 style={{ marginTop: "50px" }}>Upcoming Exams</h2>
        <div className="container-fluid practice-container">
          <div className="row">
            {getSortedExams().length > 0 ? (
              getSortedExams().map((event) => (
                <div
                  className="practice-event-container col-md-4"
                  key={event.id}
                >
                  <div className="practice-event">
                    <h3>{event.title}</h3>
                    <p>
                      <strong>Class:</strong> {event.className}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(event.startDate).toLocaleDateString()}
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setSelectedEvent(event)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No upcoming exams.</p>
            )}
          </div>
        </div>
        {selectedEvent !== null && (
          <EventModal
            event={selectedEvent}
            closeModal={() => {
              setSelectedEvent(null);
            }}
            updateEvent={async (
              event,
              newContent,
              contentGenerated,
              practiceProblems
            ) => {
              const [updatedContent, updatedContentGenerated, updatedPracticeProblems] = await editUserEvent(
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
            addStudySessions={async (className, examEvent, lectureEvents) => {
              await addStudySessions(className, examEvent, lectureEvents);
              setSelectedEvent(null);
            }}
            deleteEvent={(event) => {
              deleteCalendarEvent(event);
            }}
            calendarEvents={calendarEvents}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
