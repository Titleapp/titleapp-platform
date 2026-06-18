"use strict";

/**
 * pilotCurrency.js — Vault record schema for a PILOT's CURRENCY & LOGBOOK.
 *
 * The things that keep a pilot legal all EXPIRE — medical, flight review, IPC,
 * recurrent, 90-day passenger currency, type currency. That makes this the
 * highest-value record on the platform: it pairs directly with the Vault's
 * "needs attention" panel + the AIRAC currency engine (#56) to warn a pilot
 * BEFORE anything lapses. One DTC per pilot; each event carries a `nextDue` so
 * the dashboard can surface it.
 *
 * Events set metadata.nextDue/expires on the DTC (via a refresh) OR carry their
 * own nextDue in the event data — the Vault attention scan reads both.
 */

const TYPE = "pilot_currency";
const ASSET_CLASS = "Education";

const EVENT_TYPES = {
  "medical.issued":      { label: "Medical certificate", fields: ["class", "examiner", "issued", "expires", "restrictions"] },
  "flight_review":       { label: "Flight review (BFR)", fields: ["instructor", "date", "nextDue"] },
  "ipc":                 { label: "Instrument proficiency check", fields: ["instructor", "date", "nextDue"] },
  "recurrent":           { label: "Recurrent training", fields: ["aircraftType", "facility", "date", "nextDue"] },
  "type_rating.added":   { label: "Type rating added", fields: ["aircraftType", "date"] },
  "currency.landings":   { label: "90-day currency (landings)", fields: ["category", "count", "date", "nextDue"] },
  "checkride":           { label: "Checkride", fields: ["certificate", "examiner", "result", "date"] },
};

function mintInput({ pilot }) {
  return {
    type: TYPE,
    metadata: {
      title: `${pilot.name || "Pilot"} — Currency & Logbook`,
      name: pilot.name || null,
      airmanCertNo: pilot.airmanCertNo || null,
      ratings: pilot.ratings || [],
      // The soonest-expiring item drives the dashboard warning; refresh as
      // events are appended.
      expires: pilot.medicalExpires || null,
      nextDue: pilot.nextDue || null,
      demo: !!pilot.demo,
    },
  };
}

function isValidEvent(entryType) {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPES, entryType);
}

function event(entryType, data = {}) {
  const spec = EVENT_TYPES[entryType];
  const due = data.nextDue || data.expires;
  const description = data.description || (spec
    ? `${spec.label}${data.aircraftType ? ` · ${data.aircraftType}` : ""}${due ? ` · next due ${due}` : ""}`
    : entryType);
  return { entryType, data: { ...data, description } };
}

module.exports = { TYPE, ASSET_CLASS, EVENT_TYPES, mintInput, event, isValidEvent };
