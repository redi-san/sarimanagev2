import { Link, useLocation } from "react-router-dom";
import styles from "../css/BottomNav.module.css";

import HomeIcon from "../assets/HomeIcon.png";
import OrdersIcon from "../assets/OrdersIcon.png";
import StocksIcon from "../assets/StocksIcon.png";
//import DebtsIcon from "../assets/DebtsIcon.png";
import ReportsIcon from "../assets/ReportsIcon.png";
import SettingsIcon from "../assets/SettingsIcon.png";

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/home", icon: HomeIcon},
{ path: "/orders", icon: OrdersIcon, openAddProductOnLoad: true },
    { path: "/stocks", icon: StocksIcon},
    //{ path: "/debts", icon: DebtsIcon},
    { path: "/reports", icon: ReportsIcon},
    { path: "/settings", icon: SettingsIcon},
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
<Link
  key={item.path}
  to={item.path}
  state={
    item.path === "/orders"
      ? { autoOpen: true, autoOpenScanner: true }
      : {}
  }
  className={`${styles.navItem} ${currentPath === item.path ? styles.active : ""}`}
>
  <img src={item.icon} className={styles.icon} />
</Link>

      ))}
    </nav>
  );
}
