import React, { useEffect, useState } from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchPublic(path) {
  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  return res.json();
}

export default function CreatorProfilePublic({ handle }) {
  const [data, setData] = useState({ loading: true });

  useEffect(() => {
    document.title = `${handle} — SOCIII Creator`;
    fetchPublic(`/v1/creator:public-profile?handle=${encodeURIComponent(handle)}`)
      .then((r) => {
        setData({ loading: false, ...r });
        // Rich meta once profile resolved
        if (r?.ok && r?.profile) {
          const p = r.profile;
          const workerCount = (r.workers || []).length;
          const name = p.displayName || handle;
          const title = p.title || "Domain expert";
          const bio = p.bio || `${name} is a SOCIII Creator${p.title ? ` — ${p.title}` : ""}. Earning on ${workerCount} Digital Worker${workerCount === 1 ? "" : "s"} in the SOCIII Marketplace.`;
          const canonical = `https://sociii.ai/c/${handle}`;
          document.title = `${name} — SOCIII Creator${p.title ? ` · ${p.title}` : ""}`;
          function setMeta(selector, attr, value, createWith) {
            let el = document.querySelector(selector);
            if (!el && createWith) {
              el = document.createElement(createWith.tag);
              Object.entries(createWith.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
              document.head.appendChild(el);
            }
            if (el) el.setAttribute(attr, value);
          }
          setMeta('meta[name="description"]', "content", bio, { tag: "meta", attrs: { name: "description" } });
          setMeta('meta[property="og:title"]', "content", `${name} — SOCIII Creator`, { tag: "meta", attrs: { property: "og:title" } });
          setMeta('meta[property="og:description"]', "content", bio, { tag: "meta", attrs: { property: "og:description" } });
          setMeta('meta[property="og:url"]', "content", canonical, { tag: "meta", attrs: { property: "og:url" } });
          setMeta('meta[property="og:type"]', "content", "profile", { tag: "meta", attrs: { property: "og:type" } });
          if (p.photoURL) {
            setMeta('meta[property="og:image"]', "content", p.photoURL, { tag: "meta", attrs: { property: "og:image" } });
          }
          setMeta('meta[name="twitter:card"]', "content", p.photoURL ? "summary_large_image" : "summary", { tag: "meta", attrs: { name: "twitter:card" } });
          setMeta('meta[name="twitter:title"]', "content", `${name} — SOCIII Creator`, { tag: "meta", attrs: { name: "twitter:title" } });
          setMeta('meta[name="twitter:description"]', "content", bio, { tag: "meta", attrs: { name: "twitter:description" } });
          setMeta('link[rel="canonical"]', "href", canonical, { tag: "link", attrs: { rel: "canonical" } });

          // JSON-LD Person schema
          let ld = document.querySelector('script[type="application/ld+json"][data-creator="1"]');
          if (!ld) {
            ld = document.createElement("script");
            ld.type = "application/ld+json";
            ld.setAttribute("data-creator", "1");
            document.head.appendChild(ld);
          }
          ld.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name,
            description: bio,
            jobTitle: title,
            url: canonical,
            image: p.photoURL || undefined,
            worksFor: { "@type": "Organization", name: "SOCIII Inc.", url: "https://sociii.ai" },
            knowsAbout: (r.workers || []).map(w => w.vertical || w.label).filter(Boolean),
          });
        }
      })
      .catch(() => setData({ loading: false, ok: false, error: "fetch_failed" }));
  }, [handle]);

  if (data.loading) {
    return (
      <div style={S.page}>
        <div style={S.loadingState}>Loading creator profile…</div>
      </div>
    );
  }
  if (!data.ok || !data.profile) {
    return (
      <div style={S.page}>
        <Header />
        <div style={S.notFound}>
          <h1 style={S.notFoundH1}>Creator not found</h1>
          <p style={S.notFoundSub}>No creator with the handle <code>{handle}</code> exists on SOCIII yet.</p>
          <a href="/" style={S.btnPrimary}>Back to SOCIII</a>
        </div>
      </div>
    );
  }

  const { profile, workers, socIICredentials } = data;

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <section style={S.heroSection}>
          <div style={S.heroInner}>
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} style={S.photo} />
            ) : (
              <div style={S.photoPlaceholder}>{(profile.displayName || handle).charAt(0).toUpperCase()}</div>
            )}
            <div style={S.identityBlock}>
              <h1 style={S.h1}>{profile.displayName || handle}</h1>
              {profile.title && <div style={S.titleLine}>{profile.title}</div>}
              {profile.verifiedExpert && (
                <div style={S.verifiedBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Identity Verified</span>
                </div>
              )}
            </div>
          </div>
          {profile.bio && <p style={S.bio}>{profile.bio}</p>}
          {(profile.yearsExperience || profile.credentials) && (
            <div style={S.credentialsLine}>
              {profile.yearsExperience && <span>{profile.yearsExperience} years experience</span>}
              {profile.yearsExperience && profile.credentials && <span style={S.dot}>·</span>}
              {profile.credentials && <span>{profile.credentials}</span>}
            </div>
          )}
        </section>

        {socIICredentials && socIICredentials.length > 0 && (
          <section style={S.section}>
            <h2 style={S.h2}>Credentials</h2>
            <div style={S.credentialsRow}>
              {socIICredentials.map((c) => (
                <a key={c.id} href={`/credential/${c.id}`} style={S.credentialCard}>
                  <div style={S.credentialTier}>SOCIII {c.tier === "advanced" ? "Advanced" : "Certified"} Creator</div>
                  <div style={S.credentialMeta}>
                    Issued {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : "—"}
                  </div>
                  <div style={S.credentialVerifyLink}>Verify →</div>
                </a>
              ))}
            </div>
          </section>
        )}

        {workers && workers.length > 0 && (
          <section style={S.section}>
            <h2 style={S.h2}>Digital Workers by {profile.displayName?.split(" ")[0] || handle}</h2>
            <div style={S.workersGrid}>
              {workers.map((w) => (
                <a key={w.id} href={`/marketplace/${w.slug}`} style={S.workerCard}>
                  {w.logoUrl ? (
                    <img src={w.logoUrl} alt="" style={S.workerLogo} />
                  ) : (
                    <div style={S.workerLogoPlaceholder} />
                  )}
                  <div style={S.workerName}>{w.name}</div>
                  {w.tagline && <div style={S.workerTagline}>{w.tagline}</div>}
                  {w.vertical && <div style={S.workerVertical}>{w.vertical}</div>}
                </a>
              ))}
            </div>
          </section>
        )}

        {(!workers || workers.length === 0) && (
          <section style={S.section}>
            <div style={S.emptyState}>
              {profile.displayName || handle} hasn't published any Digital Workers yet.
            </div>
          </section>
        )}
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
        <a href="/marketplace" style={S.headerLink}>Marketplace</a>
        <a href="/creators" style={S.headerLink}>Creators</a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={S.footer}>
      <span>SOCIII, Inc.</span>
      <span style={S.footerDot}>·</span>
      <a href="/legal/privacy-policy" style={S.footerLink}>Privacy</a>
      <span style={S.footerDot}>·</span>
      <a href="/legal/terms-of-service" style={S.footerLink}>Terms</a>
    </footer>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#0f172a",
  },
  loadingState: { padding: 80, textAlign: "center", color: "#6b7280" },
  notFound: { maxWidth: 480, margin: "100px auto", textAlign: "center", padding: 24 },
  notFoundH1: { fontSize: 28, fontWeight: 700, marginBottom: 12, color: "#0f172a" },
  notFoundSub: { fontSize: 16, color: "#6b7280", marginBottom: 24 },
  btnPrimary: {
    display: "inline-block", background: "#7c3aed", color: "#fff",
    padding: "10px 24px", borderRadius: 8, fontWeight: 600,
    textDecoration: "none", fontSize: 14,
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", borderBottom: "1px solid #f0f0f0", maxWidth: 1200,
    margin: "0 auto", width: "100%", boxSizing: "border-box",
  },
  logoLink: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" },
  logoText: { fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", gap: 24 },
  headerLink: { fontSize: 14, color: "#475569", textDecoration: "none" },

  main: { flex: 1, maxWidth: 880, margin: "0 auto", width: "100%", padding: "48px 32px" },

  heroSection: { marginBottom: 48 },
  heroInner: { display: "flex", gap: 24, alignItems: "center", marginBottom: 20 },
  photo: { width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #f1f5f9" },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    color: "#fff", fontSize: 48, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  identityBlock: { flex: 1 },
  h1: { fontSize: 36, fontWeight: 800, marginBottom: 6, letterSpacing: "-1px", lineHeight: 1.1 },
  titleLine: { fontSize: 16, color: "#475569", marginBottom: 8 },
  verifiedBadge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, color: "#16a34a",
    background: "#dcfce7", padding: "4px 10px", borderRadius: 999,
  },
  bio: { fontSize: 17, lineHeight: 1.6, color: "#334155", marginBottom: 12, maxWidth: 720 },
  credentialsLine: { fontSize: 14, color: "#64748b" },
  dot: { margin: "0 8px" },

  section: { marginBottom: 48 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#0f172a" },

  credentialsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  credentialCard: {
    flex: "0 0 240px", padding: "16px 20px", borderRadius: 12,
    border: "1.5px solid #e2e8f0", background: "#fafafa",
    textDecoration: "none", color: "inherit",
    transition: "border-color 0.15s, background 0.15s",
  },
  credentialTier: { fontSize: 14, fontWeight: 700, color: "#7c3aed", marginBottom: 4 },
  credentialMeta: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  credentialVerifyLink: { fontSize: 13, color: "#7c3aed", fontWeight: 600 },

  workersGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  workerCard: {
    padding: 20, borderRadius: 12, border: "1.5px solid #e2e8f0",
    textDecoration: "none", color: "inherit", background: "#fff",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  workerLogo: { width: 40, height: 40, borderRadius: 8, marginBottom: 12 },
  workerLogoPlaceholder: {
    width: 40, height: 40, borderRadius: 8,
    background: "linear-gradient(135deg, #7c3aed20, #a855f720)",
    marginBottom: 12,
  },
  workerName: { fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#0f172a" },
  workerTagline: { fontSize: 14, color: "#475569", lineHeight: 1.45, marginBottom: 12 },
  workerVertical: {
    fontSize: 11, fontWeight: 600, color: "#7c3aed",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },

  emptyState: { padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 15 },

  footer: {
    padding: "24px 32px", borderTop: "1px solid #f0f0f0",
    fontSize: 13, color: "#94a3b8",
    display: "flex", justifyContent: "center", gap: 4,
  },
  footerDot: { color: "#cbd5e1" },
  footerLink: { color: "#64748b", textDecoration: "none" },
};
