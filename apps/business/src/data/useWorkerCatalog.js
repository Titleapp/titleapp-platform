import { useSyncExternalStore } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// Firestore digitalWorkers/* → WORKER_ROUTES-shaped record. Keeps the legacy
// shape so consumers don't need to relearn fields. Price is converted dollars
// → cents because the marketplace UI formats from cents.
function normalizeWorker(d) {
  const w = d.data();
  const dollars = typeof w.price === "number" ? w.price : 0;
  return {
    slug: d.id,
    name: w.display_name || w.name || d.id,
    description: w.capabilitySummary || w.headline || w.description || "",
    suite: w.suite || "Other",
    status: w.status || "planned",
    price: dollars * 100,
    vertical: w.vertical || "",
    internal_only: !!w.internal_only,
    bogoEligible: !!w.bogoEligible,
    commission: !!w.commission,
    creditCost: typeof w.creditCost === "number" ? w.creditCost : 1,
    headline: w.headline || "",
  };
}

let workers = [];
let firstLoadPromise = null;
let firstLoadResolve = null;
const subscribers = new Set();
let unsubscribe = null;

function start() {
  if (unsubscribe) return;
  firstLoadPromise = new Promise((resolve) => { firstLoadResolve = resolve; });
  try {
    unsubscribe = onSnapshot(
      collection(db, "digitalWorkers"),
      (snap) => {
        workers = snap.docs.map(normalizeWorker);
        subscribers.forEach((cb) => cb());
        if (firstLoadResolve) { firstLoadResolve(); firstLoadResolve = null; }
      },
      (err) => {
        // Permission denied (unauthenticated) — leave list empty, components
        // can fall back to API or render empty state.
        console.warn("useWorkerCatalog: snapshot error", err.code || err.message);
        if (firstLoadResolve) { firstLoadResolve(); firstLoadResolve = null; }
      }
    );
  } catch (err) {
    console.warn("useWorkerCatalog: subscribe failed", err.message);
    if (firstLoadResolve) { firstLoadResolve(); firstLoadResolve = null; }
  }
}

function subscribe(cb) {
  subscribers.add(cb);
  start();
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      firstLoadPromise = null;
    }
  };
}

const getSnapshot = () => workers;

export function useWorkerCatalog() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// For non-React callers (rare; e.g. event handlers caching a snapshot).
export function getCachedWorkers() {
  return workers;
}
