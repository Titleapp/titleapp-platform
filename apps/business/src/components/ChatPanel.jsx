import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getWorkerColor } from '../utils/workerColors';

// CODEX 48.2 Fix 7 — robust token getter for ChatPanel.
// Previous patterns used either localStorage.ID_TOKEN (stale on expiry) or
// currentUser.getIdToken(true) (force-refresh that fails silently on network
// blips). This mirrors the 47.5 fix applied to DeveloperSandbox + TestWorkerPanel.
let _chatAuthReady = null;
function getChatToken() {
  const auth = getAuth();
  if (auth?.currentUser) {
    return auth.currentUser.getIdToken(false).catch(() => auth.currentUser.getIdToken(true));
  }
  if (_chatAuthReady) return _chatAuthReady.then(u => u ? u.getIdToken(false) : null);
  _chatAuthReady = new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; try { unsub(); } catch {} resolve(null); } }, 5000);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (settled || !user) return;
      settled = true;
      clearTimeout(timer);
      try { unsub(); } catch {}
      resolve(user);
    });
  });
  _chatAuthReady.finally(() => { _chatAuthReady = null; });
  return _chatAuthReady.then(u => u ? u.getIdToken(false) : null);
}
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { fireMilestone } from '../utils/celebrations';
import { useWorkerCatalog } from '../data/useWorkerCatalog';
import SessionEndCTA from './worker/SessionEndCTA';
import MessageFeedback from './MessageFeedback';
import { useWorkerState } from '../context/WorkerStateContext.jsx';
import { useRightPanel } from '../context/RightPanelContext';
import CanvasResolver from '../services/CanvasResolver';
import { WORKER_CHECKLISTS, WORKER_INTELLIGENCE } from './canvas/WorkerCanvas';
import { lookupSignal } from '../config/canvasTypes';
import { isDemoMode, getSampleKpiValue, hasSampleData, normalizeVerticalKey, VERTICAL_INTELLIGENCE } from './canvas/sampleData';

// WORKER_SUITES computed lazily inside component (useMemo) — workers come
// from the Firestore-backed useWorkerCatalog hook now (CODEX 50.10 Phase 2).

// ── Contextual Messages ─────────────────────────────────────────

const CONTEXTUAL_MESSAGES = {
  "choose-path": "Welcome. Pick the path that fits -- I'll tailor everything from there.",
  "business-basics": "Just the essentials. I'll use this to configure your Chief of Staff and compliance rules.",
  integrations: "Tell me what you already use. I'll build the connectors so your data flows in automatically.",
  "data-import": "You can upload your own files or explore with sample data. Either way, you'll see value in about 60 seconds.",
  "first-value": "I already scanned your data and found a few things worth your attention.",
  terms: "This is our standard terms and liability agreement. Take a look and let me know if you have questions.",
  idVerify: "Quick identity check -- keeps your records secure and verified. $2, once a year.",
  details: "This is where we set your foundation. The jurisdiction matters because compliance rules vary by state.",
  raas: "Tell me how you want your Chief of Staff to work. I'll follow these rules in every interaction.",
  criteria: "This is your target box. Every deal gets screened against these numbers automatically.",
  sampleDeals: "Drop your deal memos here. I'll pull out the key data so you don't have to enter it manually.",
  dealerData: "Upload your dealership data. The more I know about your inventory and customers, the more I can help.",
  brokerage: "Tell me about your brokerage. I'll help you track listings, manage documents, and stay compliant.",
  propertyMgmt: "Let's set up your property portfolio. I'll help you track units, leases, and maintenance.",
  analyst: "Your deal analysis hub. Upload deals and I'll screen them against your criteria.",
  inventory: "Your inventory hub. I can look up any vehicle, check aging, and recommend pricing actions.",
  customers: "Your customer database. I can pull up any customer's history, identify outreach opportunities, and draft communications.",
  "fi-products": "Your F&I product catalog. I can match products to any customer profile and calculate payment impacts.",
  "auto-service": "Your service schedule. I can identify upsell opportunities, draft service reminders, and flag warranty expirations.",
  "sales-pipeline": "Your active deals. I can prioritize follow-ups, draft communications, and recommend next steps for each deal.",
  "worker-preview": "This is what I built from our conversation. Review the details and publish when you're ready.",
  "raas-store": "Browse AI Workers built by domain experts. Each one packages real expertise into a subscribable service.",
  "creator-dashboard": "Your creator hub. Edit your Workers, adjust pricing, track subscribers, and manage publishing.",
  "investor-overview": "This is your data room overview. I can walk you through the raise terms, conversion math, or introduce you to the team.",
  "investor-investor-docs": "Here are the investor documents. Tier 1 docs are open to everyone. Tier 2 requires identity verification and disclaimer acceptance. Ask me about any document and I'll summarize it.",
  "investor-subscription": "This section has the SAFE terms and subscription docs. I can explain the Post-Money SAFE structure, valuation cap mechanics, or pro rata rights.",
  "investor-governance": "Governance and voting. Once the raise closes and shares convert, this is where proposals and cap table details live.",
  "investor-id-check": "Identity verification and risk acknowledgment. Both are required for full access to investor materials.",
  "investor-wallet": "Your investment position and ownership tokens. After investing and share conversion, your ownership record will appear here.",
  "investor-profile": "Your investor profile. You can update your information and preferences here.",
};

const PERSONAL_CONTEXTUAL_MESSAGES = {
  dashboard: "Welcome to your Vault. This is your personal command center -- vehicles, properties, documents, and certifications all in one place.",
  "my-vehicles": "Your vehicle records. I can help you add a new vehicle, look up a VIN, or check on registration and insurance status.",
  "my-properties": "Your property records. I can help you add a property, track mortgage details, or organize tax and insurance documents.",
  "my-documents": "Your important documents. I can help you store and organize IDs, contracts, tax records, insurance policies, and anything else that matters.",
  "my-certifications": "Your certifications and credentials. I can help you add licenses, track expiration dates, and set up renewal reminders.",
  "my-logbook": "Your activity logbook. Every Digital Title Certificate and action is recorded here permanently.",
  settings: "Your Vault settings. You can update your profile, configure your Chief of Staff, and manage notification preferences.",
};

// ── Vertical Disclaimers ────────────────────────────────────────

const VERTICAL_DISCLAIMERS = {
  analyst: {
    title: 'Investment & Financial Services Notice',
    text: 'This workspace provides AI-powered deal analysis, portfolio monitoring, and investment research tools. These are informational tools ONLY. Nothing provided constitutes investment advice or a recommendation to buy, sell, or hold any security. TitleApp is not a registered investment adviser or broker-dealer. All investment decisions should be made with the guidance of qualified financial professionals.',
  },
  auto: {
    title: 'Automotive Industry Notice',
    text: 'This workspace provides AI-powered inventory management, pricing, and compliance tools for auto dealers. You are responsible for compliance with FTC regulations (Safeguards Rule, Used Car Rule, CARS Rule), state DMV requirements, advertising laws, and all other applicable regulations.',
  },
  "real-estate": {
    title: 'Real Estate Industry Notice',
    text: 'This workspace provides AI-powered tools for brokerages. Property valuations are estimates only -- not formal appraisals. You must comply with Fair Housing laws, RESPA, TILA, and all state real estate commission regulations.',
  },
  aviation: {
    title: 'Aviation Industry Notice',
    text: 'This workspace provides AI-powered operations management tools. It does not replace FAA-required documentation, approved checklists, or professional aeronautical judgment. All flight safety decisions must follow 14 CFR.',
  },
  investor: {
    title: 'Investment Risk Notice',
    text: 'This data room provides information about an early-stage investment opportunity. Investing in startups involves significant risk, including the possible loss of your entire investment. Past performance and projections are not guarantees of future results. TitleApp is not a registered investment adviser or broker-dealer. All investment decisions should be made after reviewing the full offering documents and consulting qualified financial and legal advisors.',
  },
};

// 49.30 — Removed CELEBRATION_MESSAGES, TOUR_RESPONSES, RULES_RESPONSES, ID_VERIFY_MESSAGES,
// and triggerSampleDataInChat. Those vertical-keyed canned responses defaulted to 'auto' and
// produced cross-worker hallucinations (Toyota Camry, Sarah Chen, F&I products) for any user
// whose VERTICAL localStorage key was missing or stale. The model handles these intents
// directly now using the worker-specific system prompt + canvas state.

// ── Component ───────────────────────────────────────────────────

export default function ChatPanel({ currentSection, onboardingStep, disclaimerAccepted: propDisclaimerAccepted, alexContext }) {
  const allWorkers = useWorkerCatalog();
  const visibleWorkers = useMemo(() => allWorkers.filter(w => !w.internal_only), [allWorkers]);
  const WORKER_SUITES = useMemo(() => ["All", ...Array.from(new Set(visibleWorkers.map(w => w.suite)))], [visibleWorkers]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastContextStep, setLastContextStep] = useState(null);
  const conversationRef = useRef(null);
  const [activeWorkerName, setActiveWorkerName] = useState(null);
  const [activeWorkerSlug, setActiveWorkerSlug] = useState(null);

  const [dealContext, setDealContext] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  // True for one turn after a voice transcript is captured; cleared by any
  // manual keystroke. Used to flip the backend response mode to voice-friendly.
  const voiceInputRef = useRef(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [showMobileExtras, setShowMobileExtras] = useState(false);
  const chatPanelRef = useRef(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const [greetingCollapsed, setGreetingCollapsed] = useState(false);
  const [workerFilter, setWorkerFilter] = useState("All");

  const workerCtx = useWorkerState();
  const panel = useRightPanel();

  // Qualifying onboarding state
  const [qualifyingMode, setQualifyingMode] = useState(() => !localStorage.getItem('ta_alex_qualified'));

  // Disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    if (propDisclaimerAccepted) return true;
    return localStorage.getItem('DISCLAIMER_ACCEPTED') === 'true';
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [acceptedLiability, setAcceptedLiability] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Celebration state
  const [celebrationFired, setCelebrationFired] = useState(() => {
    return sessionStorage.getItem('ta_onboarding_celebrated') === 'true';
  });

  // Auto-collapse greeting after 5 seconds
  useEffect(() => {
    if (greetingCollapsed || messages.length > 0) return;
    const timer = setTimeout(() => setGreetingCollapsed(true), 5000);
    return () => clearTimeout(timer);
  }, [greetingCollapsed, messages.length]);

  // Adjust mobile chat panel when virtual keyboard opens/closes
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      const panel = chatPanelRef.current?.closest('.mobileChatPanel');
      if (!panel) return;
      const keyboardHeight = window.innerHeight - vv.height;
      if (keyboardHeight > 100) {
        panel.style.height = `${vv.height * 0.85}px`;
        panel.style.bottom = `${keyboardHeight}px`;
      } else {
        panel.style.height = '';
        panel.style.bottom = '';
      }
    }
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // Listen for "discuss with AI" events from other components
  useEffect(() => {
    function handleChatPrompt(e) {
      const msg = e.detail?.message;
      if (e.detail?.dealContext) {
        setDealContext(e.detail.dealContext);
      }
      const customer = e.detail?.customerName || extractCustomerName(msg);
      if (customer) {
        if (dealContext?.customerName && dealContext.customerName !== customer) {
          setPendingActions(prev => {
            const exists = prev.find(p => p.customerName === dealContext.customerName);
            if (exists) return prev;
            return [...prev, {
              customerName: dealContext.customerName,
              actionType: "draft",
              status: "pending",
              context: dealContext.summary || "Discussion in progress",
              createdAt: new Date().toISOString(),
            }];
          });
        }
        setDealContext(prev => ({ ...prev, customerName: customer, summary: msg }));
      }
      if (msg) {
        setInput(msg);
        setTimeout(() => sendMessage(null, msg), 200);
      }
    }
    window.addEventListener('ta:chatPrompt', handleChatPrompt);
    return () => window.removeEventListener('ta:chatPrompt', handleChatPrompt);
  }, [dealContext]);

  // Listen for worker selection from sidebar — set active worker, defer opener to workerReady
  useEffect(() => {
    function handleWorkerSelect(e) {
      const { slug, name } = e.detail || {};
      if (!name) return;
      setActiveWorkerName(name);
      setActiveWorkerSlug(slug || null);

      // 50.27 — Rotate chat sessionId when worker changes. Without this the
      // chat backend keeps loading prior worker's history (per-tenant per-
      // user per-session) and the old worker's system prompt context bleeds
      // into the new worker's response. Bug Sean hit: switched from Contacts
      // to Control Center Pro; chat still answered as Contacts.
      try {
        const newSid = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("ta_chat_session_id", newSid);
      } catch {}

      // Clear previous worker messages and reset opener guard
      setMessages([]);
      openerFiredRef.current = null;

      // Chief of Staff — immediate greeting, no context fetch needed
      if (slug === "chief-of-staff") {
        setMessages([{ role: 'assistant', content: `Switched to ${name}. I'm your Chief of Staff — I coordinate all your workers and track progress across your workspace.` }]);
        setTimeout(() => {
          if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }, 100);
      }
      // Other workers: opener fires from workerReady useEffect below
    }
    window.addEventListener('ta:select-worker', handleWorkerSelect);
    return () => window.removeEventListener('ta:select-worker', handleWorkerSelect);
  }, []);

  // Language change notification — show brief system message when user switches language
  const [langToast, setLangToast] = useState(null);
  useEffect(() => {
    function onLangChange(e) {
      const { label } = e.detail || {};
      if (label) {
        setLangToast(`Alex will now respond in ${label}.`);
        setTimeout(() => setLangToast(null), 4000);
      }
    }
    window.addEventListener("ta:language-changed", onLangChange);
    return () => window.removeEventListener("ta:language-changed", onLangChange);
  }, []);

  // Worker-specific opener — fires when workerReady becomes true from WorkerStateContext
  const openerFiredRef = useRef(null);
  useEffect(() => {
    if (!workerCtx?.workerReady || !workerCtx?.activeWorkerData) return;
    const w = workerCtx.activeWorkerData;
    const workerId = w.workerId || w.slug;

    // Prevent duplicate openers for same worker
    if (openerFiredRef.current === workerId) return;
    openerFiredRef.current = workerId;

    // Skip chief-of-staff (handled above)
    if (workerId === "chief-of-staff") return;

    const tagline = w.tagline || w.name || "";
    const whatYoullHave = w.whatYoullHave || "";
    const prompts = w.quickStartPrompts || [];
    const workerType = w.workerType || "worker";

    // Return visit check
    const sessionKey = "ta_session_" + workerId;
    const isReturn = !!localStorage.getItem(sessionKey);
    localStorage.setItem(sessionKey, "done");

    let opener;
    if (workerType === "game") {
      opener = `Ready to play? ${tagline}.${prompts[0] ? ` Tap '${prompts[0]}' to start.` : ""}`;
    } else {
      // CODEX 49.15 Fix 2 — platform workers need "worker" after tagline for complete greeting
      const tagText = tagline.charAt(0).toLowerCase() + tagline.slice(1);
      const suffix = workerType === "platform" ? " worker" : "";
      // 2026-05-12: return-visit opener used to be "Welcome back. {tagline}.
      // Where did we leave off?" — that was a dead-end. Replaced with the
      // same actionable opener as first visit (slightly varied lead-in) so
      // the user always sees what the worker actually does, not generic
      // chit-chat. Quick-start prompts attach as suggestion chips.
      const lead = isReturn ? "Back to it." : "Hey —";
      opener = `${lead} I'm your ${tagText}${suffix}.${whatYoullHave ? ` ${whatYoullHave}.` : ""} What do you want to tackle?`;
    }

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: opener,
      isSystem: true,
      suggestions: prompts.length > 0 ? prompts : undefined,
    }]);

    setTimeout(() => {
      if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }, 100);
  }, [workerCtx?.workerReady, workerCtx?.activeWorkerData]);

  // Listen for onboarding completion to fire celebration
  useEffect(() => {
    function handleOnboardingComplete() {
      // Small delay to let the App re-render (hide onboarding, show dashboard)
      setTimeout(() => {
        setCelebrationFired(false);
        sessionStorage.removeItem('ta_onboarding_celebrated');
        sessionStorage.removeItem('ta_milestone_onboarding_complete');
        fireCelebration();
      }, 500);
    }
    window.addEventListener('ta:onboarding-complete', handleOnboardingComplete);
    return () => window.removeEventListener('ta:onboarding-complete', handleOnboardingComplete);
  }, []);

  function extractCustomerName(msg) {
    if (!msg) return null;
    const patterns = [
      /(?:for|about|regarding|on)\s+([A-Z][a-z]+ [A-Z][a-z]+)/,
      /--\s*([A-Z][a-z]+ [A-Z][a-z]+)/,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function resumePendingAction(action) {
    setPendingActions(prev => prev.filter(p => p.customerName !== action.customerName));
    setDealContext({ customerName: action.customerName, summary: action.context });
    setInput(`Let's get back to ${action.customerName}. ${action.context}`);
  }

  function dismissPendingAction(customerName) {
    setPendingActions(prev => prev.filter(p => p.customerName !== customerName));
  }

  const authInstance = getAuth();
  const db = getFirestore();
  const currentUser = authInstance?.currentUser;

  useEffect(() => {
    const unsubscribe = authInstance.onAuthStateChanged(() => {
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Auto-subscribe pending worker after auth (independent of messages) ──
  const pendingWorkerHandled = useRef(false);
  useEffect(() => {
    if (!currentUser || !authReady || pendingWorkerHandled.current) return;
    const pending = sessionStorage.getItem('ta_pending_worker');
    if (pending) {
      pendingWorkerHandled.current = true;
      sessionStorage.removeItem('ta_pending_worker');
      try {
        const pw = JSON.parse(pending);
        setTimeout(() => subscribeToWorker(pw), 1500);
      } catch { /* ignore */ }
    }
  }, [currentUser, authReady]);

  // ── Post-subscribe confirmation (from MeetAlex inline email auth) ──
  useEffect(() => {
    if (!currentUser || !authReady) return;
    const confirmation = sessionStorage.getItem("ta_subscribe_confirmation");
    if (confirmation) {
      sessionStorage.removeItem("ta_subscribe_confirmation");
      try {
        const { name } = JSON.parse(confirmation);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `You're all set. ${name} is on your team now. What do you want to start with?`,
          isCelebration: true,
        }]);
        window.dispatchEvent(new CustomEvent("ta:workspace-changed", { detail: {} }));
      } catch { /* ignore */ }
    }
  }, [currentUser, authReady]);

  // ── Celebration + initial messages on mount ───────────────────

  useEffect(() => {
    if (currentUser && authReady && messages.length === 0) {
      // 44.2 Bug 7 — Delay first message 300ms to allow profile data to settle
      // Prevents malformed first-visit prompts when profile loads async
      const profileTimer = setTimeout(() => {
        renderInitialMessage();
      }, 300);
      return () => clearTimeout(profileTimer);
    }
  }, [currentUser, authReady, disclaimerAccepted]);

  function renderInitialMessage() {
    if (messages.length > 0) return; // Guard against race
      // Meet-Alex promoted guest session — render full guest conversation
      // MUST be checked FIRST — before qualifying question, celebration, or any other init
      const guestPromoted = sessionStorage.getItem("ta_guest_promoted");
      if (guestPromoted) {
        sessionStorage.removeItem("ta_guest_promoted");
        // Clear promoted URL param
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("promoted");
          window.history.replaceState({}, "", url.toString());
        } catch { /* ignore */ }
        try {
          const guestMessages = JSON.parse(guestPromoted);
          const rendered = guestMessages.map(m => ({
            role: m.role,
            content: m.text || m.content || "",
            workerCards: m.workerCards || null,
          }));
          rendered.push({
            role: "assistant",
            content: "You're in. Picking up right where we left off.",
          });
          setMessages(rendered);
          // User already had a full conversation — skip qualifying question
          localStorage.setItem('ta_alex_qualified', 'true');
        } catch { /* ignore parse error */ }
        return;
      }

      // Skip qualifying — natural conversation replaces onboarding bubbles
      if (!localStorage.getItem('ta_alex_qualified') && disclaimerAccepted) {
        localStorage.setItem('ta_alex_qualified', 'true');
      }

      // Check if we should fire celebration (just completed onboarding)
      if (!celebrationFired) {
        try {
          const obs = JSON.parse(localStorage.getItem('ONBOARDING_STATE') || 'null');
          if (obs?.completedAt) {
            const elapsed = Date.now() - new Date(obs.completedAt).getTime();
            if (elapsed < 300000) { // Within 5 minutes
              fireCelebration();
              return;
            }
          }
        } catch (e) { /* ignore */ }
      }

      // Check for landing page context
      const rawLanding = localStorage.getItem("LANDING_CONTEXT");
      if (rawLanding) {
        try {
          const lCtx = JSON.parse(rawLanding);
          const greeting = buildLandingGreeting(lCtx);
          if (greeting) {
            setMessages([{ role: 'assistant', content: greeting, isSystem: true }]);
            localStorage.removeItem("LANDING_CONTEXT");
            return;
          }
        } catch (e) { /* ignore */ }
      }

      // Legacy: sessionStorage discoveredContext
      const rawCtx = sessionStorage.getItem("ta_discovered_context");
      if (rawCtx) {
        try {
          const dCtx = JSON.parse(rawCtx);
          if (dCtx.vertical) {
            setMessages([{ role: 'assistant', content: "Welcome! I set up your workspace based on our conversation. Take a look around and let me know if anything needs adjusting.", isSystem: true }]);
            sessionStorage.removeItem("ta_discovered_context");
            return;
          }
        } catch (e) { /* ignore */ }
      }

      // Landing page chat handoff — ?q= param auto-send
      const landingChat = sessionStorage.getItem("ta_landing_chat");
      if (landingChat) {
        sessionStorage.removeItem("ta_landing_chat");
        setMessages([{ role: 'assistant', content: "Connecting you to Alex...", isSystem: true }]);
        setTimeout(() => {
          handleSendMessage(landingChat);
        }, 800);
        return;
      }

      // Check if disclaimer needed on existing workspace
      if (!disclaimerAccepted) {
        loadDisclaimerFlow();
        return;
      }

      // Usage-triggered portfolio review
      const pendingReview = localStorage.getItem("ta_alex_pending_review");
      const snoozedUntil = localStorage.getItem("ta_alex_review_snoozed");
      const snoozed = snoozedUntil && new Date(snoozedUntil) > new Date();
      if (pendingReview === "true" && !snoozed) {
        localStorage.removeItem("ta_alex_pending_review");
        window.dispatchEvent(new CustomEvent("ta:alex-review-dismissed"));
        setMessages([{ role: 'assistant', content: "I took a look at your worker setup and have a few thoughts.", isSystem: true }]);
        setTimeout(() => sendMessage(null, "Check my portfolio"), 600);
        return;
      }

      loadConversationHistory();
  }

  // Check Firestore for previously accepted disclaimer (survives localStorage clears)
  useEffect(() => {
    if (currentUser && authReady && !disclaimerAccepted) {
      getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
        if (snap.exists() && snap.data().disclaimerAccepted) {
          localStorage.setItem('DISCLAIMER_ACCEPTED', 'true');
          setDisclaimerAccepted(true);
        }
      }).catch(() => {});
    }
  }, [currentUser, authReady, disclaimerAccepted]);

  function fireCelebration() {
    fireMilestone('onboarding_complete');

    const celebrationMsgs = [
      { role: 'assistant', content: "Your workspace is ready. Your worker checklist is on the right — work through it at your own pace.", isSystem: true, isCelebration: true },
    ];

    if (!disclaimerAccepted) {
      celebrationMsgs.push({
        role: 'assistant',
        content: "One quick thing before we dive in -- I need you to review and accept our terms. This is standard for any AI-powered business platform:",
        isSystem: true,
        disclaimer: true,
      });
    } else {
      celebrationMsgs.push({
        role: 'assistant',
        content: "What would you like to do first?",
        isSystem: true,
        suggestions: ["Show me around", "What can you help me with?"],
      });
    }

    setMessages(celebrationMsgs);
    setCelebrationFired(true);
    sessionStorage.setItem('ta_onboarding_celebrated', 'true');
    if (!disclaimerAccepted) setShowDisclaimer(true);
  }

  function loadDisclaimerFlow() {
    const msgs = [
      {
        role: 'assistant',
        content: "Welcome to your workspace. Before we get started, I need you to review and accept our terms:",
        isSystem: true,
        disclaimer: true,
      },
    ];
    setMessages(msgs);
    setShowDisclaimer(true);
  }

  async function handleAcceptDisclaimer() {
    localStorage.setItem('DISCLAIMER_ACCEPTED', 'true');
    localStorage.setItem('DISCLAIMER_VERSION', '2026-02-24-v2');
    localStorage.setItem('DISCLAIMER_ACCEPTED_AT', new Date().toISOString());

    try {
      const token = await currentUser.getIdToken(true);
      const tenantId = localStorage.getItem('TENANT_ID') || '';
      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
      await fetch(`${apiBase}/api?path=/v1/workspace:acceptDisclaimer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          disclaimerAccepted: true,
          disclaimerVersion: '2026-02-24-v2',
          termsAccepted: true,
          liabilityAccepted: true,
        }),
      });
    } catch (err) {
      console.error('Failed to store disclaimer acceptance:', err);
    }

    setDisclaimerAccepted(true);
    setShowDisclaimer(false);

    const followUpMsgs = [
      { role: 'assistant', content: "You're all set. What would you like to do first?", isSystem: true, suggestions: ["Show me around", "What can you help me with?"] },
    ];
    setMessages(prev => [...prev.filter(m => !m.disclaimer), ...followUpMsgs]);
  }

  function buildLandingGreeting(ctx) {
    const name = ctx.name || "";
    const nameGreet = name ? `, ${name}` : "";
    const vertical = ctx.vertical || "";
    const intent = ctx.intent || "";
    const chatSummary = ctx.chatSummary || "";

    if (intent === "builder") {
      return `Great${nameGreet}, I've got the outline of your service. Let me show you what I built -- take a look at the preview and tell me what needs adjusting.`;
    }
    if (vertical === "auto" || /\b(car|vehicle|vin|truck|suv)\b/i.test(chatSummary)) {
      return `Alright${nameGreet}, let's get that vehicle recorded. What do you drive? Year, make, and model is all I need to start.`;
    }
    if (vertical === "real-estate" || /\b(property|rental|tenant|apartment|building|house)\b/i.test(chatSummary)) {
      return `OK${nameGreet}, let's get your properties set up. How about we start with your biggest one? What's the address?`;
    }
    if (vertical === "analyst" || /\b(deal|invest|portfolio|fund|analysis)\b/i.test(chatSummary)) {
      return `Welcome${nameGreet}. Your analysis workspace is ready. Want to start by uploading a deal memo, or should I walk you through the screening criteria first?`;
    }
    if (intent === "personal" || vertical === "consumer") {
      return `Welcome to your Vault${nameGreet}. Based on what we talked about, let's start getting your records organized. What would you like to add first?`;
    }
    if (chatSummary) {
      return `Welcome${nameGreet}. I set up your workspace based on our conversation. Let's pick up where we left off -- what would you like to do first?`;
    }
    return null;
  }

  function handleQualifyingAnswer(answer) {
    setQualifyingMode(false);
    localStorage.setItem('ta_alex_qualified', 'done');
    setMessages(prev => [...prev, { role: 'user', content: answer }]);
    setTimeout(() => sendMessage(null, answer), 200);
  }

  // Signal extractor — keyword → vertical mapping for canvas
  const SIGNAL_KEYWORDS = {
    "pilot": { vertical: "aviation", label: "Aviation" },
    "aviation": { vertical: "aviation", label: "Aviation" },
    "aircraft": { vertical: "aviation", label: "Aviation" },
    "flying": { vertical: "aviation", label: "Aviation" },
    "real estate": { vertical: "real-estate", label: "Real Estate" },
    "title": { vertical: "real-estate", label: "Real Estate" },
    "escrow": { vertical: "real-estate", label: "Real Estate" },
    "property": { vertical: "real-estate", label: "Real Estate" },
    "dealership": { vertical: "auto", label: "Auto Dealer" },
    "dealer": { vertical: "auto", label: "Auto Dealer" },
    "automotive": { vertical: "auto", label: "Auto Dealer" },
    "car": { vertical: "auto", label: "Auto Dealer" },
    "government": { vertical: "government", label: "Government" },
    "county": { vertical: "government", label: "Government" },
    "dmv": { vertical: "government", label: "Government" },
    "permits": { vertical: "government", label: "Government" },
    "solar": { vertical: "solar", label: "Solar Energy" },
    "web3": { vertical: "web3", label: "Web3" },
    "blockchain": { vertical: "web3", label: "Web3" },
    "crypto": { vertical: "web3", label: "Web3" },
  };

  function extractSignal(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const [keyword, signal] of Object.entries(SIGNAL_KEYWORDS)) {
      if (lower.includes(keyword)) return signal;
    }
    return null;
  }

  // Send contextual messages when onboarding step or section changes
  useEffect(() => {
    const stepKey = onboardingStep || currentSection;
    const vertical = localStorage.getItem('VERTICAL') || 'auto';
    const isPersonal = vertical === 'consumer';
    // Don't fire contextual messages for dashboard if celebration just fired
    if (stepKey === 'dashboard' && celebrationFired && !disclaimerAccepted) return;
    if (stepKey && stepKey !== lastContextStep && stepKey !== 'checking' && stepKey !== 'welcome' && stepKey !== 'magic') {
      const contextMsg = isPersonal
        ? (PERSONAL_CONTEXTUAL_MESSAGES[stepKey] || CONTEXTUAL_MESSAGES[stepKey])
        : CONTEXTUAL_MESSAGES[stepKey];
      if (contextMsg) {
        setLastContextStep(stepKey);
        const timer = setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: contextMsg, isSystem: true }]);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [onboardingStep, currentSection]);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, isTyping, showDisclaimer]);

  // Listen for workspace context switches (smooth team switching without reload)
  useEffect(() => {
    function handleWorkspaceChange(e) {
      const detail = e.detail || {};
      setMessages([]);
      setGreetingCollapsed(false);
      // Reload conversation history for the new workspace
      if (currentUser) {
        loadConversationHistory();
      }
    }
    window.addEventListener("ta:workspace-changed", handleWorkspaceChange);
    return () => window.removeEventListener("ta:workspace-changed", handleWorkspaceChange);
  }, [currentUser]);

  async function loadConversationHistory() {
    try {
      const platformSid = sessionStorage.getItem('ta_platform_sid');
      const tenantIdFilter = localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID');
      const constraints = [
        where('userId', '==', currentUser.uid),
        ...(tenantIdFilter ? [where('tenantId', '==', tenantIdFilter)] : []),
        orderBy('createdAt', 'asc'),
        limit(50),
      ];
      if (platformSid) {
        constraints.splice(tenantIdFilter ? 2 : 1, 0, where('sessionId', '==', platformSid));
      }
      const q = query(collection(db, 'messageEvents'), ...constraints);
      const snapshot = await getDocs(q);
      const loadedMessages = [];
      snapshot.forEach((doc) => {
        const evt = doc.data();
        if (evt.type === 'chat:message:received') {
          loadedMessages.push({ role: 'user', content: evt.message });
        } else if (evt.type === 'chat:message:responded') {
          loadedMessages.push({ role: 'assistant', content: evt.response });
        }
      });
      if (platformSid && loadedMessages.length > 0) {
        loadedMessages.push({
          role: 'assistant',
          content: 'Welcome to your business platform. Your onboarding steps are on the left -- I\'m right here if you need help.',
          isSystem: true,
        });
      }
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  // ── Check for local responses (tour, rules, etc.) ─────────────

  function matchWorkerQuery(message) {
    const lower = message.toLowerCase();
    const workers = visibleWorkers;

    // "show me X workers" / "X workers" / "workers for X" / "browse X" / "find X worker"
    const patterns = [
      /show\s+me\s+(.+?)\s+workers?/i,
      /find\s+(.+?)\s+workers?/i,
      /browse\s+(.+)/i,
      /workers?\s+for\s+(.+)/i,
      /what\s+(.+?)\s+workers?\s+do\s+you\s+have/i,
    ];
    for (const p of patterns) {
      const m = message.match(p);
      if (m) {
        const term = m[1].toLowerCase().trim();
        const matched = workers.filter(w =>
          w.name.toLowerCase().includes(term) ||
          w.suite.toLowerCase().includes(term) ||
          w.description.toLowerCase().includes(term) ||
          (w.vertical || "").toLowerCase().includes(term)
        );
        if (matched.length > 0) {
          return { content: `Here are ${matched.length} worker${matched.length !== 1 ? "s" : ""} matching "${m[1].trim()}":`, workerCards: matched.slice(0, 8) };
        }
        return { content: `No workers found matching "${m[1].trim()}". Try a different search or browse by category.`, workerCards: [] };
      }
    }
    // Generic queries
    if (/what\s+workers?\s+do\s+you\s+have|show\s+me\s+(all\s+)?workers|list\s+workers/i.test(lower)) {
      const live = workers.filter(w => w.status === "live");
      return { content: `We have ${live.length} live workers across ${WORKER_SUITES.length - 1} categories. Here are a few popular ones:`, workerCards: live.slice(0, 6) };
    }
    return null;
  }

  function getLocalResponse(message) {
    const lower = message.toLowerCase();

    // Worker discovery queries (no vertical bias — searches the full worker registry)
    const workerResult = matchWorkerQuery(message);
    if (workerResult) return workerResult;

    // Demo Mode clear-intent: point at the orange Clear button on the canvas, no backend hop needed.
    const mentionsSamples = lower.includes('sample data') || lower.includes('demo data') || (lower.includes('sample') && lower.includes('data'));
    const clearIntent = /\b(clear|remove|hide|reset|stop|turn off|disable|get rid of|delete|dismiss|exit|leave|switch off)\b/.test(lower);
    if (mentionsSamples && clearIntent) {
      return "To clear the demo data, tap the **Clear** button in the orange Demo Mode banner on the right-side canvas (above the KPIs). The samples disappear immediately and your canvas returns to a clean empty state. Uploading real data also replaces samples automatically — no separate clear step needed.";
    }

    // 49.30 — All other intents (tour, set rules, verify, remind me later, load samples, etc.)
    // now go to the model with the worker-correct system prompt + canvas state. The legacy
    // canned responses defaulted to 'auto' on cache miss and produced cross-worker output.
    return null;
  }

  // ── Intercept |||COMMAND||| blocks from Alex responses ──────
  function interceptAlexCommands(text) {
    if (!text || typeof text !== 'string') return { clean: text, commands: [] };
    const commandRegex = /\|\|\|([A-Z_]+)\|\|\|([\s\S]*?)\|\|\|END_\1\|\|\|/g;
    let clean = text;
    const commands = [];
    let match;
    while ((match = commandRegex.exec(text)) !== null) {
      try {
        commands.push({ type: match[1], payload: JSON.parse(match[2].trim()) });
      } catch (err) {
        console.error('Failed to parse Alex command:', match[1], err);
      }
      clean = clean.replace(match[0], '').trim();
    }
    return { clean, commands };
  }

  async function executeAlexCommand(type, payload) {
    const token = await getChatToken() || localStorage.getItem("ID_TOKEN");
    const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
    switch (type) {
      case 'CREATE_WORKSPACE':
        try {
          const res = await fetch(`${apiBase}/api?path=/v1/onboarding:claimTenant`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantName: payload.name || payload.tenantName || "My Workspace",
              vertical: payload.workspaceType || payload.vertical || "auto",
              tenantType: payload.tenantType || "business",
              jurisdiction: payload.jurisdiction || "GLOBAL",
            }),
          });
          const data = await res.json();
          if (data.ok && data.tenantId) {
            localStorage.setItem("TENANT_ID", data.tenantId);
            localStorage.setItem("VERTICAL", payload.workspaceType || payload.vertical || "auto");
            localStorage.setItem("WORKSPACE_NAME", payload.name || payload.tenantName || "My Workspace");
            localStorage.setItem("COMPANY_NAME", payload.name || payload.tenantName || "My Workspace");
            window.dispatchEvent(new CustomEvent("ta:workspace-changed", {
              detail: { teamId: data.tenantId, vertical: payload.workspaceType || payload.vertical, name: payload.name || payload.tenantName }
            }));
          }
        } catch (err) { console.error("Workspace creation failed:", err); }
        break;
      case 'ADD_WORKER':
        window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: payload.workerId || payload.slug || "raas-store" } }));
        break;
      case 'SWITCH_TEAM':
        if (payload.teamId) {
          localStorage.setItem("TENANT_ID", payload.teamId);
          if (payload.vertical) localStorage.setItem("VERTICAL", payload.vertical);
          if (payload.name) localStorage.setItem("WORKSPACE_NAME", payload.name);
          window.dispatchEvent(new CustomEvent("ta:workspace-changed", { detail: payload }));
        }
        break;
      default:
        console.warn('Unknown Alex command:', type);
    }
  }

  // ── Subscribe to a worker via /worker:subscribe ───────────
  async function subscribeToWorker(worker) {
    const token = await getChatToken() || localStorage.getItem("ID_TOKEN");
    const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
    // 49.32 — pass current workspace tenantId so backend creates a tenant-scoped
    // sub when caller is admin in a Business workspace. "vault"/null falls
    // through to user-scope.
    const subTenantId = localStorage.getItem("TENANT_ID") || null;
    try {
      const res = await fetch(`${apiBase}/api?path=/v1/worker:subscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.workerId || worker.slug,
          slug: worker.slug || worker.workerId,
          tenantId: subTenantId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `${worker.name || 'Worker'} is now active in your account. You can find it in your Digital Workers.`,
          isCelebration: true,
        }]);
        window.dispatchEvent(new CustomEvent("ta:workspace-changed", { detail: {} }));
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message || data.error || 'Could not add worker. Please try again.',
          isError: true,
        }]);
      }
    } catch (err) {
      console.error("Subscribe failed:", err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong adding this worker. Please try again.',
        isError: true,
      }]);
    }
  }

  async function sendMessage(e, overrideMessage) {
    e?.preventDefault();
    const messageToSend = (overrideMessage || input).trim();
    if (!messageToSend || isSending) return;
    setGreetingCollapsed(true);

    if (!disclaimerAccepted) {
      // Don't allow sending messages until disclaimer accepted
      return;
    }

    // CODEX 49.15 Fix 1 — check auth freshly instead of stale closure value.
    // Canvas actions dispatch ta:chatPrompt which calls sendMessage from an
    // event-listener closure that may have captured a null currentUser from mount.
    const liveUser = getAuth().currentUser;
    if (!liveUser) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in to continue.',
        isError: true,
      }]);
      return;
    }

    let userMessage = messageToSend;
    const currentFiles = [...attachedFiles];
    if (currentFiles.length > 0) {
      userMessage += ` [Files attached: ${currentFiles.map(f => f.name).join(', ')}]`;
      setAttachedFiles([]);
    }
    setInput('');
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Check for local response first (worker discovery + demo-clear guidance only)
    const localResp = getLocalResponse(userMessage);
    if (localResp) {
      setIsSending(false);
      setTimeout(() => {
        if (typeof localResp === 'object' && localResp.workerCards) {
          setMessages(prev => [...prev, { role: 'assistant', content: localResp.content, workerCards: localResp.workerCards, isSystem: true }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: localResp, isSystem: true }]);
        }
      }, 400);
      return;
    }

    // Read files as base64 if attached. Plus: persist each file to Drive
    // (Firebase Storage + files/ Firestore record), tagged with the active
    // worker so MY DRIVE can group by worker. See CODEX 50.18 follow-up —
    // fixes the "chat-attached files don't persist" P0 bug.
    let filePayload = null;
    let filesPayload = null;
    if (currentFiles.length > 0) {
      setFileUploading(true);
      setMessages(prev => [...prev, { role: 'assistant', content: `Uploading ${currentFiles.length} file${currentFiles.length > 1 ? 's' : ''}...`, isSystem: true }]);
      try {
        // macOS doesn't always populate file.type for .md/.csv/.rtf/etc. Backend
        // text extractor and signed-URL Content-Type expect a non-empty mime, so
        // derive from the extension when the browser doesn't supply one.
        const inferMime = (file) => {
          if (file.type) return file.type;
          const ext = (file.name.split(".").pop() || "").toLowerCase();
          const m = {
            md: "text/markdown",
            txt: "text/plain",
            csv: "text/csv",
            json: "application/json",
            rtf: "application/rtf",
            html: "text/html",
            htm: "text/html",
            yaml: "text/yaml",
            yml: "text/yaml",
            xml: "application/xml",
          };
          return m[ext] || "application/octet-stream";
        };
        const readFile = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          const mime = inferMime(file);
          reader.onload = () => resolve({ name: file.name, type: mime, data: reader.result });
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });

        // Drive persistence helper — three-step signed-URL flow against the
        // existing /v1/files:sign + /v1/files:finalize endpoints.
        const uploadToDrive = async (file) => {
          const idToken = localStorage.getItem('ID_TOKEN');
          const tenantId = localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID') || 'vault';
          const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
          const tags = activeWorkerSlug ? [`worker:${activeWorkerSlug}`, 'source:chat'] : ['source:chat'];
          const mime = inferMime(file);
          // Step 1: get signed upload URL + provisional Firestore record
          const signRes = await fetch(`${apiBase}/api?path=/v1/files:sign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
              'x-tenant-id': tenantId,
            },
            body: JSON.stringify({
              filename: file.name,
              contentType: mime,
              sizeBytes: file.size,
              purpose: 'drive',
              tags,
              related: {
                workerSlug: activeWorkerSlug || null,
                source: 'chat_attachment',
              },
            }),
          });
          const sign = await signRes.json();
          if (!sign?.ok || !sign?.uploadUrl) throw new Error(sign?.error || 'sign failed');
          // Step 2: PUT bytes to signed URL — Content-Type MUST match what we
          // signed with or GCS rejects with 403. Use inferred mime, not file.type.
          const putRes = await fetch(sign.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': mime },
            body: file,
          });
          if (!putRes.ok) throw new Error(`storage PUT failed (${putRes.status})`);
          // Step 3: finalize — marks file status: ready
          const finRes = await fetch(`${apiBase}/api?path=/v1/files:finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
              'x-tenant-id': tenantId,
            },
            body: JSON.stringify({
              fileId: sign.fileId,
              storagePath: sign.storagePath,
              contentType: mime,
              sizeBytes: file.size,
            }),
          });
          const fin = await finRes.json();
          if (!fin?.ok) throw new Error(fin?.error || 'finalize failed');
          return { fileId: sign.fileId, name: file.name, size: file.size, workerSlug: activeWorkerSlug || null };
        };

        // Run both passes in parallel — base64 read for LLM context, AND
        // signed-URL upload for Drive persistence. If Drive upload fails
        // for any file, the chat still works (we surface a warning).
        const driveUploadResults = await Promise.allSettled(currentFiles.map(uploadToDrive));
        const results = await Promise.all(currentFiles.map(readFile));
        filePayload = results[0];
        filesPayload = results;

        const driveSucceeded = driveUploadResults.filter(r => r.status === 'fulfilled').length;
        const driveFailed = driveUploadResults.filter(r => r.status === 'rejected');
        if (driveFailed.length > 0) {
          console.warn('[ChatPanel] Some files failed Drive upload:', driveFailed.map(r => r.reason?.message || r.reason));
        }

        setMessages(prev => {
          const updated = [...prev];
          const uploadIdx = updated.findLastIndex(m => m.isSystem && m.content.startsWith('Uploading '));
          if (uploadIdx >= 0) {
            const driveNote = driveSucceeded === results.length
              ? ` — saved to Drive${activeWorkerSlug ? ` (${activeWorkerSlug} folder)` : ''}`
              : driveSucceeded > 0
                ? ` — ${driveSucceeded}/${results.length} saved to Drive`
                : ' — Drive save failed; file usable in this chat only';
            updated[uploadIdx] = { ...updated[uploadIdx], content: `${results.length} file${results.length > 1 ? 's' : ''} ready: ${results.map(r => r.name).join(', ')}${driveNote}` };
          }
          return updated;
        });

        // Broadcast so MY DRIVE pane can refresh without a page reload
        if (driveSucceeded > 0) {
          window.dispatchEvent(new CustomEvent('ta:drive-updated', {
            detail: { count: driveSucceeded, workerSlug: activeWorkerSlug || null }
          }));
        }
      } catch (err) {
        console.error('File read failed:', err);
        setMessages(prev => {
          const updated = [...prev];
          const uploadIdx = updated.findLastIndex(m => m.isSystem && m.content.startsWith('Uploading '));
          if (uploadIdx >= 0) {
            updated[uploadIdx] = { ...updated[uploadIdx], content: `Some files could not be read. Message sent without files.` };
          }
          return updated;
        });
      } finally {
        setFileUploading(false);
      }
    }

    setIsTyping(true);
    if (workerCtx?.startWorking) workerCtx.startWorking();

    try {
      const token = await getChatToken();
      if (!token) { setIsTyping(false); return; }
      const tenantId = localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID') || '';
      // 49.32 — default vertical no longer auto-dealer. Personal Vault is
      // the launch baseline; admins set per-workspace vertical when they create
      // a Business workspace.
      const vertical = localStorage.getItem('VERTICAL') || 'consumer';
      const jurisdiction = localStorage.getItem('JURISDICTION') || '';

      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
      const response = await fetch(`${apiBase}/api?path=/v1/chat:message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
          'X-Vertical': alexContext?.surface === 'chief-of-staff' ? 'chief-of-staff' : vertical,
          'X-Jurisdiction': jurisdiction,
        },
        body: JSON.stringify({
          message: userMessage,
          userInput: userMessage,
          sessionId: (() => {
            const KEY = "ta_chat_session_id";
            let sid = localStorage.getItem(KEY);
            if (!sid) {
              sid = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
              localStorage.setItem(KEY, sid);
            }
            return sid;
          })(),
          // 50.27 — Use workerCtx (canonical) over local state. Local
          // activeWorkerSlug can stay stale across rapid navigation events;
          // workerCtx is the single source of truth maintained by
          // WorkerStateProvider. Falling back to the local mirror handles the
          // null-during-init case.
          selectedWorker: (workerCtx?.activeWorkerData?.workerId || workerCtx?.activeWorkerData?.slug || activeWorkerSlug) || null,
          subscribedWorkers: (() => { try { return JSON.parse(localStorage.getItem("ACTIVE_WORKERS") || "[]"); } catch { return []; } })(),
          // 50.27 — Voice mode hint. Backend appends a voice-friendly
          // response style directive to the system prompt: 2-3 sentences,
          // no markdown, conversational tone for hands-free listening.
          responseMode: voiceInputRef.current ? "voice" : "default",
          ...(filePayload ? { file: filePayload } : {}),
          ...(filesPayload && filesPayload.length > 0 ? { files: filesPayload } : {}),
          preferredLanguage: localStorage.getItem("PREFERRED_LANGUAGE") || "en",
          context: {
            source: 'business_portal',
            currentSection: currentSection || 'dashboard',
            vertical: alexContext?.surface === 'chief-of-staff' ? 'chief-of-staff' : vertical,
            jurisdiction,
            workspaceId: localStorage.getItem('WORKSPACE_ID') || '',
            workspaceName: localStorage.getItem('WORKSPACE_NAME') || '',
            userName: localStorage.getItem('COMPANY_NAME') || localStorage.getItem('WORKSPACE_NAME') || '',
            allTeams: (() => { try { const ws = JSON.parse(localStorage.getItem("ta_all_teams") || "[]"); return ws.join(", "); } catch { return ""; } })(),
            ...(dealContext ? { dealContext } : {}),
            ...(pendingActions.length > 0 ? { pendingActions: pendingActions.map(a => ({ customerName: a.customerName, actionType: a.actionType, context: a.context })) } : {}),
            ...(alexContext ? { alexContext } : {}),
            ...(() => { try { const cc = sessionStorage.getItem("ta_campaign_context"); if (cc) { sessionStorage.removeItem("ta_campaign_context"); return { campaignContext: JSON.parse(cc) }; } } catch {} return {}; })(),
            ...(() => { try { const u = JSON.parse(sessionStorage.getItem("ta_utm") || "{}"); return u.source ? { utmSource: u.source, utmMedium: u.medium || "", utmCampaign: u.campaign || "" } : {}; } catch {} return {}; })(),
            // 50.27 — Live canvas snapshot. Whatever card is currently
            // rendered in the right panel (Map + flight plan, social post
            // draft, illustration, accounting report, etc.) gets summarized
            // and shipped to the chat handler so Alex can see what the
            // operator is looking at in real time. This is what makes chat
            // hyper-aware of canvas state across every worker.
            ...(() => {
              try {
                const cd = panel?.canvasData;
                if (!cd || !cd.resolved) return {};
                const r = cd.resolved;
                const ctx = cd.context || {};
                const payload = ctx.payload || {};
                // Trim payload to a 1KB-ish summary to avoid context blowup.
                // Stringified payload truncated to 800 chars covers most
                // single-card snapshots without flooding the prompt.
                let payloadSummary = null;
                try {
                  const s = JSON.stringify(payload);
                  payloadSummary = s.length > 800 ? s.slice(0, 800) + "…[truncated]" : s;
                } catch { payloadSummary = "(unserializable payload)"; }
                return {
                  canvasSnapshot: {
                    cardType: r.type || r.key || null,
                    cardTitle: payload?.title || r.title || null,
                    isSample: !!ctx.demoMode || !!payload?.sample,
                    payloadSummary,
                  },
                };
              } catch { return {}; }
            })(),
            // CODEX 49.21 / 49.25 / 49.30 — Canvas context for worker-aware AI responses (incl. sample data)
            ...(() => {
              try {
                const slug = activeWorkerSlug;
                if (!slug) return {};
                const checklist = WORKER_CHECKLISTS[slug];
                const verticalKey = normalizeVerticalKey(slug);
                const intelligence = WORKER_INTELLIGENCE[slug] || (verticalKey ? VERTICAL_INTELLIGENCE[verticalKey] : null);
                let completedIds = [];
                try {
                  const cl = JSON.parse(localStorage.getItem(`ta_checklist_${slug}`) || "{}");
                  completedIds = Object.keys(cl).filter(k => cl[k]);
                } catch {}
                if (checklist) {
                  for (const item of checklist.items) {
                    if (item.default && !completedIds.includes(item.id)) completedIds.push(item.id);
                  }
                }
                const items = checklist?.items || [];
                const labelFor = (id) => items.find(i => i.id === id)?.label || id;
                const completedItems = completedIds.map(id => ({ id, label: labelFor(id) }));
                const remainingItems = items
                  .filter(i => !completedIds.includes(i.id))
                  .map(i => ({ id: i.id, label: i.label }));
                const demoActive = isDemoMode() && hasSampleData(slug, verticalKey);
                const formatVal = (raw, unit) => {
                  if (raw == null) return null;
                  if (unit === "$") return "$" + Number(raw).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  if (unit === "%") return Number(raw).toLocaleString("en-US") + "%";
                  return Number(raw).toLocaleString("en-US");
                };
                const kpis = (intelligence?.kpis || []).map(k => {
                  const sampleRaw = demoActive ? getSampleKpiValue(slug, k.id, verticalKey) : null;
                  const displayValue = sampleRaw != null ? formatVal(sampleRaw, k.unit) : (k.value && k.value !== "--" ? `${k.value}${k.unit || ""}` : null);
                  return {
                    id: k.id,
                    label: k.label,
                    value: displayValue,
                    unit: k.unit || "",
                    hint: k.hint || "",
                    isSample: sampleRaw != null,
                  };
                });
                return {
                  canvas: {
                    workerSlug: slug,
                    hasProgress: completedItems.length > 0,
                    totalCompleted: completedItems.length,
                    totalItems: items.length,
                    completedItems,
                    remainingItems,
                    kpis,
                    demoMode: demoActive,
                  },
                };
              } catch { return {}; }
            })(),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');

      // 50.27 — surface structured failures (INSUFFICIENT_ROLE,
      // INSUFFICIENT_CREDITS, etc.) that come back as HTTP 200 with
      // {ok:false}. Without this branch users see 'No response received'
      // and have no idea their role or workspace balance is the problem.
      if (data.ok === false && (data.error || data.message)) {
        setIsTyping(false);
        if (workerCtx?.resetState) workerCtx.resetState();
        const friendly = data.message
          || (data.error === 'INSUFFICIENT_ROLE' ? "You don't have permission to send messages in this workspace. Ask the admin to upgrade your role."
              : data.error === 'INSUFFICIENT_CREDITS' ? (data.source === 'tenant'
                  ? 'This workspace is out of Data Credits. Ask the workspace admin to top up.'
                  : 'You are out of Data Credits. Top up your account to continue.')
              : `Could not send: ${data.error}`);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: friendly,
          isError: true,
        }]);
        return;
      }

      setIsTyping(false);
      setDealContext(null);
      if (workerCtx?.completeWork) workerCtx.completeWork();
      // Intercept |||COMMAND||| blocks before storing in state
      const { clean: cleanedAlex, commands } = interceptAlexCommands(data.response || '');
      for (const cmd of commands) executeAlexCommand(cmd.type, cmd.payload);

      // 50.28 — [[SWITCH_WORKER:<slug>]] action emit. When the LLM commits to
      // a cross-worker handoff (RAAS isolation rule), it appends this marker
      // and we actually execute the switch instead of just narrating it.
      let cleanResponse = cleanedAlex;
      let pendingSwitchSlug = null;
      try {
        const m = cleanResponse.match(/\[\[SWITCH_WORKER:([a-zA-Z0-9_-]+)\]\]/);
        if (m) {
          pendingSwitchSlug = m[1];
          cleanResponse = cleanResponse.replace(m[0], '').replace(/\n{3,}/g, '\n\n').trim();
        }
      } catch {}

      // Signal extractor — update canvas when user mentions a vertical
      if (!activeWorkerSlug) {
        const signal = extractSignal(userMessage);
        if (signal && panel?.showRecommendations) {
          const searchBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
          fetch(`${searchBase}/api?path=/v1/marketplace:search&vertical=${signal.vertical}&limit=10`)
            .then(r => r.json())
            .then(searchData => {
              if (searchData.ok && searchData.workers?.length > 0) {
                panel.showRecommendations(searchData.workers, signal.vertical, signal.label);
              }
            })
            .catch(() => {});
        }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanResponse || 'No response received.',
        structuredData: data.structuredData,
        recommendationCard: data.recommendationCard || null,
        workerCards: data.workerCards || null,
      }]);

      // 50.28 — execute pending cross-worker switch. Look up the catalog
      // entry for the target slug (need both slug + name to fire the
      // existing ta:select-worker handler), then dispatch.
      if (pendingSwitchSlug) {
        const target = allWorkers.find(w =>
          w.slug === pendingSwitchSlug ||
          w.workerId === pendingSwitchSlug
        );
        if (target) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('ta:select-worker', {
              detail: { slug: target.slug || target.workerId, name: target.name || target.title || target.slug }
            }));
          }, 400);
        } else {
          console.warn('[chat] SWITCH_WORKER marker but unknown slug:', pendingSwitchSlug);
        }
      }

      // Canvas Protocol (44.9) — resolve canvas signal from API response
      if (data.canvasSignal && panel?.showCanvas) {
        CanvasResolver.resolve(data.canvasSignal, data.canvasContext || {}, panel.showCanvas);
      }

      // Canvas Render markers (49.27 / 49.31) — explicit work products from Alex go to canvas.
      // Always attempt to render; log when panel is missing instead of silently dropping.
      // Fall back to card:work-product when the AI emits an unmapped type.
      if (Array.isArray(data.canvasRenders) && data.canvasRenders.length > 0) {
        // 2026-05-22 diagnostic: trace #219 (Accounting canvas not rendering)
        console.log('[canvas:diag] received canvasRenders count=' + data.canvasRenders.length,
          data.canvasRenders.map(r => ({ type: r?.type, payloadKeys: r?.payload ? Object.keys(r.payload).slice(0, 8) : [] })));
        if (!panel?.showCanvas) {
          console.warn('[canvas] showCanvas unavailable — dropping renders:', data.canvasRenders.map(r => r?.type));
        } else {
          if (typeof panel.openIfClosed === 'function') panel.openIfClosed();
          for (const render of data.canvasRenders) {
            if (!render || !render.type) continue;
            let resolved = lookupSignal(render.type);
            if (!resolved) {
              console.warn('[canvas] unknown render type, using card:work-product fallback:', render.type);
              resolved = lookupSignal('card:work-product');
              if (!resolved) continue;
            }
            console.log('[canvas:diag] showCanvas type=' + render.type + ' component=' + resolved.component);
            panel.showCanvas(resolved, { payload: render.payload || {} });
          }
        }
        if (panel?.showCanvas && data.canvasRenders[0]?.payload?.title) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            isSystem: true,
            content: `Updated canvas: ${data.canvasRenders.map(r => r.payload?.title || r.type).filter(Boolean).join(', ')}`,
          }]);
        }
      }
    } catch (error) {
      console.error('Send failed:', error);
      setIsTyping(false);
      if (workerCtx?.resetState) workerCtx.resetState();
      const msg = error.message || '';
      const errorContent = (msg.includes('Forbidden') || msg.includes('403'))
        ? 'Session expired. Please reload the page and try again.'
        : (msg || 'Failed to send message. Please try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorContent,
        isError: true,
      }]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSuggestionClick(suggestion) {
    setInput(suggestion);
    setTimeout(() => sendMessage(null, suggestion), 100);
  }

  // Save as Draft — for platform-marketing worker (49.2)
  const [savingDraftIdx, setSavingDraftIdx] = useState(null);
  const [draftToast, setDraftToast] = useState(null);

  async function handleSaveDraft(content, idx) {
    setSavingDraftIdx(idx);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/marketing:saveDraft")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, platforms: ["linkedin"] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save draft");
      setDraftToast("Draft saved -- view it in Campaigns");
      setTimeout(() => setDraftToast(null), 3000);
    } catch (e) {
      console.error("Save draft failed:", e);
      setDraftToast("Failed to save draft");
      setTimeout(() => setDraftToast(null), 3000);
    } finally {
      setSavingDraftIdx(null);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  }

  // ── 49.14: Drag-and-drop file upload ──
  const [dragOver, setDragOver] = useState(false);
  function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }
  function handleDragLeave(e) { e.preventDefault(); setDragOver(false); }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const combined = input ? (input + ' ' + transcript) : transcript;
      setInput(combined);
      // 50.27 — mark this turn as voice so backend can switch to a voice-
      // friendly response mode (2-3 sentences, no markdown, conversational).
      // Cleared on next manual keystroke (handled in onChange below).
      voiceInputRef.current = true;
      setIsRecording(false);
      // 50.28 — hands-free auto-send. Sean's ask: voice mode should not
      // require a button click. Fire send immediately after transcription.
      setTimeout(() => sendMessage(null, combined), 50);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  function InviteGeneratorWidget({ workers }) {
    const [selectedWorkers, setSelectedWorkers] = useState(workers.map(w => w.slug));
    const [personalMessage, setPersonalMessage] = useState("");
    const [generating, setGenerating] = useState(false);
    const [inviteUrl, setInviteUrl] = useState(null);
    const [copied, setCopied] = useState(false);

    async function handleGenerate() {
      setGenerating(true);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
        const res = await fetch(`${apiBase}/api?path=/v1/user:generateInvite`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ workerSlugs: selectedWorkers, message: personalMessage }),
        });
        const data = await res.json();
        if (data.ok) setInviteUrl(data.inviteUrl || `https://app.titleapp.ai/invite/${data.inviteCode}`);
      } catch (e) { console.error("Invite generation failed:", e); }
      setGenerating(false);
    }

    return (
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginTop: 8, maxWidth: 420 }}>
        {!inviteUrl ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>Invite a colleague</div>
            {workers.map(w => (
              <label key={w.slug} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: "#1e293b", cursor: "pointer", alignItems: "center" }}>
                <input type="checkbox" checked={selectedWorkers.includes(w.slug)} onChange={e => setSelectedWorkers(prev => e.target.checked ? [...prev, w.slug] : prev.filter(s => s !== w.slug))} />
                {w.name}
              </label>
            ))}
            <textarea value={personalMessage} onChange={e => setPersonalMessage(e.target.value)} placeholder="Add a personal message (optional)" rows={2} style={{ width: "100%", marginTop: 10, padding: 8, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "none", fontFamily: "inherit" }} />
            <button onClick={handleGenerate} disabled={generating || selectedWorkers.length === 0} style={{ marginTop: 10, width: "100%", padding: "10px", background: selectedWorkers.length === 0 ? "#94a3b8" : "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: generating ? 0.7 : 1 }}>
              {generating ? "Generating..." : "Generate Invite Link"}
            </button>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>You'll get 30 days added to your subscription for each colleague who activates.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>Invite link created</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <input type="text" value={inviteUrl} readOnly style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, color: "#475569", outline: "none" }} />
              <button onClick={() => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600, background: "#7c3aed", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <a href={`sms:?body=${encodeURIComponent("Check this out: " + inviteUrl)}`} style={{ display: "inline-block", marginTop: 8, fontSize: 13, color: "#7c3aed", fontWeight: 500, textDecoration: "none" }}>Share via text message</a>
          </>
        )}
      </div>
    );
  }

  function renderStructuredData(data) {
    if (!data || typeof data !== 'object') return null;

    if (data.type === 'record_created') {
      const typeColors = { vehicle: '#7c3aed', property: '#22c55e', document: '#6366f1', certification: '#d97706', valuable: '#ec4899' };
      const typeLabels = { vehicle: 'Vehicle', property: 'Real Estate', document: 'Document', certification: 'Certification', valuable: 'Valuable' };
      const color = typeColors[data.recordType] || '#64748b';
      const label = typeLabels[data.recordType] || 'Record';
      const meta = data.metadata || {};
      const displayFields = Object.entries(meta).filter(([k, v]) => k !== 'title' && v);
      return (
        <div style={{ border: `2px solid ${color}30`, borderRadius: '14px', overflow: 'hidden', marginTop: '8px' }}>
          <div style={{ background: `${color}12`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{meta.title || 'New Record'}</div>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: `${color}20`, color }}>{label}</span>
          </div>
          {displayFields.length > 0 && (
            <div style={{ padding: '10px 16px' }}>
              {displayFields.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', flexShrink: 0, marginRight: '12px' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                  <span style={{ fontWeight: 500, color: '#1e293b', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Digital Title Certificate Created
            </span>
          </div>
        </div>
      );
    }

    // 49.27 — analyst_result, dtc_preview, trade_summary now route to canvas via canvasRenders.
    // Inline rendering removed; if a legacy structuredData of these types arrives, ignore it.
    if (data.type === 'analyst_result' || data.type === 'dtc_preview' || data.type === 'trade_summary') {
      return null;
    }

    // Invite generator widget
    if (data.type === 'invite_generator') {
      return <InviteGeneratorWidget workers={data.workers || []} />;
    }

    // Worker recommendation — render subscribe card
    if (data.type === 'worker_recommendation' && data.worker) {
      const w = data.worker;
      const priceDisplay = !w.price ? 'Free' : w.price >= 100 ? `$${w.price / 100}/mo` : `$${w.price}/mo`;
      return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginTop: 8, background: 'white', maxWidth: 420 }}>
          <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{w.name}</div>
            {w.suite && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: '#f3e8ff', color: '#7c3aed' }}>{w.suite}</span>}
          </div>
          {w.capabilitySummary && <div style={{ padding: '0 16px 10px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{w.capabilitySummary}</div>}
          <div style={{ padding: '4px 16px 10px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{priceDisplay}</div>
          <div style={{ padding: '0 16px 14px' }}>
            <button onClick={() => subscribeToWorker({ workerId: w.slug || w.id, slug: w.slug || w.id, name: w.name, price: w.price })} style={{ width: '100%', padding: '10px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Get this worker</button>
          </div>
        </div>
      );
    }

    // Worker route — show navigation to active worker
    if (data.type === 'worker_route' && data.targetWorker) {
      return null; // Worker is already subscribed, no card needed
    }

    // Document generated — render download card
    const docData = data.type === 'document_generated' ? data : data.document?.type === 'document_generated' ? data.document : null;
    if (docData) {
      const ext = (docData.format || docData.filename?.split('.').pop() || 'pdf').toUpperCase();
      const sizeKB = docData.sizeBytes ? Math.round(docData.sizeBytes / 1024) : null;
      return (
        <div style={{ border: '2px solid #7c3aed30', borderRadius: '14px', overflow: 'hidden', marginTop: '8px', background: '#faf5ff' }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#7c3aed18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docData.filename || 'Document'}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {ext}{docData.pageCount ? ` \u00b7 ${docData.pageCount} pages` : ''}{sizeKB ? ` \u00b7 ${sizeKB} KB` : ''}
              </div>
            </div>
            <a
              href={docData.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#7c3aed', color: 'white', fontSize: '13px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
            >
              Download
            </a>
          </div>
        </div>
      );
    }

    // CODEX 49.21 — Generated image display
    if (data.imageUrl) {
      return (
        <div style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", maxWidth: 400 }}>
          <img src={data.imageUrl} alt="Generated image" style={{ width: "100%", display: "block" }} />
        </div>
      );
    }

    return (
      <div className="structured-generic">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  // ── Disclaimer Widget ─────────────────────────────────────────

  function renderDisclaimerWidget() {
    const v = localStorage.getItem('VERTICAL') || 'auto';
    const vd = VERTICAL_DISCLAIMERS[v];
    const allChecked = acceptedTerms && acceptedDisclaimer && acceptedLiability;

    return (
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 20, marginTop: 8, fontSize: 13, lineHeight: 1.7,
      }}>
        <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 16, color: '#475569', paddingRight: 8 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: '0 0 12px 0' }}>TitleApp -- Terms of Use & Disclaimer</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>AI-Generated Content.</strong> All outputs, recommendations, analyses, suggestions, reports, alerts, risk scores, valuations, projections, and other content provided by TitleApp ("Platform") are generated by artificial intelligence and are provided for informational and operational purposes only. AI outputs may contain errors, omissions, hallucinations, or inaccuracies. You are solely responsible for independently verifying any information before relying on it or acting upon it.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Not Financial or Investment Advice.</strong> Nothing provided by the Platform constitutes financial advice, investment advice, tax advice, accounting advice, or any recommendation to buy, sell, hold, or otherwise transact in any security, commodity, cryptocurrency, real property, or other financial instrument. The Platform is not a registered investment adviser, broker-dealer, transfer agent, funding portal, commodity trading advisor, or financial planner under any federal, state, or international law. Always consult a qualified, licensed financial professional before making any investment or financial decision.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Not Legal Advice.</strong> Nothing provided by the Platform constitutes legal advice, legal opinion, or legal representation. The Platform is not a law firm, and no attorney-client relationship is created by use of the Platform. Always consult a licensed attorney for legal matters.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Not Medical Advice.</strong> Nothing provided by the Platform constitutes medical advice, diagnosis, or treatment recommendation. Always consult a qualified healthcare professional.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Securities & Investment Activities.</strong> The Platform may provide tools for tracking investments, managing cap tables, viewing data rooms, and monitoring portfolios. These tools are administrative and informational only. The Platform does not offer, sell, broker, recommend, or solicit the purchase or sale of any securities. Past performance data, projections, risk scores, and valuations are not guarantees or predictions of future results. Investment involves significant risk, including the possible loss of your entire investment.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Real Estate.</strong> Property valuations, market analyses, and comparable data are computational estimates only and do not constitute formal appraisals. The Platform complies with and requires all users to comply with the Fair Housing Act and all applicable state fair housing laws.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Automotive.</strong> Vehicle valuations, pricing recommendations, and market data are estimates only. Users are responsible for compliance with all applicable FTC regulations, state DMV requirements, lemon laws, and advertising regulations.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Aviation.</strong> The Platform is not a substitute for FAA-required documentation, approved checklists, or professional aeronautical judgment. All flight operations, maintenance, and safety decisions must be made in accordance with 14 CFR.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>No Fiduciary Duty.</strong> Use of the Platform does not create any fiduciary, advisory, agency, partnership, or professional-client relationship between you and TitleApp, Inc.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Limitation of Liability.</strong> To the maximum extent permitted by applicable law, TitleApp, Inc. shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the Platform.</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>Data & Privacy.</strong> Your data is stored securely and processed in accordance with our Privacy Policy. You retain ownership of your data and can export or delete it at any time via Settings.</p>

          <p style={{ margin: '0 0 0 0' }}><strong>Changes.</strong> TitleApp reserves the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.</p>
        </div>

        {vd && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#92400e',
          }}>
            <strong>{vd.title}:</strong> {vd.text}
          </div>
        )}

        <label style={{ display: 'flex', gap: 10, marginBottom: 10, cursor: 'pointer', fontSize: 13, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I have read and agree to the <a href="/legal/terms-of-service" target="_blank" style={{ color: '#7c3aed' }}>Terms of Service</a> and <a href="/legal/privacy-policy" target="_blank" style={{ color: '#7c3aed' }}>Privacy Policy</a></span>
        </label>

        <label style={{ display: 'flex', gap: 10, marginBottom: 10, cursor: 'pointer', fontSize: 13, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={acceptedDisclaimer} onChange={e => setAcceptedDisclaimer(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I understand that all AI outputs are for informational purposes only and do not constitute professional advice of any kind</span>
        </label>

        <label style={{ display: 'flex', gap: 10, marginBottom: 16, cursor: 'pointer', fontSize: 13, alignItems: 'flex-start' }}>
          <input type="checkbox" checked={acceptedLiability} onChange={e => setAcceptedLiability(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I accept full responsibility for any decisions I make based on Platform outputs and acknowledge the limitation of liability</span>
        </label>

        <button
          disabled={!allChecked}
          onClick={handleAcceptDisclaimer}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: allChecked ? '#7c3aed' : '#cbd5e1',
            color: 'white', fontWeight: 600, fontSize: 14,
            cursor: allChecked ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          I Accept -- Let's Go
        </button>
      </div>
    );
  }

  // ── Worker search ────────────────────────────────────────────

  function handleWorkerSearch(e) {
    e?.preventDefault();
    if (!workerSearch.trim()) return;
    const term = workerSearch.toLowerCase();
    let matched = visibleWorkers.filter(w => (
      w.name.toLowerCase().includes(term) ||
      w.description.toLowerCase().includes(term) ||
      w.suite.toLowerCase().includes(term) ||
      (w.vertical || "").toLowerCase().includes(term)
    ));
    if (workerFilter !== "All") matched = matched.filter(w => w.suite === workerFilter);
    setMessages(prev => [...prev,
      { role: 'user', content: workerSearch },
      { role: 'assistant', content: matched.length ? `Found ${matched.length} worker${matched.length !== 1 ? "s" : ""} matching "${workerSearch}":` : `No workers found for "${workerSearch}". Try a different keyword.`, workerCards: matched.slice(0, 8), isSystem: true },
    ]);
    setWorkerSearch("");
  }

  function handleFilterClick(suite) {
    setWorkerFilter(suite);
    const workers = visibleWorkers;
    const matched = suite === "All" ? workers.filter(w => w.status === "live") : workers.filter(w => w.suite === suite);
    setMessages(prev => [...prev,
      { role: 'assistant', content: suite === "All" ? `Showing all ${matched.length} live workers:` : `Showing ${matched.length} ${suite} worker${matched.length !== 1 ? "s" : ""}:`, workerCards: matched.slice(0, 8), isSystem: true },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────

  const chatDisabled = !disclaimerAccepted || isSending || fileUploading;

  return (
    <div className="chatPanelContainer">
      <div className="chatPanelHeader" style={activeWorkerSlug ? { background: `linear-gradient(135deg, ${getWorkerColor(activeWorkerSlug).primary} 0%, ${getWorkerColor(activeWorkerSlug).primary}dd 100%)` } : undefined}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>{(() => {
          if (activeWorkerName) return `${activeWorkerName} -- Chief of Staff`;
          try {
            const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
            return cfg.name ? `${cfg.name} -- Chief of Staff` : 'Alex, Chief of Staff';
          } catch { return 'Alex, Chief of Staff'; }
        })()}</span>
      </div>

      {/* Language change toast */}
      {langToast && (
        <div style={{
          padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#7c3aed",
          background: "#f3f0ff", borderBottom: "1px solid #e9d5ff", textAlign: "center",
          transition: "opacity 0.3s", animation: "fadeIn 300ms ease-out",
        }}>
          {langToast}
        </div>
      )}

      {/* Worker search + filter pills */}
      <div className="chatWorkerSearch">
        <form onSubmit={handleWorkerSearch} style={{ display: "flex", gap: 6, padding: "10px 14px 0" }}>
          <input
            type="text"
            placeholder="Search workers by name, category, or keyword..."
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, color: "#1e293b", fontSize: 13, outline: "none" }}
          />
          <button type="submit" style={{ padding: "9px 14px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Search</button>
        </form>
        <div className="chatFilterPills" style={{ display: "flex", flexWrap: "nowrap", gap: 6, overflowX: "auto", padding: "8px 14px", WebkitOverflowScrolling: "touch" }}>
          {WORKER_SUITES.map(suite => (
            <button
              key={suite}
              onClick={() => handleFilterClick(suite)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0, border: "1px solid",
                background: workerFilter === suite ? "#7c3aed" : "white",
                color: workerFilter === suite ? "white" : "#64748b",
                borderColor: workerFilter === suite ? "#7c3aed" : "#e2e8f0",
              }}
            >{suite}</button>
          ))}
        </div>
      </div>

      <div className="chatPanelMessages" ref={conversationRef}>
        {/* Pending action chips */}
        {pendingActions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            {pendingActions.map(a => (
              <div
                key={a.customerName}
                onClick={() => resumePendingAction(a)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px",
                  borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a",
                }}
              >
                <span>{a.customerName}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>draft</span>
                <button
                  onClick={(e) => { e.stopPropagation(); dismissPendingAction(a.customerName); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "14px", padding: 0, lineHeight: 1 }}
                >x</button>
              </div>
            ))}
            {dealContext?.customerName && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px",
                borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe",
              }}>
                <span>{dealContext.customerName}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>active</span>
              </div>
            )}
          </div>
        )}

        {/* Qualifying onboarding removed — natural conversation replaces bubbles */}

        {/* Greeting — time-aware, context-aware, collapses after 5s or first message */}
        {messages.length === 0 && !isTyping && !showDisclaimer && !qualifyingMode && (() => {
          if (!currentUser) {
            return (
              <div className="chat-welcome">
                <p>Hi. I'm Alex, your Chief of Staff.</p>
                <p>Please sign in to start chatting.</p>
              </div>
            );
          }
          const hour = new Date().getHours();
          const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
          const greetName = (() => { const cn = localStorage.getItem("COMPANY_NAME") || localStorage.getItem("WORKSPACE_NAME") || ""; return cn.split(" ")[0] || ""; })();
          const vLabel = { aviation: "Aviation", auto: "Auto Dealer", "real-estate": "Real Estate", investor: "Investor Relations", consumer: "Personal Vault", solar: "Solar", web3: "Web3", "property-mgmt": "Property Management", analyst: "Investment Analyst" }[localStorage.getItem("VERTICAL") || ""] || "";
          const wkrs = (() => { try { return JSON.parse(localStorage.getItem("ACTIVE_WORKERS") || "[]"); } catch { return []; } })();
          const wCount = wkrs.length;
          const contextLine = vLabel ? `Last active: ${vLabel}${wCount > 0 ? ` \u2014 ${wCount} worker${wCount !== 1 ? "s" : ""} running` : ""}` : "";

          if (greetingCollapsed) {
            return (
              <div
                onClick={() => setGreetingCollapsed(false)}
                style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "#94a3b8", fontStyle: "italic", borderBottom: "1px solid #f1f5f9" }}
              >
                Ask Alex anything...
              </div>
            );
          }
          return (
            <div style={{ padding: "24px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                {timeGreeting}{greetName ? ` ${greetName}` : ""}.
              </div>
              {contextLine && (
                <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 500, marginBottom: 8 }}>{contextLine}</div>
              )}
              <div style={{ fontSize: 14, color: "#6b7280" }}>What are we working on today?</div>
            </div>
          );
        })()}

        {/* Messages */}
        {messages.map((msg, idx) => {
          // Detect document JSON embedded in message content
          let displayContent = interceptAlexCommands(msg.content).clean;
          let embeddedDoc = null;
          if (typeof displayContent === 'string' && displayContent.includes('"document_generated"') && displayContent.includes('"downloadUrl"')) {
            try {
              const jsonMatch = displayContent.match(/\{[\s\S]*"type"\s*:\s*"document_generated"[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.downloadUrl || parsed.document?.downloadUrl) {
                  embeddedDoc = parsed.document || parsed;
                  displayContent = displayContent.replace(jsonMatch[0], '').trim();
                }
              }
            } catch {}
          }
          return (
          <div key={idx}>
            <div className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
              <div className="chat-bubble" style={msg.isCelebration ? { background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid #e9d5ff' } : undefined}>
                {displayContent}
              </div>
              {(msg.structuredData || embeddedDoc) && (
                <div className="chat-structured-data">
                  {renderStructuredData(msg.structuredData || embeddedDoc)}
                </div>
              )}
            </div>

            {/* CODEX 50.11 Layer B — per-message feedback. Renders only on
                substantive AI replies (assistant role, not system/error,
                non-trivial content length). Feedback events go to
                workerFeedback/ via /v1/chat:feedback. */}
            {msg.role === "assistant" && !msg.isSystem && !msg.isError && typeof displayContent === "string" && displayContent.length > 30 && (
              <MessageFeedback messageIndex={idx} workerSlug={activeWorkerSlug || null} />
            )}

            {/* Save as Draft — only for platform-marketing assistant messages (49.2) */}
            {msg.role === "assistant" && !msg.isSystem && !msg.isError && activeWorkerSlug === "platform-marketing" && typeof displayContent === "string" && displayContent.length > 30 && (
              <div style={{ marginTop: 6, marginBottom: 4 }}>
                <button
                  onClick={() => handleSaveDraft(typeof msg.content === "string" ? msg.content : displayContent, idx)}
                  disabled={savingDraftIdx === idx}
                  style={{
                    padding: "6px 12px", fontSize: 11, fontWeight: 600,
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6,
                    color: "#6B46C1", cursor: savingDraftIdx === idx ? "default" : "pointer",
                    opacity: savingDraftIdx === idx ? 0.6 : 1,
                  }}
                >
                  {savingDraftIdx === idx ? "Saving..." : "Save as Draft"}
                </button>
              </div>
            )}

            {/* Inline worker cards */}
            {msg.workerCards && msg.workerCards.length > 0 && (
              <div className="mobileWorkerCards" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxWidth: 420 }}>
                {msg.workerCards.map(w => (
                  <div
                    key={w.slug}
                    onClick={() => subscribeToWorker({ workerId: w.slug, slug: w.slug, name: w.name, price: w.price })}
                    style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "box-shadow 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.15)"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{w.description}</div>
                      <div style={{ display: "flex", gap: 5, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: "#f3e8ff", color: "#7c3aed" }}>{w.price === 0 ? "Free" : `$${w.price / 100}/mo`}</span>
                        {w.status === "live" && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 20, background: "#dcfce7", color: "#166534" }}>Live</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); subscribeToWorker({ workerId: w.slug, slug: w.slug, name: w.name, price: w.price }); }} style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>Get this worker</button>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation card */}
            {msg.recommendationCard && (
              <div style={{ marginTop: 8, maxWidth: 420, background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{msg.recommendationCard.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: "#f3e8ff", color: "#7c3aed" }}>{msg.recommendationCard.suite}</span>
                </div>
                <div style={{ padding: "0 16px 12px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{msg.recommendationCard.description}</div>
                <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>${msg.recommendationCard.price / 100}/mo</span>
                  {msg.recommendationCard.bogoEligible && localStorage.getItem("ta_bogo_used") !== "true" && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#0B7A6E", color: "white" }}>Free with BOGO</span>
                  )}
                </div>
                <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
                  <button onClick={() => subscribeToWorker({ workerId: msg.recommendationCard.slug, slug: msg.recommendationCard.slug, name: msg.recommendationCard.name, price: msg.recommendationCard.price })} style={{ flex: 1, padding: "10px 16px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Get this worker</button>
                  <button onClick={() => handleSuggestionClick("Tell me more about " + msg.recommendationCard.name)} style={{ flex: 1, padding: "10px 16px", background: "white", color: "#7c3aed", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Tell me more</button>
                </div>
              </div>
            )}

            {/* Disclaimer widget */}
            {msg.disclaimer && showDisclaimer && !disclaimerAccepted && (
              renderDisclaimerWidget()
            )}

            {/* Suggestion bubbles */}
            {msg.suggestions && msg.suggestions.length > 0 && disclaimerAccepted && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', marginBottom: '4px' }}>
                {msg.suggestions.map((s, si) => (
                  <button
                    key={si}
                    onClick={() => handleSuggestionClick(s)}
                    style={{
                      padding: '8px 14px', fontSize: '13px', fontWeight: 500,
                      background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px',
                      color: '#7c3aed', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          );
        })}

        {/* Session-end CTA — shown when conversation winds down */}
        {(() => {
          if (messages.length < 2) return null;
          const last3 = messages.slice(-3);
          const endPat = /\b(thanks|thank you|that'?s all|bye|goodbye|see you|cheers)\b/i;
          const closePat = /\b(let me know if you need anything|happy to help|anything else|glad I could help)\b/i;
          const hasEnd = last3.some(m => m.role === "user" && typeof m.content === "string" && endPat.test(m.content));
          const hasClose = last3.some(m => m.role === "assistant" && typeof m.content === "string" && closePat.test(m.content));
          if (hasEnd || hasClose) {
            return (
              <div style={{ padding: "12px 20px" }}>
                <SessionEndCTA />
              </div>
            );
          }
          return null;
        })()}

        {isTyping && (
          <div className="chat-message assistant">
            <svg width="24" height="24" viewBox="0 0 200 200" fill="none" style={{ animation: "spinKey 1.5s ease-in-out infinite" }}>
              <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
              <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
              <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,5"/>
              <circle cx="100" cy="80" r="18" fill="white"/>
              <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
              <rect x="94" y="90" width="12" height="35" fill="white"/>
              <rect x="94" y="115" width="8" height="4" fill="white"/>
              <rect x="94" y="122" width="5" height="3" fill="white"/>
            </svg>
          </div>
        )}
      </div>

      <form
        className="chatPanelInput"
        onSubmit={sendMessage}
        ref={chatPanelRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={dragOver ? { outline: "2px dashed #7c3aed", outlineOffset: -2, borderRadius: 12, background: "rgba(124,58,237,0.04)" } : undefined}
      >
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px', width: '100%' }}>
            {attachedFiles.map((file, fi) => (
              <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button type="button" onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== fi))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}>x</button>
              </div>
            ))}
          </div>
        )}
        {/* Mobile extras row — attach & mic shown here when toggled open */}
        <div className={`mobileExtrasRow${showMobileExtras ? ' open' : ''}`}>
          <button
            type="button"
            onClick={() => { fileInputRef.current?.click(); setShowMobileExtras(false); }}
            disabled={!disclaimerAccepted}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid #e2e8f0', cursor: disclaimerAccepted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8', opacity: disclaimerAccepted ? 1 : 0.4 }}
            aria-label="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <button
            type="button"
            onClick={() => { (isRecording ? stopVoiceInput : startVoiceInput)(); setShowMobileExtras(false); }}
            disabled={!disclaimerAccepted}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #e2e8f0', cursor: disclaimerAccepted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isRecording ? 'white' : '#94a3b8', opacity: disclaimerAccepted ? 1 : 0.4 }}
            aria-label={isRecording ? 'Stop recording' : 'Voice input'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileSelect} />
          {/* Desktop inline attach button */}
          <button
            type="button"
            className="mobileInputExtras"
            onClick={() => fileInputRef.current?.click()}
            disabled={!disclaimerAccepted}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid #e2e8f0', cursor: disclaimerAccepted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8', opacity: disclaimerAccepted ? 1 : 0.4 }}
            aria-label="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          {/* Desktop inline mic button */}
          <button
            type="button"
            className="mobileInputExtras"
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            disabled={!disclaimerAccepted}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #e2e8f0', cursor: disclaimerAccepted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isRecording ? 'white' : '#94a3b8', opacity: disclaimerAccepted ? 1 : 0.4 }}
            aria-label={isRecording ? 'Stop recording' : 'Voice input'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          {/* Mobile "+" toggle for attach/mic */}
          <button
            type="button"
            className="mobileInputToggle"
            onClick={() => setShowMobileExtras(v => !v)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: showMobileExtras ? '#f1f5f9' : 'transparent', border: '1px solid #e2e8f0', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8', transition: 'transform 0.15s ease', transform: showMobileExtras ? 'rotate(45deg)' : 'none' }}
            aria-label="More options"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          {disclaimerAccepted && !input.trim() && (
            <div className="chat-input-dot" style={{ alignSelf: 'center' }} />
          )}
          <textarea
            value={input}
            onChange={(e) => { voiceInputRef.current = false; setInput(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={disclaimerAccepted ? "Type or speak..." : "Please accept the terms above to continue"}
            rows={2}
            disabled={chatDisabled}
            style={{ opacity: disclaimerAccepted ? 1 : 0.5 }}
          />
          <button
            type="submit"
            disabled={chatDisabled || !input.trim()}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>

      {/* Draft save toast (49.2) */}
      {draftToast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "12px 20px",
          background: "#0f172a", color: "#fff", borderRadius: 8, fontSize: 13,
          fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>
          {draftToast}
        </div>
      )}
    </div>
  );
}
