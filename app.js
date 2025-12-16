const STORAGE_KEY = "expense_tracker_transactions_v1";

// Form elements
const txForm = document.getElementById("txForm");
const typeEl = document.getElementById("type");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");
const noteEl = document.getElementById("note");
const formMsg = document.getElementById("formMsg");

// Summary elements
const balanceEl = document.getElementById("balanceEl");
const incomeEl = document.getElementById("incomeEl");
const expenseEl = document.getElementById("expenseEl");

// Table
const txTbody = document.getElementById("txTbody");
const emptyState = document.getElementById("emptyState");

// Filters
const searchEl = document.getElementById("search");
const monthFilterEl = document.getElementById("monthFilter");
const typeFilterEl = document.getElementById("typeFilter");

const clearAllBtn = document.getElementById("clearAllBtn");

let transactions = loadTransactions();

init();

/* ---------------- INIT ---------------- */

function init() {
  dateEl.value = new Date().toISOString().slice(0, 10);

  rebuildMonthOptions(transactions);
  render();
  updateSummary();

  txForm.addEventListener("submit", onAddTransaction);
  txTbody.addEventListener("click", onTableClick);

  searchEl.addEventListener("input", render);
  monthFilterEl.addEventListener("change", render);
  typeFilterEl.addEventListener("change", render);

  clearAllBtn.addEventListener("click", () => {
    const ok = confirm("Clear all transactions? This will remove saved local data.");
    if (!ok) return;

    transactions = [];
    saveTransactions(transactions);
    rebuildMonthOptions(transactions);
    render();
    updateSummary();
    toast("All data cleared.");
  });
}

/* ---------------- ADD TRANSACTION ---------------- */

function onAddTransaction(e) {
  e.preventDefault();
  formMsg.textContent = "";

  const type = typeEl.value;
  const amount = Number(amountEl.value);
  const category = categoryEl.value.trim();
  const date = dateEl.value;
  const note = noteEl.value.trim();

  if (!date) return toast("Please select a date.");
  if (!Number.isFinite(amount) || amount <= 0) return toast("Enter a valid amount (> 0).");
  if (!category) return toast("Choose a category.");

  const tx = {
    id: cryptoId(),
    type,
    amount: round2(amount),
    category,
    date,
    note
  };

  transactions.unshift(tx);
  saveTransactions(transactions);

  rebuildMonthOptions(transactions);
  txForm.reset();
  typeEl.value = "expense";
  categoryEl.value = "Other";
  dateEl.value = new Date().toISOString().slice(0, 10);

  render();
  updateSummary();
  toast("Transaction added.");
}

/* ---------------- TABLE ACTIONS ---------------- */

function onTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "delete") {
    const ok = confirm("Delete this transaction?");
    if (!ok) return;

    transactions = transactions.filter(t => t.id !== id);
    saveTransactions(transactions);
    rebuildMonthOptions(transactions);
    render();
    updateSummary();
    toast("Deleted.");
  }
}

/* ---------------- RENDER ---------------- */

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const month = monthFilterEl.value;
  const type = typeFilterEl.value;

  const rows = transactions.filter(t => {
    const hay = `${t.category} ${t.note}`.toLowerCase();
    const qOk = !q || hay.includes(q);

    const monthOfTx = t.date.slice(0, 7);
    const mOk = month === "all" || monthOfTx === month;

    const tOk = type === "all" || t.type === type;

    return qOk && mOk && tOk;
  });

  txTbody.innerHTML = rows.map(toRowHtml).join("");
  emptyState.style.display = rows.length === 0 ? "block" : "none";
}

/* ---------------- SUMMARY ---------------- */

function updateSummary() {
  const income = sumByType("income");
  const expense = sumByType("expense");
  const balance = round2(income - expense);

  incomeEl.textContent = formatINR(income);
  expenseEl.textContent = formatINR(expense);
  balanceEl.textContent = formatINR(balance);
}

function sumByType(type) {
  return round2(
    transactions
      .filter(t => t.type === type)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0)
  );
}

/* ---------------- TABLE ROW ---------------- */

function toRowHtml(t) {
  const badgeClass = t.type === "income" ? "income" : "expense";
  const sign = t.type === "income" ? "+" : "-";

  return `
    <tr>
      <td>${escapeHtml(t.date)}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(t.type)}</span></td>
      <td>${escapeHtml(t.category)}</td>
      <td>${escapeHtml(t.note || "")}</td>
      <td class="right">${sign} ${formatINR(t.amount)}</td>
      <td class="right">
        <button class="iconBtn" data-action="delete" data-id="${t.id}">
          Delete
        </button>
      </td>
    </tr>
  `;
}

/* ---------------- STORAGE ---------------- */

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTransactions(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function rebuildMonthOptions(arr) {
  const months = new Set(
    arr.map(t => (t.date || "").slice(0, 7)).filter(Boolean)
  );

  const sorted = Array.from(months).sort().reverse();
  const current = monthFilterEl.value || "all";

  monthFilterEl.innerHTML =
    `<option value="all">All months</option>` +
    sorted.map(m => `<option value="${m}">${m}</option>`).join("");

  if (sorted.includes(current)) {
    monthFilterEl.value = current;
  } else {
    monthFilterEl.value = "all";
  }
}

/* ---------------- UTILITIES ---------------- */

function toast(text) {
  formMsg.textContent = text;
  setTimeout(() => {
    if (formMsg.textContent === text) formMsg.textContent = "";
  }, 2500);
}

function cryptoId() {
  return (
    crypto?.randomUUID?.() ||
    `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function formatINR(n) {
  return Number(n || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR"
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
