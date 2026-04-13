// CODEX 48.4 Fix HH / 48.5 Pass 5 — Shared Creator Studio nav header.
//
// Renders "Creator Studio / TitleApp" for anonymous users. When a real
// (non-anonymous) Firebase user signs in, swaps to a 32px avatar circle
// with their initials plus their display name. Used by both DeveloperSandbox
// and WorkerSandbox so the two surfaces stay visually consistent.

import React from "react";
import { auth as firebaseAuth } from "../../firebase";

export default function CreatorStudioHeader({ isMobile, onClose, accent = "#7c3aed" }) {
  const [user, setUser] = React.useState(() => firebaseAuth?.currentUser || null);
  React.useEffect(() => {
    if (!firebaseAuth) return;
    const unsub = firebaseAuth.onAuthStateChanged?.(u => setUser(u || null));
    return () => unsub?.();
  }, []);
  const isAnon = !user || user?.isAnonymous === true;
  const displayName = !isAnon && (user?.displayName || localStorage.getItem("DISPLAY_NAME") || user?.email?.split("@")[0]);
  const initials = displayName
    ? displayName.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <div style={{
      padding: "16px 16px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    }}>
      {!isAnon && displayName ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            <div style={{ fontSize: 10, color: "rgba(226,232,240,0.55)", marginTop: 1 }}>Creator Studio</div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>Creator Studio</div>
          <div style={{ fontSize: 11, color: "rgba(226,232,240,0.55)", marginTop: 2 }}>TitleApp</div>
        </div>
      )}
      {isMobile && (
        <button onClick={onClose} style={{
          background: "none", border: "none", fontSize: 20,
          color: "rgba(226,232,240,0.55)", cursor: "pointer", padding: 4,
        }}>
          &times;
        </button>
      )}
    </div>
  );
}
