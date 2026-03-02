import React, { useState } from "react";

export const WORKER_ROUTES = [
  // Phase 1: Acquisition
  { slug: "cre-analyst", name: "CRE Deal Analyst", description: "Screen and model commercial real estate investment opportunities.", suite: "Real Estate", status: "live", price: 2900 },
  { slug: "investor-relations", name: "Investor Relations", description: "Investor communications, reporting, and capital raising.", suite: "Finance & Investment", status: "live", price: 4900 },
  { slug: "title-escrow", name: "Title & Escrow Worker", description: "Pull, analyze, and verify title in minutes. Chain of title on blockchain. Escrow managed from open to close.", suite: "Real Estate", status: "planned", price: 2900 },
  { slug: "environmental-review", name: "Environmental Review Worker", description: "Phase I through remediation. Biological surveys. Archaeological review. Cultural impact assessment.", suite: "Real Estate", status: "planned", price: 2900 },
  { slug: "mortgage-broker", name: "Mortgage Broker Worker", description: "Source the best debt. Acquisition loans, construction financing, bridge, perm, refi.", suite: "Finance & Investment", status: "planned", price: 4900 },

  // Phase 2: Entitlement & Pre-Construction
  { slug: "entitlement-analyst", name: "Land Use & Entitlement Worker", description: "Zoning analysis, entitlement strategy, and approval tracking. Know what you can build before you buy.", suite: "Real Estate", status: "planned", price: 2900 },
  { slug: "engineering-review", name: "Engineering Review Worker", description: "Civil, structural, traffic, utilities. Every engineering discipline reviewed, coordinated, and tracked.", suite: "Construction", status: "planned", price: 2900 },
  { slug: "architecture-review", name: "Architecture & Plan Review Worker", description: "Plan analysis, building code compliance, AHJ coordination. From schematic design through construction documents.", suite: "Construction", status: "planned", price: 2900 },
  { slug: "permit-tracker", name: "Permit Submission Worker", description: "File permits, track review cycles, respond to deficiency notices, and manage approvals across every jurisdiction.", suite: "Construction", status: "planned", price: 2900 },

  // Phase 3: Construction
  { slug: "construction-manager", name: "Construction Manager Worker", description: "Your AI superintendent. Scheduling, RFIs, submittals, daily logs, punch lists, and close-out.", suite: "Construction", status: "planned", price: 4900 },
  { slug: "bid-procurement", name: "Bid & Procurement Worker", description: "Solicit bids, level proposals, manage buyout. From scope to signed subcontract.", suite: "Construction", status: "planned", price: 2900 },
  { slug: "construction-draws", name: "Construction Draw Worker", description: "Monthly draw requests, lien waivers, inspection coordination. Get your money on time, every time.", suite: "Construction", status: "planned", price: 2900 },
  { slug: "labor-staffing", name: "Labor & Staffing Worker", description: "Crew scheduling, prevailing wage compliance, OSHA tracking, and workforce management.", suite: "Construction", status: "planned", price: 2900 },

  // Phase 4: Stabilization & Operations
  { slug: "property-management", name: "Property Management Worker", description: "Leasing, tenant management, maintenance requests, rent collection, and owner reporting.", suite: "Real Estate", status: "planned", price: 2900 },
  { slug: "construction-accounting", name: "Accounting Worker", description: "Construction job costing, AIA billing, change order tracking, and owner reporting.", suite: "Finance & Investment", status: "planned", price: 4900 },
  { slug: "insurance-coi", name: "Insurance & COI Worker", description: "Policy management, COI tracking, claims handling, and renewal coordination. Never miss a coverage gap.", suite: "General Business", status: "planned", price: 2900 },
  { slug: "tax-assessment", name: "Tax & Assessment Worker", description: "Property tax monitoring, assessment appeals, and tax planning. Save 10-30% on your tax bill.", suite: "Finance & Investment", status: "planned", price: 2900 },

  // Phase 5: Disposition
  { slug: "real-estate-sales", name: "Real Estate Sales Worker", description: "Listings, buyer qualification, showing management, offer negotiation, and transaction coordination.", suite: "Real Estate", status: "planned", price: 2900 },

  // Horizontal
  { slug: "compliance-tracker", name: "Compliance & Deadline Tracker", description: "Every deadline, every filing, every renewal. Across every deal, every phase, every jurisdiction. Nothing slips.", suite: "General Business", status: "planned", price: 2900 },
  { slug: "legal-contracts", name: "Legal & Contract Worker", description: "Contracts, agreements, and legal compliance across every phase. Draft, review, redline, and track.", suite: "Legal", status: "planned", price: 4900 },

  // Automotive
  { slug: "car-sales", name: "Car Sales Worker", description: "Inventory management, lead qualification, deal structuring, F&I product presentation, and delivery coordination.", suite: "Automotive", status: "planned", price: 2900 },

  // Platform
  { slug: "chief-of-staff", name: "Alex — Chief of Staff", description: "Your AI coordinator. Manages all your workers, plans pipelines, tracks progress. Free with 3+ worker subscriptions.", suite: "Platform", status: "live", price: 0 },
];

const SUITES = ["All", "Real Estate", "Construction", "Finance & Investment", "General Business", "Legal", "Automotive", "Platform"];

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  nav: { padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none", cursor: "pointer" },
  navLink: { fontSize: 13, color: "#6b7280", textDecoration: "none", cursor: "pointer" },
  hero: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", padding: "48px 32px", textAlign: "center", color: "white" },
  heroTitle: { fontSize: 32, fontWeight: 700, marginBottom: 8 },
  heroDesc: { fontSize: 16, opacity: 0.9, maxWidth: 500, margin: "0 auto" },
  main: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  filters: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28, justifyContent: "center" },
  filterBtn: { padding: "6px 16px", borderRadius: 20, border: "1px solid #d1d5db", background: "white", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" },
  filterBtnActive: { padding: "6px 16px", borderRadius: 20, border: "1px solid #7c3aed", background: "#7c3aed", fontSize: 13, fontWeight: 500, color: "white", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 },
  card: { background: "white", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "box-shadow 0.15s", cursor: "pointer" },
  cardTop: { marginBottom: 16 },
  cardName: { fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 6 },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },
  badges: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  suiteBadge: { padding: "2px 10px", borderRadius: 12, background: "#f3f4f6", fontSize: 11, fontWeight: 600, color: "#6b7280" },
  liveBadge: { padding: "2px 10px", borderRadius: 12, background: "#dcfce7", fontSize: 11, fontWeight: 700, color: "#166534" },
  plannedBadge: { padding: "2px 10px", borderRadius: 12, background: "#ede9fe", fontSize: 11, fontWeight: 700, color: "#7c3aed" },
  cardBottom: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  price: { fontSize: 14, fontWeight: 600, color: "#111827" },
  openBtn: { padding: "8px 20px", borderRadius: 8, background: "#7c3aed", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" },
  waitlistBtn: { padding: "8px 20px", borderRadius: 8, background: "white", color: "#7c3aed", border: "1px solid #7c3aed", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" },
  stats: { display: "flex", justifyContent: "center", gap: 40, padding: "20px 0 0", marginBottom: 0 },
  stat: { textAlign: "center" },
  statValue: { fontSize: 24, fontWeight: 700, color: "white" },
  statLabel: { fontSize: 12, opacity: 0.8, color: "white" },
  footer: { textAlign: "center", padding: "24px 32px", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 13, marginTop: 40 },
};

function formatPrice(cents) {
  if (cents === 0) return "Free";
  return `$${cents / 100}/mo`;
}

export default function WorkerMarketplace({ authenticated, userName, onSubscribe, onSkip }) {
  const [filter, setFilter] = useState("All");
  const [subscribing, setSubscribing] = useState(null);

  const filtered = filter === "All" ? WORKER_ROUTES : WORKER_ROUTES.filter((w) => w.suite === filter);
  const liveCount = WORKER_ROUTES.filter((w) => w.status === "live").length;
  const plannedCount = WORKER_ROUTES.filter((w) => w.status === "planned").length;

  function handleCardClick(w) {
    if (authenticated && w.status === "live" && onSubscribe) {
      setSubscribing(w.slug);
      onSubscribe(w);
    } else {
      window.location.href = `/workers/${w.slug}`;
    }
  }

  function handleActionClick(e, w) {
    e.stopPropagation();
    if (authenticated && w.status === "live" && onSubscribe) {
      setSubscribing(w.slug);
      onSubscribe(w);
    } else {
      window.location.href = `/workers/${w.slug}`;
    }
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        {authenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{userName || "Welcome"}</span>
            {onSkip && <button onClick={onSkip} style={{ ...S.navLink, background: "none", border: "none", padding: 0 }}>Skip — set up manually</button>}
          </div>
        ) : (
          <a href="/" style={S.navLink}>Back to home</a>
        )}
      </nav>

      <div style={S.hero}>
        <h1 style={S.heroTitle}>{authenticated ? "Pick your first Digital Worker" : "Digital Workers"}</h1>
        <p style={S.heroDesc}>
          {authenticated
            ? "Subscribe to a worker to get started. Your workspace is created automatically."
            : "AI-powered professionals governed by human-defined rules. Subscribe to the workers you need."}
        </p>
        {!authenticated && (
          <div style={S.stats}>
            <div style={S.stat}>
              <div style={S.statValue}>{WORKER_ROUTES.length}</div>
              <div style={S.statLabel}>Workers</div>
            </div>
            <div style={S.stat}>
              <div style={S.statValue}>{liveCount}</div>
              <div style={S.statLabel}>Live</div>
            </div>
            <div style={S.stat}>
              <div style={S.statValue}>{plannedCount}</div>
              <div style={S.statLabel}>Coming soon</div>
            </div>
            <div style={S.stat}>
              <div style={S.statValue}>{SUITES.length - 1}</div>
              <div style={S.statLabel}>Suites</div>
            </div>
          </div>
        )}
      </div>

      <div style={S.main}>
        <div style={S.filters}>
          {SUITES.map((s) => (
            <button
              key={s}
              style={filter === s ? S.filterBtnActive : S.filterBtn}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={S.grid}>
          {filtered.map((w) => (
            <div
              key={w.slug}
              style={S.card}
              onClick={() => handleCardClick(w)}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,58,237,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={S.cardTop}>
                <div style={S.badges}>
                  <span style={S.suiteBadge}>{w.suite}</span>
                  <span style={w.status === "live" ? S.liveBadge : S.plannedBadge}>
                    {w.status === "live" ? "LIVE" : "COMING SOON"}
                  </span>
                </div>
                <div style={S.cardName}>{w.name}</div>
                <div style={S.cardDesc}>{w.description}</div>
              </div>
              <div style={S.cardBottom}>
                <span style={S.price}>{formatPrice(w.price)}</span>
                {w.status === "live" ? (
                  <button
                    style={subscribing === w.slug ? { ...S.openBtn, opacity: 0.6, cursor: "wait" } : S.openBtn}
                    onClick={(e) => handleActionClick(e, w)}
                    disabled={subscribing === w.slug}
                  >
                    {authenticated ? (subscribing === w.slug ? "Setting up..." : "Subscribe") : "Open"}
                  </button>
                ) : (
                  <a
                    href={`/workers/${w.slug}`}
                    style={S.waitlistBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Join Waitlist
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer style={S.footer}>TitleApp — Digital Workers for every industry</footer>
    </div>
  );
}
