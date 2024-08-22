import React, { useState, useContext, useEffect } from "react";
import { AccountContext } from "../User/Account.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Classes.css";
import Modal from "../Modals/modal.js";
import ClassModal from "../Modals/ClassModal.js";
import Header from "./Header.js";

const Classes = () => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [classList, updateClasses] = useState([]);
  const [isAddClassModalOpen, setAddClassModalOpen] = useState(false);
  const [isClassModalOpen, setClassModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classIds, updateClassIds] = useState([]);

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
    const index = classList.indexOf(className);
    return classColors[index % classColors.length];
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSessionData(session);
        await fetchClasses(session);
        await fetchEvents(session);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
      setIsLoading(false);
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
        console.log("Response from API:", data);
        const userEvents = data.content.map((item) => ({
          title: item.title,
          start: new Date(item.startDate),
          end: new Date(item.endDate),
          content: item.content,
          className: item.className,
          type: item.type,
          id: item.id,
          contentGenerated: item.contentGenerated
        }));
        setCalendarEvents(userEvents);
      } else {
        console.error("Failed to fetch Calendar Events:", data.error);
      }
    } catch (err) {
      console.error("Error fetching Calendar Events:", err);
    }
  };

  const fetchClasses = async (userSession) => {
    const accessToken = userSession.accessToken;
    const userId = userSession.userId;
    try {
      const response = await fetch(
        `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/userclasses`,
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
        const newClasses = data.content.map((item) => item.className);
        const classIds = data.content.map((item) => item.id);
        updateClassIds(classIds);
        updateClasses(newClasses);
      } else {
        console.error("Failed to fetch classes:", data.error);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
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
          `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/userclasses`,
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
        await fetchEvents(sessionData);
        await fetchClasses(sessionData);
      } catch (err) {
        console.error("Error adding class:", err.message);
      }
    } else {
      console.error("User is not authenticated");
    }
  };

  const deleteClass = async (className) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;
      const classIndex = classList.indexOf(className);
      const classId = classIds[classIndex];
      try {
        const response = await fetch(
          `http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/users/${userId}/userclasses/${classId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = response;
        if (response.ok) {
          console.log("Response from API:", data);
          await deleteEventsForClass(className);
          fetchClasses(sessionData);
        } else {
          console.error("Failed to delete class:", data.error);
        }
      } catch (err) {
        console.error("Error deleting class:", err);
      }
    } else {
      console.error("User is not authenticated");
    }
  };

  const deleteEventsForClass = async (className) => {
    if (sessionData) {
      const accessToken = sessionData.accessToken;
      const userId = sessionData.userId;

      const eventsToDelete = calendarEvents.filter(
        (event) => event.className === className
      );

      for (const event of eventsToDelete) {
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
      }
      const updatedEvents = calendarEvents.filter(
        (event) => event.className !== className
      );
      setCalendarEvents(updatedEvents);
    } else {
      console.error("User is not authenticated");
    }
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <Header />
      <div className="container-fluid classes-container">
        <div className="d-flex flex-row justify-content-between align-items-center">
          <h1>Your Classes:</h1>
          <button
            onClick={() => setAddClassModalOpen(true)}
            className="btn btn-primary"
          >
            Add Class
          </button>
        </div>
        <div className="row">
          {classList.map((classItem) => (
            <div
              className="col-md-4 class-item-container"
              key={classItem}
            >
              <div
                className="class-item"
                
              >
                <h3>{classItem}</h3>
                <p onClick={() => {
                  setSelectedClass(classItem);
                  setClassModalOpen(true);
                }}className="edit-class-label">Edit Class</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isAddClassModalOpen && (
        <Modal
          addClassToList={(className, classContent) => {
            addClass(className, classContent);
            fetchClasses(sessionData);
            setAddClassModalOpen(false);
          }}
          closeModal={() => setAddClassModalOpen(false)}
        />
      )}
      {isClassModalOpen && selectedClass && (
        <ClassModal
          className={selectedClass}
          closeModal={() => setClassModalOpen(false)}
          deleteClass={(className) => {
            deleteClass(className);
            setClassModalOpen(false);
            fetchClasses(sessionData);
          }}
          calendarEvents={calendarEvents}
          fetchEvents={fetchEvents}
        />
      )}
    </div>
  );
};

export default Classes;

