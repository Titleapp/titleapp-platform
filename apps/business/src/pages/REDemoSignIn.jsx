// One-click RE demo auto-sign-in — Merritt Capital Group / Scott Harrington.
// Mounted at /demo/real-estate. Signs in with email/password so the Vault gate
// shows correctly (re-auth with MerrittCapital!2026 unlocks Scott's Vault).
// The demo:token endpoint is called only to get the tenantId — the token itself
// is discarded in favor of email/password auth.
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const RE_DEMO_EMAIL    = "re-demo@sociii.ai";
const RE_DEMO_PASSWORD = "MerrittCapital!2026";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function REDemoSignIn() {
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);

    (async () => {
      try {
        // Get tenantId from backend — we discard the custom token and sign in
        // with email/password so the Vault gate shows (VaultGate auto-bypasses
        // custom-token users; email/password users must re-authenticate normally).
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=realestate`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Demo is temporarily unavailable.");

        const cred = await signInWithEmailAndPassword(auth, RE_DEMO_EMAIL, RE_DEMO_PASSWORD);
        const idToken = await cred.user.getIdToken(true);
        if (cancelled) return;
        clearTimeout(watchdog);

        localStorage.setItem("ID_TOKEN", idToken);
        if (data.tenantId) localStorage.setItem("TENANT_ID", data.tenantId);
        localStorage.setItem("IS_CREATOR", "true");

        const now = Date.now();

        // Spine workers — exact keys from WORKER_CHECKLISTS in WorkerCanvas.jsx
        const spineChecklists = {
          "ta_checklist_platform-control-center-pro": {
            "email-connection": now, "communication-preferences": now,
            "key-metrics": now, "revenue-tracking": now,
            "acquisition-goals": now, "external-feeds": now,
          },
          "ta_checklist_platform-accounting": {
            "bank-statements": now, "accounting-software": now,
            "tax-returns": now, "expense-rules": now, "vendor-lists": now,
          },
          "ta_checklist_platform-hr": {
            "roster": now, "handbook": now, "org-chart": now,
            "payroll": now, "perf-reviews": now, "compliance-docs": now,
          },
          "ta_checklist_platform-marketing": {
            "brand-guidelines": now, "social-accounts": now,
            "contact-lists": now, "competitor-docs": now, "content-workflow": now,
          },
          "ta_checklist_platform-contacts": {
            "import-contacts": now, "crm-connect": now,
            "comm-history": now, "followup-auto": now, "client-categories": now,
          },
        };
        // RE canvas workers (title-abstract-001, zoning-001, cre-analyst,
        // re-property-manager, investor-relations, re-marketing-001) all render
        // via reCanvasData.js — they bypass WORKER_CHECKLISTS entirely.
        // No checklist entries needed for any of them.
        const allChecklists = { ...spineChecklists };
        for (const [key, val] of Object.entries(allChecklists)) {
          try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota blocked */ }
        }

        window.location.replace("/?demo=1&persona=realestate");
      } catch (e) {
        if (!cancelled) {
          clearTimeout(watchdog);
          setErr(
            e.name === "AbortError"
              ? "The demo is taking longer than usual to load."
              : (e.message || "Could not load the demo.")
          );
        }
      }
    })();

    return () => { cancelled = true; clearTimeout(watchdog); ctrl.abort(); };
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 16,
      background: "#0b0b12", color: "#fff", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>SOCIII</div>
      {err
        ? (
          <div style={{ color: "#f87171", fontSize: 13 }}>
            {err} —{" "}
            <a href="/demo/real-estate" style={{ color: "#a78bfa", cursor: "pointer" }}>retry</a>
            {" · "}
            <a href="/" style={{ color: "#a78bfa" }}>go home</a>
          </div>
        )
        : (
          <div style={{
            width: 28, height: 28,
            border: "3px solid #2a2a3a", borderTopColor: "#7c3aed",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
        )
      }
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
