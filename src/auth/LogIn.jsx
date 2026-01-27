import React, { useState } from "react";
import styles from "../css/login.module.css";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import axios from "axios"; // ✅ added import
import logo from "../assets/sarimanagelogo.png";
import hidePasswordIcon from "../assets/hidePassword.png";
import showPasswordIcon from "../assets/showPassword.png";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";


const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"; // ✅ defined

function LogIn() {
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState(""); // ✅ to display email in modal

  const navigate = useNavigate();
  const auth = getAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let emailToUse = identifier;

    // If username was entered — get email from backend
    if (!identifier.includes("@")) {
      try {
        const res = await axios.get(`${BASE_URL}/users/username/${identifier}`);
        emailToUse = res.data.email;
      } catch (err) {
        return setError("Username not found.");
      }
    }

    try {
      await signInWithEmailAndPassword(auth, emailToUse, password);
      setLoggedInEmail(emailToUse); // ✅ store for modal
      setSuccess(true);
      navigate("/home");
} catch (err) {
  console.error("Firebase login error:", err);

  const code = err.code || "";

  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials"
  ) {
    setError("Wrong email/username or password.");
  } else if (code === "auth/too-many-requests") {
    setError("Too many attempts. Please try again later.");
  } else {
    setError("Login failed. Please try again.");
  }
}


  };

  const forgotPassword = () => {
    navigate("/forgotpassword"); // can trigger Firebase reset email
  };

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) navigate("/home", { replace: true });
  });
  return () => unsub();
}, [auth, navigate]);

useEffect(() => {
  axios
    .get(`${BASE_URL}/health`)
    .then(() => console.log("Backend awake"))
    .catch(() => console.log("Backend not reachable"));
}, []);


  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src={logo} alt="Sari Manage Logo" />
          <h2>Sari Manage</h2>
        </div>

        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Log in to manage your sari-sari store</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="identifier">Email or Username</label>
            <input
              type="text"
              id="identifier"
              placeholder="Email or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <img
                src={showPassword ? hidePasswordIcon : showPasswordIcon}
                alt={showPassword ? "Hide password" : "Show password"}
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          {error && (
            <p id="loginError" className={styles.errorMessage}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.btn}>
            Login
          </button>
        </form>

        <p className={styles.switch}>
          Don’t have an account? <a href="/signup">Sign Up</a>
        </p>

        <p className={styles.forgot}>
          <button
            type="button"
            onClick={forgotPassword}
            className={styles.linkBtn}
          >
            Forgot Password?
          </button>
        </p>
      </div>

      {/* ✅ Success Modal */}
      {success && (
        <div id="successModal" className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Welcome, {loggedInEmail}</h3>
            <p>Login successful!</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogIn;
