import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function getToken() {
  if (window.__firebaseAuth?.currentUser) {
    try { return await window.__firebaseAuth.currentUser.getIdToken(true); } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

export default function CreatorProfile({ onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [credentials, setCredentials] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [bio, setBio] = useState("");

  // Load existing profile on mount
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_BASE}/api?path=/v1/creator:profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok && data.profile) {
          setTitle(data.profile.title || "");
          setYearsExperience(data.profile.yearsExperience || "");
          setCredentials(data.profile.credentials || "");
          setLinkedIn(data.profile.linkedIn || "");
          setBio(data.profile.bio || "");
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api?path=/v1/creator:profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, yearsExperience, credentials, linkedIn, bio }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        if (onComplete) onComplete({ title, yearsExperience, credentials, linkedIn, bio });
      }
    } catch {}
    setSaving(false);
  }

  if (loading) return <div style={{ color: "#64748B", padding: 20 }}>Loading profile...</div>;

  const fieldStyle = {
    width: "100%", padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0",
    borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none", fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4, display: "block" };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Creator Profile</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24, lineHeight: 1.5 }}>
        A worker built by a verified expert is worth more. This shows on your marketplace listing as an authority badge.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Professional title</label>
          <input
            style={fieldStyle}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Licensed CPA, Registered Nurse, Construction PM..."
          />
        </div>

        <div>
          <label style={labelStyle}>Years of experience</label>
          <input
            style={fieldStyle}
            value={yearsExperience}
            onChange={e => setYearsExperience(e.target.value)}
            placeholder="e.g. 15"
            type="number"
            min="0"
            max="60"
          />
        </div>

        <div>
          <label style={labelStyle}>Credentials and certifications</label>
          <textarea
            style={{ ...fieldStyle, resize: "vertical", minHeight: 60 }}
            value={credentials}
            onChange={e => setCredentials(e.target.value)}
            placeholder="CPA license, Series 65, NREMT-P, PMP, etc."
          />
        </div>

        <div>
          <label style={labelStyle}>LinkedIn URL <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span></label>
          <input
            style={fieldStyle}
            value={linkedIn}
            onChange={e => setLinkedIn(e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
          />
        </div>

        <div>
          <label style={labelStyle}>Short bio <span style={{ fontWeight: 400, color: "#94A3B8" }}>({280 - bio.length} characters left)</span></label>
          <textarea
            style={{ ...fieldStyle, resize: "vertical", minHeight: 80 }}
            value={bio}
            onChange={e => e.target.value.length <= 280 && setBio(e.target.value)}
            placeholder="What makes you the right person to build this worker? One or two sentences."
            maxLength={280}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 24px", background: "#6B46C1", color: "white",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
        {saved && <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>Saved</span>}
        {onComplete && (
          <button
            onClick={() => onComplete(null)}
            style={{
              padding: "12px 24px", background: "#FFFFFF", color: "#64748B",
              border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Skip for now
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 12, lineHeight: 1.5 }}>
        Workers built without background info may be flagged during admin review.
      </div>
    </div>
  );
}
