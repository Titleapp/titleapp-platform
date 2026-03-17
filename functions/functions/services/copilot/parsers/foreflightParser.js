"use strict";

/**
 * foreflightParser.js — Parse ForeFlight CSV logbook export
 *
 * ForeFlight exports CSV with known column names. Maps to unified
 * logbook entry schema for storage in logbooks/{userId}/entries.
 */

function parseForeFlight(csvBuffer) {
  const { parse } = require("csv-parse/sync");

  const raw = typeof csvBuffer === "string" ? csvBuffer : csvBuffer.toString("utf8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  const entries = [];
  for (const row of records) {
    const entry = {
      date: row.Date || row.date || "",
      aircraft: row.AircraftID || row.TypeCode || "",
      tailNumber: row.AircraftID || "",
      aircraftCategory: "airplane",
      aircraftClass: "multi-engine land",
      departure: row.From || row.Route?.split("-")[0] || "",
      destination: row.To || row.Route?.split("-").pop() || "",
      route: row.Route || "",
      totalTime: num(row.TotalTime),
      picTime: num(row.PIC),
      sicTime: num(row.SIC),
      dualReceived: num(row.DualReceived),
      dualGiven: num(row.DualGiven),
      nightTime: num(row.Night),
      actualInstrument: num(row.ActualInstrument),
      simulatedInstrument: num(row.SimulatedInstrument),
      crossCountry: num(row.CrossCountry),
      landingsDay: int(row.DayLandingsFullStop || row.DayTakeoffsFullStop),
      landingsNight: int(row.NightLandingsFullStop || row.NightTakeoffsFullStop),
      approachCount: countApproaches(row),
      approachTypes: parseApproachTypes(row),
      holds: int(row.Holds),
      turbineTime: num(row.TotalTime), // PC12 = all turbine
      complexTime: num(row.TotalTime),
      highPerformanceTime: num(row.TotalTime),
      remarks: row.InstructorComments || row.PilotComments || "",
      source: "foreflight",
      _raw: row,
    };

    // Skip rows with no date or no flight time
    if (!entry.date || entry.totalTime === 0) continue;
    entries.push(entry);
  }

  return entries;
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 10) / 10;
}

function int(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function countApproaches(row) {
  let count = 0;
  for (let i = 1; i <= 6; i++) {
    const col = row[`Approach${i}`];
    if (col && col.trim()) count++;
  }
  return count;
}

function parseApproachTypes(row) {
  const types = [];
  for (let i = 1; i <= 6; i++) {
    const col = row[`Approach${i}`];
    if (col && col.trim()) types.push(col.trim());
  }
  return types;
}

module.exports = { parseForeFlight };
