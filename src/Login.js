import React, { useState, useContext } from "react";
import { AccountContext } from "./Account";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { authenticate } = useContext(AccountContext);

  const onSubmit = (event) => {
    event.preventDefault();

    authenticate(username, password)
      .then((data) => {
        console.log("Logged in!", data);
      })
      .catch((err) => {
        console.error("Failed to login", err);
      });
  };

  return (
    <div className="form-container">
      <form onSubmit={onSubmit} className="auth-form">
        <h1>Log In</h1>
        <label htmlFor="login-username">Username: </label>
        <input
          type="text"
          id="login-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <label htmlFor="login-password">Password: </label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="auth-button">Login</button>
      </form>
    </div>
  );
};

export default Login;