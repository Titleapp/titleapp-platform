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
          <a href={`${appBase}/meet-alex?action=signup`} style={S.headerCta}>Start free</a>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.heroInner}>
          <h1 style={S.heroH1}>AI workers built by domain experts.</h1>
          <p style={S.heroSub}>
            Real estate. Nursing. Aviation. Law. Finance. Each worker knows your industry's rules — not just general AI. Core platform is free. Add specialists as you grow.
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
            <a href={`${appBase}/meet-alex?action=signup`} style={S.subActionPrimary}>Start free</a>
            <a href={`${appBase}/meet-alex?action=signin`} style={S.subActionSecondary}>I already have an account</a>
          </div>
        </div>

        {/* ─── Industry vertical strip ─── */}
        <div style={S.verticalStrip}>
          {[
            { label: "Real Estate", demo: "/demo/nursing", emoji: "🏠" },
            { label: "Education & Nursing", demo: "/demo/nursing", emoji: "🎓" },
            { label: "Aviation", demo: "/demo/nursing", emoji: "✈️" },
            { label: "Legal", demo: null, emoji: "⚖️" },
            { label: "Finance & IR", demo: null, emoji: "📊" },
            { label: "Retail & DPP", demo: null, emoji: "🛍️" },
          ].map(({ label }) => (
            <div key={label} style={S.verticalChip}>
              {label}
            </div>
          ))}
        </div>

        <section style={S.featured}>
          <div style={S.featuredHeading}>
            <h2 style={S.featuredH2}>Top workers today</h2>
            <p style={S.featuredSub}>
              Core workers are free forever. Specialists are flat-rate add-ons — one price, no seats, no contracts.
            </p>
          </div>
          <div style={S.workerList}>
            {FEATURED_WORKERS.map((w, i) => (
              <a key={w.slug} href={`${appBase}/workers/${w.slug}`} style={S.workerRow}>
                <span style={S.workerRowRank}>{i + 1}</span>
                <span style={{ ...S.workerRowAccent, background: w.color }} />
                <span style={S.workerRowName}>{w.name}</span>
                <span style={S.workerRowVertical}>{w.vertical}</span>
                <span style={{ ...S.workerRowPrice, ...(w.priceTier === "Free" ? S.workerPriceBoxFree : {}) }}>
                  {w.priceLabel}
                </span>
                <span style={S.workerRowArrow}>Open →</span>
              </a>
            ))}
          </div>
          <div style={S.featuredCtaRow}>
            <a href={`${appBase}/workers`} style={S.featuredCtaPrimary}>Browse all 1,000+ workers →</a>
            <a href={`${appBase}/pricing`} style={S.featuredCtaSecondary}>See pricing tiers</a>
          </div>
        </section>

        {/* ─── Consumer / B2B delivery story ─── */}
        <section style={{ ...S.frontDoors, maxWidth: 920 }}>
          <div style={S.frontDoorsHeading}>Workers reach your clients too.</div>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 15, marginBottom: 24, marginTop: -8 }}>
            When a business enrolls you — your school, your landlord, your vet — their workers show up in your personal space. Your records, on your terms.
          </p>
          <div style={{ ...S.frontDoorsRow, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <a href={`${appBase}/demo/real-estate`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Real estate demo →</div>
              <div style={S.frontDoorSub}>A full brokerage stack — deal analysis, title, zoning, comparable data, and CE credits. Live ATTOM data, not sample fixtures.</div>
            </a>
            <a href={`${appBase}/demo/vet/client`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Veterinary client demo →</div>
              <div style={S.frontDoorSub}>See what a pet owner sees when their vet runs on SOCIII — visit records, medications, and upcoming care in their personal Vault.</div>
            </a>
            <a href={`${appBase}/investors`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Investors →</div>
              <div style={S.frontDoorSub}>Read the whitepaper, complete KYC, enter the data room. The IR worker handles the introduction and follows up.</div>
            </a>
          </div>
        </section>

        <section style={{ ...S.frontDoors, maxWidth: 920 }}>
          <div style={S.frontDoorsHeading}>For creators and builders.</div>
          <div style={S.frontDoorsRow}>
            <a href={`${appBase}/onboard/creator`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Become a creator</div>
              <div style={S.frontDoorSub}>Package your domain expertise into a worker. Self-service onboarding, your own branding, your own pricing. We handle delivery.</div>
            </a>
            <a href={`${appBase}/docs/what-is-sociii`} style={S.frontDoorCard}>
              <div style={S.frontDoorTitle}>Developer SDK</div>
              <div style={S.frontDoorSub}>Build on the SOCIII platform. Open SDK, versioned spec contracts, MCP server, and a full capability registry. Ship your first worker in a day.</div>
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
            <a href="https://github.com/SOCIII-Inc/sociii-sdk" target="_blank" rel="noopener" style={S.footerLink}>GitHub</a>
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

  verticalStrip: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
    maxWidth: 720,
    margin: "-16px auto 0",
  },
  verticalChip: {
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5563",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: "7px 16px",
    display: "flex",
    alignItems: "center",
  },

  featured: { width: "100%", maxWidth: 1200, margin: "0 auto" },
  featuredHeading: { textAlign: "center", marginBottom: 28 },
  featuredH2: { fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 8, letterSpacing: "-0.6px" },
  featuredSub: { fontSize: 15, color: "#6b7280", margin: "0 0 16px" },
  workerList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    marginBottom: 28,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
  },
  workerRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "13px 20px",
    textDecoration: "none",
    color: "inherit",
    borderBottom: "1px solid #f3f4f6",
    transition: "background 0.12s",
  },
  workerRowRank: { fontSize: 12, fontWeight: 700, color: "#d1d5db", width: 18, textAlign: "right", flexShrink: 0 },
  workerRowAccent: { width: 4, height: 28, borderRadius: 3, flexShrink: 0 },
  workerRowName: { fontSize: 15, fontWeight: 700, color: "#111827", flex: "1 1 180px", minWidth: 0 },
  workerRowVertical: { fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", flex: "0 0 140px" },
  workerRowPrice: {
    fontSize: 12,
    fontWeight: 800,
    color: "#7c3aed",
    background: "#ede9fe",
    padding: "4px 10px",
    borderRadius: 8,
    flexShrink: 0,
  },
  workerPriceBoxFree: {
    color: "#15803d",
    background: "#dcfce7",
  },
  workerRowArrow: { fontSize: 13, color: "#7c3aed", fontWeight: 600, flexShrink: 0, marginLeft: "auto" },
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
