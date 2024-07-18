import { Outlet, Link } from "react-router-dom";
import "./Header.css";
import React, { useState, useContext } from "react";
import { AccountContext } from "./Account";
import "./popUps/modal.css";

const Header = () => {
  const [userPopUp, setUserPopUp] = useState(false);
  const { logout } = useContext(AccountContext);

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
              U
            </div>
          </nav>
        </h2>
        {userPopUp && (
          <div id="user-pop-up">
            <button id="login-button" className="button" onClick={logout}>
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
