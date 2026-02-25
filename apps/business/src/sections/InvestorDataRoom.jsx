import React, { useState, useEffect } from "react";
import ChatPanel from "../components/ChatPanel";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function apiHeaders() {
  const h = { "Content-Type": "application/json" };
  const token = localStorage.getItem("ID_TOKEN");
  if (token) h.Authorization = `Bearer ${token}`;
  const tid = localStorage.getItem("TENANT_ID");
  if (tid) h["X-Tenant-Id"] = tid;
  return h;
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
    headers: apiHeaders(),
    ...opts,
  });
  return res.json();
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(n) {
  if (!n) return "$0";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatName(name) {
  if (!name) return "";
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Sidebar nav items ────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "investor-docs", label: "Investor Docs", icon: "docs" },
  { id: "subscription", label: "Subscription Docs", icon: "legal" },
  { id: "governance", label: "Governance & Voting", icon: "governance" },
  { id: "id-check", label: "ID Verification", icon: "id" },
  { id: "wallet", label: "Wallet", icon: "wallet" },
  { id: "profile", label: "Profile", icon: "profile" },
];

function NavIcon({ type, active }) {
  const color = active ? "#7c3aed" : "#64748b";
  const icons = {
    home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    docs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    legal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    governance: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    id: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M15 8h2"/><path d="M15 12h2"/><path d="M5 18c0-2 2-3 4-3s4 1 4 3"/></svg>,
    wallet: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
    profile: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  };
  return icons[type] || icons.home;
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Standalone investor experience
// ══════════════════════════════════════════════════════════════════

export default function InvestorDataRoom() {
  const [section, setSection] = useState("overview");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data state
  const [docs, setDocs] = useState([]);
  const [gates, setGates] = useState(null);
  const [raiseConfig, setRaiseConfig] = useState(null);
  const [capTable, setCapTable] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [disclaimers, setDisclaimers] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gate modal
  const [gateModal, setGateModal] = useState(null);
  const [disclaimerChecks, setDisclaimerChecks] = useState({});
  const [acceptingDisclaimer, setAcceptingDisclaimer] = useState(false);

  useEffect(() => {
    localStorage.setItem('VERTICAL', 'investor');
    const user = auth.currentUser;
    if (user) {
      setUserName(formatName(user.displayName) || user.email?.split("@")[0] || "Investor");
      setUserEmail(user.email || "");
    }
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        setUserName(formatName(u.displayName) || u.email?.split("@")[0] || "Investor");
        setUserEmail(u.email || "");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  // Check for ?verified=true (returning from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      apiFetch("/v1/investor:confirm-verification", { method: "POST", body: JSON.stringify({}) })
        .then(() => {
          setGates(prev => ({ ...prev, identityVerified: true }));
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [docsRes, gatesRes, raiseRes, capRes, proposalsRes, updatesRes, disclaimersRes] = await Promise.all([
        apiFetch("/v1/investor:docs"),
        apiFetch("/v1/investor:gates"),
        apiFetch("/v1/raise:config"),
        apiFetch("/v1/governance:cap-table"),
        apiFetch("/v1/governance:proposals"),
        apiFetch("/v1/investor:updates:list"),
        apiFetch("/v1/config:disclaimers"),
      ]);
      setDocs(docsRes.documents || []);
      if (gatesRes.ok) setGates(gatesRes);
      if (raiseRes.ok) setRaiseConfig(raiseRes.config || raiseRes);
      if (capRes.ok) setCapTable(capRes.capTable || null);
      if (proposalsRes.ok) setProposals(proposalsRes.proposals || []);
      if (updatesRes.ok) setUpdates(updatesRes.updates || []);
      if (disclaimersRes.ok) setDisclaimers(disclaimersRes.disclaimers || null);
    } catch (e) {
      console.error("Data room load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  const isVerified = gates?.identityVerified;
  const hasDisclaimer = gates?.disclaimerAccepted;
  const tier2Unlocked = isVerified && hasDisclaimer;

  async function handleDocClick(doc) {
    if (doc.tier === 2 && !tier2Unlocked) {
      if (!isVerified) setGateModal("verify");
      else if (!hasDisclaimer) setGateModal("disclaimer");
      return;
    }
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, "_blank");
      return;
    }
    if (doc.storagePath) {
      try {
        const res = await apiFetch("/v1/files:readUrl", {
          method: "POST",
          body: JSON.stringify({ storagePath: doc.storagePath, expiresInSec: 600 }),
        });
        if (res.ok && res.url) {
          window.open(res.url, "_blank");
        } else {
          alert("This document is not available for download yet. Please check back later.");
        }
      } catch (e) {
        console.error("Download failed:", e);
        alert("Unable to download this document. Please try again later.");
      }
    } else {
      alert("This document does not have a download link yet.");
    }
  }

  async function startVerification() {
    try {
      const res = await apiFetch("/v1/investor:verify-identity", {
        method: "POST",
        body: JSON.stringify({
          successUrl: window.location.origin + "/invest/room?verified=true",
          cancelUrl: window.location.origin + "/invest/room",
        }),
      });
      if (res.ok && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
    } catch (e) {
      console.error("Verification start failed:", e);
    }
    // Test bypass fallback
    if (window.confirm("Stripe verification unavailable. Bypass for testing?")) {
      try {
        const bypassRes = await apiFetch("/v1/me:update", {
          method: "POST",
          body: JSON.stringify({ idVerified: true, idVerifiedAt: new Date().toISOString() }),
        });
        if (bypassRes.ok) {
          setGates(prev => ({ ...prev, identityVerified: true }));
          setGateModal(null);
        }
      } catch (e) {
        console.error("Test bypass failed:", e);
      }
    }
  }

  async function acceptDisclaimer() {
    setAcceptingDisclaimer(true);
    try {
      const res = await apiFetch("/v1/investor:accept-disclaimer", {
        method: "POST",
        body: JSON.stringify({ version: disclaimers?.version || "v1" }),
      });
      if (res.ok) {
        setGates(prev => ({ ...prev, disclaimerAccepted: true, disclaimerVersion: disclaimers?.version || "v1" }));
        setGateModal(null);
      }
    } catch (e) {
      console.error("Disclaimer acceptance failed:", e);
    } finally {
      setAcceptingDisclaimer(false);
    }
  }

  function handleSignOut() {
    auth.signOut().then(() => {
      localStorage.removeItem("ID_TOKEN");
      localStorage.removeItem("TENANT_ID");
      window.location.href = "/invest";
    });
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f6f7fb" }}>
      {/* LEFT SIDEBAR — Navigation */}
      <aside style={{
        width: sidebarCollapsed ? 60 : 220,
        minWidth: sidebarCollapsed ? 60 : 220,
        background: "#0b1020",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s, min-width 0.2s",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? "16px 8px" : "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0,
          }}>T</div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>TitleApp</div>
              <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>Data Room</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: sidebarCollapsed ? "10px 12px" : "10px 12px",
                marginBottom: 2,
                border: "none",
                borderRadius: 8,
                background: section === item.id ? "rgba(124,58,237,0.15)" : "transparent",
                color: section === item.id ? "#a78bfa" : "#94a3b8",
                fontSize: 13,
                fontWeight: section === item.id ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
              }}
              title={item.label}
            >
              <NavIcon type={item.icon} active={section === item.id} />
              {!sidebarCollapsed && item.label}
            </button>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          style={{
            padding: "12px",
            border: "none",
            background: "rgba(255,255,255,0.05)",
            color: "#64748b",
            fontSize: 12,
            cursor: "pointer",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {sidebarCollapsed ? ">>" : "<<"}
        </button>
      </aside>

      {/* CENTER — Header + Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top header bar */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 56,
          background: "white",
          borderBottom: "1px solid #e8ebf3",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Investor Data Room</h1>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>The Title App LLC</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Access badges */}
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: isVerified ? "#dcfce7" : "#fef3c7",
                color: isVerified ? "#16a34a" : "#d97706",
              }}>
                {isVerified ? "Verified" : "Unverified"}
              </span>
              <span style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: hasDisclaimer ? "#dcfce7" : "#fef3c7",
                color: hasDisclaimer ? "#16a34a" : "#d97706",
              }}>
                {hasDisclaimer ? "Disclaimers OK" : "Disclaimers Pending"}
              </span>
            </div>
            <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
              {userName}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
                background: "white", color: "#64748b", fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Content area */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 60 }}>Loading data room...</div>
          ) : (
            <>
              {section === "overview" && (
                <OverviewSection
                  raiseConfig={raiseConfig}
                  capTable={capTable}
                  updates={updates}
                  gates={gates}
                  isVerified={isVerified}
                  tier2Unlocked={tier2Unlocked}
                  onUnlock={() => setGateModal(isVerified ? "disclaimer" : "verify")}
                  onNavigate={setSection}
                />
              )}
              {section === "investor-docs" && (
                <InvestorDocsSection
                  docs={docs.filter(d => d.tier === 1 || d.type !== "safe")}
                  tier2Unlocked={tier2Unlocked}
                  onDocClick={handleDocClick}
                  onUnlock={() => setGateModal(isVerified ? "disclaimer" : "verify")}
                />
              )}
              {section === "subscription" && (
                <SubscriptionDocsSection
                  docs={docs.filter(d => d.type === "safe" || d.category === "Subscription")}
                  raiseConfig={raiseConfig}
                  tier2Unlocked={tier2Unlocked}
                  onDocClick={handleDocClick}
                  onUnlock={() => setGateModal(isVerified ? "disclaimer" : "verify")}
                />
              )}
              {section === "governance" && (
                <GovernanceSection
                  capTable={capTable}
                  proposals={proposals}
                  raiseConfig={raiseConfig}
                />
              )}
              {section === "id-check" && (
                <IDCheckSection
                  gates={gates}
                  isVerified={isVerified}
                  hasDisclaimer={hasDisclaimer}
                  disclaimers={disclaimers}
                  disclaimerChecks={disclaimerChecks}
                  setDisclaimerChecks={setDisclaimerChecks}
                  onStartVerify={startVerification}
                  onAcceptDisclaimer={acceptDisclaimer}
                  acceptingDisclaimer={acceptingDisclaimer}
                />
              )}
              {section === "wallet" && <WalletSection gates={gates} />}
              {section === "profile" && (
                <ProfileSection
                  userName={userName}
                  userEmail={userEmail}
                  gates={gates}
                  onSave={loadAll}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* RIGHT — Persistent Chat Panel */}
      <aside style={{
        width: "38%",
        maxWidth: 520,
        minWidth: 340,
        borderLeft: "2px solid #e8ebf3",
        boxShadow: "-4px 0 16px rgba(15,23,42,0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "white",
      }}>
        <ChatPanel currentSection={`investor-${section}`} />
      </aside>

      {/* Gate modal overlay */}
      {gateModal && (
        <GateModal
          type={gateModal}
          disclaimers={disclaimers}
          disclaimerChecks={disclaimerChecks}
          setDisclaimerChecks={setDisclaimerChecks}
          acceptingDisclaimer={acceptingDisclaimer}
          onStartVerify={startVerification}
          onAcceptDisclaimer={acceptDisclaimer}
          onClose={() => setGateModal(null)}
        />
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// OVERVIEW — Raise thermometer, quick links, recent updates
// ══════════════════════════════════════════════════════════════════

function OverviewSection({ raiseConfig, capTable, updates, gates, isVerified, tier2Unlocked, onUnlock, onNavigate }) {
  const raised = raiseConfig?.raiseCurrent || capTable?.totalRaised || 0;
  const target = raiseConfig?.raiseTarget || raiseConfig?.raiseAmount || 1070000;
  const pct = Math.min(100, (raised / target) * 100);
  const investorCount = raiseConfig?.investorCount || capTable?.investors?.length || 0;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Raise thermometer card */}
      <div style={{
        background: "white", borderRadius: 16, padding: 28,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Current Raise
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              {formatCurrency(raised)}
              <span style={{ fontSize: 16, fontWeight: 500, color: "#94a3b8" }}> / {formatCurrency(target)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>{investorCount}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>investor{investorCount !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: "100%", height: 12, borderRadius: 6, background: "#f1f5f9",
          overflow: "hidden", marginBottom: 12,
        }}>
          <div style={{
            width: `${pct}%`, height: "100%", borderRadius: 6,
            background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
            transition: "width 0.8s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
          <span>{pct.toFixed(1)}% funded</span>
          <span>{raiseConfig?.instrument || "Post-Money SAFE"}</span>
        </div>
      </div>

      {/* Key terms grid */}
      {raiseConfig && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20,
        }}>
          {[
            { label: "Valuation Cap", value: formatCurrency(raiseConfig.valuationCap) },
            { label: "Discount", value: raiseConfig.discount ? `${(raiseConfig.discount * 100).toFixed(0)}%` : "N/A" },
            { label: "Minimum", value: formatCurrency(raiseConfig.minimumInvestment) },
            { label: "Pro Rata", value: raiseConfig.proRataNote || "Yes" },
            { label: "Regulation", value: raiseConfig.fundingPortal?.regulation || "Reg CF" },
            { label: "Runway", value: raiseConfig.runway?.withRevenueMonths || "33+ mo" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "white", borderRadius: 12, padding: "16px 18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20,
      }}>
        {raiseConfig?.fundingPortal?.url && (
          <a
            href={raiseConfig.fundingPortal.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 20px", borderRadius: 12, border: "none",
              background: "#7c3aed", color: "white", fontSize: 14, fontWeight: 600,
              textDecoration: "none", cursor: "pointer",
            }}
          >
            Invest via {raiseConfig.fundingPortal.name || "Wefunder"}
          </a>
        )}
        {!tier2Unlocked && (
          <button
            onClick={onUnlock}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 20px", borderRadius: 12, border: "1px solid #e2e8f0",
              background: "white", color: "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            {isVerified ? "Accept Disclaimers" : "Unlock Full Access"}
          </button>
        )}
        <button
          onClick={() => onNavigate("investor-docs")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 20px", borderRadius: 12, border: "1px solid #e2e8f0",
            background: "white", color: "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          View Documents
        </button>
        <button
          onClick={() => onNavigate("governance")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 20px", borderRadius: 12, border: "1px solid #e2e8f0",
            background: "white", color: "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          Governance
        </button>
      </div>

      {/* Recent updates */}
      {updates.length > 0 && (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, margin: 0, marginBottom: 16 }}>
            Recent Updates
          </h3>
          {updates.slice(0, 3).map(u => (
            <div key={u.id} style={{
              padding: "12px 0", borderBottom: "1px solid #f1f5f9",
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{u.title}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                {formatDate(u.publishedAt)} -- {u.category || "Update"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team */}
      {raiseConfig?.team && raiseConfig.team.length > 0 && (
        <div style={{
          background: "white", borderRadius: 16, padding: 24, marginTop: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 16 }}>
            Leadership Team
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {raiseConfig.team.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "#7c3aed", flexShrink: 0,
                }}>
                  {t.name?.charAt(0) || "?"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{t.role}{t.note ? ` -- ${t.note}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// INVESTOR DOCS — Pitch deck, exec summary, business plan
// ══════════════════════════════════════════════════════════════════

function InvestorDocsSection({ docs, tier2Unlocked, onDocClick, onUnlock }) {
  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Investor Documents</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Review our pitch materials and company documentation.
      </p>

      {!tier2Unlocked && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
          padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 13, color: "#92400e" }}>
            Some documents require identity verification and disclaimer acceptance.
          </div>
          <button
            onClick={onUnlock}
            style={{
              padding: "6px 16px", borderRadius: 8, border: "none",
              background: "#7c3aed", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {docs.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", background: "white", borderRadius: 12 }}>
            No documents available yet.
          </div>
        ) : docs.map((doc, i) => {
          const locked = doc.tier === 2 && !tier2Unlocked;
          return (
            <div key={i} style={{
              background: "white", borderRadius: 12, padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              opacity: locked ? 0.75 : 1,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: locked ? "#f1f5f9" : "#ede9fe",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  {doc.icon === "presentation" ? "\u{1F4CA}" : "\u{1F4C4}"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{doc.description}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: doc.tier === 1 ? "#dcfce7" : locked ? "#fef3c7" : "#dcfce7",
                  color: doc.tier === 1 ? "#16a34a" : locked ? "#d97706" : "#16a34a",
                }}>
                  {doc.tier === 1 ? "Open" : locked ? "Locked" : "Unlocked"}
                </span>
                <button
                  onClick={() => onDocClick(doc)}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600,
                    background: locked ? "#f1f5f9" : "#7c3aed", color: locked ? "#94a3b8" : "white",
                    cursor: "pointer",
                  }}
                >
                  {locked ? "Verify to View" : "Download"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// SUBSCRIPTION DOCS — SAFE agreement, invest via Wefunder
// ══════════════════════════════════════════════════════════════════

function SubscriptionDocsSection({ docs, raiseConfig, tier2Unlocked, onDocClick, onUnlock }) {
  const [investAmount, setInvestAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wire");
  const [accreditedConfirmed, setAccreditedConfirmed] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState(null);
  const [typedName, setTypedName] = useState("");
  const [signing, setSigning] = useState(false);

  // Load existing intent on mount
  useEffect(() => {
    apiFetch("/v1/investor:intent").then(res => {
      if (res.ok && res.intent) setIntent(res.intent);
    }).catch(() => {});
  }, []);

  async function handleSubmitIntent() {
    const amt = Number(investAmount);
    const min = raiseConfig?.minimumInvestment || 1000;
    if (!amt || amt < min) { alert(`Minimum investment is $${min.toLocaleString()}`); return; }
    if (!riskAcknowledged) { alert("Please acknowledge the risk disclosure."); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch("/v1/investor:submit-intent", {
        method: "POST",
        body: JSON.stringify({ amount: amt, paymentMethod, accreditedConfirmed }),
      });
      if (res.ok) {
        setIntent({ amount: amt, paymentMethod, status: res.method === "hellosign" ? "safe_sent" : "consent_pending", safeMethod: res.method, safeConsentId: res.consentId });
        if (res.signUrl) {
          window.open(res.signUrl, "_blank");
        }
      } else {
        alert(res.error || "Failed to submit. Please try again.");
      }
    } catch (e) {
      console.error("Submit intent failed:", e);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignConsent() {
    if (!typedName.trim()) { alert("Please type your full legal name to sign."); return; }
    setSigning(true);
    try {
      const res = await apiFetch("/v1/investor:sign-consent", {
        method: "POST",
        body: JSON.stringify({ consentId: intent.safeConsentId, typedName: typedName.trim(), agreedToTerms: true }),
      });
      if (res.ok) {
        setIntent(prev => ({ ...prev, status: "signed" }));
      }
    } catch (e) {
      console.error("Consent sign failed:", e);
    } finally {
      setSigning(false);
    }
  }

  const min = raiseConfig?.minimumInvestment || 1000;

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Subscription Documents</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Investment terms, subscription agreements, and SAFE signing.
      </p>

      {/* Offering Summary */}
      {raiseConfig && (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Offering Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
            <div><span style={{ color: "#64748b" }}>Instrument:</span> <strong>{raiseConfig.instrument || "Post-Money SAFE"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Raise Target:</span> <strong>{formatCurrency(raiseConfig.raiseTarget || raiseConfig.raiseAmount)}</strong></div>
            <div><span style={{ color: "#64748b" }}>Valuation Cap:</span> <strong>{formatCurrency(raiseConfig.valuationCap)}</strong></div>
            <div><span style={{ color: "#64748b" }}>Discount:</span> <strong>{raiseConfig.discount ? `${(raiseConfig.discount * 100).toFixed(0)}%` : "N/A"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Minimum:</span> <strong>{formatCurrency(raiseConfig.minimumInvestment)}</strong></div>
            <div><span style={{ color: "#64748b" }}>Pro Rata:</span> <strong>{raiseConfig.proRataNote || "N/A"}</strong></div>
          </div>

          {/* Conversion scenarios */}
          {raiseConfig.conversionScenarios && raiseConfig.conversionScenarios.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>Conversion Scenarios</div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontStyle: "italic" }}>
                Mathematical scenarios based on SAFE terms. Not projections or promises. Early-stage investing carries significant risk.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {raiseConfig.conversionScenarios.map((s, i) => (
                  <div key={i} style={{
                    textAlign: "center", padding: "10px 8px", borderRadius: 8, background: "#f8fafc",
                  }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{formatCurrency(s.exitValuation)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed" }}>{s.multiple}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Investment Intent Form OR Status */}
      {intent?.status === "signed" ? (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
          border: "1px solid #bbf7d0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u2713"}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>SAFE Agreement Signed</div>
              <div style={{ fontSize: 13, color: "#16a34a" }}>Investment of {formatCurrency(intent.amount)} confirmed</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            Your SAFE agreement has been signed. Payment instructions will be sent to your email.
            You can track your investment status in the Wallet section.
          </p>
        </div>
      ) : intent?.status === "consent_pending" ? (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
          border: "1px solid #fde68a",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Sign SAFE Agreement</h3>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Investment amount: <strong>{formatCurrency(intent.amount)}</strong> via <strong>{intent.paymentMethod || "wire transfer"}</strong>
          </p>

          <div style={{
            background: "#f8fafc", borderRadius: 12, padding: 20, marginBottom: 16,
            border: "1px solid #e2e8f0", fontSize: 13, color: "#475569", lineHeight: 1.7,
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", margin: "0 0 10px 0" }}>Post-Money SAFE Agreement</p>
            <p style={{ margin: "0 0 8px 0" }}>By signing below, I agree to invest <strong>{formatCurrency(intent.amount)}</strong> in The Title App LLC ("Company") under the following terms:</p>
            <ul style={{ margin: "0 0 8px 0", paddingLeft: 20 }}>
              <li>Instrument: {raiseConfig?.instrument || "Post-Money SAFE"}</li>
              <li>Valuation Cap: {formatCurrency(raiseConfig?.valuationCap)}</li>
              <li>Discount: {raiseConfig?.discount ? `${(raiseConfig.discount * 100).toFixed(0)}%` : "N/A"}</li>
              <li>Pro Rata Rights: {raiseConfig?.proRataNote || "Yes"}</li>
            </ul>
            <p style={{ margin: "0 0 8px 0" }}>I understand that this investment involves significant risk, including the possible loss of my entire investment. I have reviewed the risk disclosures and offering documents.</p>
            <p style={{ margin: 0, fontStyle: "italic", color: "#94a3b8" }}>This is a legally binding agreement. Please consult legal and financial advisors before signing.</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Type your full legal name to sign
            </label>
            <input
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder="Your Full Legal Name"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10,
                border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a",
                fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                fontStyle: "italic", outline: "none",
              }}
            />
          </div>

          <button
            onClick={handleSignConsent}
            disabled={signing || !typedName.trim()}
            style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: typedName.trim() ? "#7c3aed" : "#cbd5e1",
              color: "white", fontSize: 14, fontWeight: 600,
              cursor: typedName.trim() ? "pointer" : "not-allowed",
            }}
          >
            {signing ? "Signing..." : "Sign SAFE Agreement"}
          </button>
        </div>
      ) : intent?.status === "safe_sent" ? (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
          border: "1px solid #93c5fd",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>SAFE Agreement Sent for Signing</h3>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            Your SAFE agreement for <strong>{formatCurrency(intent.amount)}</strong> has been sent via DropboxSign.
            Check your email ({auth.currentUser?.email}) for the signing link, or click below to open it.
          </p>
          <button
            onClick={() => alert("Check your email for the DropboxSign signing link.")}
            style={{
              marginTop: 12, padding: "10px 24px", borderRadius: 10, border: "1px solid #7c3aed",
              background: "white", color: "#7c3aed", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Resend Signing Link
          </button>
        </div>
      ) : (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Invest in TitleApp</h3>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            Submit your investment intent and sign the SAFE agreement.
          </p>

          {/* Amount */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Investment Amount (minimum {formatCurrency(min)})
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#94a3b8", fontWeight: 600 }}>$</span>
              <input
                type="number"
                value={investAmount}
                onChange={e => setInvestAmount(e.target.value)}
                min={min}
                step={100}
                placeholder={min.toLocaleString()}
                style={{
                  width: "100%", padding: "12px 14px 12px 28px", borderRadius: 10,
                  border: "1px solid #e2e8f0", fontSize: 16, fontWeight: 600, color: "#0f172a", outline: "none",
                }}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>
              Payment Method
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "wire", label: "Wire Transfer" },
                { id: "ach", label: "ACH" },
                { id: "check", label: "Check" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
                    border: paymentMethod === m.id ? "1px solid #7c3aed" : "1px solid #e2e8f0",
                    background: paymentMethod === m.id ? "#ede9fe" : "white",
                    color: paymentMethod === m.id ? "#7c3aed" : "#64748b",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirmations */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", gap: 10, marginBottom: 12, cursor: "pointer", fontSize: 13, alignItems: "flex-start" }}>
              <input type="checkbox" checked={accreditedConfirmed} onChange={e => setAccreditedConfirmed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ color: "#0f172a" }}>I am an accredited investor <span style={{ color: "#94a3b8" }}>(optional -- Reg CF allows non-accredited investors)</span></span>
            </label>
            <label style={{ display: "flex", gap: 10, cursor: "pointer", fontSize: 13, alignItems: "flex-start" }}>
              <input type="checkbox" checked={riskAcknowledged} onChange={e => setRiskAcknowledged(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ color: "#0f172a" }}>I understand that investing in startups involves significant risk, including the possible loss of my entire investment. I have reviewed the offering documents and risk disclosures.</span>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmitIntent}
            disabled={submitting || !investAmount || !riskAcknowledged}
            style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: (investAmount && riskAcknowledged) ? "#7c3aed" : "#cbd5e1",
              color: "white", fontSize: 14, fontWeight: 600,
              cursor: (investAmount && riskAcknowledged) ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Submitting..." : "Submit Investment & Sign SAFE"}
          </button>
        </div>
      )}

      {/* Wefunder CTA */}
      {raiseConfig?.fundingPortal?.url && !intent?.status && (
        <div style={{
          background: "white", borderRadius: 16, padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Or invest via {raiseConfig.fundingPortal.name || "Wefunder"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{raiseConfig.fundingPortal.regulation || "Reg CF"}</div>
          </div>
          <a
            href={raiseConfig.fundingPortal.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 20px", borderRadius: 10, border: "1px solid #7c3aed",
              background: "white", color: "#7c3aed", fontSize: 13, fontWeight: 600,
              textDecoration: "none", cursor: "pointer",
            }}
          >
            {raiseConfig.fundingPortal.name || "Wefunder"}
          </a>
        </div>
      )}

      {/* Other docs */}
      {docs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {docs.map((doc, i) => {
            const locked = doc.tier === 2 && !tier2Unlocked;
            return (
              <div key={i} style={{
                background: "white", borderRadius: 12, padding: "18px 20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                opacity: locked ? 0.75 : 1,
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "#ede9fe",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {"\u{1F4DC}"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{doc.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => onDocClick(doc)}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600,
                    background: locked ? "#f1f5f9" : "#7c3aed", color: locked ? "#94a3b8" : "white",
                    cursor: "pointer",
                  }}
                >
                  {locked ? "Verify to View" : "Download"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!tier2Unlocked && (
        <div style={{
          background: "#f8fafc", borderRadius: 12, padding: "18px 20px", marginTop: 16,
          border: "1px dashed #e2e8f0", textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
            Full subscription documents require identity verification.
          </div>
          <button
            onClick={onUnlock}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: "#7c3aed", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Unlock Full Access
          </button>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// GOVERNANCE — Cap table, proposals, voting
// ══════════════════════════════════════════════════════════════════

function GovernanceSection({ capTable, proposals, raiseConfig }) {
  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Governance & Voting</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Share registry, governance proposals, and conversion scenarios.
      </p>

      {/* Cap Table */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Share Registry</h3>
        {capTable && capTable.investors && capTable.investors.length > 0 ? (
          <>
            <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 13 }}>
              <div><span style={{ color: "#64748b" }}>Total Raised:</span> <strong>{formatCurrency(capTable.totalRaised)}</strong></div>
              <div><span style={{ color: "#64748b" }}>Target:</span> <strong>{formatCurrency(capTable.targetRaise)}</strong></div>
              <div><span style={{ color: "#64748b" }}>Investors:</span> <strong>{capTable.investors.length}</strong></div>
            </div>
            <div style={{
              width: "100%", height: 8, borderRadius: 4, background: "#f1f5f9",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${Math.min(100, ((capTable.totalRaised || 0) / (capTable.targetRaise || 1)) * 100)}%`,
                height: "100%", borderRadius: 4, background: "#7c3aed",
              }} />
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>
            No investors yet. Be the first to invest in TitleApp.
          </p>
        )}
      </div>

      {/* Proposals */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Governance Proposals</h3>
        {proposals.length > 0 ? (
          proposals.map(p => (
            <div key={p.id} style={{
              padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{p.description}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                Status: {p.status} | Closes: {formatDate(p.closesAt)}
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>
            No governance proposals yet. Proposals will appear here after the first investment closes.
          </p>
        )}
      </div>

      {/* Conversion scenarios */}
      {raiseConfig?.conversionScenarios && raiseConfig.conversionScenarios.length > 0 && (
        <div style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Conversion Scenarios</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, fontStyle: "italic" }}>
            Mathematical scenarios based on SAFE terms. Not projections or promises.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Exit Valuation</th>
                <th style={{ textAlign: "right", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Multiple</th>
              </tr>
            </thead>
            <tbody>
              {raiseConfig.conversionScenarios.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 0", color: "#0f172a" }}>{formatCurrency(s.exitValuation)}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>{s.multiple}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// ID CHECK — Verification + disclaimers in one place
// ══════════════════════════════════════════════════════════════════

function IDCheckSection({ gates, isVerified, hasDisclaimer, disclaimers, disclaimerChecks, setDisclaimerChecks, onStartVerify, onAcceptDisclaimer, acceptingDisclaimer }) {
  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Identity Verification</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Complete these steps to unlock full access to investor materials.
      </p>

      {/* Step 1: Identity */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
        border: isVerified ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: isVerified ? "#dcfce7" : "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {isVerified ? "\u2713" : "1"}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Identity Verification</h3>
        </div>
        {isVerified ? (
          <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
            Your identity has been verified. Thank you.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 14 }}>
              A one-time $2 identity check via Stripe Identity. This verifies your identity and sets up your TitleApp Vault for secure document access.
            </p>
            <button
              onClick={onStartVerify}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: "#7c3aed", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Verify Identity ($2)
            </button>
          </>
        )}
      </div>

      {/* Step 2: Disclaimers */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        border: hasDisclaimer ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
        opacity: isVerified ? 1 : 0.6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: hasDisclaimer ? "#dcfce7" : "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {hasDisclaimer ? "\u2713" : "2"}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Risk Acknowledgment</h3>
        </div>
        {hasDisclaimer ? (
          <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
            Disclaimers accepted. You have full access to all investor documents.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 14 }}>
              {isVerified
                ? "Please review and acknowledge the following risk disclosures."
                : "Complete identity verification first, then accept risk disclosures."}
            </p>
            {isVerified && disclaimers?.items && (
              <>
                {disclaimers.items.map(item => (
                  <label key={item.id} style={{
                    display: "flex", gap: 10, marginBottom: 12, cursor: "pointer",
                    padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0",
                  }}>
                    <input
                      type="checkbox"
                      checked={!!disclaimerChecks[item.id]}
                      onChange={e => setDisclaimerChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.text}</div>
                    </div>
                  </label>
                ))}
                <button
                  onClick={onAcceptDisclaimer}
                  disabled={acceptingDisclaimer || disclaimers.items.filter(i => i.required).some(i => !disclaimerChecks[i.id])}
                  style={{
                    padding: "10px 24px", borderRadius: 10, border: "none",
                    background: disclaimers.items.filter(i => i.required).every(i => disclaimerChecks[i.id])
                      ? "#7c3aed" : "#cbd5e1",
                    color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8,
                  }}
                >
                  {acceptingDisclaimer ? "Accepting..." : "I Acknowledge"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// WALLET — Token/ownership placeholder
// ══════════════════════════════════════════════════════════════════

function WalletSection({ gates }) {
  const stage = gates?.investorStage || "PROSPECT";
  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Wallet</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Your investment position and ownership tokens.
      </p>

      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Your Investment</h3>
          <span style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: stage === "PROSPECT" ? "#dbeafe" : stage === "VERIFIED" ? "#fef3c7" : "#dcfce7",
            color: stage === "PROSPECT" ? "#2563eb" : stage === "VERIFIED" ? "#d97706" : "#16a34a",
          }}>
            {stage}
          </span>
        </div>
        {(stage === "PROSPECT" || stage === "VERIFIED") ? (
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            You have not yet made an investment. When you are ready, visit the Subscription Documents section to review the SAFE terms and invest via Wefunder.
            After investing, this section will show your investment amount, ownership estimate, and return scenarios.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "#64748b" }}>Investment details will appear here.</p>
        )}
      </div>

      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 12 }}>Token Details</h3>
        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
          After investment and share conversion, your ownership will be tokenized on-chain via Polygon,
          giving you a verifiable, portable record of ownership. Token details will appear here.
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// PROFILE — Investor profile info
// ══════════════════════════════════════════════════════════════════

function ProfileSection({ userName, userEmail, gates, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    displayName: userName || "",
    company: "",
    title: "",
    linkedIn: "",
    twitter: "",
    accreditedInvestor: false,
    investmentRangeMin: "",
    investmentRangeMax: "",
    investmentInterests: "",
    emailFrequency: "weekly",
  });
  const [avatar, setAvatar] = useState(() => localStorage.getItem("INVESTOR_AVATAR") || null);
  const fileRef = React.useRef(null);

  // Load saved profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("INVESTOR_PROFILE") || "{}");
      setProfile(prev => ({ ...prev, ...saved, displayName: userName || saved.displayName || "" }));
    } catch (e) { /* ignore */ }
  }, [userName]);

  function handleAvatarClick() {
    fileRef.current?.click();
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      localStorage.setItem("INVESTOR_AVATAR", dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function updateField(key, value) {
    setProfile(prev => ({ ...prev, [key]: value }));
    setEditing(true);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {};
      if (profile.displayName) payload.displayName = profile.displayName;
      if (profile.company) payload.company = profile.company;
      if (profile.title) payload.title = profile.title;
      if (profile.linkedIn) payload.linkedIn = profile.linkedIn;
      if (profile.twitter) payload.twitter = profile.twitter;
      payload.accreditedInvestor = profile.accreditedInvestor;
      if (profile.investmentRangeMin) payload.investmentRangeMin = Number(profile.investmentRangeMin);
      if (profile.investmentRangeMax) payload.investmentRangeMax = Number(profile.investmentRangeMax);
      if (profile.investmentInterests) payload.investmentInterests = profile.investmentInterests;
      payload.emailFrequency = profile.emailFrequency;
      if (avatar) payload.photoUrl = avatar;

      const res = await apiFetch("/v1/me:update", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        localStorage.setItem("INVESTOR_PROFILE", JSON.stringify(profile));
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        if (onSave) onSave();
      }
    } catch (e) {
      console.error("Profile save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a",
    outline: "none", background: "#f8fafc",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" };

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Profile</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Your investor profile and account details.
      </p>

      {/* Avatar + Name header */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
          <div
            onClick={handleAvatarClick}
            style={{
              width: 64, height: 64, borderRadius: 16, cursor: "pointer",
              background: avatar ? `url(${avatar}) center/cover` : "linear-gradient(135deg, #7c3aed, #a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700, color: "white", flexShrink: 0,
              position: "relative", overflow: "hidden",
            }}
            title="Click to upload photo"
          >
            {!avatar && (userName?.charAt(0)?.toUpperCase() || "?")}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 20,
              background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "white", fontWeight: 500,
            }}>Edit</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Display Name</label>
            <input
              style={inputStyle}
              value={profile.displayName}
              onChange={e => updateField("displayName", e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>{userEmail}</div>
      </div>

      {/* Account Status (read-only) */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 16 }}>Account Status</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
          <div>
            <div style={{ color: "#94a3b8", marginBottom: 4 }}>Investor Stage</div>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>{gates?.investorStage || "PROSPECT"}</div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", marginBottom: 4 }}>Identity Status</div>
            <div style={{ fontWeight: 600, color: gates?.identityVerified ? "#16a34a" : "#d97706" }}>
              {gates?.identityVerified ? "Verified" : "Not Verified"}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", marginBottom: 4 }}>Disclaimers</div>
            <div style={{ fontWeight: 600, color: gates?.disclaimerAccepted ? "#16a34a" : "#d97706" }}>
              {gates?.disclaimerAccepted ? `Accepted (${gates.disclaimerVersion || "v1"})` : "Pending"}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", marginBottom: 4 }}>Data Room Access</div>
            <div style={{ fontWeight: 600, color: gates?.identityVerified && gates?.disclaimerAccepted ? "#16a34a" : "#d97706" }}>
              {gates?.identityVerified && gates?.disclaimerAccepted ? "Full Access" : "Tier 1 Only"}
            </div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 16 }}>Company Info</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} value={profile.company} onChange={e => updateField("company", e.target.value)} placeholder="Your company" />
          </div>
          <div>
            <label style={labelStyle}>Title / Role</label>
            <input style={inputStyle} value={profile.title} onChange={e => updateField("title", e.target.value)} placeholder="e.g. Managing Partner" />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 16 }}>Social Links</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>LinkedIn</label>
            <input style={inputStyle} value={profile.linkedIn} onChange={e => updateField("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label style={labelStyle}>Twitter / X</label>
            <input style={inputStyle} value={profile.twitter} onChange={e => updateField("twitter", e.target.value)} placeholder="@handle" />
          </div>
        </div>
      </div>

      {/* Investment Preferences */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 16 }}>Investment Preferences</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={profile.accreditedInvestor}
              onChange={e => updateField("accreditedInvestor", e.target.checked)}
            />
            <span style={{ color: "#0f172a", fontWeight: 500 }}>I am an accredited investor</span>
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Min Investment ($)</label>
            <input style={inputStyle} type="number" value={profile.investmentRangeMin} onChange={e => updateField("investmentRangeMin", e.target.value)} placeholder="1000" />
          </div>
          <div>
            <label style={labelStyle}>Max Investment ($)</label>
            <input style={inputStyle} type="number" value={profile.investmentRangeMax} onChange={e => updateField("investmentRangeMax", e.target.value)} placeholder="25000" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Investment Interests</label>
          <input style={inputStyle} value={profile.investmentInterests} onChange={e => updateField("investmentInterests", e.target.value)} placeholder="e.g. AI, SaaS, GovTech, PropTech" />
        </div>
      </div>

      {/* Communication Preferences */}
      <div style={{
        background: "white", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 16 }}>Communication Preferences</h3>
        <label style={labelStyle}>Email Update Frequency</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["realtime", "daily", "weekly", "none"].map(freq => (
            <button
              key={freq}
              onClick={() => updateField("emailFrequency", freq)}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
                border: profile.emailFrequency === freq ? "1px solid #7c3aed" : "1px solid #e2e8f0",
                background: profile.emailFrequency === freq ? "#ede9fe" : "white",
                color: profile.emailFrequency === freq ? "#7c3aed" : "#64748b",
              }}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      {editing && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: saving ? "#94a3b8" : "#7c3aed", color: "white",
            fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      )}
      {saved && (
        <div style={{ textAlign: "center", color: "#16a34a", fontWeight: 600, fontSize: 13, marginTop: 12 }}>
          Profile saved successfully.
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// GATE MODAL — Shared modal for verify + disclaimer
// ══════════════════════════════════════════════════════════════════

function GateModal({ type, disclaimers, disclaimerChecks, setDisclaimerChecks, acceptingDisclaimer, onStartVerify, onAcceptDisclaimer, onClose }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, maxWidth: 520, width: "90%",
        maxHeight: "80vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        {type === "verify" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Identity Verification</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
              Before accessing restricted investor materials, we need to verify your identity.
              This is a one-time $2 check that also sets up your TitleApp Vault.
            </p>
            <button
              onClick={onStartVerify}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: "#7c3aed", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Verify Identity ($2)
            </button>
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "10px", borderRadius: 10, border: "none",
                background: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginTop: 8,
              }}
            >
              Maybe later
            </button>
          </>
        )}
        {type === "disclaimer" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Risk Acknowledgment</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
              Please review and acknowledge the following before accessing investor materials:
            </p>
            {(disclaimers?.items || []).map(item => (
              <label key={item.id} style={{
                display: "flex", gap: 10, marginBottom: 14, cursor: "pointer",
                padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0",
              }}>
                <input
                  type="checkbox"
                  checked={!!disclaimerChecks[item.id]}
                  onChange={e => setDisclaimerChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.text}</div>
                </div>
              </label>
            ))}
            <button
              onClick={onAcceptDisclaimer}
              disabled={acceptingDisclaimer || (disclaimers?.items || []).filter(i => i.required).some(i => !disclaimerChecks[i.id])}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: (disclaimers?.items || []).filter(i => i.required).every(i => disclaimerChecks[i.id])
                  ? "#7c3aed" : "#cbd5e1",
                color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8,
              }}
            >
              {acceptingDisclaimer ? "Accepting..." : "I Acknowledge"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
