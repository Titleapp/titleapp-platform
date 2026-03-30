"use strict";

/**
 * Connector Registry — single source of truth for all available data connections.
 *
 * Every connector declares its vertical whitelist, cost estimate, tier requirement,
 * plain-language description, and underlying service name for the health monitor.
 *
 * Creators never see API keys, endpoints, or rate limits. Alex asks one question
 * per connector. Creator says yes or no. The worker is connected.
 *
 * requiresRaas: true means the connector is blocked unless the worker has raasStatus: "compliant".
 * This applies to all 6 aviation safety connectors.
 */

const CONNECTORS = {
  // ── AVIATION (6 safety connectors — all requiresRaas) ──
  aviationweather: {
    id: "aviationweather",
    label: "Live Weather",
    description: "Pulls live METARs, TAFs, winds aloft, and SIGMETs automatically when a pilot starts a session.",
    verticals: ["aviation"],
    costPerSession: 0.00,
    costLabel: "Free — FAA public data",
    tierRequired: "free",
    requiresRaas: true,
    serviceName: "aviationweather",
    envKey: null,
  },
  notamify: {
    id: "notamify",
    label: "NOTAM Briefings",
    description: "Fetches and summarizes current NOTAMs for departure, destination, and alternate airports.",
    verticals: ["aviation"],
    costPerSession: 0.60,
    costLabel: "~$0.60 per session (3 airports × $0.30)",
    tierRequired: "paid",
    requiresRaas: true,
    serviceName: "notamify",
    envKey: "NOTAMIFY_API_KEY",
  },
  adsb_exchange: {
    id: "adsb_exchange",
    label: "Live Fleet Tracking",
    description: "Shows real-time aircraft positions for dispatch and fleet monitoring.",
    verticals: ["aviation"],
    costPerSession: 0.002,
    costLabel: "~$0.002 per query — negligible",
    tierRequired: "paid",
    requiresRaas: true,
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
    requiresRaas: true,
    serviceName: "faa_charts",
    envKey: null,
  },
  faa_nasr: {
    id: "faa_nasr",
    label: "Airport & Airspace Data",
    description: "Provides runway lengths, frequencies, procedures, and airspace boundaries from the FAA national database.",
    verticals: ["aviation"],
    costPerSession: 0.00,
    costLabel: "Free — FAA public data",
    tierRequired: "free",
    requiresRaas: true,
    serviceName: "faa_nasr",
    envKey: null,
  },
  tfr_feed: {
    id: "tfr_feed",
    label: "TFR Alerts",
    description: "Pulls active Temporary Flight Restrictions from the FAA and alerts on route conflicts.",
    verticals: ["aviation"],
    costPerSession: 0.00,
    costLabel: "Free — FAA public data",
    tierRequired: "free",
    requiresRaas: true,
    serviceName: "tfr_feed",
    envKey: null,
  },

  // ── GOOGLE PLATFORM (cross-vertical) ──
  google_maps: {
    id: "google_maps",
    label: "Maps & Location",
    description: "Renders property locations, parcel boundaries, and market overlays on the Canvas map.",
    verticals: ["real-estate", "solar", "government", "aviation", "auto-dealer", "health-ems"],
    costPerSession: 0.014,
    costLabel: "~$0.014 per map load",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "google_maps",
    envKey: "GOOGLE_MAPS_API_KEY",
  },
  google_geocoding: {
    id: "google_geocoding",
    label: "Address Geocoding",
    description: "Converts addresses to coordinates and validates address accuracy.",
    verticals: ["real-estate", "solar", "government", "auto-dealer"],
    costPerSession: 0.005,
    costLabel: "~$0.005 per geocode",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "google_geocoding",
    envKey: "GOOGLE_MAPS_API_KEY",
  },
  google_timezone: {
    id: "google_timezone",
    label: "Time Zone",
    description: "Determines local time zone for any location — used for scheduling and duty time calculations.",
    verticals: ["aviation", "real-estate"],
    costPerSession: 0.005,
    costLabel: "~$0.005 per lookup",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "google_timezone",
    envKey: "GOOGLE_MAPS_API_KEY",
  },
  google_solar: {
    id: "google_solar",
    label: "Solar Roof Analysis",
    description: "Analyzes roof orientation, panel capacity, and annual energy output from a property address.",
    verticals: ["solar"],
    costPerSession: 0.02,
    costLabel: "~$0.02 per roof analysis",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "google_solar",
    envKey: "GOOGLE_MAPS_API_KEY",
  },
  google_weather: {
    id: "google_weather",
    label: "Weather Data",
    description: "Provides current conditions and forecasts for job site planning and scheduling.",
    verticals: ["solar", "real-estate"],
    costPerSession: 0.005,
    costLabel: "~$0.005 per lookup",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "google_weather",
    envKey: "GOOGLE_MAPS_API_KEY",
  },

  // ── REAL ESTATE ──
  realie: {
    id: "realie",
    label: "Property Records",
    description: "Pulls address, ownership, tax assessment, and valuation data from a single address input.",
    verticals: ["real-estate", "solar", "government", "mortgage"],
    costPerSession: 0.10,
    costLabel: "~$0.10 per property lookup",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "realie",
    envKey: "REALIE_API_KEY",
  },
  rentcast: {
    id: "rentcast",
    label: "Rental Market Data",
    description: "Provides live rent estimates, rental comps, and occupancy rates by zip code.",
    verticals: ["real-estate"],
    costPerSession: 0.06,
    costLabel: "~$0.06 per market lookup",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "rentcast",
    envKey: "RENTCAST_PROPERTY_DATA",
  },

  // ── FREE PUBLIC DATA (cross-vertical) ──
  fema_flood: {
    id: "fema_flood",
    label: "FEMA Flood Zones",
    description: "Shows flood zone designation and risk level for any parcel.",
    verticals: ["real-estate", "solar", "government"],
    costPerSession: 0.00,
    costLabel: "Free — FEMA public data",
    tierRequired: "free",
    requiresRaas: false,
    serviceName: "fema_flood",
    envKey: null,
  },
  us_census: {
    id: "us_census",
    label: "Census Demographics",
    description: "Provides median income, population trends, and employment data by zip code.",
    verticals: ["real-estate", "solar", "government"],
    costPerSession: 0.00,
    costLabel: "Free — Census public data",
    tierRequired: "free",
    requiresRaas: false,
    serviceName: "us_census",
    envKey: null,
  },
  hud_fmr: {
    id: "hud_fmr",
    label: "HUD Fair Market Rents",
    description: "Provides HUD fair market rent benchmarks by MSA for rental analysis.",
    verticals: ["real-estate"],
    costPerSession: 0.00,
    costLabel: "Free — HUD public data",
    tierRequired: "free",
    requiresRaas: false,
    serviceName: "hud_fmr",
    envKey: null,
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
    requiresRaas: false,
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
    requiresRaas: false,
    serviceName: "openfda",
    envKey: null,
  },

  // ── AUTO DEALER ──
  nhtsa_vin: {
    id: "nhtsa_vin",
    label: "VIN Decode",
    description: "Decodes any VIN into make, model, year, engine specs, and safety recalls instantly.",
    verticals: ["auto-dealer"],
    costPerSession: 0.00,
    costLabel: "Free — NHTSA public data",
    tierRequired: "free",
    requiresRaas: false,
    serviceName: "nhtsa",
    envKey: null,
  },
  vincario: {
    id: "vincario",
    label: "Vehicle Market Value",
    description: "Pulls current market value, stolen vehicle check, and 50+ extended specs via VIN.",
    verticals: ["auto-dealer"],
    costPerSession: 0.20,
    costLabel: "~$0.20 per VIN lookup",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "vincario",
    envKey: "VINCARIO_API_KEY",
  },

  // ── WEB3 ──
  helius: {
    id: "helius",
    label: "Solana Blockchain",
    description: "Reads wallet balances, transaction history, and token holdings from Solana via Helius.",
    verticals: ["web3"],
    costPerSession: 0.00,
    costLabel: "Free — included with God Key",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "helius",
    envKey: "HELIUS_API_KEY",
  },
  alchemy: {
    id: "alchemy",
    label: "Polygon Blockchain",
    description: "Reads equity records and cap table data from Polygon via Alchemy.",
    verticals: ["web3"],
    costPerSession: 0.00,
    costLabel: "Free — included with God Key",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "alchemy",
    envKey: "ALCHEMY_POLYGON_API_KEY",
  },
  snapshot: {
    id: "snapshot",
    label: "Governance Voting",
    description: "Reads Snapshot governance proposals, vote counts, and participation metrics.",
    verticals: ["web3"],
    costPerSession: 0.00,
    costLabel: "Free — public GraphQL",
    tierRequired: "free",
    requiresRaas: false,
    serviceName: "snapshot",
    envKey: null,
  },

  // ── COMMUNICATIONS (cross-vertical) ──
  sendgrid: {
    id: "sendgrid",
    label: "Email Delivery",
    description: "Sends transactional and campaign emails through SendGrid.",
    verticals: ["real-estate", "auto-dealer", "solar", "aviation", "web3", "health-ems", "government"],
    costPerSession: 0.00,
    costLabel: "Included with platform",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "sendgrid",
    envKey: "SENDGRID_API_KEY",
  },
  twilio: {
    id: "twilio",
    label: "SMS & Voice",
    description: "Sends SMS messages and handles voice calls through Twilio.",
    verticals: ["real-estate", "auto-dealer", "solar", "aviation", "web3", "health-ems", "government"],
    costPerSession: 0.01,
    costLabel: "~$0.01 per SMS",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "twilio",
    envKey: "TWILIO_ACCOUNT_SID",
  },

  // ── ACCOUNTING & FINANCE (cross-vertical) ──
  quickbooks: {
    id: "quickbooks",
    label: "QuickBooks",
    description: "Reads subscriber QuickBooks data — income, expenses, and property financials.",
    verticals: ["real-estate", "auto-dealer", "solar", "aviation"],
    costPerSession: 0.00,
    costLabel: "Free — subscriber authorizes access",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "quickbooks",
    envKey: "QB_CLIENT_ID",
  },
  plaid: {
    id: "plaid",
    label: "Bank Accounts",
    description: "Reads cash positions and transaction data from connected bank accounts via Plaid.",
    verticals: ["real-estate", "auto-dealer", "solar", "aviation"],
    costPerSession: 0.00,
    costLabel: "Free — subscriber authorizes access",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "plaid",
    envKey: null, // Future — Plaid keys not yet provisioned
  },
  stripe: {
    id: "stripe",
    label: "Stripe Revenue",
    description: "Reads MRR, subscriber count, churn, and revenue data from Stripe.",
    verticals: ["real-estate", "auto-dealer", "solar", "aviation", "web3"],
    costPerSession: 0.00,
    costLabel: "Included with platform",
    tierRequired: "paid",
    requiresRaas: false,
    serviceName: "stripe",
    envKey: "STRIPE_SECRET_KEY",
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
