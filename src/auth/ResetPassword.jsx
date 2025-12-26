import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = getAuth();

  const [oobCode, setOobCode] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get oobCode from URL query params
    const code = searchParams.get("oobCode");
    if (!code) {
      setError("Invalid or missing reset code.");
      return;
    }
    setOobCode(code);

    // Verify code to prefill email
    verifyPasswordResetCode(auth, code)
      .then((email) => setEmail(email))
      .catch(() => setError("Invalid or expired reset code."));
  }, [searchParams, auth]);

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage("Password has been reset successfully!");
      setTimeout(() => navigate("/login"), 3000); // redirect to login
    } catch (err) {
      console.error(err);
      setError("Failed to reset password. The link may have expired.");
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
          Reset Password
        </h1>

        {error && <p style={{ color: "red", fontSize: "14px", marginBottom: "15px" }}>{error}</p>}

        {message ? (
          <p style={{ color: "green", fontSize: "14px" }}>{message}</p>
        ) : (
          <>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
              Enter a new password for <strong>{email}</strong>
            </p>

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
