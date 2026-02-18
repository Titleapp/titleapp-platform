import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const EMPTY_FORM = { address: "", address2: "", city: "", state: "", zip: "", ownershipType: "Own", propertyType: "House", monthlyPayment: "", company: "", endDate: "", term: "", interestRate: "" };

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtPayment(val) {
  if (!val) return "";
  return "$" + Number(String(val).replace(/[$,]/g, "")).toLocaleString();
}

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
      setProperties(all.filter((i) => (i.type === "property" || i.metadata?.address || i.metadata?.propertyType) && (i.metadata?.title || i.metadata?.address)));
    } catch (e) {
      console.error("Failed to load properties:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this property record?")) return;
    try {
      await api.deleteInventoryItem({ vertical: "consumer", jurisdiction: "GLOBAL", id });
      setToast("Record deleted");
      setTimeout(() => setToast(null), 3000);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("Failed to delete:", e);
      setToast("Failed to delete — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.address) return;
    setSaving(true);
    try {
      const fullAddress = [form.address, form.address2, form.city, form.state, form.zip].filter(Boolean).join(", ");
      await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: "property",
          status: "active",
          metadata: {
            title: fullAddress || form.address,
            address: fullAddress || form.address,
            address2: form.address2,
            city: form.city, stateCode: form.state, zip: form.zip,
            ownershipType: form.ownershipType, propertyType: form.propertyType,
            monthlyPayment: form.monthlyPayment.replace(/[$,]/g, ""),
            company: form.company, endDate: form.endDate,
            term: form.term, interestRate: form.interestRate,
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

  function getOwnershipColor(type) {
    if (type === "Own" || type === "Mortgage") return "#16a34a";
    if (type === "Rent" || type === "Lease") return "#2563eb";
    return "#64748b";
  }

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
            Keep track of deeds, leases, mortgage info, tax records, and insurance for every property -- owned or rented.
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
            {properties.map((p) => {
              const ownerColor = getOwnershipColor(p.metadata?.ownershipType);
              return (
                <div key={p.id} className="card" style={{ position: "relative", overflow: "hidden" }}>
                  {/* Icon header */}
                  <div style={{ height: "100px", background: `linear-gradient(135deg, ${ownerColor}12 0%, ${ownerColor}06 100%)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={ownerColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <span style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: `${ownerColor}20`, color: ownerColor }}>
                      {p.metadata?.propertyType || "Property"}
                    </span>
                  </div>
                  {/* Content */}
                  <div style={{ padding: "14px 20px 4px" }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {p.metadata?.title || p.metadata?.address || "Property"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                      {p.metadata?.ownershipType || ""}{p.metadata?.company ? ` -- ${p.metadata.company}` : ""}
                    </div>
                  </div>
                  <div style={{ padding: "8px 20px 12px" }}>
                    {p.metadata?.monthlyPayment && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Monthly</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{fmtPayment(p.metadata.monthlyPayment)}</span>
                      </div>
                    )}
                    {p.metadata?.endDate && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>End Date</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{p.metadata.endDate}</span>
                      </div>
                    )}
                    {formatDate(p.createdAt) && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Added</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{formatDate(p.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px" }}>
                    <span className={`badge badge-${p.status || "active"}`} style={{ display: "flex", alignItems: "center" }}>{p.status || "Active"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Property" onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Save Property"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Street Address</label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" style={inputStyle} required /></div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Apt / Unit (optional)</label><input type="text" value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} placeholder="Apt 4B" style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>City</label><input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Chicago" style={inputStyle} /></div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>State</label>
              <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={selectStyle}>
                <option value="">--</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Zip</label><input type="text" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="60601" maxLength={10} style={inputStyle} /></div>
          </div>
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
                <option value="House">House</option><option value="Apartment">Apartment</option><option value="Condo">Condo</option><option value="Townhouse">Townhouse</option><option value="Commercial">Commercial</option><option value="Land">Land</option><option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Monthly Payment</label><input type="text" value={form.monthlyPayment ? "$" + Number(String(form.monthlyPayment).replace(/[$,]/g, "")).toLocaleString() : ""} onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value.replace(/[$,]/g, "") })} placeholder="$3,500" style={inputStyle} /></div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Lease / Mortgage Term</label>
              <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} style={selectStyle}>
                <option value="">--</option>
                <option value="6 months">6 Months</option><option value="1 year">1 Year</option><option value="2 years">2 Years</option>
                <option value="5 years">5 Years</option><option value="15 years">15 Years</option><option value="30 years">30 Years</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          {form.ownershipType === "Own" && (
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Interest Rate % (optional)</label><input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} placeholder="6.5" style={inputStyle} /></div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Landlord / Mortgage Co.</label><input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={inputStyle} /></div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
