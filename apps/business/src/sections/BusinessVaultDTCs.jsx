import React from "react";
import { useBusinessDtcCatalog } from "../data/useDtcCatalog";

/**
 * BusinessVaultDTCs — CODEX S52.53.
 *
 * The business-workspace counterpart to VaultDTCs (personal Four Pillars).
 * Narrow scope, corrected after Sean reviewed the first version live: this
 * is entity-level company records + funds held in trust — NOT open matters.
 * Open title orders belong to the real production workflow (RE Title
 * Search / RE Escrow), not the Vault; the Vault's job is the static stuff
 * a company owns and is accountable for, not live transactional work.
 *
 * Read-side access is NOT fully built here — the write path already has a
 * role gate (workspace_role:admin, in vaultWriter.js), but there is no role
 * check on these reads yet. This demo has exactly one persona (Sarah,
 * admin), so there's nothing to test a narrower role against yet. Treat the
 * "admin-only" labeling below as documentation of intent, not an enforced
 * permission — flagged as a real gap, not glossed over.
 */

// titleOrders store money in cents (purchasePrice: 285_000_00); DTCS'
// valueUsd is a plain dollar number (valueUsd: 847_200) — kept here in case
// a future company-record type needs cents formatting; only fmtUsdPlain is
// used today since Company Records/Client Trust are both plain-dollar DTCs.
function fmtUsdPlain(dollars) {
  if (dollars == null) return "—";
  return "$" + Math.round(dollars).toLocaleString();
}

const SectionTitle = ({ children, sub }) => (
  <div style={{ margin: "4px 0 10px" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{children}</div>
    {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
  </div>
);

function isEscrowTrustAccount(dtc) {
  const t = (dtc.title || "").toLowerCase();
  return dtc.type === "bank_account" && (t.includes("escrow") || t.includes("trust"));
}

export default function BusinessVaultDTCs() {
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || null;
  const { dtcs, loading, error } = useBusinessDtcCatalog(tenantId);

  if (!tenantId || tenantId === "vault" || tenantId === "personal") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>No business workspace active</div>
        <div style={{ fontSize: 13 }}>Switch to a business persona to see its Vault.</div>
      </div>
    );
  }

  const trustAccounts = dtcs.filter(isEscrowTrustAccount);
  const companyRecords = dtcs.filter((d) => !isEscrowTrustAccount(d));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>Company Vault</h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          Company records and funds held in trust — not personal asset pillars, and not open matters.
        </p>
      </div>

      {loading && <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading…</div>}
      {!loading && error && (
        <div style={{ padding: 24, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", marginBottom: 16 }}>{error}</div>
      )}

      {!loading && (
        <>
          {/* ── Client Trust — always first, always separate, never summed into anything ── */}
          {trustAccounts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionTitle sub="Funds held for others — not a company asset. Kept separate per Texas escrow/trust account rules (TDI Basic Manual Section V).">
                Client Trust
              </SectionTitle>
              {trustAccounts.map((d) => (
                <div key={d.id} style={{
                  background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
                  padding: "16px 20px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>{d.title}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#92400e" }}>{fmtUsdPlain(d.valueUsd)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#a16207", marginTop: 4 }}>{d.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Company Records — entity-level assets ── */}
          <div>
            <SectionTitle sub="Admin-only in intent — full role enforcement not yet built (single demo persona today).">Company Records</SectionTitle>
            {companyRecords.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12 }}>No company records.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {companyRecords.map((d) => (
                  <div key={d.id} style={{
                    background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9",
                    borderTop: "3px solid #0891b2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "16px 20px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0891b2", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{d.assetClass}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{d.title}</div>
                    {d.valueUsd != null && <div style={{ fontSize: 20, fontWeight: 800, color: "#0891b2", marginBottom: 6 }}>{fmtUsdPlain(d.valueUsd)}</div>}
                    <div style={{ fontSize: 12, color: "#64748b" }}>{d.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
