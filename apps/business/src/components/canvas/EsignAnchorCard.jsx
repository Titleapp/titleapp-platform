import React, { useState, useEffect } from "react";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const RAIL_LABEL = {
  "google-esignature": "Google eSignature",
  "dropbox-sign":      "Dropbox Sign",
  "docusign":          "DocuSign",
  "manual":            "Manual confirmation",
};
const RAIL_COLOR = {
  "google-esignature": { bg: "#e8f0fe", text: "#1a73e8", border: "#c5d5fb" },
  "dropbox-sign":      { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "docusign":          { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "manual":            { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
};

function railChip(rail) {
  const r = rail || "manual";
  const c = RAIL_COLOR[r] || RAIL_COLOR.manual;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
      padding: "2px 8px", borderRadius: 999,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {RAIL_LABEL[r] || r}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

function shortHash(hash) {
  if (!hash || !hash.startsWith("sha256:")) return null;
  const h = hash.slice(7);
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function EsignAnchorCard({ resolved, context, onDismiss }) {
  const [records, setRecords] = useState(context?.payload?.records || null);
  const [loading, setLoading] = useState(!context?.payload?.records);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (records) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID") || "sociii-inc";
        const res = await fetch(`${API_BASE}/api?path=/v1/esign:list`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok) setRecords(data.records || []);
        else setError(data?.error || "Failed to load");
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const docs = records || [];

  return (
    <CanvasCardShell title="Signed Documents" onDismiss={onDismiss}>
      {!loading && !error && docs.length > 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16, marginTop: -4 }}>
          {docs.length} anchored document{docs.length !== 1 ? "s" : ""} · SOCIII chain record
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading signed documents…</div>
      )}
      {!loading && error && (
        <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {docs.map((rec, i) => (
              <div key={rec.id || i} style={{
                padding: "14px 16px", borderRadius: 10, background: "#fff",
                border: "1px solid #f1f5f9", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                    {rec.documentTitle || "Untitled document"}
                  </div>
                  {railChip(rec.signingRail)}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                  {rec.completedAt && <span>Signed {fmtDate(rec.completedAt)}</span>}
                  {rec.signerEmail && <span>Signer: {rec.signerEmail}</span>}
                  {Array.isArray(rec.allSigners) && rec.allSigners.length > 1 && (
                    <span>+{rec.allSigners.length - 1} more signer{rec.allSigners.length - 1 !== 1 ? "s" : ""}</span>
                  )}
                  {rec.dtcId && <span>Linked to Vault asset</span>}
                </div>

                {/* Anchor hash — the SOCIII moat */}
                {rec.anchorHash && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 6,
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#15803d", fontFamily: "monospace" }}>
                      {shortHash(rec.anchorHash)}
                    </span>
                    <span style={{ fontSize: 10, color: "#64748b" }}>anchored</span>
                  </div>
                )}

                {rec.documentRef && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", wordBreak: "break-all" }}>
                    Ref: {rec.documentRef.length > 60 ? rec.documentRef.slice(0, 60) + "…" : rec.documentRef}
                  </div>
                )}
              </div>
            ))}
          </div>

          {docs.length === 0 && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>No anchored documents yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
                When you complete a signing in Google eSignature, DocuSign, or any tool, tell Alex — I'll create an immutable SOCIII anchor record tied to your Vault.
              </div>
            </div>
          )}
        </>
      )}
    </CanvasCardShell>
  );
}
