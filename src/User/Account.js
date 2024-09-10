import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import "./Account.css";
import { jwtDecode } from "jwt-decode";
import { getInitialResponse, getSpecificResponse } from "../IgnoredFiles/UserInfoGetter"

const AccountContext = createContext();

const Account = (props) => {
  const [isAuthenticated, setAuthentication] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [titleText, setTitleText] = useState("");
  const [numTotalEvents, setNumTotalEvents] = useState(null);
  const [numGeneratedEvents, setNumGeneratedEvents] = useState(null);
  const navigate = useNavigate();
  const fullTitle = "Welcome to StudyMaster";

  useEffect(() => {
    checkSession();
  }, [navigate]);

  useEffect(() => {
    const animateTitle = async () => {
      for (let index = 1; index <= fullTitle.length; index++) {
        setTimeout(() => {
          setTitleText(fullTitle.substring(0, index));
        }, index * 100); // Adjust the speed by changing the multiplier
      }
    };

    animateTitle();
  }, []);

  const checkSession = async () => {
    const accessToken = localStorage.getItem("accessToken");
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");
    if (!accessToken || !username || !userId) {
      setAuthentication(false);
      return;
    }
    try {
      const session = await getSession();
      setAuthentication(true);
      setSessionData(session);
    } catch (error) {
      console.log("User not authenticated, trying to refresh token");
      try {
        const newSession = await refreshAccessToken();
        setAuthentication(true);
        setSessionData(newSession);
        console.log("Token refreshed successfully");
        getSession();
      } catch (refreshError) {
        console.log("Unable to refresh token:", refreshError);
        setAuthentication(false);
        navigate("/login");
      }
    }
  };

  const getSession = async () => {
    const accessToken = localStorage.getItem("accessToken");
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");

    if (accessToken && username && userId) {
      const decodedToken = jwtDecode(accessToken);

      const currentTime = Date.now() / 1000;
      if (decodedToken.exp < currentTime) {
        throw new Error("Token expired");
      } else {
        return { accessToken, username, userId };
      }
    } else {
      throw new Error("No session found");
    }
  };

  const authenticate = async (identifier, password) => {
    try {
      const response = await fetch(
        "https://api.studymaster.io/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ identifier, password }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("username", data.username);
      localStorage.setItem("userId", data.userId);
      setAuthentication(true);
      setSessionData({
        accessToken: data.accessToken,
        username: data.username,
        userId: data.userId,
      });
      navigate("/");
      return data;
    } catch (error) {
      console.error("Error Authenticating", error);
      throw error;
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await fetch(
        "https://api.studymaster.io/api/auth/refresh",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Refresh token failed");
      }

      const data = await response.json();
      localStorage.setItem("accessToken", data.accessToken);
      const username = localStorage.getItem("username");
      const userId = localStorage.getItem("userId");
      return { accessToken: data.accessToken, username, userId };
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw error;
    }
  };

  const resendVerificationCode = async (email) => {
    try {
      const response = await fetch(
        `https://api.studymaster.io/api/auth/resend?email=${email}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Resending verification code failed");
      }

      return response.json();
    } catch (error) {
      console.error("Error resending verification code:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    setAuthentication(false);
    setSessionData(null);
    navigate("/login");
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
    setNumTotalEvents(events.length);
    return events;
  };

  const addStudySessions = async (examEvent, topicList, dateString) => {
    const initialResponse = await getInitialResponse(examEvent, topicList, dateString);
    const studySessions = await parseCalendarResponse(initialResponse, examEvent.className);
    let numStudy = 0;
    for (let session of studySessions) {
      const specificResponse = await getSpecificResponse(examEvent, topicList, session);
      // Update study session contents
      session.type = 'Study Session';
      session.content += `\n\nDetailed Content:\n${specificResponse}`;
      session.examFor = examEvent.title + ', ' + examEvent.className;
      // Add events to user database and change spinner loading message
      await addCalendarEvent(session);
      setNumGeneratedEvents(numStudy);
      numStudy++;
    }
    setNumGeneratedEvents(null);
    setNumTotalEvents(null);
    return studySessions;
  };

  const addClass = async (newClass, classContent) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;
      try {
        const payload = {
          className: newClass,
          classContent: classContent,
        };

        const response = await fetch(
          `https://api.studymaster.io/api/users/${userId}/userclasses`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add class");
        }
        const data = await response.json();
        console.log("Response from API:", data);
      } catch (err) {
        console.error("Error adding class:", err.message);
      }
    } else {
      console.error("User is not authenticated");
    }
  };

  const addCalendarEvent = async (calendarEvent) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;
      let contentGenerated = calendarEvent.contentGenerated;
      if (calendarEvent.contentGenerated !== true && calendarEvent.contentGenerated !== false) {
        contentGenerated = false;
      }
      try {
        const response = await fetch(
          `https://api.studymaster.io/api/users/${userId}/calendarevents`,
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
              contentGenerated: contentGenerated,
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
        `https://api.studymaster.io/api/users/${userId}/calendarevents/${event.id}`,
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
            examFor: event.examFor,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        console.log("Response from API:", data);
        return [
          updatedContent,
          updatedContentGenerated,
          updatedPracticeProblems,
        ];
      } else {
        console.error("Failed to Edit Event:", data.error);
      }
    } catch (err) {
      console.error("Error Editing Event:", err);
    }
  };

  const deleteCalendarEvent = async (event) => {
    const accessToken = sessionData.accessToken;
    const userId = sessionData.userId;

    try {
      const response = await fetch(
        `https://api.studymaster.io/api/users/${userId}/calendarevents/${event.id}`,
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

  return (
    <AccountContext.Provider
      value={{
        authenticate,
        getSession,
        logout,
        refreshAccessToken,
        resendVerificationCode,
        sessionData,
        isAuthenticated,
        addStudySessions,
        editUserEvent,
        deleteCalendarEvent,
        addClass,
        addCalendarEvent,
        numTotalEvents,
        numGeneratedEvents
      }}
    >
      {isAuthenticated ? (
        <>{props.children}</>
      ) : (
        <div id="auth-container">
          <h1 id="auth-title">{titleText}</h1>
          <div id="auth-header">
            <button
              className={`auth-toggle-button ${isLogin ? "active" : ""}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`auth-toggle-button ${!isLogin ? "active" : ""}`}
              onClick={() => setIsLogin(false)}
            >
              Sign up
            </button>
          </div>
          <div id="auth-forms">{isLogin ? <Login /> : <Signup />}</div>
        </div>
      )}
    </AccountContext.Provider>
  );
};

export { Account, AccountContext };
