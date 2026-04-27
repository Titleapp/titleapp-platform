import React, { useEffect, useRef } from "react";

// ── Campaign Concepts ────────────────────────────────────────────
const CONCEPTS = {
  onlyfans: {
    id: "onlyfans",
    headlines: {
      realestate: "She makes $47K/month from her couch.",
      auto: "He quit the dealership. Now he makes $38K/month from his phone.",
      aviation: "He left the airline. Now he makes $52K/month from his hangar.",
    },
    subhead: "Brains pay better than botox. Your expertise is worth more than your salary. Package what you know into a Digital Worker and earn while you sleep.",
    badge: "OnlyFans for Smart People",
  },
  power: {
    id: "power",
    headlines: {
      realestate: "Workers of the world, build.",
      auto: "Workers of the world, build.",
      aviation: "Workers of the world, build.",
    },
    subhead: "The skilled workers are done waiting. Done asking permission. Done making someone else rich. Build your own Digital Worker. Set your own price. Keep 75%.",
    badge: "Power to the Workers",
  },
  hateboss: {
    id: "hateboss",
    headlines: {
      realestate: "Your broker hasn't closed a deal in years.",
      auto: "Your GM hasn't sold a car since 2019.",
      aviation: "Your chief pilot hasn't flown a line trip in a decade.",
    },
    subhead: "You do the work. They take the cut. What if you could package everything you know, publish it, and keep 75% of every subscription? No boss. No split. No ceiling.",
    badge: "Hate Your Boss",
  },
};

// ── Vertical Configs ─────────────────────────────────────────────
const VERTICALS = {
  realestate: {
    label: "Real Estate",
    workers: [
      { name: "CRE Deal Analyst", desc: "Screens deals, models returns, flags risks before you commit capital.", price: "$49/mo" },
      { name: "Construction Manager", desc: "Tracks draws, inspections, permits, and contractor compliance.", price: "$49/mo" },
      { name: "Property Management", desc: "Tenant comms, maintenance coordination, lease compliance.", price: "$49/mo" },
      { name: "Title & Escrow", desc: "Title search, escrow tracking, settlement coordination.", price: "$49/mo" },
    ],
  },
  auto: {
    label: "Auto Dealer",
    workers: [
      { name: "Dealer Licensing & Compliance", desc: "DMV filings, plate tracking, title work, audit-ready records.", price: "$49/mo" },
      { name: "Service Scheduling", desc: "Appointment flow, bay allocation, parts ordering.", price: "$49/mo" },
      { name: "F&I Compliance", desc: "Deal structuring, lender matching, adverse action tracking.", price: "$49/mo" },
      { name: "Lead Management & BDC", desc: "Lead capture, follow-up cadence, appointment setting.", price: "$49/mo" },
    ],
  },
  aviation: {
    label: "Aviation",
    workers: [
      { name: "PC12-NG CoPilot", desc: "Type-specific procedures, checklists, and FARs for Pilatus PC-12.", price: "$79/mo" },
      { name: "Digital Logbook", desc: "ForeFlight import, currency tracking, 8710 builder.", price: "Free" },
      { name: "Training & Proficiency", desc: "Recurrent tracking, checkride prep, endorsement management.", price: "$29/mo" },
      { name: "Flight Planning", desc: "Risk assessment, weather analysis, fuel planning.", price: "$29/mo" },
    ],
  },
};

// ── Styles ────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: 0, zIndex: 10 },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none" },
  navCta: { fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", padding: "8px 20px", borderRadius: 8, textDecoration: "none", border: "none", cursor: "pointer" },

  hero: { maxWidth: 720, margin: "0 auto", padding: "80px 24px 48px", textAlign: "center" },
  badge: { display: "inline-block", fontSize: 12, fontWeight: 600, color: "#7c3aed", background: "#f3f0ff", padding: "6px 14px", borderRadius: 20, marginBottom: 20, letterSpacing: "0.02em", textTransform: "uppercase" },
  h1: { fontSize: 42, fontWeight: 700, color: "#111827", lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.02em" },
  subhead: { fontSize: 18, color: "#4b5563", lineHeight: 1.6, marginBottom: 40, maxWidth: 580, margin: "0 auto 40px" },
  ctaRow: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" },
  primaryBtn: { fontSize: 16, fontWeight: 600, color: "#fff", background: "#7c3aed", padding: "14px 32px", borderRadius: 10, border: "none", cursor: "pointer", textDecoration: "none" },
  secondaryBtn: { fontSize: 14, fontWeight: 500, color: "#7c3aed", background: "transparent", padding: "14px 24px", borderRadius: 10, border: "1px solid #e5e7eb", cursor: "pointer", textDecoration: "none" },

  // Pricing
  pricingSection: { maxWidth: 880, margin: "0 auto", padding: "64px 24px 48px", textAlign: "center" },
  pricingSectionTitle: { fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8, letterSpacing: "-0.01em" },
  pricingSectionSub: { fontSize: 15, color: "#6b7280", marginBottom: 40 },
  pricingGrid: { display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" },
  pricingCard: { flex: "1 1 240px", maxWidth: 280, border: "1px solid #e5e7eb", borderRadius: 14, padding: "28px 24px", background: "#fafbfc", textAlign: "left", position: "relative" },
  pricingCardFeatured: { flex: "1 1 240px", maxWidth: 280, border: "2px solid #7c3aed", borderRadius: 14, padding: "28px 24px", background: "#faf8ff", textAlign: "left", position: "relative" },
  pricingName: { fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 },
  pricingPrice: { fontSize: 32, fontWeight: 700, color: "#111827", marginBottom: 4 },
  pricingPer: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  pricingFeature: { fontSize: 13, color: "#4b5563", padding: "4px 0", display: "flex", alignItems: "flex-start", gap: 8 },
  pricingCheck: { color: "#7c3aed", flexShrink: 0, marginTop: 2 },
  recommendedBadge: { position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, color: "#fff", background: "#7c3aed", padding: "4px 14px", borderRadius: 12, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" },

  // Workers
  workersSection: { maxWidth: 960, margin: "0 auto", padding: "48px 24px 64px" },
  workersSectionTitle: { fontSize: 22, fontWeight: 600, color: "#111827", textAlign: "center", marginBottom: 8 },
  workersSectionSub: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  workerGrid: { display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" },
  workerCard: { flex: "1 1 200px", maxWidth: 220, border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fafbfc" },
  workerName: { fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 6 },
  workerDesc: { fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 10 },
  workerPrice: { fontSize: 13, fontWeight: 600, color: "#7c3aed" },

  // Trust
  trustSection: { textAlign: "center", padding: "32px 24px 64px" },
  trustItem: { fontSize: 14, color: "#6b7280", marginBottom: 6 },

  // Footer CTA
  ctaBlock: { textAlign: "center", padding: "48px 24px 80px", background: "#faf8ff", borderTop: "1px solid #f3f0ff" },
  ctaBlockH2: { fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 12 },
  ctaBlockSub: { fontSize: 15, color: "#6b7280", marginBottom: 28 },

  footer: { textAlign: "center", padding: "24px", borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#94a3b8" },
};

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={S.pricingCheck}><polyline points="20 6 9 17 4 12"/></svg>
);

// ── StartPage Component ──────────────────────────────────────────
export default function StartPage() {
  const logged = useRef(false);
  const params = new URLSearchParams(window.location.search);
  const conceptKey = params.get("utm_campaign") || "power";
  const verticalKey = params.get("utm_content") || "realestate";

  const concept = CONCEPTS[conceptKey] || CONCEPTS.power;
  const vertical = VERTICALS[verticalKey] || VERTICALS.realestate;
  const headline = concept.headlines[verticalKey] || concept.headlines.realestate;

  // Capture UTM on mount
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    const utm = {
      source: params.get("utm_source") || "start",
      medium: params.get("utm_medium") || "landing",
      campaign: conceptKey,
      content: verticalKey,
      capturedAt: new Date().toISOString(),
    };
    if (!sessionStorage.getItem("ta_utm")) {
      sessionStorage.setItem("ta_utm", JSON.stringify(utm));
    }
  }, []);

  function handleCta() {
    const q = new URLSearchParams();
    q.set("utm_source", "start");
    q.set("utm_campaign", conceptKey);
    q.set("utm_content", verticalKey);
    window.location.href = "/meet-alex?" + q.toString();
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        <button onClick={handleCta} style={S.navCta}>Get Started Free</button>
      </nav>

      {/* Hero */}
      <section style={S.hero}>
        <div style={S.badge}>{concept.badge}</div>
        <h1 style={S.h1}>{headline}</h1>
        <p style={S.subhead}>{concept.subhead}</p>
        <div style={S.ctaRow}>
          <button onClick={handleCta} style={S.primaryBtn}>Start Free — No Credit Card</button>
          <a href="/meet-alex" style={S.secondaryBtn}>Talk to Alex first</a>
        </div>
      </section>

      {/* Pricing */}
      <section style={S.pricingSection}>
        <h2 style={S.pricingSectionTitle}>Simple, transparent pricing</h2>
        <p style={S.pricingSectionSub}>14-day free trial on every plan. No credit card required.</p>
        <div style={S.pricingGrid}>
          {/* Free */}
          <div style={S.pricingCard}>
            <div style={S.pricingName}>Free</div>
            <div style={S.pricingPrice}>$0</div>
            <div style={S.pricingPer}>forever</div>
            <div style={S.pricingFeature}><CheckIcon /> Alex, your Chief of Staff</div>
            <div style={S.pricingFeature}><CheckIcon /> 100 inference credits/mo</div>
            <div style={S.pricingFeature}><CheckIcon /> Digital Logbook (aviation)</div>
            <div style={S.pricingFeature}><CheckIcon /> Vault storage</div>
          </div>

          {/* Individual */}
          <div style={S.pricingCard}>
            <div style={S.pricingName}>Individual Workers</div>
            <div style={S.pricingPrice}>$29-79</div>
            <div style={S.pricingPer}>per worker / month</div>
            <div style={S.pricingFeature}><CheckIcon /> Pick exactly what you need</div>
            <div style={S.pricingFeature}><CheckIcon /> 500-3,000 credits/mo</div>
            <div style={S.pricingFeature}><CheckIcon /> Full worker capabilities</div>
            <div style={S.pricingFeature}><CheckIcon /> Mix and match verticals</div>
          </div>

          {/* Business in a Box */}
          <div style={S.pricingCardFeatured}>
            <div style={S.recommendedBadge}>Recommended</div>
            <div style={S.pricingName}>Business in a Box</div>
            <div style={S.pricingPrice}>$99</div>
            <div style={S.pricingPer}>per month — that's $3/day</div>
            <div style={S.pricingFeature}><CheckIcon /> Accounting, Marketing, HR, Contacts</div>
            <div style={S.pricingFeature}><CheckIcon /> Control Center Pro</div>
            <div style={S.pricingFeature}><CheckIcon /> 15-20 workers included</div>
            <div style={S.pricingFeature}><CheckIcon /> Everything a small business needs</div>
          </div>
        </div>
      </section>

      {/* Vertical Workers */}
      <section style={S.workersSection}>
        <h3 style={S.workersSectionTitle}>{vertical.label} Digital Workers</h3>
        <p style={S.workersSectionSub}>Specialized AI that actually knows the rules of your industry.</p>
        <div style={S.workerGrid}>
          {vertical.workers.map((w) => (
            <div key={w.name} style={S.workerCard}>
              <div style={S.workerName}>{w.name}</div>
              <div style={S.workerDesc}>{w.desc}</div>
              <div style={S.workerPrice}>{w.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section style={S.trustSection}>
        <div style={S.trustItem}>14-day free trial — no credit card required</div>
        <div style={S.trustItem}>Rules-first AI. Every answer sourced. Nothing made up.</div>
        <div style={S.trustItem}>Switzerland, not Disneyland. Professional tools for professionals.</div>
      </section>

      {/* Bottom CTA */}
      <section style={S.ctaBlock}>
        <h2 style={S.ctaBlockH2}>Ready to stop making someone else rich?</h2>
        <p style={S.ctaBlockSub}>Your expertise. Your rules. Your price. Start building today.</p>
        <div style={S.ctaRow}>
          <button onClick={handleCta} style={S.primaryBtn}>Start Free — No Credit Card</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={S.footer}>
        &copy; {new Date().getFullYear()} TitleApp. All rights reserved.
      </footer>
    </div>
  );
}
