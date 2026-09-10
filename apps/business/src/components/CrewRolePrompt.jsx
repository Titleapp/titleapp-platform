import React, { useState } from "react";
import CrewRoleChooser from "./CrewRoleChooser";
import { CREW_ROLE_TO_WORKER_SLUG } from "../utils/crewRole";

// S52.71 Step 1 — first-run "who are you" question. Rendered as a sibling of
// AdminShell (not inside it), so it can't assume WorkerStateContext is
// reachable via useWorkerState() — this codebase already has a documented,
// working pattern for exactly that situation (see App.jsx's AdminShell
// comment on WorkerSelectListener): dispatch "ta:select-worker" on
// `window` and let the listeners already mounted inside the provider (and
// inside AdminShell itself, which flips currentSection) do the real work.
//
// Answering here persists the tenant-wide default (POST /v1/me:setCrewRole)
// AND switches the current session immediately — it does not require a
// reload. This is deliberately QuickSwitcher.jsx's scrim+card structure, not
// OnboardingWizard's full wizard chrome: this is one question, not a flow.
export default function CrewRolePrompt({ tenantId, onDone }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSelect(role) {
    if (submitting) return;
    setSubmitting(true);
    const slug = CREW_ROLE_TO_WORKER_SLUG[role];
    window.dispatchEvent(new CustomEvent("ta:select-worker", { detail: { slug } }));
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      await fetch(`${apiBase}/api?path=/v1/me:setCrewRole`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ tenantId, crewRole: role }),
      });
    } catch { /* session already switched above — a failed save just means we ask again next launch */ }
    onDone();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
      zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: 460, maxWidth: "90vw", background: "white", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 24,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Welcome to Skye</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Are you a pilot, maintenance tech, or dispatch team member?</div>
        <CrewRoleChooser selected={null} onSelect={handleSelect} />
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 14 }}>You can switch roles anytime from the sidebar.</div>
      </div>
    </div>
  );
}
