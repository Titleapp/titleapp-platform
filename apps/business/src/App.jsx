import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import LandingPage from "./components/LandingPage";
import OnboardingWizard from "./components/OnboardingWizard";
import OnboardingTour from "./components/OnboardingTour";
import AppShell from "./components/AppShell";
import ChatPanel from "./components/ChatPanel";
import WorkspaceHub from "./components/WorkspaceHub";
import BuilderInterview from "./components/BuilderInterview";
import Dashboard from "./sections/Dashboard";
import Analyst from "./sections/Analyst";
import RulesResources from "./sections/RulesResources";
import Inventory from "./sections/Inventory";
import AIChats from "./sections/AIChats";
import Customers from "./sections/Customers";
import Appointments from "./sections/Appointments";
import Staff from "./sections/Staff";
import Reports from "./sections/Reports";
import DataAPIs from "./sections/DataAPIs";
import Settings from "./sections/Settings";
import FIProducts from "./sections/FIProducts";
import AutoService from "./sections/AutoService";
import SalesPipeline from "./sections/SalesPipeline";
import Rules from "./sections/Rules";
import MyVehicles from "./sections/MyVehicles";
import MyProperties from "./sections/MyProperties";
import MyDocuments from "./sections/MyDocuments";
import MyLogbook from "./sections/MyLogbook";
import MyCertifications from "./sections/MyCertifications";
import MyWallet from "./sections/MyWallet";
import Portfolio from "./sections/Portfolio";
import Research from "./sections/Research";
import ClientsLPs from "./sections/ClientsLPs";
import DealPipeline from "./sections/DealPipeline";
import VaultDocuments from "./sections/VaultDocuments";
import VaultAssets from "./sections/VaultAssets";
import VaultDeadlines from "./sections/VaultDeadlines";
import REListings from "./sections/REListings";
import REBuyers from "./sections/REBuyers";
import RETransactions from "./sections/RETransactions";
import REProperties from "./sections/REProperties";
import RETenants from "./sections/RETenants";
import REMaintenance from "./sections/REMaintenance";
import REMarketing from "./sections/REMarketing";
import WorkerPreview from "./sections/WorkerPreview";
import RAASStore from "./sections/RAASStore";
import CreatorDashboard from "./sections/CreatorDashboard";
import InvestorDataRoom from "./sections/InvestorDataRoom";
import InvestorCapTable from "./sections/InvestorCapTable";
import InvestorPipeline from "./sections/InvestorPipeline";
import VaultTools from "./sections/VaultTools";
import B2BAnalytics from "./sections/B2BAnalytics";
import PendingSignatures from "./sections/PendingSignatures";
import AlexPipelines from "./sections/AlexPipelines";
import AlexTaskBoard from "./sections/AlexTaskBoard";
import AlexWorkerStatus from "./sections/AlexWorkerStatus";
import DeveloperSandbox from "./pages/DeveloperSandbox";
import MarketplaceListing from "./pages/MarketplaceListing";
import CreatorApplication from "./pages/CreatorApplication";
import WorkerWaitlistPage from "./pages/WorkerWaitlistPage";
import WorkerMarketplace, { WORKER_ROUTES } from "./pages/WorkerMarketplace";
import WorkerDetailPage from "./pages/WorkerDetailPage";
import AutoLanding from "./pages/landing/AutoLanding";
import TitleEscrowLanding from "./pages/landing/TitleEscrowLanding";
import PropertyMgmtLanding from "./pages/landing/PropertyMgmtLanding";
import DeveloperLanding from "./pages/landing/DeveloperLanding";
import PilotLanding from "./pages/landing/PilotLanding";
import { auth } from "./firebase";
import { signInWithCustomToken } from "firebase/auth";

const WORKER_DETAIL_CONTENT = {
  "construction-manager": {
    headline: "Your digital construction office",
    subheadline: "Schedule, budget, RFIs, change orders — one place for everything happening on your jobsite.",
    steps: [
      { title: "Import your schedule and budget", description: "Get a live project dashboard with CSI MasterFormat budget tracking and CPM schedule management." },
      { title: "Log RFIs, change orders, and daily reports", description: "Everything tracked and connected — cost impacts, schedule impacts, approval workflows." },
      { title: "Get weekly status reports", description: "Budget variance, schedule analysis, open items — ready for your OAC meeting." },
      { title: "Workers talk to each other", description: "Your draw requests match your budget, your safety plan matches your schedule. One Vault." },
    ],
    bridge: {
      title: "The Bridge",
      text: "The Construction Manager is the hub. Your budget flows to the Draw Worker (W-023) so draw requests match reality. Your schedule connects to Safety (W-028) so high-risk phases get flagged automatically. Your change orders update the Construction Lending Worker (W-015) so your lender sees real-time exposure. No spreadsheet reconciliation. No email chains. One Vault.",
    },
    valueProps: [
      { label: "CSI MasterFormat budget tracking", description: "24-division budget with real-time variance analysis — know exactly where you stand." },
      { label: "RFI and change order management", description: "Track every RFI and CO with automatic cost and schedule impact analysis." },
      { label: "CPM schedule with critical path", description: "Identify delays before they happen. 3-week look-ahead generated automatically." },
      { label: "Vault-connected to every construction worker", description: "Budget, schedule, and progress data flows to draws, lending, safety, and procurement." },
    ],
    faq: [
      { q: "Does this replace my project management software?", a: "It complements it. Think of this as your AI project executive that reads your schedule and budget, flags issues, and connects your construction data to your financing, safety, and quality teams." },
      { q: "Can I import my existing schedule?", a: "Yes. Import CPM schedules and budgets in CSI MasterFormat. We're adding direct integrations with Procore, Buildertrend, and P6." },
      { q: "How does this connect to my lender?", a: "Your construction budget and progress data flows through the Vault to the Construction Draw Worker (W-023) and Construction Lending Worker (W-015). Your draw requests are automatically aligned to your budget — no more reconciliation spreadsheets." },
    ],
  },
  "construction-lending": {
    headline: "Construction loans that actually pencil",
    subheadline: "Compare terms, build draw schedules, track interest reserves — from permit to perm conversion.",
    steps: [
      { title: "Upload term sheets", description: "Instant side-by-side comparison with total cost of capital analysis for every lender option." },
      { title: "Loan closes, draw schedule built", description: "Draw schedule auto-generated from your construction budget. Interest reserve modeled month by month." },
      { title: "Draws flow through the Vault", description: "You see utilization, interest burn, and covenant status in real time as each draw is funded." },
      { title: "Maturity approaches", description: "Conversion checklist or refinance analysis ready. Every condition tracked with responsible parties and deadlines." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Your construction loan doesn't live in a spreadsheet. It lives in the same Vault as your construction budget, draw requests, and capital stack. When the GC reports a delay, your interest reserve model updates. When a draw is funded, your utilization dashboard updates. One source of truth.",
    },
    valueProps: [
      { label: "Side-by-side loan comparison", description: "Compare construction loan terms with total cost of capital analysis — know the real cost." },
      { label: "Interest reserve modeling", description: "Monthly accrual on increasing balance with delay and rate scenarios. Never run short." },
      { label: "Real-time utilization tracking", description: "Draws, remaining commitment, covenant status — all updated automatically." },
      { label: "Vault-connected to budget and draws", description: "Budget changes from W-021 and draw packages from W-023 flow through automatically." },
    ],
    faq: [
      { q: "Does this originate loans?", a: "No. This worker analyzes and compares construction loan terms, models interest reserves, and tracks utilization. It helps you evaluate lender options and manage the loan through construction." },
      { q: "How does the interest reserve model work?", a: "Interest on construction loans accrues on the drawn balance, which increases with each draw. We model the 'hockey stick' curve precisely — showing monthly interest on the increasing balance with base, delay, and rate increase scenarios." },
      { q: "Can the builder see my loan status?", a: "Only what you share through the Vault. The builder's Construction Manager (W-021) writes budget and schedule data that you consume. Draw packages from W-023 flow to you for review. You control visibility." },
    ],
  },
  "construction-draws": {
    headline: "Draw requests that get funded the first time",
    subheadline: "G702/G703 packages, lien waiver tracking, retainage management — no more draw delays.",
    steps: [
      { title: "Sub pay apps come in", description: "Subcontractor pay applications are automatically mapped to your schedule of values." },
      { title: "Lien waivers tracked", description: "Every sub, every draw — conditional and unconditional waivers tracked so nothing falls through." },
      { title: "G702/G703 generated", description: "AIA-standard draw packages generated with full backup documentation for lender submission." },
      { title: "Draw funded, budget updated", description: "When the lender funds, the budget reconciles automatically through the Vault." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Your construction budget (W-021) and your construction loan (W-015) share a single source of truth. When the GC updates progress, the draw aligns. When the lender funds, the budget updates. No spreadsheet reconciliation. No email chains. One Vault.",
    },
    valueProps: [
      { label: "AIA G702/G703 packages", description: "Generates standard draw packages automatically — save hours per draw period." },
      { label: "Lien waiver compliance", description: "Tracks every conditional and unconditional waiver across every sub and every draw." },
      { label: "Real-time reconciliation", description: "Draws reconciled against budget instantly — know where you stand before the lender asks." },
      { label: "Vault-connected", description: "Your construction lender sees the same numbers through the shared Vault. Faster funding." },
    ],
    faq: [
      { q: "Does this work with my lender's specific draw format?", a: "We generate standard AIA G702/G703 by default, which is accepted by most construction lenders. You can also configure lender-specific requirements in your company settings." },
      { q: "How does the lien waiver tracking work?", a: "We maintain a matrix for every subcontractor across every draw. Conditional waivers are required before billing is included. Unconditional waivers are tracked for the prior draw. Missing waivers are flagged automatically and can block billing." },
      { q: "Can the investor see draw status?", a: "Yes — if the investor is on TitleApp with the Construction Lending worker (W-015), draw data flows through the shared Vault. The GC submits, the investor reviews. Same numbers, same platform." },
    ],
  },
  "capital-stack-optimizer": {
    headline: "Build the capital stack that maximizes your returns",
    subheadline: "Optimal debt/equity mix, LP/GP waterfall, sensitivity analysis — one model for every deal.",
    steps: [
      { title: "Define your deal", description: "Enter project cost, uses, and assumptions. The optimizer builds your sources & uses and identifies the capital gap." },
      { title: "Stack your capital", description: "Add senior debt, mezz, preferred equity, tax credits — each layer with its cost, terms, and priority. WACC calculated automatically." },
      { title: "Model the waterfall", description: "Configure promote tiers, preferred return, and residual splits. See LP and GP returns at every tier." },
      { title: "Run scenarios", description: "Base, upside, downside — each with full pro forma, waterfall, and return metrics. Sensitivity matrices identify break-even assumptions." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Your capital stack isn't a spreadsheet — it's connected to every financing worker in the Vault. When Construction Lending (W-015) closes a loan, your senior debt layer updates automatically. When the CRE Analyst (W-002) updates underwriting, your pro forma adjusts. When tax credits from W-017 are confirmed, your equity requirement drops. One model, always current.",
    },
    valueProps: [
      { label: "WACC optimization", description: "Weighted average cost of capital calculated across all layers. See exactly how each capital source affects your blended cost." },
      { label: "LP/GP waterfall modeling", description: "Configurable promote tiers with preferred return, catch-up, and residual splits. LP and GP returns modeled separately." },
      { label: "Multi-scenario sensitivity", description: "Exit cap, rent growth, vacancy, rate changes — two-variable matrices show IRR and equity multiple at every intersection." },
      { label: "Vault-connected to all financing workers", description: "Debt terms, tax credits, and deal data flow in automatically. Your capital stack stays current without manual updates." },
    ],
    faq: [
      { q: "Does this replace my Excel model?", a: "It's designed to. The full model generates a 10-tab XLSX with assumptions, sources & uses, capital stack, pro forma, debt service, waterfall, returns, sensitivity, and scenarios — the same structure as your existing spreadsheet, but connected to live deal data." },
      { q: "Can I generate investor materials?", a: "Yes. The investor slides template creates a 5-slide PPTX with stack overview, sources & uses, return metrics, sensitivity, and risk factors. Ready for your LP presentation." },
      { q: "How does the waterfall work?", a: "You define the promote structure — preferred return, catch-up split, residual tiers. The optimizer models both operating cash flow and disposition waterfall, showing cumulative distributions to LP and GP at every tier." },
    ],
  },
  "cre-analyst": {
    headline: "Screen deals with evidence, not hunches",
    subheadline: "Every number cited. Every assumption tracked. Every risk flagged. IC memos your committee will actually trust.",
    steps: [
      { title: "Upload your deal docs", description: "Rent roll, T-12, offering memo, pitch deck — the analyst reads everything and extracts the numbers." },
      { title: "Get an instant deal screen", description: "Cap rate, DSCR, LTV, IRR — every metric calculated and evidence-cited back to the source document and page." },
      { title: "Review risks and assumptions", description: "Risk summary with gating failures, missing documents, and approval conditions. Assumptions register with sensitivity ratings." },
      { title: "Generate the IC memo", description: "One-click Investment Committee memo with deal summary, thesis, metrics, risks, and recommendation — ready for your committee." },
    ],
    bridge: {
      title: "The Bridge",
      text: "The CRE Analyst doesn't just screen deals — it feeds the rest of your workflow. When a deal passes screening, the Capital Stack Optimizer (W-016) picks up the underwriting to structure financing. The Investor Relations Worker (W-019) uses the deal summary for your offering materials. One Vault, one source of truth.",
    },
    valueProps: [
      { label: "Evidence-first analysis", description: "Every numeric claim cites its source — file, page, section. No unsupported numbers. Ever." },
      { label: "Six deal screen types", description: "CRE acquisition, PE, debt acquisition, entitlement, conversion, and refinance — each with domain-specific rules." },
      { label: "Assumptions register", description: "Every assumption tracked with source, sensitivity rating, and notes. Know exactly where your model is vulnerable." },
      { label: "Vault-connected to financing workers", description: "Deal data flows to Capital Stack Optimizer, Construction Lending, and Investor Relations automatically." },
    ],
    faq: [
      { q: "What does evidence-first mean?", a: "Every number in your IC memo — rent, NOI, cap rate, IRR, DSCR — must cite a source. Either an uploaded document (file + page), an integration record, or explicit user input. If evidence is missing, the field is marked UNKNOWN. The analyst never guesses." },
      { q: "What deal types can it screen?", a: "Six types: CRE acquisition (rent roll + T-12), private equity (pitch deck + financials), debt acquisition (note terms + collateral), entitlement (site plan + zoning), conversion (existing use + capex budget), and refinance (current loan + property financials)." },
      { q: "Does this replace my analyst?", a: "It augments them. The worker handles the data extraction, metric calculation, and evidence tracking — the work that takes your analyst hours. Your team focuses on judgment, negotiation, and relationships." },
    ],
  },
  "investor-relations": {
    headline: "Raise capital with compliance built in",
    subheadline: "Accreditation, waterfall distributions, quarterly reports, capital calls — investor relations that actually scales.",
    steps: [
      { title: "Set up your offering", description: "Configure your regulation type (506b, 506c, Reg A, Reg CF), fund terms, and waterfall structure. Compliance rules activate automatically." },
      { title: "Manage your investor pipeline", description: "Track investors from prospect to committed capital. Accreditation verification, subscription agreements, and closing checklists." },
      { title: "Model your waterfall", description: "Four-tier waterfall: return of capital, preferred return, GP catch-up, carried interest. Individual investor allocations calculated automatically." },
      { title: "Report to your LPs", description: "Quarterly reports, capital call notices, distribution notices — generated from your actual deal data, not a separate spreadsheet." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Your investor relations worker reads deal data from the CRE Analyst (W-002) and capital stack from the Optimizer (W-016). When you syndicate a construction deal, the Construction Draw Worker (W-023) feeds draw progress into your investor updates. Your LPs see real performance, not stale spreadsheets.",
    },
    valueProps: [
      { label: "Securities compliance automation", description: "Reg D, Reg A, Reg CF rules enforced automatically. Accreditation tracking with expiration alerts." },
      { label: "Waterfall distribution modeling", description: "Four-tier waterfall with configurable terms. LP and GP returns modeled separately with individual allocations." },
      { label: "Quarterly LP reporting", description: "Portfolio summary, deal updates, financial performance, distributions — generated from live deal data." },
      { label: "Vault-connected to deal workers", description: "Underwriting from CRE Analyst, capital structure from Optimizer, and construction progress from Draw Worker flow in automatically." },
    ],
    faq: [
      { q: "Does this handle accreditation verification?", a: "Yes. Three methods: self-attestation (506b only), third-party verification with CPA/attorney letter (506c required), and entity verification with look-through. Status lifecycle tracked with 90-day expiration on third-party letters." },
      { q: "What waterfall structures are supported?", a: "The standard four-tier structure: return of capital, preferred return, GP catch-up, and carried interest split. All terms are configurable — preferred return rate, catch-up split, carry percentage, and hurdle rate." },
      { q: "Is this a broker-dealer?", a: "No. This worker provides tools for organizing and tracking investor relations activities. It does not offer, sell, or solicit securities. Consult qualified securities counsel for compliance guidance." },
    ],
  },
  "chief-of-staff": {
    headline: "One AI to coordinate them all",
    subheadline: "Alex manages your workers, plans pipelines, tracks tasks, and keeps everything moving. Free with 3+ workers.",
    steps: [
      { title: "Tell Alex what you need", description: "Describe your goal — Alex figures out which workers to involve and in what order." },
      { title: "Alex builds the pipeline", description: "Multi-worker workflows planned automatically. CRE Analyst screens, Optimizer structures, IR prepares the offering." },
      { title: "Track progress across workers", description: "One dashboard showing every task, every document, every decision — across all your workers." },
      { title: "Alex handles the handoffs", description: "When one worker finishes, Alex passes the data to the next with a structured handoff memo. You approve each step." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Alex is the connective tissue. Without Alex, your workers are independent tools. With Alex, they're a coordinated team. Your CRE Analyst screens a deal, Alex routes it to the Capital Stack Optimizer, then to Investor Relations for the offering — each step tracked, each handoff documented.",
    },
    valueProps: [
      { label: "Intelligent routing", description: "Alex knows every worker's capabilities and routes requests to the right specialist automatically." },
      { label: "Pipeline management", description: "Multi-step workflows across workers — planned, tracked, and executed with approval gates at every step." },
      { label: "Cross-worker task tracking", description: "One task list showing work across every worker — with owners, priorities, dependencies, and due dates." },
      { label: "Structured handoffs", description: "When data moves between workers, Alex creates a handoff memo documenting context, data passed, and expected outputs." },
    ],
    faq: [
      { q: "How do I get Alex?", a: "Alex is free and unlocks automatically when you subscribe to 3 or more Digital Workers. No additional cost." },
      { q: "Can Alex override a worker's rules?", a: "Never. If a specialist worker blocks an action (hard stop), Alex respects it. Alex coordinates — Alex doesn't override compliance." },
      { q: "Does Alex do analysis?", a: "No. Alex routes to specialists. Alex never generates IC memos, underwriting, compliance checklists, or financial models — those are specialist domains. Alex tracks, coordinates, and reports." },
    ],
  },
  "bid-procurement": {
    headline: "The right sub at the right price",
    subheadline: "Bid packages, comparison matrices, sub qualifications, and award recommendations — your procurement department in a worker.",
    steps: [
      { title: "Prepare bid packages by CSI division", description: "Scopes pulled from your budget, organized by trade, with schedule requirements and bid instructions." },
      { title: "Manage the solicitation process", description: "Track every bidder: invited, acknowledged, submitted, declined. Never lose track of who's bidding what." },
      { title: "Compare bids side by side", description: "Automated comparison matrix: base bid, alternates, exclusions, qualifications. Anomalies flagged automatically." },
      { title: "Get award recommendations", description: "Data-driven recommendation memos with rationale, risk factors, and negotiation points ready for your review." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Bid & Procurement reads your budget from the Construction Manager (W-021) and writes winning bid data back. Your committed costs update automatically. Insurance requirements flow to the Insurance & Risk Worker (W-025). Subcontract terms feed the Legal Worker (W-045).",
    },
    valueProps: [
      { label: "Anti-bid-shopping protection", description: "Hard stop: the system will never share one sub's pricing with another. Built-in ethical guardrails." },
      { label: "Bid anomaly detection", description: "Flags outliers more than 15% above or below median. Too low means scope gap. Too high means negotiate." },
      { label: "Subcontractor qualification review", description: "License verification, insurance compliance, EMR rating, bonding capacity, and references — all in one report." },
      { label: "Davis-Bacon and prevailing wage tracking", description: "Automatically flags when your project is subject to prevailing wage and ensures bids include required rates." },
    ],
    faq: [
      { q: "Does this replace my estimating software?", a: "No. This manages the bidding process after your budget is set. It takes your Construction Manager's budget by CSI division and prepares bid packages, manages solicitation, and compares responses." },
      { q: "How does the anti-bid-shopping protection work?", a: "It's a hard stop in the RAAS engine. The system physically cannot share one subcontractor's pricing with another. This protects your reputation and your subs' trust." },
      { q: "Can I track MBE/WBE/DBE participation?", a: "Yes. Set your participation goals and the system flags when your bid slate doesn't meet diversity set-asides. Tracked per division and project-wide." },
    ],
  },
  "insurance-risk": {
    headline: "Never miss an expired certificate again",
    subheadline: "COI tracking, insurance matrices, risk exposure analysis, and lender compliance — your insurance department in a worker.",
    steps: [
      { title: "Review COIs for compliance", description: "Parse certificates of insurance, check coverage types, limits, dates, and endorsements against your requirements." },
      { title: "Maintain the insurance matrix", description: "Master matrix for all subs: green, yellow, or red status at a glance. Know who's compliant and who's not." },
      { title: "Track expirations before they expire", description: "Alerts before expiration dates. Escalation if no renewal received. Never let a sub work with expired coverage." },
      { title: "Generate lender compliance reports", description: "Insurance compliance reports formatted to your lender's specific requirements, ready for draw submissions." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Insurance & Risk reads your subcontractor registry from Bid & Procurement (W-022), your budget from the Construction Manager (W-021), and lien waiver status from Construction Draw (W-023). Coverage gaps escalate to your Chief of Staff. Incidents with claim potential route to Legal (W-045).",
    },
    valueProps: [
      { label: "Workers comp tracking with zero tolerance", description: "Every sub must carry statutory workers comp. No exceptions. Missing WC is an immediate hard stop." },
      { label: "Additional insured and waiver tracking", description: "Track that your GC is named additional insured on every sub's GL. Monitor waiver of subrogation endorsements." },
      { label: "Builder's risk adequacy analysis", description: "Track the project-wide builder's risk policy: who carries it, coverage amount, deductible, named perils vs all-risk." },
      { label: "OCIP/CCIP program management", description: "Track whether your project uses an owner or contractor-controlled insurance program and manage accordingly." },
    ],
    faq: [
      { q: "Does this review actual COI documents?", a: "Yes. Upload COIs and the worker parses coverage types, limits, dates, and endorsements, then checks them against your project requirements and flags deficiencies." },
      { q: "How does expiration tracking work?", a: "The system alerts you before certificates expire and escalates if no renewal is received. If a sub won't renew, it triggers a stop-work referral to your Construction Manager." },
      { q: "Can it handle lender-specific requirements?", a: "Yes. Each lender has different insurance requirements. The worker generates compliance reports formatted to your specific lender's needs for draw submissions." },
    ],
  },
  "quality-control": {
    headline: "Pass inspections the first time",
    subheadline: "Inspection scheduling, deficiency tracking, trade checklists, and CO tracking — your quality department in a worker.",
    steps: [
      { title: "Schedule and sequence inspections", description: "Municipal, third-party, and internal inspections. Track prerequisites — can't call framing until foundation passes." },
      { title: "Track results and deficiencies", description: "Pass, fail, or conditional. Every deficiency logged with description, location, responsible sub, severity, and deadline." },
      { title: "Self-verify with trade checklists", description: "Pre-inspection checklists by trade so your team catches issues before the inspector arrives." },
      { title: "Track everything needed for CO", description: "Certificate of Occupancy requirements: all inspections passed, fire alarm, elevator cert, utilities, as-builts, O&M manuals." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Quality Control reads your schedule from the Construction Manager (W-021) and permit status from the Permit Worker (W-012). Passed inspections clear draw requirements for the Construction Draw Worker (W-023). All inspections complete triggers conversion readiness for Construction Lending (W-015). CO issued signals the Lease-Up Worker (W-031) to begin.",
    },
    valueProps: [
      { label: "IBC/IRC inspection sequencing", description: "Foundation, framing, MEP rough-in, insulation, final — the system tracks the required sequence and won't let you skip ahead." },
      { label: "Special inspections tracking", description: "Structural steel, concrete, fireproofing, spray insulation — track ICC-certified inspectors and flag missing reports." },
      { label: "Accessibility and fire/life safety", description: "ADA/FHA inspections, fire marshal, fire alarm acceptance, sprinkler commissioning — all tracked in one place." },
      { label: "Lender inspection support", description: "Inspection summaries formatted for draw support, sent to your Construction Draw Worker automatically." },
    ],
    faq: [
      { q: "Does this replace the building inspector?", a: "No. This helps you prepare for inspections, track results, manage deficiencies, and ensure nothing falls through the cracks. The actual inspections are still performed by qualified inspectors." },
      { q: "How do trade checklists work?", a: "Before calling for a formal inspection, your team runs through a trade-specific checklist to self-verify. This catches common issues that cause failed inspections and saves everyone time." },
      { q: "Can it track multiple projects?", a: "Yes. Each project has its own inspection schedule, deficiency log, and CO tracker. The worker manages them independently." },
    ],
  },
  "safety-osha": {
    headline: "Keep your site safe and your OSHA logs clean",
    subheadline: "Safety plans, OSHA compliance, training tracking, incident logging, and metrics — your safety department in a worker.",
    steps: [
      { title: "Generate a site-specific safety plan", description: "Hazard assessment, PPE requirements, emergency procedures, hospital routes, competent person designations — all from your project scope." },
      { title: "Maintain OSHA logs and calculate metrics", description: "Forms 300, 300A, and 301 maintained automatically. TRIR, DART, and EMR calculated and tracked against industry averages." },
      { title: "Track training and certifications", description: "OSHA 10/30, competent person certs, operator certs, first aid/CPR, hazmat. Alerts before expiration." },
      { title: "Log incidents and manage toolbox talks", description: "Structured incident reports with root cause analysis. Weekly toolbox talks with topic suggestions based on current activities." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Safety & OSHA reads your schedule from the Construction Manager (W-021) and labor roster from Labor & Staffing (W-024). Recordable incidents route to Insurance & Risk (W-025). OSHA citation risk escalates to Legal (W-045). Sub safety violations trigger corrective action through the Construction Manager. EMR exceeding thresholds flags for Bid & Procurement (W-022).",
    },
    valueProps: [
      { label: "Multi-employer doctrine protection", description: "OSHA can cite the GC for sub violations. The system tracks sub compliance as your liability and flags issues before they become citations." },
      { label: "Competent person tracking", description: "Excavation, scaffolding, fall protection, confined space, crane operations — track every competent person designation and training documentation." },
      { label: "TRIR and DART rate monitoring", description: "Your total recordable incident rate and days away/restricted/transferred rate, calculated automatically and compared to industry benchmarks." },
      { label: "Job Hazard Analysis by activity", description: "Structured JHA documents: identify hazards, assess risk (probability times severity), and define controls for every major activity." },
    ],
    faq: [
      { q: "Does this replace a safety officer?", a: "No. This is your safety officer's best tool. It handles the documentation, tracking, and compliance management so your safety team can focus on being present on the jobsite." },
      { q: "How does it handle OSHA 300 log requirements?", a: "The system maintains Forms 300, 300A, and 301 per 29 CFR 1904. It reminds you to post 300A from February 1 through April 30 annually. All recordability determinations are documented." },
      { q: "Can subs use this too?", a: "The worker tracks safety for the entire project including all subs. Sub-specific violations, training records, and safety metrics are tracked separately and rolled up into project totals." },
    ],
  },
  "mep-coordination": {
    headline: "No more surprises in the ceiling",
    subheadline: "Clash detection, coordination meetings, submittal tracking, and commissioning — your MEP coordinator in a worker.",
    steps: [
      { title: "Track clashes from BIM or field", description: "Log every clash: location, systems involved, severity, responsible trade, resolution plan, and status. Nothing falls through the cracks." },
      { title: "Run coordination meetings", description: "Agendas, attendees, action items, and follow-up tracking. Every meeting documented, every action item assigned and tracked." },
      { title: "Manage MEP submittals", description: "Submitted, reviewed, approved, rejected, resubmit. Flag long-lead items before they become schedule problems." },
      { title: "Track commissioning requirements", description: "Functional performance testing, TAB, controls verification, and documentation. Know exactly what's needed for final sign-off." },
    ],
    bridge: {
      title: "The Bridge",
      text: "MEP Coordination reads your schedule and RFI log from the Construction Manager (W-021). Unresolved clashes older than 14 days escalate as schedule risks. Rejected submittals flag procurement impact for Bid & Procurement (W-022). Commissioning complete signals inspection readiness to Quality Control (W-027). Design conflicts route to Engineering Review (W-006).",
    },
    valueProps: [
      { label: "Code clearance tracking", description: "NEC 110.26 electrical panel access, mechanical service access, plumbing cleanout access, sprinkler head clearances — all tracked and enforced." },
      { label: "Fire-rated penetration management", description: "Every MEP penetration through a fire-rated assembly requires documented firestopping. The system tracks every penetration and its firestop status." },
      { label: "Ceiling space allocation", description: "Track the plenum: ductwork, piping, conduit, sprinkler, structure. Flag conflicts before they become field problems." },
      { label: "Seismic bracing compliance", description: "In seismic zones, track bracing requirements for mechanical equipment, ductwork, piping, and conduit per ASCE 7 and IBC." },
    ],
    faq: [
      { q: "Does this require BIM?", a: "No. The worker tracks clashes from both BIM coordination and field observations. If you have BIM, great — the clash log integrates with your model. If not, field-identified conflicts are tracked the same way." },
      { q: "How does this differ from general RFI management?", a: "MEP RFIs are tracked separately from general construction RFIs for trade coordination clarity. This prevents MEP-specific technical issues from getting lost in the general RFI queue." },
      { q: "What commissioning requirements does it track?", a: "Functional performance testing, testing and balancing (TAB), controls verification, and all required documentation. It tracks what's needed for each system and flags incomplete items." },
    ],
  },
  "labor-staffing": {
    headline: "Right crews, right certifications, right time",
    subheadline: "Certified payroll, prevailing wage compliance, workforce tracking, diversity reporting, and crew scheduling — your labor department in a worker.",
    steps: [
      { title: "Track your workforce", description: "Every worker on site: employer, trade classification, hours, certifications. Daily headcount reporting across all trades." },
      { title: "Generate certified payroll", description: "WH-347 certified payroll from time records. Rates validated against prevailing wage determinations. Underpayments flagged automatically." },
      { title: "Manage certifications", description: "OSHA 10/30, equipment operator, welding, crane signaler — all tracked with expiration alerts so nobody works without valid certs." },
      { title: "Report on diversity goals", description: "MBE/WBE/DBE/Section 3 participation tracked against project goals. Know where you stand before the report is due." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Labor & Staffing reads your construction schedule from W-021 to anticipate crew needs. Certified payroll data flows to the Draw Worker (W-023) for draw support. Certification gaps alert Safety (W-028). Prevailing wage violations route to Legal (W-045). Payroll data feeds Accounting (W-039).",
    },
    valueProps: [
      { label: "Davis-Bacon Act compliance", description: "Prevailing wage rates by classification and county. Weekly WH-347 submissions. Underpayments flagged before they become violations." },
      { label: "Apprenticeship ratio tracking", description: "Track apprentice-to-journeyman ratios per trade. Essential for IRA energy credit bonus compliance." },
      { label: "Worker misclassification prevention", description: "IRS 20-factor test and state ABC test analysis. Flag misclassification risk before it becomes a penalty." },
      { label: "Vault-connected to schedule and safety", description: "Crew needs from your schedule, certification requirements from safety — all synchronized through the Vault." },
    ],
    faq: [
      { q: "Does this replace my payroll software?", a: "No. This generates certified payroll reports (WH-347) for prevailing wage compliance and tracks workforce data. Your actual payroll processing stays with your payroll provider." },
      { q: "How does the prevailing wage check work?", a: "You specify the wage determination number for your project. The worker validates every worker's classification and rate against the determination and flags any underpayments." },
      { q: "Is E-Verify tracking included?", a: "Yes. For projects that require it (federal contractors, certain state/local projects), the worker tracks I-9 completion and E-Verify status for every worker on site." },
    ],
  },
  "materials-supply-chain": {
    headline: "No material delays. No surprise costs.",
    subheadline: "Procurement scheduling, long-lead tracking, price escalation, stored materials documentation, and substitution management.",
    steps: [
      { title: "Generate the procurement schedule", description: "From your construction schedule and specs, every material gets an order date, lead time, delivery date, and installation date." },
      { title: "Track long-lead items", description: "Structural steel, elevators, switchgear, generators — items with 12+ week lead times that drive your schedule. Tracked obsessively." },
      { title: "Monitor price escalation", description: "Budget vs actual costs. Tariff impacts. Escalation trends. Know when material costs are eating your contingency." },
      { title: "Package stored materials for draws", description: "Paid invoices, delivery receipts, photos, insurance — everything your lender needs to fund stored materials in your draw." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Materials reads your construction schedule from W-021 for need dates and your bid results from W-022 for material allowances. Late deliveries alert W-021. Price escalation impacts update W-016 capital stack. Stored materials packages flow to W-023 for draw requests. Buy America issues route to Compliance (W-047).",
    },
    valueProps: [
      { label: "Buy America / Buy American compliance", description: "For federally funded projects: iron, steel, and manufactured products must be domestic. Non-compliant materials flagged automatically." },
      { label: "Tariff impact modeling", description: "Active tariffs on steel, aluminum, lumber, and equipment tracked and modeled against your budget." },
      { label: "Substitution management", description: "Every substitution tracked: original spec, proposed substitute, cost impact, code implications, architect approval status." },
      { label: "Vault-connected to schedule and draws", description: "Need dates from your schedule, material costs for your draws — all synchronized through the Vault." },
    ],
    faq: [
      { q: "What qualifies as a long-lead item?", a: "Anything with a lead time exceeding your configured threshold (default: 12 weeks). Typically: structural steel, elevators, switchgear, generators, custom curtainwall, and specialty mechanical equipment." },
      { q: "How does stored materials tracking work?", a: "When materials are stored on or off site before installation, your lender needs documentation to fund them in a draw. The worker compiles paid invoices, delivery receipts, photos, and insurance certificates into a draw-ready package." },
      { q: "Can it track tariff changes?", a: "Yes. The worker monitors tariff rates on common construction materials and models the cost impact against your budget. When tariffs change, you see the budget impact immediately." },
    ],
  },
  "mezzanine-preferred-equity": {
    headline: "Fill the gap between your debt and your equity",
    subheadline: "Structure comparison, waterfall modeling, intercreditor tracking, and investor reporting for subordinate capital positions.",
    steps: [
      { title: "Identify the capital gap", description: "From your capital stack, see exactly how much subordinate capital you need between senior debt and sponsor equity." },
      { title: "Compare structures", description: "Mezz debt vs preferred equity vs JV equity — side by side. Cost of capital, control rights, tax treatment, and foreclosure remedies." },
      { title: "Model the waterfall", description: "Preferred returns, return of capital, promote splits, catch-up provisions, IRR hurdles — every tier modeled with multiple scenarios." },
      { title: "Track and report", description: "Intercreditor requirements, investor distributions, covenant compliance, and periodic reporting — all managed in one place." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Mezz & Pref Equity reads the capital gap from the Capital Stack Optimizer (W-016) and senior debt terms from Construction Lending (W-013). Changes to subordinate capital flow back to W-016 to recalculate the stack. Securities compliance needs route to Legal (W-045). Investor reporting connects to IR (W-019).",
    },
    valueProps: [
      { label: "Mezz vs pref equity comparison", description: "Interest deduction vs partnership allocation. UCC foreclosure vs equity remedies. Every structural difference laid out clearly." },
      { label: "Multi-scenario waterfall modeling", description: "Preferred returns (current pay vs accrued), promote tiers, catch-up provisions, clawback — model every permutation." },
      { label: "Intercreditor tracking", description: "Standstill periods, cure rights, purchase options, default triggers — every senior/mezz lender requirement tracked." },
      { label: "ERISA and usury protection", description: "Pension fund capital flagged for plan asset rules. Blended rates checked against state usury limits. Hard stops built in." },
    ],
    faq: [
      { q: "What's the difference between mezz and pref equity?", a: "Mezzanine debt is a loan secured by ownership interests (UCC perfection). Preferred equity is an equity position with priority returns. They have different cost, tax treatment, control rights, and foreclosure remedies." },
      { q: "Does this structure the offering?", a: "This worker analyzes and models structures. For securities compliance — PPM drafting, accreditation verification, and offering execution — it triggers a referral to the Crowdfunding & Reg D Worker (W-018) or Legal (W-045)." },
      { q: "How does it connect to my capital stack?", a: "Your gap amount comes from the Capital Stack Optimizer (W-016). When you add or modify a mezz/pref equity position, the change flows back to W-016 and your entire capital stack recalculates automatically." },
    ],
  },
  "crowdfunding-regd": {
    headline: "Raise capital legally from the crowd",
    subheadline: "Exemption analysis, investor qualification, subscription management, compliance calendars, and cap table tracking.",
    steps: [
      { title: "Choose your exemption", description: "From your raise amount, investor type, and marketing plans — get a recommendation: 506(b), 506(c), Reg CF, or Reg A/A+." },
      { title: "Qualify your investors", description: "Track accredited status, verification method, subscription amount, and investment limits. Every investor documented." },
      { title: "Manage subscriptions", description: "PPM delivery, subscription agreement execution, operating agreement, wire receipt, countersignature — every step tracked." },
      { title: "Stay compliant", description: "Form D filing deadlines, Blue Sky filings, ongoing reporting, K-1 preparation support — nothing slips through." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Crowdfunding reads the equity raise amount from the Capital Stack Optimizer (W-016) and project details from the CRE Analyst (W-002). Capital raised updates W-016 automatically. PPM and legal docs route to Legal (W-045). Investor distributions connect to W-051. K-1 preparation flows to Tax (W-040).",
    },
    valueProps: [
      { label: "506(c) verification enforcement", description: "Hard stop: no investment accepted without completed accredited investor verification. Third-party letters, tax returns, or CPA verification required." },
      { label: "Anti-fraud protection", description: "All offering materials checked for guarantees, omitted risks, and misleading language. Section 10(b) and Rule 10b-5 compliance enforced." },
      { label: "Bad actor screening", description: "Rule 506(d) disqualification check for all covered persons — officers, directors, 20%+ owners, and promoters — before first sale." },
      { label: "Multi-exemption support", description: "506(b), 506(c), Reg CF ($5M), and Reg A/A+ ($75M) — each with its own compliance rules, filing requirements, and investor limits." },
    ],
    faq: [
      { q: "Is this a broker-dealer or funding portal?", a: "No. This worker provides tools for organizing and tracking capital raising activities. It does not offer, sell, or solicit securities. All offerings require qualified securities counsel." },
      { q: "What's the difference between 506(b) and 506(c)?", a: "506(b): unlimited raise, up to 35 non-accredited investors, no general solicitation. 506(c): unlimited raise, general solicitation permitted, but ALL investors must be accredited with reasonable verification." },
      { q: "How does Reg CF work?", a: "Up to $5M in 12 months through a registered funding portal. The worker tracks investor limits, Form C filing, and annual reporting, but the actual offering runs through a registered portal (Wefunder, Republic, etc.)." },
    ],
  },
  "site-due-diligence": {
    headline: "Know what you're buying before you buy it",
    subheadline: "Environmental, survey, zoning, utilities, and geotechnical — complete due diligence management with a go/no-go summary.",
    steps: [
      { title: "Generate your DD checklist", description: "From your project type and location, get a comprehensive checklist of every study, report, and approval you need." },
      { title: "Track every report", description: "Ordered, in progress, draft received, final — every report tracked against your DD period deadline. Overdue items flagged." },
      { title: "Analyze environmental findings", description: "Phase I ESA parsed: RECs, CRECs, HRECs, de minimis conditions. Phase II recommended where warranted." },
      { title: "Get the go/no-go summary", description: "All findings, risk items, cost implications, and timeline impacts in one report. Everything your IC needs to decide." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Site Due Diligence reads project scope from the CRE Analyst (W-002). Environmental issues route to W-007. Zoning gaps trigger Land Use & Entitlement (W-004). Survey exceptions go to Title & Escrow (W-044). DD complete with a go decision unlocks the Capital Stack Optimizer (W-016).",
    },
    valueProps: [
      { label: "CERCLA innocent landowner defense", description: "Phase I ESAs tracked against ASTM E1527-21 standard. All Appropriate Inquiries documented to preserve your defense." },
      { label: "ALTA survey analysis", description: "Easements, encroachments, setback violations, access issues, and utility locations — cross-referenced with title commitment exceptions." },
      { label: "FEMA flood zone tracking", description: "Zone A, AE, X — flood zone determination tracked with floodplain development permit and insurance requirements." },
      { label: "Utility capacity assessment", description: "Water, sewer, electric, gas, telecom, stormwater — availability, capacity constraints, connection fees, and infrastructure needs." },
    ],
    faq: [
      { q: "Does this replace my environmental consultant?", a: "No. Phase I and Phase II ESAs must be conducted by qualified environmental professionals. This worker manages the process, tracks reports, and analyzes findings — but the actual assessments are performed by your consultants." },
      { q: "How does it handle different project types?", a: "The DD checklist adjusts based on project type: acquisition, ground-up development, renovation, and portfolio transactions each have different requirements and the checklist reflects that." },
      { q: "What happens if RECs are found?", a: "Recognized Environmental Conditions trigger a hard stop: the worker flags the environmental liability and recommends Phase II investigation. It never recommends closing on a site with unresolved RECs." },
    ],
  },
  "land-use-entitlement": {
    headline: "Get your approvals before you break ground",
    subheadline: "Zoning analysis, application preparation, hearing management, timeline tracking, and condition compliance.",
    steps: [
      { title: "Analyze the zoning gap", description: "Current zoning vs proposed use. Identify what you need: by-right, variance, special use, rezoning, or PUD." },
      { title: "Prepare your applications", description: "Narratives, supporting documents, site plan requirements, and submission checklists for every required approval." },
      { title: "Prepare for hearings", description: "Project description, compliance analysis, community benefits, response to anticipated objections — ready for planning commission." },
      { title: "Track conditions and timelines", description: "Every condition of approval logged, classified, and tracked. Pre-construction, during construction, and ongoing. Nothing forgotten." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Land Use reads DD findings from Site Due Diligence (W-003) and design plans from Architecture (W-005). Entitlement approved unlocks the Permit Worker (W-012). Conditions that affect design route to Architecture and Engineering. Timeline impacts feed back to the CRE Analyst (W-002) for feasibility reassessment.",
    },
    valueProps: [
      { label: "Zoning compliance analysis", description: "Permitted uses, density, height, setbacks, FAR, lot coverage, parking ratios — every requirement checked against your proposed use." },
      { label: "Public notice tracking", description: "Statutory notice requirements for every hearing: publication, mailing, posting. Failure to meet notice requirements voids approvals." },
      { label: "Vested rights monitoring", description: "Track when your development rights vest — varies by jurisdiction. Critical for protecting your project from zoning changes." },
      { label: "Takings / exactions analysis", description: "Conditions of approval checked against Nollan/Dolan limits. Flag conditions that may constitute regulatory takings." },
    ],
    faq: [
      { q: "Does this replace my land use attorney?", a: "No. This worker manages the entitlement process — analysis, preparation, tracking. Legal strategy, representation at hearings, and appeals require your land use attorney." },
      { q: "How long do entitlements typically take?", a: "It depends on the jurisdiction and type of approval. The worker models timelines based on typical review periods for your jurisdiction and tracks every step from pre-application through appeal periods." },
      { q: "What about community opposition?", a: "The worker tracks public comments, categorizes themes, and prepares responses. Your community engagement strategy (proactive, reactive, or minimal) is configurable in Tier 2 settings." },
    ],
  },
  "permit-submission": {
    headline: "Every permit tracked. Every resubmission handled.",
    subheadline: "Requirements analysis, submission tracking, plan check management, fee tracking, and timeline modeling for every permit type.",
    steps: [
      { title: "Identify required permits", description: "From your project scope, get every permit you need: building, grading, demolition, MEP, fire, stormwater — with fees and timelines." },
      { title: "Track submissions and reviews", description: "Application date, plan check round, corrections received, resubmission date, approval — every permit tracked through the entire lifecycle." },
      { title: "Manage plan check comments", description: "Comments parsed by discipline, assigned to responsible professionals, response status tracked. Nothing falls through the cracks." },
      { title: "Model your permitting timeline", description: "Based on jurisdiction typical review times and correction rounds, know when your permits will actually be issued." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Permit Submission reads entitlement status from W-004 and design documents from W-005/W-006. Permits issued unlocks the Construction Manager (W-021). Inspection requirements flow to Quality Control (W-027). Permit fees impact the capital stack (W-016). Fire department comments route to Fire & Life Safety (W-011).",
    },
    valueProps: [
      { label: "Permit expiration tracking", description: "Most jurisdictions expire permits after 180 days of inactivity. The worker tracks every permit and alerts before expiration." },
      { label: "Multi-discipline plan check management", description: "Architectural, structural, MEP, fire — comments parsed by discipline and routed to the responsible design professional." },
      { label: "Impact fee calculation", description: "Plan check fees, building permit (typically % of construction value), school fees, park fees, utility connection fees — total cost tracked." },
      { label: "ADA/FHA review tracking", description: "Accessibility review tracked separately — Fair Housing Act applies to all residential buildings with 4+ units." },
    ],
    faq: [
      { q: "Does this file permits for me?", a: "The worker prepares everything needed for submission and tracks the process. Actual filing is done through the jurisdiction's portal or in person. We're building direct integrations with major jurisdictions." },
      { q: "How does it handle multiple plan check rounds?", a: "Each round is tracked: comments received, responses prepared, resubmission date. The system tracks how many rounds your jurisdiction typically requires and models your timeline accordingly." },
      { q: "Can it handle parallel submissions?", a: "Yes. Many jurisdictions allow simultaneous submission of building, grading, fire, and MEP permits. The worker manages all submissions in parallel and tracks interdependencies." },
    ],
  },
  "lease-up-marketing": {
    headline: "Fill your building faster",
    subheadline: "Marketing strategy, lead management, absorption forecasting, concession analysis, competitive surveys, and lender reporting.",
    steps: [
      { title: "Build your marketing plan", description: "Target demographics, messaging, channels (ILS, social, signage, broker outreach), budget allocation, and timeline." },
      { title: "Track every lead", description: "Inquiry, tour scheduled, tour completed, application, approved, lease signed, moved in. Conversion rates by source." },
      { title: "Forecast absorption", description: "Current pace, projected stabilization date, optimistic/base/pessimistic scenarios. Compare to your underwriting assumptions." },
      { title: "Report to your lender", description: "Units leased, occupancy %, effective rent vs pro forma, projected stabilization — ready for your construction lender's requirements." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Lease-Up activates when the Quality Control Worker (W-027) issues a CO. Absorption velocity below underwriting triggers investor communication through W-019. Stabilization achieved signals the Construction Lending Worker (W-015) for loan conversion. Concessions exceeding budget escalate to Alex.",
    },
    valueProps: [
      { label: "Fair Housing compliance", description: "Every marketing material and leasing practice checked against FHA, ADA, and state/local protected classes. Hard stop on discriminatory language or criteria." },
      { label: "Concession impact analysis", description: "Free rent, reduced deposits, gift cards — every concession tracked with effective rent impact so you know the real cost." },
      { label: "Competitive market surveys", description: "Comparable properties tracked: rents, concessions, occupancy, amenities. Know exactly where you stand in the market." },
      { label: "LIHTC / affordable housing tracking", description: "Income qualification, rent restrictions, student rules, household certification — for projects with income-restricted units." },
    ],
    faq: [
      { q: "When does this worker activate?", a: "Lease-Up activates when a Certificate of Occupancy is issued for your building or phase. Pre-leasing activities can start earlier, but physical occupancy requires CO." },
      { q: "Does this handle commercial leasing?", a: "The current focus is multifamily residential. Commercial lease negotiation involves different terms (NNN, gross, modified gross, TI, commission structures) and is managed by a separate specialist." },
      { q: "How does it calculate absorption?", a: "Monthly absorption rate based on actual lease-up velocity, adjusted for seasonality and market conditions. Three scenarios (optimistic, base, pessimistic) show your range of likely stabilization dates." },
    ],
  },
  "property-management": {
    headline: "Run your property like a business",
    subheadline: "Tenant communications, work orders, lease renewals, vendor management, inspections, and operational reporting.",
    steps: [
      { title: "Manage tenant communications", description: "Announcements, maintenance updates, policy reminders, lease renewals, violation notices — all tracked with delivery and response." },
      { title: "Handle work orders", description: "Create, assign, track, close. Emergency routes immediately. Routine gets scheduled. Completion time and tenant satisfaction tracked." },
      { title: "Renew leases proactively", description: "90 days before expiration: current rent, market rent, proposed terms, negotiation status. Every lease in your pipeline." },
      { title: "Report to ownership", description: "Monthly: occupancy, collections, delinquency, work orders, vendor spend, capital improvements, incidents. One report, every month." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Property Management reads leasing data from Lease-Up (W-031) and rent roll from W-034. Lease violations route to Legal (W-045). Insurance claims go to Property Insurance (W-049). Capital improvements trigger Accounting (W-039). Rent increases update the rent roll (W-034). Delinquency escalates to Alex.",
    },
    valueProps: [
      { label: "Fair Housing ongoing compliance", description: "Consistent rule enforcement, reasonable accommodation handling, service animal requests, familial status protections — all tracked and documented." },
      { label: "Security deposit compliance", description: "State-specific maximums, escrow requirements, interest, itemized deductions, and return timelines. Hard stop on improper withholding." },
      { label: "Maintenance SLA tracking", description: "Emergency (2hr), urgent (24hr), routine (72hr), cosmetic (7 day) — configurable response times with escalation when breached." },
      { label: "Vendor performance scoring", description: "Every vendor tracked: response time, completion quality, pricing, insurance compliance. Data-driven decisions on renewals." },
    ],
    faq: [
      { q: "Does this replace property management software?", a: "It complements it. Think of this as your AI property manager that handles the documentation, compliance, and reporting while integrating with your existing PM platform." },
      { q: "How does it handle emergencies?", a: "Emergency work orders (flooding, no heat, security breach) route immediately with priority dispatch. The system tracks response time against your SLA and escalates if not addressed." },
      { q: "Can it manage multiple properties?", a: "Yes. Each property has its own operations — tenants, work orders, vendors, inspections. Reporting rolls up to portfolio level for ownership." },
    ],
  },
  "accounting": {
    headline: "Books that are always audit-ready",
    subheadline: "GAAP financials, job cost reporting, AP/AR, bank reconciliation, investor packages, and audit support.",
    steps: [
      { title: "Set up your chart of accounts", description: "Standardized real estate COA organized by property, phase, and natural account. Consistent across your entire portfolio." },
      { title: "Process AP and AR", description: "Invoices coded, approved, paid, 1099-tracked. Rent billed, collected, or written off. Every transaction documented." },
      { title: "Generate financial statements", description: "Income statement, balance sheet, cash flow — GAAP-compliant, by property and consolidated. Budget vs actual variance analysis." },
      { title: "Package investor reporting", description: "Property financials, waterfall calculations, distribution summaries, capital account statements — ready for your LPs." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Accounting reads draw data from W-023, rent roll from W-034, and work order costs from W-035. Job cost reports reconcile with the Construction Manager (W-021). Investor packages connect to IR (W-019). Tax preparation flows to W-040. Lender financials feed Construction Lending (W-015).",
    },
    valueProps: [
      { label: "GAAP and tax basis reconciliation", description: "Real estate partnerships often maintain both. The worker tracks differences in depreciation, cost segregation, and 1031 exchange basis adjustments." },
      { label: "Construction job cost accounting", description: "Cost tracking by CSI division during development: committed, actual, budget remaining, and projected final cost." },
      { label: "Partnership capital accounts", description: "Section 704(b) capital accounts, substantial economic effect, partner allocations, guaranteed payments — K-1 preparation support." },
      { label: "1099 tracking and filing", description: "1099-NEC for services, 1099-MISC for rents, 1099-INT for interest. Every vendor tracked with filing deadline alerts." },
    ],
    faq: [
      { q: "Does this replace my accountant?", a: "It augments them. The worker handles day-to-day bookkeeping, reconciliation, and report generation. Your CPA handles tax strategy, audit opinions, and complex GAAP interpretations." },
      { q: "Can it handle construction and operations?", a: "Yes. During construction, it tracks job costs by CSI division and reconciles with draws. After stabilization, it switches to operational accounting with rent revenue, operating expenses, and NOI reporting." },
      { q: "What about multi-entity structures?", a: "Real estate deals often have multiple entities (property LLC, manager LLC, fund LP). The worker maintains separate books for each entity and produces consolidated reporting." },
    ],
  },
  "mortgage-senior-debt": {
    headline: "Know your best loan before the broker calls",
    subheadline: "Analyze permanent debt options across agency, CMBS, life company, and bank — sized from binding constraints, compared side-by-side.",
    steps: [
      { title: "Upload term sheets", description: "Parse amount, LTV, DSCR, rate, spread, term, amortization, IO, prepayment, reserves, recourse, and fees from any lender term sheet." },
      { title: "Size from binding constraints", description: "Three constraints determine max proceeds: LTV (value x max LTV), DSCR (NOI / min DSCR / debt constant), Debt Yield (NOI / min yield). Binding = lowest." },
      { title: "Compare across lenders", description: "Side-by-side comparison of all-in cost including origination, rate, reserves, prepayment at projected hold, and legal. Effective rate and total cost." },
      { title: "Track through closing", description: "Rate lock dates, expiration, extension fees, float-down provisions. Reserve requirements modeled with impact on net proceeds." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Your permanent debt analysis lives in the same Vault as your capital stack. When the Capital Stack Optimizer (W-016) builds your sources and uses, your senior debt layer pulls directly from this worker's loan comparison. When closing approaches, the Title & Escrow Worker (W-044) picks up your lender requirements. When the loan funds, the Debt Service Worker (W-052) begins monitoring. One source of truth from term sheet to maturity.",
    },
    valueProps: [
      { label: "Three-constraint loan sizing", description: "Max proceeds determined by LTV, DSCR, and debt yield — the binding constraint identified automatically with sensitivity analysis." },
      { label: "Multi-lender comparison", description: "Agency, CMBS, life company, bank — compared on effective rate, total cost, flexibility, and net proceeds. No more spreadsheet gymnastics." },
      { label: "Full amortization modeling", description: "Monthly P&I, annual debt service, IO periods, balloon amount, and rate adjustment scenarios for floating and hybrid structures." },
      { label: "Vault-connected to capital stack and closing", description: "Loan terms flow to W-016 capital stack, W-044 title & escrow, and W-039 accounting automatically." },
    ],
    faq: [
      { q: "Does this originate loans?", a: "No. This worker analyzes and compares permanent debt options. It helps you understand your best loan before engaging brokers or lenders directly." },
      { q: "What loan types does it cover?", a: "Conventional bank, Fannie Mae DUS, Freddie Mac SBL/CME, CMBS, life company, and credit union. Each with its specific requirements, reserves, and prepayment structures." },
      { q: "How does loan sizing work?", a: "Three binding constraints: LTV (property value times max LTV), DSCR (NOI divided by minimum DSCR divided by debt constant), and Debt Yield (NOI divided by minimum yield). The lowest proceeds amount is the binding constraint — that's your max loan." },
    ],
  },
  "tax-credit-incentive": {
    headline: "Find every dollar the government will give you",
    subheadline: "LIHTC, Historic, Opportunity Zone, NMTC, Energy credits — identified, modeled, and tracked through compliance.",
    steps: [
      { title: "Screen your project", description: "From location, type, and scope, identify every available credit and incentive at federal, state, and local levels." },
      { title: "Model the credits", description: "Calculate estimated credit amounts, equity pricing, and net benefit to your capital stack. With and without scenarios." },
      { title: "Track applications", description: "Deadlines, submission status, and approval timelines for every program you're pursuing." },
      { title: "Manage compliance", description: "Reporting deadlines, certification requirements, audit schedules, and recapture windows — nothing slips." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Tax credits change your capital stack. When you confirm LIHTC credits, the Capital Stack Optimizer (W-016) recalculates your equity requirement automatically. When compliance reporting is due, the Compliance Tracker (W-047) alerts before deadlines. When investors need reporting, Investor Relations (W-019) pulls credit status from the Vault. One source of truth from screening through the compliance period.",
    },
    valueProps: [
      { label: "Comprehensive screening", description: "Federal, state, and local programs — LIHTC, Historic, OZ, NMTC, Energy (IRA), property tax abatements, TIF districts, enterprise zones." },
      { label: "Qualified basis calculations", description: "IRC Section 42, 47, 1400Z — precise calculations with set-aside elections, substantial rehabilitation tests, and placed-in-service requirements." },
      { label: "Syndicator-ready packages", description: "Credit summaries formatted for tax credit syndicators: qualified basis, estimated credits, compliance timeline, and projected investor returns." },
      { label: "Compliance calendar with recapture tracking", description: "15+15 year LIHTC compliance, 5-year HTC recapture, 7-year NMTC — every deadline tracked with early warning alerts." },
    ],
    faq: [
      { q: "Does this replace my tax credit consultant?", a: "It augments them. The worker screens programs, models credits, and tracks compliance. Your consultant handles allocation applications, investor negotiations, and complex structuring." },
      { q: "Can it handle multiple credit programs on one deal?", a: "Yes. Many deals layer LIHTC with Historic credits, energy credits, and state incentives. The worker models each independently and shows the combined capital stack impact." },
      { q: "What about state-specific programs?", a: "We cover major state programs including state historic credits, brownfield credits, enterprise zone benefits, and property tax abatements. State coverage is expanding continuously." },
    ],
  },
  "title-escrow": {
    headline: "Clean title, clean closing",
    subheadline: "Title commitment review, exception analysis, escrow coordination, and closing management — from commitment through recording.",
    steps: [
      { title: "Review the commitment", description: "Parse Schedule A (insured, coverage, property description), Schedule B-I (requirements), and Schedule B-II (exceptions). Standard vs non-standard flagged automatically." },
      { title: "Classify exceptions", description: "Each exception classified: standard, curative, acceptable, or deal-killer. Responsible party assigned, deadline set, resolution tracked." },
      { title: "Coordinate closing", description: "All conditions tracked: title curative items, lender requirements, document execution, pro-rations, recording instructions." },
      { title: "Post-closing tracked", description: "Recording confirmation, final policy issuance, escrow reconciliation, and document distribution — nothing falls through." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Title clears the path for everything else. When a lender requirement comes from the Mortgage Worker (W-013) or Construction Lending (W-015), it appears on your closing checklist automatically. When a contract provision from Legal (W-045) affects title, it's flagged. When closing completes, the disposition workers know the deal is done. One source of truth from commitment through recording.",
    },
    valueProps: [
      { label: "Automated commitment parsing", description: "Schedule A, B-I, and B-II parsed and classified automatically. Standard exceptions separated from items requiring attention." },
      { label: "Exception resolution tracking", description: "Every exception has a responsible party, deadline, and resolution status. Curative items tracked from identification through clearance." },
      { label: "ALTA endorsement management", description: "Required endorsements identified by transaction type: survey, zoning, access, contiguity, environmental protection lien — nothing missed." },
      { label: "Vault-connected to lenders and legal", description: "Lender title requirements from W-013/W-015 flow in. Contract provisions from W-045 are flagged. Closing status flows to all stakeholders." },
    ],
    faq: [
      { q: "Does this replace my title company?", a: "No. This worker reviews commitments, tracks exceptions, and coordinates closing. Your title company issues the commitment and policy. Think of this as your title coordinator that makes sure nothing falls through the cracks." },
      { q: "How does exception classification work?", a: "Each Schedule B-II exception is classified: standard (utility easements, building restrictions), curative (requiring action before closing), acceptable (non-standard but manageable), or deal-killer (fundamental ownership issues). Red flags are escalated immediately." },
      { q: "What about multi-state transactions?", a: "Title requirements vary significantly by state — recording formats, transfer taxes, good funds laws. The worker applies state-specific rules and flags jurisdiction-specific requirements." },
    ],
  },
  "legal-contracts": {
    headline: "Every contract reviewed. Every risk flagged.",
    subheadline: "PSAs, construction contracts, loan docs, leases, operating agreements — risk scored, tracked, and monitored through the deal lifecycle.",
    steps: [
      { title: "Submit a contract for review", description: "The worker flags indemnification scope, liability caps, insurance requirements, payment terms, change order procedures, termination, warranty, disputes, and assignment restrictions." },
      { title: "Get a risk score", description: "Green (standard), yellow (non-standard but acceptable), red (significant risk). Specific flags for unlimited liability, one-way indemnification, missing notice/cure periods." },
      { title: "Track all active contracts", description: "Registry of all contracts with key dates, renewal/termination notice periods, insurance requirements, and compliance status." },
      { title: "Manage mechanics liens", description: "Preliminary notices, filing deadlines, and release procedures by state. Alerts when deadlines approach." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Contracts touch every phase of development. When Bid & Procurement (W-022) awards a subcontract, it enters your contract registry automatically. When a contract requires insurance, the Insurance Worker (W-025) picks up the requirement. When payment terms are set, the Draw Worker (W-023) aligns. When a mechanics lien deadline approaches, the Compliance Tracker (W-047) alerts. One source of truth for every agreement on the deal.",
    },
    valueProps: [
      { label: "Automated risk scoring", description: "Every contract gets a green/yellow/red risk score. Red flags for unlimited liability, one-way indemnification, no consequential damages cap, and missing notice/cure periods." },
      { label: "Mechanics lien management", description: "State-specific preliminary notice requirements, filing deadlines, and release procedures. Strict deadlines vary significantly by state — the worker tracks them all." },
      { label: "Amendment and change order tracking", description: "All modifications logged with version history and cumulative value impact. Know the current state of every contract at any time." },
      { label: "Vault-connected to procurement and compliance", description: "Contracts from W-022 flow in automatically. Insurance requirements flow to W-025. Deadlines flow to W-047. Disputes escalate to Alex." },
    ],
    faq: [
      { q: "Does this replace my attorney?", a: "No. This worker provides contract management and risk flagging. It's your first line of review — catching standard issues so your attorney can focus on complex negotiation and structuring." },
      { q: "What contract types does it cover?", a: "PSAs, construction contracts (AIA and ConsensusDocs), loan documents, commercial leases, operating agreements, vendor contracts, and consulting agreements. Templates available for each." },
      { q: "How does the mechanics lien tracking work?", a: "Mechanics lien rules vary dramatically by state — preliminary notice deadlines range from 20 to 90 days, filing deadlines from 60 to 180 days. The worker applies state-specific rules and alerts when deadlines approach." },
    ],
  },
  "compliance-tracker": {
    headline: "Never miss a deadline that costs you money",
    subheadline: "Every deadline from every worker, unified in one calendar — with multi-tier alerts, cross-worker conflict detection, and compliance reporting.",
    steps: [
      { title: "Deadlines aggregate automatically", description: "Every worker writes its deadlines to the Vault. This worker reads them all — regulatory, contractual, financial, internal — into one unified calendar." },
      { title: "Multi-tier alerts fire", description: "Early warning (30 days), approaching (14 days), critical (3 days), overdue. Routed to the responsible party per your escalation path." },
      { title: "Conflicts detected", description: "Draw deadline requires an inspection that hasn't been scheduled. Insurance renewal expiring before the next draw. The worker catches cross-worker scheduling conflicts." },
      { title: "Compliance reports generated", description: "Status reports for lenders, investors, and management showing all tracked obligations, completion rates, and risk items." },
    ],
    bridge: {
      title: "The Bridge",
      text: "This is the connective tissue worker. Every other worker writes deadlines — the Construction Manager writes milestones, the Draw Worker writes draw dates, Insurance writes expirations, Safety writes OSHA filings, Legal writes contract deadlines, Tax Credits writes compliance dates. This worker reads them all and finds the conflicts and gaps that no individual worker can see. When deadlines slip, it escalates to Alex. When lenders or investors need compliance reports, they're generated from live data.",
    },
    valueProps: [
      { label: "Unified deadline calendar", description: "All deadlines from all workers, color-coded by urgency and category. 30/60/90 day views with drill-down to responsible worker and party." },
      { label: "Cross-worker conflict detection", description: "Draw deadline requiring uninspected work, expiring insurance before next draw, overlapping inspections — conflicts caught before they become problems." },
      { label: "Multi-tier alert system", description: "30-day early warning, 14-day approaching, 3-day critical, overdue. Each tier routes to the right person per your escalation path." },
      { label: "Reads from every worker in the Vault", description: "W-021 milestones, W-023 draw dates, W-025 insurance, W-027 inspections, W-028 OSHA, W-044 closing, W-045 contracts, W-017 tax credits — all in one view." },
    ],
    faq: [
      { q: "How is this different from a calendar?", a: "A calendar shows dates. This worker understands relationships between deadlines across workers. It knows that a draw requires a completed inspection, that insurance must be current before a draw is funded, and that a rate lock expiration affects your closing timeline." },
      { q: "What happens when a deadline is missed?", a: "The worker follows your missed deadline protocol — notification to responsible party, escalation to management, and documentation of the miss with any financial or regulatory consequence." },
      { q: "Can lenders and investors see compliance status?", a: "Yes. The worker generates compliance status reports formatted for different audiences — lenders get covenant and regulatory status, investors get project milestone and reporting status. All from the same live data." },
    ],
  },
  "market-research": {
    headline: "Know the market before you commit capital",
    subheadline: "Demographics, absorption rates, supply pipeline, and comp analysis assembled into an institutional-grade market study.",
    steps: [
      { title: "Define your trade area", description: "Set geography by radius, zip code, MSA, or custom polygon. The worker pulls census, employment, and household data for your target area." },
      { title: "Analyze supply and demand", description: "Current inventory, pipeline projects, absorption rates, and vacancy trends for your asset class. Quarterly updates on new permits and deliveries." },
      { title: "Run comp analysis", description: "Comparable sales, lease comps, and cap rate trends sourced from public records and your portfolio data. Adjusted for size, age, location, and condition." },
      { title: "Generate the market study", description: "Institutional-format report with demographic summary, demand drivers, supply pipeline, risk factors, and investment thesis support." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Market Research feeds the CRE Analyst (W-002) with demographic and absorption data so underwriting assumptions match reality. Supply pipeline data flows to Site Due Diligence (W-025) to flag competitive risk early. Comp sets connect to Appraisal and Valuation (W-030) for independent cross-checks. Lease-Up Marketing (W-027) uses demand data to set pricing strategy.",
    },
    valueProps: [
      { label: "Institutional-grade market studies", description: "The same demographic, supply, and demand analysis that institutional funds require — generated in hours, not weeks." },
      { label: "Live supply pipeline tracking", description: "Every permitted, planned, and under-construction project in your trade area tracked and mapped. No surprises from new competitive supply." },
      { label: "Absorption rate modeling", description: "Historical and projected absorption by asset class, submarket, and unit type. Critical for lease-up timing and revenue projections." },
      { label: "Demographic trend analysis", description: "Population growth, household formation, income trends, employment drivers — the fundamentals that underpin demand for your project." },
    ],
    faq: [
      { q: "Where does the data come from?", a: "Census Bureau, Bureau of Labor Statistics, building permit databases, public records, and your own portfolio data. The worker cites every source so you can verify independently." },
      { q: "How current is the supply pipeline?", a: "Pipeline data is refreshed from permit databases and public filings. You can also manually add projects you learn about through broker relationships or site visits." },
      { q: "Can I customize the trade area?", a: "Yes. Use radius rings, drive-time polygons, zip codes, census tracts, or draw a custom boundary. The worker adjusts all demographic and supply data to your defined area." },
    ],
  },
  "architecture-review": {
    headline: "Plans reviewed before they reach the plan check counter",
    subheadline: "Building code compliance, AHJ coordination, and plan review from schematic design through construction documents.",
    steps: [
      { title: "Upload design documents", description: "Schematic design, design development, or construction document sets. The worker identifies the applicable building codes, zoning overlays, and AHJ requirements." },
      { title: "Run code compliance review", description: "Occupancy classification, construction type, allowable area, height limits, egress, accessibility, and energy code checked against IBC, local amendments, and zoning." },
      { title: "Coordinate AHJ comments", description: "Track plan check comments from building, fire, planning, and health departments. Route responses to the right consultant. Track resubmittal deadlines." },
      { title: "Manage SD through CD progression", description: "Design milestone tracking, consultant coordination, and document version control from concept through permit-ready construction documents." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Architecture Review feeds code analysis to Permit Submission (W-026) so applications are complete on first filing. Egress and occupancy data flows to Fire Life Safety (W-011) for coordinated life safety plans. Accessibility findings connect to the Accessibility and Fair Housing Worker (W-009). Energy code issues route to Energy and Sustainability (W-008) for Title 24 and LEED coordination.",
    },
    valueProps: [
      { label: "Pre-submittal code review", description: "Catch code issues before the plan check counter. Occupancy, construction type, allowable area, height, and egress reviewed against IBC and local amendments." },
      { label: "AHJ comment tracking", description: "Every plan check comment from every department tracked with responsible party, response status, and resubmittal deadline." },
      { label: "Consultant coordination", description: "Architecture, structural, MEP, civil, landscape — all consultants tracked with deliverable schedules, version control, and cross-discipline conflict identification." },
      { label: "Design phase progression", description: "SD, DD, CD milestones tracked with completion criteria, outstanding items, and owner decision logs. No phase starts without prior phase sign-off." },
    ],
    faq: [
      { q: "Does this replace my architect?", a: "No. This worker assists with code compliance checking, AHJ comment tracking, and consultant coordination. Your architect remains the design professional of record." },
      { q: "Which building codes does it cover?", a: "IBC, IRC, and state/local amendments. The worker identifies applicable codes based on project location, occupancy type, and construction classification." },
      { q: "Can it handle multiple AHJs on one project?", a: "Yes. Large projects often involve building, fire, planning, health, and public works departments. Each department's comments are tracked separately with cross-references when issues overlap." },
    ],
  },
  "engineering-review": {
    headline: "Civil, structural, and traffic — coordinated, not siloed",
    subheadline: "Engineering review and coordination across civil, structural, traffic, and utility disciplines for development projects.",
    steps: [
      { title: "Scope the engineering disciplines", description: "Identify required engineering studies based on project type, jurisdiction, and site conditions. Civil, structural, geotechnical, traffic, and utility requirements mapped." },
      { title: "Track engineering deliverables", description: "Each discipline tracked with scope, schedule, submittal status, and review comments. Cross-discipline conflicts flagged before they become change orders." },
      { title: "Coordinate utility and infrastructure", description: "Water, sewer, storm drain, electric, gas, telecom — capacity confirmation, will-serve letters, connection fees, and improvement requirements." },
      { title: "Manage agency review", description: "Engineering plan check comments from public works, utility districts, and transportation agencies tracked and resolved. Resubmittal coordination across all reviewers." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Engineering Review connects to Site Due Diligence (W-025) for geotechnical and environmental baseline data. Structural findings feed the Construction Manager (W-021) for buildability and cost impacts. Traffic study results flow to Government Relations (W-010) when public hearing conditions arise. Utility coordination data connects to MEP Coordination (W-024) for building-level system design.",
    },
    valueProps: [
      { label: "Multi-discipline coordination", description: "Civil, structural, geotechnical, traffic, and utility engineers all tracked in one place. Cross-discipline conflicts identified before they reach the field." },
      { label: "Utility will-serve tracking", description: "Every utility provider tracked: application status, capacity confirmation, connection fees, improvement requirements, and timeline to service availability." },
      { label: "Traffic study management", description: "Trip generation, LOS analysis, mitigation measures, and fair share calculations tracked from scoping through agency approval." },
      { label: "Agency comment resolution", description: "Engineering plan check comments from multiple agencies consolidated, routed to responsible engineers, and tracked through resubmittal and approval." },
    ],
    faq: [
      { q: "Does this replace my civil engineer?", a: "No. The worker coordinates across engineering disciplines, tracks deliverables, and manages agency review. Your licensed engineers remain the professionals of record for their respective disciplines." },
      { q: "How does it handle utility coordination?", a: "Each utility provider is tracked separately with will-serve status, capacity, fees, and required improvements. The worker flags conflicts between utility timelines and your construction schedule." },
      { q: "Can it manage traffic study requirements?", a: "Yes. From scoping meetings through final agency approval, the worker tracks trip generation assumptions, LOS analysis, mitigation measures, and condition compliance." },
    ],
  },
  "environmental-cultural-review": {
    headline: "Phase I through NEPA — nothing buried in the file",
    subheadline: "Environmental site assessments, biological surveys, archaeological studies, and NEPA/CEQA compliance managed in one place.",
    steps: [
      { title: "Order Phase I ESA", description: "ASTM E1527-21 compliant Phase I Environmental Site Assessment. Historical use review, regulatory database search, site reconnaissance, and findings report." },
      { title: "Manage Phase II if triggered", description: "Sampling plans, laboratory results, risk assessments, and remediation recommendations. Regulatory agency notification and voluntary cleanup tracking if needed." },
      { title: "Coordinate biological and cultural surveys", description: "Biological resource assessments, wetland delineations, archaeological surveys, tribal consultation — each study tracked with permit conditions and mitigation requirements." },
      { title: "Navigate NEPA or CEQA", description: "Categorical exclusion, environmental assessment, or EIR/EIS. Public comment periods, mitigation monitoring plans, and agency correspondence all documented." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Environmental findings flow to Site Due Diligence (W-025) for overall site risk assessment. Remediation cost estimates connect to the CRE Analyst (W-002) underwriting model. CEQA/NEPA timelines feed the Permit Submission Worker (W-026) so entitlement schedules account for environmental review. Wetland and species mitigation data routes to Land Use and Entitlement (W-016) for condition compliance.",
    },
    valueProps: [
      { label: "Phase I and Phase II management", description: "From ASTM-compliant Phase I through soil sampling, lab results, and remediation — every step documented with regulatory correspondence." },
      { label: "NEPA and CEQA compliance", description: "Federal and state environmental review tracked from determination of lead agency through public comment, mitigation monitoring, and clearance." },
      { label: "Biological resource tracking", description: "Species surveys, habitat assessments, wetland delineations, and mitigation banking — with permit conditions and monitoring obligations." },
      { label: "Cultural resource management", description: "Archaeological surveys, tribal consultation (Section 106 / AB 52), inadvertent discovery protocols, and cultural resource monitoring plans." },
    ],
    faq: [
      { q: "When is a Phase II needed?", a: "A Phase II is triggered when the Phase I identifies recognized environmental conditions (RECs). The worker flags RECs from the Phase I report and scopes the Phase II sampling plan accordingly." },
      { q: "How does it handle tribal consultation?", a: "Section 106 (federal) and AB 52 (California) consultation timelines, correspondence, and outcomes are tracked. The worker does not conduct consultation directly but manages the documentation and deadlines." },
      { q: "Can it manage both NEPA and CEQA simultaneously?", a: "Yes. Some projects require both federal and state environmental review. The worker tracks each process separately and identifies where they overlap to avoid duplicative work." },
    ],
  },
  "energy-sustainability": {
    headline: "Green building compliance without the guesswork",
    subheadline: "LEED, ENERGY STAR, Title 24, energy modeling, and green certification tracking from design through occupancy.",
    steps: [
      { title: "Set sustainability targets", description: "Select certifications (LEED, ENERGY STAR, WELL, Living Building), energy code (Title 24, IECC), and project-specific sustainability goals." },
      { title: "Track credit compliance", description: "Every LEED credit, ENERGY STAR criterion, or code requirement tracked with responsible party, documentation status, and submission deadline." },
      { title: "Manage energy modeling", description: "Energy model versions, assumptions, results, and code compliance margins tracked. Design changes automatically flagged for model impact." },
      { title: "Coordinate certification submissions", description: "Documentation packages assembled, submitted, reviewed, and revised. Certification timeline managed through final award." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Energy and Sustainability connects to Architecture Review (W-005) for envelope and systems design coordination. MEP Coordination (W-024) provides HVAC and lighting specifications for energy model inputs. Construction Manager (W-021) tracks green building requirements during construction. Utility Management (W-036) provides post-occupancy energy data for ENERGY STAR benchmarking.",
    },
    valueProps: [
      { label: "LEED credit tracking", description: "Every prerequisite and credit tracked across all LEED categories with documentation status, responsible parties, and GBCI submission coordination." },
      { label: "Energy code compliance", description: "Title 24, IECC, ASHRAE 90.1 — prescriptive and performance path compliance tracked with energy model results and inspection requirements." },
      { label: "Energy modeling management", description: "Model versions, assumptions, baseline vs. proposed comparisons, and sensitivity analysis. Design changes automatically flagged for energy impact." },
      { label: "Utility benchmarking", description: "Post-occupancy energy and water consumption tracked against design projections and ENERGY STAR Portfolio Manager benchmarks." },
    ],
    faq: [
      { q: "Which green certifications does it support?", a: "LEED (all rating systems), ENERGY STAR, WELL Building Standard, Living Building Challenge, and local green building programs. The credit tracking framework adapts to any point-based system." },
      { q: "Does it do the energy modeling?", a: "The worker manages energy models — tracking versions, assumptions, and results — but does not run the simulation software. Your energy consultant uses their tools; the worker tracks the output." },
      { q: "Can it handle both design and operations?", a: "Yes. During design and construction, it tracks certification credits and code compliance. After occupancy, it monitors actual energy performance against design projections." },
    ],
  },
  "accessibility-fair-housing": {
    headline: "Accessibility and Fair Housing — documented, not assumed",
    subheadline: "ADA, Fair Housing Act, Section 504, and accessibility audits from design through property operations.",
    steps: [
      { title: "Identify applicable requirements", description: "ADA (public accommodation vs. commercial), Fair Housing Act (covered multifamily), Section 504 (federal funding), state accessibility codes — mapped to your project type." },
      { title: "Review design for compliance", description: "Unit mix, common area accessibility, parking, path of travel, adaptable features, and Type A/B unit requirements checked against applicable standards." },
      { title: "Track construction compliance", description: "Accessibility inspections, field measurements, correction items, and re-inspections documented. Non-compliance flagged immediately with remediation plans." },
      { title: "Manage operational obligations", description: "Reasonable accommodation requests, reasonable modification requests, service animal policies, and complaint tracking for ongoing compliance." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Accessibility findings connect to Architecture Review (W-005) for design corrections. Property Management (W-033) receives accommodation and modification tracking workflows. Fair Housing compliance data flows to Insurance and Risk (W-029) for liability assessment. Entity Formation (W-046) structures ensure ADA compliance obligations attach to the correct operating entity.",
    },
    valueProps: [
      { label: "Fair Housing Act compliance", description: "Covered multifamily design requirements, advertising compliance, reasonable accommodation tracking, and complaint response procedures — documented start to finish." },
      { label: "ADA Title III audit support", description: "Path of travel, public accommodation standards, barrier removal obligations, and readily achievable modifications tracked with priority and cost estimates." },
      { label: "Section 504 compliance", description: "Projects with federal funding tracked for Section 504 requirements including percentage of accessible units, transition plans, and self-evaluation." },
      { label: "Reasonable accommodation tracking", description: "Every request documented with interactive process steps, decision rationale, implementation status, and appeal rights. Full audit trail for each request." },
    ],
    faq: [
      { q: "What is the difference between ADA and Fair Housing Act?", a: "ADA covers public accommodations and commercial facilities. The Fair Housing Act covers residential properties with 4+ units built after March 1991. Many multifamily projects must comply with both, plus state accessibility codes." },
      { q: "Does this handle reasonable accommodation requests?", a: "Yes. The interactive process is tracked step by step: request receipt, documentation, evaluation, decision, implementation, and follow-up. Every decision includes documented rationale." },
      { q: "Can it audit existing properties?", a: "Yes. The worker supports accessibility audits of existing properties, identifying barriers, prioritizing remediation by legal obligation and cost, and tracking correction implementation." },
    ],
  },
  "government-relations": {
    headline: "Council meetings, public comment, and entitlement strategy in one place",
    subheadline: "Track legislative activity, coordinate public engagement, and manage the political landscape around your development projects.",
    steps: [
      { title: "Map the political landscape", description: "Identify elected officials, planning commissioners, neighborhood councils, and community groups relevant to your project. Track positions, concerns, and influence." },
      { title: "Monitor legislative and regulatory activity", description: "Council agendas, planning commission hearings, ordinance changes, and regulatory updates tracked with impact analysis for your active projects." },
      { title: "Coordinate community engagement", description: "Neighborhood meetings, public comment strategy, stakeholder outreach, and coalition building. Every interaction documented with follow-up commitments." },
      { title: "Support entitlement hearings", description: "Hearing preparation, public testimony tracking, condition negotiation, and post-approval condition compliance managed through final entitlement." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Government Relations connects to Land Use and Entitlement (W-016) for hearing schedules and condition tracking. Environmental review timelines from the Environmental Worker (W-007) factor into public comment strategy. Market Research (W-001) provides demographic data for community impact presentations. Opportunity Zone (W-020) compliance requires tracking qualified census tract designations through legislative changes.",
    },
    valueProps: [
      { label: "Council and commission tracking", description: "Every relevant hearing, agenda item, vote, and condition tracked across planning commission, city council, and special districts." },
      { label: "Community engagement management", description: "Stakeholder identification, meeting scheduling, comment tracking, and commitment follow-through. Build support before the public hearing." },
      { label: "Public comment strategy", description: "Track opposition and support, prepare responses to common concerns, coordinate favorable testimony, and document community benefits." },
      { label: "Regulatory change monitoring", description: "Zoning amendments, building code updates, fee changes, and new ordinances tracked with impact analysis for your active and planned projects." },
    ],
    faq: [
      { q: "Does this replace a lobbyist?", a: "No. The worker tracks the political landscape, monitors legislative activity, and manages community engagement documentation. Your government relations professionals handle direct advocacy and relationship building." },
      { q: "How does it track opposition?", a: "Opposition groups, their concerns, public testimony, and media coverage are documented. The worker helps you understand the landscape so your team can prepare effective responses." },
      { q: "Can it handle multiple jurisdictions?", a: "Yes. Large projects often involve city, county, state, and federal approvals. Each jurisdiction's requirements, timelines, and decision-makers are tracked separately." },
    ],
  },
  "fire-life-safety": {
    headline: "Fire code and life safety — reviewed before the marshal arrives",
    subheadline: "Fire code compliance, life safety plans, egress analysis, and fire protection system review from design through occupancy.",
    steps: [
      { title: "Classify fire and life safety requirements", description: "Occupancy type, construction classification, fire area, required fire ratings, and fire protection system requirements identified from your project documents." },
      { title: "Review egress and life safety plans", description: "Egress capacity, travel distance, exit separation, exit signs, emergency lighting, and area of refuge requirements analyzed against IBC and local fire code." },
      { title: "Coordinate fire protection systems", description: "Sprinkler design (NFPA 13/13R/13D), fire alarm (NFPA 72), standpipe, smoke control, and fire department access requirements tracked through design and installation." },
      { title: "Manage fire marshal review", description: "Plan check submittals, comments, inspections, and final sign-off coordinated with the Authority Having Jurisdiction." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Fire Life Safety connects to Architecture Review (W-005) for egress and code compliance coordination. MEP Coordination (W-024) tracks sprinkler and fire alarm system design. Construction Manager (W-021) schedules fire protection inspections. Permit Submission (W-026) includes fire marshal approval in the permit tracking workflow. Safety and OSHA (W-028) addresses fire prevention during construction.",
    },
    valueProps: [
      { label: "Egress analysis", description: "Occupant load, exit capacity, travel distance, common path of travel, dead-end corridors, and exit separation — calculated and verified against IBC Chapter 10." },
      { label: "Fire protection system tracking", description: "Sprinkler, fire alarm, standpipe, smoke control, and kitchen hood suppression — each system tracked from design through inspection and acceptance testing." },
      { label: "Fire marshal coordination", description: "Plan check submittals, comment responses, inspection scheduling, and certificate of occupancy conditions all managed with the fire authority." },
      { label: "High-rise and special occupancy compliance", description: "Additional requirements for high-rise buildings, assembly occupancies, hazardous materials, and institutional occupancies tracked separately." },
    ],
    faq: [
      { q: "Does this replace a fire protection engineer?", a: "No. The worker tracks compliance requirements, coordinates submittals, and manages the review process. Your fire protection engineer provides the technical design and engineering judgment." },
      { q: "Which fire codes does it cover?", a: "IBC, IFC, NFPA standards (13, 14, 20, 72, 101), and local fire code amendments. The worker identifies applicable codes based on your project location and occupancy." },
      { q: "Can it handle phased occupancy?", a: "Yes. Temporary certificates of occupancy, phased fire protection activation, and partial egress plans are tracked with conditions and expiration dates for each phase." },
    ],
  },
  "opportunity-zone": {
    headline: "Opportunity Zone compliance that survives an audit",
    subheadline: "Qualified Opportunity Fund structure, substantial improvement testing, timeline tracking, and tax benefit documentation.",
    steps: [
      { title: "Verify QOZ eligibility", description: "Confirm property location in a designated Qualified Opportunity Zone census tract. Verify investor capital gain timelines and deferral eligibility." },
      { title: "Structure the Qualified Opportunity Fund", description: "Entity formation, 90% asset test compliance, self-certification (Form 8996), and investor subscription documentation." },
      { title: "Track the substantial improvement test", description: "Original basis calculation, improvement expenditures, 30-month timeline, and working capital safe harbor documentation. Monthly progress against the test." },
      { title: "Document hold period and tax benefits", description: "5-year, 7-year, and 10-year hold milestones tracked. Basis step-up calculations and fair market value exclusion eligibility documented for each investor." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Opportunity Zone compliance data feeds the CRE Analyst (W-002) underwriting model with tax benefit assumptions. Construction Manager (W-021) tracks improvement expenditures against the substantial improvement test timeline. Accounting (W-039) maintains QOF-level books and investor capital accounts. Entity Formation (W-046) ensures the fund and subsidiary structure meets QOZ requirements. Investor Reporting (W-051) includes QOZ compliance status in LP communications.",
    },
    valueProps: [
      { label: "90% asset test compliance", description: "Monthly tracking of qualified opportunity zone property as a percentage of total fund assets. Cure period alerts when approaching non-compliance." },
      { label: "Substantial improvement tracking", description: "Original basis, additions to basis, 30-month window, and working capital safe harbor — all tracked monthly with projected completion date." },
      { label: "Investor-level tax documentation", description: "Capital gain deferral amounts, holding period tracking, basis step-up calculations, and Form 8997 support for each investor." },
      { label: "Working capital safe harbor", description: "Written plan, 31-month expenditure schedule, and actual vs. planned spending documented to meet safe harbor requirements." },
    ],
    faq: [
      { q: "What happens if we fail the 90% test?", a: "A penalty applies for each month of non-compliance. The worker tracks your asset ratio monthly and alerts you when approaching the threshold so you can take corrective action during the cure period." },
      { q: "How does the substantial improvement test work?", a: "You must spend more than the original basis on improvements within 30 months. The worker tracks your expenditures against this threshold monthly and projects whether you will meet the test based on your construction draw schedule." },
      { q: "Can investors have different hold periods?", a: "Yes. Each investor's capital gain date, investment date, and hold period milestones are tracked individually. The worker calculates tax benefits based on each investor's specific timeline." },
    ],
  },
  "appraisal-valuation": {
    headline: "Valuations you can defend to any stakeholder",
    subheadline: "Appraisal review, comp validation, USPAP compliance, and valuation analysis across income, sales comparison, and cost approaches.",
    steps: [
      { title: "Order or upload the appraisal", description: "Engage an appraiser or upload an existing report. The worker parses key findings: value conclusion, cap rate, comps, assumptions, and limiting conditions." },
      { title: "Validate comparable data", description: "Each comp analyzed for relevance: proximity, timing, size, condition, and transaction type. Adjustments reviewed for reasonableness against market data." },
      { title: "Cross-check valuation approaches", description: "Income approach (DCF and direct cap), sales comparison, and cost approach reconciled. Discrepancies between approaches flagged for review." },
      { title: "Generate valuation summary", description: "Institutional-format valuation memo with key metrics, comp analysis, assumption sensitivity, and value conclusion — ready for lender, investor, or internal use." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Appraisal data flows to the CRE Analyst (W-002) for underwriting validation. Market Research (W-001) provides market-level comp data for cross-checking appraiser selections. Construction Lending (W-015) uses appraised values for LTV covenant monitoring. Rent Roll and Revenue (W-034) provides actual NOI for income approach validation. Disposition Preparation (W-042) uses valuations for pricing strategy.",
    },
    valueProps: [
      { label: "USPAP compliance verification", description: "Appraisal reports reviewed for USPAP compliance including competency, scope of work, reporting requirements, and certification standards." },
      { label: "Comparable sale validation", description: "Every comp evaluated for arm's-length transaction, data accuracy, adjustment reasonableness, and relevance to the subject property." },
      { label: "Three-approach reconciliation", description: "Income, sales comparison, and cost approaches compared and reconciled. Weight of each approach justified based on property type and data availability." },
      { label: "Sensitivity analysis", description: "Value sensitivity to cap rate, discount rate, vacancy, rent growth, and expense assumptions quantified and presented in scenario format." },
    ],
    faq: [
      { q: "Does this replace an appraiser?", a: "No. The worker reviews and analyzes appraisals but does not produce appraisal reports. Licensed appraisers remain responsible for valuation opinions." },
      { q: "Can it handle special-purpose properties?", a: "Yes. The worker adapts its review framework based on property type — multifamily, office, retail, industrial, hospitality, self-storage, senior housing, and special-purpose assets each have different valuation considerations." },
      { q: "How does it validate cap rates?", a: "Cap rates are cross-checked against comparable transactions, investor surveys, and implied rates from your own portfolio. Market Research (W-001) provides market-level cap rate trends for additional context." },
    ],
  },
  "tenant-screening": {
    headline: "Screen tenants consistently, document everything",
    subheadline: "Credit analysis, background checks, income verification, and screening criteria applied uniformly across every applicant.",
    steps: [
      { title: "Define screening criteria", description: "Set minimum credit score, income-to-rent ratio, rental history requirements, and background check parameters. Criteria documented to ensure consistent, non-discriminatory application." },
      { title: "Process applications", description: "Each applicant evaluated against your documented criteria. Credit report, income verification, employment verification, and landlord references collected and reviewed." },
      { title: "Generate screening decision", description: "Approve, conditionally approve, or deny with documented rationale tied directly to your published screening criteria. Adverse action notices prepared when required." },
      { title: "Maintain compliance records", description: "Every screening decision, supporting documentation, and adverse action notice archived. Fair Housing compliance demonstrated through consistent criteria application." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Approved tenants flow to Property Management (W-033) for lease execution and move-in. Screening criteria connect to Accessibility and Fair Housing (W-009) for non-discrimination compliance. Income and credit data feeds Rent Roll and Revenue (W-034) for revenue quality assessment. Lease-Up Marketing (W-027) tracks conversion rates from application to approved tenant.",
    },
    valueProps: [
      { label: "Consistent screening criteria", description: "Published criteria applied uniformly to every applicant. No subjective decisions — every approval and denial tied to documented, measurable standards." },
      { label: "Income and employment verification", description: "Pay stubs, tax returns, employment letters, and bank statements collected and verified. Income-to-rent ratios calculated automatically." },
      { label: "Adverse action compliance", description: "When an applicant is denied, the worker generates compliant adverse action notices citing specific reasons, credit bureau contact information, and dispute rights." },
      { label: "Fair Housing documentation", description: "Complete audit trail demonstrating that every applicant was evaluated using identical criteria regardless of protected class. Essential for Fair Housing defense." },
    ],
    faq: [
      { q: "How does it prevent Fair Housing violations?", a: "By enforcing your published screening criteria uniformly for every applicant. The worker does not allow subjective overrides — every decision is tied to documented, measurable standards with a complete audit trail." },
      { q: "What screening criteria can I set?", a: "Minimum credit score, income-to-rent ratio, rental history length, eviction history, criminal background parameters (subject to local ban-the-box laws), and employment verification. All criteria are configurable per property." },
      { q: "Does it run the credit and background checks?", a: "The worker integrates with screening providers to pull reports, then applies your criteria to the results. You select the screening provider; the worker handles the workflow and documentation." },
    ],
  },
  "rent-roll-revenue": {
    headline: "Rent roll accuracy you can take to closing",
    subheadline: "Rent roll analysis, revenue forecasting, lease abstraction, and vacancy tracking for multifamily and commercial portfolios.",
    steps: [
      { title: "Import or build the rent roll", description: "Upload existing rent rolls or build from lease data. Every unit tracked: tenant, lease dates, rent amount, concessions, deposits, and payment status." },
      { title: "Abstract lease terms", description: "Key lease provisions extracted: base rent, escalations, options, CAM/NNN pass-throughs, percentage rent, co-tenancy clauses, and termination rights." },
      { title: "Analyze revenue performance", description: "Effective gross income, vacancy loss, concession costs, bad debt, and collection rates analyzed by unit type, floor plan, and lease vintage." },
      { title: "Forecast future revenue", description: "Lease expiration schedule, market rent comparison, renewal probability, and loss-to-lease analysis projected forward for underwriting and budgeting." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Rent roll data feeds Accounting (W-039) for revenue recognition and financial reporting. The CRE Analyst (W-002) uses revenue projections in underwriting models. Appraisal and Valuation (W-030) uses actual NOI for income approach validation. Property Management (W-033) coordinates lease renewals flagged by expiration analysis. Investor Reporting (W-051) includes occupancy and revenue metrics in LP packages.",
    },
    valueProps: [
      { label: "Lease abstraction", description: "Every material lease term extracted and structured: rent, escalations, options, pass-throughs, exclusives, co-tenancy, go-dark, and termination provisions." },
      { label: "Loss-to-lease analysis", description: "Current rents compared to market rents by unit type and floor plan. Quantifies the revenue upside available through lease renewal and new lease pricing." },
      { label: "Vacancy and collection tracking", description: "Physical vacancy, economic vacancy, and collection loss tracked separately. Distinguishes between vacant units, down units, model units, and non-revenue units." },
      { label: "Lease expiration management", description: "Rolling expiration schedule with renewal probability, retention cost estimates, and downtime assumptions. Prevents lease rollover concentration." },
    ],
    faq: [
      { q: "Can it handle both multifamily and commercial?", a: "Yes. Multifamily rent rolls track by unit with floor plan and market rent data. Commercial rent rolls track NNN/gross/modified gross structures, percentage rent, CAM reconciliation, and tenant improvement amortization." },
      { q: "How does it calculate effective gross income?", a: "Gross potential rent minus vacancy loss, concessions, bad debt, and non-revenue units equals effective gross income. Each deduction is tracked separately for variance analysis." },
      { q: "Can I use this for acquisition due diligence?", a: "Yes. Upload the seller's rent roll and the worker validates it against lease documents, flags discrepancies, and projects stabilized revenue for your underwriting model." },
    ],
  },
  "maintenance-work-order": {
    headline: "Every work order tracked from request to close-out",
    subheadline: "Work order management, preventive maintenance scheduling, vendor dispatch, and cost tracking across your entire portfolio.",
    steps: [
      { title: "Receive and categorize the request", description: "Tenant requests, staff observations, and inspection findings all create work orders. Categorized by trade, priority (emergency, urgent, routine, cosmetic), and location." },
      { title: "Dispatch and track", description: "Work orders assigned to in-house staff or dispatched to qualified vendors. SLA timers start based on priority. Status tracked from assignment through completion." },
      { title: "Complete and document", description: "Before/after photos, parts used, labor hours, total cost, and tenant satisfaction captured at close-out. Warranty work flagged for builder claims." },
      { title: "Analyze and optimize", description: "Cost per unit, response times, vendor performance, and recurring issue patterns analyzed. Preventive maintenance schedules adjusted based on actual failure data." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Work order costs feed Accounting (W-039) for expense tracking and budget variance analysis. Vendor performance data connects to Vendor and Contract Management (W-041) for renewal decisions. Warranty items route to Warranty and Defect Tracking (W-038) for builder claims. Property Management (W-033) uses maintenance data for property condition reporting. Utility issues connect to Utility Management (W-036) for system performance analysis.",
    },
    valueProps: [
      { label: "SLA-driven prioritization", description: "Emergency (2 hours), urgent (24 hours), routine (72 hours), cosmetic (7 days) — configurable SLAs with automatic escalation when deadlines approach." },
      { label: "Preventive maintenance scheduling", description: "HVAC filters, roof inspections, elevator maintenance, fire safety equipment — recurring maintenance scheduled by asset, season, and manufacturer recommendation." },
      { label: "Vendor performance scoring", description: "Response time, completion quality, pricing, callback rate, and insurance compliance tracked for every vendor. Data-driven decisions on preferred vendor lists." },
      { label: "Cost analysis by category", description: "Maintenance costs analyzed by trade, property, unit type, and work order category. Identify the units, systems, and buildings driving your maintenance budget." },
    ],
    faq: [
      { q: "Can tenants submit requests directly?", a: "Yes. Tenant-submitted requests are categorized, prioritized, and routed into the same workflow. Emergency keywords trigger immediate escalation." },
      { q: "How does preventive maintenance work?", a: "Recurring tasks are scheduled by asset type, location, and interval. The worker generates work orders automatically, tracks completion, and adjusts schedules based on actual equipment performance data." },
      { q: "Does it track make-ready turns?", a: "Yes. Unit turns are tracked as multi-step work orders: inspection, punch list, vendor coordination, completion, and final inspection. Turn time and cost are measured for benchmarking." },
    ],
  },
  "utility-management": {
    headline: "Utility costs visible, benchmarked, and optimized",
    subheadline: "Utility cost tracking, consumption analysis, rate optimization, and benchmarking across your property portfolio.",
    steps: [
      { title: "Connect utility accounts", description: "Electric, gas, water, sewer, trash, and telecom accounts linked to properties. Bills tracked with rate structure, consumption, demand charges, and taxes." },
      { title: "Analyze consumption patterns", description: "Usage trended by month, season, and year-over-year. Anomalies flagged — spikes may indicate leaks, equipment failure, or billing errors." },
      { title: "Benchmark against peers", description: "Energy and water intensity (per square foot, per unit, per bed) compared against ENERGY STAR, local averages, and your own portfolio." },
      { title: "Identify optimization opportunities", description: "Rate tariff analysis, demand response programs, LED retrofits, water fixture upgrades, and renewable energy options evaluated with ROI projections." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Utility costs flow to Accounting (W-039) for expense tracking and CAM reconciliation. Consumption data connects to Energy and Sustainability (W-008) for ENERGY STAR benchmarking and green certification support. Maintenance Work Order (W-035) investigates usage anomalies that may indicate equipment issues. Property Management (W-033) uses utility data for operating budget projections.",
    },
    valueProps: [
      { label: "Bill validation", description: "Every utility bill checked against rate tariff, prior periods, and expected consumption. Billing errors, estimated reads, and rate changes flagged automatically." },
      { label: "Consumption anomaly detection", description: "Statistical analysis identifies unusual consumption — potential leaks, equipment malfunction, or unauthorized use. Alerts trigger investigation work orders." },
      { label: "Rate optimization", description: "Current rate tariffs analyzed against alternatives. Time-of-use rates, demand response programs, and deregulated supplier options evaluated with projected savings." },
      { label: "RUBS and submeter management", description: "Ratio utility billing systems and submeter reads tracked for tenant cost allocation. Allocation formulas documented and reconciled monthly." },
    ],
    faq: [
      { q: "Can it handle RUBS billing?", a: "Yes. Ratio utility billing allocation formulas are configured per property — by square footage, occupants, or bed count. The worker calculates tenant charges and produces billing-ready data." },
      { q: "How does it detect leaks?", a: "Consumption is trended against historical patterns, weather data, and occupancy. Statistically significant spikes trigger alerts. The worker creates a Maintenance Work Order (W-035) investigation request when a potential leak is identified." },
      { q: "Does it track renewable energy?", a: "Yes. Solar production, net metering credits, PPA payments, and renewable energy certificates (RECs) are tracked alongside traditional utility costs for complete energy accounting." },
    ],
  },
  "hoa-association": {
    headline: "HOA governance and compliance — every vote, every dollar",
    subheadline: "Board management, assessment tracking, CC&R enforcement, reserve studies, and violation tracking for homeowner associations.",
    steps: [
      { title: "Set up association governance", description: "Board members, meeting schedules, CC&Rs, bylaws, and rules loaded. Voting thresholds, quorum requirements, and amendment procedures documented." },
      { title: "Track assessments and finances", description: "Regular and special assessments billed, collected, and reconciled. Reserve fund balances tracked against the reserve study. Delinquencies managed with lien procedures." },
      { title: "Enforce CC&Rs and rules", description: "Violations documented with photos, notices sent, hearings scheduled, fines assessed. Due process procedures followed at every step." },
      { title: "Manage reserve studies and capital planning", description: "Component inventory, useful life, replacement cost, and funding plan tracked. Annual updates based on actual expenditures and condition assessments." },
    ],
    bridge: {
      title: "The Bridge",
      text: "HOA assessment data flows to Accounting (W-039) for association financial reporting. Property Insurance (W-049) tracks master policy and individual unit coverage requirements. Maintenance Work Order (W-035) handles common area maintenance and capital replacements. Vendor and Contract Management (W-041) manages landscape, pool, and other recurring service contracts. Accessibility and Fair Housing (W-009) ensures common area compliance.",
    },
    valueProps: [
      { label: "Board meeting management", description: "Agendas, minutes, motions, votes, and action items tracked. Quorum verified, conflicts of interest documented, and executive session protocols enforced." },
      { label: "Assessment collection and delinquency", description: "Regular and special assessments tracked by unit. Delinquency notices, payment plans, lien recordings, and foreclosure procedures managed with statutory compliance." },
      { label: "CC&R enforcement", description: "Violations documented with photos and evidence, notices follow required timelines, hearings scheduled with due process, and fines assessed per the enforcement policy." },
      { label: "Reserve study compliance", description: "Component inventory with condition assessment, useful life, replacement cost, and percent funded calculation. Annual updates maintain funding adequacy." },
    ],
    faq: [
      { q: "Does it handle both condo and HOA?", a: "Yes. Condominium associations, planned unit developments, and townhome associations each have different governing document structures. The worker adapts to your specific declaration, bylaws, and rules." },
      { q: "How does it manage reserve funds?", a: "The reserve study component inventory is tracked with current condition, remaining useful life, and replacement cost. The worker monitors actual spending against the funding plan and flags underfunding." },
      { q: "Can it handle architectural review?", a: "Yes. Homeowner modification requests are submitted, reviewed against architectural guidelines, and approved or denied with documented rationale. Approved modifications are inspected for compliance." },
    ],
  },
  "warranty-defect": {
    headline: "Warranty claims tracked before the statute runs",
    subheadline: "Warranty period tracking, defect documentation, builder liability management, and statute of repose monitoring for new construction.",
    steps: [
      { title: "Document warranty terms", description: "Builder warranties, manufacturer warranties, and statutory warranties cataloged by system and component. Expiration dates and claim procedures documented." },
      { title: "Log and track defects", description: "Defects documented with photos, location, severity, and affected system. Each defect linked to the applicable warranty and responsible party." },
      { title: "Submit and manage claims", description: "Warranty claims submitted to builders, subcontractors, or manufacturers. Response deadlines tracked. Remediation quality verified on completion." },
      { title: "Monitor statutes and deadlines", description: "Statute of repose, statute of limitations, and warranty expiration dates monitored. Claims filed before deadlines expire. Latent defect documentation preserved." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Defect data connects to Maintenance Work Order (W-035) to distinguish warranty repairs from owner-funded maintenance. Construction Manager (W-021) provides original construction documentation for defect analysis. Quality Control (W-022) inspection records support warranty claims with contemporaneous documentation. Insurance and Risk (W-029) assesses liability exposure from construction defects. Property Management (W-033) reports tenant complaints that may indicate latent defects.",
    },
    valueProps: [
      { label: "Warranty period tracking", description: "Every warranty cataloged: 1-year workmanship, 2-year mechanical, 10-year structural, manufacturer warranties — each with expiration alerts and claim procedures." },
      { label: "Defect documentation", description: "Photos, descriptions, locations, and severity ratings create a defensible record. Expert reports and testing results attached to each defect." },
      { label: "Statute of repose monitoring", description: "State-specific statutes of repose (typically 6-12 years) tracked for each project. Claims filed before statutory deadlines expire." },
      { label: "Remediation verification", description: "Builder repairs inspected and documented. If remediation is inadequate, the claim remains open with escalation procedures and timeline." },
    ],
    faq: [
      { q: "What is the difference between warranty and statute of repose?", a: "A warranty is a contractual obligation from the builder (typically 1-10 years by system). The statute of repose is a legal deadline after which no construction defect claims can be filed regardless of when the defect was discovered. Both are tracked independently." },
      { q: "Can it handle latent defects?", a: "Yes. Defects discovered after warranty expiration but before the statute of repose may still be actionable. The worker documents discovery date, investigation, and applicable legal deadlines." },
      { q: "Does it track manufacturer warranties separately?", a: "Yes. Appliances, HVAC equipment, roofing, windows, and other components each have manufacturer warranties tracked independently from the builder warranty." },
    ],
  },
  "vendor-contract": {
    headline: "Vendors qualified, contracts managed, performance tracked",
    subheadline: "Vendor qualification, contract lifecycle management, performance scoring, and renewal decisions based on data, not relationships.",
    steps: [
      { title: "Qualify vendors", description: "Insurance certificates, licenses, W-9s, references, and safety records collected and verified. Approved vendor list maintained with expiration tracking." },
      { title: "Execute and manage contracts", description: "Contract terms, scope, pricing, insurance requirements, and performance standards documented. Amendments and change orders tracked through the contract lifecycle." },
      { title: "Track performance", description: "Response time, completion quality, pricing accuracy, callback rate, and compliance tracked for every work order and project. Quarterly performance reviews generated." },
      { title: "Make data-driven renewal decisions", description: "Contract renewals evaluated against performance data, market pricing, and alternative vendor qualifications. Negotiate from a position of documented evidence." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Vendor performance data feeds Maintenance Work Order (W-035) for dispatch decisions and preferred vendor routing. Bid Procurement (W-013) uses qualified vendor lists for competitive bidding. Insurance certificates connect to Insurance and Risk (W-029) for coverage verification. Contract costs flow to Accounting (W-039) for AP processing. Property Management (W-033) assigns vendors to properties based on qualification and performance.",
    },
    valueProps: [
      { label: "Insurance certificate tracking", description: "GL, auto, workers comp, umbrella, and professional liability policies tracked with expiration alerts. Non-compliant vendors flagged before work is assigned." },
      { label: "Performance scoring", description: "Every vendor scored on response time, quality, pricing, safety, and communication. Scores calculated from actual work order and project data, not subjective assessment." },
      { label: "Contract lifecycle management", description: "From RFP through execution, amendment, renewal, or termination — every contract stage managed with version control and approval workflows." },
      { label: "Competitive bid management", description: "RFPs distributed to qualified vendors, proposals compared, and awards documented with selection rationale for audit defense." },
    ],
    faq: [
      { q: "How does vendor qualification work?", a: "Vendors submit insurance certificates, licenses, W-9s, references, and safety records. The worker verifies documents, checks expirations, and maintains the approved vendor list. Vendors cannot receive work orders until fully qualified." },
      { q: "Can it handle both maintenance and construction vendors?", a: "Yes. Maintenance vendors (plumbers, electricians, HVAC) and construction vendors (GCs, subcontractors, consultants) are tracked in the same system with appropriate qualification requirements for each." },
      { q: "How are performance scores calculated?", a: "Scores are weighted composites of response time, completion quality, pricing accuracy, callback rate, and compliance. Weights are configurable by property or portfolio. Only actual work order data drives the score." },
    ],
  },
  "disposition-preparation": {
    headline: "Sale-ready in weeks, not months",
    subheadline: "Property positioning, due diligence assembly, buyer qualification, and disposition preparation for investment real estate sales.",
    steps: [
      { title: "Assess disposition readiness", description: "Financial performance, lease status, deferred maintenance, title issues, and environmental status evaluated. Action items identified to maximize value before going to market." },
      { title: "Assemble the data room", description: "Financial statements, rent roll, leases, surveys, title, environmental, tax returns, insurance, and capital expenditure records organized for buyer due diligence." },
      { title: "Position the property", description: "Investment summary, financial projections, market analysis, and value-add thesis prepared. Pricing strategy developed from comparable transactions and current market conditions." },
      { title: "Manage the sale process", description: "Buyer inquiries tracked, NDAs executed, data room access managed, offers compared, and PSA negotiation documented through closing." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Disposition Preparation pulls financial data from Accounting (W-039), rent roll from Rent Roll and Revenue (W-034), and property condition data from Maintenance Work Order (W-035). Appraisal and Valuation (W-030) supports pricing strategy. Disposition Marketing (W-050) handles buyer outreach and marketing materials. 1031 Exchange (W-043) manages exchange timelines when the sale is part of a tax-deferred strategy.",
    },
    valueProps: [
      { label: "Due diligence data room", description: "Every document a buyer will request organized, indexed, and access-controlled. Reduces due diligence timeline and demonstrates institutional-quality operations." },
      { label: "Property positioning", description: "Investment summary with historical performance, go-forward projections, market context, and value-add thesis. Positioned for your target buyer profile." },
      { label: "Offer comparison", description: "Multiple offers compared on price, earnest money, due diligence period, financing contingency, closing timeline, and buyer qualifications." },
      { label: "Closing coordination", description: "PSA conditions, title clearance, estoppel certificates, tenant notifications, and closing deliverables tracked through final settlement." },
    ],
    faq: [
      { q: "How early should I start preparing?", a: "Ideally 6-12 months before listing. The worker identifies value-enhancement opportunities — lease renewals, deferred maintenance, expense reduction — that can measurably increase sale price." },
      { q: "What goes in the data room?", a: "Three years of financials, current rent roll, all leases, survey, title commitment, Phase I, tax returns, insurance policies, capital expenditure history, and service contracts. The worker provides a comprehensive checklist by asset type." },
      { q: "Can it handle a portfolio sale?", a: "Yes. Multiple properties packaged with individual and consolidated financials, combined rent rolls, and portfolio-level investment thesis. Buyers can evaluate the portfolio and individual assets." },
    ],
  },
  "exchange-1031": {
    headline: "1031 exchange timelines that never slip",
    subheadline: "Exchange qualification, 45-day identification, 180-day closing, qualified intermediary coordination, and replacement property analysis.",
    steps: [
      { title: "Qualify the exchange", description: "Property type, hold period, use, and taxpayer intent evaluated for 1031 eligibility. Like-kind requirements confirmed. QI engaged before closing the relinquished property." },
      { title: "Track the 45-day identification period", description: "Replacement property candidates identified, evaluated, and formally designated within 45 days. Three-property rule, 200% rule, and 95% rule options analyzed." },
      { title: "Manage the 180-day exchange period", description: "Due diligence, financing, and closing of replacement property tracked against the 180-day deadline. Timeline risk alerts at key milestones." },
      { title: "Document exchange completion", description: "QI disbursement, deed recordings, and tax reporting documented. Boot calculations, basis adjustments, and Form 8824 preparation supported." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Exchange timelines connect to Disposition Preparation (W-042) to ensure the relinquished property closes with QI involvement. The CRE Analyst (W-002) underwrites replacement property candidates within the 45-day window. Market Research (W-001) identifies replacement property markets. Accounting (W-039) tracks adjusted basis and deferred gain. Entity Formation (W-046) ensures exchange-compatible entity structures.",
    },
    valueProps: [
      { label: "45-day identification tracking", description: "Candidate properties evaluated and ranked. Formal identification filed within the 45-day window using the optimal identification rule for your situation." },
      { label: "180-day deadline management", description: "Every milestone from QI engagement through replacement property closing tracked against the 180-day deadline with risk alerts and contingency planning." },
      { label: "Boot calculation and basis tracking", description: "Cash boot, mortgage boot, and net boot calculated. Adjusted basis of replacement property computed for depreciation and future disposition planning." },
      { label: "Reverse and improvement exchange support", description: "Reverse exchange (EAT structure) and improvement exchange timelines and requirements tracked when standard forward exchanges are not feasible." },
    ],
    faq: [
      { q: "What happens if I miss the 45-day deadline?", a: "The exchange fails and the full capital gain is recognized. There are no extensions. The worker tracks this deadline aggressively with alerts starting at day 30 and daily reminders from day 40." },
      { q: "Can I do a partial exchange?", a: "Yes. If the replacement property costs less than the relinquished property, or if you receive cash, you will have taxable boot. The worker calculates the boot and resulting tax liability." },
      { q: "What about related party exchanges?", a: "Related party exchanges have a 2-year holding requirement. If either party disposes of the property within 2 years, the exchange is disqualified. The worker tracks this holding period for both parties." },
    ],
  },
  "entity-formation": {
    headline: "The right entity structure for the deal",
    subheadline: "Entity selection, formation filings, operating agreements, registered agent services, and ongoing compliance for real estate ventures.",
    steps: [
      { title: "Analyze entity structure needs", description: "Tax treatment, liability protection, management structure, investor requirements, and state-specific considerations evaluated to recommend the optimal entity structure." },
      { title: "Form the entities", description: "Articles of organization or incorporation filed. EIN obtained. Registered agent designated. State business registrations completed in each operating jurisdiction." },
      { title: "Draft operating agreements", description: "Management rights, capital contributions, profit allocation, distribution waterfalls, transfer restrictions, and dissolution procedures documented." },
      { title: "Maintain ongoing compliance", description: "Annual reports, franchise taxes, registered agent renewals, and foreign qualification filings tracked with deadlines and automated reminders." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Entity structures feed Accounting (W-039) for proper entity-level bookkeeping. Opportunity Zone (W-020) compliance requires specific fund entity structures. 1031 Exchange (W-043) eligibility depends on entity consistency. Capital Stack Optimizer (W-004) models investor returns based on the partnership or LLC structure. Investor Reporting (W-051) uses the operating agreement waterfall for distribution calculations.",
    },
    valueProps: [
      { label: "Entity structure analysis", description: "LLC, LP, S-Corp, C-Corp, Series LLC, and Delaware statutory trusts evaluated based on your specific tax, liability, management, and investor requirements." },
      { label: "Multi-state compliance", description: "Foreign qualification filings, annual reports, and franchise taxes tracked for every state where your entities operate. Deadline alerts prevent administrative dissolution." },
      { label: "Operating agreement management", description: "Key provisions tracked: capital calls, distribution waterfalls, management authority, transfer restrictions, tag-along/drag-along rights, and amendment procedures." },
      { label: "Corporate governance", description: "Resolutions, consents, annual meetings, and member/partner actions documented. Clean corporate records maintained for lender and investor due diligence." },
    ],
    faq: [
      { q: "LLC or LP for a real estate fund?", a: "Most real estate funds use a limited partnership (LP) with an LLC as the general partner. This provides the GP with liability protection while giving LPs the pass-through tax treatment and liability protection they expect. The worker analyzes your specific situation." },
      { q: "What about Series LLCs?", a: "Series LLCs are available in some states and allow multiple properties in separate series within one entity. The worker tracks which states recognize series, filing requirements, and the ongoing debate about bankruptcy protection." },
      { q: "How does it handle foreign qualification?", a: "When an entity operates in a state other than its formation state, it must foreign-qualify. The worker tracks registration requirements, annual report deadlines, and franchise taxes in each operating state." },
    ],
  },
  "property-insurance": {
    headline: "Coverage verified, claims tracked, risk quantified",
    subheadline: "Property and casualty policy management, coverage analysis, claims tracking, and risk assessment across your real estate portfolio.",
    steps: [
      { title: "Inventory insurance policies", description: "Property, general liability, umbrella, builders risk, professional liability, D&O, and environmental policies cataloged with coverage limits, deductibles, exclusions, and renewal dates." },
      { title: "Analyze coverage adequacy", description: "Replacement cost, liability limits, flood zone status, earthquake exposure, and business interruption coverage evaluated against portfolio risk. Coverage gaps identified." },
      { title: "Track claims", description: "Claims filed, documented, adjusted, and resolved. Loss runs maintained. Incident reports connected to work orders, tenant complaints, and safety observations." },
      { title: "Manage renewals and marketing", description: "Renewal submissions prepared, broker marketing tracked, quote comparisons analyzed, and binder/policy review completed before expiration." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Insurance data connects to Insurance and Risk (W-029) for enterprise risk assessment. Vendor and Contract Management (W-041) tracks vendor insurance certificates against your requirements. Maintenance Work Order (W-035) incident reports trigger claims documentation. Construction Manager (W-021) coordinates builders risk coverage during development. HOA Association (W-037) tracks master policy requirements for common areas.",
    },
    valueProps: [
      { label: "Coverage gap analysis", description: "Replacement cost, liability limits, flood, earthquake, wind, mold, pollution, and cyber coverage evaluated. Gaps between exposure and coverage identified with cost to close." },
      { label: "Claims management", description: "From incident report through adjuster assignment, reserve posting, settlement negotiation, and close-out. Every claim documented with loss run impact analysis." },
      { label: "Renewal preparation", description: "Loss history, property updates, occupancy changes, and risk improvements compiled for renewal submission. Broker marketing results compared across carriers." },
      { label: "Certificate of insurance tracking", description: "Additional insured status, waiver of subrogation, and primary/non-contributory requirements verified for every vendor and tenant. Non-compliance flagged before work begins." },
    ],
    faq: [
      { q: "How does it track replacement cost?", a: "Insured values are compared against construction cost indices and recent appraisals. The worker flags properties where insured replacement cost appears below actual replacement cost, which could result in coinsurance penalties." },
      { q: "Can it handle builders risk to permanent conversion?", a: "Yes. During construction, builders risk coverage is tracked. At substantial completion, the worker manages the transition to permanent property and liability policies, ensuring no gap in coverage." },
      { q: "Does it manage tenant insurance requirements?", a: "Yes. Lease-required tenant insurance (renters insurance, commercial GL) is tracked by unit. Non-compliant tenants are flagged with notice templates and lease enforcement procedures." },
    ],
  },
  "disposition-marketing": {
    headline: "Buyers found, materials polished, offers managed",
    subheadline: "Marketing materials, data room setup, buyer outreach, and offer management for investment real estate dispositions.",
    steps: [
      { title: "Prepare marketing materials", description: "Offering memorandum, property website, email campaigns, and broker presentations created from property data already in your Vault." },
      { title: "Build and manage the data room", description: "Due diligence documents organized, indexed, and access-controlled. Buyer activity tracked — who viewed what and for how long." },
      { title: "Execute buyer outreach", description: "Target buyer list developed from investor databases, broker networks, and past transaction relationships. Outreach tracked with response rates and interest levels." },
      { title: "Manage offers through closing", description: "Offers received, compared, countered, and negotiated. LOI through PSA execution tracked. Best-and-final rounds managed when multiple qualified bidders compete." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Disposition Marketing receives property positioning from Disposition Preparation (W-042). Financial data flows from Accounting (W-039) and Rent Roll and Revenue (W-034) into marketing materials. Market Research (W-001) provides market context for the offering memorandum. Appraisal and Valuation (W-030) supports pricing discussions with buyers. 1031 Exchange (W-043) manages exchange-motivated buyer requirements.",
    },
    valueProps: [
      { label: "Offering memorandum generation", description: "Professional OM with property description, financial summary, market analysis, tenant overview, and investment thesis — assembled from Vault data." },
      { label: "Data room analytics", description: "Track which buyers accessed which documents, for how long, and how many times. Buyer engagement scoring helps prioritize follow-up." },
      { label: "Buyer qualification", description: "Financial capacity, transaction history, asset class experience, and exchange requirements evaluated. Focus your time on buyers who can actually close." },
      { label: "Offer comparison matrix", description: "Price, earnest money, due diligence period, financing, closing timeline, and contingencies compared across all offers in a standardized format." },
    ],
    faq: [
      { q: "Does this replace a broker?", a: "No. The worker supports the marketing and transaction management process. Your broker provides market relationships, buyer access, and negotiation expertise. The worker makes both of you more efficient." },
      { q: "How does it build the buyer list?", a: "Target buyers identified by asset class focus, geographic preference, deal size, and transaction history. Your broker's relationships are supplemented with database research and past transaction data." },
      { q: "Can it manage a sealed-bid process?", a: "Yes. Call for offers, best-and-final rounds, and sealed-bid processes managed with standardized submission requirements and comparison frameworks." },
    ],
  },
  "investor-reporting": {
    headline: "LP reporting that builds confidence every quarter",
    subheadline: "Quarterly reports, distribution calculations, K-1 coordination, and investor communications for real estate partnerships.",
    steps: [
      { title: "Generate quarterly reports", description: "Property performance, financial statements, market updates, and portfolio summary assembled into institutional-format quarterly reports for your limited partners." },
      { title: "Calculate distributions", description: "Waterfall calculations per your operating agreement: preferred return, return of capital, catch-up, and promote tiers. Each investor's distribution computed and documented." },
      { title: "Coordinate K-1 preparation", description: "Tax basis capital accounts, Section 704(b) allocations, and partner-level tax items organized for your CPA. K-1 delivery timeline managed with investor communications." },
      { title: "Manage investor communications", description: "Capital call notices, distribution notices, annual meeting materials, and ad hoc updates. Every communication logged with delivery confirmation." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Financial data flows from Accounting (W-039) into investor reports. Rent Roll and Revenue (W-034) provides occupancy and revenue metrics. Capital Stack Optimizer (W-004) models return projections for investor updates. Opportunity Zone (W-020) compliance status included for QOZ investors. Entity Formation (W-046) operating agreement waterfalls drive distribution calculations. Debt Service (W-052) provides loan status for leverage reporting.",
    },
    valueProps: [
      { label: "Waterfall calculations", description: "Multi-tier waterfall distributions computed per your operating agreement: preferred return accrual, return of capital priority, GP catch-up, and promote splits at each hurdle rate." },
      { label: "Institutional-format quarterly reports", description: "Property-level and portfolio-level performance, capital account statements, market commentary, and forward outlook — the quality your institutional LPs expect." },
      { label: "K-1 coordination", description: "Tax basis and 704(b) capital accounts maintained, partner-level allocations computed, and CPA coordination managed to deliver K-1s on schedule." },
      { label: "Investor portal readiness", description: "Reports, statements, tax documents, and correspondence organized by investor. Document delivery tracked with read receipts." },
    ],
    faq: [
      { q: "How does the waterfall calculation work?", a: "The worker reads your operating agreement waterfall structure — preferred return, return of capital, catch-up, and promote tiers — and computes each investor's distribution based on their capital account, accrued preferred, and the total distributable amount." },
      { q: "Can it handle multiple funds?", a: "Yes. Each fund has its own operating agreement, waterfall structure, and investor roster. Reporting is generated per fund and can be consolidated for investors participating in multiple vehicles." },
      { q: "When should K-1s be delivered?", a: "The worker tracks your target delivery date (typically March 15 for partnerships) and manages the preparation timeline backward from that date — CPA engagement, data delivery, draft review, and final distribution." },
    ],
  },
  "debt-service": {
    headline: "Loan payments, covenants, and compliance — nothing missed",
    subheadline: "Loan payment tracking, covenant monitoring, compliance reporting, and refinance analysis for real estate debt portfolios.",
    steps: [
      { title: "Load loan terms", description: "Loan amount, rate (fixed/floating), amortization, maturity, prepayment provisions, covenants, and reserve requirements documented for each loan." },
      { title: "Track payments and balances", description: "Monthly P&I payments, escrow deposits, and reserve sweeps tracked. Outstanding balance, accrued interest, and remaining term updated with each payment." },
      { title: "Monitor covenants", description: "DSCR, LTV, debt yield, occupancy, and net worth covenants tested quarterly. Compliance reported to lenders. Cure period alerts when covenants approach triggers." },
      { title: "Analyze refinance opportunities", description: "Current terms compared to market rates. Prepayment penalty, defeasance cost, and new loan proceeds modeled. Break-even analysis for refinance timing." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Debt service data flows to Accounting (W-039) for interest expense and amortization entries. The CRE Analyst (W-002) uses loan terms in underwriting models. Construction Lending (W-015) manages construction-to-permanent loan conversion. Investor Reporting (W-051) includes leverage metrics in LP communications. Capital Stack Optimizer (W-004) evaluates refinance scenarios against the full capital structure.",
    },
    valueProps: [
      { label: "Covenant monitoring", description: "DSCR, LTV, debt yield, occupancy, and net worth covenants tested against actual performance. Early warning alerts when ratios approach covenant triggers." },
      { label: "Rate management", description: "Floating rate loans tracked with index, spread, floor, cap, and swap details. Interest rate exposure quantified across the portfolio." },
      { label: "Maturity management", description: "Loan maturity dates tracked with refinance or payoff planning timelines. No maturity arrives without a plan already in motion." },
      { label: "Prepayment and defeasance analysis", description: "Yield maintenance, defeasance, step-down, and fixed penalty calculations modeled to evaluate early payoff or refinance economics." },
    ],
    faq: [
      { q: "How does covenant monitoring work?", a: "The worker calculates covenant ratios using actual financial data from Accounting (W-039) and occupancy data from Rent Roll and Revenue (W-034). When a ratio falls within a warning threshold, alerts fire before a technical default occurs." },
      { q: "Can it handle interest rate swaps?", a: "Yes. Swap notional, fixed rate, floating index, payment dates, and mark-to-market are tracked. The worker monitors swap compliance alongside the loan covenants." },
      { q: "What about construction loan conversion?", a: "The worker tracks mini-perm and construction-to-permanent conversion requirements: occupancy thresholds, DSCR tests, completion certificates, and conversion notice deadlines." },
    ],
  },
  "tax-assessment": {
    headline: "Property taxes reviewed before you overpay",
    subheadline: "Assessment analysis, appeal preparation, payment tracking, and tax projection across your real estate portfolio.",
    steps: [
      { title: "Review assessments", description: "Property tax assessments compared against market value, comparable sales, and income approach. Over-assessments flagged with estimated savings from a successful appeal." },
      { title: "Prepare appeals", description: "Appeal evidence assembled: comparable sales, income data, cost approach, and assessment methodology errors. Filing deadlines tracked by jurisdiction." },
      { title: "Track payments and exemptions", description: "Tax bills, payment deadlines, installment schedules, and exemption applications managed. Delinquency alerts prevent penalties and lien risk." },
      { title: "Project future tax liability", description: "Reassessment triggers, millage rate trends, and exemption expirations modeled. Budget impact quantified for hold period and disposition planning." },
    ],
    bridge: {
      title: "Connected to your financial stack",
      text: "Tax assessment data flows to Accounting (W-039) for expense accruals and budget variance. CRE Analyst (W-002) incorporates property tax projections into underwriting. Disposition Preparation (W-042) includes tax status in buyer due diligence packages. 1031 Exchange (W-043) tracks basis adjustments for exchange properties. Investor Reporting (W-051) includes tax expense details in quarterly reports.",
    },
    valueProps: [
      { label: "Assessment accuracy analysis", description: "Every assessment compared against three valuation approaches: sales comparison, income capitalization, and cost. Over-assessments identified with estimated savings." },
      { label: "Appeal deadline management", description: "Filing windows, hearing dates, and evidence submission deadlines tracked by jurisdiction. No appeal window missed due to overlooked deadlines." },
      { label: "Payment optimization", description: "Installment schedules, early payment discounts, and escrow analysis ensure you never overpay and never miss a deadline." },
      { label: "Portfolio-wide tax projection", description: "Reassessment triggers, rate changes, and exemption expirations modeled across your entire portfolio for accurate budgeting." },
    ],
    faq: [
      { q: "Does this replace my tax attorney?", a: "It augments them. The worker identifies appeal opportunities, assembles evidence, and tracks deadlines. Your attorney handles hearings, legal arguments, and settlement negotiations." },
      { q: "How does it handle different jurisdictions?", a: "Each property's tax jurisdiction is tracked individually: assessment cycles, appeal procedures, filing deadlines, and tax rates. Multi-state portfolios are fully supported." },
      { q: "Can it project reassessment impact?", a: "Yes. Sale price disclosure requirements, assessment cap resets, and improvement triggers are modeled so you can quantify the tax impact of acquisitions, dispositions, and capital projects." },
    ],
  },
  // ── Auto Dealer — Phases 0-3 ──
  "ad-dealer-licensing": {
    headline: "Stay licensed. Stay open. Stay compliant.",
    subheadline: "License tracking, FTC Safeguards compliance, OFAC screening, CARS Rule readiness, and a regulatory calendar that never lets a deadline slip.",
    steps: [
      { title: "Inventory your licenses", description: "Dealer licenses, salesperson licenses, bonds, and permits across every state you operate in — tracked in one place with renewal dates and fees." },
      { title: "Audit FTC Safeguards compliance", description: "The 2023 Safeguards Rule makes dealerships financial institutions. The worker runs a gap analysis against the nine required elements and identifies what needs fixing." },
      { title: "Screen against OFAC", description: "Every customer-facing transaction requires OFAC SDN screening. The worker flags any match or partial match before the deal progresses." },
      { title: "Track the regulatory calendar", description: "License renewals, bond expirations, CARS Rule deadlines, state filings — every date on one calendar with alerts at 90, 60, and 30 days." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Licensing data feeds into every worker in the dealership. AD-010 Desking checks license status before structuring deals. AD-014 F&I Compliance verifies salesperson licensing before contract signing. AD-026 Regulatory Compliance aggregates all compliance status. If a license lapses, every downstream worker knows immediately.",
    },
    valueProps: [
      { label: "FTC Safeguards gap analysis", description: "The nine required elements of the Safeguards Rule mapped against your current practices. Gaps identified with specific remediation steps." },
      { label: "OFAC screening integration", description: "SDN list screening on every customer before deal commitment. Matches flagged with required escalation procedures." },
      { label: "Multi-state license tracking", description: "Dealer and salesperson licenses across all operating states. Renewal dates, fees, bond requirements, and status in one view." },
      { label: "CARS Rule readiness", description: "The January 2026 FTC CARS Rule changes pricing disclosure requirements. This worker tracks compliance with the new rules." },
    ],
    faq: [
      { q: "Does this replace our compliance officer?", a: "No. This worker tracks deadlines, runs gap analyses, and flags issues. A qualified compliance officer or attorney makes the final decisions. The worker ensures nothing falls through the cracks." },
      { q: "How does OFAC screening work?", a: "The worker checks customer names against the OFAC Specially Designated Nationals list. Matches and partial matches are flagged for review by the dealership's compliance officer before the transaction proceeds." },
      { q: "What happens if a license expires?", a: "The worker alerts at 90, 60, and 30 days before expiration. If a license lapses, all downstream workers are notified and transactions requiring that license are flagged until it is renewed." },
    ],
  },
  "ad-facility-operations": {
    headline: "Your building, systems, and departments — ready to operate",
    subheadline: "Franchise compliance, facility inspections, DMS configuration, departmental P&L structure, and ADA/OSHA/environmental readiness.",
    steps: [
      { title: "Track franchise obligations", description: "Franchise agreement terms, image program deadlines, manufacturer performance metrics, and termination notice periods — all documented and monitored." },
      { title: "Prepare for inspections", description: "ADA, OSHA, environmental, and manufacturer facility checklists generated and tracked. Corrective actions assigned with follow-up dates." },
      { title: "Configure DMS", description: "DMS-specific setup checklists for CDK, Reynolds, Dealertrack, DealerBuilt, or Tekion. Chart of accounts, integrations, and data feeds verified against NADA standards." },
      { title: "Structure departmental P&L", description: "New, used, F&I, service, parts, and body shop — each department structured with standard P&L line items mapped to NADA 20-Group benchmarks." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Facility and operational data feeds every department. AD-001 Licensing monitors franchise compliance alongside regulatory status. AD-026 Accounting receives departmental P&L structure. AD-027 HR tracks OSHA training requirements surfaced by facility inspections. When the manufacturer changes image program requirements, this worker recalculates the timeline and budget impact.",
    },
    valueProps: [
      { label: "Franchise compliance monitoring", description: "Image program deadlines, performance metrics, and manufacturer demands tracked against state franchise protection statutes. Termination risks flagged early." },
      { label: "OSHA and ADA readiness", description: "Lift inspections, chemical storage, SDS sheets, ADA self-assessments, and fire safety — all tracked with corrective action workflows." },
      { label: "Environmental compliance", description: "Waste oil hauler contracts, EPA 608 certifications, stormwater permits, and tire disposal — regulatory requirements that carry six-figure penalties if missed." },
      { label: "DMS configuration audit", description: "Your DMS setup verified against NADA standards. Chart of accounts, integration points, and data feeds validated before go-live." },
    ],
    faq: [
      { q: "Which DMS systems are supported?", a: "CDK, Reynolds & Reynolds, Dealertrack, DealerBuilt, and Tekion. Each has a specific configuration checklist based on NADA 20-Group chart of accounts standards." },
      { q: "How serious are OSHA violations?", a: "A willful OSHA violation can cost up to $156,259 per violation (2024 adjusted). Service department hazards — uninspected lifts, missing SDS sheets, improper chemical storage — are the most common findings." },
      { q: "What about franchise termination?", a: "The worker tracks all franchise agreement obligations and alerts on any manufacturer demand that may conflict with state franchise protection statutes. If a termination notice arrives, it fires a critical alert with protest deadline information." },
    ],
  },
  "ad-new-car-allocation": {
    headline: "Win allocation. Maximize incentives. Move metal.",
    subheadline: "Factory allocation tracking, turn-and-earn optimization, pipeline order management, and manufacturer incentive calendar.",
    steps: [
      { title: "Track allocations", description: "Monthly allocation numbers by model, trim, and color. Compare allocation to sales rate. Identify models where you are over or under-allocated." },
      { title: "Optimize turn and earn", description: "Manufacturers reward dealers who turn inventory quickly. The worker tracks your turn rate by model and recommends order adjustments to maximize future allocation." },
      { title: "Manage pipeline orders", description: "Customer orders, stock orders, and dealer trades tracked from order to delivery. ETA updates, constraint codes, and order status monitored." },
      { title: "Track incentives", description: "Manufacturer incentive programs, stair-step bonuses, conquest cash, loyalty rebates, and dealer cash — all mapped to inventory with expiration dates." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Allocation data feeds AD-010 Desking for deal structuring — the desk needs to know if a unit is allocated or must be ordered. Incentive data flows to AD-010 and AD-014 F&I for accurate deal worksheets. AD-011 Inventory Turn uses allocation projections for stocking guide recommendations. When a hot model is constrained, AD-009 Lead Management knows to prioritize leads for available units.",
    },
    valueProps: [
      { label: "Turn-and-earn optimization", description: "Manufacturer allocation algorithms reward fast turn. The worker tracks your performance against turn targets and recommends order adjustments to maximize next month's allocation." },
      { label: "Incentive stacking", description: "Manufacturer incentives, dealer cash, conquest bonuses, and loyalty rebates mapped to every unit. The worker identifies the maximum stackable incentive for each deal." },
      { label: "Pipeline visibility", description: "Every ordered unit tracked from factory to lot. ETA changes, constraint codes, and delivery windows updated automatically." },
      { label: "Allocation vs. demand analysis", description: "Sales rate compared to allocation by model. Over-allocated models flagged for aggressive pricing; under-allocated models flagged for customer order prioritization." },
    ],
    faq: [
      { q: "How does turn-and-earn work?", a: "Most manufacturers allocate based on how quickly you sell what you receive. The faster you turn a model, the more units you earn next cycle. This worker tracks your turn rate by model and recommends which units to prioritize for quick sale." },
      { q: "Can it track dealer trades?", a: "Yes. Dealer-to-dealer trades are tracked as a separate acquisition channel with associated costs (transport, reciprocity expectations). The worker evaluates whether a trade makes financial sense versus waiting for allocation." },
      { q: "What about electric vehicle allocation?", a: "EV allocation programs often have separate requirements — facility upgrades, charger installation, technician training. This worker tracks those prerequisites alongside standard allocation metrics." },
    ],
  },
  "ad-used-car-acquisition": {
    headline: "Buy right. The deal is made at acquisition.",
    subheadline: "Auction sourcing, trade-in appraisal support, VIN decode and history, street purchase evaluation, and acquisition cost tracking.",
    steps: [
      { title: "Source from auctions", description: "Identify target vehicles matching your stocking guide. Compare auction run lists to your inventory gaps. Set max bid based on market retail minus recon estimate minus target margin." },
      { title: "Support trade appraisals", description: "When a trade walks in, the worker provides market data — book values, competitive listings, auction results — so the appraiser can make an informed offer." },
      { title: "Decode and screen every VIN", description: "NHTSA decode for specifications, title brand check, accident history, recall status, and odometer verification. Every acquisition starts with a clean VIN." },
      { title: "Track acquisition costs", description: "Purchase price, auction fees, transport, and any buy fees recorded per vehicle. Cost basis established at acquisition for accurate gross profit calculation downstream." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Acquisition data is the starting point for the entire used car lifecycle. AD-008 Reconditioning receives the vehicle with its acquisition cost and condition assessment. AD-006 Pricing uses acquisition cost as the basis for margin calculations. AD-011 Inventory Turn compares acquisition mix to stocking guide targets. AD-005 Wholesale evaluates whether an aged unit should have been acquired at all — feeding back to improve future buying decisions.",
    },
    valueProps: [
      { label: "Market-informed buying", description: "Every purchase decision backed by current retail market data, competitive supply, and projected margin. No more guessing what a car is worth at auction." },
      { label: "VIN-first due diligence", description: "NHTSA decode, title brand screening, accident history, and recall check on every vehicle before money changes hands." },
      { label: "Cost basis accuracy", description: "Purchase price, fees, transport, and conditioning costs captured at acquisition. Gross profit calculations downstream are only as good as the cost basis." },
      { label: "Stocking guide alignment", description: "Every acquisition decision compared to your ideal inventory mix. The worker flags when you are buying outside your target segments." },
    ],
    faq: [
      { q: "Does this replace my used car manager?", a: "No. Your used car manager makes the buying decision. This worker provides the market data, history screening, and cost analysis that supports better decisions — and tracks every acquisition for performance analysis." },
      { q: "How does auction sourcing work?", a: "The worker matches vehicles on upcoming auction run lists to gaps in your inventory identified by AD-011 Stocking Guide. For each match, it shows projected retail, estimated recon, and target acquisition price." },
      { q: "What about off-lease and rental returns?", a: "Off-lease and rental fleet vehicles are tracked as a separate acquisition channel with their own sourcing metrics, reconditioning expectations, and margin profiles." },
    ],
  },
  "ad-wholesale-disposition": {
    headline: "Cut losses early. Wholesale with discipline.",
    subheadline: "Aging unit identification, wholesale vs. retail analysis, auction scheduling, loss forecasting, and floor plan exposure management.",
    steps: [
      { title: "Identify wholesale candidates", description: "Units past the configured age threshold, below margin floor after holding costs, or outside the stocking guide parameters — flagged daily for wholesale review." },
      { title: "Analyze wholesale vs. retail", description: "For each candidate: projected retail gross (with time to sell), projected wholesale loss, and floor plan cost of holding. The math decides, not emotion." },
      { title: "Schedule auction runs", description: "Wholesale candidates grouped by auction schedule. Transport arranged. Reserve prices set based on market data. Run results tracked." },
      { title: "Manage floor plan exposure", description: "Every day a unit sits, it costs floor plan interest, insurance, and lot rent. The worker quantifies total holding cost exposure and identifies the day when wholesale becomes cheaper than holding." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Wholesale disposition closes the loop on the used car lifecycle. AD-006 Pricing feeds aging and margin data. AD-008 Reconditioning flags units where recon cost exceeded value-add. AD-004 Acquisition receives wholesale performance feedback to improve future buying. AD-011 Inventory Turn adjusts stocking guide targets based on wholesale loss patterns by segment.",
    },
    valueProps: [
      { label: "Data-driven wholesale timing", description: "The break-even day calculated for every unit — the exact date when holding costs make wholesale the better financial decision." },
      { label: "Floor plan exposure tracking", description: "Daily and cumulative holding costs per unit and for the entire aged inventory. Total exposure quantified in dollars, not days." },
      { label: "Loss forecasting", description: "Projected wholesale loss per unit and in aggregate. Monthly wholesale budget modeled against historical loss rates by segment and acquisition source." },
      { label: "Feedback to acquisition", description: "Wholesale loss patterns analyzed by vehicle segment, acquisition source, and age at wholesale. Data flows back to AD-004 to improve future buying decisions." },
    ],
    faq: [
      { q: "When should a unit go to wholesale?", a: "When the cost of holding (floor plan interest, insurance, lot rent, opportunity cost) exceeds the remaining retail margin. The worker calculates this break-even point for every unit and recommends wholesale when the math says hold no longer." },
      { q: "How are reserves set?", a: "Reserve prices are based on current wholesale market data — Manheim Market Report, auction lane results for comparable units, and the dealer's cost basis. The goal is to minimize loss, not to recover cost." },
      { q: "Can I track wholesale performance by buyer?", a: "Yes. Auction results tracked by lane, auction house, and if applicable, specific wholesale buyer. Patterns in sale prices help optimize future auction channel selection." },
    ],
  },
  "ad-used-car-pricing": {
    headline: "Price to the market. Not to your gut.",
    subheadline: "Market-based pricing, price-to-market monitoring, aging adjustments, VDP correlation, and margin forecasting for every used unit.",
    steps: [
      { title: "Pull the competitive set", description: "Same year, make, model, trim within your market radius. Adjusted for mileage, condition, and equipment. The competitive set is the market — not book values." },
      { title: "Set price-to-market", description: "Recommended retail price calculated at your target price-to-market percentage. See where you land on the CarGurus deal rating scale and what gross that produces." },
      { title: "Monitor aging and adjust", description: "Units that are not converting get data-driven price reduction recommendations. But if a unit has strong VDP views and no leads, the issue is not price — it is the listing." },
      { title: "Forecast margin", description: "Acquisition cost plus recon plus holding cost subtracted from recommended price. Projected gross shown at current price, recommended price, and break-even price." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Pricing data flows everywhere. AD-010 Desking uses current retail price for deal worksheets. AD-007 Merchandising correlates listing quality to VDP performance to pricing effectiveness. AD-005 Wholesale receives margin data to identify when a unit crosses the wholesale threshold. AD-011 Inventory Turn uses pricing velocity to refine stocking guide targets.",
    },
    valueProps: [
      { label: "Competitive set pricing", description: "Every price anchored to real market data — comparable listings within your radius. No guessing, no cost-plus. The market sets the price." },
      { label: "Price-to-market monitoring", description: "Entire inventory categorized: under-priced, at-market, or over-priced. Price-to-market trend tracked over time. Market shifts detected automatically." },
      { label: "VDP performance correlation", description: "VDP views, SRP impressions, and leads correlated to pricing position. High views with no leads means price is wrong. Low views with competitive price means listing is wrong." },
      { label: "Holding cost awareness", description: "Every pricing recommendation factors in floor plan interest, insurance, and lot rent. The worker knows what the unit costs per day and when holding costs consume the margin." },
    ],
    faq: [
      { q: "Does this replace vAuto or similar tools?", a: "It can work alongside them or replace them. The worker uses the same market data principles — competitive set analysis, price-to-market ratios, and aging management — and adds Vault connectivity to reconditioning costs, acquisition data, and listing performance that standalone tools do not have." },
      { q: "How often is market data refreshed?", a: "Competitive set data is refreshed daily for active inventory and on-demand for specific units. Market shifts of more than 5% in any segment trigger alerts." },
      { q: "What about FTC pricing compliance?", a: "The worker ensures every recommended price is the actual price a consumer can buy the vehicle for, per the FTC CARS Rule. Mandatory fees like doc fees are factored in. Comparative claims like 'below KBB' are substantiated with specific values." },
    ],
  },
  "ad-vehicle-merchandising": {
    headline: "If the listing is bad, the price does not matter.",
    subheadline: "Photo standards enforcement, listing quality scoring, VDP performance tracking, and multi-platform syndication management.",
    steps: [
      { title: "Audit photos", description: "Photo count, quality, sequence, and completeness checked against your standards. Missing angles flagged. Blurry or poorly lit photos identified for reshoot." },
      { title: "Score listing quality", description: "Title, description, features, disclosures, and photos scored against best practices. A listing quality score predicts VDP engagement before the unit goes live." },
      { title: "Track VDP performance", description: "Views, SRP impressions, leads, and SRP-to-VDP click-through rate monitored per unit. Underperforming listings flagged for content improvement before price reduction." },
      { title: "Manage syndication", description: "Listings syndicated to AutoTrader, Cars.com, CarGurus, Facebook Marketplace, and dealer website. Syndication status and platform-specific performance tracked." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Merchandising quality directly impacts pricing effectiveness. AD-006 Pricing correlates VDP performance to price-to-market position — a competitive price with a bad listing produces zero leads. AD-009 Lead Management receives lead source data to track which listings generate the best leads. AD-008 Reconditioning feeds completed recon photos directly to listings.",
    },
    valueProps: [
      { label: "Photo standards enforcement", description: "Minimum photo count, required angles, quality thresholds, and proper sequencing. Listings that do not meet standards are flagged before publication." },
      { label: "Listing quality scoring", description: "Every listing scored on completeness, accuracy, and engagement potential. Low-scoring listings improved before they go live — preventing wasted advertising spend." },
      { label: "VDP-to-lead conversion tracking", description: "Views alone do not sell cars. The worker tracks the full funnel: SRP impression to VDP view to lead submission. Conversion drop-offs identify listing problems." },
      { label: "Multi-platform syndication", description: "Listing status across all syndication partners in one view. Platform-specific performance compared to identify where your advertising dollars work hardest." },
    ],
    faq: [
      { q: "How many photos should each listing have?", a: "Industry best practice is 30-40 photos per unit in a standardized sequence. The worker enforces your configured minimum and flags missing standard angles (front 3/4, rear 3/4, interior, engine, tires, odometer)." },
      { q: "Does it write listing descriptions?", a: "The worker generates listing descriptions based on vehicle features, condition, and market position. All descriptions include the AI disclosure per platform rules. Descriptions are presented for manager approval before publication." },
      { q: "What about video walkarounds?", a: "Video content is tracked alongside photos. The worker flags units that have photos but no video, and prioritizes high-value or slow-moving units for video production." },
    ],
  },
  "ad-reconditioning": {
    headline: "Fast recon. Controlled cost. Front-line ready.",
    subheadline: "Reconditioning pipeline management, vendor assignment and tracking, cost approval workflows, and cycle time optimization.",
    steps: [
      { title: "Intake and inspect", description: "Vehicle arrives from acquisition. Inspection checklist generated based on vehicle type and condition grade. Recon needs identified and estimated." },
      { title: "Assign vendors and track", description: "Mechanical, body, detail, PDR, wheel repair, and interior work assigned to internal or external vendors. Each job tracked with start time, promised completion, and actual completion." },
      { title: "Approve costs before work begins", description: "Recon cost estimate presented against projected retail margin. If recon exceeds the configured percentage of projected gross, the unit is flagged for manager review before work proceeds." },
      { title: "Measure cycle time", description: "Days from acquisition to front-line ready tracked per unit, per vendor, and per work type. Bottlenecks identified. Target cycle time enforced." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Reconditioning is the bridge between acquisition and sale. AD-004 Acquisition sends vehicles with condition assessments. AD-006 Pricing uses actual recon cost for accurate margin calculation. AD-007 Merchandising receives front-line ready notification and completed recon photos. AD-005 Wholesale flags units where recon cost would exceed value-add.",
    },
    valueProps: [
      { label: "Pipeline visibility", description: "Every unit in recon visible with current stage, assigned vendors, estimated completion, and cost-to-date. No unit disappears into the shop." },
      { label: "Cost control", description: "Recon cost approved before work begins. Over-reconditioning flagged when estimated cost exceeds the configured percentage of projected gross profit." },
      { label: "Cycle time tracking", description: "Days in recon tracked per unit, per vendor, and per work type. Your target cycle time is the benchmark — every day in recon is a day not earning margin." },
      { label: "Vendor accountability", description: "Vendor performance tracked by completion speed, quality (comeback rate), and cost accuracy. Underperforming vendors identified with data." },
    ],
    faq: [
      { q: "What is a good recon cycle time?", a: "Industry benchmark is 3-5 days from acquisition to front-line. Many dealers take 10-14 days. This worker tracks your actual cycle time, identifies bottlenecks, and measures improvement over time." },
      { q: "How is over-reconditioning prevented?", a: "The worker calculates projected retail gross for each unit and compares it to the recon estimate. If recon cost would consume more than the configured threshold of projected gross, the unit is flagged for manager review — consider reducing recon scope or wholesaling the unit." },
      { q: "Can it manage both internal and external vendors?", a: "Yes. Internal shop work and external vendor jobs are tracked on the same timeline. The worker routes work to the fastest available resource — internal bay or external vendor — based on current capacity and turnaround time." },
    ],
  },
  "ad-lead-management": {
    headline: "Every lead answered. Every opportunity tracked.",
    subheadline: "Lead pipeline management, response time enforcement, appointment setting, source ROI tracking, and BDC workflow automation.",
    steps: [
      { title: "Capture every lead", description: "Leads from all sources — website, third-party, phone, walk-in, chat, social — captured in one pipeline. No lead falls through the cracks." },
      { title: "Enforce response time", description: "Internet leads require response within minutes, not hours. The worker tracks first response time for every lead and escalates when SLA is missed." },
      { title: "Set and confirm appointments", description: "Lead-to-appointment conversion tracked. Confirmation calls and texts managed. Show rate monitored. No-shows rescheduled." },
      { title: "Measure source ROI", description: "Cost per lead, cost per appointment, cost per sale by source. Identify which lead sources actually produce sold units — not just leads." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Lead Management feeds the sales floor. AD-010 Desking receives qualified leads with vehicle interest and customer information. AD-006 Pricing uses lead volume by model to inform pricing decisions — high lead volume on a unit means the price is working. AD-003 Allocation uses lead demand data to inform factory orders. AD-020 Customer Retention identifies sold customers for service and repurchase follow-up.",
    },
    valueProps: [
      { label: "Response time enforcement", description: "Every internet lead timestamped at receipt. First response time tracked to the minute. SLA breaches escalated in real time — because the dealer who responds first wins the appointment." },
      { label: "Full-funnel tracking", description: "Lead to response to appointment to show to demo to write-up to sold. Conversion rates at every stage identify exactly where opportunities are lost." },
      { label: "Source ROI analysis", description: "Every lead source measured on cost per lead, cost per appointment, and cost per sold unit. Advertising budget allocated to sources that produce sales, not just traffic." },
      { label: "TCPA compliance", description: "Text and call consent tracked per customer. Opt-out requests honored immediately. The worker never recommends contact with a customer who has not provided consent." },
    ],
    faq: [
      { q: "What is a good response time for internet leads?", a: "Industry data shows that responding within 5 minutes produces dramatically higher contact and appointment rates than responding within 30 minutes. This worker tracks response time to the minute and escalates when your configured SLA is breached." },
      { q: "How does it handle TCPA compliance?", a: "Every text message requires documented consent. The worker tracks consent status per customer and blocks text communication to customers who have not opted in or who have opted out. Phone calls follow the same consent framework." },
      { q: "Can it manage a BDC team?", a: "Yes. Lead assignment, response tracking, appointment setting, and performance metrics are tracked per BDC agent. Team performance compared against benchmarks for response time, contact rate, and appointment set rate." },
    ],
  },
  "ad-desking": {
    headline: "Structure the deal. Maximize gross. Close the customer.",
    subheadline: "Deal structuring, payment calculation, lender program matching, trade evaluation, gross profit tracking, and compliance-first deal worksheets.",
    steps: [
      { title: "Build the deal", description: "Vehicle price, trade value, trade payoff, cash down, taxes, fees, and products assembled into a deal structure. Multiple scenarios compared side by side." },
      { title: "Calculate payments", description: "Monthly payment calculated across multiple terms (36/48/60/72/84) and rates. Customer's target payment met by adjusting term, rate, down payment, or selling price." },
      { title: "Match lender programs", description: "Customer credit profile matched to available lender programs. Rate markup, flat fee, and reserve income projected per lender. Best program for the customer and the dealer identified." },
      { title: "Track gross profit", description: "Front-end gross (vehicle margin), back-end gross (F&I products), and total gross tracked per deal. Gross compared to department average and target." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Desking is where everything converges. AD-006 Pricing provides the retail price. AD-004 Acquisition provides trade market data. AD-009 Lead Management provides the qualified customer. AD-014 F&I receives the structured deal for product presentation and contract execution. AD-015 Lender Relations manages the funding relationship. AD-001 Licensing verifies all participants are licensed.",
    },
    valueProps: [
      { label: "Multi-scenario deal worksheets", description: "Cash, finance, and lease scenarios built side by side. Different terms, rates, and down payments compared instantly. The desk manager sees every option at once." },
      { label: "Lender program matching", description: "Customer credit tier matched to active lender programs. Rate buy-down, flat fee, and reserve income projected for each option. The best deal for the customer and the store identified." },
      { label: "Compliance-first worksheets", description: "TILA, ECOA, FCRA, and state-specific disclosure requirements built into every deal worksheet. Equal credit treatment verified. Adverse action requirements tracked." },
      { label: "Gross profit visibility", description: "Front-end gross, back-end gross, and total deal profit visible before the customer signs. No surprises. No deals that look profitable but are not." },
    ],
    faq: [
      { q: "Does it handle lease deals?", a: "Yes. Residual values, money factors, acquisition fees, and manufacturer subvention programs factored into lease calculations. Lease vs. finance comparison presented to help the customer choose." },
      { q: "How does lender matching work?", a: "The worker maintains a matrix of active lender programs — credit tier ranges, advance limits, rate buy-down options, flat fees, and special programs. The customer's credit profile is matched to eligible programs and the best options presented." },
      { q: "What about compliance?", a: "Every deal worksheet includes required disclosures. ECOA equal treatment is verified — rate, terms, and pricing decisions cannot vary by protected class. FCRA adverse action requirements are tracked if the customer is declined or given less favorable terms." },
    ],
  },
  "ad-inventory-turn": {
    headline: "Stock what sells. Turn it fast.",
    subheadline: "Stocking guide optimization, days-supply analysis, segment mix management, turn velocity tracking, and inventory health scoring.",
    steps: [
      { title: "Build your stocking guide", description: "Ideal inventory mix defined by segment, price band, body style, and age. Based on your market demand, sales history, and competitive supply." },
      { title: "Measure days supply", description: "Current inventory divided by sales rate equals days supply — by segment, by price band, and overall. Over-stocked and under-stocked segments identified." },
      { title: "Optimize segment mix", description: "Sales velocity by segment compared to inventory composition. If you are selling trucks fast but stocking sedans, the mix is wrong." },
      { title: "Track turn velocity", description: "Average days to sale by segment, acquisition source, and price band. Slow-turning segments investigated — pricing, merchandising, or acquisition issue." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Inventory Turn is the strategic layer. AD-004 Acquisition receives stocking guide targets for buying decisions. AD-006 Pricing receives turn velocity data for pricing adjustments. AD-005 Wholesale receives aging alerts when units exceed turn targets. AD-003 Allocation uses demand data to inform factory orders. The stocking guide is the blueprint — every other used car worker executes against it.",
    },
    valueProps: [
      { label: "Market-driven stocking guide", description: "Your ideal inventory mix based on what your market actually buys — not what you have always stocked. Updated monthly as market demand shifts." },
      { label: "Days-supply management", description: "Days supply calculated by segment and price band. Over-stocked segments flagged for pricing action or wholesale. Under-stocked segments flagged for acquisition." },
      { label: "Turn rate benchmarking", description: "Your turn rate compared to target and to market. Average days to sale tracked by segment — identifying which inventory turns and which sits." },
      { label: "Inventory health score", description: "A single score combining age distribution, days-supply balance, segment mix alignment, and margin profile. The health score tells you if your inventory is positioned to produce results." },
    ],
    faq: [
      { q: "What is a good turn rate?", a: "Industry benchmark is 8-12 turns per year for used inventory (30-45 day average days to sale). The right target depends on your market, lot size, and floor plan cost. The worker sets your target based on your specific economics." },
      { q: "How does the stocking guide adapt?", a: "The stocking guide updates monthly based on your sales data, market demand signals, and competitive supply changes. Seasonal adjustments are built in — convertibles in spring, 4WD in fall." },
      { q: "Can it manage new and used inventory together?", a: "The stocking guide focuses on used inventory where you control the acquisition mix. New car inventory is governed by factory allocation (AD-003). However, the worker considers new car availability when recommending used inventory targets — if the factory is sending plenty of mid-size sedans, you may not need to buy them used." },
    ],
  },
  // ── Auto Dealer — Phases 4-7 (AD-012 through AD-029) ──
  "ad-fi-menu": {
    headline: "Higher PVR without the compliance risk.",
    subheadline: "Digital menu building, PVR tracking, penetration analysis, and compliance documentation for every F&I transaction.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Upload product lineup", description: "Load your menu products — VSC, GAP, tire-and-wheel, paint, theft, PPM — with provider rates, dealer cost, and retail pricing by term and coverage level." },
      { title: "Configure menu format", description: "Build digital menus with good/better/best packages or single-line presentations. Compliance disclosures auto-appended per state and FTC requirements." },
      { title: "Present to customer", description: "Interactive menu presentation with payment impact per product. Every offer, acceptance, and declination documented in real time." },
      { title: "Track PVR and penetration", description: "Per-vehicle retail (PVR) and product penetration rates tracked by F&I manager, product, and deal type. Performance benchmarked against store targets." },
    ],
    bridge: {
      title: "The Bridge",
      text: "F&I Menu connects to every deal flowing through the Vault. AD-010 Desking passes the structured deal with payment and term information. AD-013 F&I Compliance verifies that every product was offered and documented. AD-015 Lender Relations receives product contracts for funding packages. AD-025 Deal Accounting posts back-end gross from product sales. Menu performance data flows to AD-023 Digital Marketing to measure which lead sources produce the highest PVR.",
    },
    valueProps: [
      { label: "Digital menu builder with compliance", description: "State-specific disclosures, cancellation terms, and product descriptions auto-included. Every presentation documented for audit readiness." },
      { label: "Product recommendation engine", description: "Customer profile, vehicle type, and driving patterns matched to relevant products. Recommendations increase penetration without pressure tactics." },
      { label: "PVR and penetration tracking", description: "Per-vehicle retail tracked by F&I manager, product type, and deal source. Penetration rates benchmarked against NADA and industry targets." },
      { label: "Product profitability analysis", description: "Dealer cost, retail markup, cancellation reserve, and claims history analyzed per product and provider. Identify which products actually make money." },
    ],
    faq: [
      { q: "Will this replace my DMS F&I menu?", a: "It works alongside your DMS. The worker handles menu configuration, compliance documentation, and performance analytics. Deal data syncs through the Vault so your DMS of record stays current." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on F&I product placements facilitated through the platform. Your product pricing and provider relationships remain yours." },
      { q: "Is my customer data secure?", a: "All customer and deal data is encrypted at rest and in transit. Data stays in your Vault and is never shared with other dealers or third parties. You own your data." },
    ],
  },
  "ad-fi-compliance": {
    headline: "Present every product. Document everything. Sleep at night.",
    subheadline: "Deal jacket verification, equal treatment monitoring, MLA screening, and CARS Rule compliance for every F&I transaction.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Verify deal jacket completeness", description: "Every document in the deal jacket checked against a state-specific checklist. Missing signatures, disclosures, and forms flagged before the deal leaves the box." },
      { title: "Screen for MLA status", description: "Military Lending Act screening on every credit applicant. MLA-covered borrowers flagged with rate cap enforcement and prohibited product restrictions." },
      { title: "Document equal treatment", description: "Every customer offered the same products at the same markup. ECOA equal treatment documented with timestamps. Deviation requires manager override with reason." },
      { title: "Generate audit trail", description: "Complete audit trail for every deal: what was offered, what was accepted, what was declined, at what price, with what disclosures. Ready for FTC, state AG, or manufacturer audit." },
    ],
    bridge: {
      title: "The Bridge",
      text: "F&I Compliance reviews every deal flowing through the Vault. AD-012 F&I Menu feeds product presentations and customer responses. AD-010 Desking provides deal structure and rate markup. AD-001 Licensing verifies salesperson and F&I manager licensing status. AD-026 Regulatory Compliance aggregates compliance metrics across all deals. If a compliance exception occurs, every related worker in the Vault is notified.",
    },
    valueProps: [
      { label: "Deal jacket compliance check", description: "State-specific document checklist verified before deal funding. Missing items flagged with specific remediation steps." },
      { label: "Equal treatment monitoring", description: "Rate markup, product presentation, and pricing decisions tracked per customer. Statistical analysis identifies patterns that could indicate disparate treatment." },
      { label: "MLA screening automation", description: "Every credit applicant screened against DoD MLA database. Covered borrowers identified before product presentation to prevent prohibited offers." },
      { label: "Complete audit trail", description: "Every touchpoint documented with timestamp, user, and content. FTC CARS Rule, state AG, and manufacturer audit packages generated on demand." },
    ],
    faq: [
      { q: "Will this replace my compliance officer?", a: "No. This worker automates documentation and monitoring. A qualified compliance officer or attorney reviews flagged exceptions and sets policy. The worker ensures nothing falls through the cracks." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on compliant F&I transactions facilitated through the platform. No subscription fee, no per-deal fee to the dealer." },
      { q: "Is my deal data secure?", a: "All deal data is encrypted at rest and in transit. Compliance records are stored in your Vault with tamper-evident audit trails. Data is never shared with other dealers." },
    ],
  },
  "ad-lender-relations": {
    headline: "Get deals bought and funded faster.",
    subheadline: "Lender matching, stipulation tracking, funding acceleration, and chargeback prevention for every financed deal.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Submit deal to matched lenders", description: "Customer credit profile matched to lender programs. Deals routed to the right lender the first time. Multiple submissions tracked with response times." },
      { title: "Track stipulations", description: "Every lender stip tracked from request to fulfillment. Missing stips flagged daily. Stip packages assembled with documents from the Vault." },
      { title: "Monitor funding", description: "Funding pipeline from contract-in-transit to funded. Days to fund tracked by lender. Funding delays escalated before they become chargebacks." },
      { title: "Manage chargebacks", description: "First-payment default risk scored at origination. Chargeback notices tracked with response deadlines. Repurchase reserve monitored." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Lender Relations connects the desk to the bank. AD-010 Desking passes the structured deal with lender selection. AD-013 F&I Compliance verifies deal documentation before submission. AD-025 Deal Accounting posts reserve income on funding. AD-024 Title & Registration tracks title perfection for lien holder requirements. Stip documents pull from the Vault automatically.",
    },
    valueProps: [
      { label: "Deal-to-lender matching", description: "Customer credit tier, loan amount, vehicle type, and terms matched to active lender programs. Best options for the customer and the dealer identified." },
      { label: "Automated stip tracking", description: "Lender stipulations captured, assigned, and tracked to completion. Documents pulled from the Vault. Missing stips escalated before funding deadline." },
      { label: "Funding pipeline dashboard", description: "Every deal from contract-in-transit to funded in one view. Days to fund tracked. Bottlenecks identified. Funding targets monitored." },
      { label: "Lender performance scorecard", description: "Approval rate, look-to-book ratio, average days to fund, stip rate, and chargeback rate tracked per lender. Underperforming lenders identified." },
    ],
    faq: [
      { q: "Will this replace my DMS lender routing?", a: "It works alongside your DMS. The worker adds intelligent lender matching, stip tracking, and funding analytics that most DMS platforms do not provide natively." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on funded deals facilitated through the platform. Your lender relationships and reserve structures remain yours." },
      { q: "Is my customer credit data secure?", a: "All credit and deal data is encrypted at rest and in transit. Data stays in your Vault. TitleApp does not access, sell, or share customer credit information." },
    ],
  },
  "ad-aftermarket-admin": {
    headline: "Track every contract. Process every claim. Cancel clean.",
    subheadline: "Contract tracking, claims processing, cancellation handling, and remittance management for all aftermarket products.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Log product contracts", description: "Every F&I product contract recorded with provider, coverage terms, effective date, expiration, and customer information. Contract portfolio visible in one view." },
      { title: "Process claims", description: "Customer claims matched to active contracts. Claim documentation assembled. Provider submission tracked. Claim status monitored through resolution." },
      { title: "Handle cancellations", description: "Cancellation requests processed with pro-rata refund calculation. Lender payoff adjustments tracked. Reserve chargebacks accounted for." },
      { title: "Track remittances", description: "Provider remittance reports reconciled against contract records. Outstanding remittances flagged. Revenue recognition aligned with remittance schedule." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Aftermarket Administration manages the lifecycle after the deal. AD-012 F&I Menu feeds product contracts at point of sale. AD-013 F&I Compliance verifies contract documentation. AD-025 Deal Accounting posts reserve income and tracks cancellation chargebacks. AD-021 Customer Retention uses contract data for service retention campaigns. When a customer cancels, the financial impact flows through the Vault to accounting automatically.",
    },
    valueProps: [
      { label: "Complete contract lifecycle", description: "From point-of-sale through claims, cancellations, and expiration. Every contract tracked with full documentation history." },
      { label: "Claims processing and tracking", description: "Claims matched to coverage terms, documentation assembled, and provider submission tracked. Approval, denial, and payment status monitored." },
      { label: "Cancellation with pro-rata calculation", description: "Flat and pro-rata cancellation methods supported. Refund calculated, lender payoff adjusted, and reserve chargeback posted automatically." },
      { label: "Remittance reconciliation", description: "Provider remittance reports matched to contract records. Discrepancies flagged. Outstanding balances tracked with aging." },
    ],
    faq: [
      { q: "Will this replace my provider portal?", a: "It consolidates information across all your providers into one view. You may still use individual provider portals for specific transactions, but the worker gives you portfolio-wide visibility and reconciliation." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on aftermarket products administered through the platform. Your provider relationships and pricing remain yours." },
      { q: "Is my contract data secure?", a: "All contract and customer data is encrypted at rest and in transit. Data stays in your Vault and is never shared with providers beyond what is required for claims processing." },
    ],
  },
  "ad-service-scheduling": {
    headline: "Full appointment board. Efficient throughput.",
    subheadline: "Appointment scheduling, shop loading, technician dispatch, and repair order lifecycle tracking for the service department.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Schedule appointments by capacity", description: "Appointments booked against available shop capacity — technician hours, lift availability, and specialty equipment. Overbooking and underbooking prevented." },
      { title: "Dispatch to technicians", description: "Repair orders assigned to technicians based on skill level, certification, current workload, and promise time. Flag rate and efficiency tracked." },
      { title: "Track RO lifecycle", description: "Every repair order tracked from write-up through diagnosis, authorization, parts ordering, work in progress, quality check, and customer delivery." },
      { title: "Monitor cycle time", description: "Promise time vs. actual completion tracked per RO, per technician, and per job type. Waiter vs. drop-off managed against capacity." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Service Scheduling is the heartbeat of the service department. AD-017 Service Upsell receives MPI results and declined service data from completed ROs. AD-018 Parts Inventory receives parts demand signals for stock ordering. AD-019 Warranty Admin receives warranty ROs for claim submission. AD-021 Customer Retention tracks service visit frequency for retention campaigns. Throughput data flows to AD-025 Deal Accounting for departmental P&L.",
    },
    valueProps: [
      { label: "Capacity-aware scheduling", description: "Appointments booked against real shop capacity. Tech hours, lift count, and specialty bays considered. No more promises the shop cannot keep." },
      { label: "Shop loading dashboard", description: "Current shop utilization, scheduled vs. available hours, and capacity forecast visible in one view. Tomorrow's loading planned today." },
      { label: "RO stage tracking", description: "Every repair order visible with current stage, assigned technician, parts status, and estimated completion. Customers updated proactively." },
      { label: "Waiter vs. drop-off management", description: "Waiter ROs prioritized by promise time. Drop-off ROs scheduled for efficient throughput. Express service lane managed separately." },
    ],
    faq: [
      { q: "Will this replace my DMS service scheduler?", a: "It works alongside your DMS. The worker adds capacity-aware scheduling, real-time shop loading, and throughput analytics that enhance your existing appointment process." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on service revenue facilitated through the platform. No subscription fee, no per-RO fee to the dealer." },
      { q: "Is my customer and vehicle data secure?", a: "All customer and vehicle data is encrypted at rest and in transit. Data stays in your Vault and is never shared with other service providers or competitors." },
    ],
  },
  "ad-service-upsell": {
    headline: "Find the work. Sell the work. Convert the customer.",
    subheadline: "Multi-point inspection, advisor coaching, declined service follow-up, and service-to-sales conversion for the service drive.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Complete digital MPI", description: "Technician completes a digital multi-point inspection with condition codes and photos. Results transmitted to advisor instantly — no paper forms lost between the shop and the drive." },
      { title: "Present findings to customer", description: "Advisor presents MPI findings with photos on tablet or via text/email. Red/yellow/green condition codes explain urgency. Recommended services with pricing presented clearly." },
      { title: "Track declined services", description: "Every service the customer declines is logged with reason and date. Declined services enter a follow-up pipeline with automated reminders based on mileage and time intervals." },
      { title: "Flag service-to-sales opportunities", description: "When repair cost exceeds a configurable percentage of vehicle value, the service-to-sales trigger fires. Customer information and vehicle equity routed to the sales floor." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Service Upsell connects the technician to the advisor to the sales floor. AD-016 Service Scheduling feeds completed ROs for MPI follow-up. AD-018 Parts Inventory receives parts demand from recommended services. AD-021 Customer Retention manages declined service follow-up campaigns. AD-009 Lead Management receives service-to-sales leads. AD-019 Warranty Admin identifies warranty-eligible repairs before customer-pay authorization.",
    },
    valueProps: [
      { label: "Digital MPI with photo documentation", description: "Condition codes, photos, and technician notes captured on a tablet in the shop. Results transmitted to the advisor in real time — no lost forms, no illegible handwriting." },
      { label: "Advisor recommendation engine", description: "Maintenance schedule, vehicle history, and MPI results combined to generate prioritized recommendations. Advisors present data, not opinions." },
      { label: "Service-to-sales trigger logic", description: "When estimated repair cost exceeds a threshold of vehicle wholesale value, the worker flags the customer for a trade-in conversation. Vehicle equity pre-calculated." },
      { label: "Declined service recovery pipeline", description: "Every declined service tracked with follow-up at configured intervals. Conversion from declined to completed tracked per advisor and per service type." },
    ],
    faq: [
      { q: "Will this replace our current MPI process?", a: "It digitizes and enhances your MPI process. Technicians complete inspections on a tablet instead of paper. Photos and findings flow to advisors instantly. Nothing lost between the shop and the drive." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on service revenue facilitated through upsell recommendations and declined service recovery. No subscription fee." },
      { q: "Is my service data secure?", a: "All vehicle and customer service data is encrypted at rest and in transit. Data stays in your Vault and is never shared with competitors or third-party service providers." },
    ],
  },
  "ad-parts-inventory": {
    headline: "Right parts. In stock. When needed.",
    subheadline: "Inventory stocking, fill rate tracking, obsolescence management, and emergency sourcing for the parts department.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Monitor stock levels", description: "Current inventory compared to demand-driven stocking levels. Parts ordered based on historical demand, seasonal patterns, and pending RO requirements." },
      { title: "Track fill rates", description: "First-time fill rate tracked per parts category. Target 85%+ fill rate — every time a tech waits for a part, you lose a bay-hour of productive time." },
      { title: "Flag obsolete inventory", description: "Parts with no demand in 9+ months identified for return or write-off. Obsolescence percentage tracked against industry benchmarks." },
      { title: "Source emergency parts", description: "When a stock-out occurs, the worker checks dealer network, aftermarket suppliers, and OEM emergency orders to find the fastest source." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Parts Inventory connects the shop to the counter to the bottom line. AD-016 Service Scheduling feeds parts demand from scheduled ROs. AD-017 Service Upsell generates demand from recommended services. AD-019 Warranty Admin identifies warranty parts return requirements. AD-020 Body Shop sends collision parts requirements. AD-025 Deal Accounting receives parts gross profit data for departmental P&L.",
    },
    valueProps: [
      { label: "Fill rate optimization (85%+ target)", description: "First-time fill rate monitored continuously. Stock-outs tracked by part, category, and vendor. Demand-driven reorder points keep the right parts on the shelf." },
      { label: "Stock order recommendations", description: "Weekly stock orders generated based on demand trends, pending ROs, seasonal patterns, and reorder points. Over-ordering and under-ordering minimized." },
      { label: "Obsolescence management", description: "No-demand parts identified by aging tier. Manufacturer return windows tracked. Obsolescence reserve calculated. Target: under 10% obsolescence." },
      { label: "Parts gross profit tracking", description: "Customer-pay, warranty, and internal parts margins tracked by category. Pricing matrix effectiveness monitored against gross profit targets." },
    ],
    faq: [
      { q: "Will this replace my DMS parts module?", a: "It works alongside your DMS. The worker adds demand-driven stocking, fill rate analytics, and obsolescence management that enhance your existing parts ordering process." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on parts revenue facilitated through the platform. Your parts pricing and vendor relationships remain yours." },
      { q: "Is my parts and pricing data secure?", a: "All inventory and pricing data is encrypted at rest and in transit. Data stays in your Vault and is never shared with other dealers or parts vendors." },
    ],
  },
  "ad-warranty-admin": {
    headline: "Submit clean claims. Get paid faster. Survive the audit.",
    subheadline: "Claim optimization, rejection tracking, parts return compliance, and factory audit preparation for the warranty department.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Review claim before submission", description: "Every warranty claim reviewed for completeness, correct op codes, proper labor times, and required documentation before submission to the manufacturer." },
      { title: "Optimize op codes", description: "Op code selection validated against manufacturer warranty policies. Multi-line claims structured for maximum reimbursement within warranty guidelines." },
      { title: "Track rejections", description: "Rejected claims categorized by reason code. Resubmission packages assembled with additional documentation. Rejection rate tracked by technician and claim type." },
      { title: "Prepare for factory audit", description: "Factory audit preparation checklist maintained. Parts retention compliance verified. Hard copy documentation organized. Typical audit exposure: $50K-$200K at risk." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Warranty Admin is the link between the shop and the factory. AD-016 Service Scheduling feeds warranty ROs for claim processing. AD-018 Parts Inventory tracks warranty parts return requirements and core charges. AD-025 Deal Accounting posts warranty revenue and tracks receivables. AD-026 Regulatory Compliance monitors warranty practices for manufacturer compliance. Clean claims mean faster payment and lower audit risk.",
    },
    valueProps: [
      { label: "Op code optimization", description: "Manufacturer op code tables maintained with current labor times and rates. Claims structured for complete and accurate reimbursement within warranty policy." },
      { label: "Rejection management and resubmission", description: "Rejected claims tracked by reason code. Resubmission documentation assembled automatically. Rejection rate monitored per technician and per claim type." },
      { label: "Parts return compliance", description: "Warranty parts retention periods tracked. Return shipments scheduled. Core charge credits monitored. Non-compliance penalties prevented." },
      { label: "Factory audit preparation (saves $50-200K)", description: "Audit readiness checklist maintained. Documentation organized by claim. Parts retention verified. A clean audit can save $50K-$200K in chargebacks." },
    ],
    faq: [
      { q: "Will this replace my warranty clerk?", a: "It augments them. The worker handles claim review, op code validation, and documentation organization. Your warranty clerk handles manufacturer relationships, audit responses, and exception processing." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on warranty reimbursements facilitated through the platform. Cleaner claims and fewer rejections benefit both of us." },
      { q: "Is my warranty data secure?", a: "All warranty claim data is encrypted at rest and in transit. Data stays in your Vault and is never shared with other dealers or third parties." },
    ],
  },
  "ad-body-shop": {
    headline: "Manage estimates, supplements, and cycle time.",
    subheadline: "Estimate review, supplement tracking, DRP compliance monitoring, and cycle time management for the collision center.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Review estimate completeness", description: "Every collision estimate reviewed for missed operations, included vs. excluded procedures, and proper labor categorization (body, frame, paint, mechanical)." },
      { title: "Track supplements", description: "Supplemental damage documented with photos. Supplement requests tracked from submission through insurance approval. Cycle time impact of supplement delays quantified." },
      { title: "Monitor DRP metrics", description: "Direct Repair Program KPIs tracked: cycle time, CSI scores, supplement frequency, severity accuracy, and touch time. DRP scorecard maintained per insurer." },
      { title: "Manage sublet work", description: "Sublet operations (glass, ADAS calibration, mechanical, upholstery) tracked from dispatch through completion. Sublet turnaround time monitored against body shop cycle time." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Body Shop connects the collision center to the business office. AD-018 Parts Inventory receives collision parts requirements. AD-025 Deal Accounting posts body shop revenue and manages insurance receivables. AD-016 Service Scheduling coordinates mechanical work tied to collision repairs. AD-021 Customer Retention manages post-repair follow-up for CSI. DRP performance data flows through the Vault to inform insurer negotiations.",
    },
    valueProps: [
      { label: "Estimate completeness review", description: "Missed operations, labor overlap, included procedures, and betterment issues identified before the vehicle enters the shop." },
      { label: "Supplement approval tracking", description: "Every supplement documented with photos and submitted to the insurer. Approval status, response time, and cycle time impact tracked." },
      { label: "DRP compliance monitoring", description: "Insurer DRP requirements tracked per program. KPI performance benchmarked. DRP scorecard generated for quarterly insurer reviews." },
      { label: "Cycle time management", description: "Keys-to-keys cycle time tracked per job category. Bottlenecks identified: teardown, parts, sublet, paint, reassembly. Target cycle time enforced." },
    ],
    faq: [
      { q: "Will this replace our estimating system?", a: "No. This worker adds supplement tracking, DRP compliance monitoring, and cycle time analytics on top of your existing estimating platform (CCC, Mitchell, Audatex)." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on body shop revenue facilitated through the platform. Your insurer relationships and DRP agreements remain yours." },
      { q: "Is my insurance and customer data secure?", a: "All collision repair data is encrypted at rest and in transit. Data stays in your Vault and is never shared with other body shops or third parties." },
    ],
  },
  "ad-customer-retention": {
    headline: "Bring them back for service. Bring them back for their next car.",
    subheadline: "Equity mining, lease maturity management, service retention campaigns, and service-to-sales pipeline for the entire customer lifecycle.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Set up retention campaigns", description: "Automated campaigns for service reminders, declined service follow-up, lease maturity, equity alerts, and birthday/anniversary touchpoints." },
      { title: "Mine customer equity", description: "Current vehicle values compared to payoff balances across your sold customer database. Positive equity customers identified with estimated payment comparison on a new vehicle." },
      { title: "Manage lease maturity", description: "Lease maturity dates tracked at 12, 6, and 3 months. Customer contacted with options: new lease, purchase, or return. Loyalty vs. conquest scenarios modeled." },
      { title: "Nurture service-to-sales leads", description: "Service customers with high repair estimates, aging vehicles, or positive equity routed to sales through a structured handoff. Not a cold call — a warm introduction." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Customer Retention closes the loop on the customer lifecycle. AD-009 Lead Management receives warm leads from equity mining and service-to-sales. AD-017 Service Upsell feeds declined service data for follow-up campaigns. AD-016 Service Scheduling tracks service visit frequency for retention scoring. AD-023 Digital Marketing measures campaign ROI. The Vault holds the complete customer history — every deal, every service visit, every interaction.",
    },
    valueProps: [
      { label: "Equity mining with payment comparison", description: "Vehicle values refreshed regularly against customer payoff balances. Positive equity flagged with estimated payment on replacement vehicle. No cold calls — data-driven outreach." },
      { label: "Lease maturity management", description: "Lease end dates tracked across the customer base. Campaigns triggered at 12, 6, and 3 months. Turn-in inspection scheduling coordinated with service." },
      { label: "Service-to-sales nurture sequence", description: "Customers flagged by AD-017 for high repair cost or vehicle age receive a structured communication sequence. Warm handoff to sales with full vehicle and service history." },
      { label: "Customer lifecycle analytics", description: "Retention rate, service absorption, defection to independent shops, and repurchase rate tracked. Lifetime customer value calculated per customer and per segment." },
    ],
    faq: [
      { q: "Will this replace our CRM?", a: "It works alongside your CRM. The worker adds equity mining, lifecycle analytics, and cross-department retention intelligence that connect the sales floor, service drive, and marketing — which standalone CRMs typically do not." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on vehicle sales and service revenue generated through retention campaigns. Your customer relationships remain yours." },
      { q: "Is my customer data secure?", a: "All customer data is encrypted at rest and in transit. Data stays in your Vault and is never shared with competing dealers, third-party lead aggregators, or data brokers." },
    ],
  },
  "ad-reputation": {
    headline: "More reviews. Better ratings. More clicks.",
    subheadline: "Review solicitation, response management, sentiment analysis, and competitive rating benchmarking for every department.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Solicit reviews from every customer", description: "Every sold customer and every service RO completion triggers a review request via text or email. FTC-compliant — no filtering, gating, or selective solicitation." },
      { title: "Draft responses", description: "AI-drafted responses for every review — positive and negative. Tone matched to your dealership brand. Manager reviews and edits before publication." },
      { title: "Track sentiment trends", description: "Review sentiment analyzed over time by department (sales, service, parts, body shop). Recurring themes identified. Operational issues surfaced before they become rating problems." },
      { title: "Benchmark against competitors", description: "Your Google, Yelp, and DealerRater ratings compared to competitors in your market. Rating trends tracked. Market position quantified." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Reputation Management connects customer experience to every department. AD-016 Service Scheduling and AD-010 Desking trigger review requests after completed transactions. AD-021 Customer Retention uses sentiment data to identify at-risk customers. AD-023 Digital Marketing correlates ratings to lead volume and ad performance. Negative review themes flow to department managers for operational improvement.",
    },
    valueProps: [
      { label: "FTC-compliant review solicitation", description: "Every customer solicited without filtering or gating. No selective review practices. FTC and platform terms of service compliance built in." },
      { label: "AI-drafted review responses", description: "Every review gets a response draft within minutes. Positive reviews acknowledged. Negative reviews addressed with empathy and resolution. Manager approval required before publishing." },
      { label: "Sentiment trend analysis", description: "Natural language processing identifies recurring themes. Sales process friction, service wait times, and communication gaps surfaced before they damage ratings." },
      { label: "Rating-to-revenue correlation", description: "Google rating, review volume, and review recency correlated to VDP views, lead volume, and appointment set rate. Quantify what a half-star improvement means in dollars." },
    ],
    faq: [
      { q: "Will this replace our existing reputation tool?", a: "It can work alongside or replace your current tool. The worker adds cross-department sentiment analysis, competitive benchmarking, and revenue correlation that standalone tools typically do not provide." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on revenue attributed to reputation-driven customer acquisition. No subscription fee." },
      { q: "Is my review data secure?", a: "Review data aggregated from public sources. Customer contact information used for solicitation is encrypted and stored in your Vault. Data is never shared with competitors." },
    ],
  },
  "ad-digital-marketing": {
    headline: "Know which ads sell cars.",
    subheadline: "Spend tracking, lead attribution, channel performance analysis, and co-op management across every advertising source.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Track spend by channel", description: "Monthly advertising spend tracked across Google, Facebook, third-party (AutoTrader, Cars.com, CarGurus), direct mail, broadcast, and sponsorships." },
      { title: "Attribute leads to source", description: "Every lead tagged with its originating source. Multi-touch attribution where applicable. Source tracked through the funnel to sold unit." },
      { title: "Calculate cost-per-sale", description: "Total spend divided by sold units attributed to each source. Cost-per-lead, cost-per-appointment, and cost-per-sale calculated per channel." },
      { title: "Claim co-op reimbursement", description: "Manufacturer co-op advertising programs tracked. Eligible spend identified. Reimbursement claims prepared with required documentation." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Digital Marketing connects ad spend to results. AD-009 Lead Management feeds lead source and conversion data. AD-010 Desking provides sold deal attribution. AD-007 Merchandising supplies VDP performance correlated to ad spend. AD-022 Reputation Management tracks rating-to-lead correlation. AD-003 Allocation monitors manufacturer incentive advertising programs. Co-op data flows through the Vault to AD-025 Deal Accounting for reimbursement tracking.",
    },
    valueProps: [
      { label: "Full-funnel lead attribution", description: "Every lead tracked from first touch through sold unit. Source, medium, and campaign attributed. Multi-touch credit assigned where applicable." },
      { label: "Cost-per-sale by source", description: "Total advertising cost per sold unit calculated by channel. Identify which sources produce sales — not just traffic — and allocate budget accordingly." },
      { label: "Third-party listing ROI analysis", description: "AutoTrader, Cars.com, CarGurus, and other listing platforms evaluated on VDP views, leads, and sold units per dollar spent. Underperforming subscriptions identified." },
      { label: "Co-op management and claiming", description: "Manufacturer co-op programs tracked with eligible activities, spending caps, and claim deadlines. Reimbursement claims prepared and submitted on time." },
    ],
    faq: [
      { q: "Will this replace our ad agency?", a: "No. This worker tracks performance and attribution across all channels including what your agency manages. It gives you the data to hold every vendor accountable for results." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on advertising-attributed vehicle sales facilitated through the platform. No subscription fee, no percentage of ad spend." },
      { q: "Is my advertising data secure?", a: "All advertising spend and performance data is encrypted at rest and in transit. Data stays in your Vault and is never shared with advertising vendors or competitors." },
    ],
  },
  "ad-title-registration": {
    headline: "Every deal titled. Every tag delivered.",
    subheadline: "Title applications, temp tag management, out-of-state processing, and lien perfection tracking for every sold unit.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Initiate title application", description: "Title paperwork assembled from deal documents in the Vault. State-specific forms identified. Application submitted with required fees and documentation." },
      { title: "Track temp tag expiration", description: "Temporary tags tracked with expiration dates and state-specific extension rules. Expiring tags flagged at 14, 7, and 3 days. Extensions processed where permitted." },
      { title: "Process out-of-state titles", description: "Out-of-state deals tracked with destination state requirements: forms, fees, emissions, inspections, and power of attorney. Processing timelines managed per state." },
      { title: "Verify lien perfection", description: "Lender lien recorded on title. Lien perfection confirmed. ELT (electronic lien and title) status tracked. Imperfect liens flagged for immediate correction." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Title & Registration connects the deal to the DMV to the lender. AD-010 Desking passes deal documents for title processing. AD-014 Lender Relations requires lien perfection for funding. AD-025 Deal Accounting tracks title fees as receivables. AD-001 Licensing monitors dealer licensing requirements for title processing authority. Title status updates flow through the Vault so every related worker knows if a title is pending, completed, or rejected.",
    },
    valueProps: [
      { label: "Title application deadline tracking", description: "State-specific title application deadlines monitored. Late filing penalties calculated. Compliance tracked per title clerk and per deal." },
      { label: "Temp tag expiration alerts", description: "Every temporary tag tracked with expiration date. Alerts at configurable intervals. Extensions processed automatically where state law permits." },
      { label: "Out-of-state requirements by state", description: "Destination state requirements database maintained: forms, fees, emissions, inspections, notarization, and power of attorney. Processing timelines estimated per state." },
      { label: "DMV reject resolution", description: "DMV rejections tracked by reason code. Corrective documentation assembled. Resubmission tracked. Reject rate monitored per title clerk." },
    ],
    faq: [
      { q: "Will this replace our title clerk?", a: "No. This worker handles tracking, compliance, and documentation assembly. Your title clerk handles DMV relationships, exception processing, and state-specific nuances that require human judgment." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on deals where title processing is facilitated through the platform. No per-title fee to the dealer." },
      { q: "Is my customer and title data secure?", a: "All title and customer data is encrypted at rest and in transit. Data stays in your Vault. Title documents are never shared with other dealers or third parties." },
    ],
  },
  "ad-deal-accounting": {
    headline: "Clean books. Every deal posted.",
    subheadline: "Deal posting, commission calculation, floor plan payoff tracking, and receivables management for the business office.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Post deal to accounting", description: "Every funded deal posted with front-end gross, back-end gross, trade allowance, payoff, fees, taxes, and net check to customer. Same-day posting targeted." },
      { title: "Calculate commissions", description: "Salesperson, F&I manager, and sales manager commissions calculated from posted deal data based on configured pay plans. Minimum guarantee verified." },
      { title: "Track floor plan payoff", description: "Sold vehicles flagged for floor plan payoff. Curtailment dates tracked. Floor plan interest stop date verified on day of delivery. Late payoffs flagged for additional interest." },
      { title: "Monitor receivables", description: "Contracts-in-transit, finance reserves, manufacturer rebates, warranty reimbursements, title fees, and other receivables tracked with aging." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Deal Accounting is where the deal becomes money. AD-010 Desking passes the deal structure. AD-012 F&I Menu passes product income. AD-014 Lender Relations confirms funding. AD-024 Title & Registration passes title fees. AD-028 Floor Plan provides payoff data. AD-027 HR & Payroll receives commission calculations. Every financial line item flows through the Vault for a single source of truth.",
    },
    valueProps: [
      { label: "Same-day deal posting", description: "Deal posted on the day it funds. No backlog. No end-of-month scramble. Clean books every day." },
      { label: "Automated commission calculation", description: "Commission calculated per configured pay plan: flat, percentage, graduated, or blended. Minimum guarantee verified. Pay plan splits handled." },
      { label: "Floor plan payoff tracking", description: "Every sold vehicle tracked from delivery through floor plan payoff. Curtailment tracked. Interest charges verified. Late payoffs flagged." },
      { label: "Daily operating control report", description: "Daily snapshot of deals pending, deals posted, receivables, floor plan exposure, and cash position. The controller's view of the business — updated daily." },
    ],
    faq: [
      { q: "Will this replace my DMS accounting module?", a: "It works alongside your DMS. The worker adds deal posting automation, commission calculation, and receivables analytics that enhance your existing accounting workflow." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on financial transactions facilitated through the platform. No subscription fee, no per-deal posting fee." },
      { q: "Is my financial data secure?", a: "All financial and deal data is encrypted at rest and in transit. Data stays in your Vault. Financial records are never shared with other dealers or third parties." },
    ],
  },
  "ad-regulatory-compliance": {
    headline: "Ready for any audit. Any time.",
    subheadline: "FTC compliance, state AG readiness, factory audit preparation, and self-assessment programs for the entire dealership.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Run quarterly self-assessment", description: "Comprehensive compliance self-assessment covering FTC (CARS Rule, Safeguards, Used Car Rule), state regulations, ECOA, FCRA, TILA, and manufacturer requirements." },
      { title: "Prepare audit documentation", description: "Audit preparation packages assembled with organized documentation for FTC, state AG, manufacturer, and lender audits. Evidence indexed and cross-referenced." },
      { title: "Track complaints", description: "Customer complaints, BBB filings, AG complaints, and online reviews tracked in one system. Patterns identified. Resolution documented. Complaint-to-resolution cycle time monitored." },
      { title: "Monitor regulatory changes", description: "Federal and state regulatory changes tracked with implementation deadlines and operational impact assessment. New rules mapped to affected processes and workers." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Regulatory Compliance is the umbrella over every department. AD-001 Licensing feeds license and bond status. AD-013 F&I Compliance feeds deal audit data. AD-019 Warranty Admin feeds warranty compliance status. AD-027 HR & Payroll feeds employment compliance. Every worker in the Vault contributes compliance data. This worker aggregates, monitors, and reports across the entire dealership.",
    },
    valueProps: [
      { label: "Quarterly compliance self-assessment", description: "Structured assessment covering all regulatory areas. Findings categorized by risk level. Remediation actions assigned with due dates and responsible parties." },
      { label: "Audit preparation checklists", description: "FTC, state AG, manufacturer, and lender audit checklists maintained. Documentation pre-organized by topic. Preparation time reduced from weeks to days." },
      { label: "Complaint tracking with pattern analysis", description: "All complaints from all sources tracked in one system. Repeat patterns identified. Root causes surfaced. Systemic issues addressed before they become regulatory action." },
      { label: "Regulatory change monitoring", description: "Federal Register, state regulatory databases, and manufacturer policy updates monitored. Changes mapped to affected dealership processes with implementation timelines." },
    ],
    faq: [
      { q: "Will this replace our compliance consultant?", a: "It augments your consultant. The worker handles ongoing monitoring, documentation, and pattern analysis. Your compliance consultant provides strategic guidance, training, and audit response leadership." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on compliance-related services facilitated through the platform. Avoiding a single regulatory penalty pays for itself many times over." },
      { q: "Is my compliance data secure?", a: "All compliance documentation is encrypted at rest and in transit. Data stays in your Vault. Compliance records are never shared with regulators or third parties without your explicit authorization." },
    ],
  },
  "ad-hr-payroll": {
    headline: "Pay plans that motivate. Compliance that protects.",
    subheadline: "Commission pay plan administration, minimum wage compliance, overtime tracking, and licensing management for dealership employees.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Configure pay plans", description: "Salesperson, F&I manager, sales manager, service advisor, and technician pay plans configured with commission structures, guarantees, bonuses, and draws." },
      { title: "Verify minimum wage compliance", description: "Commission earnings verified against applicable minimum wage (federal, state, local) per pay period. Shortfall flagged for make-up payment before payroll processes." },
      { title: "Track overtime", description: "Hours tracked for non-exempt employees. FLSA overtime classification verified — service techs paid flat rate still require overtime calculation. State-specific rules applied." },
      { title: "Monitor licenses", description: "Salesperson licenses, technician certifications (ASE), F&I certifications, and OSHA training tracked with expiration dates and renewal requirements." },
    ],
    bridge: {
      title: "The Bridge",
      text: "HR & Payroll connects employee performance to compensation. AD-025 Deal Accounting feeds deal data for commission calculation. AD-016 Service Scheduling feeds technician hours for overtime tracking. AD-001 Licensing feeds salesperson license status. AD-026 Regulatory Compliance aggregates employment compliance status. Pay plan data and compliance records flow through the Vault to ensure accurate, compliant payroll every period.",
    },
    valueProps: [
      { label: "Commission pay plan administration", description: "Flat, percentage, graduated, minimum-plus-commission, and blended pay plans supported. Draw tracking. Guarantee verification. Bonus calculation." },
      { label: "Minimum wage compliance verification", description: "Commission earnings tested against applicable minimum wage per pay period. Make-up payment calculated automatically when commissions fall short." },
      { label: "FLSA overtime classification", description: "Exempt vs. non-exempt status verified per position. Flat-rate technician overtime calculated per FLSA requirements. State-specific overtime rules applied." },
      { label: "License and certification tracking", description: "Salesperson licenses, ASE certifications, F&I certifications, and OSHA training tracked with expiration alerts and renewal workflows." },
    ],
    faq: [
      { q: "Will this replace our payroll provider?", a: "No. This worker handles pay plan configuration, compliance verification, and commission calculation. Your payroll provider (ADP, Paylocity, etc.) processes the actual payroll. The worker feeds accurate data to your provider." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on payroll compliance services facilitated through the platform. No subscription fee." },
      { q: "Is my employee data secure?", a: "All employee and compensation data is encrypted at rest and in transit. Data stays in your Vault. Employee records are never shared with other dealers or third parties." },
    ],
  },
  "ad-floor-plan": {
    headline: "Know your cash position every day.",
    subheadline: "Floor plan interest tracking, cash flow forecasting, AP management, and dealership financial statement preparation.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Track daily floor plan interest", description: "Floor plan interest accrued daily on every unit in inventory. Curtailment schedules tracked. Interest cost per unit calculated for pricing and wholesale decisions." },
      { title: "Forecast cash flow", description: "30/60/90-day cash flow forecast based on current deals in process, scheduled payables, receivables, floor plan payoffs, and expected funding." },
      { title: "Manage payables", description: "Vendor invoices, floor plan payments, advertising bills, and operating expenses tracked with due dates. Payment scheduling optimized against cash position." },
      { title: "Generate financial statement", description: "Dealership composite financial statement by department: new, used, F&I, service, parts, body shop. Format aligned with NADA 20-Group standards." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Floor Plan & Cash Management connects every department to the bottom line. AD-025 Deal Accounting feeds deal postings and receivables. AD-018 Parts Inventory feeds parts payables and inventory valuation. AD-016 Service Scheduling feeds service revenue data. AD-011 Inventory Turn feeds floor plan exposure data. Financial data flows through the Vault for a single, daily view of the dealership's financial health.",
    },
    valueProps: [
      { label: "Daily floor plan interest tracking", description: "Interest accrued on every unit daily. Curtailment deadlines tracked. Floor plan cost per unit visible for pricing and wholesale decisions. Total floor plan exposure quantified." },
      { label: "30/60/90-day cash forecast", description: "Cash flow projected based on pipeline deals, scheduled payables, expected receivables, and floor plan activity. Cash shortfalls identified before they occur." },
      { label: "Dealership composite by department", description: "Financial performance by department aligned with NADA 20-Group chart of accounts. Department-level P&L, gross profit, and absorption rate calculated." },
      { label: "Covenant compliance monitoring", description: "Floor plan and other lender covenants tracked: working capital, net worth, current ratio, and inventory turn. Covenant breaches flagged before they trigger default." },
    ],
    faq: [
      { q: "Will this replace our DMS accounting?", a: "It works alongside your DMS. The worker adds cash flow forecasting, floor plan analytics, and financial statement automation that enhance your existing accounting system." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on financial management services facilitated through the platform. No subscription fee." },
      { q: "Is my financial data secure?", a: "All financial data is encrypted at rest and in transit. Data stays in your Vault. Financial statements and cash position data are never shared with lenders, manufacturers, or third parties without your authorization." },
    ],
  },
  "ad-dms-technology": {
    headline: "Get more from the systems you already own.",
    subheadline: "DMS optimization, integration monitoring, data integrity auditing, and vendor contract management for dealership technology.",
    commission: true,
    price: "$0/mo",
    steps: [
      { title: "Audit current systems", description: "Complete inventory of dealership technology: DMS, CRM, desking, F&I menu, inventory management, marketing, and service scheduling. License costs and utilization documented." },
      { title: "Monitor integrations", description: "Data flows between systems monitored. Failed integrations detected and flagged. Data sync latency tracked. Broken feeds identified before they cause operational issues." },
      { title: "Review user access", description: "User accounts, permission levels, and access logs reviewed per system. Terminated employees removed. Excessive permissions flagged. FTC Safeguards alignment verified." },
      { title: "Track vendor contracts", description: "Technology vendor contracts tracked with renewal dates, price escalation clauses, and termination requirements. Total technology spend quantified." },
    ],
    bridge: {
      title: "The Bridge",
      text: "DMS & Technology Management connects every system in the dealership. AD-002 Facility Operations feeds DMS configuration requirements. AD-001 Licensing feeds FTC Safeguards technology requirements. AD-026 Regulatory Compliance monitors data security compliance. Every worker in the Vault benefits from reliable integrations and clean data. When a data feed breaks, this worker detects it before it affects downstream operations.",
    },
    valueProps: [
      { label: "DMS optimization recommendations", description: "Feature utilization audited per department. Unused modules identified. Configuration improvements recommended. DMS spend justified against actual usage." },
      { label: "Integration health monitoring", description: "Data flows between DMS, CRM, inventory tools, marketing platforms, and accounting monitored. Sync failures, latency, and data mismatches detected in real time." },
      { label: "Data integrity auditing", description: "Duplicate records, orphaned data, and inconsistencies identified across systems. Data quality scored per system. Cleanup recommendations prioritized by business impact." },
      { label: "Vendor contract management", description: "Renewal dates, price escalation terms, auto-renewal windows, and termination notice periods tracked. Total technology spend per employee and per department calculated." },
    ],
    faq: [
      { q: "Will this replace our IT department?", a: "It augments your IT support. The worker handles monitoring, auditing, and contract tracking. Your IT team or managed service provider handles implementation, troubleshooting, and vendor management." },
      { q: "How does the commission model work?", a: "Free to use. TitleApp earns a commission on technology optimization savings facilitated through the platform. No subscription fee." },
      { q: "Is my system data secure?", a: "All system configuration and vendor data is encrypted at rest and in transit. Data stays in your Vault. System inventories and access audits are never shared with technology vendors or competitors." },
    ],
  },
  "entitlement-analyst": {
    headline: "Know what you can build before you buy",
    subheadline: "Zoning analysis, entitlement strategy, and approval tracking. Every setback, density limit, and overlay district mapped before you commit capital.",
    steps: [
      { title: "Analyze the zoning", description: "Permitted uses, density, height, setbacks, FAR, lot coverage, parking ratios, and overlay districts checked against your proposed project." },
      { title: "Identify the entitlement path", description: "By-right, variance, conditional use, rezoning, or PUD — the worker maps the approvals required and models the timeline for each." },
      { title: "Prepare for hearings", description: "Staff reports, compliance narratives, community benefit summaries, and responses to anticipated objections assembled for planning commission." },
      { title: "Track conditions through completion", description: "Every condition of approval logged with responsible party, deadline, and compliance status. Pre-construction, during construction, and ongoing." },
    ],
    bridge: {
      title: "The Bridge",
      text: "The Entitlement Analyst sits between due diligence and construction. Site Due Diligence (W-003) feeds zoning and land use findings. Architecture Review (W-005) supplies design parameters that must fit within entitlement constraints. Entitlements approved unlock Permit Submission (W-012) to begin building permit applications. Timeline and cost impacts flow to the CRE Analyst (W-002) for feasibility updates and to the Capital Stack Optimizer (W-016) for budget adjustments.",
    },
    valueProps: [
      { label: "Zoning gap analysis", description: "Current zoning versus proposed use compared across every dimensional standard. Gaps identified with the specific approval type required to close each one." },
      { label: "Entitlement timeline modeling", description: "Review periods, hearing schedules, appeal windows, and condition compliance deadlines modeled by jurisdiction. Know your realistic start date before you close." },
      { label: "Public notice and hearing tracking", description: "Statutory notice requirements for every hearing tracked with publication dates, mailing lists, and posting deadlines. Missed notice voids approvals." },
      { label: "Vault-connected to design and permitting", description: "Design constraints from Architecture Review and permit readiness for the Permit Submission Worker flow through the Vault automatically." },
    ],
    faq: [
      { q: "Does this replace my land use attorney?", a: "No. The worker manages the analytical and tracking aspects of entitlement. Legal strategy, representation at hearings, and appeals require your land use attorney." },
      { q: "How does it handle different jurisdictions?", a: "Zoning codes, hearing procedures, and approval timelines vary by jurisdiction. The worker adapts its analysis and timeline modeling to the specific municipality, county, or regional agency with authority over your site." },
      { q: "What if my project requires a rezoning?", a: "The worker identifies when a rezoning is necessary, models the additional timeline and risk, and tracks the legislative process from application through adoption. It also flags the vested rights implications of pursuing rezoning versus a variance or conditional use." },
    ],
  },
  "insurance-coi": {
    headline: "Every policy current. Every certificate on file.",
    subheadline: "Policy management, COI tracking, claims handling, and renewal coordination across your entire operation. No coverage gaps. No expired certificates.",
    steps: [
      { title: "Inventory all policies", description: "GL, property, auto, umbrella, workers comp, professional liability, cyber, D&O — every policy documented with coverage limits, deductibles, endorsements, and renewal dates." },
      { title: "Track certificates of insurance", description: "Inbound COIs from vendors and subs parsed and verified. Outbound COIs to clients and landlords generated. Compliance status maintained in real time." },
      { title: "Manage claims", description: "Incident reported, claim filed, adjuster assigned, reserve set, resolution tracked. Every claim documented from first notice through final settlement." },
      { title: "Coordinate renewals", description: "90-day advance alerts, marketing submissions, quote comparisons, binding instructions, and binder confirmations. No lapse in coverage." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Insurance touches every part of the operation. Vendor contracts from the Vendor & Contract Worker (W-041) carry insurance requirements that flow here automatically. Construction projects feed sub insurance requirements from the Insurance & Risk Worker (W-025). Property acquisitions from the CRE Analyst (W-002) trigger property insurance procurement. Claims with legal exposure route to Legal (W-045). Renewal costs feed Accounting (W-039). The Compliance Tracker (W-047) monitors every expiration date.",
    },
    valueProps: [
      { label: "Automated COI parsing and verification", description: "Certificates parsed for coverage types, limits, effective dates, and additional insured status. Deficiencies flagged immediately with specific remediation required." },
      { label: "Policy renewal pipeline", description: "Every policy tracked with renewal date, marketing timeline, incumbent terms, and competitive quote status. No policy renews without review." },
      { label: "Claims lifecycle management", description: "From first notice of loss through final settlement. Reserve tracking, adjuster correspondence, subrogation recovery, and impact on future premiums documented." },
      { label: "Coverage gap detection", description: "Cross-policy analysis identifies gaps between GL, umbrella, property, and professional liability. Sublimit adequacy checked against actual exposure." },
    ],
    faq: [
      { q: "Does this replace my insurance broker?", a: "No. The worker manages your insurance program — tracking policies, parsing COIs, and monitoring renewals. Your broker handles market relationships, placement, and negotiation. The worker makes your broker more effective by providing organized data and early renewal preparation." },
      { q: "How does COI tracking work?", a: "Inbound certificates are parsed automatically for coverage types, limits, dates, and endorsements, then checked against your requirements. Deficient certificates are flagged with the specific issue. Expiring certificates trigger automatic renewal requests to the issuing party." },
      { q: "Can it handle multiple entities?", a: "Yes. Many businesses operate through multiple entities with different insurance programs. The worker tracks each entity's policies separately and identifies where coverage should be coordinated or consolidated." },
    ],
  },
  "mortgage-broker": {
    headline: "Source the best debt for every deal",
    subheadline: "Acquisition loans, construction financing, bridge, perm, and refi — lender matching, term sheet comparison, and pipeline tracking across every capital need.",
    steps: [
      { title: "Define the financing need", description: "Property type, deal stage, loan amount, timeline, and borrower profile captured. The worker identifies which lender programs fit your specific requirements." },
      { title: "Match to lender programs", description: "Agency, CMBS, life company, bank, bridge, and private credit programs filtered by your deal parameters. Non-recourse, assumability, and prepayment preferences applied." },
      { title: "Compare term sheets side by side", description: "Rate, spread, LTV, DSCR, IO period, prepayment, reserves, recourse, and fees normalized for apples-to-apples comparison. Total cost of capital calculated for each option." },
      { title: "Track the pipeline to close", description: "Application, approval, commitment, rate lock, closing — every loan tracked through the full lifecycle with deadline alerts and document checklists." },
    ],
    bridge: {
      title: "The Bridge",
      text: "The Mortgage Broker Worker connects your financing needs to the rest of the Vault. Deal data from the CRE Analyst (W-002) provides underwriting for loan sizing. The Capital Stack Optimizer (W-016) consumes selected loan terms to build the complete capital structure. Construction Lending (W-015) picks up construction-specific financing once the deal transitions to development. Title & Escrow (W-044) receives lender closing requirements. Loan terms flow to Accounting (W-039) and the Debt Service Worker (W-052) for ongoing tracking.",
    },
    valueProps: [
      { label: "Multi-product lender matching", description: "Acquisition, construction, bridge, permanent, and refinance — each with different lender pools. The worker knows which programs fit your deal and filters accordingly." },
      { label: "Total cost of capital analysis", description: "Origination fees, rate, reserves, legal, prepayment at projected hold period, and exit costs normalized into a single effective rate for true comparison." },
      { label: "Rate lock and deadline management", description: "Lock dates, expiration windows, extension fees, and float-down provisions tracked. Alerts fire when lock decisions are needed." },
      { label: "Vault-connected to underwriting and closing", description: "Deal data flows in from the CRE Analyst. Selected terms flow out to the Capital Stack Optimizer, Title & Escrow, and Debt Service Worker automatically." },
    ],
    faq: [
      { q: "Does this originate loans?", a: "No. This worker helps you source, compare, and track financing options. It does not originate, underwrite, or fund loans. Actual lending relationships are between you and your chosen lender or mortgage broker." },
      { q: "What loan types does it cover?", a: "Conventional bank, Fannie Mae, Freddie Mac, CMBS, life company, bridge, private credit, SBA, and USDA. Each program type has different qualifying criteria, terms, and processes that the worker tracks." },
      { q: "How does it handle multiple loans on one deal?", a: "Many deals involve layered debt — senior, mezz, and preferred equity. The worker tracks each financing piece separately and feeds the complete picture to the Capital Stack Optimizer for integrated analysis." },
    ],
  },
  "permit-tracker": {
    headline: "Every permit filed. Every correction resolved.",
    subheadline: "Permit applications, review cycle tracking, deficiency notice management, and approval coordination across every jurisdiction your projects touch.",
    steps: [
      { title: "Identify required permits", description: "Building, grading, demolition, MEP, fire, encroachment, stormwater — every permit mapped from your project scope with fees, timelines, and submission requirements." },
      { title: "File and track submissions", description: "Application dates, plan check assignments, reviewer contacts, and resubmission rounds tracked for every permit across every jurisdiction." },
      { title: "Respond to deficiency notices", description: "Plan check comments parsed by discipline, assigned to responsible professionals, responses tracked, and resubmission packages assembled with point-by-point responses." },
      { title: "Manage approvals and issuance", description: "Conditions of approval documented, fees paid and tracked, permit cards issued, and inspection requirements forwarded to the field team." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Permit Submission sits between design and construction. Architecture Review (W-005) and Engineering Review (W-006) provide permit-ready documents. Entitlement conditions from the Entitlement Analyst (W-004) must be satisfied before filing. Permits issued unlock the Construction Manager (W-021) to mobilize. Inspection requirements flow to Quality Control (W-027). Permit fees impact the budget tracked by the Capital Stack Optimizer (W-016). Fire department comments route to Fire & Life Safety (W-011).",
    },
    valueProps: [
      { label: "Multi-jurisdiction tracking", description: "City, county, state, and federal permits tracked in parallel. Each jurisdiction's review timelines, correction round patterns, and fee structures documented." },
      { label: "Plan check comment management", description: "Comments parsed by discipline — architectural, structural, MEP, fire — and routed to the responsible design professional with response deadline tracking." },
      { label: "Permit expiration monitoring", description: "Most jurisdictions expire permits after 180 days of inactivity. The worker tracks every active permit and alerts before expiration so extensions can be filed." },
      { label: "Vault-connected to design and construction", description: "Design documents flow in from Architecture and Engineering Review. Permit issuance triggers construction mobilization through the Construction Manager." },
    ],
    faq: [
      { q: "Does this file permits directly with jurisdictions?", a: "The worker prepares complete submission packages and tracks the entire review process. Actual filing is done through the jurisdiction's portal or in person. Direct integrations with major jurisdictions are in development." },
      { q: "How does it handle multiple plan check rounds?", a: "Each round is tracked: comments received, responses drafted, resubmission date. The worker models how many rounds your jurisdiction typically requires and adjusts your construction start timeline accordingly." },
      { q: "Can it track permits across multiple projects?", a: "Yes. Each project has its own permit matrix, but portfolio-level views show every active permit across all your projects with status, timeline, and upcoming deadlines in one place." },
    ],
  },
  "real-estate-sales": {
    headline: "From listing to close — nothing falls through",
    subheadline: "Listings, buyer qualification, showing management, offer negotiation, and transaction coordination in one workspace.",
    steps: [
      { title: "Prepare the listing", description: "Property details, pricing analysis, marketing materials, and listing syndication managed. Comparable sales and market positioning documented to support your pricing strategy." },
      { title: "Qualify buyers and manage showings", description: "Buyer interest tracked from inquiry through qualification. Showing schedules coordinated, feedback collected, and follow-up automated." },
      { title: "Negotiate and compare offers", description: "Every offer logged with price, terms, contingencies, earnest money, and closing timeline. Side-by-side comparison with net proceeds calculated for each." },
      { title: "Coordinate through closing", description: "Inspection, appraisal, financing contingency, title, and escrow milestones tracked. Every deadline monitored with responsible party assignments and escalation when items slip." },
    ],
    bridge: {
      title: "The Bridge",
      text: "Real Estate Sales connects to the broader deal lifecycle. Market Research (W-001) provides comp data and absorption trends for pricing strategy. The CRE Analyst (W-002) supplies property underwriting for investor-buyers. Title & Escrow (W-044) picks up the transaction once an offer is accepted and manages commitment review, exception resolution, and closing coordination. For disposition transactions, the Disposition Preparation Worker (W-036) feeds property packages and due diligence materials directly into the listing.",
    },
    valueProps: [
      { label: "Offer comparison and net proceeds analysis", description: "Every offer normalized: price, earnest money, contingency periods, financing terms, and closing timeline. Net proceeds calculated after commissions, closing costs, and prorations." },
      { label: "Transaction milestone tracking", description: "Inspection period, appraisal, loan approval, title clearance, and closing — every deadline tracked with status indicators and escalation when items are at risk." },
      { label: "Showing management and feedback", description: "Showing requests coordinated, confirmed, and documented. Buyer feedback collected and categorized. Follow-up actions tracked for every prospect." },
      { label: "Vault-connected to market data and closing", description: "Comparable sales from Market Research flow in for pricing. Accepted offers flow to Title & Escrow for closing coordination. Transaction data feeds Accounting automatically." },
    ],
    faq: [
      { q: "Does this replace my real estate agent?", a: "No. The worker handles transaction management, document tracking, and deadline coordination. Your licensed agent handles client relationships, property access, negotiations, and fiduciary duties." },
      { q: "Does it handle both buy-side and sell-side?", a: "Yes. Sell-side includes listing preparation, marketing, showing management, and offer review. Buy-side includes property search tracking, offer preparation, and contingency management. Both sides share the same closing coordination workflow." },
      { q: "How does it handle dual agency or multiple offers?", a: "The worker tracks every offer independently with full terms comparison. Agency relationships are documented per your state's requirements. Multiple-offer situations are managed with a structured review process and response tracking." },
    ],
  },
  // ── Aviation Workers ──
  "av-mission-builder": {
    headline: "Every mission authorized with full context",
    subheadline: "Aircraft airworthiness, crew legality, weather, risk assessment, customer requirements, and ground logistics — assembled and validated before any flight is authorized. Covers medevac, passenger charter, cargo, on-demand, and positioning.",
    steps: [
      { title: "Mission Request", description: "Receive and classify mission — type, origin, destination, timing, special requirements" },
      { title: "Automated Validation", description: "AV-004 aircraft status, AV-009 crew legality, AV-014 FRAT score, AV-016 weather — all checked automatically" },
      { title: "Dispatch Release", description: "Complete mission brief generated — crew, fuel, FBO, LZ, NOTAMs, W&B, duty hours remaining" },
      { title: "Audit Trail", description: "Every authorization decision recorded to Vault — fully defensible record" },
    ],
    bridge: { title: "From Phone Calls to Platform", text: "Dispatch coordination today means phone calls, text messages, and tribal knowledge. AV-013 replaces that with a single mission package where every element is validated before the crew brief is generated." },
    valueProps: [
      { label: "Crew Legality Gate", description: "No crew assigned without duty time validation from AV-009" },
      { label: "FRAT Integration", description: "Risk score is structural — elevated scores hold the mission until CP override" },
      { label: "Aircraft Status Live", description: "MEL restrictions, maintenance holds, and airworthiness fed in real-time from AV-004" },
      { label: "Medevac Ready", description: "HIPAA-compliant patient handling, No Surprises Act compliance, ground transport coordination" },
    ],
    faq: [
      { q: "Does this replace our dispatch software?", a: "AV-013 integrates with Ramco, FVO, and Aladtec — it validates and coordinates, not replaces. Your existing tools feed data in; AV-013 ensures every mission is authorized with full context." },
      { q: "How does the FRAT gate work?", a: "AV-014 FRAT score is required before AV-013 will generate a dispatch release. If the score is yellow, CP review is recommended. Red or black scores hold the mission until CP override with documented justification." },
      { q: "What about medevac missions?", a: "Full HIPAA compliance, No Surprises Act billing transparency, and patient notification workflows built in. Ground transport coordination included." },
    ],
  },
  "av-flight-duty-enforcer": {
    headline: "Hard stops on illegal crew assignments",
    subheadline: "Not a tracker — a prevention system. Validates every proposed assignment against 14 CFR 135.267 before it reaches the scheduling board. Blocks illegal assignments. CP override requires documented justification.",
    steps: [
      { title: "Assignment Proposed", description: "Crew assignment enters the system — from AV-032 scheduling or AV-013 dispatch" },
      { title: "Legality Check", description: "Daily, 7-day, 30-day, and annual flight time limits validated. Rest period verified. HEME rules applied when applicable" },
      { title: "Legal or Block", description: "Green: assignment proceeds. Red: hard stop with specific reg citation, remaining legal time, earliest legal report time" },
      { title: "Override Path", description: "CP override available with full justification — logged to Vault, visible to SMS" },
    ],
    bridge: { title: "Prevention, Not Tracking", text: "Most duty time tools tell you what happened. AV-009 prevents what shouldn't happen. The difference is an FAA enforcement action." },
    valueProps: [
      { label: "135.267 Enforcement", description: "Every limit — daily, weekly, monthly, annual — checked automatically" },
      { label: "HEME Rules", description: "Helicopter EMS modified rest rules applied correctly based on operation type" },
      { label: "Mixed Operations", description: "Part 91 positioning + Part 135 revenue — all time counted against 135 limits" },
      { label: "Proactive Alerts", description: "AV-029 Alex notified 2 hours before any limit — not after the violation" },
    ],
    faq: [
      { q: "Does this replace Aladtec for duty tracking?", a: "AV-009 reads duty data from Aladtec, FVO, and Ramco. It adds the enforcement layer — the hard stop that prevents illegal assignments from reaching the board." },
      { q: "What about HEME operations?", a: "14 CFR 135.271 helicopter EMS rules are applied automatically when the operation type is HEME. Different rest requirements, correctly calculated." },
      { q: "How does the CP override work?", a: "Chief Pilot receives the hard stop with full context — reg citation, time remaining, earliest legal time. Override requires written justification, logged immutably to Vault." },
    ],
  },
  "av-aircraft-status-mel": {
    headline: "Real-time airworthiness for every tail on the certificate",
    subheadline: "MEL deferrals, NEF, CDL, and placarded items — all tracked and fed to dispatch. No phone call to DOM required. When AV-007 logs a deferral, AV-004 updates instantly and AV-013 sees the restriction.",
    steps: [
      { title: "Status Aggregation", description: "MEL deferrals, AD/SB compliance, component life, maintenance records — all sources unified per tail number" },
      { title: "Airworthiness Determination", description: "Serviceable, restricted, or grounded — automatically computed with specific restriction details" },
      { title: "Dispatch Feed", description: "Restriction flags written to Vault — AV-013 dispatch sees them before mission assignment" },
      { title: "Alert Cascade", description: "AV-029 Alex notified on every MEL deferral, monitors expiry dates, alerts 48 hours before items expire" },
    ],
    bridge: { title: "Connected Intelligence", text: "One MEL deferral logged by maintenance updates aircraft status, restricts dispatch, and alerts the DOM — automatically. Zero phone calls." },
    valueProps: [
      { label: "Zero Latency", description: "Maintenance logs a deferral → AV-004 updates → dispatch sees restriction — instantly" },
      { label: "MEL + CDL + NEF", description: "All inoperative equipment categories tracked separately and fed to dispatch" },
      { label: "Expiry Monitoring", description: "48-hour alerts before MEL items expire — no surprises" },
      { label: "Maintenance Integration", description: "Ramco Aviation Suite feed — MEL deferrals, work orders, return-to-service events" },
    ],
    faq: [
      { q: "What data sources does this pull from?", a: "AV-007 maintenance work orders, AV-005 AD/SB status, AV-006 component life, plus Ramco Aviation Suite API for maintenance records." },
      { q: "What if a MEL expires during a mission?", a: "AV-013 is flagged on return. Maintenance hold queued automatically before next dispatch." },
      { q: "Does this handle CDL items?", a: "Yes — Configuration Deviation List items are tracked separately from MEL. Both are fed to dispatch with distinct restriction categories." },
    ],
  },
  "av-frat": {
    headline: "Risk quantified before every flight",
    subheadline: "FRAT score is structural — it gates dispatch authorization in AV-013. Pilot completes assessment before every flight. Elevated scores require documented CP override. Counters launch pressure in EMS operations.",
    steps: [
      { title: "Pre-Flight Assessment", description: "Pilot answers FRAT questions — weather, crew factors, aircraft, environment, mission type, personal minimums" },
      { title: "Auto-Population", description: "Weather data from AV-016, mission complexity from AV-013, duty status from AV-009 — pre-filled automatically" },
      { title: "Score & Gate", description: "Green: proceed. Yellow: mitigations recommended. Red: CP override required. Black: mission cancelled" },
      { title: "Pattern Analysis", description: "AV-029 Alex monitors scores across missions — persistent yellow on night ops flags training review" },
    ],
    bridge: { title: "Structural Risk Management", text: "A FRAT that nobody reads is theater. AV-014 makes the score a gate — dispatch cannot proceed without it, and elevated scores require documented action." },
    valueProps: [
      { label: "Dispatch Gate", description: "AV-013 requires FRAT completion before generating dispatch release — not optional" },
      { label: "Auto-Population", description: "Weather, duty status, and mission data pre-filled from Vault — pilot adds subjective factors" },
      { label: "Pattern Detection", description: "Alex monitors FRAT trends — persistent risk patterns flagged for training review" },
      { label: "CAMTS Compliant", description: "Meets CAMTS EMS FRAT requirements for medevac operations" },
    ],
    faq: [
      { q: "Is this just another form to fill out?", a: "Most FRAT data is auto-populated from other workers. The pilot adds subjective factors — personal minimums, comfort level, fatigue assessment. The score actually gates dispatch." },
      { q: "What happens when weather changes after the FRAT is submitted?", a: "AV-016 weather updates trigger a re-evaluation flag. AV-013 dispatch is notified. Pilot may need to re-assess." },
      { q: "Can the CP override a red score?", a: "Yes, with full written justification. The override is logged immutably and reported to SMS via AV-018." },
    ],
  },
  "av-crew-scheduling": {
    headline: "Every assignment pre-validated for legality",
    subheadline: "Builds and publishes crew schedules with every assignment checked against AV-009 duty limits, AV-010 qualifications, AV-012 medicals, and AV-011 training currency before it appears as publishable.",
    steps: [
      { title: "Schedule Build", description: "Define scheduling horizon, import crew availability, pull projected missions from AV-013" },
      { title: "Pre-Validation", description: "Every assignment checked: duty limits (AV-009), quals current (AV-010), medical valid (AV-012), training current (AV-011)" },
      { title: "Conflict Resolution", description: "Conflicts flagged before publishing — duty limit breaches, qual gaps, medical expirations" },
      { title: "Publish & Notify", description: "Schedule published to Vault. AV-029 Alex sends crew notifications. AV-038 coordinates housing." },
    ],
    bridge: { title: "Validated Before Published", text: "Every other scheduling tool lets you publish illegal assignments and hopes someone catches them. AV-032 validates first." },
    valueProps: [
      { label: "Legality Gate", description: "No assignment publishes without passing AV-009 duty time validation" },
      { label: "Qual Verification", description: "Type ratings, instrument currency, and check ride status verified per assignment" },
      { label: "Aladtec Integration", description: "Reads from or replaces Aladtec — integration mode configurable per operator" },
      { label: "Housing Coordination", description: "Schedule changes automatically trigger AV-038 crew housing updates" },
    ],
    faq: [
      { q: "Does this replace Aladtec?", a: "That's an open decision per operator. AV-032 can read from Aladtec (compliance layer on top) or replace it entirely (full 24-hour shift, multi-base, trade workflows)." },
      { q: "What happens on a sick call?", a: "AV-033 Reserve & Crew Swap Manager is triggered automatically. Searches for qualified replacement that passes all legality checks." },
      { q: "How does it handle crew trades?", a: "Both trading pilots must meet legality requirements for each other's shifts. AV-032 validates both directions before approving." },
    ],
  },
  "av-alex": {
    headline: "Your workers, orchestrated",
    subheadline: "Cross-worker anomaly detection, escalation routing, and the 0500 ops briefing. Monitors all Vault events in real time. Routes alerts to CP, DOM, and dispatchers. Free with 3+ worker subscriptions.",
    steps: [
      { title: "Vault Monitoring", description: "All worker outputs stream through Alex — MEL changes, duty limits, FRAT scores, schedule changes, maintenance events" },
      { title: "Anomaly Detection", description: "Cross-worker conflicts identified — MEL restricts aircraft already assigned to a mission, duty limit approaches during active mission" },
      { title: "Escalation Routing", description: "Alerts routed by severity: safety > compliance > operational > administrative. Right person, right channel, right time" },
      { title: "0500 Briefing", description: "Daily operations briefing to CP and DOM — fleet status, crew legality, active missions, weather, maintenance due" },
    ],
    bridge: { title: "Connected Intelligence", text: "Individual workers are powerful. Alex makes them a system. One MEL deferral can cascade to dispatch, scheduling, and housing — Alex ensures nothing falls through." },
    valueProps: [
      { label: "Real-Time Monitoring", description: "Every Vault event processed — no delay between worker output and Alex awareness" },
      { label: "Smart Routing", description: "Alerts go to the right person via the right channel — SMS, email, in-app — based on severity and role" },
      { label: "Cross-Worker Detection", description: "Conflicts between workers caught automatically — not by human cross-referencing" },
      { label: "Customizable", description: "Name, voice, communication style, notification preferences — all operator-configurable" },
    ],
    faq: [
      { q: "Does Alex make operational decisions?", a: "Never. Alex routes, presents, and monitors. Every actionable item requires human approval. Tier 0 — workers advise, humans approve." },
      { q: "What if we have fewer than 3 workers?", a: "Alex activates at 3+ worker subscriptions. Below that threshold, individual worker notifications still function." },
      { q: "Can we rename Alex?", a: "Yes. Operator admin can customize the name, and all platform references update accordingly." },
    ],
  },
  "av-digital-logbook": {
    headline: "Blockchain-verified logbook that replaces paper permanently",
    subheadline: "Auto-imports from ForeFlight, Schedaero, FVO. CSV import from LogTen Pro, MyFlightBook, Garmin Pilot. Photo scan of paper pages with AI handwriting recognition. PRIA-ready export. SHA-256 hash chain — immutable after entry.",
    steps: [
      { title: "Import or Enter", description: "Sync from ForeFlight, import CSV from any source, scan paper pages, or enter manually" },
      { title: "Verify & Stamp", description: "Review imported data, confirm accuracy, blockchain hash applied — immutable record" },
      { title: "Track Everything", description: "All categories — PIC, SIC, night, instrument, cross-country, dual, solo — cumulative totals always current" },
      { title: "Share When Ready", description: "PRIA-ready export for airline hiring, verification links for employers, PDF export anytime" },
    ],
    bridge: { title: "Your Career, Verified", text: "Paper logbooks get lost, damaged, and questioned. A blockchain-verified digital logbook is permanent, portable, and provable." },
    valueProps: [
      { label: "ForeFlight Sync", description: "OAuth API integration — flights auto-import after each session" },
      { label: "Blockchain Proof", description: "SHA-256 hash chain — every entry immutable, every total verifiable" },
      { label: "PRIA Ready", description: "Airline hiring package generated instantly — authorized release via Dropbox Sign" },
      { label: "Paper Scanner", description: "AI handwriting recognition for legacy logbook pages — digitize your career history" },
    ],
    faq: [
      { q: "Is the free tier really free?", a: "Yes. Manual entry and basic tracking are free forever. Pro ($19/mo) adds blockchain verification, ForeFlight auto-import, PRIA export, and photo scanning." },
      { q: "What if I'm on a company subscription?", a: "Company flight records auto-import from AV-013 mission completion events. One logbook, dual context — personal and company flights unified." },
      { q: "Can airlines verify my records?", a: "Yes. PRIA-ready export with blockchain proof-of-integrity certificate. Employers receive a verification link — no paper required." },
    ],
  },
};

// Admin Command Center
import AdminCommandCenter from "./admin/AdminShell";
import "./admin/admin.css";

function AdminShell({ onBackToHub }) {
  const [currentSection, setCurrentSection] = useState(() => {
    const redirectPage = sessionStorage.getItem("ta_redirect_page");
    if (redirectPage) {
      sessionStorage.removeItem("ta_redirect_page");
      return redirectPage;
    }
    return "dashboard";
  });
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenTour) {
      setTimeout(() => setShowTour(true), 500);
    }
  }, []);

  useEffect(() => {
    function handleNav(e) {
      const section = e.detail?.section;
      if (section) setCurrentSection(section);
    }
    window.addEventListener("ta:navigate", handleNav);
    return () => window.removeEventListener("ta:navigate", handleNav);
  }, []);

  function renderSection() {
    switch (currentSection) {
      case "dashboard":
        return <Dashboard />;
      case "analyst":
        return <Analyst />;
      case "rules-resources":
        return <RulesResources />;
      case "inventory":
        return <Inventory />;
      case "ai-chats":
        return <AIChats />;
      case "customers":
        return <Customers />;
      case "appointments":
        return <Appointments />;
      case "staff":
        return <Staff />;
      case "reports":
        return <Reports />;
      case "data-apis":
        return <DataAPIs />;
      case "fi-products":
        return <FIProducts />;
      case "auto-service":
        return <AutoService />;
      case "sales-pipeline":
        return <SalesPipeline />;
      case "rules":
        return <Rules />;
      case "settings":
        return <Settings />;
      case "my-vehicles":
        return <MyVehicles />;
      case "my-properties":
        return <MyProperties />;
      case "my-documents":
        return <MyDocuments />;
      case "my-logbook":
        return <MyLogbook />;
      case "my-certifications":
        return <MyCertifications />;
      case "my-wallet":
        return <MyWallet />;
      case "portfolio":
        return <Portfolio />;
      case "research":
        return <Research />;
      case "clients-lps":
        return <ClientsLPs />;
      case "deal-pipeline":
        return <DealPipeline />;
      case "vault-documents":
        return <VaultDocuments />;
      case "vault-assets":
        return <VaultAssets />;
      case "vault-deadlines":
        return <VaultDeadlines />;
      case "re-listings":
        return <REListings />;
      case "re-buyers":
        return <REBuyers />;
      case "re-transactions":
        return <RETransactions />;
      case "re-properties":
        return <REProperties />;
      case "re-tenants":
        return <RETenants />;
      case "re-maintenance":
        return <REMaintenance />;
      case "re-marketing":
        return <REMarketing />;
      case "worker-preview":
        return <WorkerPreview />;
      case "raas-store":
        return <RAASStore />;
      case "creator-dashboard":
        return <CreatorDashboard />;
      case "investor-data-room":
        return <InvestorDataRoom />;
      case "investor-cap-table":
        return <InvestorCapTable />;
      case "investor-pipeline":
        return <InvestorPipeline />;
      case "vault-tools":
        return <VaultTools />;
      case "b2b-analytics":
        return <B2BAnalytics />;
      case "pipelines":
        return <AlexPipelines />;
      case "task-board":
        return <AlexTaskBoard />;
      case "worker-status":
        return <AlexWorkerStatus />;
      case "chief-of-staff":
        return <AlexPipelines />;
      case "pending-signatures":
        return <PendingSignatures />;
      default:
        if (currentSection.startsWith("worker-")) return <Dashboard />;
        return <Dashboard />;
    }
  }

  const vertical = localStorage.getItem("VERTICAL") || "auto";

  return (
    <>
      <AppShell currentSection={currentSection} onNavigate={setCurrentSection} onBackToHub={onBackToHub}>
        {renderSection()}
      </AppShell>
      {showTour && (
        <OnboardingTour
          vertical={vertical}
          onComplete={() => setShowTour(false)}
        />
      )}
    </>
  );
}

export default function App() {
  // ── /invest/room route intercept ──────────────────────────
  // Completely standalone investor experience — bypasses AdminShell, WorkspaceHub, etc.
  const isInvestorRoom = window.location.pathname === "/invest/room" || window.location.pathname === "/invest/room/";
  const [investorReady, setInvestorReady] = useState(isInvestorRoom ? false : null);

  // ── /sandbox route intercept ──────────────────────────────
  // Standalone developer sandbox — split-pane layout with Alex chat + workspace
  const isSandbox = window.location.pathname === "/sandbox" || window.location.pathname === "/sandbox/";

  // ── /marketplace/:slug route intercept ─────────────────────
  // Public marketplace listing page — no auth required
  const marketplaceMatch = window.location.pathname.match(/^\/marketplace\/([a-z0-9-]+)\/?$/);
  const isMarketplace = !!marketplaceMatch;
  const marketplaceSlug = marketplaceMatch ? marketplaceMatch[1] : null;

  // ── /apply route intercept ────────────────────────────────
  const isApply = window.location.pathname === "/apply" || window.location.pathname === "/apply/";

  // ── /workers routes ─────────────────────────────────────
  const isWorkersIndex = /^\/workers\/?$/.test(window.location.pathname);
  const workersSlugMatch = window.location.pathname.match(/^\/workers\/([a-z0-9-]+)\/?$/);
  const workerSlug = workersSlugMatch ? workersSlugMatch[1] : null;
  const workerRoute = workerSlug ? WORKER_ROUTES.find((w) => w.slug === workerSlug) : null;
  const isLiveWorker = workerRoute && workerRoute.status === "live";
  const isPlannedWorker = workerRoute && workerRoute.status === "planned";

  // ── Vertical landing pages ──────────────────────────────────
  const isAutoLanding = /^\/auto\/?$/.test(window.location.pathname);
  const isTitleEscrowLanding = /^\/title-escrow\/?$/.test(window.location.pathname);
  const isPropMgmtLanding = /^\/property-management\/?$/.test(window.location.pathname);
  const isDevelopersLanding = /^\/developers\/?$/.test(window.location.pathname);
  const isPilotLanding = /^\/pilot\/?$/.test(window.location.pathname);

  const [sandboxReady, setSandboxReady] = useState(isSandbox ? false : null);

  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ID_TOKEN") : null
  );
  const [currentView, setCurrentView] = useState("loading"); // loading | hub | app | onboarding | builder-interview
  const [handoffInProgress, setHandoffInProgress] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get("token");
  });
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userName, setUserName] = useState("");
  const viewResolvedRef = useRef(false);

  useEffect(() => {
    // Handle custom token + session handoff from landing page chat
    const urlParams = new URLSearchParams(window.location.search);
    const chatToken = urlParams.get("token");
    const chatSid = urlParams.get("sid");
    const chatTenantId = urlParams.get("tid");
    const redirectPage = urlParams.get("page");

    if (chatSid) {
      sessionStorage.setItem("ta_platform_sid", chatSid);
    }
    if (chatTenantId) {
      sessionStorage.setItem("ta_preselected_tid", chatTenantId);
      localStorage.setItem("TENANT_ID", chatTenantId);
    }
    if (redirectPage) {
      // Map generic page names to business app section IDs
      const pageMap = { dataroom: "investor-data-room", "investor-data-room": "investor-data-room", "cap-table": "investor-cap-table", pipeline: "investor-pipeline" };
      sessionStorage.setItem("ta_redirect_page", pageMap[redirectPage] || redirectPage);
    }

    if (chatToken) {
      signInWithCustomToken(auth, chatToken)
        .then(async (userCred) => {
          const freshToken = await userCred.user.getIdToken(true);
          localStorage.setItem("ID_TOKEN", freshToken);
          setToken(freshToken);
          window.history.replaceState({}, "", window.location.pathname);
          setHandoffInProgress(false);
        })
        .catch((err) => {
          console.error("Custom token sign-in failed:", err);
          // If signInWithCustomToken fails (e.g. ID token passed instead of custom token),
          // check if user already has an active session on this domain
          const existingToken = localStorage.getItem("ID_TOKEN");
          if (existingToken) {
            setToken(existingToken);
          }
          window.history.replaceState({}, "", window.location.pathname);
          setHandoffInProgress(false);
        });
    }

    if (!chatToken) {
      const t = localStorage.getItem("ID_TOKEN");
      setToken(t);
    }

    const onStorage = (e) => {
      if (e.key === "ID_TOKEN") setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const freshToken = await user.getIdToken(true);
          localStorage.setItem("ID_TOKEN", freshToken);
          setToken(freshToken);
          setUserName(user.displayName || user.email?.split("@")[0] || "");
        } catch (err) {
          console.error("Failed to refresh token:", err);
        }
      } else {
        localStorage.removeItem("ID_TOKEN");
        setToken(null);
      }
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);

  // ── Investor room: mark ready once auth completes ──
  useEffect(() => {
    if (!isInvestorRoom) return;
    if (handoffInProgress) return; // still signing in
    if (token) {
      setInvestorReady(true);
    } else {
      // No token and no handoff — redirect to /invest to sign in
      setInvestorReady(true); // will render redirect below
    }
  }, [isInvestorRoom, token, handoffInProgress]);

  // ── Sandbox: mark ready once auth completes ──
  useEffect(() => {
    if (!isSandbox) return;
    if (handoffInProgress) return;
    if (token) {
      // Store display name for sandbox greeting
      if (auth.currentUser?.displayName) {
        localStorage.setItem("DISPLAY_NAME", auth.currentUser.displayName);
      }
      setSandboxReady(true);
    } else {
      setSandboxReady(true); // will render redirect below
    }
  }, [isSandbox, token, handoffInProgress]);

  // After auth resolves, decide where to go
  useEffect(() => {
    if (!token || handoffInProgress) {
      if (!handoffInProgress) setCurrentView("login");
      return;
    }

    // Prevent re-running after successful resolution (race condition:
    // onAuthStateChanged fires after signInWithCustomToken, re-triggering
    // this effect after sessionStorage items have been consumed)
    if (viewResolvedRef.current) return;

    async function resolveView() {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

        // Check for pre-selected tenant from landing page
        const preselectedTid = sessionStorage.getItem("ta_preselected_tid");
        if (preselectedTid) {
          sessionStorage.removeItem("ta_preselected_tid");

          // Validate the pre-selection via memberships
          const response = await fetch(`${apiBase}/api?path=/v1/me:memberships`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.status === 401) {
            localStorage.removeItem("ID_TOKEN");
            setToken(null);
            return;
          }

          const data = await response.json();
          if (data.ok && data.memberships) {
            const match = data.memberships.find((m) => m.tenantId === preselectedTid);
            if (match) {
              const tenant = data.tenants?.[match.tenantId] || {};
              localStorage.setItem("TENANT_ID", match.tenantId);
              if (tenant.vertical && tenant.vertical !== "GLOBAL") {
                localStorage.setItem("VERTICAL", tenant.vertical.toLowerCase());
              }
              if (tenant.jurisdiction && tenant.jurisdiction !== "GLOBAL") {
                localStorage.setItem("JURISDICTION", tenant.jurisdiction);
              }
              if (tenant.companyName || tenant.name) {
                localStorage.setItem("COMPANY_NAME", tenant.companyName || tenant.name);
                localStorage.setItem("WORKSPACE_NAME", tenant.companyName || tenant.name);
              }
              viewResolvedRef.current = true;
              setCurrentView("app");
              return;
            }
            // Preselected tid didn't match — if redirect page is set, pick best available tenant
            if (sessionStorage.getItem("ta_redirect_page") && data.memberships.length > 0) {
              const bestMem = data.memberships[0];
              const tenant = data.tenants?.[bestMem.tenantId] || {};
              localStorage.setItem("TENANT_ID", bestMem.tenantId);
              if (tenant.vertical && tenant.vertical !== "GLOBAL") {
                localStorage.setItem("VERTICAL", tenant.vertical.toLowerCase());
              }
              if (tenant.companyName || tenant.name) {
                localStorage.setItem("COMPANY_NAME", tenant.companyName || tenant.name);
                localStorage.setItem("WORKSPACE_NAME", tenant.companyName || tenant.name);
              }
              viewResolvedRef.current = true;
              setCurrentView("app");
              return;
            }
          }
        }

        // Check if user has any memberships at all (for onboarding flow)
        const response = await fetch(`${apiBase}/api?path=/v1/me:memberships`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("ID_TOKEN");
          setToken(null);
          return;
        }

        const data = await response.json();
        if (data.ok && data.memberships && data.memberships.length === 0) {
          // Check if landing page chat discovered enough context to auto-create workspace
          const rawCtx = sessionStorage.getItem("ta_discovered_context");
          if (rawCtx) {
            try {
              const dCtx = JSON.parse(rawCtx);
              if (dCtx.vertical) {
                // Map discovery vertical to platform vertical name
                const verticalMap = { "real-estate": "real-estate", "auto": "auto", "analyst": "analyst", "aviation": "aviation" };
                const vertical = verticalMap[dCtx.vertical] || dCtx.vertical;
                const tenantName = dCtx.businessName || (dCtx.intent === "personal" ? "My Vault" : "My Workspace");
                const tenantType = dCtx.intent === "personal" ? "personal" : "business";

                const createRes = await fetch(`${apiBase}/api?path=/v1/onboarding:claimTenant`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    tenantName,
                    tenantType,
                    vertical,
                    jurisdiction: dCtx.location || "GLOBAL",
                    onboardingState: { path: "discovery", vertical, dataSource: "sample" },
                    verticalConfig: dCtx.subtype ? { subtype: dCtx.subtype } : {},
                  }),
                });
                const createData = await createRes.json();
                if (createData.ok && createData.tenantId) {
                  localStorage.setItem("TENANT_ID", createData.tenantId);
                  localStorage.setItem("VERTICAL", vertical);
                  if (dCtx.location) localStorage.setItem("JURISDICTION", dCtx.location);
                  if (dCtx.businessName) {
                    localStorage.setItem("COMPANY_NAME", dCtx.businessName);
                    localStorage.setItem("WORKSPACE_NAME", dCtx.businessName);
                  }
                  localStorage.setItem("ONBOARDING_STATE", JSON.stringify({
                    path: "discovery", vertical, dataSource: "sample",
                    completedAt: new Date().toISOString(),
                  }));
                  sessionStorage.removeItem("ta_discovered_context");
                  viewResolvedRef.current = true;
                  setCurrentView("app");
                  return;
                }
              }
            } catch (e) {
              console.error("Auto-workspace from discovery failed:", e);
            }
          }
          setCurrentView("marketplace");
        } else {
          // Check if we were in the middle of onboarding a new workspace
          const pendingOnboarding = localStorage.getItem("PENDING_ONBOARDING");
          if (pendingOnboarding) {
            setNeedsOnboarding(true);
            viewResolvedRef.current = true;
            setCurrentView("app");
          } else if (sessionStorage.getItem("ta_redirect_page")) {
            // Redirect page is set (e.g., investor coming from /invest) — bypass hub
            // Auto-select the best tenant: prefer investor vertical, fall back to first
            const mems = data.memberships || [];
            const tenants = data.tenants || {};
            let bestTid = null;
            for (const m of mems) {
              const t = tenants[m.tenantId] || {};
              if (t.vertical === "investor" || (t.vertical && t.vertical.toLowerCase() === "investor")) {
                bestTid = m.tenantId;
                break;
              }
            }
            if (!bestTid && mems.length > 0) bestTid = mems[0].tenantId;
            if (bestTid) {
              const tenant = tenants[bestTid] || {};
              localStorage.setItem("TENANT_ID", bestTid);
              if (tenant.vertical && tenant.vertical !== "GLOBAL") {
                localStorage.setItem("VERTICAL", tenant.vertical.toLowerCase());
              }
              if (tenant.companyName || tenant.name) {
                localStorage.setItem("COMPANY_NAME", tenant.companyName || tenant.name);
                localStorage.setItem("WORKSPACE_NAME", tenant.companyName || tenant.name);
              }
            }
            viewResolvedRef.current = true;
            setCurrentView("app");
          } else if (localStorage.getItem("TENANT_ID")) {
            // Returning user with existing workspace — go straight to app
            viewResolvedRef.current = true;
            setCurrentView("app");
          } else if (data.memberships && data.memberships.length === 1) {
            // Single membership — auto-select and go to app
            const mem = data.memberships[0];
            const tenant = (data.tenants || {})[mem.tenantId] || {};
            localStorage.setItem("TENANT_ID", mem.tenantId);
            if (tenant.vertical && tenant.vertical !== "GLOBAL") {
              localStorage.setItem("VERTICAL", tenant.vertical.toLowerCase());
            }
            if (tenant.companyName || tenant.name) {
              localStorage.setItem("COMPANY_NAME", tenant.companyName || tenant.name);
              localStorage.setItem("WORKSPACE_NAME", tenant.companyName || tenant.name);
            }
            viewResolvedRef.current = true;
            setCurrentView("app");
          } else {
            setCurrentView("hub");
          }
        }
      } catch (err) {
        console.error("Failed to resolve view:", err);
        setCurrentView("hub");
      }
    }

    resolveView();
  }, [token, handoffInProgress]);

  function handleWorkspaceLaunch(workspace) {
    // WorkspaceHub already set localStorage values
    // Also set TENANT_ID for backward compatibility with existing API calls
    if (workspace.id !== "vault") {
      localStorage.setItem("TENANT_ID", workspace.id);
    }
    // Check if this workspace needs onboarding (newly created or incomplete)
    // Use both the prop flag AND localStorage (localStorage is the reliable signal)
    const pendingOnboarding = localStorage.getItem("PENDING_ONBOARDING");
    const shouldOnboard = workspace._needsOnboarding === true || !!pendingOnboarding;
    setNeedsOnboarding(shouldOnboard);
    setCurrentView("app");
    if (window.location.pathname === "/login" || window.location.pathname === "/") {
      window.history.replaceState({}, "", "/dashboard");
    }
  }

  function handleBackToHub() {
    viewResolvedRef.current = false;
    setCurrentView("hub");
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
  }

  async function handleFirstSubscribe(worker) {
    const suiteToVertical = {
      "Real Estate": "real-estate",
      "Construction": "real-estate",
      "Finance & Investment": "analyst",
      "General Business": "auto",
      "Legal": "auto",
      "Automotive": "auto",
      "Aviation": "aviation",
      "Platform": "auto",
    };
    const vertical = suiteToVertical[worker.suite] || "auto";
    const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

    try {
      const res = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vertical,
          name: userName ? `${userName}'s Workspace` : "My Workspace",
          jurisdiction: "GLOBAL",
          onboardingComplete: true,
          type: "org",
          workerIds: [worker.slug],
        }),
      });
      const data = await res.json();
      if (data.ok && data.workspace) {
        localStorage.setItem("TENANT_ID", data.workspace.id);
        localStorage.setItem("VERTICAL", vertical);
        localStorage.setItem("WORKSPACE_ID", data.workspace.id);
        localStorage.setItem("WORKSPACE_NAME", data.workspace.name);
        viewResolvedRef.current = true;
        setCurrentView("app");
      }
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  }

  // ── Investor Data Room: standalone experience ──────────────
  if (isInvestorRoom) {
    if (!investorReady || handoffInProgress) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f7fb" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed", marginBottom: 16 }}>TitleApp</div>
            <div style={{ fontSize: 16, color: "#6b7280" }}>Loading data room...</div>
          </div>
        </div>
      );
    }
    if (!token) {
      // No auth — send to /invest to sign up/in via Alex
      window.location.href = "/invest";
      return null;
    }
    return <InvestorDataRoom />;
  }

  // ── Developer Sandbox: standalone experience ────────────────
  if (isSandbox) {
    if (!sandboxReady || handoffInProgress) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f14" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed", marginBottom: 16 }}>TitleApp</div>
            <div style={{ fontSize: 16, color: "#94a3b8" }}>Loading sandbox...</div>
          </div>
        </div>
      );
    }
    if (!token) {
      window.location.href = "/developers";
      return null;
    }
    return <DeveloperSandbox />;
  }

  // ── Marketplace Listing: public, no auth required ───────────
  if (isMarketplace) {
    return <MarketplaceListing slug={marketplaceSlug} />;
  }

  // ── Creator Application: public, no auth required ──────────
  if (isApply) {
    return <CreatorApplication />;
  }

  // ── Workers: marketplace index, no auth required ──────────
  if (isWorkersIndex) {
    return <WorkerMarketplace />;
  }

  // ── Workers: live worker detail page, no auth required ────
  if (isLiveWorker) {
    return (
      <WorkerDetailPage
        worker={workerRoute}
        content={WORKER_DETAIL_CONTENT[workerSlug] || { headline: workerRoute.name, subheadline: workerRoute.description }}
        onSubscribe={(w) => {
          sessionStorage.setItem("ta_auto_worker", w.slug);
          window.location.href = "/";
        }}
      />
    );
  }

  // ── Workers: planned worker waitlist, no auth required ────
  if (isPlannedWorker) {
    return (
      <WorkerWaitlistPage
        name={workerRoute.name}
        description={workerRoute.description}
        slug={workerRoute.slug}
        suite={workerRoute.suite}
      />
    );
  }

  // ── Workers: unknown slug ─────────────────────────────────
  if (workerSlug && !workerRoute) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed" }}>TitleApp</div>
        <div style={{ fontSize: 16, color: "#6b7280" }}>This Digital Worker was not found.</div>
        <a href="/workers" style={{ color: "#7c3aed", fontSize: 14 }}>Browse all workers</a>
      </div>
    );
  }

  // ── Vertical landing pages: no auth required ────────────────
  if (isAutoLanding) return <AutoLanding />;
  if (isTitleEscrowLanding) return <TitleEscrowLanding />;
  if (isPropMgmtLanding) return <PropertyMgmtLanding />;
  if (isDevelopersLanding) return <DeveloperLanding />;
  if (isPilotLanding) return <PilotLanding />;

  if (handoffInProgress || currentView === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 600, color: "#7c3aed", marginBottom: "16px" }}>TitleApp</div>
          <div style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!token || currentView === "login") return <LandingPage />;

  if (currentView === "onboarding") {
    return (
      <div className="appShell" style={{ minHeight: "100vh" }}>
        <div className="dualPanel" style={{ minHeight: "100vh" }}>
          <aside className="chatSidebar">
            <ChatPanel currentSection="onboarding" onboardingStep={onboardingStep} />
          </aside>
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
            <OnboardingWizard
              onComplete={() => setCurrentView("hub")}
              onStepChange={setOnboardingStep}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentView === "marketplace") {
    return (
      <WorkerMarketplace
        authenticated
        userName={userName}
        onSubscribe={handleFirstSubscribe}
        onSkip={() => setCurrentView("hub")}
      />
    );
  }

  if (currentView === "hub") {
    return (
      <WorkspaceHub
        userName={userName}
        onLaunch={handleWorkspaceLaunch}
        onBuilderStart={() => setCurrentView("builder-interview")}
        onAdminLaunch={() => setCurrentView("admin")}
        onAddWorker={() => setCurrentView("marketplace")}
      />
    );
  }

  if (currentView === "admin") {
    return <AdminCommandCenter onBackToHub={handleBackToHub} />;
  }

  if (currentView === "builder-interview") {
    return (
      <BuilderInterview
        onComplete={(workspace) => {
          handleWorkspaceLaunch(workspace);
        }}
        onCancel={() => setCurrentView("hub")}
      />
    );
  }

  if (currentView === "app" && needsOnboarding) {
    const onboardingVertical = localStorage.getItem("PENDING_ONBOARDING") || localStorage.getItem("VERTICAL") || "auto";
    return (
      <div className="appShell" style={{ minHeight: "100vh" }}>
        <div className="dualPanel" style={{ minHeight: "100vh" }}>
          <aside className="chatSidebar">
            <ChatPanel currentSection="onboarding" onboardingStep={onboardingStep} />
          </aside>
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
            <OnboardingWizard
              vertical={onboardingVertical}
              skipToStep={2}
              onComplete={() => {
                localStorage.removeItem("PENDING_ONBOARDING");
                localStorage.setItem("ONBOARDING_COMPLETE", "true");
                setNeedsOnboarding(false);
              }}
              onStepChange={setOnboardingStep}
            />
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell onBackToHub={handleBackToHub} />;
}
