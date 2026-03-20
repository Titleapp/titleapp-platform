import React, { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const isError = status && !status.includes("sent") && !status.includes("Signed") && !status.includes("created");

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setStatus("Please enter your email and password."); return; }
    try {
      setLoading(true);
      setStatus("");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      window.location.href = "/";
    } catch (err: any) {
      setLoading(false);
      switch (err?.code) {
        case "auth/user-not-found":
          setStatus("No account found. Would you like to sign up?"); break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          setStatus("Incorrect password. Try again or use Google to sign in."); break;
        case "auth/invalid-email":
          setStatus("Please enter a valid email address."); break;
        case "auth/too-many-requests":
          setStatus("Too many attempts. Please wait a moment and try again."); break;
        default:
          setStatus("Sign-in failed. Please try again.");
      }
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setStatus("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setStatus("Passwords do not match."); return; }
    if (password.length < 8) { setStatus("Password must be at least 8 characters."); return; }
    try {
      setLoading(true);
      setStatus("");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      sendEmailVerification(cred.user).catch(console.error);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      window.location.href = "/";
    } catch (err: any) {
      setLoading(false);
      switch (err?.code) {
        case "auth/email-already-in-use":
          setStatus("An account with this email already exists. Sign in instead."); break;
        case "auth/invalid-email":
          setStatus("Please enter a valid email address."); break;
        case "auth/weak-password":
          setStatus("Password must be at least 8 characters."); break;
        default:
          setStatus("Account creation failed. Please try again.");
      }
    }
  }

  async function handleForgotPassword() {
    if (!email) { setStatus("Enter your email address first, then click Forgot password."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus("Password reset email sent. Check your inbox.");
    } catch {
      setStatus("Could not send reset email. Check the address and try again.");
    }
  }

  let _googlePopupActive = false;
  async function handleGoogleLogin() {
    if (_googlePopupActive) return;
    _googlePopupActive = true;
    setLoading(true);
    setStatus("");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      window.location.href = "/";
    } catch (err: any) {
      if (err?.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      if (err?.code !== "auth/cancelled-popup-request" &&
          err?.code !== "auth/popup-closed-by-user") {
        console.error(err);
        setStatus("Google sign-in failed. Please try again.");
      } else {
        setStatus("");
      }
      setLoading(false);
    } finally {
      _googlePopupActive = false;
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px", fontSize: "14px",
    border: "1px solid #e5e7eb", borderRadius: "8px",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "32px", background: "white", borderRadius: "16px", border: "1px solid #e5e7eb" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img src="/logo.png" alt="TitleApp" style={{ width: "48px", height: "48px", borderRadius: "12px", marginBottom: "16px" }} />
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>
            {mode === "signin" ? "Sign in to TitleApp" : "Create your account"}
          </h1>
        </div>

        <form onSubmit={mode === "signin" ? handleEmailSignIn : handleEmailSignUp} style={{ display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" required style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="--------" autoComplete={mode === "signin" ? "current-password" : "new-password"} required style={inputStyle} />
          </label>

          {mode === "signin" && (
            <div style={{ textAlign: "right", marginTop: "-8px" }}>
              <button type="button" onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "#7c3aed", fontSize: "13px", cursor: "pointer", padding: 0 }}>
                Forgot password?
              </button>
            </div>
          )}

          {mode === "signup" && (
            <label style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Confirm Password</div>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="--------" autoComplete="new-password" required style={inputStyle} />
            </label>
          )}

          <button type="submit" disabled={loading} style={{ padding: "12px", fontSize: "15px", fontWeight: 600, background: loading ? "#a78bfa" : "#7c3aed", color: "white", border: "none", borderRadius: "10px", cursor: loading ? "default" : "pointer" }}>
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {status && (
          <div style={{ marginTop: "14px", padding: "12px", background: isError ? "#fff5f5" : "#f0fdf4", border: isError ? "1px solid #fecaca" : "1px solid #86efac", borderRadius: "8px", fontSize: "13px", color: isError ? "#dc2626" : "#16a34a" }}>
            {status}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 500, background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#6b7280" }}>
          {mode === "signin" ? (
            <>Don't have an account?{" "}<button type="button" onClick={() => { setMode("signup"); setStatus(""); }} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "14px" }}>Sign up</button></>
          ) : (
            <>Already have an account?{" "}<button type="button" onClick={() => { setMode("signin"); setStatus(""); }} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "14px" }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
