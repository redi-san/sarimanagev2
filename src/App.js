import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; 
import { useEffect } from "react";
import LogIn from "./auth/LogIn";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword"; 
import SignUp from "./auth/SignUp";
import Orders from "./pages/Orders";
import Stocks from "./pages/Stocks";
import Debts from "./pages/Debts";
import Home from "./pages/Home";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import AuthRedirect from "./components/AuthRedirect";

import InstallPrompt from "./components/InstallPrompt";

function App() {
useEffect(() => {
  const theme = localStorage.getItem("theme") || "light";
  const fontScale = localStorage.getItem("fontScale") || "1";
  const primaryColor = localStorage.getItem("primaryColor") || "#ffcc00";

  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute(
      "data-theme",
      prefersDark ? "dark" : "light"
    );
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }

  document.documentElement.style.setProperty(
    "--font-scale",
    fontScale
  );

  document.documentElement.style.setProperty(
    "--primary-color",
    primaryColor
  );
}, []);


  return (
    <div>

            <InstallPrompt />

      <Router>
        <Routes>
          {/*<Route path="/" element={<Navigate to="/login" replace />} />*/}
          <Route path="/" element={<AuthRedirect />} />

          <Route path="/login" element={<LogIn />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} /> 
          <Route path="/signup" element={<SignUp />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/home" element={<Home />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
