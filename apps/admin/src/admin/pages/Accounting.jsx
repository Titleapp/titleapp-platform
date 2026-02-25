import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import useAdminAuth from "../hooks/useAdminAuth";

const CATEGORIES = [
  "subscription",
  "usage",
  "marketplace_commission",
  "investment",
  "infrastructure",
  "communications",
  "advertising",
  "tools",
  "payroll",
  "legal",
  "refund",
  "other",
];

function fmtDollars(n) {
  if (n == null) return "$0";
  return "$" + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d) {
  if (!d) return "";
  if (d.toDate) return d.toDate().toLocaleDateString();
  return new Date(d).toLocaleDateString();
}

export default function Accounting() {
  const { user } = useAdminAuth();
  const [tab, setTab] = useState("pnl");
  const [summary, setSummary] = useState({});
  const [ledger, setLedger] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payouts, setPayouts] = useState([]);

  // Real-time summary
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "accounting", "summary"), (snap) => {
      if (snap.exists()) setSummary(snap.data());
    });
    return () => unsub();
  }, []);

  // Ledger entries
  useEffect(() => {
    const q = query(
      collection(db, "ledger"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLedger(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Payments
  useEffect(() => {
    const q = query(
      collection(db, "payments"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Creator payouts
  useEffect(() => {
    const q = query(
      collection(db, "creatorPayouts"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPayouts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function verifyEntry(entryId) {
    await updateDoc(doc(db, "ledger", entryId), {
      verified: true,
      verifiedBy: user?.email || "admin",
      verifiedAt: serverTimestamp(),
    });
  }

  async function recategorize(entryId, newCategory) {
    await updateDoc(doc(db, "ledger", entryId), {
      category: newCategory,
      autoCategorized: false,
      categorizedBy: "admin_manual",
    });
  }

  function exportCSV() {
    const headers = ["Date", "Type", "Category", "Amount", "Description", "Verified"];
    const rows = ledger.map((e) => [
      e.date || "",
      e.type || "",
      e.category || "",
      e.amount || 0,
      (e.description || "").replace(/,/g, ";"),
      e.verified ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titleapp-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rev = summary.revenue || {};
  const exp = summary.expenses || {};
  const net = summary.netIncome || {};

  const burnRate = exp.mtd || 0;
  const cashBalance = summary.cash?.balance || 0;
  const runway = burnRate > 0 ? Math.round(cashBalance / burnRate) : null;

  const tabs = [
    { id: "pnl", label: "P&L" },
    { id: "transactions", label: "Transactions" },
    { id: "revenue", label: "Revenue" },
    { id: "payouts", label: "Creator Payouts" },
  ];

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Billing & Accounting</h1>
        <p className="ac-page-subtitle">Revenue, expenses, and financial management</p>
      </div>

      {/* Cash position cards */}
      <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Revenue MTD</div>
          <div className="ac-metric-value" style={{ color: "#16a34a" }}>
            {fmtDollars(rev.mtd)}
          </div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Expenses MTD</div>
          <div className="ac-metric-value" style={{ color: "#ef4444" }}>
            {fmtDollars(exp.mtd)}
          </div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Net Income MTD</div>
          <div className="ac-metric-value">
            {fmtDollars(net.mtd)}
          </div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Runway</div>
          <div className="ac-metric-value">
            {runway ? `${runway} mo` : "--"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`ac-tab ${tab === t.id ? "ac-tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className="ac-btn ac-btn-sm" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* P&L */}
      {tab === "pnl" && (
        <div className="ac-grid-2">
          <div className="ac-card">
            <div className="ac-card-header">
              <span className="ac-card-title">Revenue by Category</span>
            </div>
            <div className="ac-card-body">
              {Object.entries(rev.byCategory || {}).length === 0 && (
                <div className="ac-empty">No revenue data yet.</div>
              )}
              {Object.entries(rev.byCategory || {}).map(([cat, amt]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f2f8", fontSize: "13px" }}>
                  <span style={{ textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</span>
                  <span style={{ fontWeight: 700, color: "#16a34a" }}>{fmtDollars(amt)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 800, fontSize: "14px" }}>
                <span>Total Revenue (MTD)</span>
                <span>{fmtDollars(rev.mtd)}</span>
              </div>
            </div>
          </div>
          <div className="ac-card">
            <div className="ac-card-header">
              <span className="ac-card-title">Expenses by Category</span>
            </div>
            <div className="ac-card-body">
              {Object.entries(exp.byCategory || {}).length === 0 && (
                <div className="ac-empty">No expense data yet.</div>
              )}
              {Object.entries(exp.byCategory || {}).map(([cat, amt]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f2f8", fontSize: "13px" }}>
                  <span style={{ textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</span>
                  <span style={{ fontWeight: 700, color: "#ef4444" }}>{fmtDollars(amt)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 800, fontSize: "14px" }}>
                <span>Total Expenses (MTD)</span>
                <span>{fmtDollars(exp.mtd)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Log */}
      {tab === "transactions" && (
        <div className="ac-card">
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan="7" className="ac-empty">No ledger entries yet.</td>
                  </tr>
                )}
                {ledger.map((entry) => (
                  <tr
                    key={entry.id}
                    style={!entry.verified ? { background: "rgba(245,158,11,0.04)" } : {}}
                  >
                    <td>{entry.date}</td>
                    <td>{entry.type}</td>
                    <td>
                      <select
                        className="ac-select"
                        value={entry.category}
                        onChange={(e) => recategorize(entry.id, e.target.value)}
                        style={{ fontSize: "12px", padding: "4px 6px" }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontWeight: 700, color: entry.amount >= 0 ? "#16a34a" : "#ef4444" }}>
                      {fmtDollars(entry.amount)}
                    </td>
                    <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.description}
                    </td>
                    <td>
                      {entry.verified ? (
                        <span className="ac-badge ac-badge-success">Verified</span>
                      ) : (
                        <span className="ac-badge ac-badge-warning">Unverified</span>
                      )}
                    </td>
                    <td>
                      {!entry.verified && (
                        <button
                          className="ac-btn ac-btn-sm"
                          onClick={() => verifyEntry(entry.id)}
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue */}
      {tab === "revenue" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Recent Payments</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Stripe ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="ac-empty">No payments yet.</td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.timestamp)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtDollars(p.amount)}</td>
                    <td>
                      <span className={`ac-badge ${p.status === "succeeded" || p.status === "paid" ? "ac-badge-success" : "ac-badge-warning"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.customerId || "--"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "11px" }}>
                      {(p.stripePaymentId || p.stripeInvoiceId || "").slice(0, 20)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creator Payouts */}
      {tab === "payouts" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Creator Payouts</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Destination</th>
                  <th>Transfer ID</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan="4" className="ac-empty">No payouts yet.</td>
                  </tr>
                )}
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.timestamp)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtDollars(p.amount)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "11px" }}>
                      {p.destinationAccount || "--"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "11px" }}>
                      {(p.stripeTransferId || "").slice(0, 20)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
