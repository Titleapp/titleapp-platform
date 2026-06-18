"use strict";

/**
 * Vault record-schema registry (#60). Each schema defines a DTC `TYPE`, its
 * Vault `ASSET_CLASS`, the valid append-only `EVENT_TYPES`, and helpers
 * (`mintInput`, `event`) that produce the inputs for vaultWriter.mintDtc /
 * appendEvent. Add a vertical's record schema here and the worker wiring is
 * a few lines.
 */

const studentRecord = require("./studentRecord");
const aircraftLogbook = require("./aircraftLogbook");
const pilotCurrency = require("./pilotCurrency");

const SCHEMAS = {
  [studentRecord.TYPE]: studentRecord,
  [aircraftLogbook.TYPE]: aircraftLogbook,
  [pilotCurrency.TYPE]: pilotCurrency,
};

function getSchema(type) {
  return SCHEMAS[type] || null;
}

module.exports = { SCHEMAS, getSchema, studentRecord, aircraftLogbook, pilotCurrency };
