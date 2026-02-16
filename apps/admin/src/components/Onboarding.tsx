import React, { useState } from "react";
import PilotOnboardingStep from "./PilotOnboardingStep";
import TermsAndConditions from "./TermsAndConditions";

interface OnboardingProps {
  onComplete: (tenantId: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"terms" | "welcome" | "details" | "whatToAdd" | "pilot" | "magic">("terms");
  const [displayName, setDisplayName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      console.log("🔐 Creating vault with token:", token ? token.substring(0, 20) + "..." : "MISSING");
      console.log("📡 API endpoint:", `${apiBase}/api?path=/v1/onboarding:claimTenant`);

      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(`${apiBase}/api?path=/v1/onboarding:claimTenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantName: displayName,
          tenantType: "personal",
          vertical: "GLOBAL",
          jurisdiction: "GLOBAL",
        }),
      });

      console.log("📥 Response status:", response.status, response.statusText);

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (!response.ok || !data.ok) {
        const errorMsg = data.error || data.reason || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      // Store tenant ID
      localStorage.setItem("TENANT_ID", data.tenantId);
      setTenantId(data.tenantId);

      // Show "what to add" step
      setStep("whatToAdd");
      setLoading(false);
    } catch (err: any) {
      console.error("❌ Vault creation failed:", err);
      setError(err?.message || String(err));
      setLoading(false);
    }
  }

  async function handlePilotSetup(pilotData: any) {
    // Store pilot data for DTC creation
    localStorage.setItem("PILOT_ONBOARDING_DATA", JSON.stringify(pilotData));

    // Show magic moment
    setStep("magic");

    // Complete after animation
    setTimeout(() => {
      onComplete(tenantId);
    }, 2500);
  }

  function skipToComplete() {
    setStep("magic");
    setTimeout(() => {
      onComplete(tenantId);
    }, 2500);
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

  if (step === "whatToAdd") {
    const categories = [
      {
        icon: "🏠",
        title: "Real Estate",
        description: "Property titles, deeds, and ownership records",
        action: skipToComplete,
      },
      {
        icon: "🚗",
        title: "Vehicles",
        description: "Car titles, registration, and maintenance logbooks",
        action: skipToComplete,
      },
      {
        icon: "💎",
        title: "Valuables & Jewelry",
        description: "Certificates, appraisals, and authentication",
        action: skipToComplete,
      },
      {
        icon: "🎓",
        title: "Student Records",
        description: "Diplomas, transcripts, and educational credentials",
        action: skipToComplete,
      },
      {
        icon: "📜",
        title: "Professional Certifications",
        description: "Licenses, certificates, pilot credentials, etc.",
        action: () => setStep("pilot"),
      },
      {
        icon: "🐾",
        title: "Pet Records",
        description: "Vaccination records, pedigrees, and vet history",
        action: skipToComplete,
      },
      {
        icon: "📦",
        title: "Start with empty vault",
        description: "I'll add items later",
        action: skipToComplete,
      },
    ];

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
            maxWidth: "700px",
            padding: "40px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
              What would you like to add first?
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              You can add more items later from your vault
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={cat.action}
                style={{
                  padding: "20px",
                  textAlign: "left",
                  background: "white",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {cat.icon} {cat.title}
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  {cat.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "pilot") {
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
          <PilotOnboardingStep
            onComplete={handlePilotSetup}
            onSkip={skipToComplete}
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
            🎉
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 16px 0" }}>
            Welcome, {displayName}!
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.9 }}>
            Your personal vault is ready
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
              Create your vault
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
              Your personal digital vault for assets, credentials, and records
            </p>
          </div>

          <div style={{ display: "grid", gap: "24px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Your Name *</div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Smith"
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

            <div
              style={{
                padding: "16px",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>What you'll get:</div>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                <li>Digital Title Certificates (DTCs) for your assets</li>
                <li>Logbooks to track history and updates</li>
                <li>Secure document storage</li>
                <li>AI-powered assistance</li>
              </ul>
            </div>

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
              onClick={handleCreate}
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
              {loading ? "Creating your vault..." : "Create My Vault →"}
            </button>

            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", margin: 0 }}>
              You can add assets and documents later
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
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🔐</div>
        <h1 style={{ fontSize: "40px", fontWeight: 700, margin: "0 0 16px 0" }}>
          Welcome to Your Vault
        </h1>
        <p style={{ fontSize: "20px", opacity: 0.95, marginBottom: "40px", lineHeight: 1.5 }}>
          Secure storage for your digital titles, assets, credentials, and important records
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
          Get Started
        </button>
      </div>
    </div>
  );
}
