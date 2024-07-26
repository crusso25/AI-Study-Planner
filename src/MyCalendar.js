import React, { useState, useEffect, useContext } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import openai from "./openai";
import { AccountContext } from "./Account";
import EventModal from "./popUps/EventModal.js";
import "./MyCalendar.css";

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
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
  const [chatMessages, updateChat] = useState([
    {
      role: "system",
      content:
        "You will be given the content that is covered for a certain specified class, along with the content that is covered for an exam in that class. Make a list of study sessions that start at a Feb 1 2023, until the date of the exam, which will be given to you. Make sure that the study sessions cover all specific material that will be tested on the exam. Give your response in this exact format (JSON format). Nothing other than these exact formats should be given in the response, it must be exactly as stated in the formats given." +
        `[{
          "week": "Week X",
          "sessions": [
            {
              "title": "Exam (1/2/3...) Study Session A",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Specific content to cover"
            },
            {
              "title": "Exam (1/2/3...) Study Session B",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "Specific content to cover"
            }
            ...
          ]
        }
        **Repeat for each week, make sure that no title has the same name for any session. For testing purposes make start time 8:00 and end time 9:00.**
    ]`,
    },
  ]);

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
          body: JSON.stringify({ userId: userId, title: event.title, content: newContent }),
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

  const updateEventContent = async (event, newContent) => {
    await editUserEvent(event, newContent);
    const updatedEvents = calendarEvents.map(e =>
      e === event ? { ...e, content: newContent } : e
    );
    setCalendarEvents(updatedEvents);
    setSelectedEvent({ ...event, content: newContent });
  };

  const parseCalendarResponse = async (response, className) => {
    const cleanedResponse = response.replace(/```json|```/g, '');
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

  const addCalendarEvent = async (calendarEvent) => {
    if (sessionData) {
      const idToken = sessionData.getIdToken().getJwtToken();
      const userId = sessionData.getIdToken().payload.sub;
      try {
        const response = await fetch(
          "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/addCalendarEvents/",
          {
            method: "POST",
            headers: {
              Authorization: idToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
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
          console.error("Failed to add class:", data.error);
        }
      } catch (err) {
        console.error("Error adding class:", err);
      }
    } else {
      console.error("User is not authenticated");
    }
  };

  const addStudySessions = async (classContent, examEvent) => {
    const newMessage = {
      role: "user",
      content: `The class is ${examEvent.className}, the date of this exam is ${examEvent.startDate}. This is the content that is covered on this exam: ${examEvent.content}. This is the content for the entire class: ${classContent}`,
    };
    const updatedChatMessages = [...chatMessages, newMessage];
    updateChat(updatedChatMessages);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: updatedChatMessages,
    });
    const studySessions = await parseCalendarResponse(response.choices[0].message.content, examEvent.className);


    for (const session of studySessions) {
      await addCalendarEvent(session);
    }

    const updatedCalendarEvents = [...calendarEvents, ...studySessions];
    setCalendarEvents(updatedCalendarEvents);
    setFilteredEvents(updatedCalendarEvents.filter(event => selectedTypes.has(event.type)));

    const session = await getSession();
    await fetchEvents(session);

    if (!eventTypes.includes("Study Session")) {
      setEventTypes([...eventTypes, "Study Session"]);
      setSelectedTypes(new Set([...selectedTypes, "Study Session"]));
    }
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
          updateEventContent={updateEventContent}
          addStudySessions={addStudySessions}
        />
      )}
    </div>
  );
};

export default MyCalendar;
