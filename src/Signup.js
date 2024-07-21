import React, { useState } from "react";
import UserPool from "./UserPool";
import { CognitoUserAttribute } from "amazon-cognito-identity-js";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();

    const attributeList = [];
    const dataEmail = {
      Name: "email",
      Value: email,
    };
    const attributeEmail = new CognitoUserAttribute(dataEmail);
    attributeList.push(attributeEmail);

    UserPool.signUp(username, password, attributeList, null, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });
  };

  return (
    <div className="form-container">
      <form onSubmit={onSubmit} className="auth-form">
        <h1>Sign Up</h1>
        <label htmlFor="signup-username">Username: </label>
        <input
          type="text"
          id="signup-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <label htmlFor="signup-email">Email: </label>
        <input
          type="email"
          id="signup-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="signup-password">Password: </label>
        <input
          type="password"
          id="signup-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="auth-button">Signup</button>
      </form>
    </div>
  );
};

export default Signup;