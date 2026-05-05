/**
 * CanvasFallbackView.jsx — Last-resort renderer (49.32) for typed canvas cards
 * when their expected payload shape is missing. Renders whatever common
 * generic keys are present (summary, sections, fields, items, body) so the
 * card never appears completely empty even if the model produced the wrong
 * shape and server-side coercion couldn't translate it.
 */

import React from "react";

const S = {
  summary: { fontSize: 13, color: "var(--text-secondary, #475569)", lineHeight: 1.55, marginBottom: 12 },
  section: { marginBottom: 14 },
  sectionHeading: { fontSize: 12, fontWeight: 700, color: "var(--accent, #7c3aed)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  sectionBody: { fontSize: 13, color: "var(--text-primary, #1e293b)", lineHeight: 1.55, whiteSpace: "pre-wrap" },
  field: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--canvas-border, #f1f5f9)", fontSize: 13 },
  fieldLabel: { color: "var(--text-secondary, #64748b)" },
  fieldValue: { fontWeight: 600, color: "var(--text-primary, #1e293b)" },
  item: { padding: "6px 0", fontSize: 13, color: "var(--text-primary, #1e293b)", borderBottom: "1px solid var(--canvas-border, #f1f5f9)" },
};

export default function CanvasFallbackView({ payload }) {
  if (!payload || typeof payload !== "object") return null;
  const summary = payload.summary || payload.body || null;
  const sections = Array.isArray(payload.sections) ? payload.sections : null;
  const fields = Array.isArray(payload.fields) ? payload.fields : null;
  const items = Array.isArray(payload.items) ? payload.items : null;

  if (!summary && !sections && !fields && !items) return null;

  return (
    <>
      {summary && <div style={S.summary}>{summary}</div>}
      {fields && fields.map((f, i) => (
        <div key={`f-${i}`} style={S.field}>
          <span style={S.fieldLabel}>{f.label}</span>
          <span style={S.fieldValue}>{String(f.value ?? "")}</span>
        </div>
      ))}
      {sections && sections.map((s, i) => (
        <div key={`s-${i}`} style={S.section}>
          <div style={S.sectionHeading}>{s.heading || s.title || `Section ${i + 1}`}</div>
          <div style={S.sectionBody}>{s.body || s.content || ""}</div>
        </div>
      ))}
      {items && items.map((it, i) => (
        <div key={`i-${i}`} style={S.item}>{typeof it === "string" ? it : (it.content || it.title || JSON.stringify(it))}</div>
      ))}
    </>
  );
}
