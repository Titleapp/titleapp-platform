"use strict";

/**
 * fvoParser.js — Parse FVO (Flight Vector Ops) duty reports
 *
 * Accepts PDF or CSV format. Extracts duty periods and flight segments.
 * Returns both logbook entries and duty period records.
 */

async function parseFVO(fileBuffer, mimeType) {
  const isCSV = mimeType === "text/csv" || mimeType === "application/csv";
  if (isCSV) {
    return parseFVOcsv(fileBuffer);
  }
  return parseFVOpdf(fileBuffer);
}

function parseFVOcsv(csvBuffer) {
  const { parse } = require("csv-parse/sync");
  const raw = typeof csvBuffer === "string" ? csvBuffer : csvBuffer.toString("utf8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  const entries = [];
  const dutyPeriods = [];

  for (const row of records) {
    // Map FVO fields — column names vary by FVO version
    const date = row.Date || row.FlightDate || row.date || "";
    const departure = row.Departure || row.From || row.Origin || "";
    const destination = row.Arrival || row.To || row.Destination || "";
    const blockOut = row.BlockOut || row.OUT || row.ActualOut || "";
    const blockIn = row.BlockIn || row.IN || row.ActualIn || "";
    const flightTime = num(row.FlightTime || row.BlockTime || row.TotalTime);
    const crewRole = (row.CrewRole || row.Role || row.Position || "SIC").toUpperCase();
    const part = row.Part || row.Regulation || "135";
    const dutyOn = row.DutyOn || row.DutyStart || "";
    const dutyOff = row.DutyOff || row.DutyEnd || "";

    if (!date || flightTime === 0) continue;

    // Logbook entry
    entries.push({
      date,
      aircraft: row.AircraftType || row.Aircraft || "PC12",
      tailNumber: row.TailNumber || row.Registration || "",
      aircraftCategory: "airplane",
      aircraftClass: "multi-engine land",
      departure,
      destination,
      route: `${departure}-${destination}`,
      totalTime: flightTime,
      picTime: crewRole === "PIC" ? flightTime : 0,
      sicTime: crewRole === "SIC" ? flightTime : 0,
      dualReceived: 0,
      dualGiven: 0,
      nightTime: num(row.NightTime || row.Night),
      actualInstrument: num(row.ActualInstrument || row.ActualIMC),
      simulatedInstrument: 0,
      crossCountry: num(row.CrossCountry || row.XC) || flightTime,
      landingsDay: int(row.DayLandings),
      landingsNight: int(row.NightLandings),
      approachCount: int(row.Approaches || row.ApproachCount),
      approachTypes: [],
      holds: int(row.Holds),
      turbineTime: flightTime,
      complexTime: flightTime,
      highPerformanceTime: flightTime,
      remarks: row.Remarks || row.Comments || "",
      source: "fvo",
      _blockOut: blockOut,
      _blockIn: blockIn,
      _crewRole: crewRole,
      _part: part,
      _raw: row,
    });

    // Duty period — if duty on/off times present
    if (dutyOn || dutyOff) {
      dutyPeriods.push({
        date,
        dutyStartLocal: dutyOn,
        dutyEndLocal: dutyOff,
        flightSegments: [{
          departure,
          destination,
          blockOut,
          blockIn,
          flightTime,
          crewRole,
          part,
        }],
        totalFlightHours: flightTime,
        source: "fvo",
      });
    }
  }

  return { entries, dutyPeriods, parseConfidence: 0.9 };
}

async function parseFVOpdf(pdfBuffer) {
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(pdfBuffer);
  const text = result.text || "";

  const entries = [];
  const dutyPeriods = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // FVO PDFs typically have tabular data with dates and flight info
  // Parse line-by-line looking for date patterns and flight data
  const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const icaoRe = /\b([A-Z]{3,4})\b/g;
  const timeRe = /(\d+\.\d)\s/g;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const airports = [];
    let m;
    while ((m = icaoRe.exec(line)) !== null) {
      if (m[1].length >= 3 && m[1].length <= 4) airports.push(m[1]);
    }

    const times = [];
    while ((m = timeRe.exec(line)) !== null) {
      times.push(parseFloat(m[1]));
    }

    if (airports.length >= 2 && times.length >= 1) {
      entries.push({
        date,
        aircraft: "PC12",
        tailNumber: "",
        aircraftCategory: "airplane",
        aircraftClass: "multi-engine land",
        departure: airports[0],
        destination: airports[airports.length - 1],
        route: airports.join("-"),
        totalTime: times[0],
        picTime: 0,
        sicTime: times[0],
        dualReceived: 0,
        dualGiven: 0,
        nightTime: 0,
        actualInstrument: 0,
        simulatedInstrument: 0,
        crossCountry: times[0],
        landingsDay: 1,
        landingsNight: 0,
        approachCount: 0,
        approachTypes: [],
        holds: 0,
        turbineTime: times[0],
        complexTime: times[0],
        highPerformanceTime: times[0],
        remarks: "",
        source: "fvo",
        _raw: line,
      });
    }
  }

  return { entries, dutyPeriods, parseConfidence: 0.6 };
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 10) / 10;
}

function int(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

module.exports = { parseFVO };
