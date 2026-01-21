//import { useState } from "react";

const MonthlySalesChart = ({ orders }) => {
  const getOrderDate = (order) => {
    const datePart = order.order_number.split("-")[0];
    const month = parseInt(datePart.slice(0, 2), 10) - 1;
    const day = parseInt(datePart.slice(2, 4), 10);
    const year = parseInt(datePart.slice(4), 10);
    return new Date(year, month, day);
  };

  const getMonthlySales = () => {
    const monthSales = Array(12).fill(0);
    const currentYear = new Date().getFullYear();

    orders.forEach((order) => {
      const date = getOrderDate(order);
      if (date.getFullYear() !== currentYear) return;

      const orderValue = order.products.reduce((sum, p) => {
        const qty = parseFloat(p.quantity) || 0;
        const sell = parseFloat(p.selling_price) || 0;
        return sum + qty * sell;
      }, 0);

      monthSales[date.getMonth()] += orderValue;
    });

    return monthSales;
  };

  const getThreeMonthMovingAverage = () => {
    const currentYear = new Date().getFullYear();
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
      while (m < 0) { y--; m += 12; }
      while (m > 11) { y++; m -= 12; }
      return salesByYearMonth[y]?.[m] ?? null;
    };

    const forecast = Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      const vals = [i - 1, i - 2, i - 3].map((idx) => {
        const actual = getActualIfPresent(currentYear, idx);
        if (actual !== null) return actual;
        if (idx >= 0 && idx < i) return forecast[idx];
        return 0;
      });
      forecast[i] = (vals[0] + vals[1] + vals[2]) / 3;
    }
    return forecast;
  };

  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const actualSales = getMonthlySales();
  const forecastSales = getThreeMonthMovingAverage();

  const width = 550;
  const height = 180;
  const padding = 30;
  const maxValue = Math.max(...actualSales, ...forecastSales) || 1;

  const points = actualSales.map((value, i) => ({
    x: padding + (i / (labels.length - 1)) * (width - 2 * padding),
    y: height - padding - (value / maxValue) * (height - 2 * padding),
    value,
    label: labels[i],
  }));

  const forecastPoints = forecastSales.map((value, i) => ({
    x: padding + (i / (labels.length - 1)) * (width - 2 * padding),
    y: height - padding - (value / maxValue) * (height - 2 * padding),
    value,
    label: labels[i],
  }));

  const linePath = (pts) =>
    pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  return (
    <div style={{ margin: "20px auto", maxWidth: "600px", textAlign: "center" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          background: "var(--card-bg)",
          borderRadius: "12px",
          padding: "10px",
          boxSizing: "border-box",
        }}
      >
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#999" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#999" />

        {/* Actual Sales Line */}
        <path d={linePath(points)} stroke="#4caf50" strokeWidth="2" fill="none" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#4caf50" />)}

        {/* Forecast Sales Line */}
{/* Forecast Sales Line */}
<path d={linePath(forecastPoints)} stroke="#007BFF" strokeWidth="2" fill="none" />
{forecastPoints.map((p, i) => (
  <circle key={i} cx={p.x} cy={p.y} r={5} fill="#007BFF" />
))}

{/* Forecast Values above months */}
{forecastPoints.map((p, i) => (
  <text
    key={"f" + i}
    x={p.x}
    y={height - padding - 24} // just above the month labels
    fontSize="14"
    textAnchor="middle"
    fill="#007BFF"
    fontWeight="600"
  >
    {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
  </text>
))}



        {/* Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - padding + 15} fontSize="14" textAnchor="middle" fill="var(--chart-label)">
            {p.label}
          </text>
        ))}

        {/* Values */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={p.y - 6} fontSize="14" textAnchor="middle" fill="var(--chart-text)">
            {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default MonthlySalesChart;
