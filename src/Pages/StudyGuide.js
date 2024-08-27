import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import Header from "./Header.js";
import { AccountContext } from "../User/Account";
import Latex from "react-latex-next";
import EventModal from "../Modals/EventModal";
import "./StudyGuide.css";

const StudyGuide = () => {
  const { id } = useParams();
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [studySessions, setStudySessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSessionData(session);
      await fetchEvent(session);
    };
    fetchSession();
  }, []);

  const fetchEvent = async (session) => {
    const accessToken = session.accessToken;
    const userId = session.userId;
    try {
      const response = await fetch(
        `https://api.studymaster.io/api/users/${userId}/calendarevents/${id}`,
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
        await fetchStudySessions(session, data);
        setExam(data);
      } else {
        console.error("Failed to fetch practice problems:", data.error);
      }
    } catch (err) {
      console.error("Error fetching practice problems:", err);
    }
  };

  const fetchStudySessions = async (userSession, examEvent) => {
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
        console.log(data.content);
        const filteredSessions = data.content
          .filter(
            (event) =>
              event.examFor === examEvent.title + ", " + examEvent.className
          )
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setStudySessions(filteredSessions);
      } else {
        console.error("Failed to fetch study sessions:", data.error);
      }
    } catch (err) {
      console.error("Error fetching study sessions:", err);
    }
  };

  return (
    <div className="main-container">
      <Header />
      <div className="study-guide-container">
        {exam !== null && (
            <h2>Study Guide For {exam.title}</h2>
        )}
        {studySessions.length > 0 ? (
          <div className="study-session-list">
            {studySessions.map((session) => (
              <div
                key={session.id}
                className="study-session-item"
                onClick={() => setSelectedSession(session)}
              >
                <h3>{session.title}</h3>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(session.startDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No study sessions available for this exam.</p>
        )}
      </div>
      {selectedSession && (
        <EventModal
          event={selectedSession}
          closeModal={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default StudyGuide;
