// /demo/av-copilot · /demo/av-mx · /demo/av-dispatch
// Auto-signs in as Alex Rivera (Pacific Air Partners) and opens the target worker.
// Uses custom-token auth (no password required — backend provisions the demo user).
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

// Read the target worker from the URL path — /demo/av-copilot → av-copilot
function workerFromPath() {
  const seg = window.location.pathname.split("/").filter(Boolean).pop() || "av-copilot";
  return seg.startsWith("av-") ? seg : "av-copilot";
}

const WORKER_LABELS = {
  "av-copilot":  "CoPilot",
  "av-mx":       "Aircraft Record",
  "av-dispatch": "Trip Release",
};

export default function AviationDemoSignIn() {
  const [err, setErr] = useState("");
  const worker = workerFromPath();
  const label  = WORKER_LABELS[worker] || "CoPilot";

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api?path=/v1/demo:token&persona=aviation`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        if (!data.ok || !data.token) throw new Error(data.error || "Demo unavailable.");

        const cred   = await signInWithCustomToken(auth, data.token);
        const idToken = await cred.user.getIdToken(true);
        if (cancelled) return;
        clearTimeout(watchdog);

        localStorage.setItem("ID_TOKEN", idToken);
        if (data.tenantId) {
          localStorage.setItem("TENANT_ID",     data.tenantId);
          localStorage.setItem("WORKSPACE_ID",  data.tenantId);
        }
        if (data.workspaceName) {
          localStorage.setItem("WORKSPACE_NAME", data.workspaceName);
          localStorage.setItem("COMPANY_NAME",   data.workspaceName);
          localStorage.setItem("TENANT_NAME",    data.workspaceName);
        }
        if (data.vertical) localStorage.setItem("VERTICAL", data.vertical);
        if (data.personaName) localStorage.setItem("DISPLAY_NAME", data.personaName);
        localStorage.removeItem("USER_EMAIL");
        localStorage.setItem("IS_CREATOR", "true");

        // Use the existing ta_open_worker hook — App.jsx reads this on mount
        // and calls selectWorker() + navigates to worker-home automatically.
        sessionStorage.setItem("ta_open_worker", worker);

        window.location.replace(`/?demo=1&persona=aviation`);
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
      <div style={{ fontSize: 22, fontWeight: 700 }}>Loading SOCIII demo…</div>
      <div style={{ fontSize: 14, color: "#a78bfa" }}>
        Pacific Air Partners · {label} · Alex Rivera
      </div>
      {err
        ? (
          <div style={{ color: "#f87171", fontSize: 13 }}>
            {err} —{" "}
            <a href={`/demo/${worker}`} style={{ color: "#a78bfa", cursor: "pointer" }}>retry</a>
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
      <a href="/pricing#aviation-box" style={{ color: "#a78bfa", fontSize: 13, textDecoration: "underline", marginTop: 8 }}>Get the Aviation Business Stack for your operation →</a>
      <a href="/" style={{ color: "#6b7280", fontSize: 12 }}>Back to sociii.ai</a>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
