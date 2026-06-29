import React, { useEffect, useState } from "react";
import { auth } from "../firebase";

// CODEX 50.10-T2 — Workspace member invite landing.
//
// Route: /join/:token
// Public landing page that displays the invitation card. If the user is
// signed in with the email the invite was sent to, they can accept inline.
// If not signed in (or wrong email), they see the appropriate sign-in /
// switch-account guidance.
export default function JoinWorkspace({ token }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

  // Fetch invite details on mount (unauthenticated lookup).
  useEffect(() => {
    if (!token) {
      setError("MISSING_TOKEN");
      return;
    }
    fetch(`${apiBase}/api?path=/v1/workspace:invite:details&token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((data) => ({ status: r.status, data })))
      .then(({ status, data }) => {
        if (data && data.ok) setInvite(data);
        else setError(data?.error || `HTTP_${status}`);
      })
      .catch(() => setError("NETWORK_ERROR"));
  }, [token]);

  // Track auth state — recipient might already be signed in or might sign in
  // mid-flow.
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u || null));
    return () => unsub();
  }, []);

  async function handleAccept() {
    if (!user) return;
    setRedeeming(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${apiBase}/api?path=/v1/workspace:invite:redeem`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data && data.ok) {
        // Activate the new workspace context so it lands selected.
        try {
          localStorage.setItem("TENANT_ID", data.tenantId);
          localStorage.setItem("WORKSPACE_ID", data.tenantId);
          localStorage.setItem("WORKSPACE_NAME", data.workspaceName);
        } catch { /* ignore */ }
        setSuccess(data);
        // Hard navigation so the dashboard re-bootstraps with the new context.
        setTimeout(() => { window.location.href = "/dashboard"; }, 800);
      } else {
        setError(data?.error || "REDEEM_FAILED");
      }
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setRedeeming(false);
    }
  }

  function gotoSignIn() {
    // Magic-link sign-in already exists on /auth/magic. Pass the join URL
    // back through sessionStorage so the post-signin redirect lands here.
    try { sessionStorage.setItem("ta_post_signin_redirect", `/join/${token}`); } catch { /* ignore */ }
    window.location.href = "/?signin=1";
  }

  async function gotoSwitchAccount() {
    try {
      await auth.signOut();
    } catch { /* ignore */ }
    setUser(null);
  }

  // ── Render states ────────────────────────────────────────────
  const wrap = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 24,
  };
  const card = {
    maxWidth: 480,
    width: "100%",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 32,
    textAlign: "center",
  };
  const button = (primary = true) => ({
    display: "inline-block",
    padding: "12px 24px",
    background: primary ? "#7c3aed" : "#ffffff",
    color: primary ? "#ffffff" : "#374151",
    border: primary ? "none" : "1px solid #d1d5db",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 16,
  });

  if (error) {
    const msg = errorMessage(error);
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{msg.title}</div>
          <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>{msg.body}</div>
          <button onClick={() => { window.location.href = "/"; }} style={button(true)}>Go to SOCIII</button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>You're in.</div>
          <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
            You've joined <strong>{success.workspaceName}</strong> as {roleLabel(success.role)}. Taking you there now.
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading invitation…</div>
        </div>
      </div>
    );
  }

  // We have invite details. Three sub-states based on auth.
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 13, color: "#6b7280", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
          You've been invited
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
          {invite.workspaceName}
        </div>
        <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
          <strong>{invite.inviterName}</strong> has invited you to join as <strong>{roleLabel(invite.role)}</strong>.
        </div>

        {!user && (
          <>
            <button onClick={gotoSignIn} style={button(true)}>Sign in to accept</button>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 12 }}>Sign in with the email this invitation was sent to.</div>
          </>
        )}

        {user && (
          <>
            <div style={{ marginTop: 20, padding: "12px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, color: "#374151" }}>
              Signed in as <strong>{user.email || "(no email)"}</strong>
            </div>
            <button
              onClick={handleAccept}
              disabled={redeeming}
              style={{ ...button(true), opacity: redeeming ? 0.6 : 1, cursor: redeeming ? "default" : "pointer" }}
            >
              {redeeming ? "Joining…" : "Accept and join"}
            </button>
            <button onClick={gotoSwitchAccount} style={button(false)}>Switch account</button>
          </>
        )}

        <div style={{ marginTop: 24, fontSize: 12, color: "#9ca3af" }}>
          This invitation expires {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "soon"}.
        </div>
      </div>
    </div>
  );
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "viewer") return "Viewer";
  return "Member";
}

function errorMessage(code) {
  switch (code) {
    case "INVITE_NOT_FOUND":
      return { title: "Invitation not found", body: "The link you followed isn't valid. Ask the person who invited you to send a new one." };
    case "INVITE_EXPIRED":
      return { title: "Invitation expired", body: "This invitation is more than 14 days old. Ask the person who invited you to send a new one." };
    case "INVITE_REVOKED":
      return { title: "Invitation revoked", body: "This invitation has been canceled." };
    case "INVITE_ALREADY_REDEEMED":
      return { title: "Already accepted", body: "This invitation has been used. Sign in with the account that accepted it." };
    case "EMAIL_MISMATCH":
      return { title: "Wrong account", body: "This invitation was sent to a different email address. Sign out and sign in with that email to accept." };
    case "EMAIL_REQUIRED":
      return { title: "Email required", body: "Your account doesn't have an email on file. Add an email and try again." };
    case "MISSING_TOKEN":
    case "INVALID_TOKEN_FORMAT":
      return { title: "Invalid link", body: "The invitation URL is malformed. Ask the person who invited you to resend it." };
    case "NETWORK_ERROR":
      return { title: "Connection problem", body: "We couldn't reach SOCIII. Check your connection and try again." };
    default:
      return { title: "Something went wrong", body: "Please try again, or ask the person who invited you to resend the invitation." };
  }
}
