// CODEX 48.3 Phase C — Billing entry point.
// Minimal first pass. Shows current plan, credits, and a manage billing button.

import React from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function Card({ children, style }) {
  return <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, ...style }}>{children}</div>;
}

export default function BillingPage() {
  const plan = localStorage.getItem("PLAN_NAME") || "Free";
  const credits = localStorage.getItem("CREDITS_REMAINING") || "100";

  async function openPortal() {
    try {
      const { getAuth } = await import("firebase/auth");
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) { alert("Please sign in to manage billing."); return; }
      const res = await fetch(`${API_BASE}/api?path=/v1/billing:portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Billing portal is not available yet. Contact sean@titleapp.ai for billing questions.");
      }
    } catch {
      alert("Billing portal is not available yet. Contact sean@titleapp.ai for billing questions.");
    }
  }

  return (
    <div style={{ padding: "32px 28px", maxWidth: 700, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>Billing</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>Manage your plan, credits, and payment methods.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Current Plan</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginTop: 6 }}>{plan}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>14-day free trial — no credit card required</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Data Credits</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginTop: 6 }}>{credits}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Credits remaining this month</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={openPortal}
          style={{ padding: "12px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Manage Billing
        </button>
        <button
          onClick={() => alert("Credit top-up coming soon. Contact sean@titleapp.ai.")}
          style={{ padding: "12px 24px", background: "#FFFFFF", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Add Data Credits
        </button>
      </div>

      <div style={{ marginTop: 32, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
        Questions about billing? Email sean@titleapp.ai or ask Alex in the chat.
      </div>
    </div>
  );
}
