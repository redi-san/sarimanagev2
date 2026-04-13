import React, { useState, useEffect, useCallback } from "react";
import styles from "../css/Stocks.module.css";
import axios from "axios";
import { getAuth } from "firebase/auth";
import successSound from "../assets/sarimanage_barcode_successful.mp3";
import barcodeIcon from "../assets/barcode.png";
import { Html5QrcodeScanner } from "html5-qrcode";
import deleteIcon from "../assets/deleteIcon.png";
import BottomNav from "../components/BottomNav";
import NotificationBell from "../components/NotificationBell";
const BASE_URL = process.env.REACT_APP_API_URL;
const EXPIRY_WARNING_DAYS = 14;
const audio = new Audio(successSound);

const defaultCategories = [
  "Beverages & Drinks",
  "Bread & Biscuits",
  "Canned Goods",
  "Cleaning Supplies",
  "Condiments & Sauces",
  "Cooking Essentials",
  "Dairy & Eggs",
  "Frozen Foods",
  "Household Essentials",
  "Instant Foods",
  "Personal Care",
  "Powdered Drinks & Milk",
  "Snacks & Chips",
];

export default function Stocks({ setPage }) {
  const [, setLowStockItems] = useState([]);
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
  const [lowStock, setLowStock] = useState(5);
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
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState("");

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
          audio.play().catch((err) => console.warn("Sound play failed:", err));

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
    ].sort((a, b) => a.localeCompare(b));

    setCategories(allCategories);
  }, [stocks]);

  const saveStock = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const cleanedName = stockName.trim().replace(/\s+/g, " ");

    if (
      !cleanedName ||
      !category ||
      !stockAmount ||
      !lowStock ||
      !buying_price ||
      !selling_price
    ) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    const buy = parseFloat(buying_price);
    const sell = parseFloat(selling_price);

    if (isNaN(buy) || isNaN(sell)) {
      showToast(
        "Buying price and Suggested Retail Price must be valid numbers",
        "error",
      );
      return;
    }

    if (buy > sell) {
      showToast(
        "Buying Price cannot be higher than Suggested Retail Price",
        "warning",
      );
      return;
    }

    const formData = new FormData();
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
      showToast("Product added successfully", "success");
    } catch (err) {
      console.error("Error saving stock:", err);
      showToast("Failed to save product. Try again.", "error");
    }
  };

  const updateStock = async () => {
    if (
      !selectedStock?.name ||
      !selectedStock?.category ||
      !selectedStock?.stock ||
      !selectedStock?.lowstock ||
      !selectedStock?.buying_price ||
      !selectedStock?.selling_price
    ) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    const buy = parseFloat(selectedStock.buying_price);
    const sell = parseFloat(selectedStock.selling_price);

    if (isNaN(buy) || isNaN(sell)) {
      showToast(
        "Buying price and Suggested Retail Price must be valid numbers",
        "error",
      );
      return;
    }

    if (buy > sell) {
      showToast(
        "Buying Price cannot be higher than Suggested Retail Price",
        "warning",
      );
      return;
    }

    try {
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

      await fetchStocks();
      setShowModal(false);
      showToast("Product updated successfully", "success");
    } catch (err) {
      console.error("Error updating stock:", err);
      showToast("Failed to update product. Try again.", "error");
    }
  };

  const deleteStock = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/stocks/${id}`);
      setStocks(stocks.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting stock:", err);
      showToast("Failed to delete product.", "error");
    }
  };

  const resetFields = () => {
    setStockName("");
    setProductId("");
    setCategory("");
    setStockAmount("");
    setSellingPrice("");
    setBuyingPrice("");
    setLowStock(5);
    setManufacturingDate("");
    setExpiryDate("");

    setProductImage(null);
    setImagePreview(null);
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
      return true;
    });

  const usedCategories = Array.from(
    new Set(filteredStocks.map((s) => s.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (categoryFilter !== "All" && !usedCategories.includes(categoryFilter)) {
      setCategoryFilter("All");
    }
  }, [usedCategories, categoryFilter]);

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

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, duration);
  };
  const renameCategory = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const oldCat = (editingCategory || "").trim();
    const nextCat = (newCategoryName || "").trim().replace(/\s+/g, " ");

    if (!oldCat) return;

    if (!nextCat) {
      showToast("Category name cannot be empty", "warning");
      return;
    }

    if (oldCat.toLowerCase() === nextCat.toLowerCase()) {
      setShowCategoryEditModal(false);
      return;
    }

    const alreadyExists = usedCategories.some(
      (c) => (c || "").trim().toLowerCase() === nextCat.toLowerCase(),
    );
    if (alreadyExists) {
      showToast("That category already exists", "warning");
      return;
    }

    try {
      const toUpdate = stocks.filter(
        (s) => (s.category || "").trim().toLowerCase() === oldCat.toLowerCase(),
      );

      setStocks((prev) =>
        prev.map((s) =>
          (s.category || "").trim().toLowerCase() === oldCat.toLowerCase()
            ? { ...s, category: nextCat }
            : s,
        ),
      );

      await Promise.all(
        toUpdate.map((s) =>
          axios.put(`${BASE_URL}/stocks/${s.id}`, { category: nextCat }),
        ),
      );

      if (categoryFilter === oldCat) setCategoryFilter(nextCat);

      setShowCategoryEditModal(false);
      showToast("Category updated successfully", "success");
      fetchStocks();
    } catch (err) {
      console.error("Rename category failed:", err?.response?.data || err);
      showToast("Failed to update category. Try again.", "error");
      fetchStocks();
    }
  };

  const deleteCategory = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const cat = (deletingCategory || "").trim();
    if (!cat) return;

    try {
      await axios.delete(`${BASE_URL}/stocks/category/${user.uid}`, {
        data: { category: cat },
      });

      setStocks((prev) =>
        prev.filter((s) => (s.category || "").trim() !== cat),
      );

      if (categoryFilter === cat) setCategoryFilter("All");

      setShowCategoryDeleteModal(false);
      setDeletingCategory("");
      showToast(`Deleted all products in "${cat}"`, "success");

      fetchStocks();
    } catch (err) {
      console.error("Delete category failed:", err?.response?.data || err);
      showToast("Failed to delete category. Try again.", "error");
      fetchStocks();
    }
  };

  return (
    <div>
      <div className={styles.topbar}>
        <h2>Stocks</h2>
        <NotificationBell />
      </div>

      <main className={styles.main}>
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
              }
            />
          </div>
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

        {/* category filter dropdown */}
        <div className={styles.categoryFilterRow}>
          <select
            className={styles.categoryFilterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {usedCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* stocks table */}
        <div className={styles["stocks-table-container"]}>
          {stocks.length === 0 ? (
            <div className={styles.noStocks}>
              <p>Your stock list is empty. Click + to add your products</p>
            </div>
          ) : (
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
                {(categoryFilter === "All"
                  ? usedCategories
                  : [categoryFilter]
                ).map((cat) => {
                  const categoryStocks = filteredStocks
                    .filter((stock) => stock.category === cat)
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                  if (categoryStocks.length === 0) return null;

                  return (
                    <React.Fragment key={cat}>
                      <tr key={`header-${cat}`} className={styles.categoryRow}>
                        <td colSpan={4} className={styles.categoryCell}>
                          <div className={styles.categoryHeaderRow}>
                            <span className={styles.categoryTitle}>{cat}</span>

                            <div className={styles.categoryActions}>
                              <button
                                type="button"
                                className={styles.categoryEditBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(cat);
                                  setNewCategoryName(cat);
                                  setShowCategoryEditModal(true);
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className={styles.categoryDeleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingCategory(cat);
                                  setShowCategoryDeleteModal(true);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
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
                                  src={stock.image}
                                  alt={stock.name}
                                  className={styles.productThumb}
                                />
                              ) : (
                                <div className={styles.noImage}>No Image</div>
                              )}
                              <span className={styles.productName}>
                                {stock.name}
                              </span>
                            </div>
                          </td>

                          <td className={styles.priceCell}>
                            ₱{stock.selling_price}
                          </td>
                          <td style={{ textAlign: "center" }}>{stock.stock}</td>

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
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
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

        {showCategoryDeleteModal && (
          <div className={styles.modal}>
            <div className={styles["modal-content"]}>
              <h2>Delete Category</h2>
              <p>
                This will delete <b>ALL products</b> under:
                <br />
                <b>{deletingCategory}</b>
              </p>
              <p style={{ marginTop: "10px", opacity: 0.85 }}>
                This action cannot be undone.
              </p>

              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => {
                    setShowCategoryDeleteModal(false);
                    setDeletingCategory("");
                  }}
                >
                  Cancel
                </button>

                <button
                  className={styles.Next}
                  onClick={deleteCategory}
                  style={{ background: "#e74c3c" }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className={styles.modal}>
            <div className={styles["modal-content"]}>
              <h2>{modalMode === "add" ? "Add Product" : "Edit Product"}</h2>
              <p>Enter product details</p>

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
                  <img src={selectedStock.image} alt={selectedStock.name} />
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

                    setShowCategoryDropdown(value.length > 0);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowCategoryDropdown(false), 150)
                  }
                  placeholder="Select or create category"
                  required
                />

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
                          onMouseDown={(e) => e.preventDefault()}
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

        {showCategoryEditModal && (
          <div className={styles.modal}>
            <div className={styles["modal-content"]}>
              <h2>Edit Category</h2>
              <p>
                Rename: <b>{editingCategory}</b>
              </p>

              <div className={styles.formGroupNew}>
                <label>New Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      renameCategory();
                    }
                  }}
                  placeholder="e.g. Snacks & Chips"
                  autoFocus
                />
              </div>

              <div className={styles["modal-actions"]}>
                <button
                  className={styles.Cancel}
                  onClick={() => setShowCategoryEditModal(false)}
                >
                  Cancel
                </button>
                <button className={styles.Next} onClick={renameCategory}>
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
      {toast.show && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
