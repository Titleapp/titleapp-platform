"use strict";

/**
 * aviation-aircraft-data.js — AFM/POH Performance Baselines (Memo 43.5a)
 *
 * Published AFM/POH reference values for Advisory Mode baseline only.
 * These are NOT substitutes for the subscriber's specific POH.
 * The studioLockerRequirements field on each CoPilot worker requires
 * the subscriber to upload their specific POH.
 *
 * Sources: Pilatus PC-12 NG AFM, Beechcraft King Air POH, Cessna Caravan POH
 */

const AIRCRAFT = {
  "av-pc12-ng": {
    aircraftType: "Pilatus PC-12 NG",
    slug: "av-pc12-ng",
    performance: {
      vmo_kias: 270,
      mmo: 0.48,
      serviceCeiling_ft: 30000,
      vmc_kias: 80,
      singleEngineCeiling_ft: null, // single engine aircraft
      fuelCapacity_lbs: 2932,
      typicalFuelBurn_lbs_hr: 580,
      maxTakeoffWeight_lbs: 10450,
      maxLandingWeight_lbs: 10450,
      basicEmptyWeight_lbs: 6074,
      usefulLoad_lbs: 4376,
    },
    wbLimits: {
      forwardCGLimit_in: 158.0,
      aftCGLimit_in: 166.0,
    },
    applicableFARs: ["91.103", "135.267", "135.293"],
    checklistCategories: [
      "preflight", "before_start", "engine_start", "before_taxi",
      "before_takeoff", "takeoff", "climb", "cruise", "descent",
      "approach", "before_landing", "after_landing", "shutdown",
      "emergency", "abnormal",
    ],
    qrhCategories: [
      "engine_failure", "fire", "pressurization", "electrical",
      "fuel_system", "flight_controls", "landing_gear", "ice_protection",
    ],
  },

  "av-king-air-350": {
    aircraftType: "Beechcraft King Air 350 (B300)",
    slug: "av-king-air-350",
    performance: {
      vmo_kias: 260,
      mmo: null,
      serviceCeiling_ft: 35000,
      vmc_kias: 97,
      singleEngineCeiling_ft: 18000,
      fuelCapacity_lbs: 5848,
      typicalFuelBurn_lbs_hr: 900,
      maxTakeoffWeight_lbs: 15000,
      maxLandingWeight_lbs: 15000,
      basicEmptyWeight_lbs: 9206,
      usefulLoad_lbs: 5794,
    },
    wbLimits: {
      forwardCGLimit_in: 214.0,
      aftCGLimit_in: 228.5,
    },
    applicableFARs: ["91.103", "135.267", "135.293", "135.99"],
    checklistCategories: [
      "preflight", "before_start", "engine_start", "before_taxi",
      "before_takeoff", "takeoff", "climb", "cruise", "descent",
      "approach", "before_landing", "after_landing", "shutdown",
      "emergency", "abnormal", "single_engine",
    ],
    qrhCategories: [
      "engine_failure", "engine_fire", "cabin_fire", "pressurization",
      "electrical", "fuel_system", "propeller", "flight_controls",
      "landing_gear", "ice_protection", "single_engine_approach",
    ],
  },

  "av-king-air-b200": {
    aircraftType: "Beechcraft King Air B200",
    slug: "av-king-air-b200",
    performance: {
      vmo_kias: 250,
      mmo: null,
      serviceCeiling_ft: 35000,
      vmc_kias: 93,
      singleEngineCeiling_ft: 16000,
      fuelCapacity_lbs: 5544,
      typicalFuelBurn_lbs_hr: 850,
      maxTakeoffWeight_lbs: 12500,
      maxLandingWeight_lbs: 12500,
      basicEmptyWeight_lbs: 7600,
      usefulLoad_lbs: 4900,
    },
    wbLimits: {
      forwardCGLimit_in: 209.0,
      aftCGLimit_in: 222.8,
    },
    applicableFARs: ["91.103", "135.267", "135.293"],
    checklistCategories: [
      "preflight", "before_start", "engine_start", "before_taxi",
      "before_takeoff", "takeoff", "climb", "cruise", "descent",
      "approach", "before_landing", "after_landing", "shutdown",
      "emergency", "abnormal", "single_engine",
    ],
    qrhCategories: [
      "engine_failure", "engine_fire", "cabin_fire", "pressurization",
      "electrical", "fuel_system", "propeller", "flight_controls",
      "landing_gear", "ice_protection", "single_engine_approach",
    ],
  },

  "av-king-air-c90": {
    aircraftType: "Beechcraft King Air C90GTx",
    slug: "av-king-air-c90",
    performance: {
      vmo_kias: 226,
      mmo: null,
      serviceCeiling_ft: 30000,
      vmc_kias: 89,
      singleEngineCeiling_ft: 12600,
      fuelCapacity_lbs: 3648,
      typicalFuelBurn_lbs_hr: 700,
      maxTakeoffWeight_lbs: 10485,
      maxLandingWeight_lbs: 10485,
      basicEmptyWeight_lbs: 6530,
      usefulLoad_lbs: 3955,
    },
    wbLimits: {
      forwardCGLimit_in: 199.0,
      aftCGLimit_in: 213.0,
    },
    applicableFARs: ["91.103", "135.267", "135.293"],
    checklistCategories: [
      "preflight", "before_start", "engine_start", "before_taxi",
      "before_takeoff", "takeoff", "climb", "cruise", "descent",
      "approach", "before_landing", "after_landing", "shutdown",
      "emergency", "abnormal", "single_engine",
    ],
    qrhCategories: [
      "engine_failure", "engine_fire", "cabin_fire", "pressurization",
      "electrical", "fuel_system", "propeller", "flight_controls",
      "landing_gear", "ice_protection", "single_engine_approach",
    ],
  },

  "av-caravan-208b": {
    aircraftType: "Cessna Caravan 208B",
    slug: "av-caravan-208b",
    performance: {
      vmo_kias: 175,
      mmo: null,
      serviceCeiling_ft: 25000,
      vmc_kias: null, // single engine aircraft
      singleEngineCeiling_ft: null, // single engine aircraft
      fuelCapacity_lbs: 2224,
      typicalFuelBurn_lbs_hr: 380,
      maxTakeoffWeight_lbs: 8750,
      maxLandingWeight_lbs: 8750,
      basicEmptyWeight_lbs: 4730,
      usefulLoad_lbs: 4020,
    },
    wbLimits: {
      forwardCGLimit_in: 141.0,
      aftCGLimit_in: 150.0,
    },
    applicableFARs: ["91.103", "135.267", "91.205"],
    checklistCategories: [
      "preflight", "before_start", "engine_start", "before_taxi",
      "before_takeoff", "takeoff", "climb", "cruise", "descent",
      "approach", "before_landing", "after_landing", "shutdown",
      "emergency", "abnormal",
    ],
    qrhCategories: [
      "engine_failure", "fire", "pressurization", "electrical",
      "fuel_system", "flight_controls", "landing_gear", "ice_protection",
    ],
  },
};

/**
 * Get aircraft data by worker slug.
 * @param {string} slug — e.g. "av-pc12-ng"
 * @returns {object|null}
 */
function getAircraftData(slug) {
  return AIRCRAFT[slug] || null;
}

/**
 * Get all aircraft types.
 * @returns {string[]}
 */
function getAllAircraftSlugs() {
  return Object.keys(AIRCRAFT);
}

module.exports = { AIRCRAFT, getAircraftData, getAllAircraftSlugs };
