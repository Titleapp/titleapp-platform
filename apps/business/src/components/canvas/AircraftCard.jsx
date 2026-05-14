/**
 * AircraftCard.jsx — Aircraft profile canvas card for aviation CoPilots.
 *
 * Renders aircraft type, tail, key specs. Designed to also display a
 * type-class photo (Wikipedia Commons CC licensing) in v2; for v1 the
 * card shows clean tabular spec data only.
 *
 * Sean's call 2026-05-12: aviation is "point 1 to point 2" — every aviation
 * worker should open with a Map AND show what aircraft is involved.
 */

import React from "react";

export default function AircraftCard({ resolved = {}, context = {}, onDismiss }) {
  // Read payload (fixture-loaded by tab-click handler) first, fall back to
  // resolved (chat-emitted CANVAS_RENDER). Same pattern as MapCard fix 2026-05-13.
  const payload = context?.payload || {};
  const title    = payload.title    || resolved?.title    || "Aircraft profile";
  const subtitle = payload.subtitle || resolved?.subtitle;
  const fields   = payload.fields   || resolved?.fields   || [];
  const image    = payload.image    || resolved?.image;
  const sections = payload.sections || resolved?.sections || [];

  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Aircraft
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1, padding: 4 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      {image && image.url && (
        <div style={{ background: "#0f172a", padding: "16px", display: "flex", justifyContent: "center" }}>
          <img
            src={image.url}
            alt={image.alt || title}
            style={{ maxHeight: 220, maxWidth: "100%", objectFit: "contain" }}
          />
          {image.attribution && (
            <div style={{ fontSize: 10, color: "#94a3b8", position: "absolute", bottom: 4, right: 8 }}>
              {image.attribution}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "16px" }}>
        {fields.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.label || i} style={{ borderBottom: i < fields.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "8px 0", color: "#64748b", width: "40%" }}>{f.label}</td>
                  <td style={{ padding: "8px 0", color: "#0f172a", fontWeight: 500, textAlign: "right" }}>{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {sections.length > 0 && sections.map((s, i) => (
          <div key={i} style={{ marginTop: i === 0 && fields.length === 0 ? 0 : 18 }}>
            {s.heading && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                {s.heading}
              </div>
            )}
            {Array.isArray(s.fields) && s.fields.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {s.fields.map((f, j) => (
                    <tr key={f.label || j} style={{ borderBottom: j < s.fields.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "6px 0", color: "#64748b", width: "45%" }}>{f.label}</td>
                      <td style={{ padding: "6px 0", color: "#0f172a", fontWeight: 500, textAlign: "right" }}>{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {s.body && !Array.isArray(s.fields) && (
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.body}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
