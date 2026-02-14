const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Stripe (Identity)
const Stripe = require("stripe");

// RAAS handlers (v0)
const {
  handleRaasWorkflows,
  handleRaasCatalogUpsert,
  handleRaasPackagesCreate,
  handleRaasPackagesBindFiles,
  handleRaasPackagesGet,
} = require("./raas/raas.handlers");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ✅ Real Firebase Storage bucket (enabled in console)
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";

// Stripe keys (set via env / secrets)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Create Stripe client lazily so local dev without keys doesn't crash unless used
function getStripe() {
  if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

// ----------------------------
// Helpers
// ----------------------------

function getRoute(req) {
  // Supports BOTH:
  // 1) direct backend calls: /v1/<endpoint>
  // 2) Cloudflare Frontdoor contract: /api?path=/v1/<endpoint>
  let p = req.path || "/";

  // If frontdoor forwards /api without rewriting the path,
  // the intended backend route is in the querystring.
  if (p === "/api") {
    const q = req.query || {};
    const qp = (q.path || q.p || q.route || "").toString();
    if (qp) p = qp;
  }

  if (p.startsWith("/v1/")) p = p.slice(3);
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
  if (!token)
    return {
      handled: true,
      user: null,
      res: jsonError(res, 401, "Unauthorized", { reason: "Missing bearer token" }),
    };

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { handled: false, user: decoded };
  } catch (e) {
    return {
      handled: true,
      user: null,
      res: jsonError(res, 401, "Unauthorized", { reason: "Invalid token" }),
    };
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
    return jsonError(res, 403, "Forbidden", { reason: "No active membership", uid, tenantId });
  }

  const mem = snap.docs[0].data() || {};
  console.log("✅ Membership OK");
  return { ok: true, membership: { id: snap.docs[0].id, ...mem } };
}

function getCtx(req, body, user) {
  // NOTE: tenantId is always derived from x-tenant-id header (preferred).
  // body.tenantId remains accepted for backwards compatibility with older clients.
  const tenantId = (req.headers["x-tenant-id"] || body.tenantId || "public").toString().trim();
  return { tenantId, userId: user.uid, email: user.email || null };
}

function sanitizeFilename(name) {
  const base = String(name || "upload").split("/").pop().split("\\").pop();
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function yyyymm() {
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return { yyyy, mm };
}

function getBucket() {
  return admin.storage().bucket(STORAGE_BUCKET);
}

// ✅ Backward compatible: accept both {storage:{path}} and {storagePath}
function getPathFromMeta(meta) {
  return (meta && meta.storage && meta.storage.path) || meta.storagePath || null;
}

function slugifyTenantId(name) {
  const base = String(name || "workspace").trim().toLowerCase();
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "workspace";
}

function nowServerTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function identityDocId({ uid, tenantId, purpose }) {
  const p = String(purpose || "general").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return `idv_${uid}_${tenantId}_${p}`.slice(0, 200);
}

// ----------------------------
// RAAS Validation Gate
// ----------------------------

async function validateAgainstRaas(tenantId, type, row) {
  // Define required fields per entity type
  const required = {
    customers: ["externalId", "firstName", "lastName"],
    inventory: ["vin", "year", "make", "model"],
    service_appointments: ["customerId", "date"],
    sales: ["customerId", "vin", "saleDate"],
    trade_ins: ["customerId", "vin"],
    workflow_input: [], // workflows have variable schemas — validated by RAAS handlers
  };

  const fields = required[type] || [];
  const missing = fields.filter((f) => !row[f]);

  if (missing.length > 0) {
    return {
      valid: false,
      reason: `Missing required fields for type '${type}': ${missing.join(", ")}`,
    };
  }

  return { valid: true };
}

// ----------------------------
// API
// ----------------------------

exports.api = onRequest(
  // IMPORTANT: we need rawBody for Stripe webhook signature verification
  { region: "us-central1" },
  async (req, res) => {
    console.log("✅ API_VERSION", "2026-02-14-audit-fixes-complete");

    const route = getRoute(req);
    const method = req.method;
    const body = req.body || {};

    console.log("➡️ REQUEST:", { route, method });

    // Stripe webhook is special: no Firebase auth, signature verified instead.
    if (route === "/stripe:webhook" && method === "POST") {
      if (!STRIPE_WEBHOOK_SECRET) return jsonError(res, 500, "Missing STRIPE_WEBHOOK_SECRET");

      let event;
      try {
        // In firebase-functions v2, rawBody should exist on req
        const raw = req.rawBody;
        const sig = req.headers["stripe-signature"];
        if (!raw || !sig) return jsonError(res, 400, "Missing rawBody or stripe-signature");

        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
      } catch (e) {
        console.error("❌ Stripe webhook signature verify failed:", e?.message || e);
        return jsonError(res, 400, "Webhook signature verification failed");
      }

      try {
        const type = event.type;
        const obj = event.data?.object || {};
        // We rely on metadata set at session create
        const md = obj.metadata || {};
        const uid = md.userId || md.uid || null;
        const tenantId = md.tenantId || "public";
        const purpose = md.purpose || "general";
        const sessionId = obj.id;

        // Stripe Identity status fields
        const status = obj.status || null; // e.g. "requires_input" | "processing" | "verified" | "canceled"
        const lastError = obj.last_error || null;

        if (uid) {
          const docId = identityDocId({ uid, tenantId, purpose });

          // FIX: Use update() instead of set with merge for existing docs
          const docRef = db.collection("identityVerifications").doc(docId);
          const docSnap = await docRef.get();

          if (!docSnap.exists) {
            // First time — create with all fields
            await docRef.set({
              uid,
              tenantId,
              purpose,
              stripeSessionId: sessionId,
              stripeEventType: type,
              stripeStatus: status,
              lastError,
              createdAt: nowServerTs(),
              updatedAt: nowServerTs(),
            });
          } else {
            // Subsequent webhook — explicit field update only
            await docRef.update({
              stripeEventType: type,
              stripeStatus: status,
              lastError,
              updatedAt: nowServerTs(),
            });
          }

          // Also update user summary — explicit field update
          const userRef = db.collection("users").doc(uid);
          await userRef.set(
            {
              identity: {
                [purpose]: {
                  tenantId,
                  stripeSessionId: sessionId,
                  stripeStatus: status,
                  updatedAt: nowServerTs(),
                },
              },
            },
            { merge: true } // OK here: users collection is not append-only ledger
          );
        }

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ Stripe webhook handler error:", e);
        return jsonError(res, 500, "Webhook handler failed");
      }
    }

    // All other routes require Firebase auth
    const auth = await requireFirebaseUser(req, res);
    if (auth.handled) return;

    const ctx = getCtx(req, body, auth.user);
    console.log("🧠 CTX:", ctx);

    // ----------------------------
    // MEMBERSHIP / TENANTS
    // ----------------------------

    // GET /v1/me:memberships
    if (route === "/me:memberships" && method === "GET") {
      const snap = await db
        .collection("memberships")
        .where("userId", "==", auth.user.uid)
        .where("status", "==", "active")
        .get();

      const memberships = [];
      for (const doc of snap.docs) {
        const m = doc.data() || {};
        memberships.push({ id: doc.id, ...m });
      }

      // fetch tenant names for convenience (best-effort)
      const tenantIds = [...new Set(memberships.map((m) => m.tenantId).filter(Boolean))];
      const tenants = {};
      for (const tid of tenantIds) {
        const tdoc = await db.collection("tenants").doc(tid).get();
        if (tdoc.exists) tenants[tid] = { id: tid, ...(tdoc.data() || {}) };
      }

      return res.json({ ok: true, userId: auth.user.uid, email: auth.user.email || null, memberships, tenants });
    }

    // POST /v1/onboarding:claimTenant
    if (route === "/onboarding:claimTenant" && method === "POST") {
      const {
        tenantName,
        tenantId: requestedTenantId,
        tenantType = "personal", // "personal" | "business"
        vertical = "GLOBAL",
        jurisdiction = "GLOBAL",
      } = body || {};

      const finalTenantId = (requestedTenantId || slugifyTenantId(tenantName || auth.user.email || auth.user.uid))
        .toString()
        .trim();

      if (!finalTenantId) return jsonError(res, 400, "Missing tenantId/tenantName");

      const tenantRef = db.collection("tenants").doc(finalTenantId);
      const tSnap = await tenantRef.get();

      if (!tSnap.exists) {
        await tenantRef.set({
          name: tenantName || finalTenantId,
          tenantType,
          vertical,
          jurisdiction,
          status: "active",
          createdAt: nowServerTs(),
          createdBy: auth.user.uid,
        });
      }

      // Upsert membership (caller becomes admin/owner)
      const memSnap = await db
        .collection("memberships")
        .where("userId", "==", auth.user.uid)
        .where("tenantId", "==", finalTenantId)
        .limit(1)
        .get();

      if (memSnap.empty) {
        await db.collection("memberships").add({
          userId: auth.user.uid,
          tenantId: finalTenantId,
          role: tenantType === "business" ? "admin" : "owner",
          status: "active",
          createdAt: nowServerTs(),
        });
      } else {
        // FIX: Use update() for explicit field changes only
        await db.collection("memberships").doc(memSnap.docs[0].id).update({
          status: "active",
          updatedAt: nowServerTs(),
        });
      }

      return res.json({ ok: true, tenantId: finalTenantId });
    }

    // For all other routes, enforce tenant membership (except public)
    const gate = await requireMembershipIfNeeded({ uid: auth.user.uid, tenantId: ctx.tenantId }, res);
    if (!gate.ok) return;

    // ----------------------------
    // STRIPE IDENTITY (scoped by tenant)
    // ----------------------------

    // POST /v1/identity:session:create
    if (route === "/identity:session:create" && method === "POST") {
      const { purpose = "general", returnUrl } = body || {};

      try {
        const stripe = getStripe();
        const session = await stripe.identity.verificationSessions.create({
          type: "document",
          metadata: {
            userId: auth.user.uid,
            tenantId: ctx.tenantId,
            purpose: String(purpose),
          },
          return_url: returnUrl || undefined,
        });

        // Persist a record (no PII)
        const docId = identityDocId({ uid: auth.user.uid, tenantId: ctx.tenantId, purpose });

        // FIX: Create-only — no merge
        await db.collection("identityVerifications").doc(docId).set({
          uid: auth.user.uid,
          tenantId: ctx.tenantId,
          purpose: String(purpose),
          stripeSessionId: session.id,
          stripeStatus: session.status || "created",
          createdAt: nowServerTs(),
          updatedAt: nowServerTs(),
        });

        // Return minimal data to run Stripe UI
        return res.json({
          ok: true,
          purpose: String(purpose),
          tenantId: ctx.tenantId,
          sessionId: session.id,
          client_secret: session.client_secret,
        });
      } catch (e) {
        console.error("❌ identity:session:create failed:", e);
        return jsonError(res, 500, "Stripe Identity session create failed");
      }
    }

    // GET /v1/identity:status?purpose=...
    if (route === "/identity:status" && method === "GET") {
      const purpose = (req.query?.purpose || "general").toString();
      const docId = identityDocId({ uid: auth.user.uid, tenantId: ctx.tenantId, purpose });

      const snap = await db.collection("identityVerifications").doc(docId).get();
      if (!snap.exists) return res.json({ ok: true, purpose, tenantId: ctx.tenantId, status: "unverified" });

      const data = snap.data() || {};
      const stripeStatus = data.stripeStatus || null;

      // Map to simple status
      let status = "pending";
      if (stripeStatus === "verified") status = "verified";
      else if (stripeStatus === "canceled") status = "failed";
      else if (!stripeStatus) status = "unverified";

      return res.json({
        ok: true,
        purpose,
        tenantId: ctx.tenantId,
        status,
        stripeStatus,
        updatedAt: data.updatedAt || null,
      });
    }

    // ----------------------------
    // ADMIN IMPORT (kept)
    // ----------------------------
    if (route === "/admin/import" && method === "POST") {
      if (!body.type || !body.csvText) return jsonError(res, 400, "Missing type or csvText");

      const ref = await db.collection("imports").add({
        createdAt: nowServerTs(),
        type: body.type,
        source: body.source || {},
        mode: body.mode || "upsert",
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        rowCount: String(body.csvText).split("\n").length - 1,
        status: "completed",
      });

      return res.json({ ok: true, importId: ref.id, rows: String(body.csvText).split("\n").length - 1 });
    }

    if (route === "/admin/imports" && method === "GET") {
      const snap = await db.collection("imports").orderBy("createdAt", "desc").limit(10).get();
      return res.json({ ok: true, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    }

    // ----------------------------
    // FILE UPLOADS (general)
    // ----------------------------

    // POST /v1/files:sign
    if (route === "/files:sign" && method === "POST") {
      const { filename, contentType, sizeBytes, purpose, tags, related } = body || {};
      if (!filename) return jsonError(res, 400, "Missing filename");

      const fileId = "file_" + crypto.randomUUID().replace(/-/g, "");
      const safeName = sanitizeFilename(filename);
      const { yyyy, mm } = yyyymm();
      const storagePath = `tenants/${ctx.tenantId}/uploads/${yyyy}/${mm}/${fileId}-${safeName}`;

      const ct = contentType || "application/octet-stream";
      const expiresMs = 15 * 60 * 1000;

      await db.collection("files").doc(fileId).set({
        tenantId: ctx.tenantId,
        createdAt: nowServerTs(),
        createdBy: auth.user.uid,
        filename: safeName,
        originalFilename: filename,
        contentType: ct,
        sizeBytes: sizeBytes || null,
        purpose: purpose || null,
        tags: tags || [],
        related: related || {},
        status: "pending",
        storage: {
          bucket: STORAGE_BUCKET,
          path: storagePath,
        },
        storagePath, // backward compat
      });

      const [url] = await getBucket()
        .file(storagePath)
        .getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + expiresMs,
          contentType: ct,
        });

      return res.json({ ok: true, fileId, storagePath, uploadUrl: url, expiresInMs: expiresMs });
    }

    // POST /v1/files:finalize
    if (route === "/files:finalize" && method === "POST") {
      const { fileId, storagePath, contentType, sizeBytes } = body || {};
      if (!fileId) return jsonError(res, 400, "Missing fileId");

      const ref = db.collection("files").doc(fileId);
      const snap = await ref.get();
      if (!snap.exists) return jsonError(res, 404, "File not found");

      const data = snap.data() || {};
      if (data.tenantId !== ctx.tenantId) return jsonError(res, 403, "Forbidden");

      // FIX: Use update() for explicit field changes only
      await ref.update({
        status: "ready",
        finalizedAt: nowServerTs(),
        contentType: contentType || data.contentType || null,
        sizeBytes: sizeBytes || data.sizeBytes || null,
        storagePath: storagePath || getPathFromMeta(data) || data.storagePath || null,
      });

      return res.json({ ok: true, fileId });
    }

    // POST /v1/files:readUrl
    if (route === "/files:readUrl" && method === "POST") {
      const { fileId, storagePath, expiresInSec } = body || {};
      const exp = Number(expiresInSec || 300);

      let path = storagePath;
      if (!path && fileId) {
        const snap = await db.collection("files").doc(fileId).get();
        if (!snap.exists) return jsonError(res, 404, "File not found");
        const data = snap.data() || {};
        if (data.tenantId !== ctx.tenantId) return jsonError(res, 403, "Forbidden");
        path = getPathFromMeta(data) || data.storagePath || null;
      }

      if (!path) return jsonError(res, 400, "Missing storagePath or fileId");

      const [url] = await getBucket()
        .file(path)
        .getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + exp * 1000,
        });

      return res.json({ ok: true, url, expiresInSec: exp });
    }

    // ----------------------------
    // DOOR 2 ROUTES (Chat, Workflows, Report Status)
    // ----------------------------

    // POST /v1/chat:message
    if (route === "/chat:message" && method === "POST") {
      const { message, context, preferredModel } = body || {};
      if (!message) return jsonError(res, 400, "Missing message");

      try {
        // Event-sourced: append message received event
        const eventRef = await db.collection("messageEvents").add({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type: "chat:message:received",
          message,
          context: context || {},
          preferredModel: preferredModel || "claude",
          createdAt: nowServerTs(),
        });

        // TODO: Replace stub with actual AI model call (Claude/OpenAI via preferredModel)
        const aiResponse = `[AI response stub — model: ${preferredModel || "claude"}] You said: "${message}"`;

        // Event-sourced: append response event
        await db.collection("messageEvents").add({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type: "chat:message:responded",
          requestEventId: eventRef.id,
          preferredModel: preferredModel || "claude",
          response: aiResponse,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, response: aiResponse, eventId: eventRef.id });
      } catch (e) {
        console.error("❌ chat:message failed:", e);
        return jsonError(res, 500, "Chat message failed");
      }
    }

    // POST /v1/workflows
    if (route === "/workflows" && method === "POST") {
      const { workflowId, input, vertical, jurisdiction } = body || {};
      if (!workflowId) return jsonError(res, 400, "Missing workflowId");

      try {
        // RAAS validation gate
        const raasResult = await validateAgainstRaas(ctx.tenantId, "workflow_input", input || {});
        if (!raasResult.valid) {
          return jsonError(res, 422, "RAAS validation failed", { reason: raasResult.reason });
        }

        // Event-sourced: append workflow initiated event
        const eventRef = await db.collection("workflowEvents").add({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type: "workflow:initiated",
          workflowId,
          input: input || {},
          vertical: vertical || req.headers["x-vertical"] || "GLOBAL",
          jurisdiction: jurisdiction || req.headers["x-jurisdiction"] || "GLOBAL",
          createdAt: nowServerTs(),
        });

        // Pass event ID to RAAS handler for audit trail
        req.body = { ...body, _workflowEventId: eventRef.id };
        return handleRaasWorkflows(req, res, ctx);
      } catch (e) {
        console.error("❌ /workflows failed:", e);
        return jsonError(res, 500, "Workflow initiation failed");
      }
    }

    // GET /v1/reportStatus?jobId=...
    if (route === "/reportStatus" && method === "GET") {
      const jobId = (req.query?.jobId || "").toString().trim();
      if (!jobId) return jsonError(res, 400, "Missing jobId");

      try {
        const snap = await db.collection("reportJobs").doc(jobId).get();
        if (!snap.exists) return jsonError(res, 404, "Job not found", { jobId });

        const data = snap.data() || {};
        if (data.tenantId !== ctx.tenantId) return jsonError(res, 403, "Forbidden");

        return res.json({
          ok: true,
          jobId,
          status: data.status || "pending",
          progress: data.progress || 0,
          resultUrl: data.resultUrl || null,
          createdAt: data.createdAt || null,
          completedAt: data.completedAt || null,
        });
      } catch (e) {
        console.error("❌ /reportStatus failed:", e);
        return jsonError(res, 500, "Report status check failed");
      }
    }

    // ----------------------------
    // RAAS (existing handlers)
    // ----------------------------
    if (route === "/raas:workflows" && method === "GET") return handleRaasWorkflows(req, res, ctx);
    if (route === "/raas:workflows" && method === "POST") return handleRaasWorkflows(req, res, ctx);

    if (route === "/raas:catalog:upsert" && method === "POST") return handleRaasCatalogUpsert(req, res, ctx);
    if (route === "/raas:packages:create" && method === "POST") return handleRaasPackagesCreate(req, res, ctx);
    if (route === "/raas:packages:bindFiles" && method === "POST") return handleRaasPackagesBindFiles(req, res, ctx);
    if (route === "/raas:packages:get" && method === "GET") return handleRaasPackagesGet(req, res, ctx);

    return jsonError(res, 404, "Not Found", { route, method });
  }
);

// ----------------------------
// EVENT-SOURCED CSV IMPORT (separate endpoint)
// ----------------------------

exports.importCsv = onRequest({ region: "us-central1" }, async (req, res) => {
  if (req.method !== "POST") return jsonError(res, 405, "Method not allowed");

  const auth = await requireFirebaseUser(req, res);
  if (auth.handled) return;

  const body = req.body || {};
  const ctx = getCtx(req, body, auth.user);

  const gate = await requireMembershipIfNeeded({ uid: auth.user.uid, tenantId: ctx.tenantId }, res);
  if (!gate.ok) return;

  const { type, rows, isDemo } = body;
  if (!type || !Array.isArray(rows) || rows.length === 0) {
    return jsonError(res, 400, "Missing type or rows array");
  }

  const errors = [];
  const eventIds = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  // Flush batch to Firestore when threshold is reached
  async function flushBatch() {
    if (batchCount > 0) {
      await currentBatch.commit();
      currentBatch = db.batch();
      batchCount = 0;
    }
  }

  // Create import job record
  const importJobRef = db.collection("importJobs").doc();
  currentBatch.set(importJobRef, {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    type,
    isDemo: !!isDemo,
    totalRows: rows.length,
    status: "processing",
    createdAt: nowServerTs(),
  });
  batchCount++;

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // RAAS validation gate
    const raasResult = await validateAgainstRaas(ctx.tenantId, type, row);
    if (!raasResult.valid) {
      errors.push({ rowIndex: i, row, reason: raasResult.reason });
      continue;
    }

    // Append import event (event-sourced)
    const eventRef = db.collection("importEvents").doc();
    currentBatch.set(eventRef, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      importJobId: importJobRef.id,
      type: `${type}:imported`,
      isDemo: !!isDemo,
      data: row,
      rowIndex: i,
      externalId: row.externalId || row.vin || row.customerId || null,
      createdAt: nowServerTs(),
    });

    eventIds.push(eventRef.id);
    batchCount++;

    // Flush batch when approaching Firestore limit (500 ops max, we use 390 for safety)
    if (batchCount >= 390) await flushBatch();
  }

  // Final status update
  currentBatch.set(
    importJobRef,
    {
      status: errors.length === rows.length ? "failed" : errors.length > 0 ? "partial" : "completed",
      successCount: eventIds.length,
      errorCount: errors.length,
      completedAt: nowServerTs(),
    },
    { merge: true } // OK here: importJobs is operational metadata, not canonical ledger
  );
  batchCount++;

  // Final flush
  await flushBatch();

  return res.json({
    ok: true,
    importJobId: importJobRef.id,
    successCount: eventIds.length,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});
