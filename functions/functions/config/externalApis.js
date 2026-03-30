"use strict";

/**
 * externalApis.js — External API Endpoint Constants (41.3-T2)
 *
 * Single source of truth for all keyless external API endpoints.
 * No hardcoded URLs in service files — import from here.
 */

module.exports = {
  // Aviation — all free, no key required
  AVIATION_WEATHER_METAR: "https://aviationweather.gov/api/data/metar",
  AVIATION_WEATHER_TAF:   "https://aviationweather.gov/api/data/taf",
  AVIATION_WEATHER_PIREP: "https://aviationweather.gov/api/data/pirep",
  AVIATION_WEATHER_SIGMET: "https://aviationweather.gov/api/data/sigmet",
  AVIATION_WEATHER_WINDS: "https://aviationweather.gov/api/data/windtemp",
  AVIATION_WEATHER_ATIS:  "https://aviationweather.gov/api/data/atis",
  FAA_TFR_FEED:           "https://tfr.faa.gov/tfr2/list.html",
  FAA_CHARTS:             "https://aeronav.faa.gov/d-tpp",
  FAA_NASR:               "https://nasstatus.faa.gov",

  // Vehicle — free, no key required
  NHTSA_VIN_DECODE:       "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin",

  // Healthcare — all free, no key required
  NPPES_NPI:              "https://npiregistry.cms.hhs.gov/api",
  OPEN_FDA_DRUG:          "https://api.fda.gov/drug/label.json",
  OPEN_FDA_DEVICE:        "https://api.fda.gov/device/recall.json",
  NIH_NLM:                "https://clinicaltables.nlm.nih.gov/api",
  CMS_HOSPITAL:           "https://data.cms.gov/provider-data",
  HUD_FAIR_MARKET_RENTS:  "https://www.huduser.gov/portal/datasets/fmr.html",

  // Government — free, no key required
  CENSUS_ACS:             "https://api.census.gov/data",
  FEMA_FLOOD:             "https://msc.fema.gov/arcgis/rest/services",
  EPA_ENV:                "https://enviro.epa.gov/enviro/efservice",
  SNAPSHOT_VOTING:        "https://hub.snapshot.org/graphql",
};
