import React, { useState, useEffect, useContext } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import openai from "../openai.js";
import { AccountContext } from "../User/Account.js";
import EventModal from "../Modals/EventModal.js";
import "./MyCalendar.css";
import Header from "./Header.js";

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
        "You will be given the content that is covered for a certain specified class, along with the content that is covered for an exam in that class. Make a list of study sessions that start at a Feb 1 2023, until the date of the exam, which will be given to you. Make sure that the study sessions cover all topics / material that will be tested on the exam. Give your response in this exact format (JSON format). For your first response, nothing other than these exact formats should be given in the response, it must be exactly as stated in the formats given." +
        `[{
          "week": "Week X",
          "sessions": [
            {
              "title": "Study: {Specific topic this study session covers}",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "{Topic}"
            },
            {
              "title": "Study: {Specific topic this study session covers}",
              "date": "YYYY-MM-DD",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "content": "{Topic}"
            }
            ...
          ]
        }
        **Repeat for each week, make sure that no title has the same name for any session. For testing purposes make start time 8:00 and end time 9:00.**
    ]`,
    },
  ]);

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
  }, [calendarEvents, selectedTypes]);

  const fetchEvents = async (userSession) => {
    const accessToken = userSession.accessToken;
    const userId = userSession.userId;
    try {
      const response = await fetch(
        `http://localhost:8080/api/users/${userId}/calendarevents`,
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
        console.log("Response from API:", data);
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

  const handleClassClick = (className) => {
    const classEvents = calendarEvents.filter(
      (event) => event.className === className
    );
    if (classEvents.length > 0) {
      setViewDate(classEvents[0].startDate);
    }
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
    const filtered = calendarEvents.filter((event) =>
      selectedTypes.has(event.type)
    );
    setFilteredEvents(filtered);
  };

  const editUserEvent = async (
    event,
    newContent,
    newContentGenerated,
    practiceProblems
  ) => {
    const accessToken = sessionData.accessToken;
    const userId = sessionData.userId;
    const updatedContent = newContent !== null ? newContent : event.content;
    const updatedContentGenerated =
      newContentGenerated !== null
        ? newContentGenerated
        : event.contentGenerated;
    const updatedPracticeProblems =
      practiceProblems !== null ? practiceProblems : event.practiceProblems;

    try {
      const response = await fetch(
        `http://localhost:8080/api/users/${userId}/calendarevents/${event.id}`,
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
            content: updatedContent,
            contentGenerated: updatedContentGenerated,
            practiceProblems: updatedPracticeProblems,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log("Response from API:", data);
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
      } else {
        console.error("Failed to Edit Event:", data.error);
      }
    } catch (err) {
      console.error("Error Editing Event:", err);
    }
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

  const addCalendarEvent = async (calendarEvent) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;
      try {
        const response = await fetch(
          `http://localhost:8080/api/users/${userId}/calendarevents`,
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
              contentGenerated: false,
              examFor: calendarEvent.examFor,
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
    } else {
      console.error("User is not authenticated");
    }
  };

  const deleteCalendarEvent = async (event) => {
    const accessToken = sessionData.accessToken;
    const userId = sessionData.userId;

    try {
      const response = await fetch(
        `http://localhost:8080/api/users/${userId}/calendarevents/${event.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log(`Deleted event with ID: ${event.id}`);
      } else {
        const data = await response.json();
        console.error(
          `Failed to delete event with ID: ${event.id}`,
          data.error
        );
      }
    } catch (err) {
      console.error(`Error deleting event with ID: ${event.id}`, err);
    }
  };

  const addStudySessions = async (
    classContent,
    examEvent,
    lectureEvents
  ) => {
    let studySessions = lectureEvents;
    if (lectureEvents.length === 0) {
      const initialMessage = {
        role: "user",
        content: `The class is ${examEvent.className}, the date of this exam is ${examEvent.startDate}. This is the content that is covered on this exam: ${examEvent.content}. This is the content for the entire class: ${classContent}`,
      };
      let updatedChatMessages = [...chatMessages, initialMessage];
      updateChat(updatedChatMessages);

      const initialResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: updatedChatMessages,
      });

      studySessions = await parseCalendarResponse(
        initialResponse.choices[0].message.content,
        examEvent.className
      );
    }
    const updatedPrompt = [
      {
        role: "system",
        content: `You will be given a course, along with a specific topic covered in that course. Make a study guide containing detailed information and key concepts needed to master this content. 
        Your study guide should only cover the content relevant to the topic that you are prompted. Do not include practice problems or questions in the additionalContent.
        Do not include anything else in your response other than the study guide. (I.E. Don't include an intro or outro to your response saying "Here is a detailed study guide ..." or anything along those lines. Keep the study guide clean.)`,
      },
      {
        role: "user",
        content: `The course is ${examEvent.className}, and the content covered on the entire exam is ${examEvent.content}.`,
      },
    ];

    console.log(studySessions);
    for (let session of studySessions) {
      const specificChatMessage = {
        role: "user",
        content: `This is the topic to make study guide on: ${session.content}.`,
      };
      const specificMessageInput = [...updatedPrompt, specificChatMessage];

      const specificResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: specificMessageInput,
      });
      const specificContent = specificResponse.choices[0].message.content;
      session.type = "Study Session";
      session.content += `\n\nDetailed Content:\n${specificContent}`;
      session.examFor = examEvent.title + ", " + examEvent.className;
      await addCalendarEvent(session);
    }

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
          style={{ height: "1200px", width: "100%" }}
          onSelectEvent={handleEventClick}
          defaultView="month"
          date={viewDate}
          onNavigate={(date) => setViewDate(date)}
          eventPropGetter={eventStyleGetter}
        />
      </div>
      {isSidebarVisible && (
        <div className="class-list">
          <br />
          <br />
          <h3>Classes</h3>
          <ul>
            {classes.map((className, index) => (
              <li
                className="class-button"
                key={index}
                onClick={() => handleClassClick(className)}
              >
                <div
                  className="class-color-box"
                  style={{ backgroundColor: getClassColor(className) }}
                ></div>
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
        {isSidebarVisible ? "Hide Classes" : "Show Classes"}
      </button>
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          closeModal={() => setSelectedEvent(null)}
          updateEvent={(
            event,
            newContent,
            contentGenerated,
            practiceProblems
          ) => {
            editUserEvent(
              event,
              newContent,
              contentGenerated,
              practiceProblems
            );
          }}
          addStudySessions={async (classContent, event, lectureEvents) => {
            await addStudySessions(classContent, event, lectureEvents);
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
