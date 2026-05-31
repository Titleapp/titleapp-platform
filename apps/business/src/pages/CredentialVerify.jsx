import React, { useEffect, useState } from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchPublic(path) {
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  return res.json();
}

const TIER_META = {
  certified: {
    label: "SOCIII Certified Creator",
    accent: "#7c3aed",
    description: "Awarded to creators who have shipped a Digital Worker that has been live for 60+ days, has paying subscribers, and has passed an independent Forge Reviews evaluation with at least 4 stars.",
  },
  advanced: {
    label: "SOCIII Advanced Creator",
    accent: "#d97706",
    description: "Awarded to creators who have shipped 5+ Digital Workers each meeting Certified Creator criteria. Recognizes sustained marketplace contribution.",
  },
};

export default function CredentialVerify({ credentialId }) {
  const [data, setData] = useState({ loading: true });

  useEffect(() => {
    document.title = "Verify SOCIII Credential";
    fetchPublic(`/v1/credential:verify?credentialId=${encodeURIComponent(credentialId)}`)
      .then((r) => setData({ loading: false, ...r }))
      .catch(() => setData({ loading: false, ok: false, error: "fetch_failed" }));
  }, [credentialId]);

  if (data.loading) {
    return <div style={S.page}><div style={S.loadingState}>Verifying credential…</div></div>;
  }

  if (!data.ok || !data.credential) {
    return (
      <div style={S.page}>
        <Header />
        <div style={S.notFound}>
          <h1 style={S.notFoundH1}>Credential not found</h1>
          <p style={S.notFoundSub}>
            No SOCIII credential with the ID <code>{credentialId}</code> exists, or it has been removed from public verification.
          </p>
          <a href="/" style={S.btnPrimary}>SOCIII home</a>
        </div>
      </div>
    );
  }

  const { credential, creator } = data;
  const tier = TIER_META[credential.tier] || TIER_META.certified;
  const statusBadge = {
    active: { label: "Active", color: "#16a34a", bg: "#dcfce7" },
    lapsed: { label: "Lapsed", color: "#d97706", bg: "#fef3c7" },
    revoked: { label: "Revoked", color: "#dc2626", bg: "#fee2e2" },
  }[credential.status] || { label: credential.status, color: "#64748b", bg: "#f1f5f9" };

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <section style={{ ...S.credentialCard, borderColor: tier.accent + "33" }}>
          <div style={S.credentialBadge}>
            <img src={sociiiMarkUrl} alt="" width={48} height={48} />
            <div>
              <div style={{ ...S.credentialTier, color: tier.accent }}>{tier.label}</div>
              <div style={S.credentialIssued}>Issued by SOCIII, Inc.</div>
            </div>
            <div style={{ ...S.statusBadge, color: statusBadge.color, background: statusBadge.bg }}>
              {statusBadge.label}
            </div>
          </div>

          <div style={S.creatorBlock}>
            {creator.photoURL ? (
              <img src={creator.photoURL} alt={creator.displayName} style={S.creatorPhoto} />
            ) : (
              <div style={S.creatorPhotoPlaceholder}>
                {(creator.displayName || creator.handle || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div style={S.creatorIdentity}>
              <div style={S.creatorName}>{creator.displayName || creator.handle}</div>
              {creator.handle && (
                <a href={`/c/${creator.handle}`} style={S.creatorHandle}>
                  sociii.ai/c/{creator.handle}
                </a>
              )}
              {creator.verifiedExpert && (
                <div style={S.verifiedRow}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={S.verifiedText}>Identity verified by Stripe Identity</span>
                </div>
              )}
            </div>
          </div>

          <div style={S.metaGrid}>
            <div style={S.metaRow}>
              <span style={S.metaLabel}>Credential ID</span>
              <span style={S.metaValue}><code>{credential.id}</code></span>
            </div>
            {credential.issuedAt && (
              <div style={S.metaRow}>
                <span style={S.metaLabel}>Issued</span>
                <span style={S.metaValue}>{new Date(credential.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
            {credential.renewedAt && (
              <div style={S.metaRow}>
                <span style={S.metaLabel}>Last renewed</span>
                <span style={S.metaValue}>{new Date(credential.renewedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
            {credential.expiresAt && (
              <div style={S.metaRow}>
                <span style={S.metaLabel}>Next renewal</span>
                <span style={S.metaValue}>{new Date(credential.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
            {credential.revokedAt && (
              <div style={S.metaRow}>
                <span style={S.metaLabel}>Revoked</span>
                <span style={S.metaValue}>{new Date(credential.revokedAt).toLocaleDateString("en-US")} {credential.revokedReason ? `— ${credential.revokedReason}` : ""}</span>
              </div>
            )}
            <div style={S.metaRow}>
              <span style={S.metaLabel}>Workers credentialed</span>
              <span style={S.metaValue}>{creator.workerCount || 0}</span>
            </div>
          </div>

          <p style={S.tierDescription}>{tier.description}</p>
        </section>

        <section style={S.aboutSection}>
          <h2 style={S.aboutH2}>About this credential</h2>
          <p style={S.aboutBody}>
            The SOCIII Creator credential is awarded by SOCIII, Inc. to domain experts who have built Digital Workers
            for the SOCIII Marketplace and met the platform's quality standards. Each credential is verifiable here
            and represents real platform activity — shipped Workers, paying customers, and independent quality review
            by Forge Reviews.
          </p>
          <p style={S.aboutBody}>
            This page is the canonical verification source. If you're seeing a SOCIII credential badge on LinkedIn,
            UpWork, Fiverr, or anywhere else, the credential ID should link here. If a credential cannot be verified
            on this page, it is not a valid SOCIII credential.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header style={S.header}>
      <a href="/" style={S.logoLink}>
        <img src={sociiiMarkUrl} alt="" width={28} height={28} />
        <span style={S.logoText}>SOCIII</span>
      </a>
      <div style={S.headerRight}>
        <span style={S.verifyTag}>CREDENTIAL VERIFICATION</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={S.footer}>
      <span>SOCIII, Inc. — issuing organization</span>
      <span style={S.footerDot}>·</span>
      <a href="/legal/privacy-policy" style={S.footerLink}>Privacy</a>
      <span style={S.footerDot}>·</span>
      <a href="/legal/terms-of-service" style={S.footerLink}>Terms</a>
    </footer>
  );
}

const S = {
  page: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#0f172a",
  },
  loadingState: { padding: 80, textAlign: "center", color: "#6b7280" },
  notFound: { maxWidth: 480, margin: "100px auto", textAlign: "center", padding: 24, background: "#fff", borderRadius: 12 },
  notFoundH1: { fontSize: 28, fontWeight: 700, marginBottom: 12 },
  notFoundSub: { fontSize: 16, color: "#6b7280", marginBottom: 24 },
  btnPrimary: {
    display: "inline-block", background: "#7c3aed", color: "#fff",
    padding: "10px 24px", borderRadius: 8, fontWeight: 600,
    textDecoration: "none", fontSize: 14,
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", background: "#fff", borderBottom: "1px solid #e2e8f0",
  },
  logoLink: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" },
  logoText: { fontSize: 20, fontWeight: 700 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  verifyTag: {
    fontSize: 11, fontWeight: 700, color: "#7c3aed",
    background: "#f3e8ff", padding: "4px 10px", borderRadius: 999,
    letterSpacing: "0.1em",
  },
  main: { flex: 1, maxWidth: 720, margin: "0 auto", width: "100%", padding: "40px 32px" },

  credentialCard: {
    background: "#fff", borderRadius: 16, padding: 36,
    border: "2px solid", marginBottom: 32,
    boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
  },
  credentialBadge: {
    display: "flex", alignItems: "center", gap: 16,
    paddingBottom: 24, borderBottom: "1px solid #f1f5f9", marginBottom: 24,
  },
  credentialTier: { fontSize: 20, fontWeight: 800, marginBottom: 4 },
  credentialIssued: { fontSize: 13, color: "#64748b" },
  statusBadge: {
    marginLeft: "auto", fontSize: 12, fontWeight: 700,
    padding: "6px 14px", borderRadius: 999, letterSpacing: "0.05em",
  },

  creatorBlock: { display: "flex", gap: 16, alignItems: "center", marginBottom: 28 },
  creatorPhoto: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" },
  creatorPhotoPlaceholder: {
    width: 64, height: 64, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    color: "#fff", fontSize: 24, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  creatorIdentity: { flex: 1 },
  creatorName: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  creatorHandle: { fontSize: 14, color: "#7c3aed", textDecoration: "none", display: "block", marginBottom: 6 },
  verifiedRow: { display: "flex", alignItems: "center", gap: 6 },
  verifiedText: { fontSize: 12, color: "#16a34a", fontWeight: 600 },

  metaGrid: { padding: "20px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", marginBottom: 20 },
  metaRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", fontSize: 14,
  },
  metaLabel: { color: "#64748b" },
  metaValue: { color: "#0f172a", fontWeight: 500 },

  tierDescription: { fontSize: 14, color: "#475569", lineHeight: 1.5 },

  aboutSection: { padding: "24px 0" },
  aboutH2: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  aboutBody: { fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 12 },

  footer: {
    padding: "24px 32px", borderTop: "1px solid #e2e8f0",
    fontSize: 13, color: "#94a3b8",
    display: "flex", justifyContent: "center", gap: 4,
    background: "#fff",
  },
  footerDot: { color: "#cbd5e1" },
  footerLink: { color: "#64748b", textDecoration: "none" },
};
