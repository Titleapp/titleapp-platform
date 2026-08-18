"use strict";

/**
 * dispatchImportParser.js — bulk import of trip history for Dispatch, from
 * the scheduling/dispatch SaaS an operator is already exporting from
 * (Sean, 2026-08-17 — real delivered workers start empty; onboarding real
 * data from the tool already in use is the point). Tolerant column-name
 * matching, same approach as services/copilot/parsers/fvoParser.js and
 * services/mx/mxImportParser.js — every tool names these fields differently.
 */

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("release") || s.includes("complet") || s.includes("flown")) return "released";
  return "draft";
}

function parseTripHistoryCsv(csvBuffer) {
  const { parse } = require("csv-parse/sync");
  const raw = typeof csvBuffer === "string" ? csvBuffer : csvBuffer.toString("utf8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  const trips = [];
  for (const row of records) {
    const destination = row.Destination || row.Arrival || row.To || row.ArrivalAirport || "";
    if (!destination) continue;

    trips.push({
      client: String(row.Client || row.Customer || row.PaxLead || "").trim() || "Imported record",
      departure: String(row.Departure || row.Origin || row.From || row.DepartureAirport || "").toUpperCase().trim(),
      destination: String(destination).toUpperCase().trim(),
      alternate: String(row.Alternate || row.AlternateAirport || "").toUpperCase().trim(),
      requestedDepartureZulu: row.DepartureTime || row.ScheduledDeparture || row.Date || null,
      tailNumber: String(row.Tail || row.TailNumber || row.Aircraft || "").toUpperCase().trim(),
      status: normalizeStatus(row.Status),
      assignedCrew: (row.PIC || row.Crew)
        ? [{ name: String(row.PIC || row.Crew).trim(), role: "PIC", uid: null }]
        : [],
      paxManifest: row.PaxCount ? Array.from({ length: Math.min(Number(row.PaxCount) || 0, 20) }, () => ({ name: "", weightLbs: 0, notes: "imported — pax count only, no manifest detail in source export" })) : [],
      _importSource: "dispatch_csv_import",
    });
  }
  return trips;
}

module.exports = { parseTripHistoryCsv };
