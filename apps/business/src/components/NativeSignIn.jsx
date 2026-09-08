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
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
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

  // Web's signInWithPopup/signInWithRedirect (used elsewhere in this app,
  // e.g. WorkerCanvas.jsx's handleGoogleAuth) doesn't work inside a Capacitor
  // native WebView — Google rejects OAuth from an embedded-webview user agent
  // ("disallowed_useragent"). @capacitor-firebase/authentication's
  // signInWithGoogle() drives the REAL native Google Sign-In SDK instead (via
  // the system browser/account chooser), returning a raw idToken/accessToken
  // pair rather than an already-signed-in firebase/auth user — so this still
  // has to feed that into the same firebase/auth signInWithCredential(...)
  // call the rest of this app already uses for Google credentials (see
  // WorkerCanvas.jsx's credential-linking error-recovery path), rather than
  // relying on the plugin to sign into firebase/auth on its own.
  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError("");
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result?.credential?.idToken;
      if (!idToken) throw new Error("No ID token returned from native Google sign-in.");
      const credential = GoogleAuthProvider.credential(idToken, result.credential.accessToken);
      await signInWithCredential(auth, credential);
      // Success: onAuthStateChanged (App.jsx) takes it from here.
    } catch (err) {
      // A user backing out of the native account chooser isn't an error worth showing.
      if (err?.code === "auth/cancelled-popup-request" || /cancel/i.test(err?.message || "")) {
        setSubmitting(false);
        return;
      }
      // TEMPORARY DIAGNOSTIC (2026-09-08) — surface the real error on-screen
      // while wiring this up for the first time; remove once Google Sign-In
      // is confirmed working end-to-end.
      console.error("[NativeSignIn] Google sign-in failed:", err);
      setError(`Google sign-in failed: ${err?.code || "unknown"} — ${err?.message || String(err)}`);
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

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0", color: "#4a4a5a", fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#2a2a3a" }} />
          or
          <div style={{ flex: 1, height: 1, background: "#2a2a3a" }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          style={{
            width: "100%", padding: "12px", fontSize: 15, fontWeight: 600, color: "#1f1f1f",
            background: "#fff", border: "1px solid #2a2a3a", borderRadius: 8,
            cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
            fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <GoogleGlyph />
          Sign in with Google
        </button>
      </form>
    </div>
  );
}

// Inline so this component has no image-asset dependency.
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", fontSize: 15, color: "#fff",
  background: "#16161f", border: "1px solid #2a2a3a", borderRadius: 8,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
