import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import "./Account.css";
import { jwtDecode } from "jwt-decode";
import openai from "../openai";

const AccountContext = createContext();

const Account = (props) => {
  const [isAuthenticated, setAuthentication] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, [navigate]);

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
      const response = await fetch("http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

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
      const response = await fetch("http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

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
        `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/auth/resend?email=${email}`,
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
    navigate("/login"); // Redirect to login page
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

  const addStudySessions = async (classContent, examEvent, lectureEvents) => {
    let studySessions = lectureEvents;
    if (lectureEvents.length === 0) {
      const initialMessage = [
        {
          role: "system",
          content:
            "You will be given the content that is covered for a certain specified class, along with the content that is covered for an exam in that class. Make a list of study sessions that start at " + examEvent.startDate.toString() + ", until the date of the exam, which will be given to you. Make sure that the study sessions cover all topics / material that will be tested on the exam. Give your response in this exact format (JSON format). For your first response, nothing other than these exact formats should be given in the response, it must be exactly as stated in the formats given." +
            `[{
            "week": "Week X",
            "sessions": [
              {
                "title": "{topic}",
                "date": "YYYY-MM-DD",
                "startTime": "HH:MM",
                "endTime": "HH:MM",
                "content": "{topic}"
              },
              {
                "title": "{topic}",
                "date": "YYYY-MM-DD",
                "startTime": "HH:MM",
                "endTime": "HH:MM",
                "content": "{topic}"
              }
              ...
            ]
          }
          **Repeat for each week, make sure that no title has the same name for any session. For testing purposes make start time 8:00 and end time 9:00.**
      ]`,
        },
        {
          role: "user",
          content: `The class is ${examEvent.className}, the date of this exam is ${examEvent.startDate}. This is the content that is covered on this exam: ${examEvent.content}. This is the content for the entire class: ${classContent}`,
        },
      ];

      const initialResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: initialMessage,
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
    return studySessions;
  };

  const addCalendarEvent = async (calendarEvent) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;
      try {
        const response = await fetch(
          `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/calendarevents`,
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
        `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/calendarevents/${event.id}`,
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
        return [updatedContent, updatedContentGenerated, updatedPracticeProblems];
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
        `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/calendarevents/${event.id}`,
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
        deleteCalendarEvent
      }}
    >
      {isAuthenticated ? (
        <>{props.children}</>
      ) : (
        <div id="auth-container">
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
              Signup
            </button>
          </div>
          <div id="auth-forms">{isLogin ? <Login /> : <Signup />}</div>
        </div>
      )}
    </AccountContext.Provider>
  );
};

export { Account, AccountContext };
