import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in...");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Force-refresh token to ensure it's valid/current
      const token = await cred.user.getIdToken(true);

      localStorage.setItem("ID_TOKEN", token);

      // Temporary default until membership/tenant picker is wired
      if (!localStorage.getItem("TENANT_ID")) {
        localStorage.setItem("TENANT_ID", "demo");
      }

      setStatus("✅ Signed in. ID_TOKEN stored in localStorage.");

      // This forces App.jsx to re-render and show the authed view
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Login failed: ${err?.message || String(err)}`);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 520 }}>
      <h1 style={{ marginBottom: 16 }}>Admin Login</h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={{ padding: 10, fontSize: 16 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div>Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={{ padding: 10, fontSize: 16 }}
          />
        </label>

        <button type="submit" style={{ padding: 12, fontSize: 16 }}>
          Sign in
        </button>
      </form>

      <div style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{status}</div>

      <p style={{ marginTop: 16, opacity: 0.8 }}>
        After login: DevTools → Application → Local Storage → confirm <code>ID_TOKEN</code>.
      </p>
    </div>
  );
}
