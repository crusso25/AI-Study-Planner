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
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState(new Set());

  const classColors = [
    "#007bff", "#28a745", "#dc3545", "#ffc107", "#6f42c1", "#20c997", "#fd7e14", "#17a2b8"
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
  }, [calendarEvents, selectedTypes]);

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
          type: item.type,
          color: getClassColor(item.className),
        }));
        setCalendarEvents(userEvents);
        const classSet = new Set(data.Items.map((item) => item.className));
        setClasses([...classSet]);
        const typeSet = new Set(data.Items.map((item) => item.type));
        setEventTypes([...typeSet]);
        setSelectedTypes(new Set([...typeSet])); // Initially select all types
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

  const eventStyleGetter = (event) => {
    const backgroundColor = event.color;
    const style = {
      backgroundColor,
      borderRadius: '0px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };
    return {
      style: style
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
    const filtered = calendarEvents.filter(event => selectedTypes.has(event.type));
    setFilteredEvents(filtered);
  };

  return (
    <div className="my-calendar-container">
      <div className={`calendar ${isSidebarVisible ? 'with-sidebar' : ''}`}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "940px", width: "100%" }}
          onSelectEvent={handleEventClick}
          defaultView="month"
          date={viewDate}
          onNavigate={date => setViewDate(date)}
          eventPropGetter={eventStyleGetter}
        />
      </div>
      {isSidebarVisible && (
        <div className="class-list">
          <h3>Classes</h3>
          <ul>
            {classes.map((className, index) => (
              <li className="class-button" key={index} onClick={() => handleClassClick(className)}>
                <span className="class-color-box" style={{ backgroundColor: getClassColor(className) }}></span>
                {className}
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
