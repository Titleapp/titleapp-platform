import { useState, useEffect } from "react";
import * as api from "../api/client";

export default function PendingSignatures() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const vertical = localStorage.getItem("VERTICAL") || "analyst";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "GLOBAL";

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const result = await api.getPendingSignatures({ vertical, jurisdiction });
      setPending(result.pending || []);
    } catch (e) { console.warn("Failed to load signatures:", e); }
    setLoading(false);
  }

  // Compute KPIs
  const total = pending.length;
  const now = Date.now();
  const urgent = pending.filter(s => s.expiresAt && (new Date(s.expiresAt).getTime() - now) < 4 * 60 * 60 * 1000).length;
  const expiring = pending.filter(s => s.expiresAt && (new Date(s.expiresAt).getTime() - now) < 48 * 60 * 60 * 1000).length;

  function getUrgencyStyle(item) {
    if (!item.expiresAt) return { bg: "#f8fafc", color: "#64748b", label: "No deadline" };
    const hoursLeft = (new Date(item.expiresAt).getTime() - now) / (60 * 60 * 1000);
    if (hoursLeft < 4) return { bg: "#fef2f2", color: "#dc2626", label: `${Math.max(0, Math.round(hoursLeft))}h left` };
    if (hoursLeft < 48) return { bg: "#fffbeb", color: "#d97706", label: `${Math.round(hoursLeft)}h left` };
    const daysLeft = Math.round(hoursLeft / 24);
    return { bg: "#f0fdf4", color: "#16a34a", label: `${daysLeft}d left` };
  }

  async function handleSign(requestId) {
    // For now, navigate to a sign URL or show typed consent
    setToast("Opening signature...");
    setTimeout(() => setToast(null), 2000);
    // In production, this would open HelloSign embedded or typed consent modal
  }

  return (
    <div>
      {/* Page Header */}
      <div className="pageHeader">
        <div>
          <h1 className="h1">Signatures</h1>
          <p className="subtle">Documents requiring your signature or countersignature</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px",
          background: toast.startsWith("Failed") ? "#fef2f2" : "#f0fdf4",
          color: toast.startsWith("Failed") ? "#dc2626" : "#16a34a",
          fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {/* KPI Row */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        {[
          { label: "Total Pending", value: total, color: "#7c3aed" },
          { label: "Urgent", value: urgent, color: "#dc2626" },
          { label: "Expiring Soon", value: expiring, color: "#d97706" },
        ].map((kpi, i) => (
          <div key={i} className="card kpiCard">
            <div className="kpiLabel">{kpi.label}</div>
            <div className="kpiValue" style={{ color: kpi.value > 0 ? kpi.color : undefined }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Pending Signatures List */}
      {loading ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
          Loading...
        </div>
      ) : pending.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>&#9998;</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
            No pending signatures
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>
            You are all caught up. Documents requiring your signature will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pending.map((item) => {
            const urg = getUrgencyStyle(item);
            return (
              <div key={item.requestId} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                  {/* Document type badge */}
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "9999px",
                    background: "#f3e8ff", color: "#7c3aed", letterSpacing: "0.02em" }}>
                    {item.documentType || "Document"}
                  </span>
                  {/* Role badge */}
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "9999px",
                    background: "#f1f5f9", color: "#475569" }}>
                    {item.role || "Signer"}
                  </span>
                  {/* Urgency badge */}
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "9999px",
                    background: urg.bg, color: urg.color, marginLeft: "auto" }}>
                    {urg.label}
                  </span>
                </div>
                {/* Title */}
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                  {item.title || "Untitled Document"}
                </div>
                {/* Vertical + requester */}
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                  {item.vertical ? item.vertical.charAt(0).toUpperCase() + item.vertical.slice(1).replace(/-/g, " ") : ""}
                  {item.createdByName ? ` — Requested by ${item.createdByName}` : ""}
                </div>
                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleSign(item.requestId)} style={{
                    flex: 1, padding: "10px 16px", fontSize: "14px", fontWeight: 600,
                    border: "none", borderRadius: "8px", cursor: "pointer",
                    color: "#fff", background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    minHeight: "44px",
                  }}>
                    Sign Now
                  </button>
                  <button style={{
                    padding: "10px 16px", fontSize: "14px", fontWeight: 600,
                    border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer",
                    background: "transparent", color: "#334155", minHeight: "44px",
                  }}>
                    Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
