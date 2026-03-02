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
import { auth } from "./firebase";
import { signInWithCustomToken } from "firebase/auth";

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

  // ── Workers: live worker → auth required, auto-open chat ──
  if (isLiveWorker) {
    sessionStorage.setItem("ta_auto_worker", workerSlug);
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
