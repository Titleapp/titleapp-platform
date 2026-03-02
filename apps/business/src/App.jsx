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
import AlexPipelines from "./sections/AlexPipelines";
import AlexTaskBoard from "./sections/AlexTaskBoard";
import AlexWorkerStatus from "./sections/AlexWorkerStatus";
import DeveloperSandbox from "./pages/DeveloperSandbox";
import MarketplaceListing from "./pages/MarketplaceListing";
import CreatorApplication from "./pages/CreatorApplication";
import WorkerWaitlistPage from "./pages/WorkerWaitlistPage";
import WorkerMarketplace, { WORKER_ROUTES } from "./pages/WorkerMarketplace";
import WorkerDetailPage from "./pages/WorkerDetailPage";
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
