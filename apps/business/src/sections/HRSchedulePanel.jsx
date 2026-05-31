/**
 * HRSchedulePanel — HR & People worker's Scheduling tab.
 *
 * S51.43.7 evening expansion (2026-05-30):
 *   • Full CRUD on team members backed by /v1/hr:people:* endpoints
 *   • Storage: tenants/{tid}/teamMembers/{id}
 *   • Bootstrap: Sean (W2) + Kent (1099) on first list of an empty tenant
 *   • Schedule editable inline (debounced save on blur)
 *   • Add team member modal: name + email + role + type + schedule
 *   • Remove (soft-delete) with confirm
 *   • W9 request modal: download IRS W9 with SOCIII requester info + mailto
 *   • W2 modal: explains Payroll worker (PLAT-006) is where W2s actually live
 *   • HR Documents section: canonical forms + signed-doc shelf
 *   • Calendly link for external booking
 *
 * KYC display intentionally absent — user-level KYC schema (verified once,
 * valid 1 year, cross-workspace) lands Sunday in CODEX 51.43.8.
 * See feedback_kyc_user_level_one_year.md.
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const CALENDLY_URL = "https://calendly.com/sean-sociii";
const IRS_W9_URL = "https://www.irs.gov/pub/irs-pdf/fw9.pdf";

const SOCIII_INFO = {
  name: "SOCIII, Inc.",
  address: "1810 E Sahara Avenue, Suite 75942, Las Vegas, NV 89104",
  ein: "42-2675951",
  email: "sean@sociii.ai",
};

async function apiFetch(path, opts = {}) {
  let token = null;
  try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

const S = {
  container: { maxWidth: 960, margin: "0 auto", padding: "32px 28px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  title: { fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 6, marginBottom: 32, lineHeight: 1.5 },
  sectionRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.08em", textTransform: "uppercase" },
  personRow: { display: "flex", flexDirection: "column", gap: 8, padding: "16px 18px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 10 },
  personTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  personMeta: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  personName: { fontSize: 16, fontWeight: 600, color: "#0f172a" },
  personRole: { fontSize: 13, color: "#475569" },
  personTag: { display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: 8 },
  tagW2: { background: "#dbeafe", color: "#1d4ed8" },
  tag1099: { background: "#fef3c7", color: "#a16207" },
  personActions: { display: "flex", gap: 8 },
  btnPrim: { padding: "8px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 },
  btnSec: { padding: "8px 14px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnDanger: { padding: "8px 12px", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnAdd: { padding: "8px 14px", background: "#fff", color: "#7c3aed", border: "1px dashed #c4b5fd", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  scheduleRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" },
  scheduleLabel: { fontWeight: 600, color: "#475569" },
  scheduleInput: { flex: 1, padding: "4px 8px", border: "1px solid transparent", borderRadius: 4, fontSize: 12, color: "#0f172a", background: "transparent", outline: "none" },
  scheduleInputEditing: { border: "1px solid #c4b5fd", background: "#faf5ff" },
  ptoRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 12, color: "#64748b", marginTop: 4 },
  ptoLabel: { fontWeight: 600, color: "#475569", marginRight: 4 },
  ptoChip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 10px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 12, fontSize: 11, fontWeight: 500 },
  ptoChipRemove: { background: "transparent", border: "none", color: "#a16207", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, marginLeft: 2 },
  ptoAdd: { background: "transparent", border: "1px dashed #c4b5fd", color: "#7c3aed", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer" },
  ptoForm: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 10px", background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 8, marginTop: 4 },
  ptoInput: { padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12, color: "#0f172a", outline: "none" },
  callout: { padding: 18, background: "linear-gradient(135deg, #faf5ff 0%, #f0f4ff 100%)", border: "1px solid #ddd6fe", borderRadius: 10, marginTop: 12 },
  calloutTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  calloutText: { fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12 },
  stubCard: { padding: 16, background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 10, marginBottom: 10, fontSize: 13, color: "#64748b" },
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 },
  docRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, gap: 12 },
  docMeta: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  docName: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  docDesc: { fontSize: 12, color: "#64748b" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modalCard: { background: "#fff", borderRadius: 14, padding: 28, maxWidth: 540, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)" },
  modalEyebrow: { color: "#7c3aed", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" },
  modalBody: { fontSize: 14, lineHeight: 1.65, color: "#334155" },
  infoBox: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 13, color: "#475569", marginBottom: 16 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 18, borderTop: "1px solid #e2e8f0", flexWrap: "wrap" },
  formField: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" },
  formInput: { padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, color: "#0f172a", outline: "none" },
  formRadio: { display: "flex", gap: 16, fontSize: 13, color: "#334155" },
  loadingState: { padding: 20, color: "#94a3b8", fontSize: 14, textAlign: "center" },
  errorState: { padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 12 },
};

function ScheduleField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  function commit() {
    if (draft !== value) onSave(draft);
    setEditing(false);
  }
  return (
    <div style={S.scheduleRow}>
      <span style={S.scheduleLabel}>Schedule:</span>
      <input
        style={{ ...S.scheduleInput, ...(editing ? S.scheduleInputEditing : {}) }}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
      />
    </div>
  );
}

function fmtDateShort(iso) {
  if (!iso) return "";
  // "2026-07-18" → "Jul 18, 2026". Locale-stable, server-time-safe.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function fmtDateRange(start, end) {
  if (!start && !end) return "";
  if (start && !end) return fmtDateShort(start);
  if (!start && end) return `until ${fmtDateShort(end)}`;
  // Same year, same month → "Jul 18–25, 2026"
  const ms = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  const me = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end);
  if (ms && me && ms[1] === me[1] && ms[2] === me[2]) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[Number(ms[2]) - 1]} ${Number(ms[3])}–${Number(me[3])}, ${ms[1]}`;
  }
  return `${fmtDateShort(start)} → ${fmtDateShort(end)}`;
}

function TimeOffSection({ person, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const list = Array.isArray(person.timeOff) ? person.timeOff : [];

  function commit() {
    if (!start || !end) { setAdding(false); return; }
    const block = {
      id: `pto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: (label || "Time off").trim(),
      start, end,
    };
    onUpdate(person, { timeOff: [...list, block] });
    setLabel(""); setStart(""); setEnd(""); setAdding(false);
  }

  function remove(id) {
    onUpdate(person, { timeOff: list.filter(b => b.id !== id) });
  }

  return (
    <>
      <div style={S.ptoRow}>
        <span style={S.ptoLabel}>Time off:</span>
        {list.length === 0 && !adding && (
          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>none scheduled</span>
        )}
        {list.map(block => (
          <span key={block.id} style={S.ptoChip}>
            {block.label !== "Time off" ? `${block.label}: ` : ""}
            {fmtDateRange(block.start, block.end)}
            <button style={S.ptoChipRemove} onClick={() => remove(block.id)} title="Remove">×</button>
          </span>
        ))}
        {!adding && (
          <button style={S.ptoAdd} onClick={() => setAdding(true)}>+ Add time off</button>
        )}
      </div>
      {adding && (
        <div style={S.ptoForm}>
          <input
            style={{ ...S.ptoInput, width: 140 }}
            placeholder="Label (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <input
            style={{ ...S.ptoInput, width: 130 }}
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
          />
          <span style={{ color: "#94a3b8" }}>→</span>
          <input
            style={{ ...S.ptoInput, width: 130 }}
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
          />
          <button style={{ ...S.btnPrim, padding: "5px 12px", fontSize: 12 }} onClick={commit} disabled={!start || !end}>Add</button>
          <button style={{ ...S.btnSec, padding: "5px 12px", fontSize: 12 }} onClick={() => { setAdding(false); setLabel(""); setStart(""); setEnd(""); }}>Cancel</button>
        </div>
      )}
    </>
  );
}

function PersonRow({ person, onUpdate, onAction, onRemove }) {
  const tagStyle = person.type === "W2" ? S.tagW2 : S.tag1099;
  const formLabel = person.type === "W2" ? "W2 (year-end)" : "Request W9";
  return (
    <div style={S.personRow}>
      <div style={S.personTop}>
        <div style={S.personMeta}>
          <div>
            <span style={S.personName}>{person.name}</span>
            <span style={{ ...S.personTag, ...tagStyle }}>{person.type}</span>
          </div>
          <div style={S.personRole}>
            {person.role}{person.email ? ` · ${person.email}` : ""}
          </div>
        </div>
        <div style={S.personActions}>
          <button style={S.btnSec} onClick={() => onAction(person, "form")}>{formLabel}</button>
          <button style={S.btnDanger} onClick={() => onRemove(person)} title="Remove">×</button>
        </div>
      </div>
      <ScheduleField
        value={person.schedule || ""}
        onSave={newSched => onUpdate(person, { schedule: newSched })}
      />
      <TimeOffSection person={person} onUpdate={onUpdate} />
    </div>
  );
}

function W9Modal({ person, onClose }) {
  const subject = encodeURIComponent("SOCIII — quick ask: please send your W9");
  const body = encodeURIComponent(
    `Hi ${(person.name || "").split(" ")[0]},\n\nFor tax filing purposes I need a W9 on file for our 1099 work together. The official IRS W9 is at https://www.irs.gov/pub/irs-pdf/fw9.pdf — please fill in your side (name, address, TIN/SSN, signature) and email the completed PDF back to me.\n\nFor the "Requester's name and address" section, here's SOCIII's info:\n\n${SOCIII_INFO.name}\n${SOCIII_INFO.address}\nEIN: ${SOCIII_INFO.ein}\n\nThanks,\nSean\n\n— Sean Combs · Founder, SOCIII Inc. · sean@sociii.ai`
  );
  const mailto = person.email ? `mailto:${person.email}?subject=${subject}&body=${body}` : null;
  return (
    <div onClick={onClose} style={S.modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={S.modalCard}>
        <div style={S.modalEyebrow}>Request W9 from {(person.name || "").split(" ")[0]}</div>
        <h2 style={S.modalTitle}>1099 contractors need a W9 on file</h2>
        <div style={S.modalBody}>
          <p style={{ marginTop: 0 }}>
            For US tax filing, SOCIII Inc. needs each 1099 contractor's W9 (taxpayer ID + signature). The IRS publishes the official form — you'll send the contractor a link + your requester info, and they fill in their side and reply with the completed PDF.
          </p>
          <div style={S.infoBox}>
            <strong>SOCIII info to paste into their "Requester" section:</strong><br />
            {SOCIII_INFO.name}<br />
            {SOCIII_INFO.address}<br />
            EIN: {SOCIII_INFO.ein}
          </div>
          {!person.email && (
            <p style={{ color: "#dc2626", marginBottom: 0 }}>
              ⚠ {person.name} has no email on file. Edit their record to add one, then come back here.
            </p>
          )}
        </div>
        <div style={S.modalActions}>
          <button onClick={onClose} style={S.btnSec}>Close</button>
          <a href={IRS_W9_URL} target="_blank" rel="noopener noreferrer" style={S.btnSec}>Open IRS W9 ↗</a>
          {mailto && (
            <a href={mailto} style={S.btnPrim}>Email {(person.name || "").split(" ")[0]} →</a>
          )}
        </div>
      </div>
    </div>
  );
}

function W2Modal({ person, onClose }) {
  return (
    <div onClick={onClose} style={S.modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={S.modalCard}>
        <div style={S.modalEyebrow}>W2 generation</div>
        <h2 style={S.modalTitle}>W2s come from the Payroll worker</h2>
        <div style={S.modalBody}>
          <p style={{ marginTop: 0 }}>
            W2 forms are generated at year-end from cumulative payroll data (wages, withholdings, deductions, state filings). That requires a Payroll worker integrated with a real payroll provider — Gusto, ADP, or Stripe Issuing for direct deposit.
          </p>
          <p>
            <strong>Status:</strong> Payroll worker is planned as <code>PLAT-006</code>. Until it ships, use an external payroll provider and import the year-end W2 into the Documents section.
          </p>
        </div>
        <div style={S.modalActions}>
          <button onClick={onClose} style={S.btnPrim}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function AddPersonModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState("W2");
  const [schedule, setSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!name.trim()) { setErr("Name is required"); return; }
    setSubmitting(true);
    const res = await onSubmit({ name: name.trim(), email: email.trim(), role: role.trim(), type, schedule: schedule.trim() });
    setSubmitting(false);
    if (res && res.ok) onClose();
    else setErr(res?.error || "Failed to add");
  }

  return (
    <div onClick={onClose} style={S.modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={S.modalCard}>
        <div style={S.modalEyebrow}>Add team member</div>
        <h2 style={S.modalTitle}>New person on the SOCIII roster</h2>
        {err && <div style={S.errorState}>{err}</div>}
        <div style={S.formField}>
          <label style={S.formLabel}>Full name *</label>
          <input style={S.formInput} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" autoFocus />
        </div>
        <div style={S.formField}>
          <label style={S.formLabel}>Email</label>
          <input style={S.formInput} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
        </div>
        <div style={S.formField}>
          <label style={S.formLabel}>Role / Title</label>
          <input style={S.formInput} value={role} onChange={e => setRole(e.target.value)} placeholder="Senior Engineer · Operations Lead · etc." />
        </div>
        <div style={S.formField}>
          <label style={S.formLabel}>Employment type</label>
          <div style={S.formRadio}>
            <label><input type="radio" name="empType" value="W2" checked={type === "W2"} onChange={() => setType("W2")} /> W2 employee</label>
            <label><input type="radio" name="empType" value="1099" checked={type === "1099"} onChange={() => setType("1099")} /> 1099 contractor</label>
          </div>
        </div>
        <div style={S.formField}>
          <label style={S.formLabel}>Schedule (free-text)</label>
          <input style={S.formInput} value={schedule} onChange={e => setSchedule(e.target.value)} placeholder={type === "W2" ? "M-F 9-5 PT" : "Project-based, billable blocks"} />
        </div>
        <div style={S.modalActions}>
          <button onClick={onClose} style={S.btnSec} disabled={submitting}>Cancel</button>
          <button onClick={submit} style={S.btnPrim} disabled={submitting}>{submitting ? "Adding…" : "Add to roster"}</button>
        </div>
      </div>
    </div>
  );
}

const COMMON_FORMS = [
  { id: "policies", name: "SOCIII Policies & Procedures (v1)", desc: "How we work together — humans + digital coworkers. Read this when you join. Liberal, libertarian, short. Acknowledge with your agreement signature.", href: "/sociii-policies.html", cta: "Read policies ↗" },
  { id: "w9",  name: "IRS Form W-9", desc: "Request for Taxpayer Identification Number — every 1099 contractor needs one with SOCIII", href: IRS_W9_URL, cta: "Download from IRS ↗" },
  { id: "w4",  name: "IRS Form W-4", desc: "Employee's Withholding Certificate — required for W2 employees on hire", href: "https://www.irs.gov/pub/irs-pdf/fw4.pdf", cta: "Download from IRS ↗" },
  { id: "i9",  name: "USCIS Form I-9", desc: "Employment Eligibility Verification — required within 3 days of hire for all W2 employees", href: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf", cta: "Download from USCIS ↗" },
];

function readTenantId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "";
}

export default function HRSchedulePanel() {
  // S51.43.7-fix — reactive tenantId so workspace switches refresh the panel.
  // Was: captured once on mount, missed SOCIII switch from incognito sign-in.
  const [tenantId, setTenantId] = useState(readTenantId);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formModalFor, setFormModalFor] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Pick up workspace switches that fire after mount (sidebar click, magic-link
  // landing, OnboardingWizard finish). Also re-poll on tab focus in case
  // localStorage was set by another tab.
  useEffect(() => {
    function syncTid() { setTenantId(readTenantId()); }
    window.addEventListener("ta:workspace-changed", syncTid);
    window.addEventListener("focus", syncTid);
    window.addEventListener("storage", syncTid);
    return () => {
      window.removeEventListener("ta:workspace-changed", syncTid);
      window.removeEventListener("focus", syncTid);
      window.removeEventListener("storage", syncTid);
    };
  }, []);

  const refresh = useCallback(async () => {
    const tid = readTenantId();
    if (!tid) { setError("No tenant context"); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await apiFetch(`/v1/hr:people:list?tenantId=${encodeURIComponent(tid)}`);
      if (data?.ok) {
        setPeople(Array.isArray(data.people) ? data.people : []);
        setError("");
      } else {
        setError(data?.error || "Failed to load people");
      }
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function updatePerson(person, fields) {
    // Optimistic UI; revert on failure
    setPeople(prev => prev.map(p => p.id === person.id ? { ...p, ...fields } : p));
    const res = await apiFetch("/v1/hr:people:update", {
      method: "POST",
      body: JSON.stringify({ tenantId, personId: person.id, ...fields }),
    });
    if (!res?.ok) {
      // revert
      setPeople(prev => prev.map(p => p.id === person.id ? person : p));
      setError(res?.error || "Update failed");
    }
  }

  async function addPerson(fields) {
    const res = await apiFetch("/v1/hr:people:create", {
      method: "POST",
      body: JSON.stringify({ tenantId, ...fields }),
    });
    if (res?.ok) {
      await refresh();
      return { ok: true };
    }
    return { ok: false, error: res?.error || "Create failed" };
  }

  async function removePerson(person) {
    if (!window.confirm(`Remove ${person.name} from the roster? Their record stays archived for reporting; they won't appear in active lists.`)) return;
    setPeople(prev => prev.filter(p => p.id !== person.id));
    const res = await apiFetch("/v1/hr:people:remove", {
      method: "POST",
      body: JSON.stringify({ tenantId, personId: person.id }),
    });
    if (!res?.ok) {
      await refresh(); // revert
      setError(res?.error || "Remove failed");
    }
  }

  function onAction(person, action) {
    if (action === "form") setFormModalFor(person);
  }

  return (
    <div style={S.container}>
      <h1 style={S.title}>Schedule + People</h1>
      <p style={S.subtitle}>
        SOCIII operating cadence — team roster, schedule shape, common tax forms, and Calendly for external booking. Each schedule is editable inline; saves on blur.
      </p>

      <div style={S.sectionRow}>
        <span style={S.sectionTitle}>People · {people.length}</span>
        <button style={S.btnAdd} onClick={() => setAddModalOpen(true)}>+ Add team member</button>
      </div>
      {error && <div style={S.errorState}>{error}</div>}
      {loading ? (
        <div style={S.loadingState}>Loading team…</div>
      ) : people.length === 0 ? (
        <div style={S.stubCard}>No team members yet. Click "+ Add team member" to start.</div>
      ) : (
        people.map(p => (
          <PersonRow
            key={p.id}
            person={p}
            onUpdate={updatePerson}
            onAction={onAction}
            onRemove={removePerson}
          />
        ))
      )}

      <div style={S.sectionRow}>
        <span style={S.sectionTitle}>HR Documents</span>
      </div>
      <div style={{ ...S.hint, marginTop: 0, marginBottom: 12 }}>
        Canonical tax + employment forms. Click any to open the official PDF from the issuing agency. Returned signed copies upload via the Documents tab in the HR worker (Drive sync ships Sunday).
      </div>
      {COMMON_FORMS.map(f => (
        <div key={f.id} style={S.docRow}>
          <div style={S.docMeta}>
            <div style={S.docName}>{f.name}</div>
            <div style={S.docDesc}>{f.desc}</div>
          </div>
          <a href={f.href} target="_blank" rel="noopener noreferrer" style={S.btnSec}>{f.cta}</a>
        </div>
      ))}
      <div style={{ ...S.stubCard, marginTop: 12 }}>
        <strong>Signed-document shelf</strong> — once Kent's bespoke cofounder agreement, advisor agreements, W9s, etc. come back signed (via DBX Sign or email reply), they'll surface here grouped by person. DBX Sign → Drive auto-sync ships Sunday (CODEX 51.43.8).
      </div>

      <div style={S.sectionRow}>
        <span style={S.sectionTitle}>Book time with Sean</span>
      </div>
      <div style={S.callout}>
        <div style={S.calloutTitle}>Calendly · sean@sociii.ai</div>
        <div style={S.calloutText}>
          External advisors, prospective investors, and SOCIII team members can book directly. Default 30-min slot; longer blocks available on request.
        </div>
        <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" style={S.btnPrim}>Open Calendly →</a>
      </div>

      <div style={S.sectionRow}>
        <span style={S.sectionTitle}>Digital Workers on schedule</span>
      </div>
      <div style={S.stubCard}>
        Coming Sunday — view each Digital Worker's cron-style run schedule alongside the human team. Marketing Worker daily posts, Accounting Worker monthly close, Compliance Worker filings, etc.
      </div>

      <div style={S.sectionRow}>
        <span style={S.sectionTitle}>Coming soon</span>
      </div>
      <div style={S.hint}>
        • <strong>Schedule bidding</strong> (airline-pilot-style) — workers post available shifts; team members bid based on preference + seniority + workload balance.
        <br />
        • <strong>Payroll worker (PLAT-006)</strong> — W2 + 1099 generation, state + federal filings, Stripe Issuing for direct deposit.
        <br />
        • <strong>Benefits worker</strong> — health, retirement, equity tracking; differs for W2 vs IC.
        <br />
        • <strong>User-level KYC</strong> — verified once, valid 1 year, cross-workspace (Sunday refactor — CODEX 51.43.8).
      </div>

      {formModalFor && (
        formModalFor.type === "1099"
          ? <W9Modal person={formModalFor} onClose={() => setFormModalFor(null)} />
          : <W2Modal person={formModalFor} onClose={() => setFormModalFor(null)} />
      )}
      {addModalOpen && (
        <AddPersonModal
          onClose={() => setAddModalOpen(false)}
          onSubmit={addPerson}
        />
      )}
    </div>
  );
}
