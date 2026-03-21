import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const RightPanelContext = createContext(null);

export function RightPanelProvider({ children, initialState, initialVertical, initialVerticalLabel }) {
  const [state, setState] = useState(initialState || "STATE-1");
  const [vertical, setVertical] = useState(initialVertical || null);
  const [verticalLabel, setVerticalLabel] = useState(initialVerticalLabel || null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const originRef = useRef(initialState || "STATE-1");

  const showRecommendations = useCallback((workerList, detectedVertical, detectedLabel) => {
    // STATE-2 visitors: only accept workers matching their vertical (containment)
    if (state === "STATE-2" && detectedVertical && detectedVertical !== vertical) return;
    if (workerList && workerList.length > 0) setWorkers(workerList);
    if (detectedVertical) setVertical(detectedVertical);
    if (detectedLabel) setVerticalLabel(detectedLabel);
    setState("STATE-3");
  }, [state, vertical]);

  const showWorkerDetail = useCallback((worker) => {
    setSelectedWorker(worker);
    setState("STATE-4");
  }, []);

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

  const clearVerticalFilter = useCallback(() => {
    setVertical(null);
    setVerticalLabel(null);
    originRef.current = "STATE-1";
    setState("STATE-1");
  }, []);

  return (
    <RightPanelContext.Provider value={{
      state, vertical, verticalLabel, workers, selectedWorker,
      showRecommendations, showWorkerDetail, goBack, dismiss, clearVerticalFilter,
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
