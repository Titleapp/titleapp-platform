// Minimal, native-only sign-in screen — replaces the full public LandingPage
// marketing homepage for a signed-out cold launch of a flavored native app
// (Capacitor iOS/Android build), where showing the multi-vertical pricing/
// pitch page makes no sense — the person already has "the SKYE app" (or
// whichever flavor) installed, they just need to sign in.
//
// Auth mechanism is the SAME one MeetAlex.jsx's email/password sign-in uses
// (firebase/auth signInWithEmailAndPassword) — deliberately not a parallel
// implementation. After a successful call, this component does nothing else:
// App.jsx's own top-level `auth.onAuthStateChanged` listener (see the
// `unsubscribe = auth.onAuthStateChanged(...)` block) independently sets
// ID_TOKEN in localStorage and calls setToken(), which re-renders past the
// `!token` gate this component is one branch of. No manual localStorage
// writes or navigation needed here.
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

// Per-flavor branding — extend this map when another flavor gets its own
// native sign-in screen. Keying off VITE_NATIVE_FLAVOR (same env var
// main.jsx already reads for post-sign-in routing) rather than hardcoding
// "SKYE" so deep that reusing this for nursing/realestate means a rewrite.
const FLAVOR_BRANDING = {
  aviation: { name: "SKYE", tagline: "Sign in to your cockpit." },
};
const DEFAULT_BRANDING = { name: "SOCIII", tagline: "Sign in to your workspace." };

export default function NativeSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const flavor = import.meta.env.VITE_NATIVE_FLAVOR;
  const branding = FLAVOR_BRANDING[flavor] || DEFAULT_BRANDING;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) { setError("Enter a valid email."); return; }
    if (!password) { setError("Enter your password."); return; }
    setSubmitting(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Success: onAuthStateChanged (App.jsx) takes it from here.
    } catch (err) {
      const msg =
        err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential" || err?.code === "auth/user-not-found"
          ? "Wrong email or password."
          : err?.code === "auth/too-many-requests"
          ? "Too many attempts — try again in a moment."
          : "Sign-in failed. Try again.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0b0b12", color: "#fff", fontFamily: "system-ui, sans-serif", padding: 24,
    }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.02em" }}>{branding.name}</div>
          <div style={{ fontSize: 14, color: "#a78bfa", marginTop: 4 }}>{branding.tagline}</div>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="username"
          autoCapitalize="none"
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          style={inputStyle}
        />

        {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%", padding: "12px", fontSize: 15, fontWeight: 600, color: "#fff",
            background: "#7c3aed", border: "none", borderRadius: 8,
            cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", fontSize: 15, color: "#fff",
  background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 8,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
