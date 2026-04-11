"use strict";

/**
 * Platform Inventory Service — PearX S26 Doc 1.4
 *
 * Live inventory of all digital workers and API integrations.
 * Three endpoints:
 *   GET  /v1/inventory:data         — JSON inventory (admin bearer OR investor token)
 *   GET  /v1/inventory:snapshot     — PDF export (same auth)
 *   POST /v1/inventory:rotateToken  — Rotate investor token (admin only)
 */

const admin = require("firebase-admin");
const crypto = require("crypto");
const { CONNECTORS } = require("../config/connectors");
const { sendError, sendOk, CODES } = require("../helpers/apiResponse");

function getDb() { return admin.firestore(); }

// ── Connector categories (derived from connectors.js structure) ──────────

const CONNECTOR_CATEGORIES = [
  { name: "Aviation Safety", ids: ["aviationweather", "notamify", "adsb_exchange", "faa_charts", "faa_nasr", "tfr_feed"] },
  { name: "Google Platform", ids: ["google_maps", "google_geocoding", "google_timezone", "google_solar", "google_weather"] },
  { name: "Real Estate", ids: ["realie", "rentcast"] },
  { name: "Public Data", ids: ["fema_flood", "us_census", "hud_fmr"] },
  { name: "Healthcare & EMS", ids: ["provider_lookup", "drug_reference"] },
  { name: "Auto Dealer", ids: ["nhtsa_vin", "vincario"] },
  { name: "Web3 & Blockchain", ids: ["helius", "alchemy", "snapshot", "crossmint"] },
  { name: "Communications", ids: ["sendgrid", "twilio"] },
  { name: "Finance & Accounting", ids: ["quickbooks", "plaid", "stripe"] },
  { name: "Social & Marketing", ids: ["meta_posting", "tiktok_posting", "unified", "google_business_posting", "linkedin_posting"] },
];

// ── Vertical display names ──────────────────────────────────────────────

const VERTICAL_DISPLAY = {
  "aviation": "Aviation",
  "real-estate-development": "Real Estate Development",
  "auto-dealer": "Auto Dealer",
  "government": "Government",
  "platform": "Platform (Business in a Box)",
  "real-estate-professional": "Real Estate Professional",
  "solar-energy": "Solar Energy",
  "web3": "Web3 Projects",
  "health-ems": "Health & EMS",
};

// ── Auth: bearer token OR investor query param ──────────────────────────

async function validateInventoryAccess(req) {
  // Check bearer token first
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
      return { authorized: true, source: "admin", userId: decoded.uid };
    } catch (e) { /* fall through to token check */ }
  }
  // Check investor token
  const token = req.query.token;
  if (token && token.length >= 16) {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const snap = await getDb().doc("platform/inventoryAccess").get();
    if (snap.exists) {
      const data = snap.data();
      if (data.tokenHash === hash) {
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          return { authorized: false, error: "Token expired" };
        }
        return { authorized: true, source: "investor", label: data.label || "investor" };
      }
    }
    return { authorized: false, error: "Invalid token" };
  }
  // Public access — inventory is visible to everyone
  return { authorized: true, source: "public" };
}

// ── Data gathering (shared between JSON and PDF) ────────────────────────

async function gatherInventoryData() {
  const db = getDb();

  // 1. Query all digitalWorkers
  const workersSnap = await db.collection("digitalWorkers").get();
  const workersByVertical = {};
  let liveCount = 0;
  let devCount = 0;

  workersSnap.forEach((doc) => {
    const w = doc.data();
    const vertical = w.vertical || "unknown";
    if (!workersByVertical[vertical]) {
      workersByVertical[vertical] = { name: VERTICAL_DISPLAY[vertical] || vertical, key: vertical, live: 0, development: 0, total: 0, workers: [] };
    }
    const bucket = workersByVertical[vertical];
    const status = w.status || "development";
    if (status === "live") { bucket.live++; liveCount++; }
    else { bucket.development++; devCount++; }
    bucket.total++;
    bucket.workers.push({
      slug: doc.id,
      name: w.name || doc.id,
      status,
      suite: w.suite || "",
      type: w.type || "standalone",
      price: w.price_tier || "FREE",
    });
  });

  // Sort workers within each vertical: live first, then alphabetical
  for (const v of Object.values(workersByVertical)) {
    v.workers.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Sort verticals by live count descending
  const verticals = Object.values(workersByVertical).sort((a, b) => b.live - a.live);

  // 2. Build integrations from CONNECTORS constant
  const integrationCategories = CONNECTOR_CATEGORIES.map((cat) => ({
    name: cat.name,
    count: cat.ids.length,
    connectors: cat.ids.map((id) => {
      const c = CONNECTORS[id];
      if (!c) return null;
      return {
        id: c.id,
        label: c.label,
        tier: c.tierRequired === "free" ? "Free" : "Paid",
        verticals: c.verticals,
      };
    }).filter(Boolean),
  }));
  const totalIntegrations = integrationCategories.reduce((sum, cat) => sum + cat.count, 0);

  // 3. Query recent contentSync events (last 10)
  let recentChanges = [];
  try {
    const eventsSnap = await db
      .collection("platform").doc("contentSync").collection("events")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();
    eventsSnap.forEach((doc) => {
      const e = doc.data();
      recentChanges.push({
        eventType: e.event_type,
        workerId: e.worker_id,
        workerName: e.name || e.worker_id,
        vertical: e.vertical,
        timestamp: e.timestamp?.toDate?.()?.toISOString() || null,
      });
    });
  } catch (e) {
    console.warn("[platformInventory] contentSync query failed:", e.message);
  }

  return {
    summary: {
      liveWorkers: liveCount,
      developmentWorkers: devCount,
      totalWorkers: liveCount + devCount,
      totalVerticals: verticals.length,
      totalIntegrations,
      lastUpdated: new Date().toISOString(),
    },
    verticals,
    integrations: { categories: integrationCategories, totalCount: totalIntegrations },
    recentChanges,
  };
}

// ── GET /v1/inventory:data ──────────────────────────────────────────────

async function getInventoryData(req, res) {
  const auth = await validateInventoryAccess(req);
  if (!auth.authorized) {
    return sendError(res, 401, CODES.UNAUTHORIZED, auth.error || "Unauthorized");
  }

  try {
    const data = await gatherInventoryData();

    // Non-admin view: strip individual worker names and development details
    if (auth.source !== "admin") {
      for (const v of data.verticals) {
        delete v.workers;
        delete v.development;
      }
      delete data.recentChanges;
    }

    return sendOk(res, { ...data, accessSource: auth.source });
  } catch (e) {
    console.error("[platformInventory] getInventoryData failed:", e);
    return sendError(res, 500, CODES.INTERNAL_ERROR, "Failed to load inventory");
  }
}

// ── GET /v1/inventory:snapshot — PDF export ─────────────────────────────

async function getInventorySnapshot(req, res) {
  const auth = await validateInventoryAccess(req);
  if (!auth.authorized) {
    return sendError(res, 401, CODES.UNAUTHORIZED, auth.error || "Unauthorized");
  }

  try {
    const data = await gatherInventoryData();
    const { generateInventorySnapshot } = require("./documentEngine/generators/inventorySnapshotPdf");
    const buffer = await generateInventorySnapshot(data);
    const today = new Date().toISOString().slice(0, 10);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="TitleApp_Platform_Inventory_${today}.pdf"`);
    return res.send(buffer);
  } catch (e) {
    console.error("[platformInventory] getInventorySnapshot failed:", e);
    return sendError(res, 500, CODES.INTERNAL_ERROR, "Failed to generate snapshot");
  }
}

// ── POST /v1/inventory:rotateToken — Admin-only ─────────────────────────

async function rotateInventoryToken(req, res) {
  try {
    const rawToken = crypto.randomBytes(16).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const label = req.body?.label || "Investor Access";

    await getDb().doc("platform/inventoryAccess").set({
      tokenHash,
      label,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null,
    });

    return sendOk(res, {
      token: rawToken,
      label,
      note: "Store this token securely. It will not be shown again.",
    });
  } catch (e) {
    console.error("[platformInventory] rotateInventoryToken failed:", e);
    return sendError(res, 500, CODES.INTERNAL_ERROR, "Failed to rotate token");
  }
}

module.exports = { getInventoryData, getInventorySnapshot, rotateInventoryToken, gatherInventoryData };
