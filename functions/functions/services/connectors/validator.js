"use strict";

/**
 * Connector activation validator — tier gate + raasStatus gate.
 *
 * Free tier workers cannot activate paid connectors.
 * Aviation safety connectors require raasStatus: "compliant".
 */

const { CONNECTORS } = require("../../config/connectors");

const RAAS_REQUIRED_CONNECTORS = [
  "notamify", "aviationweather", "adsb_exchange",
  "faa_charts", "faa_nasr", "tfr_feed",
];

/**
 * Validate whether a connector can be activated for a given worker.
 * @param {string} connectorId
 * @param {number|string} workerPricingTier - 0 = free, 29/49/79 = paid
 * @param {Object} [workerDoc] - full Firestore worker document (needed for raasStatus check)
 * @returns {{ allowed: boolean, reason?: string, alexMessage?: string, error?: string }}
 */
function validateConnectorActivation(connectorId, workerPricingTier, workerDoc) {
  const connector = CONNECTORS[connectorId];
  if (!connector) return { allowed: false, reason: "Unknown connector" };

  const tier = Number(workerPricingTier) || 0;
  if (connector.tierRequired === "paid" && tier === 0) {
    return {
      allowed: false,
      reason: `${connector.label} is a paid data connection. Upgrade this worker to $29 or above to activate it.`,
      alexMessage: `${connector.label} needs a paid worker tier. Want to upgrade to $29/mo so I can connect it?`,
    };
  }

  // raasStatus gate — aviation safety connectors require RAAS compliance
  if (RAAS_REQUIRED_CONNECTORS.includes(connectorId)) {
    const raasStatus = (workerDoc && workerDoc.raasStatus) || "pending";
    if (raasStatus !== "compliant") {
      return {
        allowed: false,
        error: "RAAS_NOT_COMPLIANT",
        reason: "This worker must complete RAAS review before activating safety data connectors.",
        alexMessage: "This worker needs to pass RAAS foundation review before I can connect safety data sources. Contact platform support to initiate review.",
      };
    }
  }

  return { allowed: true };
}

module.exports = { validateConnectorActivation, RAAS_REQUIRED_CONNECTORS };
