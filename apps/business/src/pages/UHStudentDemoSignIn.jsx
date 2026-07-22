// /demo/uh/student — auto-signs in as Sara Kahele (student, UH Mānoa)
import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

export default function UHStudentDemoSignIn() {
  const [err, setErr] = useState("");
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) { ctrl.abort(); setErr("The demo is taking longer than usual to load."); }
    }, 15000);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=uh-student`, { signal: ctrl.signal });
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
        localStorage.setItem("IS_CREATOR", "true");
        window.location.replace("/?demo=1&persona=uh-student");
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
      <div style={{ fontSize: 14, color: "#a78bfa" }}>UH Mānoa · Sara Kahele, BSN Student</div>
      {err
        ? <div style={{ color: "#f87171", fontSize: 13 }}>{err} — <a href="/demo/uh/student" style={{ color: "#a78bfa" }}>retry</a> · <a href="/" style={{ color: "#a78bfa" }}>go home</a></div>
        : <div style={{ width: 28, height: 28, border: "3px solid #2a2a3a", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
