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
import MyVehicles from "./sections/MyVehicles";
import MyProperties from "./sections/MyProperties";
import MyDocuments from "./sections/MyDocuments";
import MyLogbook from "./sections/MyLogbook";
import MyCertifications from "./sections/MyCertifications";
import MyWallet from "./sections/MyWallet";
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
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);

  useEffect(() => {
    // Handle custom token + session handoff from landing page chat
    const urlParams = new URLSearchParams(window.location.search);
    const chatToken = urlParams.get("token");
    const chatSid = urlParams.get("sid");
    const chatTenantId = urlParams.get("tid");

    // Store landing page session ID so FloatingChat can resume it
    if (chatSid) {
      sessionStorage.setItem("ta_platform_sid", chatSid);
    }
    // Store selected tenant ID from landing page workspace selection
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

  function selectAccount(tenantId, tenant) {
    localStorage.setItem("TENANT_ID", tenantId);
    if (tenant) {
      if (tenant.vertical && tenant.vertical !== "GLOBAL") {
        localStorage.setItem("VERTICAL", tenant.vertical.toLowerCase());
      } else {
        // GLOBAL or personal tenant — use consumer nav
        localStorage.setItem("VERTICAL", "consumer");
      }
      if (tenant.jurisdiction && tenant.jurisdiction !== "GLOBAL") {
        localStorage.setItem("JURISDICTION", tenant.jurisdiction);
      }
      if (tenant.companyName || tenant.name) {
        localStorage.setItem("COMPANY_NAME", tenant.companyName || tenant.name);
      }
    }
    setShowAccountPicker(false);
    setNeedsOnboarding(false);
    // Update URL from /login to /dashboard
    if (window.location.pathname === "/login" || window.location.pathname === "/") {
      window.history.replaceState({}, "", "/dashboard");
    }
  }

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
            // Check for pre-selected tenant from landing page workspace selection
            const preselectedTid = sessionStorage.getItem("ta_preselected_tid");
            if (preselectedTid) {
              sessionStorage.removeItem("ta_preselected_tid");
              const match = data.memberships.find((m) => m.tenantId === preselectedTid);
              if (match) {
                selectAccount(match.tenantId, data.tenants?.[match.tenantId]);
                return;
              }
            }

            if (data.memberships.length > 1) {
              // Multiple accounts — show picker
              const accounts = data.memberships.map((mem) => {
                const tenant = data.tenants?.[mem.tenantId] || {};
                return {
                  tenantId: mem.tenantId,
                  role: mem.role,
                  name: tenant.companyName || tenant.name || mem.tenantId,
                  vertical: tenant.vertical || "",
                  jurisdiction: tenant.jurisdiction || "",
                };
              });
              setAvailableAccounts(accounts);
              setShowAccountPicker(true);
            } else {
              const mem = data.memberships[0];
              selectAccount(mem.tenantId, data.tenants?.[mem.tenantId]);
            }
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

  if (showAccountPicker && availableAccounts.length > 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#7c3aed", marginBottom: "8px" }}>
              TitleApp
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>
              Which workspace do you want to open?
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {availableAccounts.map((acct) => (
              <button
                key={acct.tenantId}
                onClick={() => selectAccount(acct.tenantId, { vertical: acct.vertical, jurisdiction: acct.jurisdiction, companyName: acct.name })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "14px 16px",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s",
                  fontSize: "14px",
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                onMouseOut={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b" }}>{acct.name}</div>
                  {acct.vertical && (
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                      {acct.vertical.charAt(0).toUpperCase() + acct.vertical.slice(1)}{acct.role ? ` \u00B7 ${acct.role}` : ""}
                    </div>
                  )}
                </div>
                <div style={{ color: "#9ca3af", fontSize: "18px" }}>&rarr;</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (needsOnboarding === null) {
    // Still checking memberships — show loading
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
