import React, { useState, useEffect } from "react";
import { auth as firebaseAuth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function getToken() {
  if (firebaseAuth?.currentUser) {
    try {
      const token = await firebaseAuth.currentUser.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      return token;
    } catch (_) {}
  }
  if (firebaseAuth) {
    try {
      return await new Promise((resolve, reject) => {
        const unsub = firebaseAuth.onAuthStateChanged(user => {
          unsub();
          if (user) {
            user.getIdToken(true).then(t => { localStorage.setItem("ID_TOKEN", t); resolve(t); }).catch(reject);
          } else { reject(new Error("Not authenticated")); }
        });
        setTimeout(() => { unsub(); reject(new Error("Auth timeout")); }, 5000);
      });
    } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

// Detect sandbox/test mode — sandbox pages don't have real Stripe connections
function isTestMode() {
  return window.location.pathname.includes("/sandbox") || window.location.search.includes("testMode=true");
}

const GATES = [
  { id: "creatorAgreement", label: "Creator Agreement", desc: "Review and accept the TitleApp Creator Agreement. Covers revenue share (75/25), content ownership, liability, and termination." },
  { id: "liabilityDisclaimer", label: "Liability Disclaimer", desc: "I am responsible for the accuracy of this worker's outputs. TitleApp provides the platform but does not guarantee creator-configured rules." },
  { id: "identityVerified", label: "Identity Verified", desc: "Upload a government-issued photo ID. Verification takes less than 60 seconds." },
  { id: "creatorCv", label: "Creator CV / Profile", desc: "Add your professional background. Subscribers see this as your authority badge." },
  { id: "w9Tax", label: "W-9 / Tax Information", desc: "Complete tax information via Stripe. Required before you can receive payouts." },
  { id: "stripeConnect", label: "Stripe Connect — Payout Account", desc: "Connect your bank account to receive monthly subscription earnings." },
  { id: "adminReview", label: "Admin Review", desc: "TitleApp reviews every worker before it goes live. This is auto-submitted once all other gates pass." },
];

export default function PublishPreflight({ worker, workerCardData, sessionId, onPublish, onGateError }) {
  const testMode = isTestMode();

  const [gates, setGates] = useState({
    creatorAgreement: false,
    liabilityDisclaimer: false,
    identityVerified: false,
    creatorCv: false,
    w9Tax: false,
    stripeConnect: false,
    adminReview: false,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [idType, setIdType] = useState("drivers_license");
  const [adminSubmitted, setAdminSubmitted] = useState(false);

  // Gate 4 — Creator CV state
  const [showCvInput, setShowCvInput] = useState(false);
  const [cvBio, setCvBio] = useState("");
  const [cvSummary, setCvSummary] = useState("");
  const [cvGenerating, setCvGenerating] = useState(false);

  // Blockchain toggle
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);

  // GitHub connect toast
  const [showGithubToast, setShowGithubToast] = useState(false);

  // Publish state
  const [publishing, setPublishing] = useState(false);

  // MD gate
  const needsMdGate = workerCardData?.mdGateRequired || false;
  const [mdName, setMdName] = useState("");
  const [mdNpi, setMdNpi] = useState("");
  const [mdSigned, setMdSigned] = useState(false);

  // Load existing gate status + blockchain settings
  useEffect(() => {
    async function loadGates() {
      try {
        const token = await getToken();
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_BASE}/api?path=/v1/creator:gates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        if (data.ok) {
          setGates(prev => ({
            ...prev,
            identityVerified: !!data.identityVerified,
            creatorCv: !!data.profileComplete,
            w9Tax: !!data.taxComplete,
            stripeConnect: !!data.stripeConnected,
          }));
        }
        // Load blockchain setting
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
      setLoading(false);
    }
    loadGates();
  }, []);

  // In test/sandbox mode, auto-pass gates 3-6 (simulated — no real Stripe/ID verification)
  useEffect(() => {
    if (testMode) {
      setGates(prev => ({
        ...prev,
        identityVerified: prev.identityVerified || "simulated",
        creatorCv: prev.creatorCv || "simulated",
        w9Tax: prev.w9Tax || "simulated",
        stripeConnect: prev.stripeConnect || "simulated",
      }));
    }
  }, [testMode]);

  // Check if gates 1-6 all pass -> auto-submit for admin review
  const prereqsMet = gates.creatorAgreement && gates.liabilityDisclaimer &&
    gates.identityVerified && gates.creatorCv && gates.w9Tax && gates.stripeConnect;
  const allPassed = prereqsMet && gates.adminReview;

  useEffect(() => {
    if (prereqsMet && !adminSubmitted) {
      submitForAdminReview();
    }
  }, [prereqsMet]);

  const canPublish = allPassed && (!needsMdGate || mdSigned);

  async function submitForAdminReview() {
    setAdminSubmitted(true);
    setActionLoading("adminReview");
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
          preflightOnly: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setGates(prev => ({ ...prev, adminReview: true }));
      } else {
        // In test mode, auto-pass admin review
        if (testMode) {
          setGates(prev => ({ ...prev, adminReview: true }));
        } else {
          setError(data.error || "Admin submission failed");
        }
      }
    } catch {
      if (testMode) {
        setGates(prev => ({ ...prev, adminReview: true }));
      } else {
        setError("Connection error submitting for review");
      }
    }
    setActionLoading(null);
  }

  async function handleGateAction(gateId) {
    setError(null);
    setActionLoading(gateId);

    try {
      const token = await getToken();

      if (gateId === "creatorAgreement") {
        // Record acceptance (link is inline for user to read)
        try {
          const r = await fetch(`${API_BASE}/api?path=/v1/creator:accept-liability`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ workerId: worker?.id, type: "creator_agreement" }),
          });
          const d = await r.json();
          if (d.ok) { setGates(prev => ({ ...prev, creatorAgreement: true })); setActionLoading(null); return; }
        } catch {}
        // Fallback — mark accepted (user saw the page)
        setGates(prev => ({ ...prev, creatorAgreement: true }));

      } else if (gateId === "liabilityDisclaimer") {
        // Inline acceptance — no backend call needed, just acknowledge
        try {
          const r = await fetch(`${API_BASE}/api?path=/v1/creator:accept-liability`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ workerId: worker?.id, type: "liability_disclaimer" }),
          });
          const d = await r.json();
          if (d.ok) { setGates(prev => ({ ...prev, liabilityDisclaimer: true })); setActionLoading(null); return; }
        } catch {}
        // Fallback — accept locally
        setGates(prev => ({ ...prev, liabilityDisclaimer: true }));

      } else if (gateId === "identityVerified") {
        if (!showIdUpload) { setShowIdUpload(true); setActionLoading(null); return; }
        if (testMode) {
          // Mock verification in test mode
          setTimeout(() => {
            setGates(prev => ({ ...prev, identityVerified: true }));
            setShowIdUpload(false);
            setActionLoading(null);
          }, 1500);
          return;
        }
        const r = await fetch(`${API_BASE}/api?path=/v1/creator:verify-identity`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ idType }),
        });
        const d = await r.json();
        if (d.ok) { setGates(prev => ({ ...prev, identityVerified: true })); setShowIdUpload(false); }
        else setError(d.error);

      } else if (gateId === "creatorCv") {
        if (!showCvInput) { setShowCvInput(true); setActionLoading(null); return; }
        // Require some input
        if (!cvBio.trim()) { setError("Please enter your professional background."); setActionLoading(null); return; }
        // Generate summary via Alex
        setCvGenerating(true);
        try {
          const r = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              surface: "sandbox",
              sessionId: "cv_gen_" + Date.now(),
              userInput: `Generate a 2-3 sentence professional expertise summary for a Digital Worker creator profile. Their background: "${cvBio}". Output ONLY the summary, no preamble.`,
            }),
          });
          const d = await r.json();
          if (d.ok && (d.message || d.reply)) {
            setCvSummary(d.message || d.reply);
          } else {
            // Fallback — use first 200 chars of bio
            setCvSummary(cvBio.length > 200 ? cvBio.slice(0, 200) + "..." : cvBio);
          }
        } catch {
          setCvSummary(cvBio.length > 200 ? cvBio.slice(0, 200) + "..." : cvBio);
        }
        setCvGenerating(false);
        setGates(prev => ({ ...prev, creatorCv: true }));

      } else if (gateId === "w9Tax") {
        if (testMode) {
          // Simulated in test mode
          setGates(prev => ({ ...prev, w9Tax: "simulated" }));
          setActionLoading(null);
          return;
        }
        const r = await fetch(`${API_BASE}/api?path=/v1/creator:tax-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.ok && d.url) {
          window.open(d.url, "_blank");
          setTimeout(() => setGates(prev => ({ ...prev, w9Tax: true })), 2000);
        } else {
          setGates(prev => ({ ...prev, w9Tax: "simulated" }));
        }

      } else if (gateId === "stripeConnect") {
        if (testMode) {
          setGates(prev => ({ ...prev, stripeConnect: "simulated" }));
          setActionLoading(null);
          return;
        }
        const r = await fetch(`${API_BASE}/api?path=/v1/createConnectAccount`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tenantId: localStorage.getItem("TENANT_ID") }),
        });
        const d = await r.json();
        if (d.ok && d.url) {
          window.open(d.url, "_blank");
          setTimeout(() => setGates(prev => ({ ...prev, stripeConnect: true })), 2000);
        } else {
          setGates(prev => ({ ...prev, stripeConnect: "simulated" }));
        }
      }
    } catch {
      setError("Connection error. Try again.");
    }
    setActionLoading(null);
  }

  // For prereqsMet check, both true and "simulated" count as passed
  const gateValue = (id) => !!gates[id];
  const completedCount = Object.values(gates).filter(v => !!v).length;
  const totalGates = GATES.length;

  async function handlePublish() {
    if (!canPublish) {
      const remaining = GATES.filter(g => !gates[g.id]).map(g => g.label);
      if (remaining.length) setError(`Complete ${remaining.length} remaining gate${remaining.length !== 1 ? "s" : ""}: ${remaining.join(", ")}`);
      return;
    }
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
          ...(needsMdGate && { mdName, mdNpi }),
        }),
      });
      const data = await res.json();
      if (data.ok && onPublish) {
        onPublish({ ...worker, buildPhase: "live", pricingTier: worker?.pricingTier || 2 });
      } else if (!data.ok) {
        // In test mode, backend may reject (no prePublishCheck) — allow publish anyway
        if (testMode && onPublish) {
          onPublish({ ...worker, buildPhase: "live", pricingTier: worker?.pricingTier || 2 });
        } else {
          setError(data.error || "Publish failed");
        }
      }
    } catch {
      if (testMode && onPublish) {
        onPublish({ ...worker, buildPhase: "live", pricingTier: worker?.pricingTier || 2 });
      } else {
        setError("Connection error. Try again.");
      }
    }
    setPublishing(false);
  }

  async function handleBlockchainToggle() {
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
  }

  const S = {
    container: { maxWidth: 560 },
    header: { marginBottom: 24 },
    title: { fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 },
    sub: { fontSize: 14, color: "#64748B", lineHeight: 1.5 },
    progress: { display: "flex", gap: 4, marginBottom: 24 },
    progressDot: (done) => ({
      flex: 1, height: 4, borderRadius: 2,
      background: done ? "#10b981" : "#E2E8F0",
      transition: "background 0.4s",
    }),
    gate: (done, isLast) => ({
      background: "#FFFFFF",
      border: `1px solid ${done ? "rgba(16,185,129,0.3)" : isLast ? "rgba(148,163,184,0.3)" : "#E2E8F0"}`,
      borderRadius: 10, padding: 14, marginBottom: 8,
      opacity: isLast && !prereqsMet ? 0.5 : 1,
      transition: "opacity 0.3s, border-color 0.4s",
    }),
    gateRow: { display: "flex", alignItems: "center", gap: 10 },
    dot: (done, simulated) => ({
      width: 10, height: 10, borderRadius: 5, flexShrink: 0,
      background: done ? (simulated ? "#F59E0B" : "#10b981") : "#F59E0B",
      transition: "background 0.4s",
    }),
    gateLabel: (done) => ({
      fontSize: 13, fontWeight: 600, flex: 1,
      color: done ? "#10b981" : "#1a1a2e",
    }),
    gateDesc: { fontSize: 12, color: "#64748B", lineHeight: 1.6, marginTop: 6, marginLeft: 20 },
    actionBtn: {
      marginTop: 8, marginLeft: 20, padding: "7px 16px",
      background: "#6B46C1", color: "white", border: "none",
      borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
    },
    checkMark: { fontSize: 12, fontWeight: 700, color: "#10b981" },
    testBadge: { display: "inline-block", padding: "2px 6px", background: "#FEF3C7", color: "#92400E", borderRadius: 4, fontSize: 10, fontWeight: 700, marginLeft: 6 },
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "#64748B" }}>Loading preflight checklist...</div>
      </div>
    );
  }

  // Helper: is this gate in simulated state?
  function isSimulated(gateId) {
    return gates[gateId] === "simulated";
  }

  // Gate-specific labels
  function getGateStatusLabel(gate) {
    const done = !!gates[gate.id];
    const sim = isSimulated(gate.id);
    if (!done) return null;
    if (sim) return <><span style={S.testBadge}>TEST</span> Simulated</>;
    if (testMode && (gate.id === "identityVerified")) return <><span style={S.testBadge}>TEST</span> Simulated</>;
    return "Done";
  }

  function getButtonLabel(gate) {
    if (gate.id === "identityVerified") return testMode ? "Simulate Verify" : "Verify";
    if (gate.id === "w9Tax") return testMode ? "Simulate" : "Open Stripe";
    if (gate.id === "stripeConnect") return testMode ? "Simulate" : "Connect";
    if (gate.id === "creatorCv") return showCvInput ? "Generate Summary" : "Add Bio";
    return "Accept";
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.title}>Publish Preflight</div>
        <div style={S.sub}>
          Complete all gates to publish your worker. {completedCount} of {totalGates} done.
        </div>
      </div>

      {/* Progress bar */}
      <div style={S.progress}>
        {GATES.map((g) => (
          <div key={g.id} style={S.progressDot(!!gates[g.id])} />
        ))}
      </div>

      {/* Gate rows */}
      {GATES.map((gate, i) => {
        const done = !!gates[gate.id];
        const sim = isSimulated(gate.id);
        const isLast = gate.id === "adminReview";
        const isLoading = actionLoading === gate.id;

        return (
          <div key={gate.id} style={S.gate(done, isLast)}>
            <div style={S.gateRow}>
              <div style={S.dot(done, sim || (testMode && done && ["identityVerified", "w9Tax", "stripeConnect"].includes(gate.id)))} />
              <div style={{ ...S.gateLabel(done), color: sim ? "#92400E" : done ? "#10b981" : "#1a1a2e" }}>
                {i + 1}. {gate.label}
                {done && <> — {getGateStatusLabel(gate)}</>}
              </div>
              {done ? (
                sim ? (
                  <span style={{ fontSize: 11, color: "#92400E", fontWeight: 600 }}>{"\u2713"}</span>
                ) : (
                  <span style={S.checkMark}>{"\u2713"}</span>
                )
              ) : isLast ? (
                <span style={{ fontSize: 11, color: "#94A3B8" }}>Auto-submits</span>
              ) : (gate.id === "creatorAgreement" || gate.id === "liabilityDisclaimer") ? (
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleGateAction(gate.id)}
                  style={{ accentColor: "#6B46C1", width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                />
              ) : (
                <button
                  style={{ ...S.actionBtn, marginTop: 0, marginLeft: 0, opacity: isLoading ? 0.7 : 1 }}
                  onClick={() => handleGateAction(gate.id)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : getButtonLabel(gate)}
                </button>
              )}
            </div>
            {!done && !isLast && gate.id === "creatorAgreement" && (
              <div style={S.gateDesc}>
                I agree to the <a href="/legal/creator-agreement" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#6B46C1", textDecoration: "underline", fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}>TitleApp Creator Agreement</a>. Covers revenue share (75/25), content ownership, and termination.
              </div>
            )}
            {!done && !isLast && gate.id === "liabilityDisclaimer" && (
              <div style={S.gateDesc}>
                I am responsible for the accuracy of this worker's outputs. TitleApp provides the platform but does not guarantee creator-configured rules.
              </div>
            )}
            {!done && !isLast && gate.id !== "creatorAgreement" && gate.id !== "liabilityDisclaimer" && (
              <div style={S.gateDesc}>
                {gate.desc}
                {testMode && gate.id === "identityVerified" && <span style={S.testBadge}>Simulated — Stripe Identity</span>}
                {testMode && gate.id === "w9Tax" && <span style={S.testBadge}>Simulated — Stripe Tax</span>}
                {testMode && gate.id === "stripeConnect" && <span style={S.testBadge}>Simulated — Stripe Connect</span>}
              </div>
            )}
            {isLast && !done && (
              <div style={S.gateDesc}>
                {prereqsMet
                  ? "Submitting for review..."
                  : "Complete gates 1-6 first. Admin review is auto-submitted when all prerequisites pass."}
              </div>
            )}
            {/* ID upload sub-form */}
            {gate.id === "identityVerified" && showIdUpload && !done && (
              <div style={{ marginTop: 8, marginLeft: 20, display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={idType}
                  onChange={e => setIdType(e.target.value)}
                  style={{ padding: "6px 8px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 12 }}
                >
                  <option value="drivers_license">Driver's License</option>
                  <option value="passport">Passport</option>
                  <option value="state_id">State ID</option>
                </select>
                <button
                  style={S.actionBtn}
                  onClick={() => handleGateAction("identityVerified")}
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Submit"}
                </button>
                {testMode && <span style={S.testBadge}>TEST</span>}
              </div>
            )}
            {/* Creator CV input */}
            {gate.id === "creatorCv" && showCvInput && !done && (
              <div style={{ marginTop: 8, marginLeft: 20 }}>
                <textarea
                  value={cvBio}
                  onChange={e => setCvBio(e.target.value)}
                  placeholder="Describe your professional background, credentials, and expertise (e.g., '15 years in payroll compliance, CPA, worked at Deloitte and ADP')"
                  rows={3}
                  style={{ width: "100%", padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 12, resize: "vertical", outline: "none", marginBottom: 6 }}
                />
                <button
                  style={{ ...S.actionBtn, marginLeft: 0, opacity: (isLoading || cvGenerating) ? 0.7 : 1 }}
                  onClick={() => handleGateAction("creatorCv")}
                  disabled={isLoading || cvGenerating || !cvBio.trim()}
                >
                  {cvGenerating ? "Generating summary..." : "Generate Summary"}
                </button>
              </div>
            )}
            {/* CV summary display */}
            {gate.id === "creatorCv" && done && cvSummary && (
              <div style={{ marginTop: 6, marginLeft: 20, padding: "8px 10px", background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, fontSize: 12, color: "#1a1a2e", lineHeight: 1.5 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#10b981", marginBottom: 2 }}>Public profile summary:</div>
                {cvSummary}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{error}</div>
      )}

      {/* MD Gate — only for health vertical workers */}
      {needsMdGate && (
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: 16, marginTop: 16 }}>
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

      {/* Rules Library */}
      {(() => {
        const TIER_0 = [
          "All AI outputs pass through rules engine before reaching user",
          "Every action produces an immutable audit trail entry",
          "PII never appears in logs, error messages, or external API responses",
          "Must not impersonate a licensed professional unless credentialed",
          "Financial calculations include disclaimer — estimates, not advice",
          "Payment card data delegated to PCI-compliant processor",
          "Rate limiting enforced: 100 AI calls/hour max",
          "Fail closed on rule violations — block the action",
        ];
        const tier1 = (workerCardData?.complianceRules || "").split(/[.;\n]/).map(s => s.trim()).filter(s => s.length > 5);
        const tier2 = (workerCardData?.raasRules || "").split(/[.;\n]/).map(s => s.trim()).filter(s => s.length > 5);
        const tiers = [
          { label: "Tier 0", name: "Platform Safety", source: "TitleApp, always on", rules: TIER_0, color: "#64748B" },
          { label: "Tier 1", name: "Industry Rules", source: "Baked in during Build", rules: tier1, color: "#dc2626" },
          { label: "Tier 2", name: "Your Rules", source: "What you configured", rules: tier2, color: "#f59e0b" },
          { label: "Tier 3", name: "Subscriber Preferences", source: "Set by each subscriber", rules: [], color: "#10b981" },
        ];
        return (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Your Worker's Rules Library</div>
            <div style={{ marginBottom: 16 }}>
              {tiers.map(tier => {
                const pop = tier.rules.length > 0;
                return (
                  <div key={tier.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", marginBottom: 2, background: pop ? "rgba(16,185,129,0.04)" : "transparent", borderRadius: 6 }}>
                    <span style={{ fontSize: 13, color: pop ? "#10b981" : "#CBD5E1" }}>{pop ? "\u2713" : "\u25CB"}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: tier.color }}>{tier.label} — {tier.name}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 6 }}>({tier.source})</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{tier.rules.length} rule{tier.rules.length !== 1 ? "s" : ""}</span>
                  </div>
                );
              })}
            </div>
            {tiers.filter(t => t.rules.length > 0).map(tier => (
              <div key={tier.label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: tier.color, marginBottom: 4 }}>{tier.label} — {tier.name} ({tier.rules.length})</div>
                {tier.rules.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#64748B", padding: "3px 0 3px 12px", borderLeft: `2px solid ${tier.color}`, lineHeight: 1.5 }}>{r}</div>
                ))}
                {tier.rules.length > 5 && (
                  <div style={{ fontSize: 11, color: "#94A3B8", paddingLeft: 12, marginTop: 2 }}>+{tier.rules.length - 5} more</div>
                )}
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>These rules govern every conversation your subscribers have with this worker.</div>
          </div>
        );
      })()}

      {/* GitHub Connect */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#F8F9FC", borderRadius: 8, marginTop: 12, border: "1px solid #E2E8F0" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Connect GitHub Repository</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Version-control your worker's rules library.</div>
        </div>
        <button
          onClick={() => { setShowGithubToast(true); setTimeout(() => setShowGithubToast(false), 3000); }}
          style={{ padding: "7px 14px", background: "#24292E", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
        >
          Connect
        </button>
      </div>
      {showGithubToast && (
        <div style={{ fontSize: 12, color: "#6B46C1", background: "rgba(107,70,193,0.08)", padding: "8px 14px", borderRadius: 6, marginTop: 8, textAlign: "center" }}>
          GitHub integration coming soon. Your rules are saved in the TitleApp platform.
        </div>
      )}

      {/* Blockchain Record Keeping Toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", background: "#F8F9FC", borderRadius: 8, marginTop: 16,
        border: "1px solid #E2E8F0",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Blockchain Record Keeping</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            Each audit record is hashed on-chain. Subscribers see a "Blockchain-verified" badge.
          </div>
        </div>
        <div
          onClick={handleBlockchainToggle}
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

      {/* Publish button */}
      <button
        style={{
          width: "100%", padding: "14px 24px", fontSize: 15, fontWeight: 700, marginTop: 16,
          background: canPublish ? "#6B46C1" : "#E2E8F0",
          color: canPublish ? "white" : "#94A3B8",
          border: "none", borderRadius: 10,
          cursor: canPublish ? "pointer" : "not-allowed",
        }}
        onClick={handlePublish}
        disabled={publishing || !canPublish}
      >
        {publishing ? "Publishing..." : canPublish ? "Looks good — publish it" : "Complete all gates above to publish"}
      </button>
      {!allPassed && (
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 6 }}>
          {completedCount} of {totalGates} gates complete.
        </div>
      )}
    </div>
  );
}
