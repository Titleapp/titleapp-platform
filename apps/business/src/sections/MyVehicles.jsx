import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import IDVerifyModal from "../components/IDVerifyModal";
import useIdVerificationGate from "../hooks/useIdVerificationGate";
import * as api from "../api/client";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","AS","GU","MP","PR","VI"];

const EMPTY_FORM = { year: "", make: "", model: "", color: "", vin: "", plate: "", state: "", purchaseDate: "", lender: "", mileage: "", attested: false };

const COLOR_MAP = {
  black: "#1e293b", white: "#e2e8f0", silver: "#94a3b8", gray: "#64748b", grey: "#64748b",
  red: "#dc2626", blue: "#2563eb", green: "#16a34a", yellow: "#eab308", orange: "#ea580c",
  brown: "#92400e", gold: "#d97706", beige: "#d4c5a9", purple: "#7c3aed", pink: "#ec4899",
};

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMileage(val) {
  if (!val) return "";
  return Number(String(val).replace(/,/g, "")).toLocaleString();
}

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const { showModal: showIdVerify, gateAction, onVerified: onIdVerified, onClose: onIdClose } = useIdVerificationGate();

  useEffect(() => { loadVehicles(); }, []);

  async function loadVehicles() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setVehicles(all.filter((i) => (i.metadata?.vin || i.metadata?.make) && (i.metadata?.title || i.metadata?.make)));
    } catch (e) {
      console.error("Failed to load vehicles:", e);
    } finally {
      setLoading(false);
    }
  }

  function openChat(vehicle) {
    window.dispatchEvent(
      new CustomEvent("ta:chatPrompt", {
        detail: { message: `Tell me about my ${vehicle.metadata?.year || ""} ${vehicle.metadata?.make || ""} ${vehicle.metadata?.model || ""}`.trim() },
      })
    );
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this vehicle record?")) return;
    try {
      await api.deleteInventoryItem({ vertical: "consumer", jurisdiction: "GLOBAL", id });
      setToast("Record deleted");
      setTimeout(() => setToast(null), 3000);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.error("Failed to delete:", e);
      setToast("Failed to delete — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.make && !form.vin) return;
    gateAction("vehicle", {}, doSave);
  }

  async function doSave() {
    setSaving(true);
    try {
      const title = `${form.year} ${form.make} ${form.model}`.trim() || "Vehicle";
      const result = await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: "vehicle",
          status: "active",
          metadata: {
            title, year: form.year, make: form.make, model: form.model, color: form.color,
            vin: form.vin, plate: form.plate, stateRegistered: form.state,
            purchaseDate: form.purchaseDate, lender: form.lender, mileage: form.mileage,
          },
          price: 0, cost: 0,
        },
      });
      if (form.attested && result.dtcId) {
        await api.attestInventoryItem({ vertical: "consumer", jurisdiction: "GLOBAL", dtcId: result.dtcId });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setToast("Vehicle added");
      setTimeout(() => setToast(null), 3000);
      setLoading(true);
      await loadVehicles();
    } catch (e) {
      console.error("Failed to create vehicle:", e);
      setToast("Failed to save — " + (e.message || "try again"));
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" };
  const selectStyle = { ...inputStyle, background: "white" };

  function getColorTint(colorName) {
    if (!colorName) return "#7c3aed";
    return COLOR_MAP[colorName.toLowerCase()] || "#7c3aed";
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Vehicles</h1>
          <p className="subtle">Your verified vehicle records</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px", background: toast.startsWith("Failed") ? "#fef2f2" : "#f0fdf4", color: toast.startsWith("Failed") ? "#dc2626" : "#16a34a", fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h14v-6l-2-5H7L5 11v6z"></path>
              <circle cx="7.5" cy="17.5" r="1.5"></circle>
              <circle cx="16.5" cy="17.5" r="1.5"></circle>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>Add your first vehicle</div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Track titles, registration, service history, and insurance all in one place. Your vehicle records are verified and permanent.
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Add Vehicle
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <button onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              + Add Vehicle
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {vehicles.map((v) => {
              const tint = getColorTint(v.metadata?.color);
              const isLight = ["white", "beige", "silver", "yellow"].includes((v.metadata?.color || "").toLowerCase());
              return (
                <div key={v.id} className="card" style={{ position: "relative", overflow: "hidden" }}>
                  {/* Icon header */}
                  <div style={{ height: "100px", background: `linear-gradient(135deg, ${tint}18 0%, ${tint}08 100%)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#64748b" : tint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <path d="M5 17h14v-6l-2-5H7L5 11v6z"></path>
                      <circle cx="7.5" cy="17.5" r="1.5"></circle>
                      <circle cx="16.5" cy="17.5" r="1.5"></circle>
                    </svg>
                    <button
                      onClick={() => handleDelete(v.id)}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <span style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: `${tint}20`, color: isLight ? "#64748b" : tint }}>Vehicle</span>
                  </div>
                  {/* Content */}
                  <div style={{ padding: "14px 20px 4px" }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {v.metadata?.title || `${v.metadata?.year || ""} ${v.metadata?.make || ""} ${v.metadata?.model || ""}`.trim() || "Vehicle"}
                    </div>
                    {v.metadata?.color && <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{v.metadata.color}</div>}
                  </div>
                  <div style={{ padding: "8px 20px 12px" }}>
                    {v.metadata?.vin && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>VIN</span>
                        <span style={{ fontWeight: 500, color: "#1e293b", fontFamily: "monospace", fontSize: "12px" }}>{v.metadata.vin}</span>
                      </div>
                    )}
                    {v.metadata?.mileage && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Mileage</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{fmtMileage(v.metadata.mileage)}</span>
                      </div>
                    )}
                    {v.metadata?.plate && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Plate</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{v.metadata.plate} {v.metadata.stateRegistered || ""}</span>
                      </div>
                    )}
                    {v.metadata?.lender && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Lender</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{v.metadata.lender}</span>
                      </div>
                    )}
                    {formatDate(v.createdAt) && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px" }}>
                        <span style={{ color: "#64748b" }}>Added</span>
                        <span style={{ fontWeight: 500, color: "#1e293b" }}>{formatDate(v.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px" }}>
                    <button className="iconBtn" onClick={() => openChat(v)} style={{ flex: 1, fontSize: "13px" }}>Ask AI</button>
                    <span className={`badge badge-${v.status || "active"}`} style={{ display: "flex", alignItems: "center" }}>{v.status || "Active"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Vehicle" onSubmit={handleSubmit} submitLabel={saving ? "Saving..." : "Save Vehicle"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Year</label><input type="text" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Make</label><input type="text" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Toyota" style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Model</label><input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Camry" style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Color</label><input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Mileage</label><input type="text" value={form.mileage ? Number(String(form.mileage).replace(/,/g, "")).toLocaleString() : ""} onChange={(e) => setForm({ ...form, mileage: e.target.value.replace(/,/g, "") })} placeholder="e.g., 45,000" style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>VIN (optional)</label><input type="text" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="17 characters" style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>License Plate</label><input type="text" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} style={inputStyle} /></div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>State</label>
              <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={selectStyle}>
                <option value="">--</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Purchase Date</label><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Lender / Finance Co. (optional)</label><input type="text" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} style={inputStyle} /></div>
          <div style={{ marginTop: "4px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.attested} onChange={(e) => setForm({ ...form, attested: e.target.checked })} style={{ marginTop: "3px", flexShrink: 0 }} />
              I represent that I am the lawful owner of this vehicle and that the information provided is accurate to the best of my knowledge.
            </label>
          </div>
        </div>
      </FormModal>

      {showIdVerify && <IDVerifyModal onVerified={onIdVerified} onClose={onIdClose} />}
    </div>
  );
}
