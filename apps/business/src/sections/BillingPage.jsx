// CODEX 49.32 — Billing page with tenant-aware credit pools, subscriptions, and payment method.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { auth } from "../firebase";
import { collection, doc, getDoc, getDocs, getFirestore, query, where, limit, orderBy } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const CREDIT_PACKS = [
  { credits: 500, label: "500 credits", price: "$5", subline: "Best for trying things out" },
  { credits: 2000, label: "2,000 credits", price: "$15", subline: "33% bonus — great for active workers" },
  { credits: 10000, label: "10,000 credits", price: "$50", subline: "100% bonus — power user / team pack" },
];

const STATUS_LABEL = { trial_active: "Trial", subscribed: "Active", trial_expired: "Expired", cancelled: "Cancelled" };
const STATUS_COLOR = { trial_active: "#7c3aed", subscribed: "#059669", trial_expired: "#dc2626", cancelled: "#94a3b8" };

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

function CardBrand({ brand }) {
  const brands = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" };
  return <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{brands[brand] || brand}</span>;
}

function trialDaysLeft(endsAt) {
  if (!endsAt) return null;
  const end = endsAt.toDate ? endsAt.toDate() : new Date(endsAt);
  const diff = Math.ceil((end - Date.now()) / 86400000);
  return diff;
}

export default function BillingPage() {
  const plan = localStorage.getItem("PLAN_NAME") || "Free";
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("TENANT_ID") || null);
  const [tenantName, setTenantName] = useState(localStorage.getItem("WORKSPACE_NAME") || "Workspace");
  const [userBalance, setUserBalance] = useState(localStorage.getItem("CREDITS_REMAINING") || "100");
  const [tenantBalance, setTenantBalance] = useState(null);
  const [role, setRole] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerScope, setPickerScope] = useState("user");
  const [busyPack, setBusyPack] = useState(null);
  const [error, setError] = useState("");
  const [subscriptions, setSubscriptions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(undefined); // undefined = loading

  const personalCtx = isPersonalContext(tenantId);

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

      // User balance
      const userSnap = await getDoc(doc(fdb, "users", u.uid));
      if (userSnap.exists()) {
        const d = userSnap.data();
        const bal = d.prepaidCredits ?? d.billing?.prepaidCredits ?? 0;
        setUserBalance(String(bal));
        localStorage.setItem("CREDITS_REMAINING", String(bal));
      }

      // Tenant balance + role
      if (!personalCtx && tenantId) {
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
        if (!memQuery.empty) setRole(memQuery.docs[0].data().role || "member");
        else setRole(null);
      } else {
        setTenantBalance(null);
        setRole(null);
      }

      // Subscriptions: fetch by userId + (optionally) tenantId
      try {
        const subsQ = await getDocs(query(
          collection(fdb, "subscriptions"),
          where("userId", "==", u.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        ));
        const subs = subsQ.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubscriptions(subs);
      } catch { setSubscriptions([]); }
    } catch (e) {
      console.warn("BillingPage refresh failed:", e.message);
    }
  }, [tenantId, personalCtx]);

  // Payment method — separate fetch so it doesn't block the main refresh
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    setPaymentMethod(undefined);
    const tid = localStorage.getItem("TENANT_ID") || "vault";
    u.getIdToken().then(token =>
      fetch(`${API_BASE}/api?path=/v1/billing:paymentMethod`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tid },
      })
    ).then(r => r.json()).then(d => {
      setPaymentMethod(d.ok ? (d.paymentMethod || null) : null);
    }).catch(() => setPaymentMethod(null));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(tenantId ? { "X-Tenant-Id": tenantId } : {}) },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.ok && data.url) window.location.href = data.url;
      else setError(data.error || "Billing portal not available yet.");
    } catch (e) { setError(e.message || "Billing portal failed."); }
  }

  async function purchaseCreditPack(credits) {
    setError("");
    setBusyPack(credits);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError("Please sign in to purchase credits."); setBusyPack(null); return; }
      const body = {
        credits,
        successUrl: `${window.location.origin}/subscribe/success?type=credits&amount=${credits}&scope=${pickerScope}`,
        cancelUrl: `${window.location.origin}/?credits=cancel`,
        ...(pickerScope === "tenant" && tenantId ? { tenantId } : {}),
      };
      const res = await fetch(`${API_BASE}/api?path=/v1/credits:purchase`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(tenantId ? { "X-Tenant-Id": tenantId } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      // eslint-disable-next-line react-hooks/immutability
      if (data.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
      else { setError(data.error || "Could not start checkout. Try again."); setBusyPack(null); }
    } catch (e) { setError(e.message || "Checkout failed."); setBusyPack(null); }
  }

  const personalBalanceDisplay = useMemo(() => {
    const n = Number(userBalance);
    return Number.isFinite(n) ? n.toLocaleString() : userBalance;
  }, [userBalance]);

  // Filter active/trial subs for display
  const ACTIVE_STATUSES = new Set(["trial_active", "subscribed", "trial_ending", "not_started"]);
  const activeSubs = subscriptions.filter(s => ACTIVE_STATUSES.has(s.trialStatus));
  const inactiveSubs = subscriptions.filter(s => !ACTIVE_STATUSES.has(s.trialStatus));

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

      {/* Balance tiles */}
      <div style={{ display: "grid", gridTemplateColumns: personalCtx ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
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

      {/* Payment method */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Payment Method</div>
            {paymentMethod === undefined && (
              <div style={{ fontSize: 14, color: "#94A3B8" }}>Loading…</div>
            )}
            {paymentMethod === null && (
              <div style={{ fontSize: 14, color: "#64748B" }}>No card on file</div>
            )}
            {paymentMethod && (
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                <CardBrand brand={paymentMethod.brand} /> ···· {paymentMethod.last4}
                <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>
                  {paymentMethod.expMonth}/{String(paymentMethod.expYear).slice(-2)}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={openPortal}
            style={{ padding: "8px 16px", background: "white", color: "#7c3aed", border: "1px solid #7c3aed", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {paymentMethod ? "Update" : "Add card"}
          </button>
        </div>
      </Card>

      {/* Active subscriptions */}
      {subscriptions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 }}>
            Your Workers
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {activeSubs.map(sub => {
              const days = trialDaysLeft(sub.trialEndsAt);
              const status = sub.trialStatus || "trial_active";
              return (
                <Card key={sub.id} style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{sub.workerName || sub.slug}</div>
                      {sub.slug && sub.slug !== sub.workerName && (
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sub.slug}</div>
                      )}
                      {days != null && days > 0 && status === "trial_active" && (
                        <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>{days} day{days !== 1 ? "s" : ""} left in trial</div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: (STATUS_COLOR[status] || "#94a3b8") + "18", color: STATUS_COLOR[status] || "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {STATUS_LABEL[status] || status}
                    </span>
                  </div>
                </Card>
              );
            })}
            {inactiveSubs.map(sub => {
              const status = sub.trialStatus || "cancelled";
              return (
                <Card key={sub.id} style={{ padding: "14px 16px", opacity: 0.55 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>{sub.workerName || sub.slug}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#f1f5f9", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {STATUS_LABEL[status] || status}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
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
        <Card style={{ marginBottom: 16 }}>
          {!personalCtx && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {canManageWorkspace && (
                <button
                  type="button"
                  onClick={() => setPickerScope("tenant")}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: pickerScope === "tenant" ? "#7c3aed" : "white", color: pickerScope === "tenant" ? "white" : "#1e293b", border: `1px solid ${pickerScope === "tenant" ? "#7c3aed" : "#E2E8F0"}`, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Workspace pool ({tenantName})
                </button>
              )}
              <button
                type="button"
                onClick={() => setPickerScope("user")}
                style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: pickerScope === "user" ? "#7c3aed" : "white", color: pickerScope === "user" ? "white" : "#1e293b", border: `1px solid ${pickerScope === "user" ? "#7c3aed" : "#E2E8F0"}`, cursor: "pointer", fontFamily: "inherit" }}
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
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 10, border: "1px solid " + (busyPack === p.credits ? "#7c3aed" : "#E2E8F0"), background: busyPack === p.credits ? "#f5f3ff" : "white", cursor: busyPack != null ? "wait" : "pointer", textAlign: "left", fontFamily: "inherit" }}
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
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef9c3", border: "1px solid #fde68a", color: "#854d0e", borderRadius: 8, fontSize: 13 }}>
          You're a {role || "member"} of this workspace. Only an admin can change workspace billing.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
        Questions about billing? Email alex@sociii.ai or ask Alex in the chat.
      </div>
    </div>
  );
}
