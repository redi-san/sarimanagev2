import React, { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth();

  const handleReset = async () => {
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, email);

      setMessage(
        "Password reset email sent. Please check your inbox (and spam folder)."
      );
    } catch (err) {
      console.error(err);

      // Friendly Firebase error handling
      if (err.code === "auth/user-not-found") {
        setError("No account found with that email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError("Failed to send reset email. Try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: '"Segoe UI", sans-serif',
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "22px", color: "#444", marginBottom: "15px" }}>
          Forgot Password
        </h1>

        <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
          Enter your registered email and we’ll send you instructions to reset
          your password.
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "10px",
            fontSize: "14px",
            marginBottom: "15px",
          }}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#ddd" : "#ffcc00",
            color: "#333",
            border: "none",
            borderRadius: "10px",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {error && (
          <p style={{ color: "red", fontSize: "14px", marginTop: "10px" }}>
            {error}
          </p>
        )}

        {message && (
          <p style={{ color: "green", fontSize: "14px", marginTop: "10px" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
