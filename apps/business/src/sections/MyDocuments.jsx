import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import IDVerifyModal from "../components/IDVerifyModal";
import useIdVerificationGate from "../hooks/useIdVerificationGate";
import * as api from "../api/client";

const EMPTY_FORM = { name: "", category: "Document", description: "", estimatedValue: "", attested: false };

const CATEGORY_ICONS = {
  Jewelry: { color: "#d97706", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> },
  Artwork: { color: "#7c3aed", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="13.5" cy="6.5" r="2.5"></circle><path d="M17.5 10c2 0 3.5 1.5 3.5 3.5S19.5 17 17.5 17c-1 0-1.87-.5-2.5-1.21"></path><path d="M3 19.78C3 16.56 5.56 14 8.78 14H12v3.78C12 20.98 9.98 23 6.78 23 4.56 23 3 21.22 3 19.78z"></path><path d="M12 14v-4"></path><circle cx="12" cy="8" r="2"></circle></svg> },
  Collectible: { color: "#f59e0b", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> },
  "Family Heirloom": { color: "#ec4899", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> },
  Document: { color: "#6366f1", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
  Electronics: { color: "#0ea5e9", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> },
};
const DEFAULT_ICON = { color: "#64748b", icon: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> };

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const { showModal: showIdVerify, gateAction, onVerified: onIdVerified, onClose: onIdClose } = useIdVerificationGate();

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setDocuments(all.filter((i) =>
        (i.type === "document" || i.type === "general" || i.type === "valuable") &&
        (i.metadata?.documentName || i.metadata?.title || i.metadata?.category)
      ));
    } catch (e) {
      console.error("Failed to load documents:", e);
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
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error("Failed to delete:", e);
      setToast("Failed to delete — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    const itemType = form.category === "Document" ? "document" : "valuable";
    gateAction(itemType, { estimatedValue: form.estimatedValue }, doSave);
  }

  async function doSave() {
    setSaving(true);
    try {
      const result = await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: form.category === "Document" ? "document" : "valuable",
          status: "active",
          metadata: {
            documentName: form.name, title: form.name, category: form.category,
            description: form.description, estimatedValue: form.estimatedValue,
          },
          price: 0, cost: 0,
        },
      });
      if (form.attested && result.dtcId) {
        await api.attestInventoryItem({ vertical: "consumer", jurisdiction: "GLOBAL", dtcId: result.dtcId });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setToast("Item added");
      setTimeout(() => setToast(null), 3000);
      setLoading(true);
      await loadDocuments();
    } catch (e) {
      console.error("Failed to create document:", e);
      setToast("Failed to save — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" };
  const selectStyle = { ...inputStyle, background: "white" };

  function getCategoryConfig(cat) {
    return CATEGORY_ICONS[cat] || DEFAULT_ICON;
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Important Stuff</h1>
          <p className="subtle">Documents, jewelry, artwork, personal mementos, and anything valuable you want to protect and track</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px", background: toast.startsWith("Failed") ? "#fef2f2" : "#f0fdf4", color: toast.startsWith("Failed") ? "#dc2626" : "#16a34a", fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>Your important stuff, all in one place</div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Store and manage the things that matter most -- important documents, jewelry, artwork, collectibles, family heirlooms, and anything else you want to keep safe, tracked, and verified.
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Add Item
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <button onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              + Add Item
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {documents.map((d) => {
              const cat = d.metadata?.category || (d.type === "document" ? "Document" : "Other");
              const cfg = getCategoryConfig(cat);
              return (
                <div key={d.id} className="card" style={{ position: "relative", overflow: "hidden" }}>
                  {/* Icon header / image */}
                  <div style={{ height: "100px", background: d.imageUrl ? "none" : `linear-gradient(135deg, ${cfg.color}12 0%, ${cfg.color}06 100%)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    {d.imageUrl ? (
                      <img src={d.imageUrl} alt={d.metadata?.title || "Item"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : cfg.icon(cfg.color)}
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <span style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: `${cfg.color}20`, color: cfg.color }}>
                      {cat}
                    </span>
                  </div>
                  {/* Content */}
                  <div style={{ padding: "14px 20px 4px" }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {d.metadata?.documentName || d.metadata?.title || "Item"}
                    </div>
                    {d.metadata?.estimatedValue && (
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                        Estimated value: ${Number(d.metadata.estimatedValue).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "8px 20px 12px" }}>
                    {d.metadata?.description && (
                      <div style={{ fontSize: "13px", color: "#475569", marginBottom: "6px", lineHeight: "1.5" }}>{d.metadata.description}</div>
                    )}
                    {formatDate(d.createdAt) && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Added</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{formatDate(d.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px" }}>
                    <span className={`badge badge-${d.status || "active"}`} style={{ display: "flex", alignItems: "center" }}>{d.status || "Active"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Item" onSubmit={handleSubmit} submitLabel={saving ? "Saving..." : "Save"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Item Name</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Passport, Grandmother's Ring, Signed Print" style={inputStyle} required /></div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={selectStyle}>
              <option value="Document">Document</option><option value="Jewelry">Jewelry</option><option value="Artwork">Artwork</option><option value="Electronics">Electronics</option><option value="Collectible">Collectible</option><option value="Family Heirloom">Family Heirloom</option><option value="Other">Other</option>
            </select>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Description (optional)</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={inputStyle} /></div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Estimated Value (optional)</label><input type="text" value={form.estimatedValue ? "$" + Number(String(form.estimatedValue).replace(/[$,]/g, "")).toLocaleString() : ""} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value.replace(/[$,]/g, "") })} placeholder="$" style={inputStyle} /></div>
          <div style={{ marginTop: "4px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.attested} onChange={(e) => setForm({ ...form, attested: e.target.checked })} style={{ marginTop: "3px", flexShrink: 0 }} />
              I represent that I am the lawful owner of this item and that the information provided is accurate to the best of my knowledge.
            </label>
          </div>
        </div>
      </FormModal>

      {showIdVerify && <IDVerifyModal onVerified={onIdVerified} onClose={onIdClose} />}
    </div>
  );
}
