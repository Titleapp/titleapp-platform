import React, { useState } from "react";
import { useBusinessDtcCatalog, useBusinessTransactions } from "../data/useDtcCatalog";

/**
 * BusinessVaultDTCs — CODEX S52.53, restructured S52.53b (Sean, 2026-08-20).
 *
 * The business-workspace counterpart to VaultDTCs (personal Four Pillars).
 *
 * S52.53b reverses part of S52.53's scope call: Sean's explicit ask, live in
 * the demo/title workspace, was FOLDER>FILE organization matching how a
 * title company actually works — a case file per account, not a flat pile of
 * cards. So the Vault is now two top-level groups:
 *   - Team: shared, non-transactional company stuff (license, insurance,
 *     lease, operating/escrow accounts) — what S52.53 called "Company
 *     Records".
 *   - Transactions: one folder per matter (title order today), named
 *     "{order code} — {address}", newest-first, holding that matter's linked
 *     Drive files. Proof-of-existence / blockchain records live at this
 *     level too, following the case file, not scattered separately.
 * This is the first step toward Vault and Drive becoming one folder tree
 * instead of two separate concepts, per the pattern that generalizes to
 * every vertical (per-patient for vet, per-property for real estate,
 * per-aircraft/flight-log for aviation) — only title is wired up so far.
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

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_LABEL = {
  search_complete: "Search complete",
  commitment_issued: "Commitment issued",
  exam_in_progress: "Exam in progress",
  closed: "Closed",
};

function TransactionFolder({ order }) {
  const [open, setOpen] = useState(false);
  const docCount = (order.documents || []).length;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#7c3aed" style={{ flexShrink: 0 }}>
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{order.folderLabel}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {STATUS_LABEL[order.status] || order.status || "Open"}
            {order.defectCount > 0 ? ` · ${order.defectCount} open defect${order.defectCount === 1 ? "" : "s"}` : ""}
            {" · "}{docCount} document{docCount === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 20px 18px", background: "#fafbfc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14, fontSize: 12 }}>
            {order.buyerName && <div><span style={{ color: "#94a3b8" }}>Buyer </span><strong style={{ color: "#1e293b" }}>{order.buyerName}</strong></div>}
            {order.sellerName && <div><span style={{ color: "#94a3b8" }}>Seller </span><strong style={{ color: "#1e293b" }}>{order.sellerName}</strong></div>}
            {order.purchasePrice != null && <div><span style={{ color: "#94a3b8" }}>Price </span><strong style={{ color: "#1e293b" }}>{fmtUsdPlain(order.purchasePrice / 100)}</strong></div>}
            {order.lender && <div><span style={{ color: "#94a3b8" }}>Lender </span><strong style={{ color: "#1e293b" }}>{order.lender}</strong></div>}
            {order.targetCloseDate && <div><span style={{ color: "#94a3b8" }}>Target close </span><strong style={{ color: "#1e293b" }}>{order.targetCloseDate}</strong></div>}
          </div>
          {order.defectNote && (
            <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
              {order.defectNote}
            </div>
          )}
          {docCount === 0 ? (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>No documents attached to this matter yet.</div>
          ) : (
            <div>
              {(order.documents || []).map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(f.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BusinessVaultDTCs() {
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || null;
  const { dtcs, loading, error } = useBusinessDtcCatalog(tenantId);
  const { transactions, loading: txLoading, error: txError } = useBusinessTransactions(tenantId);

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
          A case file for every matter, plus the company records and funds held in trust behind them.
        </p>
      </div>

      {(loading || txLoading) && <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading…</div>}
      {!loading && error && (
        <div style={{ padding: 24, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", marginBottom: 16 }}>{error}</div>
      )}
      {!txLoading && txError && (
        <div style={{ padding: 24, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", marginBottom: 16 }}>{txError}</div>
      )}

      {!loading && !txLoading && (
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

          {/* ── Transactions — one case-file folder per matter, newest first ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionTitle sub="One case file per account — every closing's documents and proof-of-existence records live here, together.">
              Transactions
            </SectionTitle>
            {transactions.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12 }}>No open or closed matters yet.</div>
            ) : (
              transactions.map((order) => <TransactionFolder key={order.id} order={order} />)
            )}
          </div>

          {/* ── Team — shared, non-transactional company records ── */}
          <div>
            <SectionTitle sub="Shared company records — license, insurance, lease, operating accounts. Admin-only in intent; full role enforcement not yet built (single demo persona today).">Team</SectionTitle>
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
