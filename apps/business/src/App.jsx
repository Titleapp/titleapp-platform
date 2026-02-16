import React, { useEffect, useState } from "react";
import "./App.css";
import Login from "./auth/login";
import Onboarding from "./components/Onboarding";
import OnboardingTour from "./components/OnboardingTour";
import AppShell from "./components/AppShell";
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

function AdminShell() {
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Show tour after a brief delay to let dashboard load
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenTour) {
      setTimeout(() => setShowTour(true), 500);
    }
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
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }

  const vertical = localStorage.getItem("VERTICAL") || "auto";

  return (
    <>
      <AppShell currentSection={currentSection} onNavigate={setCurrentSection}>
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
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ID_TOKEN") : null
  );
  const [needsOnboarding, setNeedsOnboarding] = useState(null); // null = checking, true = needs, false = has account
  const [checkingMemberships, setCheckingMemberships] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("ID_TOKEN");
    setToken(t);

    const onStorage = (e) => {
      if (e.key === "ID_TOKEN") setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!token) {
      setCheckingMemberships(false);
      return;
    }

    // Check if user has any memberships
    async function checkMemberships() {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
        const response = await fetch(`${apiBase}/api?path=/v1/me:memberships`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.ok && data.memberships) {
          if (data.memberships.length === 0) {
            setNeedsOnboarding(true);
          } else {
            // Has memberships - ensure TENANT_ID is set
            const currentTenantId = localStorage.getItem("TENANT_ID");
            if (!currentTenantId || currentTenantId === "demo") {
              localStorage.setItem("TENANT_ID", data.memberships[0].tenantId);
            }
            setNeedsOnboarding(false);
          }
        } else {
          // API error - assume needs onboarding
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error("Failed to check memberships:", err);
        // On error, assume needs onboarding
        setNeedsOnboarding(true);
      } finally {
        setCheckingMemberships(false);
      }
    }

    checkMemberships();
  }, [token]);

  if (!token) return <Login />;
  if (checkingMemberships) {
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
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
          <div style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</div>
        </div>
      </div>
    );
  }
  if (needsOnboarding) {
    return <Onboarding onComplete={() => setNeedsOnboarding(false)} />;
  }
  return <AdminShell />;
}
