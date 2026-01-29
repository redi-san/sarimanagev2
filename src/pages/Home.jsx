import styles from "../css/Home.module.css";
import { useState, useEffect } from "react";
//import { Link } from "react-router-dom";
import axios from "axios";
import { getAuth } from "firebase/auth";
import BottomNav from "../components/BottomNav";
import SalesIcon from "../assets/SalesIcon.png";
import ProfitsIcon from "../assets/ProfitsIcon.png";
import TotalDebtsIcon from "../assets/TotalDebtsIcon.png";
import LowStockIcon from "../assets/LowStockIcon.png";

import NotificationBell from "../components/NotificationBell";

import MonthlySalesChart from "../components/MonthlySalesChart";

const BASE_URL = process.env.REACT_APP_API_URL; // Use live backend URL

export default function Home() {
  const [todaysSale, setTodaysSale] = useState(null);
  const [todaysProfit, setTodaysProfit] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(null);
  const [totalDebts, setTotalDebts] = useState(null);

  const auth = getAuth();

  const [recommendedProducts, setRecommendedProducts] = useState([]);

  /* const [showMonthly, setShowMonthly] = useState(true); // Monthly view
const [showForecast, setShowForecast] = useState(false); // Toggle Actual/Forecast
const [monthlyData, setMonthlyData] = useState([]); */

  const [orders, setOrders] = useState([]);

  const getLocalDateString = (date = new Date()) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0]; // YYYY-MM-DD (LOCAL)
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        // Fetch today's orders
        const ordersRes = await axios.get(
          `${BASE_URL}/orders/user/${user.uid}`,
        );
        const allOrders = ordersRes.data;
        setOrders(allOrders); // ← add this

        const today = getLocalDateString();
        const getOrderDate = (order) => {
          const datePart = order.order_number.split("-")[0];
          const month = datePart.slice(0, 2);
          const day = datePart.slice(2, 4);
          const year = datePart.slice(4);
          return `${year}-${month}-${day}`;
        };

        const todaysOrders = allOrders.filter(
          (order) => getOrderDate(order) === today,
        );

        setTodaysSale(
          todaysOrders.reduce(
            (sum, order) => sum + parseFloat(order.total || 0),
            0,
          ),
        );
        setTodaysProfit(
          todaysOrders.reduce(
            (sum, order) => sum + parseFloat(order.profit || 0),
            0,
          ),
        );
      } catch (err) {
        console.error("Error fetching orders:", err);
      }

      try {
        // Fetch stocks
        const stocksRes = await axios.get(
          `${BASE_URL}/stocks/user/${user.uid}`,
        );
        const allStocks = stocksRes.data;
        setLowStockCount(
          allStocks.filter(
            (stock) => Number(stock.stock) <= Number(stock.lowstock),
          ).length,
        );
      } catch (err) {
        console.error("Error fetching stocks:", err);
      }

      try {
        // Fetch debts
        const debtsRes = await axios.get(`${BASE_URL}/debts/user/${user.uid}`);
        const allDebts = debtsRes.data;

        const currentBalance = allDebts
          .filter((debt) => debt.status !== "Paid")
          .reduce((sum, debt) => {
            const total = parseFloat(debt.total || 0);
            const paid = parseFloat(debt.total_paid || 0);
            return sum + (total - paid);
          }, 0);

        setTotalDebts(currentBalance);
      } catch (err) {
        console.error("Error fetching debts:", err);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        const ordersRes = await axios.get(
          `${BASE_URL}/orders/user/${user.uid}`,
        );
        const allOrders = ordersRes.data;

        // ----- STEP 1: Get current month and last year -----
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1–12
        const lastYear = now.getFullYear() - 1;

        // ----- STEP 2: Helper to extract date from order_number -----
        const getOrderDateObj = (order) => {
          const datePart = order.order_number.split("-")[0]; // MMDDYYYY
          const mm = parseInt(datePart.slice(0, 2), 10);
          const dd = parseInt(datePart.slice(2, 4), 10);
          const yyyy = parseInt(datePart.slice(4), 10);
          return { mm, dd, yyyy };
        };

        // ----- STEP 3: Filter orders from SAME MONTH last year -----
        const lastYearOrders = allOrders.filter((order) => {
          const { mm, yyyy } = getOrderDateObj(order);
          return mm === currentMonth && yyyy === lastYear;
        });

        // ----- STEP 4: Compute product sales -----
        const productSales = {};
        lastYearOrders.forEach((order) => {
          order.products.forEach((p) => {
            if (!productSales[p.name]) productSales[p.name] = 0;
            productSales[p.name] +=
              (parseFloat(p.quantity) || 0) *
              (parseFloat(p.selling_price) || 0);
          });
        });

        // ----- STEP 5: Sort & store top 5 -----
        const sortedProducts = Object.entries(productSales)
          .sort((a, b) => b[1] - a[1]) // sort by sales
          .map(([name]) => ({ name })); // keep ONLY name

        setRecommendedProducts(sortedProducts.slice(0, 5));
      } catch (err) {
        console.error("Error computing recommendations:", err);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <div>
      <div className={styles.topbar}>
        <h2>Sari Manage</h2>
        <NotificationBell />
      </div>

      <div className={styles.main}>
        <h2 className={styles.sectionTitle}>Overview</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <img src={SalesIcon} alt="Sales Icon" className={styles.icon} />
              <h3>Today's Sales</h3>
            </div>
            <div className={styles.cardValue}>
              <b>
                {todaysSale === null ? (
                  <span className={styles.loading}>Loading...</span>
                ) : (
                  `₱${todaysSale.toFixed(2)}`
                )}
              </b>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                src={ProfitsIcon}
                alt="Profits Icon"
                className={styles.icon}
              />
              <h3>Today's Profits</h3>
            </div>
            <div className={styles.cardValue}>
              <b>
                {todaysProfit === null ? (
                  <span className={styles.loading}>Loading...</span>
                ) : (
                  `₱${todaysProfit.toFixed(2)}`
                )}
              </b>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                src={TotalDebtsIcon}
                alt="Total Debts Icon"
                className={styles.icon}
              />
              <h3>Total Debts</h3>
            </div>
            <div className={styles.cardValue}>
              <b
                style={{
                  color:
                    totalDebts === null
                      ? "#999"
                      : totalDebts > 0
                        ? "red"
                        : "#66bb6a",
                }}
              >
                {totalDebts === null ? (
                  <span className={styles.loading}>Loading...</span>
                ) : (
                  `₱${totalDebts.toFixed(2)}`
                )}
              </b>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                src={LowStockIcon}
                alt="Low Stock Icon"
                className={styles.icon}
              />
              <h3>Low Stocks</h3>
            </div>
            <div className={styles.cardValue}>
              <b
                style={{
                  color:
                    lowStockCount === null
                      ? "#999"
                      : lowStockCount > 0
                        ? "red"
                        : "#66bb6a",
                }}
              >
                {lowStockCount === null ? (
                  <span className={styles.loading}>Loading...</span>
                ) : (
                  lowStockCount
                )}
              </b>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Sales Chart */}
      <MonthlySalesChart orders={orders} />

      <h2 className={`${styles.sectionTitle} ${styles.recommendedTitle}`}>
        Recommended Products
      </h2>
      <div className={styles.recommendationSection}>
        {recommendedProducts.length === 0 ? (
          <p>No recommendations yet</p>
        ) : (
          <ul className={styles.recommendationList}>
            {recommendedProducts.map((p, idx) => (
              <li key={idx} className={styles.recommendationItem}>
                <span className={styles.productName}>{p.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
