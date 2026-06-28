/**
 * VaultGate.jsx — Privacy gate for the SOCIII Vault.
 * Requires reauthentication before displaying any Vault contents.
 *
 * Design:
 * - Google SSO users → Google re-auth popup
 * - Email/password users → password prompt + Firebase reauthenticate
 * - Unlocked state lives in component memory only (resets on tab close)
 * - 30-minute idle timeout re-locks the gate
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getAuth,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
} from "firebase/auth";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function LockIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ display: "block" }}>
      <rect x="10" y="24" width="32" height="22" rx="6" fill="#7c3aed" opacity="0.12" stroke="#7c3aed" strokeWidth="2.5" />
      <path d="M16 24V17.5a10 10 0 1 1 20 0V24" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="26" cy="35" r="3.5" fill="#7c3aed" />
      <rect x="24.75" y="35" width="2.5" height="5" rx="1.25" fill="#7c3aed" />
    </svg>
  );
}

export default function VaultGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [password, setPassword] = useState("");
  const idleTimer = useRef(null);
  const auth = getAuth();
  const user = auth.currentUser;

  const isGoogle = user?.providerData?.some(p => p.providerId === "google.com");

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setUnlocked(false), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (unlocked) {
      resetIdleTimer();
      const events = ["mousedown", "keydown", "touchstart", "scroll"];
      events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
      return () => {
        events.forEach(e => window.removeEventListener(e, resetIdleTimer));
        if (idleTimer.current) clearTimeout(idleTimer.current);
      };
    }
  }, [unlocked, resetIdleTimer]);

  async function handleUnlock() {
    setLoading(true); setErr(null);
    try {
      if (isGoogle) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        if (!password) { setErr("Enter your password"); setLoading(false); return; }
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
      }
      setUnlocked(true);
      setPassword("");
    } catch (e) {
      const msg = e.code === "auth/wrong-password" ? "Incorrect password."
        : e.code === "auth/popup-closed-by-user" ? "Sign-in cancelled."
        : e.code === "auth/too-many-requests" ? "Too many attempts. Try again later."
        : "Authentication failed. Please try again.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  if (unlocked) {
    return (
      <>
        {React.cloneElement(children, { onLockVault: () => setUnlocked(false) })}
      </>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #faf5ff 0%, #eff6ff 100%)",
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "#ffffff", borderRadius: 20,
        boxShadow: "0 8px 40px rgba(124,58,237,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        padding: "40px 36px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ marginBottom: 20 }}><LockIcon /></div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 6, textAlign: "center" }}>
          Your Vault is locked
        </div>
        <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
          Verify your identity to access your personal records.
          The Vault re-locks after 30 minutes of inactivity.
        </div>

        {isGoogle ? (
          <button
            onClick={handleUnlock}
            disabled={loading}
            style={{
              width: "100%", padding: "13px", borderRadius: 10,
              background: loading ? "#f5f3ff" : "#7c3aed", color: loading ? "#7c3aed" : "#ffffff",
              border: loading ? "1px solid #ddd6fe" : "none",
              fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.15s",
            }}
          >
            {loading ? (
              <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Verifying…</>
            ) : (
              <><GoogleIcon /> Confirm with Google</>
            )}
          </button>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErr(null); }}
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
              placeholder="Password"
              autoFocus
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 15,
                border: err ? "1px solid #fca5a5" : "1px solid #e2e8f0",
                outline: "none", boxSizing: "border-box", background: "#f8fafc",
                color: "#1e293b",
              }}
            />
            <button
              onClick={handleUnlock}
              disabled={loading}
              style={{
                width: "100%", padding: "13px", borderRadius: 10,
                background: loading ? "#f5f3ff" : "#7c3aed", color: loading ? "#7c3aed" : "#ffffff",
                border: loading ? "1px solid #ddd6fe" : "none",
                fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Verifying…" : "Unlock Vault"}
            </button>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#dc2626", textAlign: "center" }}>{err}</div>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
          Your Vault records are encrypted and owner-controlled.
          SOCIII staff cannot access them.
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
