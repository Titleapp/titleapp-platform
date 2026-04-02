/**
 * InvoiceListCard.jsx — Invoice list canvas card (44.9)
 * Signal: card:accounting-invoice
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  row: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13,
  },
  left: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, color: "#1e293b", marginBottom: 2 },
  date: { fontSize: 11, color: "#9ca3af" },
  amount: { fontWeight: 700, color: "#1e293b", fontSize: 14, flexShrink: 0 },
  badge: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, marginLeft: 8, flexShrink: 0 },
  paid: { background: "#dcfce7", color: "#166534" },
  overdue: { background: "#fef2f2", color: "#dc2626" },
  pending: { background: "#fefce8", color: "#a16207" },
};

function statusStyle(status) {
  if (status === "paid") return S.paid;
  if (status === "overdue") return S.overdue;
  return S.pending;
}

export default function InvoiceListCard({ resolved, context, onDismiss }) {
  const invoices = context?.invoices || null;

  return (
    <CanvasCardShell
      title="Invoices"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex about your invoices to see them here."}
      onDismiss={onDismiss}
    >
      {invoices && invoices.length > 0 && invoices.map((inv, i) => (
        <div key={i} style={S.row}>
          <div style={S.left}>
            <div style={S.name}>{inv.client || inv.name || `Invoice #${inv.number || i + 1}`}</div>
            <div style={S.date}>{inv.date || ""}</div>
          </div>
          <span style={S.amount}>${(inv.amount || 0).toLocaleString()}</span>
          <span style={{ ...S.badge, ...statusStyle(inv.status) }}>{inv.status || "pending"}</span>
        </div>
      ))}
    </CanvasCardShell>
  );
}
