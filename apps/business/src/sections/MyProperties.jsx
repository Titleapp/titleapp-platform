import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const EMPTY_FORM = { address: "", ownershipType: "Own", propertyType: "House", monthlyPayment: "", company: "", endDate: "" };

export default function MyProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadProperties(); }, []);

  async function loadProperties() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setProperties(all.filter((i) => i.metadata?.address || i.metadata?.propertyType));
    } catch (e) {
      console.error("Failed to load properties:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.address) return;
    setSaving(true);
    try {
      await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: "property",
          status: "active",
          metadata: {
            address: form.address, ownershipType: form.ownershipType, propertyType: form.propertyType,
            monthlyPayment: form.monthlyPayment, company: form.company, endDate: form.endDate,
          },
          price: 0, cost: 0,
        },
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setToast("Property added");
      setTimeout(() => setToast(null), 3000);
      setLoading(true);
      await loadProperties();
    } catch (e) {
      console.error("Failed to create property:", e);
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
          <h1 className="h1">My Properties</h1>
          <p className="subtle">Your verified property records</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px", background: toast.startsWith("Failed") ? "#fef2f2" : "#f0fdf4", color: toast.startsWith("Failed") ? "#dc2626" : "#16a34a", fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>Add your first property</div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Keep track of deeds, leases, mortgage info, tax records, and insurance for every property -- owned or rented. Everything verified and in one place.
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Add Property
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <button onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              + Add Property
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {properties.map((p) => (
              <div key={p.id} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>{p.metadata?.address || "Unnamed Property"}</div>
                    {p.metadata?.propertyType && <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{p.metadata.propertyType} {p.metadata?.ownershipType ? `-- ${p.metadata.ownershipType}` : ""}</div>}
                  </div>
                  <span className={`badge badge-${p.status || "draft"}`}>{p.status || "Draft"}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px" }}>
                  Added {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "recently"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Property" onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Save Property"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Property Name / Address</label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Chicago, IL" style={inputStyle} required /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Ownership</label>
              <select value={form.ownershipType} onChange={(e) => setForm({ ...form, ownershipType: e.target.value })} style={selectStyle}>
                <option value="Own">Own</option><option value="Rent">Rent</option><option value="Lease">Lease</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Property Type</label>
              <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} style={selectStyle}>
                <option value="House">House</option><option value="Apartment">Apartment</option><option value="Condo">Condo</option><option value="Commercial">Commercial</option><option value="Land">Land</option><option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Monthly Payment (optional)</label><input type="number" value={form.monthlyPayment} onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })} placeholder="$" style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Lease/Mortgage End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Landlord / Mortgage Company (optional)</label><input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={inputStyle} /></div>
        </div>
      </FormModal>
    </div>
  );
}
