import { createContext, useContext, useState, useCallback, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { prettyWorkerName } from "../utils/displayName";

const WorkerStateContext = createContext(null);

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
      // CODEX 50.10-T3: Read worker doc from Firestore directly. This bypasses
      // the catalog API proxy (whose query-string handling drops params on the
      // current Cloudflare frontdoor) and gives us all fields including the
      // canvasTabs array used by the right-panel tab bar.
      const snap = await getDoc(doc(db, "digitalWorkers", slug));

      // Creator-worker fallback (S51.43.9): some creator workers are wired
      // into the platform via slug-routed React panels (App.jsx WorkerHomeRenderer)
      // before they have a digitalWorkers/{slug} catalog entry. Synthesize a
      // minimal worker object so workerState transitions to "arrival" and the
      // panel renders. Sunday: real Firestore catalog write will replace this.
      const CREATOR_WORKER_FALLBACKS = {
        "nursing-education-001": {
          slug: "nursing-education-001",
          workerId: "nursing-education-001",
          name: "Nursing Education",
          shortDescription: "Longitudinal student record for nursing programs — competency + professionalism + attendance + clinical incidents, in one tamper-proof place.",
          vertical: "Education",
          suite: "Education",
          status: "live",
          workerType: "worker",
          canvasTabs: [],
          catalogId: "nursing-education-001",
          tagline: "Follow each student from day 1 to graduation",
          whatYoullHave: "",
          quickStartPrompts: [],
          activeSubstrateFeatures: [],
        },
      };

      // S52.44 substrate fix: NEVER silently fall through on a missing
      // digitalWorkers/{slug} doc. Before, only the one hardcoded
      // nursing-education-001 had a fallback — every other worker whose
      // Firestore doc wasn't synced yet (catalog-registered but workerSync
      // hasn't propagated, or built outside the sandbox) hung with
      // workerReady=false, so "Canvas must not mount until workerReady" left
      // the panel blank AND the worker invisible. Now any missing doc
      // synthesizes a minimal worker so the canvas mounts (graceful
      // degradation with empty tabs) until the sync writes the full doc.
      if (!snap.exists()) {
        const worker = CREATOR_WORKER_FALLBACKS[slug] || {
          slug,
          workerId: slug,
          name: prettyWorkerName(slug),
          shortDescription: "",
          vertical: "",
          suite: "",
          status: "beta",
          workerType: "worker",
          canvasTabs: [],
          catalogId: slug,
          tagline: "",
          whatYoullHave: "",
          quickStartPrompts: [],
          activeSubstrateFeatures: [],
        };
        setActiveWorkerData((prev) => prev && prev.slug === slug ? { ...worker, name: prev.name || worker.name } : worker);
        setWorkerReady(true);
        setWorkerState("arrival");
        if (wasPreviousWorker) setTimeout(() => setIsTransitioning(false), 150);
        return;
      }

      if (snap.exists()) {
        const d = snap.data();
        const lp = d.workspaceLaunchPage || {};
        const worker = {
          workerId: snap.id,
          slug: d.slug || snap.id,
          name: d.display_name || d.name || "",
          shortDescription: d.short_description || d.headline || d.description || "",
          price: d.pricing_tier || d.pricing?.monthly || 0,
          vertical: d.vertical || d.suite || "",
          status: d.status || "live",
          tagline: lp.tagline || "",
          whatYoullHave: lp.whatYoullHave || "",
          quickStartPrompts: Array.isArray(lp.quickStartPrompts) ? lp.quickStartPrompts : [],
          activeSubstrateFeatures: Array.isArray(lp.activeSubstrateFeatures) ? lp.activeSubstrateFeatures : [],
          workerType: d.worker_type || "worker",
          canvasTabs: Array.isArray(d.canvasTabs) ? d.canvasTabs : [],
          // S52.50 (keystone #31) — carry the worker's OWN renderable canvas spec
          // through so resolveCanvasSpec() renders its designed tabs/blocks. This
          // is the main open path; without it canvasSpec never reaches the renderer.
          canvasSpec: d.canvasSpec || d.canvas || null,
          // catalogId is required by sampleData.getFixtureForTab to detect
          // aviation CoPilots (AV-P##) and load baseline fixtures regardless
          // of demo-mode. Without it, the regex check fails and aviation
          // map/aircraft/logbook/etc. tabs fall through to a SF default.
          catalogId: d.catalogId || d.catalog_id || "",
          suite: d.suite || "",
        };
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
