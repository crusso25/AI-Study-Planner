import React, { useState, useEffect, useContext } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarContext } from "./CalendarContext";
import { AccountContext } from "./Account";

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
  const { calendarContext } = useContext(CalendarContext);
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);

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
  }, []);

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
        }));
        setCalendarEvents(userEvents);
      } else {
        console.error("Failed to fetch Calendar Events:", data.error);
      }
    } catch (err) {
      console.error("Error fetching Calendar Events:", err);
    }
  };

  return (
    <div>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "90vh" }}
      />
    </div>
  );
};

export default MyCalendar;
