import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const EMPTY_FORM = { name: "", recordType: "Certificate", issuer: "", issueDate: "", expiryDate: "" };

export default function MyCertifications() {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadCertifications(); }, []);

  async function loadCertifications() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setCertifications(all.filter((i) =>
        i.metadata?.credentialName || i.metadata?.school || i.metadata?.issuer ||
        i.type === "credential" || i.type === "education" || i.type === "certification"
      ));
    } catch (e) {
      console.error("Failed to load certifications:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: "certification",
          status: "active",
          metadata: {
            credentialName: form.name, recordType: form.recordType, issuer: form.issuer,
            issueDate: form.issueDate, expiryDate: form.expiryDate,
          },
          price: 0, cost: 0,
        },
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setToast("Record added");
      setTimeout(() => setToast(null), 3000);
      setLoading(true);
      await loadCertifications();
    } catch (e) {
      console.error("Failed to create certification:", e);
      setToast("Failed to save — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" };
  const selectStyle = { ...inputStyle, background: "white" };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Student Records & Certifications</h1>
          <p className="subtle">Academic transcripts, degrees, professional licenses, industry certifications, and credentials</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px", background: toast.startsWith("Failed") ? "#fef2f2" : "#f0fdf4", color: toast.startsWith("Failed") ? "#dc2626" : "#16a34a", fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
      ) : certifications.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>Track your education and credentials</div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Academic records, degrees, professional licenses, industry certifications -- keep them all current with expiration tracking and renewal reminders.
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Add Record
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <button onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              + Add Record
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {certifications.map((d) => (
              <div key={d.id} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {d.metadata?.credentialName || d.metadata?.school || d.metadata?.issuer || "Record"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      {d.metadata?.recordType || d.metadata?.program || d.metadata?.issuer || ""}
                      {d.metadata?.issueDate && ` -- Issued ${d.metadata.issueDate}`}
                    </div>
                    {d.metadata?.expiryDate && (
                      <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>Expires: {d.metadata.expiryDate}</div>
                    )}
                  </div>
                  <span className={`badge badge-${d.status || "draft"}`}>{d.status || "Draft"}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Record" onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Save Record"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Name / Title</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., MBA - Harvard, CPA License, Pilot Certificate" style={inputStyle} required /></div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Type</label>
            <select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })} style={selectStyle}>
              <option value="Degree">Degree</option><option value="Certificate">Certificate</option><option value="License">License</option><option value="Professional Certification">Professional Certification</option><option value="Other">Other</option>
            </select>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Issuing Institution (optional)</label><input type="text" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="e.g., Harvard University, State of Illinois" style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Issue Date</label><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Expiry Date</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} style={inputStyle} /></div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
