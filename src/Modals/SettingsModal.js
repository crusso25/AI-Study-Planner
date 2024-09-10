import React, { useState, useEffect, useContext } from "react";
import { AccountContext } from "../User/Account";
import "./SettingsModal.css"

const SettingsModal = ({closeModal}) => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSessionData(session);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
    };
    fetchSession();
  }, []);

  return (
    <div className="modal open">
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container settings-modal-container">
        <div className="modal-header">
          <h2>Settings</h2>
          <div className="close-icon" onClick={closeModal}>
            &times;
          </div>
        </div>
        <div className="modal-content">
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
