import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { fireMilestone } from '../utils/celebrations';

// ── Contextual Messages ─────────────────────────────────────────

const CONTEXTUAL_MESSAGES = {
  "choose-path": "Welcome. Pick the path that fits -- I'll tailor everything from there.",
  "business-basics": "Just the essentials. I'll use this to configure your AI assistant and compliance rules.",
  integrations: "Tell me what you already use. I'll build the connectors so your data flows in automatically.",
  "data-import": "You can upload your own files or explore with sample data. Either way, you'll see value in about 60 seconds.",
  "first-value": "I already scanned your data and found a few things worth your attention.",
  terms: "This is our standard terms and liability agreement. Take a look and let me know if you have questions.",
  idVerify: "Quick identity check -- keeps your records secure and verified. $2, once a year.",
  details: "This is where we set your foundation. The jurisdiction matters because compliance rules vary by state.",
  raas: "Tell me how you want your AI assistant to work. I'll follow these rules in every interaction.",
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
  settings: "Your Vault settings. You can update your profile, configure your AI assistant, and manage notification preferences.",
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

export default function ChatPanel({ currentSection, onboardingStep, disclaimerAccepted: propDisclaimerAccepted }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastContextStep, setLastContextStep] = useState(null);
  const conversationRef = useRef(null);

  const [dealContext, setDealContext] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);

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

  // ── Celebration + initial messages on mount ───────────────────

  useEffect(() => {
    if (currentUser && authReady && messages.length === 0) {
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

      // Check if disclaimer needed on existing workspace
      if (!disclaimerAccepted) {
        loadDisclaimerFlow();
        return;
      }

      loadConversationHistory();
    }
  }, [currentUser, authReady]);

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
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);

    // Store in Firestore via API
    try {
      const token = await currentUser.getIdToken();
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

  function getLocalResponse(message) {
    const v = localStorage.getItem('VERTICAL') || 'auto';
    const lower = message.toLowerCase();

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

  async function sendMessage(e, overrideMessage) {
    e?.preventDefault();
    const messageToSend = (overrideMessage || input).trim();
    if (!messageToSend || isSending) return;

    if (!disclaimerAccepted) {
      // Don't allow sending messages until disclaimer accepted
      return;
    }

    if (!currentUser) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in to use the AI assistant.',
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
          setMessages(prev => [...prev, { role: 'assistant', content: localResp, isSystem: true }]);
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

    try {
      const token = await currentUser.getIdToken();
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
          'X-Vertical': vertical,
          'X-Jurisdiction': jurisdiction,
        },
        body: JSON.stringify({
          message: userMessage,
          ...(filePayload ? { file: filePayload } : {}),
          ...(filesPayload && filesPayload.length > 1 ? { files: filesPayload } : {}),
          context: {
            source: 'business_portal',
            currentSection: currentSection || 'dashboard',
            vertical,
            jurisdiction,
            workspaceId: localStorage.getItem('WORKSPACE_ID') || '',
            workspaceName: localStorage.getItem('WORKSPACE_NAME') || '',
            ...(dealContext ? { dealContext } : {}),
            ...(pendingActions.length > 0 ? { pendingActions: pendingActions.map(a => ({ customerName: a.customerName, actionType: a.actionType, context: a.context })) } : {}),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');

      setIsTyping(false);
      setDealContext(null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No response received.',
        structuredData: data.structuredData,
      }]);
    } catch (error) {
      console.error('Send failed:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Failed to send message. Please try again.',
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
          <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: '0 0 12px 0' }}>TitleApp AI -- Terms of Use & Disclaimer</p>

          <p style={{ margin: '0 0 10px 0' }}><strong>AI-Generated Content.</strong> All outputs, recommendations, analyses, suggestions, reports, alerts, risk scores, valuations, projections, and other content provided by TitleApp AI ("Platform") are generated by artificial intelligence and are provided for informational and operational purposes only. AI outputs may contain errors, omissions, hallucinations, or inaccuracies. You are solely responsible for independently verifying any information before relying on it or acting upon it.</p>

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
          <span>I have read and agree to the Terms of Service and Privacy Policy</span>
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

  // ── Render ────────────────────────────────────────────────────

  const chatDisabled = !disclaimerAccepted || isSending || fileUploading;

  return (
    <div className="chatPanelContainer">
      <div className="chatPanelHeader">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>{(() => {
          try {
            const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
            return cfg.name ? `${cfg.name} -- AI Assistant` : 'AI Assistant';
          } catch { return 'AI Assistant'; }
        })()}</span>
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

        {/* Empty state — only show if no messages AND no disclaimer pending */}
        {messages.length === 0 && !isTyping && !showDisclaimer && (
          <div className="chat-welcome">
            {(() => {
              const v = localStorage.getItem('VERTICAL') || 'auto';
              if (v === 'consumer') {
                let cosName = 'your AI assistant';
                try {
                  const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
                  if (cfg.name) cosName = `${cfg.name}, your AI assistant`;
                } catch {}
                return (
                  <>
                    <p>Hi. I'm {cosName}.</p>
                    {currentUser ? (
                      <p>I can help you manage your vehicles, properties, documents, and certifications. What would you like to do?</p>
                    ) : (
                      <p>Please sign in to start chatting.</p>
                    )}
                  </>
                );
              }
              let cosLabel = 'your AI assistant';
              try {
                const cfg2 = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
                if (cfg2.name) cosLabel = `${cfg2.name}, your AI assistant`;
              } catch {}
              return (
                <>
                  <p>Hi. I'm {cosLabel}.</p>
                  {currentUser ? (
                    <p>Ask me anything about your records, documents, customers, inventory, or business operations.</p>
                  ) : (
                    <p>Please sign in to start chatting.</p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => {
          // Detect document JSON embedded in message content
          let displayContent = msg.content;
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

      <form className="chatPanelInput" onSubmit={sendMessage}>
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!disclaimerAccepted}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid #e2e8f0', cursor: disclaimerAccepted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8', opacity: disclaimerAccepted ? 1 : 0.4 }}
            aria-label="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <button
            type="button"
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            disabled={!disclaimerAccepted}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #e2e8f0', cursor: disclaimerAccepted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isRecording ? 'white' : '#94a3b8', opacity: disclaimerAccepted ? 1 : 0.4 }}
            aria-label={isRecording ? 'Stop recording' : 'Voice input'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disclaimerAccepted ? "Ask me anything..." : "Please accept the terms above to continue"}
            rows={3}
            disabled={chatDisabled}
            style={{ minHeight: '72px', opacity: disclaimerAccepted ? 1 : 0.5 }}
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
