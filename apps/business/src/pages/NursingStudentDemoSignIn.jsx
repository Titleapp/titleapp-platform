// /demo/nursing/student — auto-signs in as Sara Kahele (BSN student, Makai),
// then redirects into the real customer-facing ClientPortal.jsx — NOT the
// operator app. Fixed 2026-08-20 (Sean: "a true student would probably be
// the counterparty" — same gap class as the re-tenant fix earlier). Mirrors
// TitleClientDemoSignIn.jsx's pattern exactly.
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

export default function NursingStudentDemoSignIn() {
  const [err, setErr] = useState("");
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=nursing-student`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok || !data.token) throw new Error(data.error || "Demo unavailable.");
        await signInWithCustomToken(auth, data.token);
        if (cancelled) return;
        clearTimeout(watchdog);
        // ClientPortal.jsx reads company/persona from its own URL params +
        // onAuthStateChanged, not localStorage — same as title-client/re-tenant.
        window.location.replace("/portal?company=makai-nursing&persona=student&demo=1");
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
      <div style={{ fontSize: 22, fontWeight: 700 }}>Loading SOCIII demo…</div>
      <div style={{ fontSize: 14, color: "#a78bfa" }}>Makai School of Nursing · Sara Kahele, BSN Student</div>
      {err
        ? <div style={{ color: "#f87171", fontSize: 13 }}>{err} — <a href="/demo/nursing/student" style={{ color: "#a78bfa" }}>retry</a> · <a href="/" style={{ color: "#a78bfa" }}>go home</a></div>
        : <div style={{ width: 28, height: 28, border: "3px solid #2a2a3a", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
