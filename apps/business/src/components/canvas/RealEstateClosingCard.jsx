/**
 * RealEstateClosingCard.jsx — Real estate closing canvas card (44.9)
 * Signal: card:real-estate-closing
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  address: { fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 12 },
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  label: { color: "#64748b" },
  value: { fontWeight: 600, color: "#1e293b" },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  milestone: { display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f8fafc" },
  dot: { width: 10, height: 10, borderRadius: "50%", marginTop: 3, flexShrink: 0 },
  dotDone: { background: "#16a34a" },
  dotPending: { background: "#d1d5db" },
  dotActive: { background: "#7c3aed" },
  msLabel: { fontSize: 13, fontWeight: 500, color: "#1e293b" },
  msDate: { fontSize: 11, color: "#9ca3af" },
};

export default function RealEstateClosingCard({ resolved, context, onDismiss }) {
  const closing = context?.closingData || null;

  return (
    <CanvasCardShell
      title="Closing Status"
      emptyPrompt={resolved?.emptyPrompt || "Ask about your closing to see details here."}
      onDismiss={onDismiss}
    >
      {closing && (
        <>
          {closing.address && <div style={S.address}>{closing.address}</div>}
          {closing.price && (
            <div style={S.row}>
              <span style={S.label}>Purchase Price</span>
              <span style={S.value}>${closing.price.toLocaleString()}</span>
            </div>
          )}
          {closing.closingDate && (
            <div style={S.row}>
              <span style={S.label}>Closing Date</span>
              <span style={S.value}>{closing.closingDate}</span>
            </div>
          )}
          {closing.escrowAgent && (
            <div style={S.row}>
              <span style={S.label}>Escrow Agent</span>
              <span style={S.value}>{closing.escrowAgent}</span>
            </div>
          )}
          {closing.titleCompany && (
            <div style={S.row}>
              <span style={S.label}>Title Company</span>
              <span style={S.value}>{closing.titleCompany}</span>
            </div>
          )}
          {closing.milestones && closing.milestones.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Milestones</div>
              {closing.milestones.map((ms, i) => {
                const dotStyle = ms.status === "done" ? S.dotDone : ms.status === "active" ? S.dotActive : S.dotPending;
                return (
                  <div key={i} style={S.milestone}>
                    <div style={{ ...S.dot, ...dotStyle }} />
                    <div>
                      <div style={S.msLabel}>{ms.label}</div>
                      {ms.date && <div style={S.msDate}>{ms.date}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </CanvasCardShell>
  );
}
