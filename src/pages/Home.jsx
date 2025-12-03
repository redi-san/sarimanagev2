import styles from "../css/Home.module.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  const [todaysSale, setTodaysSale] = useState(0);
  const [todaysProfit, setTodaysProfit] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalDebts, setTotalDebts] = useState(0);

  const auth = getAuth();

  const [recommendedProducts, setRecommendedProducts] = useState([]);

  /* const [showMonthly, setShowMonthly] = useState(true); // Monthly view
const [showForecast, setShowForecast] = useState(false); // Toggle Actual/Forecast
const [monthlyData, setMonthlyData] = useState([]); */

const [orders, setOrders] = useState([]);



  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        // Fetch today's orders
        const ordersRes = await axios.get(
          `${BASE_URL}/orders/user/${user.uid}`
        );
        const allOrders = ordersRes.data;
        setOrders(allOrders); // ← add this

        const today = new Date().toISOString().split("T")[0];
        const getOrderDate = (order) => {
          const datePart = order.order_number.split("-")[0];
          const month = datePart.slice(0, 2);
          const day = datePart.slice(2, 4);
          const year = datePart.slice(4);
          return `${year}-${month}-${day}`;
        };

        const todaysOrders = allOrders.filter(
          (order) => getOrderDate(order) === today
        );

        setTodaysSale(
          todaysOrders.reduce(
            (sum, order) => sum + parseFloat(order.total || 0),
            0
          )
        );
        setTodaysProfit(
          todaysOrders.reduce(
            (sum, order) => sum + parseFloat(order.profit || 0),
            0
          )
        );
      } catch (err) {
        console.error("Error fetching orders:", err);
      }

      try {
        // Fetch stocks
        const stocksRes = await axios.get(
          `${BASE_URL}/stocks/user/${user.uid}`
        );
        const allStocks = stocksRes.data;
        setLowStockCount(
          allStocks.filter(
            (stock) => Number(stock.stock) <= Number(stock.lowstock)
          ).length
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
          `${BASE_URL}/orders/user/${user.uid}`
        );
        const allOrders = ordersRes.data;

        // Compute total sales per product
        const productSales = {};
        allOrders.forEach((order) => {
          order.products.forEach((p) => {
            if (!productSales[p.name]) productSales[p.name] = 0;
            productSales[p.name] +=
              parseFloat(p.quantity) * parseFloat(p.selling_price);
          });
        });

        // Convert to array and sort
        const sortedProducts = Object.entries(productSales)
          .map(([name, totalSales]) => ({ name, totalSales }))
          .sort((a, b) => b.totalSales - a.totalSales);

        // Take top 3
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
          <Link to="/reports" className={styles.card}>
            <div className={styles.cardHeader}>
              <img src={SalesIcon} alt="Sales Icon" className={styles.icon} />
              <h3>Today's Sales</h3>
            </div>
            <div className={styles.cardValue}>
              <b>₱{todaysSale.toFixed(2)}</b>
            </div>
          </Link>

          <Link to="/reports" className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                src={ProfitsIcon}
                alt="Profits Icon"
                className={styles.icon}
              />
              <h3>Today's Profits</h3>
            </div>
            <div className={styles.cardValue}>
              <b>₱{todaysProfit.toFixed(2)}</b>
            </div>
          </Link>

          <Link to="/debts" className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                src={TotalDebtsIcon}
                alt="Total Debts Icon"
                className={styles.icon}
              />
              <h3>Total Debts</h3>
            </div>
            <div className={styles.cardValue}>
              <b style={{ color: totalDebts > 0 ? "red" : "#66bb6a" }}>
                ₱{totalDebts.toFixed(2)}
              </b>
            </div>
          </Link>

          <Link to="/stocks" className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                src={LowStockIcon}
                alt="Low Stock Icon"
                className={styles.icon}
              />
              <h3>Low Stocks</h3>
            </div>
            <div className={styles.cardValue}>
              <b style={{ color: lowStockCount > 0 ? "red" : "#66bb6a" }}>
                {lowStockCount}
              </b>
            </div>
          </Link>
        </div>
      </div>

        {/* Monthly Sales Chart */}
  <MonthlySalesChart orders={orders} />

      <h2 className={styles.sectionTitle}>Recommended Products</h2>
      {recommendedProducts.length === 0 ? (
        <p>No recommendations yet</p>
      ) : (
        <ul className={styles.recommendationList}>
          {recommendedProducts.map((p, idx) => (
            <li key={idx} className={styles.recommendationItem}>
              <Link to="/reports">
                <span className={styles.productName}>{p.name}</span>
                <span className={styles.productSales}>
                  ₱{p.totalSales.toFixed(2)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </div>
  );
}
