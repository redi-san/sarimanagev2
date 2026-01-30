import { useState, useEffect, useRef, useCallback } from "react";
import styles from "../css/Debts.module.css";
import deleteIcon from "../assets/deleteIcon.png";
import { Html5Qrcode } from "html5-qrcode";
import { getAuth } from "firebase/auth";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

export default function Debts({ setPage }) {
  const formatPeso = (amount) => {
    const num = parseFloat(amount) || 0;
    return `₱${num.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const auth = getAuth();
  const [activeTab, setActiveTab] = useState("unpaid");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [debtsList, setDebtsList] = useState([]);
  const [products, setProducts] = useState([]);
  const [totals, setTotals] = useState({ total: 0, profit: 0 });
  const [scanningIndex, setScanningIndex] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [status, setStatus] = useState("Unpaid");
  const [editingDebtIndex, setEditingDebtIndex] = useState(null);
  const [customer_name, setCustomerName] = useState("");
  const [contact_number, setContactNumber] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [due_date, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [stocks, setStocks] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDebtId, setPaymentDebtId] = useState(null);
  const productsRef = useRef(products);
  const scanningIndexRef = useRef(scanningIndex);

  const [paymentHistory, setPaymentHistory] = useState([]);

  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    scanningIndexRef.current = scanningIndex;
  }, [scanningIndex]);

  // Fetch stocks
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await axios.get(`${BASE_URL}/stocks/user/${user.uid}`);
          setStocks(res.data);
        } catch (err) {
          console.error("Error fetching user stocks:", err);
        }
      } else {
        setStocks([]);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Fetch debts
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await axios.get(`${BASE_URL}/debts/user/${user.uid}`);

          // Update status based on due_date
          const updatedDebts = res.data.map((debt) => {
            const today = new Date();

            if (debt.status === "Unpaid" && debt.due_date) {
              const due = new Date(debt.due_date);
              if (!isNaN(due) && due < today) {
                return { ...debt, status: "Overdue" };
              }
            }

            // If no due_date or not overdue, leave status as is
            return debt;
          });

          setDebtsList(updatedDebts);
        } catch (err) {
          console.error("Error fetching debts:", err);
        }
      } else {
        setDebtsList([]);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!showScanner) return;

    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 180 },
      (decodedText) => {
        const index = scanningIndexRef.current;

        if (index !== null) {
          const updated = [...productsRef.current];
          updated[index].productId = decodedText;
          setProducts(updated);
        }

        html5QrCode.stop();
        setShowScanner(false);
        setScanningIndex(null);
      },
    );

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, [showScanner]);

  const fetchDebts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const res = await axios.get(`${BASE_URL}/debts/user/${user.uid}`);
      setDebtsList(res.data);
    } catch (err) {
      console.error("Error fetching debts:", err);
    }
  };

  const updateProduct = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;

    if (field === "name" || field === "productId") {
      let match = null;

      if (field === "name") {
        match = stocks.find(
          (s) => s.name.toLowerCase() === value.toLowerCase(),
        );
      } else if (field === "productId") {
        match = stocks.find(
          (s) =>
            s.barcode?.toString().toLowerCase() ===
            value.toString().toLowerCase(),
        );
      }

      if (match) {
        newProducts[index].name = match.name;
        newProducts[index].stock_id = match.id;
        newProducts[index].buyingPrice = match.buying_price || 0;
        newProducts[index].sellingPrice = match.selling_price || 0;
        newProducts[index].productId = match.barcode || "";
      } else {
        newProducts[index].stock_id = null;
        newProducts[index].buyingPrice = "";
        newProducts[index].sellingPrice = "";
      }
    }

    setProducts(newProducts);
    calculateTotals(newProducts);
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
      const sell = parseFloat(p.sellingPrice) || 0;
      const buy = parseFloat(p.buyingPrice) || 0;
      total += qty * sell;
      profit += qty * (sell - buy);
    });
    setTotals({ total, profit });
  };

  const saveDebt = async () => {
    const user = auth.currentUser;

    if (editingDebtIndex !== null) {
      const debtId = debtsList[editingDebtIndex].id;

      const updatedDebt = {
        customer_name,
        contact_number,
        date,
        due_date,
        note,
        status,
        total: totals.total,
        profit: totals.profit,
        products: products.map((p) => ({
          stock_id: p.stock_id ?? null,
          name: p.name,
          quantity: p.quantity,
          selling_price: p.sellingPrice ?? p.selling_price ?? 0,
          buying_price: p.buyingPrice ?? p.buying_price ?? 0,
          dateAdded: p.dateAdded || new Date().toISOString().split("T")[0],
        })),
      };

      try {
        await axios.put(`${BASE_URL}/debts/${debtId}`, updatedDebt);

        // Update debtsList locally instead of fetching
        setDebtsList((prev) =>
          prev.map((d) => (d.id === debtId ? { ...d, ...updatedDebt } : d)),
        );

        showToast("Debt updated successfully", "success");
        setShowModal(false);
        setShowSecondModal(false);
        setEditingDebtIndex(null);
        resetForm();
      } catch (err) {
        console.error("Error updating debt:", err);
        showToast(
          err.response?.data?.error || "Failed to update debt",
          "error",
        );
      }

      return;
    }

    // New Debt
    const newDebt = {
      user_id: user.uid,
      customer_name,
      contact_number,
      date,
      due_date,
      note,
      status,
      total: totals.total,
      profit: totals.profit,
      products: products.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        selling_price: p.sellingPrice,
        buying_price: p.buyingPrice,
      })),
    };

    try {
      const res = await axios.post(`${BASE_URL}/debts`, newDebt);
      showToast("Debt created successfully", "success");

      // Append the new debt immediately to the table
      setDebtsList((prev) => [...prev, res.data]);

      // ✅ Force tab to unpaid so new debt is visible
      setActiveTab("unpaid");

      setShowSecondModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving debt:", err);
      showToast(err.response?.data?.error || "Failed to save debt", "error");
    }
  };

  const deleteDebt = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/debts/${id}`);
      await fetchDebts(); // fetch only current user's debts
    } catch (err) {
      console.error("Error deleting debt:", err);
    }
  };

  const getPaymentKey = (debtId) => `payment_history_${debtId}`;

  const loadPaymentHistory = useCallback((debtId) => {
    const stored = localStorage.getItem(getPaymentKey(debtId));
    return stored ? JSON.parse(stored) : [];
  }, []);

  const savePaymentHistory = (debtId, history) => {
    localStorage.setItem(getPaymentKey(debtId), JSON.stringify(history));
  };

  const recordPayment = async () => {
    try {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        showToast("Enter a valid payment amount", "error");
        return;
      }

      const amount = parseFloat(paymentAmount);

      // Load payment history from localStorage
      const history = loadPaymentHistory(paymentDebtId);
      const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);

      // Find debt total from debtsList
      const debt = debtsList.find((d) => d.id === paymentDebtId);
      if (!debt) {
        showToast("Debt not found", "error");
        return;
      }

      const balance = debt.total - totalPaid;
      const paymentToRecord = amount;
      const overpay = amount - balance > 0 ? amount - balance : 0;

      // Save payment via API (optional if you want backend record)
      await axios.post(`${BASE_URL}/debts/${paymentDebtId}/payment`, {
        amount: paymentToRecord,
      });

      // Save to localStorage
      const newEntry = {
        amount: paymentToRecord, // full paid amount
        change: overpay, // optional, for display only
        date: new Date().toLocaleString("en-PH"),
      };

      const updatedHistory = [...history, newEntry]; // append at end
      savePaymentHistory(paymentDebtId, updatedHistory);
      setPaymentHistory(updatedHistory);

      showToast(
        `Payment recorded successfully${
          overpay > 0 ? `. Change: ${formatPeso(overpay)}` : ""
        }`,
        "success",
      );

      // Refresh debts and close modal
      await fetchDebts();
      setShowPaymentModal(false);
      setSelectedDebt(null);
    } catch (err) {
      console.error("Error recording payment:", err);
      alert(err.response?.data?.error || "Failed to record payment.");
    }
  };

  const openPaymentModal = (debtId) => {
    setPaymentDebtId(debtId);
    setPaymentAmount("");

    const history = loadPaymentHistory(debtId);
    setPaymentHistory(history);

    setShowPaymentModal(true);
  };

  const resetForm = () => {
    setCustomerName("");
    setContactNumber("");
    //setDate(new Date().toISOString().split("T")[0]);
    setDate(new Date().toLocaleDateString("en-CA"));
    setNote("");
    //setStatus("");
    setStatus("Unpaid");
    setProducts([]);
    setTotals({ total: 0, profit: 0 });
  };

  const handleEnterKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      const next = form.elements[index + 1];

      if (next) {
        if (next.type !== "button" && next.type !== "submit") {
          next.focus();
        } else {
          const submitBtn = form.querySelector("button[type='submit']");
          if (submitBtn) submitBtn.click();
        }
      } else {
        form.requestSubmit();
      }
    }
  };

  const sendSMSReminder = async (number, message) => {
    try {
      await axios.post(`${BASE_URL}/sms/reminder`, {
        number,
        message,
      });

      alert("✅ SMS reminder sent!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to send SMS");
    }
  };

  useEffect(() => {
    if (selectedDebt) {
      const history = loadPaymentHistory(selectedDebt.id);
      setPaymentHistory(history);
    }
  }, [selectedDebt, loadPaymentHistory]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <div>
      {/* Topbar */}
      <div className={styles.topbar}>
        <h2>Transactions</h2>
      </div>

      {/* Sidebar */}

      {/* Page Header */}
      <main className={styles.mainContent}>
        <div className={styles["page-header"]}>
          <input
            type="text"
            placeholder="Search Debts"
            className={styles["search-input"]}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/*<h1>Debts</h1>*/}
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${
              activeTab === "unpaid" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("unpaid")}
          >
            Unpaid
          </button>

          <button
            className={`${styles.tabButton} ${
              activeTab === "paid" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("paid")}
          >
            Paid
          </button>
        </div>

        {/* Debts Table */}
        <div className={styles["table-container"]}>
          <table className={styles["debts-table"]}>
            <thead>
              <tr>
                <th>Customer</th>
                {/*<th>Contact</th>*/}
                <th>Date</th>
                {/*<th>Due Date</th>*/}
                <th>Total</th>
                {/*<th>Balance</th>*/}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {debtsList
                .filter((debt) => {
                  if (activeTab === "unpaid") {
                    return (
                      debt.status === "Unpaid" || debt.status === "Overdue"
                    );
                  }
                  if (activeTab === "paid") {
                    return debt.status === "Paid";
                  }
                  return true;
                })

                .filter((debt) =>
                  debt.customer_name
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )

                .map((debt, index) => (
                  <tr key={index} onClick={() => setSelectedDebt(debt)}>
                    <td>{debt.customer_name}</td>
                    <td>{new Date(debt.date).toLocaleDateString("en-US")}</td>
                    <td>{formatPeso(debt.total)}</td>

                    <td>
                      <span
                        style={{
                          color:
                            debt.status === "Paid"
                              ? "green"
                              : debt.status === "Overdue"
                                ? "red"
                                : "orange",
                          fontWeight: "bold",
                        }}
                      >
                        {debt.status || "Unpaid"}
                      </span>
                    </td>

                    <td>
                      <button
                        className={styles["table-delete-btn"]}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteDebt(debt.id);
                            setDebtsList((prev) =>
                              prev.filter((d) => d.id !== debt.id),
                            );
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <img
                          src={deleteIcon}
                          alt="Delete"
                          style={{ width: "18px", height: "18px" }}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Floating Button */}
        {/*<button
          className={styles["create-button"]}
          onClick={() => {
            setEditingDebtIndex(null);
            resetForm();
            setShowModal(true);
          }}
        >
          +
        </button>*/}

        {/* Add Debt Modal */}
        {showModal && (
          <div className={styles.modal}>
            <div className={styles["modal-content"]}>
              <h2>{editingDebtIndex !== null ? "Edit Debt" : "Add Debt"}</h2>
              <p>Enter customer details</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingDebtIndex !== null) {
                    saveDebt();
                  } else {
                    setShowModal(false);
                    setShowSecondModal(true);
                  }
                }}
              >
                {/* Form Inputs */}
                <div className={styles["form-group"]}>
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={customer_name}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={handleEnterKey}
                    placeholder=""
                    required
                  />
                </div>

                <div className={styles["form-group"]}>
                  <label>Contact Number</label>

                  <input
                    type="text"
                    value={contact_number}
                    onChange={(e) => setContactNumber(e.target.value)}
                    onKeyDown={handleEnterKey}
                    placeholder=" "
                  />
                </div>

                <div className={styles["form-row"]}>
                  <div className={styles["form-group"]}>
                    <label>Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onKeyDown={handleEnterKey}
                      placeholder=" "
                      required
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Due Date</label>

                    <input
                      type="date"
                      value={due_date}
                      onChange={(e) => setDueDate(e.target.value)}
                      onKeyDown={handleEnterKey}
                      placeholder=" "
                    />
                  </div>
                </div>

                <div className={styles["form-group"]}>
                  <label>Note</label>

                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={handleEnterKey}
                    placeholder=" "
                    rows="3"
                    className={styles.textarea}
                  />
                </div>

                {/* Status Dropdown
        <div className={styles["form-group"]}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={styles["status-select"]}
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Overdue">Overdue</option>
            <option value="Paid">Paid</option>
          </select>
          <label></label>
        </div> */}

                <div className={styles["modal-actions"]}>
                  <button
                    type="button"
                    className={styles.Cancel}
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.Next}>
                    {editingDebtIndex !== null ? "Save" : "Next"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products Modal*/}
        {showSecondModal && (
          <div className={styles.modal}>
            <div
              className={`${styles["modal-content"]} ${styles["modal-second"]}`}
            >
              <h2>Add Products</h2>
              {products.map((product, index) => (
                <div className={styles["product-entry"]} key={index}>
                  <label className={styles.inputLabel}>Product Name</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Enter the product name"
                      value={product.name}
                      onChange={(e) =>
                        updateProduct(index, "name", e.target.value)
                      }
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
                          .startsWith(product.name.toLowerCase()),
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
                                .startsWith(product.name.toLowerCase()),
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
                                    "sellingPrice",
                                    s.selling_price,
                                  );
                                  updateProduct(
                                    index,
                                    "buyingPrice",
                                    s.buying_price,
                                  );
                                  //updateProduct(index, "stock_id", s.barcode);
                                  updateProduct(index, "stock_id", s.id);
                                  setActiveSuggestionIndex(null);
                                }}
                              >
                                {s.name}
                              </li>
                            ))}
                        </ul>
                      )}
                  </div>
                  <label className={styles.inputLabel}>Product ID</label>
                  <input
                    type="text"
                    placeholder="Scan to enter Product ID"
                    value={product.productId || ""}
                    onChange={(e) =>
                      updateProduct(index, "productId", e.target.value)
                    }
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
                        value={product.sellingPrice}
                        onChange={(e) =>
                          updateProduct(index, "sellingPrice", e.target.value)
                        }
                      />
                    </div>

                    {/*<input
    type="number"
    placeholder="Buying Price"
    value={product.buyingPrice}
    onChange={(e) =>
      updateProduct(index, "buyingPrice", e.target.value)
    }
  /> */}
                  </div>

                  {/*<input
                  type="date"
                  placeholder="Date Added"
                  value={product.dateAdded || ""}
                  onChange={(e) =>
                    updateProduct(index, "dateAdded", e.target.value)
                  }
                /> */}

                  {/* Buttons row */}
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

              {/* GLOBAL PRODUCT ACTIONS */}
              <div className={styles.buttonRow}>
                <button
                  className={styles["add-product-btn"]}
                  onClick={() => {
                    setProducts((prev) => [
                      ...prev,
                      {
                        name: "",
                        stock_id: null,
                        productId: "",
                        quantity: "1",
                        sellingPrice: "",
                        buyingPrice: "",
                        dateAdded: new Date().toISOString().split("T")[0],
                      },
                    ]);

                    // 🔥 make scanner target the newly added product
                    setScanningIndex(products.length);
                  }}
                >
                  Add Product
                </button>

                <button
                  className={styles["add-product-btn"]}
                  onClick={() => {
                    // if no products yet, auto-create one
                    if (products.length === 0) {
                      setProducts([
                        {
                          name: "",
                          stock_id: null,
                          productId: "",
                          quantity: "1",
                          sellingPrice: "",
                          buyingPrice: "",
                          dateAdded: new Date().toISOString().split("T")[0],
                        },
                      ]);
                      setScanningIndex(0);
                    }

                    setShowScanner(true);
                  }}
                >
                  Scan Product
                </button>
              </div>

{showScanner && (
  <div className={styles.scannerModal}>
    <div
      id="reader"
      style={{ width: "100%", maxWidth: "400px", margin: "auto" }}
    ></div>
    <button
      className={styles.Cancel}
      onClick={async () => {
        setShowScanner(false);
        setScanningIndex(null);
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
                  value={`Total: ${formatPeso(totals.total)}`}
                />
                <input
                  type="text"
                  readOnly
                  value={`Profit: ${formatPeso(totals.profit)}`}
                />
              </div>

              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => {
                    setShowSecondModal(false);
                  }}
                >
                  Back
                </button>
                <button className={styles.Next} onClick={saveDebt}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {selectedDebt && (
          <div className={styles.modal} onClick={() => setSelectedDebt(null)}>
            <div
              className={`${styles["modal-content"]} ${styles["receipt-modal"]}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles["receipt-header-top"]}>
                <h2>Debt Receipt</h2>
                {selectedDebt.status !== "Paid" && (
                  <div className={styles["receipt-kebab-container"]}>
                    <button
                      className={styles["receipt-kebab"]}
                      onClick={() => setShowKebabMenu((prev) => !prev)}
                    >
                      ⋮
                    </button>

                    {showKebabMenu && (
                      <div className={styles["kebab-menu"]}>
                        <button
                          onClick={() => {
                            const productList = (selectedDebt.products || [])
                              .map((p) => `${p.name} x${p.quantity || 0}`)
                              .join(", ");

                            // Get the logged-in user's first name
                            const user = auth.currentUser;
                            const firstName =
                              user?.displayName?.split(" ")[0] || "Your Seller";

                            // Construct message with line breaks
                            const message =
                              `Hi ${selectedDebt.customer_name}, this is a friendly reminder that your debt of ${formatPeso(
                                selectedDebt.total -
                                  (selectedDebt.total_paid || 0),
                              )} is due${selectedDebt.due_date ? ` on ${selectedDebt.due_date}` : ""}.\n\n` +
                              `Products: ${productList}.\n\n` +
                              `Please settle it at your earliest convenience.\n\n` +
                              `From, ${firstName}`;

                            sendSMSReminder(
                              selectedDebt.contact_number,
                              message,
                            );
                            setShowKebabMenu(false);
                          }}
                        >
                          Remind Customer
                        </button>

                        <button
                          onClick={() => {
                            setEditingDebtIndex(
                              debtsList.indexOf(selectedDebt),
                            );
                            setCustomerName(selectedDebt.customer_name);
                            setContactNumber(selectedDebt.contact_number);
                            setDate(selectedDebt.date);
                            setDueDate(selectedDebt.due_date);
                            setNote(selectedDebt.note || "");
                            setStatus(selectedDebt.status || "Unpaid");
                            setProducts(
                              (selectedDebt.products || []).map((p) => ({
                                ...p,
                                productId:
                                  p.productId || p.stock_id || p.id || "",
                                name: p.name || "",
                                quantity: p.quantity || "",
                                sellingPrice:
                                  p.selling_price ?? p.sellingPrice ?? 0,
                                buyingPrice:
                                  p.buying_price ?? p.buyingPrice ?? 0,
                                dateAdded: p.dateAdded || p.date_added || "",
                                stock_id: p.stock_id ?? null,
                              })),
                            );

                            setTotals({
                              total: selectedDebt.total || 0,
                              profit: selectedDebt.profit || 0,
                            });
                            setSelectedDebt(null);
                            setShowModal(true);
                            setShowSecondModal(false);
                            setShowKebabMenu(false);
                          }}
                        >
                          Edit Debt Info
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedDebt.image && (
                <img
                  src={URL.createObjectURL(selectedDebt.image)}
                  alt="Customer"
                  className={styles["preview-image"]}
                />
              )}
              <p>
                <strong>Customer:</strong> {selectedDebt.customer_name}
              </p>
              <p>
                <strong>Contact:</strong> {selectedDebt.contact_number}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {selectedDebt.date
                  ? new Date(selectedDebt.date).toLocaleDateString("en-US")
                  : "-"}
              </p>
              <p>
                <strong>Due Date:</strong>{" "}
                {selectedDebt.due_date
                  ? new Date(selectedDebt.due_date).toLocaleDateString("en-US")
                  : "-"}
              </p>

              <p>
                <strong>Note:</strong> {selectedDebt.note}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      selectedDebt.status === "Paid"
                        ? "green"
                        : selectedDebt.status === "Overdue"
                          ? "red"
                          : "orange",
                    fontWeight: "bold",
                  }}
                >
                  {selectedDebt.status}
                </span>
              </p>

              <div className={styles["receipt-products"]}>
                {/* Header row */}
                <div className={styles["receipt-header"]}>
                  <span>Product</span>
                  <span>Quantity</span>
                  <span>Sell</span>
                  <span>Buy</span>
                  <span>Date Added</span>
                </div>

                {/* Product rows */}
                {selectedDebt.products.map((p, idx) => (
                  <div key={idx} className={styles["receipt-row"]}>
                    <span>{p.name || "-"}</span>
                    <span>{p.quantity || "-"}</span>
                    <span>
                      {p.selling_price !== undefined && p.selling_price !== null
                        ? formatPeso(p.selling_price)
                        : "-"}
                    </span>
                    <span>
                      {p.buying_price !== undefined && p.buying_price !== null
                        ? formatPeso(p.buying_price)
                        : "-"}
                    </span>

                    <span>{p.dateAdded || "-"}</span>
                  </div>
                ))}
              </div>

              <div className={styles["receipt-totals"]}>
                <p>
                  <strong>Total:</strong> {formatPeso(selectedDebt.total)}
                </p>
                <p>
                  <strong>Profit:</strong> {formatPeso(selectedDebt.profit)}
                </p>

                <p>
                  <strong>Payment:</strong>{" "}
                  {formatPeso(
                    paymentHistory.reduce((sum, p) => sum + p.amount, 0),
                  )}
                </p>

                <p>
                  <strong>Current Balance:</strong>{" "}
                  {formatPeso(
                    Math.max(
                      0,
                      selectedDebt.total -
                        paymentHistory.reduce((sum, p) => sum + p.amount, 0),
                    ),
                  )}
                </p>

                {paymentHistory.length > 0 &&
                  paymentHistory[paymentHistory.length - 1].change > 0 && (
                    <p>
                      <strong>Change:</strong>{" "}
                      {formatPeso(
                        paymentHistory[paymentHistory.length - 1].change,
                      )}
                    </p>
                  )}
              </div>

              {/* Action buttons */}
              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Edit}
                  onClick={() => {
                    setEditingDebtIndex(debtsList.indexOf(selectedDebt));
                    setCustomerName(selectedDebt.customer_name);
                    setContactNumber(selectedDebt.contact_number);
                    setDate(selectedDebt.date);
                    setDueDate(selectedDebt.due_date);
                    setNote(selectedDebt.note || "");
                    setStatus(selectedDebt.status || "Unpaid");
                    setProducts(
                      (selectedDebt.products || []).map((p) => ({
                        ...p,
                        productId: p.productId || p.stock_id || p.id || "",
                        name: p.name || "",
                        quantity: p.quantity || "",
                        sellingPrice: p.selling_price ?? p.sellingPrice ?? 0,
                        buyingPrice: p.buying_price ?? p.buyingPrice ?? 0,
                        dateAdded: p.dateAdded || p.date_added || "",
                        stock_id: p.stock_id ?? null,
                      })),
                    );
                    setTotals({
                      total: selectedDebt.total || 0,
                      profit: selectedDebt.profit || 0,
                    });
                    setSelectedDebt(null);
                    setShowModal(false);
                    setShowSecondModal(true);
                  }}
                >
                  Edit
                </button>

                <button
                  className={styles.Full}
                  onClick={() => openPaymentModal(selectedDebt.id)}
                >
                  Payment
                </button>
              </div>

              {showPaymentModal && (
                <div className={styles.modal}>
                  <div
                    className={styles["modal-content"]}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 🔽 Payment History */}
                    {paymentHistory.length > 0 && (
                      <div className={styles["payment-history"]}>
                        <h4>Payment History</h4>
                        {paymentHistory.map((p, i) => {
                          const formattedDate = new Date(
                            p.date,
                          ).toLocaleDateString(); // Date only
                          return (
                            <div key={i} className={styles["payment-row"]}>
                              <span className={styles["payment-date"]}>
                                {formattedDate}
                              </span>
                              <span className={styles["payment-amount"]}>
                                {formatPeso(p.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <h2>Payment</h2>
                    <input
                      type="text"
                      className="enter-payment-input"
                      placeholder="Enter Payment Amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <div className={styles["modal-actions"]}>
                      <button
                        className={styles.Cancel}
                        onClick={() => setShowPaymentModal(false)}
                      >
                        Cancel
                      </button>
                      <button className={styles.Next} onClick={recordPayment}>
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
