import React, { useState, useMemo } from "react";
import { useDtcCatalog, ASSET_CLASSES } from "../data/useDtcCatalog";

/**
 * VaultDTCs — CODEX 50.13 Layer C.
 *
 * Renders Digital Title Certificates from the Firestore `dtcs` collection
 * via `/v1/dtc:list`. Six-class asset taxonomy (Real Property, Vehicles,
 * Personal Assets, Credentials, Business Records, Compliance). Per-DTC
 * cards show type, primary metadata, chain anchor status badge, and
 * logbook entry count. v1 ships flat-list; detail panel + Logbook
 * append UI are v1.1 polish.
 *
 * This is the first frontend caller of /v1/dtc:list — before this, DTCs
 * existed in the backend but had no UI surface. Drive (storageObjects,
 * formerly mislabeled as "Vault") and Vault (DTCs) are now peer top-level
 * destinations rather than the same surface confusing two distinct stores.
 */

function chainBadge(dtc) {
  const status = dtc.chain_anchor_status || "hash_only";
  const map = {
    hash_only:       { label: "Hash anchored",   bg: "#dcfce7", color: "#15803d" },
    chain_pending:   { label: "Chain pending",   bg: "#fef3c7", color: "#92400e" },
    chain_confirmed: { label: "Chain confirmed", bg: "#ddd6fe", color: "#5b21b6" },
    chain_failed:    { label: "Chain failed",    bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.hash_only;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 999, background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

function metadataPreview(dtc) {
  const m = dtc.metadata || {};
  const lines = [];
  // Pick up to 3 informative lines based on type.
  if (dtc.type === "vehicle") {
    if (m.year || m.make || m.model) lines.push([m.year, m.make, m.model].filter(Boolean).join(" "));
    if (m.vin) lines.push(`VIN: ${m.vin}`);
    if (m.licensePlate) lines.push(`Plate: ${m.licensePlate}`);
  } else if (dtc.type === "property") {
    if (m.address) lines.push(m.address);
    if (m.parcelId) lines.push(`Parcel: ${m.parcelId}`);
    if (m.county) lines.push(m.county);
  } else if (dtc.type === "credential") {
    if (m.credentialName) lines.push(m.credentialName);
    if (m.issuer) lines.push(`Issuer: ${m.issuer}`);
    if (m.expirationDate) lines.push(`Expires: ${m.expirationDate}`);
  } else {
    // Generic: show top-level keys.
    Object.entries(m).slice(0, 3).forEach(([k, v]) => {
      if (typeof v !== "object") lines.push(`${k}: ${v}`);
    });
  }
  return lines.slice(0, 3);
}

export default function VaultDTCs() {
  const { dtcs, loading, error } = useDtcCatalog();
  const [activeClass, setActiveClass] = useState("All");

  const counts = useMemo(() => {
    const c = { All: dtcs.length };
    for (const cls of ASSET_CLASSES) c[cls] = 0;
    for (const d of dtcs) c[d.assetClass] = (c[d.assetClass] || 0) + 1;
    return c;
  }, [dtcs]);

  const filtered = activeClass === "All" ? dtcs : dtcs.filter(d => d.assetClass === activeClass);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>
          Vault
        </h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          Tamper-evident records — Digital Title Certificates with cryptographic provenance.
        </p>
      </div>

      {/* Asset-class filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {["All", ...ASSET_CLASSES].map((cls) => {
          const active = activeClass === cls;
          const n = counts[cls] || 0;
          return (
            <button
              key={cls}
              onClick={() => setActiveClass(cls)}
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                borderRadius: 9999,
                border: active ? "1px solid #1e293b" : "1px solid #cbd5e1",
                background: active ? "#1e293b" : "#fff",
                color: active ? "#fff" : "#1e293b",
                cursor: "pointer", transition: "all 0.15s ease",
                opacity: cls === "All" || n > 0 ? 1 : 0.4,
              }}
            >
              {cls}{cls !== "All" && n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading…</div>
      )}

      {!loading && error && (
        <div style={{ padding: 24, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b" }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
            No records yet
          </div>
          <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
            Vault holds your Digital Title Certificates — vehicles, property, credentials, and
            business records. Records minted via your workers will appear here automatically.
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}>
          {filtered.map((dtc) => {
            const lines = metadataPreview(dtc);
            return (
              <div
                key={dtc.id}
                style={{
                  background: "#fff", borderRadius: 12,
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  padding: 20, display: "flex", flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    {dtc.assetClass}
                  </div>
                  {chainBadge(dtc)}
                </div>

                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                  {dtc.metadata?.title || dtc.metadata?.name || dtc.type || "Record"}
                </div>

                {lines.length > 0 && (
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>
                    {lines.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#94a3b8" }}>
                  <span>{dtc.logbookCount || 0} logbook {dtc.logbookCount === 1 ? "entry" : "entries"}</span>
                  <code style={{ fontSize: 10 }}>{(dtc.id || "").slice(0, 8)}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
