import React, { useState, useContext } from "react";
import { AccountContext } from "./Account";
import Verification from "./Verification"; // Import the Verification component

const Signup = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistered, setIsRegistered] = useState(false); // State to control when to show the verification form
  const [error, setError] = useState("");
  const { authenticate } = useContext(AccountContext);

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("https://api.studymaster.io/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, email }),
      });
      console.log(response);

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      setIsRegistered(true); // Set the state to true to display the verification component
    } catch (error) {
      setError("Signup failed");
    }
  };

  return (
    <div>
      {isRegistered ? (
        <Verification username={username} password={password} /> // Pass the password to the Verification component
      ) : (
        <form onSubmit={handleSignup}>
          <div>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit">Signup</button>
          {error && <p>{error}</p>}
        </form>
      )}
    </div>
  );
};

export default Signup;
