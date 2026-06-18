"use strict";

/**
 * aircraftLogbook.js — Vault record schema for an AIRCRAFT MAINTENANCE LOGBOOK.
 *
 * An aircraft's maintenance log is legally required to be permanent and
 * tamper-evident — which is exactly what a DTC + append-only logbook is. One
 * DTC per airframe; every maintenance action is an append-only event. MX /
 * Dispatch / CoPilot workers append; the owner/operator owns the record.
 *
 *   const A = require("../vault/schemas/aircraftLogbook");
 *   const { type, metadata } = A.mintInput({ aircraft });
 *   await mintDtc({ userId, tenantId, worker, type, metadata, createdByWorker });
 *   const { entryType, data } = A.event("inspection", { kind: "annual", facility, airframeHours, result });
 *   await appendEvent({ userId, dtcId, worker, entryType, data, createdByWorker });
 */

const TYPE = "aircraft_logbook";
const ASSET_CLASS = "Vehicles";

const EVENT_TYPES = {
  "inspection":          { label: "Inspection",        fields: ["kind", "facility", "airframeHours", "result", "date"] }, // kind: annual | 100hr | progressive | preflight
  "ad_sb.complied":      { label: "AD/SB complied",    fields: ["reference", "title", "method", "airframeHours", "recurring", "nextDue", "date"] },
  "component.replaced":  { label: "Component replaced",fields: ["component", "partNumber", "serialOff", "serialOn", "airframeHours", "date"] },
  "service":             { label: "Service",           fields: ["description", "facility", "airframeHours", "cost", "date"] },
  "squawk.opened":       { label: "Squawk opened",     fields: ["description", "severity", "mel", "date"] },
  "squawk.cleared":      { label: "Squawk cleared",    fields: ["description", "correctiveAction", "airframeHours", "date"] },
  "flight.logged":       { label: "Flight time",       fields: ["from", "to", "hobbs", "tach", "airframeHours", "date"] },
  "weight_balance.revised": { label: "Weight & balance revised", fields: ["emptyWeight", "cg", "date"] },
  "return_to_service":   { label: "Return to service", fields: ["mechanic", "certificate", "airframeHours", "date"] },
};

function mintInput({ aircraft }) {
  return {
    type: TYPE,
    metadata: {
      title: `${aircraft.tailNumber || "Aircraft"} — Maintenance Logbook`,
      tailNumber: aircraft.tailNumber || null,
      make: aircraft.make || null,
      model: aircraft.model || null,
      serialNumber: aircraft.serialNumber || null,
      year: aircraft.year || null,
      demo: !!aircraft.demo,
    },
  };
}

function isValidEvent(entryType) {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPES, entryType);
}

function event(entryType, data = {}) {
  const spec = EVENT_TYPES[entryType];
  const description = data.description || (spec
    ? `${spec.label}${data.kind ? ` · ${data.kind}` : ""}${data.reference ? ` · ${data.reference}` : ""}${data.airframeHours ? ` @ ${data.airframeHours}h` : ""}`
    : entryType);
  return { entryType, data: { ...data, description } };
}

module.exports = { TYPE, ASSET_CLASS, EVENT_TYPES, mintInput, event, isValidEvent };
