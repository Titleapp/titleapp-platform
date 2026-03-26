import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { fireMilestone } from '../utils/celebrations';
import { WORKER_ROUTES } from '../pages/WorkerMarketplace';
import SessionEndCTA from './worker/SessionEndCTA';
import { useWorkerState } from '../context/WorkerStateContext.jsx';

const WORKER_SUITES = ["All", ...Array.from(new Set(WORKER_ROUTES.filter(w => !w.internal_only).map(w => w.suite)))];

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

// ── Celebration Messages ────────────────────────────────────────

const CELEBRATION_MESSAGES = {
  analyst: {
    celebration: "Your workspace is ready! I've already started working -- scanned your pipeline, checked your portfolio positions, and drafted an LP letter. Not bad for 60 seconds, right?",
    followUp: "Here's what I'd suggest we do first:",
    suggestions: [
      "Show me around my workspace",
      "How do you analyze deals?",
      "Let me set my investment rules",
      "Tell me about the risk alert",
    ],
  },
  auto: {
    celebration: "Your workspace is ready! I've already scanned your inventory, checked your pricing against market, and found a customer lead to follow up on. Your lot just got smarter.",
    followUp: "What do you want to do first?",
    suggestions: [
      "Show me around my workspace",
      "How do you price my inventory?",
      "Let me set my dealership rules",
      "Tell me about that lead",
    ],
  },
  "real-estate": {
    celebration: "Your workspace is ready! I've already matched a listing to buyers, flagged a DOM concern, and I'm tracking your closing deadlines. Your brokerage just got a 24/7 assistant.",
    followUp: "Where do you want to start?",
    suggestions: [
      "Show me around my workspace",
      "How do you match buyers to listings?",
      "Let me set my brokerage rules",
      "Tell me about that closing deadline",
    ],
  },
  aviation: {
    celebration: "Your workspace is ready! I've already found a charter opportunity, flagged an upcoming inspection, and I'm tracking your crew certifications. Your operation just leveled up.",
    followUp: "What's first?",
    suggestions: [
      "Show me around my workspace",
      "How do you track maintenance?",
      "Let me set my ops rules",
      "Tell me about that charter opportunity",
    ],
  },
  investor: {
    celebration: "Your investor data room is ready. I've loaded the current raise terms, available documents, and governance details.",
    followUp: "What would you like to explore first?",
    suggestions: [
      "Show me around the data room",
      "What are the terms of the raise?",
      "Tell me about TitleApp",
      "How do I invest?",
    ],
  },
};

// ── Tour Responses ──────────────────────────────────────────────

const TOUR_RESPONSES = {
  analyst: `Here's the quick tour:\n\n**Dashboard** -- Your command center. KPIs, alerts, and the Value Tracker showing your AI ROI.\n\n**Portfolio** -- Your positions, market movements, and price targets. I monitor these daily.\n\n**Research** -- Your active research pipeline. I track earnings, sector alerts, and flag models that need updating.\n\n**Clients & LPs** -- Your investor relationships, meeting notes, and communications. I can draft quarterly letters for you.\n\n**Deal Pipeline** -- Active deals I'm analyzing. This is where I flag opportunities and risks.\n\n**Rules** -- This is where the magic happens. You set the rules -- like "flag any deal over $5M in multifamily" or "alert me when a position drops more than 5%" -- and I follow them. The more rules you give me, the more I can do for you.\n\nWant to dive into any of these?`,
  auto: `Here's the quick tour:\n\n**Dashboard** -- Your command center. KPIs, alerts, and daily action items.\n\n**Inventory** -- Your full lot view. I track aging, pricing, and market comps for every unit.\n\n**Customers** -- Your buyer and prospect database. I identify follow-up opportunities and draft outreach.\n\n**Sales Pipeline** -- Active deals from first contact to delivery. I prioritize your hottest leads.\n\n**F&I Products** -- Your product catalog. I match products to buyer profiles and calculate payment impacts.\n\n**Service** -- Your service schedule. I flag warranty expirations and upsell opportunities.\n\n**Rules** -- This is where the magic happens. You set the rules -- like "alert me when a unit hits 60 days" or "auto-draft follow-ups for stale leads" -- and I follow them.\n\nWant to dive into any of these?`,
  "real-estate": `Here's the quick tour:\n\n**Dashboard** -- Your command center. KPIs, pipeline status, and daily priorities.\n\n**Listings** -- Your active and pending listings. I track DOM, price changes, and showings.\n\n**Buyers** -- Your buyer pipeline with saved searches and match criteria.\n\n**Transactions** -- Active deals from offer to close. I track deadlines and contingencies.\n\n**Properties** -- Your managed properties with units, leases, and financials.\n\n**Tenants** -- Tenant records, rent rolls, and payment history.\n\n**Rules** -- This is where the magic happens. You set the rules -- like "alert me at 45 DOM" or "flag any lease expiring in 90 days" -- and I follow them.\n\nWant to dive into any of these?`,
  aviation: `Here's the quick tour:\n\n**Dashboard** -- Your ops center. Fleet status, upcoming flights, and maintenance alerts.\n\n**Inventory** -- Your aircraft fleet with airframe hours, engine time, and availability.\n\n**Staff** -- Pilots, crew, and maintenance personnel with certification tracking.\n\n**Appointments** -- Flight schedule, charter bookings, and maintenance windows.\n\n**Rules** -- This is where the magic happens. You set the rules -- like "alert 60 days before any medical expires" or "flag aircraft under 50 hours to next inspection" -- and I follow them.\n\nWant to dive into any of these?`,
  investor: `Here's the quick tour of your data room:\n\n**Overview** -- The raise dashboard. Current funding progress, key terms at a glance, and quick actions.\n\n**Investor Docs** -- Pitch deck, executive summary, and business plan. Tier 1 docs are always available. Tier 2 requires verification.\n\n**Subscription Docs** -- The SAFE agreement terms, conversion scenarios, and the link to invest via Wefunder.\n\n**Governance & Voting** -- Cap table, share registry, and governance proposals once the raise closes.\n\n**ID Verification** -- One-time identity check and risk disclaimers. Unlocks full document access.\n\n**Wallet** -- Your investment position and ownership tokens after investing.\n\n**Profile** -- Your investor profile and account settings.\n\nWhat would you like to know more about?`,
};

// ── Rules Responses ─────────────────────────────────────────────

const RULES_RESPONSES = {
  analyst: `Great idea -- the rules are what make me work for YOU specifically, not just any analyst.\n\nHere's how it works: you tell me things like:\n- "Flag any multifamily deal over $5M in the Southwest"\n- "Alert me when a position drops more than 5% in a day"\n- "Auto-draft LP letters every quarter"\n- "Never recommend deals in the oil & gas sector"\n\nThe more specific you are, the better I get. You can set these in **Settings > Rules**, or just tell me right here in the chat and I'll remember.\n\nWant to set some rules now, or explore the workspace first?`,
  auto: `Smart move -- the rules are what make me work for YOUR dealership specifically.\n\nHere's how it works: you tell me things like:\n- "Alert me when any unit hits 60 days on lot"\n- "Auto-draft follow-ups for leads that go cold for 5 days"\n- "Flag any vehicle priced more than 5% below market"\n- "Never discount vehicles in the first 30 days"\n\nThe more specific you are, the better I get. You can set these in **Settings > Rules**, or just tell me right here.\n\nWant to set some rules now?`,
  "real-estate": `Good call -- the rules are what make me work for YOUR brokerage specifically.\n\nHere's how it works: you tell me things like:\n- "Alert me at 45 days on market"\n- "Flag any lease expiring in 90 days"\n- "Auto-match new listings to my buyer pipeline"\n- "Send me a daily summary of all pending deadlines"\n\nThe more specific you are, the better I get. You can set these in **Settings > Rules**, or just tell me right here.\n\nWant to set some rules now?`,
  aviation: `Smart -- the rules are what make me work for YOUR operation specifically.\n\nHere's how it works: you tell me things like:\n- "Alert 60 days before any medical certificate expires"\n- "Flag aircraft under 50 hours to next inspection"\n- "Auto-notify dispatch when a charter request matches availability"\n- "Send weekly utilization reports every Monday"\n\nYou can set these in **Settings > Rules**, or just tell me right here.\n\nWant to set some rules now?`,
  investor: `As an investor, you don't set rules in the traditional sense -- but here's what you can customize:\n\n- **Notification preferences** -- Choose how you want to receive company updates\n- **Communication preferences** -- Email frequency, update categories you care about\n- **Profile details** -- Company info, social links, and investment preferences\n\nYou can update these in your Profile section, or just tell me what you'd like to change.`,
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

// ── ID Verify Messages ──────────────────────────────────────────

const ID_VERIFY_MESSAGES = {
  analyst: "One more thing -- since you'll be working with deal analysis and portfolio data, I recommend verifying your identity soon. It's a quick ID check ($2, takes 60 seconds) and it unlocks features like the data room, advanced reporting, and the ability to share analyses with LPs. Want to do it now or later?",
  auto: "By the way -- at some point you'll want to verify your identity. It's a quick ID check ($2) that unlocks some features and keeps your account secure. No rush on that -- I'll remind you when it matters.",
  "real-estate": "By the way -- at some point you'll want to verify your identity. It's a quick ID check ($2) that unlocks some features and keeps your account secure. No rush on that -- I'll remind you when it matters.",
  aviation: "By the way -- at some point you'll want to verify your identity. It's a quick ID check ($2) that unlocks some features like crew management and compliance reporting. No rush -- I'll remind you when it matters.",
  investor: "To access the full set of investor documents -- including the business plan and SAFE agreement -- you'll need to verify your identity. It's a one-time $2 check. You can do it from the ID Verification section in the sidebar.",
};

// ── Component ───────────────────────────────────────────────────

export default function ChatPanel({ currentSection, onboardingStep, disclaimerAccepted: propDisclaimerAccepted, alexContext }) {
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
  const [fileUploading, setFileUploading] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [showMobileExtras, setShowMobileExtras] = useState(false);
  const chatPanelRef = useRef(null);
  const [workerSearch, setWorkerSearch] = useState("");
  const [greetingCollapsed, setGreetingCollapsed] = useState(false);
  const [workerFilter, setWorkerFilter] = useState("All");

  const workerCtx = useWorkerState();

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

      // Chief of Staff — immediate greeting, no context fetch needed
      if (slug === "chief-of-staff") {
        setMessages(prev => [...prev, { role: 'assistant', content: `Switched to ${name}. I'm your Chief of Staff — I coordinate all your workers and track progress across your workspace.` }]);
        setTimeout(() => {
          if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }, 100);
      }
      // Other workers: opener fires from workerReady useEffect below
    }
    window.addEventListener('ta:select-worker', handleWorkerSelect);
    return () => window.removeEventListener('ta:select-worker', handleWorkerSelect);
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
    if (isReturn) {
      opener = `Welcome back. ${tagline}. Where did we leave off?`;
    } else if (workerType === "game") {
      opener = `Ready to play? ${tagline}.${prompts[0] ? ` Tap '${prompts[0]}' to start.` : ""}`;
    } else {
      opener = `Hey — I'm your ${tagline.charAt(0).toLowerCase() + tagline.slice(1)}.${whatYoullHave ? ` ${whatYoullHave}.` : ""} What do you want to tackle first?`;
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

      // Qualifying question for first Alex session
      if (!localStorage.getItem('ta_alex_qualified') && disclaimerAccepted) {
        setMessages([{
          role: 'assistant',
          content: "Hey \u2014 I'm Alex, your Chief of Staff. Before I show you around, quick question: what do you do for work?",
          isSystem: true,
          suggestions: ["I'm a pilot", "I work in real estate", "I run a dealership", "Something else"],
        }]);
        return;
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
  }, [currentUser, authReady]);

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
    const v = localStorage.getItem('VERTICAL') || 'auto';
    const config = CELEBRATION_MESSAGES[v] || CELEBRATION_MESSAGES.auto;

    // Fire confetti
    fireMilestone('onboarding_complete');

    const celebrationMsgs = [
      { role: 'assistant', content: config.celebration, isSystem: true, isCelebration: true },
    ];

    // If disclaimer not yet accepted, show disclaimer before suggestions
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
        content: config.followUp,
        isSystem: true,
        suggestions: config.suggestions,
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
    const v = localStorage.getItem('VERTICAL') || 'auto';
    localStorage.setItem('DISCLAIMER_ACCEPTED', 'true');
    localStorage.setItem('DISCLAIMER_VERSION', '2026-02-24-v2');
    localStorage.setItem('DISCLAIMER_ACCEPTED_AT', new Date().toISOString());

    // Write to Firestore FIRST, then unblock chat
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

    // Unblock chat only after Firestore write completes (localStorage is sync fallback)
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);

    // Show celebration suggestions + ID verify
    const config = CELEBRATION_MESSAGES[v] || CELEBRATION_MESSAGES.auto;
    const followUpMsgs = [
      { role: 'assistant', content: "You're all set. Now -- " + config.followUp, isSystem: true, suggestions: config.suggestions },
    ];

    // Add ID verify message after a delay
    setMessages(prev => [...prev.filter(m => !m.disclaimer), ...followUpMsgs]);
    setTimeout(() => {
      const idMsg = ID_VERIFY_MESSAGES[v] || ID_VERIFY_MESSAGES.auto;
      setMessages(prev => [...prev, { role: 'assistant', content: idMsg, isSystem: true, suggestions: v === 'analyst' ? ["Verify now ($2)", "Remind me later"] : undefined }]);
    }, 2000);
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
    const workers = WORKER_ROUTES.filter(w => !w.internal_only);

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
    const v = localStorage.getItem('VERTICAL') || 'auto';
    const lower = message.toLowerCase();

    // Worker discovery queries
    const workerResult = matchWorkerQuery(message);
    if (workerResult) return workerResult;

    if (lower.includes('show me around') || lower.includes('tour') || lower.includes('walk me through')) {
      return TOUR_RESPONSES[v] || TOUR_RESPONSES.auto;
    }
    if (lower.includes('set my') && lower.includes('rule') || lower.includes('set my dealership rule') || lower.includes('set my investment rule') || lower.includes('set my brokerage rule') || lower.includes('set my ops rule')) {
      return RULES_RESPONSES[v] || RULES_RESPONSES.auto;
    }
    if (lower.includes('sample data') || lower.includes('use sample') || lower.includes('demo data') || lower.includes('load sample') || lower.includes('explore with sample')) {
      // Trigger sample data loading inline in chat
      triggerSampleDataInChat();
      return '__SAMPLE_DATA_TRIGGERED__';
    }
    if (lower.includes('verify now')) {
      return "Identity verification is coming soon. We'll notify you when it's ready. For now, you can explore everything else in your workspace.";
    }
    if (lower.includes('remind me later') && lower.includes('verify') || lower === 'remind me later') {
      return "No problem -- I'll bring it up again when you need it. Let's explore your workspace.";
    }
    return null;
  }

  function triggerSampleDataInChat() {
    const v = localStorage.getItem('VERTICAL') || 'auto';
    const SAMPLE_STEPS = {
      auto: [
        "Loading 24 vehicles...",
        "Loading 15 customer records...",
        "Loading 12 open deals...",
        "Loading service schedule...",
        "Loading F&I products...",
        "Loading sales pipeline...",
      ],
      "real-estate": [
        "Loading 8 listings...",
        "Loading 10 buyer profiles...",
        "Loading 5 managed properties with 28 units...",
        "Loading 24 tenant records...",
        "Loading 7 maintenance requests...",
        "Loading 3 active transactions...",
      ],
      analyst: [
        "Loading portfolio (17 positions, $42.8M AUM)...",
        "Loading 13 LP records...",
        "Loading research pipeline...",
        "Loading 4 sourced opportunities...",
      ],
      aviation: [
        "Loading 4 aircraft...",
        "Loading 12 pilots and crew...",
        "Loading maintenance schedules...",
        "Loading flight hour logs...",
        "Loading certification records...",
      ],
    };
    const steps = SAMPLE_STEPS[v] || SAMPLE_STEPS.auto;

    setMessages(prev => [...prev, { role: 'assistant', content: "Loading sample data into your account...", isSystem: true }]);

    steps.forEach((step, i) => {
      setTimeout(() => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.isSystem && last.content.startsWith("Loading sample data")) {
            const lines = (last._loadedLines || []).concat(step.replace("...", ""));
            return [...prev.slice(0, -1), {
              ...last,
              _loadedLines: lines,
              content: "Loading sample data into your account...\n\n" + lines.map(l => `${l}`).join("\n"),
            }];
          }
          return prev;
        });

        // After last step, show completion
        if (i === steps.length - 1) {
          setTimeout(() => {
            // Update onboarding state
            try {
              const obs = JSON.parse(localStorage.getItem('ONBOARDING_STATE') || '{}');
              obs.dataSource = 'sample';
              localStorage.setItem('ONBOARDING_STATE', JSON.stringify(obs));
            } catch (e) { /* ignore */ }

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "Sample data loaded. I'm scanning everything now -- give me a moment to find what matters.",
              isSystem: true,
            }]);

            // After a beat, show the insights
            setTimeout(() => {
              const INSIGHTS = {
                auto: "I found 3 things in your sample inventory:\n\n1. **Pricing Opportunity** -- 2024 Toyota Camry XSE is listed at $28,500 but market avg is $30,200. That's $1,700 you could be capturing.\n\n2. **Aging Alert** -- 2023 Honda CR-V has been on the lot 67 days (your target is 45). Consider a price adjustment.\n\n3. **Lead Follow-Up** -- Sarah Chen viewed the 2024 Highlander 3 times this week. Nobody has reached out yet.\n\nThis is what I do 24/7 when you connect your real inventory. Want me to show you around the dashboard?",
                "real-estate": "I found 3 things in your sample brokerage data:\n\n1. **Buyer Match** -- 742 Oak Street ($425K, 3BR) matches criteria for the Martinez family and Johnson couple.\n\n2. **Days on Market** -- 1205 Elm Drive is at 52 days (area avg is 28). Consider a price reduction strategy.\n\n3. **Closing Deadline** -- 456 Pine Road closing has an inspection contingency expiring in 3 days.\n\nThis is what I do 24/7 when you connect your real listings. Want me to show you around the dashboard?",
                analyst: "I found 3 things in your sample portfolio:\n\n1. **Deal Opportunity** -- Parkview Apartments (48 units, Phoenix) has a CMBS loan maturing Aug 2026. Matches your multifamily criteria at $8.2M.\n\n2. **Risk Alert** -- Sentinel Defense position is down 6.2% on a contract delay. Consider trimming exposure.\n\n3. **Action Item** -- Quarterly LP letter drafted and ready for your compliance review.\n\nThis is what I do 24/7 when you connect your real data. Want me to show you around the dashboard?",
                aviation: "I found 3 things in your sample fleet data:\n\n1. **Charter Opportunity** -- PHX to SFO request for Mar 15 matches N456TA (Citation CJ3) availability. Estimated revenue: $8,200.\n\n2. **Maintenance Due** -- N789TB Phase 2 inspection due in 42 hours.\n\n3. **Certification Expiring** -- Captain Williams medical certificate expires in 21 days.\n\nThis is what I do 24/7 when you connect your real operations data. Want me to show you around the dashboard?",
              };
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: INSIGHTS[v] || INSIGHTS.auto,
                isSystem: true,
                suggestions: ["Show me around", "Set my rules", "Go to dashboard"],
              }]);
            }, 2000);
          }, 800);
        }
      }, (i + 1) * 400);
    });
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
    const token = localStorage.getItem("ID_TOKEN");
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
    const token = localStorage.getItem("ID_TOKEN");
    const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
    try {
      const res = await fetch(`${apiBase}/api?path=/v1/worker:subscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.workerId || worker.slug, slug: worker.slug || worker.workerId }),
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

    if (!currentUser) {
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

    // Check for local response first (tour, rules, etc.)
    const localResp = getLocalResponse(userMessage);
    if (localResp) {
      setIsSending(false);
      if (localResp !== '__SAMPLE_DATA_TRIGGERED__') {
        setTimeout(() => {
          if (typeof localResp === 'object' && localResp.workerCards) {
            setMessages(prev => [...prev, { role: 'assistant', content: localResp.content, workerCards: localResp.workerCards, isSystem: true }]);
          } else {
            setMessages(prev => [...prev, { role: 'assistant', content: localResp, isSystem: true }]);
          }
        }, 400);
      }
      return;
    }

    // Read files as base64 if attached
    let filePayload = null;
    let filesPayload = null;
    if (currentFiles.length > 0) {
      setFileUploading(true);
      setMessages(prev => [...prev, { role: 'assistant', content: `Uploading ${currentFiles.length} file${currentFiles.length > 1 ? 's' : ''}...`, isSystem: true }]);
      try {
        const readFile = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
        const results = await Promise.all(currentFiles.map(readFile));
        filePayload = results[0];
        filesPayload = results;
        setMessages(prev => {
          const updated = [...prev];
          const uploadIdx = updated.findLastIndex(m => m.isSystem && m.content.startsWith('Uploading '));
          if (uploadIdx >= 0) {
            updated[uploadIdx] = { ...updated[uploadIdx], content: `${results.length} file${results.length > 1 ? 's' : ''} ready: ${results.map(r => r.name).join(', ')}` };
          }
          return updated;
        });
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
      const token = await currentUser.getIdToken(true);
      const tenantId = localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID') || '';
      const vertical = localStorage.getItem('VERTICAL') || 'auto';
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
          selectedWorker: activeWorkerSlug || null,
          subscribedWorkers: (() => { try { return JSON.parse(localStorage.getItem("ACTIVE_WORKERS") || "[]"); } catch { return []; } })(),
          ...(filePayload ? { file: filePayload } : {}),
          ...(filesPayload && filesPayload.length > 1 ? { files: filesPayload } : {}),
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
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');

      setIsTyping(false);
      setDealContext(null);
      if (workerCtx?.completeWork) workerCtx.completeWork();
      // Intercept |||COMMAND||| blocks before storing in state
      const { clean: cleanResponse, commands } = interceptAlexCommands(data.response || '');
      for (const cmd of commands) executeAlexCommand(cmd.type, cmd.payload);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanResponse || 'No response received.',
        structuredData: data.structuredData,
        recommendationCard: data.recommendationCard || null,
        workerCards: data.workerCards || null,
      }]);
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

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
      setIsRecording(false);
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

    if (data.type === 'analyst_result') {
      return (
        <div className="structured-analyst-result">
          <div className="analyst-header">
            <span className="analyst-emoji">{data.verdict_emoji}</span>
            <h4>{data.verdict}</h4>
            <span className="analyst-score">{data.score}/100</span>
          </div>
          {data.summary && <p className="analyst-summary">{data.summary}</p>}
          {data.key_findings && data.key_findings.length > 0 && (
            <div className="analyst-findings">
              <h5>Key Findings:</h5>
              <ul>{data.key_findings.map((finding, i) => <li key={i}>{finding}</li>)}</ul>
            </div>
          )}
        </div>
      );
    }

    if (data.type === 'dtc_preview') {
      return (
        <div className="structured-dtc-preview">
          <div className="dtc-header">
            <h4>{data.asset_type} DTC Preview</h4>
            {data.blockchain_verified && <span className="dtc-verified">Verified</span>}
          </div>
          {data.details && (
            <div className="dtc-details">
              {Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="dtc-field">
                  <span className="dtc-label">{key}:</span>
                  <span className="dtc-value">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (data.type === 'trade_summary') {
      return (
        <div className="structured-trade-summary">
          <h4>Trade Summary</h4>
          <div className="trade-details">
            <div className="trade-field"><strong>Your Vehicle:</strong> {data.your_vehicle}</div>
            <div className="trade-field"><strong>Trade Value:</strong> ${data.trade_value?.toLocaleString()}</div>
            <div className="trade-field"><strong>New Vehicle:</strong> {data.new_vehicle}</div>
            <div className="trade-field"><strong>Price:</strong> ${data.new_price?.toLocaleString()}</div>
            <div className="trade-field"><strong>Net Cost:</strong> ${data.net_cost?.toLocaleString()}</div>
          </div>
        </div>
      );
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
    let matched = WORKER_ROUTES.filter(w => !w.internal_only && (
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
    const workers = WORKER_ROUTES.filter(w => !w.internal_only);
    const matched = suite === "All" ? workers.filter(w => w.status === "live") : workers.filter(w => w.suite === suite);
    setMessages(prev => [...prev,
      { role: 'assistant', content: suite === "All" ? `Showing all ${matched.length} live workers:` : `Showing ${matched.length} ${suite} worker${matched.length !== 1 ? "s" : ""}:`, workerCards: matched.slice(0, 8), isSystem: true },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────

  const chatDisabled = !disclaimerAccepted || isSending || fileUploading;

  return (
    <div className="chatPanelContainer">
      <div className="chatPanelHeader">
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

        {/* Qualifying onboarding — centered avatar */}
        {qualifyingMode && messages.length <= 1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 40, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: "linear-gradient(135deg, #7c3aed, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#1e293b", lineHeight: 1.6, maxWidth: 380, marginBottom: 24 }}>
              Hey {"\u2014"} I'm Alex, your Chief of Staff. Before I show you around, quick question: what do you do for work?
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {["I'm a pilot", "I work in real estate", "I run a dealership", "Something else"].map(chip => (
                <button key={chip} onClick={() => handleQualifyingAnswer(chip)} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "white", border: "1px solid #e2e8f0", borderRadius: 20, color: "#7c3aed", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "#faf5ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "white"; }}
                >{chip}</button>
              ))}
            </div>
          </div>
        )}

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

      <form className="chatPanelInput" onSubmit={sendMessage} ref={chatPanelRef}>
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
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disclaimerAccepted ? "Ask me anything..." : "Please accept the terms above to continue"}
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
    </div>
  );
}
