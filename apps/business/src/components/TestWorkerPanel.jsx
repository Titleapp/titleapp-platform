import React, { useState, useRef, useEffect, useCallback } from "react";
import PublishPreflight from "./PublishPreflight";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const HE_MD_GATE_WORKERS = ["HE-013", "HE-025", "HE-027", "HE-028", "HE-030"];

const TIERS = [
  { id: 1, label: "Tier 1", price: 29, credits: 500 },
  { id: 2, label: "Tier 2", price: 49, credits: 1500 },
  { id: 3, label: "Tier 3", price: 79, credits: 3000 },
];

// Robust token getter — waits for Firebase auth state before giving up
async function getToken() {
  // 1. Try currentUser directly
  if (window.__firebaseAuth?.currentUser) {
    try {
      return await window.__firebaseAuth.currentUser.getIdToken(true);
    } catch (_) {}
  }
  // 2. Wait for auth state to settle (Firebase may still be initializing)
  if (window.__firebaseAuth) {
    try {
      return await new Promise((resolve, reject) => {
        const unsub = window.__firebaseAuth.onAuthStateChanged(user => {
          unsub();
          if (user) {
            user.getIdToken(true).then(resolve).catch(reject);
          } else {
            reject(new Error("Not authenticated"));
          }
        });
        // Timeout after 5s
        setTimeout(() => { unsub(); reject(new Error("Auth timeout")); }, 5000);
      });
    } catch (_) {}
  }
  // 3. Fallback to stored token
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

export default function TestWorkerPanel({ worker, workerCardData, sessionId, onTestComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [testSessionId, setTestSessionId] = useState(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [edgeCases, setEdgeCases] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Interface preference
  const [interfacePref, setInterfacePref] = useState(null); // null = show chooser, "mobile" | "desktop" | "both"
  const [mobileView, setMobileView] = useState(false);

  // Checklist — can be auto-checked from backend assessment or manually toggled
  const [coreJobDone, setCoreJobDone] = useState(false);
  const [complianceFired, setComplianceFired] = useState(false);
  const [badInputHandled, setBadInputHandled] = useState(false);

  // MD gate
  const needsMdGate = workerCardData?.mdGateRequired || false;
  const [mdName, setMdName] = useState("");
  const [mdNpi, setMdNpi] = useState("");
  const [mdSigned, setMdSigned] = useState(false);

  // Publish gates (P0 hard gates)
  const [idVerified, setIdVerified] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [baaAccepted, setBaaAccepted] = useState(false);
  const [gatesLoading, setGatesLoading] = useState(true);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [idType, setIdType] = useState("drivers_license");
  const [gateError, setGateError] = useState(null);

  // Blockchain toggle
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);

  const isHealthVertical = (workerCardData?.vertical || "").includes("health") ||
    (workerCardData?.suite || "") === "Health & EMS Education";

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Fetch gate status on mount
  useEffect(() => {
    async function loadGates() {
      try {
        const token = await getToken();
        if (!token) { setGatesLoading(false); return; }
        const res = await fetch(`${API_BASE}/api?path=/v1/creator:gates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok) {
          setIdVerified(data.identityVerified);
          setBaaAccepted(data.baaAccepted);
        }
        // Also load blockchain setting if we have a workerId
        const wId = workerCardData?.id || worker?.id;
        const tId = workerCardData?.tenantId || sessionId;
        if (wId && tId) {
          const sRes = await fetch(`${API_BASE}/api?path=/v1/worker:settings&workerId=${wId}`, {
            headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tId },
          });
          const sData = await sRes.json();
          if (sData.ok) setBlockchainEnabled(sData.settings?.blockchainEnabled || false);
        }
      } catch {}
      setGatesLoading(false);
    }
    loadGates();
  }, []);

  const workerName = workerCardData?.name || worker?.name || "Your Worker";
  const workerDesc = workerCardData?.description || worker?.description || "";

  // Generate worker opening message from spec
  function getWorkerIntro() {
    const desc = workerDesc ? ` ${workerDesc.charAt(0).toUpperCase() + workerDesc.slice(1).split(".")[0]}.` : "";
    return `Hi, I'm ${workerName}.${desc} What's your name?`;
  }

  // Start test mode after interface preference is chosen
  function handleInterfaceChoice(pref) {
    setInterfacePref(pref);
    setMobileView(pref === "mobile");
    // Worker introduces itself
    setMessages([{ role: "assistant", text: getWorkerIntro() }]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setSending(true);
    setAuthError(false);

    try {
      const token = await getToken();
      if (!token) {
        setAuthError(true);
        setSending(false);
        return;
      }

      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/worker:test:chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
        body: JSON.stringify({
          tenantId,
          workerId: worker?.id,
          userMessage: text,
          testSessionId,
          workerSpec: exchangeCount === 0 ? {
            name: workerName,
            description: workerDesc,
            targetUser: workerCardData?.targetUser || "",
            complianceRules: workerCardData?.complianceRules || "",
            raasRules: workerCardData?.raasRules || "",
          } : undefined,
        }),
      });

      if (res.status === 401) {
        // Try one silent refresh
        const freshToken = await getToken();
        if (freshToken) {
          // Retry once with fresh token
          const retry = await fetch(`${API_BASE}/api?path=/v1/worker:test:chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freshToken}`,
              "X-Tenant-Id": tenantId,
              "X-Vertical": "developer",
              "X-Jurisdiction": "GLOBAL",
            },
            body: JSON.stringify({ tenantId, workerId: worker?.id, userMessage: text, testSessionId }),
          });
          const retryData = await retry.json();
          if (retryData.ok) {
            handleSuccessResponse(retryData);
            return;
          }
        }
        setAuthError(true);
        setSending(false);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        handleSuccessResponse(data);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: data.error || "Something went wrong. Try again." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Try again." }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSuccessResponse(data) {
    setMessages(prev => [...prev, { role: "assistant", text: data.workerResponse }]);
    if (data.testSessionId) setTestSessionId(data.testSessionId);
    const newCount = data.exchangeCount || (exchangeCount + 1);
    setExchangeCount(newCount);

    // Auto-fill checklist from assessment (Fix 4)
    if (data.testAssessment) {
      if (data.testAssessment.coreJobDone) setCoreJobDone(true);
      if (data.testAssessment.complianceFired) setComplianceFired(true);
      if (data.testAssessment.badInputHandled) setBadInputHandled(true);
    }

    // Auto-check core job after first successful exchange
    if (newCount >= 1 && !coreJobDone) {
      setCoreJobDone(true);
    }

    // Edge cases
    if (data.suggestedEdgeCases && data.suggestedEdgeCases.length > 0) {
      setEdgeCases(data.suggestedEdgeCases);
    }
  }

  function handleAuthRefresh() {
    setAuthError(false);
    // Force re-read of auth state
    window.location.reload();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleEdgeCaseClick(text) {
    setInput(text);
    inputRef.current?.focus();
  }

  // Publish requires core job checked + all preflight gates passed
  const gatesPassed = idVerified && liabilityAccepted;
  const canPublish = coreJobDone && gatesPassed;
  const publishBlocked = (needsMdGate && !mdSigned) || !gatesPassed;

  async function handlePublish() {
    if (publishBlocked) return;
    setPublishing(true);
    try {
      const token = await getToken();
      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/worker1:submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
        body: JSON.stringify({
          tenantId,
          workerId: worker?.id,
          pricingTier: worker?.pricingTier || workerCardData?.pricingTier || 2,
          // Gates are verified server-side by publishGates.js — no client-side trust
          ...(needsMdGate && { mdName, mdNpi }),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onTestComplete({ ...worker, buildPhase: "live", pricingTier: worker?.pricingTier || 2 });
      }
    } catch {}
    setPublishing(false);
  }

  const S = {
    panel: { display: "flex", flexDirection: "column", height: "100%" },
    vaultBar: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px 12px 0 0", marginBottom: 0 },
    vaultTitle: { fontSize: 14, fontWeight: 600, color: "#64748B" },
    vaultTab: { padding: "6px 14px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", borderRadius: 6, fontSize: 13, fontWeight: 600 },
    testBadge: { padding: "3px 8px", background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
    chatArea: { flex: 1, minHeight: 200, maxHeight: 400, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
    msgUser: { alignSelf: "flex-end", background: "#6B46C1", color: "white", padding: "8px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "8px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" },
    msgSystem: { alignSelf: "center", color: "#64748B", fontSize: 12, textAlign: "center", padding: "6px 12px", background: "rgba(100,116,139,0.06)", borderRadius: 8, maxWidth: "90%" },
    inputLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
    inputWrap: { display: "flex", gap: 8, marginBottom: 16 },
    input: { flex: 1, padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 13, outline: "none", resize: "none" },
    sendBtn: { padding: "10px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
    edgeCaseWrap: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
    edgeCaseChip: { padding: "6px 12px", background: "rgba(107,70,193,0.06)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 },
    checklist: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 16 },
    checkItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" },
    checkBox: (checked) => ({ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? "#10b981" : "#CBD5E1"}`, background: checked ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontSize: 12, fontWeight: 700, transition: "all 0.3s" }),
    checkLabel: { fontSize: 13, color: "#1a1a2e" },
  };

  // Interface preference chooser — shown before test begins
  if (!interfacePref) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>How will most of your subscribers use this worker?</div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>This sets up the right test environment.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { value: "mobile", icon: "\uD83D\uDCF1", label: "Mobile", desc: "Phone or tablet" },
            { value: "desktop", icon: "\uD83D\uDCBB", label: "Desktop", desc: "Browser or app" },
            { value: "both", icon: "\u2194\uFE0F", label: "Both", desc: "Desktop default, toggle to mobile" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleInterfaceChoice(opt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
                background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10,
                cursor: "pointer", textAlign: "left", transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#6B46C1"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
            >
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phone frame wrapper for mobile view
  const phoneFrame = mobileView ? {
    width: 390, maxWidth: "100%", margin: "0 auto",
    border: "8px solid #1a1a2e", borderRadius: 32,
    padding: "8px 0", background: "#1a1a2e", overflow: "hidden",
  } : {};

  const innerPanel = (
    <div style={S.panel}>
      {/* Vault-style top bar */}
      <div style={S.vaultBar}>
        <span style={S.testBadge}>Test Mode</span>
        <span style={S.vaultTitle}>My Vault</span>
        <span style={{ fontSize: 13, color: "#94A3B8" }}>/</span>
        <span style={S.vaultTab}>{workerName}</span>
        {/* Mobile/desktop toggle for "both" preference */}
        {interfacePref === "both" && (
          <button
            onClick={() => setMobileView(!mobileView)}
            style={{ marginLeft: "auto", padding: "4px 10px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            {mobileView ? "Desktop view" : "Mobile view"}
          </button>
        )}
      </div>

      {/* Test Chat */}
      <div style={S.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? S.msgUser : msg.role === "system" ? S.msgSystem : S.msgAssistant}>
            {msg.text}
          </div>
        ))}
        {sending && <div style={{ color: "#94A3B8", fontSize: 12, padding: "4px 0" }}>{workerName} is thinking...</div>}

        {/* Auth error — single inline refresh link, never loops */}
        {authError && (
          <div style={{ alignSelf: "center", padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#1a1a2e", textAlign: "center" }}>
            Having trouble connecting —{" "}
            <span onClick={handleAuthRefresh} style={{ color: "#6B46C1", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>click here to refresh</span>.
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Edge case chips */}
      {edgeCases.length > 0 && (
        <div style={S.edgeCaseWrap}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, alignSelf: "center" }}>Try:</span>
          {edgeCases.map((ec, i) => (
            <button key={i} style={S.edgeCaseChip} onClick={() => handleEdgeCaseClick(ec)}>{ec}</button>
          ))}
        </div>
      )}

      {/* Chat input */}
      <div style={S.inputLabel}>You're testing as a subscriber. Ask it anything.</div>
      <div style={S.inputWrap}>
        <textarea
          ref={inputRef}
          style={S.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your worker something..."
          rows={1}
        />
        <button style={S.sendBtn} onClick={handleSend} disabled={sending}>Send</button>
      </div>

      {/* Checklist */}
      <div style={S.checklist}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>Test checklist</div>
        <div style={S.checkItem} onClick={() => setCoreJobDone(!coreJobDone)}>
          <div style={S.checkBox(coreJobDone)}>{coreJobDone ? "\u2713" : ""}</div>
          <span style={S.checkLabel}>Core job done correctly</span>
        </div>
        <div style={S.checkItem} onClick={() => setComplianceFired(!complianceFired)}>
          <div style={S.checkBox(complianceFired)}>{complianceFired ? "\u2713" : ""}</div>
          <span style={S.checkLabel}>Compliance rules fired when triggered</span>
        </div>
        <div style={S.checkItem} onClick={() => setBadInputHandled(!badInputHandled)}>
          <div style={S.checkBox(badInputHandled)}>{badInputHandled ? "\u2713" : ""}</div>
          <span style={S.checkLabel}>Bad input handled gracefully</span>
        </div>
        {!coreJobDone && exchangeCount >= 1 && (
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
            Check "Core job done correctly" to enable publishing.
          </div>
        )}
      </div>

      {/* MD Gate */}
      {needsMdGate && (
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "#dc2626" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>Medical Director Co-Sign Required</div>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 12 }}>
            This worker provides clinical protocol or drug reference content. A Medical Director must co-sign before it can go live.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input style={{ width: "100%", padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 13, outline: "none" }} value={mdName} onChange={e => setMdName(e.target.value)} placeholder="Medical Director name" />
            <input style={{ width: "100%", padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 13, outline: "none" }} value={mdNpi} onChange={e => setMdNpi(e.target.value)} placeholder="NPI number" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#F8F9FC", borderRadius: 6, cursor: "pointer" }} onClick={() => setMdSigned(!mdSigned)}>
              <input type="checkbox" checked={mdSigned} readOnly style={{ accentColor: "#6B46C1" }} />
              <span style={{ fontSize: 12, color: "#1a1a2e" }}>Medical Director has reviewed and agrees to co-sign</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish Preflight — 7-gate checklist ── */}
      <PublishPreflight
        worker={worker}
        workerCardData={workerCardData}
        onAllPassed={(passed) => {
          if (passed) {
            setIdVerified(true);
            setLiabilityAccepted(true);
          }
        }}
      />

      {/* Blockchain Record Keeping Toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", background: "#F8F9FC", borderRadius: 8, marginBottom: 12,
        border: "1px solid #E2E8F0",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Blockchain Record Keeping</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            Each audit record is hashed on-chain. Subscribers see a "Blockchain-verified" badge.
          </div>
        </div>
        <div
          onClick={async () => {
            const next = !blockchainEnabled;
            setBlockchainEnabled(next);
            try {
              const token = await getToken();
              const wId = workerCardData?.id || worker?.id;
              const tId = workerCardData?.tenantId || sessionId;
              await fetch(`${API_BASE}/api?path=/v1/worker:settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tenantId: tId, workerId: wId, blockchainEnabled: next }),
              });
            } catch {}
          }}
          style={{
            width: 40, height: 22, borderRadius: 11, cursor: "pointer",
            background: blockchainEnabled ? "#6B46C1" : "#CBD5E1",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 9, background: "white",
            position: "absolute", top: 2, left: blockchainEnabled ? 20 : 2,
            transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }} />
        </div>
      </div>

      {/* Publish */}
      <button
        style={{
          width: "100%", padding: "14px 24px", fontSize: 15, fontWeight: 700,
          background: (!canPublish || publishBlocked) ? "#E2E8F0" : "#6B46C1",
          color: (!canPublish || publishBlocked) ? "#94A3B8" : "white",
          border: "none", borderRadius: 10,
          cursor: (!canPublish || publishBlocked) ? "not-allowed" : "pointer",
        }}
        onClick={handlePublish}
        disabled={publishing || !canPublish || publishBlocked}
      >
        {publishing ? "Publishing..." : gatesPassed && coreJobDone ? "Looks good — publish it" : !gatesPassed ? "Complete all gates above to publish" : "Test your worker to enable publishing"}
      </button>
      {exchangeCount === 0 && (
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 6 }}>
          Send at least one test message to enable publishing.
        </div>
      )}
    </div>
  );

  // Wrap in phone frame if mobile view
  if (mobileView) {
    return <div style={phoneFrame}><div style={{ background: "#F8F9FC", borderRadius: 24, overflow: "hidden", height: "100%" }}>{innerPanel}</div></div>;
  }

  return innerPanel;
}
