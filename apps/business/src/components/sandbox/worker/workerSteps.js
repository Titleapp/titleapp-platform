// CODEX 47.4 Phase B (T2) — Worker step config (frontend mirror of backend).
//
// Source of truth lives in functions/services/sandbox/workerBuildFlow.js.
// This file must stay in sync — when adding a step, update both.

// CODEX 48.5 — Grow step renamed to "Grow & Update" per product direction.
// Canonical user-facing labels for the 9-step worker pipeline.
export const WORKER_STEPS = [
  { id: "define",     order: 1, label: "Define",        nobodyElse: false },
  { id: "design",     order: 2, label: "Design",        nobodyElse: false },
  { id: "knowledge",  order: 3, label: "Knowledge",     nobodyElse: true  },
  { id: "rules",      order: 4, label: "Rules",         nobodyElse: false },
  { id: "tools",      order: 5, label: "Tools",         nobodyElse: false },
  { id: "test",       order: 6, label: "Test",          nobodyElse: true  },
  { id: "preflight",  order: 7, label: "Preflight",     nobodyElse: false },
  { id: "distribute", order: 8, label: "Distribute",    nobodyElse: false },
  { id: "grow",       order: 9, label: "Grow & Update", nobodyElse: true  },
];

export const STEP_BY_ID = Object.fromEntries(WORKER_STEPS.map(s => [s.id, s]));

export const PURPLE = "#6B46C1";

// Map backend status (not_started/in_progress/complete) to StepStatusBar
// state strings (cold/warm/hot).
export function statusToBarState(status) {
  if (status === "complete")    return "hot";
  if (status === "in_progress") return "warm";
  return "cold";
}

// Build the props array StepStatusBar expects, given the workerSteps map
// returned by the backend.
//
// CODEX 48.5 — Ratchet state forward. Once Define is complete, every
// downstream step that is still "cold" (not_started) becomes "idle" —
// silver, clickable, peekable. This mirrors the game sandbox's post-concept
// behavior and lets creators jump to Rules / Tools / Preflight etc. to see
// what's there without being gated linearly.
export function buildBarSteps(workerStepsMap = {}) {
  const defineDone = workerStepsMap.define?.status === "complete";
  return WORKER_STEPS.map(s => {
    const raw = statusToBarState(workerStepsMap[s.id]?.status);
    // Define itself is never idle — it's the gate
    if (s.id === "define") return { id: s.id, label: s.label, state: raw };
    // After Define is complete, cold → idle
    if (raw === "cold" && defineDone) return { id: s.id, label: s.label, state: "idle" };
    return { id: s.id, label: s.label, state: raw };
  });
}

// 10 UX types for the Design step (CODEX 47.4 Part 6).
export const UX_TYPES = [
  { id: "dashboard",   label: "Dashboard",        primary: "KPI tiles, charts, numbers",       best: "Data-heavy, monitoring, reporting" },
  { id: "checklist",   label: "Checklist",        primary: "Task list, completion gates",      best: "Process-driven, compliance, audit" },
  { id: "wizard",      label: "Flow / Wizard",    primary: "One step at a time, guided",       best: "Sequential high-stakes decisions" },
  { id: "document",    label: "Document",         primary: "Output-first, generates artifacts",best: "Content creation, reporting, grading" },
  { id: "conversation",label: "Conversation",     primary: "Chat-first, minimal chrome",       best: "Advisory, coaching, on-demand expertise" },
  { id: "map",         label: "Map",              primary: "Spatial, geographic",              best: "Field work, physical locations" },
  { id: "calendar",    label: "Calendar",         primary: "Time-based, appointments",         best: "Scheduling, booking, shift management" },
  { id: "course",      label: "Course / Learning",primary: "Modules, progress, assessments",   best: "Structured learning, certification" },
  { id: "reference",   label: "Reference",        primary: "Searchable library, fast lookup",  best: "Always-on, quick answers, field reference" },
  { id: "custom",      label: "Custom",           primary: "Creator-defined layout",           best: "Anything that does not fit above" },
];

// 4 RAAS tiers for the Rules step.
export const RAAS_TIERS = [
  { id: "tier0", label: "Tier 0 — Style",    color: "#94A3B8", description: "Tone, format, voice" },
  { id: "tier1", label: "Tier 1 — Always",   color: "#DC2626", description: "Behaviors that must always happen" },
  { id: "tier2", label: "Tier 2 — Never",    color: "#EAB308", description: "Behaviors that must never happen" },
  { id: "tier3", label: "Tier 3 — Escalate", color: "#16A34A", description: "When to escalate to a human" },
];
