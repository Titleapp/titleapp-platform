import React, { useState, useEffect } from "react";
import InvestmentCriteriaStep from "./InvestmentCriteriaStep";
import SampleDealsStep from "./SampleDealsStep";
import DealershipDataStep from "./DealershipDataStep";
import RealEstateDataStep from "./RealEstateDataStep";
import TermsAndConditions from "./TermsAndConditions";
import IDVerifyStep from "./IDVerifyStep";
import PropertyMgmtStep from "./PropertyMgmtStep";
import BrokerageStep from "./BrokerageStep";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

interface OnboardingProps {
  onComplete: (tenantId: string) => void;
  onStepChange?: (step: string) => void;
}

export default function Onboarding({ onComplete, onStepChange }: OnboardingProps) {
  const [step, setStepRaw] = useState<"checking" | "terms" | "welcome" | "idVerify" | "details" | "raas" | "aiPersona" | "criteria" | "sampleDeals" | "dealerData" | "realEstateData" | "brokerage" | "propertyMgmt" | "dataChoice" | "magic">("checking");

  function setStep(newStep: typeof step) {
    setStepRaw(newStep);
    onStepChange?.(newStep);
  }
  const [companyName, setCompanyName] = useState("");
  const [vertical, setVertical] = useState("auto");
  const [jurisdiction, setJurisdiction] = useState("IL");
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [raasRules, setRaasRules] = useState("");
  const [aiPersonaName, setAiPersonaName] = useState("");
  const [aiPersonaTitle, setAiPersonaTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if user already accepted terms (e.g., via chat onboarding)
  useEffect(() => {
    async function checkExistingProgress() {
      try {
        const user = auth.currentUser;
        if (!user) {
          setStep("terms");
          return;
        }
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.termsAcceptedAt) {
            // Terms already accepted — skip to account details
            if (data.companyName) setCompanyName(data.companyName);
            setStep("details");
            return;
          }
        }
        setStep("terms");
      } catch (err) {
        console.error("Failed to check onboarding progress:", err);
        setStep("terms");
      }
    }
    checkExistingProgress();
  }, []);

  function handleDetailsNext() {
    if (!companyName.trim()) {
      setError("Please enter your company name");
      return;
    }
    setStep("raas");
  }

  function handleRaasNext() {
    setStep("aiPersona");
  }

  function handlePersonaNext() {
    if (vertical === "analyst") {
      setStep("criteria");
    } else if (vertical === "auto") {
      setStep("dealerData");
    } else if (vertical === "real-estate") {
      setStep("brokerage");
    } else if (vertical === "property-mgmt") {
      setStep("propertyMgmt");
    } else {
      setStep("dataChoice");
    }
  }

  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataLines, setSampleDataLines] = useState<string[]>([]);

  function getSampleDataSteps(): string[] {
    if (vertical === "real-estate") {
      return [
        "Loading 8 listings...",
        "Loading 10 buyer profiles...",
        "Loading 5 managed properties with 28 units...",
        "Loading 24 tenant records...",
        "Loading 7 maintenance requests...",
        "Loading 3 active transactions...",
      ];
    }
    if (vertical === "auto") {
      return [
        "Loading 30 vehicles...",
        "Loading 20 customers...",
        "Loading service schedule...",
        "Loading F&I products...",
        "Loading sales pipeline...",
      ];
    }
    if (vertical === "analyst") {
      return [
        "Loading portfolio (17 positions, $42.8M AUM)...",
        "Loading 13 LP records...",
        "Loading research pipeline...",
        "Loading 4 sourced opportunities...",
      ];
    }
    if (vertical === "property-mgmt") {
      return [
        "Loading 5 properties with 28 units...",
        "Loading 24 tenant records...",
        "Loading 7 maintenance requests...",
        "Loading lease schedule...",
      ];
    }
    return [
      "Loading sample vehicles, property, and documents...",
      "Loading logbook entries...",
    ];
  }

  function handleSampleDataLoad() {
    setSampleDataLoading(true);
    const steps = getSampleDataSteps();
    setSampleDataLines([]);
    steps.forEach((line, i) => {
      setTimeout(() => {
        setSampleDataLines(prev => [...prev, line]);
        if (i === steps.length - 1) {
          setTimeout(() => handleCreate(riskProfile), 800);
        }
      }, (i + 1) * 300);
    });
  }

  function handleCriteriaComplete(criteria: any) {
    setRiskProfile(criteria);
    // Show sample deals step
    setStep("sampleDeals");
  }

  async function handleCreate(criteria: any) {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      const payload: any = {
        tenantName: companyName,
        tenantType: "business",
        vertical,
        jurisdiction,
      };

      if (criteria) {
        payload.riskProfile = criteria;
      }
      if (raasRules.trim()) {
        payload.raasRules = raasRules.trim();
      }
      if (aiPersonaName.trim() || aiPersonaTitle.trim()) {
        payload.aiPersona = {
          name: aiPersonaName.trim() || "TitleApp AI Assistant",
          title: aiPersonaTitle.trim() || "AI Assistant",
        };
      }

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

      // Store tenant ID and vertical/jurisdiction for chat context
      localStorage.setItem("TENANT_ID", data.tenantId);
      localStorage.setItem("VERTICAL", vertical);
      localStorage.setItem("JURISDICTION", jurisdiction);
      if (raasRules.trim()) {
        localStorage.setItem("RAAS_RULES", raasRules.trim());
      }

      // Show magic moment
      setStep("magic");

      // Complete after animation
      setTimeout(() => {
        onComplete(data.tenantId);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      setLoading(false);
    }
  }

  if (step === "checking") {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 600, color: "#7c3aed", marginBottom: "16px" }}>TitleApp</div>
          <div style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (step === "terms") {
    return (
      <TermsAndConditions
        onAccept={() => setStep("welcome")}
        onDecline={() => {
          alert("You must accept the terms to use TitleApp AI");
          window.location.href = "/";
        }}
      />
    );
  }

  if (step === "aiPersona") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
              Name Your AI Assistant
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
              Your AI assistant handles outreach and follow-ups on your behalf.
              Give it a name and title that will appear on emails and messages.
            </p>
          </div>

          <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Assistant Name</div>
              <input
                type="text"
                value={aiPersonaName}
                onChange={(e) => setAiPersonaName(e.target.value)}
                placeholder="e.g., Rachel Kim, Alex Thompson"
                style={{
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Title</div>
              <select
                value={aiPersonaTitle}
                onChange={(e) => setAiPersonaTitle(e.target.value)}
                style={{
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                  background: "white",
                }}
              >
                <option value="">Select a title...</option>
                <option value="Associate Analyst">Associate Analyst</option>
                <option value="Analyst">Analyst</option>
                <option value="Executive Assistant">Executive Assistant</option>
                <option value="Chief of Staff">Chief of Staff</option>
                <option value="Operations Associate">Operations Associate</option>
                <option value="Client Relations">Client Relations</option>
                <option value="AI Assistant">AI Assistant</option>
              </select>
              <input
                type="text"
                value={aiPersonaTitle}
                onChange={(e) => setAiPersonaTitle(e.target.value)}
                placeholder="Or type a custom title..."
                style={{
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
            </label>
          </div>

          {(aiPersonaName.trim() || aiPersonaTitle.trim()) && (
            <div style={{
              padding: "16px",
              background: "#f8f4ff",
              borderRadius: "12px",
              border: "1px solid #e9d5ff",
              marginBottom: "24px",
              fontSize: "14px",
              color: "#374151",
            }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Preview</div>
              <div>Outbound messages will be signed:</div>
              <div style={{ marginTop: "8px", fontStyle: "italic", color: "#6b7280" }}>
                {aiPersonaName.trim() || "TitleApp AI Assistant"}{aiPersonaTitle.trim() ? `, ${aiPersonaTitle.trim()}` : ""} -- {companyName || "Your Company"}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handlePersonaNext}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "15px",
                background: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              Skip -- use default
            </button>
            <button
              onClick={handlePersonaNext}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "15px",
                fontWeight: 600,
                background: "rgb(124,58,237)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {aiPersonaName.trim() ? "Save & Continue" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "criteria") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <InvestmentCriteriaStep
            onComplete={handleCriteriaComplete}
            onSkip={() => handleCreate(null)}
          />
        </div>
      </div>
    );
  }

  if (step === "sampleDeals") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <SampleDealsStep
            criteria={riskProfile}
            onComplete={() => setStep("dataChoice")}
            onSkip={() => setStep("dataChoice")}
          />
        </div>
      </div>
    );
  }

  if (step === "dealerData") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "900px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <DealershipDataStep
            onComplete={() => setStep("dataChoice")}
            onSkip={() => setStep("dataChoice")}
          />
        </div>
      </div>
    );
  }

  if (step === "realEstateData") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "950px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <RealEstateDataStep
            onComplete={() => handleCreate(null)}
            onSkip={() => handleCreate(null)}
          />
        </div>
      </div>
    );
  }

  if (step === "raas") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
              AI Assistant Rules
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
              Any custom rules for your AI assistant? For example, tone of voice,
              topics to avoid, preferred terminology, or specific workflows.
            </p>
          </div>
          <textarea
            value={raasRules}
            onChange={(e) => setRaasRules(e.target.value)}
            placeholder="e.g. Always address clients formally. Never discuss competitor pricing. Use metric units."
            rows={4}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: "15px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />

          <div style={{ marginTop: "24px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600 }}>
              Compliance & Regulations
            </h3>
            <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "14px", lineHeight: 1.5 }}>
              Which regulations apply to your business? The AI will factor these into every recommendation.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { label: "State Licensing", value: "state_licensing" },
                { label: "FTC / Consumer Protection", value: "ftc" },
                { label: "Fair Housing", value: "fair_housing" },
                { label: "AML / KYC", value: "aml_kyc" },
                { label: "SEC Reporting", value: "sec" },
                { label: "RESPA / TILA", value: "respa_tila" },
                { label: "GDPR / Privacy", value: "gdpr" },
                { label: "EPA / Environmental", value: "epa" },
              ].map((reg) => {
                const isSelected = raasRules.includes(reg.value);
                return (
                  <button
                    key={reg.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setRaasRules(raasRules.replace(`[${reg.value}]`, "").trim());
                      } else {
                        setRaasRules((raasRules + ` [${reg.value}]`).trim());
                      }
                    }}
                    style={{
                      padding: "6px 14px",
                      fontSize: "13px",
                      borderRadius: "20px",
                      border: isSelected ? "2px solid rgb(124,58,237)" : "1px solid #e5e7eb",
                      background: isSelected ? "rgba(124,58,237,0.08)" : "white",
                      color: isSelected ? "rgb(124,58,237)" : "#374151",
                      cursor: "pointer",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {reg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleRaasNext}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "15px",
                background: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              Use Standard Rules
            </button>
            <button
              onClick={handleRaasNext}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "15px",
                fontWeight: 600,
                background: "rgb(124,58,237)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {raasRules.trim() ? "Save & Continue" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "brokerage") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "700px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <BrokerageStep
            onComplete={() => setStep("dataChoice")}
            onSkip={() => setStep("dataChoice")}
          />
        </div>
      </div>
    );
  }

  if (step === "propertyMgmt") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "700px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <PropertyMgmtStep
            onComplete={() => setStep("dataChoice")}
            onSkip={() => setStep("dataChoice")}
          />
        </div>
      </div>
    );
  }

  if (step === "dataChoice") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "700px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: 700 }}>
              Let's get your workspace ready
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
              You can upload your own data or explore with realistic sample data
            </p>
          </div>

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
                {sampleDataLines.length < getSampleDataSteps().length && (
                  <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                    {getSampleDataSteps()[sampleDataLines.length]}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Option A: Upload data */}
              <div
                onClick={() => handleCreate(riskProfile)}
                style={{
                  padding: "32px 24px",
                  background: "white",
                  borderRadius: "12px",
                  border: "2px solid #e5e7eb",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>
                  I have data to upload
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
                  Upload your files {"\u2014"} spreadsheets, PDFs, CSVs {"\u2014"} and we'll import everything
                </div>
              </div>

              {/* Option B: Sample data */}
              <div
                onClick={handleSampleDataLoad}
                style={{
                  padding: "32px 24px",
                  background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                  borderRadius: "12px",
                  border: "2px solid #e9d5ff",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e9d5ff"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>
                  Explore with sample data
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
                  We'll load realistic demo data so you can see everything in action. You can clear it anytime.
                </div>
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

  if (step === "magic") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "white",
            animation: "fadeInScale 0.6s ease-out",
            maxWidth: "500px",
            padding: "40px 20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "24px", fontWeight: 300, letterSpacing: "-2px" }}>
            TitleApp
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 16px 0" }}>
            Welcome, {companyName || "partner"}.
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.9, marginBottom: "32px" }}>
            Your AI-powered business platform is ready
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px", textAlign: "left", background: "rgba(255,255,255,0.12)", borderRadius: "12px", padding: "20px 24px" }}>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>Setting up your workspace</div>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>Configuring AI assistant for {vertical === "auto" ? "automotive" : vertical === "analyst" ? "investment" : vertical === "real-estate" ? "real estate" : vertical === "property-mgmt" ? "property management" : vertical}</div>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>Loading {jurisdiction} compliance rules</div>
          </div>
          <div style={{ width: "200px", height: "3px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", margin: "0 auto", overflow: "hidden" }}>
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

  if (step === "idVerify") {
    return (
      <IDVerifyStep
        onComplete={() => setStep("details")}
        onSkip={() => setStep("details")}
      />
    );
  }

  if (step === "details") {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: 700 }}>
              Set up your account
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
              Just a few quick details to get started
            </p>
          </div>

          <div style={{ display: "grid", gap: "24px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Company Name *</div>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={
                  vertical === "real-estate" ? "Summit Realty Group" :
                  vertical === "analyst" ? "Meridian Capital Partners" :
                  vertical === "property-mgmt" ? "Apex Property Management" :
                  "Demo Motors"
                }
                autoFocus
                required
                style={{
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDetailsNext();
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Industry</div>
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                style={{
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                  background: "white",
                }}
              >
                <option value="auto">Automotive</option>
                <option value="real-estate">Real Estate (Brokerage)</option>
                <option value="property-mgmt">Property Management</option>
                <option value="aviation">Aviation</option>
                <option value="marine">Marine</option>
                <option value="analyst">Investment / PE</option>
                <option value="GLOBAL">Other</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>State / Jurisdiction</div>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                style={{
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                  background: "white",
                }}
              >
                <option value="IL">Illinois</option>
                <option value="CA">California</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="NY">New York</option>
                <option value="NV">Nevada</option>
                <option value="GLOBAL">Other / Multi-State</option>
              </select>
            </label>

            {error && (
              <div
                style={{
                  padding: "12px",
                  background: "#fff5f5",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#dc2626",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleDetailsNext}
              disabled={loading}
              style={{
                padding: "14px",
                fontSize: "15px",
                fontWeight: 600,
                background: loading ? "#9ca3af" : "rgb(124,58,237)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "8px",
              }}
            >
              {loading ? "Creating your account..." : "Next →"}
            </button>

            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", margin: 0 }}>
              You can add team members, integrations, and billing later
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Welcome screen
  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "white",
          maxWidth: "600px",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "24px", fontWeight: 300, letterSpacing: "-2px" }}>TitleApp</div>
        <h1 style={{ fontSize: "40px", fontWeight: 700, margin: "0 0 16px 0" }}>
          Welcome to TitleApp AI
        </h1>
        <p style={{ fontSize: "20px", opacity: 0.95, marginBottom: "40px", lineHeight: 1.5 }}>
          Your AI-powered platform for title, ownership, and business automation
        </p>
        <button
          onClick={() => setStep("idVerify")}
          style={{
            padding: "16px 48px",
            fontSize: "18px",
            fontWeight: 600,
            background: "white",
            color: "#667eea",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          Create Your Account
        </button>
      </div>
    </div>
  );
}
