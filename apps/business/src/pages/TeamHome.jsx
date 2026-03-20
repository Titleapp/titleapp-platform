import React, { useState, useEffect } from "react";
import { TeamCard, AddTeamCard } from "../components/TeamCard";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { padding: "32px 24px", maxWidth: 880, margin: "0 auto" },
  greeting: { marginBottom: 32 },
  greetTitle: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 },
  greetContext: { fontSize: 14, color: "#7c3aed", fontWeight: 500, marginBottom: 4 },
  greetSub: { fontSize: 14, color: "#6b7280" },
  sectionLabel: { fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 },
  grid: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 },
  empty: { textAlign: "center", padding: "64px 24px" },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
};

export default function TeamHome({ onSelectTeam, onAddTeam }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = (() => {
    const cn = localStorage.getItem("COMPANY_NAME") || localStorage.getItem("WORKSPACE_NAME") || "";
    return cn.split(" ")[0] || "";
  })();
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    async function loadTeams() {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_BASE}/api?path=/v1/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok && data.workspaces) {
          setTeams(data.workspaces.map(w => ({
            teamId: w.id,
            name: w.name || w.vertical || "Workspace",
            vertical: w.vertical || "",
            workerCount: (w.activeWorkers || []).length,
            active: true,
            orgName: w.companyName || "",
            lastStatus: "",
            documentCount: 0,
          })));
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
      }
      setLoading(false);
    }
    loadTeams();
  }, []);

  const activeTeamId = localStorage.getItem("WORKSPACE_ID") || "";
  const activeTeam = teams.find(t => t.teamId === activeTeamId);
  const totalWorkers = teams.reduce((sum, t) => sum + (t.workerCount || 0), 0);
  const contextLine = activeTeam
    ? `Last active: ${activeTeam.name}${totalWorkers > 0 ? ` \u2014 ${totalWorkers} worker${totalWorkers !== 1 ? "s" : ""} running` : ""}`
    : "";

  if (loading) {
    return <div style={{ padding: 64, textAlign: "center", color: "#94a3b8" }}>Loading...</div>;
  }

  // Empty state — new user
  if (teams.length === 0) {
    return (
      <div style={S.empty}>
        <div style={S.emptyTitle}>{timeGreeting}{firstName ? ` ${firstName}` : ""}.</div>
        <div style={S.emptySub}>Let's build your first team. What industry are you in?</div>
        <button
          onClick={onAddTeam}
          style={{ padding: "12px 32px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Greeting */}
      <div style={S.greeting}>
        <div style={S.greetTitle}>{timeGreeting}{firstName ? ` ${firstName}` : ""}.</div>
        {contextLine && <div style={S.greetContext}>{contextLine}</div>}
        <div style={S.greetSub}>What are we working on today?</div>
      </div>

      {/* Team grid */}
      <div style={S.sectionLabel}>Your Teams</div>
      <div style={S.grid}>
        {/* Teams from API (Personal Vault is included by backend as first item) */}
        {teams.map(team => (
          <TeamCard
            key={team.teamId}
            team={team}
            isPersonal={team.teamId === "vault"}
            isActive={team.teamId === activeTeamId}
            onClick={() => onSelectTeam && onSelectTeam(team)}
            onMenu={() => {}} // stubbed for now
          />
        ))}

        {/* Add team */}
        <AddTeamCard onClick={onAddTeam} />
      </div>
    </div>
  );
}
