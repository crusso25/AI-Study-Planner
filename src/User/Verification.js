import React, { useState, useContext } from "react";
import { AccountContext } from "./Account";

const Verification = ({ username, email, password }) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // To display success or error messages
  const { authenticate } = useContext(AccountContext);

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

  const handleVerification = async (e) => {
    e.preventDefault();
    try {
      await verifyUser(username, verificationCode);
      await authenticate(username, password);
      setMessage("Verification successful!");
    } catch (error) {
      setError("Verification failed. Please try again.");
    }
  };

  const resendVerification = async () => {
    try {
      const response = await fetch(`https://api.studymaster.io/api/auth/resend?email=${encodeURIComponent(email)}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to resend verification code");
      }

      setMessage("Verification code resent. Please check your email.");
    } catch (error) {
      setError("Failed to resend verification code. Please try again.");
    }
  };

  return (
    <form onSubmit={handleVerification}>
      <div>
        <h6>Verification email sent to: {email}</h6>
        <label>Verification Code:</label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
        />
      </div>
      <button type="submit">Verify Account</button>
      <div>{}</div>
      <button type="button" onClick={resendVerification}>
        Resend Verification Code
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}
    </form>
  );
};

export default Verification;
