import React from "react";

/**
 * BetaNotice — S52.45. Honest, explicit "this worker is in development" warning.
 * Shown in BOTH the chat (top of conversation) and the canvas (top of panel) so
 * the customer always knows the real status. Credibility > polish.
 */
export default function BetaNotice({ compact = false }) {
  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: compact ? "7px 12px" : "9px 14px",
        background: "#FEF3C7", borderBottom: "1px solid #FCD34D",
        color: "#92400E", fontSize: 12, lineHeight: 1.45, flexShrink: 0,
      }}
    >
      <strong style={{ background: "#92400E", color: "#FEF3C7", padding: "1px 6px", borderRadius: 4, fontSize: 10, letterSpacing: 0.5, flexShrink: 0, marginTop: 1 }}>
        BETA
      </strong>
      <span>
        <strong>In development.</strong> This worker partly works and will be glitchy — treat this as a test session, not a production tool. Don't rely on it yet.
      </span>
    </div>
  );
}

/** Small inline BETA pill for headers/cards. */
export function BetaBadge() {
  return (
    <span style={{ background: "#92400E", color: "#FEF3C7", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, verticalAlign: "middle" }}>
      BETA
    </span>
  );
}
