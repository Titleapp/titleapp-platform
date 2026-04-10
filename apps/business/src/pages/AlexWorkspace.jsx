import React, { useState, useEffect } from "react";
import ChatPanel from "../components/ChatPanel";
import AlexVerticalSwitcher, { getVerticalsFromWorkers } from "../components/AlexVerticalSwitcher";
import AlexWorkspacePanel from "../components/AlexWorkspacePanel";

export default function AlexWorkspace() {
  const [focusedVertical, setFocusedVertical] = useState(null);
  const [activeOutput, setActiveOutput] = useState(null);
  const [contextStack, setContextStack] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("ALEX_CONTEXT_STACK") || "[]"); }
    catch { return []; }
  });

  // Derive verticals from workspace's active workers
  const [verticals, setVerticals] = useState([]);
  useEffect(() => {
    try {
      const ws = JSON.parse(localStorage.getItem("CURRENT_WORKSPACE") || "{}");
      const workers = ws.activeWorkers || [];
      setVerticals(getVerticalsFromWorkers(workers));
    } catch {
      setVerticals([]);
    }
  }, []);

  // Morning brief — first session of the day
  const [briefRequested, setBriefRequested] = useState(false);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastBrief = sessionStorage.getItem("ALEX_BRIEF_DATE");
    if (lastBrief !== today) {
      setBriefRequested(true);
      sessionStorage.setItem("ALEX_BRIEF_DATE", today);
    }
  }, []);

  // Context stack management
  function handleVerticalFocus(verticalName) {
    if (verticalName && verticalName !== focusedVertical) {
      setContextStack(prev => {
        const next = [...prev, verticalName].slice(-5);
        sessionStorage.setItem("ALEX_CONTEXT_STACK", JSON.stringify(next));
        return next;
      });
    }
    setFocusedVertical(verticalName);
    setActiveOutput(null);

    // Dispatch event so ChatPanel can include vertical focus in context
    window.dispatchEvent(new CustomEvent("ta:alex-vertical-focus", {
      detail: { vertical: verticalName },
    }));
  }

  // Listen for output events from ChatPanel
  useEffect(() => {
    function handleShowOutput(e) {
      if (e.detail?.output) setActiveOutput(e.detail.output);
    }
    window.addEventListener("ta:alex-show-output", handleShowOutput);
    return () => window.removeEventListener("ta:alex-show-output", handleShowOutput);
  }, []);

  // Build current section string for ChatPanel context
  const currentSection = focusedVertical
    ? `alex-${focusedVertical.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    : "alex-all-verticals";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fafbfc" }}>
      {/* Column 1: Vertical Switcher */}
      <AlexVerticalSwitcher
        verticals={verticals}
        focusedVertical={focusedVertical}
        onFocus={handleVerticalFocus}
      />

      {/* Column 2: Chat */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <ChatPanel
          currentSection={currentSection}
          alexContext={{
            surface: "chief-of-staff",
            focusedVertical,
            contextStack,
            requestBrief: briefRequested,
            verticals: verticals.map(v => v.name),
          }}
        />
      </div>

      {/* Column 3: Workspace Panel */}
      <div style={{ width: 380, minWidth: 300, borderLeft: "1px solid #e2e8f0", overflow: "auto" }}>
        <AlexWorkspacePanel
          verticals={verticals}
          focusedVertical={focusedVertical}
          activeOutput={activeOutput}
        />
      </div>
    </div>
  );
}
