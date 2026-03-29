"use strict";

/**
 * Connector activation validator — tier gate.
 *
 * Free tier workers cannot activate paid connectors. This prevents
 * TitleApp absorbing data costs with no revenue offset.
 */

const { CONNECTORS } = require("../../config/connectors");

/**
 * Validate whether a connector can be activated for a given worker pricing tier.
 * @param {string} connectorId
 * @param {number|string} workerPricingTier - 0 = free, 29/49/79 = paid
 * @returns {{ allowed: boolean, reason?: string, alexMessage?: string }}
 */
function validateConnectorActivation(connectorId, workerPricingTier) {
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

  return { allowed: true };
}

module.exports = { validateConnectorActivation };
