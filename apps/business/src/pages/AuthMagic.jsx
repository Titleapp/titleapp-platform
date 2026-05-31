import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken, EmailAuthProvider, linkWithCredential } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function AuthMagic() {
  // S51.43.7 — TC-061 fix: don't auto-fire verify on mount. Microsoft Safe
  // Links (and other enterprise email scanners — Mimecast, Barracuda, etc.)
  // fetch inbound URLs for malware scanning, which would consume the magic
  // link's one-time token BEFORE the recipient ever clicks. Require an
  // explicit click before POSTing to /v1/magic-link:verify so scanners can't
  // accidentally invalidate the link.
  const [status, setStatus] = useState("ready"); // ready | verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const [token] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("token");
  });
  const [workerParam] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("worker");
  });

  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("No token provided"); }
  }, [token]);

  async function startVerify() {
    if (!token) { setStatus("error"); setErrorMsg("No token provided"); return; }
    if (status === "verifying" || status === "success") return; // idempotent
    setStatus("verifying");
    try {
      const params = new URLSearchParams(window.location.search);
      const guestId = localStorage.getItem("ta_guest_id") || null;
      // Check for stored anonymous UID from pre-magic-link session
      const preAuthUid = sessionStorage.getItem("ta_pre_magic_uid")
        || (auth.currentUser?.isAnonymous ? auth.currentUser.uid : null);

      const res = await fetch(`${API_BASE}/api?path=/v1/magic-link:verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, guestId, preAuthUid }),
      });
      const data = await res.json();

      if (!data.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Invalid or expired link");
        return;
      }

      // Upgrade anonymous session via linkWithCredential if possible,
      // otherwise sign in with custom token
      let idToken;
      if (auth.currentUser?.isAnonymous && preAuthUid && data.uid === preAuthUid) {
        try {
          const credential = EmailAuthProvider.credential(data.email, token);
          await linkWithCredential(auth.currentUser, credential);
          idToken = await auth.currentUser.getIdToken(true);
        } catch {
          const cred = await signInWithCustomToken(auth, data.customToken);
          idToken = await cred.user.getIdToken(true);
        }
      } else {
        const cred = await signInWithCustomToken(auth, data.customToken);
        idToken = await cred.user.getIdToken(true);
      }
      localStorage.setItem("ID_TOKEN", idToken);
      sessionStorage.removeItem("ta_pre_magic_uid");

      // Promote guest session if guestId present
      if (guestId) {
        try {
          await fetch(`${API_BASE}/api?path=/v1/alex:promoteGuest`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ guestId, uid: data.uid }),
          });
        } catch { /* non-fatal */ }
      }

      setStatus("success");

      // Workspace-at-invite (Phase 2) — if magic-link:verify returned a
      // pendingInvite, drop the user into the SOCIII workspace with the
      // invite-appropriate worker auto-selected. The canvas reads the
      // invite query param and surfaces obligation cards in-place.
      const role = params.get("role");
      const advisorId = params.get("advisor");
      const investorId = params.get("investor");
      const fundraiseId = params.get("fundraise");

      const pendingInvites = Array.isArray(data.pendingInvites) ? data.pendingInvites : [];
      const primaryInvite = pendingInvites[0] || null;
      const workerByRole = {
        advisor: "hr-people",
        investor: "fundraise",
        warrant_holder: "fundraise",
        creator: "platform-creators",
      };

      if (primaryInvite) {
        const workerSlug = primaryInvite.worker || workerByRole[primaryInvite.role] || "";
        // S51.43.7 — TC-047 fix: switch active tenant to the inviting
        // workspace BEFORE redirecting. Use sessionStorage ta_preselected_tid
        // (not localStorage TENANT_ID) because App.jsx has a fast-path that
        // would skip the membership-fetch + COMPANY_NAME refresh otherwise.
        if (primaryInvite.tenantId) {
          sessionStorage.setItem("ta_preselected_tid", primaryInvite.tenantId);
          localStorage.setItem("WORKSPACE_KIND", "entitled");
        }
        const qs = new URLSearchParams();
        if (workerSlug) qs.set("worker", workerSlug);
        qs.set("invite", primaryInvite.inviteId);
        qs.set("utm_source", "magic-link");
        setTimeout(() => {
          window.location.href = `/?${qs.toString()}`;
        }, 600);
        return;
      }

      // Backward-compat: role params with no pendingInvite. Land in workspace
      // with a role+entity hint so the canvas can synthesize obligations from
      // the entity record itself.
      if (role && workerByRole[role]) {
        const qs = new URLSearchParams();
        qs.set("worker", workerByRole[role]);
        qs.set("role", role);
        if (advisorId) qs.set("advisorId", advisorId);
        if (investorId) qs.set("investorId", investorId);
        if (fundraiseId) qs.set("fundraiseId", fundraiseId);
        const creatorId = params.get("creator") || params.get("creatorId");
        if (creatorId) qs.set("creatorId", creatorId);
        qs.set("utm_source", "magic-link");
        setTimeout(() => {
          window.location.href = `/?${qs.toString()}`;
        }, 600);
        return;
      }

      // Legacy / worker-trial fallthrough
      const vertical = data.vertical || "";
      const workerSlug = workerParam || data.workerSlug || "";
      setTimeout(() => {
        window.location.href = "/?promoted=true"
          + (vertical ? "&vertical=" + vertical : "")
          + (workerSlug ? "&worker=" + workerSlug : "")
          + "&utm_source=magic-link";
      }, 1000);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Verification failed. Try again.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 460, padding: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>

        {status === "ready" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", marginBottom: 10 }}>
              Continue to your SOCIII workspace
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.55, marginBottom: 28 }}>
              Click the button below to sign in. This extra step protects the
              link from being consumed by enterprise email scanners before you
              get a chance to click.
            </div>
            <button
              onClick={startVerify}
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
              }}
            >
              Sign me in →
            </button>
          </>
        )}

        {status === "verifying" && (
          <div style={{ fontSize: 16, color: "#e2e8f0" }}>Verifying your link...</div>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>You're in</div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>Taking you to your workspace...</div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#ef4444", marginBottom: 8 }}>Link expired or invalid</div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>{errorMsg}</div>
            <a href="/meet-alex" style={{ color: "#7c3aed", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>Start a new conversation with Alex</a>
          </>
        )}
      </div>
    </div>
  );
}
