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
  const [filterMode, setFilterMode] = useState("daily");
  const [activeTab, setActiveTab] = useState("sales");
  const [showForecast, setShowForecast] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProfitProduct, setSelectedProfitProduct] = useState(null);
  const inventoryEnabled = localStorage.getItem("inventoryEnabled") === "true";
  const debtsEnabled = localStorage.getItem("reportsDebtsEnabled") === "true";
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [compareMode, setCompareMode] = useState("current");
  const [customStartDate, setCustomStartDate] = useState(() => new Date());
  const [customEndDate, setCustomEndDate] = useState(() => new Date());

  const categories = [
    "all",
    ...new Set(stocks.map((s) => s.category).filter(Boolean)),
  ];

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
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
        setOrders([]);
        setStocks([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "inventory" && !inventoryEnabled) setActiveTab("sales");
    if (activeTab === "debt" && !debtsEnabled) setActiveTab("sales");
    if (
      activeTab === "profit" &&
      localStorage.getItem("reportsProfitEnabled") !== "true"
    )
      setActiveTab("sales");
  }, [activeTab, inventoryEnabled, debtsEnabled]);

  const formatDate = (date) => date.toISOString().split("T")[0];

  const getOrderDate = (order) => {
    const datePart = order.order_number.split("-")[0];
    const month = parseInt(datePart.slice(0, 2), 10) - 1;
    const day = parseInt(datePart.slice(2, 4), 10);
    const year = parseInt(datePart.slice(4), 10);
    return new Date(year, month, day);
  };

  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const getRangeDaysInclusive = (start, end) => {
    const s = startOfDay(start).getTime();
    const e = startOfDay(end).getTime();
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatShortMD = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatShortMDY = (d) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const filteredOrders = orders.filter((order) => {
    const orderDate = getOrderDate(order);

    if (filterMode === "monthly") {
      return (
        orderDate.getMonth() === filterDate.getMonth() &&
        orderDate.getFullYear() === filterDate.getFullYear()
      );
    }

    if (filterMode === "weekly") {
      const startOfWeek = new Date(filterDate);
      startOfWeek.setDate(filterDate.getDate() - filterDate.getDay());

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return orderDate >= startOfWeek && orderDate <= endOfWeek;
    }

    if (filterMode === "quarterly") {
      const quarter = Math.floor(filterDate.getMonth() / 3);
      const startMonth = quarter * 3;
      const endMonth = startMonth + 2;

      return (
        orderDate.getFullYear() === filterDate.getFullYear() &&
        orderDate.getMonth() >= startMonth &&
        orderDate.getMonth() <= endMonth
      );
    }

    if (filterMode === "yearly") {
      return orderDate.getFullYear() === filterDate.getFullYear();
    }

    if (filterMode === "custom") {
      const start = startOfDay(customStartDate);
      const end = endOfDay(customEndDate);
      return orderDate >= start && orderDate <= end;
    }

    return orderDate.toDateString() === filterDate.toDateString();
  });

  const inventoryData = stocks.map((stock) => {
    let soldQty = 0;

    orders.forEach((order) => {
      const orderDate = getOrderDate(order);
      const product = order.products.find((p) => p.name === stock.name);
      if (!product) return;

      const qty = parseFloat(product.quantity) || 0;

      if (filterMode === "daily") {
        if (orderDate.toDateString() === filterDate.toDateString()) {
          soldQty += qty;
        }
      } else if (filterMode === "weekly") {
        const startOfWeek = new Date(filterDate);
        startOfWeek.setDate(filterDate.getDate() - filterDate.getDay());

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (orderDate >= startOfWeek && orderDate <= endOfWeek) {
          soldQty += qty;
        }
      } else if (filterMode === "monthly") {
        if (
          orderDate.getFullYear() === filterDate.getFullYear() &&
          orderDate.getMonth() === filterDate.getMonth()
        ) {
          soldQty += qty;
        }
      } else if (filterMode === "quarterly") {
        const quarter = Math.floor(filterDate.getMonth() / 3);
        const startMonth = quarter * 3;
        const endMonth = startMonth + 2;

        if (
          orderDate.getFullYear() === filterDate.getFullYear() &&
          orderDate.getMonth() >= startMonth &&
          orderDate.getMonth() <= endMonth
        ) {
          soldQty += qty;
        }
      } else if (filterMode === "yearly") {
        if (orderDate.getFullYear() === filterDate.getFullYear()) {
          soldQty += qty;
        }
      } else if (filterMode === "custom") {
        const start = startOfDay(customStartDate);
        const end = endOfDay(customEndDate);

        if (orderDate >= start && orderDate <= end) {
          soldQty += qty;
        }
      }
    });

    const remaining = parseFloat(stock.stock) || 0;

    return {
      name: stock.name,
      soldToday: soldQty,
      remaining,
      status: remaining <= parseFloat(stock.lowstock || 0) ? "Low" : "In Stock",
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

  const reportData = stocks
    .map((stock) => {
      const sold = aggregatedProducts[stock.name];
      return {
        name: stock.name,
        unitPrice: parseFloat(stock.selling_price) || 0,
        totalQty: sold ? sold.totalQty : 0,
        totalSales: sold ? sold.totalSales : 0,
        profit: sold ? sold.profit : 0,
      };
    })
    .filter((p) => p.totalQty > 0 || p.totalSales > 0 || p.profit !== 0);

  reportData.sort((a, b) => b.totalSales - a.totalSales);

  const totalSales = reportData.reduce((sum, p) => sum + p.totalSales, 0);
  const totalProfit = reportData.reduce((sum, p) => sum + p.profit, 0);

  const getThreeMonthMovingAverage = (year) => {
    if (typeof year === "undefined") {
      year = new Date().getFullYear();
    }

    const salesByYearMonth = {};

    orders.forEach((order) => {
      const date = getOrderDate(order);
      const y = date.getFullYear();
      const m = date.getMonth();

      if (!salesByYearMonth[y]) salesByYearMonth[y] = Array(12).fill(null);

      const value = order.products.reduce((sum, p) => {
        const qty = parseFloat(p.quantity) || 0;
        const sell = parseFloat(p.selling_price) || 0;
        return sum + qty * sell;
      }, 0);

      salesByYearMonth[y][m] = (salesByYearMonth[y][m] || 0) + value;
    });

    const getActualIfPresent = (y, m) => {
      while (m < 0) {
        y -= 1;
        m += 12;
      }
      while (m > 11) {
        y += 1;
        m -= 12;
      }
      if (!salesByYearMonth[y]) return null;
      return salesByYearMonth[y][m] ?? null;
    };

    const forecast = Array(12).fill(0);

    for (let i = 0; i < 12; i++) {
      const needed = [i - 1, i - 2, i - 3];
      const vals = needed.map((monthIndex, k) => {
        const actual = getActualIfPresent(year, monthIndex);
        if (actual !== null) return actual;
        const forecastIndex = monthIndex;
        if (forecastIndex >= 0 && forecastIndex < i) {
          return forecast[forecastIndex];
        }
        return 0;
      });

      const v0 = Number(vals[0] || 0);
      const v1 = Number(vals[1] || 0);
      const v2 = Number(vals[2] || 0);

      forecast[i] = (v0 + v1 + v2) / 3;
    }

    return forecast;
  };

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
    if (orders.length > 0) {
      setFilterDate(new Date());
    }
  }, [orders]);

  useEffect(() => {
    setShowForecast(false);
  }, [filterMode]);

  const downloadPDF = async () => {
    const report = document.getElementById("report-section");
    if (!report) return;

    const summaryCards = report.querySelector("." + styles.summaryCards);
    if (summaryCards) summaryCards.style.display = "none";

    const reportHeader = document.createElement("div");
    reportHeader.id = "temp-report-header";
    reportHeader.style.textAlign = "center";
    reportHeader.style.marginTop = "40px";
    reportHeader.style.marginBottom = "20px";

    const title = document.createElement("div");
    title.style.fontSize = "22px";
    title.style.fontWeight = "700";
    title.style.marginBottom = "5px";
    const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    title.innerText = `${tabName} Report`;

    const dateLine = document.createElement("div");
    dateLine.style.fontSize = "18px";
    dateLine.style.fontWeight = "600";
    dateLine.innerText =
      filterMode === "monthly"
        ? `Month: ${filterDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}`
        : filterMode === "weekly"
          ? `Week: ${getWeekRangeText(filterDate)}`
          : `Date: ${formatDisplayDate(filterDate)}`;

    reportHeader.appendChild(title);
    reportHeader.appendChild(dateLine);

    report.prepend(reportHeader);

    const originalWidth = report.style.width;
    const originalTransform = report.style.transform;

    report.style.width = "800px";
    report.style.transform = "scale(1)";

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

    const dateStr =
      filterMode === "monthly"
        ? `${filterDate.getFullYear()}-${(filterDate.getMonth() + 1).toString().padStart(2, "0")}`
        : formatDate(filterDate);
    pdf.save(`${tabName}_Report_${dateStr}.pdf`);

    report.style.width = originalWidth;
    report.style.transform = originalTransform;

    reportHeader.remove();

    if (summaryCards) summaryCards.style.display = "flex";
  };

  const formatDisplayDate = (date) =>
    date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  const sortedInventoryData = [...inventoryData].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const getWeekRangeText = (date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startText = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const endText = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startText} - ${endText}`;
  };

  useEffect(() => {
    if (activeTab === "inventory" && stocks.length > 0) {
      const sorted = [...stocks].sort((a, b) => a.name.localeCompare(b.name));
      setSelectedProduct(sorted[0].name);
    }
  }, [activeTab, stocks]);

  const getStockForecastInfo = (productName) => {
    const product = inventoryData.find((p) => p.name === productName);
    if (!product) return null;

    const today = new Date();
    const pastDays = 7;

    let totalSold = 0;

    for (let i = 0; i < pastDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      let soldToday = 0;

      orders.forEach((order) => {
        const orderDate = getOrderDate(order);
        if (orderDate.toDateString() === date.toDateString()) {
          const pItem = order.products.find((p) => p.name === productName);
          if (pItem) soldToday += parseFloat(pItem.quantity) || 0;
        }
      });

      totalSold += soldToday;
    }

    const avgDailySold = totalSold / pastDays;

    if (avgDailySold <= 0) {
      return {
        avgDailySold: 0,
        outOfStockDate: null,
        predictionText: "Stock sufficient / cannot predict",
      };
    }

    const daysToDeplete = product.remaining / avgDailySold;
    const outOfStockDate = new Date();
    outOfStockDate.setDate(
      outOfStockDate.getDate() + Math.floor(daysToDeplete),
    );

    return {
      avgDailySold,
      outOfStockDate,
      predictionText: `Expected to run out of stock on: ${formatDisplayDate(outOfStockDate)}`,
    };
  };

  useEffect(() => {
    if (activeTab === "debt") {
      setFilterMode("monthly");
    }
  }, [activeTab]);

  function getWeeksOfMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDate = new Date(firstDay);

    while (startDate <= lastDay) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

      if (endDate > lastDay) endDate.setDate(lastDay.getDate());

      weeks.push({
        start: new Date(startDate),
        end: new Date(endDate),
      });

      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() + 1);
    }

    return weeks;
  }

  useEffect(() => {
    if (activeTab !== "profit") setSelectedProfitProduct(null);
  }, [activeTab]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  return (
    <div>
      <div className={styles.topbar}>
        <h2>Reports</h2>
      </div>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabButton} ${
              activeTab === "sales" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("sales")}
          >
            Sales
          </button>

          {localStorage.getItem("reportsProfitEnabled") === "true" && (
            <button
              className={`${styles.tabButton} ${
                activeTab === "profit" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("profit")}
            >
              Profit
            </button>
          )}

          {localStorage.getItem("inventoryEnabled") === "true" && (
            <button
              className={`${styles.tabButton} ${
                activeTab === "inventory" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("inventory")}
            >
              Inventory
            </button>
          )}

          {localStorage.getItem("reportsDebtsEnabled") === "true" && (
            <button
              className={`${styles.tabButton} ${
                activeTab === "debt" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("debt")}
            >
              Debts
            </button>
          )}
        </div>

        <div className={styles["filter-controls"]}>
          {activeTab !== "debt" && (
            <>
              <select
                className={styles.filterSelect}
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </>
          )}

          <div>
            {filterMode === "custom" ? (
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <div className={styles.customRangeWrap}>
                  <div className={styles.customDatePill}>
                    <span className={styles.customDateTag}>Start</span>
                    <input
                      className={styles.customDateInput}
                      type="date"
                      value={formatDate(customStartDate)}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const next = new Date(e.target.value);
                        if (next > customEndDate) setCustomEndDate(next);
                        setCustomStartDate(next);
                      }}
                      max={formatDate(new Date())}
                      required
                    />
                  </div>

                  <div className={styles.customDatePill}>
                    <span className={styles.customDateTag}>End</span>
                    <input
                      className={styles.customDateInput}
                      type="date"
                      value={formatDate(customEndDate)}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const next = new Date(e.target.value);
                        if (next < customStartDate) setCustomStartDate(next);
                        setCustomEndDate(next);
                      }}
                      max={formatDate(new Date())}
                      required
                    />
                  </div>

                  <span className={styles.customRangeText}>
                    {formatShortMD(customStartDate)} -{" "}
                    {formatShortMDY(customEndDate)}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <button
                  className={styles.arrowButton}
                  onClick={() => {
                    const newDate = new Date(filterDate);
                    if (filterMode === "monthly")
                      newDate.setMonth(newDate.getMonth() - 1);
                    else if (filterMode === "weekly")
                      newDate.setDate(newDate.getDate() - 7);
                    else if (filterMode === "quarterly")
                      newDate.setMonth(newDate.getMonth() - 3);
                    else if (filterMode === "yearly")
                      newDate.setFullYear(newDate.getFullYear() - 5);
                    else newDate.setDate(newDate.getDate() - 1);

                    setFilterDate(newDate);
                  }}
                >
                  ←
                </button>

                {filterMode === "monthly" ? (
                  <span>
                    {filterDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                ) : filterMode === "weekly" ? (
                  <span>{getWeekRangeText(filterDate)}</span>
                ) : (
                  <label className={styles.dateLabel}>
                    {formatDisplayDate(filterDate)}
                    <input
                      type="date"
                      value={formatDate(filterDate)}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setFilterDate(new Date(e.target.value));
                      }}
                      className={styles.hiddenDateInput}
                      max={formatDate(new Date())}
                      required
                    />
                  </label>
                )}

                <button
                  className={styles.arrowButton}
                  onClick={() => {
                    const newDate = new Date(filterDate);
                    if (filterMode === "monthly")
                      newDate.setMonth(newDate.getMonth() + 1);
                    else if (filterMode === "weekly")
                      newDate.setDate(newDate.getDate() + 7);
                    else if (filterMode === "quarterly")
                      newDate.setMonth(newDate.getMonth() + 3);
                    else if (filterMode === "yearly")
                      newDate.setFullYear(newDate.getFullYear() + 5);
                    else newDate.setDate(newDate.getDate() + 1);

                    setFilterDate(newDate);
                  }}
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>

        <button onClick={downloadPDF} className={styles.pdfButton}>
          Download as PDF
        </button>

        <div id="report-section">
          {activeTab !== "debt" && (
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
          )}

          <div className={styles.weeklyContainer}>
            {(() => {
              const isMonthly = filterMode === "monthly";
              const isWeekly = filterMode === "weekly";
              const isQuarterly = filterMode === "quarterly";
              const isYearly = filterMode === "yearly";
              const isCustom = filterMode === "custom";

              const xLabelFontSize = isCustom ? 14 : 28;
              //const valueFontSize = isCustom ? 14 : 22;
              //const profitValueFontSize = isCustom ? 12 : 20;

              const startYear =
                filterDate.getFullYear() - (filterDate.getFullYear() % 5);

              const customDays = isCustom
                ? getRangeDaysInclusive(customStartDate, customEndDate)
                : 0;

              const customBucket = !isCustom
                ? null
                : customDays <= 14
                  ? "daily"
                  : customDays <= 90
                    ? "weekly"
                    : "monthly";

              const labels = isYearly
                ? Array.from({ length: 5 }, (_, i) =>
                    (startYear + i).toString(),
                  )
                : isMonthly
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
                  : isWeekly
                    ? ["Week 1", "Week 2", "Week 3", "Week 4"]
                    : isQuarterly
                      ? ["Q1", "Q2", "Q3", "Q4"]
                      : isCustom
                        ? []
                        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

              let dataPoints = [];
              let actualPoints = [];
              let forecastPoints = [];
              let previousCompareDataPoints = [];

              const isComparingPrevious =
                (activeTab === "sales" || activeTab === "profit") &&
                compareMode === "previous";

              const shouldShowForecast =
                activeTab === "sales" &&
                filterMode === "monthly" &&
                showForecast;

              const calcOrderValue = (order, mode, productName = null) => {
                return order.products.reduce((sum, p) => {
                  if (productName && p.name !== productName) return sum;

                  const qty = parseFloat(p.quantity) || 0;
                  const sell = parseFloat(p.selling_price) || 0;
                  const buy = parseFloat(p.buying_price) || 0;

                  return (
                    sum + (mode === "sales" ? qty * sell : qty * (sell - buy))
                  );
                }, 0);
              };

              const buildSeries = (mode, productName = null) => {
                if (filterMode === "custom") {
                  const start = startOfDay(customStartDate);
                  const end = endOfDay(customEndDate);

                  if (customBucket === "daily") {
                    const days = getRangeDaysInclusive(
                      customStartDate,
                      customEndDate,
                    );
                    return Array.from({ length: days }, (_, i) => {
                      const d = new Date(start);
                      d.setDate(d.getDate() + i);

                      let value = 0;
                      orders.forEach((order) => {
                        const od = getOrderDate(order);
                        if (od.toDateString() === d.toDateString()) {
                          value += calcOrderValue(order, mode, productName);
                        }
                      });

                      return {
                        label: d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        value,
                        date: d,
                      };
                    });
                  }

                  if (customBucket === "weekly") {
                    const buckets = [];
                    let cursor = new Date(start);

                    while (cursor <= end) {
                      const bStart = new Date(cursor);
                      const bEnd = new Date(cursor);
                      bEnd.setDate(bEnd.getDate() + 6);
                      if (bEnd > end) bEnd.setTime(end.getTime());

                      let value = 0;
                      orders.forEach((order) => {
                        const od = getOrderDate(order);
                        if (od >= bStart && od <= bEnd) {
                          value += calcOrderValue(order, mode, productName);
                        }
                      });

                      buckets.push({
                        label: `${formatShortMD(bStart)} - ${formatShortMD(bEnd)}`,
                        value,
                        date: bStart,
                      });

                      cursor = new Date(bEnd);
                      cursor.setDate(cursor.getDate() + 1);
                    }

                    return buckets;
                  }

                  const bucketsMap = new Map();
                  orders.forEach((order) => {
                    const od = getOrderDate(order);
                    if (od < start || od > end) return;

                    const key = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, "0")}`;
                    const prev = bucketsMap.get(key) || {
                      value: 0,
                      date: new Date(od.getFullYear(), od.getMonth(), 1),
                    };

                    prev.value += calcOrderValue(order, mode, productName);
                    bucketsMap.set(key, prev);
                  });

                  const out = [];
                  const first = new Date(
                    start.getFullYear(),
                    start.getMonth(),
                    1,
                  );
                  const last = new Date(end.getFullYear(), end.getMonth(), 1);

                  let m = new Date(first);
                  while (m <= last) {
                    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
                    const got = bucketsMap.get(key);

                    out.push({
                      label: m.toLocaleDateString("en-US", {
                        month: "short",
                        year: "2-digit",
                      }),
                      value: got ? got.value : 0,
                      date: new Date(m),
                    });

                    m.setMonth(m.getMonth() + 1);
                  }

                  return out;
                } // MONTHLY
                if (filterMode === "monthly") {
                  return labels.map((month, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (
                        date.getFullYear() === filterDate.getFullYear() &&
                        date.getMonth() === i
                      ) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });
                    return { label: month, value };
                  });
                }

                // WEEKLY
                if (filterMode === "weekly") {
                  const year = filterDate.getFullYear();
                  const month = filterDate.getMonth();
                  const weeks = [
                    { start: 1, end: 7 },
                    { start: 8, end: 14 },
                    { start: 15, end: 21 },
                    { start: 22, end: 31 },
                  ];

                  return weeks.map((week, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (
                        date.getFullYear() === year &&
                        date.getMonth() === month &&
                        date.getDate() >= week.start &&
                        date.getDate() <= week.end
                      ) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    return {
                      label: `Week ${i + 1}`,
                      value,
                      date: new Date(year, month, week.start),
                    };
                  });
                }

                // QUARTERLY
                if (filterMode === "quarterly") {
                  return [0, 1, 2, 3].map((q) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      const orderQuarter = Math.floor(date.getMonth() / 3);
                      if (
                        date.getFullYear() === filterDate.getFullYear() &&
                        orderQuarter === q
                      ) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    const quarterStartMonth = q * 3;

                    return {
                      label: `Q${q + 1}`,
                      value,
                      date: new Date(
                        filterDate.getFullYear(),
                        quarterStartMonth,
                        1,
                      ),
                    };
                  });
                }

                // YEARLY
                if (filterMode === "yearly") {
                  const sYear =
                    filterDate.getFullYear() - (filterDate.getFullYear() % 5);

                  return Array.from({ length: 5 }, (_, i) => {
                    const year = sYear + i;
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (date.getFullYear() === year) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });
                    return {
                      label: year.toString(),
                      value,
                      date: new Date(year, 0, 1),
                    };
                  });
                }

                // DAILY
                const startOfWeek = new Date(filterDate);
                startOfWeek.setDate(filterDate.getDate() - filterDate.getDay());

                const weekDates = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  return d;
                });

                return weekDates.map((date, i) => {
                  let value = 0;
                  orders.forEach((order) => {
                    const orderDate = getOrderDate(order);
                    if (orderDate.toDateString() === date.toDateString()) {
                      value += calcOrderValue(order, mode, productName);
                    }
                  });
                  return { label: labels[i], value, date };
                });
              };

              const buildPreviousSeries = (
                mode,
                currentSeries,
                productName = null,
              ) => {
                if (!currentSeries || currentSeries.length === 0) return [];

                const buildCustomRangeSeries = (
                  mode,
                  rangeStart,
                  rangeEnd,
                  labelsFromCurrent,
                ) => {
                  if (customBucket === "daily") {
                    const days = labelsFromCurrent.length;
                    return Array.from({ length: days }, (_, i) => {
                      const d = new Date(rangeStart);
                      d.setDate(d.getDate() + i);

                      let value = 0;
                      orders.forEach((order) => {
                        const od = getOrderDate(order);
                        if (od.toDateString() === d.toDateString()) {
                          value += calcOrderValue(order, mode, productName);
                        }
                      });

                      return {
                        label: labelsFromCurrent[i].label,
                        value,
                        date: d,
                      };
                    });
                  }

                  if (customBucket === "weekly") {
                    const buckets = [];
                    let cursor = new Date(rangeStart);

                    for (let i = 0; i < labelsFromCurrent.length; i++) {
                      const bStart = new Date(cursor);
                      const bEnd = new Date(cursor);
                      bEnd.setDate(bEnd.getDate() + 6);
                      if (bEnd > rangeEnd) bEnd.setTime(rangeEnd.getTime());

                      let value = 0;
                      orders.forEach((order) => {
                        const od = getOrderDate(order);
                        if (od >= bStart && od <= bEnd) {
                          value += calcOrderValue(order, mode, productName);
                        }
                      });

                      buckets.push({
                        label: labelsFromCurrent[i].label,
                        value,
                        date: bStart,
                      });

                      cursor = new Date(bEnd);
                      cursor.setDate(cursor.getDate() + 1);
                    }

                    return buckets;
                  }

                  // monthly
                  const bucketsMap = new Map();
                  orders.forEach((order) => {
                    const od = getOrderDate(order);
                    if (od < rangeStart || od > rangeEnd) return;

                    const key = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, "0")}`;
                    const prev = bucketsMap.get(key) || {
                      value: 0,
                      date: new Date(od.getFullYear(), od.getMonth(), 1),
                    };

                    prev.value += calcOrderValue(order, mode, productName);
                    bucketsMap.set(key, prev);
                  });

                  const out = [];
                  const first = new Date(
                    rangeStart.getFullYear(),
                    rangeStart.getMonth(),
                    1,
                  );
                  let m = new Date(first);

                  for (let i = 0; i < currentSeries.length; i++) {
                    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
                    const got = bucketsMap.get(key);

                    out.push({
                      label: currentSeries[i].label,
                      value: got ? got.value : 0,
                      date: new Date(m),
                    });

                    m.setMonth(m.getMonth() + 1);
                  }

                  return out;
                };

                // daily
                if (filterMode === "daily") {
                  const startOfWeek = new Date(filterDate);
                  startOfWeek.setDate(
                    filterDate.getDate() - filterDate.getDay(),
                  );

                  const prevStart = new Date(startOfWeek);
                  prevStart.setDate(prevStart.getDate() - 7);

                  return Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(prevStart);
                    d.setDate(d.getDate() + i);

                    let value = 0;
                    orders.forEach((order) => {
                      const od = getOrderDate(order);
                      if (od.toDateString() === d.toDateString()) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    return { label: currentSeries[i].label, value, date: d };
                  });
                }

                // weekly
                if (filterMode === "weekly") {
                  const curYear = filterDate.getFullYear();
                  const curMonth = filterDate.getMonth();
                  const prevMonthDate = new Date(curYear, curMonth - 1, 1);
                  const year = prevMonthDate.getFullYear();
                  const month = prevMonthDate.getMonth();

                  const weeks = [
                    { start: 1, end: 7 },
                    { start: 8, end: 14 },
                    { start: 15, end: 21 },
                    { start: 22, end: 31 },
                  ];

                  return weeks.map((week, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (
                        date.getFullYear() === year &&
                        date.getMonth() === month &&
                        date.getDate() >= week.start &&
                        date.getDate() <= week.end
                      ) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    return {
                      label: currentSeries[i].label,
                      value,
                      date: new Date(year, month, week.start),
                    };
                  });
                }

                // monthly
                if (filterMode === "monthly") {
                  const prevYear = filterDate.getFullYear() - 1;

                  return labels.map((_, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (
                        date.getFullYear() === prevYear &&
                        date.getMonth() === i
                      ) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    return {
                      label: currentSeries[i].label,
                      value,
                      date: new Date(prevYear, i, 1),
                    };
                  });
                }

                // quarterly
                if (filterMode === "quarterly") {
                  const prevYear = filterDate.getFullYear() - 1;

                  return [0, 1, 2, 3].map((q) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      const orderQuarter = Math.floor(date.getMonth() / 3);
                      if (
                        date.getFullYear() === prevYear &&
                        orderQuarter === q
                      ) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    return {
                      label: currentSeries[q].label,
                      value,
                      date: new Date(prevYear, q * 3, 1),
                    };
                  });
                }

                // yearly
                if (filterMode === "yearly") {
                  const sYear =
                    filterDate.getFullYear() - (filterDate.getFullYear() % 5);
                  const prevSYear = sYear - 5;

                  return Array.from({ length: 5 }, (_, i) => {
                    const year = prevSYear + i;
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (date.getFullYear() === year) {
                        value += calcOrderValue(order, mode, productName);
                      }
                    });

                    return {
                      label: currentSeries[i].label,
                      value,
                      date: new Date(year, 0, 1),
                    };
                  });
                }

                // custom
                if (filterMode === "custom") {
                  const days = getRangeDaysInclusive(
                    customStartDate,
                    customEndDate,
                  );

                  const curStart = startOfDay(customStartDate);
                  const prevEnd = new Date(curStart);
                  prevEnd.setDate(prevEnd.getDate() - 1);

                  const prevStart = new Date(prevEnd);
                  prevStart.setDate(prevStart.getDate() - (days - 1));

                  return buildCustomRangeSeries(
                    mode,
                    prevStart,
                    endOfDay(prevEnd),
                    currentSeries,
                  );
                }

                return [];
              };

              if (activeTab === "debt") {
                actualPoints = labels.map((month, i) => {
                  let value = 0;
                  debts.forEach((debt) => {
                    const date = new Date(debt.date);
                    if (
                      date.getFullYear() === filterDate.getFullYear() &&
                      date.getMonth() === i
                    ) {
                      value += parseFloat(debt.total || 0);
                    }
                  });
                  return { label: month, value };
                });
                dataPoints = actualPoints;
                forecastPoints = [];
              } else if (activeTab === "inventory" && selectedProduct) {
                if (isMonthly) {
                  actualPoints = labels.map((month, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (
                        date.getFullYear() === filterDate.getFullYear() &&
                        date.getMonth() === i
                      ) {
                        const product = order.products.find(
                          (p) => p.name === selectedProduct,
                        );
                        if (product) value += parseFloat(product.quantity) || 0;
                      }
                    });
                    return { label: month, value };
                  });
                } else if (isWeekly) {
                  const year = filterDate.getFullYear();
                  const month = filterDate.getMonth();
                  const weeks = getWeeksOfMonth(year, month);

                  actualPoints = weeks.map((week, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (date >= week.start && date <= week.end) {
                        const product = order.products.find(
                          (p) => p.name === selectedProduct,
                        );
                        if (product) value += parseFloat(product.quantity) || 0;
                      }
                    });

                    return { label: `Week ${i + 1}`, value, date: week.start };
                  });
                } else if (filterMode === "quarterly") {
                  actualPoints = [0, 1, 2, 3].map((q) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      const orderQuarter = Math.floor(date.getMonth() / 3);
                      if (
                        date.getFullYear() === filterDate.getFullYear() &&
                        orderQuarter === q
                      ) {
                        const product = order.products.find(
                          (p) => p.name === selectedProduct,
                        );
                        if (product) value += parseFloat(product.quantity) || 0;
                      }
                    });

                    const quarterStartMonth = q * 3;
                    return {
                      label: `Q${q + 1}`,
                      value,
                      date: new Date(
                        filterDate.getFullYear(),
                        quarterStartMonth,
                        1,
                      ),
                    };
                  });
                } else if (filterMode === "yearly") {
                  const sYear =
                    filterDate.getFullYear() - (filterDate.getFullYear() % 5);

                  actualPoints = Array.from({ length: 5 }, (_, i) => {
                    const year = sYear + i;
                    let value = 0;
                    orders.forEach((order) => {
                      const date = getOrderDate(order);
                      if (date.getFullYear() === year) {
                        const product = order.products.find(
                          (p) => p.name === selectedProduct,
                        );
                        if (product) value += parseFloat(product.quantity) || 0;
                      }
                    });

                    return {
                      label: year.toString(),
                      value,
                      date: new Date(year, 0, 1),
                    };
                  });
                } else {
                  const startOfWeek = new Date(filterDate);
                  startOfWeek.setDate(
                    filterDate.getDate() - filterDate.getDay(),
                  );

                  const weekDates = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);
                    return d;
                  });

                  actualPoints = weekDates.map((date, i) => {
                    let value = 0;
                    orders.forEach((order) => {
                      const orderDate = getOrderDate(order);
                      if (orderDate.toDateString() === date.toDateString()) {
                        const product = order.products.find(
                          (p) => p.name === selectedProduct,
                        );
                        if (product) value += parseFloat(product.quantity) || 0;
                      }
                    });
                    return { label: labels[i], value, date };
                  });
                }

                dataPoints = actualPoints;
                forecastPoints = [];
              } else {
                if (activeTab === "profit" && selectedProfitProduct) {
                  actualPoints = buildSeries("profit", selectedProfitProduct);
                } else {
                  actualPoints = buildSeries(activeTab);
                }

                dataPoints = actualPoints;

                if (shouldShowForecast) {
                  forecastPoints = getThreeMonthMovingAverage(
                    filterDate.getFullYear(),
                  ).map((v, i) => ({ label: labels[i], value: v || 0 }));
                } else {
                  forecastPoints = [];
                }

                if (isComparingPrevious) {
                  const mode = activeTab;
                  const productName =
                    activeTab === "profit" ? selectedProfitProduct : null;

                  previousCompareDataPoints = buildPreviousSeries(
                    mode,
                    actualPoints,
                    productName,
                  );
                }
              }

              let maxValue = Math.max(...dataPoints.map((d) => d.value)) || 1;
              if (isComparingPrevious && previousCompareDataPoints.length > 0) {
                const prevMax =
                  Math.max(...previousCompareDataPoints.map((d) => d.value)) ||
                  1;
                maxValue = Math.max(maxValue, prevMax, 1);
              }

              const width = 900;
              const height = 350;
              const padding = 50;

              const denominator =
                filterMode === "quarterly"
                  ? 3
                  : filterMode === "yearly"
                    ? 4
                    : Math.max(dataPoints.length - 1, 1);

              const points = dataPoints.map((d, i) => ({
                x: padding + (i / denominator) * (width - 2 * padding),
                y:
                  height -
                  padding -
                  (d.value / maxValue) * (height - 2 * padding),
                label: d.label,
                value: d.value,
                date: d.date,
              }));

              const previousOverlayPoints =
                isComparingPrevious && previousCompareDataPoints.length > 0
                  ? previousCompareDataPoints.map((d, i) => ({
                      x: padding + (i / denominator) * (width - 2 * padding),
                      y:
                        height -
                        padding -
                        (d.value / maxValue) * (height - 2 * padding),
                      label: d.label,
                      value: d.value,
                      date: d.date,
                    }))
                  : [];

              return (
                <div>
                  <h3 style={{ marginBottom: "10px", marginLeft: "10px" }}>
                    {activeTab === "inventory" && selectedProduct
                      ? `${
                          filterMode === "monthly"
                            ? "Sold this month"
                            : filterMode === "weekly"
                              ? "Sold this week"
                              : "Sold today"
                        } - ${selectedProduct}`
                      : activeTab === "sales"
                        ? showForecast
                          ? "Sales Forecast"
                          : `${
                              filterMode === "monthly"
                                ? "Sales for the Month"
                                : filterMode === "weekly"
                                  ? "Sales for the Week"
                                  : "Sales for the Day"
                            }`
                        : activeTab === "profit"
                          ? `${
                              filterMode === "monthly"
                                ? "Profits for the Month"
                                : filterMode === "weekly"
                                  ? "Profits for the Week"
                                  : "Profits for the Day"
                            }`
                          : activeTab === "debt"
                            ? "Debt Overview"
                            : ""}
                  </h3>

                  {activeTab === "inventory" &&
                    selectedProduct &&
                    (() => {
                      const info = getStockForecastInfo(selectedProduct);
                      if (!info) return null;

                      return (
                        <div
                          style={{
                            marginLeft: "10px",
                            marginTop: "-6px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "var(--chart-text)",
                            }}
                          >
                            {info.predictionText}
                          </div>
                          {info.avgDailySold > 0 && (
                            <div
                              style={{
                                fontSize: "12px",
                                opacity: 0.8,
                                color: "var(--chart-label)",
                              }}
                            >
                              Avg sold/day: {info.avgDailySold.toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {(activeTab === "sales" || activeTab === "profit") && (
                    <div style={{ marginLeft: "10px", marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: shouldShowForecast
                            ? "not-allowed"
                            : "pointer",
                          opacity: shouldShowForecast ? 0.6 : 1,
                          userSelect: "none",
                          fontWeight: 600,
                        }}
                        title={
                          shouldShowForecast
                            ? "Turn off Forecast to compare previous"
                            : ""
                        }
                      >
                        <span style={{ color: "var(--chart-text)" }}>
                          Compare Previous{" "}
                          {activeTab === "sales" ? "Sales" : "Profits"}
                        </span>
                        <input
                          type="checkbox"
                          checked={compareMode === "previous"}
                          disabled={shouldShowForecast}
                          onChange={(e) => {
                            if (shouldShowForecast) return;
                            setCompareMode(
                              e.target.checked ? "previous" : "current",
                            );
                          }}
                          className={styles.toggleInput}
                        />

                        <span className={styles.toggleTrack}>
                          <span className={styles.toggleThumb} />
                        </span>
                      </label>
                    </div>
                  )}

                  <svg
                    viewBox={`0 0 ${width} ${height + 65}`}
                    style={{
                      width: "100%",
                      height: "220px",
                      background: "var(--card-bg)",
                      borderRadius: "12px",
                      padding: "10px",
                      boxSizing: "border-box",
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
                      d={points
                        .map((p, i) =>
                          i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`,
                        )
                        .join(" ")}
                      stroke="#4caf50"
                      strokeWidth="8"
                      fill="none"
                    />

                    {isComparingPrevious &&
                      previousOverlayPoints.length > 0 && (
                        <>
                          <path
                            d={previousOverlayPoints
                              .map((p, i) =>
                                i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`,
                              )
                              .join(" ")}
                            stroke="orange"
                            strokeWidth="8"
                            fill="none"
                          />
                          {previousOverlayPoints.map((p, i) => (
                            <circle
                              key={`prev-dot-${i}`}
                              cx={p.x}
                              cy={p.y}
                              r={12}
                              fill="rgba(255, 165, 0, 0.55)"
                            />
                          ))}
                        </>
                      )}

                    {forecastPoints.length > 0 && (
                      <path
                        d={forecastPoints
                          .map((p, i) => {
                            const x =
                              padding +
                              (i / denominator) * (width - 2 * padding);
                            const y =
                              height -
                              padding -
                              (p.value / maxValue) * (height - 2 * padding);
                            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                          })
                          .join(" ")}
                        stroke="#007BFF"
                        strokeWidth="8"
                        fill="none"
                      />
                    )}
                    {forecastPoints.map((p, i) => {
                      const x =
                        padding + (i / denominator) * (width - 2 * padding);
                      const y =
                        height -
                        padding -
                        (p.value / maxValue) * (height - 2 * padding);

                      return (
                        <g key={`forecast-${i}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r={12}
                            fill="#007BFF"
                            style={{ cursor: "pointer" }}
                          />
                          <text
                            x={x}
                            y={height - padding + 100}
                            fontSize="24"
                            textAnchor="middle"
                            fill="#007BFF"
                            fontWeight="600"
                          >
                            {p.value.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </text>
                        </g>
                      );
                    })}

                    {(activeTab === "sales" || activeTab === "profit") &&
                      filterMode === "monthly" && (
                        <g
                          transform={`translate(${width / 2 - 150}, ${padding / 2})`}
                        >
                          {[
                            {
                              label: activeTab === "sales" ? "Sales" : "Profit",
                              color: "#4caf50",
                            },
                            ...(forecastPoints.length > 0
                              ? [{ label: "Forecast", color: "#007BFF" }]
                              : []),
                            ...(isComparingPrevious
                              ? [{ label: "Previous", color: "orange" }]
                              : []),
                          ].map((item, index) => (
                            <g
                              key={item.label}
                              transform={`translate(${index * 180}, 0)`}
                            >
                              <circle cx={0} cy={0} r={12} fill={item.color} />
                              <text
                                x={20}
                                y={6}
                                fontSize={24}
                                fill="var(--chart-text)"
                                fontWeight="600"
                              >
                                {item.label}
                              </text>
                            </g>
                          ))}
                        </g>
                      )}

                    {points.map((p, i) => {
                      const isSelected =
                        filterMode === "custom"
                          ? false
                          : (isMonthly && i === filterDate.getMonth()) ||
                            (!isMonthly &&
                              p.date &&
                              p.date.toDateString() ===
                                filterDate.toDateString());

                      return (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={16}
                          fill={
                            isSelected
                              ? "var(--primary-color)"
                              : "rgba(76, 175, 80, 0.5)"
                          }
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (isMonthly) {
                              const newDate = new Date(filterDate);
                              newDate.setMonth(i);
                              setFilterDate(newDate);
                            } else if (p.date) {
                              setFilterDate(p.date);
                            }
                          }}
                        />
                      );
                    })}

                    {points.map((p, i) => {
                      const isSelected =
                        filterMode === "custom"
                          ? false
                          : (isMonthly && i === filterDate.getMonth()) ||
                            (!isMonthly &&
                              p.date &&
                              p.date.toDateString() ===
                                filterDate.toDateString());

                      return (
                        <text
                          key={i}
                          x={p.x}
                          y={height - padding + 36}
                          fontSize={xLabelFontSize}
                          textAnchor="middle"
                          fill={
                            isSelected
                              ? "var(--primary-color)"
                              : "var(--chart-label)"
                          }
                          fontWeight={isSelected ? "700" : "600"}
                        >
                          {p.label}
                        </text>
                      );
                    })}

                    {points.map((p, i) => {
                      const isSelected =
                        filterMode === "custom"
                          ? false
                          : (isMonthly && i === filterDate.getMonth()) ||
                            (!isMonthly &&
                              p.date &&
                              p.date.toDateString() ===
                                filterDate.toDateString());

                      const baseY = height - padding + 70;

                      return (
                        <g key={`values-${i}`}>
                          <text
                            x={p.x}
                            y={isSelected ? p.y - 25 : baseY}
                            fontSize="22"
                            textAnchor="middle"
                            fill={
                              isSelected ? "var(--primary-color)" : "#4caf50"
                            }
                            fontWeight={isSelected ? "800" : "600"}
                          >
                            {isSelected ? "₱" : ""}
                            {p.value.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </text>

                          {isComparingPrevious && previousOverlayPoints[i] && (
                            <text
                              x={p.x}
                              y={baseY + 26}
                              fontSize="20"
                              textAnchor="middle"
                              fill="orange"
                              fontWeight="700"
                            >
                              ₱
                              {previousOverlayPoints[i].value.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 0,
                                },
                              )}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>

          {activeTab !== "debt" && (
            <div
              style={{
                marginTop: "12px",
                marginBottom: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.filterSelect}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Items" : cat}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product"
                className={styles.searchInput}
              />
            </div>
          )}

          <div className={styles.tableContainer}>
            {activeTab === "inventory" ? (
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Product</th>
                    <th>
                      Sold{" "}
                      {filterMode === "monthly"
                        ? "This Month"
                        : filterMode === "weekly"
                          ? "This Week"
                          : "Today"}
                    </th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInventoryData
                    .filter((p) => {
                      if (selectedCategory !== "all") {
                        const stockItem = stocks.find((s) => s.name === p.name);
                        if (stockItem?.category !== selectedCategory)
                          return false;
                      }

                      const q = searchQuery.trim().toLowerCase();
                      if (q) {
                        return p.name.toLowerCase().includes(q);
                      }

                      return true;
                    })
                    .map((p, idx) => (
                      <tr
                        key={p.name}
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedProduct === p.name
                              ? "var(--selected-bg)"
                              : "transparent",
                        }}
                        onClick={() => setSelectedProduct(p.name)}
                      >
                        <td>{idx + 1}</td>
                        <td>{p.name}</td>
                        <td>{p.soldToday}</td>
                        <td>{p.remaining}</td>
                        <td
                          style={{
                            color: p.status === "Low" ? "tomato" : "green",
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
                      const debtDate = new Date(debt.date);
                      return (
                        debtDate.getMonth() === filterDate.getMonth() &&
                        debtDate.getFullYear() === filterDate.getFullYear()
                      );
                    })
                    .map((debt, idx) => {
                      const payments =
                        JSON.parse(
                          localStorage.getItem(`payment_history_${debt.id}`),
                        ) || [];
                      const paidAmount = payments.reduce(
                        (sum, p) => sum + parseFloat(p.amount),
                        0,
                      );
                      const balance = Math.max(
                        (parseFloat(debt.total) || 0) - paidAmount,
                        0,
                      );

                      return (
                        <tr key={debt.id}>
                          <td>{idx + 1}</td>
                          <td>{debt.customer_name}</td>
                          <td className={styles.currency}>
                            ₱
                            {(parseFloat(debt.total) || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </td>
                          <td className={styles.currency}>
                            ₱
                            {balance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>{debt.due_date}</td>
                          <td
                            style={{
                              color: balance > 0 ? "red" : "green",
                              fontWeight: "600",
                            }}
                          >
                            {balance > 0 ? "Unpaid" : "Paid"}
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
                  {reportData
                    .filter((p) => {
                      if (selectedCategory !== "all") {
                        const stockItem = stocks.find((s) => s.name === p.name);
                        if (stockItem?.category !== selectedCategory)
                          return false;
                      }

                      const q = searchQuery.trim().toLowerCase();
                      if (q) {
                        return (p.name || "").toLowerCase().includes(q);
                      }

                      return true;
                    })
                    .map((p, idx) => (
                      <tr
                        key={idx}
                        style={{
                          cursor:
                            activeTab === "profit" ? "pointer" : "default",
                          backgroundColor:
                            activeTab === "profit" &&
                            selectedProfitProduct === p.name
                              ? "var(--selected-bg)"
                              : "transparent",
                        }}
                        onClick={() => {
                          if (activeTab !== "profit") return;
                          setSelectedProfitProduct((prev) =>
                            prev === p.name ? null : p.name,
                          );
                        }}
                      >
                        <td>{idx + 1}</td>
                        <td>{p.name}</td>
                        <td className={styles.currency}>
                          ₱{p.unitPrice.toFixed(2)}
                        </td>
                        <td className={styles.currency}>
                          ₱
                          {Number(
                            stocks.find((s) => s.name === p.name)
                              ?.buying_price || 0,
                          ).toFixed(2)}
                        </td>
                        <td>{p.totalQty}</td>

                        {activeTab === "sales" && (
                          <td
                            className={styles.currency}
                            style={{
                              color:
                                p.totalSales > 0
                                  ? "green"
                                  : "var(--chart-text)",
                              fontWeight: p.totalSales > 0 ? "600" : "normal",
                            }}
                          >
                            ₱{p.totalSales.toFixed(2)}
                          </td>
                        )}

                        {activeTab === "profit" && (
                          <td
                            className={styles.currency}
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
