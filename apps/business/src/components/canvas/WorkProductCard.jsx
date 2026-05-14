/**
 * WorkProductCard.jsx — Generic canvas card for work products (49.27)
 *
 * Used as the default render target for chat-emitted work products
 * (reports, analyses, summaries) when no domain-specific card exists.
 *
 * Payload shape (from |||CANVAS_RENDER||| marker):
 *   { title, subtitle, summary, fields: [{label, value}], sections: [{heading, body}], items: [string] }
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import OperatorUploadPrompt from "./OperatorUploadPrompt";

const S = {
  subtitle: { fontSize: 12, color: "#64748b", marginTop: -4, marginBottom: 12 },
  summary: { fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 16 },
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  label: { color: "#64748b" },
  value: { fontWeight: 600, color: "#1e293b", textAlign: "right", marginLeft: 12 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  sectionBody: { fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  item: { padding: "6px 0", fontSize: 13, color: "#1e293b", borderBottom: "1px solid #f8fafc" },
};

export default function WorkProductCard({ resolved, context, onDismiss }) {
  const payload = context?.payload || resolved?._payload || {};
  const { title, subtitle, summary, fields, sections, items } = payload;
  const cardTitle = title || resolved?._title || "Work Product";

  const hasContent = !!(summary || (fields && fields.length) || (sections && sections.length) || (items && items.length));

  // When the registry marks this card as acceptsUpload (e.g. aviation Checklists,
  // QRH, Performance, W&B, Aircraft profile), render an upload CTA in place of the
  // passive "Ask Alex…" emptyPrompt. Operators always need their own document on
  // file — the AFM baseline isn't sufficient.
  const acceptsUpload = !!resolved?.acceptsUpload;
  const workerSlug = context?.worker?.slug || context?.workerSlug || null;

  if (!hasContent && acceptsUpload) {
    return (
      <CanvasCardShell title={cardTitle} onDismiss={onDismiss}>
        <OperatorUploadPrompt
          title={resolved?.uploadTitle || "No document uploaded yet."}
          hint={resolved?.uploadHint || "Upload your operator's document so the worker grounds in your version."}
          buttonLabel={resolved?.uploadButton || "Upload document"}
          workerSlug={workerSlug}
          uploadCategory={resolved?.uploadCategory || "operator"}
        />
      </CanvasCardShell>
    );
  }

  return (
    <CanvasCardShell
      title={cardTitle}
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex to generate this report to see it here."}
      onDismiss={onDismiss}
    >
      {hasContent && (
        <>
          {subtitle && <div style={S.subtitle}>{subtitle}</div>}
          {summary && <div style={S.summary}>{summary}</div>}

          {fields && fields.length > 0 && (
            <div>
              {fields.map((f, i) => (
                <div key={i} style={S.row}>
                  <span style={S.label}>{f.label}</span>
                  <span style={S.value}>{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {items && items.length > 0 && (
            <div style={S.section}>
              {items.map((it, i) => (
                <div key={i} style={S.item}>{it}</div>
              ))}
            </div>
          )}

          {sections && sections.length > 0 && sections.map((s, i) => (
            <div key={i} style={S.section}>
              {s.heading && <div style={S.sectionTitle}>{s.heading}</div>}
              {s.body && <div style={S.sectionBody}>{s.body}</div>}
              {Array.isArray(s.fields) && s.fields.length > 0 && (
                <div style={{ marginTop: s.body ? 8 : 0 }}>
                  {s.fields.map((f, j) => (
                    <div key={j} style={S.row}>
                      <span style={S.label}>{f.label}</span>
                      <span style={S.value}>{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </CanvasCardShell>
  );
}
