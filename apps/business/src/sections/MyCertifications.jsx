import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const EMPTY_FORM = { name: "", recordType: "Certificate", issuer: "", issueDate: "", expiryDate: "", attested: false };

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
        (i.metadata?.credentialName || i.metadata?.school || i.metadata?.issuer ||
        i.type === "credential" || i.type === "education" || i.type === "certification") &&
        (i.metadata?.credentialName || i.metadata?.title || i.metadata?.school || i.metadata?.issuer)
      ));
    } catch (e) {
      console.error("Failed to load certifications:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await api.deleteInventoryItem({ vertical: "consumer", jurisdiction: "GLOBAL", id });
      setToast("Record deleted");
      setTimeout(() => setToast(null), 3000);
      setCertifications((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Failed to delete:", e);
      setToast("Failed to delete — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      const result = await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: "certification",
          status: "active",
          metadata: {
            credentialName: form.name, title: form.name, recordType: form.recordType, issuer: form.issuer,
            issueDate: form.issueDate, expiryDate: form.expiryDate,
          },
          price: 0, cost: 0,
        },
      });
      if (form.attested && result.dtcId) {
        await api.attestInventoryItem({ vertical: "consumer", jurisdiction: "GLOBAL", dtcId: result.dtcId });
      }
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

  function isExpiringSoon(dateStr) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }

  function isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

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
            {certifications.map((d) => {
              const expired = isExpired(d.metadata?.expiryDate);
              const expiring = isExpiringSoon(d.metadata?.expiryDate);
              const badgeColor = expired ? "#dc2626" : expiring ? "#f59e0b" : "#d97706";
              return (
                <div key={d.id} className="card" style={{ position: "relative", overflow: "hidden" }}>
                  {/* Icon header / image */}
                  <div style={{ height: "100px", background: d.imageUrl ? "none" : `linear-gradient(135deg, ${badgeColor}12 0%, ${badgeColor}06 100%)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    {d.imageUrl ? (
                      <img src={d.imageUrl} alt={d.metadata?.title || "Certification"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={badgeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                        <circle cx="12" cy="8" r="7"></circle>
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                      </svg>
                    )}
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <span style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: `${badgeColor}20`, color: badgeColor }}>
                      {d.metadata?.recordType || "Certification"}
                    </span>
                  </div>
                  {/* Content */}
                  <div style={{ padding: "14px 20px 4px" }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {d.metadata?.credentialName || d.metadata?.title || d.metadata?.school || "Record"}
                    </div>
                    {d.metadata?.issuer && (
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{d.metadata.issuer}</div>
                    )}
                  </div>
                  <div style={{ padding: "8px 20px 12px" }}>
                    {d.metadata?.issueDate && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Issued</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{d.metadata.issueDate}</span>
                      </div>
                    )}
                    {d.metadata?.expiryDate && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Expires</span>
                        <span style={{ fontWeight: 500, color: expired ? "#dc2626" : expiring ? "#f59e0b" : "#1e293b" }}>
                          {d.metadata.expiryDate}{expired ? " (Expired)" : expiring ? " (Expiring soon)" : ""}
                        </span>
                      </div>
                    )}
                    {formatDate(d.createdAt) && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Added</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{formatDate(d.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px" }}>
                    <span className={`badge badge-${expired ? "expired" : d.status || "active"}`} style={{ display: "flex", alignItems: "center" }}>{expired ? "Expired" : d.status || "Active"}</span>
                  </div>
                </div>
              );
            })}
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
          <div style={{ marginTop: "4px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.attested} onChange={(e) => setForm({ ...form, attested: e.target.checked })} style={{ marginTop: "3px", flexShrink: 0 }} />
              I represent that I hold this credential and that the information provided is accurate to the best of my knowledge.
            </label>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
