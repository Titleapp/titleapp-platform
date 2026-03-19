import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { background: "#0f172a", padding: "24px 32px", color: "white" },
  headerTitle: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  headerSub: { fontSize: 14, color: "#94a3b8" },
  badge: { display: "inline-block", padding: "4px 12px", borderRadius: 16, background: "rgba(124,58,237,0.2)", color: "#a78bfa", fontSize: 12, fontWeight: 600, marginTop: 8 },
  body: { maxWidth: 640, margin: "0 auto", padding: "32px 24px" },
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid #f1f5f9" },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 },
  name: { fontSize: 14, fontWeight: 600, color: "#111827", flex: 1 },
  role: { fontSize: 13, color: "#6b7280", minWidth: 120 },
  date: { fontSize: 12, color: "#94a3b8" },
  country: { fontSize: 12, color: "#94a3b8" },
  footer: { padding: "20px", borderTop: "1px solid #e5e7eb", background: "#fafbfc" },
  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  footerLabel: { fontSize: 12, color: "#6b7280" },
  footerValue: { fontSize: 12, color: "#111827", fontWeight: 500 },
  hash: { fontSize: 11, fontFamily: "monospace", color: "#94a3b8", wordBreak: "break-all", marginTop: 8 },
  powered: { textAlign: "center", padding: "24px", fontSize: 12, color: "#94a3b8" },
  loading: { textAlign: "center", padding: 64, color: "#94a3b8" },
  error: { textAlign: "center", padding: 64, color: "#ef4444" },
};

export default function PublicTeamRoster() {
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const pathParts = window.location.pathname.split("/");
      const projectId = pathParts[pathParts.length - 1];
      if (!projectId) { setError("No project ID"); setLoading(false); return; }

      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/web3:publicRoster&projectId=${encodeURIComponent(projectId)}`);
        const data = await res.json();
        if (data.ok) setRoster(data);
        else setError(data.error || "Project not found");
      } catch {
        setError("Failed to load roster");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={S.page}><div style={S.loading}>Loading roster...</div></div>;
  if (error) return <div style={S.page}><div style={S.error}>{error}</div></div>;
  if (!roster) return null;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerTitle}>{roster.projectName || "Project"} — Verified Team</div>
        <div style={S.headerSub}>TitleApp Web3 Suite</div>
        <div style={S.badge}>Verified</div>
      </div>

      <div style={S.body}>
        <div style={S.card}>
          {(roster.members || []).map((m, i) => (
            <div key={i} style={S.row}>
              <div style={S.dot} />
              <div style={S.name}>{m.name || m.email}</div>
              <div style={S.role}>{m.role}</div>
              <div style={S.date}>Verified {m.verifiedAt ? new Date(m.verifiedAt).toLocaleDateString() : "Pending"}</div>
              {m.country && <div style={S.country}>{m.country}</div>}
            </div>
          ))}

          <div style={S.footer}>
            <div style={S.footerRow}>
              <span style={S.footerLabel}>Project Attestation</span>
              <span style={S.footerValue}>Signed {roster.attestationDate ? new Date(roster.attestationDate).toLocaleDateString() : "—"}</span>
            </div>
            {roster.vaultUrl && (
              <div style={S.footerRow}>
                <span style={S.footerLabel}>Document Vault</span>
                <a href={roster.vaultUrl} style={{ ...S.footerValue, color: "#7c3aed", textDecoration: "none" }}>View public vault</a>
              </div>
            )}
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>Verified by TitleApp &middot; Powered by Stripe Identity</div>
            {roster.rosterHash && <div style={S.hash}>Roster hash: {roster.rosterHash}</div>}
          </div>
        </div>
      </div>

      <div style={S.powered}>TitleApp Web3 Suite &middot; All receipts. All the time.</div>
    </div>
  );
}
