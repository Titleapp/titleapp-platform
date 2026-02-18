import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const EMPTY_FORM = { year: "", make: "", model: "", color: "", vin: "", plate: "", state: "", purchaseDate: "", lender: "", mileage: "" };

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadVehicles(); }, []);

  async function loadVehicles() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setVehicles(all.filter((i) => i.metadata?.vin || i.metadata?.make));
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

  async function handleSave(e) {
    e.preventDefault();
    if (!form.make && !form.vin) return;
    setSaving(true);
    try {
      await api.createInventoryItem({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        item: {
          type: "vehicle",
          status: "active",
          metadata: {
            year: form.year, make: form.make, model: form.model, color: form.color,
            vin: form.vin, plate: form.plate, stateRegistered: form.state,
            purchaseDate: form.purchaseDate, lender: form.lender, mileage: form.mileage,
          },
          price: 0, cost: 0,
        },
      });
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
            {vehicles.map((v) => (
              <div key={v.id} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {v.metadata?.year} {v.metadata?.make} {v.metadata?.model}
                    </div>
                    {v.metadata?.vin && (
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", fontFamily: "monospace" }}>VIN: {v.metadata.vin}</div>
                    )}
                  </div>
                  <span className={`badge badge-${v.status || "draft"}`}>{v.status || "Draft"}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "14px", fontSize: "13px", color: "#64748b" }}>
                  {v.metadata?.color && <span>Color: {v.metadata.color}</span>}
                  {v.metadata?.mileage && <span>Mileage: {Number(v.metadata.mileage).toLocaleString()}</span>}
                </div>
                <div style={{ marginTop: "14px" }}>
                  <button className="iconBtn" onClick={() => openChat(v)} style={{ fontSize: "13px" }}>Ask AI</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Vehicle" onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Save Vehicle"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Year</label><input type="text" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Make</label><input type="text" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Toyota" style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Model</label><input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Camry" style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Color</label><input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Mileage</label><input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>VIN (optional)</label><input type="text" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="17 characters" style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>License Plate</label><input type="text" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>State</label><input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="IL" style={inputStyle} /></div>
            <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Purchase Date</label><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Lender / Finance Co. (optional)</label><input type="text" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} style={inputStyle} /></div>
        </div>
      </FormModal>
    </div>
  );
}
