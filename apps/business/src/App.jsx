import React, { useEffect, useState } from "react";
import "./App.css";
import Login from "./auth/login";
import AppShell from "./components/AppShell";
import Dashboard from "./sections/Dashboard";
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

  function renderSection() {
    switch (currentSection) {
      case "dashboard":
        return <Dashboard />;
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

  return (
    <AppShell currentSection={currentSection} onNavigate={setCurrentSection}>
      {renderSection()}
    </AppShell>
  );
}

export default function App() {
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ID_TOKEN") : null
  );

  useEffect(() => {
    const t = localStorage.getItem("ID_TOKEN");
    setToken(t);

    const onStorage = (e) => {
      if (e.key === "ID_TOKEN") setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!token) return <Login />;
  return <AdminShell />;
}
