import { useState, useEffect } from "react";
import styles from "../css/NotificationBell.module.css";
import bellIcon from "../assets/bell.png";
import bellAlertIcon from "../assets/bellalert.png";
import axios from "axios";
import { getAuth } from "firebase/auth";

const BASE_URL = process.env.REACT_APP_API_URL;
const LEAD_TIME_DAYS = 7;
const EXPIRY_WARNING_DAYS = 14;
const OUT_OF_STOCK_WARNING_DAYS = 7;

export default function NotificationBell() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [nearOutOfStockItems, setNearOutOfStockItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const auth = getAuth(); 

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        const [stocksRes, ordersRes] = await Promise.all([
          axios.get(`${BASE_URL}/stocks/user/${user.uid}`),
          axios.get(`${BASE_URL}/orders/user/${user.uid}`),
        ]);

        const stocks = stocksRes.data;
        const orders = ordersRes.data;
        const today = new Date();

        // low stock, safety stock
        const lowStock = stocks.filter(
          (s) => Number(s.stock) <= Number(s.lowstock),
        );
        setLowStockItems(lowStock);

        // expiring soon
        const expiring = stocks.filter((stock) => {
          if (!stock.expiry_date) return false;
          const expiry = new Date(stock.expiry_date);
          const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
          return diffDays <= EXPIRY_WARNING_DAYS && diffDays >= 0;
        });
        setExpiringItems(expiring);

        // near out of stock with estimated date
        const nearOut = stocks
          .map((stock) => {
            const stockQty = Number(stock.stock);
            if (stockQty <= 0) return null;

            const today = new Date();
            const periodDays = 7; // lead time
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - (periodDays - 1));

            const totalDays = periodDays;
            let totalSold = 0;

            for (let i = 0; i < totalDays; i++) {
              const date = new Date(startDate);
              date.setDate(startDate.getDate() + i);

              let soldToday = 0;
              orders.forEach((order) => {
                const orderDate = new Date(
                  order.order_number.slice(0, 2) +
                    "/" +
                    order.order_number.slice(2, 4) +
                    "/" +
                    order.order_number.slice(4, 8),
                );
                if (orderDate.toDateString() === date.toDateString()) {
                  const product = order.products.find(
                    (p) => p.name === stock.name,
                  );
                  if (product) soldToday += Number(product.quantity) || 0;
                }
              });

              totalSold += soldToday; 
            }

            const avgDailySold = totalSold / totalDays;
            if (avgDailySold <= 0) return null;

            const reorderPoint = Math.ceil(avgDailySold * LEAD_TIME_DAYS);

            const daysToDeplete = Math.floor(stockQty / avgDailySold);
            if (daysToDeplete > OUT_OF_STOCK_WARNING_DAYS) return null;

            if (stockQty > reorderPoint) return null;

            const predictedDate = new Date(today);
            predictedDate.setDate(today.getDate() + Math.floor(daysToDeplete));

            return {
              ...stock,
              predictedOutOfStock: predictedDate,
            };
          })
          .filter(Boolean);

        setNearOutOfStockItems(nearOut);
      } catch (err) {
        console.error("Error fetching stocks for notifications:", err);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const totalAlerts =
    lowStockItems.length + expiringItems.length + nearOutOfStockItems.length;

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

              {nearOutOfStockItems.length > 0 && (
                <div className={styles.notifSection}>
                  <h4>Near Out of Stock</h4>
                  <ul>
                    {nearOutOfStockItems.map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong> - {item.stock} left,
                        expected out by{" "}
                        {item.predictedOutOfStock.toLocaleDateString()}
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
