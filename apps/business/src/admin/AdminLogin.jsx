import React, { useState, useRef } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

// Rate limit: 5 attempts per minute
const attempts = [];
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000;

function isRateLimited() {
  const now = Date.now();
  // Purge old attempts
  while (attempts.length && attempts[0] < now - RATE_WINDOW) {
    attempts.shift();
  }
  return attempts.length >= RATE_LIMIT;
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const formRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isRateLimited()) {
      setError("Too many attempts. Try again in a minute.");
      return;
    }

    attempts.push(Date.now());
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in useAdminAuth will handle the rest
    } catch (err) {
      // Generic error — don't reveal whether email exists
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0b1020",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    }}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "32px",
        }}
      >
        <div style={{
          fontSize: "14px",
          color: "rgba(226,232,240,0.5)",
          marginBottom: "32px",
          textAlign: "center",
          letterSpacing: "0.04em",
        }}>
          Sign in to continue
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#e5e7eb",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#e5e7eb",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{
            color: "#ef4444",
            fontSize: "13px",
            marginBottom: "14px",
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "rgba(124,58,237,0.4)" : "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          {resetSent ? (
            <span style={{ color: "#34d399", fontSize: "13px" }}>
              Reset link sent. Check your email.
            </span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (!email) { setError("Enter your email first."); return; }
                try {
                  await sendPasswordResetEmail(auth, email);
                  setResetSent(true);
                  setError("");
                } catch (err) {
                  setError("Could not send reset email.");
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(124,58,237,0.7)",
                fontSize: "13px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Send password reset link
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
