// CODEX 48.2 Fix 4 — Personal Vault dashboard.
//
// Renders when VERTICAL === "consumer" and currentSection === "dashboard".
// Shows vault-native content: greeting, recent documents, upcoming reminders,
// My Workers quick-launch, My Games quick-launch. Replaces WorkerHome
// which shows business worker cards.
//
// S52.53c (Sean, 2026-08-20): "Personal VAULT not really populated, and the
// assets aren't driving the headline valuations." Root cause — this file
// never queried the dtcs collection at all; Documents showed a hardcoded "—"
// unconditionally. Now wired to useDtcCatalog() (the same /v1/dtc:list the
// business Vault uses) so the headline is a real net worth computed from
// actual records, with the four-pillar breakdown (Stuff/Money/Health/
// Education) the Alex core prompt already documents as the Vault's shape.

import React from "react";
import { firstNameFrom, prettyWorkerName } from "../utils/displayName";
import { ALEX_SLUGS } from "../utils/workerConstants";
import { useDtcCatalog, ASSET_CLASS_OF } from "../data/useDtcCatalog";

// Four-pillar rollup — coarser than the six-class ASSET_CLASS_OF taxonomy
// (Real Property/Vehicles/Personal Assets/Credentials all read as "stuff" at
// headline level; Money stays its own pillar; Health and Education likewise).
const PILLAR_OF_CLASS = {
  "Real Property": "stuff", "Vehicles": "stuff", "Personal Assets": "stuff", "Credentials": "stuff",
  "Business Records": "stuff", "Compliance": "stuff",
  "Money": "money",
  "Health": "health",
  "Education": "education",
};
const PILLARS = [
  { key: "stuff", label: "My Stuff" },
  { key: "money", label: "My Money" },
  { key: "health", label: "My Health" },
  { key: "education", label: "My Education" },
];

function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function getFirstName() {
  // Read the user's actual name, not the workspace name. DISPLAY_NAME is set
  // from auth.currentUser.displayName in App.jsx on sign-in. Fall back to
  // auth email prefix. Never use COMPANY_NAME/WORKSPACE_NAME — those return
  // "Personal Vault" or "Personal" in vault mode. firstNameFrom strips any
  // honorific so "Dr. Maya Chen" greets as "Maya", not "Dr.".
  return firstNameFrom(
    localStorage.getItem("DISPLAY_NAME") || localStorage.getItem("USER_NAME"),
    localStorage.getItem("USER_EMAIL")
  ) || null;
}

function getActiveWorkers() {
  try { return JSON.parse(localStorage.getItem("ACTIVE_WORKERS") || "[]"); } catch { return []; }
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

export default function VaultDashboard() {
  const firstName = getFirstName();
  const greeting = getTimeGreeting();
  const workers = getActiveWorkers();
  const { dtcs, loading: dtcsLoading } = useDtcCatalog();

  const netWorth = dtcs.reduce((sum, d) => {
    if (typeof d.valueUsd !== "number") return sum;
    return d.type === "liability" ? sum - d.valueUsd : sum + d.valueUsd;
  }, 0);
  const hasAnyValue = dtcs.some(d => typeof d.valueUsd === "number");

  const pillarCounts = { stuff: 0, money: 0, health: 0, education: 0 };
  for (const d of dtcs) {
    const cls = ASSET_CLASS_OF[d.type] || "Personal Assets";
    const pillar = PILLAR_OF_CLASS[cls] || "stuff";
    pillarCounts[pillar] += 1;
  }

  const needsAttention = dtcs.filter(d => {
    if (!d.nextDue) return false;
    const due = new Date(d.nextDue);
    if (isNaN(due.getTime())) return false;
    const daysOut = (due.getTime() - Date.now()) / 86400000;
    return daysOut <= 60;
  });

  const DISPLAY_NAMES = {
    "chief-of-staff": "Alex — Chief of Staff",
    "platform-accounting": "Accounting",
    "platform-hr": "HR & People",
    "platform-marketing": "Marketing & Content",
    "platform-contacts": "Contacts",
  };
  const myWorkers = workers.filter(w => {
    const slug = typeof w === "string" ? w : w?.slug || "";
    const isGame = typeof w === "object" && w?.workerType === "game";
    if (isGame) return false;
    if (ALEX_SLUGS.has(slug)) return false;
    return true;
  });
  const myGames = workers.filter(w => {
    return typeof w === "object" && w?.workerType === "game";
  });

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </div>
        <div style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>
          Your Personal Vault — documents, records, and workers in one place.
        </div>
      </div>

      {/* Net worth headline — live, computed from real Vault records */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Net Worth</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>
          {dtcsLoading ? "…" : hasAnyValue ? fmtUsd(netWorth) : "—"}
        </div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
          {dtcsLoading
            ? "Loading your records…"
            : hasAnyValue
              ? `Every asset and account in your Vault, minus liabilities — ${dtcs.length} record${dtcs.length === 1 ? "" : "s"} on file.`
              : "Add an asset's value via Alex to see your net worth here."}
        </div>
      </Card>

      {/* Four pillars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {PILLARS.map(p => (
          <Card key={p.key}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>{p.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>{dtcsLoading ? "…" : pillarCounts[p.key]}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>record{pillarCounts[p.key] === 1 ? "" : "s"} on file</div>
          </Card>
        ))}
      </div>

      {/* Quick stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Documents</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>{dtcsLoading ? "…" : dtcs.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Add documents via Alex or the Documents tab</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>My Workers</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>{myWorkers.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Subscribed Digital Workers</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>My Games</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>{myGames.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Games in your vault</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Signatures</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>—</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Pending and completed</div>
        </Card>
      </div>

      {/* Needs attention — anything due within 60 days */}
      {needsAttention.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Needs attention</div>
          <div style={{ display: "grid", gap: 8 }}>
            {needsAttention.map(d => (
              <Card key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "14px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{d.title}</div>
                <div style={{ fontSize: 12, color: "#d97706" }}>Due {d.nextDue}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My Workers */}
      {myWorkers.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>My Workers</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {myWorkers.map((w, i) => {
              const slug = typeof w === "string" ? w : w?.slug || w?.id || "";
              const name = DISPLAY_NAMES[slug] || (typeof w === "object" ? (w?.displayName || w?.name || prettyWorkerName(slug)) : prettyWorkerName(slug));
              return (
                <Card key={i} style={{ cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("ta:select-worker", { detail: { slug, name } }));
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 4 }}>Open</div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* My Games */}
      {myGames.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>My Games</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {myGames.map((w, i) => {
              const slug = typeof w === "string" ? w : w?.slug || w?.id || "";
              const name = typeof w === "object" ? (w?.displayName || w?.name || slug) : slug;
              return (
                <Card key={i} style={{ cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#16A34A"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#16A34A", marginTop: 4 }}>Play</div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {myWorkers.length === 0 && myGames.length === 0 && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Your vault is ready</div>
          <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
            Start a conversation with Alex to add documents, vehicles, properties, or any records you want to track.
            Browse the Marketplace to find Digital Workers for your industry.
          </div>
        </Card>
      )}

      {/* Getting started tips */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Getting started</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Talk to Alex</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
              Tell Alex about something you own — a car, a house, a certification. Alex creates the record and stores it in your vault.
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Browse workers</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
              Find Digital Workers built by experts in your industry. Add them to your vault and they appear in My Workers.
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Upload documents</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
              Store important documents in your vault. Alex can help you organize and find them later.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
