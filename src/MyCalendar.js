import React, { useState, useEffect, useContext } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarContext } from "./CalendarContext";
import { AccountContext } from "./Account";
import EventModal from "./popUps/EventModal.js";
import "./MyCalendar.css";

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
  const { calendarContext } = useContext(CalendarContext);
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [isSidebarVisible, setSidebarVisible] = useState(true);

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
    console.log(calendarEvents);
  }, [calendarEvents]);

  const fetchEvents = async (userSession) => {
    const idToken = userSession.getIdToken().getJwtToken();
    const userId = userSession.getIdToken().payload.sub;
    try {
      const response = await fetch(
        "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/fetchCalendarEvents",
        {
          method: "POST",
          headers: {
            Authorization: idToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userId }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log("Response from API:", data);
        const userEvents = data.Items.map((item) => ({
          title: item.title,
          start: new Date(item.startDate),
          end: new Date(item.endDate),
          content: item.content,
          className: item.className,
        }));
        setCalendarEvents(userEvents);

        // Extract unique classes
        const classSet = new Set(data.Items.map((item) => item.className));
        setClasses([...classSet]);
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

  const handleClassClick = (className) => {
    const classEvents = calendarEvents.filter(event => event.className === className);
    if (classEvents.length > 0) {
      setViewDate(classEvents[0].start);
    }
  };

  return (
    <div className="my-calendar-container">
      <div className={`calendar ${isSidebarVisible ? 'with-sidebar' : ''}`}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "90vh", width: "100%" }}
          onSelectEvent={handleEventClick}
          defaultView="month"
          date={viewDate}
          onNavigate={date => setViewDate(date)}
        />
      </div>
      {isSidebarVisible && (
        <div className="class-list">
          <h3>Classes</h3>
          <ul>
            {classes.map((className, index) => (
              <li key={index} onClick={() => handleClassClick(className)}>
                {className}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button 
        className="toggle-sidebar-button" 
        onClick={() => setSidebarVisible(!isSidebarVisible)}
      >
        {isSidebarVisible ? 'Hide Classes' : 'Show Classes'}
      </button>
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          closeModal={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default MyCalendar;
