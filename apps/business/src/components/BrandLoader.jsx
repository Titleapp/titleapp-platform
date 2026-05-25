import React, { useEffect, useState } from "react";
import { brand, isSociii } from "../config/brandConfig";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

// 5-state SOCIII loader. The center mark is the canonical parent-child hex
// (purple top blade, green bottom blade — DTC composition per patent 64/073,706).
// State feedback rides on a ring overlay around the mark rather than animating
// the mark itself, so the brand stays legible at every state.

const STATES = ["idle", "connecting", "synchronizing", "processing", "activated"];

const STATE_KEYFRAMES = `
@keyframes brandRingPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
}
@keyframes brandRingRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes spinKey {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

function ParentChildMark({ state, size = 32 }) {
  const palette = brand.palette;
  const primary = palette.primary;             // purple — top blade
  const accentGreen = palette.accentGreen || "#16A34A";  // green — bottom blade
  const accentCyan = palette.accentCyan || "#0686D4";

  const ringConfig = {
    idle:           { color: "transparent", animation: null, strokeWidth: 0 },
    connecting:     { color: accentCyan,    animation: "brandRingPulse 1.4s ease-in-out infinite", strokeWidth: 3 },
    synchronizing:  { color: primary,       animation: "brandRingRotate 2s linear infinite",       strokeWidth: 3 },
    processing:     { color: accentGreen,   animation: "brandRingPulse 0.9s ease-in-out infinite", strokeWidth: 4 },
    activated:      { color: accentGreen,   animation: null,                                       strokeWidth: 3 },
  };

  const cfg = ringConfig[state] || ringConfig.idle;
  const ringSize = size * 1.15;
  const ringOffset = (ringSize - size) / 2;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        lineHeight: 0,
      }}
    >
      {cfg.strokeWidth > 0 && (
        <svg
          width={ringSize}
          height={ringSize}
          viewBox="0 0 100 100"
          fill="none"
          style={{
            position: "absolute",
            top: -ringOffset,
            left: -ringOffset,
            animation: cfg.animation,
            pointerEvents: "none",
          }}
        >
          <circle
            cx="50"
            cy="50"
            r={48}
            stroke={cfg.color}
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={state === "synchronizing" ? "20 12" : undefined}
          />
        </svg>
      )}
      <img
        src={sociiiMarkUrl}
        alt="SOCIII"
        width={size}
        height={size}
        style={{ display: "block", borderRadius: size * 0.18 }}
      />
    </span>
  );
}

function LegacyKey({ size = 32 }) {
  // Retained for ACTIVE_BRAND="titleapp" fallback path.
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
  return <ParentChildMark state={activeState} size={size} />;
}

export { STATES as BRAND_LOADER_STATES };
