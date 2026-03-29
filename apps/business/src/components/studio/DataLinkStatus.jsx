import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function DataLinkStatus() {
  const [status, setStatus] = useState(null);

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
        setStatus(data.overall || "ok");
      } catch {
        setStatus(null);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // "ok" or null → no indicator
  if (!status || status === "ok") return null;

  const color = status === "degraded" ? "#eab308" : "#ef4444";
  const tooltip = status === "degraded"
    ? "Some data sources are running slow."
    : "A data source your worker uses is unavailable. Alex will manage this automatically.";

  return (
    <span
      title={tooltip}
      style={{
        width: 6, height: 6, borderRadius: "50%",
        background: color, display: "inline-block", marginLeft: 6,
      }}
    />
  );
}
