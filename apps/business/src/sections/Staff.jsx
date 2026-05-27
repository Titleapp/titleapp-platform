import React, { useState, useEffect, useCallback } from "react";
import FormModal from "../components/FormModal";
import useStaff from "../hooks/useStaff";

const PERSON_TYPES = [
  { value: "employee", label: "Employee", color: "#0ea5e9", bg: "#e0f2fe" },
  { value: "advisor",  label: "Advisor",  color: "#7c3aed", bg: "#ede9fe" },
  { value: "vendor",   label: "Vendor",   color: "#16a34a", bg: "#dcfce7" },
];

const ROLE_OPTIONS = [
  { value: "founder",  label: "Founder / Officer" },
  { value: "manager",  label: "Manager" },
  { value: "ic",       label: "Individual Contributor" },
  { value: "admin",    label: "Administrator" },
];

const VESTING_TYPES = [
  { value: "time",      label: "Time-based" },
  { value: "milestone", label: "Milestone-based" },
];

function blankForm(personType = "employee") {
  return {
    personType,
    name: "",
    email: "",
    phone: "",
    notes: "",
    role: "ic",
    permissions: [],
    advisor: { warrantShares: "", equityPct: "", strikePrice: "0.001", vestingMonths: "24", cliffMonths: "6", vestingType: "milestone", milestones: "", successFeeTerms: "", grantDate: "", cofounderTitle: "" },
    vendor:  { scope: "", contractStart: "", contractEnd: "", paymentTerms: "", paymentAmount: "", form1099: true, taxId: "" },
  };
}

export default function Staff() {
  const { loading, list, create, update, remove } = useStaff();
  const [people, setPeople] = useState([]);
  const [activeType, setActiveType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const r = await list();
    if (r?.ok) setPeople(r.staff || []);
  }, [list]);

  useEffect(() => { refresh(); }, [refresh]);

  function openCreate(type = "employee") {
    setEditing(null);
    setForm(blankForm(type));
    setError("");
    setShowCreateModal(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      ...blankForm(p.personType || "employee"),
      ...p,
      advisor: { ...blankForm().advisor, ...(p.advisor || {}) },
      vendor:  { ...blankForm().vendor,  ...(p.vendor  || {}) },
    });
    setError("");
    setShowCreateModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true); setError("");

    const payload = {
      personType: form.personType,
      name: form.name,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
    };
    if (form.personType === "employee") {
      payload.role = form.role;
      payload.permissions = form.permissions;
    } else if (form.personType === "advisor") {
      payload.advisor = {
        warrantShares:   form.advisor.warrantShares   === "" ? null : Number(form.advisor.warrantShares),
        equityPct:       form.advisor.equityPct       === "" ? null : Number(form.advisor.equityPct),
        strikePrice:     form.advisor.strikePrice     === "" ? null : Number(form.advisor.strikePrice),
        vestingMonths:   form.advisor.vestingMonths   === "" ? null : Number(form.advisor.vestingMonths),
        cliffMonths:     form.advisor.cliffMonths     === "" ? null : Number(form.advisor.cliffMonths),
        vestingType:     form.advisor.vestingType,
        milestones:      form.advisor.milestones,
        successFeeTerms: form.advisor.successFeeTerms,
        grantDate:       form.advisor.grantDate || null,
        cofounderTitle:  form.advisor.cofounderTitle || null,
      };
    } else if (form.personType === "vendor") {
      payload.vendor = {
        scope:          form.vendor.scope,
        contractStart:  form.vendor.contractStart || null,
        contractEnd:    form.vendor.contractEnd || null,
        paymentTerms:   form.vendor.paymentTerms,
        paymentAmount:  form.vendor.paymentAmount === "" ? null : Number(form.vendor.paymentAmount),
        form1099:       !!form.vendor.form1099,
        taxId:          form.vendor.taxId,
      };
    }

    const r = editing ? await update(editing.id, payload) : await create(payload);
    setBusy(false);
    if (!r?.ok) { setError(r?.error || "Save failed"); return; }
    setShowCreateModal(false);
    setEditing(null);
    setForm(blankForm());
    await refresh();
  }

  async function handleDelete(id) {
    if (!confirm("Remove this person? This cannot be undone.")) return;
    const r = await remove(id);
    if (r?.ok) {
      if (selected?.id === id) setSelected(null);
      await refresh();
    }
  }

  const filtered = people.filter(p => {
    if (activeType !== "all" && (p.personType || "employee") !== activeType) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name || "").toLowerCase().includes(q)
        || (p.email || "").toLowerCase().includes(q)
        || (p.role  || "").toLowerCase().includes(q);
  });

  const counts = {
    all:      people.length,
    employee: people.filter(p => (p.personType || "employee") === "employee").length,
    advisor:  people.filter(p => p.personType === "advisor").length,
    vendor:   people.filter(p => p.personType === "vendor").length,
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">People</h1>
          <p className="subtle">Employees, advisors, and vendors</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="iconBtn" onClick={() => openCreate("employee")}>+ Employee</button>
          <button className="iconBtn" onClick={() => openCreate("advisor")} style={{ background: "#7c3aed", color: "white", borderColor: "#7c3aed" }}>+ Advisor</button>
          <button className="iconBtn" onClick={() => openCreate("vendor")} style={{ background: "#16a34a", color: "white", borderColor: "#16a34a" }}>+ Vendor</button>
        </div>
      </div>

      {/* Type tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { value: "all", label: "All", color: "#475569" },
          ...PERSON_TYPES,
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${activeType === t.value ? (t.color || "#7c3aed") : "#e2e8f0"}`,
              background: activeType === t.value ? (t.bg || "#ede9fe") : "white",
              color: activeType === t.value ? (t.color || "#7c3aed") : "#475569",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[t.value]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: "100%", maxWidth: 500, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line)", fontSize: 14 }}
        />
      </div>

      {/* Alex always-present row */}
      <div className="card" style={{ marginBottom: 12, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>AI</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Alex</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Chief of Staff &middot; Always-on team member</div>
            </div>
          </div>
          <span style={{ padding: "2px 10px", background: "#ede9fe", color: "#7c3aed", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>AI</span>
        </div>
      </div>

      {loading && <div className="card"><div className="empty">Loading…</div></div>}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <div className="empty" style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {searchQuery ? "No matches." : (activeType === "all" ? "No people yet." : `No ${activeType}s yet.`)}
            </div>
            {!searchQuery && (
              <div style={{ fontSize: 14, color: "#64748b" }}>
                Add an employee, advisor, or vendor to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "2fr 1fr" : "1fr", gap: 16 }}>
          <div className="card">
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Role / Scope</th>
                    <th>Key terms</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const type = PERSON_TYPES.find(t => t.value === (p.personType || "employee")) || PERSON_TYPES[0];
                    const keyTerms = (() => {
                      if (p.personType === "advisor") {
                        const a = p.advisor || {};
                        const parts = [];
                        if (a.warrantShares) parts.push(`${Number(a.warrantShares).toLocaleString()} sh`);
                        else if (a.equityPct) parts.push(`${a.equityPct}%`);
                        if (a.vestingMonths) parts.push(`${a.vestingMonths}mo vest`);
                        if (a.vestingType === "milestone") parts.push("milestone");
                        return parts.join(" · ") || "—";
                      }
                      if (p.personType === "vendor") {
                        const v = p.vendor || {};
                        return v.paymentTerms || (v.paymentAmount ? `$${Number(v.paymentAmount).toLocaleString()}` : "—");
                      }
                      return p.role || "—";
                    })();
                    return (
                      <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: "pointer", background: selected?.id === p.id ? "#f8fafc" : "transparent" }}>
                        <td>
                          <div className="tdStrong">{p.name}</div>
                          <div className="tdMuted">{p.email}</div>
                        </td>
                        <td>
                          <span style={{ padding: "2px 10px", background: type.bg, color: type.color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{type.label}</span>
                        </td>
                        <td className="tdMuted">{p.personType === "vendor" ? (p.vendor?.scope || "—") : (ROLE_OPTIONS.find(r => r.value === p.role)?.label || p.role || "—")}</td>
                        <td className="tdMuted" style={{ fontSize: 13 }}>{keyTerms}</td>
                        <td>{p.status === "active" ? <span className="badge badge-completed">Active</span> : <span className="badge">Inactive</span>}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="iconBtn" onClick={e => { e.stopPropagation(); openEdit(p); }}>Edit</button>
                            <button className="iconBtn" onClick={e => { e.stopPropagation(); handleDelete(p.id); }} style={{ color: "#ef4444" }}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selected && <DetailPanel person={selected} onClose={() => setSelected(null)} />}
        </div>
      )}

      <FormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditing(null); setError(""); }}
        title={editing ? `Edit ${form.personType}` : `Add ${form.personType}`}
        onSubmit={handleSubmit}
        submitLabel={busy ? "Saving…" : (editing ? "Save Changes" : "Add")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13 }}>{error}</div>}

          <Field label="Person type *">
            <select value={form.personType} onChange={e => setForm({ ...form, personType: e.target.value })} style={selectStyle}>
              {PERSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Full name *">
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
          </Field>
          <Field label="Email *">
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} required />
          </Field>
          <Field label="Phone">
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          </Field>

          {form.personType === "employee" && (
            <Field label="Role">
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={selectStyle}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          )}

          {form.personType === "advisor" && (
            <>
              <div style={{ padding: "10px 12px", background: "#faf5ff", borderRadius: 8, fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>Advisor equity terms</div>
              <Field label="External cofounder title (optional)">
                <input type="text" placeholder='e.g. "Cofounder"' value={form.advisor.cofounderTitle} onChange={e => setForm({ ...form, advisor: { ...form.advisor, cofounderTitle: e.target.value } })} style={inputStyle} />
              </Field>
              <Row>
                <Field label="Warrant shares">
                  <input type="number" value={form.advisor.warrantShares} onChange={e => setForm({ ...form, advisor: { ...form.advisor, warrantShares: e.target.value } })} style={inputStyle} placeholder="e.g. 100000" />
                </Field>
                <Field label="OR equity %">
                  <input type="number" step="0.01" value={form.advisor.equityPct} onChange={e => setForm({ ...form, advisor: { ...form.advisor, equityPct: e.target.value } })} style={inputStyle} placeholder="e.g. 0.5" />
                </Field>
              </Row>
              <Row>
                <Field label="Strike price">
                  <input type="number" step="0.001" value={form.advisor.strikePrice} onChange={e => setForm({ ...form, advisor: { ...form.advisor, strikePrice: e.target.value } })} style={inputStyle} placeholder="0.001" />
                </Field>
                <Field label="Vesting type">
                  <select value={form.advisor.vestingType} onChange={e => setForm({ ...form, advisor: { ...form.advisor, vestingType: e.target.value } })} style={selectStyle}>
                    {VESTING_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </Field>
              </Row>
              <Row>
                <Field label="Vesting months">
                  <input type="number" value={form.advisor.vestingMonths} onChange={e => setForm({ ...form, advisor: { ...form.advisor, vestingMonths: e.target.value } })} style={inputStyle} placeholder="24" />
                </Field>
                <Field label="Cliff months">
                  <input type="number" value={form.advisor.cliffMonths} onChange={e => setForm({ ...form, advisor: { ...form.advisor, cliffMonths: e.target.value } })} style={inputStyle} placeholder="6" />
                </Field>
              </Row>
              <Field label="Milestones (if milestone-vested)">
                <textarea value={form.advisor.milestones} onChange={e => setForm({ ...form, advisor: { ...form.advisor, milestones: e.target.value } })} style={{ ...inputStyle, minHeight: 60 }} placeholder='e.g. "20% on closing $500k; 30% on first $1M ARR; 50% on Series A"' />
              </Field>
              <Field label="Success fee terms (optional)">
                <input type="text" value={form.advisor.successFeeTerms} onChange={e => setForm({ ...form, advisor: { ...form.advisor, successFeeTerms: e.target.value } })} style={inputStyle} placeholder='e.g. "5% on capital sourced"' />
              </Field>
              <Field label="Grant date">
                <input type="date" value={form.advisor.grantDate} onChange={e => setForm({ ...form, advisor: { ...form.advisor, grantDate: e.target.value } })} style={inputStyle} />
              </Field>
            </>
          )}

          {form.personType === "vendor" && (
            <>
              <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Contractor / vendor terms</div>
              <Field label="Scope of work *">
                <textarea value={form.vendor.scope} onChange={e => setForm({ ...form, vendor: { ...form.vendor, scope: e.target.value } })} style={{ ...inputStyle, minHeight: 60 }} placeholder='e.g. "Brand design — logo, identity, launch collateral"' />
              </Field>
              <Row>
                <Field label="Contract start">
                  <input type="date" value={form.vendor.contractStart} onChange={e => setForm({ ...form, vendor: { ...form.vendor, contractStart: e.target.value } })} style={inputStyle} />
                </Field>
                <Field label="Contract end">
                  <input type="date" value={form.vendor.contractEnd} onChange={e => setForm({ ...form, vendor: { ...form.vendor, contractEnd: e.target.value } })} style={inputStyle} />
                </Field>
              </Row>
              <Row>
                <Field label="Payment terms">
                  <input type="text" value={form.vendor.paymentTerms} onChange={e => setForm({ ...form, vendor: { ...form.vendor, paymentTerms: e.target.value } })} style={inputStyle} placeholder='e.g. "Net 30" or "$5K/mo retainer"' />
                </Field>
                <Field label="Payment amount ($)">
                  <input type="number" value={form.vendor.paymentAmount} onChange={e => setForm({ ...form, vendor: { ...form.vendor, paymentAmount: e.target.value } })} style={inputStyle} />
                </Field>
              </Row>
              <Field label="">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={form.vendor.form1099} onChange={e => setForm({ ...form, vendor: { ...form.vendor, form1099: e.target.checked } })} />
                  <span>Issues 1099 (US contractor)</span>
                </label>
              </Field>
              <Field label="Tax ID (EIN or SSN — sensitive)">
                <input type="text" value={form.vendor.taxId} onChange={e => setForm({ ...form, vendor: { ...form.vendor, taxId: e.target.value } })} style={inputStyle} placeholder="Collected separately for 1099 filing" />
              </Field>
            </>
          )}

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />
          </Field>
        </div>
      </FormModal>
    </div>
  );
}

function DetailPanel({ person, onClose }) {
  const type = PERSON_TYPES.find(t => t.value === (person.personType || "employee")) || PERSON_TYPES[0];
  return (
    <div className="card">
      <div className="cardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="cardTitle">{person.name}</div>
          <div className="cardSub">{person.email}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ padding: "2px 10px", background: type.bg, color: type.color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{type.label}</span>
          </div>
        </div>
        <button className="iconBtn" onClick={onClose}>×</button>
      </div>

      {person.personType === "advisor" && person.advisor && (
        <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Equity terms</div>
          <KV label="Title">{person.advisor.cofounderTitle || "Advisor"}</KV>
          <KV label="Warrant shares">{person.advisor.warrantShares ? Number(person.advisor.warrantShares).toLocaleString() : "—"}</KV>
          <KV label="Equity %">{person.advisor.equityPct ? `${person.advisor.equityPct}%` : "—"}</KV>
          <KV label="Strike">${person.advisor.strikePrice ?? "—"}</KV>
          <KV label="Vesting">{person.advisor.vestingType} · {person.advisor.vestingMonths ?? "—"} mo, {person.advisor.cliffMonths ?? "—"} mo cliff</KV>
          {person.advisor.milestones && <KV label="Milestones">{person.advisor.milestones}</KV>}
          {person.advisor.successFeeTerms && <KV label="Success fee">{person.advisor.successFeeTerms}</KV>}
          {person.advisor.grantDate && <KV label="Grant date">{person.advisor.grantDate}</KV>}
        </div>
      )}

      {person.personType === "vendor" && person.vendor && (
        <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Contract</div>
          {person.vendor.scope && <KV label="Scope">{person.vendor.scope}</KV>}
          {person.vendor.paymentTerms && <KV label="Terms">{person.vendor.paymentTerms}</KV>}
          {person.vendor.paymentAmount != null && <KV label="Amount">${Number(person.vendor.paymentAmount).toLocaleString()}</KV>}
          {(person.vendor.contractStart || person.vendor.contractEnd) && <KV label="Period">{person.vendor.contractStart || "?"} → {person.vendor.contractEnd || "open"}</KV>}
          <KV label="1099">{person.vendor.form1099 ? "Yes" : "No"}</KV>
        </div>
      )}

      {(person.personType === "employee" || !person.personType) && (
        <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
          <KV label="Role">{ROLE_OPTIONS.find(r => r.value === person.role)?.label || person.role || "—"}</KV>
          {person.phone && <KV label="Phone">{person.phone}</KV>}
        </div>
      )}

      {person.notes && (
        <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 13, color: "#475569", whiteSpace: "pre-wrap" }}>{person.notes}</div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      {label && <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13 }}>{label}</label>}
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

function KV({ label, children }) {
  return (
    <div style={{ display: "flex", marginBottom: 8, fontSize: 13 }}>
      <div style={{ flex: "0 0 110px", color: "#64748b" }}>{label}</div>
      <div style={{ flex: 1, color: "#1e293b" }}>{children}</div>
    </div>
  );
}

const inputStyle  = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 14, boxSizing: "border-box" };
const selectStyle = { ...inputStyle, background: "white" };
