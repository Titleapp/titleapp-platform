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
        localStorage.setItem("IS_CREATOR", "true");
        // Pre-mark all spine worker setup checklists as complete so the demo
        // shows the live intelligence canvas, not the "setup mode" checklist.
        const now = Date.now();
        const spineChecklists = {
          "ta_checklist_platform-accounting": { "bank-statements": now, "accounting-software": now, "tax-returns": now, "expense-rules": now, "vendor-lists": now },
          "ta_checklist_platform-hr": { "roster": now, "handbook": now, "org-chart": now, "payroll": now, "perf-reviews": now, "compliance-docs": now },
          "ta_checklist_platform-marketing": { "brand-guidelines": now, "social-accounts": now, "contact-lists": now, "competitor-docs": now, "content-workflow": now },
          "ta_checklist_platform-contacts": { "contact-basics": now, "import-contacts": now, "crm-connect": now, "comm-history": now, "followup-auto": now, "client-categories": now },
        };
        for (const [key, val] of Object.entries(spineChecklists)) {
          try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* blocked */ }
        }
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
