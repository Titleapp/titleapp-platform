/**
 * WorkerCounter.jsx — Live worker count from Firestore homepageCache.
 *
 * Reads platform/homepageCache via onSnapshot for real-time updates.
 * Shows the conservative display count (rounded down to nearest 100).
 *
 * Usage:
 *   <WorkerCounter />                    — displays "300+ Digital Workers"
 *   <WorkerCounter label="available" />  — displays "300+ available"
 *   <WorkerCounter showExact />          — displays "346 Digital Workers"
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function WorkerCounter({ label = "Digital Workers", showExact = false, style = {} }) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "platform", "homepageCache"),
      (snap) => {
        if (snap.exists()) {
          setCounts(snap.data());
        }
      },
      (err) => {
        console.warn("[WorkerCounter] onSnapshot error:", err.message);
      }
    );
    return () => unsub();
  }, []);

  if (!counts) return null;

  const display = showExact
    ? `${counts.worker_count_total || 0}`
    : counts.worker_count_display || `${counts.worker_count_total || 0}`;

  return (
    <span className="workerCounter" style={style}>
      {display} {label}
    </span>
  );
}
