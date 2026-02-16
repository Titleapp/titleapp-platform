import React, { useState } from "react";
import InvestmentCriteriaStep from "./InvestmentCriteriaStep";
import SampleDealsStep from "./SampleDealsStep";
import DealershipDataStep from "./DealershipDataStep";
import RealEstateDataStep from "./RealEstateDataStep";
import TermsAndConditions from "./TermsAndConditions";

interface OnboardingProps {
  onComplete: (tenantId: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"terms" | "welcome" | "details" | "criteria" | "sampleDeals" | "dealerData" | "realEstateData" | "magic">("terms");
  const [companyName, setCompanyName] = useState("");
  const [vertical, setVertical] = useState("auto");
  const [jurisdiction, setJurisdiction] = useState("IL");
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleDetailsNext() {
    if (!companyName.trim()) {
      setError("Please enter your company name");
      return;
    }

    // Show vertical-specific onboarding
    if (vertical === "analyst") {
      setStep("criteria");
    } else if (vertical === "auto") {
      setStep("dealerData");
    } else if (vertical === "real-estate") {
      setStep("realEstateData");
    } else {
      // Other verticals - create account immediately
      handleCreate(null);
    }
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

      // Store tenant ID
      localStorage.setItem("TENANT_ID", data.tenantId);

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

  if (step === "criteria") {
    return (
      <div
        style={{
          minHeight: "100vh",
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
          minHeight: "100vh",
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
            onComplete={() => handleCreate(riskProfile)}
            onSkip={() => handleCreate(riskProfile)}
          />
        </div>
      </div>
    );
  }

  if (step === "dealerData") {
    return (
      <div
        style={{
          minHeight: "100vh",
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
            onComplete={() => handleCreate(null)}
            onSkip={() => handleCreate(null)}
          />
        </div>
      </div>
    );
  }

  if (step === "realEstateData") {
    return (
      <div
        style={{
          minHeight: "100vh",
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

  if (step === "magic") {
    return (
      <div
        style={{
          minHeight: "100vh",
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
          }}
        >
          <div style={{ fontSize: "80px", marginBottom: "24px", animation: "bounce 1s infinite" }}>
            ✨
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 16px 0" }}>
            Welcome to TitleApp AI!
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.9 }}>
            Your AI-powered business platform is ready
          </p>
        </div>
        <style>{`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div
        style={{
          minHeight: "100vh",
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
                placeholder="Acme Auto Dealership"
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
                  if (e.key === "Enter") handleCreate();
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
                <option value="real-estate">Real Estate</option>
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
              {loading ? "Creating your account..." : vertical === "analyst" ? "Next: Set Investment Criteria →" : "Get Started →"}
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
        minHeight: "100vh",
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
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🚀</div>
        <h1 style={{ fontSize: "40px", fontWeight: 700, margin: "0 0 16px 0" }}>
          Welcome to TitleApp AI
        </h1>
        <p style={{ fontSize: "20px", opacity: 0.95, marginBottom: "40px", lineHeight: 1.5 }}>
          Your AI-powered platform for title, ownership, and business automation
        </p>
        <button
          onClick={() => setStep("details")}
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
