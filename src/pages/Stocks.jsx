import { useState, useEffect, useCallback } from "react";
import styles from "../css/Stocks.module.css";
import axios from "axios";
import { getAuth } from "firebase/auth";
//import bellIcon from "../assets/bell.png";
//import bellAlertIcon from "../assets/bellalert.png";

import barcodeIcon from "../assets/barcode.png";
import { Html5QrcodeScanner } from "html5-qrcode";
import deleteIcon from "../assets/deleteIcon.png";

import BottomNav from "../components/BottomNav";

import NotificationBell from "../components/NotificationBell";

const BASE_URL = process.env.REACT_APP_API_URL; // e.g., https://sarimanage-render.onrender.com

const EXPIRY_WARNING_DAYS = 14;

const defaultCategories = [
  "Beverages & Drinks",
  "Snacks & Chips",
  "Instant Foods",
  "Condiments & Sauces",
  "Dairy & Eggs",
  "Personal Care",
  "Cleaning Supplies",
  "Frozen Foods",
];

export default function Stocks({ setPage }) {
  const [, setLowStockItems] = useState([]);
  //const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const auth = getAuth();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [stockName, setStockName] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("");
  const [stockAmount, setStockAmount] = useState("");
  const [selling_price, setSellingPrice] = useState("");
  const [buying_price, setBuyingPrice] = useState("");
  const [lowStock, setLowStock] = useState("");
  //const [expiringItems, setExpiringItems] = useState([]);
  const [, setExpiringItems] = useState([]);

  const [manufacturing_date, setManufacturingDate] = useState("");
  const [expiry_date, setExpiryDate] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [modalMode, setModalMode] = useState("add");

  const [flagFilter, setFlagFilter] = useState("");

  const [imagePreview, setImagePreview] = useState(null);

  const fetchStocks = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const res = await axios.get(`${BASE_URL}/stocks/user/${user.uid}`);
      setStocks(res.data);
    } catch (err) {
      console.error("Error fetching stocks:", err);
    }
  }, [auth]);

  //Fetch all stocks from backend
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchStocks();
      } else {
        setStocks([]);
      }
    });

    return () => unsubscribe();
  }, [auth, fetchStocks]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("barcode-reader", {
        fps: 10,
        qrbox: 180,
      });

      scanner.render(
        (decodedText) => {
          if (modalMode === "add") {
            setProductId(decodedText);
          } else if (modalMode === "edit") {
            setSelectedStock((prev) =>
              prev ? { ...prev, barcode: decodedText } : prev,
            );
          }

          setShowScanner(false);
          scanner.clear();
        },
        (error) => {
          console.warn("Scanning error:", error);
        },
      );

      return () => {
        scanner.clear().catch((err) => console.error("Clear failed:", err));
      };
    }
  }, [showScanner, modalMode]);

  useEffect(() => {
    const low = stocks.filter(
      (stock) => Number(stock.stock) <= Number(stock.lowstock),
    );
    setLowStockItems(low);
  }, [stocks]);

  useEffect(() => {
    const today = new Date();

    const expiring = stocks.filter((stock) => {
      if (!stock.expiry_date) return false;

      const expiry = new Date(stock.expiry_date);

      // Calculate difference in days
      const diffTime = expiry - today;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= EXPIRY_WARNING_DAYS && diffDays >= 0;
    });

    setExpiringItems(expiring);
  }, [stocks]);

  useEffect(() => {
    const uniqueStockCategories = [
      ...new Set(stocks.map((stock) => stock.category).filter(Boolean)),
    ];

    const allCategories = [
      ...new Set([...defaultCategories, ...uniqueStockCategories]),
    ];
    setCategories(allCategories);
  }, [stocks]);

  // Save stock to backend
  const saveStock = async () => {
    const user = auth.currentUser;
    const formData = new FormData();

    // Trim product name
    const cleanedName = stockName.trim().replace(/\s+/g, " ");

    // ✅ Validation: Buying Price must be <= Selling Price
    const buy = parseFloat(buying_price);
    const sell = parseFloat(selling_price);

    if (isNaN(buy) || isNaN(sell)) {
      return alert(
        "Buying price and Suggested Retail Price must be valid numbers.",
      );
    }

    if (buy > sell) {
      return alert(
        "Buying Price cannot be higher than Suggested Retail Price!",
      );
    }

    formData.append("firebase_uid", user.uid);
    formData.append("barcode", productId);
    formData.append("name", cleanedName);
    formData.append("category", category);
    formData.append("stock", stockAmount);
    formData.append("lowstock", lowStock);
    formData.append("buying_price", buying_price);
    formData.append("selling_price", selling_price);
    if (manufacturing_date)
      formData.append("manufacturing_date", manufacturing_date);
    if (expiry_date) formData.append("expiry_date", expiry_date);

    if (productImage) {
      formData.append("image", productImage);
    }

    if (!categories.includes(category)) {
      setCategories([...categories, category]);
    }

    try {
      const res = await axios.post(`${BASE_URL}/stocks`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStocks([...stocks, res.data]);
      setShowModal(false);
      resetFields();
    } catch (err) {
      console.error("Error saving stock:", err);
    }
  };

  //  Update stock
  const updateStock = async () => {
    try {
      // validations unchanged...

      const formData = new FormData();

      Object.entries(selectedStock).forEach(([key, value]) => {
        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          key !== "id" &&
          key !== "image" &&
          key !== "previewImage" &&
          key !== "newImageFile"
        ) {
          formData.append(key, value);
        }
      });

      if (selectedStock.newImageFile) {
        formData.append("image", selectedStock.newImageFile);
      }

      await axios.put(`${BASE_URL}/stocks/${selectedStock.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchStocks(); // 🔥 AUTO REFRESH
      setShowModal(false);
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  };

  //Delete stock
  const deleteStock = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/stocks/${id}`);
      setStocks(stocks.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting stock:", err);
    }
  };

  // Reset form
  const resetFields = () => {
    setStockName("");
    setProductId("");
    setCategory("");
    setStockAmount("");
    setSellingPrice("");
    setBuyingPrice("");
    setLowStock("");
    setManufacturingDate("");
    setExpiryDate("");

    setProductImage(null);
  };

  const filteredStocks = stocks
    .filter((stock) => {
      const searchLower = search.toLowerCase();
      return (
        String(stock.name || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(stock.barcode || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(stock.category || "")
          .toLowerCase()
          .includes(searchLower)
      );
    })
    .filter((stock) => {
      if (flagFilter === "lowStock") {
        return Number(stock.stock) <= Number(stock.lowstock);
      } else if (flagFilter === "expiring") {
        const today = new Date();
        if (!stock.expiry_date) return false;
        const expiry = new Date(stock.expiry_date);
        const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
        return diffDays <= EXPIRY_WARNING_DAYS && diffDays >= 0;
      }
      return true; // no filter
    });

  const handleEnterFocus = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), textarea, select',
        ),
      );

      const index = inputs.indexOf(e.target);
      if (index > -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      } else {
        document.querySelector(`.${styles.Next}`)?.click();
      }
    }
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  return (
    <div>
      {/* Topbar */}
      <div className={styles.topbar}>
        <h2>Stocks</h2>
        <NotificationBell />
      </div>

      <main className={styles.main}>
        {/* Page Header + Search */}
        <div className={styles["page-header"]}>
          <div
            className={styles["search-wrapper"]}
            style={{ position: "relative" }}
          >
            <input
              type="text"
              placeholder="Search stock name or category"
              className={styles["search-input"]}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() =>
                setTimeout(() => setShowCategoryDropdown(false), 150)
              } // slight delay to allow click
            />
            {/*
            {showCategoryDropdown && categories.length > 0 && (
              <ul
                className={styles["category-dropdown"]}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "var(--card-bg)",
                  border: "1px solid var(--input-border)",
                  borderRadius: "8px",
                  maxHeight: "150px",
                  overflowY: "auto",
                  zIndex: 1000,
                  marginTop: "4px",
                  padding: "0",
                  listStyle: "none",
                  textAlign: "left",
                }}
              >
                {categories.map((cat, i) => (
                  <li
                    key={i}
                    onClick={() => setSearch(cat)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            )} */}
          </div>

          {/*<h1>Stocks</h1>*/}
        </div>

        <div className={styles.filterBar}>
          <button
            className={flagFilter === "" ? styles.activeFilter : ""}
            onClick={() => setFlagFilter("")}
          >
            All
          </button>
          <button
            className={flagFilter === "lowStock" ? styles.activeFilter : ""}
            onClick={() => setFlagFilter("lowStock")}
          >
            Low Stock
          </button>
          <button
            className={flagFilter === "expiring" ? styles.activeFilter : ""}
            onClick={() => setFlagFilter("expiring")}
          >
            Near Expiry
          </button>
        </div>

        {/* Stocks Grid */}
        <div className={styles["stocks-table-container"]}>
          {stocks.length === 0 ? (
            <div className={styles.noStocks}>
              <p>
                Your stock list is empty. Click + to add products or Quick Add
                to add products faster
              </p>
              <button
                className={styles.quickAddButton}
                onClick={() => setShowModal(true)}
              >
                Quick Add
              </button>
            </div>
          ) : (
            <div className={styles.categoryAccordionContainer}>
              {categories.map((cat) => {
                const categoryStocks = filteredStocks
                  .filter((stock) => stock.category === cat)
                  .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                if (categoryStocks.length === 0) return null;

                return (
                  <div key={cat} className={styles.categoryAccordion}>
                    <button
                      className={styles.categoryHeader}
                      onClick={(e) => {
                        const content = e.currentTarget.nextElementSibling;
                        content.classList.toggle(styles.open);
                      }}
                    >
                      <span>{cat}</span>
                      <span className={styles.arrow}>▼</span>
                    </button>

                    <div className={styles.categoryContent}>
                      <table className={styles.stocksTable}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryStocks.map((stock) => (
                            <tr
                              key={stock.id}
                              onClick={() => {
                                setSelectedStock({
                                  ...stock,
                                  manufacturing_date: formatDateForInput(
                                    stock.manufacturing_date,
                                  ),
                                  expiry_date: formatDateForInput(
                                    stock.expiry_date,
                                  ),
                                });
                                setModalMode("edit");
                                setShowModal(true);
                              }}
                              className={
                                Number(stock.stock) <= Number(stock.lowstock)
                                  ? styles.lowStockRow
                                  : ""
                              }
                            >
                              <td className={styles.productCell}>
                                <div className={styles.productInfo}>
                                  {stock.image ? (
                                    <img
                                      src={
                                        stock.image
                                          ? `${BASE_URL}${stock.image}`
                                          : undefined
                                      }
                                      alt={stock.name}
                                      className={styles.productThumb}
                                    />
                                  ) : (
                                    <div className={styles.noImage}>
                                      No Image
                                    </div>
                                  )}
                                  <span className={styles.productName}>
                                    {stock.name}
                                  </span>
                                </div>
                              </td>
                              <td>₱{stock.selling_price}</td>
                              <td>{stock.stock}</td>
                              <td>
                                <button
                                  className={styles.deleteBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteStock(stock.id);
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Create Button */}
        <button
          className={styles["create-button"]}
          onClick={() => {
            setModalMode("add");
            resetFields();
            setShowModal(true);
          }}
        >
          +
        </button>

        {/* Add/Edit Product Modal */}
        {showModal && (
          <div className={styles.modal}>
            <div className={styles["modal-content"]}>
              <h2>{modalMode === "add" ? "Add Product" : "Edit Product"}</h2>
              <p>Enter product details</p>

              {/* Product Image Upload */}
              <div
                className={styles["image-upload"]}
                onClick={() => document.getElementById("imageInput").click()}
              >
                {modalMode === "add" ? (
                  imagePreview ? (
                    <img src={imagePreview} alt="Preview" />
                  ) : (
                    <span>Tap to add image</span>
                  )
                ) : selectedStock?.previewImage ? (
                  <img src={selectedStock.previewImage} alt="Preview" />
                ) : selectedStock?.image ? (
                  <img
                    src={`${BASE_URL}${selectedStock.image}`}
                    alt={selectedStock.name}
                  />
                ) : (
                  <span>Tap to add image</span>
                )}

                <input
                  type="file"
                  id="imageInput"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (!e.target.files || !e.target.files[0]) return;

                    const file = e.target.files[0];
                    const preview = URL.createObjectURL(file);

                    if (modalMode === "add") {
                      setProductImage(file);
                      setImagePreview(preview);
                    } else {
                      setSelectedStock((prev) => ({
                        ...prev,
                        newImageFile: file,
                        previewImage: preview,
                      }));
                    }
                  }}
                />
              </div>

              {/* Form Inputs */}
              <div className={styles.formGroupNew}>
                <label>Product Name</label>
                <input
                  type="text"
                  value={
                    modalMode === "add" ? stockName : selectedStock?.name || ""
                  }
                  onChange={(e) =>
                    modalMode === "add"
                      ? setStockName(e.target.value)
                      : setSelectedStock({
                          ...selectedStock,
                          name: e.target.value,
                        })
                  }
                  onKeyDown={handleEnterFocus}
                  placeholder="e.g. Coca-Cola 500ml"
                  required
                />
              </div>

              <div className={styles.productIdGroup}>
                <label>Product ID</label>
                <div className={styles.productIdInputWrapper}>
                  <input
                    type="text"
                    value={
                      modalMode === "add"
                        ? productId
                        : selectedStock?.barcode || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setProductId(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            barcode: e.target.value,
                          })
                    }
                    onKeyDown={handleEnterFocus}
                    placeholder="Scan or enter barcode"
                    required
                  />
                  <button
                    type="button"
                    className={styles.barcodeBtn}
                    onClick={() => setShowScanner(true)}
                  >
                    <img src={barcodeIcon} alt="Scan Barcode" />
                  </button>
                </div>
              </div>

              <div
                className={styles.formGroupNew}
                style={{ position: "relative" }}
              >
                <label>Category</label>
                <input
                  type="text"
                  value={
                    modalMode === "add"
                      ? category
                      : selectedStock?.category || ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (modalMode === "add") setCategory(value);
                    else
                      setSelectedStock({
                        ...selectedStock,
                        category: value,
                      });

                    // Show dropdown if input not empty
                    setShowCategoryDropdown(value.length > 0);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowCategoryDropdown(false), 150)
                  } // slight delay to allow click
                  placeholder="Select or create category"
                  required
                />

                {/* Dropdown */}
                {showCategoryDropdown && (
                  <ul
                    className={styles["category-dropdown"]}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      width: "100%",
                      background: "var(--card-bg)",
                      border: "1px solid var(--input-border)",
                      borderRadius: "8px",
                      maxHeight: "150px",
                      overflowY: "auto",
                      zIndex: 1000,
                      marginTop: "4px",
                      padding: "0",
                      listStyle: "none",
                      textAlign: "left",
                    }}
                  >
                    {categories
                      .filter((cat) =>
                        cat
                          .toLowerCase()
                          .includes(
                            (modalMode === "add"
                              ? category
                              : selectedStock?.category || ""
                            ).toLowerCase(),
                          ),
                      )
                      .map((cat, i) => (
                        <li
                          key={i}
                          onMouseDown={(e) => e.preventDefault()} // prevent input blur
                          onClick={() => {
                            if (modalMode === "add") setCategory(cat);
                            else
                              setSelectedStock({
                                ...selectedStock,
                                category: cat,
                              });
                            setShowCategoryDropdown(false);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                          }}
                        >
                          {cat}
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div className={styles["form-row"]}>
                <div className={styles.formGroupNew}>
                  <label>Stock</label>
                  <input
                    type="number"
                    value={
                      modalMode === "add"
                        ? stockAmount
                        : selectedStock?.stock || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setStockAmount(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            stock: e.target.value,
                          })
                    }
                    onKeyDown={handleEnterFocus}
                    placeholder="Current Stock (e.g. 24)"
                    required
                  />
                </div>
                <div className={styles.formGroupNew}>
                  <label>Low Stock Limit</label>
                  <input
                    type="number"
                    value={
                      modalMode === "add"
                        ? lowStock
                        : selectedStock?.lowstock || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setLowStock(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            lowstock: e.target.value,
                          })
                    }
                    onKeyDown={handleEnterFocus}
                    placeholder="Alert level (e.g. 5)"
                    required
                  />
                </div>
              </div>

              <div className={styles["form-row"]}>
                <div className={styles.formGroupNew}>
                  <label>Buying Price</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^\d*\.?\d{0,2}$"
                    value={
                      modalMode === "add"
                        ? buying_price
                        : selectedStock?.buying_price || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setBuyingPrice(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            buying_price: e.target.value,
                          })
                    }
                    onKeyDown={handleEnterFocus}
                    placeholder="Cost price (e.g. 25.00)"
                    required
                  />
                </div>

                <div className={styles.formGroupNew}>
                  <label>Suggested Retail Price</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^\d*\.?\d{0,2}$"
                    value={
                      modalMode === "add"
                        ? selling_price
                        : selectedStock?.selling_price || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setSellingPrice(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            selling_price: e.target.value,
                          })
                    }
                    onKeyDown={handleEnterFocus}
                    placeholder="Selling price (e.g. 30.00)"
                    required
                  />
                </div>
              </div>

              <div className={styles["form-row"]}>
                <div className={styles.formGroupNew}>
                  <label>Manufactured Date</label>
                  <input
                    type="date"
                    value={
                      modalMode === "add"
                        ? manufacturing_date
                        : selectedStock?.manufacturing_date || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setManufacturingDate(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            manufacturing_date: e.target.value,
                          })
                    }
                  />
                </div>

                <div className={styles.formGroupNew}>
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={
                      modalMode === "add"
                        ? expiry_date
                        : selectedStock?.expiry_date || ""
                    }
                    onChange={(e) =>
                      modalMode === "add"
                        ? setExpiryDate(e.target.value)
                        : setSelectedStock({
                            ...selectedStock,
                            expiry_date: e.target.value,
                          })
                    }
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.Next}
                  onClick={modalMode === "add" ? saveStock : updateStock}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showScanner && (
          <div className={styles.scannerModal}>
            <div id="barcode-reader" style={{ width: "100%" }}></div>
            <button onClick={() => setShowScanner(false)}>Cancel</button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
