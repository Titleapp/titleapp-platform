import React, { useEffect, useState } from "react";
import "./App.css";
import Login from "./auth/login";
import Onboarding from "./components/Onboarding";
import VaultOnboarding from "./pages/VaultOnboarding";
import OnboardingTour from "./components/OnboardingTour";
import AppShell from "./components/AppShell";
import Dashboard from "./sections/Dashboard";
import MyStuff from "./sections/MyStuff";
import MyLogbooks from "./sections/MyLogbooks";
import StudentRecords from "./sections/StudentRecords";
import PilotRecords from "./sections/PilotRecords";
import MyGPTs from "./sections/MyGPTs";
import Reports from "./sections/Reports";
import Escrow from "./sections/Escrow";
import Wallet from "./sections/Wallet";
import Profile from "./sections/Profile";
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
      case "my-stuff":
        return <MyStuff />;
      case "my-logbooks":
        return <MyLogbooks />;
      case "student-records":
        return <StudentRecords />;
      case "pilot-records":
        return <PilotRecords />;
      case "my-gpts":
        return <MyGPTs />;
      case "reports":
        return <Reports />;
      case "escrow":
        return <Escrow />;
      case "wallet":
        return <Wallet />;
      case "profile":
        return <Profile />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <>
      <AppShell currentSection={currentSection} onNavigate={setCurrentSection}>
        {renderSection()}
      </AppShell>
      {showTour && (
        <OnboardingTour onComplete={() => setShowTour(false)} />
      )}
    </>
  );
}

// Route /vault/onboarding and /biz/onboarding based on URL path
function AppRouter() {
  const path = window.location.pathname;

  if (path === "/vault/onboarding") {
    return <VaultOnboarding />;
  }

  if (path.startsWith("/biz/onboarding")) {
    // Biz onboarding not yet built — show placeholder
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "2rem" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#7c3aed", marginBottom: "1rem" }}>TitleApp</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>Business onboarding</h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Business onboarding is coming soon. Contact us to get started.</p>
          <a href="/" style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Back to home</a>
        </div>
      </div>
    );
  }

  // /signup router — redirect based on type param
  if (path === "/signup") {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "business" || type === "dealer" || type === "compliance") {
      const focus = type === "compliance" ? "?focus=compliance" : "";
      window.location.href = `/biz/onboarding${focus}`;
      return null;
    }
    window.location.href = "/vault/onboarding";
    return null;
  }

  return <App />;
}

export { AppRouter };

export default function App() {
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ID_TOKEN") : null
  );
  const [needsOnboarding, setNeedsOnboarding] = useState(null); // null = checking, true = needs, false = has account
  const [checkingMemberships, setCheckingMemberships] = useState(true);

  useEffect(() => {
    // Handle custom token handoff from landing page chat
    const urlParams = new URLSearchParams(window.location.search);
    const chatToken = urlParams.get("token");
    if (chatToken) {
      signInWithCustomToken(auth, chatToken)
        .then(() => {
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch((err) => {
          console.error("Custom token sign-in failed:", err);
        });
    }

    const t = localStorage.getItem("ID_TOKEN");
    setToken(t);

    const onStorage = (e) => {
      if (e.key === "ID_TOKEN") setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);

    // Listen to Firebase auth state changes and refresh token
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const freshToken = await user.getIdToken(true); // Force refresh
          localStorage.setItem("ID_TOKEN", freshToken);
          setToken(freshToken);
          console.log("✅ Token refreshed:", freshToken.substring(0, 20) + "...");
        } catch (err) {
          console.error("❌ Failed to refresh token:", err);
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
    if (!token) {
      setCheckingMemberships(false);
      return;
    }

    // Check if user has any memberships
    async function checkMemberships() {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
        console.log("🔍 Checking memberships with token:", token.substring(0, 20) + "...");
        const response = await fetch(`${apiBase}/api?path=/v1/me:memberships`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("📥 Memberships response:", response.status, response.statusText);
        const data = await response.json();
        console.log("📦 Memberships data:", data);

        // If we get 401, the token is invalid - force re-login
        if (response.status === 401) {
          console.error("❌ Token is invalid - forcing re-login");
          localStorage.removeItem("ID_TOKEN");
          localStorage.removeItem("TENANT_ID");
          setToken(null);
          return;
        }

        if (data.ok && data.memberships) {
          if (data.memberships.length === 0) {
            console.log("✅ User has no memberships - needs onboarding");
            setNeedsOnboarding(true);
          } else {
            // Has memberships - ensure TENANT_ID is set
            console.log("✅ User has memberships:", data.memberships.length);
            const currentTenantId = localStorage.getItem("TENANT_ID");
            if (!currentTenantId || currentTenantId === "demo") {
              localStorage.setItem("TENANT_ID", data.memberships[0].tenantId);
            }
            setNeedsOnboarding(false);
          }
        } else {
          // API error - assume needs onboarding
          console.warn("⚠️ Memberships check returned error, assuming needs onboarding");
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error("❌ Failed to check memberships:", err);
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
