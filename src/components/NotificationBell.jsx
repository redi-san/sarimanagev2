// src/components/NotificationBell.jsx
import { useState, useEffect } from "react";
import styles from "../css/NotificationBell.module.css";
import bellIcon from "../assets/bell.png";
import bellAlertIcon from "../assets/bellalert.png";
import axios from "axios";
import { getAuth } from "firebase/auth";

const BASE_URL = process.env.REACT_APP_API_URL;
const EXPIRY_WARNING_DAYS = 14;

export default function NotificationBell() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        const res = await axios.get(`${BASE_URL}/stocks/user/${user.uid}`);
        const stocks = res.data;

        // Low stock
        const lowStock = stocks.filter(
          (s) => Number(s.stock) <= Number(s.lowstock)
        );
        setLowStockItems(lowStock);

        // Expiring soon
        const today = new Date();
        const expiring = stocks.filter((stock) => {
          if (!stock.expiry_date) return false;
          const expiry = new Date(stock.expiry_date);
          const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
          return diffDays <= EXPIRY_WARNING_DAYS && diffDays >= 0;
        });
        setExpiringItems(expiring);
      } catch (err) {
        console.error("Error fetching stocks for notifications:", err);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const totalAlerts = lowStockItems.length + expiringItems.length;

  return (
    <div className={styles.notifWrapper}>
      <button
        className={styles.notifBell}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <img
          src={totalAlerts > 0 ? bellAlertIcon : bellIcon}
          alt="Notifications"
          className={`${styles.notifIcon} ${
            totalAlerts > 0 ? styles.alertBell : ""
          }`}
        />
        {totalAlerts > 0 && (
          <span className={styles.notifCount}>{totalAlerts}</span>
        )}
      </button>

      {showDropdown && (
        <div className={styles.notifDropdown}>
          {totalAlerts === 0 ? (
            <p className={styles.noNotif}>No notifications</p>
          ) : (
            <div className={styles.notifSections}>
              {lowStockItems.length > 0 && (
                <div className={styles.notifSection}>
                  <h4>Low Stock</h4>
                  <ul>
                    {lowStockItems.map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong> - {item.stock} left
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {expiringItems.length > 0 && (
                <div className={styles.notifSection}>
                  <h4>Expiring Soon</h4>
                  <ul>
                    {expiringItems.map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong> - Expires on{" "}
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
