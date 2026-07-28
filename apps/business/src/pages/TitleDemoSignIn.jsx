/**
 * TitleDemoSignIn.jsx — /demo/title landing page.
 *
 * Two-sided demo: title company admin view (Attorneys Title Henderson County)
 * and the buyer/seller client portal. No login required for either side —
 * the admin side auto-signs in via demo:token; the portal is public.
 *
 * Demo file: 313 Mayfair Dr, Athens TX 75751 · File ATH-2026-0743
 * Company: Attorneys Title Company of Henderson County
 * Staff persona: Sarah Garris (escrow officer)
 */
import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const NAVY   = "#1e3a5f";
const STEEL  = "#2d5080";
const LIGHT  = "#f0f4f8";
const ACCENT = "#2563eb";

function Card({ onClick, icon, headline, sub, tag, tagColor }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#fff" : LIGHT,
        border: `2px solid ${hover ? ACCENT : "#b0c4de"}`,
        borderRadius: 16, padding: "32px 28px", textAlign: "left",
        cursor: "pointer", width: "100%", transition: "all 0.15s",
        boxShadow: hover ? "0 4px 24px rgba(37,99,235,0.10)" : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      {tag && (
        <div style={{
          display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: 1,
          textTransform: "uppercase", color: tagColor || NAVY,
          background: tagColor ? tagColor + "18" : "#dbeafe",
          padding: "3px 8px", borderRadius: 4, marginBottom: 10,
        }}>{tag}</div>
      )}
      <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{headline}</div>
      <div style={{ fontSize: 14, color: "#4a6a8a", lineHeight: 1.5 }}>{sub}</div>
    </button>
  );
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 32, height: 32,
        border: `3px solid ${LIGHT}`, borderTopColor: ACCENT,
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export default function TitleDemoSignIn() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Auto-kick if ?view=admin in URL (direct link to admin demo)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "admin") {
      startAdminDemo();
    }
    if (new URLSearchParams(window.location.search).get("view") === "buyer") {
      window.location.replace("/portal?company=attorneys-title&persona=buyer&orderId=ATH-2026-0743");
    }
    if (new URLSearchParams(window.location.search).get("view") === "seller") {
      window.location.replace("/portal?company=attorneys-title&persona=seller&orderId=ATH-2026-0743");
    }
  }, []);

  async function startAdminDemo() {
    setLoading(true); setErr("");
    const ctrl = new AbortController();
    const wd = setTimeout(() => { ctrl.abort(); setErr("Demo is taking longer than usual."); setLoading(false); }, 15000);
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=title`, { signal: ctrl.signal });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Demo unavailable.");
      clearTimeout(wd);

      const token = data.token;
      const { signInWithCustomToken } = await import("firebase/auth");
      const { auth } = await import("../firebase");
      const cred = await signInWithCustomToken(auth, token);
      const idToken = await cred.user.getIdToken(true);

      localStorage.setItem("ID_TOKEN", idToken);
      if (data.tenantId) {
        localStorage.setItem("TENANT_ID", data.tenantId);
        localStorage.setItem("WORKSPACE_ID", data.tenantId);
      }
      localStorage.setItem("WORKSPACE_NAME", data.workspaceName || "Attorneys Title Henderson County");
      localStorage.setItem("COMPANY_NAME",   data.workspaceName || "Attorneys Title Henderson County");
      localStorage.setItem("TENANT_NAME",    data.workspaceName || "Attorneys Title Henderson County");
      localStorage.setItem("VERTICAL", "real-estate");
      localStorage.setItem("DISPLAY_NAME", data.personaName || "Sarah Garris");
      localStorage.removeItem("USER_EMAIL");

      // Mark checklist items complete so the workers open directly without setup
      const now = Date.now();
      const checklists = {
        "ta_checklist_platform-accounting":  { "bank-statements": now, "accounting-software": now, "tax-returns": now, "expense-rules": now, "vendor-lists": now },
        "ta_checklist_platform-contacts":    { "import-contacts": now, "crm-connect": now, "comm-history": now, "followup-auto": now, "client-categories": now },
        "ta_checklist_platform-hr":          { "roster": now, "handbook": now, "org-chart": now, "payroll": now, "perf-reviews": now, "compliance-docs": now },
        "ta_checklist_platform-marketing":   { "brand-guidelines": now, "social-accounts": now, "contact-lists": now, "competitor-docs": now, "content-workflow": now },
      };
      for (const [k, v] of Object.entries(checklists)) {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
      }

      window.location.replace("/?demo=1&persona=title&openWorker=re-escrow-001");
    } catch (e) {
      clearTimeout(wd);
      if (e.name !== "AbortError") {
        setErr(e.message || "Could not load the demo.");
        setLoading(false);
      }
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: NAVY, color: "#fff", fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 13, color: "#93c5fd", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
          Attorneys Title Henderson County
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Loading title company view...</div>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: NAVY,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        padding: "18px 32px", display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, color: "#fff",
        }}>⚖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            Attorneys Title Company of Henderson County
          </div>
          <div style={{ fontSize: 11, color: "#93c5fd", letterSpacing: 0.5 }}>
            Athens, TX · Powered by SOCIII
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <a href="/" style={{ color: "#93c5fd", fontSize: 12, textDecoration: "none" }}>← sociii.ai</a>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        maxWidth: 640, margin: "0 auto", padding: "56px 24px 0",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
          textTransform: "uppercase", color: "#93c5fd",
          background: "rgba(147,197,253,0.10)", padding: "5px 14px",
          borderRadius: 20, border: "1px solid rgba(147,197,253,0.20)", marginBottom: 20,
        }}>
          Live Demo · File ATH-2026-0743
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 14px", lineHeight: 1.15 }}>
          313 Mayfair Dr<br />Athens, TX 75751
        </h1>
        <p style={{ fontSize: 16, color: "#93c5fd", lineHeight: 1.6, margin: "0 0 40px" }}>
          $285,000 cash purchase · Henderson County · Clear to close
          <br />Choose your view below.
        </p>
      </div>

      {/* Two-sided cards */}
      <div style={{
        maxWidth: 640, margin: "0 auto", padding: "0 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
      }}>
        <Card
          onClick={startAdminDemo}
          icon="🏢"
          tag="Title Company"
          tagColor={NAVY}
          headline="Company View"
          sub="Title Advocate workspace — parcel map, rights stack, chain of title, funds, wire instructions, closing disclosure."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card
            onClick={() => window.location.replace("/portal?company=attorneys-title&persona=buyer&orderId=ATH-2026-0743")}
            icon="🏠"
            tag="Buyer"
            tagColor="#059669"
            headline="Buyer Portal"
            sub="What Michael & Sarah Chen see — order status, documents, Vault delivery."
          />
          <Card
            onClick={() => window.location.replace("/portal?company=attorneys-title&persona=seller&orderId=ATH-2026-0743")}
            icon="📋"
            tag="Seller"
            tagColor="#d97706"
            headline="Seller Portal"
            sub="What Troy Garris Trust sees — proceeds schedule, signing status, disbursements."
          />
        </div>
      </div>

      {/* File summary strip */}
      <div style={{
        maxWidth: 640, margin: "24px auto 0", padding: "0 24px",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12, padding: "16px 20px",
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12,
        }}>
          {[
            { label: "File", value: "ATH-2026-0743" },
            { label: "Purchase price", value: "$285,000" },
            { label: "County", value: "Henderson, TX" },
            { label: "Status", value: "Recording in progress" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#93c5fd", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shareable links */}
      <div style={{
        maxWidth: 640, margin: "16px auto 0", padding: "0 24px 56px",
        display: "flex", gap: 10, flexWrap: "wrap",
      }}>
        {[
          { label: "Company view link", href: "/demo/title?view=admin" },
          { label: "Buyer link", href: "/portal?company=attorneys-title&persona=buyer&orderId=ATH-2026-0743" },
          { label: "Seller link", href: "/portal?company=attorneys-title&persona=seller&orderId=ATH-2026-0743" },
        ].map(({ label, href }) => (
          <button
            key={label}
            onClick={() => { navigator.clipboard?.writeText(window.location.origin + href); }}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, padding: "7px 14px", color: "#93c5fd", fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}
            title={`Copy ${label}`}
          >
            Copy {label}
          </button>
        ))}
      </div>

      {err && (
        <div style={{ textAlign: "center", color: "#f87171", fontSize: 13, paddingBottom: 24 }}>
          {err} — <a href="/demo/title" style={{ color: "#93c5fd" }}>retry</a>
          {" · "}
          <a href="/" style={{ color: "#93c5fd" }}>go home</a>
        </div>
      )}
    </div>
  );
}
