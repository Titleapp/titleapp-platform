/**
 * TransactionCard.jsx — Spine transaction list canvas card (49.1-C)
 * Signal: card:spine-transactions
 * Data source: GET /v1/workspaces/:id/transactions (self-loading via useSpineData)
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import useSpineData from "../../hooks/useSpineData";

const S = {
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
    borderBottom: "1px solid var(--canvas-border, #E2E8F0)",
  },
  arrow: {
    width: "var(--status-arrow-size, 14px)", height: "var(--status-arrow-size, 14px)",
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  desc: { fontSize: 13, fontWeight: 600, color: "var(--text-primary, #111827)" },
  meta: { fontSize: 11, color: "var(--text-muted, #64748B)" },
  amount: { fontSize: 13, fontWeight: 700, flexShrink: 0, textAlign: "right" },
  income: { color: "var(--status-green, #16A34A)" },
  expense: { color: "var(--status-red, #DC2626)" },
  transfer: { color: "var(--status-blue, #3B82F6)" },
  status: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, flexShrink: 0 },
  cleared: { background: "#dcfce7", color: "#166534" },
  pending: { background: "#fefce8", color: "#a16207" },
  reconciled: { background: "#eff6ff", color: "#1d4ed8" },
};

function ArrowIcon({ direction }) {
  if (direction === "income") {
    return (
      <svg style={S.arrow} viewBox="0 0 14 14" fill="none">
        <path d="M7 11V3M7 3L3 7M7 3l4 4" stroke="var(--status-green, #16A34A)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (direction === "expense") {
    return (
      <svg style={S.arrow} viewBox="0 0 14 14" fill="none">
        <path d="M7 3v8M7 11l-4-4M7 11l4-4" stroke="var(--status-red, #DC2626)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg style={S.arrow} viewBox="0 0 14 14" fill="none">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="var(--status-blue, #3B82F6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatAmount(amount, direction) {
  const prefix = direction === "income" ? "+" : direction === "expense" ? "-" : "";
  return prefix + "$" + Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "";
  const date = d._seconds ? new Date(d._seconds * 1000) : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusStyle(status) {
  if (status === "cleared") return S.cleared;
  if (status === "reconciled") return S.reconciled;
  return S.pending;
}

export default function TransactionCard({ resolved, context, onDismiss }) {
  const { data, loading, error } = useSpineData("/v1/workspaces/{wsId}/transactions");

  const transactions = data || context?.transactions || null;

  return (
    <CanvasCardShell
      title="Transactions"
      loading={loading}
      emptyPrompt={error || resolved?.emptyPrompt || "No transactions yet. Tell Alex about income or expenses."}
      onDismiss={onDismiss}
    >
      {transactions && transactions.length > 0 && transactions.map((tx, i) => (
        <div key={tx.id || i} style={S.row}>
          <ArrowIcon direction={tx.direction} />
          <div style={S.info}>
            <div style={S.desc}>{tx.description || tx.category || "Transaction"}</div>
            <div style={S.meta}>
              {tx.category && <span>{tx.category}</span>}
              {tx.category && tx.date && <span> · </span>}
              {tx.date && <span>{formatDate(tx.date)}</span>}
            </div>
          </div>
          <div style={{ ...S.amount, ...(S[tx.direction] || S.transfer) }}>
            {formatAmount(tx.amount, tx.direction)}
          </div>
          <span style={{ ...S.status, ...statusStyle(tx.status) }}>{tx.status || "pending"}</span>
        </div>
      ))}
    </CanvasCardShell>
  );
}
