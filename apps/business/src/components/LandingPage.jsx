import React, { useState, useRef, useCallback } from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const FEATURED_WORKERS = [
  {
    slug: "chief-of-staff",
    name: "Alex — Chief of Staff",
    vertical: "Platform",
    tagline: "Orchestrates every worker you subscribe to. Daily briefing, anomaly alerts, cross-worker context.",
    replaces: "Replaces a fractional Chief of Staff",
    priceTier: "Free",
    priceLabel: "Free",
    color: "#16a34a",
  },
  {
    slug: "accounting",
    name: "Accounting",
    vertical: "Platform",
    tagline: "P&L, burn, runway, bank reconciliation, monthly close. Controller-pattern guardrails.",
    replaces: "Replaces an accounting platform + a bookkeeper",
    priceTier: "Free",
    priceLabel: "Free",
    color: "#16a34a",
  },
  {
    slug: "platform-marketing",
    name: "Marketing",
    vertical: "Platform",
    tagline: "Campaign orchestration, brand voice, asset registry, ad copy, email sequences.",
    replaces: "Replaces a marketing platform + a junior marketer",
    priceTier: "Free",
    priceLabel: "Free",
    color: "#16a34a",
  },
  {
    slug: "scheduling",
    name: "Scheduling",
    vertical: "General",
    tagline: "Calendar coordination, meeting prep, follow-up reminders, time-zone math.",
    replaces: "Replaces a scheduling tool + admin overhead",
    priceTier: "$29",
    priceLabel: "$29 / mo",
    color: "#0ea5e9",
  },
  {
    slug: "paralegal",
    name: "Paralegal",
    vertical: "Legal",
    tagline: "Multi-party legal instruments papered, cross-doc validated, signature-package-ready.",
    replaces: "Replaces a paralegal at $4K/mo",
    priceTier: "$49",
    priceLabel: "$49 / mo",
    color: "#7c3aed",
  },
  {
    slug: "patent",
    name: "Patent Worker",
    vertical: "Legal · IP",
    tagline: "Provisional drafts, deadline tracking, family tree, grace-period hard-stops.",
    replaces: "Replaces docketing software + IP paralegal hours",
    priceTier: "$79",
    priceLabel: "$79 / mo",
    color: "#7c3aed",
  },
  {
    slug: "fundraise",
    name: "Investor Relations",
    vertical: "Banking & Finance",
    tagline: "Pipeline CRM, data room, SAFE generation, investor voting, cap-table integration.",
    replaces: "Replaces a cap-table tool + a DocSend + a junior IR person",
    priceTier: "$79",
    priceLabel: "$79 / mo",
    color: "#0ea5e9",
  },
  {
    slug: "cre-analyst",
    name: "CRE Deal Analyst",
    vertical: "Real Estate",
    tagline: "Evidence-first deal analysis in minutes — feasibility to underwriting, with comparables.",
    replaces: "Replaces a junior analyst + a deal-modeling platform",
    priceTier: "$79",
    priceLabel: "$79 / mo",
    color: "#dc2626",
  },
  {
    slug: "av-mission-builder",
    name: "Mission Builder",
    vertical: "Aviation · Part 135",
    tagline: "Every mission authorized with full context — crew, aircraft, weather, risk score, MEL check.",
    replaces: "Replaces a dispatch platform + a part-time dispatcher",
    priceTier: "$79",
    priceLabel: "$79 / mo",
    color: "#f59e0b",
  },
  {
    slug: "litigation-discovery",
    name: "Litigation Discovery",
    vertical: "Legal Enforcement",
    tagline: "RESPA Section 8 + AfBA pattern detection, evidence packaging, demand-letter generation.",
    replaces: "Replaces document review hours + outside discovery services",
    priceTier: "$79",
    priceLabel: "$79 / mo",
    color: "#7c3aed",
  },
];

const PRICE_TIERS = ["Free", "$29", "$49", "$79", "Business in a Box"];

export default function LandingPage() {
  const appBase = window.location.hostname === "localhost"
    ? ""
    : window.location.origin;

  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [fading, setFading] = useState(false);
  const [fadeVisible, setFadeVisible] = useState(false);
  const recognitionRef = useRef(null);

  function navigateWithFade(url) {
    setFading(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeVisible(true));
    });
    setTimeout(() => { window.location.href = url; }, 400);
  }

  function handleSubmit() {
    const text = query.trim();
    if (!text) return;
    navigateWithFade(`${appBase}/meet-alex?prompt=${encodeURIComponent(text)}`);
  }

  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  return (
    <div style={S.page}>
      {fading && (
        <div style={{
          position: "fixed", inset: 0, background: "#ffffff", zIndex: 9999,
          opacity: fadeVisible ? 1 : 0, transition: "opacity 350ms ease",
        }} />
      )}

      <header style={S.header}>
        <div style={S.logoWrap}>
          <img src={sociiiMarkUrl} alt="SOCIII" width={32} height={32} style={{ display: "block" }} />
          <span style={S.logoText}>SOCIII</span>
        </div>
        <div style={S.headerRight}>
          <a href={`${appBase}/workers`} style={S.headerLink}>Workers</a>
          <a href={`${appBase}/pricing`} style={S.headerLink}>Pricing</a>
          <a href={`${appBase}/work`} target="_blank" rel="noopener" style={S.headerLink}>OF for Smart People ↗</a>
          <a href={`${appBase}/investors`} style={S.headerLink}>Investors</a>
          <a href={`${appBase}/meet-alex?action=signin`} style={S.headerLink}>Sign in</a>
          <a href={`${appBase}/meet-alex`} style={S.headerCta}>Start free</a>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.heroInner}>
          <h1 style={S.heroH1}>Digital Workers for the work that matters.</h1>
          <p style={S.heroSub}>
            Built by the experts in your field. Trained on the rules of your industry. The spine is free.
          </p>

          <div style={S.chatBar}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask Alex anything..."
              autoFocus
              style={S.chatInput}
            />
            <button
              type="button"
              onClick={toggleMic}
              style={{ ...S.chatBtn, color: listening ? "#7c3aed" : "#9ca3af" }}
              title="Voice input"
              aria-label="Voice input"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!query.trim()}
              style={{ ...S.chatBtn, color: query.trim() ? "#7c3aed" : "#d1d5db" }}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <div style={S.subActions}>
            <a href={`${appBase}/meet-alex`} style={S.subActionPrimary}>Start free</a>
            <a href={`${appBase}/meet-alex?action=signin`} style={S.subActionSecondary}>I already have an account</a>
          </div>
        </div>

        <section style={S.featured}>
          <div style={S.featuredHeading}>
            <h2 style={S.featuredH2}>Top 10 workers today</h2>
            <p style={S.featuredSub}>
              The SOCIII spine is free. Specialist workers are discrete products at flat prices.
            </p>
            <div style={S.tierLadder}>
              {PRICE_TIERS.map((t) => (
                <span key={t} style={S.tierChip}>{t}</span>
              ))}
            </div>
          </div>
          <div style={S.workerGrid}>
            {FEATURED_WORKERS.map((w) => (
              <a key={w.slug} href={`${appBase}/workers/${w.slug}`} style={S.workerCard}>
                <div style={{ ...S.workerCardAccent, background: w.color }} />
                <div style={S.workerCardBody}>
                  <div style={S.workerHeaderRow}>
                    <div style={S.workerVertical}>{w.vertical}</div>
                    <div style={{ ...S.workerPriceBox, ...(w.priceTier === "Free" ? S.workerPriceBoxFree : {}) }}>
                      {w.priceLabel}
                    </div>
                  </div>
                  <div style={S.workerName}>{w.name}</div>
                  <div style={S.workerTagline}>{w.tagline}</div>
                  <div style={S.workerReplaces}>{w.replaces}</div>
                  <div style={S.workerFooter}>
                    <span style={S.workerArrow}>Open →</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div style={S.featuredCtaRow}>
            <a href={`${appBase}/workers`} style={S.featuredCtaPrimary}>Browse all 1,000+ workers →</a>
            <a href={`${appBase}/pricing`} style={S.featuredCtaSecondary}>See pricing tiers</a>
          </div>
        </section>

        <section style={S.frontDoors}>
          <div style={S.frontDoorsHeading}>For investors and creators.</div>
          <div style={S.frontDoorsRow}>
            <a href={`${appBase}/investors`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Investors</div>
              <div style={S.frontDoorSub}>Read the whitepaper, complete KYC, enter the data room. The IR worker handles the introduction and follows up.</div>
            </a>
            <a href={`${appBase}/onboard/creator`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Become a creator</div>
              <div style={S.frontDoorSub}>Build your own digital worker on the SDK. Self-service onboarding for domain experts who want to package their expertise into a worker.</div>
            </a>
          </div>
        </section>
      </main>

      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>SOCIII, Inc.</div>
          <div style={S.footerLinks}>
            <a href={`${appBase}/workers`} style={S.footerLink}>Workers</a>
            <a href={`${appBase}/pricing`} style={S.footerLink}>Pricing</a>
            <a href={`${appBase}/whitepaper`} style={S.footerLink}>Whitepaper</a>
            <a href={`${appBase}/docs/what-is-sociii`} style={S.footerLink}>SDK</a>
            <a href={`${appBase}/docs/api`} style={S.footerLink}>API</a>
            <a href={`${appBase}/docs`} style={S.footerLink}>Docs</a>
            <a href={`${appBase}/press`} style={S.footerLink}>Press</a>
            <a href={`${appBase}/investors`} style={S.footerLink}>Investors</a>
            <a href={`${appBase}/legal/privacy-policy`} style={S.footerLink}>Privacy</a>
            <a href={`${appBase}/legal/terms-of-service`} style={S.footerLink}>Terms</a>
          </div>
          <div style={S.footerSocials}>
            <a href="https://x.com/sociiiai" target="_blank" rel="noopener" style={S.footerLink}>X</a>
            <a href="https://linkedin.com/company/sociii-inc/" target="_blank" rel="noopener" style={S.footerLink}>LinkedIn</a>
            <a href="https://github.com/sociii" target="_blank" rel="noopener" style={S.footerLink}>GitHub</a>
            <a href="https://www.youtube.com/@SOCIII-AI" target="_blank" rel="noopener" style={S.footerLink}>YouTube</a>
            <a href="https://www.tiktok.com/@sociii.official" target="_blank" rel="noopener" style={S.footerLink}>TikTok</a>
          </div>
          <div style={S.footerAddress}>
            1810 E Sahara Ave Ste 75942, Las Vegas NV 89104
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px",
    borderBottom: "1px solid #f0f0f0",
    flexWrap: "wrap",
    gap: 16,
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoText: { fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  headerLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  headerCta: {
    fontSize: 14,
    fontWeight: 600,
    color: "white",
    textDecoration: "none",
    padding: "8px 20px",
    borderRadius: 8,
    background: "#7c3aed",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "48px 24px 64px",
    gap: 56,
  },
  heroInner: { maxWidth: 640, width: "100%", textAlign: "center" },

  heroH1: {
    fontSize: 44,
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 16,
    color: "#111827",
    letterSpacing: "-1px",
  },
  heroSub: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 32,
    lineHeight: 1.5,
  },

  chatBar: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    maxWidth: 560,
    margin: "0 auto 24px",
    padding: "4px 4px 4px 20px",
    borderRadius: 16,
    border: "2px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  chatInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#111827",
    background: "transparent",
    padding: "12px 0",
    fontFamily: "inherit",
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  subActions: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  subActionPrimary: {
    background: "#7c3aed",
    color: "white",
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
  },
  subActionSecondary: {
    color: "#6b7280",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },

  featured: { width: "100%", maxWidth: 1200, margin: "0 auto" },
  featuredHeading: { textAlign: "center", marginBottom: 28 },
  featuredH2: { fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 8, letterSpacing: "-0.6px" },
  featuredSub: { fontSize: 15, color: "#6b7280", margin: "0 0 16px" },
  tierLadder: { display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  tierChip: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    background: "#f3f4f6",
    padding: "6px 14px",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
  },
  workerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  workerCard: {
    display: "flex",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.15s, transform 0.15s",
  },
  workerCardAccent: { width: 6 },
  workerCardBody: { flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column" },
  workerHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12 },
  workerVertical: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase" },
  workerPriceBox: {
    fontSize: 12,
    fontWeight: 800,
    color: "#7c3aed",
    background: "#ede9fe",
    padding: "4px 10px",
    borderRadius: 8,
    letterSpacing: "-0.2px",
  },
  workerPriceBoxFree: {
    color: "#15803d",
    background: "#dcfce7",
  },
  workerName: { fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 6 },
  workerTagline: { fontSize: 13, color: "#6b7280", lineHeight: 1.45, marginBottom: 10, minHeight: 56 },
  workerReplaces: { fontSize: 12, color: "#374151", fontStyle: "italic", marginBottom: 14, lineHeight: 1.4 },
  workerFooter: { display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: "auto" },
  workerArrow: { fontSize: 14, color: "#7c3aed", fontWeight: 600 },
  featuredCtaRow: { display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  featuredCtaPrimary: { color: "#7c3aed", fontSize: 15, fontWeight: 600, textDecoration: "none" },
  featuredCtaSecondary: { color: "#6b7280", fontSize: 14, textDecoration: "none" },

  frontDoors: { width: "100%", maxWidth: 920, margin: "0 auto" },
  frontDoorsHeading: { textAlign: "center", fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 20, letterSpacing: "-0.4px" },
  frontDoorsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 },
  frontDoorCard: {
    display: "block",
    padding: "24px 28px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    textDecoration: "none",
    color: "inherit",
    background: "white",
    textAlign: "left",
    transition: "border-color 0.15s",
  },
  frontDoorTitle: { fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 },
  frontDoorSub: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },

  footer: {
    borderTop: "1px solid #f0f0f0",
    padding: "24px 32px",
  },
  footerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  footerBrand: { fontWeight: 700, color: "#111827", fontSize: 14 },
  footerLinks: { display: "flex", gap: 16, flexWrap: "wrap" },
  footerSocials: { display: "flex", gap: 12, flexWrap: "wrap" },
  footerLink: { color: "#6b7280", textDecoration: "none", fontSize: 13 },
  footerAddress: { fontSize: 12, color: "#9ca3af" },
};
