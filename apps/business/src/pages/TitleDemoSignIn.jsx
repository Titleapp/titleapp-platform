/**
 * TitleDemoSignIn.jsx
 *
 * /demo/title          → auto-sign in as Sarah Garris, opens Title Advocate in the standard app
 * /demo/title/buyer    → buyer client portal (Michael & Sarah Chen)
 * /demo/title/seller   → seller client portal (Troy Garris Trust)
 *
 * Company view uses the standard SOCIII 3-column layout (left nav, middle chat, right canvas)
 * — identical behavior to /demo/av-copilot and other persona demos.
 */
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

export default function TitleDemoSignIn() {
  const [err, setErr] = useState("");

  // Buyer / seller sub-routes — redirect to portal immediately, no auth needed
  const path = window.location.pathname;
  if (path.includes("/buyer"))  { window.location.replace("/portal?company=attorneys-title&persona=buyer&orderId=ATH-2026-0743");  return null; }
  if (path.includes("/seller")) { window.location.replace("/portal?company=attorneys-title&persona=seller&orderId=ATH-2026-0743"); return null; }

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);

    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=title`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok || !data.token) throw new Error(data.error || "Demo unavailable.");

        const cred    = await signInWithCustomToken(auth, data.token);
        const idToken = await cred.user.getIdToken(true);
        if (cancelled) return;
        clearTimeout(watchdog);

        localStorage.setItem("ID_TOKEN",       idToken);
        localStorage.setItem("TENANT_ID",      data.tenantId      || "demo-attorneys-title-001");
        localStorage.setItem("WORKSPACE_ID",   data.tenantId      || "demo-attorneys-title-001");
        localStorage.setItem("WORKSPACE_NAME", data.workspaceName || "Attorneys Title Henderson County");
        localStorage.setItem("COMPANY_NAME",   data.workspaceName || "Attorneys Title Henderson County");
        localStorage.setItem("TENANT_NAME",    data.workspaceName || "Attorneys Title Henderson County");
        localStorage.setItem("VERTICAL",       "real-estate");
        localStorage.setItem("DISPLAY_NAME",   data.personaName   || "Sarah Garris");
        localStorage.removeItem("USER_EMAIL");
        localStorage.setItem("IS_CREATOR",     "true");

        // Pre-complete spine checklists so workers open directly
        const now = Date.now();
        const checklists = {
          "ta_checklist_platform-accounting": { "bank-statements": now, "accounting-software": now, "tax-returns": now, "expense-rules": now, "vendor-lists": now },
          "ta_checklist_platform-contacts":   { "import-contacts": now, "crm-connect": now, "comm-history": now, "followup-auto": now, "client-categories": now },
          "ta_checklist_platform-hr":         { "roster": now, "handbook": now, "org-chart": now, "payroll": now, "perf-reviews": now, "compliance-docs": now },
          "ta_checklist_platform-marketing":  { "brand-guidelines": now, "social-accounts": now, "contact-lists": now, "competitor-docs": now, "content-workflow": now },
        };
        for (const [k, v] of Object.entries(checklists)) {
          try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
        }

        // Open Title Advocate directly on load
        sessionStorage.setItem("ta_open_worker", "re-escrow-001");
        window.location.replace("/?demo=1&persona=title");
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
      <div style={{ fontSize: 14, color: "#a78bfa" }}>Attorneys Title Henderson County · Sarah Garris, Escrow Officer</div>
      {err
        ? <div style={{ color: "#f87171", fontSize: 13 }}>{err} — <a href="/demo/title" style={{ color: "#a78bfa" }}>retry</a> · <a href="/" style={{ color: "#a78bfa" }}>go home</a></div>
        : <div style={{ width: 28, height: 28, border: "3px solid #2a2a3a", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
