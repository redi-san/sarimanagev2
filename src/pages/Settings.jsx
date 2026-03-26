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
  const [showComponents, setShowComponents] = useState(false);

  const [debtsEnabled, setDebtsEnabled] = useState(() => {
    return localStorage.getItem("debtsEnabled") === "true";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [fontScale, setFontScale] = useState(() => {
    return localStorage.getItem("fontScale") || "1";
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem("primaryColor") || "#ffcc00";
  });

  const resetPrimaryColor = () => {
    const defaultColor = "#F4C430";
    setPrimaryColor(defaultColor);
  };

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

  const [inventoryEnabled, setInventoryEnabled] = useState(
    localStorage.getItem("inventoryEnabled") === "true",
  );
  const [reportsDebtsEnabled, setReportsDebtsEnabled] = useState(
    localStorage.getItem("reportsDebtsEnabled") === "true",
  );

  const [reportsProfitEnabled, setReportsProfitEnabled] = useState(
    localStorage.getItem("reportsProfitEnabled") === "true",
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

      await axios.put(`${BASE_URL}/users/${user.uid}`, {
        name: editedData.firstName,
        last_name: editedData.lastName,
        email: editedData.email,
        username: editedData.username,
        store_name: editedData.storeName,
        mobile_number: editedData.mobileNumber,
      });

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
        "(prefers-color-scheme: dark)",
      ).matches;
      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light",
      );
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

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

  useEffect(() => {
    document.documentElement.style.setProperty("--primary-color", primaryColor);
    localStorage.setItem("primaryColor", primaryColor);
  }, [primaryColor]);

  return (
    <div>
      <div className={styles.topbar}>
        <h2>Settings</h2>
      </div>

      <div className={styles.main}>
        <div className={styles.card}>
          <h3 className={styles.username}>
            {userData ? `${userData.name} ${userData.last_name}` : "Loading..."}
          </h3>

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

        {!editingProfile ? (
          <>
            {!showComponents && (
              <div
                className={`${styles.card} ${styles.clickable}`}
                onClick={() => {
                  setShowAppSettings(!showAppSettings);
                  setShowComponents(false);
                }}
              >
                <div className={styles.cardHeader}>
                  <span>App Settings</span>
                </div>
                <p>Customize your app experience and notifications</p>
              </div>
            )}

            {!showAppSettings && (
              <div
                className={`${styles.card} ${styles.clickable}`}
                onClick={() => {
                  setShowComponents(!showComponents);
                  setShowAppSettings(false);
                }}
              >
                <div className={styles.cardHeader}>
                  <span>Components</span>
                </div>
                <p>Manage app components</p>
              </div>
            )}

            {showComponents && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span>Components</span>
                </div>

                <div className={styles.sectionTitle}>Transactions</div>

                <div className={styles.switchRow}>
                  <span>Debts</span>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={debtsEnabled}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setDebtsEnabled(next);
                        localStorage.setItem("debtsEnabled", String(next));
                      }}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <div
                  className={styles.sectionTitle}
                  style={{ marginTop: "20px" }}
                >
                  Reports
                </div>

                <div className={styles.switchRow}>
                  <span>Profit</span>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={reportsProfitEnabled}
                      onChange={(e) => {
                        localStorage.setItem(
                          "reportsProfitEnabled",
                          e.target.checked,
                        );
                        setReportsProfitEnabled(e.target.checked);
                      }}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchRow}>
                  <span>Inventory</span>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={inventoryEnabled}
                      onChange={(e) => {
                        localStorage.setItem(
                          "inventoryEnabled",
                          e.target.checked,
                        );
                        setInventoryEnabled(e.target.checked);
                      }}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.switchRow}>
                  <span>Debts</span>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
checked={reportsDebtsEnabled}
                      onChange={(e) => {
                        localStorage.setItem(
                          "reportsDebtsEnabled",
                          e.target.checked,
                        );
                        setReportsDebtsEnabled(e.target.checked);
                      }}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            )}

            {!showAppSettings && !showComponents && (
              <>
                <div className={`${styles.card} ${styles.clickable}`}>
                  <div className={styles.cardHeader}>
                    <span>Help and Support</span>
                  </div>
                  <p>
                    Email: support@sarimanage.com <br />
                    Phone: +63 900 000 0000
                  </p>
                </div>

                <button className={styles.logoutBtn} onClick={handleLogout}>
                  Log Out
                </button>
              </>
            )}

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

                {/* primary color */}
                <div className={styles.formGroup}>
                  <label>Primary Color</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "50px",
                        height: "30px",
                        borderRadius: "6px",
                        backgroundColor: primaryColor,
                        border: "1px solid #ccc",
                      }}
                    ></div>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{
                        width: "50px",
                        height: "30px",
                        padding: 0,
                        border: "none",
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    />
                    <button
                      type="button"
                      onClick={resetPrimaryColor}
                      style={{
                        padding: "6px 12px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#ddd",
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#555",
                    }}
                  >
                    {primaryColor.toUpperCase()}
                  </div>
                </div>

                {/* font size */}
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
                  readOnly
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
                  placeholder="Enter Username"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Store Name</label>
                <input
                  id="storeName"
                  type="text"
                  value={editedData.storeName}
                  onChange={handleChange}
                  placeholder="Enter Store Name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Mobile Number</label>
                <input
                  id="mobileNumber"
                  type="text"
                  value={editedData.mobileNumber}
                  onChange={handleChange}
                  placeholder="Enter Mobile Number"
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
