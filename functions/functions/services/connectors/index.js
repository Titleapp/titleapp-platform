"use strict";

/**
 * Connector service — barrel export (lazy-load pattern).
 */

module.exports = {
  get validateConnectorActivation() {
    return require("./validator").validateConnectorActivation;
  },
  get CONNECTORS() {
    return require("../../config/connectors").CONNECTORS;
  },
  get getConnectorsForVertical() {
    return require("../../config/connectors").getConnectorsForVertical;
  },
  get estimateSessionCost() {
    return require("../../config/connectors").estimateSessionCost;
  },
};
