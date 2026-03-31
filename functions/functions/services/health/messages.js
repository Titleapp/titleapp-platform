"use strict";

/**
 * Alex Plain-Language Error Messages — consolidated from apiHealth/messages.js (41.3-T2).
 *
 * When callWithHealthCheck() returns ok: false, the calling service passes
 * serviceName to getErrorMessage(). Alex uses this instead of showing
 * technical errors. Alex NEVER says "API error", "503", or any technical language.
 */

const ERROR_MESSAGES = {
  aviationweather: {
    message: "Weather data is temporarily unavailable. For current METARs check aviationweather.gov directly. I'll continue with the information I have.",
    fallbackAction: "continue_without_weather",
  },
  notamify: {
    message: "NOTAM data is temporarily unavailable. Check notams.faa.gov for current NOTAMs before your flight. I'll flag this in your preflight summary.",
    fallbackAction: "flag_gap_in_preflight",
  },
  adsb_exchange: {
    message: "Live tracking is temporarily offline. Last known positions were cached recently. I'll show you the last available data.",
    fallbackAction: "show_cached_positions",
  },
  realie: {
    message: "Property records aren't loading right now. If you have the property details handy, paste them in and I'll work with what you have.",
    fallbackAction: "accept_manual_input",
  },
  rentcast: {
    message: "Rental market data is temporarily unavailable. I can provide general market context while the connection is restored.",
    fallbackAction: "use_cached_averages",
  },
  vincario: {
    message: "VIN lookup is unavailable right now. Enter the vehicle details manually and I'll build the report from what you provide.",
    fallbackAction: "accept_manual_input",
  },
  helius: {
    message: "Blockchain record logging is temporarily paused. Your session is being saved and records will be minted when the connection is restored. No data is lost.",
    fallbackAction: "queue_for_retry",
  },
  crossmint: {
    message: "Token minting is temporarily unavailable. Your assets are queued and will be minted automatically when the service recovers.",
    fallbackAction: "queue_for_retry",
  },
  google_maps: {
    message: "Map data is temporarily unavailable. I can still provide address-based analysis without the visual overlay.",
    fallbackAction: "continue_without_map",
  },
  nppes: {
    message: "Provider verification is temporarily unavailable. I'll note this in the session record and you can verify manually at npiregistry.cms.hhs.gov.",
    fallbackAction: "flag_for_manual_verification",
  },
  fal_ai: {
    message: "Image generation is temporarily unavailable. I'll continue building your worker and you can add visuals when the service recovers.",
    fallbackAction: "continue_without_image",
  },
  nhtsa: {
    message: "Vehicle data lookup is temporarily unavailable. Enter the vehicle details manually and I'll proceed with what you provide.",
    fallbackAction: "accept_manual_input",
  },
  faa_airmen: {
    message: "FAA certificate verification is temporarily unavailable. I'll note this for manual review.",
    fallbackAction: "flag_for_manual_verification",
  },
};

/**
 * Get plain-language error message for a failed service.
 * @param {string} serviceName
 * @returns {{ message: string, fallbackAction: string }}
 */
function getErrorMessage(serviceName) {
  return ERROR_MESSAGES[serviceName] || {
    message: "This data source is temporarily unavailable. I'll continue with the information I have and note the gap.",
    fallbackAction: "continue_with_gap",
  };
}

module.exports = { getErrorMessage, ERROR_MESSAGES };
