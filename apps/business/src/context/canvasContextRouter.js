// Canvas Context Router — pure decision function for what the right-panel
// canvas should show given the current workspace, route, active worker, and
// any in-flight summons payload.
//
// Substrate primitive: one canonical decision so call sites (CreatorJourney,
// WorkspaceShell, ChatPanel, RightPanelContext) don't drift into divergent
// rules. Pair with RightPanelContext — this function decides the MODE; the
// context applies it (setState + setCanvasData).
//
// Modes:
//   "summons"               — fresh canvasRenders payload from ChatPanel/AI;
//                             show it immediately, push prevState
//   "worker-default"        — a worker is active; show its default canvas tab
//   "creator-journey-steps" — /creators/journey, no active worker, no summons;
//                             show the 5-step authoring strip
//   "workspace-home"        — inside a workspace, no active worker, no summons;
//                             show the workspace landing tiles
//   "empty"                 — none of the above; render nothing (STATE-1)

/**
 * @typedef {Object} CanvasRouteInputs
 * @property {{id?: string}|null} [workspace]
 * @property {string} route                       // e.g. "/creators/journey"
 * @property {string|null} [activeWorkerId]
 * @property {{fresh?: boolean, resolved?: object, context?: object}|null} [summonsPayload]
 *
 * @typedef {Object} CanvasRouteDecision
 * @property {"summons"|"worker-default"|"creator-journey-steps"|"workspace-home"|"empty"} mode
 * @property {object} [payload]                   // present when mode === "summons"
 * @property {string} [workerId]                  // present when mode === "worker-default"
 * @property {string} [workspaceId]               // present when mode === "workspace-home"
 */

/**
 * @param {CanvasRouteInputs} inputs
 * @returns {CanvasRouteDecision}
 */
export function canvasContextRouter({ workspace, route, activeWorkerId, summonsPayload } = {}) {
  if (summonsPayload && summonsPayload.fresh) {
    return { mode: "summons", payload: summonsPayload };
  }
  if (activeWorkerId) {
    return { mode: "worker-default", workerId: activeWorkerId };
  }
  const r = typeof route === "string" ? route : "";
  if (r.startsWith("/creators/journey")) {
    return { mode: "creator-journey-steps" };
  }
  if (r.startsWith("/workspaces/") && workspace && workspace.id) {
    return { mode: "workspace-home", workspaceId: workspace.id };
  }
  return { mode: "empty" };
}

// Lint hook — PLAT-CANVAS-01: call sites that decide canvas mode inline
// (instead of going through canvasContextRouter) drift over time and ship
// inconsistent UX. Any new canvas-state branching outside this file should
// route through canvasContextRouter; QA-001 picks this up via lint.
export const PLAT_CANVAS_01_TAG = "PLAT-CANVAS-01:single-router";

export default canvasContextRouter;
