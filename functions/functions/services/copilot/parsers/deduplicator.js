"use strict";

/**
 * deduplicator.js — Match logbook entries by date+from+to+totalTime
 *
 * When importing from multiple sources (ForeFlight, FVO, manual),
 * duplicate entries are detected and resolved.
 *
 * Priority: FVO > ForeFlight > manual (FVO has more precise block/duty data)
 * Tolerance: totalTime within 0.1 hours
 */

const SOURCE_PRIORITY = { fvo: 3, manual: 2, foreflight: 1, merged: 0 };

/**
 * Deduplicate new entries against existing ones.
 *
 * @param {Array} newEntries — entries to import
 * @param {Array} existingEntries — entries already in Firestore
 * @returns {{ toWrite: Array, duplicates: Array, conflicts: Array, merged: Array }}
 */
function deduplicateEntries(newEntries, existingEntries) {
  const toWrite = [];
  const duplicates = [];
  const conflicts = [];
  const merged = [];

  for (const entry of newEntries) {
    const match = findMatch(entry, existingEntries);

    if (!match) {
      // No match — new entry
      toWrite.push(entry);
      continue;
    }

    const newPriority = SOURCE_PRIORITY[entry.source] || 0;
    const existingPriority = SOURCE_PRIORITY[match.source] || 0;

    // Check for time conflict
    const timeDiff = Math.abs(entry.totalTime - match.totalTime);
    if (timeDiff > 0.1) {
      conflicts.push({
        newEntry: entry,
        existingEntry: match,
        timeDifference: Math.round(timeDiff * 10) / 10,
        resolution: newPriority >= existingPriority ? "new_wins" : "existing_wins",
      });
    }

    if (newPriority > existingPriority) {
      // New source has higher priority — update existing
      merged.push({
        existingId: match._firestoreId,
        mergedFrom: entry.source,
        mergedInto: match.source,
        entry: { ...entry, source: "merged", _mergedFrom: [match.source, entry.source] },
      });
    } else {
      // Existing has higher or equal priority — skip
      duplicates.push({
        entry,
        matchedId: match._firestoreId,
        reason: `${match.source} already exists (priority ${existingPriority} >= ${newPriority})`,
      });
    }
  }

  return { toWrite, duplicates, conflicts, merged };
}

function findMatch(entry, existingEntries) {
  const entryDate = normalizeDate(entry.date);
  const entryFrom = (entry.departure || "").toUpperCase().trim();
  const entryTo = (entry.destination || "").toUpperCase().trim();

  for (const existing of existingEntries) {
    const existDate = normalizeDate(existing.date);
    if (entryDate !== existDate) continue;

    const existFrom = (existing.departure || "").toUpperCase().trim();
    const existTo = (existing.destination || "").toUpperCase().trim();

    if (entryFrom === existFrom && entryTo === existTo) {
      const timeDiff = Math.abs((entry.totalTime || 0) - (existing.totalTime || 0));
      if (timeDiff <= 0.2) return existing;
    }
  }

  return null;
}

function normalizeDate(dateStr) {
  if (!dateStr) return "";
  // Handle YYYY-MM-DD, MM/DD/YYYY, M/D/YY formats
  const str = String(dateStr).trim();
  if (str.includes("-") && str.length >= 10) return str.substring(0, 10);
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    if (c.length === 2) c = `20${c}`;
    return `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }
  return str;
}

module.exports = { deduplicateEntries };
