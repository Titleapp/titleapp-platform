import React, { useEffect, useState } from "react";
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
import { auth } from "./firebase";
import { signInWithCustomToken } from "firebase/auth";

function AdminShell({ onBackToHub }) {
  const [currentSection, setCurrentSection] = useState("dashboard");
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
      default:
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

  useEffect(() => {
    // Handle custom token + session handoff from landing page chat
    const urlParams = new URLSearchParams(window.location.search);
    const chatToken = urlParams.get("token");
    const chatSid = urlParams.get("sid");
    const chatTenantId = urlParams.get("tid");

    if (chatSid) {
      sessionStorage.setItem("ta_platform_sid", chatSid);
    }
    if (chatTenantId) {
      sessionStorage.setItem("ta_preselected_tid", chatTenantId);
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

  // After auth resolves, decide where to go
  useEffect(() => {
    if (!token || handoffInProgress) {
      if (!handoffInProgress) setCurrentView("login");
      return;
    }

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
                  setCurrentView("app");
                  return;
                }
              }
            } catch (e) {
              console.error("Auto-workspace from discovery failed:", e);
            }
          }
          setCurrentView("onboarding");
        } else {
          setCurrentView("hub");
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
    const shouldOnboard = workspace._needsOnboarding === true || workspace.onboardingComplete === false;
    setNeedsOnboarding(shouldOnboard);
    setCurrentView("app");
    if (window.location.pathname === "/login" || window.location.pathname === "/") {
      window.history.replaceState({}, "", "/dashboard");
    }
  }

  function handleBackToHub() {
    setCurrentView("hub");
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
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
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
            <OnboardingWizard
              onComplete={() => setCurrentView("hub")}
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

  if (currentView === "hub") {
    return (
      <WorkspaceHub
        userName={userName}
        onLaunch={handleWorkspaceLaunch}
        onBuilderStart={() => setCurrentView("builder-interview")}
      />
    );
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
    const onboardingVertical = localStorage.getItem("VERTICAL") || "auto";
    return (
      <div className="appShell" style={{ minHeight: "100vh" }}>
        <div className="dualPanel" style={{ minHeight: "100vh" }}>
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
            <OnboardingWizard
              vertical={onboardingVertical}
              skipToStep={2}
              onComplete={() => {
                localStorage.setItem("ONBOARDING_COMPLETE", "true");
                setNeedsOnboarding(false);
              }}
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

  return <AdminShell onBackToHub={handleBackToHub} />;
}
