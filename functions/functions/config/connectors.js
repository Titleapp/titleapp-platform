"use strict";

/**
 * Connector Registry — single source of truth for all available data connections.
 *
 * Every connector declares its vertical whitelist, cost estimate, tier requirement,
 * plain-language description, and underlying service name for the health monitor.
 *
 * Creators never see API keys, endpoints, or rate limits. Alex asks one question
 * per connector. Creator says yes or no. The worker is connected.
 */

const CONNECTORS = {
  // ── AVIATION ──
  aviation_weather: {
    id: "aviation_weather",
    label: "Live Weather",
    description: "Pulls live METARs, TAFs, winds aloft, and SIGMETs automatically when a pilot starts a session.",
    verticals: ["aviation"],
    costPerSession: 0.00,
    costLabel: "Free — FAA public data",
    tierRequired: "free",
    serviceName: "aviationweather",
    envKey: null,
  },
  notams: {
    id: "notams",
    label: "NOTAM Briefings",
    description: "Fetches and summarizes current NOTAMs for departure, destination, and alternate airports.",
    verticals: ["aviation"],
    costPerSession: 0.60,
    costLabel: "~$0.60 per session (3 airports × $0.30)",
    tierRequired: "paid",
    serviceName: "notamify",
    envKey: "NOTAMIFY_API_KEY",
  },
  adsb_tracking: {
    id: "adsb_tracking",
    label: "Live Fleet Tracking",
    description: "Shows real-time aircraft positions for dispatch and fleet monitoring.",
    verticals: ["aviation"],
    costPerSession: 0.002,
    costLabel: "~$0.002 per query — negligible",
    tierRequired: "paid",
    serviceName: "adsb_exchange",
    envKey: "ADSB_EXCHANGE_API_KEY",
  },
  faa_charts: {
    id: "faa_charts",
    label: "FAA Charts & Plates",
    description: "Provides access to current sectional charts, approach plates, and airport diagrams.",
    verticals: ["aviation"],
    costPerSession: 0.00,
    costLabel: "Free — FAA public data",
    tierRequired: "free",
    serviceName: "faa_charts",
    envKey: null,
  },

  // ── REAL ESTATE ──
  property_records: {
    id: "property_records",
    label: "Property Records",
    description: "Pulls address, ownership, tax assessment, and valuation data from a single address input.",
    verticals: ["real-estate", "solar", "government", "mortgage"],
    costPerSession: 0.10,
    costLabel: "~$0.10 per property lookup",
    tierRequired: "paid",
    serviceName: "realie",
    envKey: "REALIE_API_KEY",
  },
  rental_market: {
    id: "rental_market",
    label: "Rental Market Data",
    description: "Provides live rent estimates, rental comps, and occupancy rates by zip code.",
    verticals: ["real-estate"],
    costPerSession: 0.06,
    costLabel: "~$0.06 per market lookup",
    tierRequired: "paid",
    serviceName: "rentcast",
    envKey: "RENTCAST_PROPERTY_DATA",
  },
  maps_canvas: {
    id: "maps_canvas",
    label: "Maps & Location",
    description: "Renders property locations, parcel boundaries, and market overlays on the Canvas map.",
    verticals: ["real-estate", "solar", "government", "aviation", "auto-dealer", "health-ems"],
    costPerSession: 0.014,
    costLabel: "~$0.014 per map load",
    tierRequired: "paid",
    serviceName: "google_maps",
    envKey: "GOOGLE_MAPS_API_KEY",
  },

  // ── SOLAR ──
  solar_analysis: {
    id: "solar_analysis",
    label: "Solar Roof Analysis",
    description: "Analyzes roof orientation, panel capacity, and annual energy output from a property address.",
    verticals: ["solar"],
    costPerSession: 0.02,
    costLabel: "~$0.02 per roof analysis",
    tierRequired: "paid",
    serviceName: "google_solar",
    envKey: "GOOGLE_MAPS_API_KEY",
  },

  // ── HEALTHCARE / EMS ──
  provider_lookup: {
    id: "provider_lookup",
    label: "Provider Verification",
    description: "Verifies NPI numbers, credentials, and specialty for any US healthcare provider.",
    verticals: ["health-ems"],
    costPerSession: 0.00,
    costLabel: "Free — CMS public data",
    tierRequired: "free",
    serviceName: "nppes",
    envKey: null,
  },
  drug_reference: {
    id: "drug_reference",
    label: "Drug Reference",
    description: "Pulls FDA drug labels, dosing, contraindications, and recall alerts.",
    verticals: ["health-ems"],
    costPerSession: 0.00,
    costLabel: "Free — FDA public data",
    tierRequired: "free",
    serviceName: "openfda",
    envKey: null,
  },

  // ── AUTO DEALER ──
  vin_decode: {
    id: "vin_decode",
    label: "VIN Decode",
    description: "Decodes any VIN into make, model, year, engine specs, and safety recalls instantly.",
    verticals: ["auto-dealer"],
    costPerSession: 0.00,
    costLabel: "Free — NHTSA public data",
    tierRequired: "free",
    serviceName: "nhtsa",
    envKey: null,
  },
  vehicle_market_value: {
    id: "vehicle_market_value",
    label: "Vehicle Market Value",
    description: "Pulls current market value, stolen vehicle check, and 50+ extended specs via VIN.",
    verticals: ["auto-dealer"],
    costPerSession: 0.20,
    costLabel: "~$0.20 per VIN lookup",
    tierRequired: "paid",
    serviceName: "vincario",
    envKey: "VINCARIO_API_KEY",
  },

  // ── ACCOUNTING (cross-vertical) ──
  quickbooks: {
    id: "quickbooks",
    label: "QuickBooks",
    description: "Reads subscriber QuickBooks data — income, expenses, and property financials.",
    verticals: ["real-estate", "auto-dealer", "solar", "aviation"],
    costPerSession: 0.00,
    costLabel: "Free — subscriber authorizes access",
    tierRequired: "paid",
    serviceName: "quickbooks",
    envKey: "QB_CLIENT_ID",
  },
};

/**
 * Get connectors available for a vertical.
 * @param {string} vertical
 * @returns {Object[]}
 */
function getConnectorsForVertical(vertical) {
  return Object.values(CONNECTORS).filter(c => c.verticals.includes(vertical));
}

/**
 * Get estimated cost per session for a set of connector IDs.
 * @param {string[]} connectorIds
 * @returns {number}
 */
function estimateSessionCost(connectorIds) {
  return connectorIds.reduce((sum, id) => sum + (CONNECTORS[id]?.costPerSession || 0), 0);
}

module.exports = { CONNECTORS, getConnectorsForVertical, estimateSessionCost };
