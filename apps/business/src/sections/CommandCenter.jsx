/**
 * CommandCenter.jsx — Control Center (display name).
 *
 * Per-user roll-up across all workspaces. File is named CommandCenter.jsx for
 * historical reasons; the displayed name is "Control Center" everywhere user-
 * facing because (a) "Control Center" is the worker name in the catalog
 * (platform-control-center-pro) and is referenced throughout the codebase,
 * and (b) consistency across UI + worker + sidebar avoids dual-naming
 * confusion.
 *
 * Launch-mode workspaces render specialty cards (Investor Outreach, Marketing
 * & Press with campaign detail, Creator Signups, Runway & Spend, Worker
 * Health, Status by Category, Launch Milestones). Operations-mode workspaces
 * show the per-workspace KV snapshot.
 */

import React, { useState, useEffect, useCallback } from "react";
import useCommandCenter from "../hooks/useCommandCenter";
import useAccounting from "../hooks/useAccounting";
import SuggestImprovementButton from "../components/SuggestImprovementButton";
import ConcernsCard from "../components/ConcernsCard";
import { useRightPanel } from "../context/RightPanelContext";
import CanvasPanel from "../components/canvas/CanvasPanel";

const MODE_BADGES = {
  launch:     { label: "Launch",     fg: "#7c3aed", bg: "#ede9fe" },
  operations: { label: "Operations", fg: "#0369a1", bg: "#e0f2fe" },
  dormant:    { label: "Hidden",     fg: "#94a3b8", bg: "#f1f5f9" },
};

// Briefcase icon — used in workspace headers. Active state gets the brand
// purple fill so the active section is unambiguous at a glance.
function WorkspaceIcon({ isActive }) {
  const color = isActive ? "#7c3aed" : "#94a3b8";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

export default function CommandCenter() {
  const panel = useRightPanel();
  const [brief, setBrief] = useState(null);
  const [sendStatus, setSendStatus] = useState(null);
  const { previewBrief, sendBrief, setWorkspaceMode, setMilestoneStatus, loading, error } = useCommandCenter();

  const refresh = useCallback(async () => {
    const r = await previewBrief();
    setBrief(r);
  }, [previewBrief]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onWorkspace = () => refresh();
    window.addEventListener("ta:workspace-changed", onWorkspace);
    return () => window.removeEventListener("ta:workspace-changed", onWorkspace);
  }, [refresh]);

  const onSend = async () => {
    setSendStatus({ state: "sending" });
    const r = await sendBrief();
    if (r?.ok && r.emailed) setSendStatus({ state: "sent" });
    else if (r?.skipped) setSendStatus({ state: "skipped", reason: r.reason });
    else setSendStatus({ state: "error", message: r?.error || "Send failed" });
  };

  const onMilestoneChange = async ({ milestoneId, status, kind }) => {
    await setMilestoneStatus({ milestoneId, status, kind });
    refresh();
  };

  const onModeChange = async (tenantId, newMode) => {
    // 50.27 — guard against accidental Hidden clicks. Hidden = workspace is
    // entirely removed from the Control Center main view; user can flip it
    // back from the mode panel. Confirm before flipping so a stray click
    // doesn't wipe a workspace's brief.
    if (newMode === "dormant") {
      const ok = window.confirm(
        "Hide this workspace from Control Center?\n\n" +
        "Hidden workspaces are skipped from the launch/operations roll-up and don't get emailed in the brief. You can un-hide it by flipping the mode back to Launch or Operations."
      );
      if (!ok) return;
    }
    await setWorkspaceMode({ tenantId, mode: newMode });
    refresh();
  };

  // 2026-05-22 (#219) — Surface chat-dispatched canvas card when state=CANVAS.
  if (panel?.state === "CANVAS" && panel?.canvasData) {
    return (
      <div style={{ height: "100%", overflow: "auto" }}>
        <CanvasPanel canvasData={panel.canvasData} onDismiss={panel.dismissCanvas} />
      </div>
    );
  }

  return (
    <div>
      <div className="pageHeader" style={{ alignItems: "center" }}>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Control Center</h1>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            Your launch + operations roll-up across every workspace you're in.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SuggestImprovementButton workerSlug="platform-control-center-pro" />
          <button onClick={refresh} className="iconBtn" style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>
            Refresh
          </button>
          <button
            onClick={onSend}
            disabled={loading || brief?.skipped}
            className="iconBtn"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: (loading || brief?.skipped) ? 0.6 : 1 }}
            title={brief?.skipped ? "Skipping — no real signal in any workspace" : "Send the brief to your email now"}
          >
            Email me this brief
          </button>
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Building your brief…</div>}
      {!loading && error && <div className="card" style={{ padding: 16, background: "#fef2f2", color: "#dc2626" }}>Error: {error}</div>}

      {!loading && brief?.skipped && (() => {
        const businessSections = (brief?.sections || []).filter(s => s.tenantId && s.tenantId !== "personal" && s.tenantId !== "vault");
        // New-user state: no business workspace yet → guide to setup, not the
        // "no brief" warning which reads as "the worker is broken".
        if (businessSections.length === 0) {
          return (
            <div className="card" style={{ padding: 24, background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
              <div style={{ fontWeight: 700, color: "#5b21b6", marginBottom: 8 }}>Let's set up Control Center</div>
              <div style={{ fontSize: 14, color: "#4c1d95", marginBottom: 16, lineHeight: 1.5 }}>
                Control Center rolls up launch + operations signal across every business workspace you're in. Right now you only have your Personal Vault, so there's nothing to summarize yet.
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5b21b6", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>To activate:</div>
              <ol style={{ margin: 0, paddingLeft: 20, color: "#4c1d95", fontSize: 14, lineHeight: 1.7 }}>
                <li>Open <strong>Settings → Workspaces</strong> and create your first business workspace (or accept an invite to one).</li>
                <li>Set the workspace's mode to <strong>Launch</strong> to surface milestones, runway, and outreach roll-ups.</li>
                <li>Come back here — the brief will populate automatically as the spine workers (Accounting / HR / Marketing / Contacts) start tracking signal.</li>
              </ol>
            </div>
          );
        }
        // Returning user with workspaces but no signal across them → original copy.
        return (
          <div className="card" style={{ padding: 24, background: "#fffbeb", border: "1px solid #fde68a" }}>
            <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 6 }}>No brief to send</div>
            <div style={{ fontSize: 14, color: "#78350f" }}>
              None of your workspaces have a real signal worth reporting right now. The rule: no padding with sample content; if nothing is happening, no email.
            </div>
            <div style={{ fontSize: 13, color: "#78350f", marginTop: 8 }}>
              To activate launch-mode briefs: flip a workspace's mode to <strong>Launch</strong> below — even zeros become the story during launch.
            </div>
          </div>
        );
      })()}

      {sendStatus?.state === "sent" && (
        <div className="card" style={{ padding: 12, marginTop: 12, background: "#f0fdf4", color: "#166534", fontSize: 13 }}>
          ✓ Brief sent to your email.
        </div>
      )}
      {sendStatus?.state === "skipped" && (
        <div className="card" style={{ padding: 12, marginTop: 12, background: "#fffbeb", color: "#92400e", fontSize: 13 }}>
          Skipped — no real signal across your workspaces.
        </div>
      )}
      {sendStatus?.state === "error" && (
        <div className="card" style={{ padding: 12, marginTop: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          Send failed: {sendStatus.message}
        </div>
      )}

      {!loading && brief?.sections && (() => {
        // 50.27 — Active workspace surfaces first. Without this the sections
        // render in membership-creation order, which doesn't match the
        // workspace the user is "in" (per their sidebar persona switcher).
        // That mismatch produced "I'm stuck in the wrong workspace" reports
        // even though the right section was scrolled below.
        const activeTenantId = (typeof window !== "undefined" && (localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID"))) || null;
        const sorted = [...brief.sections].sort((a, b) => {
          // Active workspace first
          if (a.tenantId === activeTenantId && b.tenantId !== activeTenantId) return -1;
          if (b.tenantId === activeTenantId && a.tenantId !== activeTenantId) return 1;
          // Then launch-mode (most actionable)
          if (a.mode === "launch" && b.mode !== "launch") return -1;
          if (b.mode === "launch" && a.mode !== "launch") return 1;
          // Then workspaces with signal
          if (a.hasSignal && !b.hasSignal) return -1;
          if (b.hasSignal && !a.hasSignal) return 1;
          return 0;
        });
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            <WorkspacesModePanel sections={sorted} onChange={onModeChange} activeTenantId={activeTenantId} />
            {sorted.filter(s => s.hasSignal || s.mode === "launch").map(s => <WorkspaceSection key={s.tenantId} s={s} isActive={s.tenantId === activeTenantId} onMilestoneChange={onMilestoneChange} />)}
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WORKSPACE MODE PANEL — toggle each workspace's mode
// ═══════════════════════════════════════════════════════════════

function WorkspacesModePanel({ sections, onChange, activeTenantId }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Your workspaces · mode controls
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map(s => {
          const isActive = s.tenantId === activeTenantId;
          return (
          <div key={s.tenantId} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px",
            border: isActive ? "1px solid #7c3aed" : "1px solid #f1f5f9",
            borderRadius: 8,
            background: isActive ? "rgba(124,58,237,0.04)" : "transparent",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <WorkspaceIcon isActive={isActive} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontWeight: isActive ? 700 : 600, color: "#0f172a", fontSize: 14 }}>{s.workspaceName}</div>
                  {isActive && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                      background: "#7c3aed", color: "white",
                      letterSpacing: 0.4, textTransform: "uppercase",
                    }}>You are here</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.tenantId}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {Object.keys(MODE_BADGES).map(m => {
                const active = s.mode === m;
                const b = MODE_BADGES[m];
                return (
                  <button
                    key={m}
                    onClick={() => onChange(s.tenantId, m)}
                    style={{
                      padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: active ? `1px solid ${b.fg}` : "1px solid #e2e8f0",
                      background: active ? b.bg : "white",
                      color: active ? b.fg : "#64748b",
                    }}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WORKSPACE SECTION — dispatches launch / operations layouts
// ═══════════════════════════════════════════════════════════════

function WorkspaceSection({ s, isActive, onMilestoneChange }) {
  const badge = MODE_BADGES[s.mode] || MODE_BADGES.operations;
  // Active workspace gets a thick purple accent rail on the left and a stronger
  // header treatment. Non-active workspaces get a muted gray rail so it's
  // immediately obvious which section is "yours" vs "other workspaces I'm in."
  const accentColor = isActive ? "#7c3aed" : "#cbd5e1";
  const accentBg = isActive ? "rgba(124,58,237,0.06)" : "transparent";
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      borderLeft: `5px solid ${accentColor}`,
      paddingLeft: 12,
      background: accentBg,
      borderRadius: 8,
    }}>
      <div className="card" style={{ padding: "16px 20px", borderTop: isActive ? `3px solid #7c3aed` : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WorkspaceIcon isActive={isActive} />
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{s.workspaceName}</div>
          <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.fg }}>
            {badge.label}
          </span>
          {isActive && (
            <span style={{
              padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: "#7c3aed", color: "white", letterSpacing: 0.4, textTransform: "uppercase",
            }}>You are here</span>
          )}
        </div>
        {s.alexNoticed && (
          <div style={{ padding: 10, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", letterSpacing: 0.4, marginBottom: 4 }}>ALEX NOTICED</div>
            <div style={{ fontSize: 13, color: "#78350f" }}>{s.alexNoticed}</div>
          </div>
        )}
      </div>

      <SetupProgressCard s={s} />
      {s.mode === "launch" ? <LaunchSections s={s} onMilestoneChange={onMilestoneChange} /> : <OperationsRows s={s} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SETUP PROGRESS — guide unset-up workspaces
// ═══════════════════════════════════════════════════════════════

function SetupProgressCard({ s }) {
  // Only render in launch mode. Operations workspaces don't need a setup
  // checklist — they're running, not bootstrapping. Marketing-specific
  // setup steps (draft campaign, send campaign) belong in the Marketing
  // worker's own setup view, not Control Center.
  if (s.mode !== "launch") return null;

  const setup = s.setupState || {};
  const steps = [
    {
      id: "accounts",
      label: "Connect a bank or accounting account",
      done: (setup.accountsCount || 0) > 0,
      hint: "Open the Accounting worker → Connected Accounts",
    },
    {
      id: "contacts",
      label: "Import or sync your first contacts",
      done: (setup.contactsCount || 0) > 0,
      hint: "Open the Contacts worker → Import LinkedIn / CSV",
    },
    {
      id: "milestone",
      label: "Mark your first launch milestone in progress",
      done: (setup.milestonesFlipped || 0) > 0,
      hint: "Click any status pill in the Launch Milestones card below to advance it",
    },
  ];
  // Checkboxes are display-only — they auto-check based on workspace state.
  // The "hint" line tells the user where to take the action that flips them.

  const completed = steps.filter(st => st.done).length;
  const total = steps.length;
  const isComplete = completed === total;
  const pct = Math.round((completed / total) * 100);

  // Color theme flips green when complete so the card reads as a confirmation
  // rather than an outstanding to-do. The card stays visible at 100% (didn't
  // hide silently) because vanishing looks like "broke" instead of "done."
  const theme = isComplete
    ? { bg: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)", border: "#86efac", titleFg: "#15803d", bodyFg: "#15803d" }
    : { bg: "linear-gradient(135deg, #fefce8 0%, #ffffff 100%)", border: "#fde68a", titleFg: "#92400e", bodyFg: "#78350f" };

  return (
    <div className="card" style={{
      padding: 16,
      marginBottom: 12,
      background: theme.bg,
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.titleFg, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {isComplete ? "Setup Complete · Ready to operate" : "Setup Progress"}
          </div>
          <div style={{ fontSize: 13, color: theme.bodyFg, marginTop: 2 }}>
            {isComplete
              ? "All setup steps are done. Sections below are reflecting real workspace data. Use the launch milestones to track your fundraise progress."
              : completed === 0
                ? "Your workspace is fresh. Knock these out to start seeing real data here."
                : `${completed} of ${total} steps complete (${pct}%). Keep going — each step lights up a section below.`}
          </div>
        </div>
        <div style={{
          fontSize: 18, fontWeight: 700,
          color: pct >= 80 ? "#15803d" : pct >= 40 ? "#d97706" : "#b91c1c",
        }}>{pct}%</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map(st => (
          <div key={st.id} style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "6px 8px", borderRadius: 6,
            background: st.done ? "#ecfdf5" : "#ffffff",
            border: `1px solid ${st.done ? "#a7f3d0" : "#e2e8f0"}`,
          }}>
            <span style={{
              flexShrink: 0,
              width: 16, height: 16, borderRadius: 4,
              background: st.done ? "#15803d" : "#ffffff",
              border: `2px solid ${st.done ? "#15803d" : "#cbd5e1"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 2,
            }}>
              {st.done && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: st.done ? "#15803d" : "#0f172a",
                textDecoration: st.done ? "line-through" : "none",
              }}>
                {st.label}
              </div>
              {!st.done && st.hint && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{st.hint}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LAUNCH MODE — 5 sections
// ═══════════════════════════════════════════════════════════════

function LaunchSections({ s, onMilestoneChange }) {
  return (
    <>
      <LaunchMilestonesCard s={s} onChange={onMilestoneChange} />
      <DevelopmentMilestonesCard s={s} onChange={onMilestoneChange} />
      <ConcernsCard />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
        <InvestorOutreachCard s={s} />
        <MarketingPressCard s={s} />
        <CreatorSignupsCard s={s} />
        <RunwaySpendCard s={s} />
        <ComplianceFilingsCard />
        <WorkerHealthCard s={s} />
      </div>
      <StatusByCategoryCard s={s} />
    </>
  );
}

function SectionShell({ title, accent, hint, children, footer }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: accent || "#0f172a", letterSpacing: 1.5, textTransform: "uppercase" }}>
          {title}
        </div>
        {hint && <div style={{ fontSize: 11, color: "#94a3b8" }}>{hint}</div>}
      </div>
      {children}
      {footer && <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>{footer}</div>}
    </div>
  );
}

function StubTag({ source }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: "1px 6px",
      borderRadius: 4,
      background: "#fef3c7",
      color: "#92400e",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    }}>
      Wiring · {source}
    </span>
  );
}

function MetricGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>
            <span>{it.label}</span>
            {it.stub && <StubTag source={it.stub} />}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: it.muted ? "#94a3b8" : "#0f172a", marginTop: 2 }}>
            {it.value}
          </div>
          {it.hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function InvestorOutreachCard({ s }) {
  const io = s.investorOutreach || {};
  const fmtMoney = (n) => (typeof n === "number" && n > 0) ? `$${n.toLocaleString()}` : "—";
  return (
    <SectionShell title="Investor Outreach" accent="#7c3aed" hint={`${s.workspaceName}`} footer="Data sources: holdings · contacts (titleapp_ai_investors segment) · kycRecords · messageQueue">
      <MetricGrid items={[
        { label: "Investors on cap table", value: io.investorsOnCapTable ?? 0, hint: "from holdings" },
        { label: "Investor contacts", value: io.investorContacts ?? 0, hint: "from contacts segment" },
        { label: "Apollo outreach queued", value: io.apolloQueued ?? 0, hint: "contacts w/ no engagement" },
        { label: "Sends · 7d", value: s.marketingPulse?.sends7d ?? 0, hint: "from messageQueue" },
        { label: "KYC starts · 7d", value: io.kycStarts7d ?? 0, hint: "from kycRecords" },
        { label: "Soft commits", value: fmtMoney(io.softCommitsUsd), muted: !(io.softCommitsUsd > 0), stub: !(io.softCommitsUsd > 0) ? "holdings.softCommitUsd" : undefined, hint: "from holdings" },
      ]} />
    </SectionShell>
  );
}

function MarketingPressCard({ s }) {
  const mp = s.marketingPulse || {};
  const campaigns = Array.isArray(s.campaigns) ? s.campaigns : [];
  return (
    <SectionShell title="Marketing & Press" accent="#0369a1" footer="Data sources: messageQueue · marketingDrafts · socialPosts. Press + impressions need GA4/GSC connector.">
      <MetricGrid items={[
        { label: "Sends · 24h", value: mp.sends24h ?? 0, hint: "from messageQueue" },
        { label: "Sends · 7d", value: mp.sends7d ?? 0, hint: "from messageQueue" },
        { label: "Drafts queued", value: mp.drafts7d ?? 0, hint: "from marketingDrafts" },
        { label: "Social posts · 7d", value: mp.socialPosts7d ?? 0, hint: "from socialPosts" },
        { label: "Press hits · 30d", value: "—", muted: true, stub: "press" },
        { label: "Impressions", value: "—", muted: true, stub: "GA4 + GSC" },
      ]} />
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
          Active campaigns · AI lifecycle
        </div>
        {campaigns.length === 0 ? (
          <div style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", background: "#f8fafc", borderRadius: 6, border: "1px dashed #cbd5e1" }}>
            No campaigns drafted yet. Open the Marketing worker and ask it to draft a campaign — once it does, the AI lifecycle (creative → send → monitor → recommend) shows here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {campaigns.slice(0, 5).map(c => (
              <CampaignRow key={c.id} c={c} />
            ))}
            {campaigns.length > 5 && (
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                + {campaigns.length - 5} more campaigns
              </div>
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function CampaignRow({ c }) {
  const stages = [
    { key: "creative", label: "Creative", done: c.aiCreativeIssued, color: "#0369a1" },
    { key: "send",     label: "Send",     done: (c.sendsCount ?? 0) > 0, color: "#0891b2" },
    { key: "monitor",  label: "Monitor",  done: c.aiMonitoring || (c.repliesCount ?? 0) > 0, color: "#7c3aed" },
    { key: "recommend",label: "Recommend",done: !!c.aiRecommendation, color: "#16a34a" },
  ];
  return (
    <div style={{ padding: "8px 10px", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>
            {c.channel} · {c.status}{c.audienceCount ? ` · ${c.audienceCount} audience` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {stages.map(st => (
            <span key={st.key}
              title={`${st.label} ${st.done ? "complete" : "pending"}`}
              style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
                background: st.done ? st.color : "#e2e8f0",
                color: st.done ? "white" : "#94a3b8",
                letterSpacing: 0.3, textTransform: "uppercase",
              }}>
              {st.label}
            </span>
          ))}
        </div>
      </div>
      {c.aiRecommendation && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#475569", padding: "4px 6px", background: "#f0fdf4", borderRadius: 4, borderLeft: "2px solid #16a34a" }}>
          <strong style={{ color: "#16a34a" }}>AI rec:</strong> {c.aiRecommendation}
        </div>
      )}
    </div>
  );
}

function CreatorSignupsCard({ s }) {
  const sb = s.sandbox || {};
  return (
    <SectionShell title="Creator Signups" accent="#16a34a">
      <MetricGrid items={[
        { label: "Sandbox sessions · 7d", value: sb.sessions7d ?? 0 },
        { label: "Workers shipped · 7d", value: sb.shipped7d ?? 0, hint: "to marketplace" },
        { label: "In progress", value: sb.inProgress ?? 0, hint: "stuck if >0" },
        { label: "Creator subs (paid)", value: "—", muted: true, stub: "stripe:creator-sub" },
        { label: "Active creators · 30d", value: "—", muted: true, stub: "sandboxSessions" },
        { label: "First-payout creators", value: "—", muted: true, stub: "50.5 attribution" },
      ]} />
    </SectionShell>
  );
}

function RunwaySpendCard({ s }) {
  const cash = Number(s.cashOnHand || 0);
  return (
    <SectionShell title="Runway & Spend" accent="#dc2626">
      <MetricGrid items={[
        { label: "Cash on hand", value: `$${cash.toLocaleString()}`, hint: `${s.accounts || 0} connected accounts` },
        { label: "Burn · 30d", value: "—", muted: true, stub: "accounting:burn30" },
        { label: "Runway · 14d", value: "—", muted: true, stub: "burn × cash" },
        { label: "Runway · 30d", value: "—", muted: true, stub: "burn × cash" },
        { label: "Runway · 100d", value: "—", muted: true, stub: "burn × cash" },
        { label: "Recurring vendors flagged", value: "—", muted: true, stub: "controller:caps" },
      ]} />
    </SectionShell>
  );
}

function ComplianceFilingsCard() {
  // Surfaces the same obligations the Accounting Dashboard tracks.
  // Born from the $20K-DE-penalty rule: every deadline-driven worker
  // must show required actions persistently, and Control Center is
  // the cross-worker rollup.
  const { listObligations, markObligationComplete } = useAccounting();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listObligations();
    if (r?.ok) {
      setItems(r.obligations || []);
      setCounts(r.counts || {});
    }
    setLoading(false);
  }, [listObligations]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("ta:accounting-changed", refresh);
    return () => window.removeEventListener("ta:accounting-changed", refresh);
  }, [load]);

  const onMarkDone = async (obligationKey) => {
    const r = await markObligationComplete({ obligationKey });
    if (r?.ok) {
      load();
      window.dispatchEvent(new Event("ta:accounting-changed"));
    }
  };

  const red = counts.red || 0;
  const amber = counts.amber || 0;
  const accent = red > 0 ? "#dc2626" : amber > 0 ? "#d97706" : "#16a34a";

  return (
    <SectionShell title="Compliance & Filings" accent={accent}>
      <MetricGrid items={[
        { label: "Overdue", value: red, hint: red > 0 ? "needs immediate action" : "all clear" },
        { label: "Approaching", value: amber, hint: amber > 0 ? "due within 30 days" : "" },
        { label: "Total open", value: (counts.total || 0) },
      ]} />
      {loading && <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>Loading…</div>}
      {!loading && items.length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
          ✓ Nothing past due. Keep statement uploads current.
        </div>
      )}
      {!loading && items.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {items.slice(0, 5).map(o => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: o.severity === "red" ? "#dc2626" : "#d97706", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{o.detail}</div>
                </div>
              </div>
              <button
                onClick={() => onMarkDone(o.obligationKey)}
                style={{ padding: "3px 8px", background: "white", border: "1px solid #e2e8f0", borderRadius: 4, cursor: "pointer", fontWeight: 600, color: "#475569", fontSize: 10, whiteSpace: "nowrap" }}
              >
                Done
              </button>
            </div>
          ))}
          {items.length > 5 && (
            <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 4 }}>
              +{items.length - 5} more in Accounting → Dashboard
            </div>
          )}
        </div>
      )}
    </SectionShell>
  );
}

function WorkerHealthCard({ s }) {
  const wt = s.workerTraction || {};
  const subs = s.customers?.activeSubs ?? 0;
  return (
    <SectionShell title="Worker Health" accent="#0f766e">
      <MetricGrid items={[
        { label: "Workers · live", value: `${wt.liveWorkers ?? 0}/${wt.totalWorkers ?? 0}`, hint: "in catalog" },
        { label: "Active subscriptions", value: subs },
        { label: "Sessions · 24h", value: "—", muted: true, stub: "messageEvents" },
        { label: "Error rate · 24h", value: "—", muted: true, stub: "apiHealth" },
        { label: "Worst worker (latency)", value: "—", muted: true, stub: "apiHealth" },
        { label: "Improvement requests open", value: "—", muted: true, stub: "improvementRequests" },
      ]} />
    </SectionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LAUNCH MILESTONES — pre-fundraise checklist (Oct 1 deadline)
// ═══════════════════════════════════════════════════════════════

function LaunchMilestonesCard({ s, onChange }) {
  const milestones = Array.isArray(s.launchMilestones) ? s.launchMilestones : [];
  if (milestones.length === 0) return null;
  const handleClick = (m) => {
    if (!onChange) return;
    // Cycle: pending → in_progress → done → pending
    const next = m.status === "pending" ? "in_progress" : m.status === "in_progress" ? "done" : "pending";
    onChange({ milestoneId: m.id, status: next, kind: "launch" });
  };

  // Group by target date so the operator sees the deadline structure (June 1,
  // July 1, etc.) rather than a flat list.
  const groups = {};
  for (const m of milestones) {
    if (!groups[m.target]) groups[m.target] = [];
    groups[m.target].push(m);
  }
  const dates = Object.keys(groups).sort();

  const statusStyle = (status) => {
    if (status === "done") return { bg: "#dcfce7", fg: "#15803d", border: "#86efac", label: "Done" };
    if (status === "in_progress") return { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d", label: "In progress" };
    return { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca", label: "Pending" };
  };

  const doneCount = milestones.filter(m => m.status === "done").length;
  const ipCount = milestones.filter(m => m.status === "in_progress").length;
  const pendingCount = milestones.length - doneCount - ipCount;

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Launch Milestones · Oct 1 deadline
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          <span style={{ color: "#15803d", fontWeight: 700 }}>{doneCount} done</span>
          {" · "}
          <span style={{ color: "#92400e", fontWeight: 700 }}>{ipCount} in progress</span>
          {" · "}
          <span style={{ color: "#b91c1c", fontWeight: 700 }}>{pendingCount} pending</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {dates.map(date => (
          <div key={date} style={{ padding: "8px 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", letterSpacing: 0.4, marginBottom: 6 }}>
              {fmtDate(date)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {groups[date].map(m => {
                const st = statusStyle(m.status);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <button
                      onClick={() => handleClick(m)}
                      title="Click to advance status (pending → in progress → done)"
                      style={{
                        flexShrink: 0,
                        fontSize: 9, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 4,
                        background: st.bg, color: st.fg, border: `1px solid ${st.border}`,
                        letterSpacing: 0.3, textTransform: "uppercase",
                        marginTop: 1, cursor: "pointer",
                      }}
                    >
                      {st.label}
                    </button>
                    <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.3 }}>
                      {m.label}
                      {m.owner && (
                        <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600, marginTop: 2 }}>
                          QB: {m.owner}
                        </div>
                      )}
                      {m.note && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{m.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
        Click any status pill to advance it (pending → in progress → done → back to pending).
      </div>
    </div>
  );
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return iso; }
}

// ═══════════════════════════════════════════════════════════════
//  DEVELOPMENT MILESTONES — product/build roadmap (separate from fundraise)
// ═══════════════════════════════════════════════════════════════

function DevelopmentMilestonesCard({ s, onChange }) {
  const milestones = Array.isArray(s.developmentMilestones) ? s.developmentMilestones : [];
  if (milestones.length === 0) return null;
  const handleClick = (m) => {
    if (!onChange) return;
    const next = m.status === "pending" ? "in_progress" : m.status === "in_progress" ? "done" : "pending";
    onChange({ milestoneId: m.id, status: next, kind: "development" });
  };

  const groups = {};
  for (const m of milestones) {
    const key = m.target || "untargeted";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  const dates = Object.keys(groups).sort();

  const statusStyle = (status) => {
    if (status === "done") return { bg: "#dcfce7", fg: "#15803d", border: "#86efac", label: "Done" };
    if (status === "in_progress") return { bg: "#dbeafe", fg: "#1e40af", border: "#93c5fd", label: "In progress" };
    return { bg: "#f1f5f9", fg: "#64748b", border: "#cbd5e1", label: "Pending" };
  };

  const doneCount = milestones.filter(m => m.status === "done").length;
  const ipCount = milestones.filter(m => m.status === "in_progress").length;
  const pendingCount = milestones.length - doneCount - ipCount;

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Development Milestones · Build Roadmap
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Product polish + worker buildout. Separate from the Launch fundraise checklist above.
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          <span style={{ color: "#15803d", fontWeight: 700 }}>{doneCount} done</span>
          {" · "}
          <span style={{ color: "#1e40af", fontWeight: 700 }}>{ipCount} in progress</span>
          {" · "}
          <span style={{ color: "#64748b", fontWeight: 700 }}>{pendingCount} pending</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {dates.map(date => (
          <div key={date} style={{ padding: "8px 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", letterSpacing: 0.4, marginBottom: 6 }}>
              {date === "untargeted" ? "Untargeted" : `Week of ${fmtDate(date)}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {groups[date].map(m => {
                const st = statusStyle(m.status);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <button
                      onClick={() => handleClick(m)}
                      title="Click to advance status (pending → in progress → done)"
                      style={{
                        flexShrink: 0,
                        fontSize: 9, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 4,
                        background: st.bg, color: st.fg, border: `1px solid ${st.border}`,
                        letterSpacing: 0.3, textTransform: "uppercase",
                        marginTop: 1, cursor: "pointer",
                      }}
                    >{st.label}</button>
                    <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.3 }}>
                      {m.label}
                      {m.owner && (
                        <div style={{ fontSize: 10, color: "#0f766e", fontWeight: 600, marginTop: 2 }}>
                          QB: {m.owner}
                        </div>
                      )}
                      {m.note && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{m.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
        Click any status pill to advance it (pending → in progress → done → back to pending).
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STATUS BY CATEGORY — per-vertical worker counts
// ═══════════════════════════════════════════════════════════════

function StatusByCategoryCard({ s }) {
  const cats = Array.isArray(s.statusByCategory) ? s.statusByCategory : [];

  return (
    <div className="card" style={{ padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Status by Category · Worker build state
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          For prioritization — where is the build deepest, where are the gaps
        </div>
      </div>
      {cats.length === 0 ? (
        <div style={{ padding: "16px 12px", fontSize: 13, color: "#64748b", textAlign: "center", background: "#f8fafc", borderRadius: 6 }}>
          No worker categories yet. As workers are added to <code>digitalWorkers/</code> they'll appear here grouped by vertical.
        </div>
      ) : (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>Vertical</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Live</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Waitlist</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Planned</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Draft</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Total</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>% Live</th>
          </tr>
        </thead>
        <tbody>
          {cats.map(c => (
            <tr key={c.vertical}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
                {c.vertical.replace(/-/g, " ")}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: 700, color: "#15803d" }}>{c.live}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b" }}>{c.waitlist}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b" }}>{c.planned}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#94a3b8" }}>{c.draft}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{c.total}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: c.livePct >= 50 ? "#15803d" : c.livePct >= 20 ? "#92400e" : "#b91c1c",
                }}>{c.livePct}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  OPERATIONS MODE — per-workspace KV roll-up (unchanged)
// ═══════════════════════════════════════════════════════════════

function OperationsRows({ s }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Snapshot
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <KV label="Contacts" value={s.contacts ?? 0} />
        <KV label="Transactions" value={s.transactions ?? 0} />
        <KV label="Connected accounts" value={s.accounts ?? 0} />
        <KV label="Cash on hand" value={`$${(s.cashOnHand || 0).toLocaleString()}`} />
        <KV label="Workers · live" value={`${s.workerTraction?.liveWorkers ?? 0}/${s.workerTraction?.totalWorkers ?? 0}`} />
        <KV label="Sandbox · 7d" value={s.sandbox?.sessions7d ?? 0} hint={`${s.sandbox?.shipped7d ?? 0} shipped · ${s.sandbox?.inProgress ?? 0} stuck`} />
      </div>
    </div>
  );
}

function KV({ label, value, hint }) {
  return (
    <div style={{ padding: "8px 12px", borderRadius: 8, background: "#f8fafc" }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
