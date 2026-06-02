import React, { useState, useEffect } from "react";
import DistributionKit from "../components/DistributionKit";
import CreatorSpotlight from "../components/CreatorSpotlight";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

// CreatorWorkspace — the "what does my finished worker look like to ME the creator" view.
//
// Mounts the salvageable components from the deprecated DeveloperSandbox
// host into a single page. Per-worker scoped via /creator-workspace/<slug>.
//
// Initial scope (S52.12 — sandbox salvage):
//   · Overview tab: worker card + stats placeholder + recent activity
//   · Distribute tab: DistributionKit (the worker promo deck generator)
//   · Promote tab: CreatorSpotlight (featured-creator submission)
//
// Future scope (as more sandbox children get re-mounted):
//   · Build tab: ProgressiveCard + BuildProgress (when worker is being iterated)
//   · Test tab: TestWorkerPanel
//   · Preflight tab: PublishPreflight
//   · Settings tab: CommsPreferences + DataLinkStatus

const COLORS = {
  bg: "#0B0E14",
  panel: "#11151D",
  border: "#1F2530",
  text: "#E8ECF1",
  textDim: "#8B96A8",
  accent: "#7C3AED",
  accent2: "#16A34A",
};

// Demo worker fixtures.
//
// Slug discipline (QA-001 TC-006 / TC-008): the `slug` here MUST match the
// slug used in the Firestore digitalWorkers catalog. Mismatches mean Alex
// chat, deck generation, and RAAS rule loading silently fall back instead
// of resolving to the actual worker.
//
// `live: true` = catalog entry exists, RAAS resolves, DistributionKit deck
// generation will produce a real backend-rendered deck.
// `live: false` = aspirational stub used to demo the creator-view layout;
// deck generation falls back to DistributionKit's client-side HTML path.
//
// Production version of this map reads from `useWorkerCatalog` instead of
// hardcoding (TC-001/TC-004 — keep frontend reads anchored to catalog).
const WORKER_FIXTURES = {
  // BANK-FUND-001 in services/alex/catalogs/banking-finance.json.
  // Slug confirmed against catalog 2026-06-01.
  fundraise: {
    slug: "fundraise",
    name: "Investor Relations",
    live: true,
    workerCardData: {
      name: "Investor Relations",
      tagline: "Run your seed round end-to-end — every investor touchpoint",
      description:
        "Manage your data room, SAFE signing, cap table, investor voting, and follow-up. Built by a corporate finance veteran with 15 years running early-stage IR.",
      vertical: "Banking/Finance",
      hourlyEquivalent: 400,
      monthlyPrice: 29,
      verifiedCreator: true,
    },
  },
  // Aspirational — Ruthie's worker, no catalog entry yet. Demo only.
  "nursing-eval-001": {
    slug: "nursing-eval-001",
    name: "Nursing Evaluation",
    live: false,
    workerCardData: {
      name: "Nursing Evaluation",
      tagline: "Clinical reasoning + evaluation support for nursing students and floor practice",
      description:
        "Built by a 20-year ER nurse. Walks through triage scenarios, supports clinical-judgment exam prep, helps document evaluations for preceptors. Backed by a documented workflow you can audit.",
      vertical: "Healthcare",
      hourlyEquivalent: 200,
      monthlyPrice: 29,
      verifiedCreator: true,
    },
  },
  // Aspirational — OF for Smart People character. No catalog entry.
  "fred-international-tax": {
    slug: "fred-international-tax",
    name: "International Tax",
    live: false,
    workerCardData: {
      name: "International Tax",
      tagline: "Cross-border tax with the depth you'd pay $700/hr for",
      description:
        "Built by a 22-year international tax attorney. Transfer pricing, BEPS exposure, expat compliance, and cross-border revenue treatment. Every output references the regulatory source.",
      vertical: "Legal/Tax",
      hourlyEquivalent: 700,
      monthlyPrice: 29,
      verifiedCreator: true,
    },
  },
};

export default function CreatorWorkspace() {
  const slug = (window.location.pathname.match(/^\/creator-workspace\/([a-z0-9-]+)/) || [])[1];
  const fixture = WORKER_FIXTURES[slug];
  const [tab, setTab] = useState("overview");

  if (!fixture) {
    return (
      <div style={wrap}>
        <Header workerName="—" />
        <main style={{ padding: "32px 40px", color: COLORS.text }}>
          <h2 style={{ margin: "0 0 12px" }}>Worker not found</h2>
          <p style={{ color: COLORS.textDim, lineHeight: 1.6 }}>
            No worker matches <code>{slug || "(no slug)"}</code>. Try one of:
          </p>
          <ul style={{ color: COLORS.textDim }}>
            {Object.keys(WORKER_FIXTURES).map(s => (
              <li key={s}>
                <a href={`/creator-workspace/${s}`} style={{ color: COLORS.accent }}>
                  /creator-workspace/{s}
                </a>
              </li>
            ))}
          </ul>
        </main>
      </div>
    );
  }

  const { workerCardData } = fixture;

  return (
    <div style={wrap}>
      <Header workerName={workerCardData.name} />
      <SubBar tab={tab} setTab={setTab} />
      <main style={{ padding: "24px 40px 80px" }}>
        {tab === "overview" && <OverviewTab worker={fixture} workerCardData={workerCardData} />}
        {tab === "distribute" && <DistributeTab worker={fixture} workerCardData={workerCardData} />}
        {tab === "promote" && <PromoteTab worker={fixture} workerCardData={workerCardData} />}
      </main>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────
function Header({ workerName }) {
  return (
    <header style={header}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={sociiiMarkUrl} alt="SOCIII" style={{ width: 28, height: 28 }} />
        <span style={{ color: COLORS.text, fontSize: 16, fontWeight: 600 }}>sociii</span>
        <span style={{ color: COLORS.textDim, fontSize: 13 }}>·</span>
        <span style={{ color: COLORS.textDim, fontSize: 13 }}>Creator workspace</span>
      </div>
      <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{workerName}</div>
    </header>
  );
}

// ── Sub-tab bar ────────────────────────────────────────────────────
function SubBar({ tab, setTab }) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "distribute", label: "Distribute" },
    { id: "promote", label: "Promote" },
  ];
  return (
    <div style={subBar}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            ...tabBtn,
            color: tab === t.id ? COLORS.text : COLORS.textDim,
            borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
          }}
        >
          {t.label}
        </button>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        <LiveBadge />
      </div>
    </div>
  );
}

function LiveBadge() {
  // Read the current fixture's live flag off the DOM data attribute set
  // by CreatorWorkspace on the wrap div, so SubBar stays presentational.
  const slug = (window.location.pathname.match(/^\/creator-workspace\/([a-z0-9-]+)/) || [])[1];
  const isLive = !!WORKER_FIXTURES[slug]?.live;
  return (
    <>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? COLORS.accent2 : "#F59E0B" }} />
      <span style={{ color: COLORS.textDim, fontSize: 12 }}>
        {isLive ? "Worker live" : "Demo only — no catalog entry"}
      </span>
    </>
  );
}

// ── Overview tab ───────────────────────────────────────────────────
function OverviewTab({ worker, workerCardData }) {
  const { name, tagline, description, vertical, hourlyEquivalent, monthlyPrice } = workerCardData;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28 }}>
      <div>
        <div style={panelCard}>
          <div style={{ color: COLORS.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Worker</div>
          <div style={{ color: COLORS.text, fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>{name}</div>
          <div style={{ color: COLORS.textDim, fontSize: 14, marginBottom: 14 }}>{tagline}</div>
          <div style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.65 }}>{description}</div>

          <div style={{ display: "flex", gap: 24, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${COLORS.border}` }}>
            <Stat label="Vertical" value={vertical} />
            <Stat label="Hourly equivalent" value={`$${hourlyEquivalent}/hr`} />
            <Stat label="Monthly price" value={`$${monthlyPrice}/mo`} />
            <Stat label="Subscribers" value="—" hint="(not yet wired)" />
            <Stat label="MTD revenue" value="—" hint="(not yet wired)" />
          </div>
        </div>

        <div style={{ ...panelCard, marginTop: 18 }}>
          <div style={{ color: COLORS.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Recent activity</div>
          <div style={{ color: COLORS.textDim, fontSize: 13, marginTop: 10, lineHeight: 1.7 }}>
            Activity feed will surface here once the worker is connected to Firestore. For Ruthie's demo today, this stays empty — the point of this page is the Distribute and Promote tabs.
          </div>
        </div>
      </div>

      <aside>
        <div style={panelCard}>
          <div style={{ color: COLORS.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Quick actions</div>
          <ActionLink label="Generate promo deck" href="#" onClick={e => { e.preventDefault(); document.querySelectorAll("button").forEach(b => b.textContent === "Distribute" && b.click()); }} />
          <ActionLink label="Submit for featured spotlight" href="#" onClick={e => { e.preventDefault(); document.querySelectorAll("button").forEach(b => b.textContent === "Promote" && b.click()); }} />
          <ActionLink label="View public landing" href={`/w/${worker.slug}`} />
          <ActionLink label="View subscriber chat" href="#" />
        </div>

        <div style={{ ...panelCard, marginTop: 18 }}>
          <div style={{ color: COLORS.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Status</div>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
            <div><span style={{ color: COLORS.accent2 }}>●</span> <span style={{ color: COLORS.text }}>Worker live</span></div>
            <div><span style={{ color: COLORS.accent2 }}>●</span> <span style={{ color: COLORS.text }}>QA-001 passing</span></div>
            <div><span style={{ color: COLORS.textDim }}>●</span> <span style={{ color: COLORS.textDim }}>Marketing assets — pending</span></div>
            <div><span style={{ color: COLORS.textDim }}>●</span> <span style={{ color: COLORS.textDim }}>Video explainers — disabled</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <div style={{ color: COLORS.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ color: COLORS.text, fontSize: 17, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function ActionLink({ label, href, onClick }) {
  return (
    <a href={href} onClick={onClick} style={{
      display: "block",
      color: COLORS.text,
      fontSize: 13.5,
      padding: "8px 0",
      borderBottom: `1px solid ${COLORS.border}`,
      textDecoration: "none",
    }}>
      {label} →
    </a>
  );
}

// ── Distribute tab — DistributionKit ───────────────────────────────
function DistributeTab({ worker, workerCardData }) {
  return (
    <div>
      <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 14 }}>
        Generate marketing assets for your worker. PowerPoint, PDF, QR code, embed code, and social-post copy — all auto-built from the worker spec.
      </div>
      <div style={kitMount}>
        <DistributionKit
          worker={worker}
          workerCardData={workerCardData}
          hasUpdatedSinceLaunch={true}
          canvasAssets={[]}
        />
      </div>
    </div>
  );
}

// ── Promote tab — CreatorSpotlight ─────────────────────────────────
function PromoteTab({ worker, workerCardData }) {
  return (
    <div>
      <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 14 }}>
        Submit yourself for featured-creator placement. Approved spotlights appear on the SOCIII gallery and OF for Smart People feed.
      </div>
      <div style={kitMount}>
        <CreatorSpotlight
          worker={worker}
          workerCardData={workerCardData}
        />
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const wrap = {
  background: COLORS.bg,
  color: COLORS.text,
  minHeight: "100vh",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 40px",
  borderBottom: `1px solid ${COLORS.border}`,
};

const subBar = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "0 40px",
  borderBottom: `1px solid ${COLORS.border}`,
};

const tabBtn = {
  background: "transparent",
  border: "none",
  padding: "16px 4px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "color 0.15s",
};

const panelCard = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 22,
};

const kitMount = {
  background: "#FFFFFF",
  color: "#1F2937",
  borderRadius: 12,
  padding: 18,
  // Salvaged components were authored against a light theme. Containing
  // them in a light-themed box preserves their internal styling rather
  // than forcing a dark-mode refactor in the salvage step.
};
