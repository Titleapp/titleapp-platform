import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    // Check if user is completing magic link sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      handleMagicLinkCallback();
    }
  }, []);

  async function handleMagicLinkCallback() {
    let emailForSignIn = window.localStorage.getItem("emailForSignIn");
    if (!emailForSignIn) {
      emailForSignIn = window.prompt("Please provide your email for confirmation");
    }

    if (!emailForSignIn) return;

    try {
      setStatus("Completing sign in...");
      const cred = await signInWithEmailLink(auth, emailForSignIn, window.location.href);
      const token = await cred.user.getIdToken(true);

      localStorage.setItem("ID_TOKEN", token);

      window.localStorage.removeItem("emailForSignIn");
      window.location.href = "/"; // Clean URL
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed to complete sign in: ${err?.message || String(err)}`);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Sending magic link...");

    const actionCodeSettings = {
      url: window.location.origin + "/",
      handleCodeInApp: true,
    };

    try {
      const trimmedEmail = email.trim().toLowerCase();
      await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", trimmedEmail);
      setLinkSent(true);
      setStatus("");
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed to send link: ${err?.message || String(err)}`);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in...");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken(true);

      localStorage.setItem("ID_TOKEN", token);

      setStatus("Signed in successfully");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      const code = err?.code || "";
      if (
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        setStatus("No password set for this account. Please use Magic Link or Google to sign in.");
      } else {
        setStatus(`Login failed: ${err?.message || String(err)}`);
      }
    }
  }

  async function handleGoogleLogin() {
    setStatus("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken(true);

      localStorage.setItem("ID_TOKEN", token);

      setStatus("Signed in successfully");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/popup-closed-by-user") {
        setStatus("");
      } else {
        setStatus(`Google sign-in failed: ${err?.message || String(err)}`);
      }
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/logo.png"
            alt="TitleApp AI"
            style={{ width: "48px", height: "48px", borderRadius: "12px", marginBottom: "16px" }}
          />
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>TitleApp AI</h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: "14px" }}>
            Sign in to Business
          </p>
        </div>

        {linkSent ? (
          <div
            style={{
              padding: "20px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
              Check your email
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              We sent a magic link to <strong>{email}</strong>
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>
              Click the link in your email to sign in
            </div>
            <button
              onClick={() => {
                setLinkSent(false);
                setEmail("");
              }}
              style={{
                marginTop: "16px",
                padding: "10px 20px",
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Use different email
            </button>
          </div>
        ) : (
          <>
            {/* Tab buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              <button
                onClick={() => setMode("magic")}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: mode === "magic" ? "rgba(124,58,237,0.1)" : "white",
                  border: mode === "magic" ? "1px solid rgba(124,58,237,0.3)" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: mode === "magic" ? 600 : 400,
                  fontSize: "14px",
                }}
              >
                Magic Link
              </button>
              <button
                onClick={() => setMode("password")}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: mode === "password" ? "rgba(124,58,237,0.1)" : "white",
                  border:
                    mode === "password" ? "1px solid rgba(124,58,237,0.3)" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: mode === "password" ? 600 : 400,
                  fontSize: "14px",
                }}
              >
                Password
              </button>
            </div>

            {/* Magic Link Form */}
            {mode === "magic" && (
              <form onSubmit={handleMagicLink} style={{ display: "grid", gap: "16px" }}>
                <label style={{ display: "grid", gap: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Email</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </label>

                <button
                  type="submit"
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: "rgb(124,58,237)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Send Magic Link
                </button>
              </form>
            )}

            {/* Password Form */}
            {mode === "password" && (
              <form onSubmit={handlePasswordLogin} style={{ display: "grid", gap: "16px" }}>
                <label style={{ display: "grid", gap: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Email</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Password</div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </label>

                <button
                  type="submit"
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: "rgb(124,58,237)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Sign In
                </button>
              </form>
            )}

            {/* Status message */}
            {status && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: status.includes("Failed") || status.includes("failed") || status.includes("No password") ? "#fff5f5" : "#f0fdf4",
                  border: status.includes("Failed") || status.includes("failed") || status.includes("No password")
                    ? "1px solid #fecaca"
                    : "1px solid #86efac",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: status.includes("Failed") || status.includes("failed") || status.includes("No password") ? "#dc2626" : "#16a34a",
                }}
              >
                {status}
              </div>
            )}

            {/* SSO Options */}
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" }}>
              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                Or continue with
              </div>
              <div style={{ display: "grid", gap: "8px" }}>
                <button
                  onClick={handleGoogleLogin}
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Google
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
