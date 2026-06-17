"use strict";

/**
 * regions.js — Operating-area registry for downloadable nav databases.
 *
 * Each region is a named bounding box (the user's "operating area" in the
 * ForeFlight model). The packager snapshots FAA NASR within each bbox per AIRAC
 * cycle. bbox = [xmin(lonW), ymin(latS), xmax(lonE), ymax(latN)] in WGS84.
 *
 * Seed set covers common US operating areas; add regions here as users need
 * them (this is intentionally data, not code logic).
 */

const REGIONS = {
  hawaii: {
    label: "Hawaii",
    description: "All Hawaiian islands (PHNL, PHOG, PHKO, PHTO, PHLI …)",
    bbox: [-160.3, 18.85, -154.75, 22.35],
  },
  southwest: {
    label: "Southwest (NV / AZ / UT)",
    description: "Las Vegas, Phoenix, Salt Lake operating area",
    bbox: [-120.0, 31.3, -108.9, 42.1],
  },
  socal: {
    label: "Southern California",
    description: "LA Basin, San Diego, desert",
    bbox: [-121.0, 32.45, -114.1, 35.85],
  },
  norcal: {
    label: "Northern California",
    description: "Bay Area, Sacramento, Sierra",
    bbox: [-124.5, 35.8, -118.0, 42.1],
  },
  northeast: {
    label: "Northeast Corridor",
    description: "NYC, Boston, Philadelphia, DC",
    bbox: [-77.7, 38.5, -69.8, 43.2],
  },
  florida: {
    label: "Florida",
    description: "Miami, Orlando, Tampa, Keys",
    bbox: [-87.7, 24.3, -79.9, 31.1],
  },
};

function getRegion(key) {
  return REGIONS[String(key || "").toLowerCase()] || null;
}

function listRegions() {
  return Object.entries(REGIONS).map(([key, r]) => ({ key, label: r.label, description: r.description, bbox: r.bbox }));
}

module.exports = { REGIONS, getRegion, listRegions };
