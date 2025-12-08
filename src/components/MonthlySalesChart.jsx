import { useState } from "react";

const MonthlySalesChart = ({ orders }) => {
  const [showForecast, setShowForecast] = useState(false);

  // Helper: get sales per month
  const getMonthlySales = () => {
    const monthSales = Array(12).fill(0); // Jan-Dec
    orders.forEach((order) => {
      const datePart = order.order_number.split("-")[0];
      const month = parseInt(datePart.slice(0, 2), 10) - 1;
      //const day = parseInt(datePart.slice(2, 4), 10);
      //const yearOrder = parseInt(datePart.slice(4), 10);

      const orderValue = order.products.reduce((sum, p) => {
        const qty = parseFloat(p.quantity) || 0;
        const sell = parseFloat(p.selling_price) || 0;
        return sum + qty * sell;
      }, 0);

      monthSales[month] += orderValue;
    });
    return monthSales;
  };

  const getThreeMonthMovingAverage = () => {
    const sales = getMonthlySales();
    const forecast = [];
    for (let i = 0; i < 12; i++) {
      const prev1 = sales[i - 1] || 0;
      const prev2 = sales[i - 2] || 0;
      const prev3 = sales[i - 3] || 0;
      forecast[i] = (prev1 + prev2 + prev3) / 3;
    }
    return forecast;
  };

  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const actualSales = getMonthlySales();
  const forecastSales = getThreeMonthMovingAverage();
  const dataPoints = labels.map((label, i) => ({
    label,
    value: showForecast ? forecastSales[i] : actualSales[i],
  }));

  const maxValue = Math.max(...dataPoints.map((d) => d.value)) || 1;
  const width = 550;
  const height = 180;
  const padding = 30;

  const points = dataPoints.map((d, i) => ({
    x: padding + (i / (labels.length - 1)) * (width - 2 * padding),
    y: height - padding - (d.value / maxValue) * (height - 2 * padding),
    label: d.label,
    value: d.value,
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  return (
<div
  style={{
    margin: "20px auto",   // auto left/right margin centers it
    maxWidth: "600px",     // optional, to control chart width
    textAlign: "center",   // centers inline elements
  }}
>
      {/* Actual / Forecast Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "15px" }}>
        <button
          onClick={() => setShowForecast(false)}
          style={{
            padding: "8px 20px",
            borderRadius: "20px",
            border: "1px solid #4caf50",
            backgroundColor: !showForecast ? "#4caf50" : "#fff",
            color: !showForecast ? "#fff" : "#4caf50",
            cursor: "pointer",
            fontWeight: 600,
            transition: "all 0.3s",
          }}
        >
          Actual
        </button>
        <button
          onClick={() => setShowForecast(true)}
          style={{
            padding: "8px 20px",
            borderRadius: "20px",
            border: "1px solid #4caf50",
            backgroundColor: showForecast ? "#4caf50" : "#fff",
            color: showForecast ? "#fff" : "#4caf50",
            cursor: "pointer",
            fontWeight: 600,
            transition: "all 0.3s",
          }}
        >
          Forecast
        </button>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxWidth: "100%",
          height: "auto",
background: "var(--chart-bg)",
          borderRadius: "12px",
          padding: "10px",
          boxSizing: "border-box",
        }}
      >
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--chart-axis)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--chart-axis)" />

        {/* Line */}
        <path d={pathD} stroke="#4caf50" strokeWidth="2" fill="none" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="#4caf50" />
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - padding + 15} fontSize="14" textAnchor="middle" fill="var(--chart-label)">{p.label}</text>
        ))}

        {points.map((p, i) => (
          <text key={i} x={p.x} y={p.y - 6} fontSize="14" textAnchor="middle" fill="var(--chart-label)">
            
            {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default MonthlySalesChart;
