// src/components/AddDebtModal.jsx
import React, { useState } from "react";
import styles from "../css/Debts.module.css";

export default function AddDebtModal({
  show,
  onClose,
  onSave,
  isEditing,
  initialData = {},
}) {
  const [customer_name, setCustomerName] = useState(
    initialData.customer_name || ""
  );
  const [contact_number, setContactNumber] = useState(
    initialData.contact_number || ""
  );
  const [date, setDate] = useState(
    initialData.date || new Date().toLocaleDateString("en-CA")
  );
  const [due_date, setDueDate] = useState(initialData.due_date || "");
  const [note, setNote] = useState(initialData.note || "");

  const handleEnterKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      const next = form.elements[index + 1];
      if (next) next.focus();
      else form.requestSubmit();
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modal}>
      <div className={styles["modal-content"]}>
        <h2>{isEditing ? "Edit Debt" : "Add Debt"}</h2>
        <p>Enter customer details</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const debtData = {
              customer_name,
              contact_number,
              date,
              due_date,
              note,
            };
            onSave(debtData); // ✅ unified - works for both add & edit
          }}
        >
          <div className={styles["form-group"]}>
            <input
              type="text"
              value={customer_name}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={handleEnterKey}
              placeholder=" "
              required
            />
            <label>Customer Name</label>
          </div>

          <div className={styles["form-group"]}>
            <input
              type="text"
              value={contact_number}
              onChange={(e) => setContactNumber(e.target.value)}
              onKeyDown={handleEnterKey}
              placeholder=" "
            />
            <label>Contact Number</label>
          </div>

          <div className={styles["form-row"]}>
            <div className={styles["form-group"]}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder=" "
                required
              />
              <label>Date</label>
            </div>
            <div className={styles["form-group"]}>
              <input
                type="date"
                value={due_date}
                onChange={(e) => setDueDate(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder=" "
              />
              <label>Due Date</label>
            </div>
          </div>

          <div className={styles["form-group"]}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleEnterKey}
              placeholder=" "
              rows="3"
              className={styles.textarea}
            />
            <label>Note</label>
          </div>

          <div className={styles["modal-actions"]}>
            <button type="button" className={styles.Cancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.Next}>
              {isEditing ? "Save" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
