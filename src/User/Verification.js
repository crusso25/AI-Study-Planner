import React, { useState, useEffect, useContext } from "react";
import { AccountContext } from "./Account";

const Verification = ({ username, password }) => {
  // Accept password as a prop
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const { authenticate } = useContext(AccountContext);

  const verifyUser = async (username, verificationCode) => {
    try {
      const response = await fetch("http://Springboot-backend-aws-env.eba-hezpp67z.us-east-1.elasticbeanstalk.com/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, verificationCode }), // Correctly send the username and verification code
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

  useEffect(() => {
    console.log(username);
    console.log(verificationCode);
  });

  const handleVerification = async (e) => {
    e.preventDefault();
    try {
      await verifyUser(username, verificationCode);
      await authenticate(username, password); // Login the user after successful verification
    } catch (error) {
      setError("Verification failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleVerification}>
      <div>
        <label>Verification Code:</label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
        />
      </div>
      <button type="submit">Verify Account</button>
      {error && <p>{error}</p>}
    </form>
  );
};

export default Verification;
