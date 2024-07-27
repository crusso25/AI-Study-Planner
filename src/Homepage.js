import React, { useState, useContext, useEffect } from "react";
import { AccountContext } from "./Account";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Homepage.css";
import Modal from "./popUps/modal.js";
import ClassModal from "./popUps/ClassModal.js";

const Homepage = () => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [classList, updateClasses] = useState([]);
  const [isAddClassModalOpen, setAddClassModalOpen] = useState(false);
  const [isClassModalOpen, setClassModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
          className: item.className,
          type: item.type,
          color: getClassColor(item.className),
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
    const idToken = userSession.getIdToken().getJwtToken();
    const userId = userSession.getIdToken().payload.sub;
    try {
      const response = await fetch(
        "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/fetchClasses/",
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
        const newClasses = [];
        for (let i = 0; i < data.Items.length; i++) {
          newClasses[i] = data.Items[i].className;
        }
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
      const idToken = sessionData.getIdToken().getJwtToken();
      const userId = sessionData.getIdToken().payload.sub;
      try {
        const response = await fetch(
          "https://yloqq6vtu4.execute-api.us-east-2.amazonaws.com/test/Transactions/",
          {
            method: "POST",
            headers: {
              Authorization: idToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
              className: newClass,
              classContent: classContent,
            }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          console.log("Response from API:", data);
          const updatedClasses = [...classList, newClass];
          updateClasses(updatedClasses);
        } else {
          console.error("Failed to add class:", data.error);
        }
      } catch (err) {
        console.error("Error adding class:", err);
      }
    } else {
      console.error("User is not authenticated");
    }
  };

  const formatDate = (date) => {
    const options = { weekday: "short", month: "numeric", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
  };

  const getUpcomingEvents = (className) => {
    return calendarEvents
      .filter(
        (event) =>
          event.className === className && event.type !== "Study Session"
      )
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 3);
  };

  const getStudySessions = (className) => {
    return calendarEvents
      .filter(
        (event) =>
          event.className === className && event.type === "Study Session"
      )
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 3);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
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
              className="col-xl-4 col-md-6 class-item-container"
              key={classItem}
              onClick={() => {
                setSelectedClass(classItem);
                setClassModalOpen(true);
              }}
            >
              <div className="class-item">
                <h3>{classItem}</h3>
                <div className="class-details d-flex justify-content-around">
                  <div className="upcoming">
                    <h5 className="d-flex justify-content-around">Upcoming:</h5>
                    <ul className="no-bullet">
                      {getUpcomingEvents(classItem).map((event, index) => (
                        <li key={index}>
                          {event.title} ({formatDate(event.start)})
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="upcoming">
                    <h5 className="d-flex justify-content-around">To-Do:</h5>
                    <ul className="no-bullet">
                      {getStudySessions(classItem).map((session, index) => (
                        <li key={index}>
                          {session.title} ({formatDate(session.start)})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isAddClassModalOpen && (
        <Modal
          addClassToList={(className, classContent) => {
            addClass(className, classContent);
            setAddClassModalOpen(false);
          }}
          closeModal={() => setAddClassModalOpen(false)}
        />
      )}
      {isClassModalOpen && selectedClass && (
        <ClassModal
          className={selectedClass}
          closeModal={() => setClassModalOpen(false)}
          deleteClass={() => {
            setClassModalOpen(false);
          }}
          calendarEvents={calendarEvents}
          fetchEvents={fetchEvents}
        />
      )}
    </div>
  );
};

export default Homepage;
