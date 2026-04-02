/**
 * PLSummaryCard.jsx — P&L Summary canvas card (44.9)
 * Signal: card:accounting-pl
 * Data source: conversation context (populated as Alex provides data)
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  label: { color: "#64748b" },
  value: { fontWeight: 600, color: "#1e293b" },
  total: { fontWeight: 700, color: "#111827", fontSize: 15 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
};

export default function PLSummaryCard({ resolved, context, onDismiss }) {
  const data = context?.plData || null;

  return (
    <CanvasCardShell
      title="P&L Summary"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex about your P&L to see it here."}
      onDismiss={onDismiss}
    >
      {data && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Revenue</div>
            {(data.revenue || []).map((item, i) => (
              <div key={i} style={S.row}>
                <span style={S.label}>{item.label}</span>
                <span style={S.value}>${(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
              <span style={S.total}>Total Revenue</span>
              <span style={S.total}>${(data.totalRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
          <div style={S.section}>
            <div style={S.sectionTitle}>Expenses</div>
            {(data.expenses || []).map((item, i) => (
              <div key={i} style={S.row}>
                <span style={S.label}>{item.label}</span>
                <span style={{ ...S.value, color: "#dc2626" }}>-${(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
              <span style={S.total}>Total Expenses</span>
              <span style={{ ...S.total, color: "#dc2626" }}>-${(data.totalExpenses || 0).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ ...S.row, borderBottom: "none", paddingTop: 12 }}>
            <span style={{ ...S.total, fontSize: 16 }}>Net Income</span>
            <span style={{ ...S.total, fontSize: 16, color: (data.netIncome || 0) >= 0 ? "#16a34a" : "#dc2626" }}>
              ${(data.netIncome || 0).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
