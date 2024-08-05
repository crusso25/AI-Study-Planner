import React, { useState, useContext, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { AccountContext } from "./Account";
import "./Header.css";

const Header = () => {
  const [userPopUp, setUserPopUp] = useState(false);
  const { logout, sessionData } = useContext(AccountContext);
  const [initial, setInitial] = useState("U");

  useEffect(() => {
    if (sessionData) {
      const username = sessionData.getIdToken().payload['cognito:username'];
      setInitial(username.charAt(0).toUpperCase());
    }
  }, [sessionData]);

  return (
    <>
      <header>
        <h2>
          <nav className="navbar">
            <div className="d-flex">
              <Link to="/" style={{ textDecoration: "none" }}>
                <div className="page-links">My Classes</div>
              </Link>
              <Link to="/Calendar" style={{ textDecoration: "none" }}>
                <div className="page-links">My Calendar</div>
              </Link>
            </div>
            <div
              id="user"
              onClick={() => {
                setUserPopUp(!userPopUp);
              }}
            >
              {initial}
            </div>
          </nav>
        </h2>
        {userPopUp && (
          <div id="user-pop-up">
            <Link to="/settings" className="dropdown-item settings-item">
              Settings
            </Link>
            <button id="logout-button" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </header>
      <Outlet />
    </>
  );
};

export default Header;
