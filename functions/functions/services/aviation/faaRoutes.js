"use strict";

/**
 * faaRoutes.js — FAA NFDC Preferred Routes lookup.
 *
 * v1: reads from a bundled, hand-curated JSON seed of ~25 common high-traffic
 *     preferred routes. Sufficient to wire up FlightPlanningCard end-to-end
 *     and prove the contract.
 *
 * v2 (follow-up): scheduled ingest of NASR PFR.txt every 28 days, upserted
 *     into Firestore `faaPreferredRoutes/{dep}_{arr}`. Read path tries
 *     Firestore first, falls back to seed.
 *
 * Endpoint:
 *   GET /v1/aviation:preferredRoutes?dep=KSEA&arr=KPDX[&aircraftType=TURBOJET]
 *
 * Response:
 *   { ok: true,
 *     dep, arr,
 *     count, routes: [{ route, altitudeMin, altitudeMax, aircraftType, areaHigh, distanceNm }],
 *     source: "seed" | "firestore",
 *     cycle: "YYYY-MM-DD" }
 *
 * Reference: https://www.fly.faa.gov/rmt/nfdc_preferred_routes_database.jsp
 */

const SEED = require("./data/preferredRoutes.seed.json");

let _db;
function getDb() {
  if (_db === undefined) {
    try {
      const admin = require("firebase-admin");
      _db = admin.firestore();
    } catch {
      _db = null;
    }
  }
  return _db;
}

function normIcao(s) {
  return String(s || "").trim().toUpperCase();
}

function matchesAircraftType(route, requested) {
  if (!requested) return true;
  const r = String(requested).toUpperCase();
  const t = String(route.aircraftType || "").toUpperCase();
  if (!t) return true;
  if (t === r) return true;
  // TURBOJET routes are typically open to both TURBOJET and TURBOPROP at compatible altitudes.
  if (t === "TURBOJET" && r === "TURBOPROP") return true;
  return false;
}

async function lookupRoutes({ dep, arr, aircraftType }) {
  const depIcao = normIcao(dep);
  const arrIcao = normIcao(arr);
  if (!depIcao || !arrIcao) {
    return { error: "dep and arr are required (ICAO codes, e.g. KSEA, KPDX)" };
  }
  if (depIcao.length < 3 || arrIcao.length < 3) {
    return { error: "dep and arr must be ICAO codes" };
  }

  // Try Firestore first (when ingested cycle is available).
  const db = getDb();
  let routes = null;
  let source = "seed";
  let cycle = SEED.cycle;
  if (db) {
    try {
      const docId = `${depIcao}_${arrIcao}`;
      const snap = await db.collection("faaPreferredRoutes").doc(docId).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (Array.isArray(data.routes) && data.routes.length > 0) {
          routes = data.routes;
          source = "firestore";
          cycle = data.cycle || cycle;
        }
      }
    } catch (e) {
      console.warn("faaRoutes firestore lookup failed (falling back to seed):", e.message);
    }
  }

  if (!routes) {
    routes = (SEED.routes || []).filter(r => normIcao(r.dep) === depIcao && normIcao(r.arr) === arrIcao);
  }

  if (aircraftType) {
    routes = routes.filter(r => matchesAircraftType(r, aircraftType));
  }

  return {
    dep: depIcao,
    arr: arrIcao,
    count: routes.length,
    routes: routes.map(r => ({
      route: r.route,
      altitudeMin: r.altitudeMin,
      altitudeMax: r.altitudeMax,
      aircraftType: r.aircraftType || null,
      areaHigh: r.areaHigh || null,
      distanceNm: r.distanceNm || null,
    })),
    source,
    cycle,
  };
}

async function handlePreferredRoutes(req, res) {
  const dep = req.query?.dep || req.body?.dep;
  const arr = req.query?.arr || req.body?.arr;
  const aircraftType = req.query?.aircraftType || req.body?.aircraftType;

  const result = await lookupRoutes({ dep, arr, aircraftType });

  if (result.error) {
    res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
    return;
  }

  res.status(200).json({ ok: true, ...result });
}

module.exports = {
  lookupRoutes,
  handlePreferredRoutes,
};
