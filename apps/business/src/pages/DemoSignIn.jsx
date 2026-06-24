// One-click "View the Demo" — auto-signs into the fixed demo account
// (Dr. Maya Chen / Meadow Creek) via a custom token, lands in the workspace.
// Mounted at /demo. No password, no email, nothing to set up.
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function DemoSignIn() {
  const [err, setErr] = useState("");
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    // Watchdog: a SPA cold-start / network stall used to hang this splash forever
    // (no timeout). If we haven't redirected in 15s, surface a retry instead.
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok || !data.token) throw new Error(data.error || "Demo is temporarily unavailable.");
        const cred = await signInWithCustomToken(auth, data.token);
        const idToken = await cred.user.getIdToken(true);
        if (cancelled) return;
        clearTimeout(watchdog);
        localStorage.setItem("ID_TOKEN", idToken);
        if (data.tenantId) localStorage.setItem("TENANT_ID", data.tenantId);
        window.location.replace("/?demo=1");
      } catch (e) {
        if (!cancelled) {
          clearTimeout(watchdog);
          setErr(e.name === "AbortError" ? "The demo is taking longer than usual to load." : (e.message || "Could not load the demo."));
        }
      }
    })();
    return () => { cancelled = true; clearTimeout(watchdog); ctrl.abort(); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "#0b0b12", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>Loading the SOCIII demo…</div>
      <div style={{ fontSize: 14, color: "#a78bfa" }}>Meadow Creek Veterinary Clinic · Dr. Maya Chen, DVM</div>
      {err
        ? <div style={{ color: "#f87171", fontSize: 13 }}>{err} — <a href="/demo" style={{ color: "#a78bfa", cursor: "pointer" }}>retry</a> · <a href="/" style={{ color: "#a78bfa" }}>go home</a></div>
        : <div style={{ width: 28, height: 28, border: "3px solid #2a2a3a", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
