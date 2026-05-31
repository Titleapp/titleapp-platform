import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, opts = {}) {
  let token = null;
  try {
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
  } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");

  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

const ROLE_LABEL = {
  advisor: "Advisor",
  investor: "Investor",
  warrant_holder: "Warrant holder",
  creator: "Creator",
};

const ROLE_INTRO = {
  advisor: "Three quick steps to complete your advisor onboarding.",
  investor: "Two steps to close your investment.",
  warrant_holder: "Two steps to receive your warrant.",
  creator: "Three quick steps to activate your Creator License.",
};

// Map an obligation.action (declared in pendingInvites.DEFAULT_OBLIGATIONS)
// to the backend endpoint + payload shape that resolves it. Action strings
// are namespaced like "creator:step:accept_terms" or "ir:advisor:step:start_identity".
function resolveAction(action, invite) {
  const [domain, ...rest] = String(action || "").split(":");
  const tail = rest.join(":");

  if (domain === "creator") {
    const stepAction = tail.replace(/^step:/, "");
    return {
      endpoint: "/v1/creator:step",
      payload: { creatorId: invite.entityId, action: stepAction },
    };
  }
  if (domain === "ir") {
    const [role, ...stepRest] = rest;
    const stepAction = stepRest.join(":").replace(/^step:/, "");
    if (role === "advisor") {
      return {
        endpoint: "/v1/ir:advisor:step",
        payload: { advisorId: invite.entityId, action: stepAction },
      };
    }
    if (role === "investor") {
      return {
        endpoint: "/v1/ir:investor:step",
        payload: {
          investorId: invite.entityId,
          fundraiseId: invite.context?.fundraiseId,
          action: stepAction,
        },
      };
    }
    if (role === "warrant") {
      return {
        endpoint: "/v1/ir:warrant:step",
        payload: { warrantId: invite.entityId, action: stepAction },
      };
    }
  }
  return null;
}

function obligationStatusBadge(o, S) {
  if (o.completedAt) return <span style={S.badgeDone}>✓</span>;
  return <span style={S.badgeOpen}>{o._idx ?? "•"}</span>;
}

export default function WorkspaceObligationsBanner({ inviteId, onAllComplete }) {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [dismissed, setDismissed] = useState(false);
  // S51.43.7 — TC-058 fix: acknowledge-terms must present actual content
  // (advisor expectations + materials note) before flipping the gate. Click
  // on the "Start" button for an acknowledge-* obligation opens this modal;
  // confirming inside the modal calls runAction.
  const [termsModal, setTermsModal] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    // Clear stale UI state before refetching so sticky errors from a prior
    // click don't bleed across reloads.
    setError("");
    try {
      if (inviteId) {
        // Targeted fetch — the URL specified an invite, so just load that one.
        const data = await apiFetch(`/v1/invites:get?inviteId=${encodeURIComponent(inviteId)}`, { method: "GET" });
        if (!mountedRef.current) return;
        if (data?.ok && data.invite) {
          setInvites([data.invite]);
        } else {
          setInvites([]);
        }
      } else {
        const data = await apiFetch("/v1/invites:current", { method: "GET" });
        if (!mountedRef.current) return;
        setInvites(Array.isArray(data?.invites) ? data.invites : []);
      }
    } catch (_) {
      if (mountedRef.current) setInvites([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [inviteId]);

  useEffect(() => { refresh(); }, [refresh]);

  const openInvites = useMemo(() => {
    return invites.filter(inv =>
      Array.isArray(inv.pendingObligations) && inv.pendingObligations.some(o => !o.completedAt)
    );
  }, [invites]);

  // Defensive sync: covers two webhook-miss recovery paths (TC-018 + TC-019).
  // If a verify-identity obligation is still open we hit sync_kyc; if a
  // sign-agreement obligation is still open we hit sync_signature.
  //
  // S51.43.7 — TC-059 fix: also re-fire when the user returns to the tab
  // (focus event) since signing complete in DBX Sign happens in a separate
  // tab and the webhook may lag. Without the focus retrigger, the obligation
  // card stays "Start" until manual page refresh even though signing finished.
  const syncedRef = useRef(new Set());
  useEffect(() => {
    function handleFocus() {
      // Clear the once-per-mount gate so sync_kyc/sync_signature can re-fire
      // if the obligation is still open. Also refetch state from backend in
      // case the webhook already completed (most common path).
      syncedRef.current = new Set();
      refresh();
    }
    function handleVisibility() {
      if (!document.hidden) handleFocus();
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);
  useEffect(() => {
    if (loading || openInvites.length === 0) return;
    const KYC_ACTION_BY_ROLE = {
      advisor: "ir:advisor:step:sync_kyc",
      investor: "ir:investor:step:sync_kyc",
      warrant_holder: "ir:warrant:step:sync_kyc",
      creator: "creator:step:sync_kyc",
    };
    const SIG_ACTION_BY_ROLE = {
      advisor: "ir:advisor:step:sync_signature",
      investor: "ir:investor:step:sync_signature",
      warrant_holder: "ir:warrant:step:sync_signature",
    };
    (async () => {
      for (const invite of openInvites) {
        const obligations = invite.pendingObligations || [];

        const hasOpenIdentity = obligations.some(o => !o.completedAt && /verify-identity/.test(o.id));
        if (hasOpenIdentity) {
          const key = `${invite.inviteId}:kyc`;
          const actionStr = KYC_ACTION_BY_ROLE[invite.role];
          if (actionStr && !syncedRef.current.has(key)) {
            const resolved = resolveAction(actionStr, invite);
            if (resolved) {
              syncedRef.current.add(key);
              try {
                await apiFetch(resolved.endpoint, {
                  method: "POST",
                  body: JSON.stringify({ ...resolved.payload }),
                });
                await refresh();
              } catch (_) { /* non-fatal */ }
            }
          }
        }

        const hasOpenSignature = obligations.some(o => !o.completedAt && /^sign-/.test(o.id));
        if (hasOpenSignature) {
          const key = `${invite.inviteId}:sig`;
          const actionStr = SIG_ACTION_BY_ROLE[invite.role];
          if (actionStr && !syncedRef.current.has(key)) {
            const resolved = resolveAction(actionStr, invite);
            if (resolved) {
              syncedRef.current.add(key);
              try {
                await apiFetch(resolved.endpoint, {
                  method: "POST",
                  body: JSON.stringify({ ...resolved.payload }),
                });
                await refresh();
              } catch (_) { /* non-fatal */ }
            }
          }
        }
      }
    })();
  }, [loading, openInvites, refresh]);

  useEffect(() => {
    if (!loading && openInvites.length === 0 && typeof onAllComplete === "function") {
      onAllComplete();
    }
  }, [loading, openInvites, onAllComplete]);

  const runAction = useCallback(async (invite, obligation) => {
    setError("");
    setInfo("");
    const resolved = resolveAction(obligation.action, invite);
    if (!resolved) {
      setError(`No handler wired for ${obligation.action}`);
      return;
    }
    setBusyAction(`${invite.inviteId}:${obligation.id}`);
    try {
      const data = await apiFetch(resolved.endpoint, {
        method: "POST",
        body: JSON.stringify({ ...resolved.payload, returnUrl: window.location.href }),
      });
      if (!data.ok) {
        setError(data.error || "Action failed");
        return;
      }
      // Stripe Identity — advisor/investor flows return a flat `url` field;
      // creator flow wraps under `identitySession.url`. Handle both.
      const identityUrl = data.identitySession?.url || (data.url && data.sessionId ? data.url : null);
      if (identityUrl) {
        window.location.href = identityUrl;
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.signingUrl) {
        window.location.href = data.signingUrl;
        return;
      }
      // Dropbox Sign delivers the signing link via its own email rather than
      // returning an inline URL — surface that to the user so they know to
      // check their inbox (TC-013).
      if (data.hellosignRequestId || data.signatureRequestId) {
        setInfo(`Signing link sent to ${data.recipientEmail || "your email"} — check your inbox.`);
        await refresh();
        return;
      }
      // Inline-completion (accept_terms, sync_kyc) — refresh state.
      await refresh();
    } catch (_) {
      setError("Action failed; please try again.");
    } finally {
      if (mountedRef.current) setBusyAction(null);
    }
  }, [refresh]);

  if (dismissed) return null;
  if (loading) return null;
  if (openInvites.length === 0) return null;

  const S = {
    wrap: { background: "linear-gradient(135deg, #faf5ff 0%, #f0f4ff 100%)", border: "1px solid #ddd6fe", borderRadius: 12, padding: 16, margin: "12px 16px 0" },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    eyebrow: { color: "#7c3aed", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
    title: { fontSize: 16, fontWeight: 700, color: "#1a202c", marginTop: 2 },
    sub: { fontSize: 13, color: "#475569", lineHeight: 1.5, marginTop: 4 },
    dismiss: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: 4 },
    list: { marginTop: 12, display: "flex", flexDirection: "column", gap: 8 },
    row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 },
    rowDone: { background: "#f0fdf4", borderColor: "#bbf7d0" },
    badgeOpen: { width: 24, height: 24, borderRadius: "50%", background: "#7c3aed", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
    badgeDone: { width: 24, height: 24, borderRadius: "50%", background: "#16a34a", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
    rowLabel: { flex: 1, fontSize: 14, color: "#1a202c" },
    btn: { padding: "7px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
    btnDisabled: { background: "#94a3b8", cursor: "not-allowed" },
    btnDone: { padding: "7px 14px", background: "transparent", color: "#16a34a", border: "none", fontSize: 13, fontWeight: 600 },
    err: { color: "#dc2626", fontSize: 13, marginTop: 8 },
    info: { color: "#15803d", fontSize: 13, marginTop: 8, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6 },
  };

  return (
    <div>
      {openInvites.map(invite => {
        const open = (invite.pendingObligations || []).filter(o => !o.completedAt).length;
        const total = (invite.pendingObligations || []).length;
        const roleLabel = ROLE_LABEL[invite.role] || invite.role;
        const intro = ROLE_INTRO[invite.role] || "Finish your onboarding.";
        return (
          <div key={invite.inviteId} style={S.wrap}>
            <div style={S.head}>
              <div>
                <div style={S.eyebrow}>{roleLabel} onboarding · {total - open}/{total}</div>
                <div style={S.title}>Let's finish getting you set up</div>
                <div style={S.sub}>{intro}</div>
              </div>
              <button style={S.dismiss} onClick={() => setDismissed(true)} title="Hide for now">×</button>
            </div>
            <div style={S.list}>
              {(invite.pendingObligations || []).map((o, idx) => {
                const done = !!o.completedAt;
                const busy = busyAction === `${invite.inviteId}:${o.id}`;
                return (
                  <div key={o.id} style={{ ...S.row, ...(done ? S.rowDone : {}) }}>
                    {obligationStatusBadge({ ...o, _idx: idx + 1 }, S)}
                    <div style={S.rowLabel}>{o.label}</div>
                    {done ? (
                      <span style={S.btnDone}>Complete</span>
                    ) : (
                      <button
                        style={{ ...S.btn, ...(busy ? S.btnDisabled : {}) }}
                        onClick={() => {
                          // S51.43.7 — TC-058: acknowledge-* gates open the
                          // review modal first; everything else fires the
                          // backend action directly (Stripe Identity redirect,
                          // DBX Sign packet, etc.).
                          const needsReview = /acknowledge|accept-license|accept-terms/i.test(o.id);
                          if (needsReview) {
                            setTermsModal({ invite, obligation: o });
                          } else {
                            runAction(invite, o);
                          }
                        }}
                        disabled={busy || busyAction !== null}
                      >
                        {busy ? "Working…" : "Start"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {info && <div style={S.info}>{info}</div>}
            {error && <div style={S.err}>{error}</div>}
          </div>
        );
      })}

      {termsModal && (
        <div
          onClick={() => setTermsModal(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, padding: 28, maxWidth: 640,
              width: "100%", maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ color: "#7c3aed", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              {ROLE_LABEL[termsModal.invite.role] || termsModal.invite.role} Onboarding · Step 1
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a202c", margin: "0 0 16px" }}>
              Before we get started
            </h2>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: "#334155" }}>
              <p style={{ marginTop: 0 }}>
                Welcome to SOCIII. Before completing your onboarding, take a moment to review what you're agreeing to as a SOCIII advisor.
              </p>
              <p style={{ fontWeight: 600, color: "#1a202c", marginBottom: 6 }}>What we're asking of you:</p>
              <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
                <li><strong>Time commitment:</strong> ~2–4 hours per month of engagement, scoped to where you can move the needle.</li>
                <li><strong>Responsiveness:</strong> respond to inquiries within five business days (longer if you flag a vacation).</li>
                <li><strong>Conflicts:</strong> disclose any current or future role at a competing company — most overlap is fine, but transparency is required.</li>
                <li><strong>Confidentiality:</strong> non-public information about SOCIII (roadmap, customers, fundraising) stays within the advisor circle.</li>
                <li><strong>Mutual termination:</strong> either side can end the advisor relationship with 30 days' notice. No hard feelings.</li>
              </ul>
              <p style={{ fontWeight: 600, color: "#1a202c", marginBottom: 6 }}>Before you click acknowledge:</p>
              <ul style={{ paddingLeft: 20, margin: "0 0 16px" }}>
                <li>Make sure you've reviewed the <strong>personalized advisor deck</strong> attached to Sean's invitation email — it covers the SOCIII vision and your specific scope of engagement.</li>
                <li>The formal Advisor Agreement (with the equity grant, vesting schedule, IP assignment, and termination terms) is presented in <strong>Step 3</strong>. This step (Step 1) is your acknowledgment that the relationship makes sense in principle; the legal binding happens at Step 3.</li>
              </ul>
              <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", marginBottom: 0 }}>
                Questions before acknowledging? Reply to Sean's email directly and we'll talk through anything that's unclear.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
              <button
                onClick={() => setTermsModal(null)}
                style={{ padding: "9px 18px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                Not yet
              </button>
              <button
                onClick={() => {
                  const { invite, obligation } = termsModal;
                  setTermsModal(null);
                  runAction(invite, obligation);
                }}
                style={{ padding: "9px 18px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                I acknowledge and agree to proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
