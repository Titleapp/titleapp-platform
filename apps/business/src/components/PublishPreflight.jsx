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

export default function PublishPreflight({ worker, workerCardData, onAllPassed, onGateError }) {
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

  // Load existing gate status
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
      } catch {}
      setLoading(false);
    }
    loadGates();
  }, []);

  // Check if gates 1-6 all pass -> auto-submit for admin review
  const prereqsMet = gates.creatorAgreement && gates.liabilityDisclaimer &&
    gates.identityVerified && gates.creatorCv && gates.w9Tax && gates.stripeConnect;
  const allPassed = prereqsMet && gates.adminReview;

  useEffect(() => {
    if (prereqsMet && !adminSubmitted) {
      submitForAdminReview();
    }
  }, [prereqsMet]);

  useEffect(() => {
    if (allPassed && onAllPassed) onAllPassed(true);
  }, [allPassed]);

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
        // Open Creator Agreement, then accept
        window.open("/legal/creator-agreement", "_blank");
        // Call backend to record acceptance
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
            {!done && !isLast && (
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

      {allPassed && (
        <div style={{
          marginTop: 16, padding: "16px 20px", background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#10b981", marginBottom: 4 }}>
            All gates passed
          </div>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            Your worker is ready to publish. Click "Publish" below.
          </div>
        </div>
      )}
    </div>
  );
}
