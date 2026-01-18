import { useState, useEffect, useCallback, useRef } from "react";
import styles from "../css/Orders.module.css";
import deleteIcon from "../assets/deleteIcon.png";
import axios from "axios";
import { getAuth } from "firebase/auth";
//import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Html5QrcodeScanner } from "html5-qrcode";
import BottomNav from "../components/BottomNav";
import AddDebtModal from "../components/AddDebtModal";
import Debts from "./Debts"; // reuse your component

import { useLocation } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Orders({ setPage }) {
  const [activeTab, setActiveTab] = useState("orders");
  const auth = getAuth();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [totals, setTotals] = useState({ total: 0, profit: 0 });
  const [ordersList, setOrdersList] = useState([]);
  const [order_number, setOrderNumber] = useState("");
  const [customer_name, setCustomerName] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  // const [scanningIndex, setScanningIndex] = useState(null);
  //const [scanningIndex] = useState(null); // keep value, discard setter
  const [filterDate, setFilterDate] = useState(new Date());
  const [showAll, setShowAll] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);

  const scannerRef = useRef(null);

  const location = useLocation();

  //const [graphType, setGraphType] = useState("actual"); // "actual" | "forecast"

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Fetch stocks first
          const stocksRes = await axios.get(
            `${BASE_URL}/stocks/user/${user.uid}`
          );

          setStocks(stocksRes.data);

          // Then fetch orders
          const ordersRes = await axios.get(
            `${BASE_URL}/orders/user/${user.uid}`
          );

          setOrdersList(ordersRes.data);
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      } else {
        // Clear data on logout
        setStocks([]);
        setOrdersList([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateProduct = useCallback(
    (index, field, value) => {
      setProducts((prevProducts) => {
        const newProducts = [...prevProducts];
        newProducts[index][field] = value;
        return newProducts;
      });

      setTotals((prevTotals) => {
        const total = products.reduce(
          (acc, p) =>
            acc +
            (parseFloat(p.quantity) || 0) * (parseFloat(p.selling_price) || 0),
          0
        );
        const profit = products.reduce(
          (acc, p) =>
            acc +
            (parseFloat(p.quantity) || 0) *
              ((parseFloat(p.selling_price) || 0) -
                (parseFloat(p.buying_price) || 0)),
          0
        );
        return { total, profit };
      });
    },
    [products]
  );

  const generateOrderNumber = useCallback(() => {
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate()
    ).padStart(2, "0")}${today.getFullYear()}`;

    const todaysOrders = ordersList.filter((order) =>
      order.order_number.startsWith(dateStr)
    );

    const nextNumber = String(todaysOrders.length + 1).padStart(2, "0");

    return `${dateStr}-${nextNumber}`;
  }, [ordersList]);

  /* useEffect(() => {
    if (!showScanner) return;

    const elementId = "order-barcode-reader";

    // If scanner div doesn't exist, stop.
    const el = document.getElementById(elementId);
    if (!el) return;

    // 🔥 If scanner already exists, DO NOT recreate it
    if (scannerRef.current && scannerRef.current._html5Qrcode?.isScanning) {
      console.log("Scanner already active. Not creating a new one.");
      return;
    }

    // Create new scanner once
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(elementId, {
        fps: 10,
        qrbox: 180,
        rememberLastUsedCamera: true,
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA,
          Html5QrcodeScanType.SCAN_TYPE_FILE,
        ],
      });
    }

    scannerRef.current.render(
      (decodedText) => {
        const foundStock = stocks.find(
          (s) => s.barcode?.toString() === decodedText
        );

        setProducts((prev) => {
          const newProducts = [
            ...prev,
            {
              stock_id: decodedText,
              name: foundStock?.name || "",
              selling_price: foundStock?.selling_price || "",
              buying_price: foundStock?.buying_price || "",
              quantity: 1,
            },
          ];
          calculateTotals(newProducts);
          return newProducts;
        });

        // Stop scanner after scanning
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
        setShowScanner(false);
        setOrderNumber(generateOrderNumber());
      },
      (error) => console.warn("Scan error:", error)
    );

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }

      const el = document.getElementById(elementId);
      if (el) el.innerHTML = "";
    };
  }, [showScanner, stocks, generateOrderNumber]); */

  const fetchOrders = async () => {
    const user = auth.currentUser;

    if (!user) {
      console.warn("No user logged in, skipping order fetch");
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/orders/user/${user.uid}`);

      setOrdersList(res.data);
    } catch (err) {
      console.error("Error fetching user orders:", err);
    }
  };

  const removeProduct = (index) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    calculateTotals(newProducts);
  };

  const calculateTotals = (productsArray) => {
    let total = 0,
      profit = 0;
    productsArray.forEach((p) => {
      const qty = parseFloat(p.quantity) || 0;
      const sell = parseFloat(p.selling_price) || 0;
      const buy = parseFloat(p.buying_price) || 0;
      total += qty * sell;
      profit += qty * (sell - buy);
    });
    setTotals({ total, profit });
  };

  const saveOrder = async () => {
    const user = auth.currentUser;

    if (!user) return showToast("You must be logged in to save orders.");
    if (products.length === 0)
      return showToast("Please add at least one product.");

    const pay = parseFloat(paymentAmount) || 0;
    const total = parseFloat(totals.total) || 0;

    // ✅ Add validation here
    if (!paymentAmount) {
      return showToast("Payment Amount is required.");
    }

    if (pay < total) {
      return showToast("Payment amount is not enough");
    }

    const orderData = {
      firebase_uid: user.uid,
      order_number,
      customer_name,
      total,
      profit: totals.profit,
      payment_amount: pay,
      change_amount: pay - total,
      products: products.map((p) => ({
        stock_id: p.stock_id,
        name: p.name,
        quantity: p.quantity,
        selling_price: p.selling_price,
        buying_price: p.buying_price,
      })),
    };

    try {
      if (editingOrderId) {
        await axios.put(`${BASE_URL}/orders/${editingOrderId}`, orderData);
        showToast("Order updated successfully!");
        setEditingOrderId(null);
        setIsEditing(false);
      } else {
        await axios.post(`${BASE_URL}/orders`, orderData);
        showToast("Order created successfully!");
      }

      fetchOrders();
      setShowSecondModal(false);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving order:", err);
      showToast("Failed to save order.");
    }
  };

  const saveAsDebt = async (debtData) => {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in to save debts.");
      return;
    }

    try {
      const debtPayload = {
        user_id: user.uid,
        customer_name: debtData.customer_name,
        contact_number: debtData.contact_number,
        date: new Date().toLocaleDateString("en-CA"),
        due_date: debtData.due_date,
        note: debtData.note || "",
        status: "Unpaid",
        total: totals.total,
        profit: totals.profit,
        products: products.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          selling_price: p.selling_price,
          buying_price: p.buying_price,
          dateAdded: new Date().toLocaleDateString("en-CA"),
        })),
      };

      await axios.post(`${BASE_URL}/debts`, debtPayload);
      alert("Debt saved successfully!");
      setShowDebtModal(false);
      resetForm();

      //navigate("/debts");
      setActiveTab("debts");
    } catch (err) {
      console.error("Error saving debt:", err);
      alert("Failed to save debt.");
    }
  };

  const deleteOrder = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/orders/${id}`);
      fetchOrders();
      setOrdersList(ordersList.filter((order) => order.id !== id));
    } catch (err) {
      console.error("Error deleting order:", err);
    }
  };

  const resetForm = () => {
    setProducts([]);
    setTotals({ total: 0, profit: 0 });
    setOrderNumber("");
    setCustomerName("");
    setPaymentAmount("");
    setChangeAmount(0);
  };

  const formatDate = (date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  const getOrderDate = (order) => {
    const datePart = order.order_number.split("-")[0];
    const month = datePart.slice(0, 2);
    const day = datePart.slice(2, 4);
    const year = datePart.slice(4);
    return `${year}-${month}-${day}`;
  };

  const filteredOrders = ordersList.filter((order) => {
    const matchesDate =
      showAll || getOrderDate(order) === formatDate(filterDate);

    const matchesSearch =
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.order_number.toLowerCase().includes(search.toLowerCase());

    return matchesDate && matchesSearch;
  });

  const formatCurrency = (num) => {
    if (isNaN(num)) return "₱0.00";
    return (
      "₱" +
      Number(num).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleEnterFocus = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([readonly]):not([type="hidden"]), select, textarea'
        )
      );
      const index = inputs.indexOf(e.target);
      if (index > -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    }
  };

  useEffect(() => {
    if (location.state?.autoOpen) {
      // Automatically open ADD PRODUCTS modal
      setShowSecondModal(true);

      // Automatically open scanner
      setShowScanner(true);
    }
  }, [location.state]);

  const stopScanner = async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.clear();
    } catch (err) {
      console.warn("Failed to clear scanner:", err);
    }

    scannerRef.current = null;

    // Extra safety: remove leftover UI
    const el = document.getElementById("order-barcode-reader");
    if (el) el.innerHTML = "";
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText) => {
      const foundStock = stocks.find(
        (s) => String(s.barcode).trim() === String(decodedText).trim()
      );

      setProducts((prev) => {
        const alreadyAdded = prev.some(
          (p) => String(p.stock_id).trim() === String(decodedText).trim()
        );

        if (alreadyAdded) return prev;

        const newProduct = {
          stock_id: decodedText,
          name: foundStock?.name || "",
          selling_price: foundStock?.selling_price || "",
          buying_price: foundStock?.buying_price || "",
          quantity: 1,
        };

        const newProducts = [...prev, newProduct];
        calculateTotals(newProducts);
        return newProducts;
      });

      setOrderNumber(generateOrderNumber());
    },
    [stocks, generateOrderNumber]
  );

  const handleScanError = useCallback((err) => {
    console.warn("Scan error:", err);
  }, []);

  const openScanner = useCallback(() => {
    setShowScanner(true);

    setTimeout(() => {
      if (scannerRef.current) return;

      scannerRef.current = new Html5QrcodeScanner("order-barcode-reader", {
        fps: 10,
        qrbox: 180,
        rememberLastUsedCamera: true,
      });

      scannerRef.current.render(handleScanSuccess, handleScanError);
    }, 300);
  }, [handleScanSuccess, handleScanError]);

useEffect(() => {
  if (!showScanner) return;
  if (stocks.length === 0) return; // 🔥 WAIT FOR STOCKS

  openScanner();
}, [showScanner, stocks, openScanner]);


  useEffect(() => {
    // If no payment entered yet, show 0 instead of negative
    if (!paymentAmount) {
      setChangeAmount(0);
      return;
    }

    const pay = parseFloat(paymentAmount) || 0;
    const total = parseFloat(totals.total) || 0;
    setChangeAmount(pay - total);
  }, [paymentAmount, totals.total]);

  const [toasts, setToasts] = useState([]);

  // Function to show toast
  const showToast = (message, duration = 3000) => {
    const id = Date.now(); // unique id
    setToasts((prev) => [...prev, { id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  return (
    <div>
      {/* Toast container */}
      <div className={styles.toastContainer}>
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Topbar */}
      <div className={styles.topbar}>
        <h2>Transactions</h2>
      </div>

      {/*tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabButton} ${
            activeTab === "orders" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "debts" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("debts")}
        >
          Debts
        </button>
      </div>

      {/* Sidebar */}
      <BottomNav />

      {/* Page Header + Search */}
      <main className={styles.main}>
        <div className={styles.tabInner}>
          {activeTab === "orders" && (
            <>
              <div className={styles["page-header"]}>
                <input
                  type="text"
                  placeholder="Search Orders"
                  className={styles["search-input"]}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {/*<h1>Orders</h1>*/}

<div className={styles["filter-controls"]}>
  {/* First row: Show All / Show Today toggle button */}
  <div className={styles["filter-top"]}>
    <button onClick={() => setShowAll(!showAll)}>
      {showAll ? "Show Today" : "Show All"}
    </button>
  </div>

  {/* Second row: Date navigation */}
  <div className={styles["filter-bottom"]}>
    {/* Previous day button */}
    <button
      onClick={() =>
        setFilterDate(
          new Date(filterDate.setDate(filterDate.getDate() - 1))
        )
      }
    >
      ←
    </button>

    {/* Display "All Orders" label if showing all, otherwise date picker */}
    {showAll ? (
      <span>All Orders</span>
    ) : (
      <input
        type="date"
        value={formatDate(filterDate)}
        onChange={(e) => {
          if (!e.target.value) return; // ignore clear button
          setFilterDate(new Date(e.target.value));
        }}
        className={styles.datePicker}
      />
    )}

    {/* Next day button */}
    <button
      onClick={() =>
        setFilterDate(
          new Date(filterDate.setDate(filterDate.getDate() + 1))
        )
      }
    >
      →
    </button>
  </div>
</div>

              </div>

              <div className={styles["orders-table-container"]}>
                <table className={styles["orders-table"]}>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Profit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order, index) => (
                        <tr key={index} onClick={() => setSelectedOrder(order)}>
                          <td>{order.order_number}</td>
                          <td>{order.customer_name}</td>
                          <td>{formatCurrency(order.total)}</td>
                          <td>{formatCurrency(order.profit)}</td>

                          <td>
                            <button
                              className={styles["delete-btn"]}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOrder(order.id);
                              }}
                            >
                              <img
                                src={deleteIcon}
                                alt="Delete"
                                className={styles.deleteIcon}
                              />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        {/* Floating Create Button */}
        <button
          className={styles["create-button"]}
          onClick={() => {
            setOrderNumber(generateOrderNumber());
            setShowSecondModal(true);
          }}
        >
          +
        </button>

        {/* Add Order Modal */}
        {showModal && (
          <div className={styles.modal}>
            <div className={styles["modal-content"]}>
              <h2>Add Order</h2>
              <p>Enter order details</p>
              <div className={styles["form-group"]}>
                <label htmlFor="orderNumber" className={styles.inputLabel}>
                  Order Number
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={order_number}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={handleEnterFocus}
                  required
                />
              </div>

              <div className={styles["form-group"]}>
                <label htmlFor="customerName" className={styles.inputLabel}>
                  Customer Name
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={customer_name}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={handleEnterFocus}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                />
              </div>

              <div className={styles["form-group"]}>
                <label className={styles.inputLabel}>Payment Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  min={totals.total}
                />
              </div>

              <div className={styles.totals}>
                <div className={styles.totalBox}>
                  <span>Total: {formatCurrency(totals.total)}</span>
                </div>
                <div className={styles.totalBox}>
                  <span>Change: {formatCurrency(changeAmount)}</span>
                </div>
              </div>

              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => {
                    // Close Add Order modal
                    setShowModal(false);

                    // Open Add Products modal
                    setShowSecondModal(true);
                  }}
                >
                  Back
                </button>
                <button
                  className={styles.Next}
                  onClick={() => {
                    saveOrder();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2nd Modal */}
        {showSecondModal && (
          <div className={styles.modal}>
            <div
              className={`${styles["modal-content"]} ${styles["modal-second"]}`}
            >
              <h2>Add Productss</h2>
              {products.map((product, index) => (
                <div className={styles["product-entry"]} key={index}>
                  {/* Product Name */}
                  <label className={styles.inputLabel}>Product Name</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Enter the product name"
                      value={product.name}
                      onChange={(e) => {
                        const name = e.target.value;

                        updateProduct(index, "name", name);

                        // 🔥 ALWAYS keep suggestions active while typing
                        setActiveSuggestionIndex(index);

                        // If name is erased, clear auto-filled fields
                        if (name.trim() === "") {
                          updateProduct(index, "selling_price", "");
                          updateProduct(index, "buying_price", "");
                          updateProduct(index, "stock_id", "");
                        }
                      }}
                      onFocus={() => setActiveSuggestionIndex(index)}
                      onBlur={() =>
                        setTimeout(() => setActiveSuggestionIndex(null), 150)
                      }
                    />

                    {activeSuggestionIndex === index &&
                      product.name &&
                      stocks.filter((s) =>
                        s.name
                          .toLowerCase()
                          .startsWith(product.name.toLowerCase())
                      ).length > 0 && (
                        <ul
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            width: "100%",
                            background: "var(--card-bg)",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            maxHeight: "150px",
                            overflowY: "auto",
                            listStyle: "none",
                            margin: 0,
                            padding: 0,
                            zIndex: 1000,
                          }}
                        >
                          {stocks
                            .filter((s) =>
                              s.name
                                .toLowerCase()
                                .startsWith(product.name.toLowerCase())
                            )
                            .map((s, i) => (
                              <li
                                key={i}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseDown={(e) => e.preventDefault()} // prevent blur
                                onClick={() => {
                                  updateProduct(index, "name", s.name);
                                  updateProduct(
                                    index,
                                    "selling_price",
                                    s.selling_price
                                  );
                                  updateProduct(
                                    index,
                                    "buying_price",
                                    s.buying_price
                                  );
                                  updateProduct(index, "stock_id", s.barcode);
                                  setActiveSuggestionIndex(null); // close dropdown
                                }}
                              >
                                {s.name}
                              </li>
                            ))}
                        </ul>
                      )}
                  </div>

                  {/* Product ID */}
                  <label className={styles.inputLabel}>Product ID</label>
                  <input
                    type="text"
                    placeholder="Scan to enter Product ID"
                    value={product.stock_id || ""}
                    onChange={(e) => {
                      //const id = e.target.value;
                      const barcode = e.target.value;

                      updateProduct(index, "stock_id", barcode);

                      const foundStock = stocks.find(
                        (s) =>
                          String(s.barcode).trim() === String(barcode).trim()
                      );

                      if (foundStock) {
                        updateProduct(index, "name", foundStock.name);
                        updateProduct(
                          index,
                          "selling_price",
                          foundStock.selling_price
                        );
                        updateProduct(
                          index,
                          "buying_price",
                          foundStock.buying_price
                        );
                      }
                    }}
                  />

                  <div className={styles["product-row"]}>
                    <div className={styles["input-group"]}>
                      <label className={styles.inputLabel}>Quantity</label>
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={product.quantity}
                        min={1}
                        onChange={(e) => {
                          const value = e.target.value;

                          // Only update if it's empty or numeric
                          if (/^\d*$/.test(value)) {
                            updateProduct(
                              index,
                              "quantity",
                              value === "" ? "" : parseInt(value, 10)
                            );
                          }
                        }}
                        onBlur={() => {
                          // If left empty or 0 → reset to 1
                          if (!product.quantity || product.quantity <= 0) {
                            showToast("Quantity must be 1 or more");
                            updateProduct(index, "quantity", 1);
                          }
                        }}
                      />
                    </div>

                    <div className={styles["input-group"]}>
                      <label className={styles.inputLabel}>Price</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={product.selling_price}
                        onChange={(e) =>
                          updateProduct(index, "selling_price", e.target.value)
                        }
                      />
                    </div>

                    {/*<input
                    type="number"
                    placeholder="Buying Price"
                    value={product.buying_price}
                    onChange={(e) =>
                      updateProduct(index, "buying_price", e.target.value)
                    }
                  /> */}
                  </div>

                  <div className={styles["product-actions"]}>
                    <button
                      className={styles["delete-product-btn"]}
                      onClick={() => removeProduct(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className={styles.buttonRow}>
                <button
                  className={styles["add-product-btn"]}
                  onClick={openScanner}
                >
                  Scan Product
                </button>

                <button
                  className={styles["add-product-btn"]}
                  onClick={() =>
                    setProducts([
                      ...products,
                      {
                        stock_id: "",
                        name: "",
                        quantity: "1",
                        selling_price: "",
                        buying_price: "",
                      },
                    ])
                  }
                >
                  Add Product
                </button>
              </div>

              {showScanner && (
                <div className={styles.scannerModal}>
                  <div
                    id="order-barcode-reader"
                    style={{ width: "100%" }}
                  ></div>
                  <button
                    onClick={async () => {
                      await stopScanner();
                      setShowScanner(false);
                      setOrderNumber(generateOrderNumber());
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className={styles.totals}>
                <input
                  type="text"
                  readOnly
                  value={`Total: ${formatCurrency(totals.total)}`}
                />
                <input
                  type="text"
                  readOnly
                  value={`Profit: ${formatCurrency(totals.profit)}`}
                />
              </div>

              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => {
                    // STOP SCANNER
                    scannerRef.current?._html5Qrcode?.stop().catch(() => {});
                    scannerRef.current?.clear().catch(() => {});
                    scannerRef.current = null;
                    setShowScanner(false);

                    // CLOSE MODAL
                    setShowSecondModal(false);
                    resetForm();
                    setIsEditing(false);
                  }}
                >
                  {location.state?.autoOpen ? "View Table" : "Cancel"}
                </button>

                {isEditing ? (
                  <button
                    className={styles.Next}
                    onClick={() => {
                      saveOrder(); //
                    }}
                  >
                    Save
                  </button>
                ) : (
                  <>
                    <button
                      className={styles.Next}
                      onClick={() => {
                        setShowSecondModal(false);
                        setShowModal(true);
                      }}
                    >
                      Add Order
                    </button>

                    <button
                      className={styles.Next}
                      onClick={() => {
                        setShowSecondModal(false);
                        setShowDebtModal(true);
                      }}
                    >
                      Add Debt
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <AddDebtModal
          show={showDebtModal}
          onClose={() => setShowDebtModal(false)} // optional if you still want a normal close
          onBackToProducts={() => {
            setShowDebtModal(false);
            setShowSecondModal(true);
          }}
          onSave={saveAsDebt}
        />

        {selectedOrder && (
          <div className={styles.modal}>
            <div
              className={`${styles["modal-content"]} ${styles["receipt-modal"]}`}
            >
              <h2>Receipt</h2>
              <p>
                <strong>Order ID:</strong> {selectedOrder.order_number}
              </p>
              <p>
                <strong>Customer:</strong> {selectedOrder.customer_name}
              </p>

              <div className={styles["receipt-table"]}>
                <div className={styles["receipt-header"]}>
                  <span>Product</span>
                  <span>Quantity</span>
                  <span>Sell</span>
                  <span>Buy</span>
                </div>

                {selectedOrder.products &&
                  selectedOrder.products.map((p, idx) => (
                    <div key={idx} className={styles["receipt-row"]}>
                      <span>{p.name}</span>
                      <span>{p.quantity}</span>
                      <span>{formatCurrency(p.selling_price)}</span>
                      <span>{formatCurrency(p.buying_price)}</span>
                    </div>
                  ))}
              </div>
              <div className={styles["receipt-totals"]}>
                <div className={styles.leftColumn}>
                  <p>
                    <strong>Total:</strong>{" "}
                    {formatCurrency(selectedOrder.total)}
                  </p>
                  <p>
                    <strong>Profit:</strong>{" "}
                    {formatCurrency(selectedOrder.profit)}
                  </p>
                </div>
                <div className={styles.rightColumn}>
                  <p>
                    <strong>Payment:</strong>{" "}
                    {formatCurrency(selectedOrder.payment_amount)}
                  </p>
                  <p>
                    <strong>Change:</strong>{" "}
                    {formatCurrency(selectedOrder.change_amount)}
                  </p>
                </div>
              </div>

              <div className={styles["receipt-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
                <button
                  className={styles.Edit}
                  onClick={() => {
                    const updatedProducts = (selectedOrder.products || []).map(
                      (p) => {
                        const foundStock = stocks.find(
                          (s) => s.name === p.name || s.barcode === p.stock_id
                        );

                        return {
                          ...p,
                          stock_id: foundStock
                            ? foundStock.barcode
                            : p.stock_id || "",
                        };
                      }
                    );

                    setProducts(updatedProducts);
                    setOrderNumber(selectedOrder.order_number);
                    setCustomerName(selectedOrder.customer_name);
                    setTotals({
                      total: selectedOrder.total,
                      profit: selectedOrder.profit,
                    });

                    setPaymentAmount(selectedOrder.payment_amount || "");
                    setChangeAmount(selectedOrder.change_amount || 0);

                    setEditingOrderId(selectedOrder.id);
                    setIsEditing(true);
                    setSelectedOrder(null);
                    setShowSecondModal(true);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={styles.tabInner}>
          {activeTab === "debts" && <Debts setPage={setPage} />}
        </div>
      </main>
    </div>
  );
}
