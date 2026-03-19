import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const STATUS_COLORS = {
  active: { bg: "#dcfce7", color: "#166534", label: "Active" },
  superseded: { bg: "#f1f5f9", color: "#475569", label: "Superseded" },
  expired: { bg: "#fee2e2", color: "#991b1b", label: "Expired" },
  pending_review: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
};

const S = {
  panel: { background: "#1e293b", borderRadius: "0 0 10px 10px", marginTop: -8, marginBottom: 8, padding: "16px 20px", borderTop: "1px solid #334155" },
  title: { fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #0f172a" },
  version: { fontSize: 13, fontWeight: 600, color: "#e2e8f0", minWidth: 60 },
  date: { fontSize: 12, color: "#94a3b8", flex: 1 },
  uploader: { fontSize: 12, color: "#64748b" },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 },
  empty: { fontSize: 13, color: "#64748b", padding: "8px 0" },
};

export default function VersionHistoryPanel({ workerId, docType }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const res = await fetch(
          `${API_BASE}/api?path=/v1/docControl:versionHistory&workerId=${encodeURIComponent(workerId)}&docType=${encodeURIComponent(docType)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.ok) setVersions(data.versions || []);
      } catch (err) {
        console.error("Failed to load version history:", err);
      }
      setLoading(false);
    }
    load();
  }, [workerId, docType]);

  if (loading) return <div style={S.panel}><div style={S.empty}>Loading...</div></div>;

  return (
    <div style={S.panel}>
      <div style={S.title}>Version History</div>
      {versions.length === 0 ? (
        <div style={S.empty}>No version history available</div>
      ) : (
        versions.map((v, i) => {
          const statusStyle = STATUS_COLORS[v.status] || STATUS_COLORS.active;
          return (
            <div key={v.docId || i} style={S.row}>
              <div style={S.version}>{v.revisionNumber || `v${v.version || i + 1}`}</div>
              <div style={S.date}>
                {v.uploadedAt ? new Date(v.uploadedAt).toLocaleDateString() : "—"}
                {v.supersededAt && <span> — superseded {new Date(v.supersededAt).toLocaleDateString()}</span>}
              </div>
              <div style={S.uploader}>{v.uploadedBy || "—"}</div>
              <span style={{ ...S.badge, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
