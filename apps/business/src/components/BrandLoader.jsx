import React, { useEffect, useState } from "react";
import { brand, isSociii } from "../config/brandConfig";

// 5-state SOCIII loader matching the brand-board geoscape system.
// States cycle automatically when `state` prop is "auto" (default).
// Pass an explicit state to lock to one frame.

const STATES = ["idle", "connecting", "synchronizing", "processing", "activated"];

const STATE_KEYFRAMES = `
@keyframes geoscapePulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
@keyframes geoscapeRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes spinKey {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

function Geoscape({ state, size = 32 }) {
  const palette = brand.palette;
  const primary = palette.primary;
  const accent = palette.accent;
  const magenta = palette.magenta || "#EC4899";

  // S-mark geometric path drawn from the brand-board: two interlocking arrows
  // forming a stylized S. The accent dots/strokes change per state.
  const baseStroke = primary;

  const stateConfig = {
    idle: { dotFill: "none", strokeWidth: 12, animation: null, accentOpacity: 0 },
    connecting: { dotFill: accent, strokeWidth: 12, animation: "geoscapePulse 1.4s ease-in-out infinite", accentOpacity: 0.9 },
    synchronizing: { dotFill: primary, strokeWidth: 12, animation: "geoscapeRotate 2s linear infinite", accentOpacity: 0.7 },
    processing: { dotFill: magenta, strokeWidth: 14, animation: "geoscapePulse 0.9s ease-in-out infinite", accentOpacity: 1 },
    activated: { dotFill: primary, strokeWidth: 14, animation: null, accentOpacity: 1 },
  };

  const cfg = stateConfig[state] || stateConfig.idle;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      style={{ animation: cfg.animation }}
    >
      {/* Stylized S — two arrow-blades curving in opposite directions */}
      <path
        d="M 50 60 Q 50 30, 100 30 L 140 30 L 140 55 L 110 55 Q 90 55, 90 75 Q 90 95, 110 95 L 130 95 Q 160 95, 160 130 Q 160 165, 120 165 L 60 165 L 60 140 L 100 140 Q 130 140, 130 125 Q 130 110, 110 110 L 80 110 Q 50 110, 50 80 Z"
        stroke={baseStroke}
        strokeWidth={cfg.strokeWidth}
        strokeLinejoin="round"
        fill={state === "activated" ? primary : "none"}
        opacity={state === "activated" ? 0.9 : 1}
      />
      {/* Accent dot — varies per state */}
      <circle cx="160" cy="40" r="12" fill={cfg.dotFill} opacity={cfg.accentOpacity} />
      <circle cx="40" cy="160" r="12" fill={cfg.dotFill} opacity={cfg.accentOpacity * 0.7} />
    </svg>
  );
}

function LegacyKey({ size = 32 }) {
  // The current TitleApp spinning key — kept for ACTIVE_BRAND="titleapp".
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      style={{ animation: "spinKey 1.5s ease-in-out infinite" }}
    >
      <circle cx="70" cy="100" r="40" stroke="#7c3aed" strokeWidth="18" fill="none" />
      <rect x="105" y="92" width="70" height="16" fill="#7c3aed" />
      <rect x="155" y="92" width="8" height="28" fill="#7c3aed" />
      <rect x="140" y="92" width="8" height="22" fill="#7c3aed" />
    </svg>
  );
}

export default function BrandLoader({ state = "auto", size = 32 }) {
  const [autoState, setAutoState] = useState(STATES[0]);

  useEffect(() => {
    if (state !== "auto") return;
    // Inject keyframes once
    if (!document.getElementById("brandLoaderKeyframes")) {
      const style = document.createElement("style");
      style.id = "brandLoaderKeyframes";
      style.textContent = STATE_KEYFRAMES;
      document.head.appendChild(style);
    }
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % STATES.length;
      setAutoState(STATES[i]);
    }, 900);
    return () => clearInterval(interval);
  }, [state]);

  if (!isSociii()) {
    return <LegacyKey size={size} />;
  }

  const activeState = state === "auto" ? autoState : state;
  return <Geoscape state={activeState} size={size} />;
}

export { STATES as BRAND_LOADER_STATES };
