import React, { useState, useEffect, useCallback } from "react";
import useCommandCenter from "../hooks/useCommandCenter";

const MODE_BADGES = {
  launch:     { label: "Launch",     fg: "#7c3aed", bg: "#ede9fe" },
  operations: { label: "Operations", fg: "#0369a1", bg: "#e0f2fe" },
  dormant:    { label: "Dormant",    fg: "#94a3b8", bg: "#f1f5f9" },
};

export default function CommandCenter() {
  const [brief, setBrief] = useState(null);
  const [sendStatus, setSendStatus] = useState(null);
  const { previewBrief, sendBrief, setWorkspaceMode, loading, error } = useCommandCenter();

  const refresh = useCallback(async () => {
    const r = await previewBrief();
    setBrief(r);
  }, [previewBrief]);

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

  const onModeChange = async (tenantId, newMode) => {
    await setWorkspaceMode({ tenantId, mode: newMode });
    refresh();
  };

  return (
    <div>
      <div className="pageHeader" style={{ alignItems: "center" }}>
        <h1 className="h1" style={{ margin: 0 }}>Command Center</h1>
        <div style={{ display: "flex", gap: 8 }}>
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

      {!loading && brief?.skipped && (
        <div className="card" style={{ padding: 24, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 6 }}>No brief to send</div>
          <div style={{ fontSize: 14, color: "#78350f" }}>
            None of your workspaces have a real signal worth reporting right now. The rule: no padding with sample content; if nothing is happening, no email.
          </div>
          <div style={{ fontSize: 13, color: "#78350f", marginTop: 8 }}>
            To activate launch-mode briefs for TitleApp AI: flip its mode to <strong>Launch</strong> below — even zeros become the story during launch.
          </div>
        </div>
      )}

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

      {!loading && brief?.sections && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          <WorkspacesModePanel sections={brief.sections} onChange={onModeChange} />
          {brief.sections.filter(s => s.hasSignal).map(s => <WorkspaceSection key={s.tenantId} s={s} />)}
        </div>
      )}
    </div>
  );
}

function WorkspacesModePanel({ sections, onChange }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Your workspaces · mode controls
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map(s => (
          <div key={s.tenantId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{s.workspaceName}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.tenantId}</div>
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
        ))}
      </div>
    </div>
  );
}

function WorkspaceSection({ s }) {
  const badge = MODE_BADGES[s.mode] || MODE_BADGES.operations;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{s.workspaceName}</div>
        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.fg }}>
          {badge.label}
        </span>
      </div>
      {s.alexNoticed && (
        <div style={{ padding: 10, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", letterSpacing: 0.4, marginBottom: 4 }}>ALEX NOTICED</div>
          <div style={{ fontSize: 13, color: "#78350f" }}>{s.alexNoticed}</div>
        </div>
      )}
      {s.mode === "launch" ? <LaunchRows s={s} /> : <OperationsRows s={s} />}
    </div>
  );
}

function LaunchRows({ s }) {
  const mp = s.marketingPulse;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      <KV label="Marketing · sends 24h" value={mp.sends24h} />
      <KV label="Marketing · sends 7d" value={mp.sends7d} />
      <KV label="Drafts queued" value={mp.drafts7d} />
      <KV label="Social posts (7d)" value={mp.socialPosts7d} />
      <KV label="Workers · live" value={`${s.workerTraction.liveWorkers}/${s.workerTraction.totalWorkers}`} />
      <KV label="Sandbox · sessions 7d" value={s.sandbox.sessions7d} hint={`${s.sandbox.shipped7d} shipped · ${s.sandbox.inProgress} stuck`} />
      <KV label="Active subscriptions" value={s.customers.activeSubs} />
    </div>
  );
}

function OperationsRows({ s }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      <KV label="Contacts" value={s.contacts} />
      <KV label="Transactions" value={s.transactions} />
      <KV label="Connected accounts" value={s.accounts} />
      <KV label="Cash on hand" value={`$${(s.cashOnHand || 0).toLocaleString()}`} />
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
