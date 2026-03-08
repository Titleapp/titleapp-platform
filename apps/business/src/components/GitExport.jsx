import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function getToken() {
  if (window.__firebaseAuth?.currentUser) {
    try { return await window.__firebaseAuth.currentUser.getIdToken(true); } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

export default function GitExport({ workerId, tenantId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchBundle() {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api?path=/v1/worker:export&workerId=${workerId}`, {
      headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
    });
    return res.json();
  }

  async function handleDownloadZip() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBundle();
      if (!data.ok) { setError(data.error || "Export failed"); setLoading(false); return; }
      const b = data.bundle;

      // Build files as text
      const files = {
        "rules.json": JSON.stringify(b.rules, null, 2),
        "schema.json": JSON.stringify(b.schema, null, 2),
        "meta.json": JSON.stringify(b.meta, null, 2),
        "README.md": b.readme,
      };

      // Create a simple JSON bundle download (no zip library needed)
      const blob = new Blob([JSON.stringify({ ...b, _files: files }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${b.meta.name.replace(/[^a-zA-Z0-9]/g, "_")}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Connection error");
    }
    setLoading(false);
  }

  const btnStyle = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 16px", background: "#FFFFFF", border: "1px solid #E2E8F0",
    borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#1a1a2e",
    cursor: "pointer", width: "100%", textAlign: "left",
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>Export Worker</div>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
        Download your worker's rules, schema, and configuration.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button style={btnStyle} onClick={handleDownloadZip} disabled={loading}>
          <span style={{ fontSize: 16 }}>{"\u2B07"}</span>
          {loading ? "Exporting..." : "Download as JSON"}
        </button>

        <button
          style={{ ...btnStyle, opacity: 0.5, cursor: "not-allowed" }}
          disabled
          title="Coming soon"
        >
          <span style={{ fontSize: 16 }}>{"\u{1F517}"}</span>
          Connect GitHub
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>Coming soon</span>
        </button>

        <button
          style={{ ...btnStyle, opacity: 0.5, cursor: "not-allowed" }}
          disabled
          title="Coming soon"
        >
          <span style={{ fontSize: 16 }}>{"\u{1F517}"}</span>
          Connect GitLab
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>Coming soon</span>
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
