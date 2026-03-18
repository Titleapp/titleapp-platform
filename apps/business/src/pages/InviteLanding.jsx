import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  nav: { padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none" },
  signIn: { fontSize: 13, color: "#6b7280", textDecoration: "none" },
  hero: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", padding: "64px 32px", textAlign: "center", color: "white" },
  heroTitle: { fontSize: 32, fontWeight: 700, marginBottom: 12, maxWidth: 600, margin: "0 auto 12px" },
  heroSub: { fontSize: 16, opacity: 0.9, maxWidth: 500, margin: "0 auto" },
  main: { maxWidth: 700, margin: "0 auto", padding: "48px 24px" },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 20 },
  workerCard: { padding: 20, background: "white", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 12 },
  workerName: { fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 },
  workerDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 8 },
  workerPrice: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  docRow: { display: "flex", gap: 8, padding: "6px 0", fontSize: 13, color: "#475569", alignItems: "center" },
  docBadge: (required) => ({ fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 12, background: required ? "#fef2f2" : "#f0fdf4", color: required ? "#dc2626" : "#16a34a" }),
  ctaSection: { textAlign: "center", padding: "40px 0", marginTop: 32 },
  ctaBtn: { display: "inline-block", padding: "14px 40px", background: "#7c3aed", color: "white", borderRadius: 10, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", textDecoration: "none" },
  ctaNote: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  footer: { textAlign: "center", padding: "24px 32px", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 13, marginTop: 40 },
  loading: { padding: 80, textAlign: "center", color: "#6b7280", fontSize: 16 },
  error: { padding: 80, textAlign: "center", color: "#dc2626", fontSize: 16 },
  message: { maxWidth: 500, margin: "16px auto 0", padding: "16px 20px", background: "rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 15, fontStyle: "italic", color: "rgba(255,255,255,0.9)" },
};

export default function InviteLanding({ inviteCode }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/invite:details&code=${encodeURIComponent(inviteCode)}`);
        const data = await res.json();
        if (data.ok) {
          setInvite(data);
        } else {
          setError(data.error || "This invite is no longer valid.");
        }
      } catch {
        setError("Could not load invite details.");
      }
      setLoading(false);
    }
    loadInvite();
  }, [inviteCode]);

  function handleActivate() {
    setActivating(true);
    sessionStorage.setItem("ta_invite_code", inviteCode);
    window.location.href = `/?invite=${inviteCode}`;
  }

  if (loading) return <div style={S.page}><div style={S.loading}>Loading invite...</div></div>;
  if (error) return (
    <div style={S.page}>
      <nav style={S.nav}><a href="/" style={S.logo}>TitleApp</a><a href="/" style={S.signIn}>Sign In</a></nav>
      <div style={S.error}>{error}</div>
    </div>
  );

  const workers = invite.workers || [];
  const hasDocChecklist = workers.some(w => w.documentChecklist && w.documentChecklist.length > 0);

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        <a href="/" style={S.signIn}>Sign In</a>
      </nav>

      <div style={S.hero}>
        <h1 style={S.heroTitle}>
          {invite.referrerName
            ? `${invite.referrerName} thinks you'd find this useful`
            : "A colleague thinks you'd find this useful"}
        </h1>
        <div style={S.heroSub}>Digital Workers that handle the work you shouldn't have to.</div>
        {invite.personalMessage && (
          <div style={S.message}>"{invite.personalMessage}"</div>
        )}
      </div>

      <div style={S.main}>
        <h2 style={S.sectionTitle}>Included Workers</h2>
        {workers.map((w, i) => (
          <div key={i} style={S.workerCard}>
            <div style={S.workerName}>{w.name}</div>
            <div style={S.workerDesc}>{w.description}</div>
            <div style={S.workerPrice}>${w.price}/mo</div>
          </div>
        ))}

        {hasDocChecklist && (
          <div style={{ marginTop: 32 }}>
            <h2 style={S.sectionTitle}>To get full capability, you'll need to upload:</h2>
            {workers.filter(w => w.documentChecklist && w.documentChecklist.length > 0).map((w, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{w.name}</div>
                {w.documentChecklist.map((doc, j) => (
                  <div key={j} style={S.docRow}>
                    <span style={S.docBadge(doc.required)}>{doc.required ? "Required" : "Recommended"}</span>
                    <span>{doc.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={S.ctaSection}>
          <div style={S.ctaNote}>{invite.trialDays || 14}-day free trial. No credit card required.</div>
          <button onClick={handleActivate} disabled={activating} style={{ ...S.ctaBtn, opacity: activating ? 0.7 : 1 }}>
            {activating ? "Starting..." : "Start Free \u2014 No Credit Card"}
          </button>
        </div>
      </div>

      <footer style={S.footer}>TitleApp {"\u2014"} Digital Workers for every industry</footer>
    </div>
  );
}
