// /demo/skye — auto-signs in as Marcus Reyes (line pilot, Pacific Air
// Partners) and lands in SKYE's real cockpit view (CockpitView.jsx),
// front-and-center on Compliance/Currency — the surface this demo pilot's
// seeded currency data (scripts/demo/seedSkyePilotDemo.js) exercises: BFR and
// 61.57 IPC current, medical + 135.293 competency + 135.297 IPC all due
// within 30 days as three SEPARATE YELLOW-band items.
//
// main.jsx's native "aviation" flavor sets sessionStorage.ta_redirect_page =
// "av-cockpit" itself, but ONLY at a cold launch on "/" with no query string
// — this route isn't that, so it sets the same key itself before redirecting
// (same handshake AdminShell already honors for SubscribeSuccess.jsx /
// WorkerSandbox.jsx). Redirecting to "/?demo=1..." (a query string) is safe:
// main.jsx's own cold-launch check requires !window.location.search, so it
// won't overwrite the key we just set.
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

export default function SkyeDemoSignIn() {
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=skye-pilot`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok || !data.token) throw new Error(data.error || "Demo unavailable.");

        const cred = await signInWithCustomToken(auth, data.token);
        const idToken = await cred.user.getIdToken(true);
        if (cancelled) return;
        clearTimeout(watchdog);

        localStorage.setItem("ID_TOKEN", idToken);
        if (data.tenantId) {
          localStorage.setItem("TENANT_ID", data.tenantId);
          localStorage.setItem("WORKSPACE_ID", data.tenantId);
        }
        if (data.workspaceName) {
          localStorage.setItem("WORKSPACE_NAME", data.workspaceName);
          localStorage.setItem("COMPANY_NAME", data.workspaceName);
          localStorage.setItem("TENANT_NAME", data.workspaceName);
        }
        if (data.vertical) localStorage.setItem("VERTICAL", data.vertical);
        if (data.personaName) localStorage.setItem("DISPLAY_NAME", data.personaName);
        localStorage.removeItem("USER_EMAIL");

        // Land directly in SKYE's cockpit view (Compliance/Currency panel
        // first) via the same ta_redirect_page handshake main.jsx's own
        // native-flavor cold-launch logic uses — see file header.
        try { sessionStorage.setItem("ta_redirect_page", "av-cockpit"); } catch { /* ignore */ }

        window.location.replace("/?demo=1&persona=skye-pilot");
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
      <div style={{ fontSize: 14, color: "#a78bfa" }}>Pacific Air Partners · SKYE Cockpit · Marcus Reyes</div>
      {err
        ? <div style={{ color: "#f87171", fontSize: 13 }}>{err} — <a href="/demo/skye" style={{ color: "#a78bfa", cursor: "pointer" }}>retry</a> · <a href="/" style={{ color: "#a78bfa" }}>go home</a></div>
        : <div style={{ width: 28, height: 28, border: "3px solid #2a2a3a", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
