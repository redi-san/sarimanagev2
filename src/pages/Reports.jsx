import { useState, useEffect } from "react";
import styles from "../css/Reports.module.css";
import axios from "axios";
import { getAuth } from "firebase/auth";

import BottomNav from "../components/BottomNav";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [filterDate, setFilterDate] = useState(new Date());
  const [showAll, setShowAll] = useState(false);

  const [activeTab, setActiveTab] = useState("sales"); // "sales" | "profit"

  const [showForecast, setShowForecast] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

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

  const inventoryData = stocks.map((stock) => {
    // Sum of sold quantities before the filter date
    /*const soldBefore = orders
      .filter((order) => getOrderDate(order) < filterDate)
      .reduce((sum, order) => {
        const product = order.products.find((p) => p.name === stock.name);
        return sum + (product ? parseFloat(product.quantity) : 0);
      }, 0); */

    // Sold today (or this month)
    const soldToday = filteredOrders.reduce((sum, order) => {
      const product = order.products.find((p) => p.name === stock.name);
      return sum + (product ? parseFloat(product.quantity) : 0);
    }, 0);

    // Start stock = current stock + sold today
    const startStock = parseFloat(stock.stock) + soldToday;

    const remaining = startStock - soldToday;

    return {
      name: stock.name,
      startStock,
      soldToday,
      remaining,
      status: remaining <= stock.lowstock ? "Low" : "OK",
    };
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

  /*useEffect(() => {
    if (orders.length > 0) {
      setFilterDate(new Date());
    }
  }, [orders]); */

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

  // Compute 3-month sales average for forecasting


  //const forecastSales = getThreeMonthForecast();

  // =========================
  // RECURSIVE 3-MONTH FORECAST
  // =========================
  // Put this function *above* where you call it (or call it only after it's defined)
  const getThreeMonthMovingAverage = (year) => {
    if (typeof year === "undefined") {
      // defensive: if no year passed, use current year
      year = new Date().getFullYear();
    }

    // Build mapped actual sales by year-month
    const salesByYearMonth = {};

    orders.forEach((order) => {
      const date = getOrderDate(order);
      const y = date.getFullYear();
      const m = date.getMonth();

      if (!salesByYearMonth[y]) salesByYearMonth[y] = Array(12).fill(null);

      // accumulate (if month never set starts as null -> treat as 0 when summing)
      const value = order.products.reduce((sum, p) => {
        const qty = parseFloat(p.quantity) || 0;
        const sell = parseFloat(p.selling_price) || 0;
        return sum + qty * sell;
      }, 0);

      // treat null as 0 for accumulation
      salesByYearMonth[y][m] = (salesByYearMonth[y][m] || 0) + value;
    });

    // helper: return actual sales number or null if we truly have no actual data for that y/m
    const getActualIfPresent = (y, m) => {
      // normalize month into [0..11] while adjusting year
      while (m < 0) {
        y -= 1;
        m += 12;
      }
      while (m > 11) {
        y += 1;
        m -= 12;
      }
      if (!salesByYearMonth[y]) return null;
      // month may be null or a number
      return salesByYearMonth[y][m] ?? null;
    };

    const forecast = Array(12).fill(0);

    // compute months 0..11 in order, using actuals when present, otherwise
    // use previously computed forecast values (never read forecast for negative index)
    for (let i = 0; i < 12; i++) {
      const needed = [i - 1, i - 2, i - 3];
      const vals = needed.map((monthIndex, k) => {
        // First try to get an actual for (year, monthIndex)
        const actual = getActualIfPresent(year, monthIndex);
        if (actual !== null) return actual;

        // If no actual, try to use already-computed forecast value for that month
        // For example, when computing month i, we can use forecast[i-1], forecast[i-2], etc.
        const forecastIndex = monthIndex; // could be negative -> map to previous-year month number
        // If forecastIndex is within 0..11 and already computed, use it
        if (forecastIndex >= 0 && forecastIndex < i) {
          return forecast[forecastIndex];
        }

        // If forecastIndex < 0, try to use actual from previous year (getActualIfPresent already checked that and returned null),
        // otherwise fallback to 0
        return 0;
      });

      // Ensure vals are numbers (no undefined)
      const v0 = Number(vals[0] || 0);
      const v1 = Number(vals[1] || 0);
      const v2 = Number(vals[2] || 0);

      forecast[i] = (v0 + v1 + v2) / 3;
    }

    return forecast;
  };

  // Generate forecast array once
  //const forecastArray = getThreeMonthMovingAverage();

  const [debts, setDebts] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await axios.get(`${BASE_URL}/debts/user/${user.uid}`);
          setDebts(res.data);
        } catch (err) {
          console.error("Error fetching debts:", err);
        }
      } else {
        setDebts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "debt") {
      setShowAll(true);
    }
  }, [activeTab]);

  useEffect(() => {
  if (orders.length > 0) {
    setFilterDate(new Date());
  }
}, [orders]);

// <- Add this right after
useEffect(() => {
  setShowForecast(false);
}, [showAll, setShowForecast]);


const downloadPDF = async () => {
  const report = document.getElementById("report-section");
  if (!report) return;

  // Save original styles
  const originalWidth = report.style.width;
  const originalTransform = report.style.transform;

  // Force desktop width (e.g., 1000px or whatever your PC width is)
  report.style.width = "1000px"; 
  report.style.transform = "scale(1)"; // prevent scaling issues

  const canvas = await html2canvas(report, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save("report.pdf");

  // Restore original styles
  report.style.width = originalWidth;
  report.style.transform = originalTransform;
};

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
          {activeTab !== "debt" && (
            <select
              className={styles.filterSelect}
              value={showAll ? "monthly" : "daily"}
              onChange={(e) => setShowAll(e.target.value === "monthly")}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          )}

          <div>
            <button
              onClick={() => {
                const newDate = new Date(filterDate);
                if (showAll) newDate.setMonth(newDate.getMonth() - 1);
                else newDate.setDate(newDate.getDate() - 1);
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
                if (showAll) newDate.setMonth(newDate.getMonth() + 1);
                else newDate.setDate(newDate.getDate() + 1);
                setFilterDate(newDate);
              }}
            >
              →
            </button>
          </div>
        </div>

        <button onClick={downloadPDF} className={styles.pdfButton}>
  Download as PDF
</button>

<div id="report-section">

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

        {/* Only show Sales/Forecast toggle when in monthly view */}
        {/* Only show Sales/Forecast toggle when in monthly view AND on Sales tab */}
        {activeTab === "sales" && showAll && (
          <div className={styles.salesForecastToggle}>
            <button
              className={`${styles.toggleButton} ${
                !showForecast ? styles.activeToggle : ""
              }`}
              onClick={() => setShowForecast(false)}
            >
              Actual
            </button>

            <button
              className={`${styles.toggleButton} ${
                showForecast ? styles.activeToggle : ""
              }`}
              onClick={() => setShowForecast(true)}
            >
              Forecast
            </button>
          </div>
        )}

        {/* Sales Overview */}
        <div className={styles.weeklyContainer}>
          {(() => {
            const isMonthly = showAll;
            const labels = isMonthly
              ? [
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
                ]
              : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            let dataPoints = [];

            if (activeTab === "debt") {
              dataPoints = labels.map((month, i) => {
                let value = 0;
                debts.forEach((debt) => {
                  const date = new Date(debt.date); // ← use debt creation date
                  if (
                    date.getFullYear() === filterDate.getFullYear() &&
                    date.getMonth() === i
                  ) {
                    value += parseFloat(debt.total || 0);
                  }
                });
                return { label: month, value };
              });
            } else if (activeTab === "inventory" && selectedProduct) {
              // Show chart for selected product only
              if (isMonthly) {
                // Monthly
                dataPoints = labels.map((month, i) => {
                  let value = 0;
                  orders.forEach((order) => {
                    const date = getOrderDate(order);
                    if (
                      date.getFullYear() === filterDate.getFullYear() &&
                      date.getMonth() === i
                    ) {
                      const product = order.products.find(
                        (p) => p.name === selectedProduct
                      );
                      if (product) value += parseFloat(product.quantity);
                    }
                  });
                  return { label: month, value };
                });
              } else {
                // Daily / Weekly
                const startOfWeek = new Date(filterDate);
                startOfWeek.setDate(filterDate.getDate() - filterDate.getDay()); // Sunday
                const weekDates = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  return d;
                });

                dataPoints = weekDates.map((date, i) => {
                  let value = 0;
                  orders.forEach((order) => {
                    const orderDate = getOrderDate(order);
                    if (orderDate.toDateString() === date.toDateString()) {
                      const product = order.products.find(
                        (p) => p.name === selectedProduct
                      );
                      if (product) value += parseFloat(product.quantity);
                    }
                  });
                  return { label: labels[i], value, date };
                });
              }
            } else {
              // Sales/Profit tab logic (original)
              if (isMonthly) {
                const forecastArray = showForecast
                  ? getThreeMonthMovingAverage(filterDate.getFullYear())
                  : [];
                dataPoints = labels.map((month, i) => {
                  let value = 0;
                  orders.forEach((order) => {
                    const date = getOrderDate(order);
                    if (
                      date.getFullYear() === filterDate.getFullYear() &&
                      date.getMonth() === i
                    ) {
                      const orderValue = order.products.reduce((sum, p) => {
                        const qty = parseFloat(p.quantity) || 0;
                        const sell = parseFloat(p.selling_price) || 0;
                        const buy = parseFloat(p.buying_price) || 0;
                        return (
                          sum +
                          (activeTab === "sales"
                            ? qty * sell
                            : activeTab === "profit"
                            ? qty * (sell - buy)
                            : 0)
                        );
                      }, 0);
                      value += orderValue;
                    }
                  });
                  if (showForecast) value = forecastArray[i] || 0;
                  return { label: month, value };
                });
              } else {
                // Daily/Weekly
                const startOfWeek = new Date(filterDate);
                startOfWeek.setDate(filterDate.getDate() - filterDate.getDay());
                const weekDates = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  return d;
                });

                dataPoints = weekDates.map((date, i) => {
                  let value = 0;
                  orders.forEach((order) => {
                    const orderDate = getOrderDate(order);
                    if (orderDate.toDateString() === date.toDateString()) {
                      const orderValue = order.products.reduce((sum, p) => {
                        const qty = parseFloat(p.quantity) || 0;
                        const sell = parseFloat(p.selling_price) || 0;
                        const buy = parseFloat(p.buying_price) || 0;
                        return (
                          sum +
                          (activeTab === "sales"
                            ? qty * sell
                            : activeTab === "profit"
                            ? qty * (sell - buy)
                            : 0)
                        );
                      }, 0);
                      value += orderValue;
                    }
                  });
                  return { label: labels[i], value, date };
                });
              }
            }

            const maxValue = Math.max(...dataPoints.map((d) => d.value)) || 1;
            const width = 550;
            const height = 180;
            const padding = 30;

            const points = dataPoints.map((d, i) => ({
              x: padding + (i / (labels.length - 1)) * (width - 2 * padding),
              y:
                height -
                padding -
                (d.value / maxValue) * (height - 2 * padding),
              label: d.label,
              value: d.value,
              date: d.date,
            }));

            const pathD = points
              .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(" ");

            return (
              <div>
                <h3 style={{ marginBottom: "10px", marginLeft: "10px" }}>
                  {activeTab === "inventory" && selectedProduct
                    ? `${
                        showAll ? "Sold This Month" : "Sold Today"
                      } - ${selectedProduct}`
                    : activeTab === "sales"
                    ? showForecast
                      ? "Sales Forecast"
                      : `${showAll ? "Sales of the Month" : "Sales of the Day"}`
                    : activeTab === "profit"
                    ? `${
                        showAll ? "Profits of the Month" : "Profits of the Day"
                      }`
                    : ""}
                </h3>

<svg
  viewBox={`0 0 ${width} ${height}`}
  style={{
    width: "100%",
    maxWidth: "100%", // prevent overflow
    height: "auto",
background: "var(--card-bg)",
    borderRadius: "12px",
    padding: "10px",
    boxSizing: "border-box", // ensure padding doesn't add to width
  }}
>

                  <line
                    x1={padding}
                    y1={padding}
                    x2={padding}
                    y2={height - padding}
                    stroke="#999"
                  />
                  <line
                    x1={padding}
                    y1={height - padding}
                    x2={width - padding}
                    y2={height - padding}
                    stroke="#999"
                  />
                  <path
                    d={pathD}
                    stroke="#4caf50"
                    strokeWidth="2"
                    fill="none"
                    className={styles.lineAnimation}
                  />

                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={
                        (!isMonthly &&
                          p.date?.toDateString() ===
                            filterDate.toDateString()) ||
                        (isMonthly && i === filterDate.getMonth())
                          ? 6
                          : 5
                      }
                      fill={
                        (!isMonthly &&
                          p.date?.toDateString() ===
                            filterDate.toDateString()) ||
                        (isMonthly && i === filterDate.getMonth())
                          ? "#ffcc00"
                          : "#4caf50"
                      }
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (isMonthly) {
                          const newDate = new Date(filterDate);
                          newDate.setMonth(i);
                          setFilterDate(newDate);
                        } else {
                          setFilterDate(p.date);
                        }
                      }}
                    />
                  ))}

                  {points.map((p, i) => (
                    <text
                      key={i}
                      x={p.x}
                      y={height - padding + 15}
                      fontSize="14"
                      textAnchor="middle"
                        fill="var(--chart-label)"

                    >
                      {p.label}
                    </text>
                  ))}

                  {points.map((p, i) => (
                    <text
                      key={i}
                      x={p.x}
                      y={p.y - 6}
                      fontSize="14"
                      textAnchor="middle"
fill="var(--chart-text)"
                    >
                      {p.value.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </text>
                  ))}
                </svg>
              </div>
            );
          })()}
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          {activeTab === "inventory" ? (
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>Product</th>
                  <th>Sold {showAll ? "This Month" : "Today"}</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.map((p, idx) => (
                  <tr
                    key={idx}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedProduct === p.name ? "#f0f0f0" : "transparent",
                    }}
                    onClick={() => setSelectedProduct(p.name)}
                  >
                    <td>{idx + 1}</td>
                    <td>{p.name}</td>
                    <td>{p.soldToday}</td>
                    <td>{p.remaining}</td>
                    <td
                      style={{
                        color: p.status === "Low" ? "red" : "green",
                        fontWeight: "600",
                      }}
                    >
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "debt" ? (
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {debts
                  .filter((debt) => {
                    const debtDate = new Date(debt.date); // debt creation date
                    return (
                      debtDate.getMonth() === filterDate.getMonth() &&
                      debtDate.getFullYear() === filterDate.getFullYear()
                    );
                  })
                  .map((debt, idx) => {
                    const paidAmount =
                      debt.payments?.reduce(
                        (sum, p) => sum + parseFloat(p.amount),
                        0
                      ) || 0;
                    const balance = (parseFloat(debt.total) || 0) - paidAmount;

                    return (
                      <tr key={debt.id}>
                        <td>{idx + 1}</td>
                        <td>{debt.customer_name}</td>
                        <td>
                          ₱
                          {parseFloat(debt.total || 0).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </td>
                        <td>
                          ₱
                          {balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td>{debt.due_date}</td>
                        <td
                          style={{
                            color: debt.status === "Unpaid" ? "red" : "green",
                            fontWeight: "600",
                          }}
                        >
                          {debt.status}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>Products</th>
                  <th>Price</th>
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
                          color: p.totalSales > 0 ? "green" : "var(--chart-text)",
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
          )}
        </div>
        </div>


        <BottomNav />
      </div>
    </div>
  );
}
