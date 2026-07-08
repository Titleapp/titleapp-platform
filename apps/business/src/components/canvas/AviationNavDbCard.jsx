/**
 * AviationNavDbCard.jsx — AIRAC nav database currency + download canvas card (#56)
 * Signal: card:aviation-navdb
 * Payload: { cycle?, effective?, expires?, regions?: [{key, label, description}] }
 * Data source: live (fetches /v1/aviation:navdb on mount)
 */

import React, { useEffect, useState } from "react";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  cycleStrip: {
    background: "#0f172a", color: "#f8fafc", borderRadius: 10,
    padding: "12px 14px", marginBottom: 12,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  cycleMain: { display: "flex", flexDirection: "column", gap: 2 },
  cycleLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8", textTransform: "uppercase" },
  cycleValue: { fontSize: 22, fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, monospace" },
  cycleDates: { fontSize: 11, color: "#94a3b8" },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  region: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "1px solid #f1f5f9",
  },
  regionInfo: { flex: 1 },
  regionLabel: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  regionDesc: { fontSize: 11, color: "#64748b", marginTop: 2 },
  downloadBtn: {
    fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20,
    background: "#1e293b", color: "#f8fafc", border: "none", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
  },
  downloadBtnDisabled: {
    background: "#e2e8f0", color: "#94a3b8", cursor: "default",
  },
  loading: { fontSize: 13, color: "#94a3b8", padding: "16px 0", textAlign: "center" },
  error: { fontSize: 12, color: "#dc2626", padding: "8px 0" },
  expiringBadge: { background: "#fefce8", color: "#a16207" },
  currentBadge:  { background: "#dcfce7", color: "#166534" },
  expiredBadge:  { background: "#fef2f2", color: "#dc2626" },
};

const KNOWN_REGIONS = [
  { key: "hawaii",    label: "Hawaii",                description: "PHNL, PHOG, PHKO, PHTO, PHLI" },
  { key: "southwest", label: "Southwest (NV/AZ/UT)",  description: "Las Vegas, Phoenix, Salt Lake" },
  { key: "socal",     label: "Southern California",   description: "LA Basin, San Diego, desert" },
  { key: "norcal",    label: "Northern California",   description: "Bay Area, Sacramento, Sierra" },
  { key: "northeast", label: "Northeast Corridor",    description: "NYC, Boston, Philadelphia, DC" },
  { key: "florida",   label: "Florida",               description: "Miami, Orlando, Tampa, Keys" },
];

function daysRemaining(expiresStr) {
  if (!expiresStr) return null;
  const exp = new Date(expiresStr + "T00:00:00Z").getTime();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.ceil((exp - today.getTime()) / 86400000);
}

function cycleBadge(days) {
  if (days == null) return null;
  if (days <= 0)  return { label: "Expired",   style: S.expiredBadge };
  if (days <= 7)  return { label: `Exp in ${days}d`, style: S.expiringBadge };
  return          { label: "Current",   style: S.currentBadge };
}

export default function AviationNavDbCard({ resolved: _resolved, context: _context, onDismiss }) {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("ID_TOKEN");
    fetch(`${API_BASE}/api?path=/v1/aviation:navdb`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { setManifest(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const cycle = manifest?.currentCycle;
  const cycleData = cycle && manifest?.cycles?.[cycle];
  const effective = cycleData?.effective || "—";
  const expires = cycleData?.expires || "—";
  const days = daysRemaining(expires === "—" ? null : expires);
  const badge = cycleBadge(days);

  function downloadUrl(regionKey) {
    return `${API_BASE}/api?path=/v1/aviation:navdb%3Fregion%3D${regionKey}`;
  }

  function hasPackage(regionKey) {
    return !!(cycleData?.regions?.[regionKey]);
  }

  return (
    <CanvasCardShell
      title="Nav Database"
      emptyPrompt="Regional AIRAC nav databases load here."
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading nav database manifest…</div>}
      {error && <div style={S.error}>Could not load manifest: {error}</div>}
      {!loading && manifest && (
        <>
          <div style={S.cycleStrip}>
            <div style={S.cycleMain}>
              <div style={S.cycleLabel}>Current AIRAC Cycle</div>
              <div style={S.cycleValue}>{cycle || "—"}</div>
              <div style={S.cycleDates}>{effective} → {expires}{days != null ? ` (${days}d remaining)` : ""}</div>
            </div>
            {badge && (
              <span style={{ ...S.badge, ...badge.style }}>{badge.label}</span>
            )}
          </div>

          {KNOWN_REGIONS.map(r => {
            const built = hasPackage(r.key);
            const pkg = cycleData?.regions?.[r.key];
            return (
              <div key={r.key} style={S.region}>
                <div style={S.regionInfo}>
                  <div style={S.regionLabel}>{r.label}</div>
                  <div style={S.regionDesc}>
                    {r.description}
                    {pkg ? ` · ${((pkg.sizeBytes || 0) / 1024 / 1024).toFixed(1)} MB` : ""}
                  </div>
                </div>
                {built ? (
                  <a
                    href={downloadUrl(r.key)}
                    download={`navdb-${cycle}-${r.key}.json`}
                    style={S.downloadBtn}
                    onClick={e => {
                      const token = localStorage.getItem("ID_TOKEN");
                      if (token) {
                        e.preventDefault();
                        fetch(`${API_BASE}/api?path=/v1/aviation:navdb%3Fregion%3D${r.key}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        })
                          .then(res => res.blob())
                          .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url; a.download = `navdb-${cycle}-${r.key}.json`;
                            a.click(); URL.revokeObjectURL(url);
                          })
                          .catch(console.error);
                      }
                    }}
                  >
                    Download
                  </a>
                ) : (
                  <span style={{ ...S.downloadBtn, ...S.downloadBtnDisabled }}>
                    Building…
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </CanvasCardShell>
  );
}
