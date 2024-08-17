import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AccountContext } from "../User/Account";
import Header from "./Header";
import Latex from "react-latex-next";
import "./PracticeProblemPage.css";
import openai from "../openai";

const PracticeProblemPage = () => {
  const { id } = useParams();
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [practiceProblems, setPracticeProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate(); // Use useNavigate instead of useHistory

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSessionData(session);
      await fetchPracticeProblems(session);
    };
    fetchSession();
  }, []);

  const fetchPracticeProblems = async (session) => {
    const accessToken = session.accessToken;
    const userId = session.userId;
    try {
      const response = await fetch(
        `http://localhost:8080/api/users/${userId}/calendarevents/${id}`,
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
        const problemsArray = data.practiceProblems
          .split(/[0-9]+\./)
          .filter(Boolean)
          .map((problem) => ({
            problemText: problem.trim(),
            userAnswer: "",
            feedback: "",
            incorrectAttempts: 0,
            isLocked: false,
            correctAnswer: "",
          }));
        setPracticeProblems(problemsArray);
      } else {
        console.error("Failed to fetch practice problems:", data.error);
      }
    } catch (err) {
      console.error("Error fetching practice problems:", err);
    }
  };

  const formatContent = (content) => {
    const parts = content.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
    const formattedParts = parts.map((part) => {
      if (part.startsWith("\\[") || part.startsWith("\\(")) {
        return part.replace("\\[\n", "<br/>\\[");
      } else {
        return part
          .replace(/###\s*(.*)/g, "<h4>$1</h4>")
          .replace(/####\s*(.*)/g, "<h5>$1</h5>")
          .replace(/##\s*(.*)/g, "<h3>$1</h3>")
          .replace(/#\s*(.*)/g, "<h2>$1</h2>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/_(.*?)_/g, "<em>$1</em>")
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
          .replace(/(\d+\.)/g, "<br/>$1")
          .replace(/-\s/g, "<br/>- ")
          .replace(/\n/g, "<br/>");
      }
    });
    return formattedParts
      .join("")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  };

  const handleNextProblem = () => {
    if (currentProblemIndex < practiceProblems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
    }
  };

  const handlePrevProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1);
    }
  };

  const handleSubmitAnswer = async (practiceQuestion) => {
    const currentProblem = practiceProblems[currentProblemIndex];

    if (currentProblem.isLocked) return;

    const getAnswer = [
      {
        role: "system",
        content: `You will act as a grader, checking problems that are submitted for their correctness for the class ${practiceProblems.className}.
          You will first be provided the question, that you will give your answer to, then you will be given the user's answer that you will check for accuracy.`,
      },
      {
        role: "user",
        content: `The question is: ${practiceQuestion}. Find the correct answer for this question/problem.`,
      },
    ];
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: getAnswer,
    });
    const correctAnswerResponse = response.choices[0].message.content.trim();

    const checkCorrect = [
      {
        role: "assistant",
        content: correctAnswerResponse,
      },
      {
        role: "user",
        content: `The response for this question that you will check is "${currentProblem.userAnswer}". Your response should either be 'True' if the answer is correct, or 'False' if the user's answer is wrong.`,
      },
    ];
    const correctResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: checkCorrect,
    });

    const isCorrect =
      correctResponse.choices[0].message.content.trim() === "True";

    const updatedProblems = [...practiceProblems];
    if (isCorrect) {
      updatedProblems[currentProblemIndex].feedback = "Correct!";
      updatedProblems[currentProblemIndex].isLocked = true;
    } else {
      updatedProblems[currentProblemIndex].incorrectAttempts += 1;
      if (updatedProblems[currentProblemIndex].incorrectAttempts >= 2) {
        updatedProblems[currentProblemIndex].feedback =
          "Incorrect. Here's the correct answer:";
        updatedProblems[currentProblemIndex].isLocked = true;
        updatedProblems[currentProblemIndex].correctAnswer =
          correctAnswerResponse;
      } else {
        updatedProblems[currentProblemIndex].feedback = "Try again.";
      }
    }
    setPracticeProblems(updatedProblems);
  };

  const handleChangeAnswer = (value) => {
    const updatedProblems = [...practiceProblems];
    updatedProblems[currentProblemIndex].userAnswer = value;
    setPracticeProblems(updatedProblems);
  };

  const allQuestionsAnswered = practiceProblems.every(
    (problem) => problem.isLocked
  );

  const handleViewResults = () => {
    setShowResults(true);
  };

  const handleBackToPractice = () => {
    navigate("/practice");
  };

  return (
    <div className="main-container">
      <Header />
      <div className="container practice-problem-page">
        <h2>Practice Problems</h2>
        {showResults ? (
          <div className="results-container">
            <h3>Results</h3>
            <p>
              You got{" "}
              {
                practiceProblems.filter((problem) => problem.feedback === "Correct!")
                  .length
              }{" "}
              out of {practiceProblems.length} correct.
            </p>
            <ul>
              {practiceProblems.map((problem, index) => (
                <li key={index}>
                  <strong>Problem {index + 1}:</strong>{" "}
                  {problem.feedback === "Correct!" ? (
                    <span className="correct-feedback">Correct</span>
                  ) : (
                    <span className="incorrect-feedback">Wrong</span>
                  )}
                </li>
              ))}
            </ul>
            <button className="btn btn-secondary" onClick={handleBackToPractice}>
              Back to Practice
            </button>
          </div>
        ) : practiceProblems.length > 0 ? (
          <div className="practice-formatter">
            <div className="practice-problem">
              <div className="problem-content">
                <Latex>
                  {formatContent(
                    `**Problem ${currentProblemIndex + 1}:** ${
                      practiceProblems[currentProblemIndex].problemText
                    }`
                  )}
                </Latex>
              </div>
              <div className="answer-section">
                <textarea
                  value={practiceProblems[currentProblemIndex].userAnswer}
                  onChange={(e) => handleChangeAnswer(e.target.value)}
                  placeholder="Enter your answer here..."
                  disabled={practiceProblems[currentProblemIndex].isLocked}
                  className={
                    practiceProblems[currentProblemIndex].feedback === ""
                      ? "" // Normal border when no feedback is given
                      : practiceProblems[currentProblemIndex].feedback ===
                        "Correct!"
                      ? "correct-answer"
                      : "incorrect-answer"
                  }
                />

                <button
                  className="btn btn-primary"
                  onClick={() =>
                    handleSubmitAnswer(
                      practiceProblems[currentProblemIndex].problemText
                    )
                  }
                  disabled={practiceProblems[currentProblemIndex].isLocked}
                >
                  Submit Answer
                </button>
                <p
                  className={`feedback ${
                    practiceProblems[currentProblemIndex].isLocked &&
                    practiceProblems[currentProblemIndex].feedback ===
                      "Correct!"
                      ? "correct-feedback"
                      : "incorrect-feedback"
                  }`}
                >
                  {practiceProblems[currentProblemIndex].feedback}
                </p>
                {practiceProblems[currentProblemIndex].isLocked &&
                  practiceProblems[currentProblemIndex].incorrectAttempts >=
                    2 && (
                    <div className="correct-answer-section">
                      <Latex>
                        {formatContent(
                          practiceProblems[currentProblemIndex].correctAnswer
                        )}
                      </Latex>
                    </div>
                  )}
              </div>
            </div>
            <div className="navigation-buttons">
              {currentProblemIndex !== 0 && (
                <button className="btn btn-primary" onClick={handlePrevProblem}>
                  Previous Problem
                </button>
              )}
              {currentProblemIndex !== practiceProblems.length - 1 ? (
                <button className="btn btn-primary" onClick={handleNextProblem}>
                  Next Problem
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleViewResults}
                  disabled={!allQuestionsAnswered}
                >
                  View Results
                </button>
              )}
            </div>
          </div>
        ) : (
          <p>Loading practice problems...</p>
        )}
      </div>
    </div>
  );
};

export default PracticeProblemPage;
