import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import axios from "axios";
import styles from "../css/SignUp.module.css";
import logo from "../assets/sarimanagelogo.png";
import hidePasswordIcon from "../assets/hidePassword.png";
import showPasswordIcon from "../assets/showPassword.png";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    storeName: "",
    username: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
    privacyPolicy: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [showPolicy, setShowPolicy] = useState(false);

  const [policyError, setPolicyError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,16}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword(formData.password)) {
      setPasswordError(
        "Password must be 12–16 chars, include uppercase, lowercase, number, and special character."
      );
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (!formData.privacyPolicy) {
      setPolicyError("You must agree to the Data Privacy Policy.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });

      await axios.post(`${BASE_URL}/users`, {
        firebase_uid: user.uid,
        name: formData.firstName,
        last_name: formData.lastName,
        email: user.email,
        username: formData.username,
        store_name: formData.storeName,
        mobile_number: formData.mobileNumber,
      });

      // ✅ Clear error
      setPasswordError("");

      // ✅ Automatically navigate to Home
      navigate("/home");
    } catch (err) {
      setPasswordError(err.message);
    }
  };

  const handleContinue = () => {
    setShowModal(false);
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src={logo} alt="Sari Manage Logo" className={styles.logoImage} />
          <h2>Sari Manage</h2>
        </div>

        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Manage your sari-sari store with ease</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.nameRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
  <label htmlFor="username">Username</label>
  <input
    type="text"
    id="username"
    placeholder="Enter your username"
    value={formData.username}
    onChange={handleChange}
    required
  />
</div>


          <div className={styles.inputGroup}>
            <label htmlFor="storeName">Store Name</label>
            <input
              type="text"
              id="storeName"
              placeholder="Enter your store name"
              value={formData.storeName}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="mobileNumber">Mobile Number</label>
            <input
              type="text"
              id="mobileNumber"
              placeholder="09XXXXXXXXX"
              value={formData.mobileNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
            <label htmlFor="password">
              Password
              <small className={styles.hint}>
                <br />
                (Mix: lowercase & uppercase letters, numbers, & a special
                character | 12–16 chars)
              </small>
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <span
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <img
                  src={showPassword ? hidePasswordIcon : showPasswordIcon}
                  alt={showPassword ? "Hide Password" : "Show Password"}
                  className={styles.passwordIcon}
                />
              </span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {passwordError && (
              <p id="passwordError" className={styles.errorMessage}>
                {passwordError}
              </p>
            )}
          </div>

          <div className={styles.termsRow}>
            <input
              type="checkbox"
              id="privacyPolicy"
              checked={formData.privacyPolicy || false}
              onChange={(e) =>
                setFormData({ ...formData, privacyPolicy: e.target.checked })
              }
            />
            <label htmlFor="privacyPolicy">
              I agree to the{" "}
              <span className={styles.link} onClick={() => setShowPolicy(true)}>
                Data Privacy Policy
              </span>
            </label>
          </div>

          {policyError && <p className={styles.errorMessage}>{policyError}</p>}

          <button type="submit" className={styles.btn}>
            Sign Up
          </button>
        </form>

        <p className={styles.switch}>
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>

      {/* DATA PRIVACY POLICY MODAL */}
      {showPolicy && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Data Privacy Policy</h3>
            <p style={{ textAlign: "left", fontSize: "0.9rem" }}>
              By using Sari Manage, you consent to the collection and storage of
              your basic profile information (first name, last name, store name,
              email, mobile number) and operational data such as customer debts,
              transaction records, and inventory data.
              <br />
              <br />
              This information is used solely for store management features. We
              do not sell or share your data with third parties.
            </p>

            <button
              className={styles.continue}
              onClick={() => setShowPolicy(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Account created successfully!</h3>
            <p>Please login to continue.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancel}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className={styles.continue} onClick={handleContinue}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignUp;
