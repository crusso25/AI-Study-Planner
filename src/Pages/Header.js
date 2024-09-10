import React, { useState, useContext, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AccountContext } from "../User/Account";
import "./Header.css";
import SettingsModal from "../Modals/SettingsModal";

const Header = () => {
  const [userPopUp, setUserPopUp] = useState(false);
  const { logout, sessionData } = useContext(AccountContext);
  const [initial, setInitial] = useState("U");
  const [username, setUsername] = useState("");
  const [settingsPopUp, setSettingsPopUp] = useState(false);
  const location = useLocation(); // Get the current path

  useEffect(() => {
    if (sessionData && sessionData.username) {
      const username = sessionData.username;
      setInitial(username.charAt(0).toUpperCase());
      setUsername(username);
    }
  }, [sessionData]);

  return (
    <>
      <header>
        <h4 style={{height:"100%"}} className="d-flex flex-column justify-content-between align-items-center">
          <div className="navbar">
            <div
              id="user"
              onClick={() => {
                setUserPopUp(!userPopUp);
              }}
              className="user-button prevent-select"
            >
              {initial}
            </div>
            {userPopUp && (
              <div id="user-pop-up" className="popup fade-in">
                <div className="dropdown-item username-item">{username}</div>
                <button className="dropdown-item" onClick={logout}>
                  Logout
                </button>
                <div className="separator"></div> {/* Horizontal line separator */}
              </div>
            )}
            {settingsPopUp && (
              <SettingsModal
                closeModal={() => {
                  setSettingsPopUp(false);
                }}
              />
            )}
            {!userPopUp && <br />}
            <Link to="/" style={{ textDecoration: "none" }}>
              <div className={`page-links ${location.pathname === "/" ? "active-link" : ""}`}>
                Home
              </div>
            </Link>
            <Link to="/exams" style={{ textDecoration: "none" }}>
              <div className={`page-links ${location.pathname === "/exams" ? "active-link" : ""}`}>
                Study
              </div>
            </Link>
            <Link to="/practice" style={{ textDecoration: "none" }}>
              <div className={`page-links ${location.pathname === "/practice" ? "active-link" : ""}`}>
                Practice
              </div>
            </Link>
            <Link to="/courses" style={{ textDecoration: "none" }}>
              <div className={`page-links ${location.pathname === "/courses" ? "active-link" : ""}`}>
                Courses
              </div>
            </Link>
            <Link to="/calendar" style={{ textDecoration: "none" }}>
              <div className={`page-links ${location.pathname === "/calendar" ? "active-link" : ""}`}>
                Calendar
              </div>
            </Link>
          </div>
          <div>
            *Beta*
          </div>
        </h4>
      </header>
      <Outlet />
    </>
  );
};

export default Header;
