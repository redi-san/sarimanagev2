import { useState, useEffect } from "react";
import styles from "../css/Settings.module.css";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import axios from "axios";

import BottomNav from "../components/BottomNav";

const BASE_URL = process.env.REACT_APP_API_URL;

export default function Settings() {
  const [editingProfile, setEditingProfile] = useState(false);
  const [userData, setUserData] = useState(null);

  const [showAppSettings, setShowAppSettings] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [fontScale, setFontScale] = useState(() => {
    return localStorage.getItem("fontScale") || "1";
  });

  const [editedData, setEditedData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    storeName: "",
    mobileNumber: "",
  });

  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ✅ Fetch user data from backend
  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const res = await axios.get(`${BASE_URL}/users/${user.uid}`);
        setUserData(res.data);
        setEditedData({
          firstName: res.data.name || "",
          lastName: res.data.last_name || "",
          email: res.data.email || "",
          username: res.data.username,

          storeName: res.data.store_name || "",
          mobileNumber: res.data.mobile_number || "",
        });
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, [auth]);

  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setEditingProfile(false);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setEditedData({ ...editedData, [id]: value });
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // ✅ Include storeName and mobileNumber in the PUT request
      await axios.put(`${BASE_URL}/users/${user.uid}`, {
        name: editedData.firstName,
        last_name: editedData.lastName,
        email: editedData.email,
        username: editedData.username,
        store_name: editedData.storeName,
        mobile_number: editedData.mobileNumber,
      });

      // ✅ Update local state after successful save
      setUserData({
        ...userData,
        name: editedData.firstName,
        last_name: editedData.lastName,
        email: editedData.email,
        username: editedData.username,
        store_name: editedData.storeName,
        mobile_number: editedData.mobileNumber,
      });

      setEditingProfile(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  useEffect(() => {
    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light"
      );
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", fontScale);

    localStorage.setItem("fontScale", fontScale);
  }, [fontScale]);

  const handleFontScaleChange = (e) => {
    setFontScale(e.target.value);
  };

  return (
    <div>
      {/* Topbar */}
      <div className={styles.topbar}>
        <h2>Settings</h2>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        {/* <h1 className={styles.pageTitle}>Settings</h1> */}

        {/* Profile Card */}
        <div className={styles.card}>
          {/* Full Name */}
          <h3 className={styles.username}>
            {userData ? `${userData.name} ${userData.last_name}` : "Loading..."}
          </h3>

          {/* Store Name */}
          <p className={styles.storeName}>
            {userData ? userData.store_name : "Loading..."}
          </p>

          <div className={styles.buttonRow}>
            <button
              className={`${styles.btn} ${styles.editProfileBtn}`}
              onClick={handleEditProfile}
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* ✅ Conditional Rendering */}
        {!editingProfile ? (
          <>
            {/* App Settings Card */}
            <div
              className={`${styles.card} ${styles.clickable}`}
              onClick={() => setShowAppSettings(!showAppSettings)}
            >
              <div className={styles.cardHeader}>
                <span>App Settings</span>
              </div>
              <p>Customize your app experience and notifications</p>
            </div>

            {/* If NOT showing App Settings, show these */}
            {!showAppSettings && (
              <>
                {/* Help and Support Card */}
                <div className={`${styles.card} ${styles.clickable}`}>
                  <div className={styles.cardHeader}>
                    <span>Help and Support</span>
                  </div>
                  <p>
                    Email: support@sarimanage.com <br />
                    Phone: +63 900 000 0000
                  </p>
                </div>

                {/* Logout Button */}
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  Log Out
                </button>
              </>
            )}

            {/* If App Settings is opened, show ONLY Application Settings card */}
            {showAppSettings && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span>Application Settings</span>
                </div>

                <div className={styles.formGroup}>
                  <label>Theme</label>
                  <select
                    id="theme"
                    className={styles.selectInput}
                    value={theme}
                    onChange={handleThemeChange}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Font Size</label>
                  <select
                    className={styles.selectInput}
                    value={fontScale}
                    onChange={handleFontScaleChange}
                  >
                    <option value="0.9">Small</option>
                    <option value="1">Default</option>
                    <option value="1.1">Large</option>
                    <option value="1.2">Extra Large</option>
                  </select>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* ✅ Edit Profile Card */}
            <div className={`${styles.card} ${styles.editProfileCard}`}>
              <div className={styles.cardHeader}>
                <span>Edit Profile</span>
              </div>

              <div className={styles.formGroup}>
                <label>First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={editedData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={editedData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  id="email"
                  type="email"
                  value={editedData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Username</label>
                <input
                  id="username"
                  type="text"
                  value={editedData.username}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Store Name</label>
                <input
                  id="storeName"
                  type="text"
                  value={editedData.storeName}
                  onChange={handleChange}
                  placeholder="where is your store name bro"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Mobile Number</label>
                <input
                  id="mobileNumber"
                  type="text"
                  value={editedData.mobileNumber}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.editButtonRow}>
                <button className={styles.saveBtn} onClick={handleSave}>
                  Save Changes
                </button>
                <button className={styles.cancelBtn} onClick={handleCancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
