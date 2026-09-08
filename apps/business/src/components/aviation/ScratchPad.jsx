/**
 * ScratchPad.jsx — ForeFlight-style blank notepad: replaces pen and paper
 * for a clearance readback, a squawk code, a frequency. Self-contained
 * (owns its own open/close state) so the exact same component drops into
 * multiple screens — the pilot cockpit (CockpitView) and the shared
 * Copilot/MX/Dispatch operator canvas (AviationWorkerCanvas) — as one
 * button each, all reading/writing the same localStorage note so it
 * doesn't reset or hide when switching between those views.
 */
import React, { useState } from "react";
import DrawingCanvas from "../canvas/DrawingCanvas";

export const SCRATCHPAD_STORAGE_KEY = "sociii_aviation_scratchpad_v1";

export default function ScratchPad({ storageKey = SCRATCHPAD_STORAGE_KEY }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Scratch Pad — handwritten notes"
        aria-label="Open Scratch Pad"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", fontSize: 12.5, fontWeight: 700,
          borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#fff",
          color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden="true">📝</span> Scratch Pad
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scratch Pad"
          style={{
            position: "fixed", inset: 0, zIndex: 4000,
            background: "rgba(15,23,42,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            width: "min(720px, 100%)", height: "min(560px, 100%)",
            background: "#fff", borderRadius: 12, overflow: "hidden",
            display: "flex", flexDirection: "column",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderBottom: "1px solid #e2e8f0",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Scratch Pad</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Scratch Pad"
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <DrawingCanvas storageKey={storageKey} />
          </div>
        </div>
      )}
    </>
  );
}
