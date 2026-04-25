import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "../../firebase";
import { GoogleAuthProvider, linkWithPopup, linkWithRedirect, signInWithCredential } from "firebase/auth";
import { useWorkerState } from "../../context/WorkerStateContext";
import WorkerIcon, { getThemeAccent, getVerticalIconSlug } from "../../utils/workerIcons";


const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Subset of styles needed by TrialBanner
const S = {
  authInput: { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", boxSizing: "border-box", marginBottom: 8 },
  getBtn: { fontSize: 12, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer" },
  subscribeBtn: { padding: "12px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 8 },
};

function generateDefaultPrompts(capabilitySummary, workerName) {
  if (!capabilitySummary) return [`What can ${workerName || "you"} help me with?`];
  const sentences = capabilitySummary.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 15);
  const prompts = sentences.slice(0, 3).map(s => {
    const lower = s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
    return `Help me with ${lower}`;
  });
  if (prompts.length === 0) prompts.push(`What can ${workerName || "you"} help me with?`);
  return prompts;
}

// ── Trial Banner (guest checkout flow) ────────────────────────────

function TrialBanner({ worker }) {
  const [messageCount, setMessageCount] = useState(0);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(`ta_trial_dismissed_${worker.workerId || worker.slug}`) === "1");
  const [showCheckout, setShowCheckout] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [email, setEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [processing, setProcessing] = useState(false);

  const workerId = worker.workerId || worker.slug;
  const workerName = worker.name || worker.display_name || "this worker";
  const isFree = !worker.price || worker.price === 0;

  useEffect(() => {
    function onCount(e) {
      const { count, workerSlug } = e.detail || {};
      if (workerSlug === workerId || !workerSlug) setMessageCount(count || 0);
    }
    window.addEventListener("ta:worker-message-count", onCount);
    return () => window.removeEventListener("ta:worker-message-count", onCount);
  }, [workerId]);

  useEffect(() => {
    function onSubscribed(e) {
      if ((e.detail?.workerId) === workerId) setTrialStarted(true);
    }
    window.addEventListener("ta:worker-subscribed", onSubscribed);
    return () => window.removeEventListener("ta:worker-subscribed", onSubscribed);
  }, [workerId]);

  function handleDismiss() {
    sessionStorage.setItem(`ta_trial_dismissed_${workerId}`, "1");
    setDismissed(true);
  }

  async function startTrialWithToken(idToken) {
    const res = await fetch(`${API_BASE}/api?path=/v1/subscription:startTrial`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ workerId }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Trial start failed");
    setTrialStarted(true);
    window.dispatchEvent(new CustomEvent("ta:worker-subscribed", {
      detail: { workerId, name: workerName, price: worker.price || 0 },
    }));
    window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", {
      detail: { text: `You're all set. Your 14-day trial of ${workerName} starts now. No charge today.`, fromSystem: true },
    }));
  }

  async function handleGoogleAuth() {
    setProcessing(true);
    setCheckoutError("");
    const anonUid = auth.currentUser?.uid;
    try {
      const provider = new GoogleAuthProvider();
      const result = await linkWithPopup(auth.currentUser, provider);
      const idToken = await result.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", idToken);
      await startTrialWithToken(idToken);
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        try { await linkWithRedirect(auth.currentUser, new GoogleAuthProvider()); } catch { /* redirect navigates away */ }
        setProcessing(false);
        return;
      }
      if (err?.code === "auth/credential-already-in-use") {
        try {
          const credential = GoogleAuthProvider.credentialFromError(err);
          const result = await signInWithCredential(auth, credential);
          const idToken = await result.user.getIdToken(true);
          localStorage.setItem("ID_TOKEN", idToken);
          if (anonUid && anonUid !== result.user.uid) {
            fetch(`${API_BASE}/api?path=/v1/subscription:transfer`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ fromUid: anonUid, toUid: result.user.uid }),
            }).catch(() => {});
          }
          await startTrialWithToken(idToken);
        } catch (innerErr) {
          setCheckoutError("Sign-in failed. Try again.");
        }
        setProcessing(false);
        return;
      }
      console.error("[TrialBanner] Google auth error:", err);
      setCheckoutError("Sign-in failed. Try again.");
    }
    setProcessing(false);
  }

  async function handleEmailMagicLink(e) {
    e?.preventDefault();
    if (!email || !email.includes("@")) { setCheckoutError("Enter a valid email."); return; }
    setProcessing(true);
    setCheckoutError("");
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/magic-link:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, workerId: "platform-trial", workerSlug: workerId, workerName, preAuthUid: auth.currentUser?.uid }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to send");
      setCheckoutError("");
      setShowEmailFallback(false);
      setShowCheckout(false);
      window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", {
        detail: { text: `Check your email for a sign-in link. Once you're in, your trial will start automatically.`, fromSystem: true },
      }));
    } catch (err) {
      setCheckoutError(err.message || "Failed to send email.");
    }
    setProcessing(false);
  }

  if (isFree) return null;
  if (trialStarted) {
    return (
      <div style={{ margin: "16px 0", padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Trial active — 14 days remaining</div>
      </div>
    );
  }
  if (messageCount < 3 || dismissed) return null;

  if (showCheckout) {
    return (
      <div style={{ margin: "16px 0", padding: "16px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Start your 14-day free trial</div>
        {checkoutError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{checkoutError}</div>}
        <button
          onClick={handleGoogleAuth}
          disabled={processing}
          style={{
            width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: processing ? 0.6 : 1, color: "#1f2937", fontFamily: "inherit",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        {!showEmailFallback ? (
          <button
            onClick={() => setShowEmailFallback(true)}
            style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", padding: 4, fontFamily: "inherit" }}
          >
            Or use your email
          </button>
        ) : (
          <form onSubmit={handleEmailMagicLink} style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" autoComplete="email" autoFocus
              style={{ ...S.authInput, marginBottom: 0, flex: 1 }}
            />
            <button type="submit" disabled={processing} style={{ ...S.getBtn, padding: "10px 14px", fontSize: 13, flexShrink: 0 }}>
              {processing ? "..." : "Send link"}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ margin: "16px 0", padding: "14px 16px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 10, position: "relative" }}>
      <button onClick={handleDismiss} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", fontSize: 16, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</button>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Enjoying {workerName}?</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Start your free 14-day trial. No charge today.</div>
      <button
        onClick={() => setShowCheckout(true)}
        style={{ ...S.subscribeBtn, marginBottom: 0 }}
      >
        Start my trial
      </button>
    </div>
  );
}

// ── 49.8: Contextual checklists per worker type ─────────────────────

const WORKER_CHECKLISTS = {
  "platform-control-center-pro": {
    heading: "Make Control Center Pro more useful",
    icon: "\uD83C\uDFAF",
    unlockText: "Complete {remaining} more items to unlock advanced analytics",
    items: [
      { id: "biz-overview", label: "Business overview complete", default: true },
      { id: "bank-connect", label: "Connect bank account for live financials", action: "chat", prompt: "Help me connect my bank account for live financial tracking in Control Center Pro. What information do I need to get started?" },
      { id: "pnl-upload", label: "Upload recent P&L statements", action: "upload", accept: ".pdf,.csv,.xlsx,.xls" },
      { id: "team-contacts", label: "Add team member contacts", action: "chat", prompt: "Help me add my team members to Control Center Pro. I need to set up their roles and contact information." },
      { id: "revenue-targets", label: "Set monthly revenue targets", action: "chat", prompt: "Help me set up monthly revenue targets for my business. I want to track progress against goals." },
      { id: "marketing-accounts", label: "Connect marketing accounts (LinkedIn, email)", action: "chat", prompt: "Help me connect my marketing accounts like LinkedIn and email to Control Center Pro for unified tracking." },
    ],
  },
  "platform-accounting": {
    heading: "Make Accounting more powerful",
    icon: "\uD83D\uDCCA",
    unlockText: "Complete {remaining} more items for automated bookkeeping",
    items: [
      { id: "basic-setup", label: "Basic setup complete", default: true },
      { id: "bank-statements", label: "Upload last 3 months bank statements", action: "upload", accept: ".pdf,.csv,.ofx,.qfx,.qbo" },
      { id: "accounting-software", label: "Connect QuickBooks/accounting software", action: "chat", prompt: "Help me connect my QuickBooks or accounting software to sync my financial data automatically." },
      { id: "tax-returns", label: "Upload recent tax returns", action: "upload", accept: ".pdf" },
      { id: "expense-rules", label: "Set expense categorization rules", action: "chat", prompt: "Help me set up expense categorization rules for my accounting workflow. I need categories for business expenses, tax deductions, and financial reporting." },
      { id: "vendor-lists", label: "Add vendor/customer lists", action: "chat", prompt: "Help me organize my vendor and customer lists. I need to set up categorization and payment tracking." },
    ],
  },
  "platform-marketing": {
    heading: "Supercharge your marketing",
    icon: "\uD83D\uDE80",
    unlockText: "Complete {remaining} more items for automated campaigns",
    items: [
      { id: "campaign-tools", label: "Basic campaign tools ready", default: true },
      { id: "brand-guidelines", label: "Upload brand guidelines/logos", action: "upload", accept: ".pdf,.png,.jpg,.jpeg,.svg,.ai" },
      { id: "social-accounts", label: "Connect social media accounts", action: "chat", prompt: "Help me connect my social media accounts (LinkedIn, Facebook, Instagram) for unified campaign management." },
      { id: "contact-lists", label: "Import contact lists", action: "upload", accept: ".csv,.xlsx,.xls,.vcf" },
      { id: "competitor-docs", label: "Add competitor analysis docs", action: "chat", prompt: "Help me set up competitive analysis documentation. I need templates for tracking competitors, their positioning, and market gaps." },
      { id: "content-workflow", label: "Set content approval workflow", action: "chat", prompt: "Help me design a content approval workflow for my marketing campaigns. I need a process for reviewing and approving content before publishing." },
    ],
  },
  "platform-hr": {
    heading: "Upgrade HR capabilities",
    icon: "\uD83D\uDC65",
    unlockText: "Complete {remaining} more items for full HR automation",
    items: [
      { id: "employee-basics", label: "Employee basics ready", default: true },
      { id: "roster", label: "Upload employee and contractor roster", action: "upload", accept: ".csv,.xlsx,.xls,.pdf" },
      { id: "handbook", label: "Upload employee handbook", action: "upload", accept: ".pdf,.docx,.doc" },
      { id: "org-chart", label: "Add org chart/team structure", action: "chat", prompt: "Help me set up my org chart and team structure. I need to define departments, reporting lines, and team roles." },
      { id: "payroll", label: "Connect payroll system", action: "chat", prompt: "Help me connect my payroll system for automated payroll tracking and compliance monitoring." },
      { id: "perf-reviews", label: "Set performance review schedules", action: "chat", prompt: "Help me create performance review schedules for my team. I need timing, evaluation criteria, and documentation templates." },
      { id: "compliance-docs", label: "Upload compliance documents", action: "upload", accept: ".pdf,.docx,.doc" },
    ],
  },
  "platform-contacts": {
    heading: "Enhance contact management",
    icon: "\uD83D\uDCF1",
    unlockText: "Complete {remaining} more items for advanced relationship tracking",
    items: [
      { id: "contact-basics", label: "Contact basics ready", default: true },
      { id: "import-contacts", label: "Import existing contact lists", action: "upload", accept: ".csv,.xlsx,.xls,.vcf" },
      { id: "crm-connect", label: "Connect CRM system", action: "chat", prompt: "Help me connect my CRM system to sync contacts and communication history automatically." },
      { id: "comm-history", label: "Add communication history", action: "chat", prompt: "Help me import my communication history with key contacts. I want to track emails, calls, and meetings." },
      { id: "followup-auto", label: "Set follow-up automations", action: "chat", prompt: "Help me set up automated follow-up reminders and sequences for my contacts. I need rules for when and how to follow up." },
      { id: "client-categories", label: "Upload client/vendor categories", action: "upload", accept: ".csv,.xlsx,.xls" },
    ],
  },
};

function WorkerChecklist({ workerSlug, workerName }) {
  const checklist = WORKER_CHECKLISTS[workerSlug];
  const storageKey = `ta_checklist_${workerSlug}`;

  // localStorage-based completion tracking
  const [completedItems, setCompletedItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch { return {}; }
  });

  const markComplete = useCallback((itemId) => {
    setCompletedItems(prev => {
      const next = { ...prev, [itemId]: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  if (!checklist) {
    // Generic fallback for non-Spine workers
    return (
      <div style={{
        padding: "16px 20px", borderRadius: 12,
        background: "#f8fafc", border: "1px solid #e2e8f0",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Get more from {workerName || "this worker"}
        </div>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Upload your documents in chat to unlock personalized insights. Just tell Alex what you'd like to work on.
        </div>
      </div>
    );
  }

  const isItemComplete = (item) => item.default || !!completedItems[item.id];
  const completed = checklist.items.filter(isItemComplete).length;
  const remaining = checklist.items.length - completed;
  const unlockMsg = remaining > 0
    ? checklist.unlockText.replace("{remaining}", String(remaining))
    : "All setup tasks complete";

  function handleItemClick(item) {
    if (isItemComplete(item)) return;

    switch (item.action) {
      case "upload": {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        if (item.accept) fileInput.accept = item.accept;
        fileInput.onchange = (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;
          // Send files to chat for processing
          const fileNames = files.map(f => f.name).join(", ");
          window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", {
            detail: { text: `I'm uploading ${fileNames} for ${item.label.toLowerCase()}. Please help me process these documents.` },
          }));
          // Dispatch file upload event for ChatPanel to handle
          window.dispatchEvent(new CustomEvent("ta:chat-upload-files", {
            detail: { files, category: item.id, workerSlug },
          }));
          markComplete(item.id);
        };
        fileInput.click();
        break;
      }
      case "chat": {
        const prompt = item.prompt || `Help me ${item.label.toLowerCase()} for ${workerName}`;
        window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: prompt } }));
        markComplete(item.id);
        break;
      }
      case "connect": {
        const prompt = item.prompt || `Help me connect ${item.label.toLowerCase()}`;
        window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: prompt } }));
        markComplete(item.id);
        break;
      }
      default: {
        const prompt = item.prompt || `Help me ${item.label.toLowerCase()} for ${workerName}`;
        window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: prompt } }));
        markComplete(item.id);
      }
    }
  }

  // Action hint text
  const getActionHint = (item) => {
    if (item.action === "upload") return "Upload";
    if (item.action === "connect") return "Connect";
    return "Ask Alex";
  };

  // Action hint icon
  const ActionIcon = ({ action }) => {
    if (action === "upload") {
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    }
    if (action === "connect") {
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    }
    // chat — chevron
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    );
  };

  return (
    <div style={{
      padding: "16px 20px", borderRadius: 12,
      background: "#f8fafc", border: "1px solid #e2e8f0",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{checklist.icon}</span>
        <span>{checklist.heading}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {checklist.items.map((item) => {
          const done = isItemComplete(item);
          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, padding: "6px 8px", borderRadius: 8,
                cursor: done ? "default" : "pointer",
                transition: "background 150ms",
              }}
              onMouseEnter={e => { if (!done) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
                {done ? "\u2705" : "\u26A0\uFE0F"}
              </span>
              <span style={{
                color: done ? "#16a34a" : "#374151",
                fontWeight: done ? 500 : 400,
                textDecoration: done && !item.default ? "line-through" : "none",
                flex: 1,
              }}>
                {item.label}
              </span>
              {!done && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{getActionHint(item)}</span>
                  <ActionIcon action={item.action} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div style={{ marginTop: 14, padding: "0 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>{completed}/{checklist.items.length} complete</span>
        </div>
        <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${(completed / checklist.items.length) * 100}%`,
            background: remaining === 0 ? "#16a34a" : "#f59e0b",
            borderRadius: 2,
            transition: "width 300ms ease",
          }} />
        </div>
        {remaining > 0 ? (
          <div style={{ fontSize: 12, color: "#92400e", fontWeight: 500, marginTop: 8 }}>
            {unlockMsg}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 500, marginTop: 8 }}>
            {unlockMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 40.2-T1: Worker Canvas with Arrival Animation ──────────────────

export default function WorkerCanvas({ workerData, verticalLabel, relatedWorkers = [], onLeave }) {
  const ws = useWorkerState();
  const w = workerData;
  const prompts = w.quickStartPrompts || generateDefaultPrompts(w.capabilitySummary, w.name || w.display_name);
  const vertical = verticalLabel || w.vertical || w.suite || "Other";
  const isGame = !!w.gameConfig?.isGame;
  const accent = getThemeAccent(vertical, isGame);
  const iconSlug = getVerticalIconSlug(vertical);

  // Operating mode configuration
  const MODE_CONFIG = {
    pro: {
      label: "Operating from verified documents",
      bg: "rgba(22, 163, 74, 0.1)",
      border: "rgba(22, 163, 74, 0.25)",
      color: "#16a34a",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    },
    advisory: {
      label: "General guidance mode \u2014 add your documents to unlock personalized insights",
      bg: "rgba(217, 119, 6, 0.1)",
      border: "rgba(217, 119, 6, 0.25)",
      color: "#d97706",
      icon: "M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
    },
    flagged: {
      label: "Document review required",
      bg: "rgba(220, 38, 38, 0.1)",
      border: "rgba(220, 38, 38, 0.25)",
      color: "#dc2626",
      icon: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    },
  };
  const operatingMode = "advisory";
  const modeInfo = MODE_CONFIG[operatingMode];

  // Arrival state machine
  const [arrivalPhase, setArrivalPhase] = useState("idle");
  const [showName, setShowName] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showCapability, setShowCapability] = useState(false);
  const [showChips, setShowChips] = useState([]);
  const [showBadges, setShowBadges] = useState(false);
  const [showSweep, setShowSweep] = useState(false);
  const [iconAnchored, setIconAnchored] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const arrivalCancelled = useRef(false);
  const timeoutsRef = useRef([]);
  const heartbeatRef = useRef(null);
  const prevWorkerRef = useRef(null);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      if (!arrivalCancelled.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const workerState = ws?.workerState || "idle";
  const workerReady = ws?.workerReady !== undefined ? ws.workerReady : true;
  const isTransitioning = ws?.isTransitioning || false;

  useEffect(() => {
    if (!workerReady) {
      const t = setTimeout(() => setShowSkeleton(true), 300);
      return () => clearTimeout(t);
    }
    setShowSkeleton(false);
  }, [workerReady]);

  useEffect(() => {
    if (workerState !== "arrival") return;
    arrivalCancelled.current = false;
    clearTimeouts();
    setArrivalPhase("heartbeat");
    setShowName(false);
    setShowTagline(false);
    setShowCapability(false);
    setShowChips([]);
    setShowBadges(false);
    setShowSweep(false);
    setIconAnchored(false);
  }, [workerState, clearTimeouts]);

  useEffect(() => {
    const wId = w.workerId || w.slug;
    if (prevWorkerRef.current === wId) return;
    prevWorkerRef.current = wId;
    if (workerState === "idle" && workerReady) {
      setArrivalPhase("done");
      setShowName(true);
      setShowTagline(true);
      setShowCapability(true);
      setShowChips(prompts.map((_, i) => i));
      setShowBadges(true);
      setIconAnchored(true);
    }
  }, [w, workerState, workerReady, prompts]);

  const handleHeartbeatEnd = useCallback(() => {
    if (arrivalCancelled.current) return;
    setArrivalPhase("reveal");
    schedule(() => setIconAnchored(true), 0);
    schedule(() => setShowName(true), 200);
    schedule(() => setShowTagline(true), 500);
    schedule(() => setShowCapability(true), 750);
    prompts.forEach((_, i) => {
      schedule(() => setShowChips(prev => [...prev, i]), 900 + i * 150);
    });
    schedule(() => setShowBadges(true), 1350);
    schedule(() => setShowSweep(true), 1600);
    schedule(() => {
      setArrivalPhase("done");
      setShowSweep(false);
      if (ws?.setWorkerState) ws.setWorkerState("idle");
    }, 2000);
  }, [prompts, schedule, ws]);

  useEffect(() => {
    if (workerState === "working" && arrivalPhase !== "done") {
      arrivalCancelled.current = true;
      clearTimeouts();
      setArrivalPhase("done");
      setShowName(true);
      setShowTagline(true);
      setShowCapability(true);
      setShowChips(prompts.map((_, i) => i));
      setShowBadges(true);
      setIconAnchored(true);
      setShowSweep(false);
    }
  }, [workerState, arrivalPhase, prompts, clearTimeouts]);

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  const breatheDuration = workerState === "working" ? "1.8s" : "4s";

  const [confirmPulse, setConfirmPulse] = useState(false);
  useEffect(() => {
    if (workerState === "complete") {
      setConfirmPulse(true);
    }
  }, [workerState]);

  const handleConfirmPulseEnd = useCallback(() => {
    setConfirmPulse(false);
    if (ws?.setWorkerState) ws.setWorkerState("idle");
  }, [ws]);

  const contentVisible = arrivalPhase === "done" || arrivalPhase === "reveal";

  return (
    <div
      className="worker-canvas-container"
      style={{
        "--worker-accent": accent,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        color: "#1e293b",
        overflowY: "auto",
        position: "relative",
        opacity: isTransitioning ? 0.6 : 1,
        transition: "opacity 150ms ease-out",
      }}
    >
      {/* Back button */}
      <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
        <button
          onClick={onLeave}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none",
            border: "none", color: "var(--worker-accent)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to {verticalLabel || "workers"}
        </button>
      </div>

      {/* Operating mode band */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 24px",
        background: modeInfo.bg,
        borderBottom: `1px solid ${modeInfo.border}`,
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={modeInfo.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d={modeInfo.icon} />
        </svg>
        <span style={{ fontSize: 12, color: modeInfo.color, fontWeight: 500, lineHeight: 1.4 }}>
          {modeInfo.label}
        </span>
      </div>

      {/* Skeleton loading state */}
      {!workerReady && showSkeleton && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ marginBottom: 32, opacity: 0.4 }}>
            <WorkerIcon slug={iconSlug} size={48} color={accent} />
          </div>
          <div style={{
            width: "100%", maxWidth: 280, height: 32, borderRadius: 8, marginBottom: 12,
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
          }} />
          <div style={{
            width: "60%", maxWidth: 180, height: 20, borderRadius: 6, marginBottom: 16,
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
          }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 80, height: 32, borderRadius: 16,
                background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s linear infinite",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Arrival + Content area */}
      {workerReady && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 24px", position: "relative" }}>

          {/* Heartbeat center area */}
          {(arrivalPhase === "heartbeat" || (arrivalPhase === "idle" && workerState === "arrival")) && (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              position: "absolute", inset: 0, zIndex: 2,
            }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WorkerIcon slug={iconSlug} size={48} color={accent} />
                <div
                  ref={heartbeatRef}
                  className="heartbeat-ring"
                  onAnimationEnd={handleHeartbeatEnd}
                  style={{
                    position: "absolute",
                    width: 80, height: 80,
                    borderRadius: "50%",
                    border: `1.5px solid var(--worker-accent)`,
                    animation: "heartbeat-arrival 700ms ease-out 2",
                    animationFillMode: "forwards",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Anchored icon + content */}
          {contentVisible && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 12, marginTop: 8,
                position: "relative",
              }}>
                <div
                  className="worker-icon-breathe"
                  style={{
                    animation: arrivalPhase === "done" ? `breathe ${breatheDuration} ease-in-out infinite` : "none",
                    "--breathe-duration": breatheDuration,
                    transition: iconAnchored ? "transform 400ms ease-out" : "none",
                  }}
                >
                  <WorkerIcon slug={iconSlug} size={32} color={accent} />
                </div>

                {confirmPulse && (
                  <div
                    className="heartbeat-ring"
                    onAnimationEnd={handleConfirmPulseEnd}
                    style={{
                      position: "absolute", left: -8, top: -8,
                      width: 48, height: 48,
                      borderRadius: "50%",
                      border: `1.5px solid var(--worker-accent)`,
                      animation: "heartbeat-arrival 700ms ease-out 1",
                      animationFillMode: "forwards",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>

              {/* Worker name */}
              <div
                className="arrival-name"
                style={{
                  fontSize: 22, fontWeight: 700, color: "var(--worker-accent)", marginBottom: 4,
                  opacity: showName ? 1 : 0,
                  transform: showName ? "translateY(0)" : "translateY(4px)",
                  animation: showName && arrivalPhase === "reveal" ? "fadeIn 300ms ease-out forwards" : "none",
                }}
              >
                {w.name || w.display_name}
              </div>

              {/* Tagline */}
              {w.tagline && (
                <div
                  className="arrival-tagline"
                  style={{
                    fontSize: 14, color: "var(--worker-accent)", fontWeight: 500, marginBottom: 12,
                    opacity: showTagline ? 0.8 : 0,
                    transform: showTagline ? "translateY(0)" : "translateY(4px)",
                    animation: showTagline && arrivalPhase === "reveal" ? "fadeIn 250ms ease-out forwards" : "none",
                  }}
                >
                  {w.tagline}
                </div>
              )}

              {/* Capability summary */}
              {w.capabilitySummary && (
                <div
                  className="arrival-capability"
                  style={{
                    fontSize: 14, color: "rgba(0,0,0,0.5)", lineHeight: 1.6, marginBottom: 24,
                    opacity: showCapability ? 1 : 0,
                    transform: showCapability ? "translateY(0)" : "translateY(4px)",
                    animation: showCapability && arrivalPhase === "reveal" ? "fadeIn 250ms ease-out forwards" : "none",
                  }}
                >
                  {w.capabilitySummary}
                </div>
              )}

              {/* Quick start chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {prompts.map((p, i) => (
                  <button
                    key={i}
                    className="arrival-chips"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("ta:panel-ask-alex", { detail: { text: p } }));
                      if (ws?.startWorking) ws.startWorking();
                    }}
                    style={{
                      padding: "8px 14px", fontSize: 13, borderRadius: 20,
                      background: "rgba(0,0,0,0.03)",
                      border: `1px solid var(--worker-accent)`,
                      color: "var(--worker-accent)", cursor: "pointer", fontWeight: 500,
                      fontFamily: "inherit", textAlign: "left", lineHeight: 1.4,
                      opacity: showChips.includes(i) ? 1 : 0,
                      transform: showChips.includes(i) ? "translateY(0)" : "translateY(4px)",
                      animation: showChips.includes(i) && arrivalPhase === "reveal" ? "fadeIn 200ms ease-out forwards" : "none",
                      transition: arrivalPhase === "done" ? "background 150ms" : "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Substrate badges */}
              <div
                className="arrival-badges"
                style={{
                  opacity: showBadges ? 1 : 0,
                  transform: showBadges ? "translateY(0)" : "translateY(4px)",
                  animation: showBadges && arrivalPhase === "reveal" ? "fadeIn 200ms ease-out forwards" : "none",
                }}
              >
                <WorkerChecklist
                  workerSlug={w.workerId || w.slug}
                  workerName={w.name || w.display_name || "this worker"}
                />
              </div>

              <TrialBanner worker={w} />

              {/* Related Workers ("Cousins") */}
              {relatedWorkers.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>
                    More in {w.suite || vertical || "this category"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {relatedWorkers.map((rw) => {
                      const rwSlug = rw.workerId || rw.slug;
                      const rwName = rw.name || rw.display_name || rwSlug;
                      const rwPrice = rw.price != null ? (rw.price === 0 ? "Free" : `$${rw.price / 100}/mo`) : "";
                      return (
                        <div
                          key={rwSlug}
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("ta:select-worker", {
                              detail: { slug: rwSlug, name: rwName },
                            }));
                          }}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 14px", borderRadius: 10,
                            background: "rgba(0,0,0,0.02)",
                            border: "1px solid rgba(0,0,0,0.08)",
                            cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = "rgba(0,0,0,0.08)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rwName}
                            </div>
                            {(rw.tagline || rw.description) && (
                              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {rw.tagline || rw.description}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 10 }}>
                            {rwPrice && <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.4)" }}>{rwPrice}</span>}
                            <span style={{ fontSize: 11, fontWeight: 600, color: accent }}>Open</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </>
          )}

          {/* Sweep line */}
          {showSweep && (
            <div
              className="arrival-sweep"
              style={{
                position: "absolute",
                bottom: 0, left: 0,
                height: 2,
                background: "var(--worker-accent)",
                opacity: 0.2,
                animation: "sweep 400ms ease-out forwards",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
