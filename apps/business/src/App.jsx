import React, { useEffect, useState } from "react";
import "./App.css";
import Login from "./auth/login";
import Onboarding from "./components/Onboarding";
import OnboardingTour from "./components/OnboardingTour";
import AppShell from "./components/AppShell";
import ChatPanel from "./components/ChatPanel";
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
import { auth } from "./firebase";
import { signInWithCustomToken } from "firebase/auth";

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
  const [handoffInProgress, setHandoffInProgress] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get("token");
  });

  useEffect(() => {
    // Handle custom token + session handoff from landing page chat
    const urlParams = new URLSearchParams(window.location.search);
    const chatToken = urlParams.get("token");
    const chatSid = urlParams.get("sid");

    // Store landing page session ID so FloatingChat can resume it
    if (chatSid) {
      sessionStorage.setItem("ta_platform_sid", chatSid);
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

  useEffect(() => {
    if (!token || handoffInProgress) {
      if (!handoffInProgress) setCheckingMemberships(false);
      return;
    }

    async function checkMemberships() {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
        const response = await fetch(`${apiBase}/api?path=/v1/me:memberships`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("ID_TOKEN");
          localStorage.removeItem("TENANT_ID");
          setToken(null);
          return;
        }

        const data = await response.json();

        if (data.ok && data.memberships) {
          if (data.memberships.length === 0) {
            setNeedsOnboarding(true);
          } else {
            const currentTenantId = localStorage.getItem("TENANT_ID");
            if (!currentTenantId || currentTenantId === "demo") {
              localStorage.setItem("TENANT_ID", data.memberships[0].tenantId);
            }
            setNeedsOnboarding(false);
          }
        } else {
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error("Failed to check memberships:", err);
        setNeedsOnboarding(true);
      } finally {
        setCheckingMemberships(false);
      }
    }

    checkMemberships();
  }, [token, handoffInProgress]);

  if (handoffInProgress || checkingMemberships) {
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
  if (!token) return <Login />;
  const [onboardingStep, setOnboardingStep] = useState(null);

  if (needsOnboarding) {
    return (
      <div className="appShell" style={{ minHeight: "100vh" }}>
        <div className="dualPanel" style={{ minHeight: "100vh" }}>
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
            <Onboarding
              onComplete={() => setNeedsOnboarding(false)}
              onStepChange={setOnboardingStep}
            />
          </div>
          <aside className="chatSidebar">
            <ChatPanel currentSection="onboarding" onboardingStep={onboardingStep} />
          </aside>
        </div>
      </div>
    );
  }
  return <AdminShell />;
}
