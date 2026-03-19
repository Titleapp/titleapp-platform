/**
 * WorkerCounter.jsx — Canonical platform worker count display.
 *
 * Hardcoded to "1,000+" — the full catalog count across all verticals.
 * Firestore counts only reflect synced workers, not the full catalog.
 *
 * Usage:
 *   <WorkerCounter />                    — displays "1,000+ Digital Workers"
 *   <WorkerCounter label="available" />  — displays "1,000+ available"
 */

export default function WorkerCounter({ label = "Digital Workers", style = {} }) {
  return (
    <span className="workerCounter" style={style}>
      1,000+ {label}
    </span>
  );
}
