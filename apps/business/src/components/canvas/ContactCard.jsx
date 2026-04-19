/**
 * ContactCard.jsx — Spine contact list canvas card (49.1-C)
 * Signal: card:spine-contacts
 * Data source: GET /v1/workspaces/:id/contacts (self-loading via useSpineData)
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import useSpineData from "../../hooks/useSpineData";

const S = {
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
    borderBottom: "1px solid var(--canvas-border, #E2E8F0)",
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%", background: "#f3e8ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "var(--color-workers, #6B46C1)", flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 600, color: "var(--text-primary, #111827)" },
  type: { fontSize: 11, color: "var(--text-muted, #64748B)" },
  dot: {
    width: "var(--status-dot-size, 8px)", height: "var(--status-dot-size, 8px)",
    borderRadius: "50%", flexShrink: 0,
  },
  verified: { background: "var(--status-green, #16A34A)" },
  unverified: { background: "#d1d5db" },
};

function getInitials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function ContactCard({ resolved, context, onDismiss }) {
  const { data, loading, error } = useSpineData("/v1/workspaces/{wsId}/contacts");

  // Prefer live API data; fall back to conversation context
  const contacts = data || context?.contacts || null;

  return (
    <CanvasCardShell
      title="Contacts"
      loading={loading}
      emptyPrompt={error || resolved?.emptyPrompt || "No contacts yet. Ask Alex to add one."}
      onDismiss={onDismiss}
    >
      {contacts && contacts.length > 0 && contacts.map((c, i) => (
        <div key={c.id || i} style={S.row}>
          <div style={S.avatar}>{getInitials(c.name)}</div>
          <div style={S.info}>
            <div style={S.name}>{c.name}</div>
            <div style={S.type}>{c.type || "contact"}</div>
          </div>
          <div style={{ ...S.dot, ...(c.identity_id ? S.verified : S.unverified) }}
            title={c.identity_id ? "Verified identity" : "Unverified"} />
        </div>
      ))}
    </CanvasCardShell>
  );
}
