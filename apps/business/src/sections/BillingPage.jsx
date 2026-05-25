// CODEX 49.32 — Billing page with tenant-aware credit pools.
// - Personal Vault: shows user balance + Add Credits to user pool.
// - Business workspace: shows BOTH personal balance AND workspace balance,
//   plus role badge. Workspace top-up only enabled for admins. Hides
//   "Manage Billing" for non-admin members in tenant context.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { auth } from "../firebase";
import { collection, doc, getDoc, getDocs, getFirestore, query, where, limit } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const CREDIT_PACKS = [
  { credits: 500, label: "500 credits", price: "$5", subline: "Best for trying things out" },
  { credits: 2000, label: "2,000 credits", price: "$15", subline: "33% bonus — great for active workers" },
  { credits: 10000, label: "10,000 credits", price: "$50", subline: "100% bonus — power user / team pack" },
];

function isPersonalContext(tenantId) {
  return !tenantId || tenantId === "vault" || tenantId === "personal" || String(tenantId).startsWith("guest-");
}

function Card({ children, style }) {
  return <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, ...style }}>{children}</div>;
}

function RoleBadge({ role }) {
  if (!role) return null;
  const palette = {
    owner:  { bg: "#fef3c7", color: "#92400e" },
    admin:  { bg: "#ede9fe", color: "#5b21b6" },
    member: { bg: "#dcfce7", color: "#166534" },
    viewer: { bg: "#e0e7ff", color: "#3730a3" },
  };
  const c = palette[role] || palette.member;
  return (
    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: c.bg, color: c.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {role}
    </span>
  );
}

export default function BillingPage() {
  const plan = localStorage.getItem("PLAN_NAME") || "Free";
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("TENANT_ID") || null);
  const [tenantName, setTenantName] = useState(localStorage.getItem("WORKSPACE_NAME") || "Workspace");
  const [userBalance, setUserBalance] = useState(localStorage.getItem("CREDITS_REMAINING") || "100");
  const [tenantBalance, setTenantBalance] = useState(null);
  const [role, setRole] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerScope, setPickerScope] = useState("user");   // "user" | "tenant"
  const [busyPack, setBusyPack] = useState(null);
  const [error, setError] = useState("");

  const personalCtx = isPersonalContext(tenantId);

  // Listen for workspace switch events so balances refresh when admin toggles workspaces.
  useEffect(() => {
    function onChange() {
      setTenantId(localStorage.getItem("TENANT_ID") || null);
      setTenantName(localStorage.getItem("WORKSPACE_NAME") || "Workspace");
    }
    window.addEventListener("ta:workspace-changed", onChange);
    return () => window.removeEventListener("ta:workspace-changed", onChange);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = auth.currentUser;
      if (!u) return;
      const fdb = getFirestore();

      // User balance — read root prepaidCredits, fall back to billing.prepaidCredits.
      const userSnap = await getDoc(doc(fdb, "users", u.uid));
      if (userSnap.exists()) {
        const d = userSnap.data();
        const bal = d.prepaidCredits ?? d.billing?.prepaidCredits ?? 0;
        setUserBalance(String(bal));
        localStorage.setItem("CREDITS_REMAINING", String(bal));
      }

      // Tenant balance + role (when in workspace).
      if (!personalCtx) {
        const [tenantSnap, memQuery] = await Promise.all([
          getDoc(doc(fdb, "tenants", tenantId)),
          getDocs(query(
            collection(fdb, "memberships"),
            where("userId", "==", u.uid),
            where("tenantId", "==", tenantId),
            where("status", "==", "active"),
            limit(1)
          )),
        ]);
        if (tenantSnap.exists()) {
          const td = tenantSnap.data();
          setTenantBalance(td.prepaidCredits ?? 0);
          if (td.name) setTenantName(td.name);
        } else {
          setTenantBalance(0);
        }
        if (!memQuery.empty) {
          setRole(memQuery.docs[0].data().role || "member");
        } else {
          setRole(null);
        }
      } else {
        setTenantBalance(null);
        setRole(null);
      }
    } catch (e) {
      // Non-fatal — show static values.
      console.warn("BillingPage refresh failed:", e.message);
    }
  }, [tenantId, personalCtx]);

  useEffect(() => { refresh(); }, [refresh]);

  // After successful Stripe redirect, give the webhook a couple seconds to land then refresh.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") === "success") {
      const t = setTimeout(refresh, 2500);
      return () => clearTimeout(t);
    }
  }, [refresh]);

  const isAdmin = role === "admin";
  const canManageWorkspace = !personalCtx && isAdmin;

  async function openPortal() {
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError("Please sign in to manage billing."); return; }
      const res = await fetch(`${API_BASE}/api?path=/v1/billing:portal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Billing portal not available yet.");
      }
    } catch (e) {
      setError(e.message || "Billing portal failed.");
    }
  }

  async function purchaseCreditPack(credits) {
    setError("");
    setBusyPack(credits);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError("Please sign in to purchase credits."); setBusyPack(null); return; }
      // Scope-aware body. When pickerScope is "tenant" + admin, top up the workspace pool.
      const body = {
        credits,
        successUrl: `${window.location.origin}/subscribe/success?type=credits&amount=${credits}&scope=${pickerScope}`,
        cancelUrl: `${window.location.origin}/?credits=cancel`,
      };
      if (pickerScope === "tenant" && tenantId) body.tenantId = tenantId;
      const res = await fetch(`${API_BASE}/api?path=/v1/credits:purchase`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || "Could not start checkout. Try again.");
        setBusyPack(null);
      }
    } catch (e) {
      setError(e.message || "Checkout failed.");
      setBusyPack(null);
    }
  }

  const personalBalanceDisplay = useMemo(() => {
    const n = Number(userBalance);
    return Number.isFinite(n) ? n.toLocaleString() : userBalance;
  }, [userBalance]);

  return (
    <div style={{ padding: "32px 28px", maxWidth: 760, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
        Billing
        {role && <RoleBadge role={personalCtx ? "owner" : role} />}
      </div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>
        {personalCtx
          ? "Personal Vault — manage your plan, credits, and payment methods."
          : `Workspace: ${tenantName} — ${isAdmin ? "you can top up the workspace pool" : "view-only — only an admin can change billing"}.`
        }
      </div>

      <div style={{ display: "grid", gridTemplateColumns: personalCtx ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Current Plan</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginTop: 6 }}>{plan}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>14-day free trial — no credit card required</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 }}>Personal Credits</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginTop: 6 }}>{personalBalanceDisplay}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Available in your Personal Vault</div>
        </Card>
        {!personalCtx && (
          <Card style={{ borderColor: "#7c3aed", background: "linear-gradient(180deg, #faf5ff, #ffffff)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.4 }}>Workspace Credits</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginTop: 6 }}>
              {tenantBalance != null ? Number(tenantBalance).toLocaleString() : "—"}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Shared by everyone in {tenantName}</div>
          </Card>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(personalCtx || canManageWorkspace) && (
          <button
            onClick={openPortal}
            style={{ padding: "12px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Manage Billing
          </button>
        )}
        <button
          onClick={() => { setShowPicker(s => !s); setPickerScope(personalCtx ? "user" : (canManageWorkspace ? "tenant" : "user")); }}
          style={{ padding: "12px 24px", background: "#FFFFFF", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {showPicker ? "Cancel" : "Add Data Credits"}
        </button>
      </div>

      {showPicker && (
        <Card style={{ marginTop: 18 }}>
          {!personalCtx && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {canManageWorkspace && (
                <button
                  type="button"
                  onClick={() => setPickerScope("tenant")}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: pickerScope === "tenant" ? "#7c3aed" : "white",
                    color: pickerScope === "tenant" ? "white" : "#1e293b",
                    border: `1px solid ${pickerScope === "tenant" ? "#7c3aed" : "#E2E8F0"}`,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Workspace pool ({tenantName})
                </button>
              )}
              <button
                type="button"
                onClick={() => setPickerScope("user")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: pickerScope === "user" ? "#7c3aed" : "white",
                  color: pickerScope === "user" ? "white" : "#1e293b",
                  border: `1px solid ${pickerScope === "user" ? "#7c3aed" : "#E2E8F0"}`,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Personal pool
              </button>
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>
            {pickerScope === "tenant" ? `Top up ${tenantName}` : "Add to your personal credits"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {CREDIT_PACKS.map(p => (
              <button
                key={p.credits}
                disabled={busyPack != null}
                onClick={() => purchaseCreditPack(p.credits)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 16px", borderRadius: 10,
                  border: "1px solid " + (busyPack === p.credits ? "#7c3aed" : "#E2E8F0"),
                  background: busyPack === p.credits ? "#f5f3ff" : "white",
                  cursor: busyPack != null ? "wait" : "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{p.subline}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#7c3aed" }}>
                  {busyPack === p.credits ? "Opening Stripe…" : p.price}
                </div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, lineHeight: 1.5 }}>
            {pickerScope === "tenant"
              ? "Charged to the workspace's Stripe customer. Credits are pooled across all members."
              : "One-time purchase to your personal balance. Credits never expire."
            }
          </div>
        </Card>
      )}

      {!personalCtx && !isAdmin && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef9c3", border: "1px solid #fde68a", color: "#854d0e", borderRadius: 8, fontSize: 13 }}>
          You're a {role || "member"} of this workspace. Only an admin can change workspace billing.
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
        Questions about billing? Email alex@sociii.ai or ask Alex in the chat.
      </div>
    </div>
  );
}
