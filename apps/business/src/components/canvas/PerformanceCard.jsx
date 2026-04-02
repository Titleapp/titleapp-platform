/**
 * PerformanceCard.jsx — Performance review canvas card (44.9)
 * Signal: card:hr-performance
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  row: { padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  name: { fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4 },
  meta: { fontSize: 11, color: "#64748b", marginBottom: 6 },
  ratingBar: { display: "flex", gap: 3, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  dotFilled: { background: "#7c3aed" },
  dotEmpty: { background: "#e5e7eb" },
  notes: { fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.5, fontStyle: "italic" },
};

function RatingDots({ rating, max = 5 }) {
  return (
    <div style={S.ratingBar}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{ ...S.dot, ...(i < rating ? S.dotFilled : S.dotEmpty) }} />
      ))}
      <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>{rating}/{max}</span>
    </div>
  );
}

export default function PerformanceCard({ resolved, context, onDismiss }) {
  const reviews = context?.performanceReviews || null;

  return (
    <CanvasCardShell
      title="Performance Reviews"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex about performance reviews to see details here."}
      onDismiss={onDismiss}
    >
      {reviews && reviews.length > 0 && reviews.map((rev, i) => (
        <div key={i} style={S.row}>
          <div style={S.name}>{rev.employeeName || rev.name}</div>
          <div style={S.meta}>{rev.period || rev.date || ""} {rev.reviewer ? `\u00b7 ${rev.reviewer}` : ""}</div>
          <RatingDots rating={rev.rating || 0} />
          {rev.notes && <div style={S.notes}>{rev.notes}</div>}
        </div>
      ))}
    </CanvasCardShell>
  );
}
