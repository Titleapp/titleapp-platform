import React, { useState, useEffect, useRef, useCallback } from "react";
import WorkerGallery, { HE_SUBJECT_DOMAINS, getWorkerIdeas } from "../components/WorkerGallery";
import WorkerCard from "../components/WorkerCard";
import BuildProgress from "../components/BuildProgress";
import DistributionKit from "../components/DistributionKit";
import CommsPreferences from "../components/CommsPreferences";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// ── Styles ────────────────────────────────────────────────────
const S = {
  root: { display: "flex", height: "100vh", overflow: "hidden", background: "#0f0f14", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#e2e8f0" },
  // Left panel — chat
  chatPanel: { width: "35%", minWidth: 320, maxWidth: 520, display: "flex", flexDirection: "column", borderRight: "1px solid #1e1e2e", background: "#16161e" },
  chatHeader: { padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: 10 },
  chatLogo: { fontSize: 14, fontWeight: 700, color: "#7c3aed" },
  chatName: { fontSize: 13, fontWeight: 600, color: "#94a3b8" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  chatInputWrap: { padding: "12px 16px", borderTop: "1px solid #1e1e2e" },
  chatInput: { width: "100%", padding: "12px 16px", background: "#1e1e2e", border: "1px solid #2a2a3a", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", resize: "none" },
  msgUser: { alignSelf: "flex-end", background: "#7c3aed", color: "white", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  msgAssistant: { alignSelf: "flex-start", background: "#1e1e2e", color: "#e2e8f0", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  typing: { alignSelf: "flex-start", color: "#64748b", fontSize: 13, padding: "8px 0" },
  // Right panel — workspace
  workPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#0f0f14" },
  tabContent: { flex: 1, overflowY: "auto", padding: 24 },
  // Status bar
  statusBar: { padding: "8px 20px", borderTop: "1px solid #1e1e2e", background: "#16161e", display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#64748b" },
  // Buttons
  btnPrimary: { padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 20px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  // Onboarding overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  overlayCard: { background: "#1e1e2e", borderRadius: 16, padding: "48px 40px", maxWidth: 480, textAlign: "center", border: "1px solid #2a2a3a" },
  overlayTitle: { fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 },
  overlaySub: { fontSize: 15, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 },
  overlayBtn: { marginTop: 24, padding: "12px 32px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
};

const FLOW_STEPS = ["Discover", "Vibe", "Build", "Distribute", "Grow"];

const VERTICALS = [
  { value: "auto", label: "Auto Dealerships" },
  { value: "real-estate", label: "Real Estate & Mortgage" },
  { value: "investment", label: "Investment & Finance" },
  { value: "aviation", label: "Aviation" },
  { value: "health-education", label: "Health & EMS Education" },
  { value: "construction", label: "Construction" },
  { value: "insurance", label: "Insurance" },
  { value: "custom", label: "Custom / Other" },
];

const HE_MD_GATE_WORKERS = ["HE-013", "HE-025", "HE-027", "HE-028", "HE-030"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

// Helper for Worker #1 API calls
async function w1Api(endpoint, payload) {
  const token = localStorage.getItem("ID_TOKEN");
  const tenantId = localStorage.getItem("TENANT_ID");
  const res = await fetch(`${API_BASE}/api?path=/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
      "X-Vertical": "developer",
      "X-Jurisdiction": "GLOBAL",
    },
    body: JSON.stringify({ tenantId, ...payload }),
  });
  return res.json();
}

// ── Main Component ────────────────────────────────────────────
export default function DeveloperSandbox() {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Flow state
  const [flowStep, setFlowStep] = useState(1); // 1=Discover, 2=Vibe, 3=Build, 4=Distribute, 5=Grow
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sandboxOnboardingComplete"));

  // Step 1 — Discover
  const [vertical, setVertical] = useState("");
  const [subjectDomain, setSubjectDomain] = useState("");
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);

  // Step 2 — Vibe
  const [vibeStep, setVibeStep] = useState(0); // tracks which question we're on
  const [vibeAnswers, setVibeAnswers] = useState({});
  const [workerCardData, setWorkerCardData] = useState(null);
  const [showWorkerCard, setShowWorkerCard] = useState(false);

  // Step 3 — Build
  const [worker, setWorker] = useState(null);
  const [jurisdiction, setJurisdiction] = useState("");

  // Session ID
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("ta_sandbox_sid");
    if (existing) return existing;
    const id = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8);
    sessionStorage.setItem("ta_sandbox_sid", id);
    return id;
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const userName = localStorage.getItem("DISPLAY_NAME") || "";
  const firstName = userName ? userName.split(" ")[0] : "";
  const isHE = vertical === "health-education";

  // Initial greeting
  useEffect(() => {
    if (!showOnboarding) {
      const greeting = firstName
        ? `Welcome, ${firstName}. I'm Alex. Let's build your first Digital Worker. What is your specialty?`
        : "I'm Alex. Let's build your first Digital Worker. What industry are you in?";
      addAssistantMessage(greeting);
    }
  }, [showOnboarding]);

  function addAssistantMessage(text) {
    setMessages(prev => [...prev, { role: "assistant", text }]);
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { role: "user", text }]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    addUserMessage(text);
    setSending(true);

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, surface: "sandbox", userInput: text, flowStep, vertical, subjectDomain }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        addAssistantMessage(reply);
        // Handle flow triggers from AI responses
        if (result.workerCardData) {
          setWorkerCardData(result.workerCardData);
          setShowWorkerCard(true);
        }
        if (result.worker) {
          setWorker(result.worker);
        }
      } else {
        addAssistantMessage(reply || "Something went wrong. Try again.");
      }
    } catch (e) {
      console.error("Chat error:", e);
      addAssistantMessage("Connection error. Please try again.");
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleOnboardingDismiss() {
    localStorage.setItem("sandboxOnboardingComplete", "true");
    setShowOnboarding(false);
    const greeting = firstName
      ? `Welcome, ${firstName}. I'm Alex. Let's build your first Digital Worker. What is your specialty?`
      : "I'm Alex. Let's build your first Digital Worker. What industry are you in?";
    addAssistantMessage(greeting);
  }

  // ── Step 1 handlers ──────────────────────────────────────────

  function handleVerticalSelect(v) {
    setVertical(v);
    const label = VERTICALS.find(x => x.value === v)?.label || v;
    addUserMessage(label);
    if (v === "health-education") {
      addAssistantMessage("Great. Which clinical specialty are you in? This helps me show you the right worker ideas.");
    } else {
      addAssistantMessage(`Here are some worker ideas for ${label}. Pick one that is close to what you have in mind, and I'll customize it for you.`);
    }
  }

  function handleSubjectDomainSelect(sd) {
    setSubjectDomain(sd);
    const label = HE_SUBJECT_DOMAINS.find(x => x.value === sd)?.label || sd;
    addUserMessage(label);
    addAssistantMessage(`Perfect. Here are worker ideas for ${label}. Pick one that matches what you want to build.`);
  }

  function handleIdeaSelect(idea) {
    setSelectedIdea(idea);
    addUserMessage(`I want something like "${idea.name}"`);
    // Move to Step 2 — Vibe
    setFlowStep(2);
    setVibeStep(0);
    // Start the vibe conversation
    addAssistantMessage(
      `"${idea.name}" — good choice. Let me ask a few questions so I can build this exactly right for you.\n\nWho uses this worker? Nurses, medics, instructors, students — who is the primary user?`
    );
  }

  // ── Step 2 handlers (Vibe conversation) ──────────────────────

  const VIBE_QUESTIONS = [
    { key: "targetUser", question: "Who uses this worker? Nurses, medics, instructors, students -- who is the primary user?" },
    { key: "coreJob", question: "What does it help them do? Describe the main job in one or two sentences." },
    { key: "complianceRules", question: "Are there any rules it has to follow? State board rules, scope of practice, your hospital's policies -- anything it must never violate?" },
    { key: "externalData", question: "Does it need to pull in any outside data? Drug databases, protocol references, scheduling systems?" },
    { key: "visibility", question: "Should it stay private to your organization, or can anyone on TitleApp subscribe to it?" },
    { key: "jurisdiction", question: "What state are you in? And if it's tied to a specific employer, what is the organization name?" },
  ];

  function handleVibeAnswer(text) {
    const currentQ = VIBE_QUESTIONS[vibeStep];
    if (!currentQ) return;

    const newAnswers = { ...vibeAnswers, [currentQ.key]: text };
    setVibeAnswers(newAnswers);

    if (currentQ.key === "jurisdiction") {
      setJurisdiction(text);
    }

    if (vibeStep < VIBE_QUESTIONS.length - 1) {
      // Next question
      setVibeStep(vibeStep + 1);
      setTimeout(() => {
        addAssistantMessage(VIBE_QUESTIONS[vibeStep + 1].question);
      }, 500);
    } else {
      // All questions answered — generate Worker Card
      const isPublic = (newAnswers.visibility || "").toLowerCase().includes("anyone") ||
                       (newAnswers.visibility || "").toLowerCase().includes("public") ||
                       (newAnswers.visibility || "").toLowerCase().includes("marketplace");

      const needsMdGate = isHE && selectedIdea?.lane === "back_me_up";
      const cardData = {
        name: selectedIdea?.name || "Custom Worker",
        description: newAnswers.coreJob || selectedIdea?.desc || "",
        targetUser: newAnswers.targetUser || "",
        complianceRules: newAnswers.complianceRules || "Standard platform compliance (Tier 0 + Tier 1 auto-applied)",
        externalData: newAnswers.externalData || "None specified",
        visibility: isPublic ? "Public marketplace" : "Internal only",
        vertical: VERTICALS.find(v => v.value === vertical)?.label || vertical,
        jurisdiction: newAnswers.jurisdiction || "GLOBAL",
        pricingTier: 2,
        mdGateRequired: needsMdGate,
        subjectDomain,
        lane: selectedIdea?.lane,
        internal_only: !isPublic,
      };

      setWorkerCardData(cardData);
      setShowWorkerCard(true);

      setTimeout(() => {
        addAssistantMessage("Here is your Worker Card. Review it, adjust anything you want, and approve it when you are ready. I will start building immediately.");
      }, 500);

      // Find comparable workers
      const ideas = getWorkerIdeas(vertical, subjectDomain);
      const comparables = ideas
        .filter(i => i.name !== selectedIdea?.name)
        .slice(0, 3)
        .map(i => ({
          name: i.name,
          price: i.price.includes("79") ? 79 : i.price.includes("49") ? 49 : 29,
        }));
      cardData._comparables = comparables;
    }
  }

  // Override sendMessage for vibe step to route answers
  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    addUserMessage(text);

    if (flowStep === 2 && vibeStep < VIBE_QUESTIONS.length) {
      handleVibeAnswer(text);
      return;
    }

    // Default chat flow
    setSending(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, surface: "sandbox", userInput: text, flowStep, vertical, subjectDomain }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        addAssistantMessage(reply);
      } else {
        addAssistantMessage(reply || "Something went wrong. Try again.");
      }
    } catch (e) {
      addAssistantMessage("Connection error. Please try again.");
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  }

  function handleChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Step 2 → Step 3: Worker Card approved ────────────────────

  async function handleWorkerCardApprove(cardData) {
    setWorkerCardData(cardData);
    setShowWorkerCard(false);
    setFlowStep(3);
    addAssistantMessage("Building your worker now. This takes about a minute. Watch the progress on the right.");

    // Trigger the pipeline
    try {
      const sops = (vibeAnswers.complianceRules || "").split(/[.;]/).map(s => s.trim()).filter(Boolean);
      const isPublic = !cardData.internal_only;
      const intakeRes = await w1Api("worker1:intake", {
        workerId: worker?.id || null,
        vertical,
        jurisdiction: cardData.jurisdiction || jurisdiction || "National",
        description: cardData.description,
        sops,
        internal_only: cardData.internal_only,
        ...(isHE && { subjectDomain, heJurisdiction: cardData.jurisdiction, deploymentTier: isPublic ? 2 : 3, heLane: cardData.lane }),
      });
      if (intakeRes.ok && intakeRes.workerId) {
        setWorker(prev => ({ ...prev, id: intakeRes.workerId, name: cardData.name, buildPhase: "intake" }));
        // Start research automatically
        const researchRes = await w1Api("worker1:research", { workerId: intakeRes.workerId });
        if (researchRes.ok) {
          setWorker(prev => ({ ...prev, buildPhase: "brief", complianceBrief: researchRes.brief }));
          // Auto-save rules
          await w1Api("worker1:rules:save", { workerId: intakeRes.workerId, tier2: researchRes.brief?.tier2 || [], tier3: sops });
        }
      }
    } catch (e) {
      console.error("Pipeline error:", e);
    }
  }

  function handleWorkerCardEdit(editedData) {
    setWorkerCardData(editedData);
  }

  // ── Step 3 → Step 4: Published ───────────────────────────────

  function handlePublish(publishedWorker) {
    setWorker(publishedWorker);
    setFlowStep(4);
    addAssistantMessage(`"${publishedWorker.name || workerCardData?.name}" is live. Your distribution kit is ready on the right. Copy, paste, and share.`);
  }

  // ── Step 4 → Step 5: Distribution done ───────────────────────

  function handleMoveToGrow() {
    setFlowStep(5);
    addAssistantMessage("One last thing. Set up how you want me to stay in touch with you. I will send you weekly earnings updates, usage insights, and growth tips. No dashboard to log into -- I come to you.");
  }

  function handleCommsComplete() {
    addAssistantMessage("You are all set. Your worker is live, your distribution kit is ready, and I will check in with you every week. Text me or email me anytime. Good luck out there.");
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <div style={S.overlay}>
          <div style={S.overlayCard}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed", marginBottom: 24 }}>TitleApp</div>
            <div style={S.overlayTitle}>Build your first Digital Worker</div>
            <div style={S.overlaySub}>Talk to Alex on the left. Watch it come to life on the right.</div>
            <div style={S.overlaySub}>No code. No forms. Just describe what you need.</div>
            <button style={S.overlayBtn} onClick={handleOnboardingDismiss}>Let's go</button>
          </div>
        </div>
      )}

      {/* Left: Chat Panel */}
      <div style={S.chatPanel}>
        <div style={S.chatHeader}>
          <span style={S.chatLogo}>TitleApp</span>
          <span style={S.chatName}>Alex — Your AI Builder</span>
        </div>
        <div style={S.chatMessages}>
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? S.msgUser : S.msgAssistant}>
              {msg.text}
            </div>
          ))}
          {sending && <div style={S.typing}>Alex is typing...</div>}

          {/* Step 1: Vertical chips (inline in chat) */}
          {flowStep === 1 && !vertical && messages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {VERTICALS.map(v => (
                <button
                  key={v.value}
                  style={{ padding: "6px 14px", background: "#2a2a3a", color: "#e2e8f0", border: "1px solid #3a3a4a", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                  onClick={() => handleVerticalSelect(v.value)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Subject domain chips for HE */}
          {flowStep === 1 && isHE && !subjectDomain && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {HE_SUBJECT_DOMAINS.map(sd => (
                <button
                  key={sd.value}
                  style={{ padding: "6px 14px", background: "#2a2a3a", color: "#e2e8f0", border: "1px solid #3a3a4a", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                  onClick={() => handleSubjectDomainSelect(sd.value)}
                >
                  {sd.label}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        <div style={S.chatInputWrap}>
          <textarea
            ref={chatInputRef}
            style={S.chatInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder={
              flowStep === 1 ? "Tell Alex your specialty..." :
              flowStep === 2 ? "Answer Alex's questions..." :
              flowStep === 3 ? "Ask Alex anything about the build..." :
              flowStep === 4 ? "Ask Alex for marketing help..." :
              "Talk to Alex..."
            }
            rows={1}
          />
        </div>
      </div>

      {/* Right: Workspace — step-specific content */}
      <div style={S.workPanel}>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e1e2e", padding: "0 16px", background: "#16161e" }}>
          {FLOW_STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isActive = flowStep === stepNum;
            const isComplete = flowStep > stepNum;
            return (
              <div
                key={step}
                style={{
                  padding: "12px 16px", fontSize: 13, fontWeight: 600,
                  color: isActive ? "#7c3aed" : isComplete ? "#10b981" : "#64748b",
                  borderBottom: `2px solid ${isActive ? "#7c3aed" : "transparent"}`,
                  display: "flex", alignItems: "center", gap: 6,
                  cursor: isComplete ? "pointer" : "default",
                  opacity: stepNum > flowStep + 1 ? 0.4 : 1,
                }}
                onClick={() => { if (isComplete) setFlowStep(stepNum); }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? "#7c3aed" : isComplete ? "#10b981" : "#2a2a3a",
                  color: "white", fontSize: 11, fontWeight: 700,
                }}>
                  {isComplete ? "\u2713" : stepNum}
                </span>
                {step}
              </div>
            );
          })}
        </div>

        <div style={S.tabContent}>
          {/* Step 1 — Discover */}
          {flowStep === 1 && (
            <>
              {!vertical && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>What is your specialty?</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    Tell Alex in the chat, or pick an industry below.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 24 }}>
                    {VERTICALS.map(v => (
                      <button
                        key={v.value}
                        style={{ padding: "10px 20px", background: "#16161e", color: "#e2e8f0", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                        onClick={() => handleVerticalSelect(v.value)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {vertical && isHE && !subjectDomain && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Which clinical specialty?</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    This determines which worker ideas Alex shows you.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {HE_SUBJECT_DOMAINS.map(sd => (
                      <button
                        key={sd.value}
                        style={{ padding: "10px 20px", background: "#16161e", color: "#e2e8f0", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                        onClick={() => handleSubjectDomainSelect(sd.value)}
                      >
                        {sd.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {vertical && (!isHE || subjectDomain) && (
                <WorkerGallery
                  vertical={vertical}
                  subjectDomain={subjectDomain}
                  onSelectIdea={handleIdeaSelect}
                  onWaitlistToggle={() => setWaitlistEnabled(!waitlistEnabled)}
                  waitlistEnabled={waitlistEnabled}
                />
              )}
            </>
          )}

          {/* Step 2 — Vibe */}
          {flowStep === 2 && (
            <>
              {!showWorkerCard && (
                <div style={{ maxWidth: 500 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Vibing with Alex</div>
                  <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24, lineHeight: 1.5 }}>
                    Alex is asking you {VIBE_QUESTIONS.length} questions to understand exactly what to build. Answer in the chat.
                  </div>
                  {/* Progress dots */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                    {VIBE_QUESTIONS.map((q, i) => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i < vibeStep ? "#7c3aed" : i === vibeStep ? "rgba(124,58,237,0.5)" : "#2a2a3a",
                        transition: "background 0.3s",
                      }} />
                    ))}
                  </div>
                  {/* Current question display */}
                  <div style={{ background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      Question {vibeStep + 1} of {VIBE_QUESTIONS.length}
                    </div>
                    <div style={{ fontSize: 15, color: "#e2e8f0", lineHeight: 1.6 }}>
                      {VIBE_QUESTIONS[vibeStep]?.question || "Generating your Worker Card..."}
                    </div>
                  </div>
                  {/* Answers so far */}
                  {Object.entries(vibeAnswers).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Your answers so far</div>
                      {Object.entries(vibeAnswers).map(([key, val]) => {
                        const q = VIBE_QUESTIONS.find(vq => vq.key === key);
                        return (
                          <div key={key} style={{ padding: "8px 12px", background: "#0f0f14", borderRadius: 8, marginBottom: 6, border: "1px solid #2a2a3a" }}>
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>{q?.question.split("?")[0]}</div>
                            <div style={{ fontSize: 13, color: "#e2e8f0" }}>{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {showWorkerCard && workerCardData && (
                <WorkerCard
                  data={workerCardData}
                  comparables={workerCardData._comparables || []}
                  onApprove={handleWorkerCardApprove}
                  onEdit={handleWorkerCardEdit}
                />
              )}
            </>
          )}

          {/* Step 3 — Build */}
          {flowStep === 3 && (
            <BuildProgress
              worker={worker}
              workerCardData={workerCardData}
              onWorkerUpdate={setWorker}
              onPublish={handlePublish}
            />
          )}

          {/* Step 4 — Distribute */}
          {flowStep === 4 && (
            <>
              <DistributionKit worker={worker} workerCardData={workerCardData} />
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button style={S.btnPrimary} onClick={handleMoveToGrow}>
                  Continue to Grow
                </button>
              </div>
            </>
          )}

          {/* Step 5 — Grow */}
          {flowStep === 5 && (
            <CommsPreferences
              worker={worker}
              workerCardData={workerCardData}
              onComplete={handleCommsComplete}
            />
          )}
        </div>

        {/* Status Bar */}
        <div style={S.statusBar}>
          <span style={{ fontWeight: 600, color: "#94a3b8" }}>
            Step {flowStep}: {FLOW_STEPS[flowStep - 1]}
          </span>
          {workerCardData?.name && <span>{workerCardData.name}</span>}
          <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
            {FLOW_STEPS.map((s, i) => (
              <span key={s} style={{ width: 24, height: 4, borderRadius: 2, background: i < flowStep ? "#7c3aed" : "#2a2a3a" }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
