import { useLocation, useNavigate } from "react-router-dom";
import styles from "../css/BottomNav.module.css";

import HomeIcon from "../assets/HomeIcon.png";
import OrdersIcon from "../assets/OrdersIcon.png";
import StocksIcon from "../assets/StocksIcon.png";
import ReportsIcon from "../assets/ReportsIcon.png";
import SettingsIcon from "../assets/SettingsIcon.png";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/home", icon: HomeIcon },
{
  path: "/orders",
  icon: OrdersIcon,
  state: { autoOpen: true }, // only auto-open modal
},

    { path: "/stocks", icon: StocksIcon },
    { path: "/reports", icon: ReportsIcon },
    { path: "/settings", icon: SettingsIcon },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <div
          key={item.path}
          className={`${styles.navItem} ${
            currentPath === item.path ? styles.active : ""
          }`}
          onClick={() => navigate(item.path, { state: item.state || {} })}
        >
          <img src={item.icon} className={styles.icon} alt={item.path} />
        </div>
      ))}
    </nav>
  );
}
