import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  nav: { padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none", cursor: "pointer" },
  navLink: { fontSize: 13, color: "#6b7280", textDecoration: "none", cursor: "pointer" },
  hero: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", padding: "60px 32px", textAlign: "center", color: "white" },
  heroTitle: { fontSize: 32, fontWeight: 700, marginBottom: 8 },
  heroDesc: { fontSize: 16, opacity: 0.9, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 },
  heroBadge: { display: "inline-block", padding: "4px 14px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 600, marginTop: 16 },
  main: { maxWidth: 800, margin: "0 auto", padding: "40px 32px" },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 },
  card: { background: "white", borderRadius: 12, padding: 24, border: "1px solid #e5e7eb" },
  ruleRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f3f4f6" },
  ruleDot: { width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 6 },
  ruleText: { fontSize: 14, color: "#374151", lineHeight: 1.5 },
  stat: { textAlign: "center", padding: 16 },
  statValue: { fontSize: 24, fontWeight: 700, color: "#111827" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  cta: { textAlign: "center", padding: "40px 20px" },
  ctaBtn: { padding: "14px 40px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  footer: { textAlign: "center", padding: "24px 32px", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 13 },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  error: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 },
};

export default function MarketplaceListing({ slug }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";

  useEffect(() => {
    fetchListing();
  }, [slug]);

  async function fetchListing() {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/marketplace:view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await resp.json();
      if (data.ok && data.listing) {
        setListing(data.listing);
      } else {
        setError(data.error || "Listing not found");
      }
    } catch (e) {
      setError("Failed to load listing");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={S.loading}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed", marginBottom: 16 }}>TitleApp</div>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={S.error}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed" }}>TitleApp Marketplace</div>
        <div style={{ fontSize: 16, color: "#6b7280" }}>{error || "This Digital Worker was not found."}</div>
        <a href="/" style={{ color: "#7c3aed", fontSize: 14 }}>Back to TitleApp</a>
      </div>
    );
  }

  const rules = listing.rules || [];

  if (isEmbed) {
    return (
      <div style={{ fontFamily: S.page.fontFamily, background: "white", padding: 24, borderRadius: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{listing.name}</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>{listing.description}</div>
        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <div><span style={{ fontWeight: 700 }}>{listing.rulesCount || rules.length}</span> <span style={{ color: "#6b7280" }}>rules</span></div>
          <div><span style={{ fontWeight: 700 }}>{listing.category || "custom"}</span></div>
        </div>
        <a href={window.location.href.replace("?embed=1", "")} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 24px", background: "#7c3aed", color: "white", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>View on TitleApp</a>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <div style={S.nav}>
        <a style={S.logo} onClick={() => window.location.href = "/"}>TitleApp</a>
        <a style={S.navLink} onClick={() => window.location.href = "/developers"}>Build your own</a>
      </div>

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroTitle}>{listing.name}</div>
        <div style={S.heroDesc}>{listing.description}</div>
        <div style={S.heroBadge}>{listing.category || "custom"} Digital Worker</div>
      </div>

      {/* Main Content */}
      <div style={S.main}>
        {/* Stats */}
        <div style={{ ...S.card, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 32 }}>
          <div style={S.stat}>
            <div style={S.statValue}>{listing.rulesCount || rules.length}</div>
            <div style={S.statLabel}>Enforcement Rules</div>
          </div>
          <div style={{ ...S.stat, borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb" }}>
            <div style={S.statValue}>{listing.subscribers || 0}</div>
            <div style={S.statLabel}>Users</div>
          </div>
          <div style={S.stat}>
            <div style={S.statValue}>${(listing.pricePerSeat || 9).toFixed(0)}/seat</div>
            <div style={S.statLabel}>Per Month</div>
          </div>
        </div>

        {/* How It Works */}
        <div style={S.section}>
          <div style={S.sectionTitle}>How It Works</div>
          <div style={S.card}>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
              This Digital Worker uses TitleApp's enforcement engine to validate every AI output against {listing.rulesCount || rules.length} rules before delivery. You define your inputs, the AI processes them, and the enforcement engine ensures compliance. Full audit trail on every transaction.
            </div>
          </div>
        </div>

        {/* Rules */}
        {rules.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Enforcement Rules ({rules.length})</div>
            <div style={S.card}>
              {rules.map((rule, i) => (
                <div key={i} style={S.ruleRow}>
                  <div style={S.ruleDot} />
                  <div style={S.ruleText}>{rule}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator */}
        {listing.creatorName && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Created By</div>
            <div style={S.card}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{listing.creatorName}</div>
              {listing.creatorBio && <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>{listing.creatorBio}</div>}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={S.cta}>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>Hire this Digital Worker for your workspace.</div>
          <button style={S.ctaBtn} onClick={() => { window.location.href = "/developers"; }}>Get Started</button>
        </div>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        TitleApp — The Digital Worker Platform
      </div>
    </div>
  );
}
