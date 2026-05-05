/**
 * CashFlowStatementCard.jsx — Cash Flow Statement canvas card
 * Signal: card:accounting-cashflow
 * Data source: conversation context (AI-pushed)
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
  period: { fontSize: 12, color: "#94a3b8", marginBottom: 12 },
};

function fmt(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString()}`;
}

function renderItems(items) {
  return (items || []).map((item, i) => {
    const amt = Number(item.amount) || 0;
    return (
      <div key={i} style={S.row}>
        <span style={S.label}>{item.label}</span>
        <span style={{ ...S.value, color: amt < 0 ? "#dc2626" : "#1e293b" }}>{fmt(amt)}</span>
      </div>
    );
  });
}

function sumItems(items) {
  return (items || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
}

export default function CashFlowStatementCard({ resolved, context, onDismiss }) {
  const data = context?.payload?.cashFlow || context?.payload || null;

  const operating = data?.operating || [];
  const investing = data?.investing || [];
  const financing = data?.financing || [];

  const netOperating = data?.netOperating ?? sumItems(operating);
  const netInvesting = data?.netInvesting ?? sumItems(investing);
  const netFinancing = data?.netFinancing ?? sumItems(financing);

  const netChange = data?.netChange ?? (netOperating + netInvesting + netFinancing);
  const beginningCash = Number(data?.beginningCash) || 0;
  const endingCash = data?.endingCash ?? (beginningCash + netChange);

  return (
    <CanvasCardShell
      title="Cash Flow Statement"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex for a cash flow statement to see it here."}
      onDismiss={onDismiss}
    >
      {data && (
        <>
          {data.period && <div style={S.period}>Period: {data.period}</div>}

          {operating.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Operating Activities</div>
              {renderItems(operating)}
              <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
                <span style={S.total}>Net Cash from Operations</span>
                <span style={{ ...S.total, color: netOperating >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(netOperating)}</span>
              </div>
            </div>
          )}

          {investing.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Investing Activities</div>
              {renderItems(investing)}
              <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
                <span style={S.total}>Net Cash from Investing</span>
                <span style={{ ...S.total, color: netInvesting >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(netInvesting)}</span>
              </div>
            </div>
          )}

          {financing.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Financing Activities</div>
              {renderItems(financing)}
              <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
                <span style={S.total}>Net Cash from Financing</span>
                <span style={{ ...S.total, color: netFinancing >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(netFinancing)}</span>
              </div>
            </div>
          )}

          <div style={{ ...S.row, paddingTop: 12 }}>
            <span style={S.total}>Net Change in Cash</span>
            <span style={{ ...S.total, color: netChange >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(netChange)}</span>
          </div>
          {beginningCash !== 0 && (
            <div style={S.row}>
              <span style={S.label}>Beginning Cash</span>
              <span style={S.value}>{fmt(beginningCash)}</span>
            </div>
          )}
          <div style={{ ...S.row, borderBottom: "none", paddingTop: 6 }}>
            <span style={{ ...S.total, fontSize: 16 }}>Ending Cash</span>
            <span style={{ ...S.total, fontSize: 16, color: endingCash >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(endingCash)}</span>
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
