import React from "react";

// ── TitleApp Landing Page ─────────────────────────────────────────
// Dark premium aesthetic. Four vertical CTAs. No auth — that happens on /meet-alex.

const VERTICALS = [
  { label: "Aviation", desc: "CoPilots for PC12-NG, King Air, Caravan, and more. Logbook, currency, training.", param: "aviation", count: "56 workers" },
  { label: "Auto Dealer", desc: "F&I, deal jacket, inventory, compliance. Every phase of the deal lifecycle.", param: "auto-dealer", count: "29 workers" },
  { label: "Real Estate", desc: "Title search, closing coordination, compliance monitoring. 8 development phases.", param: "real-estate", count: "67 workers" },
  { label: "Web3", desc: "Tokenomics, regulatory compliance, community management. Team verification built in.", param: "web3", count: "11 workers" },
];

const STATS = [
  { num: "1,000+", label: "Digital Workers" },
  { num: "14", label: "Industry Suites" },
  { num: "54", label: "Countries" },
  { num: "24/7", label: "Always On" },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Pick a worker", desc: "Browse by industry. Every worker is trained on the rules of your field." },
  { step: "2", title: "Start free", desc: "14-day free trial. No credit card. Cancel anytime." },
  { step: "3", title: "Work gets done", desc: "Your Digital Worker handles the compliance-heavy work. You keep the audit trail." },
];

export default function LandingPage() {
  const appBase = window.location.hostname === "localhost"
    ? ""
    : "https://app.titleapp.ai";

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <span style={S.logoText}>TitleApp</span>
        </div>
        <div style={S.headerRight}>
          <a href={`${appBase}/meet-alex`} style={S.headerLink}>Meet Alex</a>
          <a href={`${appBase}/sandbox`} style={S.headerLink}>Creators</a>
          <a href={`${appBase}/meet-alex`} style={S.headerCta}>Start Free</a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroTag}>The Digital Worker Platform</div>
          <h1 style={S.heroH1}>They're on your team now.</h1>
          <p style={S.heroSub}>Real expertise. On call. Forever.</p>
          <p style={S.heroBody}>
            Digital Workers handle the compliance-heavy work in regulated industries.
            Trained on the rules of your field. Audit trail on every output.
          </p>
          <div style={S.heroCtas}>
            <a href={`${appBase}/meet-alex`} style={S.btnPrimary}>Meet Your Team</a>
            <a href="#verticals" style={S.btnSecondary}>Browse Industries</a>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={S.statsBar}>
        <div style={S.statsInner}>
          {STATS.map(s => (
            <div key={s.label} style={S.statItem}>
              <div style={S.statNum}>{s.num}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Verticals ── */}
      <section id="verticals" style={S.section}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Choose your industry.</h2>
          <p style={S.sectionSub}>Every vertical has dedicated Digital Workers built by people who know the rules.</p>
          <div style={S.verticalGrid}>
            {VERTICALS.map(v => (
              <a key={v.param} href={`${appBase}/meet-alex?vertical=${v.param}&v=2`} style={S.verticalCard}>
                <div style={S.verticalName}>{v.label}</div>
                <div style={S.verticalDesc}>{v.desc}</div>
                <div style={S.verticalFooter}>
                  <span style={S.verticalCount}>{v.count}</span>
                  <span style={S.verticalArrow}>&rarr;</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ ...S.section, background: "#0d0d1a" }}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Three steps. Under 60 seconds.</h2>
          <div style={S.stepsGrid}>
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} style={S.stepCard}>
                <div style={S.stepNum}>{h.step}</div>
                <div style={S.stepTitle}>{h.title}</div>
                <div style={S.stepDesc}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alex ── */}
      <section style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.alexCard}>
            <div style={S.alexAvatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div style={S.alexName}>Alex</div>
              <div style={S.alexRole}>Chief of Staff</div>
            </div>
            <div style={S.alexBody}>
              Alex is your first hire. Free on every account. She knows every worker in the marketplace,
              helps you pick the right ones for your field, and coordinates everything once they're on your team.
            </div>
            <a href={`${appBase}/meet-alex`} style={S.btnPrimary}>Talk to Alex</a>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ ...S.section, background: "#0d0d1a" }}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Simple pricing. No surprises.</h2>
          <p style={S.sectionSub}>Every worker includes a 14-day free trial. No credit card required.</p>
          <div style={S.pricingGrid}>
            {[
              { tier: "Free", price: "$0", desc: "Digital Logbook, Currency Tracker, Alex. Always free." },
              { tier: "Standard", price: "$29/mo", desc: "Single-domain workers. My Aircraft, Training & Proficiency, and more." },
              { tier: "Professional", price: "$49/mo", desc: "Multi-domain workers. Title Search, F&I Products, Tokenomics Analyst." },
              { tier: "Enterprise", price: "$79/mo", desc: "Type-specific CoPilots. PC12-NG, King Air B200, King Air 350, C90GTx, Caravan 208B." },
            ].map(p => (
              <div key={p.tier} style={S.priceCard}>
                <div style={S.priceTier}>{p.tier}</div>
                <div style={S.priceAmount}>{p.price}</div>
                <div style={S.priceDesc}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={S.finalCta}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "white", marginBottom: 8 }}>Meet your team at TitleApp.</h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 28 }}>Start free. No credit card. Workers ready in seconds.</p>
        <a href={`${appBase}/meet-alex`} style={{ ...S.btnPrimary, fontSize: 16, padding: "14px 36px" }}>Start Free</a>
      </section>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>
            <span style={{ fontWeight: 700, color: "white" }}>TitleApp</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: 8 }}>The Digital Worker Platform</span>
          </div>
          <div style={S.footerLinks}>
            <a href={`${appBase}/legal/privacy-policy`} style={S.footerLink}>Privacy</a>
            <a href={`${appBase}/legal/terms-of-service`} style={S.footerLink}>Terms</a>
            <a href={`${appBase}/meet-alex?prompt=I%20want%20to%20invest`} style={S.footerLink}>Investors</a>
            <a href={`${appBase}/sandbox`} style={S.footerLink}>Creators</a>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            The Title App LLC &middot; 1209 N Orange St, Wilmington DE 19801
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh", background: "#0a0a14",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "white", overflowX: "hidden",
  },

  // Header
  header: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 32px", background: "rgba(10,10,20,0.9)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 24 },
  headerLink: { fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none" },
  headerCta: {
    fontSize: 14, fontWeight: 600, color: "white", textDecoration: "none",
    padding: "8px 20px", borderRadius: 8, background: "#7c3aed",
  },

  // Hero
  hero: {
    paddingTop: 140, paddingBottom: 80,
    background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)",
  },
  heroInner: { maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "0 24px" },
  heroTag: {
    fontSize: 13, fontWeight: 600, color: "#7c3aed", letterSpacing: "0.05em",
    textTransform: "uppercase", marginBottom: 20,
  },
  heroH1: { fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 12, color: "white", letterSpacing: "-1px" },
  heroSub: { fontSize: 22, color: "rgba(255,255,255,0.5)", marginBottom: 20, fontWeight: 400 },
  heroBody: { fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 32, maxWidth: 560, margin: "0 auto 32px" },
  heroCtas: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: {
    display: "inline-block", padding: "12px 28px", fontSize: 15, fontWeight: 600,
    color: "white", background: "#7c3aed", borderRadius: 10, textDecoration: "none",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  btnSecondary: {
    display: "inline-block", padding: "12px 28px", fontSize: 15, fontWeight: 600,
    color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, textDecoration: "none",
  },

  // Stats
  statsBar: { borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  statsInner: {
    maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around",
    padding: "28px 24px", flexWrap: "wrap", gap: 16,
  },
  statItem: { textAlign: "center", minWidth: 100 },
  statNum: { fontSize: 28, fontWeight: 800, color: "white" },
  statLabel: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  // Sections
  section: { padding: "72px 24px", background: "#0a0a14" },
  sectionInner: { maxWidth: 960, margin: "0 auto" },
  sectionH2: { fontSize: 32, fontWeight: 800, color: "white", textAlign: "center", marginBottom: 8 },
  sectionSub: { fontSize: 16, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 40 },

  // Vertical cards
  verticalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  verticalCard: {
    display: "block", padding: "24px 20px", borderRadius: 14,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    textDecoration: "none", transition: "border-color 0.2s, background 0.2s",
    cursor: "pointer",
  },
  verticalName: { fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 },
  verticalDesc: { fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 16 },
  verticalFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  verticalCount: { fontSize: 12, color: "#7c3aed", fontWeight: 600 },
  verticalArrow: { fontSize: 16, color: "#7c3aed" },

  // Steps
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 },
  stepCard: { padding: "28px 24px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" },
  stepNum: { fontSize: 32, fontWeight: 800, color: "#7c3aed", marginBottom: 12 },
  stepTitle: { fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 },
  stepDesc: { fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 },

  // Alex
  alexCard: {
    maxWidth: 560, margin: "0 auto", padding: "32px 28px", borderRadius: 16,
    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
    textAlign: "center",
  },
  alexAvatar: {
    width: 56, height: 56, borderRadius: "50%", margin: "0 auto 8px",
    background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  alexName: { fontSize: 18, fontWeight: 700, color: "white" },
  alexRole: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 },
  alexBody: { fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 20 },

  // Pricing
  pricingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 },
  priceCard: {
    padding: "24px 20px", borderRadius: 14,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
  },
  priceTier: { fontSize: 13, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  priceAmount: { fontSize: 28, fontWeight: 800, color: "white", marginBottom: 8 },
  priceDesc: { fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 },

  // Final CTA
  finalCta: {
    padding: "72px 24px", textAlign: "center",
    background: "radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.12) 0%, transparent 70%)",
  },

  // Footer
  footer: { padding: "32px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  footerInner: {
    maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 12, textAlign: "center",
  },
  footerBrand: { fontSize: 15 },
  footerLinks: { display: "flex", gap: 20 },
  footerLink: { fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" },
};
