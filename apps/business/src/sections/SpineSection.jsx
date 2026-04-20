/**
 * SpineSection.jsx — Temporary wrapper for Spine worker sub-nav items (CODEX 49.4)
 *
 * Renders a placeholder page for Spine worker nav items that don't have
 * dedicated section components yet. White bg, centered, max-width 800px.
 * Shows the section label and a prompt to use Alex for that capability.
 */

import React from "react";

const S = {
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "48px 28px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-primary, #111827)",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-muted, #64748B)",
    marginBottom: 32,
    lineHeight: 1.5,
  },
  card: {
    background: "var(--canvas-bg, #F8FAFC)",
    borderRadius: 10,
    padding: 24,
    border: "1px solid var(--canvas-border, #E2E8F0)",
    textAlign: "center",
  },
  cardText: {
    fontSize: 14,
    color: "var(--text-muted, #64748B)",
    lineHeight: 1.6,
  },
};

export default function SpineSection({ label, workerSlug }) {
  return (
    <div style={S.container}>
      <div style={S.title}>{label}</div>
      <div style={S.subtitle}>
        {workerSlug ? `Part of the ${workerSlug} worker` : "Spine worker section"}
      </div>
      <div style={S.card}>
        <div style={S.cardText}>
          This section is connected to your Spine data.<br />
          Ask Alex to help you manage your {label.toLowerCase()}.
        </div>
      </div>
    </div>
  );
}
