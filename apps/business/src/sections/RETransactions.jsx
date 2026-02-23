import React, { useState } from "react";

const TODAY = new Date("2026-02-19");

const TRANSACTIONS = [
  {
    id: 1,
    type: "sales",
    address: "1893 San Jose Blvd",
    price: 335000,
    buyer: "Jennifer Kim",
    seller: "Thomas Greene",
    status: "under-contract",
    closingDate: "2026-03-10",
    agent: "David Park",
    escrowAgent: "First American Title",
    lender: "Chase Mortgage",
    milestones: [
      { label: "Contract Executed", date: "2026-02-05", done: true },
      { label: "Earnest Money Deposited", date: "2026-02-07", done: true },
      { label: "Inspection Period", date: "2026-02-19", done: false, deadline: true },
      { label: "Appraisal Ordered", date: "2026-02-12", done: true },
      { label: "Appraisal Received", date: "2026-02-25", done: false },
      { label: "Loan Approval", date: "2026-03-03", done: false },
      { label: "Final Walkthrough", date: "2026-03-08", done: false },
      { label: "Closing", date: "2026-03-10", done: false },
    ],
  },
  {
    id: 2,
    type: "sales",
    address: "9876 Argyle Forest Blvd",
    price: 389000,
    buyer: "Marcus & Diana Reed",
    seller: "Bayshore Properties LLC",
    status: "closing-soon",
    closingDate: "2026-02-28",
    agent: "Sarah Mitchell",
    escrowAgent: "Stewart Title",
    lender: "Wells Fargo",
    milestones: [
      { label: "Contract Executed", date: "2026-01-20", done: true },
      { label: "Earnest Money Deposited", date: "2026-01-22", done: true },
      { label: "Inspection Complete", date: "2026-02-03", done: true },
      { label: "Appraisal Received", date: "2026-02-10", done: true },
      { label: "Loan Approved", date: "2026-02-18", done: true },
      { label: "Final Walkthrough", date: "2026-02-26", done: false },
      { label: "Closing", date: "2026-02-28", done: false, deadline: true },
    ],
  },
  {
    id: 3,
    type: "sales",
    address: "4567 Kernan Blvd #201",
    price: 475000,
    buyer: "Amanda Liu",
    seller: "Oceanview Development",
    status: "offer-submitted",
    closingDate: null,
    agent: "Sarah Mitchell",
    escrowAgent: "TBD",
    lender: "Pre-approved Chase",
    milestones: [
      { label: "Offer Submitted", date: "2026-02-18", done: true },
      { label: "Seller Response Due", date: "2026-02-20", done: false, deadline: true },
    ],
  },
];

const LEASING_TRANSACTIONS = [
  {
    id: 101,
    type: "leasing",
    address: "San Marco TH-1",
    tenant: "James Lopez",
    property: "San Marco Townhomes",
    status: "renewal",
    rent: 1400,
    proposedRent: 1450,
    leaseEnd: "2026-03-15",
    milestones: [
      { label: "Renewal Notice Sent", date: "2026-02-01", done: true },
      { label: "Tenant Response", date: "2026-02-15", done: true },
      { label: "Terms Negotiation", date: "2026-02-20", done: false, deadline: true },
      { label: "New Lease Signed", date: "2026-03-01", done: false },
      { label: "Effective Date", date: "2026-03-15", done: false },
    ],
  },
  {
    id: 102,
    type: "leasing",
    address: "Riverside Apartments 2A",
    tenant: "New Applicant",
    property: "Riverside Apartments",
    status: "application",
    rent: 1300,
    proposedRent: null,
    leaseEnd: null,
    milestones: [
      { label: "Application Received", date: "2026-02-17", done: true },
      { label: "Screening In Progress", date: "2026-02-19", done: false, deadline: true },
      { label: "Approval Decision", date: "2026-02-22", done: false },
      { label: "Lease Signing", date: "2026-02-25", done: false },
      { label: "Move-In", date: "2026-03-01", done: false },
    ],
  },
  {
    id: 103,
    type: "leasing",
    address: "Riverside Apartments 2A",
    tenant: "Kevin Williams",
    property: "Riverside Apartments",
    status: "eviction",
    rent: 1300,
    proposedRent: null,
    leaseEnd: "2026-04-30",
    milestones: [
      { label: "30 Days Past Due", date: "2026-01-20", done: true },
      { label: "3-Day Notice Served", date: "2026-02-14", done: true },
      { label: "Cure Period Expires", date: "2026-02-17", done: true },
      { label: "Filing / Legal", date: "2026-02-22", done: false, deadline: true },
      { label: "Court Date", date: "2026-03-10", done: false },
    ],
  },
  {
    id: 104,
    type: "leasing",
    address: "Beach Cottage D",
    tenant: "Sarah Chen",
    property: "Beach Cottages",
    status: "move-in",
    rent: 1500,
    proposedRent: null,
    leaseEnd: "2027-02-28",
    milestones: [
      { label: "Lease Signed", date: "2026-02-10", done: true },
      { label: "Deposit Received", date: "2026-02-12", done: true },
      { label: "Unit Inspection", date: "2026-02-25", done: false },
      { label: "Move-In", date: "2026-02-28", done: false, deadline: true },
    ],
  },
];

const STATUS_STYLES = {
  "under-contract": { bg: "#dbeafe", color: "#2563eb", label: "Under Contract" },
  "closing-soon": { bg: "#fef3c7", color: "#d97706", label: "Closing Soon" },
  "offer-submitted": { bg: "#f3e8ff", color: "#7c3aed", label: "Offer Submitted" },
};

const LEASING_STATUS_STYLES = {
  "renewal": { bg: "#dbeafe", color: "#2563eb", label: "Renewal" },
  "application": { bg: "#f3e8ff", color: "#7c3aed", label: "Application" },
  "eviction": { bg: "#fee2e2", color: "#dc2626", label: "Eviction" },
  "move-in": { bg: "#dcfce7", color: "#16a34a", label: "Move-In" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const diff = Math.ceil((target - TODAY) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatPrice(n) {
  return "$" + n.toLocaleString();
}

export default function RETransactions() {
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState("all");

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt },
    }));
  }

  // Sales KPIs
  const totalValue = TRANSACTIONS.reduce((s, t) => s + t.price, 0);
  const nearestClosing = TRANSACTIONS
    .filter((t) => t.closingDate)
    .sort((a, b) => new Date(a.closingDate) - new Date(b.closingDate))[0];
  const nearestDays = nearestClosing ? daysUntil(nearestClosing.closingDate) : null;
  const commissionPipeline = Math.round(totalValue * 0.01 * 3);

  // Leasing KPIs
  const totalLeasingActivity = LEASING_TRANSACTIONS.reduce((s, t) => s + t.rent, 0);
  const renewalsDue = LEASING_TRANSACTIONS.filter((t) => t.status === "renewal").length;
  const depositsHeld = LEASING_TRANSACTIONS.filter((t) => t.status === "move-in" || t.status === "application").length;

  // Filter transactions by tab
  const filteredTransactions = tab === "all"
    ? [...TRANSACTIONS, ...LEASING_TRANSACTIONS]
    : tab === "sales"
      ? TRANSACTIONS
      : LEASING_TRANSACTIONS;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Transactions</h1>
          <p className="subtle">Active real estate transactions and closing timelines</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Give me a transaction summary. Which closings need attention and what deadlines are approaching?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Transaction Brief
        </button>
      </div>

      {/* KPI row */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        {tab === "leasing" ? (
          <>
            <div className="card kpiCard">
              <div className="kpiLabel">Leasing Transactions</div>
              <div className="kpiValue">{LEASING_TRANSACTIONS.length}</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Total Leasing Activity</div>
              <div className="kpiValue">{formatPrice(totalLeasingActivity)}/mo</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Renewals Due</div>
              <div className="kpiValue" style={{ color: renewalsDue > 0 ? "#d97706" : "#1e293b" }}>{renewalsDue}</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Deposits Held</div>
              <div className="kpiValue">{depositsHeld}</div>
            </div>
          </>
        ) : tab === "sales" ? (
          <>
            <div className="card kpiCard">
              <div className="kpiLabel">Pending Transactions</div>
              <div className="kpiValue">{TRANSACTIONS.length}</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Total Value</div>
              <div className="kpiValue">$1.2M</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Nearest Closing</div>
              <div className="kpiValue" style={{ color: nearestDays !== null && nearestDays < 7 ? "#dc2626" : "#1e293b" }}>
                Feb 28 — {nearestDays}d
              </div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Commission Pipeline</div>
              <div className="kpiValue" style={{ color: "#16a34a" }}>{formatPrice(commissionPipeline)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="card kpiCard">
              <div className="kpiLabel">All Transactions</div>
              <div className="kpiValue">{TRANSACTIONS.length + LEASING_TRANSACTIONS.length}</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Sales Value</div>
              <div className="kpiValue">$1.2M</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Leasing Activity</div>
              <div className="kpiValue">{formatPrice(totalLeasingActivity)}/mo</div>
            </div>
            <div className="card kpiCard">
              <div className="kpiLabel">Nearest Closing</div>
              <div className="kpiValue" style={{ color: nearestDays !== null && nearestDays < 7 ? "#dc2626" : "#1e293b" }}>
                Feb 28 — {nearestDays}d
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {["all", "sales", "leasing"].map((t) => (
          <button
            key={t}
            className="iconBtn"
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? "#1e293b" : "#f1f5f9",
              color: tab === t ? "white" : "#475569",
              border: "none",
              fontSize: "12px",
              padding: "6px 14px",
            }}
          >
            {t === "all" ? "All" : t === "sales" ? "Sales" : "Leasing"}
          </button>
        ))}
      </div>

      {/* Transaction cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filteredTransactions.map((tx) => {
          const isLeasing = tx.type === "leasing";
          const statusStyle = isLeasing ? LEASING_STATUS_STYLES[tx.status] : STATUS_STYLES[tx.status];
          const isExpanded = expandedId === tx.id;
          const isEviction = isLeasing && tx.status === "eviction";

          if (isLeasing) {
            // Leasing transaction card
            const leaseEndDays = daysUntil(tx.leaseEnd);

            return (
              <div
                key={tx.id}
                className="card"
                style={{
                  padding: "0",
                  cursor: "pointer",
                  overflow: "hidden",
                  borderLeft: isEviction ? "3px solid #dc2626" : "none",
                }}
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                {/* Card header */}
                <div style={{ padding: "16px 20px", borderBottom: isExpanded ? "1px solid #e2e8f0" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "2px" }}>{tx.address}</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>
                        {tx.proposedRent ? (
                          <span>
                            {formatPrice(tx.rent)}
                            <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 400 }}> /mo </span>
                            <span style={{ color: "#16a34a", fontSize: "16px" }}>{formatPrice(tx.proposedRent)}</span>
                            <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 400 }}> proposed</span>
                          </span>
                        ) : (
                          <span>
                            {formatPrice(tx.rent)}
                            <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 400 }}> /mo</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {tx.leaseEnd && (
                        <span style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: leaseEndDays !== null && leaseEndDays < 14 ? "#dc2626" : "#1e293b",
                        }}>
                          {leaseEndDays !== null && leaseEndDays >= 0 ? `${leaseEndDays}d to lease end` : leaseEndDays !== null ? `${Math.abs(leaseEndDays)}d past end` : ""}
                        </span>
                      )}
                      <span style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}>
                        {statusStyle.label}
                      </span>
                    </div>
                  </div>

                  {/* Parties row */}
                  <div style={{ display: "flex", gap: "24px", fontSize: "12px", color: "#64748b", flexWrap: "wrap" }}>
                    <span><strong style={{ color: isEviction ? "#dc2626" : "#475569" }}>Tenant:</strong> {tx.tenant}</span>
                    <span><strong style={{ color: "#475569" }}>Property:</strong> {tx.property}</span>
                    {tx.leaseEnd && <span><strong style={{ color: "#475569" }}>Lease End:</strong> {tx.leaseEnd}</span>}
                  </div>

                  {/* Visual timeline */}
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
                      {/* Track line */}
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "8px",
                        right: "8px",
                        height: "3px",
                        background: "#e2e8f0",
                        transform: "translateY(-50%)",
                        zIndex: 0,
                      }} />
                      {/* Progress fill */}
                      {(() => {
                        const doneCount = tx.milestones.filter((m) => m.done).length;
                        const pct = tx.milestones.length > 1 ? ((doneCount - 1) / (tx.milestones.length - 1)) * 100 : 0;
                        return (
                          <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "8px",
                            width: `calc(${Math.max(0, pct)}% - 16px)`,
                            height: "3px",
                            background: isEviction ? "#dc2626" : "#16a34a",
                            transform: "translateY(-50%)",
                            zIndex: 1,
                            borderRadius: "2px",
                          }} />
                        );
                      })()}
                      {/* Milestone dots */}
                      {tx.milestones.map((ms, i) => {
                        const msDeadlineDays = daysUntil(ms.date);
                        const isUrgent = ms.deadline && !ms.done && msDeadlineDays !== null && msDeadlineDays <= 2;
                        return (
                          <div key={i} style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div
                              title={`${ms.label} — ${ms.date}`}
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                background: ms.done ? (isEviction ? "#dc2626" : "#16a34a") : "white",
                                border: ms.done
                                  ? `2px solid ${isEviction ? "#dc2626" : "#16a34a"}`
                                  : ms.deadline
                                    ? `2px solid ${isUrgent ? "#dc2626" : "#d97706"}`
                                    : "2px solid #cbd5e1",
                                boxShadow: isUrgent ? "0 0 0 3px rgba(220,38,38,0.3)" : "none",
                                animation: isUrgent ? "pulse 1.5s infinite" : "none",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Labels beneath */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", padding: "0 2px" }}>
                      {tx.milestones.map((ms, i) => (
                        <div key={i} style={{
                          fontSize: "9px",
                          color: ms.deadline && !ms.done ? "#d97706" : "#94a3b8",
                          fontWeight: ms.deadline ? 700 : 400,
                          textAlign: "center",
                          width: `${100 / tx.milestones.length}%`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {ms.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded detail view */}
                {isExpanded && (
                  <div style={{ padding: "16px 20px", background: isEviction ? "#fef2f2" : "#f8fafc" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "12px" }}>Milestone Details</div>
                    <div className="tableWrap">
                      <table className="table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Milestone</th>
                            <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Date</th>
                            <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Status</th>
                            <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tx.milestones.map((ms, i) => {
                            const d = daysUntil(ms.date);
                            return (
                              <tr key={i}>
                                <td className="tdStrong" style={{ padding: "6px 10px", fontSize: "12px" }}>{ms.label}</td>
                                <td style={{ padding: "6px 10px", fontSize: "12px", color: "#64748b" }}>{ms.date}</td>
                                <td style={{ padding: "6px 10px" }}>
                                  {ms.done ? (
                                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a" }}>Complete</span>
                                  ) : ms.deadline ? (
                                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: d !== null && d <= 2 ? "#fee2e2" : "#fef3c7", color: d !== null && d <= 2 ? "#dc2626" : "#d97706" }}>Deadline</span>
                                  ) : (
                                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b" }}>Pending</span>
                                  )}
                                </td>
                                <td style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 700, color: d !== null && d < 0 ? "#dc2626" : d !== null && d <= 2 ? "#d97706" : "#64748b" }}>
                                  {ms.done ? "—" : d !== null ? (d === 0 ? "Today" : d > 0 ? `${d}d away` : `${Math.abs(d)}d overdue`) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                      <button
                        className="iconBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openChat(`Check all deadlines for the leasing transaction at ${tx.address}. Tenant: ${tx.tenant}, Property: ${tx.property}, Status: ${tx.status}, Rent: ${formatPrice(tx.rent)}${tx.proposedRent ? `, Proposed: ${formatPrice(tx.proposedRent)}` : ""}. What needs attention right now?`);
                        }}
                        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", fontSize: "12px", padding: "6px 14px" }}
                      >
                        AI: Check deadlines
                      </button>
                      <button
                        className="iconBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openChat(`Prepare a status update for the leasing transaction at ${tx.address}. Tenant: ${tx.tenant}, Property: ${tx.property}, Rent: ${formatPrice(tx.rent)}, Status: ${tx.status}.`);
                        }}
                        style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontSize: "12px", padding: "6px 14px" }}
                      >
                        Generate Status Update
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Sales transaction card (original)
          const closingDays = daysUntil(tx.closingDate);

          return (
            <div
              key={tx.id}
              className="card"
              style={{ padding: "0", cursor: "pointer", overflow: "hidden" }}
              onClick={() => setExpandedId(isExpanded ? null : tx.id)}
            >
              {/* Card header */}
              <div style={{ padding: "16px 20px", borderBottom: isExpanded ? "1px solid #e2e8f0" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "2px" }}>{tx.address}</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{formatPrice(tx.price)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {tx.closingDate && (
                      <span style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: closingDays !== null && closingDays < 7 ? "#dc2626" : "#1e293b",
                      }}>
                        {closingDays}d to close
                      </span>
                    )}
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      background: statusStyle.bg,
                      color: statusStyle.color,
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>
                </div>

                {/* Parties row */}
                <div style={{ display: "flex", gap: "24px", fontSize: "12px", color: "#64748b", flexWrap: "wrap" }}>
                  <span><strong style={{ color: "#475569" }}>Buyer:</strong> {tx.buyer}</span>
                  <span><strong style={{ color: "#475569" }}>Seller:</strong> {tx.seller}</span>
                  <span><strong style={{ color: "#475569" }}>Agent:</strong> {tx.agent}</span>
                  <span><strong style={{ color: "#475569" }}>Escrow:</strong> {tx.escrowAgent}</span>
                  <span><strong style={{ color: "#475569" }}>Lender:</strong> {tx.lender}</span>
                </div>

                {/* Visual timeline */}
                <div style={{ marginTop: "16px" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
                    {/* Track line */}
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "8px",
                      right: "8px",
                      height: "3px",
                      background: "#e2e8f0",
                      transform: "translateY(-50%)",
                      zIndex: 0,
                    }} />
                    {/* Progress fill */}
                    {(() => {
                      const doneCount = tx.milestones.filter((m) => m.done).length;
                      const pct = tx.milestones.length > 1 ? ((doneCount - 1) / (tx.milestones.length - 1)) * 100 : 0;
                      return (
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: "8px",
                          width: `calc(${Math.max(0, pct)}% - 16px)`,
                          height: "3px",
                          background: "#16a34a",
                          transform: "translateY(-50%)",
                          zIndex: 1,
                          borderRadius: "2px",
                        }} />
                      );
                    })()}
                    {/* Milestone dots */}
                    {tx.milestones.map((ms, i) => {
                      const msDeadlineDays = daysUntil(ms.date);
                      const isUrgent = ms.deadline && !ms.done && msDeadlineDays !== null && msDeadlineDays <= 2;
                      return (
                        <div key={i} style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            title={`${ms.label} — ${ms.date}`}
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              background: ms.done ? "#16a34a" : "white",
                              border: ms.done
                                ? "2px solid #16a34a"
                                : ms.deadline
                                  ? `2px solid ${isUrgent ? "#dc2626" : "#d97706"}`
                                  : "2px solid #cbd5e1",
                              boxShadow: isUrgent ? "0 0 0 3px rgba(220,38,38,0.3)" : "none",
                              animation: isUrgent ? "pulse 1.5s infinite" : "none",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* Labels beneath for first, last, and deadline milestones */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", padding: "0 2px" }}>
                    {tx.milestones.map((ms, i) => (
                      <div key={i} style={{
                        fontSize: "9px",
                        color: ms.deadline && !ms.done ? "#d97706" : "#94a3b8",
                        fontWeight: ms.deadline ? 700 : 400,
                        textAlign: "center",
                        width: `${100 / tx.milestones.length}%`,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {ms.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded detail view */}
              {isExpanded && (
                <div style={{ padding: "16px 20px", background: "#f8fafc" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "12px" }}>Milestone Details</div>
                  <div className="tableWrap">
                    <table className="table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Milestone</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Date</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Status</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 10px" }}>Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tx.milestones.map((ms, i) => {
                          const d = daysUntil(ms.date);
                          return (
                            <tr key={i}>
                              <td className="tdStrong" style={{ padding: "6px 10px", fontSize: "12px" }}>{ms.label}</td>
                              <td style={{ padding: "6px 10px", fontSize: "12px", color: "#64748b" }}>{ms.date}</td>
                              <td style={{ padding: "6px 10px" }}>
                                {ms.done ? (
                                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a" }}>Complete</span>
                                ) : ms.deadline ? (
                                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: d !== null && d <= 2 ? "#fee2e2" : "#fef3c7", color: d !== null && d <= 2 ? "#dc2626" : "#d97706" }}>Deadline</span>
                                ) : (
                                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b" }}>Pending</span>
                                )}
                              </td>
                              <td style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 700, color: d !== null && d < 0 ? "#dc2626" : d !== null && d <= 2 ? "#d97706" : "#64748b" }}>
                                {ms.done ? "—" : d !== null ? (d === 0 ? "Today" : d > 0 ? `${d}d away` : `${Math.abs(d)}d overdue`) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <button
                      className="iconBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(`Check all deadlines for the transaction at ${tx.address}. The closing date is ${tx.closingDate || "TBD"}. Buyer: ${tx.buyer}, Seller: ${tx.seller}. What needs attention right now?`);
                      }}
                      style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", fontSize: "12px", padding: "6px 14px" }}
                    >
                      AI: Check deadlines
                    </button>
                    <button
                      className="iconBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(`Prepare a status update for the ${tx.address} transaction. Price: ${formatPrice(tx.price)}, Buyer: ${tx.buyer}, Seller: ${tx.seller}, Agent: ${tx.agent}, Status: ${tx.status}.`);
                      }}
                      style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontSize: "12px", padding: "6px 14px" }}
                    >
                      Generate Status Update
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pulse animation for deadline dots */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>
    </div>
  );
}
