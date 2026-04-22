/**
 * SocialMedia.jsx — Connected accounts + posting overview (49.2)
 * Replaces SpineSection for "social-media" nav item under platform-marketing worker.
 */

import React, { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const SOCIAL_PLATFORMS = [
  { id: "linkedin",  label: "LinkedIn",  icon: "in", color: "#0077B5" },
  { id: "facebook",  label: "Facebook",  icon: "f",  color: "#1877F2" },
  { id: "instagram", label: "Instagram", icon: "ig", color: "#E4405F" },
  { id: "twitter",   label: "X (Twitter)", icon: "X", color: "#000000" },
  { id: "tiktok",    label: "TikTok",    icon: "tt", color: "#010101" },
  { id: "gbp",       label: "Google Business", icon: "G", color: "#4285F4" },
];

const S = {
  container: { padding: "28px 32px", maxWidth: 900 },
  title: { fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#64748b", marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 },
  accountGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 },
  accountCard: {
    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
    background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
  },
  accountIcon: {
    width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  accountStatus: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  connectBtn: {
    padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 6,
    border: "1px solid #e2e8f0", background: "#fff", color: "#6B46C1", cursor: "pointer",
  },
  connectedBadge: {
    padding: "4px 10px", fontSize: 10, fontWeight: 700, borderRadius: 4,
    background: "#dcfce7", color: "#16a34a",
  },
  // Quick post form
  formCard: {
    background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "20px 24px",
  },
  textarea: {
    width: "100%", minHeight: 100, padding: 12, fontSize: 13, borderRadius: 8,
    border: "1px solid #e2e8f0", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
  },
  platformChecks: { display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" },
  checkLabel: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
    color: "#374151", cursor: "pointer",
  },
  submitRow: { display: "flex", gap: 8, marginTop: 12 },
  draftBtn: {
    padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 8,
    border: "none", background: "#6B46C1", color: "#fff", cursor: "pointer",
  },
  toast: {
    position: "fixed", bottom: 24, right: 24, padding: "12px 20px",
    background: "#0f172a", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500,
    zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  error: { padding: 16, background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 },
};

async function apiFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function SocialMedia() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["linkedin"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // For now, all platforms show as "not connected" since OAuth flows are link-based
  // This will be enhanced when connector health endpoint returns real status
  const connectedPlatforms = [];

  function togglePlatform(id) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const handleSaveDraft = useCallback(async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/v1/marketing:saveDraft", "POST", {
        content: content.trim(),
        platforms: selectedPlatforms,
      });
      setContent("");
      setToast("Draft saved — view it in Campaigns");
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [content, selectedPlatforms]);

  function handleConnect(platformId) {
    // OAuth redirect — placeholder until per-platform OAuth is wired
    const oauthUrl = `${API_BASE}/api?path=${encodeURIComponent(`/v1/oauth:${platformId}:authUrl`)}`;
    window.open(oauthUrl, "_blank", "width=600,height=700");
  }

  return (
    <div style={S.container}>
      <div style={S.title}>Social Media</div>
      <div style={S.subtitle}>Manage connected accounts and create quick posts</div>

      {error && <div style={S.error}>{error}</div>}

      {/* Connected Accounts */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Connected Accounts</div>
        <div style={S.accountGrid}>
          {SOCIAL_PLATFORMS.map(platform => {
            const isConnected = connectedPlatforms.includes(platform.id);
            return (
              <div key={platform.id} style={S.accountCard}>
                <div style={{ ...S.accountIcon, background: platform.color }}>
                  {platform.icon}
                </div>
                <div style={S.accountInfo}>
                  <div style={S.accountName}>{platform.label}</div>
                  <div style={S.accountStatus}>
                    {isConnected ? "Connected" : "Not connected"}
                  </div>
                </div>
                {isConnected ? (
                  <span style={S.connectedBadge}>Active</span>
                ) : (
                  <button style={S.connectBtn} onClick={() => handleConnect(platform.id)}>
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Post */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Quick Post</div>
        <div style={S.formCard}>
          <textarea
            style={S.textarea}
            placeholder="Write your post content..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div style={S.platformChecks}>
            {SOCIAL_PLATFORMS.map(p => (
              <label key={p.id} style={S.checkLabel}>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(p.id)}
                  onChange={() => togglePlatform(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
          <div style={S.submitRow}>
            <button
              style={S.draftBtn}
              onClick={handleSaveDraft}
              disabled={saving || !content.trim()}
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>
          </div>
        </div>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
