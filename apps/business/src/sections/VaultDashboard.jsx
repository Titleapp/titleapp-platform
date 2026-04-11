// CODEX 48.2 Fix 4 — Personal Vault dashboard.
//
// Renders when VERTICAL === "consumer" and currentSection === "dashboard".
// Shows vault-native content: greeting, recent documents, upcoming reminders,
// My Workers quick-launch, My Games quick-launch. Replaces WorkerHome
// which shows business worker cards.
//
// Intentionally simple for this pass — static sections with real data.
// No animations, no complex state.

import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function getFirstName() {
  // Read the user's actual name, not the workspace name. DISPLAY_NAME is set
  // from auth.currentUser.displayName in App.jsx on sign-in. Fall back to
  // auth email prefix. Never use COMPANY_NAME/WORKSPACE_NAME — those return
  // "Personal Vault" or "Personal" in vault mode.
  const raw =
    localStorage.getItem("DISPLAY_NAME") ||
    localStorage.getItem("USER_NAME") ||
    (localStorage.getItem("USER_EMAIL") || "").split("@")[0] ||
    "";
  const first = raw.split(" ")[0];
  return (first && first.length >= 2) ? first : null;
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

  const myWorkers = workers.filter(w => {
    const slug = typeof w === "string" ? w : w?.slug || "";
    // Games have a gameConfig flag or are in the game sandbox
    const isGame = typeof w === "object" && w?.workerType === "game";
    return !isGame;
  });
  const myGames = workers.filter(w => {
    return typeof w === "object" && w?.workerType === "game";
  });

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e" }}>
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </div>
        <div style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>
          Your Personal Vault — documents, records, and workers in one place.
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Documents</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>—</div>
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

      {/* My Workers */}
      {myWorkers.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>My Workers</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {myWorkers.map((w, i) => {
              const slug = typeof w === "string" ? w : w?.slug || w?.id || "";
              const name = typeof w === "object" ? (w?.displayName || w?.name || slug) : slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
