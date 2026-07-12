// One-click TRAITLY demo sign-in — Elise / EU Battery Passport compliance.
// Mounted at /demo/dpp. Signs in with email/password so Vault gate shows
// correctly. Lands in the TRAITLY workspace with Voltara data pre-seeded.
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

const TRAITLY_EMAIL    = "traitly-demo@sociii.ai";
const TRAITLY_PASSWORD = "TRAITLY!DPP2026";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function TraitlyDemoSignIn() {
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=traitly`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Demo is temporarily unavailable.");

        await signOut(auth).catch(() => {});
        const cred = await signInWithEmailAndPassword(auth, TRAITLY_EMAIL, TRAITLY_PASSWORD);
        const idToken = await cred.user.getIdToken(true);
        if (cancelled) return;
        clearTimeout(watchdog);

        localStorage.setItem("ID_TOKEN", idToken);
        if (data.tenantId) localStorage.setItem("TENANT_ID", data.tenantId);
        localStorage.setItem("IS_CREATOR", "true");

        const now = Date.now();

        const spineChecklists = {
          "ta_checklist_platform-accounting": {
            "bank-statements": now, "accounting-software": now,
            "tax-returns": now, "expense-rules": now, "vendor-lists": now,
          },
          "ta_checklist_platform-hr": {
            "roster": now, "handbook": now, "org-chart": now,
            "payroll": now, "perf-reviews": now, "compliance-docs": now,
          },
          "ta_checklist_platform-contacts": {
            "import-contacts": now, "crm-connect": now,
            "comm-history": now, "followup-auto": now, "client-categories": now,
          },
          "ta_checklist_platform-marketing": {
            "brand-guidelines": now, "social-accounts": now,
            "contact-lists": now, "competitor-docs": now, "content-workflow": now,
          },
          // DPP worker checklist pre-marked so canvas renders intelligence mode immediately
          "ta_checklist_eu-battery-dpp-001": {
            "regulation-scope": now, "client-roster": now,
            "passport-builder": now, "data-sources": now, "raas-rules": now,
          },
        };

        for (const [key, val] of Object.entries(spineChecklists)) {
          try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota blocked */ }
        }

        window.location.replace("/?demo=1&persona=traitly");
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
      <div style={{ fontSize: 14, color: "#a78bfa" }}>Volta Advisory · EU Battery Passport Compliance</div>
      {err
        ? (
          <div style={{ color: "#f87171", fontSize: 13 }}>
            {err} —{" "}
            <a href="/demo/dpp" style={{ color: "#a78bfa", cursor: "pointer" }}>retry</a>
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
