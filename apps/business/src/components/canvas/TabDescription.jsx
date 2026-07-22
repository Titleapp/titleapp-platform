import React, { useState, useEffect } from "react";

/**
 * TabDescription — dismissible blurb shown below the tab bar when a tab has
 * a `description` field. Dismissed state persists for the session via
 * sessionStorage, keyed by slug + tabId so each tab/worker combo remembers
 * independently. Reset on new session (browser close).
 */
export default function TabDescription({ slug, tabId, description }) {
  const key = `ta_tab_desc_${slug}_${tabId}`;
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(key) === "1");

  useEffect(() => {
    setDismissed(sessionStorage.getItem(key) === "1");
  }, [key]);

  if (!description || dismissed) return null;

  return (
    <div style={{
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 14,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    }}>
      <div style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.55, flex: 1 }}>
        {description}
      </div>
      <button
        onClick={() => { sessionStorage.setItem(key, "1"); setDismissed(true); }}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#93c5fd",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          marginTop: 1,
          fontFamily: "inherit",
        }}
      >
        Got it
      </button>
    </div>
  );
}
