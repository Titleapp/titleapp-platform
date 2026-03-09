import React, { useState, useEffect, useRef, useCallback } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import WorkerGallery, { HE_SUBJECT_DOMAINS, getWorkerIdeas } from "../components/WorkerGallery";
import WorkerCard from "../components/WorkerCard";
import BuildProgress from "../components/BuildProgress";
import TestWorkerPanel from "../components/TestWorkerPanel";
import DistributionKit from "../components/DistributionKit";
import CommsPreferences from "../components/CommsPreferences";
import { fireConfetti } from "../utils/celebrations";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Error boundary — catches render crashes, falls back to recovery UI with error details
class PanelErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    console.error("[PanelErrorBoundary] Render crash:", error, info.componentStack);
    this.setState({ errorInfo: info });
  }
  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "Unknown error";
      const errStack = this.state.error?.stack || "";
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
            The panel encountered an error. Click below to recover.
          </div>
          <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8, marginBottom: 16, textAlign: "left", maxHeight: 120, overflow: "auto", fontFamily: "monospace", lineHeight: 1.4, wordBreak: "break-word" }}>
            {errMsg}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); if (this.props.onRecover) this.props.onRecover(); }}
              style={{ padding: "10px 24px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              {this.props.recoverLabel || "Go back to Worker Card"}
            </button>
            <button
              onClick={() => { try { navigator.clipboard.writeText(errMsg + "\n" + errStack); } catch {} }}
              style={{ padding: "10px 24px", background: "#F8F9FC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Copy error
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  root: { display: "flex", height: "100vh", overflow: "hidden", background: "#F8F9FC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a2e" },
  // Left panel — chat
  chatPanel: { display: "flex", flexDirection: "column", borderRight: "1px solid #E2E8F0", background: "#FFFFFF" },
  chatHeader: { padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 },
  chatLogo: { fontSize: 14, fontWeight: 700, color: "#6B46C1" },
  chatName: { fontSize: 13, fontWeight: 600, color: "#64748B" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  chatInputWrap: { padding: "12px 16px", borderTop: "1px solid #E2E8F0" },
  chatInput: { width: "100%", padding: "12px 16px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 10, color: "#1a1a2e", fontSize: 14, outline: "none", resize: "none" },
  msgUser: { alignSelf: "flex-end", background: "#6B46C1", color: "white", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", maxWidth: "85%", fontSize: 14, lineHeight: 1.5 },
  typing: { alignSelf: "flex-start", color: "#64748B", fontSize: 13, padding: "8px 0" },
  // Right panel — workspace
  workPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#F8F9FC" },
  tabContent: { flex: 1, overflowY: "auto", padding: 24 },
  // Status bar
  statusBar: { padding: "8px 20px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#64748B" },
  // Buttons
  btnPrimary: { padding: "10px 20px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 20px", background: "#FFFFFF", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  // Onboarding overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  overlayCard: { background: "#FFFFFF", borderRadius: 16, padding: "48px 40px", maxWidth: 480, textAlign: "center", border: "1px solid #E2E8F0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
  overlayTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 },
  overlaySub: { fontSize: 15, color: "#64748B", lineHeight: 1.6, marginBottom: 8 },
  overlayBtn: { marginTop: 24, padding: "12px 32px", background: "#6B46C1", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  // Divider
  divider: { width: 4, cursor: "col-resize", background: "#E2E8F0", flexShrink: 0, transition: "background 0.15s" },
  dividerHover: { background: "#6B46C1" },
};

const FLOW_STEPS = ["Discover", "Vibe", "Build", "Test", "Distribute", "Grow"];

const VERTICALS = [
  { value: "auto", label: "Auto Dealerships" },
  { value: "real-estate", label: "Real Estate & Mortgage" },
  { value: "investment", label: "Investment & Finance" },
  { value: "aviation", label: "Aviation" },
  { value: "health-education", label: "Health & EMS Education" },
  { value: "construction", label: "Construction" },
  { value: "insurance", label: "Insurance" },
  { value: "accounting", label: "Accounting & Finance" },
  { value: "government", label: "Government" },
  { value: "custom", label: "Custom / Other" },
];

const HE_MD_GATE_WORKERS = ["HE-013", "HE-025", "HE-027", "HE-028", "HE-030"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

// Get fresh Firebase ID token (or fall back to localStorage)
async function getFreshToken() {
  if (firebaseAuth?.currentUser) {
    try {
      const token = await firebaseAuth.currentUser.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token); // keep localStorage in sync
      return token;
    } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

// Helper for Worker #1 API calls — always returns { ok, ... }, never throws
async function w1Api(endpoint, payload) {
  try {
    const token = await getFreshToken();
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
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[w1Api] ${endpoint} returned ${res.status}:`, text);
      return { ok: false, error: `Server error ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    console.error(`[w1Api] ${endpoint} failed:`, err);
    return { ok: false, error: err.message || "Network error" };
  }
}

// ── Main Component ────────────────────────────────────────────
export default function DeveloperSandbox() {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // ── Session persistence — SYNCHRONOUS load before useState initializers ──
  const savedSession = useRef(null);
  if (savedSession.current === null) {
    try {
      const raw = localStorage.getItem("ta_sandbox_session");
      if (raw) savedSession.current = JSON.parse(raw);
    } catch {}
  }

  // Flow state — flowStep only moves forward, never backward
  const [flowStep, setFlowStep] = useState(() => savedSession.current?.flowStep || 1);
  const [maxFlowStep, setMaxFlowStep] = useState(() => savedSession.current?.maxFlowStep || savedSession.current?.flowStep || 1);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sandboxOnboardingComplete"));

  // Step advancement — only forward
  function advanceToStep(step) {
    if (step > flowStep) {
      setFlowStep(step);
      setMaxFlowStep(prev => Math.max(prev, step));
    }
  }

  // View a completed step (for step indicator clicks) — does NOT change maxFlowStep
  function viewStep(step) {
    setFlowStep(step);
  }

  // Step 1 — Discover
  const [vertical, setVertical] = useState(() => savedSession.current?.vertical || "");
  const [subjectDomain, setSubjectDomain] = useState(() => savedSession.current?.subjectDomain || "");
  const [selectedIdea, setSelectedIdea] = useState(() => savedSession.current?.selectedIdea || null);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);

  // Step 2 — Vibe
  const [vibeStep, setVibeStep] = useState(() => savedSession.current?.vibeStep || 0);
  const [vibeAnswers, setVibeAnswers] = useState(() => savedSession.current?.vibeAnswers || {});
  const [workerCardData, setWorkerCardData] = useState(() => savedSession.current?.workerCardData || null);
  const [showWorkerCard, setShowWorkerCard] = useState(() => savedSession.current?.showWorkerCard ?? !!savedSession.current?.workerCardData);
  const [lastUpdatedField, setLastUpdatedField] = useState(null);

  // Step 2b — Sharpening Session (3 challenge questions after Vibe, before Worker Card)
  const [sharpeningActive, setSharpeningActive] = useState(false);
  const [sharpeningStep, setSharpeningStep] = useState(0);
  const [sharpeningAnswers, setSharpeningAnswers] = useState([]);

  // Step 3 — Build
  const [worker, setWorker] = useState(() => savedSession.current?.worker || null);
  const [jurisdiction, setJurisdiction] = useState(() => savedSession.current?.jurisdiction || "");

  // Persist session state on key changes
  useEffect(() => {
    if (!workerCardData && !worker && !vertical) return;
    try {
      localStorage.setItem("ta_sandbox_session", JSON.stringify({
        vertical, subjectDomain, selectedIdea, vibeStep, vibeAnswers,
        workerCardData, worker, jurisdiction, flowStep, maxFlowStep, showWorkerCard,
      }));
      if (workerCardData?.name) {
        sessionStorage.setItem("ta_sandbox_worker_name", workerCardData.name);
      }
    } catch {}
  }, [vertical, subjectDomain, selectedIdea, vibeStep, vibeAnswers, workerCardData, worker, jurisdiction, flowStep, maxFlowStep, showWorkerCard]);

  // Image attachments
  const [pendingImages, setPendingImages] = useState([]);
  const fileInputRef = useRef(null);

  // Edit mode (post-publish)
  const [editMode, setEditMode] = useState(false);

  // Inline auth (for unauthenticated users)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [signupPromptShown, setSignupPromptShown] = useState(false); // guard: fire once only
  const [authEmail, setAuthEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [authName, setAuthName] = useState(() => new URLSearchParams(window.location.search).get("name") || "");
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingCardData, setPendingCardData] = useState(null);

  // Session error (silent inline UI, not Alex conversation)
  const [showSessionError, setShowSessionError] = useState(false);

  // Clean PII from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("email") || params.has("name")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("email");
      url.searchParams.delete("name");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  // Name — captured once, never asked again
  const [creatorName, setCreatorName] = useState(() => {
    // Try Firebase Auth first, then localStorage, then session
    return localStorage.getItem("DISPLAY_NAME") || sessionStorage.getItem("ta_sandbox_name") || "";
  });

  // Session ID
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("ta_sandbox_sid");
    if (existing) return existing;
    const id = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8);
    sessionStorage.setItem("ta_sandbox_sid", id);
    return id;
  });

  // Mobile state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Resizable panels
  const [chatWidthPercent, setChatWidthPercent] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [dividerHover, setDividerHover] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Divider drag handlers
  useEffect(() => {
    if (!isDragging) return;
    function onMouseMove(e) {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;
      const minChat = 300;
      const minWork = 400;
      const pct = (x / totalWidth) * 100;
      if (x >= minChat && (totalWidth - x) >= minWork) {
        setChatWidthPercent(pct);
      }
    }
    function onMouseUp() {
      setIsDragging(false);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const firstName = creatorName ? creatorName.split(" ")[0] : "";
  const isHE = vertical === "health-education";

  // Initial greeting — mount only, for returning users who already dismissed onboarding
  useEffect(() => {
    if (!showOnboarding) {
      const savedWorkerName = workerCardData?.name || sessionStorage.getItem("ta_sandbox_worker_name");
      let greeting;
      if (firstName && savedWorkerName) {
        greeting = `Welcome back, ${firstName}. Picked up where you left off: ${savedWorkerName}.`;
      } else if (firstName) {
        greeting = `Welcome back, ${firstName}. Ready to pick up where we left off?`;
      } else {
        greeting = "I'm Alex. Let's build your first Digital Worker. What industry are you in?";
      }
      addAssistantMessage(greeting);

      // Flow step is now restored from persisted session via useState initializers
      // No need to re-set here — flowStep and maxFlowStep are already correct
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addAssistantMessage(text) {
    setMessages(prev => [...prev, { role: "assistant", text }]);
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { role: "user", text }]);
  }

  // Capture name once — store everywhere
  function captureName(name) {
    if (!name) return;
    setCreatorName(name);
    sessionStorage.setItem("ta_sandbox_name", name);
    localStorage.setItem("DISPLAY_NAME", name);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    addUserMessage(text);
    setSending(true);

    // If we don't have a name yet and this looks like a name response, capture it
    if (!creatorName && messages.length <= 2 && text.length < 40 && !text.includes("?")) {
      captureName(text);
    }

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId, surface: "sandbox", userInput: text, flowStep, vertical, subjectDomain,
          ...(creatorName ? { creatorName } : {}),
        }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        addAssistantMessage(reply);
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
    if (!localStorage.getItem("sandbox_welcomed")) {
      localStorage.setItem("sandbox_welcomed", "true");
      setTimeout(() => fireConfetti("full"), 300);
    }
    const greeting = firstName
      ? `Welcome, ${firstName}. I'm Alex. Let's build your first Digital Worker. What is your specialty?`
      : "I'm Alex. Let's build your first Digital Worker. What industry are you in?";
    addAssistantMessage(greeting);
  }

  // ── Step 1 handlers ──────────────────────────────────────────

  function handleVerticalSelect(v) {
    setVertical(v);
    fireConfetti("light");
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
    sessionStorage.setItem("ta_sandbox_worker_name", idea.name);
    addUserMessage(`I want something like "${idea.name}"`);
    // Move to Step 2 — Vibe
    advanceToStep(2);
    setVibeStep(0);
    // Start the vibe conversation with question 1
    addAssistantMessage(
      `"${idea.name}" — good choice. Let me ask a few questions so I can build this exactly right for you.\n\nTell me more — what problem keeps coming up that you want a Digital Worker to handle?`
    );
  }

  // ── Step 2 handlers (Vibe conversation — 8 required questions) ──

  const VIBE_QUESTIONS = [
    { key: "problemDescription", question: "Tell me more — what problem keeps coming up that you want a Digital Worker to handle?" },
    { key: "targetUser", question: "Who is the main person using this day to day — you, your team, your customers, or all three?" },
    { key: "neverGetWrong", question: "What should this worker never get wrong? Think compliance, accuracy, anything that would cause real problems." },
    { key: "raasRules", question: "Are there any regulations, compliance rules, or SOPs this worker needs to follow? For example — IRS guidelines, state laws, your company's internal policies, or industry standards. I'll bake these directly into the worker's rules." },
    { key: "externalData", question: "What data or systems does this worker need to access?" },
    { key: "outputFormat", question: "What should the output look like — dashboard, report, email, chat, something else?" },
    { key: "currentProcess", question: "What's broken or missing in your current process?" },
    { key: "jurisdiction", question: "What state or region does this apply to? And if it's tied to a specific organization, what's the name?" },
  ];

  // Contextual quick-select chips per Vibe question, vertical-aware
  function getVibeChips(vert, questionKey) {
    const map = {
      problemDescription: {
        auto: ["Licensing paperwork takes forever", "Inventory tracking is manual", "Compliance deadlines slip through"],
        "real-estate": ["Title search takes too long", "Closing coordination is chaotic", "Compliance tracking is manual"],
        investment: ["Due diligence is too slow", "Portfolio reporting takes days", "Deal flow tracking is scattered"],
        aviation: ["Flight scheduling is manual", "Maintenance tracking gaps", "Crew compliance paperwork"],
        "health-education": ["Student tracking is fragmented", "Clinical compliance gaps", "Credentialing takes too long"],
        construction: ["Project tracking across sites", "Permit and inspection delays", "Budget overruns go unnoticed"],
        insurance: ["Claims processing is slow", "Policy management is manual", "Compliance audits take weeks"],
        accounting: ["Reconciliation takes days", "Tax deadline tracking is manual", "Client reporting is tedious"],
        government: ["Permit processing backlog", "Record keeping is fragmented", "Compliance reporting is manual"],
        _default: ["Manual processes waste time", "Data entry errors cause problems", "Compliance tracking is unreliable"],
      },
      targetUser: {
        _default: ["Just me", "My team", "My clients / customers", "All three"],
      },
      neverGetWrong: {
        auto: ["Title status and lien checks", "DMV compliance deadlines", "Customer disclosure accuracy"],
        "real-estate": ["Title chain accuracy", "Recording deadlines", "Disclosure requirements"],
        investment: ["Financial calculations", "Regulatory filing deadlines", "Investor communications"],
        aviation: ["Safety compliance records", "Certification expiry dates", "Flight hour tracking"],
        "health-education": ["Clinical protocol accuracy", "HIPAA compliance", "Credential verification"],
        construction: ["Safety inspection records", "Permit compliance", "Budget accuracy"],
        _default: ["Compliance requirements", "Financial accuracy", "Data privacy rules"],
      },
      raasRules: {
        auto: ["State DMV regulations", "FTC dealer rules", "No specific rules — use defaults"],
        "real-estate": ["RESPA / TRID rules", "State recording requirements", "Fair housing regulations"],
        investment: ["SEC regulations", "FINRA rules", "AML requirements"],
        aviation: ["FAA Part 91/135", "TSA security directives", "No specific rules — use defaults"],
        "health-education": ["HIPAA / FERPA rules", "State licensing board rules", "Accreditation standards"],
        construction: ["OSHA safety standards", "Local building codes", "EPA environmental rules"],
        _default: ["Industry-specific regulations", "Our internal SOPs", "No specific rules — use defaults"],
      },
      externalData: {
        auto: ["VIN / NHTSA database", "State DMV records", "Our dealer management system"],
        "real-estate": ["MLS listings", "County recorder database", "Title plant records"],
        investment: ["Market data feeds", "SEC EDGAR filings", "Our CRM / deal pipeline"],
        aviation: ["FAA aircraft registry", "Weather data feeds", "Maintenance tracking system"],
        "health-education": ["Student information system", "Clinical records (EHR)", "Accreditation databases"],
        construction: ["Project management tools", "Permit databases", "Material pricing feeds"],
        _default: ["Our internal database", "Third-party APIs", "Spreadsheets and documents"],
      },
      outputFormat: {
        _default: ["Dashboard with key metrics", "PDF reports I can send", "Email or chat notifications", "All of the above"],
      },
      currentProcess: {
        _default: ["Spreadsheets and manual tracking", "Too many disconnected tools", "Mostly email-based workflow"],
      },
      jurisdiction: {
        _default: ["California", "Texas", "New York", "National — all states"],
      },
    };
    const q = map[questionKey];
    if (!q) return [];
    return q[vert] || q._default || [];
  }

  // Paste-from-AI detection — extract Vibe answers from long text
  function extractVibeFromPaste(text) {
    const keywordMap = {
      problemDescription: /problem|issue|challenge|pain|struggle|bottleneck/i,
      targetUser: /(?:for|by|used by|audience|target)\s/i,
      neverGetWrong: /never|accuracy|critical|error|mistake|wrong|compliance/i,
      raasRules: /regulat|law|rule|standard|sop|guideline|polic/i,
      externalData: /data|system|integrat|api|database|software|tool|connect/i,
      outputFormat: /output|report|dashboard|email|alert|notification|format/i,
      currentProcess: /current|broken|missing|manual|spreadsheet|today|existing|status quo/i,
      jurisdiction: /(?:state|region|national|country|california|texas|new york|florida|illinois)/i,
    };
    const sentences = text.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 8);
    const extracted = {};
    for (const s of sentences) {
      for (const [key, regex] of Object.entries(keywordMap)) {
        if (!extracted[key] && regex.test(s)) {
          extracted[key] = s;
          break;
        }
      }
    }
    return extracted;
  }

  function handleVibeAnswer(text) {
    const currentQ = VIBE_QUESTIONS[vibeStep];
    if (!currentQ) return;

    const newAnswers = { ...vibeAnswers, [currentQ.key]: text };
    setVibeAnswers(newAnswers);
    setLastUpdatedField(currentQ.key);
    setTimeout(() => setLastUpdatedField(null), 1200);

    if (currentQ.key === "jurisdiction") {
      setJurisdiction(text);
    }

    // If user says no RAAS rules, acknowledge
    if (currentQ.key === "raasRules" && /none|no|not really|nothing|n\/a/i.test(text)) {
      const vertLabel = VERTICALS.find(v => v.value === vertical)?.label || vertical;
      addAssistantMessage(`Got it — I'll apply standard compliance defaults for ${vertLabel}.`);
    }

    if (vibeStep < VIBE_QUESTIONS.length - 1) {
      // Next question
      const nextStep = vibeStep + 1;
      setVibeStep(nextStep);
      // Don't send the RAAS acknowledgment AND the next question in same tick
      const delay = currentQ.key === "raasRules" && /none|no|not really|nothing|n\/a/i.test(text) ? 1000 : 500;
      setTimeout(() => {
        addAssistantMessage(VIBE_QUESTIONS[nextStep].question);
      }, delay);
    } else {
      // All 8 questions answered — lock vibeStep, start sharpening session
      setVibeStep(VIBE_QUESTIONS.length);
      startSharpeningSession(newAnswers);
    }
  }

  // ── Step 2b: Sharpening Session (3 challenge questions) ──

  function getSharpeningQuestions(answers) {
    const name = selectedIdea?.name || "your worker";
    const problem = answers.problemDescription || "";
    const target = answers.targetUser || "";
    const neverWrong = answers.neverGetWrong || "";
    const process = answers.currentProcess || "";

    // Q1: Scope check — look for multiple jobs/capabilities in the problem description
    const scopeQ = problem.length > 60 || (problem.match(/and|,|also|plus|as well/gi) || []).length >= 2
      ? `You mentioned several things: "${problem.substring(0, 80)}..." — that could be two or three different jobs. Do you want ${name} to handle all of that as one worker, or should I split it into a team of specialized workers?`
      : `Looking at what ${name} needs to do — is this one focused job, or would it work better as two or three specialized workers that work together?`;

    // Q2: Edge case — derive from neverGetWrong or process description
    const edgeScenario = neverWrong
      ? `You said this worker should never get wrong: "${neverWrong.substring(0, 80)}." What should it do when it encounters a case it's not sure about — flag it, block it, or escalate to a human?`
      : process
        ? `What happens when something goes wrong in the current process? How should ${name} handle edge cases or unexpected inputs?`
        : `What's the worst thing that could happen if ${name} makes a mistake? How should it handle that scenario?`;

    // Q3: Audience — narrow from targetUser
    const audienceQ = target.toLowerCase().includes("all") || target.toLowerCase().includes("three") || target.toLowerCase().includes("everyone")
      ? `You said everyone uses this. But if you could only make one person happy on day one — you, your team, or your customers — who is it?`
      : `Who is the one person ${name} absolutely has to work for on day one? Paint me a picture — what's their typical day like?`;

    return [scopeQ, edgeScenario, audienceQ];
  }

  function startSharpeningSession(answers) {
    setVibeAnswers(answers);
    setSharpeningActive(true);
    setSharpeningStep(0);
    const questions = getSharpeningQuestions(answers);
    addAssistantMessage(`Good — I have what I need. Three quick challenge questions to make sure this is exactly right.\n\n${questions[0]}`);
  }

  function handleSharpeningAnswer(text) {
    const questions = getSharpeningQuestions(vibeAnswers);
    const newAnswers = [...sharpeningAnswers, { question: questions[sharpeningStep], answer: text }];
    setSharpeningAnswers(newAnswers);

    // Check if creator wants to expand to multiple workers (Q1 scope check)
    if (sharpeningStep === 0) {
      const wantsTeam = /team|split|separate|multiple|speciali/i.test(text);
      if (wantsTeam) {
        addAssistantMessage("Smart move. You'd need the Creator License to publish all of them — it's $49/year and you earn on every one. Want me to set that up after we finish this first worker?");
        // Continue to Q2 after a delay
        setTimeout(() => {
          setSharpeningStep(1);
          addAssistantMessage(questions[1]);
        }, 1500);
        return;
      }
    }

    if (sharpeningStep < 2) {
      const nextStep = sharpeningStep + 1;
      setSharpeningStep(nextStep);
      setTimeout(() => {
        addAssistantMessage(questions[nextStep]);
      }, 500);
    } else {
      // Sharpening complete — generate Worker Card with enriched data
      setSharpeningActive(false);
      addAssistantMessage("Got it. Building your Worker Card now...");
      setTimeout(() => {
        generateWorkerCard(vibeAnswers, newAnswers);
      }, 800);
    }
  }

  function generateWorkerCard(answers, sharpening) {
    const isPublic = (answers.visibility || answers.currentProcess || "").toLowerCase().includes("anyone") ||
                     (answers.visibility || "").toLowerCase().includes("public") ||
                     (answers.visibility || "").toLowerCase().includes("marketplace");

    const needsMdGate = isHE && selectedIdea?.lane === "back_me_up";
    // Robust audience extraction — any non-blank answer counts
    const rawTarget = answers.targetUser || "";
    const targetUser = rawTarget.trim() || answers.currentProcess?.match(/(?:for|by)\s+(.+?)(?:\.|,|$)/i)?.[1]?.trim() || "General audience";

    const cardData = {
      name: selectedIdea?.name || "Custom Worker",
      description: answers.problemDescription || selectedIdea?.desc || "",
      problemSolves: answers.currentProcess || answers.problemDescription || selectedIdea?.desc || "General productivity improvement",
      targetUser,
      complianceRules: answers.neverGetWrong || "Standard platform compliance (Tier 0 + Tier 1 auto-applied)",
      raasRules: answers.raasRules && !/none|no|not really|nothing|n\/a/i.test(answers.raasRules) ? answers.raasRules : "",
      externalData: answers.externalData || "None specified",
      outputFormat: answers.outputFormat || "",
      visibility: isPublic ? "Public marketplace" : "Internal only",
      vertical: VERTICALS.find(v => v.value === vertical)?.label || vertical,
      jurisdiction: answers.jurisdiction || "GLOBAL",
      pricingTier: 2,
      mdGateRequired: needsMdGate,
      subjectDomain,
      lane: selectedIdea?.lane,
      internal_only: !isPublic,
      sharpeningAnswers: sharpening || [],
    };

    setWorkerCardData(cardData);
    setShowWorkerCard(true);

    // Clear chat and send fresh transition message (Fix 3)
    setTimeout(() => {
      setMessages([
        { role: "assistant", text: `Here's your ${cardData.name}. Review it on the right — edit anything, then hit Approve and I'll start building.` }
      ]);
    }, 300);

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

  // Override sendMessage for vibe step to route answers
  async function handleSend() {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || sending) return;
    setInput("");
    addUserMessage(text);

    // Capture name from first response if we don't have it
    if (!creatorName && messages.length <= 2 && text.length < 40 && !text.includes("?")) {
      captureName(text);
    }

    if (flowStep === 2 && vibeStep < VIBE_QUESTIONS.length) {
      // Paste-from-AI detection: long text (>200 chars) may contain multiple answers
      if (text.length > 200) {
        const extracted = extractVibeFromPaste(text);
        const currentKey = VIBE_QUESTIONS[vibeStep].key;
        // Always assign the full text to the current question
        if (!extracted[currentKey]) extracted[currentKey] = text.substring(0, 500);
        // Bulk-fill all extracted answers
        const bulkAnswers = { ...vibeAnswers };
        let lastFilledStep = vibeStep;
        for (let i = vibeStep; i < VIBE_QUESTIONS.length; i++) {
          const qKey = VIBE_QUESTIONS[i].key;
          if (extracted[qKey] && !bulkAnswers[qKey]) {
            bulkAnswers[qKey] = extracted[qKey];
            lastFilledStep = i;
            if (qKey === "jurisdiction") setJurisdiction(extracted[qKey]);
          }
        }
        setVibeAnswers(bulkAnswers);
        setLastUpdatedField("_bulk");
        setTimeout(() => setLastUpdatedField(null), 2000);
        // Advance to first unanswered question, or finish
        const nextUnanswered = VIBE_QUESTIONS.findIndex((q, i) => i > vibeStep && !bulkAnswers[q.key]);
        if (nextUnanswered === -1 || Object.keys(bulkAnswers).length >= VIBE_QUESTIONS.length) {
          setVibeStep(VIBE_QUESTIONS.length);
          const filledCount = Object.keys(bulkAnswers).length;
          addAssistantMessage(`Got it — I pulled ${filledCount} answers from what you shared. Let me sharpen a few things.`);
          setTimeout(() => startSharpeningSession(bulkAnswers), 800);
        } else {
          setVibeStep(nextUnanswered);
          const skipped = nextUnanswered - vibeStep - 1;
          if (skipped > 0) {
            addAssistantMessage(`Great — I picked up ${skipped + 1} answers from that. Skipping ahead.`);
          }
          setTimeout(() => addAssistantMessage(VIBE_QUESTIONS[nextUnanswered].question), 600);
        }
        return;
      }
      handleVibeAnswer(text);
      return;
    }

    // Sharpening session routing
    if (flowStep === 2 && sharpeningActive) {
      handleSharpeningAnswer(text);
      return;
    }

    // Default chat flow
    setSending(true);
    const images = [...pendingImages];
    setPendingImages([]);
    if (images.length > 0) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === "user") return [...prev.slice(0, -1), { ...last, images }];
        return prev;
      });
    }
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const headers = { "Content-Type": "application/json" };
      if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId, surface: "sandbox", userInput: text, flowStep, vertical, subjectDomain,
          ...(creatorName ? { creatorName } : {}),
          ...(images.length > 0 ? { imageData: images.map(img => ({ base64: img.base64, mediaType: img.mediaType })) } : {}),
        }),
      });
      const result = await resp.json();
      const reply = result.message || result.reply;
      if (result.ok && reply) {
        addAssistantMessage(reply);

        // Handle worker creation from backend (chat-driven build)
        if (result.buildAnimation && result.cards && result.cards.length > 0) {
          const card = result.cards[0]?.data;
          if (card) {
            const cardData = {
              name: card.name || "Your Worker",
              description: card.description || "",
              targetUser: card.targetUser || card.audience || "General audience",
              problemSolves: card.problemSolves || card.problem || card.description || "General productivity improvement",
              complianceRules: (card.rules || []).join(". ") || "Standard compliance",
              vertical: card.category || vertical || "",
              jurisdiction: "GLOBAL",
              pricingTier: 2,
              internal_only: false,
            };
            setWorkerCardData(cardData);
            setWorker({ id: card.workerId, name: card.name, buildPhase: "draft" });

            setTimeout(() => {
              addAssistantMessage(`Your ${card.name} is ready. Let me show you around. You can test it, set your price, and publish when you are ready.`);
              setShowWorkerCard(true);
              if (flowStep < 2) advanceToStep(2);
            }, 800);
          }
        }
      } else {
        addAssistantMessage(reply || "Something went wrong. Try again.");
      }
    } catch (err) {
      const isOffline = !navigator.onLine;
      addAssistantMessage(
        isOffline
          ? "You appear to be offline. Check your connection and try again."
          : "Could not reach the server. This is usually temporary — try again in a moment."
      );
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
    const token = localStorage.getItem("ID_TOKEN");
    if (!token || token === "undefined" || token === "null") {
      if (signupPromptShown) return; // guard: never fire twice
      setSignupPromptShown(true);
      setPendingCardData(cardData);
      setShowAuthPrompt(true);
      addAssistantMessage("Before I can build this, I need a quick signup — just your name and email. This creates your workspace so your worker has a home.");
      return;
    }
    await runBuildPipeline(cardData);
  }

  async function runBuildPipeline(cardData) {
    setWorkerCardData(cardData);
    setShowWorkerCard(false);
    advanceToStep(3); // Only forward — never regresses
    addAssistantMessage("Building your worker now. This takes about a minute. Watch the progress on the right.");

    try {
      const sops = String(vibeAnswers.neverGetWrong || vibeAnswers.complianceRules || "").split(/[.;]/).map(s => s.trim()).filter(Boolean);
      const raasTier1 = String(vibeAnswers.raasRules || "").split(/[.;]/).map(s => s.trim()).filter(Boolean);
      const isPublic = !cardData.internal_only;

      // Step 1: Intake
      const intakeRes = await w1Api("worker1:intake", {
        workerId: worker?.id || null,
        vertical,
        jurisdiction: cardData.jurisdiction || jurisdiction || "National",
        description: cardData.description,
        sops,
        raas_tier_1_rules: raasTier1,
        raas_tier_2_policies: sops,
        internal_only: cardData.internal_only,
        ...(isHE && { subjectDomain, heJurisdiction: cardData.jurisdiction, deploymentTier: isPublic ? 2 : 3, heLane: cardData.lane }),
      });
      if (!intakeRes.ok) {
        console.error("[Build] intake failed:", intakeRes);
        addAssistantMessage(`Build intake failed: ${intakeRes.error || "unknown error"}. Try approving the card again.`);
        return;
      }
      setWorker(prev => ({ ...(prev || {}), id: intakeRes.workerId, name: cardData.name, buildPhase: "intake" }));

      // Step 2: Research (calls Claude — may take 30-60s)
      const researchRes = await w1Api("worker1:research", { workerId: intakeRes.workerId });
      if (!researchRes.ok) {
        console.error("[Build] research failed:", researchRes);
        addAssistantMessage(`Research step failed: ${researchRes.error || "unknown error"}. The worker was created but rules couldn't be compiled. Try again from the Worker Card.`);
        return;
      }
      setWorker(prev => ({ ...(prev || {}), buildPhase: "brief", complianceBrief: researchRes.brief }));

      // Step 3: Save rules
      const saveRes = await w1Api("worker1:rules:save", { workerId: intakeRes.workerId, tier2: researchRes.brief?.tier2 || [], tier3: sops });
      if (!saveRes.ok) {
        console.error("[Build] rules:save failed:", saveRes);
      }
    } catch (err) {
      console.error("[Build] Pipeline error:", err);
      addAssistantMessage(`The build pipeline hit an error: ${err.message || "unknown"}. Try approving the card again.`);
    }
  }

  async function handleInlineSignup(e) {
    e.preventDefault();
    if (!authEmail.trim() || !authName.trim()) return;
    setAuthLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/auth:signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), name: authName.trim(), surface: "sandbox" }),
      });
      const result = await resp.json();
      if (result.ok && result.token) {
        // result.token is a Firebase custom token — sign in to get a real ID token
        let idToken = result.token; // fallback
        try {
          const userCred = await signInWithCustomToken(firebaseAuth, result.token);
          idToken = await userCred.user.getIdToken();
        } catch (authErr) {
          console.error("[Signup] Firebase sign-in failed:", authErr);
        }
        localStorage.setItem("ID_TOKEN", idToken);
        if (result.uid) localStorage.setItem("USER_ID", result.uid);
        captureName(authName.trim());

        // Ensure tenant exists — claim one if not already set
        const existingTenant = localStorage.getItem("TENANT_ID");
        if (!existingTenant) {
          try {
            const claimRes = await fetch(`${API_BASE}/api?path=/v1/onboarding:claimTenant`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ name: authName.trim(), surface: "sandbox" }),
            });
            const claimData = await claimRes.json();
            if (claimData.ok && claimData.tenantId) {
              localStorage.setItem("TENANT_ID", claimData.tenantId);
            }
          } catch (claimErr) {
            console.error("[Signup] Tenant claim failed:", claimErr);
          }
        }

        setShowAuthPrompt(false);
        setShowSessionError(false);
        addAssistantMessage(`Welcome, ${authName.split(" ")[0]}. Your workspace is ready. Before publishing, you will review and sign the Creator Agreement — no surprises. Now let me build that worker.`);

        if (pendingCardData) {
          await runBuildPipeline(pendingCardData);
          setPendingCardData(null);
        }
      } else {
        addAssistantMessage(result.error || "Signup didn't go through. Try again or use a different email.");
      }
    } catch (err) {
      addAssistantMessage("Could not reach the signup server. Check your connection and try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Handle session error — silent inline UI, not Alex conversation (Fix 12)
  function handleSessionError() {
    setShowSessionError(true);
  }

  function handleSessionReauth() {
    setShowSessionError(false);
    setShowAuthPrompt(true);
  }

  function handleWorkerCardEdit(editedData) {
    setWorkerCardData(editedData);
  }

  // ── Step 3 → Step 4: Build complete → Test ──────────────────

  function handleBuildComplete(buildData) {
    try {
      const safeData = buildData || worker || {};
      setWorker(prev => ({ ...prev, ...safeData }));
      advanceToStep(4); // Only forward
      fireConfetti("full");
      setTimeout(() => fireConfetti("medium"), 600);
      const name = safeData.name || workerCardData?.name || "your worker";
      addAssistantMessage(`Your ${name} is built. Before we publish, let's make sure it works exactly the way you want. Use the test panel on the right like one of your subscribers would — I'm watching.`);
    } catch (e) {
      console.error("[handleBuildComplete] Error during transition:", e);
      addAssistantMessage("Build is complete, but there was a hiccup loading the test panel. Let me try again.");
      setTimeout(() => { setFlowStep(4); }, 500);
    }
  }

  // ── Step 4 → Step 5: Test complete → Distribute ───────────

  function handleTestComplete(publishedWorker) {
    setWorker(publishedWorker);
    advanceToStep(5); // Only forward
    fireConfetti("full");
    setTimeout(() => fireConfetti("medium"), 500);
    addAssistantMessage(`"${publishedWorker.name || workerCardData?.name}" is live. Your distribution kit is ready on the right. Copy, paste, and share.`);
  }

  // ── Step 5 → Step 6: Distribution done → Grow ─────────────

  function handleMoveToGrow() {
    advanceToStep(6);
    addAssistantMessage("One last thing. Set up how you want me to stay in touch with you. I will send you weekly earnings updates, usage insights, and growth tips. No dashboard to log into — I come to you.");
  }

  function handleCommsComplete() {
    addAssistantMessage("You are all set. Your worker is live, your distribution kit is ready, and I will check in with you every week. Text me or email me anytime. Good luck out there.");
  }

  // ── Post-publish edit ──────────────────────────────────────

  function handleEditWorker(existingWorker) {
    setEditMode(true);
    setWorker(existingWorker);
    setWorkerCardData({
      name: existingWorker.name || existingWorker.display_name || "Your Worker",
      description: existingWorker.description || "",
      targetUser: existingWorker.targetUser || "General audience",
      problemSolves: existingWorker.problemSolves || "General productivity improvement",
      complianceRules: (existingWorker.raas_tier_1 || []).join(". ") || "Standard compliance",
      vertical: existingWorker.suite || existingWorker.category || "",
      jurisdiction: existingWorker.jurisdiction || "GLOBAL",
      pricingTier: existingWorker.pricingTier || 2,
      mdGateRequired: existingWorker.mdGateRequired || false,
      internal_only: existingWorker.internal_only || false,
    });
    viewStep(4);
    addAssistantMessage(`What would you like to change about ${existingWorker.name || "your worker"}? Describe the change in the chat, or test it on the right and tell me what needs fixing.`);
  }

  // ── Image attachment handler ───────────────────────────────

  function processFiles(files) {
    if (files.length === 0) return;
    const maxFiles = 3 - pendingImages.length;
    const toProcess = files.slice(0, maxFiles);
    const allowedTypes = /^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/;
    toProcess.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        addAssistantMessage("File too large. Max 10MB.");
        return;
      }
      if (!allowedTypes.test(file.type)) {
        addAssistantMessage("Unsupported file type. Use PNG, JPG, HEIC, or PDF.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        setPendingImages(prev => [...prev, {
          base64,
          mediaType: file.type === "application/pdf" ? "application/pdf" : file.type.replace("heic", "jpeg").replace("heif", "jpeg"),
          name: file.name,
          preview: file.type.startsWith("image/") ? reader.result : null,
        }]);
      };
      reader.onerror = () => {
        addAssistantMessage("Image upload failed. Try again.");
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFileSelect(e) {
    processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    processFiles(Array.from(e.dataTransfer.files || []));
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Should we show vertical chips in chat? Only in Step 1, before vertical is selected, no Worker Card
  const showVerticalChips = flowStep === 1 && !vertical && messages.length > 0 && !showWorkerCard;

  // Chat input placeholder based on step
  const chatPlaceholder = showWorkerCard
    ? "Ask Alex to change anything..."
    : flowStep === 1 ? "Tell Alex your specialty..."
    : flowStep === 2 ? "Answer Alex's questions..."
    : flowStep === 3 ? "Ask Alex anything about the build..."
    : flowStep === 4 ? "Test your worker — describe any problems..."
    : flowStep === 5 ? "Ask Alex for marketing help..."
    : "Talk to Alex...";

  // ── Render ──────────────────────────────────────────────────
  return (
    <div ref={rootRef} style={{ ...S.root, ...(isMobile ? { flexDirection: "column" } : {}) }}>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <div style={S.overlay}>
          <div style={S.overlayCard}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#6B46C1", marginBottom: 24 }}>TitleApp</div>
            <div style={S.overlayTitle}>Build your first Digital Worker</div>
            <div style={S.overlaySub}>Talk to Alex on the left. Watch it come to life on the right.</div>
            <div style={S.overlaySub}>No code. No forms. Just describe what you need.</div>
            <button style={S.overlayBtn} onClick={handleOnboardingDismiss}>Let's go</button>
          </div>
        </div>
      )}

      {/* Left: Chat Panel */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          ...S.chatPanel,
          ...(isMobile
            ? { width: "100%", minWidth: 0, maxWidth: "none", borderRight: "none", flex: 1 }
            : { width: `${chatWidthPercent}%`, minWidth: 300 }
          ),
        }}
      >
        <div style={S.chatHeader}>
          <span style={S.chatLogo}>TitleApp</span>
          <span style={S.chatName}>Alex — Your AI Builder</span>
          {localStorage.getItem("ID_TOKEN") && creatorName && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981" }} />
              {creatorName.split(" ")[0]}
            </span>
          )}
        </div>
        <div style={S.chatMessages}>
          <div style={{ flex: 1 }} />
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? S.msgUser : S.msgAssistant}>
              {msg.images && msg.images.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                  {msg.images.map((img, j) => (
                    img.preview ? (
                      <img key={j} src={img.preview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }} />
                    ) : (
                      <div key={j} style={{ width: 48, height: 48, borderRadius: 6, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{img.name?.split(".").pop()?.toUpperCase() || "FILE"}</div>
                    )
                  ))}
                </div>
              )}
              {msg.text}
            </div>
          ))}
          {sending && <div style={S.typing}>Alex is typing...</div>}

          {/* Step 2: Vibe answer chips — quick-select for each question */}
          {flowStep === 2 && vibeStep < VIBE_QUESTIONS.length && !sharpeningActive && !sending && (
            <div style={{ display: "flex", gap: 6, marginTop: 4, overflowX: "auto", paddingBottom: 4, flexWrap: "nowrap" }}>
              {getVibeChips(vertical, VIBE_QUESTIONS[vibeStep].key).map(chip => (
                <button
                  key={chip}
                  style={{
                    padding: "7px 14px", background: "#FFFFFF", color: "#1a1a2e",
                    border: "1px solid #E2E8F0", borderRadius: 20, fontSize: 13,
                    cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onClick={() => { addUserMessage(chip); handleVibeAnswer(chip); }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#6B46C1"; e.currentTarget.style.background = "rgba(107,70,193,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#FFFFFF"; }}
                >
                  {chip}
                </button>
              ))}
              <button
                style={{
                  padding: "7px 14px", background: "transparent", color: "#94A3B8",
                  border: "1px dashed #E2E8F0", borderRadius: 20, fontSize: 13,
                  cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
                }}
                onClick={() => chatInputRef.current?.focus()}
              >
                Something else
              </button>
            </div>
          )}

          {/* Step 1: Vertical chips (inline in chat) — hide once Worker Card shows */}
          {showVerticalChips && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {VERTICALS.map(v => (
                <button
                  key={v.value}
                  style={{ padding: "6px 14px", background: "#FFFFFF", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500 }}
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
                  style={{ padding: "6px 14px", background: "#FFFFFF", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                  onClick={() => handleSubjectDomainSelect(sd.value)}
                >
                  {sd.label}
                </button>
              ))}
            </div>
          )}

          {/* Inline signup — rendered as a distinct card, not a chat bubble */}
          {showAuthPrompt && (
            <div style={{
              alignSelf: "center", background: "#FFFFFF", border: "2px solid #6B46C1", borderRadius: 16,
              padding: "24px 20px", maxWidth: 360, width: "100%", boxShadow: "0 4px 24px rgba(107,70,193,0.12)",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Create your workspace</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 16 }}>
                Your worker needs a home. This creates your free creator account.
              </div>
              <form onSubmit={handleInlineSignup} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  required
                  autoFocus
                  style={{ padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none" }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  style={{ padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{ padding: "12px 20px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: authLoading ? "wait" : "pointer", opacity: authLoading ? 0.7 : 1 }}
                >
                  {authLoading ? "Creating your workspace..." : "Sign up and build"}
                </button>
              </form>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
                By signing up you agree to TitleApp's <a href="/legal/terms-of-service" target="_blank" style={{ color: "#7c3aed" }}>Terms of Service</a>.
              </div>
            </div>
          )}

          {/* Session error — silent inline UI, not Alex (Fix 12) */}
          {showSessionError && (
            <div style={{
              alignSelf: "flex-start", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
              padding: 16, maxWidth: "85%", display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.5 }}>
                Something went wrong with your session. Click below to sign in and pick up where you left off.
              </div>
              <button
                onClick={handleSessionReauth}
                style={{ padding: "10px 20px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Sign in
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        <div style={S.chatInputWrap}>
          {pendingImages.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {img.preview ? (
                    <img src={img.preview} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", border: "1px solid #E2E8F0" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: "#F8F9FC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#64748B", fontWeight: 600 }}>PDF</div>
                  )}
                  <button
                    onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: "#dc2626", color: "white", border: "none", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                  >&times;</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#64748B", cursor: "pointer", fontSize: 16, flexShrink: 0, lineHeight: 1 }}
              title="Attach screenshot"
            >&#128206;</button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf" multiple style={{ display: "none" }} onChange={handleFileSelect} />
            <textarea
              ref={chatInputRef}
              style={{ ...S.chatInput, flex: 1 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              onFocus={e => { e.target.style.borderColor = "#6B46C1"; e.target.style.boxShadow = "0 0 0 3px rgba(107,70,193,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
              placeholder={chatPlaceholder}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!input.trim() && pendingImages.length === 0)}
              style={{
                padding: "10px 16px", background: input.trim() ? "#6B46C1" : "#E2E8F0",
                color: input.trim() ? "white" : "#94A3B8", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: input.trim() ? "pointer" : "default",
                flexShrink: 0, transition: "background 0.2s",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Draggable divider (desktop only) — Fix 9 */}
      {!isMobile && (
        <div
          style={{
            ...S.divider,
            ...(isDragging || dividerHover ? S.dividerHover : {}),
          }}
          onMouseDown={() => setIsDragging(true)}
          onMouseEnter={() => setDividerHover(true)}
          onMouseLeave={() => setDividerHover(false)}
        />
      )}

      {/* Mobile: backdrop when sheet is open */}
      {isMobile && showMobilePanel && (
        <div
          onClick={() => setShowMobilePanel(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 150 }}
        />
      )}

      {/* Mobile: floating preview tab */}
      {isMobile && !showMobilePanel && flowStep > 1 && (
        <button
          onClick={() => setShowMobilePanel(true)}
          style={{
            position: "fixed", bottom: 20, right: 16, zIndex: 100,
            padding: "12px 20px", background: "#6B46C1", color: "white",
            border: "none", borderRadius: 24, fontSize: 14, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 4px 16px rgba(107,70,193,0.3)",
            minHeight: 44, minWidth: 44,
          }}
        >
          Preview your worker
        </button>
      )}

      {/* Right: Workspace — step-specific content */}
      <div style={{
        ...S.workPanel,
        ...(isMobile ? {
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          height: showMobilePanel ? "85vh" : 0,
          overflow: showMobilePanel ? "auto" : "hidden",
          transition: "height 0.3s ease",
          borderRadius: showMobilePanel ? "16px 16px 0 0" : 0,
          boxShadow: showMobilePanel ? "0 -4px 24px rgba(0,0,0,0.15)" : "none",
        } : {}),
      }}>
        {/* Mobile sheet drag handle */}
        {isMobile && showMobilePanel && (
          <div
            onClick={() => setShowMobilePanel(false)}
            style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", cursor: "pointer" }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E2E8F0" }} />
          </div>
        )}
        {/* Step indicator — never allows backward navigation past maxFlowStep */}
        {isMobile ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "10px 16px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
            <button
              onClick={() => { if (flowStep > 1 && flowStep - 1 <= maxFlowStep) viewStep(flowStep - 1); }}
              disabled={flowStep <= 1}
              style={{ background: "none", border: "none", fontSize: 18, color: flowStep > 1 ? "#6B46C1" : "#E2E8F0", cursor: flowStep > 1 ? "pointer" : "default", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            >&larr;</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#6B46C1" }}>{flowStep} {FLOW_STEPS[flowStep - 1]}</span>
            <button
              onClick={() => { if (flowStep < maxFlowStep) viewStep(flowStep + 1); }}
              disabled={flowStep >= maxFlowStep}
              style={{ background: "none", border: "none", fontSize: 18, color: flowStep < maxFlowStep ? "#6B46C1" : "#E2E8F0", cursor: flowStep < maxFlowStep ? "pointer" : "default", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            >&rarr;</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E2E8F0", padding: "0 16px", background: "#FFFFFF" }}>
            {FLOW_STEPS.map((step, i) => {
              const stepNum = i + 1;
              const isActive = flowStep === stepNum;
              const isComplete = maxFlowStep > stepNum;
              const isReachable = stepNum <= maxFlowStep;
              return (
                <div
                  key={step}
                  style={{
                    padding: "12px 16px", fontSize: 13, fontWeight: 600,
                    color: isActive ? "#6B46C1" : isComplete ? "#10b981" : "#94A3B8",
                    borderBottom: `2px solid ${isActive ? "#6B46C1" : "transparent"}`,
                    display: "flex", alignItems: "center", gap: 6,
                    cursor: isReachable && !isActive ? "pointer" : "default",
                    opacity: stepNum > maxFlowStep + 1 ? 0.4 : 1,
                  }}
                  onClick={() => { if (isReachable && !isActive) viewStep(stepNum); }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: isActive ? "#6B46C1" : isComplete ? "#10b981" : "#E2E8F0",
                    color: isActive || isComplete ? "white" : "#94A3B8", fontSize: 11, fontWeight: 700,
                  }}>
                    {isComplete ? "\u2713" : stepNum}
                  </span>
                  {step}
                </div>
              );
            })}
          </div>
        )}

        {/* Step description */}
        <div style={{ textAlign: "center", padding: "8px 16px", fontSize: 13, color: "#94A3B8", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
          {[
            "Choose your specialty and find a starting point",
            "Tell Alex what your worker should do",
            "Watch Alex build your worker live",
            "Test your worker before it goes live",
            "Publish and share your worker",
            "Alex tracks your earnings and growth",
          ][flowStep - 1]}
        </div>

        <div style={S.tabContent}>
          {/* Step 1 — Discover */}
          {flowStep === 1 && (
            <>
              {!vertical && (
                <div style={{ padding: "40px 20px", maxWidth: 600, margin: "0 auto" }}>
                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Let's build your first Digital Worker together.</div>
                    <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
                      Six steps. No code. Alex handles the hard parts.
                    </div>
                  </div>

                  {/* Journey cards — 2 rows of 3 */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32 }}>
                    {FLOW_STEPS.map((step, i) => {
                      const descriptions = [
                        "Pick your industry and find a starting point",
                        "Answer 8 questions so Alex knows what to build",
                        "Alex assembles compliance rules and logic",
                        "Talk to your worker as a subscriber would",
                        "Get your marketing kit — links, copy, QR code",
                        "Set up weekly check-ins from Alex",
                      ];
                      return (
                        <div key={step} style={{ padding: "14px 12px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 12, background: "#6B46C1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{i + 1}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{step}</div>
                          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{descriptions[i]}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Specialty selector */}
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>What is your specialty?</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {VERTICALS.map(v => (
                      <button
                        key={v.value}
                        style={{ padding: "10px 20px", background: "#FFFFFF", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "border-color 0.2s" }}
                        onClick={() => handleVerticalSelect(v.value)}
                        onMouseEnter={e => e.target.style.borderColor = "#6B46C1"}
                        onMouseLeave={e => e.target.style.borderColor = "#E2E8F0"}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {vertical && isHE && !subjectDomain && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Which clinical specialty?</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    This determines which worker ideas Alex shows you.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {HE_SUBJECT_DOMAINS.map(sd => (
                      <button
                        key={sd.value}
                        style={{ padding: "10px 20px", background: "#FFFFFF", color: "#1a1a2e", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
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
                  verticalLabel={VERTICALS.find(x => x.value === vertical)?.label || vertical}
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
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>
                    {sharpeningActive ? "Sharpening your concept" : "Vibing with Alex"}
                  </div>
                  <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24, lineHeight: 1.5 }}>
                    {sharpeningActive
                      ? "Three quick challenge questions to make sure this is exactly right."
                      : `Alex is asking you ${VIBE_QUESTIONS.length} questions to understand exactly what to build. Answer in the chat.`}
                  </div>
                  {/* Progress dots */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                    {VIBE_QUESTIONS.map((q, i) => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i < vibeStep ? "#6B46C1" : i === vibeStep ? "rgba(107,70,193,0.4)" : "#E2E8F0",
                        transition: "background 0.3s",
                      }} />
                    ))}
                    {/* Sharpening dots (3 extra) */}
                    {[0, 1, 2].map(i => (
                      <div key={`s${i}`} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: !sharpeningActive ? "#E2E8F0"
                          : i < sharpeningStep ? "#10b981"
                          : i === sharpeningStep ? "rgba(16,185,129,0.4)"
                          : "#E2E8F0",
                        transition: "background 0.3s",
                      }} />
                    ))}
                  </div>
                  {/* Current question display */}
                  <div style={{ background: "#FFFFFF", border: `1px solid ${sharpeningActive ? "rgba(16,185,129,0.3)" : "#E2E8F0"}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: sharpeningActive ? "#10b981" : "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                      {sharpeningActive
                        ? `Challenge ${sharpeningStep + 1} of 3`
                        : vibeStep < VIBE_QUESTIONS.length
                          ? `Question ${vibeStep + 1} of ${VIBE_QUESTIONS.length}`
                          : "Generating your Worker Card..."}
                    </div>
                    <div style={{ fontSize: 15, color: "#1a1a2e", lineHeight: 1.6 }}>
                      {sharpeningActive
                        ? getSharpeningQuestions(vibeAnswers)[sharpeningStep]
                        : VIBE_QUESTIONS[vibeStep]?.question || "Almost there..."}
                    </div>
                  </div>
                  {/* Answers so far */}
                  {Object.entries(vibeAnswers).length > 0 && !sharpeningActive && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Your answers so far</div>
                      {Object.entries(vibeAnswers).map(([key, val]) => {
                        const q = VIBE_QUESTIONS.find(vq => vq.key === key);
                        return (
                          <div key={key} style={{
                            padding: "8px 12px", borderRadius: 8, marginBottom: 6,
                            background: (lastUpdatedField === key || lastUpdatedField === "_bulk") ? "rgba(107,70,193,0.06)" : "#F8F9FC",
                            border: `1px solid ${(lastUpdatedField === key || lastUpdatedField === "_bulk") ? "#6B46C1" : "#E2E8F0"}`,
                            transition: "border-color 0.4s, background 0.4s",
                          }}>
                            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 2 }}>{q?.question.split("?")[0]}</div>
                            <div style={{ fontSize: 13, color: "#1a1a2e" }}>{val}</div>
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
                  isPublished={false}
                />
              )}
            </>
          )}

          {/* Step 3 — Build */}
          {flowStep === 3 && (
            <PanelErrorBoundary
              recoverLabel="Back to Worker Card — Retry Build"
              onRecover={() => { setShowWorkerCard(true); viewStep(2); }}
            >
              <BuildProgress
                worker={worker}
                workerCardData={workerCardData}
                onWorkerUpdate={setWorker}
                onTestReady={handleBuildComplete}
              />
            </PanelErrorBoundary>
          )}

          {/* Step 4 — Test */}
          {flowStep === 4 && (
            <PanelErrorBoundary
              recoverLabel="Back to Worker Card"
              onRecover={() => { setShowWorkerCard(true); viewStep(2); }}
            >
              {worker?.id ? (
                <TestWorkerPanel
                  worker={worker}
                  workerCardData={workerCardData}
                  sessionId={sessionId}
                  onTestComplete={handleTestComplete}
                />
              ) : (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Loading test panel...</div>
                  <div style={{ fontSize: 14, color: "#64748B" }}>Setting up your worker for testing.</div>
                </div>
              )}
            </PanelErrorBoundary>
          )}

          {/* Step 5 — Distribute */}
          {flowStep === 5 && (
            <>
              <DistributionKit worker={worker} workerCardData={workerCardData} />
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button style={S.btnPrimary} onClick={handleMoveToGrow}>
                  Continue to Grow
                </button>
              </div>
            </>
          )}

          {/* Step 6 — Grow */}
          {flowStep === 6 && (
            <CommsPreferences
              worker={worker}
              workerCardData={workerCardData}
              onComplete={handleCommsComplete}
            />
          )}
        </div>

        {/* Status Bar */}
        <div style={S.statusBar}>
          <span style={{ fontWeight: 600, color: "#1a1a2e" }}>
            Step {flowStep}: {FLOW_STEPS[flowStep - 1]}
          </span>
          {workerCardData?.name && <span>{workerCardData.name}</span>}
          <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
            {FLOW_STEPS.map((s, i) => (
              <span key={s} style={{ width: 24, height: 4, borderRadius: 2, background: i < maxFlowStep ? "#6B46C1" : "#E2E8F0" }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
