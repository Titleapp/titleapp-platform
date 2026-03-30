import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function DataLinkStatus() {
  const [status, setStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api?path=/v1/api-health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.overall || "healthy");
        setServices(data.services || []);
      } catch {
        setStatus(null);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const color = status === "healthy" ? "#16a34a" : status === "degraded" ? "#eab308" : "#ef4444";
  const tooltip = status === "healthy" ? "All data sources healthy"
    : status === "degraded" ? "Some data sources are running slow"
    : "A data source is unavailable";

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setOpen(!open)}
        title={tooltip}
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color, display: "inline-block", marginLeft: 6,
          cursor: "pointer",
        }}
      />
      {open && (
        <div style={{
          position: "absolute", top: 16, right: 0, zIndex: 50,
          background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 8,
          padding: 12, minWidth: 220, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 8, letterSpacing: 1 }}>
            DATA LINKS
          </div>
          {services.length === 0 && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No services tracked yet</div>
          )}
          {services.map(s => {
            const c = s.status === "healthy" ? "#16a34a" : s.status === "degraded" ? "#eab308" : "#ef4444";
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#e5e7eb" }}>{s.serviceName || s.id}</span>
              </div>
            );
          })}
        </div>
      )}
    </span>
  );
}
