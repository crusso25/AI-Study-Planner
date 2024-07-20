import React, { useState, useContext, useEffect } from "react";
import { AccountContext } from "./Account";
import "./Homepage.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Modal from "./popUps/modal.js";

const Homepage = () => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);
  const [classList, updateClasses] = useState([]);
  const [isModalOpen, showModal] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSessionData(session);
        await fetchClasses(session);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
    };
    fetchSession();
  }, []);

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

  const addClass = async (newClass) => {
    if (sessionData) {
      const idToken = sessionData.getIdToken().getJwtToken();
      const userId = sessionData.getIdToken().payload.sub; // Assuming the user ID is in the token payload
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

  return (
    <div>
      <div className="container-fluid classes-container">
        <h1>Your Classes:</h1>
        <br />
        <div className="row g-3">
          <div onClick={() => showModal(true)} id="add-class" className="ms-3">
            Add Class
          </div>
          {classList.map((classItem) => (
            <div className="col-sm-3 class-item ms-3" key={classItem}>
              {classItem}
            </div>
          ))}
        </div>
      </div>
      {isModalOpen && (
        <Modal
          addClassToList={(className) => {
            addClass(className);
            showModal(false);
          }}
          closeModal={() => showModal(false)}
        />
      )}
    </div>
  );
};

export default Homepage;