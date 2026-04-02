/**
 * AviationCurrencyCard.jsx — Aviation currency status canvas card (44.9)
 * Signal: card:aviation-currency
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  item: { padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  expiry: { fontSize: 12, color: "#64748b" },
  badge: { fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20 },
  current: { background: "#dcfce7", color: "#166534" },
  expiring: { background: "#fefce8", color: "#a16207" },
  expired: { background: "#fef2f2", color: "#dc2626" },
  detail: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
};

function statusBadge(status) {
  if (status === "current") return S.current;
  if (status === "expiring") return S.expiring;
  return S.expired;
}

export default function AviationCurrencyCard({ resolved, context, onDismiss }) {
  const items = context?.currencyItems || null;

  return (
    <CanvasCardShell
      title="Currency Status"
      emptyPrompt={resolved?.emptyPrompt || "Ask about your currency status to see it here."}
      onDismiss={onDismiss}
    >
      {items && items.length > 0 && items.map((item, i) => (
        <div key={i} style={S.item}>
          <div style={S.row}>
            <div>
              <div style={S.label}>{item.name}</div>
              <div style={S.expiry}>{item.expiry ? `Expires: ${item.expiry}` : ""}</div>
            </div>
            <span style={{ ...S.badge, ...statusBadge(item.status || "current") }}>{item.status || "current"}</span>
          </div>
          {item.detail && <div style={S.detail}>{item.detail}</div>}
        </div>
      ))}
    </CanvasCardShell>
  );
}
