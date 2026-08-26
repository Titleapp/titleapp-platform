import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useWorkerState } from "./WorkerStateContext.jsx";

// Maps workspace.vertical values (stored in Firestore / localStorage) to leaderboard vertical keys.
// Keeps the RightPanel in sync when the user switches workspaces.
const WS_VERTICAL_MAP = {
  "real-estate": "real_estate_development",
  "Real Estate": "real_estate_development",
  "re_professional": "real_estate_development",
  "real_estate_development": "real_estate_development",
  "aviation": "aviation",
  "Aviation": "aviation",
  "healthcare": "healthcare",
  "Healthcare": "healthcare",
  "legal": "legal",
  "Legal": "legal",
  "government": "government",
};

const RightPanelContext = createContext(null);

export function RightPanelProvider({ children, initialState, initialVertical, initialVerticalLabel }) {
  const wsc = useWorkerState();
  const [state, setState] = useState(initialState || "STATE-1");

  // Bootstrap vertical from URL param (initialVertical) or localStorage (workspace previously selected).
  // This ensures the leaderboard shows relevant workers on page load, not the "all" global default.
  const _bootstrapVertical = () => {
    if (initialVertical) return initialVertical;
    const stored = localStorage.getItem("VERTICAL");
    return (stored && WS_VERTICAL_MAP[stored]) ? WS_VERTICAL_MAP[stored] : null;
  };
  const _bootstrapLabel = () => {
    if (initialVerticalLabel) return initialVerticalLabel;
    const stored = localStorage.getItem("VERTICAL");
    if (!stored) return null;
    const mapped = Object.entries(WS_VERTICAL_MAP).find(([k]) => k === stored);
    return mapped ? null : null; // label will come from the leaderboard response; null is fine here
  };

  const [vertical, setVertical] = useState(() => _bootstrapVertical());
  const [verticalLabel, setVerticalLabel] = useState(() => _bootstrapLabel());
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  // _localWorkerData: fallback for the brief window before WorkerStateContext is populated.
  // WorkerStateContext.activeWorkerData is the canonical source — prefer it in all reads.
  const [_localWorkerData, _setLocalWorkerData] = useState(null);
  const [relatedWorkers, setRelatedWorkers] = useState([]);
  const [canvasData, setCanvasData] = useState(null); // { resolved, context }
  const [artifactData, setArtifactData] = useState(null); // { type, data, title? }
  const prevStateRef = useRef(null); // for canvas dismiss → return to previous
  const originRef = useRef(initialState || "STATE-1");
  // Ref mirrors canvasData so dismissCanvas can pass the pre-clear value via
  // the ta:reland-canvas event even after React flushes state synchronously.
  const canvasDataRef = useRef(null);

  // When the user switches workspaces, update the RightPanel vertical so the
  // leaderboard shows workers relevant to the new workspace, not the "all" global default.
  useEffect(() => {
    function onWorkspaceChanged(e) {
      const wsVertical = e.detail?.vertical;
      if (!wsVertical) return;
      const mapped = WS_VERTICAL_MAP[wsVertical];
      if (mapped) setVertical(mapped);
    }
    window.addEventListener("ta:workspace-changed", onWorkspaceChanged);
    return () => window.removeEventListener("ta:workspace-changed", onWorkspaceChanged);
  }, []);

  const showRecommendations = useCallback((_workerList, _detectedVertical, _detectedLabel) => {
    // S52.45 — DISABLED ENTIRELY. The "<vertical> Workers" recommendation panel
    // kept overlaying worker canvases and survived every targeted guard. Killed
    // at the source: this never enters STATE-3. Worker discovery lives on the
    // Workers page + home "Top 10", never as a canvas overlay.
    return;
  }, []);

  const showWorkerDetail = useCallback((worker) => {
    // Lock: never revert from WORKSPACE_HOME
    if (state === "WORKSPACE_HOME") return;
    setSelectedWorker(worker);
    setState("STATE-4");
  }, [state]);

  const goBack = useCallback(() => {
    setSelectedWorker(null);
    if (workers.length > 0) {
      setState("STATE-3");
    } else {
      setState(originRef.current);
    }
  }, [workers]);

  const dismiss = useCallback(() => {
    setState(originRef.current);
    setSelectedWorker(null);
  }, []);

  const showWorkerHome = useCallback((workerData, cousins) => {
    // WorkerStateContext.setWorkerOptimistic is the canonical writer — it was
    // already called by Sidebar before ta:select-worker fires. Update local
    // fallback state so WORKSPACE_HOME gate renders if wsc hasn't set data yet.
    // Clear any stale canvas card from the previous worker so it never bleeds
    // into the new worker's canvas pane (recurring overlay bug).
    canvasDataRef.current = null;
    setCanvasData(null);
    _setLocalWorkerData(workerData);
    if (cousins) setRelatedWorkers(cousins);
    setState("WORKSPACE_HOME");
  }, []);

  const clearVerticalFilter = useCallback(() => {
    setVertical(null);
    setVerticalLabel(null);
    originRef.current = "STATE-1";
    setState("STATE-1");
  }, []);

  const leaveWorkspace = useCallback(() => {
    // Clear stale canvas so the next worker (or COS) never inherits a previous
    // worker's RE map or WorkProductCard. This was the primary source of the
    // "RE map on Alex" bug — leaveWorkspace() was the only exit path that didn't
    // wipe canvas, so clicking COS after an RE worker left the map in state.
    canvasDataRef.current = null;
    setCanvasData(null);
    _setLocalWorkerData(null);
    setRelatedWorkers([]);
    setState(originRef.current);
    // Also clear WorkerStateContext so workerReady gates (canvas, chat opener) reset.
    if (wsc?.clearWorker) wsc.clearWorker();
  }, [wsc]);

  // Canvas Protocol (44.9) — show canvas card in right panel
  const showCanvas = useCallback((resolved, context) => {
    // Guard against the recurring "dead overlay": the WorkProductCard family is
    // entirely payload-driven (dataSource "conversation"). When a tab produces
    // no payload — e.g. an HR tab with no live builder, or Contacts before data
    // loads — opening CANVAS anyway mounts a blank full-height "Work Product"
    // card that visually blocks the worker view. If there's nothing to render,
    // leave the current view (landing / KPI grid) intact instead.
    if (resolved?.component === "WorkProductCard") {
      const payload = context?.payload;
      const hasPayload = Array.isArray(payload)
        ? payload.length > 0
        : (payload && typeof payload === "object" && Object.keys(payload).length > 0);
      if (!hasPayload) {
        // THE "Dashboard overlay" bug: a tab with no payload must not leave a
        // stale discovery card (WorkerListCanvas) sitting in canvasData — that's
        // what paints over the worker when you click the Dashboard/default tab.
        // Clear any lingering discovery canvas and drop back to the worker's
        // landing instead of silently no-op'ing (which kept the overlay).
        setCanvasData((prev) => {
          const r = prev?.resolved;
          const isDiscovery = !!(r && (r.isDiscovery || r.component === "WorkerListCanvas"
            || String(r._signal || "").startsWith("vertical:")
            || String(r._signal || "").startsWith("browse:")));
          if (isDiscovery) { setState(prevStateRef.current || originRef.current); return null; }
          return prev;
        });
        return;
      }
    }
    if (state !== "CANVAS") prevStateRef.current = state;
    canvasDataRef.current = { resolved, context };
    setCanvasData({ resolved, context });
    setState("CANVAS");
  }, [state]);

  const dismissCanvas = useCallback(() => {
    // Capture before clearing — React may flush the setState below before
    // the synchronous ta:reland-canvas listener runs, making panel.canvasData
    // null by then. Passing savedCanvas in the event detail avoids the race.
    const savedCanvas = canvasDataRef.current;
    canvasDataRef.current = null;
    setCanvasData(null);
    setState(prevStateRef.current || originRef.current);
    // Inside a worker, closing a canvas card must NOT leave a blank canvas —
    // re-land on the worker's first data tab. WorkerStateContext is the canonical
    // source; fall back to local state for the brief window before it's populated.
    const insideWorker = !!(wsc?.activeWorkerData || _localWorkerData);
    if (insideWorker) {
      try { window.dispatchEvent(new CustomEvent("ta:reland-canvas", { detail: { savedCanvas } })); } catch { /* SSR/no-window */ }
    }
  }, [wsc, _localWorkerData]);

  const showArtifact = useCallback((artifact) => {
    setArtifactData(artifact);
  }, []);

  const clearArtifact = useCallback(() => {
    setArtifactData(null);
  }, []);

  // 49.31 — Force the canvas pane open without changing canvasData. Used when
  // ChatPanel receives canvasRenders[] and needs the panel visible immediately.
  // If canvas is already showing, this is a no-op.
  // GUARD: WORKSPACE_HOME = spine worker's own full canvas is showing.
  // Switching away from it to reveal stale canvasData causes the "half-second
  // overlay" bug where the chat greeting reveals a previous worker's card
  // over the current worker's proper canvas.
  const openIfClosed = useCallback(() => {
    if (state === "WORKSPACE_HOME") return;
    if (state !== "CANVAS") {
      prevStateRef.current = state;
      setState("CANVAS");
    }
  }, [state]);

  // 49.31 — Reset canvas content AND exit CANVAS state (used on worker change so
  // stale data from a previous worker doesn't bleed into the new worker's canvas).
  const resetCanvas = useCallback(() => {
    setCanvasData(null);
    setState((prev) => (prev === "CANVAS" ? (prevStateRef.current || originRef.current) : prev));
  }, []);

  // WorkerStateContext is the single source of truth for activeWorkerData.
  // Fall back to _localWorkerData for the brief optimistic window before
  // WorkerStateContext is populated (e.g. in AdminShell which has no wsc).
  const activeWorkerData = wsc?.activeWorkerData ?? _localWorkerData;

  return (
    <RightPanelContext.Provider value={{
      state, vertical, verticalLabel, workers, selectedWorker, activeWorkerData, relatedWorkers, canvasData, artifactData,
      showRecommendations, showWorkerDetail, showWorkerHome, goBack, dismiss, clearVerticalFilter, leaveWorkspace,
      showCanvas, dismissCanvas, openIfClosed, resetCanvas,
      showArtifact, clearArtifact,
      setWorkers,
    }}>
      {children}
    </RightPanelContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRightPanel() {
  return useContext(RightPanelContext);
}

export default RightPanelContext;
