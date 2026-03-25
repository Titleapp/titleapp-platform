import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken, EmailAuthProvider, linkWithCredential } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function AuthMagic() {
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const workerParam = params.get("worker");
      if (!token) { setStatus("error"); setErrorMsg("No token provided"); return; }

      try {
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
          // Backend upgraded the anonymous user — link credential to preserve UID
          try {
            const credential = EmailAuthProvider.credential(data.email, token);
            await linkWithCredential(auth.currentUser, credential);
            idToken = await auth.currentUser.getIdToken(true);
          } catch {
            // linkWithCredential may fail if email link auth isn't configured —
            // fall back to signInWithCustomToken (same UID, session refreshed)
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

        // Redirect to vault with context — preserve worker slug for auto-open
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
    verify();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        {status === "verifying" && (
          <div style={{ fontSize: 16, color: "#e2e8f0" }}>Verifying your link...</div>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>You're in</div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>Taking you to your Vault...</div>
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
