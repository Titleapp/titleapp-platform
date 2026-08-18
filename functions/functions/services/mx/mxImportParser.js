"use strict";

/**
 * mxImportParser.js — bulk import for MX from the SaaS tools operators
 * already use (Flight Vector Ops, RAMCO, Protean — named by Sean 2026-08-17
 * as "the crummy SaaS we have to work with"). Real delivered worker suites
 * start as an empty shell; onboarding real data from the tool an operator
 * is already exporting from is the whole point, not an afterthought
 * (Sean, 2026-08-17). Mirrors services/copilot/parsers/fvoParser.js's
 * tolerant-column-name approach, since every MX SaaS export uses different
 * header names for the same underlying fields.
 *
 * Two import types, since these tools export them separately:
 *   - Aircraft/component roster (tail, hours, next inspection, AD list)
 *   - Squawk/discrepancy log (matches aircraftRecords squawks schema)
 */

function num(v) {
  const n = parseFloat(String(v || "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function normalizeMelCategory(raw) {
  const c = String(raw || "").trim().toUpperCase();
  return ["A", "B", "C", "D"].includes(c) ? c : null;
}

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s.includes("defer")) return "deferred";
  if (s.includes("close") || s.includes("resolv") || s.includes("complet")) return "closed";
  return "open";
}

/**
 * Parse a squawk/discrepancy log export. Column names tolerated across
 * FVO/RAMCO/Protean-style exports — each names these fields differently.
 */
function parseMxSquawksCsv(csvBuffer) {
  const { parse } = require("csv-parse/sync");
  const raw = typeof csvBuffer === "string" ? csvBuffer : csvBuffer.toString("utf8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  const squawks = [];
  for (const row of records) {
    const tailNumber = row.Tail || row.TailNumber || row["Aircraft"] || row.Registration || row.AC || "";
    const description = row.Description || row.Discrepancy || row.Squawk || row.Issue || row.Defect || "";
    if (!tailNumber || !description) continue;

    squawks.push({
      tailNumber: String(tailNumber).toUpperCase().trim(),
      description: String(description).trim().slice(0, 1000),
      category: normalizeMelCategory(row.MEL || row.MELCategory || row.Category || row.Class),
      status: normalizeStatus(row.Status || row.State),
      openedAt: row.DateOpened || row.OpenDate || row.Reported || row.Date || new Date().toISOString(),
      workOrderNumber: String(row.WorkOrder || row.WO || row.WorkOrderNumber || "").trim(),
      reportedBy: String(row.ReportedBy || row.Pilot || row.PIC || "").trim(),
      _importSource: "mx_csv_import",
    });
  }
  return squawks;
}

/**
 * Parse an aircraft/component roster export — tail, hours, next inspection.
 * Partial rows are fine; upsertAircraft merges, it doesn't require a
 * complete record.
 */
function parseMxAircraftRosterCsv(csvBuffer) {
  const { parse } = require("csv-parse/sync");
  const raw = typeof csvBuffer === "string" ? csvBuffer : csvBuffer.toString("utf8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  const aircraft = [];
  for (const row of records) {
    const tailNumber = row.Tail || row.TailNumber || row["Aircraft"] || row.Registration || row.AC || "";
    if (!tailNumber) continue;

    aircraft.push({
      tailNumber: String(tailNumber).toUpperCase().trim(),
      type: String(row.Type || row.Model || row.AircraftType || "").trim(),
      serialNumber: String(row.SerialNumber || row.SN || row["S/N"] || "").trim(),
      totalTimeHours: num(row.TotalTime || row.TTSN || row.AirframeHours),
      nextInspection: (row.NextInspectionType || row.InspectionDue)
        ? {
            type: String(row.NextInspectionType || row.InspectionType || "Inspection").trim(),
            dueDate: row.NextInspectionDue || row.InspectionDueDate || null,
            dueAtHours: row.NextInspectionHours ? num(row.NextInspectionHours) : null,
          }
        : null,
      _importSource: "mx_csv_import",
    });
  }
  return aircraft;
}

module.exports = { parseMxSquawksCsv, parseMxAircraftRosterCsv };
