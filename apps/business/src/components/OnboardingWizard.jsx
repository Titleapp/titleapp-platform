import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

// ── Data Constants ─────────────────────────────────────────────────

const JURISDICTIONS = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "GLOBAL", label: "Other / Multi-State" },
];

const VERTICAL_PLACEHOLDERS = {
  auto: { name: "Demo Motors", tagline: "Your trusted dealer since 1998" },
  "real-estate": { name: "Summit Realty Group", tagline: "Full-service brokerage and property management" },
  analyst: { name: "Meridian Capital Partners", tagline: "Data-driven investment decisions" },
  aviation: { name: "SkyOps Aviation", tagline: "Part 135 charter operations" },
};

const INTEGRATIONS_CATALOG = {
  auto: [
    { id: "cdk", name: "CDK Global", abbr: "CDK", category: "DMS", comingSoon: true },
    { id: "reynolds", name: "Reynolds & Reynolds", abbr: "R&R", category: "DMS", comingSoon: true },
    { id: "dealertrack", name: "Dealertrack", abbr: "DT", category: "DMS", comingSoon: true },
    { id: "vauto", name: "vAuto", abbr: "vA", category: "Pricing", comingSoon: true },
    { id: "autotrader", name: "AutoTrader", abbr: "AT", category: "Marketplace", comingSoon: true },
    { id: "cargurus", name: "CarGurus", abbr: "CG", category: "Marketplace", comingSoon: true },
    { id: "carfax", name: "CARFAX", abbr: "CF", category: "History", comingSoon: true },
    { id: "kbb", name: "Kelley Blue Book", abbr: "KBB", category: "Valuation", comingSoon: true },
    { id: "quickbooks", name: "QuickBooks", abbr: "QB", category: "Accounting", comingSoon: true },
    { id: "salesforce", name: "Salesforce", abbr: "SF", category: "CRM", comingSoon: true },
  ],
  "real-estate": [
    { id: "mls", name: "MLS / IDX Feed", abbr: "MLS", category: "Listings", comingSoon: true },
    { id: "zillow", name: "Zillow Premier", abbr: "Z", category: "Marketplace", comingSoon: true },
    { id: "dotloop", name: "Dotloop", abbr: "DL", category: "Transactions", comingSoon: true },
    { id: "skyslope", name: "SkySlope", abbr: "SS", category: "Transactions", comingSoon: true },
    { id: "appfolio", name: "AppFolio", abbr: "AF", category: "Property Mgmt", comingSoon: true },
    { id: "buildium", name: "Buildium", abbr: "BU", category: "Property Mgmt", comingSoon: true },
    { id: "quickbooks", name: "QuickBooks", abbr: "QB", category: "Accounting", comingSoon: true },
    { id: "docusign", name: "DocuSign", abbr: "DS", category: "E-Sign", comingSoon: true },
    { id: "canva", name: "Canva", abbr: "CV", category: "Marketing", comingSoon: true },
  ],
  analyst: [
    { id: "bloomberg", name: "Bloomberg Terminal", abbr: "BB", category: "Data", comingSoon: true },
    { id: "pitchbook", name: "PitchBook", abbr: "PB", category: "Data", comingSoon: true },
    { id: "capital-iq", name: "S&P Capital IQ", abbr: "CIQ", category: "Data", comingSoon: true },
    { id: "preqin", name: "Preqin", abbr: "PQ", category: "LP Data", comingSoon: true },
    { id: "factset", name: "FactSet", abbr: "FS", category: "Analytics", comingSoon: true },
    { id: "salesforce", name: "Salesforce", abbr: "SF", category: "CRM", comingSoon: true },
    { id: "quickbooks", name: "QuickBooks", abbr: "QB", category: "Accounting", comingSoon: true },
    { id: "docusign", name: "DocuSign", abbr: "DS", category: "E-Sign", comingSoon: true },
  ],
  aviation: [
    { id: "foreflight", name: "ForeFlight", abbr: "FF", category: "EFB", comingSoon: true },
    { id: "camp", name: "CAMP Systems", abbr: "CP", category: "Maintenance", comingSoon: true },
    { id: "avinode", name: "Avinode", abbr: "AV", category: "Charter", comingSoon: true },
    { id: "flightaware", name: "FlightAware", abbr: "FA", category: "Tracking", comingSoon: true },
    { id: "fbo-one", name: "FBO One", abbr: "F1", category: "FBO", comingSoon: true },
    { id: "quickbooks", name: "QuickBooks", abbr: "QB", category: "Accounting", comingSoon: true },
  ],
};

const SAMPLE_DATA_STEPS = {
  auto: [
    "Loading 30 vehicles...",
    "Loading 20 customers...",
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

const FIRST_VALUE_INSIGHTS = {
  auto: [
    { color: "#dc2626", badge: "Revenue", text: "Maria Gonzalez's lease expires in 60 days. She's a cash buyer. You have 3 matching vehicles in stock." },
    { color: "#d97706", badge: "Aging", text: "The 2021 BMW X3 has been on your lot for 143 days. Markdown to $31,999 could recover $31K before floor plan interest eats more margin." },
    { color: "#2563eb", badge: "Service", text: "Charles Cox is due for his 60K service. His factory warranty is about to expire -- perfect time to pitch Extra Care Gold ($2,995)." },
  ],
  "real-estate": [
    { color: "#dc2626", badge: "Late Rent", text: "Kevin Williams at Riverside 2A is 30 days past due ($1,850). Three reminders sent. Next step: 3-day notice per state statute." },
    { color: "#d97706", badge: "Vacancy", text: "Southside Flats Unit 3 has been vacant 45 days, costing ~$38/day. One application received yesterday." },
    { color: "#16a34a", badge: "Hot Lead", text: "Amanda Liu is relocating, pre-approved $350-450K, matched to 3 of your listings. Showing scheduled Saturday." },
  ],
  analyst: [
    { color: "#d97706", badge: "Opportunity", text: "Parkview Apartments (48 units, Phoenix) -- CMBS loan matures Aug 2026. Matches your multifamily criteria. $8.2M." },
    { color: "#dc2626", badge: "Risk Alert", text: "Sentinel Defense position is down 6.2% on a contract delay. Review position and consider trimming exposure." },
    { color: "#16a34a", badge: "LP Update", text: "Blackstone LP quarterly letter has been drafted and is pending your compliance review before distribution." },
  ],
  aviation: [
    { color: "#dc2626", badge: "Maintenance", text: "N123AB is due for its annual inspection in 45 days. Book now to avoid scheduling conflicts." },
    { color: "#d97706", badge: "Certification", text: "Captain Smith's medical certificate expires in 30 days. Renewal appointment recommended." },
    { color: "#2563eb", badge: "Utilization", text: "N456CD has flown 12 hours this month vs. 28-hour target. Consider adding to the charter schedule." },
  ],
};

// ── Component ──────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete, onStepChange, vertical: propsVertical, skipToStep }) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = checking
  const [path, setPath] = useState(null); // "business" | "vault"
  const [vertical, setVertical] = useState("auto");
  const [jurisdiction, setJurisdiction] = useState("IL");

  // Step 0 state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showVerticalPicker, setShowVerticalPicker] = useState(false);

  // Step 1 state (conversational form)
  const [subQuestion, setSubQuestion] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [verticalConfig, setVerticalConfig] = useState({});

  // Step 2 state
  const [selectedIntegrations, setSelectedIntegrations] = useState({});

  // Step 3 state
  const [dataSource, setDataSource] = useState(null); // "upload" | "sample" | "none"
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataLines, setSampleDataLines] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check existing progress on mount
  useEffect(() => {
    if (skipToStep != null) {
      // Coming from AddWorkspaceWizard — workspace already created
      setPath("business");
      setVertical(propsVertical || localStorage.getItem("VERTICAL") || "auto");
      setCompanyName(localStorage.getItem("COMPANY_NAME") || "");
      setJurisdiction(localStorage.getItem("JURISDICTION") || "IL");
      setTermsAccepted(true);
      goToStep(skipToStep);
      return;
    }
    async function checkExistingProgress() {
      try {
        const user = auth.currentUser;
        if (!user) { goToStep(0); return; }
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.termsAcceptedAt) {
            setTermsAccepted(true);
            if (data.companyName) setCompanyName(data.companyName);
          }
        }
        goToStep(0);
      } catch (err) {
        console.error("Failed to check onboarding progress:", err);
        goToStep(0);
      }
    }
    checkExistingProgress();
  }, []);

  function goToStep(step) {
    setCurrentStep(step);
    const stepNames = ["choose-path", "business-basics", "integrations", "data-import", "first-value", "magic"];
    onStepChange?.(stepNames[step] || "choose-path");
  }

  function getStepCount() {
    return path === "vault" ? 4 : 6;
  }

  function getEffectiveStep() {
    if (path === "vault") {
      // Vault skips steps 1 (business-basics) and 2 (integrations)
      // Step 0 -> 0, Step 3 -> 1, Step 4 -> 2, Step 5 -> 3
      if (currentStep === 0) return 0;
      if (currentStep === 3) return 1;
      if (currentStep === 4) return 2;
      if (currentStep === 5) return 3;
      return currentStep;
    }
    return currentStep;
  }

  // ── API Call ─────────────────────────────────────────────────────

  async function handleCreate() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      const payload = {
        tenantName: companyName || (path === "vault" ? "My Vault" : "My Business"),
        tenantType: path === "vault" ? "personal" : "business",
        vertical: path === "vault" ? "consumer" : vertical,
        jurisdiction,
      };

      if (tagline.trim()) payload.tagline = tagline.trim();
      if (Object.keys(selectedIntegrations).length > 0) {
        payload.integrations = Object.keys(selectedIntegrations).filter(k => selectedIntegrations[k]);
      }
      if (Object.keys(verticalConfig).length > 0) {
        payload.verticalConfig = verticalConfig;
      }

      const onboardingState = {
        path,
        vertical: path === "vault" ? "consumer" : vertical,
        dataSource: dataSource || "none",
        completedAt: new Date().toISOString(),
      };
      payload.onboardingState = onboardingState;

      const response = await fetch(`${apiBase}/api?path=/v1/onboarding:claimTenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      localStorage.setItem("TENANT_ID", data.tenantId);
      localStorage.setItem("VERTICAL", path === "vault" ? "consumer" : vertical);
      localStorage.setItem("JURISDICTION", jurisdiction);
      localStorage.setItem("ONBOARDING_STATE", JSON.stringify(onboardingState));
      if (companyName.trim()) {
        localStorage.setItem("COMPANY_NAME", companyName.trim());
        localStorage.setItem("WORKSPACE_NAME", companyName.trim());
      }

      goToStep(5);
      setTimeout(() => onComplete(data.tenantId), 2500);
    } catch (err) {
      console.error(err);
      setError(err?.message || String(err));
      setLoading(false);
    }
  }

  // ── Finish Onboarding (for existing workspaces) ────────────────

  function handleFinishOnboarding() {
    if (skipToStep != null) {
      // Workspace already exists — save state and show magic
      const onboardingState = {
        path: "business",
        vertical,
        dataSource: dataSource || "none",
        integrations: Object.keys(selectedIntegrations).filter(k => selectedIntegrations[k]),
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem("ONBOARDING_STATE", JSON.stringify(onboardingState));
      goToStep(5);
      setTimeout(() => onComplete(), 2500);
    } else {
      // First-time signup — create workspace via API
      handleCreate();
    }
  }

  // ── Sample Data Animation ───────────────────────────────────────

  function handleSampleDataLoad() {
    setDataSource("sample");
    setSampleDataLoading(true);
    const steps = SAMPLE_DATA_STEPS[vertical] || SAMPLE_DATA_STEPS.auto;
    setSampleDataLines([]);
    steps.forEach((line, i) => {
      setTimeout(() => {
        setSampleDataLines(prev => [...prev, line]);
        if (i === steps.length - 1) {
          setTimeout(() => goToStep(4), 800);
        }
      }, (i + 1) * 300);
    });
  }

  // ── File Drop Handlers ──────────────────────────────────────────

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  }

  // ── Loading state ───────────────────────────────────────────────

  if (currentStep === -1) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 600, color: "#7c3aed", marginBottom: "16px" }}>TitleApp</div>
          <div style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ── Progress Bar ────────────────────────────────────────────────

  function ProgressBar() {
    const total = getStepCount();
    const current = getEffectiveStep();
    return (
      <div style={{ display: "flex", gap: "4px", marginBottom: "32px" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i <= current ? "#7c3aed" : "#e5e7eb",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    );
  }

  // ── Step 0: Choose Your Path ────────────────────────────────────

  if (currentStep === 0) {
    return (
      <div style={{
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "20px",
      }}>
        <div style={{ width: "100%", maxWidth: "720px" }}>
          <ProgressBar />
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "48px", fontWeight: 300, letterSpacing: "-2px", color: "#7c3aed", marginBottom: "16px" }}>TitleApp</div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: 700 }}>What brings you here?</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Choose your path and we'll set everything up</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            {/* Business */}
            <div
              onClick={() => setShowVerticalPicker(true)}
              style={{
                padding: "28px 20px", textAlign: "center", borderRadius: "16px", cursor: "pointer",
                border: showVerticalPicker ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                background: showVerticalPicker ? "rgba(124,58,237,0.04)" : "white",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!showVerticalPicker) e.currentTarget.style.borderColor = "#c4b5fd"; }}
              onMouseLeave={(e) => { if (!showVerticalPicker) e.currentTarget.style.borderColor = "#e5e7eb"; }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px", color: "#1e293b" }}>Run my business</div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.4 }}>Auto, Real Estate, or Investment platform</div>
            </div>

            {/* AI Service -- Coming Soon */}
            <div style={{
              padding: "28px 20px", textAlign: "center", borderRadius: "16px", position: "relative",
              border: "2px solid #e5e7eb", background: "white", opacity: 0.6, cursor: "not-allowed",
            }}>
              <div style={{
                position: "absolute", top: "12px", right: "12px", fontSize: "10px", fontWeight: 600,
                padding: "2px 8px", borderRadius: "10px", background: "#f3e8ff", color: "#7c3aed",
              }}>Coming Soon</div>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px", color: "#94a3b8" }}>Build an AI service</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.4 }}>Deploy custom AI agents with RAAS</div>
            </div>

            {/* Vault */}
            <div
              onClick={() => {
                setPath("vault");
                setShowVerticalPicker(false);
                setVertical("consumer");
              }}
              style={{
                padding: "28px 20px", textAlign: "center", borderRadius: "16px", cursor: "pointer",
                border: path === "vault" ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                background: path === "vault" ? "rgba(124,58,237,0.04)" : "white",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (path !== "vault") e.currentTarget.style.borderColor = "#c4b5fd"; }}
              onMouseLeave={(e) => { if (path !== "vault") e.currentTarget.style.borderColor = "#e5e7eb"; }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px", color: "#1e293b" }}>My personal vault</div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.4 }}>Vehicles, property, documents, certifications</div>
            </div>
          </div>

          {/* Vertical picker -- shown when business is selected */}
          {showVerticalPicker && (
            <div style={{
              padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb",
              marginBottom: "24px", animation: "fadeIn 0.2s ease-out",
            }}>
              <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#374151" }}>What industry?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { id: "auto", label: "Automotive", icon: "A" },
                  { id: "real-estate", label: "Real Estate", icon: "R" },
                  { id: "analyst", label: "Investment", icon: "I" },
                  { id: "more", label: "More coming soon", icon: "+", disabled: true },
                ].map((v) => (
                  <button
                    key={v.id}
                    disabled={v.disabled}
                    onClick={() => {
                      if (!v.disabled) {
                        setVertical(v.id);
                        setPath("business");
                      }
                    }}
                    style={{
                      padding: "14px 12px", borderRadius: "10px", textAlign: "center", cursor: v.disabled ? "not-allowed" : "pointer",
                      border: vertical === v.id && path === "business" ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                      background: vertical === v.id && path === "business" ? "rgba(124,58,237,0.06)" : v.disabled ? "#f8fafc" : "white",
                      opacity: v.disabled ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "10px", margin: "0 auto 8px",
                      background: vertical === v.id && path === "business" ? "#7c3aed" : "#f1f5f9",
                      color: vertical === v.id && path === "business" ? "white" : "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "14px",
                    }}>{v.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: v.disabled ? "#94a3b8" : "#374151" }}>{v.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Terms + Continue */}
          {(path === "business" || path === "vault") && (
            <div style={{ textAlign: "center" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  By continuing you accept our Terms of Service and Privacy Policy
                </span>
              </label>
              <button
                disabled={!termsAccepted}
                onClick={() => {
                  if (path === "vault") {
                    goToStep(3); // Skip business basics + integrations
                  } else {
                    goToStep(1);
                  }
                }}
                style={{
                  padding: "14px 48px", fontSize: "15px", fontWeight: 600, borderRadius: "10px",
                  border: "none", cursor: termsAccepted ? "pointer" : "not-allowed",
                  background: termsAccepted ? "#7c3aed" : "#d1d5db", color: "white",
                  transition: "background 0.2s",
                }}
              >
                Continue
              </button>
            </div>
          )}
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Step 1: Business Basics (conversational form) ───────────────

  if (currentStep === 1) {
    const placeholders = VERTICAL_PLACEHOLDERS[vertical] || VERTICAL_PLACEHOLDERS.auto;

    // Sub-question definitions per vertical
    const baseQuestions = [
      { key: "name", label: "What's your business called?", placeholder: placeholders.name, type: "text" },
      { key: "tagline", label: "One-liner about what you do", placeholder: placeholders.tagline, type: "text" },
      { key: "state", label: "What state are you in?", type: "select" },
    ];

    const extraQuestions = [];
    if (vertical === "real-estate") {
      extraQuestions.push({
        key: "reType", label: "What's your focus?", type: "choice",
        options: [
          { value: "sales", label: "Sales / Brokerage" },
          { value: "pm", label: "Property Management" },
          { value: "both", label: "Both" },
        ],
      });
    } else if (vertical === "auto") {
      extraQuestions.push({
        key: "dealerType", label: "What type of dealership?", type: "choice",
        options: [
          { value: "franchise", label: "Franchise" },
          { value: "independent", label: "Independent" },
          { value: "bhph", label: "Buy Here Pay Here" },
        ],
      });
    } else if (vertical === "analyst") {
      extraQuestions.push({
        key: "strategy", label: "Primary strategy?", type: "choice",
        options: [
          { value: "pe", label: "Private Equity" },
          { value: "re-invest", label: "Real Estate Investment" },
          { value: "vc", label: "Venture Capital" },
          { value: "hedge", label: "Hedge Fund" },
          { value: "family", label: "Family Office" },
        ],
      });
    }

    const allQuestions = [...baseQuestions, ...extraQuestions];
    const currentQ = allQuestions[subQuestion];

    function handleAnswer(value) {
      if (currentQ.key === "name") setCompanyName(value);
      else if (currentQ.key === "tagline") setTagline(value);
      else if (currentQ.key === "state") setJurisdiction(value);
      else setVerticalConfig(prev => ({ ...prev, [currentQ.key]: value }));

      if (subQuestion < allQuestions.length - 1) {
        setSubQuestion(subQuestion + 1);
      } else {
        goToStep(2);
      }
    }

    function getValue() {
      if (currentQ.key === "name") return companyName;
      if (currentQ.key === "tagline") return tagline;
      if (currentQ.key === "state") return jurisdiction;
      return verticalConfig[currentQ.key] || "";
    }

    return (
      <div style={{
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "20px",
      }}>
        <div style={{ width: "100%", maxWidth: "500px" }}>
          <ProgressBar />
          <div key={subQuestion} style={{ animation: "fadeIn 0.3s ease-out" }}>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: 700 }}>{currentQ.label}</h2>

            {currentQ.type === "text" && (
              <div>
                <input
                  type="text"
                  value={getValue()}
                  onChange={(e) => {
                    if (currentQ.key === "name") setCompanyName(e.target.value);
                    else if (currentQ.key === "tagline") setTagline(e.target.value);
                  }}
                  placeholder={currentQ.placeholder}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && getValue().trim()) handleAnswer(getValue()); }}
                  style={{
                    width: "100%", padding: "14px 16px", fontSize: "16px",
                    border: "2px solid #e5e7eb", borderRadius: "12px", outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                />
                <button
                  disabled={!getValue().trim()}
                  onClick={() => handleAnswer(getValue())}
                  style={{
                    width: "100%", marginTop: "16px", padding: "14px", fontSize: "15px", fontWeight: 600,
                    background: getValue().trim() ? "#7c3aed" : "#d1d5db", color: "white",
                    border: "none", borderRadius: "10px", cursor: getValue().trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {currentQ.type === "select" && (
              <div>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  style={{
                    width: "100%", padding: "14px 16px", fontSize: "16px",
                    border: "2px solid #e5e7eb", borderRadius: "12px", outline: "none",
                    background: "white",
                  }}
                >
                  {JURISDICTIONS.map(j => (
                    <option key={j.value} value={j.value}>{j.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAnswer(jurisdiction)}
                  style={{
                    width: "100%", marginTop: "16px", padding: "14px", fontSize: "15px", fontWeight: 600,
                    background: "#7c3aed", color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {currentQ.type === "choice" && (
              <div style={{ display: "grid", gap: "10px" }}>
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    style={{
                      padding: "16px 20px", fontSize: "15px", fontWeight: 600, textAlign: "left",
                      border: "2px solid #e5e7eb", borderRadius: "12px", background: "white",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "rgba(124,58,237,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {subQuestion > 0 && (
            <button
              onClick={() => setSubQuestion(subQuestion - 1)}
              style={{
                marginTop: "16px", padding: "8px 16px", fontSize: "13px", color: "#6b7280",
                background: "none", border: "none", cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Step 2: Integrations Discovery ──────────────────────────────

  if (currentStep === 2) {
    const integrations = INTEGRATIONS_CATALOG[vertical] || INTEGRATIONS_CATALOG.auto;

    return (
      <div style={{
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "20px",
      }}>
        <div style={{ width: "100%", maxWidth: "700px" }}>
          <ProgressBar />
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>What tools do you use?</h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
              Select the tools you already use. We'll build connectors so your data flows in automatically.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {integrations.map((integ) => {
              const isSelected = selectedIntegrations[integ.id];
              return (
                <div
                  key={integ.id}
                  onClick={() => setSelectedIntegrations(prev => ({ ...prev, [integ.id]: !prev[integ.id] }))}
                  style={{
                    padding: "16px", borderRadius: "12px", cursor: "pointer", position: "relative",
                    border: isSelected ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                    background: isSelected ? "rgba(124,58,237,0.04)" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  {integ.comingSoon && (
                    <span style={{
                      position: "absolute", top: "8px", right: "8px", fontSize: "9px", fontWeight: 600,
                      padding: "1px 6px", borderRadius: "8px", background: "#f3e8ff", color: "#7c3aed",
                    }}>Soon</span>
                  )}
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px", marginBottom: "8px",
                    background: isSelected ? "#7c3aed" : "#f1f5f9",
                    color: isSelected ? "white" : "#64748b",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "12px",
                  }}>{integ.abbr}</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{integ.name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{integ.category}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => goToStep(3)}
              style={{
                padding: "8px 16px", fontSize: "13px", color: "#6b7280",
                background: "none", border: "none", cursor: "pointer",
              }}
            >
              Skip -- I'll set these up later
            </button>
            <button
              onClick={() => goToStep(3)}
              style={{
                padding: "14px 32px", fontSize: "15px", fontWeight: 600,
                background: "#7c3aed", color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Data Import / Sample Data ───────────────────────────

  if (currentStep === 3) {
    const steps = SAMPLE_DATA_STEPS[vertical] || SAMPLE_DATA_STEPS.auto;

    return (
      <div style={{
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "20px",
      }}>
        <div style={{ width: "100%", maxWidth: "700px" }}>
          <ProgressBar />
          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: 700 }}>
              Let's get your workspace ready
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
              You can upload your own data or explore with realistic sample data
            </p>
          </div>

          {error && (
            <div style={{ padding: "12px", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "14px", color: "#dc2626", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {sampleDataLoading ? (
            <div style={{ padding: "32px 24px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#1e293b" }}>Loading sample data...</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sampleDataLines.map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#16a34a", animation: "fadeIn 0.3s ease-out" }}>
                    <span style={{ fontSize: "16px" }}>&#10003;</span>
                    <span>{line.replace("...", "")}</span>
                  </div>
                ))}
                {sampleDataLines.length < steps.length && (
                  <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                    {steps[sampleDataLines.length]}
                  </div>
                )}
              </div>
            </div>
          ) : dataSource === "upload" ? (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  padding: "40px 24px", textAlign: "center", borderRadius: "12px",
                  border: `2px dashed ${dragOver ? "#7c3aed" : "#d1d5db"}`,
                  background: dragOver ? "rgba(124,58,237,0.04)" : "#fafafa",
                  transition: "all 0.2s", marginBottom: "16px",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>Drop files here</div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>CSV, XLSX, PDF -- or click to browse</div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  style={{
                    padding: "8px 20px", fontSize: "13px", fontWeight: 600, borderRadius: "8px",
                    border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "inline-block",
                  }}
                >
                  Browse Files
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0fdf4", borderRadius: "8px", marginBottom: "4px", fontSize: "13px" }}>
                      <span style={{ color: "#16a34a" }}>&#10003;</span>
                      <span style={{ flex: 1 }}>{f.name}</span>
                      <span style={{ color: "#94a3b8" }}>{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setDataSource(null)}
                  style={{
                    padding: "12px 20px", fontSize: "14px", color: "#6b7280",
                    background: "white", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => { setDataSource("upload"); handleFinishOnboarding(); }}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "12px 20px", fontSize: "15px", fontWeight: 600,
                    background: loading ? "#9ca3af" : "#7c3aed", color: "white",
                    border: "none", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Setting up..." : uploadedFiles.length > 0 ? "Upload & Continue" : "Continue without files"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                {/* Upload */}
                <div
                  onClick={() => setDataSource("upload")}
                  style={{
                    padding: "32px 24px", background: "white", borderRadius: "12px",
                    border: "2px solid #e5e7eb", cursor: "pointer", textAlign: "center",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>I have data to upload</div>
                  <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
                    Upload your files -- spreadsheets, PDFs, CSVs -- and we'll import everything
                  </div>
                </div>

                {/* Sample */}
                <div
                  onClick={handleSampleDataLoad}
                  style={{
                    padding: "32px 24px", borderRadius: "12px", cursor: "pointer", textAlign: "center",
                    background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                    border: "2px solid #e9d5ff", transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e9d5ff"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>Explore with sample data</div>
                  <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
                    We'll load realistic demo data so you can see everything in action
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => { setDataSource("none"); handleFinishOnboarding(); }}
                  disabled={loading}
                  style={{
                    padding: "8px 16px", fontSize: "13px", color: "#94a3b8",
                    background: "none", border: "none", cursor: "pointer",
                  }}
                >
                  {loading ? "Setting up..." : "Skip for now"}
                </button>
              </div>
            </div>
          )}
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Step 4: First Value Moment ──────────────────────────────────

  if (currentStep === 4) {
    const insights = FIRST_VALUE_INSIGHTS[vertical] || FIRST_VALUE_INSIGHTS.auto;

    return (
      <div style={{
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "20px",
      }}>
        <div style={{ width: "100%", maxWidth: "600px" }}>
          <ProgressBar />
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>Your AI already found some things</h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
              Based on your sample data, here's what caught our attention
            </p>
          </div>

          <div style={{
            padding: "24px", background: "white", borderRadius: "16px", border: "1px solid #e5e7eb",
            marginBottom: "24px",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {insights.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "16px", borderRadius: "12px",
                    borderLeft: `4px solid ${item.color}`,
                    background: "#fafafa",
                    animation: `fadeIn 0.3s ease-out ${i * 0.15}s both`,
                  }}
                >
                  <span style={{
                    display: "inline-block", fontSize: "11px", fontWeight: 600,
                    padding: "2px 8px", borderRadius: "8px", marginBottom: "8px",
                    background: `${item.color}15`, color: item.color,
                  }}>{item.badge}</span>
                  <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => handleFinishOnboarding()}
              style={{
                padding: "14px 48px", fontSize: "16px", fontWeight: 600,
                background: "#7c3aed", color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
              }}
            >
              Let's go!
            </button>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Step 5: Magic / Completion ──────────────────────────────────

  if (currentStep === 5) {
    const verticalLabel = vertical === "auto" ? "automotive" : vertical === "analyst" ? "investment" : vertical === "real-estate" ? "real estate" : vertical === "consumer" ? "personal vault" : vertical;

    return (
      <div style={{
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{
          textAlign: "center", color: "white", animation: "fadeInScale 0.6s ease-out",
          maxWidth: "500px", padding: "40px 20px",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "24px", fontWeight: 300, letterSpacing: "-2px" }}>
            TitleApp
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 16px 0" }}>
            Welcome, {companyName || "partner"}.
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.9, marginBottom: "32px" }}>
            Your AI-powered {path === "vault" ? "vault" : "business platform"} is ready
          </p>
          <div style={{
            display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px", textAlign: "left",
            background: "rgba(255,255,255,0.12)", borderRadius: "12px", padding: "20px 24px",
          }}>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>Setting up your workspace</div>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>Configuring AI assistant for {verticalLabel}</div>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>Loading {jurisdiction} compliance rules</div>
          </div>
          <div style={{
            width: "200px", height: "3px", background: "rgba(255,255,255,0.2)", borderRadius: "2px",
            margin: "0 auto", overflow: "hidden",
          }}>
            <div style={{ width: "100%", height: "100%", background: "white", borderRadius: "2px", animation: "progressSlide 2s ease-in-out" }} />
          </div>
        </div>
        <style>{`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes progressSlide {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  // Fallback
  return null;
}
