const { onRequest } = require("firebase-functions/v2/https");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REPORT_JOBS_TOPIC = "report-jobs";

// ----------------------------
// Helpers
// ----------------------------

// 🔑 NORMALIZE ROUTE: strip /v1 prefix if present
function getRoute(req) {
  let p = req.path || "/";
  if (p.startsWith("/v1/")) {
    p = p.slice(3); // "/v1/admin/import" → "/admin/import"
  }
  return p;
}

function jsonError(res, status, error, extra = {}) {
  console.error("❌ API ERROR:", status, error, extra);
  return res.status(status).json({ ok: false, error, ...extra });
}

function getAuthBearerToken(req) {
  const raw = req.headers?.authorization || "";
  const parts = raw.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

async function requireFirebaseUser(req, res) {
  const token = getAuthBearerToken(req);
  if (!token) {
    jsonError(res, 401, "Unauthorized", { reason: "Missing bearer token" });
    return { handled: true };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      handled: false,
      user: {
        uid: decoded.uid,
        email: decoded.email,
      },
    };
  } catch (e) {
    jsonError(res, 401, "Unauthorized", { reason: "Invalid token" });
    return { handled: true };
  }
}

async function requireMembershipIfNeeded({ uid, tenantId }, res) {
  console.log("🔍 Membership check:", { uid, tenantId });

  if (!tenantId || tenantId === "public") {
    console.log("✅ Public tenant — membership bypass");
    return { ok: true };
  }

  const snap = await db
    .collection("memberships")
    .where("userId", "==", uid)
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) {
    return jsonError(res, 403, "Forbidden", {
      reason: "No active membership",
      uid,
      tenantId,
    });
  }

  console.log("✅ Membership OK");
  return { ok: true };
}

function getCtx(req, body, user) {
  const tenantId = req.headers["x-tenant-id"] || body.tenantId || "public";

  return {
    tenantId,
    userId: user.uid,
    email: user.email,
  };
}

// ----------------------------
// API
// ----------------------------
exports.api = onRequest(async (req, res) => {
  // VERSION MARKER (so we can prove this deployed)
  console.log("✅ API_VERSION", "2026-01-28-routefix-1");

  const route = getRoute(req);
  const method = req.method;
  const body = req.body || {};

  console.log("➡️ REQUEST:", { route, method });

  const auth = await requireFirebaseUser(req, res);
  if (auth.handled) return;

  const user = auth.user;
  const ctx = getCtx(req, body, user);

  console.log("🧠 CTX:", ctx);

  const gate = await requireMembershipIfNeeded(
    { uid: user.uid, tenantId: ctx.tenantId },
    res
  );
  if (!gate.ok) return;

  // ----------------------------
  // ADMIN IMPORT
  // ----------------------------
  if (route === "/admin/import" && method === "POST") {
    console.log("📥 IMPORT BODY KEYS:", Object.keys(body));

    if (!body.type || !body.csvText) {
      return jsonError(res, 400, "Missing type or csvText");
    }

    const ref = await db.collection("imports").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: body.type,
      source: body.source || {},
      mode: body.mode || "upsert",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      rowCount: body.csvText.split("\n").length - 1,
      status: "completed",
    });

    return res.json({
      ok: true,
      importId: ref.id,
      rows: body.csvText.split("\n").length - 1,
    });
  }

  if (route === "/admin/imports" && method === "GET") {
    const snap = await db
      .collection("imports")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    return res.json({
      ok: true,
      items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  }

  return jsonError(res, 404, "Unknown endpoint", { route, method });
});
