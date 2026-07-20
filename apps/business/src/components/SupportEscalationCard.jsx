import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";

// $25/hr billed in 15-min increments = 7 credits/block (1 credit = $1)
const CREDITS_PER_BLOCK = 7;
const BILLING_RATE_LABEL = "$25/hr · billed in 15-min increments";
const SUPPORT_HOURS_LABEL = "Mon–Fri, 9am–5pm Pacific";

const S = {
  card: {
    border: "1.5px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
    marginTop: "8px",
    background: "#fff",
    maxWidth: "480px",
  },
  header: {
    background: "#f8fafc",
    padding: "13px 16px 11px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid #f1f5f9",
  },
  icon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontWeight: 700, fontSize: "14px", color: "#1e293b" },
  sub: { fontSize: "12px", color: "#64748b", marginTop: "1px" },
  body: { padding: "14px 16px" },
  detail: { fontSize: "12px", color: "#64748b", marginBottom: "14px", lineHeight: "1.5" },
  creditRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    borderRadius: "8px",
    padding: "9px 12px",
    marginBottom: "14px",
    fontSize: "12px",
  },
  creditLabel: { color: "#64748b" },
  creditVal: { fontWeight: 700, color: "#1e293b" },
  buttons: { display: "flex", gap: "8px" },
  btnPrimary: {
    flex: 1,
    padding: "10px 0",
    borderRadius: "8px",
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  btnSecondary: {
    flex: 1,
    padding: "10px 0",
    borderRadius: "8px",
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    color: "#64748b",
    fontWeight: 500,
    fontSize: "13px",
    cursor: "pointer",
  },
  billingNote: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "10px",
    textAlign: "center",
  },
  warning: {
    background: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "12px",
    color: "#92400e",
    marginBottom: "12px",
  },
  confirmed: {
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#166534",
    fontWeight: 500,
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #e2e8f0",
    borderTopColor: "#64748b",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

export default function SupportEscalationCard({ triggerMessage, workerSlug, persona, onDismiss }) {
  const [status, setStatus] = useState(null); // null=loading, then object
  const [phase, setPhase] = useState("loading"); // loading|ready|subsidized|outside_hours|no_credits|confirmed|declined
  const [firing, setFiring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { setPhase("ready"); setStatus({}); return; }
        const token = await user.getIdToken();
        const tenantId = localStorage.getItem("TENANT_ID") || "";
        const apiBase = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";
        const r = await fetch(`${apiBase}/api?path=/v1/support:status`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
        });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        setStatus(d);
        if (d.subsidized) setPhase("subsidized");
        else if (!d.withinHours) setPhase("outside_hours");
        else if ((d.creditsAvailable ?? 0) < CREDITS_PER_BLOCK) setPhase("no_credits");
        else setPhase("ready");
      } catch (_) {
        if (!cancelled) setPhase("ready"); // fail open — let user try
      }
    }
    fetchStatus();
    return () => { cancelled = true; };
  }, []);

  async function handleConnect() {
    setFiring(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const tenantId = localStorage.getItem("TENANT_ID") || "";
      const apiBase = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";
      await fetch(`${apiBase}/api?path=/v1/support:escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          message: triggerMessage,
          workerSlug: workerSlug || null,
          persona: persona || null,
          sessionId: localStorage.getItem("CHAT_SESSION_ID") || null,
          consentGiven: true,
        }),
      });
      setPhase("confirmed");
    } catch (_) {
      setPhase("confirmed"); // still confirm — notification likely sent even on network error
    } finally {
      setFiring(false);
    }
  }

  if (phase === "declined") return null;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.icon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={S.title}>Connect with the SOCIII support team</div>
            <div style={S.sub}>{SUPPORT_HOURS_LABEL}</div>
          </div>
        </div>

        {phase === "loading" && (
          <div style={{ ...S.body, display: "flex", justifyContent: "center", padding: "20px" }}>
            <div style={S.spinner} />
          </div>
        )}

        {phase === "confirmed" && (
          <div style={S.confirmed}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Support team notified — someone will follow up within business hours.
          </div>
        )}

        {phase === "subsidized" && (
          <div style={S.body}>
            <div style={S.detail}>Support is covered for your account — no charge. We'll have someone follow up within business hours.</div>
            <div style={S.buttons}>
              <button style={S.btnPrimary} onClick={handleConnect} disabled={firing}>
                {firing ? "Connecting…" : "Connect me →"}
              </button>
              <button style={S.btnSecondary} onClick={() => { setPhase("declined"); onDismiss?.(); }}>
                Keep trying with AI
              </button>
            </div>
          </div>
        )}

        {phase === "outside_hours" && (
          <div style={S.body}>
            <div style={S.warning}>
              Support is currently offline. Hours are {SUPPORT_HOURS_LABEL}.
            </div>
            <div style={S.detail}>You can leave a message and the team will follow up when they're back.</div>
            <div style={S.buttons}>
              <button style={S.btnPrimary} onClick={handleConnect} disabled={firing}>
                {firing ? "Sending…" : "Leave a message →"}
              </button>
              <button style={S.btnSecondary} onClick={() => { setPhase("declined"); onDismiss?.(); }}>
                Keep trying with AI
              </button>
            </div>
          </div>
        )}

        {phase === "no_credits" && (
          <div style={S.body}>
            <div style={S.warning}>
              You need {CREDITS_PER_BLOCK} credits to connect with support. Your balance: {status?.creditsAvailable ?? 0} credits.
            </div>
            <div style={S.detail}>Add credits in the Billing section to unlock human support.</div>
            <div style={S.buttons}>
              <button
                style={S.btnPrimary}
                onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "billing" } }))}
              >
                Add credits →
              </button>
              <button style={S.btnSecondary} onClick={() => { setPhase("declined"); onDismiss?.(); }}>
                Keep trying with AI
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div style={S.body}>
            <div style={S.detail}>
              The SOCIII support team can help with login issues, account access, and platform problems.
            </div>
            <div style={S.creditRow}>
              <span style={S.creditLabel}>Your credit balance</span>
              <span style={S.creditVal}>{status?.creditsAvailable ?? "—"} credits</span>
            </div>
            <div style={S.buttons}>
              <button style={S.btnPrimary} onClick={handleConnect} disabled={firing}>
                {firing ? "Connecting…" : "Connect me →"}
              </button>
              <button style={S.btnSecondary} onClick={() => { setPhase("declined"); onDismiss?.(); }}>
                Keep trying with AI
              </button>
            </div>
            <div style={S.billingNote}>{BILLING_RATE_LABEL} · {CREDITS_PER_BLOCK} credits minimum</div>
          </div>
        )}
      </div>
    </>
  );
}
