import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header.js";
import { AccountContext } from "../User/Account";
import "./Exams.css";
import AddExamModal from "../Modals/AddExamModal"; // Import the AddExamModal component

const Exams = () => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [examsWithStudyGuides, setExamsWithStudyGuides] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility
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
        <div className="d-flex flex-row justify-content-between align-items-center">
          <h1>Your Study Guides:</h1>
          <button
            onClick={() => setIsModalOpen(true)} // Open the modal when clicked
            className="btn btn-primary"
          >
            Make Study Guide
          </button>
        </div>
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
              <strong>
              <div>
                Click the 'Make Study Guide' button to make a study guide for a certain exam with specific topics, or click{" "}
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
                to register a course and create study guides with course syllabus material.
              </div>
              </strong>
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <AddExamModal
          closeModal={() => setIsModalOpen(false)}
          updateStudyGuides={() => {fetchExams(sessionData)}}
        />
      )}
    </div>
  );
};

export default Exams;
