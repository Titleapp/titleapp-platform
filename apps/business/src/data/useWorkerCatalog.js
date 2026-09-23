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
    // S52.50 (keystone #31) — pass the worker's OWN canvas spec through so the
    // data-driven renderer can show its designed tabs/blocks. Without this the
    // renderer falls back to the generic shell for any non-fixture worker.
    workerId: d.id,
    canvasSpec: w.canvasSpec || w.canvas || null,
  };
}

let workers = [];
let loaded = false; // true once the first snapshot (or its error) has arrived
let _firstLoadPromise = null;
let firstLoadResolve = null;
const subscribers = new Set();
let unsubscribe = null;

function markLoaded() {
  loaded = true;
  if (firstLoadResolve) { firstLoadResolve(); firstLoadResolve = null; }
}

function start() {
  if (unsubscribe) return;
  _firstLoadPromise = new Promise((resolve) => { firstLoadResolve = resolve; });
  try {
    unsubscribe = onSnapshot(
      collection(db, "digitalWorkers"),
      (snap) => {
        workers = snap.docs.map(normalizeWorker);
        subscribers.forEach((cb) => cb());
        markLoaded();
      },
      (err) => {
        // Permission denied (unauthenticated) — leave list empty, components
        // can fall back to API or render empty state.
        console.warn("useWorkerCatalog: snapshot error", err.code || err.message);
        markLoaded();
      }
    );
  } catch (err) {
    console.warn("useWorkerCatalog: subscribe failed", err.message);
    markLoaded();
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
      _firstLoadPromise = null;
      loaded = false;
    }
  };
}

const getSnapshot = () => workers;
const getLoadedSnapshot = () => loaded;

export function useWorkerCatalog() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// True once the first Firestore snapshot (or its error) has resolved — lets
// callers distinguish "catalog hasn't loaded yet" from "confirmed not in the
// catalog" instead of treating an empty first-render array as not-found.
export function useWorkerCatalogLoaded() {
  return useSyncExternalStore(subscribe, getLoadedSnapshot, getLoadedSnapshot);
}

// For non-React callers (rare; e.g. event handlers caching a snapshot).
export function getCachedWorkers() {
  return workers;
}
