import React, { createContext, useContext, useState, useCallback } from "react";

const PanelContext = createContext(null);

export function PanelProvider({ children }) {
  const [highlightedWorkers, setHighlightedWorkers] = useState([]);
  const [activeWorker, setActiveWorker] = useState(null);
  const [rightPanelView, setRightPanelView] = useState("catalog"); // catalog | workerDetail | vibe | docControl

  const highlightWorkers = useCallback((workerIds) => {
    setHighlightedWorkers(workerIds || []);
    // If single worker, auto-switch to detail
    if (workerIds && workerIds.length === 1) {
      window.dispatchEvent(new CustomEvent("ta:panel-highlight-worker", { detail: { workerId: workerIds[0] } }));
    }
  }, []);

  const selectWorker = useCallback((worker) => {
    setActiveWorker(worker);
    setRightPanelView("workerDetail");
  }, []);

  const clearSelection = useCallback(() => {
    setActiveWorker(null);
    setHighlightedWorkers([]);
    setRightPanelView("catalog");
  }, []);

  return (
    <PanelContext.Provider value={{
      highlightedWorkers,
      activeWorker,
      rightPanelView,
      highlightWorkers,
      selectWorker,
      clearSelection,
      setRightPanelView,
    }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelContext() {
  return useContext(PanelContext);
}

export default PanelContext;
