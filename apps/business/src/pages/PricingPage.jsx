import React from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Start a self-serve Stripe Checkout for a Box plan. Needs a signed-in admin in
// a business workspace; otherwise route to onboarding/Alex to set one up first.
async function startBoxCheckout(planKey) {
  const user = auth.currentUser;
  const tenantId = localStorage.getItem("TENANT_ID");
  const email = (user && user.email) || localStorage.getItem("USER_EMAIL") || "";
  if (!user || !email) { window.location.href = `/?intent=${planKey}`; return; }
  if (!tenantId || tenantId === "vault" || tenantId === "personal") {
    // A Box plan bills a workspace — send them to create/select one first.
    window.location.href = `/?intent=${planKey}`;
    return;
  }
  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api?path=/v1/box:checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: planKey, tenantId, email }),
    });
    const data = await res.json();
    if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
    window.location.href = `/meet-alex?intent=${planKey}`;
  } catch (_) {
    window.location.href = `/meet-alex?intent=${planKey}`;
  }
}

const TIERS = [
  {
    id: "free",
    name: "The Spine",
    price: "Free",
    cadence: "forever",
    tagline: "Run your household or your small business on it.",
    workers: [
      "Alex — Chief of Staff (orchestration)",
      "Accounting (P&L, burn, runway)",
      "HR (W2 + 1099 + advisors)",
      "Marketing (campaigns + brand voice)",
      "Contacts (relationships + outreach)",
      "Control Center (daily brief, deadlines)",
      "Your Vault — records on-chain-anchored & permanent (yours even if SOCIII disappears)",
      "Your Drive (cross-worker file management)",
    ],
    note: "A $2 one-time identity check is required for many workers during onboarding. Data fees apply above a typical usage threshold (see below). No subscription. No credit card to start.",
    cta: "Start free",
    ctaHref: "/meet-alex",
    accent: "#16a34a",
    featured: false,
  },
  {
    id: "specialist-29",
    name: "$29 / mo",
    price: "$29",
    cadence: "per worker, per month",
    tagline: "Entry-tier specialist products.",
    workers: [
      "Scheduling",
      "Documents (forms, templates)",
      "Tax basics",
      "Compliance basics",
      "Personal Finance",
      "ER Nursing, Personal Trainer, more",
    ],
    note: "Single-domain expert workers. Each one is built by a domain creator — their bio is on the worker's page.",
    cta: "Browse $29 workers",
    ctaHref: "/workers?tier=29",
    accent: "#0ea5e9",
    featured: false,
  },
  {
    id: "specialist-49",
    name: "$49 / mo",
    price: "$49",
    cadence: "per worker, per month",
    tagline: "Workers that replace a part-time hire or a SaaS tool.",
    workers: [
      "Paralegal",
      "Property Management",
      "Sales Pipeline",
      "Project Management",
      "Bookkeeper (advanced)",
      "Many others — see the catalog",
    ],
    note: "Mid-tier products. Each one replaces a specific role or a SaaS subscription you're probably already paying for.",
    cta: "Browse $49 workers",
    ctaHref: "/workers?tier=49",
    accent: "#7c3aed",
    featured: true,
  },
  {
    id: "specialist-79",
    name: "$79 / mo",
    price: "$79",
    cadence: "per worker, per month",
    tagline: "Workers that replace a full-time professional.",
    workers: [
      "Patent Worker",
      "Investor Relations (Fundraise)",
      "Mission Builder (Aviation)",
      "CRE Deal Analyst",
      "Real Estate Salesperson",
      "Litigation Discovery, Compliance Defense, Transaction DD, Closing Attorney",
    ],
    note: "Top-tier specialist products. Replace a full-time role or a vertical software vendor.",
    cta: "Browse $79 workers",
    ctaHref: "/workers?tier=79",
    accent: "#f59e0b",
    featured: false,
  },
  {
    id: "biab",
    name: "Business in a Box",
    boxPlan: "business-in-a-box",
    art: "/illustrations/business-box.png",
    price: "$99",
    cadence: "/mo + $5 per seat",
    tagline: "The full company stack. The spine plus a curated set of workers tuned to your industry.",
    workers: [
      "Everything in the Free spine",
      "First 5 seats included — small teams stay at $99 flat",
      "$5 / active seat beyond 5 — only pay for who's in the box",
      "A curated set of specialist workers for your industry",
      "Onboarding from Alex — she composes the bundle",
      "Industry templates and ruleset overlays",
      "Recommended for established small businesses + practices",
      "Talk to Alex to right-size the box",
    ],
    note: "The most common shape for businesses. Pricing reflects the curated bundle, not a discount stack — you save the time of picking and composing.",
    cta: "Talk to Alex",
    ctaHref: "/meet-alex?intent=business-in-a-box",
    accent: "#dc2626",
    featured: false,
  },
  {
    id: "schools",
    name: "Academia in a Box",
    boxPlan: "academia-in-a-box",
    art: "/illustrations/academia-box.png",
    price: "$99",
    cadence: "/mo + $5 per student",
    tagline: "Business in a Box for education — the student-owned record plus the workers your faculty build.",
    workers: [
      "Everything in the Free spine",
      "Vault Academic Record — student-owned, hashed, FERPA dual-control",
      "Unlimited Digital Workers your faculty build (evaluation, courses, CE)",
      "First 5 students included; then $5 / active student / mo (or $50/yr)",
      "Heavy users carry their own student data plan — you stay predictable",
      "Professors earn 75% revenue share on the workers they publish",
    ],
    note: "Above 1,000 active students, switch to a flat site license — talk to us. Governed by the SOCIII for Education Terms + FERPA Data Processing Addendum. Textbooks are dead; Digital Workers are live.",
    cta: "Talk to Alex",
    ctaHref: "/meet-alex?intent=schools",
    accent: "#0E7490",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/" style={S.logoWrap}>
          <img src={sociiiMarkUrl} alt="SOCIII" width={32} height={32} style={{ display: "block" }} />
          <span style={S.logoText}>SOCIII</span>
        </a>
        <div style={S.headerRight}>
          <a href="/workers" style={S.headerLink}>Workers</a>
          <a href="/work" target="_blank" rel="noopener" style={S.headerLink}>OF for Smart People ↗</a>
          <a href="/investors" style={S.headerLink}>Investors</a>
          <a href="/meet-alex?action=signin" style={S.headerLink}>Sign in</a>
          <a href="/meet-alex" style={S.headerCta}>Start free</a>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.heroInner}>
          <h1 style={S.heroH1}>Free spine. Pay per worker.</h1>
          <p style={S.heroSub}>
            The SOCIII spine is free forever — works for households and small businesses. Add specialist workers when you need them at flat per-worker pricing. Or take the Business in a Box bundle when you're ready to run a company.
          </p>
        </div>

        <div style={S.tierGrid}>
          {TIERS.map((tier) => (
            <div key={tier.id} style={{ ...S.tierCard, ...(tier.featured ? S.tierCardFeatured : {}) }}>
              {tier.featured && <div style={S.featuredBadge}>Most popular tier</div>}
              <div style={{ ...S.tierAccent, background: tier.accent }} />
              <div style={S.tierBody}>
                {tier.art && (
                  <img
                    src={`${tier.art}?v=1`}
                    alt=""
                    style={{ width: "100%", height: 130, objectFit: "contain", borderRadius: 10, background: "#FBF7EC", border: "1px solid #eee4d2", marginBottom: 12, display: "block" }}
                  />
                )}
                <div style={S.tierName}>{tier.name}</div>
                <div style={S.tierTagline}>{tier.tagline}</div>
                <div style={S.tierPriceRow}>
                  <span style={S.tierPrice}>{tier.price}</span>
                  <span style={S.tierCadence}>{tier.cadence}</span>
                </div>
                <ul style={S.tierWorkers}>
                  {tier.workers.map((w, i) => (
                    <li key={i} style={S.tierWorker}>
                      <span style={S.tierBullet}>•</span> {w}
                    </li>
                  ))}
                </ul>
                <div style={S.tierNote}>{tier.note}</div>
                {tier.boxPlan ? (
                  <button onClick={() => startBoxCheckout(tier.boxPlan)} style={{ ...S.tierCta, background: tier.accent, border: "none", cursor: "pointer", font: "inherit" }}>Get started →</button>
                ) : (
                  <a href={tier.ctaHref} style={{ ...S.tierCta, background: tier.accent }}>{tier.cta}</a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={S.faq}>
          <h2 style={S.faqH2}>How the model actually works</h2>
          <div style={S.faqGrid}>
            <div style={S.faqItem}>
              <div style={S.faqQ}>The spine is really free?</div>
              <div style={S.faqA}>Yes. Alex, Accounting, HR, Marketing, Contacts, Control Center, your Vault, and your Drive are free forever. Works for a household and works for a small business. You'll do a $2 one-time identity check during onboarding for many workers. No subscription. No credit card to start.</div>
            </div>
            <div style={S.faqItem}>
              <div style={S.faqQ}>What about data fees?</div>
              <div style={S.faqA}>Many users have no data fees at all. A small business typically sees around $10/month from normal usage. Heavy users — especially anyone doing a lot of generated reports, image generation, or video generation — will see more. Every line item is shown on your bill before it's charged. Image generation tends to be the biggest driver when it comes up.</div>
            </div>
            <div style={S.faqItem}>
              <div style={S.faqQ}>What does "per worker" mean?</div>
              <div style={S.faqA}>Each specialist worker is a separate subscription at its tier price. Add Paralegal for $49. Add Patent Worker for $79. Cancel any one without affecting the others. No minimums, no seat counts. Subscribe to one worker, or twelve — it's up to you.</div>
            </div>
            <div style={S.faqItem}>
              <div style={S.faqQ}>Who builds the workers?</div>
              <div style={S.faqA}>SOCIII builds the spine. Domain creators build the specialist workers — a paralegal builds Paralegal, an ER nurse builds ER Nursing, a CRE analyst builds CRE Deal Analyst. Each worker's page shows the bio of the person who built it.</div>
            </div>
          </div>
        </div>

        <div style={S.investorBlock}>
          <h2 style={S.investorH2}>Investors and creators have their own front doors.</h2>
          <div style={S.investorRow}>
            <a href="/investors" style={S.investorCta}>
              <div style={S.investorCtaTitle}>Investors</div>
              <div style={S.investorCtaSub}>Read the whitepaper, complete KYC, enter the data room. The IR worker handles the introduction and follows up.</div>
            </a>
            <a href="/onboard/creator" style={S.investorCta}>
              <div style={S.investorCtaTitle}>Become a creator</div>
              <div style={S.investorCtaSub}>Build your own digital worker on the SDK. Self-service onboarding for domain experts who want to package their expertise into a worker.</div>
            </a>
          </div>
        </div>
      </main>

      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>SOCIII, Inc.</div>
          <div style={S.footerLinks}>
            <a href="/" style={S.footerLink}>Home</a>
            <a href="/workers" style={S.footerLink}>Workers</a>
            <a href="/pricing" style={S.footerLink}>Pricing</a>
            <a href="/whitepaper" style={S.footerLink}>Whitepaper</a>
            <a href="/docs/what-is-sociii" style={S.footerLink}>SDK</a>
            <a href="/docs/api" style={S.footerLink}>API</a>
            <a href="/docs" style={S.footerLink}>Docs</a>
            <a href="/press" style={S.footerLink}>Press</a>
            <a href="/investors" style={S.footerLink}>Investors</a>
            <a href="/legal/privacy-policy" style={S.footerLink}>Privacy</a>
            <a href="/legal/terms-of-service" style={S.footerLink}>Terms</a>
          </div>
          <div style={S.footerSocials}>
            <a href="https://x.com/sociiiai" target="_blank" rel="noopener" style={S.footerLink}>X</a>
            <a href="https://linkedin.com/company/sociii-inc/" target="_blank" rel="noopener" style={S.footerLink}>LinkedIn</a>
            <a href="https://github.com/sociii" target="_blank" rel="noopener" style={S.footerLink}>GitHub</a>
            <a href="https://www.youtube.com/@SOCIII-AI" target="_blank" rel="noopener" style={S.footerLink}>YouTube</a>
            <a href="https://www.tiktok.com/@sociii.official" target="_blank" rel="noopener" style={S.footerLink}>TikTok</a>
          </div>
          <div style={S.footerAddress}>1810 E Sahara Ave Ste 75942, Las Vegas NV 89104</div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#111827",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", borderBottom: "1px solid #f0f0f0",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  logoText: { fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  headerLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  headerCta: {
    fontSize: 14, fontWeight: 600, color: "white", textDecoration: "none",
    padding: "8px 20px", borderRadius: 8, background: "#7c3aed",
  },
  main: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    padding: "64px 24px 96px", gap: 56, width: "100%", boxSizing: "border-box",
  },
  heroInner: { maxWidth: 720, textAlign: "center" },
  heroH1: { fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: "#111827", letterSpacing: "-1px" },
  heroSub: { fontSize: 17, color: "#6b7280", margin: 0, lineHeight: 1.5 },
  tierGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16, width: "100%", maxWidth: 1400,
  },
  tierCard: {
    position: "relative", display: "flex", overflow: "hidden",
    background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16,
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  tierCardFeatured: {
    border: "2px solid #7c3aed",
    boxShadow: "0 8px 32px rgba(124,58,237,0.12)",
    transform: "translateY(-4px)",
  },
  featuredBadge: {
    position: "absolute", top: 12, right: 12,
    fontSize: 10, fontWeight: 700, color: "#7c3aed",
    background: "#ede9fe", padding: "4px 10px", borderRadius: 12,
    letterSpacing: "0.4px", textTransform: "uppercase",
  },
  tierAccent: { width: 6 },
  tierBody: { flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column" },
  tierName: { fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 },
  tierTagline: { fontSize: 13, color: "#6b7280", marginBottom: 16, minHeight: 36, lineHeight: 1.4 },
  tierPriceRow: { display: "flex", flexDirection: "column", marginBottom: 20 },
  tierPrice: { fontSize: 32, fontWeight: 800, color: "#111827", letterSpacing: "-1px", lineHeight: 1 },
  tierCadence: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  tierWorkers: { listStyle: "none", padding: 0, margin: 0, marginBottom: 16, flex: 1 },
  tierWorker: { fontSize: 12, color: "#374151", lineHeight: 1.6, display: "flex", gap: 6 },
  tierBullet: { color: "#7c3aed", fontWeight: 700 },
  tierNote: { fontSize: 11, color: "#9ca3af", marginBottom: 16, fontStyle: "italic", lineHeight: 1.4 },
  tierCta: {
    display: "block", textAlign: "center", color: "white",
    textDecoration: "none", padding: "10px 14px", borderRadius: 10,
    fontWeight: 600, fontSize: 13,
  },
  faq: { width: "100%", maxWidth: 920 },
  faqH2: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24, textAlign: "center", letterSpacing: "-0.4px" },
  faqGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20 },
  faqItem: { padding: "20px 24px", border: "1px solid #f0f0f0", borderRadius: 12, background: "#fafbfc" },
  faqQ: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 },
  faqA: { fontSize: 14, color: "#6b7280", lineHeight: 1.55 },
  investorBlock: { width: "100%", maxWidth: 920, textAlign: "center" },
  investorH2: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24, letterSpacing: "-0.4px" },
  investorRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 },
  investorCta: {
    display: "block", padding: "24px 28px", border: "1px solid #e5e7eb",
    borderRadius: 12, textDecoration: "none", color: "inherit", background: "white",
    textAlign: "left", transition: "border-color 0.15s",
  },
  investorCtaTitle: { fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 },
  investorCtaSub: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },
  footer: { borderTop: "1px solid #f0f0f0", padding: "24px 32px" },
  footerInner: {
    maxWidth: 1100, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16,
  },
  footerBrand: { fontWeight: 700, color: "#111827", fontSize: 14 },
  footerLinks: { display: "flex", gap: 16, flexWrap: "wrap" },
  footerSocials: { display: "flex", gap: 12, flexWrap: "wrap" },
  footerLink: { color: "#6b7280", textDecoration: "none", fontSize: 13 },
  footerAddress: { fontSize: 12, color: "#9ca3af" },
};
