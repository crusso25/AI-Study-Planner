import React, { useState, useContext, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { AccountContext } from "../User/Account";
import "./Header.css";

const Header = () => {
  const [userPopUp, setUserPopUp] = useState(false);
  const { logout, sessionData } = useContext(AccountContext);
  const [initial, setInitial] = useState("U");
  const [username, setUsername] = useState("");

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
        <h4>
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
                <Link to="/settings" className="dropdown-item">
                  Settings
                </Link>
                <button className="dropdown-item" onClick={logout}>
                  Logout
                </button>
                <div className="separator"></div>{" "}
                {/* Horizontal line separator */}
              </div>
            )}
            {!userPopUp && <br />}
            <Link to="/" style={{ textDecoration: "none" }}>
              <div className="page-links">Home</div>
            </Link>
            <Link to="/classes" style={{ textDecoration: "none" }}>
              <div className="page-links">Classes</div>
            </Link>
            <Link to="/calendar" style={{ textDecoration: "none" }}>
              <div className="page-links">Calendar</div>
            </Link>
            <Link to="/practice" style={{ textDecoration: "none" }}>
              <div className="page-links">Practice</div>
            </Link>
          </div>
        </h4>
      </header>
      <Outlet />
    </>
  );
};

export default Header;
