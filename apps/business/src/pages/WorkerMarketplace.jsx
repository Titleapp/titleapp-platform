import React, { useState } from "react";
import WorkerIcon, { SUITE_COLORS } from "../utils/workerIcons";
import { WORKER_ROUTES } from "../data/workerRoutes";

// Re-export for backward compatibility
export { WORKER_ROUTES };


const SUITES = ["All", "Real Estate", "Title & Escrow", "Construction", "Finance & Investment", "General Business", "Legal", "Automotive", "Aviation", "Solar Energy", "Government — DMV", "Government — Permitting", "Government — Inspector", "Government — Recorder", "Platform"];

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
  const [filter, setFilter] = useState(() => {
    // Check for landing page handoff — ?vertical= or ?search=
    const landingVertical = sessionStorage.getItem("ta_landing_vertical");
    if (landingVertical) {
      sessionStorage.removeItem("ta_landing_vertical");
      return landingVertical;
    }
    return "All";
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    const landingSearch = sessionStorage.getItem("ta_landing_search");
    if (landingSearch) {
      sessionStorage.removeItem("ta_landing_search");
      return landingSearch;
    }
    return "";
  });
  const [subscribing, setSubscribing] = useState(null);

  const publicWorkers = WORKER_ROUTES.filter((w) => !w.internal_only);
  const suiteFiltered = filter === "All" ? publicWorkers : publicWorkers.filter((w) => w.suite === filter);
  const filtered = searchQuery
    ? suiteFiltered.filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || (w.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : suiteFiltered;
  const liveCount = publicWorkers.filter((w) => w.status === "live").length;
  const plannedCount = publicWorkers.filter((w) => w.status === "planned").length;

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
            ? "Subscribe to a worker to start building. Your workspace is created automatically."
            : "1,000+ Digital Workers. Built on the rules of your industry. On your team now."}
        </p>
        {!authenticated && (
          <div style={S.stats}>
            <div style={S.stat}>
              <div style={S.statValue}>1,000+</div>
              <div style={S.statLabel}>Digital Workers</div>
            </div>
            <div style={S.stat}>
              <div style={S.statValue}>{SUITES.length - 1}</div>
              <div style={S.statLabel}>Industries</div>
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
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: (SUITE_COLORS[w.suite] || "#7c3aed") + "12",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}>
                  <WorkerIcon slug={w.slug} size={24} color={SUITE_COLORS[w.suite] || "#7c3aed"} />
                </div>
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
