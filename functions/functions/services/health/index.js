"use strict";

/**
 * Health service — barrel export (lazy-load pattern).
 */

module.exports = {
  get callWithHealthCheck() { return require("./callWithHealthCheck").callWithHealthCheck; },
  get getAllHealthStatuses() { return require("./callWithHealthCheck").getAllHealthStatuses; },
  get getServiceHealth() { return require("./callWithHealthCheck").getServiceHealth; },
  get getCachedNotams() { return require("./notamCache").getCachedNotams; },
  get invalidateNotamCache() { return require("./notamCache").invalidateNotamCache; },
  get getPollingStrategy() { return require("./adsbPolling").getPollingStrategy; },
  get ADSB_POLLING_STRATEGIES() { return require("./adsbPolling").ADSB_POLLING_STRATEGIES; },
};
