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
      case "chief-of-staff":
        return <Dashboard />;
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
