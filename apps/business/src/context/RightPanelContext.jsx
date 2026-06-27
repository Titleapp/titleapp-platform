import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const RightPanelContext = createContext(null);

export function RightPanelProvider({ children, initialState, initialVertical, initialVerticalLabel }) {
  const [state, setState] = useState(initialState || "STATE-1");
  const [vertical, setVertical] = useState(initialVertical || null);
  const [verticalLabel, setVerticalLabel] = useState(initialVerticalLabel || null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [activeWorkerData, setActiveWorkerData] = useState(null);
  const [relatedWorkers, setRelatedWorkers] = useState([]);
  const [canvasData, setCanvasData] = useState(null); // { resolved, context }
  const prevStateRef = useRef(null); // for canvas dismiss → return to previous
  const originRef = useRef(initialState || "STATE-1");

  const showRecommendations = useCallback((workerList, detectedVertical, detectedLabel) => {
    // S52.45 — DISABLED ENTIRELY. The "<vertical> Workers" recommendation panel
    // kept overlaying worker canvases and survived every targeted guard. Killed
    // at the source: this never enters STATE-3. Worker discovery lives on the
    // Workers page + home "Top 10", never as a canvas overlay.
    return;
    // Lock: never revert from WORKSPACE_HOME or CANVAS — a worker's canvas stays
    // open until the user explicitly leaves. S52.44: added CANVAS so the
    // "<vertical> Workers" recommendation panel can't hijack an open worker
    // canvas on every chat answer (the CRE Analyst overlay bug).
    if (state === "WORKSPACE_HOME" || state === "CANVAS") return;
    // S52.45 — THE bulletproof overlay kill: if ANY worker workspace is open,
    // never enter the recommendation state, regardless of `state`. activeWorkerData
    // is set the moment a worker opens (showWorkerHome) and cleared only on
    // leaveWorkspace — it's the reliable "inside a worker" signal. Prior guards
    // checked WorkerStateContext.activeWorkerId, which is a DIFFERENT context and
    // is not set in every open-worker flow, so the overlay slipped through.
    if (activeWorkerData) return;
    // S52.45 — belt-and-suspenders: a logged-in user is in their workspace, never
    // the discovery funnel. The "{vertical} Workers" overlay is pure noise/bug
    // there. Hard-off whenever a session token exists. (Reversible — the
    // recommendation panel is for logged-OUT discovery visitors only.)
    try { if (typeof localStorage !== "undefined" && localStorage.getItem("ID_TOKEN")) return; } catch {}
    // STATE-2 visitors: only accept workers matching their vertical (containment)
    if (state === "STATE-2" && detectedVertical && detectedVertical !== vertical) return;
    if (workerList && workerList.length > 0) setWorkers(workerList);
    if (detectedVertical) setVertical(detectedVertical);
    if (detectedLabel) setVerticalLabel(detectedLabel);
    setState("STATE-3");
  }, [state, vertical, activeWorkerData]);

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
    setActiveWorkerData(workerData);
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
    setActiveWorkerData(null);
    setRelatedWorkers([]);
    setState(originRef.current);
  }, []);

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
    setCanvasData({ resolved, context });
    setState("CANVAS");
  }, [state]);

  const dismissCanvas = useCallback(() => {
    setCanvasData(null);
    setState(prevStateRef.current || originRef.current);
    // Inside a worker, closing a canvas card must NOT leave a blank canvas —
    // re-land on the worker's first data tab (Sean, 2026-06-26: × → blank on
    // CVT / Drug Dosing / Staff Credentials). App.jsx listens for this and
    // re-runs landOnFirstDataTab. Outside a worker (discovery), no-op.
    if (activeWorkerData) {
      try { window.dispatchEvent(new CustomEvent("ta:reland-canvas")); } catch (_) { /* SSR/no-window */ }
    }
  }, [activeWorkerData]);

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

  return (
    <RightPanelContext.Provider value={{
      state, vertical, verticalLabel, workers, selectedWorker, activeWorkerData, relatedWorkers, canvasData,
      showRecommendations, showWorkerDetail, showWorkerHome, goBack, dismiss, clearVerticalFilter, leaveWorkspace,
      showCanvas, dismissCanvas, openIfClosed, resetCanvas,
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
