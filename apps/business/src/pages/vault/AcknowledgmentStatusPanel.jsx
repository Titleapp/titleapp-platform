import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const ACK_STATUS = {
  acknowledged: { color: "#10b981", label: "Acknowledged" },
  pending: { color: "#f59e0b", label: "Pending" },
  signature_pending: { color: "#6366f1", label: "Signature Pending" },
};

const S = {
  panel: { background: "#1e293b", borderRadius: "0 0 10px 10px", marginTop: -8, marginBottom: 8, padding: "16px 20px", borderTop: "1px solid #334155" },
  title: { fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #0f172a" },
  name: { fontSize: 13, fontWeight: 500, color: "#e2e8f0", flex: 1 },
  status: { fontSize: 12, fontWeight: 600 },
  date: { fontSize: 12, color: "#64748b", minWidth: 80, textAlign: "right" },
  empty: { fontSize: 13, color: "#64748b", padding: "8px 0" },
  reminderBtn: { padding: "4px 10px", fontSize: 11, fontWeight: 500, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 4, cursor: "pointer" },
  adminRow: { display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 8, borderTop: "1px solid #0f172a" },
};

export default function AcknowledgmentStatusPanel({ docId }) {
  const [acks, setAcks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const res = await fetch(
          `${API_BASE}/api?path=/v1/docControl:acknowledgmentStatus&docId=${encodeURIComponent(docId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.ok) setAcks(data.acknowledgments || []);
      } catch (err) {
        console.error("Failed to load acknowledgments:", err);
      }
      setLoading(false);
    }
    load();
  }, [docId]);

  async function handleResendReminder() {
    setSending(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      await fetch(`${API_BASE}/api?path=/v1/docControl:resendReminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docId }),
      });
    } catch (err) {
      console.error("Failed to send reminder:", err);
    }
    setSending(false);
  }

  if (loading) return <div style={S.panel}><div style={S.empty}>Loading...</div></div>;

  const pendingCount = acks.filter(a => a.status !== "acknowledged").length;

  return (
    <div style={S.panel}>
      <div style={S.title}>Acknowledgment Status ({acks.length - pendingCount}/{acks.length} complete)</div>
      {acks.length === 0 ? (
        <div style={S.empty}>No acknowledgments required</div>
      ) : (
        acks.map((ack, i) => {
          const statusInfo = ACK_STATUS[ack.status] || ACK_STATUS.pending;
          return (
            <div key={ack.userId || i} style={S.row}>
              <div style={S.name}>{ack.name || ack.email || "Unknown"}</div>
              <div style={{ ...S.status, color: statusInfo.color }}>{statusInfo.label}</div>
              <div style={S.date}>{ack.acknowledgedAt ? new Date(ack.acknowledgedAt).toLocaleDateString() : "—"}</div>
            </div>
          );
        })
      )}
      {pendingCount > 0 && (
        <div style={S.adminRow}>
          <button style={{ ...S.reminderBtn, opacity: sending ? 0.6 : 1 }} onClick={handleResendReminder} disabled={sending}>
            {sending ? "Sending..." : `Resend Reminder (${pendingCount} pending)`}
          </button>
        </div>
      )}
    </div>
  );
}
