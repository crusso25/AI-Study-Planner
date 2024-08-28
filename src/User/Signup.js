import React, { useState, useContext } from "react";
import { AccountContext } from "./Account";
import Verification from "./Verification"; // Import the Verification component

const Signup = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistered, setIsRegistered] = useState(false); // State to control when to show the verification form
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { authenticate } = useContext(AccountContext);

  const handleSignup = async (e) => {
    setIsLoading(true);
    e.preventDefault();
    try {
      const response = await fetch(
        "https://api.studymaster.io/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password, email }),
        }
      );
      if (!response.ok) {
        throw new Error("Registration failed");
      }
      const data = await response.json();
      await verifyUser(data.username, data.verificationCode);
      await authenticate(username, password);
    } catch (error) {
      setError("Signup failed");
    }
    setIsLoading(false);
  };

  const verifyUser = async (username, verificationCode) => {
    try {
      const response = await fetch("https://api.studymaster.io/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, verificationCode }),
      });

      if (!response.ok) {
        throw new Error("Verification failed");
      }

      return response;
    } catch (error) {
      console.error("Error verifying account:", error);
      throw error;
    }
  };

  return (
    <div>
      {isRegistered ? (
        <Verification username={username} email={email} password={password} /> // Pass the password to the Verification component
      ) : (
        <>
          <>
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
          </>
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Signup;
