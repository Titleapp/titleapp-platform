// AutoDealerDealModal.jsx — 2026-08-21 gap-audit fix.
// "+ New Deal" button + form for the Desking a Deal worker (ad-desking-deal).
// Calls POST /v1/auto:vehicle:add (capability auto.create_vehicle_deal_v1),
// which writes a real, VIN-anchored record to the NEW dealerVehicles
// collection — distinct from the unrelated personal-vault MyVehicles.jsx
// feature. Visual pattern matches Contacts.jsx's ManualAddModal / the
// RealEstateWorkerCanvas NewTitleOrderModal (purple-gradient primary button,
// white card shell).

import React, { useState } from "react";
import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiPost(path, payload) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId && tenantId !== "vault" ? { "X-Tenant-Id": tenantId } : {}),
    },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json;
}

export function NewDealButton({ onClick }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <button
        type="button"
        onClick={onClick}
        style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 8, cursor: "pointer" }}
      >
        + New Deal
      </button>
    </div>
  );
}

export default function AutoDealerDealModal({ onClose, onDone }) {
  const [form, setForm] = useState({
    vin: "", year: "", make: "", model: "", trim: "", stockNumber: "",
    buyerName: "", salePrice: "", dealType: "cash",
  });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.vin.trim().length >= 11;

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      const j = await apiPost("/v1/auto:vehicle:add", {
        vin: form.vin.trim(),
        year: form.year ? Number(form.year) : undefined,
        make: form.make || undefined,
        model: form.model || undefined,
        trim: form.trim || undefined,
        stockNumber: form.stockNumber || undefined,
        buyerName: form.buyerName || undefined,
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        dealType: form.dealType,
      });
      setStatus({ state: "done", vehicleId: j.vehicleId, existingRecord: !!j.existingRecord });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>New vehicle / deal</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Opens a new VIN-anchored inventory record and starts the deal.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>VIN *</label>
            <input style={fieldStyle} value={form.vin} onChange={(e) => set("vin", e.target.value)} placeholder="17-character VIN" maxLength={17} />
          </div>
          <div><label style={labelStyle}>Year</label><input style={fieldStyle} value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2024" /></div>
          <div><label style={labelStyle}>Stock #</label><input style={fieldStyle} value={form.stockNumber} onChange={(e) => set("stockNumber", e.target.value)} placeholder="optional" /></div>
          <div><label style={labelStyle}>Make</label><input style={fieldStyle} value={form.make} onChange={(e) => set("make", e.target.value)} /></div>
          <div><label style={labelStyle}>Model</label><input style={fieldStyle} value={form.model} onChange={(e) => set("model", e.target.value)} /></div>
          <div><label style={labelStyle}>Trim</label><input style={fieldStyle} value={form.trim} onChange={(e) => set("trim", e.target.value)} placeholder="optional" /></div>
          <div>
            <label style={labelStyle}>Deal type</label>
            <select style={fieldStyle} value={form.dealType} onChange={(e) => set("dealType", e.target.value)}>
              <option value="cash">Cash</option>
              <option value="finance">Finance</option>
              <option value="lease">Lease</option>
            </select>
          </div>
          <div><label style={labelStyle}>Buyer name</label><input style={fieldStyle} value={form.buyerName} onChange={(e) => set("buyerName", e.target.value)} placeholder="optional" /></div>
          <div><label style={labelStyle}>Sale price</label><input type="number" style={fieldStyle} value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="optional" /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && (
          <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>
            {status.existingRecord ? "A deal already existed for this VIN — not opening a duplicate." : "Deal created."} Vehicle ID: {status.vehicleId}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onDone} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Creating…" : "Create deal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
