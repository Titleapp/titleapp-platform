import { createContext, useContext, useState, useCallback, useRef } from "react";

const WorkerStateContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

/**
 * WorkerStateProvider — single source of truth for worker state.
 *
 * States: idle | loading | arrival | working | complete
 * workerReady: true only after full worker data (incl workspaceLaunchPage) is confirmed.
 *   When workerReady flips to true, state transitions to 'arrival'.
 * Canvas must not mount until workerReady === true.
 * Chat must not fire opener until workerReady === true.
 */
export function WorkerStateProvider({ children }) {
  const [workerState, setWorkerState] = useState("idle");
  const [activeWorkerId, setActiveWorkerId] = useState(null);
  const [activeWorkerData, setActiveWorkerData] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevWorkerIdRef = useRef(null);

  const selectWorker = useCallback(async (slug) => {
    const wasPreviousWorker = prevWorkerIdRef.current && prevWorkerIdRef.current !== slug;
    if (wasPreviousWorker) setIsTransitioning(true);

    // If optimistic data already set for this slug, skip the null reset
    const hasOptimistic = prevWorkerIdRef.current === slug;
    if (!hasOptimistic) {
      setWorkerState("loading");
      setActiveWorkerId(slug);
      setWorkerReady(false);
      setActiveWorkerData(null);
      prevWorkerIdRef.current = slug;
    }

    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/catalog:byVertical&vertical=all&limit=200`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ID_TOKEN") || ""}`,
        },
      });
      const data = await resp.json();
      const worker = (data.workers || []).find(
        (w) => (w.workerId || w.slug) === slug || w.slug === slug
      );
      if (worker) {
        // CODEX 49.16 — merge catalog data with optimistic data so the sidebar's
        // display name isn't overwritten by a different catalog name.
        setActiveWorkerData((prev) => {
          if (prev && prev.slug === slug) {
            return { ...worker, name: prev.name || worker.name };
          }
          return worker;
        });
        setWorkerReady(true);
        setWorkerState("arrival");
        if (wasPreviousWorker) {
          setTimeout(() => setIsTransitioning(false), 150);
        }
      }
    } catch (err) {
      console.warn("[WorkerState] Failed to fetch worker data:", err.message);
      setWorkerState("idle");
      setIsTransitioning(false);
    }
  }, []);

  const startWorking = useCallback(() => setWorkerState("working"), []);
  const completeWork = useCallback(() => setWorkerState("complete"), []);
  const resetState = useCallback(() => setWorkerState("idle"), []);

  const setWorkerOptimistic = useCallback((workerData) => {
    setActiveWorkerData(workerData);
    setWorkerReady(true);
    setWorkerState("arrival");
    setActiveWorkerId(workerData.slug);
    prevWorkerIdRef.current = workerData.slug;
  }, []);

  const clearWorker = useCallback(() => {
    setWorkerState("idle");
    setActiveWorkerId(null);
    setActiveWorkerData(null);
    setWorkerReady(false);
    prevWorkerIdRef.current = null;
  }, []);

  return (
    <WorkerStateContext.Provider
      value={{
        workerState,
        activeWorkerId,
        activeWorkerData,
        workerReady,
        isTransitioning,
        selectWorker,
        startWorking,
        completeWork,
        resetState,
        clearWorker,
        setWorkerOptimistic,
        setWorkerState,
        setWorkerReady,
      }}
    >
      {children}
    </WorkerStateContext.Provider>
  );
}

export function useWorkerState() {
  return useContext(WorkerStateContext);
}
