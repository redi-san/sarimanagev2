import { useState, useEffect } from "react";
import styles from "../css/Reports.module.css";
import axios from "axios";
import { getAuth } from "firebase/auth";

import BottomNav from "../components/BottomNav";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [filterDate, setFilterDate] = useState(new Date());
  const [showAll, setShowAll] = useState(false);

  const [activeTab, setActiveTab] = useState("sales"); // "sales" | "profit"

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Fetch data only for the logged-in user
          const [ordersRes, stocksRes] = await Promise.all([
            axios.get(`${BASE_URL}/orders/user/${user.uid}`),
            axios.get(`${BASE_URL}/stocks/user/${user.uid}`),
          ]);

          setOrders(ordersRes.data);
          setStocks(stocksRes.data);
        } catch (err) {
          console.error("Error fetching user-specific reports:", err);
        }
      } else {
        // If user logs out → clear old data
        setOrders([]);
        setStocks([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date) => date.toISOString().split("T")[0];

  const getOrderDate = (order) => {
    const datePart = order.order_number.split("-")[0];
    const month = parseInt(datePart.slice(0, 2), 10) - 1; // 0-based months
    const day = parseInt(datePart.slice(2, 4), 10);
    const year = parseInt(datePart.slice(4), 10);
    return new Date(year, month, day);
  };

  const filteredOrders = orders.filter((order) => {
    const orderDate = getOrderDate(order);

    if (showAll) {
      return (
        orderDate.getMonth() === filterDate.getMonth() &&
        orderDate.getFullYear() === filterDate.getFullYear()
      );
    } else {
      return orderDate.toDateString() === filterDate.toDateString();
    }
  });

  const aggregatedProducts = {};
  filteredOrders.forEach((order) => {
    order.products.forEach((p) => {
      if (!aggregatedProducts[p.name]) {
        aggregatedProducts[p.name] = {
          name: p.name,
          unitPrice: parseFloat(p.selling_price),
          totalQty: 0,
          totalSales: 0,
          profit: 0,
        };
      }
      const qty = parseFloat(p.quantity) || 0;
      const sell = parseFloat(p.selling_price) || 0;
      const buy = parseFloat(p.buying_price) || 0;

      aggregatedProducts[p.name].totalQty += qty;
      aggregatedProducts[p.name].totalSales += qty * sell;
      aggregatedProducts[p.name].profit += qty * (sell - buy);
    });
  });

  useEffect(() => {
    if (orders.length > 0) {
      setFilterDate(new Date());
    }
  }, [orders]);

  const reportData = stocks.map((stock) => {
    const sold = aggregatedProducts[stock.name];
    return {
      name: stock.name,
      //image: stock.image ? `http://localhost:5000${stock.image}` : null,
      unitPrice: parseFloat(stock.selling_price) || 0,
      totalQty: sold ? sold.totalQty : 0,
      totalSales: sold ? sold.totalSales : 0,
      profit: sold ? sold.profit : 0,
    };
  });

  reportData.sort((a, b) => b.totalSales - a.totalSales);

  const totalSales = reportData.reduce((sum, p) => sum + p.totalSales, 0);
  const totalProfit = reportData.reduce((sum, p) => sum + p.profit, 0);

  return (
    <div>
      {/* Topbar */}
      <div className={styles.topbar}>
        <h2>Reports</h2>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabButton} ${
              activeTab === "sales" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("sales")}
          >
            Sales
          </button>

          <button
            className={`${styles.tabButton} ${
              activeTab === "profit" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("profit")}
          >
            Profit
          </button>

          <button
            className={`${styles.tabButton} ${
              activeTab === "inventory" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("inventory")}
          >
            Inventory
          </button>

          <button
            className={`${styles.tabButton} ${
              activeTab === "debt" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("debt")}
          >
            Debt
          </button>
        </div>

        {/* Filters */}
        <div className={styles["filter-controls"]}>
          <select
            className={styles.filterSelect}
            value={showAll ? "monthly" : "daily"}
            onChange={(e) => setShowAll(e.target.value === "monthly")}
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>

          <div>
            <button
              onClick={() => {
                const newDate = new Date(filterDate);
                if (showAll) {
                  // Monthly: move back one month
                  newDate.setMonth(newDate.getMonth() - 1);
                } else {
                  // Daily: move back one day
                  newDate.setDate(newDate.getDate() - 1);
                }
                setFilterDate(newDate);
              }}
            >
              ←
            </button>

            <span>
              {showAll
                ? filterDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })
                : formatDate(filterDate)}
            </span>

            <button
              onClick={() => {
                const newDate = new Date(filterDate);
                if (showAll) {
                  // Monthly: move forward one month
                  newDate.setMonth(newDate.getMonth() + 1);
                } else {
                  // Daily: move forward one day
                  newDate.setDate(newDate.getDate() + 1);
                }
                setFilterDate(newDate);
              }}
            >
              →
            </button>
          </div>
        </div>

        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <h3>Total Sales</h3>
            <p>
              ₱
              {totalSales.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className={styles.card}>
            <h3>Total Profit</h3>
            <p>
              ₱
              {totalProfit.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Sales Overview */}
        <div className={styles.weeklySalesSection}>
          <h3>
            {activeTab === "sales"
              ? showAll
                ? "Sales of the Month"
                : "Sales of the Day"
              : showAll
              ? "Profits of the Month"
              : "Profits of the Day"}
          </h3>

          <div
            className={`${styles.weeklyContainer} ${
              showAll ? styles.monthlyView : styles.weeklyView
            }`}
          >
            {(() => {
              if (showAll) {
                //MONTHLY VIEW
                const months = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ];
                const salesByMonth = months.map((month) => ({
                  month,
                  sales: 0,
                }));

                const selectedYear = filterDate.getFullYear();

                orders.forEach((order) => {
                  const date = getOrderDate(order);
                  if (date.getFullYear() === selectedYear) {
                    const monthIndex = date.getMonth(); // 0–11
                    const orderValue = order.products.reduce((sum, p) => {
                      const qty = parseFloat(p.quantity) || 0;
                      const sell = parseFloat(p.selling_price) || 0;
                      const buy = parseFloat(p.buying_price) || 0;

                      if (activeTab === "sales") return sum + qty * sell;
                      if (activeTab === "profit")
                        return sum + qty * (sell - buy);

                      return sum;
                    }, 0);

                    salesByMonth[monthIndex].sales += orderValue;
                  }
                });

                const maxSales =
                  Math.max(...salesByMonth.map((m) => m.sales)) || 1;

                return salesByMonth.map((m, i) => {
                  return (
                    <div
                      key={i}
                      className={styles.dayCard}
                      onClick={() => {
                        const newDate = new Date(selectedYear, i, 1);
                        setFilterDate(newDate);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <h4>{m.month}</h4>
                      <p>
                        ₱
                        {m.sales.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>

                      <div className={styles.barBackground}>
                        <div
                          className={`${styles.barFill} ${
                            i === filterDate.getMonth() &&
                            filterDate.getFullYear() === selectedYear
                              ? styles.activeBar
                              : ""
                          }`}
                          style={{
                            height: `${(m.sales / maxSales) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              } else {
                //WEEKLY VIEW
                const weekDays = [
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                  "Sun",
                ];
                const salesByDay = weekDays.map((day) => ({
                  day,
                  sales: 0,
                }));

                const selected = new Date(filterDate);
                const dayOfWeek = selected.getDay(); // 0 = Sunday
                const diffToMonday = (dayOfWeek + 6) % 7;
                const monday = new Date(selected);
                monday.setDate(selected.getDate() - diffToMonday);
                monday.setHours(0, 0, 0, 0);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                orders.forEach((order) => {
                  const date = getOrderDate(order);
                  if (date >= monday && date <= sunday) {
                    const dayIndex = date.getDay(); // 0=Sun, 1=Mon...
                    const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                    const orderValue = order.products.reduce((sum, p) => {
                      const qty = parseFloat(p.quantity) || 0;
                      const sell = parseFloat(p.selling_price) || 0;
                      const buy = parseFloat(p.buying_price) || 0;

                      if (activeTab === "sales") return sum + qty * sell;
                      if (activeTab === "profit")
                        return sum + qty * (sell - buy);

                      return sum;
                    }, 0);

                    salesByDay[mappedIndex].sales += orderValue;
                  }
                });

                const maxSales =
                  Math.max(...salesByDay.map((d) => d.sales)) || 1;

                return salesByDay.map((d, i) => {
                  // compute the date for that day
                  const selected = new Date(filterDate);
                  const dayOfWeek = selected.getDay();
                  const diffToMonday = (dayOfWeek + 6) % 7;
                  const monday = new Date(selected);
                  monday.setDate(selected.getDate() - diffToMonday);
                  const currentDate = new Date(monday);
                  currentDate.setDate(monday.getDate() + i);

                  //const isSelected = currentDate.toDateString() === filterDate.toDateString();
                  const isSelected =
                    currentDate.toDateString() === filterDate.toDateString();

                  return (
                    <div
                      key={i}
                      className={`${styles.dayCard} ${
                        isSelected ? styles.activeDay : ""
                      }`}
                      onClick={() => setFilterDate(currentDate)}
                      style={{ cursor: "pointer" }}
                    >
                      <h4>{d.day}</h4>
                      <p>
                        ₱
                        {d.sales.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>

                      <div className={styles.barBackground}>
                        <div
                          className={`${styles.barFill} ${
                            isSelected ? styles.activeBar : ""
                          }`}
                          style={{
                            height: `${(d.sales / maxSales) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              }
            })()}
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th></th>
                <th>Products</th>
                <th>Price</th> {/* Selling price */}
                <th>Buy Price</th>
                <th>Quantity</th>
                {activeTab === "sales" && <th>Sales</th>}
                {activeTab === "profit" && <th>Profit</th>}
              </tr>
            </thead>

            <tbody>
              {reportData.map((p, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{p.name}</td>
                  <td>₱{p.unitPrice.toFixed(2)}</td>
                  <td>
                    ₱
                    {Number(
                      stocks.find((s) => s.name === p.name)?.buying_price || 0
                    ).toFixed(2)}
                  </td>
                  <td>{p.totalQty}</td>

                  {activeTab === "sales" && (
                    <td
                      style={{
                        color: p.totalSales > 0 ? "green" : "black",
                        fontWeight: p.totalSales > 0 ? "600" : "normal",
                      }}
                    >
                      ₱{p.totalSales.toFixed(2)}
                    </td>
                  )}

                  {activeTab === "profit" && (
                    <td
                      style={{
                        color: p.profit > 0 ? "green" : "black",
                        fontWeight: p.profit !== 0 ? "600" : "normal",
                      }}
                    >
                      ₱{p.profit.toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
