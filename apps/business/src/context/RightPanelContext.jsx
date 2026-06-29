import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useWorkerState } from "./WorkerStateContext.jsx";

const RightPanelContext = createContext(null);

export function RightPanelProvider({ children, initialState, initialVertical, initialVerticalLabel }) {
  const wsc = useWorkerState();
  const [state, setState] = useState(initialState || "STATE-1");
  const [vertical, setVertical] = useState(initialVertical || null);
  const [verticalLabel, setVerticalLabel] = useState(initialVerticalLabel || null);
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

  const showRecommendations = useCallback((workerList, detectedVertical, detectedLabel) => {
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
      try { window.dispatchEvent(new CustomEvent("ta:reland-canvas", { detail: { savedCanvas } })); } catch (_) { /* SSR/no-window */ }
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
  const openIfClosed = useCallback(() => {
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

export function useRightPanel() {
  return useContext(RightPanelContext);
}

export default RightPanelContext;
