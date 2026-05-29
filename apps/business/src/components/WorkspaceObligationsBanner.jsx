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
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
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
      if (data.identitySession?.url) {
        window.location.href = data.identitySession.url;
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
                        onClick={() => runAction(invite, o)}
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
    </div>
  );
}
