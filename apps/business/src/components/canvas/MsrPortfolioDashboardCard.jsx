/**
 * MsrPortfolioDashboardCard.jsx — CODEX S52.60. Signal: card:msr-portfolio
 * Pattern B (self-fetching, same shape as PLSummaryCard) — AI payload ignored.
 * Portfolio-wide KPI rollup — the compliance officer's default landing view.
 */

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchPortfolio() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) return null;
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/msr:operator:portfolio`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  if (!res.ok) return null;
  return res.json();
}

// 2026-08-21 gap-audit fix — POST helper for "+ Add Loan".
async function addLoan(payload) {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  const res = await fetch(`${API_BASE}/api?path=/v1/msr:operator:loan:add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json;
}

const fmtUsd = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const fmtPct = (n) => `${Math.round((n || 0) * 100)}%`;

const S = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  tile: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", background: "#fff" },
  tileAlert: { border: "1px solid #fde68a", borderRadius: 10, padding: "14px 16px", background: "#fffbeb" },
  label: { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 4 },
  sub: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
  footer: { marginTop: 14, fontSize: 12, color: "#94a3b8" },
};

function Tile({ label, value, sub, alert }) {
  return (
    <div style={alert ? S.tileAlert : S.tile}>
      <div style={S.label}>{label}</div>
      <div style={S.value}>{value}</div>
      {sub && <div style={S.sub}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddLoanModal — 2026-08-21 gap-audit fix. Onboards a NEW loan (operator
// side), distinct from the borrower self-service actions on existing loans
// built earlier the same day. Calls POST /v1/msr:operator:loan:add
// (capability msr.onboard_loan_v1). Visual pattern matches Contacts.jsx's
// ManualAddModal (purple-gradient primary button, white card shell).
// ─────────────────────────────────────────────────────────────────────────
function AddLoanModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ borrowerName: "", propertyAddress: "", upb: "", status: "current", escrowAnnualTotal: "" });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.borrowerName.trim() && form.propertyAddress.trim() && form.upb;

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      const j = await addLoan({
        borrowerName: form.borrowerName.trim(),
        propertyAddress: form.propertyAddress.trim(),
        upb: Number(form.upb),
        status: form.status,
        escrowAnnualTotal: form.escrowAnnualTotal ? Number(form.escrowAnnualTotal) : undefined,
      });
      setStatus({ state: "done", loanId: j.loanId });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Add a loan</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Onboards a new loan into the servicing portfolio. Compliance officer / operator use only.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Borrower name *</label><input style={fieldStyle} value={form.borrowerName} onChange={(e) => set("borrowerName", e.target.value)} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Property address *</label><input style={fieldStyle} value={form.propertyAddress} onChange={(e) => set("propertyAddress", e.target.value)} /></div>
          <div><label style={labelStyle}>UPB ($) *</label><input type="number" style={fieldStyle} value={form.upb} onChange={(e) => set("upb", e.target.value)} placeholder="284500" /></div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={fieldStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="current">Current</option>
              <option value="delinquent">Delinquent</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Escrow annual total ($)</label><input type="number" style={fieldStyle} value={form.escrowAnnualTotal} onChange={(e) => set("escrowAnnualTotal", e.target.value)} placeholder="optional" /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Loan added. Loan ID: {status.loanId}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onAdded} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Adding…" : "Add loan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MsrPortfolioDashboardCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddLoan, setShowAddLoan] = useState(false);

  const reload = () => { setLoading(true); fetchPortfolio().then(d => { setData(d); setLoading(false); }); };

  useEffect(() => {
    let cancelled = false;
    fetchPortfolio().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const hasLoans = !!data?.ok && data.totalLoans > 0;

  return (
    <CanvasCardShell
      title="Portfolio Overview"
      emptyPrompt={resolved?.emptyPrompt || "No loans on file yet."}
      onDismiss={onDismiss}
    >
      {/* 2026-08-21 gap-audit fix — prominent "+ Add Loan" button, matching
          Contacts.jsx's "+ Add Contacts" purple-gradient pattern. Operator-side
          new loan onboarding — distinct from the borrower self-service actions
          on existing loans. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowAddLoan(true)}
          style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          + Add Loan
        </button>
      </div>
      {showAddLoan && (
        <AddLoanModal onClose={() => setShowAddLoan(false)} onAdded={() => { setShowAddLoan(false); reload(); }} />
      )}
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {!loading && !hasLoans && <div style={S.loading}>No loans on file yet.</div>}
      {!loading && hasLoans && (
        <>
          <div style={S.grid}>
            <Tile label="Total UPB" value={fmtUsd(data.totalUpb)} sub={`${data.totalLoans} loans`} />
            <Tile
              label="Delinquency Rate"
              value={fmtPct(data.delinquencyRate)}
              sub={`${data.delinquentLoanCount} of ${data.totalLoans} loans`}
              alert={data.delinquentLoanCount > 0}
            />
            <Tile
              label="Early Intervention"
              value={data.earlyInterventionCount}
              sub="§1024.39(a)/(b)(1) window open"
              alert={data.earlyInterventionCount > 0}
            />
            <Tile
              label="Cease-Communication"
              value={data.ceaseCommunicationCount}
              sub="loans flagged"
              alert={data.ceaseCommunicationCount > 0}
            />
            <Tile
              label="Escrow Shortage"
              value={fmtUsd(data.totalEscrowShortage)}
              sub={`${data.escrowShortageLoanCount} loan(s), avg ${fmtUsd(data.avgEscrowShortage)}`}
              alert={data.escrowShortageLoanCount > 0}
            />
            <Tile
              label="Open NOE / RFI"
              value={data.openNoeRfiCount}
              sub={data.noeRfiPastDueCount > 0 ? `${data.noeRfiPastDueCount} past deadline` : "none past deadline"}
              alert={data.noeRfiPastDueCount > 0}
            />
            <Tile
              label="Open Hardship Requests"
              value={data.openHardshipCount}
              sub="awaiting servicing team review"
            />
            <Tile
              label="Active State Licenses"
              value={data.activeLicenseCount}
              sub={`of ${data.licensedStateCount} on file`}
            />
          </div>
          <div style={S.footer}>
            Every complete application is evaluated for all available options (12 CFR 1024.41(c)(1)) — modification decisions are a servicing team call, not made here.
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
