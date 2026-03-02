import React, { useState, useMemo } from "react";
import { getAuth, signOut } from "firebase/auth";
import WorkerIcon from "../utils/workerIcons";

// Worker slug → additional "My Work" nav items
const WORKER_NAV_MAP = {
  "cre-analyst": [
    { id: "deal-screening", label: "Deal Screening" },
    { id: "portfolio", label: "Portfolio" },
    { id: "assumptions", label: "Assumptions" },
    { id: "evidence", label: "Evidence Table" },
  ],
  "investor-relations": [
    { id: "investor-pipeline", label: "Investor Pipeline" },
    { id: "compliance", label: "Compliance" },
    { id: "waterfall", label: "Waterfall" },
    { id: "investor-data-room", label: "Data Room" },
    { id: "reporting", label: "Reporting" },
  ],
  "chief-of-staff": [
    { id: "pipelines", label: "Pipelines" },
    { id: "task-board", label: "Task Board" },
    { id: "worker-status", label: "Worker Status" },
  ],
  "construction-manager": [
    { id: "projects", label: "Projects" },
    { id: "schedule", label: "Schedule" },
  ],
  "construction-draws": [
    { id: "draws", label: "Draw Requests" },
    { id: "waivers", label: "Lien Waivers" },
    { id: "retainage", label: "Retainage" },
    { id: "sov", label: "Schedule of Values" },
  ],
  "construction-lending": [
    { id: "loan-comparison", label: "Loan Comparison" },
    { id: "draw-schedule", label: "Draw Schedule" },
    { id: "interest-reserve", label: "Interest Reserve" },
    { id: "loan-utilization", label: "Utilization" },
  ],
  "capital-stack-optimizer": [
    { id: "capital-stack", label: "Capital Stack" },
    { id: "sources-uses", label: "Sources & Uses" },
    { id: "waterfall", label: "Waterfall" },
    { id: "sensitivity", label: "Sensitivity" },
    { id: "scenarios", label: "Scenarios" },
  ],
  "title-escrow": [
    { id: "title-review", label: "Title Review" },
    { id: "exceptions", label: "Exceptions" },
    { id: "escrow", label: "Escrow" },
    { id: "closing", label: "Closing" },
  ],
  "mortgage-senior-debt": [
    { id: "term-sheets", label: "Term Sheets" },
    { id: "loan-sizing", label: "Loan Sizing" },
    { id: "comparison", label: "Comparison" },
    { id: "rate-locks", label: "Rate Locks" },
  ],
  "mortgage-broker": [{ id: "loan-pipeline", label: "Loan Pipeline" }],
  "tax-credit-incentive": [
    { id: "screening", label: "Screening" },
    { id: "credit-models", label: "Credit Models" },
    { id: "compliance-calendar", label: "Compliance" },
    { id: "syndicator", label: "Syndicator" },
  ],
  "permit-tracker": [{ id: "permits", label: "Permits" }],
  "insurance-coi": [{ id: "insurance", label: "Insurance & COIs" }],
  "tax-assessment": [{ id: "tax-appeals", label: "Tax Appeals" }],
  "compliance-tracker": [
    { id: "deadline-calendar", label: "Deadlines" },
    { id: "compliance-dashboard", label: "Dashboard" },
    { id: "conflicts", label: "Conflicts" },
    { id: "alerts", label: "Alerts" },
  ],
  "legal-contracts": [
    { id: "contract-review", label: "Reviews" },
    { id: "contract-registry", label: "Registry" },
    { id: "lien-tracker", label: "Lien Tracker" },
    { id: "amendments", label: "Amendments" },
  ],
  "property-management": [
    { id: "inventory", label: "Properties" },
    { id: "customers", label: "Tenants" },
    { id: "appointments", label: "Maintenance" },
  ],
  "bid-procurement": [
    { id: "bid-packages", label: "Bid Packages" },
    { id: "bid-matrix", label: "Bid Matrix" },
    { id: "sub-registry", label: "Sub Registry" },
    { id: "awards", label: "Awards" },
  ],
  "insurance-risk": [
    { id: "insurance-matrix", label: "Insurance Matrix" },
    { id: "coi-tracking", label: "COI Tracking" },
    { id: "risk-exposure", label: "Risk Exposure" },
    { id: "incidents", label: "Incidents" },
  ],
  "quality-control": [
    { id: "inspections", label: "Inspections" },
    { id: "deficiencies", label: "Deficiencies" },
    { id: "checklists", label: "Checklists" },
    { id: "co-tracker", label: "CO Tracker" },
  ],
  "safety-osha": [
    { id: "safety-plan", label: "Safety Plan" },
    { id: "osha-logs", label: "OSHA Logs" },
    { id: "training", label: "Training" },
    { id: "safety-incidents", label: "Incidents" },
    { id: "toolbox-talks", label: "Toolbox Talks" },
  ],
  "mep-coordination": [
    { id: "clash-log", label: "Clash Log" },
    { id: "submittals", label: "Submittals" },
    { id: "commissioning", label: "Commissioning" },
    { id: "mep-rfis", label: "MEP RFIs" },
  ],
  "labor-staffing": [
    { id: "workforce", label: "Workforce" },
    { id: "certified-payroll", label: "Certified Payroll" },
    { id: "certifications", label: "Certifications" },
  ],
  "materials-supply-chain": [
    { id: "procurement", label: "Procurement" },
    { id: "deliveries", label: "Deliveries" },
    { id: "long-lead", label: "Long-Lead Items" },
  ],
  "mezzanine-preferred-equity": [
    { id: "gap-analysis", label: "Gap Analysis" },
    { id: "waterfall", label: "Waterfall" },
    { id: "intercreditor", label: "Intercreditor" },
  ],
  "crowdfunding-regd": [
    { id: "investor-qualification", label: "Investors" },
    { id: "compliance-calendar", label: "Compliance" },
    { id: "cap-table", label: "Cap Table" },
  ],
  "site-due-diligence": [
    { id: "dd-checklist", label: "DD Checklist" },
    { id: "environmental", label: "Environmental" },
    { id: "survey", label: "Survey" },
  ],
  "land-use-entitlement": [
    { id: "zoning", label: "Zoning" },
    { id: "hearings", label: "Hearings" },
    { id: "conditions", label: "Conditions" },
  ],
  "permit-submission": [
    { id: "permits", label: "Permits" },
    { id: "plan-check", label: "Plan Check" },
    { id: "fees", label: "Fees" },
  ],
  "lease-up-marketing": [
    { id: "leasing", label: "Leasing" },
    { id: "marketing", label: "Marketing" },
    { id: "absorption", label: "Absorption" },
  ],
  "accounting": [
    { id: "financials", label: "Financials" },
    { id: "ap-ar", label: "AP/AR" },
    { id: "job-cost", label: "Job Cost" },
  ],
  "market-research": [
    { id: "market-analysis", label: "Market Analysis" },
    { id: "demographics", label: "Demographics" },
    { id: "supply-pipeline", label: "Supply Pipeline" },
    { id: "absorption", label: "Absorption" },
  ],
  "architecture-review": [
    { id: "plan-review", label: "Plan Review" },
    { id: "code-compliance", label: "Code Compliance" },
    { id: "ahj-comments", label: "AHJ Comments" },
  ],
  "engineering-review": [
    { id: "civil-review", label: "Civil" },
    { id: "structural-review", label: "Structural" },
    { id: "traffic-review", label: "Traffic" },
    { id: "utility-review", label: "Utilities" },
  ],
  "environmental-cultural-review": [
    { id: "phase-i", label: "Phase I ESA" },
    { id: "biological", label: "Biological" },
    { id: "archaeological", label: "Archaeological" },
    { id: "cultural-impact", label: "Cultural Impact" },
  ],
  "energy-sustainability": [
    { id: "energy-model", label: "Energy Model" },
    { id: "leed-scorecard", label: "LEED Scorecard" },
    { id: "certifications", label: "Certifications" },
  ],
  "accessibility-fair-housing": [
    { id: "ada-audit", label: "ADA Audit" },
    { id: "fair-housing", label: "Fair Housing" },
    { id: "remediation", label: "Remediation" },
  ],
  "government-relations": [
    { id: "hearings", label: "Hearings" },
    { id: "stakeholder-map", label: "Stakeholders" },
    { id: "public-comment", label: "Public Comment" },
  ],
  "fire-life-safety": [
    { id: "fire-code", label: "Fire Code" },
    { id: "egress-plan", label: "Egress Plan" },
    { id: "fire-protection", label: "Fire Protection" },
  ],
  "opportunity-zone": [
    { id: "qof-compliance", label: "QOF Compliance" },
    { id: "improvement-test", label: "Improvement Test" },
    { id: "oz-timeline", label: "Timeline" },
    { id: "tax-benefits", label: "Tax Benefits" },
  ],
  "appraisal-valuation": [
    { id: "appraisal-review", label: "Appraisal Review" },
    { id: "comp-analysis", label: "Comp Analysis" },
    { id: "valuation-methods", label: "Valuation Methods" },
  ],
  "tenant-screening": [
    { id: "applications", label: "Applications" },
    { id: "screening-reports", label: "Screening Reports" },
    { id: "criteria", label: "Criteria" },
  ],
  "rent-roll-revenue": [
    { id: "rent-roll", label: "Rent Roll" },
    { id: "revenue-forecast", label: "Revenue Forecast" },
    { id: "lease-abstracts", label: "Lease Abstracts" },
    { id: "renewals", label: "Renewals" },
  ],
  "maintenance-work-order": [
    { id: "work-orders", label: "Work Orders" },
    { id: "preventive-schedule", label: "PM Schedule" },
    { id: "vendor-dispatch", label: "Vendor Dispatch" },
  ],
  "utility-management": [
    { id: "utility-costs", label: "Utility Costs" },
    { id: "consumption", label: "Consumption" },
    { id: "rate-optimization", label: "Rate Optimization" },
  ],
  "hoa-association": [
    { id: "assessments", label: "Assessments" },
    { id: "ccr-compliance", label: "CC&R Compliance" },
    { id: "reserve-study", label: "Reserve Study" },
    { id: "violations", label: "Violations" },
  ],
  "warranty-defect": [
    { id: "warranty-claims", label: "Warranty Claims" },
    { id: "defect-tracking", label: "Defect Tracking" },
    { id: "builder-liability", label: "Builder Liability" },
  ],
  "vendor-contract": [
    { id: "vendors", label: "Vendors" },
    { id: "contracts", label: "Contracts" },
    { id: "performance", label: "Performance" },
    { id: "vendor-renewals", label: "Renewals" },
  ],
  "disposition-preparation": [
    { id: "sale-prep", label: "Sale Prep" },
    { id: "dd-assembly", label: "DD Assembly" },
    { id: "buyer-qual", label: "Buyer Qualification" },
  ],
  "exchange-1031": [
    { id: "exchange-timeline", label: "Exchange Timeline" },
    { id: "replacement-props", label: "Replacement Properties" },
    { id: "qi-coordination", label: "QI Coordination" },
  ],
  "entity-formation": [
    { id: "entity-structure", label: "Entity Structure" },
    { id: "filings", label: "Filings" },
    { id: "operating-agreements", label: "Operating Agreements" },
  ],
  "property-insurance": [
    { id: "policies", label: "Policies" },
    { id: "coverage-analysis", label: "Coverage Analysis" },
    { id: "claims", label: "Claims" },
    { id: "risk-assessment", label: "Risk Assessment" },
  ],
  "disposition-marketing": [
    { id: "marketing-materials", label: "Marketing Materials" },
    { id: "data-room", label: "Data Room" },
    { id: "buyer-outreach", label: "Buyer Outreach" },
    { id: "offers", label: "Offers" },
  ],
  "investor-reporting": [
    { id: "quarterly-reports", label: "Quarterly Reports" },
    { id: "distributions", label: "Distributions" },
    { id: "k1-coordination", label: "K-1 Coordination" },
    { id: "lp-comms", label: "LP Communications" },
  ],
  "debt-service": [
    { id: "loan-payments", label: "Loan Payments" },
    { id: "covenant-monitor", label: "Covenant Monitor" },
    { id: "compliance-reports", label: "Compliance Reports" },
    { id: "refinance-analysis", label: "Refinance Analysis" },
  ],
  // ── Auto Dealer — Phase 0: Dealership Setup ──
  "ad-dealer-licensing": [
    { id: "license-tracker", label: "License Tracker" },
    { id: "safeguards-audit", label: "Safeguards Audit" },
    { id: "ofac-screening", label: "OFAC Screening" },
    { id: "regulatory-calendar", label: "Regulatory Calendar" },
  ],
  "ad-facility-operations": [
    { id: "franchise-compliance", label: "Franchise Compliance" },
    { id: "facility-checklist", label: "Facility Checklist" },
    { id: "dms-config", label: "DMS Configuration" },
    { id: "department-pl", label: "Department P&L" },
  ],
  // ── Auto Dealer — Phase 1: Inventory Acquisition ──
  "ad-new-car-allocation": [
    { id: "allocation-tracker", label: "Allocation Tracker" },
    { id: "turn-earn", label: "Turn & Earn" },
    { id: "pipeline-orders", label: "Pipeline Orders" },
    { id: "incentive-calendar", label: "Incentive Calendar" },
  ],
  "ad-used-car-acquisition": [
    { id: "auction-sourcing", label: "Auction Sourcing" },
    { id: "trade-appraisal", label: "Trade Appraisal" },
    { id: "vin-decode", label: "VIN Decode" },
    { id: "acquisition-log", label: "Acquisition Log" },
  ],
  "ad-wholesale-disposition": [
    { id: "wholesale-candidates", label: "Wholesale Candidates" },
    { id: "auction-scheduling", label: "Auction Scheduling" },
    { id: "loss-analysis", label: "Loss Analysis" },
    { id: "floor-plan-exposure", label: "Floor Plan Exposure" },
  ],
  // ── Auto Dealer — Phase 2: Merchandising & Pricing ──
  "ad-used-car-pricing": [
    { id: "market-pricing", label: "Market Pricing" },
    { id: "price-to-market", label: "Price-to-Market" },
    { id: "aging-reductions", label: "Aging Reductions" },
    { id: "margin-forecast", label: "Margin Forecast" },
  ],
  "ad-vehicle-merchandising": [
    { id: "photo-audit", label: "Photo Audit" },
    { id: "listing-quality", label: "Listing Quality" },
    { id: "vdp-performance", label: "VDP Performance" },
    { id: "syndication", label: "Syndication" },
  ],
  "ad-reconditioning": [
    { id: "recon-pipeline", label: "Recon Pipeline" },
    { id: "vendor-tracking", label: "Vendor Tracking" },
    { id: "cost-approval", label: "Cost Approval" },
    { id: "cycle-time", label: "Cycle Time" },
  ],
  // ── Auto Dealer — Phase 3: Sales & Desking ──
  "ad-lead-management": [
    { id: "lead-pipeline", label: "Lead Pipeline" },
    { id: "response-time", label: "Response Time" },
    { id: "appointment-set", label: "Appointment Set" },
    { id: "source-roi", label: "Source ROI" },
  ],
  "ad-desking": [
    { id: "deal-structure", label: "Deal Structure" },
    { id: "payment-calc", label: "Payment Calculator" },
    { id: "lender-match", label: "Lender Match" },
    { id: "gross-tracker", label: "Gross Tracker" },
  ],
  "ad-inventory-turn": [
    { id: "stocking-guide", label: "Stocking Guide" },
    { id: "days-supply", label: "Days Supply" },
    { id: "segment-mix", label: "Segment Mix" },
    { id: "turn-velocity", label: "Turn Velocity" },
  ],
  // ── Auto Dealer — Phase 4: F&I ──
  "ad-fi-menu": [
    { id: "fi-menu-builder", label: "Menu Builder" },
    { id: "pvr-tracking", label: "PVR Tracking" },
    { id: "penetration", label: "Penetration" },
    { id: "product-profitability", label: "Profitability" },
  ],
  "ad-fi-compliance": [
    { id: "deal-jacket", label: "Deal Jacket" },
    { id: "equal-treatment", label: "Equal Treatment" },
    { id: "adverse-actions", label: "Adverse Actions" },
    { id: "mla-screening", label: "MLA Screening" },
  ],
  "ad-lender-relations": [
    { id: "lender-programs", label: "Lender Programs" },
    { id: "stip-tracker", label: "Stip Tracker" },
    { id: "funding-pipeline", label: "Funding Pipeline" },
    { id: "lender-scorecard", label: "Scorecard" },
  ],
  "ad-aftermarket-admin": [
    { id: "contracts", label: "Contracts" },
    { id: "claims", label: "Claims" },
    { id: "cancellations", label: "Cancellations" },
  ],
  // ── Auto Dealer — Phase 5: Service & Parts ──
  "ad-service-scheduling": [
    { id: "appointments", label: "Appointments" },
    { id: "shop-loading", label: "Shop Loading" },
    { id: "ro-tracker", label: "RO Tracker" },
    { id: "tech-dispatch", label: "Tech Dispatch" },
  ],
  "ad-service-upsell": [
    { id: "mpi-dashboard", label: "MPI Dashboard" },
    { id: "advisor-scorecard", label: "Advisor Scorecard" },
    { id: "declined-services", label: "Declined Services" },
    { id: "service-to-sales", label: "Service to Sales" },
  ],
  "ad-parts-inventory": [
    { id: "inventory", label: "Inventory" },
    { id: "fill-rate", label: "Fill Rate" },
    { id: "obsolescence", label: "Obsolescence" },
    { id: "orders", label: "Orders" },
  ],
  "ad-warranty-admin": [
    { id: "claims", label: "Claims" },
    { id: "rejections", label: "Rejections" },
    { id: "parts-returns", label: "Parts Returns" },
    { id: "audit-prep", label: "Audit Prep" },
  ],
  "ad-body-shop": [
    { id: "estimates", label: "Estimates" },
    { id: "supplements", label: "Supplements" },
    { id: "cycle-time", label: "Cycle Time" },
    { id: "drp-compliance", label: "DRP Compliance" },
  ],
  // ── Auto Dealer — Phase 6: Retention & Marketing ──
  "ad-customer-retention": [
    { id: "retention-campaigns", label: "Campaigns" },
    { id: "equity-mining", label: "Equity Mining" },
    { id: "lease-maturity", label: "Lease Maturity" },
    { id: "lifecycle", label: "Lifecycle" },
  ],
  "ad-reputation": [
    { id: "reviews", label: "Reviews" },
    { id: "sentiment", label: "Sentiment" },
    { id: "ratings", label: "Ratings" },
  ],
  "ad-digital-marketing": [
    { id: "spend-tracking", label: "Spend Tracking" },
    { id: "source-attribution", label: "Source Attribution" },
    { id: "channel-performance", label: "Channels" },
    { id: "co-op", label: "Co-op" },
  ],
  // ── Auto Dealer — Phase 7: Compliance & Back Office ──
  "ad-title-registration": [
    { id: "title-tracker", label: "Title Tracker" },
    { id: "temp-tags", label: "Temp Tags" },
    { id: "payoff-tracker", label: "Payoff Tracker" },
  ],
  "ad-deal-accounting": [
    { id: "deal-posting", label: "Deal Posting" },
    { id: "commissions", label: "Commissions" },
    { id: "receivables", label: "Receivables" },
    { id: "daily-doc", label: "Daily DOC" },
  ],
  "ad-regulatory-compliance": [
    { id: "self-assessment", label: "Self-Assessment" },
    { id: "audit-prep", label: "Audit Prep" },
    { id: "complaints", label: "Complaints" },
    { id: "training", label: "Training" },
  ],
  "ad-hr-payroll": [
    { id: "pay-plans", label: "Pay Plans" },
    { id: "wage-compliance", label: "Wage Compliance" },
    { id: "overtime", label: "Overtime" },
    { id: "licenses", label: "Licenses" },
  ],
  "ad-floor-plan": [
    { id: "floor-plan-interest", label: "Floor Plan" },
    { id: "cash-flow", label: "Cash Flow" },
    { id: "ap-management", label: "AP" },
    { id: "financial-statement", label: "Financials" },
  ],
  "ad-dms-technology": [
    { id: "systems", label: "Systems" },
    { id: "integrations", label: "Integrations" },
    { id: "access-review", label: "Access Review" },
    { id: "vendor-contracts", label: "Vendor Contracts" },
  ],
  // Legacy vertical mappings — map vertical names to nav items too
  "analyst": [
    { id: "portfolio", label: "Portfolio" },
    { id: "deal-pipeline", label: "Deal Pipeline" },
  ],
  "auto": [
    { id: "inventory", label: "Inventory" },
    { id: "customers", label: "Customers" },
    { id: "sales-pipeline", label: "Sales Pipeline" },
    { id: "fi-products", label: "F&I Products" },
    { id: "auto-service", label: "Service" },
  ],
  "real-estate": [
    { id: "re-listings", label: "Listings" },
    { id: "re-buyers", label: "Buyers" },
    { id: "re-transactions", label: "Transactions" },
    { id: "re-properties", label: "Properties" },
    { id: "re-tenants", label: "Tenants" },
    { id: "re-maintenance", label: "Maintenance" },
    { id: "re-marketing", label: "Marketing" },
  ],
  "investor": [
    { id: "investor-data-room", label: "Data Room" },
    { id: "investor-cap-table", label: "Cap Table" },
    { id: "investor-pipeline", label: "Investor Pipeline" },
  ],
};

// Worker slug → display name
const WORKER_DISPLAY_NAMES = {
  "cre-analyst": "CRE Analyst",
  "investor-relations": "IR Worker",
  "construction-manager": "Construction Manager",
  "construction-draws": "Draw Manager",
  "construction-lending": "Construction Lending",
  "capital-stack-optimizer": "Capital Stack Optimizer",
  "title-escrow": "Title & Escrow",
  "mortgage-senior-debt": "Mortgage & Senior Debt",
  "mortgage-broker": "Mortgage Broker",
  "tax-credit-incentive": "Tax Credit & Incentive",
  "permit-tracker": "Permit Tracker",
  "insurance-coi": "Insurance & COI",
  "tax-assessment": "Tax Assessment",
  "compliance-tracker": "Compliance Tracker",
  "legal-contracts": "Legal & Contracts",
  "property-management": "Property Manager",
  "bid-procurement": "Bid & Procurement",
  "insurance-risk": "Insurance & Risk",
  "quality-control": "Quality Control",
  "safety-osha": "Safety & OSHA",
  "mep-coordination": "MEP Coordination",
  "labor-staffing": "Labor & Staffing",
  "materials-supply-chain": "Materials & Supply Chain",
  "mezzanine-preferred-equity": "Mezz & Pref Equity",
  "crowdfunding-regd": "Crowdfunding & Reg D",
  "site-due-diligence": "Site Due Diligence",
  "land-use-entitlement": "Land Use & Entitlement",
  "permit-submission": "Permit Submission",
  "lease-up-marketing": "Lease-Up & Marketing",
  "accounting": "Accounting",
  "chief-of-staff": "Alex — Chief of Staff",
  "market-research": "Market Research",
  "architecture-review": "Architecture & Design Review",
  "engineering-review": "Engineering Review",
  "environmental-cultural-review": "Environmental & Cultural Review",
  "energy-sustainability": "Energy & Sustainability",
  "accessibility-fair-housing": "Accessibility & Fair Housing",
  "government-relations": "Government Relations",
  "fire-life-safety": "Fire & Life Safety",
  "opportunity-zone": "Opportunity Zone",
  "appraisal-valuation": "Appraisal & Valuation",
  "tenant-screening": "Tenant Screening",
  "rent-roll-revenue": "Rent Roll & Revenue",
  "maintenance-work-order": "Maintenance & Work Order",
  "utility-management": "Utility Management",
  "hoa-association": "HOA & Association",
  "warranty-defect": "Warranty & Defect",
  "vendor-contract": "Vendor & Contract",
  "disposition-preparation": "Disposition Prep",
  "exchange-1031": "1031 Exchange",
  "entity-formation": "Entity & Formation",
  "property-insurance": "Property Insurance & Risk",
  "disposition-marketing": "Disposition Marketing",
  "investor-reporting": "Investor Reporting",
  "debt-service": "Debt Service & Loan Compliance",
  "ad-dealer-licensing": "Dealer Licensing & Compliance",
  "ad-facility-operations": "Facility & Operations Setup",
  "ad-new-car-allocation": "New Car Allocation & Ordering",
  "ad-used-car-acquisition": "Used Car Acquisition",
  "ad-wholesale-disposition": "Wholesale & Disposition",
  "ad-used-car-pricing": "Used Car Pricing & Market Position",
  "ad-vehicle-merchandising": "Vehicle Merchandising & Photography",
  "ad-reconditioning": "Reconditioning Management",
  "ad-lead-management": "Lead Management & BDC",
  "ad-desking": "Desking & Deal Structure",
  "ad-inventory-turn": "Inventory Turn & Stocking Guide",
  "auto-dealer": "Auto Dealer",
  "aviation-ops": "Aviation Ops",
  "pilot-logbook": "Pilot Logbook",
  "part-135": "Part 135 Compliance",
};

const VERTICAL_LABELS = {
  auto: "Auto Dealer",
  analyst: "Investment Analyst",
  "real-estate": "Real Estate",
  aviation: "Aviation",
  investor: "Investor Relations",
  "property-mgmt": "Property Management",
  consumer: "Personal Vault",
};

export default function Sidebar({
  currentSection,
  onNavigate,
  onClose,
  tenantName,
  onBackToHub,
  workspaces = [],
  currentWorkspaceId,
  onSwitchWorkspace,
  workerGroups = [],
  activeWorkers = [],
  chiefOfStaff,
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workersExpanded, setWorkersExpanded] = useState(false);
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isPersonal = vertical === "consumer";

  const rawWsName = localStorage.getItem("WORKSPACE_NAME") || "";
  const isRawId = /^ws_\d+_[a-z0-9]+$/i.test(rawWsName);
  const workspaceName = isRawId ? "" : rawWsName;
  const companyName = workspaceName || tenantName || localStorage.getItem("COMPANY_NAME") || localStorage.getItem("TENANT_NAME") || "";
  const firstName = companyName.split(" ")[0] || "";
  const brandLabel = isPersonal && firstName
    ? `${firstName}'s Vault`
    : (workspaceName || tenantName || (isPersonal ? "Personal Vault" : "Business"));

  function handleNavClick(sectionId) {
    onNavigate(sectionId);
    if (onClose) onClose();
  }

  function handleWorkerClick(worker) {
    setSelectedWorker(worker.slug);
    window.dispatchEvent(new CustomEvent("ta:select-worker", { detail: { slug: worker.slug, name: worker.name } }));
    if (onClose) onClose();
  }

  function handleSignOut() {
    const auth = getAuth();
    signOut(auth).then(() => {
      localStorage.removeItem("ID_TOKEN");
      localStorage.removeItem("TENANT_ID");
      window.location.reload();
    }).catch(() => {
      localStorage.removeItem("ID_TOKEN");
      localStorage.removeItem("TENANT_ID");
      window.location.reload();
    });
  }

  // Build worker list for display
  const workerList = useMemo(() => {
    const workers = [];
    // Chief of Staff first
    if (chiefOfStaff?.enabled) {
      workers.push({
        slug: "chief-of-staff",
        name: chiefOfStaff.name || "Alex",
        isChiefOfStaff: true,
        active: true,
      });
    }
    // Active workers from workspace
    for (const wId of activeWorkers) {
      if (typeof wId === "string") {
        workers.push({
          slug: wId,
          name: WORKER_DISPLAY_NAMES[wId] || wId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          isChiefOfStaff: false,
          active: true,
        });
      } else if (wId && typeof wId === "object") {
        workers.push({
          slug: wId.slug || wId.id || "unknown",
          name: wId.displayName || wId.name || WORKER_DISPLAY_NAMES[wId.slug] || "Worker",
          isChiefOfStaff: wId.isChiefOfStaff || false,
          active: true,
        });
      }
    }
    return workers;
  }, [activeWorkers, chiefOfStaff]);


  // Build "My Work" nav items — universal + vertical + worker-triggered
  const myWorkItems = useMemo(() => {
    const items = [
      { id: "dashboard", label: "Dashboard" },
      { id: "deal-pipeline", label: "Deal Pipeline" },
      { id: "vault-documents", label: "Documents" },
      { id: "reports", label: "Reports" },
      { id: "clients-lps", label: "Clients & Contacts" },
    ];

    // Add vertical-specific items
    const verticalItems = WORKER_NAV_MAP[vertical] || [];
    const existingIds = new Set(items.map(i => i.id));
    for (const vi of verticalItems) {
      if (!existingIds.has(vi.id)) {
        items.push(vi);
        existingIds.add(vi.id);
      }
    }

    // Add worker-triggered items
    const workerSlugs = activeWorkers.map(w => typeof w === "string" ? w : w?.slug || "");
    for (const slug of workerSlugs) {
      const workerItems = WORKER_NAV_MAP[slug] || [];
      for (const wi of workerItems) {
        if (!existingIds.has(wi.id)) {
          items.push(wi);
          existingIds.add(wi.id);
        }
      }
    }

    return items;
  }, [vertical, activeWorkers]);

  // Group workspaces for the switcher
  const ownWorkspaces = workspaces.filter(w => w.type !== "shared");
  const sharedWorkspaces = workspaces.filter(w => w.type === "shared");

  return (
    <div className="sidebar">
      {/* ═══ WORKSPACE IDENTITY ═══ */}
      <div className="sidebarHeader" style={{ position: "relative" }}>
        <div
          className="brand"
          onClick={() => workspaces.length > 1 && setShowSwitcher(!showSwitcher)}
          style={{ cursor: workspaces.length > 1 ? "pointer" : "default", flex: 1 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {(brandLabel || "T").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="brandName" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isPersonal ? brandLabel : (workspaceName || "TitleApp AI")}
            </div>
            <div className="brandSub">{VERTICAL_LABELS[vertical] || "Business"}</div>
          </div>
          {workspaces.length > 1 && (
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{
                flexShrink: 0, color: "rgba(226,232,240,0.6)",
                transform: showSwitcher ? "rotate(180deg)" : "none",
                transition: "transform 150ms ease",
              }}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <button className="sidebarClose iconBtn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>

        {/* Workspace Switcher Dropdown */}
        {showSwitcher && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
            background: "#0f172a", borderRadius: "0 0 12px 12px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxHeight: 320, overflowY: "auto",
          }}>
            {ownWorkspaces.length > 0 && (
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Your Workspaces
              </div>
            )}
            {ownWorkspaces.map(ws => (
              <div
                key={ws.id}
                onClick={() => { setShowSwitcher(false); if (ws.id !== currentWorkspaceId) onSwitchWorkspace(ws); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", cursor: "pointer",
                  background: ws.id === currentWorkspaceId ? "rgba(124,58,237,0.15)" : "transparent",
                  borderRadius: 8, margin: "2px 8px",
                }}
                onMouseEnter={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: ws.id === currentWorkspaceId ? "#7c3aed" : "#1e293b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 600, fontSize: 12, flexShrink: 0,
                }}>
                  {(ws.name || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ws.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {VERTICAL_LABELS[ws.vertical] || ws.vertical}
                  </div>
                </div>
                {ws.id === currentWorkspaceId && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                )}
              </div>
            ))}

            {sharedWorkspaces.length > 0 && (
              <>
                <div style={{ padding: "12px 12px 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Shared With You
                </div>
                {sharedWorkspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => { setShowSwitcher(false); if (ws.id !== currentWorkspaceId) onSwitchWorkspace(ws); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", cursor: "pointer",
                      background: ws.id === currentWorkspaceId ? "rgba(124,58,237,0.15)" : "transparent",
                      borderRadius: 8, margin: "2px 8px",
                    }}
                    onMouseEnter={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: "#0f766e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 600, fontSize: 12, flexShrink: 0,
                    }}>
                      {(ws.senderOrgName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ws.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        From {ws.senderOrgName}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />

            {onBackToHub && (
              <div
                onClick={() => { setShowSwitcher(false); onBackToHub(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", cursor: "pointer", margin: "2px 8px", borderRadius: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, border: "1px dashed #475569", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", fontSize: 16, fontWeight: 600 }}>+</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>Add Workspace</div>
              </div>
            )}

            {onBackToHub && (
              <div
                onClick={() => { setShowSwitcher(false); onBackToHub(); }}
                style={{
                  padding: "6px 12px 10px", cursor: "pointer",
                  fontSize: 12, color: "#64748b", textAlign: "center",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; }}
              >
                Manage Workspaces
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ SECTION 1: DIGITAL WORKERS ═══ */}
      <div className="sidebarSection">
        <div className="sidebarLabel">Digital Workers</div>

        <nav className="nav">
          {/* Worker list — collapsible when >6 */}
          {(() => {
            const COLLAPSE_THRESHOLD = 6;
            const COLLAPSED_SHOW = 3;
            const shouldCollapse = workerList.length > COLLAPSE_THRESHOLD;
            const visibleWorkers = shouldCollapse && !workersExpanded
              ? workerList.slice(0, COLLAPSED_SHOW)
              : workerList;
            const hiddenCount = workerList.length - COLLAPSED_SHOW;

            return (
              <div style={shouldCollapse && workersExpanded ? {
                maxHeight: 240, overflowY: "auto", overflowX: "hidden",
              } : undefined}>
                {visibleWorkers.map(worker => {
                  const isSelected = selectedWorker === worker.slug;
                  return (
                    <button
                      key={worker.slug}
                      className={`navItem ${isSelected ? "navItemActive" : ""}`}
                      onClick={() => handleWorkerClick(worker)}
                      style={{
                        width: "100%", textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", fontSize: 13,
                        ...(worker.isChiefOfStaff ? {
                          background: isSelected
                            ? "rgba(124,58,237,0.16)"
                            : "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.08) 100%)",
                          borderRadius: 10,
                          marginBottom: 2,
                        } : {}),
                      }}
                    >
                      <span style={{ position: "relative", flexShrink: 0, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <WorkerIcon
                          slug={worker.slug}
                          size={16}
                          color={worker.isChiefOfStaff ? "#c4b5fd" : (isSelected ? "#ddd6fe" : "rgba(255,255,255,0.55)")}
                        />
                        {worker.active && (
                          <span style={{
                            position: "absolute", bottom: -1, right: -1,
                            width: 6, height: 6, borderRadius: "50%",
                            background: "#22c55e", border: "1.5px solid #0b1020",
                          }} />
                        )}
                      </span>
                      <span style={{
                        flex: 1,
                        color: worker.isChiefOfStaff ? "#c4b5fd" : "rgba(255,255,255,0.85)",
                        fontWeight: worker.isChiefOfStaff ? 600 : 400,
                      }}>
                        {worker.name}
                      </span>
                      {worker.isChiefOfStaff && (
                        <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>CoS</span>
                      )}
                    </button>
                  );
                })}

                {/* Collapse/expand toggle */}
                {shouldCollapse && (
                  <button
                    onClick={() => setWorkersExpanded(!workersExpanded)}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      background: "none", border: "none",
                      fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500,
                      padding: "5px 10px",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                  >
                    {workersExpanded ? "Show less" : `+ ${hiddenCount} more workers`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Empty state */}
          {workerList.length === 0 && (
            <div style={{
              padding: "8px 16px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
              fontStyle: "italic",
            }}>
              No workers yet
            </div>
          )}

          {/* Browse Marketplace */}
          <button
            className="navItem"
            onClick={() => handleNavClick("raas-store")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer",
              fontSize: 12, color: "#22c55e", fontWeight: 500,
              padding: "7px 10px",
            }}
          >
            + Browse Marketplace
          </button>
        </nav>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 16px" }} />

      {/* ═══ SECTION 2: MY WORK ═══ */}
      <div className="sidebarSection" style={{ flex: 1 }}>
        <div className="sidebarLabel">My Work</div>
        <nav className="nav">
          {myWorkItems.map(item => (
            <button
              key={item.id}
              className={`navItem ${currentSection === item.id ? "navItemActive" : ""}`}
              onClick={() => handleNavClick(item.id)}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 16px" }} />

      {/* ═══ SECTION 3: SETTINGS ═══ */}
      <div className="sidebarSection">
        <div className="sidebarLabel">Settings</div>
        <nav className="nav">
          <button
            className={`navItem ${currentSection === "settings" ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("settings")}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            Workspace Settings
          </button>
          <button
            className={`navItem ${currentSection === "rules" ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("rules")}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            Worker Rules
          </button>
        </nav>
      </div>

      {/* Footer: Switch Workspace + Sign Out */}
      <div className="sidebarFooter">
        {onBackToHub && (
          <button
            onClick={onBackToHub}
            className="iconBtn"
            style={{
              width: "100%", marginBottom: 4, fontSize: 12,
              color: "rgba(255,255,255,0.5)", background: "none", border: "none",
              cursor: "pointer", padding: "8px 0",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            Switch Workspace
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="iconBtn"
          style={{
            width: "100%", fontSize: 12,
            color: "rgba(255,255,255,0.4)", background: "none", border: "none",
            cursor: "pointer", padding: "8px 0",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
