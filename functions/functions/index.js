const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Stripe (Identity)
const Stripe = require("stripe");

// Anthropic (Claude AI)
const Anthropic = require("@anthropic-ai/sdk");

// OpenAI (ChatGPT)
const { OpenAI } = require("openai");

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

// Anthropic API key (set via env / secrets)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// OpenAI API key (set via env / secrets)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Create Stripe client lazily so local dev without keys doesn't crash unless used
function getStripe() {
  if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

// Create Anthropic client lazily
function getAnthropic() {
  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// Create OpenAI client lazily
function getOpenAI() {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: OPENAI_API_KEY });
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

        let aiResponse = "";

        // Call Claude API if model is claude (default)
        if (preferredModel === "claude" || !preferredModel) {
          try {
            // Fetch conversation history (last 20 messages)
            const historySnapshot = await db
              .collection("messageEvents")
              .where("tenantId", "==", ctx.tenantId)
              .where("userId", "==", ctx.userId)
              .orderBy("createdAt", "desc")
              .limit(20)
              .get();

            // Build message array for Claude (newest first from query, so reverse)
            const messages = [];
            const history = historySnapshot.docs.reverse();

            for (const doc of history) {
              const evt = doc.data();
              if (evt.type === "chat:message:received") {
                messages.push({ role: "user", content: evt.message });
              } else if (evt.type === "chat:message:responded") {
                messages.push({ role: "assistant", content: evt.response });
              }
            }

            // Add current message
            messages.push({ role: "user", content: message });

            // Call Claude API
            const anthropic = getAnthropic();
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2048,
              system: "You are a helpful assistant for TitleApp, a platform that helps people keep track of important records (car titles, home documents, pet records, student transcripts, etc.). Be concise, friendly, and focus on helping users understand how to organize and protect their important documents.",
              messages,
            });

            aiResponse = response.content[0]?.text || "I apologize, but I couldn't generate a response. Please try again.";
          } catch (apiError) {
            console.error("❌ Claude API call failed:", apiError);
            // Fallback to a helpful error message
            aiResponse = "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
          }
        } else if (preferredModel === "openai" || preferredModel === "chatgpt") {
          // OpenAI / ChatGPT integration
          try {
            // Fetch conversation history (last 20 messages)
            const historySnapshot = await db
              .collection("messageEvents")
              .where("tenantId", "==", ctx.tenantId)
              .where("userId", "==", ctx.userId)
              .orderBy("createdAt", "desc")
              .limit(20)
              .get();

            // Build message array for OpenAI (newest first from query, so reverse)
            const messages = [];
            const history = historySnapshot.docs.reverse();

            for (const doc of history) {
              const evt = doc.data();
              if (evt.type === "chat:message:received") {
                messages.push({ role: "user", content: evt.message });
              } else if (evt.type === "chat:message:responded") {
                messages.push({ role: "assistant", content: evt.response });
              }
            }

            // Add current message
            messages.push({ role: "user", content: message });

            // Call OpenAI API
            const openai = getOpenAI();
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              max_tokens: 2048,
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant for TitleApp, a platform that helps people keep track of important records (car titles, home documents, pet records, student transcripts, etc.). Be concise, friendly, and focus on helping users understand how to organize and protect their important documents."
                },
                ...messages
              ],
            });

            aiResponse = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
          } catch (apiError) {
            console.error("❌ OpenAI API call failed:", apiError);
            // Fallback to a helpful error message
            aiResponse = "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
          }
        } else {
          // Unsupported model
          aiResponse = `[Unsupported model: ${preferredModel}. Please use "claude" or "openai".]`;
        }

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
    // CONSUMER APP: DTCs (Digital Title Certificates)
    // ----------------------------

    // GET /v1/dtc:list?type=vehicle|property|credential
    if (route === "/dtc:list" && method === "GET") {
      try {
        const type = req.query?.type?.toString() || null;
        let q = db.collection("dtcs")
          .where("userId", "==", ctx.userId)
          .orderBy("createdAt", "desc")
          .limit(50);

        if (type) q = q.where("type", "==", type);

        const snap = await q.get();
        const dtcs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, dtcs });
      } catch (e) {
        console.error("❌ dtc:list failed:", e);
        return jsonError(res, 500, "Failed to load DTCs");
      }
    }

    // POST /v1/dtc:create
    if (route === "/dtc:create" && method === "POST") {
      try {
        const { type, metadata, fileIds, blockchainProof } = body;

        if (!type || !metadata) {
          return jsonError(res, 400, "Missing type or metadata");
        }

        const ref = await db.collection("dtcs").add({
          userId: ctx.userId,
          type,
          metadata,
          fileIds: fileIds || [],
          blockchainProof: blockchainProof || null,
          logbookCount: 0,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, dtcId: ref.id });
      } catch (e) {
        console.error("❌ dtc:create failed:", e);
        return jsonError(res, 500, "Failed to create DTC");
      }
    }

    // POST /v1/dtc:refresh-value
    // Manual or voice-activated asset valuation update
    if (route === "/dtc:refresh-value" && method === "POST") {
      try {
        const { dtcId } = body;

        if (!dtcId) {
          return jsonError(res, 400, "Missing dtcId");
        }

        const dtcDoc = await db.collection("dtcs").doc(dtcId).get();
        if (!dtcDoc.exists || dtcDoc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "DTC not found or access denied");
        }

        const dtc = dtcDoc.data();
        let newValue = null;
        let source = "manual";
        let changePercent = 0;

        // Mock valuation logic (replace with real API calls later)
        if (dtc.type === "vehicle" && dtc.metadata?.vin) {
          // Simulate vehicle depreciation (1-3% monthly)
          const currentValue = dtc.metadata.value || 0;
          const depreciation = 0.01 + Math.random() * 0.02; // 1-3%
          newValue = Math.round(currentValue * (1 - depreciation));
          source = "kbb_estimate";
          changePercent = -depreciation * 100;
        } else if (dtc.type === "property" && dtc.metadata?.address) {
          // Simulate property appreciation (0.5-2% monthly)
          const currentValue = dtc.metadata.value || 0;
          const appreciation = 0.005 + Math.random() * 0.015; // 0.5-2%
          newValue = Math.round(currentValue * (1 + appreciation));
          source = "attom_estimate";
          changePercent = appreciation * 100;
        } else {
          // No automatic valuation for this asset type
          return jsonError(res, 400, "Asset type does not support automatic valuation");
        }

        const oldValue = dtc.metadata.value || 0;

        // Update DTC with new value
        await dtcDoc.ref.update({
          "metadata.value": newValue,
          lastValuationUpdate: nowServerTs(),
          valuationSource: source,
          valuationHistory: admin.firestore.FieldValue.arrayUnion({
            date: new Date().toISOString(),
            value: newValue,
            source,
            changePercent: Math.round(changePercent * 100) / 100,
          }),
        });

        // Create logbook entry for the valuation update
        await db.collection("logbookEntries").add({
          dtcId,
          userId: ctx.userId,
          dtcTitle: dtc.metadata?.title || "Untitled",
          entryType: "valuation_update",
          data: {
            oldValue,
            newValue,
            change: newValue - oldValue,
            changePercent: Math.round(changePercent * 100) / 100,
            source,
          },
          files: [],
          createdAt: nowServerTs(),
        });

        return res.json({
          ok: true,
          dtcId,
          oldValue,
          newValue,
          change: newValue - oldValue,
          changePercent: Math.round(changePercent * 100) / 100,
          source,
        });
      } catch (e) {
        console.error("❌ dtc:refresh-value failed:", e);
        return jsonError(res, 500, "Failed to refresh value");
      }
    }

    // ----------------------------
    // CONSUMER APP: LOGBOOKS
    // ----------------------------

    // GET /v1/logbook:list?dtcId=xxx
    if (route === "/logbook:list" && method === "GET") {
      try {
        const dtcId = req.query?.dtcId?.toString() || null;

        let q = db.collection("logbookEntries")
          .where("userId", "==", ctx.userId)
          .orderBy("createdAt", "desc")
          .limit(100);

        if (dtcId) q = q.where("dtcId", "==", dtcId);

        const snap = await q.get();
        const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, entries });
      } catch (e) {
        console.error("❌ logbook:list failed:", e);
        return jsonError(res, 500, "Failed to load logbook entries");
      }
    }

    // POST /v1/logbook:append
    if (route === "/logbook:append" && method === "POST") {
      try {
        const { dtcId, entryType, data, files } = body;

        if (!dtcId || !entryType || !data) {
          return jsonError(res, 400, "Missing dtcId, entryType, or data");
        }

        // Verify DTC exists and user owns it
        const dtcDoc = await db.collection("dtcs").doc(dtcId).get();
        if (!dtcDoc.exists || dtcDoc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "DTC not found or access denied");
        }

        // Append logbook entry
        const ref = await db.collection("logbookEntries").add({
          dtcId,
          userId: ctx.userId,
          dtcTitle: dtcDoc.data().metadata?.title || "Untitled",
          entryType,
          data,
          files: files || [],
          createdAt: nowServerTs(),
        });

        // Update logbook count on DTC (denormalized for performance)
        await db.collection("dtcs").doc(dtcId).update({
          logbookCount: admin.firestore.FieldValue.increment(1),
        });

        return res.json({ ok: true, entryId: ref.id });
      } catch (e) {
        console.error("❌ logbook:append failed:", e);
        return jsonError(res, 500, "Failed to append logbook entry");
      }
    }

    // ----------------------------
    // BUSINESS APP: INVENTORY
    // ----------------------------

    // GET /v1/inventory:list?type=vehicle|service
    if (route === "/inventory:list" && method === "GET") {
      try {
        const type = req.query?.type?.toString() || null;

        let q = db.collection("inventory")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .limit(100);

        if (type) q = q.where("type", "==", type);

        const snap = await q.get();
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, items });
      } catch (e) {
        console.error("❌ inventory:list failed:", e);
        return jsonError(res, 500, "Failed to load inventory");
      }
    }

    // POST /v1/inventory:create
    if (route === "/inventory:create" && method === "POST") {
      try {
        const { type, status, metadata, price, cost } = body;

        if (!type || !metadata || price === undefined || cost === undefined) {
          return jsonError(res, 400, "Missing required fields");
        }

        const ref = await db.collection("inventory").add({
          tenantId: ctx.tenantId,
          type,
          status: status || "available",
          metadata,
          price: parseFloat(price) || 0,
          cost: parseFloat(cost) || 0,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, itemId: ref.id });
      } catch (e) {
        console.error("❌ inventory:create failed:", e);
        return jsonError(res, 500, "Failed to create inventory item");
      }
    }

    // PUT /v1/inventory:update
    if (route === "/inventory:update" && method === "PUT") {
      try {
        const { id, type, status, metadata, price, cost } = body;

        if (!id) {
          return jsonError(res, 400, "Missing item id");
        }

        // Verify ownership
        const doc = await db.collection("inventory").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Item not found or access denied");
        }

        const updates = {};
        if (type !== undefined) updates.type = type;
        if (status !== undefined) updates.status = status;
        if (metadata !== undefined) updates.metadata = metadata;
        if (price !== undefined) updates.price = parseFloat(price) || 0;
        if (cost !== undefined) updates.cost = parseFloat(cost) || 0;
        updates.updatedAt = nowServerTs();

        await db.collection("inventory").doc(id).update(updates);

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ inventory:update failed:", e);
        return jsonError(res, 500, "Failed to update inventory item");
      }
    }

    // DELETE /v1/inventory:delete
    if (route === "/inventory:delete" && method === "DELETE") {
      try {
        const { id } = body;

        if (!id) {
          return jsonError(res, 400, "Missing item id");
        }

        // Verify ownership
        const doc = await db.collection("inventory").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Item not found or access denied");
        }

        await db.collection("inventory").doc(id).delete();

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ inventory:delete failed:", e);
        return jsonError(res, 500, "Failed to delete inventory item");
      }
    }

    // ----------------------------
    // BUSINESS APP: CUSTOMERS (CRM)
    // ----------------------------

    // GET /v1/customers:list?search=xxx
    if (route === "/customers:list" && method === "GET") {
      try {
        const snap = await db.collection("customers")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();

        const customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, customers });
      } catch (e) {
        console.error("❌ customers:list failed:", e);
        return jsonError(res, 500, "Failed to load customers");
      }
    }

    // POST /v1/customers:create
    if (route === "/customers:create" && method === "POST") {
      try {
        const { firstName, lastName, email, phone, tags, notes } = body;

        if (!firstName || !lastName || !email) {
          return jsonError(res, 400, "Missing required fields (firstName, lastName, email)");
        }

        const ref = await db.collection("customers").add({
          tenantId: ctx.tenantId,
          firstName,
          lastName,
          email,
          phone: phone || null,
          tags: tags || [],
          notes: notes || "",
          deals: [],
          createdAt: nowServerTs(),
          lastContact: nowServerTs(),
        });

        return res.json({ ok: true, customerId: ref.id });
      } catch (e) {
        console.error("❌ customers:create failed:", e);
        return jsonError(res, 500, "Failed to create customer");
      }
    }

    // PUT /v1/customers:update
    if (route === "/customers:update" && method === "PUT") {
      try {
        const { id, firstName, lastName, email, phone, tags, notes } = body;

        if (!id) {
          return jsonError(res, 400, "Missing customer id");
        }

        // Verify ownership
        const doc = await db.collection("customers").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Customer not found or access denied");
        }

        const updates = {};
        if (firstName !== undefined) updates.firstName = firstName;
        if (lastName !== undefined) updates.lastName = lastName;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;
        if (tags !== undefined) updates.tags = tags;
        if (notes !== undefined) updates.notes = notes;
        updates.updatedAt = nowServerTs();

        await db.collection("customers").doc(id).update(updates);

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ customers:update failed:", e);
        return jsonError(res, 500, "Failed to update customer");
      }
    }

    // DELETE /v1/customers:delete
    if (route === "/customers:delete" && method === "DELETE") {
      try {
        const { id } = body;

        if (!id) {
          return jsonError(res, 400, "Missing customer id");
        }

        // Verify ownership
        const doc = await db.collection("customers").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Customer not found or access denied");
        }

        await db.collection("customers").doc(id).delete();

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ customers:delete failed:", e);
        return jsonError(res, 500, "Failed to delete customer");
      }
    }

    // ----------------------------
    // BUSINESS APP: APPOINTMENTS
    // ----------------------------

    // GET /v1/appointments:list
    if (route === "/appointments:list" && method === "GET") {
      try {
        const snap = await db.collection("appointments")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("datetime", "asc")
          .limit(100)
          .get();

        const appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, appointments });
      } catch (e) {
        console.error("❌ appointments:list failed:", e);
        return jsonError(res, 500, "Failed to load appointments");
      }
    }

    // POST /v1/appointments:create
    if (route === "/appointments:create" && method === "POST") {
      try {
        const { customerId, customerName, datetime, type, duration, notes } = body;

        if (!customerId || !datetime || !type) {
          return jsonError(res, 400, "Missing required fields (customerId, datetime, type)");
        }

        const ref = await db.collection("appointments").add({
          tenantId: ctx.tenantId,
          customerId,
          customerName: customerName || "",
          datetime,
          type,
          duration: duration || 60,
          status: "scheduled",
          notes: notes || "",
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, appointmentId: ref.id });
      } catch (e) {
        console.error("❌ appointments:create failed:", e);
        return jsonError(res, 500, "Failed to create appointment");
      }
    }

    // PUT /v1/appointments:update
    if (route === "/appointments:update" && method === "PUT") {
      try {
        const { id, customerId, customerName, datetime, type, duration, status, notes } = body;

        if (!id) {
          return jsonError(res, 400, "Missing appointment id");
        }

        // Verify ownership
        const doc = await db.collection("appointments").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Appointment not found or access denied");
        }

        const updates = {};
        if (customerId !== undefined) updates.customerId = customerId;
        if (customerName !== undefined) updates.customerName = customerName;
        if (datetime !== undefined) updates.datetime = datetime;
        if (type !== undefined) updates.type = type;
        if (duration !== undefined) updates.duration = duration;
        if (status !== undefined) updates.status = status;
        if (notes !== undefined) updates.notes = notes;
        updates.updatedAt = nowServerTs();

        await db.collection("appointments").doc(id).update(updates);

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ appointments:update failed:", e);
        return jsonError(res, 500, "Failed to update appointment");
      }
    }

    // DELETE /v1/appointments:delete
    if (route === "/appointments:delete" && method === "DELETE") {
      try {
        const { id } = body;

        if (!id) {
          return jsonError(res, 400, "Missing appointment id");
        }

        // Verify ownership
        const doc = await db.collection("appointments").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Appointment not found or access denied");
        }

        await db.collection("appointments").doc(id).delete();

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ appointments:delete failed:", e);
        return jsonError(res, 500, "Failed to delete appointment");
      }
    }

    // ----------------------------
    // CONSUMER APP: CREDENTIALS
    // ----------------------------

    // GET /v1/credentials:list?type=education|professional
    if (route === "/credentials:list" && method === "GET") {
      try {
        const type = req.query?.type?.toString() || null;

        let q = db.collection("credentials")
          .where("userId", "==", ctx.userId)
          .orderBy("date", "desc")
          .limit(100);

        if (type) q = q.where("type", "==", type);

        const snap = await q.get();
        const credentials = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, credentials });
      } catch (e) {
        console.error("❌ credentials:list failed:", e);
        return jsonError(res, 500, "Failed to load credentials");
      }
    }

    // POST /v1/credentials:add
    if (route === "/credentials:add" && method === "POST") {
      try {
        const { type, title, institution, field, date, verified, files } = body;

        if (!type || !title || !institution || !date) {
          return jsonError(res, 400, "Missing required fields");
        }

        const ref = await db.collection("credentials").add({
          userId: ctx.userId,
          type,
          title,
          institution,
          field: field || "",
          date,
          verified: verified || false,
          files: files || [],
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, credentialId: ref.id });
      } catch (e) {
        console.error("❌ credentials:add failed:", e);
        return jsonError(res, 500, "Failed to add credential");
      }
    }

    // ----------------------------
    // CONSUMER APP: GPTS
    // ----------------------------

    // GET /v1/gpts:list
    if (route === "/gpts:list" && method === "GET") {
      try {
        const snap = await db.collection("gpts")
          .where("userId", "==", ctx.userId)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();

        const gpts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, gpts });
      } catch (e) {
        console.error("❌ gpts:list failed:", e);
        return jsonError(res, 500, "Failed to load GPTs");
      }
    }

    // POST /v1/gpts:create
    if (route === "/gpts:create" && method === "POST") {
      try {
        const { name, description, systemPrompt, capabilities } = body;

        if (!name || !systemPrompt) {
          return jsonError(res, 400, "Missing name or systemPrompt");
        }

        const ref = await db.collection("gpts").add({
          userId: ctx.userId,
          name,
          description: description || "",
          systemPrompt,
          capabilities: capabilities || [],
          conversationCount: 0,
          lastUsed: null,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, gptId: ref.id });
      } catch (e) {
        console.error("❌ gpts:create failed:", e);
        return jsonError(res, 500, "Failed to create GPT");
      }
    }

    // DELETE /v1/gpts:delete?id=xxx
    if (route === "/gpts:delete" && method === "DELETE") {
      try {
        const id = req.query?.id?.toString();

        if (!id) {
          return jsonError(res, 400, "Missing GPT id");
        }

        const doc = await db.collection("gpts").doc(id).get();
        if (!doc.exists || doc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "GPT not found or access denied");
        }

        await db.collection("gpts").doc(id).delete();

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ gpts:delete failed:", e);
        return jsonError(res, 500, "Failed to delete GPT");
      }
    }

    // ----------------------------
    // CONSUMER APP: ESCROW
    // ----------------------------

    // GET /v1/escrow:list?status=pending|active|completed
    if (route === "/escrow:list" && method === "GET") {
      try {
        const status = req.query?.status?.toString() || null;

        let q = db.collection("escrows")
          .where("userId", "==", ctx.userId)
          .orderBy("createdAt", "desc")
          .limit(50);

        if (status) q = q.where("status", "==", status);

        const snap = await q.get();
        const escrows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, escrows });
      } catch (e) {
        console.error("❌ escrow:list failed:", e);
        return jsonError(res, 500, "Failed to load escrows");
      }
    }

    // POST /v1/escrow:create
    if (route === "/escrow:create" && method === "POST") {
      try {
        const { title, counterparty, dtcIds, terms, releaseConditions, amount } = body;

        if (!title || !counterparty || !terms || !releaseConditions) {
          return jsonError(res, 400, "Missing required fields");
        }

        const ref = await db.collection("escrows").add({
          userId: ctx.userId,
          title,
          counterparty,
          dtcIds: dtcIds || [],
          terms,
          releaseConditions,
          amount: amount || null,
          status: "pending",
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, escrowId: ref.id });
      } catch (e) {
        console.error("❌ escrow:create failed:", e);
        return jsonError(res, 500, "Failed to create escrow");
      }
    }

    // POST /v1/escrow:release
    if (route === "/escrow:release" && method === "POST") {
      try {
        const { id, signature } = body;

        if (!id) {
          return jsonError(res, 400, "Missing escrow id");
        }

        const doc = await db.collection("escrows").doc(id).get();
        if (!doc.exists || doc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "Escrow not found or access denied");
        }

        await db.collection("escrows").doc(id).update({
          status: "completed",
          completedAt: nowServerTs(),
          signature: signature || null,
        });

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ escrow:release failed:", e);
        return jsonError(res, 500, "Failed to release escrow");
      }
    }

    // GET /v1/escrow:ai:analysis?id=xxx
    if (route === "/escrow:ai:analysis" && method === "GET") {
      try {
        const id = req.query?.id?.toString();

        if (!id) {
          return jsonError(res, 400, "Missing escrow id");
        }

        const doc = await db.collection("escrows").doc(id).get();
        if (!doc.exists || doc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "Escrow not found or access denied");
        }

        const escrow = doc.data();

        // Use Claude for AI analysis
        const anthropic = getAnthropic();
        const message = await anthropic.messages.create({
          model: "claude-opus-4-20250514",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Analyze this escrow transaction:

Title: ${escrow.title}
Counterparty: ${escrow.counterparty}
Terms: ${escrow.terms}
Release Conditions: ${escrow.releaseConditions}

Provide:
1. A brief summary (1-2 sentences)
2. Identified risks (bullet points)
3. Recommendations (bullet points)
4. Confidence score (0-1)

Return as JSON: { summary, risks: [], recommendations: [], confidence }`
          }],
        });

        const analysisText = message.content[0]?.text || "{}";
        const analysis = JSON.parse(analysisText);

        return res.json({ ok: true, analysis });
      } catch (e) {
        console.error("❌ escrow:ai:analysis failed:", e);
        return jsonError(res, 500, "Failed to analyze escrow");
      }
    }

    // ----------------------------
    // CONSUMER APP: WALLET
    // ----------------------------

    // GET /v1/wallet:assets
    if (route === "/wallet:assets" && method === "GET") {
      try {
        // Aggregate asset values from DTCs
        const dtcsSnap = await db.collection("dtcs")
          .where("userId", "==", ctx.userId)
          .get();

        const assets = {
          vehicles: { count: 0, value: 0 },
          property: { count: 0, value: 0 },
          credentials: { count: 0, value: 0 },
          tokens: { count: 0, value: 0 },
        };

        dtcsSnap.forEach(doc => {
          const dtc = doc.data();
          if (dtc.type === "vehicle") {
            assets.vehicles.count++;
            assets.vehicles.value += dtc.metadata?.value || 0;
          } else if (dtc.type === "property") {
            assets.property.count++;
            assets.property.value += dtc.metadata?.value || 0;
          } else if (dtc.type === "credential") {
            assets.credentials.count++;
            assets.credentials.value += dtc.metadata?.value || 0;
          }
        });

        return res.json({ ok: true, assets });
      } catch (e) {
        console.error("❌ wallet:assets failed:", e);
        return jsonError(res, 500, "Failed to load wallet assets");
      }
    }

    // GET /v1/wallet:tokens:list
    if (route === "/wallet:tokens:list" && method === "GET") {
      try {
        const snap = await db.collection("tokens")
          .where("userId", "==", ctx.userId)
          .orderBy("createdAt", "desc")
          .get();

        const tokens = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, tokens });
      } catch (e) {
        console.error("❌ wallet:tokens:list failed:", e);
        return jsonError(res, 500, "Failed to load tokens");
      }
    }

    // POST /v1/wallet:token:create
    if (route === "/wallet:token:create" && method === "POST") {
      try {
        const { name, symbol, supply, network } = body;

        if (!name || !symbol || !supply || !network) {
          return jsonError(res, 400, "Missing required fields");
        }

        const ref = await db.collection("tokens").add({
          userId: ctx.userId,
          name,
          symbol,
          supply,
          network,
          holders: 1,
          currentValue: "$0",
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, tokenId: ref.id });
      } catch (e) {
        console.error("❌ wallet:token:create failed:", e);
        return jsonError(res, 500, "Failed to create token");
      }
    }

    // GET /v1/wallet:captables:list
    if (route === "/wallet:captables:list" && method === "GET") {
      try {
        const snap = await db.collection("capTables")
          .where("userId", "==", ctx.userId)
          .orderBy("createdAt", "desc")
          .get();

        const capTables = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, capTables });
      } catch (e) {
        console.error("❌ wallet:captables:list failed:", e);
        return jsonError(res, 500, "Failed to load cap tables");
      }
    }

    // POST /v1/wallet:captable:create
    if (route === "/wallet:captable:create" && method === "POST") {
      try {
        const { companyName, totalShares, shareholders } = body;

        if (!companyName || !totalShares || !shareholders) {
          return jsonError(res, 400, "Missing required fields");
        }

        const ref = await db.collection("capTables").add({
          userId: ctx.userId,
          companyName,
          totalShares,
          shareholders,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, capTableId: ref.id });
      } catch (e) {
        console.error("❌ wallet:captable:create failed:", e);
        return jsonError(res, 500, "Failed to create cap table");
      }
    }

    // ----------------------------
    // BUSINESS APP: STAFF
    // ----------------------------

    // GET /v1/staff:list
    if (route === "/staff:list" && method === "GET") {
      try {
        const snap = await db.collection("staff")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();

        const staff = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return res.json({ ok: true, staff });
      } catch (e) {
        console.error("❌ staff:list failed:", e);
        return jsonError(res, 500, "Failed to load staff");
      }
    }

    // POST /v1/staff:create
    if (route === "/staff:create" && method === "POST") {
      try {
        const { name, email, role, permissions, phone } = body;

        if (!name || !email || !role) {
          return jsonError(res, 400, "Missing name, email, or role");
        }

        const ref = await db.collection("staff").add({
          tenantId: ctx.tenantId,
          name,
          email,
          role,
          permissions: permissions || [],
          phone: phone || "",
          status: "active",
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, staffId: ref.id });
      } catch (e) {
        console.error("❌ staff:create failed:", e);
        return jsonError(res, 500, "Failed to create staff member");
      }
    }

    // PUT /v1/staff:update
    if (route === "/staff:update" && method === "PUT") {
      try {
        const { id, name, email, role, permissions, status, phone } = body;

        if (!id) {
          return jsonError(res, 400, "Missing staff id");
        }

        const doc = await db.collection("staff").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Staff member not found or access denied");
        }

        const updates = { updatedAt: nowServerTs() };
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (role !== undefined) updates.role = role;
        if (permissions !== undefined) updates.permissions = permissions;
        if (status !== undefined) updates.status = status;
        if (phone !== undefined) updates.phone = phone;

        await db.collection("staff").doc(id).update(updates);

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ staff:update failed:", e);
        return jsonError(res, 500, "Failed to update staff member");
      }
    }

    // DELETE /v1/staff:delete
    if (route === "/staff:delete" && method === "DELETE") {
      try {
        const { id } = body;

        if (!id) {
          return jsonError(res, 400, "Missing staff id");
        }

        const doc = await db.collection("staff").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Staff member not found or access denied");
        }

        await db.collection("staff").doc(id).delete();

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ staff:delete failed:", e);
        return jsonError(res, 500, "Failed to delete staff member");
      }
    }

    // ----------------------------
    // BUSINESS APP: AI ACTIVITY & CONVERSATIONS
    // ----------------------------

    // GET /v1/ai:activity?limit=N
    if (route === "/ai:activity" && method === "GET") {
      try {
        const limit = parseInt(req.query?.limit?.toString() || "50", 10);

        // Get AI chat messages from raasPackages (execution history)
        const snap = await db.collection("raasPackages")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get();

        const activity = snap.docs.map(d => {
          const pkg = d.data();
          return {
            id: d.id,
            workflowId: pkg.workflowId,
            status: pkg.status,
            createdAt: pkg.createdAt,
            completedAt: pkg.completedAt || null,
            model: pkg.model || "claude-opus-4",
            conversationId: pkg.conversationId || null,
          };
        });

        return res.json({ ok: true, activity });
      } catch (e) {
        console.error("❌ ai:activity failed:", e);
        return jsonError(res, 500, "Failed to load AI activity");
      }
    }

    // GET /v1/ai:conversations
    if (route === "/ai:conversations" && method === "GET") {
      try {
        // Get unique conversation IDs from raasPackages
        const snap = await db.collection("raasPackages")
          .where("tenantId", "==", ctx.tenantId)
          .where("conversationId", "!=", null)
          .orderBy("conversationId")
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();

        const conversationsMap = new Map();
        snap.docs.forEach(d => {
          const pkg = d.data();
          const convId = pkg.conversationId;
          if (!conversationsMap.has(convId)) {
            conversationsMap.set(convId, {
              id: convId,
              firstMessage: pkg.createdAt,
              lastMessage: pkg.createdAt,
              messageCount: 1,
            });
          } else {
            const conv = conversationsMap.get(convId);
            conv.messageCount++;
            if (pkg.createdAt > conv.lastMessage) {
              conv.lastMessage = pkg.createdAt;
            }
          }
        });

        const conversations = Array.from(conversationsMap.values());

        return res.json({ ok: true, conversations });
      } catch (e) {
        console.error("❌ ai:conversations failed:", e);
        return jsonError(res, 500, "Failed to load conversations");
      }
    }

    // GET /v1/ai:conversation:replay?id=xxx
    if (route === "/ai:conversation:replay" && method === "GET") {
      try {
        const conversationId = req.query?.id?.toString();

        if (!conversationId) {
          return jsonError(res, 400, "Missing conversation id");
        }

        const snap = await db.collection("raasPackages")
          .where("tenantId", "==", ctx.tenantId)
          .where("conversationId", "==", conversationId)
          .orderBy("createdAt", "asc")
          .get();

        const messages = snap.docs.map(d => {
          const pkg = d.data();
          return {
            id: d.id,
            workflowId: pkg.workflowId,
            input: pkg.boundFiles || [],
            output: pkg.result || null,
            status: pkg.status,
            createdAt: pkg.createdAt,
          };
        });

        return res.json({ ok: true, conversationId, messages });
      } catch (e) {
        console.error("❌ ai:conversation:replay failed:", e);
        return jsonError(res, 500, "Failed to load conversation replay");
      }
    }

    // ----------------------------
    // BUSINESS APP: INTEGRATIONS & APIs
    // ----------------------------

    // GET /v1/integrations:list
    if (route === "/integrations:list" && method === "GET") {
      try {
        const snap = await db.collection("integrations")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .get();

        const integrations = snap.docs.map(d => {
          const integration = d.data();
          // Don't expose credentials
          delete integration.credentials;
          return { id: d.id, ...integration };
        });

        return res.json({ ok: true, integrations });
      } catch (e) {
        console.error("❌ integrations:list failed:", e);
        return jsonError(res, 500, "Failed to load integrations");
      }
    }

    // POST /v1/integrations:connect
    if (route === "/integrations:connect" && method === "POST") {
      try {
        const { name, type, credentials } = body;

        if (!name || !type || !credentials) {
          return jsonError(res, 400, "Missing name, type, or credentials");
        }

        const ref = await db.collection("integrations").add({
          tenantId: ctx.tenantId,
          name,
          type,
          credentials,
          status: "connected",
          lastSync: null,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, integrationId: ref.id });
      } catch (e) {
        console.error("❌ integrations:connect failed:", e);
        return jsonError(res, 500, "Failed to connect integration");
      }
    }

    // POST /v1/integrations:disconnect
    if (route === "/integrations:disconnect" && method === "POST") {
      try {
        const { id } = body;

        if (!id) {
          return jsonError(res, 400, "Missing integration id");
        }

        const doc = await db.collection("integrations").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Integration not found or access denied");
        }

        await db.collection("integrations").doc(id).update({
          status: "disconnected",
          updatedAt: nowServerTs(),
        });

        return res.json({ ok: true });
      } catch (e) {
        console.error("❌ integrations:disconnect failed:", e);
        return jsonError(res, 500, "Failed to disconnect integration");
      }
    }

    // POST /v1/integrations:sync
    if (route === "/integrations:sync" && method === "POST") {
      try {
        const { id } = body;

        if (!id) {
          return jsonError(res, 400, "Missing integration id");
        }

        const doc = await db.collection("integrations").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Integration not found or access denied");
        }

        // Update lastSync timestamp
        await db.collection("integrations").doc(id).update({
          lastSync: nowServerTs(),
          updatedAt: nowServerTs(),
        });

        return res.json({ ok: true, syncStarted: true });
      } catch (e) {
        console.error("❌ integrations:sync failed:", e);
        return jsonError(res, 500, "Failed to sync integration");
      }
    }

    // ----------------------------
    // ANALYST RAAS
    // ----------------------------

    // POST /v1/analyst:analyze
    // AI-powered deal analysis with multi-angle assessment
    if (route === "/analyst:analyze" && method === "POST") {
      try {
        const { deal } = body;

        if (!deal || !deal.companyName || !deal.summary) {
          return jsonError(res, 400, "Missing required deal fields");
        }

        // Load appropriate RAAS rules based on deal type
        const dealTypeMap = {
          "seed": "pe_deal_screen_v0",
          "series_a": "pe_deal_screen_v0",
          "series_b": "pe_deal_screen_v0",
          "series_c": "pe_deal_screen_v0",
          "pe": "pe_deal_screen_v0",
          "refinance": "refinance_screen_v0",
          "real_estate": "cre_deal_screen_v0",
          "conversion": "conversion_screen_v0",
          "debt": "debt_acquisition_screen_v0",
        };

        const rulesetName = dealTypeMap[deal.dealType] || "pe_deal_screen_v0";

        // Build sophisticated analysis prompt
        const analysisPrompt = `You are the world's best investment analyst. Analyze this deal with the sophistication of a Goldman Sachs analyst but accessible to anyone from house flippers to institutional investors.

**Deal Information:**
- Company: ${deal.companyName}
- Industry: ${deal.industry || "Not specified"}
- Ask Amount: ${deal.askAmount || "Not specified"}
- Deal Type: ${deal.dealType || "Not specified"}
- Summary: ${deal.summary}

**Analysis Requirements:**

1. **Multi-Angle Assessment** - Analyze from ALL these perspectives:
   - Direct investment (buy/sell fundamentals)
   - Leverage opportunities (debt structuring, LBO potential)
   - Tax optimization (depreciation, credits, offshore strategies)
   - Regulatory considerations (securities laws, compliance risks)
   - Alternative structures (convertible notes, SAFE, revenue share)

2. **Evidence-First Approach** - Follow these rules:
   - Cite specific facts from the deal summary
   - Mark unknowns explicitly (don't guess)
   - Flag missing critical information

3. **Risk-Scaled Alternatives** - Present deal options at three risk levels:
   - **Low Risk**: Conservative structure, protective terms, clear exit
   - **Medium Risk**: Balanced risk/reward, standard terms
   - **High Risk**: Aggressive bet, higher upside, concentrated exposure

4. **Output Format** - Return a JSON object with:
   {
     "riskScore": 0-100 (0=lowest risk, 100=highest risk),
     "recommendation": "INVEST" | "PASS" | "WAIT",
     "emoji": "💎" for great deals, "👍" for good, "⚠️" for concerns, "💩" for terrible deals,
     "summary": "2-3 sentence executive summary",
     "evidence": {
       "positive": ["fact 1", "fact 2"],
       "negative": ["concern 1", "concern 2"],
       "neutral": ["observation 1"]
     },
     "multiAngleAnalysis": {
       "directInvestment": "assessment...",
       "leverageOpportunities": "assessment...",
       "taxOptimization": "assessment...",
       "regulatoryConsiderations": "assessment...",
       "alternativeStructures": "suggested alternatives..."
     },
     "riskScaledAlternatives": {
       "lowRisk": { "structure": "...", "terms": "...", "expectedReturn": "..." },
       "mediumRisk": { "structure": "...", "terms": "...", "expectedReturn": "..." },
       "highRisk": { "structure": "...", "terms": "...", "expectedReturn": "..." }
     },
     "keyMetrics": {
       "estimatedValuation": "...",
       "dilution": "...",
       "targetIRR": "...",
       "other": "..."
     },
     "nextSteps": ["action 1", "action 2"],
     "missingInfo": ["critical doc 1", "critical doc 2"]
   }

**CRITICAL**: Use the 💩 emoji for deals that are clearly terrible (red flags, unrealistic assumptions, regulatory violations, obvious frauds).

Analyze now:`;

        let analysis;

        // Check if API key is configured, otherwise use mock data for testing
        if (!ANTHROPIC_API_KEY) {
          console.log("⚠️ No ANTHROPIC_API_KEY - using mock analysis for testing");

          // Generate realistic mock analysis based on deal type
          const isBadDeal = deal.summary.toLowerCase().includes("no revenue") ||
                           deal.summary.toLowerCase().includes("pre-revenue") ||
                           deal.summary.toLowerCase().includes("idea stage");

          analysis = {
            riskScore: isBadDeal ? 85 : (deal.dealType === "seed" ? 65 : 45),
            recommendation: isBadDeal ? "PASS" : (deal.dealType === "seed" ? "WAIT" : "INVEST"),
            emoji: isBadDeal ? "💩" : (deal.dealType === "seed" ? "⚠️" : "💎"),
            summary: isBadDeal
              ? `${deal.companyName} presents significant red flags with no proven revenue model and unclear path to profitability. The ask amount appears misaligned with current traction.`
              : `${deal.companyName} shows strong fundamentals in the ${deal.industry} sector. The business model is validated with clear unit economics and defensible market position. Risk is manageable with proper structuring.`,
            evidence: {
              positive: isBadDeal
                ? ["Founder passion evident", "Large addressable market mentioned"]
                : ["Proven revenue generation", "Strong YoY growth trajectory", "Experienced management team", "Clear competitive moat"],
              negative: isBadDeal
                ? ["No revenue or customers cited", "Unrealistic valuation expectations", "Missing critical financial data", "Regulatory uncertainty"]
                : ["Customer concentration risk if top 3 clients represent >40%", "Capital intensive scaling requirements"],
              neutral: ["Industry is competitive but growing", "Exit timeline uncertain"]
            },
            multiAngleAnalysis: {
              directInvestment: isBadDeal
                ? "Direct equity investment is not recommended given the lack of validated product-market fit and unclear revenue model. The pre-money valuation implied by the ask appears disconnected from observable traction."
                : `Strong case for direct equity participation. Current valuation of ~${deal.askAmount} appears reasonable given revenue multiples in the ${deal.industry} sector. Standard preferred equity with 1x liquidation preference recommended.`,
              leverageOpportunities: isBadDeal
                ? "No debt capacity given lack of cash flows. Any leverage would be personally guaranteed by founders, which is risky given business model uncertainty."
                : "Moderate debt capacity exists given established cash flows. Consider venture debt at 2-3x ARR to extend runway and minimize dilution. Could support 10-15% of capital structure as senior debt.",
              taxOptimization: isBadDeal
                ? "Limited tax planning opportunities. Any losses would likely need to be carried forward indefinitely given unclear path to profitability."
                : `Qualified Small Business Stock (QSBS) eligible - potential for 100% capital gains exclusion on exit if held 5+ years. Consider QSBS planning for all investors. ${deal.industry.includes('energy') ? 'Renewable energy tax credits may be available (ITC/PTC).' : ''}`,
              regulatoryConsiderations: isBadDeal
                ? "Regulation D 506(c) filing required for general solicitation. High risk of violating securities laws if revenue projections are used in marketing materials without disclaimer. Company may need registered broker-dealer for equity crowdfunding."
                : `Standard Reg D 506(b) private placement appropriate. Ensure all investors are accredited. ${deal.industry.includes('healthcare') ? 'HIPAA compliance required.' : deal.industry.includes('financial') ? 'FinCEN and state money transmitter licenses may be required.' : 'No unusual regulatory hurdles identified.'}`,
              alternativeStructures: isBadDeal
                ? "Given high risk, consider: (1) Revenue share agreement (5-10% of gross revenue until 3x return), (2) Convertible note with very low valuation cap ($2-3M) and 20%+ discount, (3) Advisory equity-only (no cash) with milestone-based vesting."
                : "Multiple viable structures: (1) Straight preferred equity with standard terms, (2) Convertible note with $15M cap / 20% discount for faster close, (3) SAFE with post-money cap for founder-friendly terms, (4) Revenue-based financing for non-dilutive capital."
            },
            riskScaledAlternatives: {
              lowRisk: {
                structure: isBadDeal
                  ? "Revenue share only - no equity"
                  : "Convertible note with protective floor",
                terms: isBadDeal
                  ? "10% of monthly gross revenue until 2.5x return; no equity dilution; immediate payout from revenues"
                  : `$${deal.askAmount} convertible note, 8% interest, $12M cap, 25% discount, 2-year maturity with mandatory conversion on qualified financing >$10M`,
                expectedReturn: isBadDeal ? "2.5x in 5-7 years (if revenues materialize)" : "2.5-3x in 4-5 years with downside protection"
              },
              mediumRisk: {
                structure: isBadDeal
                  ? "Very small equity bet with founder earnout"
                  : "Standard Series A preferred equity",
                terms: isBadDeal
                  ? `$${parseInt(deal.askAmount.replace(/[^0-9]/g, '')) / 5}M for 25% equity with 50% of founder shares in 3-year earnout tied to revenue milestones ($1M ARR year 1, $3M year 2, $8M year 3)`
                  : `$${deal.askAmount} for 20-25% fully-diluted, 1x liquidation preference, pro-rata rights, standard board seat and protective provisions`,
                expectedReturn: isBadDeal ? "5x in 7-10 years if milestones hit (high risk of zero)" : "5-8x in 5-7 years on exit"
              },
              highRisk: {
                structure: isBadDeal
                  ? "Not recommended - pass on deal"
                  : "Majority equity with aggressive terms",
                terms: isBadDeal
                  ? "Any investment in this deal at current valuation is too risky. If proceeding despite recommendation, structure as majority control with full ratchet anti-dilution and 3x liquidation preference."
                  : `$${deal.askAmount} for 35-40% fully-diluted with 2x participating preferred, full ratchet anti-dilution, majority board control, broad drag-along rights. Aggressive but maximizes upside.`,
                expectedReturn: isBadDeal ? "0-3x (most likely zero)" : "10-20x in 5-7 years if company hits aggressive targets"
              }
            },
            keyMetrics: {
              estimatedValuation: isBadDeal ? "$3-5M (overvalued)" : `$${parseInt(deal.askAmount.replace(/[^0-9]/g, '')) * 4}M post-money`,
              dilution: isBadDeal ? "25-30%" : "20-25%",
              targetIRR: isBadDeal ? "N/A (high risk of loss)" : "35-45%",
              paybackPeriod: isBadDeal ? "Unknown" : "4-6 years"
            },
            nextSteps: isBadDeal
              ? [
                  "Request full financial statements (P&L, balance sheet, cash flow)",
                  "Conduct customer discovery interviews to validate product-market fit",
                  "Request detailed go-to-market plan with customer acquisition costs",
                  "Revisit after company achieves $500K ARR or 50+ paying customers",
                  "If proceeding, negotiate down to 1/5 of current ask with revenue earnout structure"
                ]
              : [
                  "Request full financial statements (3 years historical if available)",
                  "Conduct customer reference calls with top 5 accounts",
                  "Engage third-party technical due diligence on product/IP",
                  "Review cap table and confirm no problematic prior investor terms",
                  "Request detailed financial projections with sensitivity analysis",
                  "Schedule management presentations for investment committee",
                  "Prepare term sheet with target close in 45-60 days"
                ],
            missingInfo: isBadDeal
              ? [
                  "Financial statements (any revenue?)",
                  "Customer list and contracts",
                  "Unit economics and CAC payback",
                  "Founder background checks",
                  "Cap table and prior investment terms"
                ]
              : [
                  "Detailed customer concentration analysis",
                  "Full cap table with all option pool details",
                  "Three-year financial projections with assumptions"
                ]
          };
        } else {
          // Call Claude Opus for analysis
          const anthropic = getAnthropic();
          const response = await anthropic.messages.create({
            model: "claude-opus-4-20250514",
            max_tokens: 4096,
          temperature: 0.3,
          messages: [{
            role: "user",
            content: analysisPrompt
          }]
        });

          const analysisText = response.content[0].text;

          // Parse JSON from Claude's response
          try {
            // Claude sometimes wraps JSON in markdown, so extract it
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
          } catch (e) {
          // Fallback if parsing fails
          analysis = {
            riskScore: 50,
            recommendation: "WAIT",
            emoji: "⚠️",
            summary: analysisText.substring(0, 500),
            evidence: { positive: [], negative: [], neutral: [] },
            multiAngleAnalysis: {
              directInvestment: "Analysis parsing failed",
              leverageOpportunities: "See raw response",
              taxOptimization: "See raw response",
              regulatoryConsiderations: "See raw response",
              alternativeStructures: "See raw response"
            },
            riskScaledAlternatives: {
              lowRisk: { structure: "N/A", terms: "N/A", expectedReturn: "N/A" },
              mediumRisk: { structure: "N/A", terms: "N/A", expectedReturn: "N/A" },
              highRisk: { structure: "N/A", terms: "N/A", expectedReturn: "N/A" }
            },
            keyMetrics: {},
            nextSteps: ["Review raw analysis"],
            missingInfo: []
          };
        }
        }

        // Save to Firestore
        const ref = await db.collection("analyzedDeals").add({
          tenantId: ctx.tenantId,
          dealInput: deal,
          analysis,
          rulesetUsed: rulesetName,
          analyzedAt: nowServerTs(),
          createdAt: nowServerTs(),
        });

        return res.json({
          ok: true,
          dealId: ref.id,
          analysis
        });

      } catch (e) {
        console.error("❌ analyst:analyze failed:", e);
        return jsonError(res, 500, "Failed to analyze deal: " + (e?.message || String(e)));
      }
    }

    // GET /v1/analyst:deals
    // List all analyzed deals
    if (route === "/analyst:deals" && method === "GET") {
      try {
        const limit = parseInt(req.query?.limit?.toString() || "50", 10);

        const snap = await db.collection("analyzedDeals")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("analyzedAt", "desc")
          .limit(limit)
          .get();

        const deals = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        return res.json({ ok: true, deals });

      } catch (e) {
        console.error("❌ analyst:deals failed:", e);
        return jsonError(res, 500, "Failed to load analyzed deals");
      }
    }

    // GET /v1/analyst:deal?id=...
    // Get specific deal analysis
    if (route === "/analyst:deal" && method === "GET") {
      try {
        const dealId = req.query?.id?.toString();

        if (!dealId) {
          return jsonError(res, 400, "Missing deal id");
        }

        const doc = await db.collection("analyzedDeals").doc(dealId).get();

        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Deal not found or access denied");
        }

        return res.json({
          ok: true,
          deal: { id: doc.id, ...doc.data() }
        });

      } catch (e) {
        console.error("❌ analyst:deal failed:", e);
        return jsonError(res, 500, "Failed to load deal");
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
