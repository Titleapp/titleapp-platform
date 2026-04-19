/**
 * BusinessAssetCard.jsx — Spine business asset list canvas card (49.1-C)
 * Signal: card:spine-business-assets
 * Data source: GET /v1/workspaces/:id/business-assets (self-loading via useSpineData)
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import useSpineData from "../../hooks/useSpineData";

const TYPE_ICONS = {
  vehicle: "\u{1F697}",
  property: "\u{1F3E0}",
  aircraft: "\u{2708}\uFE0F",
  equipment: "\u{1F527}",
  intellectual_property: "\u{1F4DC}",
  other: "\u{1F4E6}",
};

const S = {
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
    borderBottom: "1px solid var(--canvas-border, #E2E8F0)",
  },
  icon: {
    width: 32, height: 32, borderRadius: 8, background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 600, color: "var(--text-primary, #111827)" },
  type: { fontSize: 11, color: "var(--text-muted, #64748B)", textTransform: "capitalize" },
  value: {
    fontSize: 13, fontWeight: 600, color: "var(--text-primary, #111827)",
    flexShrink: 0, textAlign: "right",
  },
  statusDot: {
    width: "var(--status-dot-size, 8px)", height: "var(--status-dot-size, 8px)",
    borderRadius: "50%", flexShrink: 0, marginLeft: 6,
  },
};

function assetStatus(asset) {
  if (asset.compliance_flags && asset.compliance_flags.length > 0) return "var(--status-red, #DC2626)";
  if (!asset.linked_documents || asset.linked_documents.length === 0) return "var(--status-yellow, #EAB308)";
  return "var(--status-green, #16A34A)";
}

function formatValue(v) {
  if (v == null) return "";
  return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function BusinessAssetCard({ resolved, context, onDismiss }) {
  const { data, loading, error } = useSpineData("/v1/workspaces/{wsId}/business-assets");

  const assets = data || context?.assets || null;

  return (
    <CanvasCardShell
      title="Business Assets"
      loading={loading}
      emptyPrompt={error || resolved?.emptyPrompt || "No assets tracked yet. Tell Alex about something you own."}
      onDismiss={onDismiss}
    >
      {assets && assets.length > 0 && assets.map((a, i) => (
        <div key={a.id || i} style={S.row}>
          <div style={S.icon}>{TYPE_ICONS[a.type] || TYPE_ICONS.other}</div>
          <div style={S.info}>
            <div style={S.name}>{a.name}</div>
            <div style={S.type}>{(a.type || "other").replace(/_/g, " ")}</div>
          </div>
          {a.current_value != null && <div style={S.value}>{formatValue(a.current_value)}</div>}
          <div style={{ ...S.statusDot, background: assetStatus(a) }}
            title={a.compliance_flags?.length ? "Action needed" : a.linked_documents?.length ? "Good" : "Missing docs"} />
        </div>
      ))}
    </CanvasCardShell>
  );
}
