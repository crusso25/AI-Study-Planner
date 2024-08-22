import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AccountContext } from "../User/Account";
import "./Practice.css";
import Header from "./Header";

const Practice = () => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [practiceEvents, setPracticeEvents] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSessionData(session);
      await fetchEvents(session);
    };
    fetchSession();
  }, []);

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
        const practiceEvents = data.content
          .filter(
            (item) =>
              (item.type === "Lecture" || item.type === "Study Session") &&
              new Date(item.startDate) >= startDate &&
              new Date(item.startDate) <=
                new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          )
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setPracticeEvents(practiceEvents);
        setCalendarEvents(data.content);
      } else {
        console.error("Failed to fetch Calendar Events:", data.error);
      }
    } catch (err) {
      console.error("Error fetching Calendar Events:", err);
    }
  };

  const handleTakePracticeQuiz = (eventId) => {
    navigate(`/practice/${eventId}`);
  };

  const handleLastWeek = () => {
    const lastWeek = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    setStartDate(lastWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartDate(nextWeek);
  };

  useEffect(() => {
    if (sessionData) {
      fetchEvents(sessionData);
    }
  }, [startDate]);

  return (
    <div className="main-container">
      <Header />

      <div className="container-fluid practice-container">
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
        <h2>Practice Quizzes</h2>
        <div className="row">
          {practiceEvents.length > 0 ? (
            practiceEvents.map((event) => (
              <div className="practice-event-container col-md-4" key={event.id}>
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
                    onClick={() => handleTakePracticeQuiz(event.id)}
                  >
                    Take Practice Quiz
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No practice quizzes available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Practice;
