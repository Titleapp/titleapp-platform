import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const EMPTY_FORM = { name: "", category: "Document", description: "", estimatedValue: "" };

export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setDocuments(all.filter((i) =>
        i.type === "document" || i.type === "general" || i.type === "valuable" ||
        (i.metadata?.documentType && !i.metadata?.credentialName && !i.metadata?.school)
      ));
    } catch (e) {
      console.error("Failed to load documents:", e);
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
          type: form.category === "Document" ? "document" : "valuable",
          status: "active",
          metadata: {
            documentName: form.name, title: form.name, category: form.category,
            description: form.description, estimatedValue: form.estimatedValue,
          },
          price: 0, cost: 0,
        },
      });
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
            {documents.map((d) => (
              <div key={d.id} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>{d.metadata?.documentName || d.metadata?.title || "Item"}</div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      {d.metadata?.category || d.metadata?.documentType || ""}
                      {d.metadata?.estimatedValue && ` -- $${Number(d.metadata.estimatedValue).toLocaleString()}`}
                    </div>
                  </div>
                  <span className={`badge badge-${d.status || "draft"}`}>{d.status || "Draft"}</span>
                </div>
                {d.metadata?.description && <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>{d.metadata.description}</div>}
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px" }}>
                  Added {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "recently"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Item" onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Save"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Item Name</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Passport, Grandmother's Ring, Signed Print" style={inputStyle} required /></div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={selectStyle}>
              <option value="Document">Document</option><option value="Jewelry">Jewelry</option><option value="Artwork">Artwork</option><option value="Collectible">Collectible</option><option value="Family Heirloom">Family Heirloom</option><option value="Other">Other</option>
            </select>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Description (optional)</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={inputStyle} /></div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Estimated Value (optional)</label><input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} placeholder="$" style={inputStyle} /></div>
        </div>
      </FormModal>
    </div>
  );
}
