import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header.js";
import { AccountContext } from "../User/Account";
import "./Exams.css";

const Exams = () => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [examsWithStudyGuides, setExamsWithStudyGuides] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSessionData(session);
      await fetchExams(session);
    };
    fetchSession();
  }, []);

  const fetchExams = async (userSession) => {
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
        const examsWithGuides = data.content.filter(
          (event) => event.type === "Exam" && event.contentGenerated
        );
        setExamsWithStudyGuides(examsWithGuides);
      } else {
        console.error("Failed to fetch exams with study guides:", data.error);
      }
    } catch (err) {
      console.error("Error fetching exams with study guides:", err);
    }
  };

  return (
    <div className="main-container">
      <Header />
      <div className="container-fluid practice-container">
        <h2>Study Guides</h2>
        <div className="row">
          {examsWithStudyGuides.length > 0 ? (
            examsWithStudyGuides.map((exam) => (
              <div className="practice-event-container col-md-4" key={exam.id}>
                <div className="practice-event">
                  <h3>{exam.title}</h3>
                  <p>
                    <strong>Class:</strong> {exam.className}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(exam.startDate).toLocaleDateString()}
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/exams/${exam.id}`)}
                  >
                    View Study Guide
                  </button>
                </div>
              </div>
            ))
          ) : (
            <>
              <p>No exams with study guides available.</p>
              <div>
                Click{" "}
                <span>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                      font: "inherit",
                    }}
                    onClick={() => {
                      navigate("../classes");
                    }}
                  >
                    here
                  </button>
                </span>{" "}
                to add a class and create study guides
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exams;
