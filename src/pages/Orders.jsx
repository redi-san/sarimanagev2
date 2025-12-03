import { useState, useEffect, useCallback, useRef } from "react";
import styles from "../css/Orders.module.css";
import deleteIcon from "../assets/deleteIcon.png";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { Html5QrcodeScanner } from "html5-qrcode";
import BottomNav from "../components/BottomNav";
import AddDebtModal from "../components/AddDebtModal";
import Debts from "./Debts"; // reuse your component

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

  const scannerRef = useRef(null);

  const [graphType, setGraphType] = useState("actual"); // "actual" | "forecast"


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

  useEffect(() => {
  if (!showScanner) return;

  const elementId = "order-barcode-reader";

  // Make sure the element exists before initializing
  if (!document.getElementById(elementId)) return;

  const scanner = new Html5QrcodeScanner(elementId, {
    fps: 10,
    qrbox: 180,
  });
  scannerRef.current = scanner;

  scanner.render(
    (decodedText) => {
      const foundStock = stocks.find(
        (s) => s.barcode?.toString() === decodedText
      );

      setProducts((prevProducts) => {
        const newProducts = [
          ...prevProducts,
          {
            stock_id: decodedText,
            name: foundStock ? foundStock.name : "",
            selling_price: foundStock ? foundStock.selling_price : "",
            buying_price: foundStock ? foundStock.buying_price : "",
            quantity: 1,
          },
        ];
        calculateTotals(newProducts);
        return newProducts;
      });

      // Clear scanner after successful scan
      scanner.clear().catch(() => {});
      scannerRef.current = null;
      setShowScanner(false);
    },
    (error) => {
      console.warn("Scan error:", error);
    }
  );

  // Cleanup if component unmounts or showScanner becomes false
  return () => {
    scannerRef.current?.clear().catch(() => {});
    scannerRef.current = null;
  };
}, [showScanner, stocks]);


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

    if (!user) return alert("You must be logged in to save orders.");
    if (products.length === 0) return alert("Please add at least one product.");

    const orderData = {
      firebase_uid: user.uid,
      order_number,
      customer_name,
      total: totals.total,
      profit: totals.profit,
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
        alert("Order updated successfully!");
        setEditingOrderId(null);
        setIsEditing(false);
      } else {
        await axios.post(`${BASE_URL}/orders`, orderData); // use BASE_URL
        alert("Order created successfully!");
      }

      fetchOrders();
      setShowSecondModal(false);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving order:", err);
      alert("Failed to save order.");
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
  };

  const generateOrderNumber = () => {
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate()
    ).padStart(2, "0")}${today.getFullYear()}`;

    const todaysOrders = ordersList.filter((order) =>
      order.order_number.startsWith(dateStr)
    );

    const nextNumber = String(todaysOrders.length + 1).padStart(2, "0");

    return `${dateStr}-${nextNumber}`;
  };

  const formatDate = (date) => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
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

  return (
    <div>
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
                  {/* First row: Show All / Show Today button */}
                  <div className={styles["filter-top"]}>
                    <button onClick={() => setShowAll(!showAll)}>
                      {showAll ? "Show Today" : "Show All"}
                    </button>
                  </div>

                  {/* Second row: Date navigation */}
                  <div className={styles["filter-bottom"]}>
                    <button
                      onClick={() =>
                        setFilterDate(
                          new Date(filterDate.setDate(filterDate.getDate() - 1))
                        )
                      }
                    >
                      ←
                    </button>
                    <span>
                      {showAll ? "All Orders" : formatDate(filterDate)}
                    </span>
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
                <input
                  type="text"
                  id="orderNumber"
                  value={order_number}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={handleEnterFocus}
                  required
                  placeholder=" "
                />
                <label htmlFor="orderNumber">Order Number</label>
              </div>
              <div className={styles["form-group"]}>
                <input
                  type="text"
                  id="customerName"
                  value={customer_name}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={handleEnterFocus}
                  required
                  placeholder=" "
                />
                <label htmlFor="customerName">Customer Name</label>
              </div>
              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => {
                    setShowModal(false);
                    setProducts([]);
                    setTotals({ total: 0, profit: 0 });
                  }}
                >
                  Cancel
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
              <h2>Add Products</h2>
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
                            background: "white",
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

                      //updateProduct(index, "stock_id", id);
                      updateProduct(index, "stock_id", barcode);

                      const foundStock = stocks.find(
                        //(s) => s.id.toString() === id
                        (s) => s.barcode.toString() === barcode
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
                        onChange={(e) =>
                          updateProduct(index, "quantity", e.target.value)
                        }
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
                  onClick={() => setShowScanner(true)}
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
                  + Add Product
                </button>
              </div>

              {showScanner && (
                <div className={styles.scannerModal}>
                  <div
                    id="order-barcode-reader"
                    style={{ width: "100%" }}
                  ></div>
                  <button
                    onClick={() => {
                      scannerRef.current?.clear().catch(() => {});
                      setShowScanner(false);
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
                    setShowSecondModal(false);
                    resetForm();
                    setIsEditing(false); // reset
                  }}
                >
                  Cancel
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
          onClose={() => setShowDebtModal(false)}
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
                <p>
                  <strong>Total: </strong> {formatCurrency(selectedOrder.total)}
                </p>
                <p>
                  <strong>Profit: </strong>
                  {formatCurrency(selectedOrder.profit)}
                </p>
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
