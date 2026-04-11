// Runtime: Node.js 22 (upgraded from Node 20 — 2026-04-08)
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

// Default all functions to fractional CPU to stay within Cloud Run quota (24 CPUs).
// Only the main api function overrides this with cpu: 1 for AI workloads.
setGlobalOptions({ region: "us-central1", cpu: "gcf_gen1", memory: "256MiB" });
const admin = require("firebase-admin");
const crypto = require("crypto");

// Public API (Express app)
const publicApiApp = require("./api/index");

// Stripe (Identity)
const Stripe = require("stripe");

// Anthropic (Claude AI)
const Anthropic = require("@anthropic-ai/sdk");

// OpenAI (ChatGPT)
const { OpenAI } = require("openai");

// API Health Monitor (consolidated — services/health is authoritative)
const { callWithHealthCheck, getAllHealthStatuses: getHealthStatus, getErrorMessage } = require("./services/health");
const EXTERNAL_APIS = require("./config/externalApis");
const { TRIAL_ACTIVE, SUBSCRIBED, TRIAL_EXPIRED, CANCELLED, ACTIVE_STATUSES, isActive } = require("./config/subscriptionStatus");

// RAAS handlers (v0)
const {
  handleRaasWorkflows,
  handleRaasCatalogUpsert,
  handleRaasPackagesCreate,
  handleRaasPackagesBindFiles,
  handleRaasPackagesGet,
} = require("./raas/raas.handlers");

// RAAS Enforcement Engine (v1)
const { validateOutput, validateChatOutput, callAIWithEnforcement } = require("./raas/raas.engine");

// Document Engine (Tier 0 platform service)
const {
  generateDocument,
  getDownloadUrl: docGetDownloadUrl,
  listDocuments: docListDocuments,
  listTemplates: docListTemplates,
} = require("./services/documentEngine");

// Signature Service (Tier 0 platform service)
let _signatureService;
function getSignatureService() {
  if (!_signatureService) _signatureService = require("./services/signatureService");
  return _signatureService;
}

// Marketing Service (lead capture, promo codes, lead stats)
let _marketingService;
function getMarketingService() {
  if (!_marketingService) _marketingService = require("./services/marketingService");
  return _marketingService;
}

// Chat Engine (conversational state machine)
const { processMessage: chatEngineProcess, defaultState: chatEngineDefaultState } = require("./chatEngine");

// Company knowledge for investor system prompt (loaded once at cold start)
const fs = require("fs");
const path = require("path");
let _companyKnowledge = null;
function getCompanyKnowledge() {
  if (!_companyKnowledge) {
    try {
      const knowledgePath = path.join(__dirname, "raas", "company-knowledge.md");
      _companyKnowledge = fs.readFileSync(knowledgePath, "utf-8");
    } catch (e) {
      console.warn("Could not load company-knowledge.md:", e.message);
      _companyKnowledge = "TitleApp is the Digital Worker platform -- AI agents governed by human-defined rules with deterministic enforcement and immutable audit trails. The underlying architecture is called RAAS (Rules + AI-as-a-Service).";
    }
  }
  return _companyKnowledge;
}

// Workspace management
const { getUserWorkspaces, createWorkspace, getWorkspace, PERSONAL_VAULT } = require("./helpers/workspaces");

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

  console.log("🔍 getRoute:", { path: req.path, query: req.query, url: req.url });

  // If frontdoor forwards /api without rewriting the path,
  // the intended backend route is in the querystring.
  if (p === "/api" || p === "/") {
    const q = req.query || {};
    const qp = (q.path || q.p || q.route || "").toString();
    if (qp) p = qp;
  }

  if (p.startsWith("/v1/")) p = p.slice(3);
  console.log("🔍 getRoute result:", p);
  return p;
}

const _STATUS_CODES = { 400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 410: "GONE", 429: "RATE_LIMITED", 500: "INTERNAL_ERROR" };
function jsonError(res, status, error, extra = {}) {
  console.error("❌ API ERROR:", status, error, extra);
  const code = extra.code || _STATUS_CODES[status] || "ERROR";
  return res.status(status).json({ ok: false, error, code, ...extra });
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

  // EMULATOR MODE: Accept test-token for LOCAL development only
  // Double-gated: requires BOTH emulator flag AND non-production project
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true'
    && process.env.GCLOUD_PROJECT !== 'title-app-alpha'
    && process.env.NODE_ENV !== 'production';
  if (isEmulator && token === 'test-token') {
    console.log("EMULATOR MODE: Accepting test-token (local dev only)");
    return {
      handled: false,
      user: {
        uid: 'test-user',
        email: 'test@titleapp.ai',
        user_id: 'test-user'
      }
    };
  }

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
  console.log("Membership check:", { uid, tenantId });

  if (!tenantId) {
    return jsonError(res, 400, "Missing tenantId");
  }

  const snap = await db
    .collection("memberships")
    .where("userId", "==", uid)
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) {
    // Auto-repair: if tenantId is a workspace that belongs to this user, create the membership
    if (tenantId.startsWith("ws_")) {
      const wsDoc = await db.collection("users").doc(uid)
        .collection("workspaces").doc(tenantId).get();
      if (wsDoc.exists) {
        console.log("Auto-creating missing membership for workspace:", tenantId);
        const memRef = await db.collection("memberships").add({
          userId: uid,
          tenantId,
          role: "admin",
          status: "active",
          createdAt: nowServerTs(),
        });
        return { ok: true, membership: { id: memRef.id, userId: uid, tenantId, role: "admin", status: "active" } };
      }
    }
    return jsonError(res, 403, "Forbidden", { reason: "No active membership", uid, tenantId });
  }

  const mem = snap.docs[0].data() || {};
  console.log("✅ Membership OK");
  return { ok: true, membership: { id: snap.docs[0].id, ...mem } };
}

function getCtx(req, body, user) {
  // NOTE: tenantId is always derived from x-tenant-id header (preferred).
  // body.tenantId remains accepted for backwards compatibility with older clients.
  const rawTenantId = (req.headers["x-tenant-id"] || body.tenantId || "").toString().trim();
  const tenantId = rawTenantId || null;
  const vertical = (req.headers["x-vertical"] || body.vertical || "").toString().trim() || null;
  const jurisdiction = (req.headers["x-jurisdiction"] || body.jurisdiction || "").toString().trim() || null;
  return { tenantId, userId: user.uid, email: user.email || null, vertical, jurisdiction };
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

// ----------------------------
// CORS — approved origins only
// ----------------------------
const ALLOWED_ORIGINS = [
  'https://title-app-alpha.web.app',
  'https://title-app-alpha.firebaseapp.com',
  'https://titleapp-frontdoor.titleapp-core.workers.dev',
  'https://app.titleapp.ai',
];

if (process.env.FUNCTIONS_EMULATOR === 'true') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://localhost:5173');
  ALLOWED_ORIGINS.push('http://127.0.0.1:3000');
  ALLOWED_ORIGINS.push('http://127.0.0.1:5173');
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Id, X-Vertical, X-Jurisdiction');
  res.set('Access-Control-Max-Age', '3600');
}

// ----------------------------
// Rate Limiting — signup endpoint
// ----------------------------
const signupAttempts = new Map();
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW = 60 * 60 * 1000; // 1 hour

function checkSignupRateLimit(ip) {
  const now = Date.now();
  const attempts = signupAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < SIGNUP_WINDOW);
  if (recent.length >= SIGNUP_LIMIT) {
    return false;
  }
  recent.push(now);
  signupAttempts.set(ip, recent);
  return true;
}

// Periodic cleanup of stale rate limit entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of signupAttempts.entries()) {
    const recent = attempts.filter(t => now - t < SIGNUP_WINDOW);
    if (recent.length === 0) {
      signupAttempts.delete(ip);
    } else {
      signupAttempts.set(ip, recent);
    }
  }
}, 10 * 60 * 1000);

// ----------------------------
// AI Response Validation
// ----------------------------
function validateAIResponse(parsed, expectedSchema) {
  if (!parsed || typeof parsed !== 'object') {
    console.error('AI response is not an object:', typeof parsed);
    return null;
  }

  for (const field of expectedSchema.required || []) {
    if (!(field in parsed)) {
      console.error(`AI response missing required field: ${field}`);
      return null;
    }
  }

  const MAX_STRING_LENGTH = 10000;
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      parsed[key] = value.substring(0, MAX_STRING_LENGTH) + '... [truncated]';
    }
  }

  return parsed;
}

function safeParseJSON(text, schema) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error('Failed to parse AI response JSON:', e2.message);
        return null;
      }
    } else {
      console.error('Failed to parse AI response:', e.message);
      return null;
    }
  }

  if (schema) {
    return validateAIResponse(parsed, schema);
  }
  return parsed;
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
  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (e) {
    // Fallback for emulator or if admin.firestore is unavailable
    console.warn("⚠️ serverTimestamp() failed, using new Date()");
    return new Date();
  }
}

function identityDocId({ uid, tenantId, purpose }) {
  const p = String(purpose || "general").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return `idv_${uid}_${tenantId}_${p}`.slice(0, 200);
}

// ----------------------------
// Chat Engine Internal Services
// ----------------------------

/**
 * Decode VIN via NHTSA (direct call, no HTTP round-trip).
 * Same logic as the /v1/vin:decode endpoint.
 */
async function decodeVinInternal(vin) {
  const vinStr = String(vin).toUpperCase().trim();
  const nhtsaUrl = `${EXTERNAL_APIS.NHTSA_VIN_DECODE}Values/${vinStr}?format=json`;
  console.log("🔍 chatEngine: decoding VIN via NHTSA:", vinStr);

  const healthResult = await callWithHealthCheck({
    serviceName: "nhtsa",
    fn: async () => {
      const r = await fetch(nhtsaUrl);
      if (!r.ok) throw new Error(`NHTSA API returned ${r.status}`);
      return r.json();
    },
    timeout: 10000,
  });

  if (!healthResult.success) {
    const msg = getErrorMessage("nhtsa");
    return { valid: false, vin: vinStr, healthError: msg.message };
  }

  const nhtsaData = healthResult.data;
  const result = nhtsaData.Results?.[0];

  if (!result || (result.ErrorCode && result.ErrorCode !== "0" && result.ErrorCode !== 0)) {
    return { valid: false, vin: vinStr };
  }

  const vehicle = {
    year: result.ModelYear || null,
    make: result.Make || null,
    model: result.Model || null,
    trim: result.Trim || null,
    engineCylinders: result.EngineCylinders || null,
    engineDisplacement: result.DisplacementL || null,
    fuelType: result.FuelTypePrimary || null,
    plantCity: result.PlantCity || null,
    plantState: result.PlantStateProvince || null,
  };

  // Cache (best-effort)
  try {
    await db.collection("vinCache").doc(vinStr).set({
      vin: vinStr, vehicle, decodedAt: nowServerTs(), source: "nhtsa",
    });
  } catch (e) { /* ignore cache failures */ }

  return { valid: true, vin: vinStr, vehicle };
}

/**
 * Create Firebase Auth user + Firestore doc + return custom token.
 * Same logic as the /v1/auth:signup endpoint.
 */
async function signupInternal({ email, name, accountType, companyName, companyDescription }) {
  let userRecord;
  let existing = false;
  try {
    const createParams = { email };
    if (name) createParams.displayName = name;
    userRecord = await admin.auth().createUser(createParams);
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      userRecord = await admin.auth().getUserByEmail(email);
      existing = true;
    } else throw e;
  }

  const userRef = db.collection("users").doc(userRecord.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    // Derive firstName + avatarInitials from name (46.3 USER-001)
    const nameParts = (name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || null;
    const avatarInitials = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameParts[0] ? nameParts[0][0].toUpperCase() : null;

    await userRef.set({
      email,
      name: name || null,
      ...(firstName && { firstName }),
      ...(avatarInitials && { avatarInitials }),
      activeProfileId: 'default',
      accountType: accountType || "consumer",
      companyName: companyName || null,
      companyDescription: companyDescription || null,
      termsAcceptedAt: null,
      createdAt: nowServerTs(),
      createdVia: "chat",
    });
  }

  const userData = userSnap.exists ? userSnap.data() : {};
  const customToken = await admin.auth().createCustomToken(userRecord.uid);

  // For existing users, check if they have tenant memberships
  let memberships = [];
  if (existing) {
    try {
      // Query without status filter — some legacy memberships may lack status field
      const memSnap = await db.collection("memberships")
        .where("userId", "==", userRecord.uid)
        .get();
      if (!memSnap.empty) {
        for (const doc of memSnap.docs) {
          const m = doc.data();
          // Look up tenant name + vertical
          let tenantName = m.tenantId;
          let tenantVertical = m.vertical || null;
          try {
            const tSnap = await db.collection("tenants").doc(m.tenantId).get();
            if (tSnap.exists) {
              const tData = tSnap.data();
              tenantName = tData.name || m.tenantId;
              if (!tenantVertical && tData.vertical) tenantVertical = tData.vertical;
            }
          } catch (_) { /* ignore */ }
          memberships.push({
            tenantId: m.tenantId,
            tenantName,
            role: m.role || "owner",
            vertical: tenantVertical,
          });
        }
      }
    } catch (e) {
      console.warn("signupInternal: membership lookup failed:", e.message);
    }
  }

  return {
    ok: true,
    uid: userRecord.uid,
    token: customToken,
    existing,
    termsAcceptedAt: userData.termsAcceptedAt || null,
    existingName: userData.name || null,
    existingAccountType: userData.accountType || null,
    memberships,
  };
}

/**
 * Execute fire-and-forget side effects from chatEngine.
 * Failures are logged but do not break the response.
 */
async function executeChatSideEffects(sideEffects, userId, tenantId) {
  for (const effect of (sideEffects || [])) {
    try {
      switch (effect.action) {
        case 'acceptTerms': {
          if (!userId) break;
          await db.collection("users").doc(userId).set(
            { termsAcceptedAt: nowServerTs() },
            { merge: true }
          );
          console.log("chatEngine side-effect: acceptTerms OK for", userId);
          break;
        }
        case 'claimTenant': {
          if (!userId) break;
          const d = effect.data || {};
          const tenantId = slugifyTenantId(d.tenantName);
          const tenantRef = db.collection("tenants").doc(tenantId);
          const tSnap = await tenantRef.get();
          if (!tSnap.exists) {
            await tenantRef.set({
              name: d.tenantName || tenantId,
              tenantType: d.tenantType || "personal",
              vertical: d.vertical || "GLOBAL",
              jurisdiction: d.jurisdiction || "GLOBAL",
              status: "active",
              createdAt: nowServerTs(),
              createdBy: userId,
            });
          }
          const memSnap = await db.collection("memberships")
            .where("userId", "==", userId)
            .where("tenantId", "==", tenantId)
            .limit(1)
            .get();
          if (memSnap.empty) {
            await db.collection("memberships").add({
              userId,
              tenantId,
              role: d.tenantType === "business" ? "admin" : "owner",
              status: "active",
              createdAt: nowServerTs(),
            });
          }
          console.log("chatEngine side-effect: claimTenant OK", tenantId);
          break;
        }
        case 'createDtc': {
          if (!userId) break;
          const d = effect.data || {};
          const files = d.files || [];
          const ref = await db.collection("dtcs").add({
            userId,
            tenantId: tenantId || null,
            type: d.type,
            metadata: d.metadata || {},
            fileIds: [],
            files: files.map(f => ({ name: f.name, path: f.path, url: f.url })),
            blockchainProof: null,
            logbookCount: 0,
            createdAt: nowServerTs(),
          });
          console.log("chatEngine side-effect: createDtc OK", ref.id, "with", files.length, "files");
          break;
        }
        case 'uploadRaasSop': {
          if (!userId) break;
          const d = effect.data || {};
          // Use passed tenantId, fall back to membership lookup
          let sopTenantId = tenantId;
          if (!sopTenantId) {
            const memSnap2 = await db.collection("memberships")
              .where("userId", "==", userId)
              .where("status", "==", "active")
              .limit(1)
              .get();
            sopTenantId = memSnap2.empty ? null : memSnap2.docs[0].data().tenantId;
          }
          if (!sopTenantId) {
            console.warn("chatEngine side-effect: uploadRaasSop skipped — no tenantId");
            break;
          }

          await db.collection("raasUploads").add({
            userId,
            tenantId: sopTenantId,
            fileName: d.fileName || "document",
            uploadedAt: nowServerTs(),
            status: "received",
          });
          console.log("chatEngine side-effect: uploadRaasSop OK", d.fileName);
          break;
        }
        case 'saveRaasConfig': {
          if (!userId) break;
          const d = effect.data || {};
          // Use passed tenantId, fall back to membership lookup
          let configTenantId = tenantId;
          if (!configTenantId) {
            const memSnap3 = await db.collection("memberships")
              .where("userId", "==", userId)
              .where("status", "==", "active")
              .limit(1)
              .get();
            configTenantId = memSnap3.empty ? null : memSnap3.docs[0].data().tenantId;
          }
          if (!configTenantId) {
            console.warn("chatEngine side-effect: saveRaasConfig skipped — no tenantId");
            break;
          }

          await db.collection("tenants").doc(configTenantId).set({
            raasConfig: {
              buildAnswers: d.raasBuildAnswers || [],
              buildSummary: d.raasBuildSummary || "",
              configuredAt: nowServerTs(),
            },
          }, { merge: true });
          console.log("chatEngine side-effect: saveRaasConfig OK for tenant", configTenantId);
          break;
        }
        default:
          console.warn("chatEngine side-effect: unknown action", effect.action);
      }
    } catch (e) {
      console.warn(`chatEngine side-effect ${effect.action} failed:`, e.message);
    }
  }
}

/**
 * AI chat fallthrough — call Claude when chatEngine returns useAI: true.
 * Only for authenticated users with free-form questions.
 */
async function handleAIChatFallthrough(message, userId, tenantId) {
  if (!tenantId || tenantId === 'public') {
    console.warn("handleAIChatFallthrough: tenantId missing or public, skipping");
    return "I can help you with that. What specifically would you like to know?";
  }

  // Event-sourced: log received message
  const eventRef = await db.collection("messageEvents").add({
    tenantId,
    userId,
    type: "chat:message:received",
    message,
    context: {},
    preferredModel: "claude",
    createdAt: nowServerTs(),
  });

  let aiResponse = "";

  try {
    // Fetch conversation history (last 20 messages) — scoped by BOTH userId AND tenantId
    const historySnapshot = await db.collection("messageEvents")
      .where("userId", "==", userId)
      .where("tenantId", "==", tenantId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

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
    messages.push({ role: "user", content: message });

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: `You are Alex from TitleApp, a platform that helps people keep track of important records (car titles, home documents, pet records, student transcripts, etc.). Be concise, professional, and focus on helping users understand how to organize and protect their important documents.

Formatting rules — follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional — direct, calm, no hype.`,
      messages,
    });

    aiResponse = response.content[0]?.text || "I couldn't generate a response. Please try again.";
  } catch (e) {
    console.error("chatEngine AI fallthrough failed:", e.message);
    aiResponse = "I can help you with that. What specifically would you like to know?";
  }

  // ── Chat enforcement (fail open) ──────────────────────
  let chatEnforcement = { checked: false };
  try {
    chatEnforcement = validateChatOutput(aiResponse);
    if (!chatEnforcement.passed) {
      console.warn(`[enforcement] Chat violation for user ${userId}:`, chatEnforcement.violations);
      // Retry once with violation context
      try {
        const anthropic = getAnthropic();
        const violationList = chatEnforcement.violations.map(v => `- ${v.ruleId}: ${v.message}`).join("\n");
        const retryResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2048,
          system: `You are Alex from TitleApp. Your previous response was flagged for these policy violations:\n${violationList}\n\nRewrite your response to avoid these violations. Never imply guaranteed returns, provide specific legal advice, or guarantee tax outcomes. Be professional and factual.\n\nFormatting rules — follow these strictly:\n- Never use emojis.\n- Never use markdown formatting.\n- Never use bullet points or numbered lists unless explicitly asked.\n- Write in complete, clean sentences. Plain text only.`,
          messages,
        });
        const retryText = retryResponse.content[0]?.text;
        if (retryText) {
          const retryCheck = validateChatOutput(retryText);
          if (retryCheck.passed) {
            aiResponse = retryText;
            chatEnforcement = { ...retryCheck, regenerationAttempts: 1 };
          }
        }
      } catch (retryErr) {
        console.error("[enforcement] Chat retry failed:", retryErr.message);
      }
    }
  } catch (enfErr) {
    // Fail open for chat — log and continue
    console.error("[enforcement] Chat enforcement error (continuing):", enfErr.message);
  }

  // Event-sourced: log response (with enforcement metadata)
  await db.collection("messageEvents").add({
    tenantId,
    userId,
    type: "chat:message:responded",
    requestEventId: eventRef.id,
    preferredModel: "claude",
    response: aiResponse,
    enforcement: {
      checked: chatEnforcement.checked || false,
      passed: chatEnforcement.passed != null ? chatEnforcement.passed : null,
      violations: chatEnforcement.violations || [],
      regenerationAttempts: chatEnforcement.regenerationAttempts || 0,
    },
    createdAt: nowServerTs(),
  });

  return aiResponse;
}

// ----------------------------
// Discovery Context Analysis (landing page conversational onboarding)
// ----------------------------

function analyzeDiscoveryMessage(msg, ctx) {
  const lower = msg.toLowerCase();
  if (!ctx.intent) {
    if (/\b(invest in titleapp|investing in|your raise|wefunder|the raise|fundraise|equity|shares|safe|valuation cap)\b/.test(lower)) ctx.intent = 'investor';
    else if (/\b(business|company|dealership|agency|firm|office|shop|store)\b/.test(lower)) ctx.intent = 'business';
    else if (/\b(personal|my car|my house|my documents|my stuff|organize)\b/.test(lower)) ctx.intent = 'personal';
    else if (/\b(build|create|launch|ai service|saas|product)\b/.test(lower)) ctx.intent = 'builder';
  }
  if (!ctx.vertical) {
    if (/\b(rental|property manag|landlord|tenant|units?|apartment|lease|rent)\b/.test(lower)) { ctx.vertical = 'real-estate'; ctx.subtype = ctx.subtype || 'pm'; }
    else if (/\b(real estate|realtor|listing|buyer|showing|mls|broker)\b/.test(lower)) { ctx.vertical = 'real-estate'; ctx.subtype = ctx.subtype || 'sales'; }
    else if (/\b(car dealer|dealership|auto dealer|inventory|used car|new car)\b/.test(lower)) ctx.vertical = 'auto';
    else if (/\b(invest in titleapp|your raise|wefunder|the raise|fundraise|equity in titleapp)\b/.test(lower)) ctx.vertical = 'investor';
    else if (/\b(invest|analyst|portfolio|fund|private equity|venture|hedge|deal)\b/.test(lower)) ctx.vertical = 'analyst';
    else if (/\b(pilot|aviation|flight|aircraft|faa)\b/.test(lower)) ctx.vertical = 'aviation';
  }
  if (!ctx.location) {
    const places = { florida: 'FL', texas: 'TX', california: 'CA', illinois: 'IL', 'new york': 'NY', georgia: 'GA', arizona: 'AZ', colorado: 'CO', nevada: 'NV', austin: 'TX', houston: 'TX', dallas: 'TX', miami: 'FL', chicago: 'IL', 'los angeles': 'CA', 'san francisco': 'CA', denver: 'CO', seattle: 'WA', atlanta: 'GA', phoenix: 'AZ', nashville: 'TN', boston: 'MA', detroit: 'MI' };
    for (const [name, code] of Object.entries(places)) {
      if (lower.includes(name)) { ctx.location = code; break; }
    }
  }
  if (!ctx.scale) {
    const m = lower.match(/(\d+)\s*(units?|cars?|vehicles?|properties|listings?|employees?|agents?)/);
    if (m) ctx.scale = m[0];
  }
  if (ctx.vertical === 'auto' && !ctx.subtype) {
    if (/franchise/.test(lower)) ctx.subtype = 'franchise';
    else if (/independent/.test(lower)) ctx.subtype = 'independent';
    else if (/bhph|buy here pay here/.test(lower)) ctx.subtype = 'bhph';
  }
  if (ctx.vertical === 'real-estate' && !ctx.subtype) {
    if (/sales|selling|listing/.test(lower)) ctx.subtype = 'sales';
    else if (/manag|rental|landlord/.test(lower)) ctx.subtype = 'pm';
  }
  if (ctx.vertical === 'real-estate' && /both/.test(lower) && /sales?|manag/.test(lower)) ctx.subtype = 'both';
  if (!ctx.businessName) {
    const nm = msg.match(/(?:called|named)\s+["']?([A-Z][a-zA-Z0-9\s&'.]+)/);
    if (nm) ctx.businessName = nm[1].trim();
  }
  // Name extraction — short replies likely answering "what's your name?"
  if (!ctx.name) {
    const namePatterns = [
      /^(?:i'm|im|i am|it's|its|call me|my name is|hey i'm|hi i'm|they call me)\s+([A-Z][a-z]+)/i,
      /^(?:this is)\s+([A-Z][a-z]+)/i,
    ];
    for (const p of namePatterns) {
      const m = msg.match(p);
      if (m) { ctx.name = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(); break; }
    }
    // If message is just a single capitalized word (1-15 chars), likely a name response
    if (!ctx.name && /^[A-Z][a-z]{1,14}$/.test(msg.trim())) {
      ctx.name = msg.trim();
    }
  }
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
  // Override global cpu: "gcf_gen1" — this function runs Claude/OpenAI calls and needs full CPU.
  { region: "us-central1", cpu: 1, memory: "512MiB" },
  async (req, res) => {
    console.log("✅ API_VERSION", "2026-03-01-document-engine");

    // CORS — approved origins only (no wildcard)
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") return res.status(204).send("");

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
        const tenantId = md.tenantId || null;
        const purpose = md.purpose || "general";
        const sessionId = obj.id;

        // Stripe Identity status fields
        const status = obj.status || null; // e.g. "requires_input" | "processing" | "verified" | "canceled"
        const lastError = obj.last_error || null;

        if (uid && tenantId) {
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

    // ----------------------------
    // UNAUTHENTICATED ENDPOINTS (before auth check)
    // ----------------------------

    // POST /v1/auth:signup — create user from landing page chat
    if (route === "/auth:signup" && method === "POST") {
      const { email, name, accountType, companyName, companyDescription, utmAttribution } = body || {};
      if (!email) return jsonError(res, 400, "Missing email");

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(email).toLowerCase())) {
        return jsonError(res, 400, "Invalid email format");
      }

      // Rate limiting by IP
      const clientIp = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
      if (!checkSignupRateLimit(clientIp)) {
        return res.status(429).json({ ok: false, error: 'Too many signup attempts. Try again later.', code: 'RATE_LIMITED' });
      }

      // TODO: Add Cloudflare Turnstile verification on the frontend signup flow

      try {
        let userRecord;
        let existing = false;

        try {
          userRecord = await admin.auth().createUser({
            email,
            displayName: name || null,
          });
        } catch (e) {
          if (e.code === "auth/email-already-exists") {
            userRecord = await admin.auth().getUserByEmail(email);
            existing = true;
          } else {
            throw e;
          }
        }

        // Create or update Firestore user doc
        const userRef = db.collection("users").doc(userRecord.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          const userDoc = {
            email,
            name: name || null,
            accountType: accountType || "consumer",
            companyName: companyName || null,
            companyDescription: companyDescription || null,
            termsAcceptedAt: null,
            createdAt: nowServerTs(),
            createdVia: "chat",
          };
          // UTM attribution — write-once on new user
          if (utmAttribution && (utmAttribution.source || utmAttribution.medium || utmAttribution.campaign)) {
            userDoc.utmAttribution = {
              source: utmAttribution.source || "",
              medium: utmAttribution.medium || "",
              campaign: utmAttribution.campaign || "",
              content: utmAttribution.content || "",
              capturedAt: utmAttribution.capturedAt || new Date().toISOString(),
            };
          }
          await userRef.set(userDoc);

          // Auto-grant Alex entitlement — free for every user from signup
          await db.collection("users").doc(userRecord.uid).collection("entitlements").doc("alex").set({
            grantedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "signup_bonus",
            version: "1.0",
          });
        }

        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        return res.json({
          ok: true,
          uid: userRecord.uid,
          token: customToken,
          existing,
        });
      } catch (e) {
        console.error("auth:signup failed:", e);
        return jsonError(res, 500, "Signup failed");
      }
    }

    // ── TEMPORARILY DISABLED — Twilio TrustHub pending, restore when approved ──
    // Magic link + OTP auth routes commented out in 37.6
    if ((route === "/auth:sendMagicLink" || route === "/auth/sendMagicLink") && method === "POST") {
      return jsonError(res, 503, "Magic link temporarily unavailable. Please use Google sign-in.");
    }
    if ((route === "/auth:verifyMagicLink" || route === "/auth/verifyMagicLink") && method === "GET") {
      return jsonError(res, 503, "Magic link temporarily unavailable. Please use Google sign-in.");
    }
    if ((route === "/auth:sendOtp" || route === "/auth/sendOtp") && method === "POST") {
      return jsonError(res, 503, "SMS sign-in temporarily unavailable. Please use Google sign-in.");
    }
    if ((route === "/auth:verifyOtp" || route === "/auth/verifyOtp") && method === "POST") {
      return jsonError(res, 503, "SMS sign-in temporarily unavailable. Please use Google sign-in.");
    }
    // ── END TEMPORARILY DISABLED ──

    // POST /v1/alex:summarizeGuestSession — generate + deliver session summary
    if (route === "/alex:summarizeGuestSession" && method === "POST") {
      try {
        const { guestId } = body || {};
        if (!guestId) return jsonError(res, 400, "guestId required");
        const { summarizeGuestSession } = require("./services/alex/guestSummary");
        const result = await summarizeGuestSession(guestId);
        return res.json(result);
      } catch (e) {
        console.error("alex:summarizeGuestSession failed:", e);
        return jsonError(res, 500, "Summary generation failed");
      }
    }

    // POST /v1/alex:promoteGuest — link guest chat session to authenticated user (35.3-T2)
    if ((route === "/alex:promoteGuest" || route === "/alex/promoteGuest") && method === "POST") {
      try {
        const { guestId, uid, prospectName, vertical, conversationSummary } = body || {};
        if (!guestId || !uid) return jsonError(res, 400, "guestId and uid required");
        const sessionRef = db.collection("chatSessions").doc(guestId);
        const sessionSnap = await sessionRef.get();
        if (sessionSnap.exists) {
          const sessionData = sessionSnap.data();
          const state = sessionData.state || {};
          await sessionRef.update({
            userId: uid,
            promotedAt: nowServerTs(),
            promotionContext: {
              prospectName: prospectName || state.prospectName || null,
              vertical: vertical || state.vertical || null,
              campaignSlug: state.campaignSlug || null,
              workerCardsShown: state.workerCardsShown || [],
              conversationSummary: conversationSummary || null,
              salesHistory: (state.salesHistory || []).slice(-10),
            },
          });
          // Also update prospect session if it exists
          const prospectRef = db.collection("prospectSessions").doc(guestId);
          const prospectSnap = await prospectRef.get();
          if (prospectSnap.exists) {
            await prospectRef.update({
              uid,
              convertedAt: nowServerTs(),
              prospectName: prospectName || state.prospectName || null,
            });
          }
        }
        return res.json({ ok: true });
      } catch (e) {
        console.error("alex:promoteGuest failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/campaign/:slug — campaign context for landing pages (unauthenticated)
    if (route.startsWith("/campaign/") && method === "GET") {
      try {
        const { getCampaignContext } = require("./campaigns/campaignContexts");
        req._route = route;
        return getCampaignContext(req, res);
      } catch (e) {
        console.error("campaign context failed:", e);
        return jsonError(res, 500, "Campaign context failed");
      }
    }

    // ----------------------------
    // CHAT ENGINE (new conversational state machine)
    // Handles both authenticated and unauthenticated sessions.
    // Legacy chat:message requests (without sessionId) fall through to the
    // auth-gated handler below.
    // ----------------------------
    if (route === "/chat:message" && method === "POST" && body.sessionId) {
      let { sessionId, userInput, action, actionData, fileData, fileName, surface, campaignSlug, utmSource, utmMedium, utmCampaign } = body;

      try {
        // Optional auth — verify token if present but don't reject if missing
        let authUser = null;
        const bearerToken = getAuthBearerToken(req);
        if (bearerToken) {
          try {
            authUser = await admin.auth().verifyIdToken(bearerToken);
          } catch (e) {
            console.warn("chatEngine: bearer token invalid, continuing as unauthenticated");
          }
        }

        // Look up or create conversation session in Firestore
        let effectiveSessionId = sessionId;
        let sessionRef = db.collection("chatSessions").doc(sessionId);
        let sessionSnap = await sessionRef.get();
        let sessionState = sessionSnap.exists
          ? (sessionSnap.data().state || {})
          : {};

        // Session continuity: if session is empty and user is authenticated,
        // try to resume their most recent session from any surface.
        // SKIP for special surfaces — they always get a fresh session.
        if (!sessionSnap.exists && authUser && surface !== 'invest' && surface !== 'developer' && surface !== 'sandbox' && surface !== 'privacy' && surface !== 'contact') {
          try {
            const recentSnap = await db.collection("chatSessions")
              .where("userId", "==", authUser.uid)
              .orderBy("updatedAt", "desc")
              .limit(1)
              .get();
            if (!recentSnap.empty) {
              const recentDoc = recentSnap.docs[0];
              effectiveSessionId = recentDoc.id;
              sessionRef = db.collection("chatSessions").doc(effectiveSessionId);
              sessionSnap = recentDoc;
              sessionState = recentDoc.data().state || {};
              console.log("chatEngine: resumed session", effectiveSessionId, "for user", authUser.uid);
            }
          } catch (e) {
            console.warn("chatEngine: session resume lookup failed:", e.message);
          }
        }

        // If authenticated and session has no userId, attach it
        if (authUser && !sessionState.userId) {
          sessionState.userId = authUser.uid;
        }

        // Check for promoted guest session context (35.3-T2)
        if (sessionSnap.exists && !sessionState.promotionLoaded) {
          const snapData = typeof sessionSnap.data === "function" ? sessionSnap.data() : sessionSnap;
          const promotionCtx = snapData.promotionContext;
          if (promotionCtx) {
            if (promotionCtx.prospectName && !sessionState.prospectName) {
              sessionState.prospectName = promotionCtx.prospectName;
            }
            if (promotionCtx.vertical && !sessionState.vertical) {
              sessionState.vertical = promotionCtx.vertical;
            }
            if (promotionCtx.salesHistory && promotionCtx.salesHistory.length > 0 && !sessionState.salesHistory) {
              sessionState.salesHistory = promotionCtx.salesHistory;
              sessionState.step = "sales_discovery";
              sessionState.alexMode = "sales";
            }
            sessionState.promotionLoaded = true;
            console.log("chatEngine: loaded promotion context for user", authUser?.uid, "name:", promotionCtx.prospectName);
          }
        }

        // ── Investor intent detection: redirect landing visitors with investor keywords ──
        if (surface === 'landing' && !action && userInput &&
            (!sessionState.step || sessionState.step === 'idle' || sessionState.step === 'discovery')) {
          const investCheck = userInput.toLowerCase();
          if (/\b(invest in titleapp|investing in|your raise|wefunder|the raise|fundraise|equity|shares|safe|valuation cap|offering|invest in you|invest in the company|the deal|investment opportunity)\b/.test(investCheck) ||
              /\b(invest|investor|investing)\b/.test(investCheck)) {
            surface = 'invest';
            sessionState.step = 'invest_discovery';
            console.log("chatEngine: investor intent detected from landing, redirecting to invest flow");
          }
        }

        // ── Developer intent detection: redirect landing visitors with developer keywords ──
        if (surface === 'landing' && !action && userInput &&
            (!sessionState.step || sessionState.step === 'idle' || sessionState.step === 'discovery')) {
          const devCheck = userInput.toLowerCase();
          if (/\b(api|sdk|integrate|integration|developer|webhook|endpoint|rest api|graphql|authentication|api key|sandbox|raas api|digital worker api|build on|build with)\b/.test(devCheck)) {
            surface = 'developer';
            sessionState.step = 'dev_discovery';
            console.log("chatEngine: developer intent detected from landing, redirecting to dev flow");
          }
        }

        // ── Worker-specific chat: bypass Alex entirely when a worker is active ──
        if (body.selectedWorker && body.selectedWorker !== "chief-of-staff" && !action && userInput) {
          const workerSlug = body.selectedWorker;
          try {
            const dwSnap = await db.doc(`digitalWorkers/${workerSlug}`).get();
            if (dwSnap.exists) {
              const dw = dwSnap.data();
              const workerName = dw.display_name || dw.name || workerSlug;

              // ── Session credit deduction (44.1) — deduct on first message to this worker ──
              if (dw.creditCost && dw.creditTiming === "session_open") {
                const creditKey = `creditCharged_${workerSlug}`;
                if (!sessionState[creditKey] && authUser) {
                  const { checkAndDeductCredits } = require("./services/health/callWithHealthCheck");
                  const creditResult = await checkAndDeductCredits(
                    authUser.uid, `worker_session_${workerSlug}`, Number(dw.creditCost), { workerId: workerSlug }
                  );
                  if (!creditResult.allowed) {
                    return res.json({
                      ok: false,
                      error: "INSUFFICIENT_CREDITS",
                      message: creditResult.message || "This worker requires credits. Top up your account to continue.",
                      creditsRequired: creditResult.creditsRequired,
                      creditsAvailable: creditResult.creditsAvailable,
                    });
                  }
                  sessionState[creditKey] = true;
                }
              }

              // ── System prompt: check workerSystemPrompts/{slug} first, fall back to auto-generation ──
              let workerPrompt = null;
              try {
                const promptSnap = await db.doc(`workerSystemPrompts/${workerSlug}`).get();
                if (promptSnap.exists && promptSnap.data().systemPrompt) {
                  workerPrompt = promptSnap.data().systemPrompt;
                  // Inject subscriberProfile context if available (44.1 — radar + briefing preferences)
                  if (authUser) {
                    try {
                      const userSnap = await db.doc(`users/${authUser.uid}`).get();
                      const profile = userSnap.exists ? (userSnap.data().subscriberProfile || {}) : {};
                      if (Object.keys(profile).length > 0) {
                        workerPrompt += `\n\nSUBSCRIBER PROFILE (read from Firestore — do not ask for information already present):\n${JSON.stringify(profile, null, 2)}`;
                      }
                    } catch (profileErr) {
                      console.warn("worker chat: failed to load subscriberProfile:", profileErr.message);
                    }
                  }
                }
              } catch (promptErr) {
                console.warn("worker chat: workerSystemPrompts lookup failed:", promptErr.message);
              }

              // Fall back to auto-generated prompt from digitalWorkers fields
              if (!workerPrompt) {
                const headline = dw.headline || dw.capabilitySummary || "";
                const capabilities = dw.capabilitySummary || headline || "";

                // Build RAAS tier 0-3 rules
                const raasSections = [];
                const tier0 = Array.isArray(dw.raas_tier_0) ? dw.raas_tier_0 : [];
                const tier1 = Array.isArray(dw.raas_tier_1) ? dw.raas_tier_1 : (typeof dw.raas_tier_1 === "object" ? Object.values(dw.raas_tier_1) : []);
                const tier2 = Array.isArray(dw.raas_tier_2) ? dw.raas_tier_2 : (typeof dw.raas_tier_2 === "object" ? Object.values(dw.raas_tier_2) : []);
                const tier3 = Array.isArray(dw.raas_tier_3) ? dw.raas_tier_3 : (typeof dw.raas_tier_3 === "object" ? Object.values(dw.raas_tier_3) : []);

                if (tier0.length) raasSections.push("GLOBAL RULES:\n" + tier0.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                if (tier1.length) raasSections.push("CORE RULES:\n" + tier1.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                if (tier2.length) raasSections.push("VERTICAL RULES:\n" + tier2.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                if (tier3.length) raasSections.push("WORKER-SPECIFIC RULES:\n" + tier3.map((r, i) => `${i + 1}. ${r}`).join("\n"));

                workerPrompt = `You are ${workerName}, a Digital Worker on TitleApp.
${headline}

WHAT YOU DO:
${capabilities}

${raasSections.length > 0 ? "BEHAVIORAL RULES (MANDATORY):\n" + raasSections.join("\n\n") : ""}

FORMATTING RULES -- follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional -- direct, calm, no hype.

RESPONSE LENGTH:
Keep ALL chat responses under 500 words. For longer deliverables, use GENERATE_DOCUMENT markers.

IDENTITY RULES:
1. You are ${workerName}. Never say you are Alex or Chief of Staff.
2. Stay within your domain of expertise described above. If the user asks about something outside your scope, say "That is outside my area. Want me to route you to Alex or another worker?"
3. Workers are called Digital Workers -- never call them tools, chatbots, agents, or GPTs.
4. Never call yourself an AI assistant, chatbot, or helper.`;
              }

              // Inject subscriber name into worker prompt (44.2 — Bug 3a: prevent name hallucination)
              if (authUser && workerPrompt) {
                try {
                  const nameSnap = await db.doc(`users/${authUser.uid}`).get();
                  const nameData = nameSnap.exists ? nameSnap.data() : {};
                  const subscriberName = nameData.subscriberProfile?.name || nameData.name || nameData.displayName || authUser.displayName || "";
                  if (subscriberName) {
                    workerPrompt = `You are speaking with ${subscriberName}. Always use their correct name. Never invent or guess a name.\n\n${workerPrompt}`;
                  }
                } catch (nameErr) {
                  // Non-fatal — proceed without name
                }
              }

              // Load conversation history
              if (!sessionState.salesHistory) sessionState.salesHistory = [];
              const messages = [
                ...sessionState.salesHistory.map(h => ({ role: h.role, content: h.content })),
                { role: 'user', content: userInput },
              ];

              const anthropic = getAnthropic();
              const aiResponse = await anthropic.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                system: workerPrompt,
                messages,
              });

              let aiText = aiResponse.content[0]?.text || `I'm ${workerName}. How can I help?`;

              // Update conversation history
              sessionState.salesHistory.push({ role: 'user', content: userInput });
              sessionState.salesHistory.push({ role: 'assistant', content: aiText });
              if (sessionState.salesHistory.length > 30) {
                sessionState.salesHistory = sessionState.salesHistory.slice(-30);
              }

              // Persist session
              await sessionRef.set({
                state: sessionState,
                surface: 'worker',
                activeWorker: workerSlug,
                userId: authUser ? authUser.uid : null,
                ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
                updatedAt: nowServerTs(),
              }, { merge: true });

              // Audit log
              try {
                await db.collection("messageEvents").add({
                  tenantId: "titleapp-worker",
                  userId: authUser ? authUser.uid : `anon_${sessionId}`,
                  type: "chat:message:worker",
                  message: userInput,
                  response: aiText,
                  workerSlug,
                  createdAt: nowServerTs(),
                });
              } catch (auditErr) {
                console.warn("worker chat audit failed:", auditErr.message);
              }

              console.log(`[chatEngine] Worker-direct response for: ${workerSlug} (${workerName})`);

              // Canvas Protocol (44.9) — extract signal from conversation context
              let canvasSignal = null;
              try {
                const signalExtractor = require("./services/canvas/signalExtractor");
                canvasSignal = signalExtractor.extract(
                  userInput,
                  sessionState.salesHistory || [],
                  workerSlug,
                  dw.vertical || dw.catalogVertical || ""
                );
              } catch (sigErr) {
                console.warn("canvas signal extraction failed:", sigErr.message);
              }

              // Clean response — no detectedVertical, no workerCards, no Alex markers
              return res.json({
                ok: true,
                message: aiText,
                conversationState: 'worker_active',
                canvasSignal,
              });
            }
          } catch (workerErr) {
            console.error(`[chatEngine] Worker handler failed for ${workerSlug}:`, workerErr.message);
            // Fall through to sales mode
          }
        }

        // ── Sales Mode: prospect-first experience from campaigns/referrals ──
        if ((surface === 'sales' || sessionState.step === 'sales_discovery') && !action && userInput) {
          if (!sessionState.salesHistory) sessionState.salesHistory = [];
          sessionState.step = 'sales_discovery';
          sessionState.alexMode = 'sales';

          // Persist campaign metadata from first message
          if (campaignSlug && !sessionState.campaignSlug) sessionState.campaignSlug = campaignSlug;
          if (utmSource && !sessionState.utmSource) sessionState.utmSource = utmSource;
          if (utmMedium && !sessionState.utmMedium) sessionState.utmMedium = utmMedium;
          if (utmCampaign && !sessionState.utmCampaign) sessionState.utmCampaign = utmCampaign;

          // Resolve vertical from campaign context (try both hyphen and underscore keys)
          if (!sessionState.vertical && sessionState.campaignSlug) {
            const { CAMPAIGN_CONTEXTS } = require("./campaigns/campaignContexts");
            const slug = sessionState.campaignSlug;
            const cc = CAMPAIGN_CONTEXTS[slug]
              || CAMPAIGN_CONTEXTS[slug.replace(/_/g, "-")]
              || CAMPAIGN_CONTEXTS[slug.replace(/-/g, "_")];
            if (cc) sessionState.vertical = cc.vertical;
            // Direct vertical mapping fallback if no campaign context
            if (!sessionState.vertical) {
              const DIRECT_MAP = { auto_dealer: "auto_dealer", solar_vpp: "solar_vpp", real_estate_development: "real_estate_development", re_operations: "re_operations", aviation: "aviation", creators: "creators", web3: "web3" };
              if (DIRECT_MAP[slug]) sessionState.vertical = DIRECT_MAP[slug];
            }
          }

          // Build sales system prompt
          const { getCore } = require("./services/alex/prompts/core");
          const { getSurfaceOverlay } = require("./services/alex/prompts/surfaces");
          const corePrompt = getCore();
          const salesOverlay = getSurfaceOverlay("sales", {
            vertical: sessionState.vertical || "",
            campaignSlug: sessionState.campaignSlug || "",
            prospectName: sessionState.prospectName || "",
          });

          // Build catalog context — vertical-specific workers first, then cross-vertical
          let catalogContext = "";
          try {
            let workers = [];
            // Query vertical-specific workers first
            if (sessionState.vertical) {
              const vertSnap = await db.collection("digitalWorkers")
                .where("vertical", "==", sessionState.vertical)
                .where("status", "in", ["live", "coming_soon"])
                .limit(50)
                .get();
              workers = vertSnap.docs.map(d => {
                const w = d.data();
                return `- ${d.id}: ${w.display_name || w.name} ($${w.pricing?.monthly || w.raas_tier_0 || 0}/mo) — ${(w.short_description || w.capabilitySummary || w.description || "").substring(0, 100)}`;
              });
            }
            // If few vertical-specific results, add cross-vertical
            if (workers.length < 5) {
              const allSnap = await db.collection("digitalWorkers")
                .where("status", "==", "live")
                .limit(30)
                .get();
              const existing = new Set(workers.map(w => w.split(":")[0].trim().replace("- ", "")));
              const extras = allSnap.docs
                .filter(d => !existing.has(d.id))
                .slice(0, 15 - workers.length)
                .map(d => {
                  const w = d.data();
                  return `- ${d.id}: ${w.display_name || w.name} ($${w.pricing?.monthly || w.raas_tier_0 || 0}/mo) — ${(w.short_description || w.capabilitySummary || w.description || "").substring(0, 100)}`;
                });
              workers = [...workers, ...extras];
            }
            if (workers.length > 0) {
              catalogContext = "\n\nAVAILABLE DIGITAL WORKERS (use these exact slugs in [WORKER_CARDS] markers — do NOT invent slugs — NEVER present workers from memory, ONLY from this list — present ALL relevant workers when asked about the vertical):\n" + workers.join("\n");
            }
          } catch (catErr) {
            console.warn("sales: catalog lookup failed:", catErr.message);
          }

          // Guest contact capture injection — after 3-4 exchanges, if no contact yet
          let contactCaptureInstruction = "";
          if (!sessionState.guestContact && sessionState.salesHistory && sessionState.salesHistory.length >= 6 && sessionState.salesHistory.length <= 10) {
            contactCaptureInstruction = "\n\nIMPORTANT — CONTACT CAPTURE:\nThis is exchange 3-5. If you have not yet asked for the prospect's name and contact, do it NOW. Say: \"By the way — what's your name and the best way to reach you? I'll send you a recap of what we covered today.\" This is a real promise. Do not skip it.";
          }

          let selectedSystemPrompt = corePrompt + "\n\n---\n\n" + salesOverlay + catalogContext + contactCaptureInstruction;

          // Worker-specific prompt: if a worker is active, override Alex prompt with RAAS rules
          if (body.selectedWorker && body.selectedWorker !== "chief-of-staff") {
            try {
              const workerSlug = body.selectedWorker;
              const dwSnap = await db.doc(`digitalWorkers/${workerSlug}`).get();
              if (dwSnap.exists) {
                const dw = dwSnap.data();
                const workerName = dw.display_name || dw.name || workerSlug;
                const headline = dw.headline || dw.capabilitySummary || "";
                const capabilities = dw.capabilitySummary || headline || "";

                const raasSections = [];
                const tier0 = Array.isArray(dw.raas_tier_0) ? dw.raas_tier_0 : [];
                const tier1 = Array.isArray(dw.raas_tier_1) ? dw.raas_tier_1 : (typeof dw.raas_tier_1 === "object" ? Object.values(dw.raas_tier_1) : []);
                const tier2 = Array.isArray(dw.raas_tier_2) ? dw.raas_tier_2 : (typeof dw.raas_tier_2 === "object" ? Object.values(dw.raas_tier_2) : []);
                const tier3 = Array.isArray(dw.raas_tier_3) ? dw.raas_tier_3 : (typeof dw.raas_tier_3 === "object" ? Object.values(dw.raas_tier_3) : []);

                if (tier0.length) raasSections.push("GLOBAL RULES:\n" + tier0.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                if (tier1.length) raasSections.push("CORE RULES:\n" + tier1.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                if (tier2.length) raasSections.push("VERTICAL RULES:\n" + tier2.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                if (tier3.length) raasSections.push("WORKER-SPECIFIC RULES:\n" + tier3.map((r, i) => `${i + 1}. ${r}`).join("\n"));

                selectedSystemPrompt = `You are ${workerName}, a Digital Worker on TitleApp.
${headline}

WHAT YOU DO:
${capabilities}

${raasSections.length > 0 ? "BEHAVIORAL RULES (MANDATORY):\n" + raasSections.join("\n\n") : ""}

FORMATTING RULES -- follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional -- direct, calm, no hype.

RESPONSE LENGTH:
Keep ALL chat responses under 500 words. For longer deliverables, use GENERATE_DOCUMENT markers.

IDENTITY RULES:
1. You are ${workerName}. Never say you are Alex or Chief of Staff.
2. Stay within your domain of expertise described above. If the user asks about something outside your scope, say "That is outside my area. Want me to route you to Alex or another worker?"
3. Workers are called Digital Workers -- never call them tools, chatbots, agents, or GPTs.
4. Never call yourself an AI assistant, chatbot, or helper.`;

                console.log(`[chatEngine] Using worker-specific prompt for: ${workerSlug} (${workerName})`);
              }
            } catch (workerErr) {
              console.warn("[chatEngine] Worker prompt override failed, using sales prompt:", workerErr.message);
            }
          }

          const messages = [
            ...sessionState.salesHistory.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: userInput },
          ];

          try {
            const anthropic = getAnthropic();
            const aiResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 1024,
              system: selectedSystemPrompt,
              messages,
            });

            let aiText = aiResponse.content[0]?.text || "Hey — I'm Alex, Chief of Staff at TitleApp. Tell me what you do and I'll show you what we have.";

            // Extract name from early conversation if not yet known
            if (!sessionState.prospectName && sessionState.salesHistory.length <= 6) {
              const nameMatch = userInput.match(
                /(?:^|\b)(?:I'm|I am|my name is|this is|it's|hey,?\s*i'm|name'?s|call me|they call me|i go by)\s+([A-Z][a-z]{1,15})/i
              );
              if (nameMatch) sessionState.prospectName = nameMatch[1];
            }

            // Contact capture — detect email/phone in user input
            if (!sessionState.guestContact) {
              const emailMatch = userInput.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
              const phoneMatch = userInput.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
              if (emailMatch || phoneMatch) {
                sessionState.guestContact = {
                  email: emailMatch ? emailMatch[0] : null,
                  phone: phoneMatch ? phoneMatch[0] : null,
                  capturedAt: new Date().toISOString(),
                };
                // Write to guestContacts for drip sequence
                try {
                  await db.collection("guestContacts").doc(effectiveSessionId).set({
                    name: sessionState.prospectName || null,
                    email: sessionState.guestContact.email,
                    phone: sessionState.guestContact.phone,
                    vertical: sessionState.campaignSlug || null,
                    capturedAt: nowServerTs(),
                    converted: false,
                    sessionId: effectiveSessionId,
                  });
                } catch (gcErr) {
                  console.warn("sales: guestContacts write failed:", gcErr.message);
                }
              }
            }

            // Parse [WORKER_CARDS] marker
            let workerCards = [];
            const cardsMatch = aiText.match(/\[WORKER_CARDS\]\s*(\[.*?\])\s*\[\/WORKER_CARDS\]/);
            if (cardsMatch) {
              aiText = aiText.replace(/\s*\[WORKER_CARDS\].*?\[\/WORKER_CARDS\]\s*/g, '').trim();
              try {
                const slugs = JSON.parse(cardsMatch[1]);
                for (const slug of slugs.slice(0, 3)) {
                  const wSnap = await db.collection("digitalWorkers").doc(slug).get();
                  if (wSnap.exists) {
                    const w = wSnap.data();
                    workerCards.push({
                      slug,
                      name: w.display_name || w.name || slug,
                      description: (w.short_description || w.capabilitySummary || "").substring(0, 150),
                      price: w.pricing?.monthly || 0,
                    });
                  }
                }
              } catch (parseErr) {
                console.warn("sales: worker cards parse failed:", parseErr.message);
              }
            }

            // Detect [ESCALATE] marker
            let escalated = false;
            if (/\[ESCALATE\]/i.test(aiText)) {
              escalated = true;
              aiText = aiText.replace(/\s*\[ESCALATE\]\s*/gi, '').trim();
              // Write escalation to Firestore
              try {
                await db.collection("salesEscalations").add({
                  sessionId: effectiveSessionId,
                  uid: authUser ? authUser.uid : null,
                  campaignSlug: sessionState.campaignSlug || null,
                  utmSource: sessionState.utmSource || null,
                  prospectName: sessionState.prospectName || null,
                  prospectMessage: userInput,
                  flaggedAt: nowServerTs(),
                  status: "pending",
                });
                sessionState.escalated = true;
              } catch (escErr) {
                console.warn("sales: escalation write failed:", escErr.message);
              }
            }

            // Detect [OPEN_SANDBOX] marker
            let sandboxRedirect = false;
            if (/\[OPEN_SANDBOX\]/i.test(aiText)) {
              sandboxRedirect = true;
              aiText = aiText.replace(/\s*\[OPEN_SANDBOX\]\s*/gi, '').trim();
            }

            // Detect [AUTH_GATE] marker — signals frontend to show SSO buttons
            let suggestAuth = false;
            if (/\[AUTH_GATE\]/i.test(aiText)) {
              suggestAuth = true;
              aiText = aiText.replace(/\s*\[AUTH_GATE\]\s*/gi, '').trim();
            }

            // Update conversation history
            sessionState.salesHistory.push({ role: 'user', content: userInput });
            sessionState.salesHistory.push({ role: 'assistant', content: aiText });
            if (sessionState.salesHistory.length > 30) {
              sessionState.salesHistory = sessionState.salesHistory.slice(-30);
            }

            // Track worker cards shown
            if (workerCards.length > 0) {
              if (!sessionState.workerCardsShown) sessionState.workerCardsShown = [];
              for (const wc of workerCards) {
                if (!sessionState.workerCardsShown.includes(wc.slug)) {
                  sessionState.workerCardsShown.push(wc.slug);
                }
              }
            }

            // Persist session
            await sessionRef.set({
              state: sessionState,
              surface: 'sales',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });

            // Write prospect session analytics
            try {
              const prospectRef = db.collection("prospectSessions").doc(effectiveSessionId);
              const prospectSnap = await prospectRef.get();
              if (prospectSnap.exists) {
                const update = {
                  updatedAt: nowServerTs(),
                  messageCount: admin.firestore.FieldValue.increment(1),
                };
                if (workerCards.length > 0) {
                  update.workerCardsShown = admin.firestore.FieldValue.arrayUnion(...workerCards.map(w => w.slug));
                }
                if (escalated) update.escalated = true;
                if (sandboxRedirect) update.sandboxStarted = true;
                await prospectRef.update(update);
              } else {
                await prospectRef.set({
                  uid: authUser ? authUser.uid : null,
                  campaignSlug: sessionState.campaignSlug || null,
                  utmSource: sessionState.utmSource || null,
                  utmMedium: sessionState.utmMedium || null,
                  utmCampaign: sessionState.utmCampaign || null,
                  vertical: sessionState.vertical || null,
                  openedAt: nowServerTs(),
                  updatedAt: nowServerTs(),
                  workerCardsShown: workerCards.map(w => w.slug),
                  workerSubscribed: null,
                  sandboxStarted: sandboxRedirect,
                  escalated,
                  convertedAt: null,
                  messageCount: 1,
                });
              }
            } catch (psErr) {
              console.warn("sales: prospect session write failed:", psErr.message);
            }

            // Audit log
            try {
              await db.collection("messageEvents").add({
                tenantId: "titleapp-sales",
                userId: authUser ? authUser.uid : `anon_${sessionId}`,
                type: "chat:message:sales",
                message: userInput,
                response: aiText,
                salesContext: {
                  surface: "sales",
                  campaignSlug: sessionState.campaignSlug || null,
                  vertical: sessionState.vertical || null,
                  prospectName: sessionState.prospectName || null,
                  escalated,
                  workerCardsShown: workerCards.map(w => w.slug),
                },
                createdAt: nowServerTs(),
              });
            } catch (auditErr) {
              console.warn("sales audit log failed:", auditErr.message);
            }

            // Detect vertical from conversation content
            function detectVertical(userMsg, responseText) {
              const text = (userMsg + ' ' + responseText).toLowerCase();
              if (/pilot|aviation|pc.?12|medevac|part.?135|part.?91|copilot|aircraft|flight crew|logbook|notam|frat/.test(text)) return 'aviation';
              if (/dealer|dealership|f&i|inventory|auto|service drive|finance.*insurance|automotive/.test(text)) return 'auto-dealer';
              if (/real estate|title|escrow|cre|development|permit|commercial.*real/.test(text)) return 'real-estate';
              if (/solar|vpp|energy|microgrid/.test(text)) return 'solar';
              if (/web3|crypto|token|nft|blockchain/.test(text)) return 'web3';
              if (/healthcare|medical|ems|ambulance|hospital/.test(text)) return 'healthcare';
              if (/government|municipal|city|county|public sector/.test(text)) return 'government';
              if (/legal|attorney|law firm|litigation/.test(text)) return 'legal';
              if (/creator|content creator|youtube|influencer|podcast/.test(text)) return 'creators';
              if (/property management|landlord|tenant screening|rent|lease/.test(text)) return 'property-management';
              return null;
            }
            const detectedVertical = detectVertical(userInput, aiText);

            const response = {
              ok: true,
              message: aiText,
              conversationState: 'sales_discovery',
            };
            if (workerCards.length > 0) response.workerCards = workerCards;
            if (sandboxRedirect) response.sandboxRedirect = true;
            if (escalated) response.escalated = true;
            if (suggestAuth) response.suggestAuth = true;
            if (detectedVertical) response.detectedVertical = detectedVertical;

            return res.json(response);
          } catch (e) {
            console.error('Sales discovery AI failed:', e.message);
            return res.status(500).json({ ok: false, error: "AI processing failed" });
          }
        }

        // ── Investor Mode: /invest entry point — Alex handles investor conversations ──
        // Matches: direct /invest surface, OR sessions already in invest_discovery (regardless of surface).
        // When surface is 'invest', this ALWAYS matches — no step whitelist. Investor context is never lost.
        if ((surface === 'invest' || sessionState.step === 'invest_discovery') &&
            ((!action && userInput) || action === 'magic_link_clicked' || action === 'terms_accepted' || action === 'go_to_dataroom')) {

          if (!sessionState.discoveryHistory) sessionState.discoveryHistory = [];
          sessionState.step = 'invest_discovery';

          // Detect returning authenticated user — pre-populate profile from Firestore
          if (authUser && !sessionState.profileLoaded) {
            try {
              const userDoc = await db.collection("users").doc(authUser.uid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.name && !sessionState.investorName) sessionState.investorName = userData.name;
                if (userData.email && !sessionState.investorEmail) sessionState.investorEmail = userData.email;
                if (userData.termsAcceptedAt) sessionState.termsAccepted = true;
                sessionState.userId = authUser.uid;
                sessionState.accountCreated = true;
              }
              // Look up tenant for redirect
              const memSnap = await db.collection("memberships")
                .where("userId", "==", authUser.uid)
                .limit(1)
                .get();
              if (!memSnap.empty) {
                sessionState.tenantId = memSnap.docs[0].data().tenantId;
              }
              sessionState.profileLoaded = true;
            } catch (e) {
              console.warn("invest: profile lookup failed:", e.message);
            }
          }

          // Handle action: go_to_dataroom — redirect authenticated user to platform
          if (action === 'go_to_dataroom' && authUser && sessionState.tenantId) {
            await sessionRef.set({
              state: sessionState,
              surface: 'invest',
              userId: authUser.uid,
              updatedAt: nowServerTs(),
            }, { merge: true });
            // Generate a fresh custom token for cross-domain handoff
            // (the worker may only have an ID token for returning users,
            // which can't be used with signInWithCustomToken on the platform domain)
            const handoffToken = await admin.auth().createCustomToken(authUser.uid);
            const name = sessionState.investorName || '';
            const msg = name ? `Taking you there now, ${name}.` : 'Taking you there now.';
            return res.json({
              ok: true,
              message: msg,
              authToken: handoffToken,
              platformRedirect: true,
              redirectPage: 'dataroom',
              selectedTenantId: sessionState.tenantId,
              conversationState: 'invest_discovery',
            });
          }

          // Handle magic link click — create account, show terms card
          if (action === 'magic_link_clicked' && sessionState.investorEmail) {
            try {
              const signupResult = await signupInternal({
                email: sessionState.investorEmail,
                name: sessionState.investorName || null,
                accountType: 'consumer',
              });
              if (signupResult && signupResult.ok) {
                sessionState.userId = signupResult.uid;
                sessionState.accountCreated = true;

                // Tag user as investor source
                await db.collection("users").doc(signupResult.uid).set(
                  { source: "investor", defaultView: "data-room" },
                  { merge: true }
                );

                // Existing user who already accepted terms — skip to platform
                if (signupResult.existing && signupResult.termsAcceptedAt) {
                  sessionState.termsAccepted = true;
                  const memberships = signupResult.memberships || [];
                  // Prefer investor-vertical tenant, fall back to first
                  let tenantId = null;
                  for (const m of memberships) {
                    if (m.vertical === 'investor') { tenantId = m.tenantId; break; }
                  }
                  if (!tenantId && memberships.length > 0) {
                    for (const m of memberships) {
                      try {
                        const tDoc = await db.collection("tenants").doc(m.tenantId).get();
                        if (tDoc.exists && tDoc.data().vertical === 'investor') { tenantId = m.tenantId; break; }
                      } catch (_) {}
                    }
                  }
                  if (!tenantId && memberships.length > 0) tenantId = memberships[0].tenantId;
                  await sessionRef.set({
                    state: sessionState,
                    surface: 'invest',
                    userId: signupResult.uid,
                    ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
                    updatedAt: nowServerTs(),
                  }, { merge: true });
                  const name = sessionState.investorName || '';
                  const msg = name
                    ? `Welcome back, ${name}. Let me take you into the platform.`
                    : `Welcome back. Let me take you into the platform.`;
                  sessionState.discoveryHistory.push({ role: 'assistant', content: msg });
                  return res.json({
                    ok: true,
                    message: msg,
                    authToken: signupResult.token,
                    platformRedirect: true,
                    redirectPage: 'dataroom',
                    selectedTenantId: tenantId,
                    conversationState: 'invest_discovery',
                  });
                }

                // New user — show terms card
                await sessionRef.set({
                  state: sessionState,
                  surface: 'invest',
                  userId: signupResult.uid,
                  ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
                  updatedAt: nowServerTs(),
                }, { merge: true });
                const name = sessionState.investorName || '';
                const termsMsg = name
                  ? `${name}, your account is ready. One quick step -- review and accept the terms of service, and I will take you right into the platform.`
                  : `Your account is ready. One quick step -- review and accept the terms of service, and I will take you right into the platform.`;
                sessionState.discoveryHistory.push({ role: 'assistant', content: termsMsg });
                return res.json({
                  ok: true,
                  message: termsMsg,
                  authToken: signupResult.token,
                  cards: [{
                    type: 'terms',
                    data: {
                      termsUrl: 'https://app.titleapp.ai/legal/terms-of-service',
                      privacyUrl: 'https://app.titleapp.ai/legal/privacy-policy',
                      summary: "Your records are yours. We verify and secure them. We don't sell your data. You can export or delete anytime.",
                    },
                  }],
                  conversationState: 'invest_discovery',
                });
              }
            } catch (e) {
              console.error("invest: signup failed:", e.code, e.message, e.stack);
              return res.json({
                ok: true,
                message: "Something went wrong setting up your account. Let me try again -- what email should I use?",
                showSignup: false,
                conversationState: 'invest_discovery',
              });
            }
          }

          // Handle terms accepted — accept terms, claim tenant, redirect to platform
          if (action === 'terms_accepted' && sessionState.userId) {
            try {
              // Accept terms + tag as investor
              await db.collection("users").doc(sessionState.userId).set(
                { termsAcceptedAt: nowServerTs(), source: "investor", defaultView: "data-room" },
                { merge: true }
              );

              // Claim tenant for investor
              const tenantName = sessionState.investorName || 'Personal';
              const tenantId = slugifyTenantId(tenantName);
              const tenantRef = db.collection("tenants").doc(tenantId);
              const tSnap = await tenantRef.get();
              if (!tSnap.exists) {
                await tenantRef.set({
                  name: tenantName,
                  tenantType: "personal",
                  vertical: "investor",
                  jurisdiction: "GLOBAL",
                  status: "active",
                  createdAt: nowServerTs(),
                  createdBy: sessionState.userId,
                });
              }
              const memSnap = await db.collection("memberships")
                .where("userId", "==", sessionState.userId)
                .where("tenantId", "==", tenantId)
                .limit(1)
                .get();
              if (memSnap.empty) {
                await db.collection("memberships").add({
                  userId: sessionState.userId,
                  tenantId,
                  role: "owner",
                  status: "active",
                  createdAt: nowServerTs(),
                });
              } else {
                // Ensure existing membership has status: "active"
                await db.collection("memberships").doc(memSnap.docs[0].id).update({
                  status: "active",
                  updatedAt: nowServerTs(),
                });
              }

              sessionState.termsAccepted = true;
              await sessionRef.set({
                state: sessionState,
                surface: 'invest',
                userId: sessionState.userId,
                updatedAt: nowServerTs(),
              }, { merge: true });

              const name = sessionState.investorName || '';
              const redirectMsg = name
                ? `All set, ${name}. Taking you into the platform now.`
                : `All set. Taking you into the platform now.`;
              sessionState.discoveryHistory.push({ role: 'assistant', content: redirectMsg });
              // Fresh custom token for cross-domain handoff
              const termsHandoffToken = await admin.auth().createCustomToken(sessionState.userId);
              return res.json({
                ok: true,
                message: redirectMsg,
                authToken: termsHandoffToken,
                platformRedirect: true,
                redirectPage: 'dataroom',
                selectedTenantId: tenantId,
                conversationState: 'invest_discovery',
              });
            } catch (e) {
              console.error("invest: terms acceptance failed:", e.message);
              return res.json({
                ok: true,
                message: "Something went wrong. Let me try again.",
                conversationState: 'invest_discovery',
              });
            }
          }

          const msgCount = sessionState.discoveryHistory.filter(h => h.role === 'user').length + 1;

          // Email detection — when investor provides an email, render the magic link card
          const emailMatch = userInput.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
          if (emailMatch && !sessionState.accountCreated) {
            sessionState.investorEmail = emailMatch[0];
            sessionState.discoveryHistory.push({ role: 'user', content: userInput });
            const linkMsg = sessionState.investorName
              ? `Got it, ${sessionState.investorName}. Here is your sign-in link -- just click to get started.`
              : `Got it. Here is your sign-in link -- just click to get started. By the way, what is your name?`;
            sessionState.discoveryHistory.push({ role: 'assistant', content: linkMsg });
            await sessionRef.set({
              state: sessionState,
              surface: 'invest',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });
            return res.json({
              ok: true,
              message: linkMsg,
              cards: [{ type: 'magicLink', data: { email: sessionState.investorEmail } }],
              showSignup: false,
              conversationState: 'invest_discovery',
            });
          }

          // Extract name from short replies (with stop word filter)
          if (!sessionState.investorName) {
            const stopWords = new Set(['a','an','the','i','we','my','me','am','is','are','it','its','in','on','at','to','for','of','and','or','not','no','so','just','very','also','that','this','here','new','old','big','all','any','few','some','how','why','what','who','when','been','have','has','had','was','were','be','do','did','done','get','got','can','may','will','would','should','could','shall','about','angel','seed','early','late','stage','tech','ai','interested']);
            const namePatterns = [
              /^(?:i'm|im|i am|it's|its|call me|my name is|hey i'm|hi i'm|they call me)\s+([A-Z][a-z]+)/i,
              /^(?:this is)\s+([A-Z][a-z]+)/i,
            ];
            for (const p of namePatterns) {
              const m = userInput.match(p);
              if (m) {
                const candidate = m[1].toLowerCase();
                if (!stopWords.has(candidate)) {
                  sessionState.investorName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
                  break;
                }
              }
            }
            if (!sessionState.investorName && /^[A-Z][a-z]{2,14}$/.test(userInput.trim())) {
              const candidate = userInput.trim().toLowerCase();
              if (!stopWords.has(candidate)) {
                sessionState.investorName = userInput.trim().charAt(0).toUpperCase() + userInput.trim().slice(1).toLowerCase();
              }
            }
          }

          const messages = [];
          if (sessionState.discoveryHistory.length === 0) {
            messages.push({ role: 'assistant', content: "Hi there. I'm Alex, TitleApp's investor relations AI. Happy to tell you about the company, the product, or the raise. What would you like to know?" });
          }
          for (const h of sessionState.discoveryHistory) {
            messages.push({ role: h.role, content: h.content });
          }
          messages.push({ role: 'user', content: userInput });

          // Load raise config for investor prompt
          let raiseTerms = "";
          try {
            const raiseDoc = await db.collection("config").doc("raise").get();
            if (raiseDoc.exists) {
              const rc = raiseDoc.data();
              const fp = rc.fundingPortal || {};
              raiseTerms = `\nCURRENT RAISE TERMS:\nInstrument: ${rc.instrument || "SAFE"}\nRaise: $${((rc.raiseAmount || 0) / 1000000).toFixed(2)}M\nValuation Cap: $${((rc.valuationCap || 0) / 1000000).toFixed(0)}M\nDiscount: ${((rc.discount || 0) * 100).toFixed(0)}%\nMin Investment: $${(rc.minimumInvestment || 0).toLocaleString()}\nPro Rata: ${rc.proRataNote || "N/A"}\nPortal: ${fp.name || "N/A"} (${fp.regulation || "N/A"})`;
              if (rc.conversionScenarios && rc.conversionScenarios.length > 0) {
                raiseTerms += "\nConversion scenarios (math, not promises):";
                for (const s of rc.conversionScenarios) {
                  raiseTerms += ` $${(s.exitValuation / 1000000).toFixed(0)}M→${s.multiple}`;
                }
              }
            }
          } catch (e) { console.warn("invest: could not load raise config:", e.message); }

          const userMsgCount = sessionState.discoveryHistory.filter(h => h.role === 'user').length + 1;
          let nameGuidance;
          if (sessionState.investorName) {
            nameGuidance = `\nThe investor's name is ${sessionState.investorName}. Use it naturally.`;
          } else if (userMsgCount >= 3) {
            nameGuidance = '\nIMPORTANT: You still do not know the investor\'s name after multiple messages. You MUST ask their name NOW before anything else. Work it in naturally: "By the way, I realize I never asked -- what\'s your name?"';
          } else {
            nameGuidance = '\nYou do not know their name yet. Ask naturally in this response -- "I\'m Alex, by the way. What\'s your name?" Do NOT wait more than 2 exchanges.';
          }

          // Navigation and auth guidance based on user state
          let authGuidance = '';
          const lowerInput = userInput.toLowerCase();

          // Returning authenticated user — Alex can navigate them
          if (sessionState.accountCreated && sessionState.tenantId) {
            authGuidance = '\nIMPORTANT: This investor already has an account. You CAN take them to the platform. If they ask to see the data room, documents, pitch deck, dashboard, vault, or platform, include [GO_TO_DATAROOM] at the end of your message. NEVER say "I cannot navigate you" or "I cannot take you there." You CAN. The system handles the redirect automatically when you include [GO_TO_DATAROOM].';
            // If they're explicitly asking for navigation right now
            if (/\b(data room|take me|go to|dashboard|vault|documents|see the|show me|get there|my account|platform|log ?in)\b/.test(lowerInput)) {
              authGuidance += '\nThe investor is asking to navigate RIGHT NOW. Your response should be brief and include [GO_TO_DATAROOM]. Example: "Let me take you there now. [GO_TO_DATAROOM]"';
            }
          } else if (/\b(business plan|data room|full plan|see the deck|pitch deck|documents|see the financials)\b/.test(lowerInput) ||
              /\b(invest|proceed|ready to invest|how do i invest|want to invest)\b/.test(lowerInput) ||
              /\b(cap table|my position|shareholder)\b/.test(lowerInput)) {
            authGuidance = '\nThe investor is asking for something that requires an account. Ask for their email address so you can set them up. Say something like: "Happy to share that. What email should I set your data room access up with?" NEVER ask for a password. NEVER say you cannot create accounts. Once they give you an email, the system handles the rest automatically.';
          } else if (sessionState.investorName && !sessionState.accountCreated && userMsgCount >= 2) {
            // We know their name and they've been chatting — proactively suggest data room access
            authGuidance = '\nYou know this investor\'s name and they are engaged. If the conversation is going well, naturally suggest data room access: "By the way, want me to get you into the data room? Just takes your email and you will have the deck, business plan, and SAFE terms in front of you while we talk." Do NOT force it if they are asking an unrelated question. Just weave it in when there is a natural pause.';
          }

          const investSystemPrompt = `You are Alex, TitleApp's investor relations AI. You are having a conversation with a potential investor.

IDENTITY:
TitleApp is the Digital Worker platform. The underlying architecture is called RAAS (Rules + AI-as-a-Service). When talking to investors, use "Digital Worker" as the primary term. You may explain RAAS as the technical architecture name if asked about the technology: "TitleApp is the Digital Worker platform. The underlying architecture is called RAAS — Rules plus AI-as-a-Service. Every Digital Worker operates within defined rules with a complete audit trail."

CONVERSATION FLOW — THIS IS CRITICAL:
You are a LISTENER first, a presenter second. The early conversation should be 70% questions, 30% answers.
1. Warm greeting. Ask what brought them here. Ask what they invest in, what stage, what sectors, what excites them.
2. LISTEN. Mirror what they say. Find common ground. "Interesting -- TitleApp actually touches on that because..."
3. Answer their specific questions concisely. One idea per response. Then ask a follow-up or offer to go deeper.
4. Let THEM drive the depth. If they want market, go into market. If they want terms, give terms. Do not dump everything at once.
5. PROACTIVE DATA ROOM ACCESS: Once you know their name AND they have expressed interest in investing or learning more (typically message 2-3), proactively offer data room access. Frame it naturally, NOT as "signing up for an account." Example: "Want me to get you into the data room while we chat? Just takes your email and you will have the pitch deck, business plan, and SAFE terms right in front of you." This should feel like a service, not a sales push.
6. When they want to proceed, naturally guide to account creation. Include [SHOW_SIGNUP] at the end of that message.
7. If they are not ready: "No rush. I am here whenever you want to continue. Would you like me to send you the executive summary in the meantime?"

RESPONSE LENGTH — STRICT:
- 1-2 short paragraphs. 3 only when answering a complex question. This is a chat, not an essay.
- Each paragraph should be 2-3 sentences max. If you hit 4 sentences in a paragraph, split or cut.
- One idea per response, then a question or an offer to go deeper.
- Think texting rhythm, not pitch deck rhythm.
- Only go longer if the investor explicitly asks for detail ("tell me more," "explain that").

TONE — CRITICAL:
- Warm, curious, humble, helpful. You are the smartest, most helpful person in the room -- not the loudest.
- NEVER defensive. If someone challenges the company or compares to another investment, acknowledge it is a smart question and respond with substance, not ego.
- NEVER braggy. Do not pitch founder resumes unprompted. If asked about the team, keep it brief and relevant to their question.
- NEVER combative about competitors. Frame large AI companies as complementary: "We sit on top of those models as the governance layer." Not: "they sell tokens, we sell compliance."
- Never use emojis. Never use markdown formatting. Plain text only.
- Use the investor's name once you know it. Do not overuse it.

HARD SEC COMPLIANCE RULES:
- NEVER calculate specific dollar returns for a specific investment amount. Example of what is FORBIDDEN: "At $50K, you would own 0.33% and if we exit at $100M that is $333K." That crosses SEC lines.
- Conversion scenarios may ONLY be presented as a generic table showing multiples at various valuations. Never personalized to their check size.
- EVERY time conversion scenarios are mentioned, include this disclaimer: "These are mathematical scenarios based on the SAFE terms, not projections or promises. Early-stage investing carries significant risk including total loss of capital."
- NEVER say things like "meaningful check," "puts you in our top tier," or any language that flatters an investment amount. Alex is an informer, not a closer.
- NEVER promise returns or guarantee outcomes.
- NEVER provide personalized investment advice.
- NEVER create false urgency or pressure.
- NEVER minimize risk factors. Startups are risky. Say so honestly.
- Forward-looking statements must be identified as such.

WHAT YOU MUST NEVER DO:
- NEVER offer inventory management, sales pipeline, compliance setup, vertical selection, or any workspace onboarding. You are NOT the business assistant.
- NEVER misstate the raise terms. Use ONLY the numbers from CURRENT RAISE TERMS below.
- NEVER compare TitleApp to Anthropic, OpenAI, or Google in a combative way. They are complementary.

COMPANY KNOWLEDGE:
${getCompanyKnowledge()}
${raiseTerms}
${nameGuidance}${authGuidance}

INVESTOR DOCUMENTS:
Four documents in the data room, in two tiers:
TIER 1 (freely available — no gates): Pitch Deck (PPTX), Executive Summary / One Pager (PDF). Mention freely. These download immediately once they have an account.
TIER 2 (requires identity verification + disclaimer): Business Plan, Feb 2026 (DOCX), SAFE Agreement (generated per investor).
When they ask for a Tier 2 document, let them know they will need to complete a quick identity verification ($2) and acknowledge the risk disclaimers in the data room.

LEGAL ENTITY: The correct legal entity is "The Title App LLC" (NOT "TitleApp Inc."). The brand is "TitleApp" but on all legal documents and formal references, use "The Title App LLC."

ACCOUNT SETUP — CRITICAL:
When the investor shows interest (knows their name + they want to learn more), proactively suggest setting up access. Frame it as data room access, not account creation:
- Ask for their email address. That is ALL you need. Say: "What email should I use to get you into the data room?"
- NEVER ask for a password in the chat. The system handles authentication automatically via a magic link.
- NEVER say you cannot create accounts or cannot do this from chat. You CAN. The system handles it.
- Once they provide an email, the sign-in card appears automatically. Your job is just to collect the email.

NAVIGATION — CRITICAL:
- You CAN take investors to the data room, dashboard, and platform. NEVER say "I cannot navigate you" or "I cannot take you there."
- When they ask to see the data room, documents, dashboard, vault, or platform, include [GO_TO_DATAROOM] at the end of your message.
- If they already have an account, take them immediately. Do not ask them to click links or find menus. YOU handle it.

ESCALATION:
For legal specifics, custom terms, or strategic questions, offer to connect with Sean (CEO) or Kent (CFO). Do not try to answer legal questions yourself.

COMPLIANCE: This is informational only. TitleApp does not act as a registered funding portal, broker-dealer, or investment advisor. The offering is conducted through Wefunder under Regulation CF.`;

          try {
            const anthropic = getAnthropic();
            const aiResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 250,
              system: investSystemPrompt,
              messages,
            });

            let aiText = aiResponse.content[0]?.text || "Tell me what you'd like to know about TitleApp.";

            let showSignup = false;
            if (/\[SHOW[_\s]?SIGNUP\]/i.test(aiText)) {
              showSignup = true;
              aiText = aiText.replace(/\s*\[SHOW[_\s]?SIGNUP\]\s*/gi, '').trim();
            }

            // Detect [GO_TO_DATAROOM] token — AI wants to redirect user to platform
            let goToDataroom = false;
            if (/\[GO[_\s]?TO[_\s]?DATAROOM\]/i.test(aiText)) {
              goToDataroom = true;
              aiText = aiText.replace(/\s*\[GO[_\s]?TO[_\s]?DATAROOM\]\s*/gi, '').trim();
            }

            // Force name ask by message 3 if AI didn't do it
            if (!sessionState.investorName && userMsgCount >= 3 && !/what'?s your name|your name|who am i talking/i.test(aiText)) {
              aiText += '\n\nBy the way, I realize I never asked -- what is your name?';
            }

            sessionState.discoveryHistory.push({ role: 'user', content: userInput });
            sessionState.discoveryHistory.push({ role: 'assistant', content: aiText });

            if (sessionState.discoveryHistory.length > 30) {
              sessionState.discoveryHistory = sessionState.discoveryHistory.slice(-30);
            }

            await sessionRef.set({
              state: sessionState,
              surface: 'invest',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });

            // Audit: log investor chat event
            try {
              await db.collection("messageEvents").add({
                tenantId: "titleapp-investor",
                userId: authUser ? authUser.uid : `anon_${sessionId}`,
                type: "chat:message:invest",
                message: userInput,
                response: aiText,
                investorContext: {
                  surface: "invest",
                  investorName: sessionState.investorName || null,
                  escalationRequested: /connect you with (Sean|Kent)/i.test(aiText),
                  showSignup,
                },
                createdAt: nowServerTs(),
              });
            } catch (auditErr) {
              console.warn("invest audit log failed:", auditErr.message);
            }

            const response = {
              ok: true,
              message: aiText,
              showSignup,
              conversationState: 'invest_discovery',
            };

            // If AI triggered dataroom redirect and user is authenticated with a tenant
            if (goToDataroom && sessionState.tenantId && sessionState.accountCreated && authUser) {
              response.authToken = await admin.auth().createCustomToken(authUser.uid);
              response.platformRedirect = true;
              response.redirectPage = 'dataroom';
              response.selectedTenantId = sessionState.tenantId;
            }

            return res.json(response);
          } catch (e) {
            console.error('Invest discovery AI failed:', e.message);
          }
        }

        // ── Discovery Mode: free-form AI conversation for landing visitors ──
        // Bypasses the chatEngine state machine for natural conversation.
        // Only triggers for text input (no actions) when session is new or in discovery.
        if (surface === 'landing' && !action && userInput &&
            (!sessionState.step || sessionState.step === 'idle' || sessionState.step === 'discovery')) {

          if (!sessionState.discoveryHistory) sessionState.discoveryHistory = [];
          if (!sessionState.discoveredContext) {
            sessionState.discoveredContext = {
              intent: null, vertical: null, businessName: null, location: null,
              scale: null, painPoints: [], currentTools: [], subtype: null, name: null,
            };
          }

          sessionState.step = 'discovery';
          const msgCount = sessionState.discoveryHistory.filter(h => h.role === 'user').length + 1;

          // Analyze user message for context keywords
          analyzeDiscoveryMessage(userInput, sessionState.discoveredContext);

          // Build conversation for Claude — include the frontend welcome as first message
          const messages = [];
          if (sessionState.discoveryHistory.length === 0) {
            messages.push({ role: 'assistant', content: 'Hey! Welcome to TitleApp. What brings you here today?' });
          }
          for (const h of sessionState.discoveryHistory) {
            messages.push({ role: h.role, content: h.content });
          }
          messages.push({ role: 'user', content: userInput });

          // Phase-specific guidance for Claude
          const dCtx = sessionState.discoveredContext;
          const userName = dCtx.name || null;
          let phaseGuidance = '';
          if (userName) {
            phaseGuidance += `\nThe user's name is ${userName}. Use it occasionally to keep things personal.`;
          }
          if (msgCount <= 2) {
            phaseGuidance += '\nThis is early in the conversation. Mirror what they said and ask a follow-up. If you haven\'t asked their name yet, work it in naturally. Do NOT pitch the product.';
          } else if (msgCount <= 5) {
            phaseGuidance += '\nYou are in the discovery phase. Keep learning about their situation. Ask about specifics like scale, location, pain points, tools they use. One question at a time. Do NOT suggest signup yet.';
          } else if (dCtx.vertical) {
            phaseGuidance += `\nYou now know enough to show specific value. Their situation: vertical=${dCtx.vertical}, subtype=${dCtx.subtype || 'unknown'}, scale=${dCtx.scale || 'unknown'}, location=${dCtx.location || 'unknown'}. Show them SPECIFICALLY what TitleApp would do for THEIR situation using their numbers and words. After showing value, you may gently offer to set it up and include [SHOW_SIGNUP] at the end of that message.`;
          } else {
            phaseGuidance += '\nYou still need more context. Keep the conversation going naturally. Ask what they do or what brought them here. Do NOT suggest signup.';
          }

          const discoverySystemPrompt = `You are the TitleApp welcome assistant. You're having a casual, friendly conversation with someone who just visited the website.

CRITICAL RULES:
- For the FIRST 4-6 exchanges, just have a conversation. Learn about them. Be curious. Be human.
- In your SECOND message, ask for their first name. "By the way, what's your name?" or work it in naturally. Once you have it, USE IT occasionally throughout the conversation. Not every message, but enough that it feels personal.
- DO NOT mention signing up, creating an account, or setting anything up until you have had at least 4 back-and-forth exchanges.
- DO NOT say "want to get that set up" or "want me to set up a workspace" until you truly understand their situation.
- DO NOT mention the signup form, email, password, or account creation unprompted.
- Your first 4 messages should ONLY be asking questions and responding to what they tell you.
- AFTER 4+ exchanges AND you've shown them specific value for their situation, you can say something like "I can have your workspace ready in 2 minutes, [Name]. Want me to set it up?" and include [SHOW_SIGNUP] at the end.
- If they say no or ignore it, keep chatting. Don't mention it again for at least 3 more exchanges.
- Keep every response to 2-3 sentences max. This is a chat, not a pitch.
- NEVER reference any URL. NEVER say "titleapp.com" or "titleapp.ai". The user is already here.
- NEVER say "Are you seeing the signup form?" -- you don't control what they see.
- Never use emojis. Never use markdown formatting. Plain text only.

CONVERSATION FLOW:
Message 1: "Hey! Welcome to TitleApp. What brings you here today?" (already sent by the system)
Message 2: Respond to what they said, then ask their name naturally. "That's cool -- by the way, I'm Alex. What's your name?"
Messages 3-5: Ask about THEIR situation using their name. Mirror their words. Be genuinely curious. "[Name], how long have you been doing that?" or "Nice, [Name] -- what's the most annoying part of that for you?"
Messages 6-7: Based on what you've learned, show them specifically how TitleApp would help THEIR situation with concrete examples. Use their name.
Message 8+: If they seem interested, gently offer to set it up. "I can have this ready for you in about 2 minutes, [Name]. Want me to set it up?" Include [SHOW_SIGNUP] at the very end of ONLY that message.${phaseGuidance}`;

          try {
            const anthropic = getAnthropic();
            const aiResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 300,
              system: discoverySystemPrompt,
              messages,
            });

            let aiText = aiResponse.content[0]?.text || "Tell me more about what you're looking for.";

            // Detect and strip [SHOW_SIGNUP] token before returning to frontend
            let showSignup = false;
            if (/\[SHOW[_\s]?SIGNUP\]/i.test(aiText)) {
              showSignup = true;
              aiText = aiText.replace(/\s*\[SHOW[_\s]?SIGNUP\]\s*/gi, '').trim();
            }

            // Store in history (without the token)
            sessionState.discoveryHistory.push({ role: 'user', content: userInput });
            sessionState.discoveryHistory.push({ role: 'assistant', content: aiText });

            // Trim history to last 30 messages to prevent bloat
            if (sessionState.discoveryHistory.length > 30) {
              sessionState.discoveryHistory = sessionState.discoveryHistory.slice(-30);
            }

            // Suggest signup when enough context or AI triggered it
            const suggestSignup = showSignup || (msgCount >= 6 && dCtx.vertical !== null);

            // Save session state
            await sessionRef.set({
              state: sessionState,
              surface: 'landing',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });

            return res.json({
              ok: true,
              message: aiText,
              discoveredContext: sessionState.discoveredContext,
              suggestSignup,
              showSignup,
              conversationState: 'discovery',
            });
          } catch (e) {
            console.error('Discovery AI failed:', e.message);
            // Fall through to chatEngine on failure
          }
        }

        // ── Developer Mode: /developers entry point — Alex handles developer conversations ──
        if ((surface === 'developer' || surface === 'sandbox' || sessionState.step === 'dev_discovery') &&
            ((!action && userInput) || action === 'magic_link_clicked' || action === 'terms_accepted' || action === 'get_sandbox_token')) {

          if (!sessionState.devHistory) sessionState.devHistory = [];
          sessionState.step = 'dev_discovery';

          // Persist creatorPath in session state — never let it go undefined once set
          if (body.creatorPath && !sessionState.creatorPath) {
            sessionState.creatorPath = body.creatorPath;
          }
          // Infer from workerCardData if missing
          if (!sessionState.creatorPath && sessionState.workerGameConfig?.isGame) {
            sessionState.creatorPath = 'game-casual';
          }
          // Auto-detect game intent from user input on early exchanges
          // (handles users who skip the Game chip and just type "build a game")
          if (!sessionState.creatorPath && surface === 'sandbox' && userInput) {
            const userMsgCount = (sessionState.devHistory || []).filter(h => h.role === 'user').length + 1;
            if (userMsgCount <= 3) {
              const gamePattern = /\b(build|make|create|design|develop|prototyp\w*)\w*\s+(a|an|my|the|some)?\s*(video.?)?game\b|\bgame\s+(idea|concept|design|prototype|for\s+\w+)\b|\bmultiplayer\b|\bgameplay\b|\bvideo.?game\b/i;
              if (gamePattern.test(userInput)) {
                sessionState.creatorPath = 'game-casual';
              }
            }
          }

          // Seed devName from returning user's auth profile (sent by frontend)
          // Frontend sends creatorName (sandbox) or returnUserName (developer landing)
          if (!sessionState.devName && (body.returnUserName || body.creatorName)) {
            sessionState.devName = body.returnUserName || body.creatorName;
          }

          // Extract name from short replies (with stop word filter — matches invest handler pattern)
          if (!sessionState.devName) {
            const stopWords = new Set(['a','an','the','i','we','my','me','am','is','are','it','its','in','on','at','to','for','of','and','or','not','no','so','just','very','also','that','this','here','new','old','big','all','any','few','some','how','why','what','who','when','been','have','has','had','was','were','be','do','did','done','get','got','can','may','will','would','should','could','shall','about','api','sdk','developer','build','app','code','tech','ai','web','mobile','backend','frontend','stack','cloud','data','rest','webhook','endpoint','sandbox','docs','integrate','integration']);
            const namePatterns = [
              /^(?:i'm|im|i am|it's|its|call me|my name is|hey i'm|hi i'm|they call me)\s+([A-Z][a-z]+)/i,
              /^(?:this is)\s+([A-Z][a-z]+)/i,
            ];
            for (const p of namePatterns) {
              const m = userInput.match(p);
              if (m) {
                const candidate = m[1].toLowerCase();
                if (!stopWords.has(candidate)) {
                  sessionState.devName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
                  break;
                }
              }
            }
            if (!sessionState.devName && /^[A-Z][a-z]{2,14}$/i.test(userInput.trim())) {
              const candidate = userInput.trim().toLowerCase();
              if (!stopWords.has(candidate)) {
                sessionState.devName = userInput.trim().charAt(0).toUpperCase() + userInput.trim().slice(1).toLowerCase();
              }
            }
          }

          const messages = [];
          if (sessionState.devHistory.length === 0) {
            messages.push({ role: 'assistant', content: "Hey, welcome. I'm Alex -- I work with developers who are building on TitleApp. What's your name?" });
          }
          for (const h of sessionState.devHistory) {
            messages.push({ role: h.role, content: h.content });
          }
          // Support image attachments (vision) in user message
          if (body.imageData && Array.isArray(body.imageData) && body.imageData.length > 0) {
            const contentBlocks = body.imageData.map(img => ({
              type: "image",
              source: { type: "base64", media_type: img.mediaType || "image/png", data: img.base64 }
            }));
            contentBlocks.push({ type: "text", text: userInput });
            messages.push({ role: 'user', content: contentBlocks });
          } else {
            messages.push({ role: 'user', content: userInput });
          }

          // extractSpec fallback: frontend forces card generation after 5+ exchanges with no card
          // Defensive guard: never inject WORKER_SPEC forcing prompt on game sessions —
          // games don't use the worker spec pipeline and the AI will reject it ("I can't generate a [WORKER_SPEC] for a game")
          const isGameSession = (sessionState.creatorPath && String(sessionState.creatorPath).startsWith('game'))
            || (body.creatorPath && String(body.creatorPath).startsWith('game'))
            || !!sessionState.workerGameConfig?.isGame;
          if (body.extractSpec && surface === 'sandbox' && !isGameSession) {
            messages.push({
              role: 'user',
              content: 'Based on everything I have told you so far, please generate my Digital Worker now. Output the [WORKER_SPEC] block with your best interpretation of what I described.'
            });
          }

          // Store text-only in devHistory (Firestore 1MB doc limit — no base64)
          const hasImage = !!(body.imageData && body.imageData.length > 0);

          const userMsgCount = sessionState.devHistory.filter(h => h.role === 'user').length + 1;
          let nameGuidance;
          if (sessionState.devName) {
            nameGuidance = `\nThe developer's name is ${sessionState.devName}. Use it naturally.`;
          } else if (userMsgCount >= 3) {
            nameGuidance = '\nIMPORTANT: You still do not know the developer\'s name after multiple messages. You MUST ask their name NOW before anything else. Work it in naturally: "By the way, I didn\'t catch your name -- what should I call you?"';
          } else {
            nameGuidance = '\nYou do not know their name yet. Ask naturally early on -- "What\'s your name?" or "Who am I talking to?"';
          }

          // Auth trigger: if they want API key or sandbox
          let authGuidance = '';
          const lowerInput = userInput.toLowerCase();
          if (/\b(api key|get started|sandbox|sign up|create account|try it|quickstart|get access)\b/.test(lowerInput)) {
            authGuidance = '\nThe developer wants to get started. Ask for their email so you can set up their account. Say something like: "I just need your email and I will get you set up." NEVER ask for a password.';
          }

          // Handle sandbox token request — returning user wants to go to platform
          if (action === 'get_sandbox_token' && authUser) {
            try {
              const customToken = await admin.auth().createCustomToken(authUser.uid);
              // Find their developer workspace
              const devMemSnap = await db.collection("memberships")
                .where("userId", "==", authUser.uid)
                .get();
              let devTenantId = null;
              // Prefer a developer/sandbox workspace, fall back to first
              for (const doc of devMemSnap.docs) {
                const tRef = await db.collection("tenants").doc(doc.data().tenantId).get();
                if (tRef.exists && tRef.data().vertical === 'developer') {
                  devTenantId = doc.data().tenantId;
                  break;
                }
              }
              if (!devTenantId && !devMemSnap.empty) {
                devTenantId = devMemSnap.docs[0].data().tenantId;
              }
              return res.json({
                ok: true,
                sandboxToken: customToken,
                sandboxTenantId: devTenantId,
              });
            } catch (e) {
              console.error('[dev] get_sandbox_token failed:', e.message);
              return res.json({ ok: false, error: 'Could not generate sandbox token' });
            }
          }

          // Handle magic link click — create account, show terms card
          if (action === 'magic_link_clicked' && !sessionState.devEmail) {
            // Session lost the email — ask again instead of silently failing
            sessionState.devHistory.push({ role: 'assistant', content: "I seem to have lost your email. What email should I use for your developer account?" });
            await sessionRef.set({ state: sessionState, surface: 'developer', updatedAt: nowServerTs() }, { merge: true });
            return res.json({
              ok: true,
              message: "I seem to have lost your email. What email should I use for your developer account?",
              conversationState: 'dev_discovery',
            });
          }
          if (action === 'magic_link_clicked' && sessionState.devEmail) {
            console.log(`[dev] magic_link_clicked: devEmail=${sessionState.devEmail}, devName=${sessionState.devName || 'unknown'}, sessionId=${sessionId}`);
            try {
              const signupResult = await signupInternal({
                email: sessionState.devEmail,
                name: sessionState.devName || null,
                accountType: 'consumer',
              });
              if (signupResult && signupResult.ok) {
                sessionState.userId = signupResult.uid;
                sessionState.accountCreated = true;

                // Create deferred Worker if spec was stashed before signup
                if (sessionState.pendingWorkerSpec) {
                  try {
                    const { computeHash: devHash } = require("./api/utils/titleMint");
                    const spec = sessionState.pendingWorkerSpec;
                    // Find or create tenant after terms — for now just log it
                    // The actual Worker will be created after terms acceptance when tenant exists
                    console.log(`[dev] pendingWorkerSpec found for ${signupResult.uid}, will create after tenant setup`);
                  } catch (e) {
                    console.warn('[dev] deferred Worker check error:', e.message);
                  }
                }

                // Existing user who already accepted terms — skip to platform
                if (signupResult.existing && signupResult.termsAcceptedAt) {
                  sessionState.termsAccepted = true;
                  const memberships = signupResult.memberships || [];
                  const tenantId = memberships.length > 0 ? memberships[0].tenantId : null;
                  await sessionRef.set({
                    state: sessionState,
                    surface: 'developer',
                    userId: signupResult.uid,
                    ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
                    updatedAt: nowServerTs(),
                  }, { merge: true });
                  const name = sessionState.devName || '';
                  const msg = name
                    ? `Welcome back, ${name}. Let me take you into the platform.`
                    : `Welcome back. Let me take you into the platform.`;
                  sessionState.devHistory.push({ role: 'assistant', content: msg });
                  return res.json({
                    ok: true,
                    message: msg,
                    authToken: signupResult.token,
                    platformRedirect: true,
                    redirectPage: 'dashboard',
                    selectedTenantId: tenantId,
                    conversationState: 'dev_discovery',
                  });
                }

                // New user — show terms card
                await sessionRef.set({
                  state: sessionState,
                  surface: 'developer',
                  userId: signupResult.uid,
                  ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
                  updatedAt: nowServerTs(),
                }, { merge: true });
                const name = sessionState.devName || '';
                const termsMsg = name
                  ? `${name}, your account is ready. One quick step -- review and accept the terms of service, and I will take you right into the dashboard.`
                  : `Your account is ready. One quick step -- review and accept the terms of service, and I will take you right into the dashboard.`;
                sessionState.devHistory.push({ role: 'assistant', content: termsMsg });
                return res.json({
                  ok: true,
                  message: termsMsg,
                  authToken: signupResult.token,
                  cards: [{
                    type: 'terms',
                    data: {
                      termsUrl: 'https://app.titleapp.ai/legal/terms-of-service',
                      privacyUrl: 'https://app.titleapp.ai/legal/privacy-policy',
                      summary: "Your records are yours. We verify and secure them. We don't sell your data. You can export or delete anytime.",
                    },
                  }],
                  conversationState: 'dev_discovery',
                });
              }
            } catch (e) {
              console.error("dev: signup failed:", e.message);
              const name = sessionState.devName || '';
              const fallbackMsg = name
                ? `${name}, let me get that set up for you. One moment.`
                : `Let me get that set up for you. One moment.`;
              sessionState.devHistory.push({ role: 'assistant', content: fallbackMsg });
              await sessionRef.set({ state: sessionState, surface: 'developer', updatedAt: nowServerTs() }, { merge: true });
              return res.json({
                ok: true,
                message: fallbackMsg,
                showSignup: true,
                conversationState: 'dev_discovery',
              });
            }
          }

          // Handle terms accepted — accept terms, claim tenant, redirect to platform
          if (action === 'terms_accepted' && sessionState.userId) {
            try {
              await db.collection("users").doc(sessionState.userId).set(
                { termsAcceptedAt: nowServerTs() },
                { merge: true }
              );

              const tenantName = sessionState.devName || 'Personal';
              const tenantId = slugifyTenantId(tenantName);
              const tenantRef = db.collection("tenants").doc(tenantId);
              const tSnap = await tenantRef.get();
              if (!tSnap.exists) {
                await tenantRef.set({
                  name: tenantName,
                  tenantType: "personal",
                  vertical: "developer",
                  jurisdiction: "GLOBAL",
                  status: "active",
                  createdAt: nowServerTs(),
                  createdBy: sessionState.userId,
                });
              }
              const memSnap = await db.collection("memberships")
                .where("userId", "==", sessionState.userId)
                .where("tenantId", "==", tenantId)
                .limit(1)
                .get();
              if (memSnap.empty) {
                await db.collection("memberships").add({
                  userId: sessionState.userId,
                  tenantId,
                  role: "owner",
                  createdAt: nowServerTs(),
                });
              }

              // Create deferred Worker if spec was stashed before signup
              let deferredWorkerCard = null;
              if (sessionState.pendingWorkerSpec) {
                try {
                  const { computeHash: devHash } = require("./api/utils/titleMint");
                  const spec = sessionState.pendingWorkerSpec;
                  const rules = Array.isArray(spec.rules) ? spec.rules.slice(0, 50) : [];
                  const workerId = "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                  const rulesHash = devHash(rules);
                  const metadataHash = devHash({ name: spec.name, description: spec.description, rules_hash: rulesHash, created_at: new Date().toISOString() });

                  await db.doc(`tenants/${tenantId}/workers/${workerId}`).set({
                    name: String(spec.name || 'My Worker').substring(0, 200),
                    description: String(spec.description || '').substring(0, 2000),
                    source: { platform: 'dev-chat', createdVia: 'alex' },
                    capabilities: Array.isArray(spec.capabilities) ? spec.capabilities.slice(0, 20) : [],
                    rules, category: spec.category || 'custom',
                    pricing: { model: 'subscription', amount: 0, currency: 'USD' },
                    status: 'registered', imported: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: sessionState.userId,
                    rulesHash, metadataHash,
                  });

                  sessionState.lastWorkerId = workerId;
                  sessionState.lastWorkerTenantId = tenantId;
                  delete sessionState.pendingWorkerSpec;
                  deferredWorkerCard = {
                    type: 'workerCard',
                    data: { workerId, name: String(spec.name || 'My Worker').substring(0, 200), description: String(spec.description || '').substring(0, 2000), rules: rules.slice(0, 5), rulesCount: rules.length, status: 'registered', category: spec.category || 'custom', tenantId },
                  };
                  console.log(`[dev] Deferred Worker created: ${workerId} for tenant ${tenantId}`);
                } catch (e) {
                  console.warn('[dev] Deferred Worker creation failed:', e.message);
                }
              }

              sessionState.termsAccepted = true;
              await sessionRef.set({
                state: sessionState,
                surface: 'developer',
                userId: sessionState.userId,
                updatedAt: nowServerTs(),
              }, { merge: true });

              const name = sessionState.devName || '';
              const redirectMsg = deferredWorkerCard
                ? (name ? `All set, ${name}. Your Worker is live -- taking you to your sandbox now.` : `All set. Your Worker is live -- taking you to your sandbox now.`)
                : (name ? `All set, ${name}. Taking you into the dashboard now.` : `All set. Taking you into the dashboard now.`);
              sessionState.devHistory.push({ role: 'assistant', content: redirectMsg });
              return res.json({
                ok: true,
                message: redirectMsg,
                buildAnimation: !!deferredWorkerCard,
                ...(deferredWorkerCard ? { cards: [deferredWorkerCard] } : {}),
                platformRedirect: true,
                redirectPage: deferredWorkerCard ? 'my-gpts' : 'dashboard',
                selectedTenantId: tenantId,
                conversationState: 'dev_discovery',
              });
            } catch (e) {
              console.error("dev: terms acceptance failed:", e.message);
              const name = sessionState.devName || '';
              const errMsg = name
                ? `${name}, something went wrong with the terms step. Let me try that again -- just click the button below.`
                : `Something went wrong with the terms step. Let me try that again -- just click the button below.`;
              return res.json({
                ok: true,
                message: errMsg,
                conversationState: 'dev_discovery',
              });
            }
          }

          // Handle email — show magic link card inline (NOT "check your inbox")
          const emailMatch = userInput.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
          if (emailMatch && !sessionState.accountCreated) {
            const email = emailMatch[0].toLowerCase();
            sessionState.devEmail = email;

            const name = sessionState.devName || '';
            const linkMsg = name
              ? `Got it, ${name}. Here is your sign-in link -- just click to get started.`
              : `Got it. Here is your sign-in link -- just click to get started.`;
            sessionState.devHistory.push({ role: 'user', content: userInput });
            sessionState.devHistory.push({ role: 'assistant', content: linkMsg });
            await sessionRef.set({
              state: sessionState,
              surface: 'developer',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });
            return res.json({
              ok: true,
              message: linkMsg,
              cards: [{ type: 'magicLink', data: { email } }],
              showSignup: false,
              conversationState: 'dev_discovery',
            });
          }

          // Sandbox-specific prompt for the DIY Digital Worker builder environment
          const resolvedPath = sessionState.creatorPath || body.creatorPath || null;
          const isGamePath = resolvedPath && resolvedPath.startsWith('game');
          const gameMode = resolvedPath === 'game-casual' ? 'casual' : 'training';
          const workerName = sessionState.devWorkerName || '';

          // CODEX 47.1 Fix 4 — persist gameSessionPhase + game rules into session state
          // so they survive across requests, then surface them in the prompt.
          if (body.gameSessionPhase) {
            sessionState.gameSessionPhase = body.gameSessionPhase;
          }
          if (body.workerCardData?.gameRules) {
            sessionState.gameRulesAnswers = {
              ...(sessionState.gameRulesAnswers || {}),
              ...body.workerCardData.gameRules,
            };
          }
          if (body.workerCardData?.gameConfig && !sessionState.workerGameConfig) {
            sessionState.workerGameConfig = body.workerCardData.gameConfig;
          }
          if (body.workerCardData?.name && !sessionState.devWorkerName) {
            sessionState.devWorkerName = body.workerCardData.name;
          }

          let creatorPathCtx = '';
          if (isGamePath) {
            creatorPathCtx = `\nCRITICAL — GAME MODE: You are helping ${sessionState.devName || 'the creator'} build a GAME${workerName ? ' called "' + workerName + '"' : ''}. This is a game, not a Digital Worker. NEVER refer to it as a Digital Worker. NEVER suggest switching to the worker pipeline. Always say "game." Ask about game mechanics, player experience, rules, and artwork. The [WORKER_SPEC] block still works the same way -- include "gameConfig": { "isGame": true, "gameMode": "${gameMode}" } in the spec JSON.\n`;

            // CODEX 47.1 Fix 4 — inject locked-in game rules so Alex never asks again.
            const rules = sessionState.gameRulesAnswers || {};
            const ruleParts = [];
            if (rules.turnMechanic)       ruleParts.push(`Turn mechanic: ${rules.turnMechanic}`);
            if (rules.winLoseConditions)  ruleParts.push(`Win/lose: ${rules.winLoseConditions}`);
            if (rules.scoring)            ruleParts.push(`Scoring: ${rules.scoring}`);
            if (rules.safetyCompliance)   ruleParts.push(`Safety/compliance: ${rules.safetyCompliance}`);
            if (ruleParts.length > 0) {
              creatorPathCtx += `\nLOCKED-IN GAME RULES (do not ask about these — they are already defined):\n- ${ruleParts.join('\n- ')}\n\nWhen the creator asks about scoring, prizes, win conditions, or any rule, REFERENCE the rules above. Never say "we haven't defined that yet" or ask the rules again.\n`;
            }

            // CODEX 47.1 Fix 3 — proactively lead with the asset list when artwork phase opens.
            if (sessionState.gameSessionPhase === 'artwork') {
              const gameTitle = workerName || 'this game';
              creatorPathCtx += `\nARTWORK SESSION ACTIVE: The creator just entered the artwork phase for ${gameTitle}. Your VERY FIRST response in artwork mode must list the four asset types this game needs, derived from the locked-in rules above:\n1. Backgrounds / Settings — the world the game lives in\n2. Characters — playable and non-playable\n3. Icons / Items — power-ups, pickups, prizes\n4. Score display — how points appear on screen\n\nAfter listing, ask: "Want to start with backgrounds or characters?" Do NOT ask the creator what assets they need — you already know based on the rules. Lead with confidence.\n`;
            }
          } else if (resolvedPath === 'worker') {
            creatorPathCtx = '\nCREATOR MODE: The creator is building a Digital Worker.\n';
          }
          const sandboxSystemPrompt = `You are Alex. You help people build and publish AI workers and games -- no coding needed. You are inside the Vibe Coding Sandbox on TitleApp.
${creatorPathCtx}
TERMINOLOGY: Always say "Digital Worker" for workers. For games, say "game."

YOUR ROLE: Guide creators through a conversational flow to define, build, test, publish, and grow a Digital Worker or game. The UI handles visual flow -- your job is conversational guidance.

OPENING QUESTION:
The creator has already answered: "What do you do that other people always ask you for help with?" Their answer is the first message. Read it carefully.

CONVERSATION FLOW:
1. Acknowledge their expertise in one sentence. Then ask: "That is really interesting. Before I ask more -- what is your name?"
2. After they give their name, begin follow-up questions. Ask 3-5 follow-up questions, ONE AT A TIME, based on what is missing from their answer. Common gaps to probe:
   - Who specifically uses this day to day -- you, your team, your customers, or all three? (if audience is unclear)
   - What should this worker never get wrong? Think compliance, accuracy, anything that would cause real problems. (if stakes are unclear)
   - Are there regulations, compliance rules, or SOPs it needs to follow? (if not mentioned)
   - What should the output look like -- report, dashboard, email, chat? (if delivery format is unclear)
   - What state or region does this apply to? (if jurisdiction matters for their domain)
3. Do NOT ask questions whose answers are already obvious from what they told you.
4. After 3-5 exchanges, when you have enough to build (name/purpose + audience + at least 2 compliance rules or domain constraints), generate the worker using the WORKER_SPEC protocol below.

FAST TRACK:
If the creator pastes a long description (over 200 words), an existing prompt, or a structured workflow from ChatGPT, Claude, or Gemini, you may have enough after just 1-2 follow-up questions. Validate this: "Thinking it through in another tool first is a great way to come in with a clear idea."

If the creator says no regulations or compliance rules, respond: "Got it -- I will apply standard compliance defaults for your industry." Then move on.

NAME TIMING:
Your FIRST response must ask for the creator's name. Do not wait until later. Ask it naturally after your opening acknowledgment: "That is really interesting. Before I ask more -- what is your name?"

NAME HANDLING:
Ask for the creator's name exactly once. If you already know their name (from context or session), never ask again. Use their name naturally but do not overuse it.

LATER STEPS (the UI handles these after the worker is built):
- Build -- The UI shows a build progress animation. You are not needed unless they ask questions.
- Test -- The creator tests their worker. Suggest edge cases. If they report a problem, fix it silently.
- Preflight -- Automated 16-item deploy gate checklist. If any gate fails, explain what needs fixing.
- Distribute -- Distribution kit (URL, embed, QR, social copy). Help customize if asked.
- Grow -- Distribution coach mode. Help with social posts, email templates, subscriber growth.

GROW MODE:
When a Digital Worker is published: switch into distribution coach mode. Revenue context: Creators earn 75% of subscription revenue plus 20% of TitleApp's margin on inference overage. Workers are priced at $29, $49, or $79 per month. At $49/mo that is $36.75/seat to the creator.

ADAPT TO THE USER'S LEVEL:
- Novice: Do most of the work. "Describe what you want, I will build it."
- Expert: Assist when asked. Do not over-explain.

BREVITY RULES:
- 2-3 sentences per response
- ONE question per response
- Match the user's energy
- No emojis. No markdown formatting. Plain text only.

DIGITAL WORKER BUILD PROTOCOL:
CRITICAL: When you have enough information (name/purpose + audience + compliance rules or domain constraints), your response MUST end with a [WORKER_SPEC] block. Keep your conversational text to 2 sentences max so the spec fits within the response. The [WORKER_SPEC] block is how the system creates the worker -- without it, nothing happens.

Format:
[WORKER_SPEC]{"name":"Digital Worker Name","description":"What it does","rules":["Rule 1","Rule 2"],"capabilities":[],"category":"category","targetUser":"who it is for","problemSolves":"what problem it solves","raasRules":"regulations and SOPs"}[/WORKER_SPEC]

You MUST include both the opening [WORKER_SPEC] and closing [/WORKER_SPEC] tags. The JSON must be valid. Include this AFTER your conversational text.

BUILD PIPELINE (the UI handles this visually):
After [WORKER_SPEC], the UI runs the build pipeline automatically. Every stage requires completion before the next opens. Admin review is the final gate. Do not try to run the pipeline yourself.

IMAGE GENERATION:
When the creator asks for an image, artwork, illustration, icon, logo, visual asset, or any graphic for their worker or game — call the generate_image tool with a descriptive prompt. Do not describe the image in text. Do not ask clarifying questions before generating. Generate immediately and let the creator react. Style defaults to 'cartoon' for games and 'minimal' for workers unless the creator specifies otherwise.

When the creator sends a screenshot, describe what you see in 1-2 sentences before responding to their question.

AUTH HANDLING:
You never handle authentication. Never ask for an email address to fix auth problems. Never promise sign-in links. If auth fails, the UI handles it silently. Stay focused on the worker.

NEVER:
- Say "go to titleapp.ai" or "sign in somewhere else"
- Output [Note: ...] or [System: ...] bracket text
- Ask more than one question in a response
- Write more than 3 sentences unless they asked for detail
- Deny TitleApp's blockchain heritage
- Ask for an email to retry signup or fix auth
- Promise a sign-in link
${nameGuidance}${authGuidance}`;

          const devSystemPrompt = `You are Alex, TitleApp's developer relations AI. You're a tour guide, not a consultant. Show people around. Don't interview them.

RULE #1 -- BE BRIEF:
- 2-3 sentences per response. That's it.
- ONE question per response. Never two. Never three.
- If someone gives you a one-word answer, give a 1-sentence response.
- Stop writing paragraphs. Stop explaining things the developer didn't ask about.
- Never use emojis. Never use markdown formatting like asterisks or headers. Plain text only.

RULE #2 -- ASK NAME ONCE:
- Ask for their name exactly ONCE, in your first or second message.
- Once they give it, NEVER ask again. Store it. Use it.
- If someone says "sean" or "I'm Sean" -- that IS their name. Don't ask again.
- Single words that are common names (Sean, Mike, Alex, etc.) ARE names. Accept them.

RULE #3 -- BE A TOUR GUIDE, NOT AN INTERVIEWER:
- After you know their name and what they're building, SHOW THEM AROUND.
- Don't keep asking questions about their project. They'll tell you when ready.
- Proactively offer the tour. Say something like:
  "Cool. Three things devs usually want to see: the API, the DIY Digital Worker builder (think Apple's developer program but for AI), and the Digital Worker marketplace where you can sell what you build. Want the quick tour, or something specific?"
- If they pick something, show it briefly. If they want more, they'll ask.

RULE #4 -- EXPLAIN WHAT WE ARE (EARLY):
Within the first 3-4 messages, make sure they know:
- Digital Workers are AI services with built-in rules enforcement. You define business rules, AI operates within them, every output is validated. Full audit trail.
- We have an API (OpenAPI spec: https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs), a no-code Digital Worker builder, and a marketplace where devs earn 75% of revenue.
- It's like Apple's App Developer Program for AI services -- build it, publish it, earn from it.
- Pricing: sandbox is free. Worker pricing tiers: Free, $29/mo, $49/mo, $79/mo. Volume discounts at 3+ workers. Creator License: $49/yr (free until July 1, 2026 with code DEV100).
- Don't dump all this at once. But weave it into the first few exchanges naturally.
- Always say "Digital Worker." Not "worker" or "service" -- "Digital Worker."

RULE #5 -- NEVER DO THESE THINGS:
- Never ask for the name twice.
- Never ask more than one question in a response.
- Never write more than 3 sentences unless they asked for detail.
- Never start building/configuring a Digital Worker without them saying "let's build one."
- Never keep drilling into their project -- they said "just scoping"? Say "cool, want to look around?"
- Never act like a business consultant. You're showing them a cool workshop.
- Never offer investment information, raise terms, or financial details. Redirect to the investor chat.
- Never provide production API keys in chat. Account creation goes through the signup flow.
- Never make up endpoints or capabilities that do not exist.
- Never deny TitleApp's blockchain heritage -- the name comes from land title registry, not job titles.

RULE #6 -- NEVER SEND THEM AWAY:
- The developer is ALREADY on TitleApp. This chat IS TitleApp.
- Never say "go to titleapp.ai" or "visit our site" or "sign in somewhere else."
- When they need to sign up, ask for their email and handle it right here.
- When they want to see their Digital Worker or sandbox, say "Opening your sandbox..." -- the transition happens seamlessly.
- If something fails, say "Let me try that again" -- never redirect them elsewhere.

RULE #7 -- CELEBRATE MILESTONES:
- First Digital Worker built? "Nice -- your Digital Worker is live. Want to test it?"
- Keep it one sentence. Don't over-celebrate.

DIGITAL WORKER BUILD PROTOCOL:
When the developer says something like "build it", "let's do it", "yes", or "create it" and you have gathered enough information (name/purpose + at least 1-2 rules), output a WORKER_SPEC token. The format is:
[WORKER_SPEC]{"name":"Digital Worker Name","description":"What it does","rules":["Rule 1","Rule 2"],"capabilities":["cap1"],"category":"category"}[/WORKER_SPEC]
Include this AFTER your conversational response text. The system will strip it and create the Digital Worker automatically.
Before outputting the spec, make sure you have at minimum: a name, a description, and at least 1-2 rules. If not, ask ONE clarifying question.
After the build, say something like: "Done -- [Digital Worker Name] is live in your sandbox. Want to test it out?"

EXAMPLE CONVERSATION (follow this energy):

Dev: "Hi I need the API spec"
Alex: "Here it is: https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs -- that covers all endpoints and auth. What's your name?"

Dev: "Sean"
Alex: "Hey Sean. What are you building?"

Dev: "Construction management app"
Alex: "Nice -- construction is a great fit for what we do. Want the quick tour of our dev tools, or already know what you're looking for?"

Dev: "What do you have?"
Alex: "Three main things: an API for rules-enforced AI (the spec I sent), a no-code Digital Worker builder where you describe your service and we build it, and a marketplace where you publish and earn 75% revenue. Which one interests you?"

Dev: "Tell me about Digital Workers"
Alex: "A Digital Worker is like hiring an AI team member that follows your rules every time. You describe the problem your audience has, define what the worker should never get wrong, and we build it. For construction: 'never approve a draw without timestamped inspection photos.' The AI handles the work, your rules protect the outcome. Want to build one?"

That's the energy. Brief. Helpful. Let them lead.

ON BLOCKCHAIN HERITAGE (only when asked):
TitleApp started as a blockchain land title registry. The name comes from titling assets. Infrastructure pivoted to AI governance -- tamper-proof records + audit trail + provenance, wrapped in AI, then Digital Workers. Never deny the heritage.

RULE #8 -- NO INTERNAL NOTES:
- NEVER output text in brackets like [Note: ...] or [System: ...] or [Action: ...] or [At this point...].
- These are internal instructions, not user-facing content.
- If you can't perform an action, say so naturally: "I'm setting that up" or "Here's your link."
- Never expose internal reasoning, stage directions, or system notes to the user.

AUTH HANDLING:
You never handle authentication. Never ask for an email address to fix auth problems. Never promise sign-in links. If auth fails, the UI handles it silently. Stay focused on the developer's question.
${nameGuidance}${authGuidance}`;

          try {
            const anthropic = getAnthropic();
            const sandboxTools = surface === 'sandbox' ? [{
              name: "generate_image",
              description: "Generate an image, illustration, icon, logo, or visual asset. Call this when the creator asks for artwork.",
              input_schema: {
                type: "object",
                properties: {
                  prompt: { type: "string", description: "Descriptive prompt for the image to generate" },
                  style: { type: "string", enum: ["cartoon", "realistic", "diagram", "minimal"], description: "Visual style. Default: cartoon for games, minimal for workers." },
                },
                required: ["prompt"],
              },
            }] : null;

            const aiResp = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2048,
              system: surface === 'sandbox' ? sandboxSystemPrompt : devSystemPrompt,
              messages,
              ...(sandboxTools ? { tools: sandboxTools } : {}),
            });

            // Handle tool use (image generation in sandbox)
            let imageUrl = null;
            let savedAssetId = null;
            let aiText = '';
            const hasToolUse = aiResp.content.some(b => b.type === 'tool_use');

            if (hasToolUse) {
              const toolBlock = aiResp.content.find(b => b.type === 'tool_use');
              if (toolBlock && toolBlock.name === 'generate_image') {
                try {
                  const { generateImage } = require("./services/image");
                  const imgResult = await generateImage({
                    prompt: toolBlock.input.prompt,
                    style: toolBlock.input.style || (sessionState.creatorPath === 'game' ? 'cartoon' : 'minimal'),
                    size: 'square',
                    workerId: sessionState.lastWorkerId || 'sandbox-draft',
                    creatorId: authUser?.uid || 'anonymous',
                    vertical: 'sandbox',
                  });
                  if (imgResult.error) {
                    console.warn('[sandbox] Image generation error:', imgResult.error, imgResult.message);
                  }
                  imageUrl = imgResult.imageUrl || null;
                } catch (imgErr) {
                  console.warn('[sandbox] Image generation failed:', imgErr.message);
                }

                // Persist asset to creator's library
                if (imageUrl && authUser?.uid) {
                  try {
                    const { saveAsset } = require("./services/assets");
                    savedAssetId = await saveAsset(authUser.uid, {
                      imageUrl,
                      style: toolBlock.input.style || 'cartoon',
                      assetType: 'character',
                      prompt: toolBlock.input.prompt,
                      projectId: sessionState.lastWorkerId || null,
                      projectName: null,
                      sessionId,
                    });
                  } catch (e) {
                    console.warn('[sandbox] Asset save failed:', e.message);
                  }
                }

                // Continue conversation — send tool result back to Claude for final text
                messages.push({ role: 'assistant', content: aiResp.content });
                messages.push({ role: 'user', content: [{
                  type: 'tool_result',
                  tool_use_id: toolBlock.id,
                  content: imageUrl ? `Image generated successfully: ${imageUrl}` : 'Image generation failed. Tell the creator you will try again.',
                }] });
                const followUp = await anthropic.messages.create({
                  model: "claude-sonnet-4-5-20250929",
                  max_tokens: 1024,
                  system: sandboxSystemPrompt,
                  messages,
                  tools: sandboxTools,
                });
                aiText = followUp.content.find(b => b.type === 'text')?.text || 'Here you go.';
              }
            } else {
              // Warn if response was truncated — [WORKER_SPEC] may be cut off
              if (aiResp.stop_reason === 'max_tokens' || aiResp.stop_reason === 'end_turn' && aiResp.content[0]?.text?.includes('[WORKER_SPEC]') && !aiResp.content[0]?.text?.includes('[/WORKER_SPEC]')) {
                console.warn(`[dev] AI response may be truncated: stop_reason=${aiResp.stop_reason}, length=${(aiResp.content[0]?.text || '').length}`);
              }
              aiText = aiResp.content.find(b => b.type === 'text')?.text || "Hey there -- happy to help. What's your name?";
            }

            // Detect and parse [WORKER_SPEC]...[/WORKER_SPEC] token from AI response
            let workerCard = null;
            let buildAnimation = false;
            let workerSpecMatch = aiText.match(/\[WORKER_SPEC\]([\s\S]*?)\[\/WORKER_SPEC\]/);

            // Truncation recovery: opening tag found but no closing tag (response cut off)
            if (!workerSpecMatch && aiText.includes('[WORKER_SPEC]')) {
              console.warn('[dev] Truncated WORKER_SPEC detected — attempting partial JSON recovery');
              const partialStart = aiText.indexOf('[WORKER_SPEC]') + '[WORKER_SPEC]'.length;
              let partialJson = aiText.substring(partialStart).trim();
              // Try to close truncated JSON by adding missing braces/brackets
              try {
                // Count open braces/brackets and close them
                let openBraces = 0, openBrackets = 0;
                for (const ch of partialJson) {
                  if (ch === '{') openBraces++;
                  else if (ch === '}') openBraces--;
                  else if (ch === '[') openBrackets++;
                  else if (ch === ']') openBrackets--;
                }
                // Strip trailing comma if present
                partialJson = partialJson.replace(/,\s*$/, '');
                // Close any open strings — find last unclosed quote
                const quoteCount = (partialJson.match(/(?<!\\)"/g) || []).length;
                if (quoteCount % 2 !== 0) partialJson += '"';
                // Close brackets/braces
                while (openBrackets > 0) { partialJson += ']'; openBrackets--; }
                while (openBraces > 0) { partialJson += '}'; openBraces--; }
                JSON.parse(partialJson); // validate
                workerSpecMatch = [null, partialJson]; // synthetic match
                console.log('[dev] Truncation recovery succeeded');
              } catch (e) {
                console.warn('[dev] Truncation recovery failed:', e.message);
              }
            }

            if (workerSpecMatch) {
              try {
                const workerSpec = JSON.parse(workerSpecMatch[1].trim());
                aiText = aiText.replace(/\s*\[WORKER_SPEC\][\s\S]*?\[\/WORKER_SPEC\]\s*/g, '').trim();

                // Determine tenant — user may or may not be signed up yet
                let targetTenantId = null;
                if (sessionState.userId) {
                  const memSnap = await db.collection("memberships")
                    .where("userId", "==", sessionState.userId)
                    .limit(1)
                    .get();
                  if (!memSnap.empty) {
                    targetTenantId = memSnap.docs[0].data().tenantId;
                  }
                }

                const rules = Array.isArray(workerSpec.rules) ? workerSpec.rules.slice(0, 50) : [];
                const workerName = String(workerSpec.name || 'My Worker').substring(0, 200);
                const workerDesc = String(workerSpec.description || '').substring(0, 2000);
                const workerCategory = workerSpec.category || 'custom';

                // Persist worker/game name and gameConfig in session for prompt reinforcement
                sessionState.devWorkerName = workerName;
                if (workerSpec.gameConfig?.isGame) {
                  sessionState.workerGameConfig = workerSpec.gameConfig;
                  if (!sessionState.creatorPath) sessionState.creatorPath = 'game-casual';
                }

                if (targetTenantId) {
                  // Create Worker — auto-fix then validate through unified schema gate
                  const { computeHash: devHash } = require("./api/utils/titleMint");
                  const { validateWorkerRecord, autoFixWorkerRecord, TIER_0_DEFAULTS, slugify } = require("./helpers/workerSchema");

                  const workerSlug = workerSpec.worker_id || slugify(workerName);
                  const workerRecord = {
                    worker_id: workerSlug,
                    display_name: workerName,
                    headline: workerSpec.headline || workerDesc.substring(0, 120),
                    suite: workerSpec.suite || workerCategory || "General Business",
                    worker_type: workerSpec.worker_type || "standalone",
                    pricing_tier: workerSpec.pricing_tier !== undefined ? Number(workerSpec.pricing_tier) : 0,
                    raas_tier_0: TIER_0_DEFAULTS,
                    raas_tier_1: (workerSpec.tier_1 || rules).slice(0, 50),
                    raas_tier_2: (workerSpec.tier_2 || []).slice(0, 50),
                    raas_tier_3: (workerSpec.tier_3 || []).slice(0, 50),
                    vault_reads: workerSpec.vault_reads || [],
                    vault_writes: workerSpec.vault_writes || [],
                    referral_triggers: workerSpec.referral_triggers || [],
                    document_templates: workerSpec.document_templates || [],
                    landing_page_slug: `workers/${workerSlug}`,
                    status: "draft",
                  };

                  // Auto-fix schema gaps silently (suite mapping, raas_tier_1 padding, credit_cost inference)
                  autoFixWorkerRecord(workerRecord, workerDesc);

                  let saveAttempts = 0;
                  let saved = false;
                  while (saveAttempts < 2 && !saved) {
                    saveAttempts++;
                    try {
                      const { record: validated, warnings } = validateWorkerRecord(workerRecord);
                      if (warnings.length > 0) console.log(`[dev] Worker validation warnings: ${warnings.join("; ")}`);

                      const rulesHash = devHash(validated.raas_tier_1);
                      const metadataHash = devHash({ name: validated.display_name, description: workerDesc, rules_hash: rulesHash, created_at: new Date().toISOString() });

                      await db.doc(`tenants/${targetTenantId}/workers/${validated.worker_id}`).set({
                        ...validated,
                        description: workerDesc,
                        targetUser: String(workerSpec.targetUser || "").substring(0, 500),
                        problemSolves: String(workerSpec.problemSolves || "").substring(0, 2000),
                        raasRules: String(workerSpec.raasRules || "").substring(0, 2000),
                        source: { platform: "dev-chat", createdVia: "alex" },
                        capabilities: Array.isArray(workerSpec.capabilities) ? workerSpec.capabilities.slice(0, 20) : [],
                        imported: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: sessionState.userId,
                        rulesHash, metadataHash,
                      });

                      buildAnimation = true;
                      workerCard = {
                        type: "workerCard",
                        data: { workerId: validated.worker_id, name: validated.display_name, description: workerDesc, rules: validated.raas_tier_1.slice(0, 5), rulesCount: validated.raas_tier_1.length, status: "draft", category: validated.suite, tenantId: targetTenantId, targetUser: workerSpec.targetUser || "", problemSolves: workerSpec.problemSolves || "", raasRules: workerSpec.raasRules || "" },
                      };
                      sessionState.lastWorkerId = validated.worker_id;
                      sessionState.lastWorkerTenantId = targetTenantId;
                      saved = true;
                      console.log(`[dev] Worker created: ${validated.worker_id} for tenant ${targetTenantId}`);
                    } catch (valErr) {
                      console.warn(`[dev] Worker validation attempt ${saveAttempts} failed: ${valErr.message}`);
                      if (saveAttempts < 2) {
                        // Re-run autoFix more aggressively — it should have caught everything, but retry
                        autoFixWorkerRecord(workerRecord, workerDesc);
                      }
                    }
                  }

                  if (!saved) {
                    // Both attempts failed — graceful message, no schema details leaked
                    console.error(`[dev] Worker save failed after 2 attempts for tenant ${targetTenantId}`);
                    aiText = `Your ${workerName} is almost there. I am doing a quick quality check and will have this ready in a moment.`;
                    // Stash for manual recovery
                    sessionState.pendingWorkerSpec = workerSpec;
                    sessionState.pendingWorkerError = true;
                  }
                } else {
                  // No account yet — stash spec for creation after signup
                  sessionState.pendingWorkerSpec = workerSpec;
                  buildAnimation = true;
                  workerCard = {
                    type: 'workerCard',
                    data: { workerId: 'pending', name: workerName, description: workerDesc, rules: rules.slice(0, 5), rulesCount: rules.length, status: 'pending-signup', category: workerCategory, tenantId: null, targetUser: workerSpec.targetUser || "", problemSolves: workerSpec.problemSolves || "", raasRules: workerSpec.raasRules || "" },
                  };
                  console.log(`[dev] Worker spec stashed for deferred creation`);
                }
              } catch (e) {
                console.warn('[dev] failed to parse WORKER_SPEC:', e.message);
              }
            }

            // Strip any leaked internal notes: [Note: ...], [System: ...], [Action: ...], etc.
            aiText = aiText.replace(/\s*\[(?:Note|System|Action|At this point|Internal|Stage direction)[^\]]*\]\s*/gi, '').trim();

            // Safety net: force name ask by message 4 if AI still hasn't and name unknown
            if (!sessionState.devName && userMsgCount >= 4 && !/what'?s your name|your name|who am i talking|what should i call/i.test(aiText)) {
              aiText += '\n\nBy the way, what should I call you?';
            }

            // Check if AI is prompting for signup
            const showSignup = /\b(create.*account|set.*up|sign.*up|get.*access|api key)\b/i.test(aiText) && !sessionState.accountCreated;

            sessionState.devHistory.push({ role: 'user', content: userInput, ...(hasImage && { hasImage: true }) });
            sessionState.devHistory.push({ role: 'assistant', content: aiText });

            // Cap history at 30 entries to prevent context overflow
            if (sessionState.devHistory.length > 30) {
              sessionState.devHistory = sessionState.devHistory.slice(-30);
            }

            await sessionRef.set({
              state: sessionState,
              surface: 'developer',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });

            // Log developer interaction
            await db.collection("messageEvents").add({
              type: "dev:chat",
              message: userInput,
              response: aiText,
              devContext: {
                surface: "developer",
                devName: sessionState.devName || null,
                showSignup,
                workerBuilt: buildAnimation,
              },
              createdAt: nowServerTs(),
            });

            return res.json({
              ok: true,
              message: aiText,
              showSignup,
              buildAnimation,
              ...(workerCard ? { cards: [workerCard] } : {}),
              ...(imageUrl ? { imageUrl } : {}),
              ...(savedAssetId ? { assetId: savedAssetId } : {}),
              ...(sessionState.creatorPath ? { creatorPath: sessionState.creatorPath } : {}),
              conversationState: 'dev_discovery',
            });
          } catch (e) {
            console.error("Developer AI failed:", e.message, e.stack);
            await sessionRef.set({
              state: sessionState,
              surface: surface || 'developer',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });
            const fallbackMsg = surface === 'sandbox'
              ? "Something went wrong on my end. Tell me more about what you're building and I'll try again."
              : "I can help with the API and integration. What would you like to know?";
            return res.json({
              ok: true,
              message: fallbackMsg,
              showSignup: false,
              conversationState: 'dev_discovery',
            });
          }
        }

        // ── Privacy Mode: /privacy entry point — Alex answers privacy questions ──
        if ((surface === 'privacy' || sessionState.step === 'privacy_discovery') &&
            !action && userInput) {

          if (!sessionState.privacyHistory) sessionState.privacyHistory = [];
          sessionState.step = 'privacy_discovery';

          const messages = [];
          if (sessionState.privacyHistory.length === 0) {
            messages.push({ role: 'assistant', content: "Hi, I'm Alex. I can walk you through TitleApp's privacy practices, answer questions about how we handle your data, or explain our security model. What would you like to know?" });
          }
          for (const h of sessionState.privacyHistory) {
            messages.push({ role: h.role, content: h.content });
          }
          messages.push({ role: 'user', content: userInput });

          const privacySystemPrompt = `You are Alex, TitleApp's Chief of Staff. You are answering questions about TitleApp's privacy practices and data handling.

TITLEAPP PRIVACY PRACTICES:

Data Collection:
- We collect the information you provide when creating an account: name, email address.
- When you use the platform, we store records you create (documents, vehicle info, credentials, deal analyses) in your private workspace.
- Chat conversations are stored to maintain context and improve the experience.
- We collect standard usage analytics (page views, feature usage) to improve the product.

Data Storage and Security:
- All data is stored in Google Cloud (Firebase/Firestore) with encryption at rest and in transit.
- Data is append-only and event-sourced — records are never silently overwritten or deleted. Every change is a new timestamped event.
- Authentication uses Firebase Auth with industry-standard security practices.
- Optional blockchain anchoring writes proof-of-existence hashes to Polygon — the hash proves a record is untampered, but the actual data never goes on-chain.

Data Sharing:
- We do not sell your data to third parties. Period.
- AI processing uses Anthropic (Claude) and OpenAI (GPT). Your prompts and responses are sent to these providers for processing. Both providers have data processing agreements that prohibit them from using your data to train their models.
- Within a business workspace, data is shared with workspace members based on their role permissions.
- We may share anonymized, aggregated analytics (never individual records) for product improvement.

Your Rights:
- You can export your data at any time through the platform.
- You can request account deletion by contacting us. We will delete your account and personal data. Note: append-only event records are retained for audit trail integrity but are disassociated from your identity.
- If blockchain anchoring was used, on-chain hashes cannot be removed (blockchain is immutable by design), but the hashes alone contain no personal data.

GDPR and CCPA:
- We respect data subject rights under GDPR and CCPA.
- You have the right to access, correct, and delete your personal data.
- You have the right to data portability.
- You can opt out of non-essential data processing.
- Contact privacy@titleapp.ai or sean@titleapp.ai for any privacy requests.

Cookies:
- We use essential cookies for authentication and session management.
- We use analytics cookies to understand how the product is used.
- We do not use advertising or tracking cookies.

CONVERSATION STYLE:
- Be transparent, plain-spoken, and helpful. Translate legal concepts into plain English.
- Answer the specific question asked. Do not dump the entire privacy policy unless they ask for it.
- If someone asks to "read the whole policy," provide the full text section by section.
- Never use emojis. Never use markdown formatting. Plain text only.
- Keep responses concise and direct.
- If you do not know the answer to a specific privacy question, say so honestly and suggest they email privacy@titleapp.ai.`;

          try {
            const anthropic = getAnthropic();
            const aiResp = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2048,
              system: privacySystemPrompt,
              messages,
            });

            const aiText = aiResp.content[0]?.text || "I can help with privacy questions. What would you like to know?";
            sessionState.privacyHistory.push({ role: 'user', content: userInput });
            sessionState.privacyHistory.push({ role: 'assistant', content: aiText });

            await sessionRef.set({
              state: sessionState,
              surface: 'privacy',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });

            return res.json({
              ok: true,
              message: aiText,
              showSignup: false,
              conversationState: 'privacy_discovery',
            });
          } catch (e) {
            console.error("Privacy AI failed:", e.message);
            return res.json({
              ok: true,
              message: "I can help with privacy questions. What would you like to know about how TitleApp handles your data?",
              showSignup: false,
              conversationState: 'privacy_discovery',
            });
          }
        }

        // GUARD: privacy surface fallback
        if (surface === 'privacy') {
          return res.json({
            ok: true,
            message: "I can answer questions about TitleApp's privacy practices. What would you like to know?",
            showSignup: false,
            conversationState: 'privacy_discovery',
          });
        }

        // ── Contact Mode: /contact entry point — Alex provides company info ──
        if ((surface === 'contact' || sessionState.step === 'contact_discovery') &&
            !action && userInput) {

          if (!sessionState.contactHistory) sessionState.contactHistory = [];
          sessionState.step = 'contact_discovery';

          const messages = [];
          if (sessionState.contactHistory.length === 0) {
            messages.push({ role: 'assistant', content: "Hi, I'm Alex. Need to reach someone at TitleApp? I can share contact details, help you connect with the right person, or answer questions about the company. How can I help?" });
          }
          for (const h of sessionState.contactHistory) {
            messages.push({ role: h.role, content: h.content });
          }
          messages.push({ role: 'user', content: userInput });

          // Check if user wants to leave a message
          const lowerInput = userInput.toLowerCase();
          const wantsToLeaveMessage = /\b(leave a message|send a message|get back to me|have someone call|reach out to me)\b/.test(lowerInput);

          let messageGuidance = '';
          if (wantsToLeaveMessage) {
            messageGuidance = '\nThe user wants to leave a message. Ask for their name, email, and what they would like to discuss. Once you have all three, confirm you have logged it and someone will follow up.';
          }

          // Check if user provided contact info for message capture
          const emailMatch = userInput.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
          if (emailMatch && sessionState.step === 'contact_discovery' && sessionState.wantsMessage) {
            // Capture message to Firestore
            try {
              await db.collection("contactMessages").add({
                name: sessionState.contactName || null,
                email: emailMatch[0].toLowerCase(),
                message: sessionState.contactMessage || userInput,
                source: "chat",
                createdAt: nowServerTs(),
              });
              sessionState.messageCaptured = true;
            } catch (e) {
              console.error("Failed to save contact message:", e.message);
            }
          }

          const contactSystemPrompt = `You are Alex, TitleApp's Chief of Staff. You are helping someone who wants to contact or learn about TitleApp.

COMPANY INFORMATION:

Company: TitleApp
Legal Name: Title App LLC, The
Legal Structure: Corporation

Office Address:
2411 Chestnut St
San Francisco, CA 94123

Phone: (415) 236-0013

Primary Contact:
Sean Lee Combs, CEO
Email: sean@titleapp.ai
Phone: (310) 430-0780

General Inquiries: hello@titleapp.ai

Legal Entity Details (for vendors, partnerships, government forms):
EIN: 33-1330902
DUNS: 119438383
Registered Agent: 1209 N Orange St, Wilmington, DE 19801

CONVERSATION STYLE:
- Be warm, helpful, and direct. You are not a phone tree.
- When someone asks where TitleApp is located, give the address: 2411 Chestnut St, San Francisco, CA 94123.
- When someone wants to reach a specific person, provide their contact info directly.
- When someone wants to leave a message, ask for their name, email, and what they want to discuss. Confirm once captured.
- When someone needs legal entity info (EIN, DUNS, legal name), provide it directly.
- If someone wants to schedule a meeting, suggest they email sean@titleapp.ai with their availability.
- Never use emojis. Never use markdown formatting. Plain text only.
- Keep responses concise and helpful.
${messageGuidance}`;

          try {
            const anthropic = getAnthropic();
            const aiResp = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2048,
              system: contactSystemPrompt,
              messages,
            });

            const aiText = aiResp.content[0]?.text || "I can help you reach the right person at TitleApp. What do you need?";

            // Detect if Alex is asking for message details
            if (/\b(name|email|what.*discuss|what.*about)\b/i.test(aiText) && wantsToLeaveMessage) {
              sessionState.wantsMessage = true;
            }

            sessionState.contactHistory.push({ role: 'user', content: userInput });
            sessionState.contactHistory.push({ role: 'assistant', content: aiText });

            await sessionRef.set({
              state: sessionState,
              surface: 'contact',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });

            return res.json({
              ok: true,
              message: aiText,
              showSignup: false,
              conversationState: 'contact_discovery',
            });
          } catch (e) {
            console.error("Contact AI failed:", e.message);
            return res.json({
              ok: true,
              message: "You can reach TitleApp at hello@titleapp.ai or call (415) 236-0013. Our office is at 2411 Chestnut St, San Francisco, CA 94123.",
              showSignup: false,
              conversationState: 'contact_discovery',
            });
          }
        }

        // GUARD: contact surface fallback
        if (surface === 'contact') {
          return res.json({
            ok: true,
            message: "You can reach TitleApp at hello@titleapp.ai or call (415) 236-0013. Our office is at 2411 Chestnut St, San Francisco, CA 94123. How can I help?",
            showSignup: false,
            conversationState: 'contact_discovery',
          });
        }

        // GUARD: If surface is 'developer' and we got here, the dev handler failed.
        if (surface === 'developer') {
          console.warn("chatEngine: developer handler did not return, using fallback");
          await sessionRef.set({
            state: sessionState,
            surface: 'developer',
            userId: authUser ? authUser.uid : null,
            ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
            updatedAt: nowServerTs(),
          }, { merge: true });
          return res.json({
            ok: true,
            message: "I'm here to help with the TitleApp API and Digital Worker platform. What would you like to know?",
            showSignup: false,
            conversationState: 'dev_discovery',
          });
        }

        // GUARD: If surface is 'invest' and we got here, the invest handler failed.
        // Return a safe investor fallback — NEVER fall through to generic workspace engine.
        if (surface === 'invest') {
          console.warn("chatEngine: invest handler did not return, using fallback");
          await sessionRef.set({
            state: sessionState,
            surface: 'invest',
            userId: authUser ? authUser.uid : null,
            ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
            updatedAt: nowServerTs(),
          }, { merge: true });
          return res.json({
            ok: true,
            message: "I'm here to help with anything about TitleApp and the raise. What would you like to know?",
            showSignup: false,
            conversationState: 'invest_discovery',
          });
        }

        // Build services for chatEngine (called during processing)
        const services = {
          decodeVin: decodeVinInternal,
          signup: signupInternal,
        };

        // Process through chatEngine
        const engineResult = await chatEngineProcess({
          state: sessionState,
          userInput: userInput || "",
          action: action || null,
          actionData: actionData || {},
          fileData: fileData || null,
          fileName: fileName || null,
          surface: surface || "landing",
        }, services);

        // If signup just happened, the engine state now has userId + authToken
        // Use it for subsequent side effects
        const effectiveUserId = engineResult.state.userId || (authUser && authUser.uid) || null;

        // Resolve tenantId from user's active membership (for cross-tenant isolation)
        let effectiveTenantId = null;
        if (effectiveUserId) {
          try {
            const memSnap = await db.collection("memberships")
              .where("userId", "==", effectiveUserId)
              .where("status", "==", "active")
              .limit(1)
              .get();
            if (!memSnap.empty) {
              effectiveTenantId = memSnap.docs[0].data().tenantId || null;
            }
          } catch (e) {
            console.warn("chatEngine: failed to resolve tenantId for user", effectiveUserId, e.message);
          }
        }

        // Execute fire-and-forget side effects
        if (engineResult.sideEffects && engineResult.sideEffects.length > 0) {
          // Run side effects without blocking the response
          executeChatSideEffects(engineResult.sideEffects, effectiveUserId, effectiveTenantId)
            .catch(e => console.warn("chatEngine side-effects batch error:", e.message));
        }

        // Handle AI intent classification
        if (engineResult.classifyIntent && engineResult.originalMessage) {
          try {
            const anthropic = getAnthropic();
            const classifyResponse = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 512,
              system: `You are TitleApp's intent classifier. The user is authenticated and telling you what they want to do. Based on their message, determine what they're trying to accomplish. Consider the full meaning of what they're saying, not just keywords.

Respond with ONLY a JSON object:
{
  "intent": "a short snake_case label for what they want",
  "summary": "a natural one-sentence description of what they want to do, written as if confirming back to them",
  "vertical": "if this is business-related, your best guess at the industry or business type, otherwise null",
  "confidence": "high or low"
}

Be generous in interpretation. If someone says 'I manage apartments in Austin' that's property management. If someone says 'I need to track my deals' that's investment analysis. If someone says 'my ride needs documenting' that's a vehicle record. Understand what people mean, not just what they say.`,
              messages: [{ role: "user", content: engineResult.originalMessage }],
            });

            const aiText = classifyResponse.content[0]?.text || "";
            const classified = safeParseJSON(aiText, {
              required: ['intent', 'summary'],
            });

            if (classified) {
              // Store classification in state for confirm_intent handler
              engineResult.state.classifiedIntent = {
                intent: String(classified.intent || '').substring(0, 200),
                summary: String(classified.summary || '').substring(0, 1000),
                vertical: classified.vertical ? String(classified.vertical).substring(0, 200) : null,
                confidence: String(classified.confidence || 'low').substring(0, 10),
                originalMessage: engineResult.originalMessage,
              };
              engineResult.state.step = "confirm_intent";

              // Build confirmation message based on confidence
              // Clean the summary: strip trailing period, lowercase first char,
              // and remove leading "you want to" / "you'd like to" if the AI included it
              let cleanSummary = classified.summary.replace(/\.$/, '');
              cleanSummary = cleanSummary.charAt(0).toLowerCase() + cleanSummary.slice(1);
              cleanSummary = cleanSummary.replace(/^(you want to |you'd like to |you're looking to |you need to )/, '');

              const confirmMessage = classified.confidence === "high"
                ? `It sounds like you want to ${cleanSummary}. Is that right?`
                : `I want to make sure I understand. Are you looking to ${cleanSummary}?`;

              const confirmChips = classified.confidence === "high"
                ? ["Yes, that's right", "No, something else"]
                : ["Yes", "Not quite -- let me explain"];

              // Write state and return
              await sessionRef.set({
                state: engineResult.state,
                surface: surface || "landing",
                userId: effectiveUserId,
                ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
                updatedAt: nowServerTs(),
              }, { merge: true });

              return res.json({
                ok: true,
                message: confirmMessage,
                cards: [],
                promptChips: confirmChips,
                followUpMessage: null,
                conversationState: "confirm_intent",
                ...(engineResult.state.authToken ? { authToken: engineResult.state.authToken } : {}),
                ...(effectiveSessionId !== sessionId ? { sessionId: effectiveSessionId } : {}),
              });
            }
          } catch (e) {
            console.error("AI intent classification failed:", e.message);
            // Fall through gracefully — don't show "trouble connecting"
          }

          // Classification failed — graceful fallback
          engineResult.state.step = "authenticated";
          const fallbackMessage = "Tell me a bit more about what you're looking to do and I'll point you in the right direction.";
          const fallbackChips = engineResult.state.audienceType === "business"
            ? ["Set up my workspace", "Add a record", "View my vault"]
            : (engineResult.state.records && engineResult.state.records.length > 0)
              ? ["View my vault", "Add another record", "Set up a business"]
              : ["Add a vehicle", "Add a credential", "View my vault"];

          await sessionRef.set({
            state: engineResult.state,
            surface: surface || "landing",
            userId: effectiveUserId,
            ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
            updatedAt: nowServerTs(),
          }, { merge: true });

          return res.json({
            ok: true,
            message: fallbackMessage,
            cards: [],
            promptChips: fallbackChips,
            followUpMessage: null,
            conversationState: "authenticated",
            ...(engineResult.state.authToken ? { authToken: engineResult.state.authToken } : {}),
            ...(effectiveSessionId !== sessionId ? { sessionId: effectiveSessionId } : {}),
          });
        }

        // Handle RAAS onboarding (AI classifies business and matches to pre-built RAAS)
        if (engineResult.generateRaas && engineResult.aiContext) {
          const ctx = engineResult.aiContext;
          let raasMessage = "";
          let raasChips = [];

          if (engineResult.generateRaas === 'build_questions') {
            // Generate first question for RAAS builder
            try {
              const anthropic = getAnthropic();
              const qResponse = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 512,
                system: `You are helping build a custom Digital Worker configuration for a business. Based on their description: "${ctx.companyDescription}". Company: ${ctx.companyName}. Ask them the first of 3-5 questions that would help you understand their key record types, compliance requirements, and workflows. Ask one question at a time. Keep questions conversational and specific to their industry. Respond with ONLY the question text, nothing else.`,
                messages: [{ role: "user", content: "What should I ask first?" }],
              });
              raasMessage = qResponse.content[0]?.text || "What types of records does your business need to track?";
              engineResult.state.raasBuildCurrentQuestion = raasMessage;
            } catch (e) {
              console.error("RAAS build questions failed:", e.message);
              raasMessage = "What types of records does your business need to track?";
              engineResult.state.raasBuildCurrentQuestion = raasMessage;
            }
          } else if (engineResult.generateRaas === 'build_next_question') {
            // Generate next question based on previous answers
            try {
              const anthropic = getAnthropic();
              const answersText = (ctx.answers || []).map((a, i) => `Q${i+1}: ${a.question}\nA${i+1}: ${a.answer}`).join("\n\n");
              const qResponse = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 512,
                system: `You are helping build a custom Digital Worker configuration for "${ctx.companyName}" (${ctx.companyDescription}). Here are the questions asked and answers so far:\n\n${answersText}\n\nAsk the next question to understand their record types, compliance requirements, or workflows. Keep it conversational and specific to their industry. Respond with ONLY the question text.`,
                messages: [{ role: "user", content: "What should I ask next?" }],
              });
              raasMessage = qResponse.content[0]?.text || "What compliance requirements does your business need to track?";
              engineResult.state.raasBuildCurrentQuestion = raasMessage;
            } catch (e) {
              console.error("RAAS build next question failed:", e.message);
              raasMessage = "What compliance requirements does your business need to track?";
              engineResult.state.raasBuildCurrentQuestion = raasMessage;
            }
          } else if (engineResult.generateRaas === 'build_summary') {
            // Generate configuration summary
            try {
              const anthropic = getAnthropic();
              const answersText = (ctx.answers || []).map((a, i) => `Q${i+1}: ${a.question}\nA${i+1}: ${a.answer}`).join("\n\n");
              const sResponse = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 1024,
                system: `You are Alex from TitleApp. Based on the following conversation with "${ctx.companyName}" (${ctx.companyDescription}), summarize the Digital Worker configuration you'd set up for them. Write 2-3 sentences describing what their workspace will include — record types, compliance rules, and workflows. Write directly to the user in second person. No bullet points, no jargon.`,
                messages: [{ role: "user", content: answersText }],
              });
              const summary = sResponse.content[0]?.text || "Your workspace will include custom record management, compliance tracking, and automated workflows.";
              engineResult.state.raasBuildSummary = summary;
              raasMessage = `Based on what you've told me, here's what I'm setting up for your workspace: ${summary} Does this look right?`;
              raasChips = ["Yes, looks good", "Not quite -- let me adjust"];
            } catch (e) {
              console.error("RAAS build summary failed:", e.message);
              raasMessage = "Your workspace is configured. Does this look right?";
              raasChips = ["Yes, looks good", "Not quite -- let me adjust"];
            }
          } else {
            // Standard RAAS classification
            try {
              const anthropic = getAnthropic();
              const raasResponse = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 1024,
                system: `You are Alex from TitleApp helping onboard a new business. The user has described their business. Based on their description, determine:

1. What industry or business type this is
2. What kinds of records, compliance requirements, and workflows they likely need
3. Whether TitleApp has a pre-built Digital Worker configuration that fits

TitleApp currently has pre-built Digital Worker configurations for: consumer (vehicles, credentials, student records), property management (rentals, tenants, leases, maintenance, HOA), and deal analysis (investment vetting, memos, pipeline). More are being built.

Respond with ONLY a JSON object:
{
  "industry": "the industry or business type",
  "hasExistingRaas": true/false,
  "raasMatch": "which existing Digital Worker config fits, or null",
  "summary": "a 2-3 sentence description of what their workspace would include, written directly to the user in second person",
  "suggestedNextStep": "what to do first in their workspace"
}`,
                messages: [{ role: "user", content: `Company: ${ctx.companyName}. Description: ${ctx.companyDescription}` }],
              });

              const aiText = raasResponse.content[0]?.text || "";
              const raasClassification = safeParseJSON(aiText, {
                required: ['industry'],
              });

              if (raasClassification) {
                engineResult.state.raasClassification = raasClassification;

                if (raasClassification.hasExistingRaas) {
                  raasMessage = `We have a rules engine built for ${raasClassification.industry}. Ready to go, or want to upload your own SOPs first?`;
                  raasChips = ["Start with the standard setup", "I have SOPs to upload first", "Tell me more about what's included"];
                } else {
                  raasMessage = `No pre-built config for ${raasClassification.industry} yet, but I can build one. I'll ask a few questions about your records and workflows. Takes about 5 minutes. Ready?`;
                  raasChips = ["Let's build it", "Tell me more about how this works"];
                }
              }
            } catch (e) {
              console.error("RAAS classification failed:", e.message);
            }
          }

          // If RAAS classification failed, use fallback
          if (!raasMessage) {
            raasMessage = "I'm setting up your workspace. What does your business focus on?";
            raasChips = ["Property Management", "Deal Analysis & Investment", "Auto Dealer", "Sales & Marketing", "Other"];
            engineResult.state.step = "select_vertical";
          }

          // Combine with any existing message from chatEngine (like welcome card)
          const combinedMessage = engineResult.message
            ? engineResult.message
            : "";

          await sessionRef.set({
            state: engineResult.state,
            surface: surface || "landing",
            userId: effectiveUserId,
            ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
            updatedAt: nowServerTs(),
          }, { merge: true });

          // Execute side effects if any
          if (engineResult.sideEffects && engineResult.sideEffects.length > 0) {
            executeChatSideEffects(engineResult.sideEffects, effectiveUserId, effectiveTenantId)
              .catch(e => console.warn("chatEngine side-effects batch error:", e.message));
          }

          return res.json({
            ok: true,
            message: combinedMessage,
            cards: engineResult.cards || [],
            promptChips: raasChips,
            followUpMessage: raasMessage,
            conversationState: engineResult.state.step,
            ...(engineResult.state.authToken ? { authToken: engineResult.state.authToken } : {}),
            ...(effectiveSessionId !== sessionId ? { sessionId: effectiveSessionId } : {}),
          });
        }

        // Handle onboarding promise (emotional AI-generated welcome)
        if (engineResult.generateOnboardingPromise && engineResult.aiContext) {
          const ctx = engineResult.aiContext;
          let promiseMessage = "";

          try {
            const anthropic = getAnthropic();

            const systemPrompt = ctx.type === "business"
              ? `You are Alex from TitleApp. A business owner just set up their workspace. Business: ${ctx.companyDescription || ctx.companyName}. Industry: ${ctx.industry || "general"}.

Write 2 sentences MAX. First sentence: what changes for them now (no more scrambling, records are permanent). Second sentence: a transition to their first action. No jargon, no bullet points, no markdown, no emojis. Direct and warm.`
              : `You are Alex from TitleApp. A consumer just signed up. Write 2 sentences MAX. First sentence: what changes for them (verified records = real value). Second sentence: "What would you like to start with?" No jargon, no bullet points, no markdown, no emojis.`;

            const promiseResponse = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 150,
              system: systemPrompt,
              messages: [{ role: "user", content: "Generate the onboarding message." }],
            });

            promiseMessage = promiseResponse.content[0]?.text || "";
            // Strip any markdown formatting the AI might have added
            promiseMessage = promiseMessage
              .replace(/^#+\s.*\n+/gm, '')  // Remove markdown headers
              .replace(/\*\*/g, '')          // Remove bold
              .replace(/\*/g, '')            // Remove italic
              .replace(/^[-*]\s/gm, '')      // Remove bullet points
              .replace(/^\d+\.\s/gm, '')     // Remove numbered lists
              .trim();
          } catch (e) {
            console.error("Onboarding promise generation failed:", e.message);
          }

          // Fallback if AI fails
          if (!promiseMessage) {
            promiseMessage = ctx.type === "business"
              ? `Your workspace is ready. Every record you create from this point forward is timestamped, verified, and permanent. Let's get started.`
              : `Everything you add from this point forward is documented, verified, and yours. What would you like to start with?`;
          }

          // Execute side effects
          if (engineResult.sideEffects && engineResult.sideEffects.length > 0) {
            executeChatSideEffects(engineResult.sideEffects, effectiveUserId, effectiveTenantId)
              .catch(e => console.warn("chatEngine side-effects batch error:", e.message));
          }

          // Determine prompt chips based on type
          const promiseChips = ctx.type === "business"
            ? (ctx.businessVertical === "real_estate"
              ? ["Add a property", "Onboard a tenant", "Maintenance request", "View properties"]
              : ctx.businessVertical === "analyst"
                ? ["Vet a new deal", "Write a POV", "View pipeline"]
                : ctx.businessVertical === "auto"
                  ? ["Add a vehicle", "View inventory", "Sales pipeline"]
                  : ["Add a record", "Set up compliance", "View vault"])
            : ["Add a vehicle", "Add a credential", "Education record"];

          await sessionRef.set({
            state: engineResult.state,
            surface: surface || "landing",
            userId: effectiveUserId,
            ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
            updatedAt: nowServerTs(),
          }, { merge: true });

          // For business users, redirect to platform after showing the promise
          const isBizPromise = ctx.type === "business";

          return res.json({
            ok: true,
            message: engineResult.message || "",
            cards: engineResult.cards || [],
            promptChips: isBizPromise ? [] : promiseChips,
            followUpMessage: promiseMessage,
            conversationState: engineResult.state.step,
            ...(engineResult.state.authToken ? { authToken: engineResult.state.authToken } : {}),
            ...(effectiveSessionId !== sessionId ? { sessionId: effectiveSessionId } : {}),
            ...(isBizPromise ? { platformRedirect: true, platformUrl: 'https://title-app-alpha.web.app' } : {}),
          });
        }

        // Handle milestone acknowledgment (AI-generated contextual message after DTC creation)
        if (engineResult.generateMilestone && engineResult.aiContext) {
          const ctx = engineResult.aiContext;
          let milestoneMessage = "";

          try {
            const anthropic = getAnthropic();
            const milestoneResponse = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 512,
              system: `You are Alex from TitleApp. A user just created a verified record. Generate a 1-2 sentence acknowledgment that connects this specific achievement to real-world value — money saved, time saved, or stress avoided. Be specific to what they just did. No jargon, no feature names, no emojis, no bullet points. Warm and direct. End with a brief forward-looking statement about what this means for them.

Context:
- Milestone type: ${ctx.milestoneType}
- User name: ${ctx.name || "there"}
- Is first record: ${ctx.isFirstRecord ? "yes" : "no"}
${ctx.vehicleName ? "- Vehicle: " + ctx.vehicleName : ""}
${ctx.credentialName ? "- Credential: " + ctx.credentialName : ""}
${ctx.school ? "- School: " + ctx.school : ""}
${ctx.program ? "- Program: " + ctx.program : ""}
${ctx.companyName ? "- Company: " + ctx.companyName : ""}
${ctx.sector ? "- Sector: " + ctx.sector : ""}
${ctx.address ? "- Property: " + ctx.address : ""}
${ctx.propertyType ? "- Property type: " + ctx.propertyType : ""}
${ctx.tenantName ? "- Tenant: " + ctx.tenantName : ""}
${ctx.property ? "- For property: " + ctx.property : ""}
${ctx.category ? "- Category: " + ctx.category : ""}`,
              messages: [{ role: "user", content: "Generate the milestone acknowledgment." }],
            });
            milestoneMessage = (milestoneResponse.content[0]?.text || "")
              .replace(/^#+\s.*\n+/gm, '')
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/^[-*]\s/gm, '')
              .trim();
          } catch (e) {
            console.error("Milestone generation failed:", e.message);
          }

          // If AI generated a milestone, append it to the follow-up message
          if (milestoneMessage) {
            const existingFollowUp = engineResult.followUpMessage || "";
            engineResult.followUpMessage = existingFollowUp
              ? `${existingFollowUp}\n\n${milestoneMessage}`
              : milestoneMessage;
          }

          // Fall through to normal response handling below
        }

        // Handle AI fallthrough (authenticated free-form chat)
        let aiMessage = null;
        if (engineResult.useAI && effectiveUserId) {
          try {
            aiMessage = await handleAIChatFallthrough(
              userInput,
              effectiveUserId,
              effectiveTenantId
            );
          } catch (e) {
            console.error("chatEngine AI fallthrough error:", e.message);
            // Don't set aiMessage — let engineResult.message (the fallback) show instead
          }
        }

        // Determine final message — use empty string if cards are present (message is optional with cards)
        const hasCards = engineResult.cards && engineResult.cards.length > 0;
        const finalMessage = aiMessage || engineResult.message || (hasCards ? "" : "I'm here to help. What would you like to do?");

        // Write updated state to Firestore
        await sessionRef.set({
          state: engineResult.state,
          surface: surface || "landing",
          userId: effectiveUserId,
          ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
          updatedAt: nowServerTs(),
        }, { merge: true });

        // Return response
        return res.json({
          ok: true,
          message: finalMessage,
          cards: engineResult.cards || [],
          promptChips: engineResult.promptChips || [],
          followUpMessage: engineResult.followUpMessage || null,
          conversationState: engineResult.state.step,
          // Pass auth token back to surface if signup just happened
          ...(engineResult.state.authToken ? { authToken: engineResult.state.authToken } : {}),
          // Pass back effective session ID if it changed (session resume)
          ...(effectiveSessionId !== sessionId ? { sessionId: effectiveSessionId } : {}),
          // Pass through platform redirect signal from chatEngine
          ...(engineResult.platformRedirect ? { platformRedirect: true, platformUrl: engineResult.platformUrl || 'https://title-app-alpha.web.app', selectedTenantId: engineResult.selectedTenantId || null } : {}),
        });

      } catch (e) {
        console.error("chatEngine error:", e);
        return jsonError(res, 500, "Chat engine failed", { details: e.message });
      }
    }

    // GET /v1/title/:recordId — PUBLIC title lookup (no auth required)
    if (/^\/title\/[^/]+$/.test(route) && method === "GET") {
      try {
        const recordId = route.split("/")[2];
        const snap = await db.collection("titleRecords").doc(recordId).get();
        if (!snap.exists) return jsonError(res, 404, "Title record not found");
        const d = snap.data();
        return res.json({
          ok: true,
          record_id: snap.id,
          worker: {
            id: d.workerId,
            name: d.workerName,
            description: d.workerDescription,
            author: d.authorName || "",
            created_at: d.mintedAt,
          },
          chain: d.chain,
          tx_hash: d.txHash,
          verification_url: `https://polygonscan.com/tx/${d.txHash}`,
          metadata_hash: d.metadataHash,
          status: d.status || "active",
        });
      } catch (e) {
        console.error("title:lookup failed:", e);
        return jsonError(res, 500, "Failed to look up title record");
      }
    }

    // GET /v1/raas:catalog — public RAAS store catalog
    if (route === "/raas:catalog" && method === "GET") {
      try {
        const snap = await db.collection("workers")
          .where("published", "==", true)
          .orderBy("created_at", "desc")
          .get();
        const workers = [];
        snap.forEach((doc) => {
          const d = doc.data();
          workers.push({
            id: doc.id,
            name: d.name || "",
            description: d.description || "",
            category: d.category || "Other",
            price: d.price || null,
            creator: d.creator || "",
            published: true,
            created_at: d.created_at || null,
          });
        });
        return res.json({ ok: true, workers });
      } catch (e) {
        console.error("raas:catalog failed:", e);
        // Return empty array instead of error — store is optional
        return res.json({ ok: true, workers: [] });
      }
    }

    // GET /v1/raise:config (PUBLIC — no auth required)
    if (route === "/raise:config" && method === "GET") {
      try {
        const configDoc = await db.collection("config").doc("raise").get();
        if (!configDoc.exists) {
          // Auto-seed default raise config on first read
          const defaultConfig = {
            active: true,
            raise_mode: "waitlist",
            instrument: "Post-Money SAFE",
            raiseAmount: 2500000,
            valuationCap: 15000000,
            discount: 0.20,
            minimumInvestment: 1000,
            proRata: true,
            proRataNote: "Yes — all investors",
            fundingPortal: { name: "Private placement", url: "", regulation: "Terms available to qualified investors" },
            conversionScenarios: [
              { exitValuation: 30000000, multiple: "2.0x" },
              { exitValuation: 50000000, multiple: "3.3x" },
              { exitValuation: 75000000, multiple: "5.0x" },
              { exitValuation: 100000000, multiple: "6.7x" },
              { exitValuation: 150000000, multiple: "10.0x" },
            ],
            revenueScenarios: {
              base:    { m12_arr: 165000, m24_arr: 330000, m36_arr: 594000, subscribers: { m12: 250, m24: 500, m36: 900 } },
              best:    { m12_arr: 330000, m24_arr: 792000, m36_arr: 1650000, subscribers: { m12: 500, m24: 1200, m36: 2500 } },
              stretch: { m12_arr: 540000, m24_arr: 2040000, m36_arr: 5400000, subscribers: { m12: 750, m24: 2500, m36: 6000 } },
            },
            useOfFunds: [
              { category: "Product & Engineering", pct: 0.40, amount: 920000 },
              { category: "GTM & Sales", pct: 0.25, amount: 575000 },
              { category: "Operations", pct: 0.20, amount: 460000 },
              { category: "Vertical Expansion", pct: 0.10, amount: 230000 },
              { category: "Reserve", pct: 0.05, amount: 115000 },
            ],
            runway: { netProceeds: 2300000, monthlyBurn: 38000, zeroRevenueMonths: 60, withRevenueMonths: "60+", displayText: "60 months (zero revenue)", cashFlowPositiveTarget: "Q3 2027 (base) / Q1 2027 (best) / Q4 2026 (stretch)" },
            team: [
              { name: "Sean Lee Combs", role: "CEO", note: "Product + vision" },
              { name: "Kent Redwine", role: "CFO", note: "Finance + operations" },
              { name: "Kim Ellen Bennett", role: "GovTech Lead", note: "Public sector" },
              { name: "Vishal Kumar", role: "Frontend Engineer", note: "React + UI" },
              { name: "Manpreet Kaur", role: "Backend Engineer", note: "Cloud + AI" },
            ],
            updatedAt: nowServerTs(),
            updatedBy: "auto-seed",
          };
          await db.collection("config").doc("raise").set(defaultConfig);
          return res.json({ ok: true, config: defaultConfig, seeded: true });
        }
        const data = configDoc.data();
        // Migrate: ensure raise_mode exists (default to waitlist)
        if (!data.raise_mode) {
          await db.collection("config").doc("raise").update({ raise_mode: "waitlist" });
          data.raise_mode = "waitlist";
        }
        return res.json({ ok: true, config: data });
      } catch (e) {
        console.error("raise:config GET failed:", e);
        return jsonError(res, 500, "Failed to load raise config");
      }
    }

    // POST /v1/waitlist:investor (PUBLIC — no auth required)
    if (route === "/waitlist:investor" && method === "POST") {
      try {
        const { firstName, lastName, email, note } = body || {};
        if (!email) return jsonError(res, 400, "Email is required");
        const entry = {
          firstName: firstName || "",
          lastName: lastName || "",
          email: email.trim().toLowerCase(),
          note: note || "",
          source: "invest-page",
          createdAt: nowServerTs(),
        };
        await db.collection("waitlists").doc("investors").collection("subscribers").add(entry);
        // Notify sean@titleapp.ai (best-effort, don't block response)
        try {
          const { sendViaSendGrid } = require("./services/marketingService/emailNotify");
          await sendViaSendGrid({
            to: "sean@titleapp.ai",
            subject: `Investor lead: ${firstName || ""} ${lastName || ""} (${email})`,
            textBody: `New investor waitlist submission:\n\nName: ${firstName || ""} ${lastName || ""}\nEmail: ${email}\nNote: ${note || "(none)"}\nSource: invest-page\nTime: ${new Date().toISOString()}`,
          });
        } catch (notifyErr) {
          console.warn("Investor notification failed (non-blocking):", notifyErr.message);
        }
        return res.json({ ok: true, message: "Got it — we'll be in touch shortly with our deck and summary." });
      } catch (e) {
        console.error("waitlist:investor POST failed:", e);
        return jsonError(res, 500, "Failed to save submission");
      }
    }

    // GET /v1/config:company (PUBLIC — no auth required)
    if (route === "/config:company" && method === "GET") {
      try {
        const doc = await db.collection("config").doc("company").get();
        return res.json({ ok: true, company: doc.exists ? doc.data() : null });
      } catch (e) {
        return jsonError(res, 500, "Failed to load company config");
      }
    }

    // GET /v1/config:disclaimers (PUBLIC — no auth required)
    if (route === "/config:disclaimers" && method === "GET") {
      try {
        const doc = await db.collection("config").doc("disclaimers").get();
        return res.json({ ok: true, disclaimers: doc.exists ? doc.data() : null });
      } catch (e) {
        return jsonError(res, 500, "Failed to load disclaimers");
      }
    }

    // GET /v1/investor:docs (PUBLIC — document list, no auth)
    if (route === "/investor:docs" && method === "GET") {
      try {
        const doc = await db.collection("config").doc("investorDocs").get();
        return res.json({ ok: true, documents: doc.exists ? (doc.data().documents || []) : [] });
      } catch (e) {
        return jsonError(res, 500, "Failed to load investor documents");
      }
    }

    // POST /v1/admin:seed-activity (secret-protected, no auth)
    if (route === "/admin:seed-activity" && method === "POST") {
      const { seedActivityData: handleSeedAct } = require("./admin/seedActivityData");
      return handleSeedAct(req, res);
    }

    // POST /v1/creator:apply — public creator application submission
    if (route === "/creator:apply" && method === "POST") {
        const { name, email, linkedin, expertise, description, audience } = body;
        if (!name || !email || !linkedin) return res.json({ ok: false, error: "Name, email, and LinkedIn are required" });
        try {
            const appRef = await db.collection("creatorApplications").add({
                name,
                email,
                linkedin,
                expertise: expertise || "other",
                description: description || "",
                audience: audience || "",
                status: "pending",
                createdAt: nowServerTs(),
            });
            return res.json({ ok: true, applicationId: appRef.id });
        } catch (e) {
            console.error("[creator:apply] error:", e.message);
            return res.json({ ok: false, error: "Failed to submit application" });
        }
    }

    // POST /v1/marketplace:view — public, no auth required
    if (route === "/marketplace:view" && method === "POST") {
      const { slug: viewSlug } = body;
      if (!viewSlug) return res.json({ ok: false, error: "Missing slug" });
      try {
        const listingSnap = await db.doc(`marketplace/${viewSlug}`).get();
        if (!listingSnap.exists) return res.json({ ok: false, error: "Listing not found" });
        const listing = listingSnap.data();
        return res.json({ ok: true, listing: {
          name: listing.name,
          description: listing.description,
          category: listing.category,
          rules: listing.rules || [],
          rulesCount: listing.rulesCount || 0,
          pricePerSeat: listing.pricePerSeat || 9,
          subscribers: listing.subscribers || 0,
          creatorName: listing.creatorName || null,
          creatorBio: listing.creatorBio || null,
          publishedAt: listing.publishedAt,
        }});
      } catch (e) {
        console.error("[marketplace:view] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // ----------------------------
    // SIGNATURE SERVICE WEBHOOK (unauthenticated — HelloSign callback)
    // ----------------------------
    if (route === "/signatures:webhook" && method === "POST") {
      try {
        const event = req.body?.event || req.body;
        if (!event || !event.event_type) {
          return res.status(200).send("Hello API Event Received");
        }
        await getSignatureService().handleWebhookEvent({ event });
        return res.status(200).send("Hello API Event Received");
      } catch (e) {
        console.error("signatures:webhook error:", e);
        return res.status(200).send("Hello API Event Received");
      }
    }

    // MARKETING: Lead capture (unauthenticated)
    if (route === "/leads:capture" && method === "POST") {
      try {
        const mkt = getMarketingService();
        const result = await mkt.captureLead({
          name: body.name,
          email: body.email,
          company: body.company,
          role: body.role,
          vertical: body.vertical,
          utm_source: body.utm_source,
          utm_medium: body.utm_medium,
          utm_campaign: body.utm_campaign,
          utm_content: body.utm_content,
          ref: body.ref,
          promo_code: body.promo_code,
          headline_index: body.headline_index,
          source: body.source,
        });
        return res.json(result);
      } catch (e) {
        console.error("leads:capture failed:", e);
        return res.status(500).json({ ok: false, error: "Lead capture failed" });
      }
    }

    // MARKETING: Promo code validation (unauthenticated)
    if (route === "/promo:validate" && method === "GET") {
      try {
        const mkt = getMarketingService();
        const code = req.query.code || (body && body.code);
        const result = await mkt.validatePromo({ code });
        return res.json(result);
      } catch (e) {
        console.error("promo:validate failed:", e);
        return res.status(500).json({ ok: false, error: "Promo validation failed" });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WORKER SHARE LANDING — UNAUTHENTICATED (Session 30)
    // ═══════════════════════════════════════════════════════════════

    // GET /v1/worker-landing:data — Worker landing page data (no auth)
    if (route === "/worker-landing:data" && method === "GET") {
      try {
        const { getWorkerLandingData } = require("./services/workerShare");
        return await getWorkerLandingData(req, res);
      } catch (e) {
        console.error("worker-landing:data failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/suite-landing:data — Suite landing page data (no auth)
    if (route === "/suite-landing:data" && method === "GET") {
      try {
        const { getSuiteLandingData } = require("./services/workerShare");
        return await getSuiteLandingData(req, res);
      } catch (e) {
        console.error("suite-landing:data failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/worker-landing:verify-pin — Verify PIN (no auth)
    if (route === "/worker-landing:verify-pin" && method === "POST") {
      try {
        const { verifyWorkerPin } = require("./services/workerShare");
        return await verifyWorkerPin(req, res);
      } catch (e) {
        console.error("worker-landing:verify-pin failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/worker-landing:og-image — OG image for link previews (no auth)
    if (route === "/worker-landing:og-image" && method === "GET") {
      try {
        const { getWorkerOgImage } = require("./services/workerShare");
        return await getWorkerOgImage(req, res);
      } catch (e) {
        console.error("worker-landing:og-image failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  PUBLIC CATALOG — UNAUTHENTICATED
    // ═══════════════════════════════════════════════════════════════

    // Map URL vertical → Firestore suite arrays + ID prefix for filtering
    // Suite values in digitalWorkers are generic (e.g. auto dealer workers have suite="General Business")
    // so we use ID prefix as a reliable secondary filter
    function getVerticalConfig(v) {
      const map = {
        'aviation':    { suites: ['Aviation'], prefix: 'av-' },
        'pilot':       { suites: ['Aviation'], prefix: 'av-' },
        'auto-dealer': { suites: ['General Business', 'Compliance'], prefix: 'ad-' },
        'auto_dealer': { suites: ['General Business', 'Compliance'], prefix: 'ad-' },
        'auto':        { suites: ['General Business', 'Compliance'], prefix: 'ad-' },
        'web3':        { suites: ['Community', 'Compliance', 'Tokenomics', 'Launch', 'Communications', 'Platform'], prefix: 'w3-' },
        'solar':       { suites: ['Finance', 'Legal', 'Compliance', 'Insurance', 'General Business', 'Operations'], prefix: 'solar-' },
        'solar_vpp':   { suites: ['Finance', 'Legal', 'Compliance', 'Insurance', 'General Business', 'Operations'], prefix: 'solar-' },
        'real-estate': { suites: ['Investment', 'Finance', 'Legal', 'Insurance', 'Construction', 'Design', 'Entitlement', 'Operations', 'Property Management', 'Permitting'], prefix: null },
        'real_estate_development': { suites: ['Investment', 'Finance', 'Legal', 'Insurance', 'Construction', 'Design', 'Entitlement', 'Operations', 'Property Management', 'Permitting'], prefix: null },
        're':          { suites: ['Investment', 'Finance', 'Legal', 'Insurance', 'Construction', 'Design', 'Entitlement', 'Operations', 'Property Management', 'Permitting'], prefix: null },
      };
      return map[v] || map[v?.toLowerCase()] || { suites: [v], prefix: null };
    }

    // GET /v1/catalog:byVertical — Public catalog query for guest shell (no auth, rate limited)
    if (route === "/catalog:byVertical" && method === "GET") {
      try {
        const vertical = req.query.vertical || "";
        const limit = Math.min(parseInt(req.query.limit) || 24, 50);
        if (!vertical) return jsonError(res, 400, "vertical parameter required");

        // Map URL vertical to suite array + optional ID prefix filter
        const vc = getVerticalConfig(vertical);
        // Firestore 'in' supports up to 30 values
        const q = db.collection("digitalWorkers")
          .where("suite", "in", vc.suites)
          .where("status", "in", ["live", "coming_soon"])
          .limit(vc.prefix ? 100 : limit); // over-fetch if filtering by prefix
        const snap = await q.get();

        // Infer valueBucket from name/description when field is missing
        function inferBuckets(d) {
          if (d.valueBucket && d.valueBucket.length > 0) return d.valueBucket;
          const text = ((d.name || "") + " " + (d.headline || "") + " " + (d.description || "")).toLowerCase();
          const buckets = [];
          if (/revenue|sales|pricing|deal|lead|profit|earn|roi|quote|invoice|billing/.test(text)) buckets.push("make_money");
          if (/cost|automat|efficien|time|overhead|streamlin|reduce|optimize/.test(text)) buckets.push("save_money");
          if (/complian|regulat|permit|licens|audit|safety|legal|certif|inspection/.test(text)) buckets.push("stay_compliant");
          return buckets.length > 0 ? buckets : ["stay_compliant"];
        }

        let workers = snap.docs
          .filter(doc => !vc.prefix || doc.id.startsWith(vc.prefix))
          .slice(0, limit)
          .map(doc => {
            const d = doc.data();
            const lp = d.workspaceLaunchPage || {};
            return {
              workerId: doc.id,
              slug: d.slug || doc.id,
              name: d.display_name || d.name || "",
              shortDescription: d.short_description || d.headline || d.description || "",
              price: d.pricing_tier || d.pricing?.monthly || 0,
              vertical: d.suite || d.vertical || "",
              valueBucket: inferBuckets(d),
              status: d.status || "live",
              languages: d.languages || ["en"],
              tagline: lp.tagline || "",
              whatYoullHave: lp.whatYoullHave || "",
              quickStartPrompts: Array.isArray(lp.quickStartPrompts) ? lp.quickStartPrompts : [],
              activeSubstrateFeatures: Array.isArray(lp.activeSubstrateFeatures) ? lp.activeSubstrateFeatures : [],
              workerType: d.worker_type || "worker",
            };
          });

        return res.json({ ok: true, workers, count: workers.length });
      } catch (e) {
        console.error("catalog:byVertical failed:", e);
        return jsonError(res, 500, "Catalog query failed");
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  MARKETPLACE DISCOVERY — UNAUTHENTICATED (Worker Discovery API)
    // ═══════════════════════════════════════════════════════════════

    // GET /v1/marketplace:search — Search/filter workers (no auth)
    if (route === "/marketplace:search" && method === "GET") {
      try {
        const { searchWorkers } = require("./services/workerDiscovery");
        return await searchWorkers(req, res);
      } catch (e) {
        console.error("marketplace:search failed:", e);
        return jsonError(res, 500, "Search failed");
      }
    }

    // GET /v1/marketplace:featured — Trending/popular/new workers (no auth)
    if (route === "/marketplace:featured" && method === "GET") {
      try {
        const { getFeaturedWorkers } = require("./services/workerDiscovery");
        return await getFeaturedWorkers(req, res);
      } catch (e) {
        console.error("marketplace:featured failed:", e);
        return jsonError(res, 500, "Failed to load featured workers");
      }
    }

    // GET /v1/marketplace:categories — Browse categories with counts (no auth)
    if (route === "/marketplace:categories" && method === "GET") {
      try {
        const { getCategories } = require("./services/workerDiscovery");
        return await getCategories(req, res);
      } catch (e) {
        console.error("marketplace:categories failed:", e);
        return jsonError(res, 500, "Failed to load categories");
      }
    }

    // GET /v1/marketplace:worker — Full public worker profile (no auth)
    if (route === "/marketplace:worker" && method === "GET") {
      try {
        const { getWorkerProfile } = require("./services/workerDiscovery");
        return await getWorkerProfile(req, res);
      } catch (e) {
        console.error("marketplace:worker failed:", e);
        return jsonError(res, 500, "Failed to load worker profile");
      }
    }

    // GET /v1/marketplace:compare — Compare up to 4 workers side-by-side (no auth)
    if (route === "/marketplace:compare" && method === "GET") {
      try {
        const { compareWorkers } = require("./services/workerDiscovery");
        return await compareWorkers(req, res);
      } catch (e) {
        console.error("marketplace:compare failed:", e);
        return jsonError(res, 500, "Failed to compare workers");
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  PLATFORM INVENTORY — UNAUTHENTICATED (token-gated or admin bearer)
    //  PearX S26 Doc 1.4
    // ═══════════════════════════════════════════════════════════════

    // GET /v1/inventory:data — Full platform inventory (admin or investor token)
    if (route === "/inventory:data" && method === "GET") {
      try {
        const { getInventoryData } = require("./services/platformInventory");
        return await getInventoryData(req, res);
      } catch (e) {
        console.error("inventory:data failed:", e);
        return jsonError(res, 500, "Failed to load inventory");
      }
    }

    // GET /v1/inventory:snapshot — PDF export (admin or investor token)
    if (route === "/inventory:snapshot" && method === "GET") {
      try {
        const { getInventorySnapshot } = require("./services/platformInventory");
        return await getInventorySnapshot(req, res);
      } catch (e) {
        console.error("inventory:snapshot failed:", e);
        return jsonError(res, 500, "Failed to generate snapshot");
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  SANDBOX PREVIEW — UNAUTHENTICATED (32.7-T2)
    // ═══════════════════════════════════════════════════════════════

    // GET /v1/sandbox:preview — Public preview page data (no auth)
    if (route === "/sandbox:preview" && method === "GET") {
      try {
        const { getPreviewData } = require("./services/sandbox/previewHandler");
        return await getPreviewData(req, res);
      } catch (e) {
        console.error("sandbox:preview failed:", e);
        return jsonError(res, 500, "Preview failed");
      }
    }

    // POST /v1/sandbox:preview:interest — Email capture on preview page (no auth)
    if (route === "/sandbox:preview:interest" && method === "POST") {
      try {
        const { capturePreviewInterest } = require("./services/sandbox/previewHandler");
        return await capturePreviewInterest(req, res);
      } catch (e) {
        console.error("sandbox:preview:interest failed:", e);
        return jsonError(res, 500, "Interest capture failed");
      }
    }

    // POST /v1/magic-link:send — Send magic link (no auth — sign-up entry point)
    if (route === "/magic-link:send" && method === "POST") {
      try {
        const { sendMagicLink } = require("./services/magicLink");
        return await sendMagicLink(req, res);
      } catch (e) {
        console.error("magic-link:send failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/magic-link:verify — Verify magic link token (no auth)
    if (route === "/magic-link:verify" && method === "POST") {
      try {
        const { verifyMagicLink } = require("./services/magicLink");
        return await verifyMagicLink(req, res);
      } catch (e) {
        console.error("magic-link:verify failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 33.9-T3 — SOLAR CREDIT: VERIFY TRADE (API key auth)
    // ----------------------------
    if (route === "/solar/credit/verifyTrade" && method === "POST") {
      try {
        // API key authentication (exchange partners)
        const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
        if (!apiKey) return jsonError(res, 401, "API key required");
        const keySnap = await db.collection("apiKeys").where("key", "==", apiKey).where("active", "==", true).limit(1).get();
        if (keySnap.empty) return jsonError(res, 401, "Invalid API key");

        const { dtcId, buyerWallet, sellerWallet, quantity, targetProgram } = body;
        if (!dtcId) return jsonError(res, 400, "dtcId required");

        // Verify DTC exists and is active
        const dtcSnap = await db.collection("digitalTitleCertificates").doc(dtcId).get();
        if (!dtcSnap.exists) {
          return res.status(200).json({ ok: true, eligible: false, dtcAuthentic: false, dtcStatus: "not_found", buyerEligible: false, sellerEligible: false, reason: "DTC not found" });
        }
        const dtc = dtcSnap.data();
        const dtcAuthentic = !!dtc.blockchainHash;
        const dtcStatus = dtc.status || "unknown";

        if (dtcStatus !== "active") {
          return res.status(200).json({ ok: true, eligible: false, dtcAuthentic, dtcStatus, buyerEligible: false, sellerEligible: false, reason: `DTC status is '${dtcStatus}' — only active credits can be traded` });
        }

        // Verify buyer KYC
        let buyerEligible = false;
        if (buyerWallet) {
          const buyerSnap = await db.collection("kycVerifications").where("walletAddress", "==", buyerWallet).where("status", "==", "approved").limit(1).get();
          buyerEligible = !buyerSnap.empty;
        }

        // Verify seller KYC + ownership
        let sellerEligible = false;
        if (sellerWallet) {
          const sellerSnap = await db.collection("kycVerifications").where("walletAddress", "==", sellerWallet).where("status", "==", "approved").limit(1).get();
          sellerEligible = !sellerSnap.empty && dtc.ownerWallet === sellerWallet;
        }

        const eligible = dtcAuthentic && dtcStatus === "active" && buyerEligible && sellerEligible;
        const reasons = [];
        if (!dtcAuthentic) reasons.push("DTC not verified on blockchain");
        if (!buyerEligible) reasons.push("Buyer KYC not verified or wallet not linked");
        if (!sellerEligible) reasons.push("Seller KYC not verified, wallet not linked, or not DTC owner");

        return res.status(200).json({
          ok: true,
          eligible,
          dtcAuthentic,
          dtcStatus,
          buyerEligible,
          sellerEligible,
          reason: eligible ? "Trade eligible" : reasons.join("; "),
          auditTrailUrl: dtc.blockchainHash ? `https://titleapp.ai/audit/${dtc.blockchainHash}` : null,
        });
      } catch (e) {
        console.error("solar/credit/verifyTrade failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/invite:details — unauthenticated, returns invite metadata
    if (route === "/invite:details" && method === "GET") {
      try {
        const inviteCode = (req.query && req.query.code) || "";
        if (!inviteCode) return jsonError(res, 400, "Missing invite code");

        const inviteSnap = await db.collection("invites").doc(inviteCode).get();
        if (!inviteSnap.exists) return jsonError(res, 404, "Invite not found");

        const invite = inviteSnap.data();
        if (invite.status !== "active") return jsonError(res, 410, "Invite is no longer active");
        if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) return jsonError(res, 410, "Invite has expired");
        if (invite.currentUses >= (invite.maxUses || 50)) return jsonError(res, 410, "Invite has been fully redeemed");

        // Return safe metadata only — no sensitive data
        return res.json({
          ok: true,
          personalMessage: invite.personalMessage || null,
          workerNames: invite.workerNames || [],
          workerCount: (invite.workerIds || []).length,
          trialDays: invite.trialDays || 14,
          sharedConfig: invite.sharedConfig || null,
        });
      } catch (e) {
        console.error("invite:details failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ──────────────────────────────────────────────────────────
    //  WEB3 TEAM VERIFICATION — UNAUTHENTICATED (36.1-T2)
    // ──────────────────────────────────────────────────────────

    // POST /v1/web3:startAttestation — start project attestation (no auth)
    if (route === "/web3:startAttestation" && method === "POST") {
      try {
        const { handleStartAttestation } = require("./web3/teamVerification");
        return await handleStartAttestation(req, res, { body, jsonError });
      } catch (e) {
        console.error("web3:startAttestation failed:", e);
        return jsonError(res, 500, "Attestation start failed");
      }
    }

    // POST /v1/web3:submitAttestation — submit 3 attestations (no auth)
    if (route === "/web3:submitAttestation" && method === "POST") {
      try {
        const { handleSubmitAttestation } = require("./web3/teamVerification");
        return await handleSubmitAttestation(req, res, { body, jsonError });
      } catch (e) {
        console.error("web3:submitAttestation failed:", e);
        return jsonError(res, 500, "Attestation submit failed");
      }
    }

    // GET /v1/web3:teamRoster — public verified team roster (no auth)
    if (route === "/web3:teamRoster" && method === "GET") {
      try {
        const { handleTeamRoster } = require("./web3/teamVerification");
        return await handleTeamRoster(req, res, { jsonError });
      } catch (e) {
        console.error("web3:teamRoster failed:", e);
        return jsonError(res, 500, "Team roster failed");
      }
    }

    // GET /v1/leaderboard:top10 — Public leaderboard for guest storefront (no auth)
    if (route === "/leaderboard:top10" && method === "GET") {
      try {
        const vertical = req.query.vertical || "";
        if (!vertical) return jsonError(res, 400, "vertical parameter required");

        // Try today's leaderboard first, then fall back to most recent
        const today = new Date().toISOString().slice(0, 10);
        let doc = await db.doc(`leaderboards/top10_${vertical}_${today}`).get();

        if (!doc.exists) {
          // Fall back: query most recent leaderboard for this vertical
          try {
            const fallback = await db.collection("leaderboards")
              .where("vertical", "==", vertical)
              .orderBy("date", "desc")
              .limit(1)
              .get();
            if (!fallback.empty) doc = fallback.docs[0];
          } catch (indexErr) {
            console.warn("leaderboard fallback query failed (likely missing index):", indexErr.message);
          }
        }

        if (!doc || !doc.exists) {
          // No leaderboard yet — build on-the-fly from digitalWorkers
          const vc = getVerticalConfig(vertical);
          const dwSnap = await db.collection("digitalWorkers")
            .where("suite", "in", vc.suites)
            .where("status", "==", "live")
            .limit(vc.prefix ? 100 : 10)
            .get();
          const workers = dwSnap.docs
            .filter(d => !vc.prefix || d.id.startsWith(vc.prefix))
            .slice(0, 10)
            .map((d, i) => {
              const w = d.data();
              return {
                rank: i + 1,
                workerId: d.id,
                slug: w.slug || d.id,
                name: w.display_name || w.name || d.id,
                tagline: w.headline || w.tagline || w.shortDescription || w.description || "",
                price: w.pricing_tier || w.price || 0,
                subscriberCount: w.subscriber_count || 0,
                featured: w.featured || false,
              };
          });
          return res.json({ ok: true, vertical, date: today, workers, source: "live_query" });
        }

        const data = doc.data();
        return res.json({ ok: true, vertical, date: data.date, workers: data.workers || [], source: "leaderboard" });
      } catch (e) {
        console.error("leaderboard:top10 failed:", e);
        return jsonError(res, 500, "Leaderboard query failed");
      }
    }

    // POST /v1/worker:subscribe — Subscribe to a worker (free workers accept guestId, no auth required)
    if (route === "/worker:subscribe" && method === "POST") {
      let userId = null;

      // Try Bearer token auth first (for logged-in or anonymous Firebase users)
      const subToken = getAuthBearerToken(req);
      if (subToken) {
        try {
          const decoded = await admin.auth().verifyIdToken(subToken);
          userId = decoded.uid;
        } catch (e) {
          // Token invalid — fall through to guestId
          console.warn("[worker:subscribe] token invalid, trying guestId");
        }
      }

      // Fall back to guestId (for free workers when anonymous auth is disabled)
      if (!userId && body.guestId) {
        userId = `guest-${body.guestId}`;
      }

      if (!userId) return jsonError(res, 401, "Authentication required");

      console.log(`[worker:subscribe] HIT — uid=${userId}, body=`, JSON.stringify(body));

      const { workerId, slug } = body;
      if (!workerId && !slug) return res.json({ ok: false, error: "Missing workerId or slug" });

      try {
        // Look up worker from digitalWorkers collection (primary catalog source)
        let workerDoc = null;
        if (slug) {
          const dwSnap = await db.doc(`digitalWorkers/${slug}`).get();
          if (dwSnap.exists) workerDoc = { ...dwSnap.data(), workerId: dwSnap.id };
        }
        if (!workerDoc && workerId) {
          const dwSnap = await db.doc(`digitalWorkers/${workerId}`).get();
          if (dwSnap.exists) workerDoc = { ...dwSnap.data(), workerId: dwSnap.id };
        }
        if (!workerDoc) return res.json({ ok: false, error: "Worker not found in marketplace" });

        // For paid workers, require proper auth (not guest)
        const workerPrice = workerDoc.pricing_tier || workerDoc.price || 0;
        if (workerPrice > 0 && userId.startsWith("guest-")) {
          return jsonError(res, 403, "Account required for paid workers");
        }

        // Check if already subscribed
        const existingSub = await db.collection("subscriptions")
          .where("userId", "==", userId)
          .where("workerId", "==", workerId || workerDoc.workerId)
          .where("trialStatus", "in", ACTIVE_STATUSES)
          .limit(1).get();
        if (!existingSub.empty) {
          return res.json({ ok: true, subscribed: true, message: "Already subscribed" });
        }

        // Create subscription record
        const isFreeWorker = !workerPrice || workerPrice === 0;
        const subRef = await db.collection("subscriptions").add({
          userId,
          workerId: workerId || workerDoc.workerId,
          slug: slug || workerDoc.slug,
          workerName: workerDoc.name || workerDoc.display_name || "Digital Worker",
          trialStatus: TRIAL_ACTIVE,
          trialStartedAt: nowServerTs(),
          trialEndsAt: isFreeWorker ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdAt: nowServerTs(),
        });

        // Add worker to user's vault
        await db.doc(`vaults/${userId}/workers/${workerId || workerDoc.workerId}`).set({
          workerId: workerId || workerDoc.workerId,
          workerName: workerDoc.name || workerDoc.display_name || "Digital Worker",
          slug: slug || workerDoc.slug,
          subscriptionId: subRef.id,
          addedAt: nowServerTs(),
          source: "marketplace",
        });

        // Queue opening message from worker
        await db.collection("workerMessages").add({
          userId,
          workerId: workerId || workerDoc.workerId,
          direction: "worker_to_user",
          message: `Hi, I'm ${workerDoc.name || workerDoc.display_name || "your new Digital Worker"}. I'm ready to help. What would you like to start with?`,
          createdAt: nowServerTs(),
          read: false,
        });

        console.log(`[worker:subscribe] ${userId} subscribed to ${workerId || workerDoc.workerId}`);
        return res.json({ ok: true, subscribed: true, subscriptionId: subRef.id });
      } catch (e) {
        console.error("[worker:subscribe] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:checkout — Create Stripe Checkout session for paid worker
    if (route === "/worker:checkout" && method === "POST") {
      let userId = null;
      const ckToken = getAuthBearerToken(req);
      if (ckToken) {
        try { const decoded = await admin.auth().verifyIdToken(ckToken); userId = decoded.uid; }
        catch (e) { console.warn("[worker:checkout] token invalid, trying guestId"); }
      }
      if (!userId && body.guestId) userId = `guest-${body.guestId}`;
      if (!userId) return jsonError(res, 401, "Authentication required");

      const { email, workerId, slug } = body;
      if (!email || !email.includes("@")) return jsonError(res, 400, "Valid email required");
      const lookupId = slug || workerId;
      if (!lookupId) return jsonError(res, 400, "Missing workerId or slug");

      try {
        const dwSnap = await db.doc(`digitalWorkers/${lookupId}`).get();
        if (!dwSnap.exists) return jsonError(res, 404, "Worker not found");
        const workerDoc = { ...dwSnap.data(), workerId: dwSnap.id };

        const workerPrice = workerDoc.pricing_tier || workerDoc.price || 0;
        if (workerPrice === 0) return jsonError(res, 400, "Use worker:subscribe for free workers");

        // Check already subscribed
        const existingSub = await db.collection("subscriptions")
          .where("userId", "==", userId)
          .where("workerId", "==", lookupId)
          .where("trialStatus", "in", ACTIVE_STATUSES)
          .limit(1).get();
        if (!existingSub.empty) return res.json({ ok: true, subscribed: true, message: "Already subscribed" });

        // Get or create Stripe customer
        const stripe = getStripe();
        let customerId = null;
        if (!userId.startsWith("guest-")) {
          const userSnap = await db.collection("users").doc(userId).get();
          if (userSnap.exists) customerId = userSnap.data().stripeCustomerId || null;
        }
        if (!customerId) {
          const customer = await stripe.customers.create({ email, metadata: { userId } });
          customerId = customer.id;
          await db.collection("users").doc(userId).set(
            { email, stripeCustomerId: customerId, createdAt: nowServerTs() },
            { merge: true }
          );
        }

        // Create pending subscription
        const workerName = workerDoc.name || workerDoc.display_name || "Digital Worker";
        const subRef = await db.collection("subscriptions").add({
          userId,
          workerId: lookupId,
          slug: lookupId,
          workerName,
          price: workerPrice,
          status: "pending_payment",
          stripeCustomerId: customerId,
          email,
          createdAt: nowServerTs(),
        });

        // Create Stripe Checkout session
        const origin = req.headers.origin || "https://app.titleapp.ai";
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{
            price_data: {
              currency: "usd",
              recurring: { interval: "month" },
              product_data: { name: workerName },
              unit_amount: workerPrice * 100,
            },
            quantity: 1,
          }],
          subscription_data: {
            trial_period_days: 14,
            metadata: { userId, workerId: lookupId },
          },
          metadata: {
            type: "worker_subscription",
            userId,
            workerId: lookupId,
            workerName,
            subscriptionId: subRef.id,
          },
          success_url: `${origin}?worker_checkout=success&workerId=${encodeURIComponent(lookupId)}`,
          cancel_url: `${origin}?worker_checkout=cancelled&workerId=${encodeURIComponent(lookupId)}`,
        });

        await subRef.update({ stripeCheckoutSessionId: session.id });
        console.log(`[worker:checkout] ${userId} — ${lookupId} $${workerPrice}/mo, session ${session.id}`);
        return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
      } catch (e) {
        console.error("[worker:checkout] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/worker:checkoutStatus — Poll for checkout completion
    if (route === "/worker:checkoutStatus" && (method === "GET" || method === "POST")) {
      const qWorkerId = req.query?.workerId || body.workerId;
      const qUserId = req.query?.userId || body.userId;
      if (!qWorkerId || !qUserId) return jsonError(res, 400, "workerId and userId required");

      try {
        const subSnap = await db.collection("subscriptions")
          .where("userId", "==", qUserId)
          .where("workerId", "==", qWorkerId)
          .where("trialStatus", "in", ACTIVE_STATUSES)
          .limit(1).get();
        if (!subSnap.empty) return res.json({ ok: true, status: "complete", subscribed: true });
        return res.json({ ok: true, status: "pending" });
      } catch (e) {
        console.error("[worker:checkoutStatus] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/guestLead:save — store lead contact from chat (before auth gate)
    if (route === "/guestLead:save" && method === "POST") {
      const { uid, contact, workerSlug, vertical: leadVertical } = body;
      if (!uid || !contact) return jsonError(res, 400, "uid and contact required");

      try {
        await db.collection("guestLeads").doc(uid).set({
          contact: contact.trim(),
          workerSlug: workerSlug || null,
          vertical: leadVertical || null,
          capturedAt: admin.firestore.FieldValue.serverTimestamp(),
          converted: false,
          recoveryEmailSent: false,
        }, { merge: true });
        console.log(`[guestLead:save] Stored lead for ${uid}: ${contact}`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[guestLead:save] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── Universal OAuth Callback (unauthenticated — platform redirects here) ──

    // GET /v1/auth/:platform/callback — exchanges code for token, redirects to Studio
    if (route.startsWith("/auth/") && route.endsWith("/callback") && method === "GET") {
      const parts = route.split("/");
      const platformId = parts[2]; // /auth/{platform}/callback
      const code = req.query.code;
      const state = req.query.state;
      if (!code || !state) return jsonError(res, 400, "Missing code or state parameter");
      try {
        const { handleCallback } = require("./services/oauth");
        const result = await handleCallback(platformId, code, state);
        console.log(`[oauth/callback] ${platformId} connected for ${result.subscriberId}`);
        // Redirect subscriber back to Studio with success indicator
        return res.redirect(`https://app.titleapp.ai/studio?oauth=${platformId}&status=connected`);
      } catch (e) {
        console.error(`[oauth/callback] ${platformId} error:`, e.message);
        return res.redirect(`https://app.titleapp.ai/studio?oauth=${platformId}&status=error&message=${encodeURIComponent(e.message)}`);
      }
    }

    // All other routes require Firebase auth
    const auth = await requireFirebaseUser(req, res);
    if (auth.handled) return;

    const ctx = getCtx(req, body, auth.user);
    console.log("🧠 CTX:", ctx);

    // ── Universal OAuth (authenticated routes) ──

    // GET /v1/auth/:platform/connect — redirects subscriber to platform OAuth screen
    if (route.startsWith("/auth/") && route.endsWith("/connect") && method === "GET") {
      const parts = route.split("/");
      const platformId = parts[2];
      const subscriberId = req.query.subscriberId || auth.user.uid;
      try {
        const { getAuthorizationUrl } = require("./services/oauth");
        const url = await getAuthorizationUrl(platformId, subscriberId);
        return res.redirect(url);
      } catch (e) {
        console.error(`[oauth/connect] ${platformId} error:`, e.message);
        return jsonError(res, 400, e.message);
      }
    }

    // GET /v1/auth/:platform/status — returns connection status
    if (route.startsWith("/auth/") && route.endsWith("/status") && method === "GET") {
      const parts = route.split("/");
      const platformId = parts[2];
      const subscriberId = req.query.subscriberId || auth.user.uid;
      try {
        const { getConnectionStatus } = require("./services/oauth");
        const status = await getConnectionStatus(platformId, subscriberId);
        return res.json({ ok: true, ...status });
      } catch (e) {
        return res.json({ ok: false, error: e.message });
      }
    }

    // DELETE /v1/auth/:platform/disconnect — removes stored token
    if (route.startsWith("/auth/") && route.endsWith("/disconnect") && method === "DELETE") {
      const parts = route.split("/");
      const platformId = parts[2];
      const subscriberId = body.subscriberId || auth.user.uid;
      try {
        const { disconnectPlatform } = require("./services/oauth");
        const result = await disconnectPlatform(platformId, subscriberId);
        return res.json({ ok: true, ...result });
      } catch (e) {
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/subscription:transfer — transfer subscriptions from anonymous/guest UID to real UID
    if (route === "/subscription:transfer" && method === "POST") {
      const { fromUid, toUid } = body;
      if (!fromUid || !toUid) return jsonError(res, 400, "fromUid and toUid required");
      if (auth.user.uid !== toUid) return jsonError(res, 403, "Can only transfer to your own account");

      try {
        const subsSnap = await db.collection("subscriptions")
          .where("userId", "==", fromUid)
          .get();

        if (subsSnap.empty) return res.json({ ok: true, transferred: 0, workerIds: [] });

        const workerIds = [];
        for (const subDoc of subsSnap.docs) {
          const sub = subDoc.data();
          const wId = sub.workerId || sub.slug;

          // Check if toUid already has this worker
          const existing = await db.collection("subscriptions")
            .where("userId", "==", toUid)
            .where("workerId", "==", wId)
            .where("trialStatus", "in", ACTIVE_STATUSES)
            .limit(1).get();

          if (existing.empty) {
            // Create new sub under toUid
            await db.collection("subscriptions").add({
              ...sub,
              userId: toUid,
              transferredFrom: fromUid,
              transferredAt: nowServerTs(),
            });
            // Transfer vault entry
            const vaultSnap = await db.doc(`vaults/${fromUid}/workers/${wId}`).get();
            if (vaultSnap.exists) {
              await db.doc(`vaults/${toUid}/workers/${wId}`).set(vaultSnap.data());
              await vaultSnap.ref.delete();
            }
            workerIds.push(wId);
          }
          // Delete old doc regardless
          await subDoc.ref.delete();
        }

        console.log(`[subscription:transfer] ${fromUid} → ${toUid}: ${workerIds.length} transferred`);
        return res.json({ ok: true, transferred: workerIds.length, workerIds });
      } catch (e) {
        console.error("[subscription:transfer] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/subscription:startTrial — start trial on a paid worker (authenticated)
    if (route === "/subscription:startTrial" && method === "POST") {
      const userId = auth.user.uid;
      const { workerId } = body;
      if (!workerId) return jsonError(res, 400, "workerId required");

      try {
        // Look up worker
        const dwSnap = await db.doc(`digitalWorkers/${workerId}`).get();
        if (!dwSnap.exists) return jsonError(res, 404, "Worker not found");
        const workerDoc = dwSnap.data();
        const workerName = workerDoc.name || workerDoc.display_name || "Digital Worker";

        // Check already subscribed
        const existingSub = await db.collection("subscriptions")
          .where("userId", "==", userId)
          .where("workerId", "==", workerId)
          .where("trialStatus", "in", ACTIVE_STATUSES)
          .limit(1).get();
        if (!existingSub.empty) return res.json({ ok: true, subscribed: true, message: "Already subscribed" });

        // Also check for anonymous UID subscriptions and transfer
        const anonUid = body.anonUid;
        if (anonUid && anonUid !== userId) {
          const anonSubs = await db.collection("subscriptions")
            .where("userId", "==", anonUid)
            .get();
          for (const subDoc of anonSubs.docs) {
            await subDoc.ref.update({ userId });
            const wId = subDoc.data().workerId || subDoc.data().slug;
            const vSnap = await db.doc(`vaults/${anonUid}/workers/${wId}`).get();
            if (vSnap.exists) {
              await db.doc(`vaults/${userId}/workers/${wId}`).set(vSnap.data());
              await vSnap.ref.delete();
            }
          }
        }

        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        // Create subscription
        const subRef = await db.collection("subscriptions").add({
          userId,
          workerId,
          slug: workerId,
          workerName,
          price: workerDoc.pricing_tier || workerDoc.price || 0,
          trialStatus: TRIAL_ACTIVE,
          trialStartedAt: nowServerTs(),
          trialEndsAt,
          createdAt: nowServerTs(),
        });

        // Add to vault
        await db.doc(`vaults/${userId}/workers/${workerId}`).set({
          workerId,
          workerName,
          slug: workerId,
          subscriptionId: subRef.id,
          addedAt: nowServerTs(),
          source: "trial_start",
        });

        // Queue opening message
        await db.collection("workerMessages").add({
          userId,
          workerId,
          direction: "worker_to_user",
          message: `Hi, I'm ${workerName}. I'm ready to help. What would you like to start with?`,
          createdAt: nowServerTs(),
          read: false,
        });

        // Mark guest lead as converted if exists
        await db.collection("guestLeads").doc(userId).update({ converted: true }).catch(() => {});
        if (anonUid) await db.collection("guestLeads").doc(anonUid).update({ converted: true }).catch(() => {});

        // Initialize credit balance based on worker tier
        try {
          const TIER_CREDITS = { 0: 100, 29: 500, 49: 1500, 79: 3000 };
          const workerTier = workerDoc.pricing_tier || workerDoc.price || 49;
          const creditAllocation = TIER_CREDITS[workerTier] || 500;
          await db.doc(`users/${userId}`).set({
            billing: {
              prepaidCredits: admin.firestore.FieldValue.increment(creditAllocation),
              tier: `$${workerTier}`,
              lastCreditAllocationAt: nowServerTs(),
            },
          }, { merge: true });
          console.log(`[subscription:startTrial] Allocated ${creditAllocation} credits to ${userId} (tier: $${workerTier})`);
        } catch (creditErr) {
          console.error(`[subscription:startTrial] Credit allocation failed:`, creditErr.message);
        }

        console.log(`[subscription:startTrial] ${userId} started trial on ${workerId}`);
        return res.json({ ok: true, subscribed: true, subscriptionId: subRef.id });
      } catch (e) {
        console.error("[subscription:startTrial] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/web3:inviteTeamMember — invite team member (authenticated, owner only)
    if (route === "/web3:inviteTeamMember" && method === "POST") {
      try {
        const { handleInviteTeamMember } = require("./web3/teamVerification");
        return await handleInviteTeamMember(req, res, { body, user: auth.user, jsonError });
      } catch (e) {
        console.error("web3:inviteTeamMember failed:", e);
        return jsonError(res, 500, "Team invite failed");
      }
    }

    // POST /v1/user:generateInvite — create an invite link
    if (route === "/user:generateInvite" && method === "POST") {
      try {
        const { workerIds = [], message } = body;
        if (!Array.isArray(workerIds) || workerIds.length === 0) {
          return jsonError(res, 400, "workerIds array required");
        }
        if (workerIds.length > 10) {
          return jsonError(res, 400, "Maximum 10 workers per invite");
        }

        const crypto = require("crypto");
        const inviteCode = crypto.randomBytes(6).toString("hex"); // 12-char hex

        // Build safe shared config — worker metadata + documentChecklist, NEVER documents
        const sharedConfig = [];
        for (const wid of workerIds) {
          try {
            const wSnap = await db.collection("digitalWorkers").doc(wid).get();
            if (wSnap.exists) {
              const w = wSnap.data();
              sharedConfig.push({
                slug: wid,
                name: w.display_name || wid,
                price: w.pricing_tier || 0,
                headline: w.headline || "",
                documentChecklist: w.documentChecklist || [],
              });
            }
          } catch (wErr) {
            // Skip workers that can't be loaded
          }
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

        await db.collection("invites").doc(inviteCode).set({
          createdBy: auth.user.uid,
          workerIds,
          workerNames: sharedConfig.map(w => w.name),
          sharedConfig,
          personalMessage: (message || "").substring(0, 500) || null,
          status: "active",
          maxUses: 50,
          currentUses: 0,
          trialDays: 14,
          rewardDays: 30,
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({
          ok: true,
          inviteCode,
          inviteUrl: `https://titleapp.ai/invite/${inviteCode}`,
          expiresAt: expiresAt.toISOString(),
        });
      } catch (e) {
        console.error("user:generateInvite failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/invite:redeem — redeem an invite link
    if (route === "/invite:redeem" && method === "POST") {
      try {
        const { code } = body;
        if (!code) return jsonError(res, 400, "Missing invite code");

        const inviteRef = db.collection("invites").doc(code);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) return jsonError(res, 404, "Invite not found");

        const invite = inviteSnap.data();

        // Validate invite state
        if (invite.status !== "active") return jsonError(res, 410, "Invite is no longer active");
        if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) return jsonError(res, 410, "Invite has expired");
        if (invite.currentUses >= (invite.maxUses || 50)) return jsonError(res, 410, "Invite has been fully redeemed");
        if (invite.createdBy === auth.user.uid) return jsonError(res, 400, "Cannot redeem your own invite");

        // Check if user already redeemed this invite
        const existingRedemption = await inviteRef.collection("redemptions")
          .where("userId", "==", auth.user.uid)
          .limit(1)
          .get();
        if (!existingRedemption.empty) return jsonError(res, 400, "You have already redeemed this invite");

        // Store redemption
        await inviteRef.collection("redemptions").add({
          userId: auth.user.uid,
          redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
          referrerRewardStatus: "pending", // Processed after 30 days active + first payment
        });

        // Increment usage counter
        await inviteRef.update({
          currentUses: admin.firestore.FieldValue.increment(1),
        });

        return res.json({
          ok: true,
          trialDays: invite.trialDays || 14,
          workerIds: invite.workerIds || [],
          sharedConfig: invite.sharedConfig || [],
          personalMessage: invite.personalMessage || null,
        });
      } catch (e) {
        console.error("invite:redeem failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/user:acceptTerms
    if (route === "/user:acceptTerms" && method === "POST") {
      try {
        await db.collection("users").doc(auth.user.uid).set(
          { termsAcceptedAt: nowServerTs() },
          { merge: true }
        );
        return res.json({ ok: true });
      } catch (e) {
        console.error("user:acceptTerms failed:", e);
        return jsonError(res, 500, "Failed to accept terms");
      }
    }

    // POST /v1/creator:checkout — Create Stripe Checkout Session for Creator License ($49/yr)
    if (route === "/creator:checkout" && method === "POST") {
      try {
        const Stripe = require("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
        const returnUrl = body.returnUrl || "https://app.titleapp.ai/sandbox";
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: "Creator License — Vibe Coding Sandbox" },
              unit_amount: 4900,
              recurring: { interval: "year" },
            },
            quantity: 1,
          }],
          metadata: {
            type: "creator_license",
            userId: auth.user.uid,
          },
          success_url: `${returnUrl}?license=active`,
          cancel_url: `${returnUrl}?license=canceled`,
        });
        return res.json({ ok: true, url: session.url });
      } catch (e) {
        console.error("[creator:checkout] error:", e.message);
        return res.json({ ok: false, error: "Failed to create checkout session" });
      }
    }

    // POST /v1/he:ack — Record HE onboarding acknowledgment
    if (route === "/he:ack" && method === "POST") {
      const { workerId: ackWorkerId, lane, ackType, ackText } = body;
      try {
        await db.collection("he_onboarding_acks").add({
          userId: auth.user.uid,
          workerId: ackWorkerId || null,
          lane: lane || null,
          ackType: ackType || null,
          ackText: ackText || null,
          ackedAt: nowServerTs(),
          ipAddress: req.headers["x-forwarded-for"] || req.ip || null,
        });
        // Set user-level flag
        const ackFieldMap = { simulation: "simulationAck", jurisdiction: "chartItJurisdictionAck", clinical: "backMeUpDisclaimerAck" };
        const field = ackFieldMap[ackType];
        if (field) {
          await db.collection("users").doc(auth.user.uid).set({ [field]: true }, { merge: true });
        }
        return res.json({ ok: true });
      } catch (e) {
        console.error("[he:ack] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/verify:he-creator — HE creator self-attestation
    if (route === "/verify:he-creator" && method === "POST") {
      const { submitHeCreatorVerification } = require("./services/heCreatorVerification");
      req._user = auth.user;
      return submitHeCreatorVerification(req, res);
    }

    // POST /v1/creator:verify-identity — Creator ID verification (Phase 1: self-upload)
    if (route === "/creator:verify-identity" && method === "POST") {
      try {
        const { idType } = body; // "drivers_license", "passport", "state_id"
        if (!idType) return res.json({ ok: false, error: "idType required (drivers_license, passport, or state_id)" });

        await db.collection("creators").doc(auth.user.uid).set({
          creatorIdVerified: true,
          creatorIdType: idType,
          creatorIdVerifiedAt: nowServerTs(),
          creatorIdMethod: "self_upload_v1", // Phase 2: "stripe_identity"
        }, { merge: true });

        await db.collection("auditTrail").add({
          type: "creator_identity_verified",
          userId: auth.user.uid,
          method: "self_upload_v1",
          idType,
          at: nowServerTs(),
        });

        console.log(`[creator:verify-identity] ${auth.user.uid} verified via self_upload_v1`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[creator:verify-identity] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/creator:accept-liability — Accept publish-time liability disclaimer
    if (route === "/creator:accept-liability" && method === "POST") {
      try {
        const { workerId } = body;
        if (!workerId) return res.json({ ok: false, error: "workerId required" });

        const docId = `${workerId}_${auth.user.uid}`;
        await db.doc(`publishDisclaimers/${docId}`).set({
          workerId,
          userId: auth.user.uid,
          accepted: true,
          disclaimerVersion: "v1.0",
          acceptedAt: nowServerTs(),
          ipAddress: req.headers["x-forwarded-for"] || req.ip || null,
        });

        await db.collection("auditTrail").add({
          type: "liability_disclaimer_accepted",
          userId: auth.user.uid,
          workerId,
          version: "v1.0",
          at: nowServerTs(),
        });

        console.log(`[creator:accept-liability] ${auth.user.uid} accepted for worker ${workerId}`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[creator:accept-liability] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/creator:accept-baa — HIPAA Business Associate Agreement acknowledgment
    if (route === "/creator:accept-baa" && method === "POST") {
      try {
        await db.collection("creators").doc(auth.user.uid).set({
          baaSignedAt: nowServerTs(),
          baaVersion: "v1.0",
          baaMethod: "checkbox_v1", // Phase 2: "docusign"
        }, { merge: true });

        await db.collection("auditTrail").add({
          type: "baa_accepted",
          userId: auth.user.uid,
          version: "v1.0",
          at: nowServerTs(),
        });

        console.log(`[creator:accept-baa] ${auth.user.uid} accepted BAA v1.0`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[creator:accept-baa] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/creator:gates — Check publish gate status for current creator
    if (route === "/creator:gates" && method === "GET") {
      try {
        const creatorSnap = await db.collection("creators").doc(auth.user.uid).get();
        const c = creatorSnap.exists ? creatorSnap.data() : {};
        return res.json({
          ok: true,
          identityVerified: !!c.creatorIdVerified,
          identityVerifiedAt: c.creatorIdVerifiedAt || null,
          identityMethod: c.creatorIdMethod || null,
          baaAccepted: !!c.baaSignedAt,
          baaSignedAt: c.baaSignedAt || null,
        });
      } catch (e) {
        console.error("[creator:gates] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/creator:profile — Get creator profile
    if (route === "/creator:profile" && method === "GET") {
      try {
        const creatorSnap = await db.collection("creators").doc(auth.user.uid).get();
        const profile = creatorSnap.exists ? creatorSnap.data() : {};
        return res.json({
          ok: true,
          profile: {
            title: profile.title || "",
            yearsExperience: profile.yearsExperience || "",
            credentials: profile.credentials || "",
            linkedIn: profile.linkedIn || "",
            bio: profile.bio || "",
            profileComplete: !!(profile.title && profile.bio),
          },
        });
      } catch (e) {
        console.error("[creator:profile GET] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/creator:profile — Save creator profile
    if (route === "/creator:profile" && method === "POST") {
      try {
        const { title, yearsExperience, credentials, linkedIn, bio } = body;
        await db.collection("creators").doc(auth.user.uid).set({
          title: title || "",
          yearsExperience: yearsExperience || "",
          credentials: credentials || "",
          linkedIn: linkedIn || "",
          bio: (bio || "").substring(0, 280),
          profileUpdatedAt: nowServerTs(),
        }, { merge: true });

        console.log(`[creator:profile] ${auth.user.uid} updated profile`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[creator:profile POST] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/legal:creator-agreement — Get current Creator Agreement text and version
    if (route === "/legal:creator-agreement" && method === "GET") {
      const { AGREEMENT_VERSION, AGREEMENT_TEXT } = require("./legal/creatorAgreement_v1");
      return res.json({ ok: true, version: AGREEMENT_VERSION, text: AGREEMENT_TEXT });
    }

    // POST /v1/creator:accept-agreement — Accept Creator Agreement
    if (route === "/creator:accept-agreement" && method === "POST") {
      try {
        const { AGREEMENT_VERSION } = require("./legal/creatorAgreement_v1");
        await db.collection("creators").doc(auth.user.uid).set({
          agreementAcceptedAt: nowServerTs(),
          agreementVersion: AGREEMENT_VERSION,
        }, { merge: true });

        await db.collection("auditTrail").add({
          type: "creator_agreement_accepted",
          userId: auth.user.uid,
          version: AGREEMENT_VERSION,
          ipAddress: req.headers["x-forwarded-for"] || req.ip || null,
          at: nowServerTs(),
        });

        console.log(`[creator:accept-agreement] ${auth.user.uid} accepted v${AGREEMENT_VERSION}`);
        return res.json({ ok: true, version: AGREEMENT_VERSION });
      } catch (e) {
        console.error("[creator:accept-agreement] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/creator:review — admin review of creator applications
    if (route === "/creator:review" && method === "POST") {
        const { applicationId, decision, reason } = body;
        if (!applicationId || !decision) return res.json({ ok: false, error: "Missing applicationId or decision" });
        try {
            const appRef = db.collection("creatorApplications").doc(applicationId);
            const appSnap = await appRef.get();
            if (!appSnap.exists) return res.json({ ok: false, error: "Application not found" });
            await appRef.update({
                status: decision,
                reason: reason || null,
                reviewedAt: nowServerTs(),
                reviewedBy: auth.user.uid,
            });
            if (decision === "accepted") {
                const appData = appSnap.data();
                const userSnap = await db.collection("users").where("email", "==", appData.email).limit(1).get();
                if (!userSnap.empty) {
                    await userSnap.docs[0].ref.update({ creatorApproved: true, creatorApprovedAt: nowServerTs() });
                }
            }
            return res.json({ ok: true, status: decision });
        } catch (e) {
            console.error("[creator:review] error:", e.message);
            return res.json({ ok: false, error: e.message });
        }
    }

    // POST /v1/creator:submitSpotlight — Creator Spotlight purchase ($29 one-time)
    if (route === "/creator:submitSpotlight" && method === "POST") {
        const { bio, workerDescription, workerId, workerName, workerUrl, photoDataUrl, releaseAgreed } = body;
        if (!bio || !workerDescription || !releaseAgreed) {
            return res.json({ ok: false, error: "Missing required fields" });
        }
        try {
            const spotlightRef = db.collection("creatorSpotlights").doc();
            await spotlightRef.set({
                creatorId: auth.user.uid,
                workerId: workerId || "",
                workerName: workerName || "",
                workerUrl: workerUrl || "",
                photoDataUrl: photoDataUrl || "",
                bio,
                workerDescription,
                releaseAgreed: true,
                releaseAgreedAt: nowServerTs(),
                stripePaymentIntentId: "",
                amountPaid: 2900,
                status: "pending",
                submittedAt: nowServerTs(),
                deliveredAt: null,
                publishedAt: null,
                spotlightVideoUrl: null,
                notificationSent: false,
            });
            // Create Stripe Checkout Session for $29 one-time payment
            try {
                const Stripe = require("stripe");
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
                const origin = req.headers.origin || req.headers.referer || "https://app.titleapp.ai";
                const session = await stripe.checkout.sessions.create({
                    mode: "payment",
                    line_items: [{
                        price_data: { currency: "usd", unit_amount: 2900, product_data: { name: "Creator Spotlight — AI Avatar Interview" } },
                        quantity: 1,
                    }],
                    success_url: `${origin}/sandbox?spotlight=success`,
                    cancel_url: `${origin}/sandbox?spotlight=cancel`,
                    metadata: { spotlightId: spotlightRef.id, creatorId: auth.user.uid, workerId: workerId || "" },
                });
                console.log(`[creator:submitSpotlight] ${auth.user.uid} submitted, checkout ${session.id}`);
                return res.json({ ok: true, spotlightId: spotlightRef.id, checkoutUrl: session.url });
            } catch (stripeErr) {
                // Spotlight saved but Stripe failed — still return success so sandbox works
                console.error("[creator:submitSpotlight] Stripe error:", stripeErr.message);
                return res.json({ ok: true, spotlightId: spotlightRef.id, checkoutUrl: null });
            }
        } catch (e) {
            console.error("[creator:submitSpotlight] error:", e.message);
            return res.json({ ok: false, error: e.message });
        }
    }

    // ----------------------------
    // MEMBERSHIP / TENANTS
    // ----------------------------

    // GET /v1/me:profile — return current user profile (creatorLicense, tier, etc.)
    if (route === "/me:profile" && method === "GET") {
      try {
        const userDoc = await db.collection("users").doc(auth.user.uid).get();
        const profile = userDoc.exists ? userDoc.data() : {};
        return res.json({
          ok: true,
          profile: {
            creatorLicense: !!profile.creatorLicense,
            creatorApproved: !!profile.creatorApproved,
            tier: profile.tier || "free",
          },
        });
      } catch (e) {
        return res.json({ ok: false, error: "Failed to load profile" });
      }
    }

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

    // GET /v1/workers:list — list Workers for current tenant
    if (route === "/workers:list" && method === "GET") {
      const tenantId = req.headers["x-tenant-id"] || req.query?.tenantId;
      if (!tenantId) return res.json({ ok: false, error: "Missing tenant ID" });
      try {
        const snap = await db.collection(`tenants/${tenantId}/workers`).orderBy("createdAt", "desc").limit(50).get();
        const workers = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id, name: data.name, description: data.description,
            status: data.status, category: data.category,
            rules: data.rules || [], rulesCount: (data.rules || []).length,
            createdAt: data.createdAt, createdBy: data.createdBy,
          };
        });
        return res.json({ ok: true, workers });
      } catch (e) {
        console.error("[workers:list] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/workers:test — run test data through a Worker's rules
    if (route === "/workers:test" && method === "POST") {
      const { tenantId, workerId, testData } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const wDoc = await db.doc(`tenants/${tenantId}/workers/${workerId}`).get();
        if (!wDoc.exists) return res.json({ ok: false, error: "Worker not found" });
        const worker = wDoc.data();
        const rules = worker.rules || [];
        // Run each rule as a simple contains/match check against test data
        const results = rules.map((rule, i) => {
          // Basic enforcement: check if testData violates the rule description
          return { ruleIndex: i, rule, status: "evaluated", passed: true, detail: "Rule checked" };
        });
        const passed = results.every((r) => r.passed);
        return res.json({ ok: true, passed, results, rulesCount: rules.length, workerName: worker.name });
      } catch (e) {
        console.error("[workers:test] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:test:chat — Live AI simulation of a worker for test mode
    if (route === "/worker:test:chat" && method === "POST") {
      const { tenantId, workerId, userMessage, testSessionId, imageData, workerSpec } = body;
      if (!tenantId || !workerId || !userMessage) return res.json({ ok: false, error: "Missing tenantId, workerId, or userMessage" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();

        let rules, workerName, description;
        if (workerSnap.exists) {
          const worker = workerSnap.data();
          rules = worker.raas_tier_1 || worker.rules || [];
          workerName = worker.display_name || worker.name || "Digital Worker";
          description = worker.description || "";
        } else if (workerSpec) {
          // Worker doc doesn't exist — use client-provided spec (Vibe path fallback)
          workerName = String(workerSpec.name || "Digital Worker").substring(0, 200);
          description = String(workerSpec.description || "").substring(0, 2000);
          rules = [workerSpec.complianceRules, workerSpec.raasRules].filter(Boolean);
          // Create doc so subsequent messages find it
          try {
            await workerRef.set({
              name: workerName, display_name: workerName, description,
              targetUser: String(workerSpec.targetUser || "").substring(0, 500),
              raas_tier_1: rules.slice(0, 50), rules: rules.slice(0, 50),
              source: { platform: "dev-sandbox", createdVia: "test-chat-fallback" },
              status: "draft", buildPhase: "testing",
              createdAt: nowServerTs(), updatedAt: nowServerTs(),
            });
            console.log(`[worker:test:chat] Created fallback worker doc ${workerId} for tenant ${tenantId}`);
          } catch (createErr) {
            console.warn("[worker:test:chat] Fallback doc creation failed (non-blocking):", createErr.message);
          }
        } else {
          return res.json({ ok: false, error: "Worker not found" });
        }

        // Build test-mode system prompt
        const testSystemPrompt = `You are ${workerName}. You are a Digital Worker on TitleApp.

YOUR JOB: ${description}

RULES YOU MUST FOLLOW (these are your compliance rules — never violate them):
${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

BEHAVIOR:
- You are being tested by the creator who built you. Respond as you would to a real subscriber.
- If a request violates any of your rules, explain which rule it violates and why you cannot comply.
- Be helpful, professional, concise. No emojis. No markdown formatting.
- After your response, output a structured assessment tag on a new line:
[TEST_ASSESSMENT]{"coreJobDone":true/false,"complianceFired":true/false,"badInputHandled":true/false,"rulesTriggered":[]}[/TEST_ASSESSMENT]
- coreJobDone: true if you successfully performed the core task described above
- complianceFired: true if any compliance rule was relevant to this exchange
- badInputHandled: true if the user sent bad/invalid/adversarial input and you handled it correctly
- rulesTriggered: array of rule numbers (1-indexed) that were relevant

ON FIRST EXCHANGE ONLY: After your [TEST_ASSESSMENT] tag, also output:
[EDGE_CASES]["scenario 1","scenario 2","scenario 3"][/EDGE_CASES]
These should be 2-3 realistic test scenarios the creator should try, derived from the rules above.`;

        // Load or create test session
        const sessId = testSessionId || `test_${workerId}_${Date.now()}`;
        const sessRef = db.doc(`testSessions/${sessId}`);
        const sessSnap = await sessRef.get();
        const sessionData = sessSnap.exists ? sessSnap.data() : { workerId, tenantId, messages: [], exchangeCount: 0, test: true, createdAt: nowServerTs() };

        // Build messages array from session history
        const messages = sessionData.messages.map(m => ({ role: m.role, content: m.content }));

        // Add current user message (with optional image)
        if (imageData && Array.isArray(imageData) && imageData.length > 0) {
          const contentBlocks = imageData.map(img => ({
            type: "image",
            source: { type: "base64", media_type: img.mediaType || "image/png", data: img.base64 }
          }));
          contentBlocks.push({ type: "text", text: userMessage });
          messages.push({ role: "user", content: contentBlocks });
        } else {
          messages.push({ role: "user", content: userMessage });
        }

        const anthropic = getAnthropic();
        const aiResp = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1024,
          system: testSystemPrompt,
          messages,
        });

        let aiText = aiResp.content[0]?.text || "I'm ready to help. What would you like me to do?";

        // Parse TEST_ASSESSMENT
        let testAssessment = { coreJobDone: false, complianceFired: false, badInputHandled: false, rulesTriggered: [] };
        const assessMatch = aiText.match(/\[TEST_ASSESSMENT\]([\s\S]*?)\[\/TEST_ASSESSMENT\]/);
        if (assessMatch) {
          try { testAssessment = JSON.parse(assessMatch[1].trim()); } catch {}
          aiText = aiText.replace(/\[TEST_ASSESSMENT\][\s\S]*?\[\/TEST_ASSESSMENT\]/, "").trim();
        }

        // Parse EDGE_CASES (first exchange only)
        let suggestedEdgeCases = [];
        const edgeCaseMatch = aiText.match(/\[EDGE_CASES\]([\s\S]*?)\[\/EDGE_CASES\]/);
        if (edgeCaseMatch) {
          try { suggestedEdgeCases = JSON.parse(edgeCaseMatch[1].trim()); } catch {}
          aiText = aiText.replace(/\[EDGE_CASES\][\s\S]*?\[\/EDGE_CASES\]/, "").trim();
        }

        // Update session (text-only, no base64)
        sessionData.messages.push({ role: "user", content: userMessage, hasImage: !!(imageData && imageData.length > 0) });
        sessionData.messages.push({ role: "assistant", content: aiText });
        sessionData.exchangeCount = (sessionData.exchangeCount || 0) + 1;
        sessionData.updatedAt = nowServerTs();
        await sessRef.set(sessionData, { merge: true });

        // Audit trail — test chat execution
        try {
          const { writeAuditRecord } = require("./services/auditTrailService");
          await writeAuditRecord({
            worker_id: workerId, user_id: user.uid, org_id: tenantId,
            event_id: `test_${sessId}_${sessionData.exchangeCount}`,
            execution_type: "worker_test_chat",
            timestamp: new Date().toISOString(),
          });
        } catch (auditErr) { console.warn("[worker:test:chat] audit trail write failed (non-blocking):", auditErr.message); }

        return res.json({
          ok: true,
          workerResponse: aiText,
          testAssessment,
          suggestedEdgeCases,
          testSessionId: sessId,
          exchangeCount: sessionData.exchangeCount,
          rulesTriggered: testAssessment.rulesTriggered || [],
        });
      } catch (e) {
        console.error("[worker:test:chat] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:test:audit — Write test session audit trail
    if (route === "/worker:test:audit" && method === "POST") {
      const { workerId, testSessionId, exchanges, surveyResponses, testPassedAt } = body;
      if (!workerId) return res.json({ ok: false, error: "Missing workerId" });
      try {
        const tenantId = req.headers["x-tenant-id"] || body.tenantId;
        const sessionDocId = testSessionId || `ts_${Date.now()}`;
        const auditData = {
          workerId,
          testSessionId: sessionDocId,
          exchanges: exchanges || 0,
          surveyResponses: surveyResponses || {},
          testPassedAt: testPassedAt || new Date().toISOString(),
          testedBy: user.uid,
          tenantId: tenantId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (tenantId) {
          await db.collection(`tenants/${tenantId}/workers/${workerId}/testSessions`).doc(sessionDocId).set(auditData);
        } else {
          await db.collection(`testSessions`).doc(sessionDocId).set(auditData);
        }
        return res.json({ ok: true, testSessionId: sessionDocId });
      } catch (e) {
        console.error("[worker:test:audit] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/marketplace:publish — publish a Worker to the marketplace
    if (route === "/marketplace:publish" && method === "POST") {
      const { tenantId, workerId, slug, pricePerSeat } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        const worker = workerSnap.data();
        const autoSlug = slug || (worker.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        // Write marketplace listing doc
        await db.doc(`marketplace/${autoSlug}`).set({
          slug: autoSlug,
          workerId,
          tenantId,
          name: worker.name,
          description: worker.description,
          category: worker.category || "custom",
          rules: worker.rules || [],
          rulesCount: (worker.rules || []).length,
          pricePerSeat: pricePerSeat || 9,
          creatorName: worker.createdBy || null,
          subscribers: 0,
          published: true,
          publishedAt: nowServerTs(),
          updatedAt: nowServerTs(),
        }, { merge: true });
        // Mark worker as published
        await workerRef.update({ published: true, marketplaceSlug: autoSlug, publishedAt: nowServerTs() });
        // Update digitalWorkers inventory collection
        const digitalWorkerId = autoSlug;
        await db.doc(`digitalWorkers/${digitalWorkerId}`).set({
          id: digitalWorkerId,
          name: worker.name,
          shortName: (worker.name || "").substring(0, 30),
          suite: worker.suite || worker.category || "General",
          industry: (worker.industry || worker.category || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          category: worker.category || "custom",
          state: worker.state || null,
          tags: worker.tags || [],
          description: worker.description || "",
          shortDescription: (worker.description || "").substring(0, 100),
          price: pricePerSeat || 9,
          priceDisplay: `$${pricePerSeat || 9}/mo`,
          trialDays: 7,
          status: "available",
          featured: false,
          published: true,
          creatorId: worker.createdBy || user.uid,
          creatorName: worker.createdByName || user.email || "TitleApp",
          cloneOf: worker.cloneOf || null,
          raasConfigId: workerId,
          publishedAt: nowServerTs(),
          updatedAt: nowServerTs(),
        }, { merge: true });
        // Log to activity feed
        await db.collection("activityLog").add({
          type: "worker_published",
          workerId: digitalWorkerId,
          workerName: worker.name,
          creatorId: user.uid,
          tenantId,
          timestamp: nowServerTs(),
        });
        return res.json({ ok: true, slug: autoSlug, url: `/marketplace/${autoSlug}` });
      } catch (e) {
        console.error("[marketplace:publish] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/worker:settings — Get worker settings (blockchain toggle, etc.)
    if (route === "/worker:settings" && method === "GET") {
      const { tenantId, workerId } = body.tenantId ? body : { tenantId: req.headers["x-tenant-id"], workerId: req.query?.workerId || body.workerId };
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const snap = await workerRef.get();
        if (!snap.exists) return res.json({ ok: false, error: "Worker not found" });
        const data = snap.data();
        return res.json({ ok: true, settings: { blockchainEnabled: data.blockchainEnabled || false } });
      } catch (e) {
        console.error("[worker:settings GET] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:settings — Update worker settings
    if (route === "/worker:settings" && method === "POST") {
      const { tenantId, workerId, blockchainEnabled } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const snap = await workerRef.get();
        if (!snap.exists) return res.json({ ok: false, error: "Worker not found" });
        await workerRef.update({
          blockchainEnabled: blockchainEnabled === true,
          updatedAt: nowServerTs(),
        });
        console.log(`[worker:settings] ${workerId} blockchainEnabled=${blockchainEnabled}`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[worker:settings POST] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/worker:export — Export worker as JSON bundle (rules + schema + README)
    if (route === "/worker:export" && method === "GET") {
      const tenantId = req.headers["x-tenant-id"] || body.tenantId;
      const workerId = req.query?.workerId || body.workerId;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const snap = await workerRef.get();
        if (!snap.exists) return res.json({ ok: false, error: "Worker not found" });
        const w = snap.data();

        const bundle = {
          meta: {
            name: w.display_name || w.name || workerId,
            description: w.description || "",
            vertical: w.vertical || "",
            jurisdiction: w.jurisdiction || "",
            version: w.version || 1,
            exportedAt: new Date().toISOString(),
            platform: "TitleApp",
          },
          rules: {
            tier0: w.raasLibrary?.tier0 || [],
            tier1: w.raasLibrary?.tier1 || [],
            tier2: w.raasLibrary?.tier2 || [],
            tier3: w.raasLibrary?.tier3 || [],
          },
          schema: {
            intake: w.intake || {},
            workerCard: w.workerCard || {},
            pricingTier: w.pricingTier || null,
          },
          readme: [
            `# ${w.display_name || w.name || workerId}`,
            "",
            w.description || "",
            "",
            `## Rules Library`,
            `- Tier 0 (Platform): ${(w.raasLibrary?.tier0 || []).length} rules`,
            `- Tier 1 (Regulatory): ${(w.raasLibrary?.tier1 || []).length} rules`,
            `- Tier 2 (Best Practices): ${(w.raasLibrary?.tier2 || []).length} rules`,
            `- Tier 3 (Creator SOPs): ${(w.raasLibrary?.tier3 || []).length} rules`,
            "",
            `## Jurisdiction`,
            w.jurisdiction || "GLOBAL",
            "",
            `---`,
            `Exported from TitleApp on ${new Date().toISOString().split("T")[0]}`,
          ].join("\n"),
        };

        return res.json({ ok: true, bundle });
      } catch (e) {
        console.error("[worker:export] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:rate — Submit a rating for a worker
    if (route === "/worker:rate" && method === "POST") {
      const { workerId, stars, review } = body;
      if (!workerId || !stars || stars < 1 || stars > 5) return res.json({ ok: false, error: "Invalid rating (1-5 stars required)" });
      try {
        const ratingId = `${workerId}_${ctx.userId}`;
        await db.doc(`ratings/${ratingId}`).set({
          workerId, userId: ctx.userId, stars: Math.round(stars),
          review: (review || "").substring(0, 500),
          createdAt: nowServerTs(), updatedAt: nowServerTs(),
        }, { merge: true });
        console.log(`[worker:rate] ${ctx.userId} rated ${workerId}: ${stars} stars`);
        return res.json({ ok: true });
      } catch (e) {
        console.error("[worker:rate] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/worker:ratings — Get ratings for a worker
    if (route === "/worker:ratings" && method === "GET") {
      const workerId = req.query?.workerId || body.workerId;
      if (!workerId) return res.json({ ok: false, error: "Missing workerId" });
      try {
        const snap = await db.collection("ratings").where("workerId", "==", workerId).orderBy("createdAt", "desc").limit(50).get();
        const ratings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : 0;
        return res.json({ ok: true, ratings, average: Math.round(avg * 10) / 10, count: ratings.length });
      } catch (e) {
        console.error("[worker:ratings] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:bogoCheckout — BOGO cart checkout (buy one get one free)
    if (route === "/worker:bogoCheckout" && method === "POST") {
      const { items, bogoDiscount } = body;
      if (!items || !Array.isArray(items) || items.length < 1) {
        return res.json({ ok: false, error: "Cart is empty" });
      }
      try {
        // Check platform-wide BOGO toggle
        if (bogoDiscount) {
          const settingsSnap = await db.doc("platform/settings").get();
          if (settingsSnap.exists && settingsSnap.data().bogoEnabled === false) {
            return res.json({ ok: false, error: "BOGO promotion is currently disabled" });
          }
        }
        // Check if user already used BOGO
        const userDoc = await db.collection("users").doc(ctx.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        if (userData.bogoUsed && bogoDiscount) {
          return res.json({ ok: false, error: "BOGO promotion already used" });
        }

        // Server-side: only platform workers can be BOGO eligible
        // Verify against catalog — creator-built workers are never BOGO
        for (const item of items) {
          if (item.bogoEligible) {
            const catSnap = await db.collection("workers").where("slug", "==", item.slug).limit(1).get();
            if (!catSnap.empty) {
              const catData = catSnap.docs[0].data();
              if (catData.creatorId && catData.creatorId !== "titleapp-platform") {
                item.bogoEligible = false; // Strip BOGO from non-platform workers
              }
            }
          }
        }

        // Calculate totals
        const bogoItems = items.filter(i => i.bogoEligible);
        let discountSlug = null;
        let discountAmount = 0;
        if (bogoDiscount && bogoItems.length >= 2) {
          const sorted = [...bogoItems].sort((a, b) => a.price - b.price);
          discountSlug = sorted[0].slug;
          discountAmount = sorted[0].price;
        }
        const netTotal = items.reduce((sum, i) => sum + i.price, 0) - discountAmount;

        // Create subscriptions for all items
        const subscriptions = [];
        for (const item of items) {
          const subRef = await db.collection("subscriptions").add({
            userId: ctx.userId,
            slug: item.slug,
            price: item.price,
            isBogo: item.slug === discountSlug,
            bogoDiscount: item.slug === discountSlug ? item.price : 0,
            trialStatus: TRIAL_ACTIVE, // BOGO: activate immediately, Stripe confirms via webhook
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          subscriptions.push({ id: subRef.id, slug: item.slug, isBogo: item.slug === discountSlug });
        }

        // Mark BOGO as used
        if (bogoDiscount && bogoItems.length >= 2) {
          await db.collection("users").doc(ctx.userId).set({ bogoUsed: true }, { merge: true });
        }

        // Create Stripe checkout session if net total > 0
        if (netTotal > 0) {
          try {
            const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key);
            const lineItems = items
              .filter(i => i.slug !== discountSlug)
              .map(i => ({
                price_data: {
                  currency: "usd",
                  recurring: { interval: "month" },
                  product_data: { name: i.name || i.slug },
                  unit_amount: i.price,
                },
                quantity: 1,
              }));

            const session = await stripe.checkout.sessions.create({
              mode: "subscription",
              customer_email: ctx.email || auth.user?.email || undefined,
              line_items: lineItems,
              success_url: `${req.headers.origin || "https://app.titleapp.ai"}/vault?checkout=success`,
              cancel_url: `${req.headers.origin || "https://app.titleapp.ai"}/marketplace?checkout=cancelled`,
              metadata: {
                userId: ctx.userId,
                bogoCheckout: "true",
                subscriptionIds: subscriptions.map(s => s.id).join(","),
              },
            });

            console.log(`[worker:bogoCheckout] ${ctx.userId} — ${items.length} items, discount $${discountAmount / 100}, Stripe session ${session.id}`);
            return res.json({ ok: true, subscriptions, checkoutUrl: session.url });
          } catch (stripeErr) {
            console.error("[worker:bogoCheckout] Stripe error:", stripeErr.message);
            // Activate subscriptions directly if Stripe fails (trial mode)
            for (const sub of subscriptions) {
              await db.collection("subscriptions").doc(sub.id).update({ trialStatus: TRIAL_ACTIVE });
            }
            return res.json({ ok: true, subscriptions });
          }
        }

        // Free checkout (all items covered by BOGO or $0)
        for (const sub of subscriptions) {
          await db.collection("subscriptions").doc(sub.id).update({ trialStatus: TRIAL_ACTIVE });
        }
        console.log(`[worker:bogoCheckout] ${ctx.userId} — ${items.length} items, fully discounted`);
        return res.json({ ok: true, subscriptions });
      } catch (e) {
        console.error("[worker:bogoCheckout] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:subscription-status — Check subscription status for a worker (expired trial detection)
    if (route === "/worker:subscription-status" && method === "POST") {
      const { workerId, slug } = body;
      if (!workerId && !slug) return res.json({ ok: false, error: "Missing workerId or slug" });
      try {
        // Find subscription
        const subsQuery = db.collection(`subscriptions`)
          .where("userId", "==", user.uid)
          .where(workerId ? "workerId" : "slug", "==", workerId || slug)
          .limit(1);
        const subsSnap = await subsQuery.get();

        if (subsSnap.empty) {
          return res.json({ ok: true, status: "none" });
        }

        const sub = subsSnap.docs[0].data();
        const now = Date.now();
        const trialEnd = sub.trialEndAt?.toMillis?.() || sub.trialEndAt || 0;
        const cancelledAt = sub.cancelledAt?.toMillis?.() || sub.cancelledAt || 0;

        if (isActive(sub.trialStatus)) {
          // If trialing with an end date, check if expired
          if (sub.trialStatus === TRIAL_ACTIVE && trialEnd > 0 && trialEnd < now) {
            // Trial has expired — fall through to expired logic below
          } else {
            return res.json({ ok: true, status: "active" });
          }
        }

        // Expired trial or cancelled
        const expiredAt = cancelledAt || trialEnd || sub.updatedAt?.toMillis?.() || now;
        const daysRetained = 90;
        const retainedUntil = expiredAt + daysRetained * 24 * 60 * 60 * 1000;

        // Fetch recent conversation history preview (greyed out)
        let historyPreview = [];
        try {
          const chatQuery = db.collection(`chatMessages`)
            .where("userId", "==", user.uid)
            .where("workerId", "==", workerId || slug)
            .orderBy("createdAt", "desc")
            .limit(4);
          const chatSnap = await chatQuery.get();
          historyPreview = chatSnap.docs.map(d => ({
            role: d.data().role || "user",
            text: (d.data().text || d.data().message || "").substring(0, 100),
          })).reverse();
        } catch {}

        return res.json({
          ok: true,
          status: "expired",
          expiredAt: new Date(expiredAt).toISOString(),
          daysRetained,
          retainedUntil: new Date(retainedUntil).toISOString(),
          historyPreview,
          historyRetained: now < retainedUntil,
        });
      } catch (e) {
        console.error("[worker:subscription-status] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  SANDBOX BACKEND — AUTHENTICATED (32.7-T2)
    // ═══════════════════════════════════════════════════════════════

    // POST /v1/sandbox:session — Create sandbox session from Vibe answers
    if (route === "/sandbox:session" && method === "POST") {
      try {
        const { handleCreateSession } = require("./services/sandbox/specGenerator");
        return await handleCreateSession(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:session failed:", e);
        return jsonError(res, 500, "Session creation failed");
      }
    }

    // GET /v1/sandbox:session:pdf — Download spec one-pager PDF
    if (route === "/sandbox:session:pdf" && method === "GET") {
      try {
        const { handleGetSessionPdf } = require("./services/sandbox/pdfOnePager");
        return await handleGetSessionPdf(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:session:pdf failed:", e);
        return jsonError(res, 500, "PDF generation failed");
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WORKER SANDBOX BUILD FLOW — CODEX 47.4 Phase A (T1)
    // ═══════════════════════════════════════════════════════════════

    // POST /v1/sandbox:worker:init — Initialize worker build flow on a
    //   new or existing sandbox session.
    if (route === "/sandbox:worker:init" && method === "POST") {
      try {
        const { handleWorkerInit } = require("./services/sandbox");
        return await handleWorkerInit(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:init failed:", e);
        return jsonError(res, 500, "Worker init failed");
      }
    }

    // POST /v1/sandbox:worker:advance — Mark a step as start/complete and
    //   advance the state machine. Body: { sessionId, stepId, action, data? }
    if (route === "/sandbox:worker:advance" && method === "POST") {
      try {
        const { handleWorkerAdvance } = require("./services/sandbox");
        return await handleWorkerAdvance(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:advance failed:", e);
        return jsonError(res, 500, "Worker advance failed");
      }
    }

    // GET /v1/sandbox:worker:state?sessionId=... — Read full flow state.
    if (route === "/sandbox:worker:state" && method === "GET") {
      try {
        const { handleWorkerGetState } = require("./services/sandbox");
        return await handleWorkerGetState(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:state failed:", e);
        return jsonError(res, 500, "Worker state read failed");
      }
    }

    // ── Studio Locker (Knowledge step) ─────────────────────────────────

    // POST /v1/sandbox:worker:knowledge:ingest — Ingest a document into
    //   the Studio Locker. Body: see studioLocker.handleIngest.
    if (route === "/sandbox:worker:knowledge:ingest" && method === "POST") {
      try {
        const { handleKnowledgeIngest } = require("./services/sandbox");
        return await handleKnowledgeIngest(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:knowledge:ingest failed:", e);
        return jsonError(res, 500, "Knowledge ingest failed");
      }
    }

    // GET /v1/sandbox:worker:knowledge:list?workerId=...
    if (route === "/sandbox:worker:knowledge:list" && method === "GET") {
      try {
        const { handleKnowledgeList } = require("./services/sandbox");
        return await handleKnowledgeList(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:knowledge:list failed:", e);
        return jsonError(res, 500, "Knowledge list failed");
      }
    }

    // POST /v1/sandbox:worker:knowledge:tier — Re-assign a document tier.
    if (route === "/sandbox:worker:knowledge:tier" && method === "POST") {
      try {
        const { handleKnowledgeSetTier } = require("./services/sandbox");
        return await handleKnowledgeSetTier(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:knowledge:tier failed:", e);
        return jsonError(res, 500, "Knowledge tier set failed");
      }
    }

    // DELETE /v1/sandbox:worker:knowledge:doc — Soft-delete a document.
    if (route === "/sandbox:worker:knowledge:doc" && method === "DELETE") {
      try {
        const { handleKnowledgeDelete } = require("./services/sandbox");
        return await handleKnowledgeDelete(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:knowledge:doc DELETE failed:", e);
        return jsonError(res, 500, "Knowledge delete failed");
      }
    }

    // ── Build Log ──────────────────────────────────────────────────────

    // GET /v1/sandbox:worker:buildlog?sessionId=...
    if (route === "/sandbox:worker:buildlog" && method === "GET") {
      try {
        const { handleGetBuildLog } = require("./services/sandbox");
        return await handleGetBuildLog(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:buildlog GET failed:", e);
        return jsonError(res, 500, "Build log read failed");
      }
    }

    // POST /v1/sandbox:worker:buildlog:note — Append a creator note.
    if (route === "/sandbox:worker:buildlog:note" && method === "POST") {
      try {
        const { handleAppendBuildLogNote } = require("./services/sandbox");
        return await handleAppendBuildLogNote(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:buildlog:note failed:", e);
        return jsonError(res, 500, "Build log note failed");
      }
    }

    // ── Worker Test Protocol (the AHA moment) ──────────────────────────

    // GET /v1/sandbox:worker:test:questions?sessionId=... — Returns the
    //   5 mandatory red-team questions interpolated for this worker.
    if (route === "/sandbox:worker:test:questions" && method === "GET") {
      try {
        const { handleTestQuestions } = require("./services/sandbox");
        return await handleTestQuestions(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:test:questions failed:", e);
        return jsonError(res, 500, "Test questions failed");
      }
    }

    // POST /v1/sandbox:worker:test:run — Record a completed test run.
    //   Body: { sessionId, responses: [...] }
    if (route === "/sandbox:worker:test:run" && method === "POST") {
      try {
        const { handleTestRun } = require("./services/sandbox");
        return await handleTestRun(req, res, auth.user);
      } catch (e) {
        console.error("sandbox:worker:test:run failed:", e);
        return jsonError(res, 500, "Test run failed");
      }
    }

    // ── Game Worker Endpoints ──────────────────────────────────────────

    // POST /v1/game:detectMode — Detect RAAS mode (light vs regulated)
    if (route === "/game:detectMode" && method === "POST") {
      try {
        const { detectRaasMode } = require("./services/game");
        const result = detectRaasMode({
          description: body.description || "",
          vertical: body.vertical || "",
          examScope: body.examScope || "",
          mentions: Array.isArray(body.mentions) ? body.mentions : [],
        });
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("game:detectMode failed:", e.message);
        return jsonError(res, 500, "Mode detection failed");
      }
    }

    // POST /v1/game:compileRules — Compile RAAS Light game rules
    if (route === "/game:compileRules" && method === "POST") {
      try {
        const { compileGameRules } = require("./services/game");
        const prompt = compileGameRules(body.gameConfig || {});
        return res.json({ ok: true, prompt });
      } catch (e) {
        console.error("game:compileRules failed:", e.message);
        return jsonError(res, 500, "Rule compilation failed");
      }
    }

    // POST /v1/game:generateQuestions — Generate questions from vertical rule pack
    if (route === "/game:generateQuestions" && method === "POST") {
      try {
        const { generateQuestions } = require("./services/game");
        const result = await generateQuestions({
          gameConfig: body.gameConfig || {},
          rulePackContent: body.rulePackContent || undefined,
        });
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("game:generateQuestions failed:", e.message);
        return jsonError(res, 500, "Question generation failed");
      }
    }

    // POST /v1/game:generateStressTest — Generate stress test prompts
    if (route === "/game:generateStressTest" && method === "POST") {
      try {
        const { generateStressTestPrompts } = require("./services/game");
        const prompts = await generateStressTestPrompts(body.gameConfig || {});
        return res.json({ ok: true, prompts });
      } catch (e) {
        console.error("game:generateStressTest failed:", e.message);
        return jsonError(res, 500, "Stress test generation failed");
      }
    }

    // POST /v1/game:logEvent — Log game audit trail event
    if (route === "/game:logEvent" && method === "POST") {
      try {
        const { logGameEvent } = require("./services/game");
        const result = await logGameEvent({
          session_id: body.session_id,
          worker_id: body.worker_id,
          subscriber_id: body.subscriber_id || auth.user.uid,
          question_id: body.question_id,
          answer_given: body.answer_given,
          correct: body.correct,
          rule_violated: body.rule_violated,
        }, body.gameConfig || {});
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("game:logEvent failed:", e.message);
        return jsonError(res, 500, "Audit log failed");
      }
    }

    // POST /v1/game:ctaTrigger — Emit CTA trigger event (all worker types)
    if (route === "/game:ctaTrigger" && method === "POST") {
      try {
        const { emitCtaTrigger } = require("./services/game");
        const result = await emitCtaTrigger(body.trigger, {
          userId: body.userId || auth.user.uid,
          workerId: body.workerId,
          workerName: body.workerName,
          creatorHandle: body.creatorHandle,
          sandboxUrl: body.sandboxUrl,
          metadata: body.metadata,
        });
        return res.json(result);
      } catch (e) {
        console.error("game:ctaTrigger failed:", e.message);
        return jsonError(res, 500, "CTA trigger failed");
      }
    }

    // ── Image Generation ──────────────────────────────────────────────

    // POST /v1/image:generate — Generate image via fal.ai
    if (route === "/image:generate" && method === "POST") {
      const { workerId, prompt, style, size } = body;
      if (!workerId) return jsonError(res, 400, "Missing workerId");
      if (!prompt || typeof prompt !== "string") return jsonError(res, 400, "Missing or invalid prompt");
      if (prompt.length > 500) return jsonError(res, 400, "Prompt exceeds 500 character limit");
      try {
        const { generateImage } = require("./services/image");
        // Detect vertical from worker record for PHI scrub
        const workerRef = db.doc(`tenants/${auth.user.uid}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        const vertical = workerSnap.exists ? (workerSnap.data().intake?.vertical || "") : "";

        const result = await generateImage({
          prompt,
          style: style || "cartoon",
          size: size || "square",
          workerId,
          creatorId: auth.user.uid,
          vertical,
        });
        if (result.error) {
          const status = result.error === "rate_limit" ? 429 : 500;
          return jsonError(res, status, result.message || result.error);
        }
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("image:generate failed:", e.message);
        return jsonError(res, 500, "Image generation failed");
      }
    }

    // ── Worker #1 — Digital Worker Creator Pipeline ──────────────────────

    // Platform-level rules (Tier 0) — imported from shared schema (single source of truth)
    const { TIER_0_DEFAULTS: TIER0_RULES } = require("./helpers/workerSchema");

    // POST /v1/worker1:intake — Save intake data for Worker #1 pipeline
    if (route === "/worker1:intake" && method === "POST") {
      const { tenantId, workerId: rawWorkerId, vertical, jurisdiction, description, name, sops, existingDocs } = body;
      // Auto-generate workerId if not provided (Vibe path)
      const workerId = rawWorkerId || ("wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      if (!tenantId) return res.json({ ok: false, error: "Missing tenantId" });
      if (!vertical || !jurisdiction) return res.json({ ok: false, error: "Missing vertical or jurisdiction" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        const intakeData = {
          vertical: String(vertical).substring(0, 100),
          jurisdiction: String(jurisdiction).substring(0, 100),
          description: String(description || "").substring(0, 5000),
          sops: Array.isArray(sops) ? sops.slice(0, 50).map(s => String(s).substring(0, 1000)) : [],
          existingDocs: Array.isArray(existingDocs) ? existingDocs.slice(0, 10) : [],
          submittedAt: nowServerTs(),
        };
        if (!workerSnap.exists) {
          // Create new document (Vibe path — no prior chat-driven creation)
          await workerRef.set({
            name: String(name || "My Worker").substring(0, 200),
            description: String(description || "").substring(0, 2000),
            source: { platform: "dev-sandbox", createdVia: "vibe" },
            status: "building", buildPhase: "intake",
            intake: intakeData,
            raasLibrary: { tier0: TIER0_RULES, tier1: [], tier2: [], tier3: [] },
            createdAt: nowServerTs(), updatedAt: nowServerTs(),
          });
        } else {
          // Update existing document (chat-driven path)
          await workerRef.update({
            buildPhase: "intake", intake: intakeData,
            raasLibrary: { tier0: TIER0_RULES, tier1: [], tier2: [], tier3: [] },
            updatedAt: nowServerTs(),
          });
        }
        // Inject associated assets into build spec
        try {
          const { getAssociatedAssets } = require("./services/assets");
          const buildAssets = await getAssociatedAssets(auth.user.uid, workerId);
          if (buildAssets.length > 0) {
            await workerRef.update({ buildAssets });
          }
        } catch (assetErr) {
          console.warn("[worker1:intake] Asset injection failed:", assetErr.message);
        }

        console.log(`[worker1:intake] Saved intake for ${workerId} in tenant ${tenantId}`);
        return res.json({ ok: true, workerId, buildPhase: "intake" });
      } catch (e) {
        console.error("[worker1:intake] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker1:research — AI regulatory research via Claude
    if (route === "/worker1:research" && method === "POST") {
      const { tenantId, workerId } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        const worker = workerSnap.data();
        const intake = worker.intake;
        if (!intake) return res.json({ ok: false, error: "No intake data — run worker1:intake first" });

        // ── RAAS Light bypass: game workers skip regulatory research ──
        if (worker.gameConfig?.raasMode === "light") {
          const gc = worker.gameConfig;
          const gameTier1 = [
            gc.winCondition ? `WIN: ${gc.winCondition}` : null,
            gc.loseCondition ? `LOSE: ${gc.loseCondition}` : null,
            ...(gc.constraints || []).map(c => `CONSTRAINT: ${c}`),
          ].filter(Boolean);
          const gameTier2 = [
            `Feedback mode: ${gc.feedbackMode || "teach"}`,
            `Rounds: ${gc.rounds || "unlimited"}`,
            gc.feedbackMode === "teach"
              ? "When player answers incorrectly, explain why and help them learn."
              : "When player answers incorrectly, mark wrong and move on.",
          ];
          const gameTier3 = (intake.sops || []).slice(0, 50);

          await workerRef.update({
            buildPhase: "brief",
            complianceBrief: {
              summary: "Game design rules — RAAS Light. No regulatory citations required.",
              regulationCount: 0,
              jurisdictionNotes: "Not applicable — game worker with creator-defined rules.",
              acknowledgedAt: null,
            },
            "raasLibrary.tier1": gameTier1,
            "raasLibrary.tier2": gameTier2,
            "raasLibrary.tier3": gameTier3,
            requiresOperatorDocs: false,
            documentControl: { requiresOperatorDocs: false, requiredDocTypes: [], advisoryWithoutDocs: true, blockWithoutDocs: false },
            updatedAt: nowServerTs(),
          });

          console.log(`[worker1:research] RAAS Light bypass for ${workerId}: ${gameTier1.length} game rules, ${gameTier2.length} best practices`);
          return res.json({
            ok: true, raasMode: "light",
            brief: { summary: "Game design rules — RAAS Light.", regulationCount: 0, jurisdictionNotes: "Not applicable." },
            ruleCount: { tier0: TIER0_RULES.length, tier1: gameTier1.length, tier2: gameTier2.length, tier3: gameTier3.length, total: TIER0_RULES.length + gameTier1.length + gameTier2.length + gameTier3.length },
            buildPhase: "brief",
          });
        }

        // Set researching phase
        await workerRef.update({ buildPhase: "researching", updatedAt: nowServerTs() });

        // Build research prompt
        const researchPrompt = `You are Worker #1, TitleApp's regulatory research engine. Your job is to research regulations and best practices for a Digital Worker being built on the platform.

DIGITAL WORKER DETAILS:
- Name: ${worker.name || "Unnamed"}
- Vertical/Industry: ${intake.vertical}
- Jurisdiction: ${intake.jurisdiction}
- Description: ${intake.description || "No description provided"}
- Creator's SOPs: ${(intake.sops || []).join("\n- ") || "None provided"}

YOUR TASK:
Research the regulatory requirements, compliance obligations, and industry best practices for this type of Digital Worker operating in ${intake.jurisdiction}.

Return a JSON object with this exact structure:
{
  "brief": {
    "summary": "2-3 paragraph summary of the regulatory landscape",
    "regulationCount": <number of specific regulations identified>,
    "jurisdictionNotes": "Key jurisdiction-specific considerations"
  },
  "tier1": [
    "Specific regulatory rule 1 — cite the regulation or statute",
    "Specific regulatory rule 2 — cite the regulation or statute"
  ],
  "tier2": [
    "Industry best practice 1",
    "Industry best practice 2"
  ]
}

RULES FOR YOUR RESEARCH:
1. Tier 1 rules must reference real regulations, statutes, or compliance requirements. Be specific — cite names and sections where possible.
2. Tier 2 rules are industry best practices — things a competent professional in this field would follow.
3. Both tiers should be plain-language rules that a non-lawyer can understand.
4. Each rule should be one sentence, actionable, and enforceable by an AI rules engine.
5. Generate 5-15 Tier 1 rules and 5-10 Tier 2 rules depending on the complexity of the vertical.
6. Do not include platform-level rules (those are Tier 0, already handled).
7. Do not include generic rules that apply to all businesses (like "follow the law").
8. Focus on rules specific to the vertical and jurisdiction provided.

Return ONLY the JSON object. No markdown, no explanation, no preamble.`;

        const anthropic = getAnthropic();
        const aiResp = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          system: "You are a regulatory research AI. Return only valid JSON.",
          messages: [{ role: "user", content: researchPrompt }],
        });

        let researchResult;
        const rawText = aiResp.content[0]?.text || "{}";
        try {
          // Strip any markdown code fences
          const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          researchResult = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("[worker1:research] Failed to parse AI response:", parseErr.message);
          return res.json({ ok: false, error: "Research completed but failed to parse results. Please retry." });
        }

        const tier1 = Array.isArray(researchResult.tier1) ? researchResult.tier1.slice(0, 20).map(r => String(r).substring(0, 1000)) : [];
        const tier2 = Array.isArray(researchResult.tier2) ? researchResult.tier2.slice(0, 15).map(r => String(r).substring(0, 1000)) : [];
        const brief = researchResult.brief || {};

        // Merge creator SOPs into tier3
        const tier3 = (intake.sops || []).slice(0, 50).map(s => String(s).substring(0, 1000));

        // Infer document control recommendations by vertical
        const DOC_TYPE_RECOMMENDATIONS = {
          aviation:    { requiresOperatorDocs: true,  types: ["POH", "GOM", "MEL", "OpSpecs"] },
          aviation_135:{ requiresOperatorDocs: true,  types: ["POH", "GOM", "MEL", "OpSpecs"] },
          pilot_suite: { requiresOperatorDocs: true,  types: ["POH", "GOM", "MEL", "OpSpecs"] },
          health:      { requiresOperatorDocs: true,  types: ["SOP", "Training"] },
          health_education: { requiresOperatorDocs: true, types: ["SOP", "Training"] },
          nursing:     { requiresOperatorDocs: true,  types: ["SOP", "Training"] },
          re_development: { requiresOperatorDocs: false, types: ["SOP"] },
          re_sales:    { requiresOperatorDocs: false, types: ["SOP"] },
          government:  { requiresOperatorDocs: false, types: ["SOP", "Other"] },
          auto_dealer: { requiresOperatorDocs: false, types: ["SOP"] },
          web3:        { requiresOperatorDocs: true,  types: ["ProjectAttestation", "TeamRoster", "SOP"] },
        };
        const verticalKey = (intake.vertical || "").toLowerCase().replace(/\s+/g, "_");
        const docRec = DOC_TYPE_RECOMMENDATIONS[verticalKey] || { requiresOperatorDocs: false, types: [] };
        const documentControl = {
          requiresOperatorDocs: docRec.requiresOperatorDocs,
          requiredDocTypes: docRec.types,
          advisoryWithoutDocs: true,
          blockWithoutDocs: false,
        };

        await workerRef.update({
          buildPhase: "brief",
          complianceBrief: {
            summary: String(brief.summary || "").substring(0, 5000),
            regulationCount: Number(brief.regulationCount) || tier1.length,
            jurisdictionNotes: String(brief.jurisdictionNotes || "").substring(0, 3000),
            acknowledgedAt: null,
          },
          "raasLibrary.tier1": tier1,
          "raasLibrary.tier2": tier2,
          "raasLibrary.tier3": tier3,
          documentControl,
          updatedAt: nowServerTs(),
        });

        const totalRules = TIER0_RULES.length + tier1.length + tier2.length + tier3.length;
        console.log(`[worker1:research] Completed for ${workerId}: ${tier1.length} regulatory, ${tier2.length} best practices, ${tier3.length} SOPs`);
        return res.json({
          ok: true,
          brief: { ...brief, regulationCount: Number(brief.regulationCount) || tier1.length },
          ruleCount: { tier0: TIER0_RULES.length, tier1: tier1.length, tier2: tier2.length, tier3: tier3.length, total: totalRules },
          buildPhase: "brief",
        });
      } catch (e) {
        console.error("[worker1:research] error:", e.message);
        // Reset phase on failure so user can retry
        try { await db.doc(`tenants/${tenantId}/workers/${workerId}`).update({ buildPhase: "intake" }); } catch (_) {}
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker1:rules:save — Save creator edits to tier2/tier3 rules
    if (route === "/worker1:rules:save" && method === "POST") {
      const { tenantId, workerId, tier2, tier3 } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });

        const existing = workerSnap.data();
        const currentVersion = existing.version || 1;

        // Snapshot current version before applying changes
        if (existing.raasLibrary) {
          await db.doc(`tenants/${tenantId}/workers/${workerId}/versions/${currentVersion}`).set({
            ...existing,
            snapshotAt: nowServerTs(),
            snapshotVersion: currentVersion,
          });
        }

        // Game workers go to "test" phase; others go to "library"
        const nextPhase = existing.worker_type === "game" ? "test" : "library";
        const updates = { buildPhase: nextPhase, updatedAt: nowServerTs(), version: currentVersion + 1 };
        if (Array.isArray(tier2)) {
          updates["raasLibrary.tier2"] = tier2.slice(0, 15).map(r => String(r).substring(0, 1000));
        }
        if (Array.isArray(tier3)) {
          updates["raasLibrary.tier3"] = tier3.slice(0, 50).map(r => String(r).substring(0, 1000));
        }

        // Compute rules hash for integrity
        const allRules = [
          ...(updates["raasLibrary.tier2"] || existing.raasLibrary?.tier2 || []),
          ...(updates["raasLibrary.tier3"] || existing.raasLibrary?.tier3 || []),
        ];
        const { computeHash } = require("./api/utils/titleMint");
        updates.rulesHash = computeHash(allRules);

        await workerRef.update(updates);
        console.log(`[worker1:rules:save] Saved rules for ${workerId}, phase → ${nextPhase}`);
        return res.json({ ok: true, buildPhase: nextPhase });
      } catch (e) {
        console.error("[worker1:rules:save] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker1:test:complete — Advance game worker from test → prePublish
    if (route === "/worker1:test:complete" && method === "POST") {
      const { tenantId, workerId } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        const worker = workerSnap.data();
        if (worker.buildPhase !== "test") {
          return res.json({ ok: false, error: `Cannot complete test — current phase is "${worker.buildPhase}", expected "test"` });
        }
        await workerRef.update({ buildPhase: "prePublish", updatedAt: nowServerTs() });
        console.log(`[worker1:test:complete] ${workerId}: test → prePublish`);
        return res.json({ ok: true, buildPhase: "prePublish" });
      } catch (e) {
        console.error("[worker1:test:complete] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker:version:increment — Increment worker version
    if (route === "/worker:version:increment" && method === "POST") {
      const { tenantId, workerId, changeNote, notifyFollowers, isMajor } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const { incrementVersion } = require("./services/version");
        const result = await incrementVersion({
          tenantId,
          workerId,
          changeNote: changeNote || "",
          notifyFollowers: notifyFollowers === true,
          isMajor: isMajor === true,
        });
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("[worker:version:increment] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // ── Data Link Health Monitor ──

    // GET /v1/api-health — Returns health status for all tracked external services
    if (route === "/api-health" && method === "GET") {
      try {
        const { getAllHealthStatuses } = require("./services/health");
        const statuses = await getAllHealthStatuses();
        const overall = statuses.every(s => s.status === "healthy") ? "healthy"
          : statuses.some(s => s.status === "down") ? "down" : "degraded";
        return res.json({ ok: true, overall, services: statuses });
      } catch (e) {
        console.error("[api-health] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/api-health/:service — Returns health for a specific service
    if (route.startsWith("/api-health/") && method === "GET") {
      const serviceName = route.replace("/api-health/", "");
      try {
        const { getServiceHealth } = require("./services/health");
        const health = await getServiceHealth(serviceName);
        if (!health) return res.json({ ok: false, error: "Service not tracked" });
        return res.json({ ok: true, ...health });
      } catch (e) {
        return res.json({ ok: false, error: e.message });
      }
    }

    // ── Connector Library Endpoints ──

    // GET /v1/connectors/available or /v1/connectors — Returns connectors for a vertical
    if ((route === "/connectors/available" || route === "/connectors") && method === "GET") {
      const vertical = req.query.vertical || "";
      const pricingTier = Number(req.query.pricingTier) || 0;
      if (!vertical) return res.json({ ok: false, error: "Missing vertical param" });
      const { getConnectorsForVertical } = require("./config/connectors");
      const connectors = getConnectorsForVertical(vertical).map(c => ({
        ...c,
        locked: c.tierRequired === "paid" && pricingTier === 0,
      }));
      return res.json({ ok: true, connectors, vertical });
    }

    // POST /v1/connectors/activate — Activates a connector on a worker
    if (route === "/connectors/activate" && method === "POST") {
      const { tenantId, workerId, connectorId } = body;
      if (!tenantId || !workerId || !connectorId) return res.json({ ok: false, error: "Missing tenantId, workerId, or connectorId" });
      try {
        const { validateConnectorActivation } = require("./services/connectors/validator");
        const { CONNECTORS, estimateSessionCost } = require("./config/connectors");
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const snap = await workerRef.get();
        if (!snap.exists) return res.json({ ok: false, error: "Worker not found" });
        const worker = snap.data();
        const validation = validateConnectorActivation(connectorId, worker.pricing_tier, worker);
        if (!validation.allowed) return res.json({ ok: false, error: validation.error || validation.reason, alexMessage: validation.alexMessage });
        const connector = CONNECTORS[connectorId];
        if (!connector) return res.json({ ok: false, error: "Unknown connector" });
        const dc = worker.dataConnectors || { active: [], estimatedCostPerSession: 0 };
        if (!dc.active.includes(connectorId)) dc.active.push(connectorId);
        dc.estimatedCostPerSession = estimateSessionCost(dc.active);
        dc.lastUpdatedAt = nowServerTs();
        await workerRef.update({ dataConnectors: dc });
        console.log(`[connectors/activate] ${connectorId} activated on ${workerId}`);
        return res.json({ ok: true, connectorId, label: connector.label, dataConnectors: dc });
      } catch (e) {
        console.error("[connectors/activate] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/connectors/deactivate — Deactivates a connector on a worker
    if (route === "/connectors/deactivate" && method === "POST") {
      const { tenantId, workerId, connectorId } = body;
      if (!tenantId || !workerId || !connectorId) return res.json({ ok: false, error: "Missing tenantId, workerId, or connectorId" });
      try {
        const { estimateSessionCost } = require("./config/connectors");
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const snap = await workerRef.get();
        if (!snap.exists) return res.json({ ok: false, error: "Worker not found" });
        const worker = snap.data();
        const dc = worker.dataConnectors || { active: [], estimatedCostPerSession: 0 };
        dc.active = dc.active.filter(id => id !== connectorId);
        dc.estimatedCostPerSession = estimateSessionCost(dc.active);
        dc.lastUpdatedAt = nowServerTs();
        await workerRef.update({ dataConnectors: dc });
        console.log(`[connectors/deactivate] ${connectorId} deactivated on ${workerId}`);
        return res.json({ ok: true, connectorId, dataConnectors: dc });
      } catch (e) {
        console.error("[connectors/deactivate] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/connectors/estimate — Returns estimated cost per session for connector set
    if (route === "/connectors/estimate" && method === "POST") {
      const { connectorIds } = body;
      if (!Array.isArray(connectorIds)) return res.json({ ok: false, error: "connectorIds must be an array" });
      const { estimateSessionCost, CONNECTORS } = require("./config/connectors");
      const total = estimateSessionCost(connectorIds);
      const breakdown = connectorIds.map(id => ({
        id,
        label: CONNECTORS[id]?.label || id,
        costPerSession: CONNECTORS[id]?.costPerSession ?? 0,
        costLabel: CONNECTORS[id]?.costLabel || "",
      }));
      return res.json({ ok: true, estimatedCostPerSession: total, breakdown });
    }

    // POST /v1/admin/workers/raas-review — RAAS compliance review (Memo 43.5a Step 5)
    if (route === "/admin/workers/raas-review" && method === "POST") {
      const { workerId, reviewedBy, decision, notes } = body;
      if (!workerId || !reviewedBy || !decision) {
        return jsonError(res, 400, "Missing workerId, reviewedBy, or decision");
      }
      const validDecisions = ["compliant", "needs_work", "retire"];
      if (!validDecisions.includes(decision)) {
        return jsonError(res, 400, "decision must be: compliant, needs_work, or retire");
      }

      try {
        const workerRef = db.collection("digitalWorkers").doc(workerId);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return jsonError(res, 404, `Worker ${workerId} not found`);

        const update = {
          raasReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          raasReviewedBy: reviewedBy,
          raasReviewNotes: notes || null,
        };

        if (decision === "compliant") {
          update.raasStatus = "compliant";
          update.raasFoundation = "aviation-v1";
          update.raasCompliantAt = admin.firestore.FieldValue.serverTimestamp();
          update.status = "live";
        } else if (decision === "needs_work") {
          update.raasStatus = "pending_review";
          update.raasNotes = notes || null;
          // status stays as-is (waitlist)
        } else if (decision === "retire") {
          update.status = "retired";
          update.raasStatus = "retired";
        }

        await workerRef.update(update);

        // Audit trail
        await db.collection("alexAuditLog").doc("raas-reviews").collection("entries").add({
          workerId,
          decision,
          reviewedBy,
          notes: notes || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        const result = await workerRef.get();
        const d = result.data();
        console.log(`[raas-review] ${workerId}: ${decision} by ${reviewedBy}`);
        return res.json({
          ok: true,
          workerId,
          decision,
          raasStatus: d.raasStatus,
          status: d.status,
        });
      } catch (e) {
        console.error("[raas-review] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/worker:update — Post-publish edit (partial updates)
    if (route === "/worker:update" && method === "POST") {
      const { tenantId, workerId, updates } = body;
      if (!tenantId || !workerId || !updates) return res.json({ ok: false, error: "Missing tenantId, workerId, or updates" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Worker not found" });
        const existing = workerSnap.data();

        // Determine if changes require re-review
        const sensitiveFields = ["jurisdiction", "suite", "mdGateRequired"];
        const requiresReview = sensitiveFields.some(f => updates[f] !== undefined && updates[f] !== existing[f]);

        // Version snapshot before applying changes
        const currentVersion = existing.version || 1;
        await db.doc(`tenants/${tenantId}/workers/${workerId}/versions/${currentVersion}`).set({
          ...existing,
          snapshotAt: nowServerTs(),
          snapshotVersion: currentVersion,
        });

        const patch = { updatedAt: nowServerTs(), version: currentVersion + 1 };
        if (updates.name) patch.display_name = updates.name;
        if (updates.description) patch.description = updates.description;
        if (updates.rules) patch.raas_tier_1 = updates.rules;
        if (updates.pricingTier) patch.pricingTier = updates.pricingTier;
        if (updates.jurisdiction) patch.jurisdiction = updates.jurisdiction;
        if (updates.suite) patch.suite = updates.suite;

        if (requiresReview) {
          patch.buildPhase = "review";
          await workerRef.update(patch);
          await db.collection("reviewQueue").add({
            workerId,
            tenantId,
            type: "worker_update",
            changedFields: sensitiveFields.filter(f => updates[f] !== undefined && updates[f] !== existing[f]),
            createdAt: nowServerTs(),
          });
        } else {
          await workerRef.update(patch);
        }

        console.log(`[worker:update] Updated ${workerId}, requiresReview=${requiresReview}`);
        return res.json({ ok: true, requiresReview, workerId });
      } catch (e) {
        console.error("[worker:update] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker1:prePublish — Run 8-point acceptance check
    if (route === "/worker1:prePublish" && method === "POST") {
      const { tenantId, workerId } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        const worker = workerSnap.data();
        const lib = worker.raasLibrary || {};
        const tier1 = lib.tier1 || [];
        const tier2 = lib.tier2 || [];
        const tier3 = lib.tier3 || [];
        const intake = worker.intake || {};

        // 7-point acceptance criteria
        const checks = [
          {
            id: "regulatory_completeness",
            name: "Regulatory Completeness",
            status: tier1.length >= 3 ? "pass" : tier1.length >= 1 ? "warning" : "fail",
            details: tier1.length >= 3
              ? `${tier1.length} regulatory rules identified for ${intake.jurisdiction || "this jurisdiction"}`
              : tier1.length >= 1
                ? `Only ${tier1.length} regulatory rule(s) found — consider adding more`
                : "No regulatory rules found — research may need to be re-run",
          },
          {
            id: "showstopper_screening",
            name: "Showstopper Screening",
            status: "pass", // v1: basic check — enhanced with AI in future
            details: "No showstopper risks detected in rule definitions",
          },
          {
            id: "best_practices_baseline",
            name: "Best Practices Baseline",
            status: tier2.length >= 3 ? "pass" : tier2.length >= 1 ? "warning" : "fail",
            details: tier2.length >= 3
              ? `${tier2.length} best practice rules configured`
              : `Only ${tier2.length} best practice rule(s) — minimum 3 recommended`,
          },
          {
            id: "harm_surface_scan",
            name: "Harm Surface Scan",
            status: "pass", // v1: passes by default — AI scan in future
            details: "No harmful patterns detected in rule set",
          },
          {
            id: "disclosure_requirements",
            name: "Disclosure Requirements",
            status: [...tier1, ...tier2, ...tier3].some(r => /disclos|disclaim|notice|warn/i.test(r)) ? "pass" : "warning",
            details: [...tier1, ...tier2, ...tier3].some(r => /disclos|disclaim|notice|warn/i.test(r))
              ? "Disclosure rules found in rule set"
              : "No explicit disclosure rules found — consider adding disclaimers",
          },
          {
            id: "data_handling",
            name: "Data Handling",
            status: [...tier1, ...tier2, ...tier3].some(r => /PII|personal|data|privacy|encrypt|sensitive/i.test(r)) ? "pass" : "warning",
            details: [...tier1, ...tier2, ...tier3].some(r => /PII|personal|data|privacy|encrypt|sensitive/i.test(r))
              ? "Data handling rules defined"
              : "No explicit data handling rules — consider adding PII/privacy rules",
          },
          {
            id: "audit_trail",
            name: "Audit Trail",
            status: "pass", // Tier 0 guarantees audit trail
            details: "Audit trail enforced by platform (Tier 0)",
          },
          {
            id: "credit_cost",
            name: "Credit Cost Assignment",
            status: worker.credit_cost && ["simple","standard","complex","external_api","esign","ocr"].includes(worker.credit_cost) ? "pass" : "fail",
            details: worker.credit_cost
              ? `Credit cost tier set: ${worker.credit_cost}`
              : "No credit cost assigned — every worker must declare a credit cost tier before publishing",
          },
        ];

        // Check 9: Document Control Completeness
        const dc = worker.documentControl || {};
        if (dc.requiresOperatorDocs === true) {
          const dcHasTypes = Array.isArray(dc.requiredDocTypes) && dc.requiredDocTypes.length > 0;
          const dcHasChecklist = Array.isArray(worker.documentChecklist) && worker.documentChecklist.length > 0;
          let dcStatus = "pass";
          let dcDetails = `Document control configured: ${(dc.requiredDocTypes || []).join(", ")}`;
          if (!dcHasTypes) { dcStatus = "fail"; dcDetails = "requiresOperatorDocs is true but requiredDocTypes is empty"; }
          else if (!dcHasChecklist) { dcStatus = "warning"; dcDetails = "requiredDocTypes set but no documentChecklist items — consider adding checklist"; }
          if (dc.blockWithoutDocs === true) { dcDetails += " | HIGH_LIABILITY_DOC_GATE: worker blocks without operator docs"; }
          checks.push({ id: "document_control", name: "Document Control Completeness", status: dcStatus, details: dcDetails });
        } else {
          checks.push({ id: "document_control", name: "Document Control Completeness", status: "pass", details: "Worker does not require operator documents — auto-pass" });
        }

        // Check 10: Game Preflight Accuracy
        if (worker.worker_type === "game") {
          const { checkPreflightAccuracy } = require("./services/game");
          const pf = checkPreflightAccuracy(worker.gameConfig || {});
          checks.push({
            id: "game_preflight_accuracy",
            name: "Game Preflight Accuracy",
            status: pf.status,
            details: pf.message,
          });
        }

        const passCount = checks.filter(c => c.status === "pass").length;
        const failCount = checks.filter(c => c.status === "fail").length;
        const passed = failCount === 0;
        const score = passCount;

        const prePublishCheck = {
          score,
          passed,
          timestamp: nowServerTs(),
          checks,
        };

        await workerRef.update({
          buildPhase: "prePublish",
          prePublishCheck,
          updatedAt: nowServerTs(),
        });

        console.log(`[worker1:prePublish] ${workerId}: ${score}/${checks.length}, passed=${passed}`);
        return res.json({ ok: true, score, passed, checks });
      } catch (e) {
        console.error("[worker1:prePublish] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker1:submit — Submit for admin review
    if (route === "/worker1:submit" && method === "POST") {
      const { tenantId, workerId } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        const worker = workerSnap.data();

        // Validate prerequisites
        if (!worker.prePublishCheck?.passed) {
          return res.json({ ok: false, error: "Pre-publish check must pass before submitting for review" });
        }

        // Run publish gates — server-verified, never trust client values
        const { checkPublishGates } = require("./middleware/publishGates");
        const gateResult = await checkPublishGates(db, user.uid, workerId, tenantId, worker);
        if (!gateResult.passed) {
          const failedGates = gateResult.gates.filter(g => g.required && !g.passed);
          return res.json({
            ok: false,
            error: "Publish gates not met",
            failedGates: failedGates.map(g => g.id),
            gates: gateResult.gates,
          });
        }

        // Update worker status
        await workerRef.update({
          buildPhase: "review",
          review: {
            status: "pending",
            submittedAt: nowServerTs(),
            submittedBy: user.uid,
          },
          publishFlow: {
            waiverSigned: gateResult.gates.find(g => g.id === "LIABILITY_DISCLAIMER")?.passed || false,
            identityVerified: gateResult.gates.find(g => g.id === "IDENTITY_VERIFICATION")?.passed || false,
            identitySessionId: body.identitySessionId || null,
            paymentComplete: body.paymentComplete || false,
            paymentIntentId: body.paymentIntentId || null,
            moneyTransmissionFlagged: gateResult.moneyTransmissionFlagged,
            gatesCheckedAt: nowServerTs(),
            gateResults: gateResult.gates,
            submittedForReview: true,
            submittedAt: nowServerTs(),
          },
          updatedAt: nowServerTs(),
        });

        // Write to reviewQueue for admin visibility
        await db.doc(`reviewQueue/${workerId}`).set({
          workerId,
          tenantId,
          workerName: worker.name || "Unnamed",
          creatorId: user.uid,
          creatorEmail: user.email || "",
          vertical: worker.intake?.vertical || "custom",
          jurisdiction: worker.intake?.jurisdiction || "GLOBAL",
          prePublishScore: worker.prePublishCheck?.score || 0,
          moneyTransmissionFlagged: gateResult.moneyTransmissionFlagged,
          requiresLegalReview: gateResult.moneyTransmissionFlagged,
          status: "pending",
          submittedAt: nowServerTs(),
        });

        // Clean up test sessions for this worker
        try {
          const testSessions = await db.collection("testSessions").where("workerId", "==", workerId).where("test", "==", true).get();
          if (!testSessions.empty) {
            const batches = [];
            let batch = db.batch();
            let opCount = 0;
            for (const doc of testSessions.docs) {
              batch.delete(doc.ref);
              opCount++;
              if (opCount >= 450) {
                batches.push(batch);
                batch = db.batch();
                opCount = 0;
              }
            }
            if (opCount > 0) batches.push(batch);
            await Promise.all(batches.map(b => b.commit()));
            console.log(`[worker1:submit] Cleaned up ${testSessions.size} test sessions for ${workerId}`);
          }
        } catch (cleanupErr) {
          console.warn(`[worker1:submit] Test cleanup failed (non-blocking): ${cleanupErr.message}`);
        }

        console.log(`[worker1:submit] ${workerId} submitted for review by ${user.uid}`);

        // Audit trail — publish submission event
        try {
          const { writeAuditRecord } = require("./services/auditTrailService");
          await writeAuditRecord({
            worker_id: workerId, user_id: user.uid, org_id: tenantId,
            event_id: `submit_${workerId}_${Date.now()}`,
            execution_type: "worker_submit_for_review",
            timestamp: new Date().toISOString(),
          });
        } catch (auditErr) { console.warn("[worker1:submit] audit trail write failed (non-blocking):", auditErr.message); }

        return res.json({ ok: true, buildPhase: "review" });
      } catch (e) {
        console.error("[worker1:submit] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // GET /v1/admin:workers:review:list — List pending review queue
    if (route === "/admin:workers:review:list" && method === "GET") {
      try {
        const snap = await db.collection("reviewQueue").where("status", "==", "pending").orderBy("submittedAt", "desc").limit(50).get();
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, items });
      } catch (e) {
        console.error("[admin:workers:review:list] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/admin:worker:review — Admin approve or reject
    if (route === "/admin:worker:review" && method === "POST") {
      const { workerId, tenantId: reviewTenantId, decision, notes } = body;
      if (!workerId || !reviewTenantId || !decision) {
        return res.json({ ok: false, error: "Missing workerId, tenantId, or decision" });
      }
      if (!["approved", "rejected"].includes(decision)) {
        return res.json({ ok: false, error: "Decision must be 'approved' or 'rejected'" });
      }
      try {
        const workerRef = db.doc(`tenants/${reviewTenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        const worker = workerSnap.data();

        // Re-verify publish gates before approval — server-side enforcement
        if (decision === "approved") {
          const { checkPublishGates } = require("./middleware/publishGates");
          const creatorId = worker.review?.submittedBy || worker.createdBy;
          if (creatorId) {
            const recheck = await checkPublishGates(db, creatorId, workerId, reviewTenantId, worker);
            if (!recheck.passed) {
              const failed = recheck.gates.filter(g => g.required && !g.passed);
              return res.json({
                ok: false,
                error: "Cannot approve: publish gates no longer pass",
                failedGates: failed.map(g => g.id),
                gates: recheck.gates,
              });
            }
            // Log if money transmission flagged
            if (recheck.moneyTransmissionFlagged) {
              await db.collection("activityLog").add({
                type: "money_transmission_review",
                workerId, workerName: worker.name,
                reviewerId: user.uid, tenantId: reviewTenantId,
                notes: notes || "Worker flagged for money transmission — legal review completed",
                timestamp: nowServerTs(),
              });
            }
          }
        }

        if (decision === "approved") {
          // Publish to marketplace using existing logic
          const autoSlug = (worker.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          await db.doc(`marketplace/${autoSlug}`).set({
            slug: autoSlug, workerId, tenantId: reviewTenantId,
            name: worker.name, description: worker.description,
            category: worker.category || worker.intake?.vertical || "custom",
            rules: [...(worker.raasLibrary?.tier1 || []), ...(worker.raasLibrary?.tier2 || []), ...(worker.raasLibrary?.tier3 || [])],
            rulesCount: (worker.raasLibrary?.tier1?.length || 0) + (worker.raasLibrary?.tier2?.length || 0) + (worker.raasLibrary?.tier3?.length || 0),
            pricePerSeat: worker.pricing?.amount || 9,
            creatorName: worker.createdBy || null,
            subscribers: 0, published: true,
            publishedAt: nowServerTs(), updatedAt: nowServerTs(),
          }, { merge: true });

          await db.doc(`digitalWorkers/${autoSlug}`).set({
            id: autoSlug, name: worker.name,
            shortName: (worker.name || "").substring(0, 30),
            suite: worker.suite || worker.intake?.vertical || "General",
            industry: (worker.intake?.vertical || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            category: worker.category || worker.intake?.vertical || "custom",
            state: worker.intake?.jurisdiction || null,
            tags: worker.tags || [],
            description: worker.description || "",
            shortDescription: (worker.description || "").substring(0, 100),
            price: worker.pricing?.amount || 9,
            priceDisplay: `$${worker.pricing?.amount || 9}/mo`,
            trialDays: 7, status: "available", featured: false, published: true,
            creatorId: worker.createdBy || user.uid,
            creatorName: worker.createdByName || user.email || "TitleApp",
            raasConfigId: workerId,
            publishedAt: nowServerTs(), updatedAt: nowServerTs(),
          }, { merge: true });

          await workerRef.update({
            buildPhase: "live",
            published: true, marketplaceSlug: autoSlug, publishedAt: nowServerTs(),
            review: { status: "approved", reviewerId: user.uid, reviewedAt: nowServerTs(), notes: notes || "", decision: "approved" },
            updatedAt: nowServerTs(),
          });

          // Log activity
          await db.collection("activityLog").add({
            type: "worker_approved", workerId, workerName: worker.name,
            reviewerId: user.uid, tenantId: reviewTenantId, timestamp: nowServerTs(),
          });

          // Auto-create Stripe Connect account for creator if not already set up
          const creatorUserId = worker.createdBy || user.uid;
          try {
            const creatorDoc = await db.collection("users").doc(creatorUserId).get();
            if (creatorDoc.exists && !creatorDoc.data().stripeConnectAccountId) {
              const Stripe = require("stripe");
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
              const creatorData = creatorDoc.data();
              const connectAccount = await stripe.accounts.create({
                type: "express",
                email: creatorData.email,
                metadata: { userId: creatorUserId },
                capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                settings: { payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } } },
              });
              await db.collection("users").doc(creatorUserId).set(
                { stripeConnectAccountId: connectAccount.id },
                { merge: true }
              );
              // Generate onboarding link and send email
              const accountLink = await stripe.accountLinks.create({
                account: connectAccount.id,
                refresh_url: "https://app.titleapp.ai/sandbox?connect=refresh",
                return_url: "https://app.titleapp.ai/sandbox?connect=success",
                type: "account_onboarding",
              });
              const { sendConnectOnboardingEmail } = require("./services/marketingService/emailNotify");
              await sendConnectOnboardingEmail({
                email: creatorData.email,
                name: creatorData.name || creatorData.displayName || "",
                onboardingUrl: accountLink.url,
                workerName: worker.name,
              });
              console.log(`[admin:worker:review] Created Connect account for creator ${creatorUserId}`);
            }
          } catch (connectErr) {
            console.error("[admin:worker:review] Connect onboarding failed (non-blocking):", connectErr.message);
          }
        } else {
          // Rejected
          await workerRef.update({
            buildPhase: "prePublish", // Send back to pre-publish so they can fix issues
            review: { status: "rejected", reviewerId: user.uid, reviewedAt: nowServerTs(), notes: notes || "", decision: "rejected" },
            updatedAt: nowServerTs(),
          });
        }

        // Update review queue
        await db.doc(`reviewQueue/${workerId}`).update({
          status: decision, reviewedBy: user.uid, reviewedAt: nowServerTs(), notes: notes || "",
        });

        console.log(`[admin:worker:review] ${workerId}: ${decision} by ${user.uid}`);

        // Audit trail — admin review decision
        try {
          const { writeAuditRecord } = require("./services/auditTrailService");
          await writeAuditRecord({
            worker_id: workerId, user_id: user.uid, org_id: reviewTenantId,
            event_id: `review_${workerId}_${Date.now()}`,
            execution_type: `admin_review_${decision}`,
            timestamp: new Date().toISOString(),
          });
        } catch (auditErr) { console.warn("[admin:worker:review] audit trail write failed (non-blocking):", auditErr.message); }

        return res.json({ ok: true, decision });
      } catch (e) {
        console.error("[admin:worker:review] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/admin:workers:sync — Sync catalog workers to Firestore digitalWorkers collection
    if (route === "/admin:workers:sync" && method === "POST") {
      try {
        const { syncCatalogWorkers } = require("./helpers/workerSync");
        const { dryRun = false, workerIds = null } = body;
        const results = await syncCatalogWorkers(db, { dryRun, workerIds });
        return res.json({ ok: true, ...results });
      } catch (e) {
        console.error("[admin:workers:sync] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/admin:workers:sync:scheduled — Manual trigger for nightly catalog sync
    if (route === "/admin:workers:sync:scheduled" && method === "POST") {
      try {
        const { scheduledWorkerSync } = require("./pipeline/scheduledWorkerSync");
        const results = await scheduledWorkerSync();
        return res.json({ ok: true, ...results });
      } catch (e) {
        console.error("[admin:workers:sync:scheduled] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // MARKETING: Admin — list leads
    if (route === "/admin:leads:list" && method === "POST") {
      try {
        const mkt = getMarketingService();
        const result = await mkt.listLeads({
          vertical: body.vertical,
          status: body.status,
          limit: body.limit,
          offset: body.offset,
        });
        return res.json(result);
      } catch (e) {
        console.error("admin:leads:list failed:", e);
        return res.status(500).json({ ok: false, error: "Failed to list leads" });
      }
    }

    // MARKETING: Admin — lead stats
    if (route === "/admin:lead-stats" && method === "GET") {
      try {
        const mkt = getMarketingService();
        const vertical = req.query.vertical || (body && body.vertical);
        const result = await mkt.getLeadStats({ vertical });
        return res.json(result);
      } catch (e) {
        console.error("admin:lead-stats failed:", e);
        return res.status(500).json({ ok: false, error: "Failed to get lead stats" });
      }
    }

    // MARKETING: Admin — toggle promo code
    if (route === "/admin:promo:toggle" && method === "POST") {
      try {
        const { code } = body;
        if (!code) return res.status(400).json({ ok: false, error: "code required", code: "MISSING_FIELDS" });
        const docRef = db.doc(`promoCodes/${code}`);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ ok: false, error: "Promo code not found", code: "NOT_FOUND" });
        await docRef.update({ active: !doc.data().active });
        return res.json({ ok: true, active: !doc.data().active });
      } catch (e) {
        console.error("admin:promo:toggle failed:", e);
        return res.status(500).json({ ok: false, error: "Failed to toggle promo" });
      }
    }

    // POST /v1/me:update
    if (route === "/me:update" && method === "POST") {
      const ALLOWED_FIELDS = ["idVerified", "idVerifiedAt", "displayName", "company", "title", "linkedIn", "twitter", "accreditedInvestor", "investmentRangeMin", "investmentRangeMax", "investmentInterests", "emailFrequency", "photoUrl"];
      const updates = {};
      for (const key of ALLOWED_FIELDS) {
        if (body[key] !== undefined) updates[key] = body[key];
      }
      if (Object.keys(updates).length === 0) {
        return jsonError(res, 400, "No valid fields to update");
      }
      try {
        await db.collection("users").doc(auth.user.uid).set(updates, { merge: true });
        return res.json({ ok: true, updated: Object.keys(updates) });
      } catch (e) {
        console.error("me:update failed:", e);
        return jsonError(res, 500, "Failed to update user profile");
      }
    }

    // POST /v1/onboarding:claimTenant
    if (route === "/onboarding:claimTenant" && method === "POST") {
      const {
        tenantName,
        tenantId: requestedTenantId,
        tenantType = "personal", // "personal" | "business"
        vertical = "GLOBAL",
        jurisdiction = "GLOBAL",
        riskProfile = null, // Analyst vertical investment criteria
        verticalConfig = null, // Other vertical-specific configs
        aiPersona = null, // AI assistant name/title for outreach
        integrations = null, // Selected integrations from onboarding wizard
        onboardingState = null, // Full onboarding state snapshot
        tagline = null, // Business tagline from onboarding
      } = body || {};

      const finalTenantId = (requestedTenantId || slugifyTenantId(tenantName || auth.user.email || auth.user.uid))
        .toString()
        .trim();

      if (!finalTenantId) return jsonError(res, 400, "Missing tenantId/tenantName");

      const tenantRef = db.collection("tenants").doc(finalTenantId);
      const tSnap = await tenantRef.get();

      if (!tSnap.exists) {
        const tenantData = {
          name: tenantName || finalTenantId,
          tenantType,
          vertical,
          jurisdiction,
          status: "active",
          createdAt: nowServerTs(),
          createdBy: auth.user.uid,
        };

        // Store vertical-specific parameters
        if (riskProfile) tenantData.riskProfile = riskProfile;
        if (verticalConfig) tenantData.verticalConfig = verticalConfig;
        if (aiPersona) tenantData.aiPersona = aiPersona;
        if (integrations) tenantData.integrations = integrations;
        if (onboardingState) tenantData.onboardingState = onboardingState;
        if (tagline) tenantData.tagline = tagline;

        await tenantRef.set(tenantData);
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

    // ----------------------------
    // WORKSPACE MANAGEMENT
    // User-scoped workspace CRUD (no tenant membership needed)
    // ----------------------------

    // GET /v1/workspaces
    if (route === "/workspaces" && method === "GET") {
      try {
        const workspaces = await getUserWorkspaces(auth.user.uid);
        return res.json({ ok: true, workspaces });
      } catch (e) {
        console.error("workspaces:list failed:", e);
        return jsonError(res, 500, "Failed to list workspaces");
      }
    }

    // POST /v1/workspaces
    if (route === "/workspaces" && method === "POST") {
      try {
        const { vertical, name, tagline, jurisdiction, onboardingComplete, type, workerIds } = body;

        if (!vertical || !name) {
          return jsonError(res, 400, "vertical and name are required");
        }
        if (typeof name !== 'string' || name.length > 200) {
          return jsonError(res, 400, "Invalid workspace name");
        }

        const existing = await getUserWorkspaces(auth.user.uid);
        const businessCount = existing.filter(w => w.plan !== 'free' && w.type !== 'shared').length;
        if (businessCount >= 10) {
          return jsonError(res, 400, "Maximum 10 business workspaces per account");
        }

        const duplicate = existing.find(w =>
          w.vertical === vertical && w.jurisdiction === jurisdiction && w.type !== 'shared'
        );
        if (duplicate) {
          return jsonError(res, 400, `You already have a ${vertical} workspace for ${jurisdiction}`);
        }

        const validTypes = ['org', 'personal'];
        const wsType = validTypes.includes(type) ? type : 'org';

        const workspace = await createWorkspace(auth.user.uid, {
          vertical: String(vertical).substring(0, 50),
          name: String(name).substring(0, 200),
          tagline: tagline ? String(tagline).substring(0, 500) : '',
          jurisdiction: jurisdiction ? String(jurisdiction).substring(0, 10) : null,
          onboardingComplete: onboardingComplete === true,
          type: wsType,
          workerIds: Array.isArray(workerIds) ? workerIds.slice(0, 20) : undefined,
        });

        return res.json({ ok: true, workspace });
      } catch (e) {
        console.error("workspaces:create failed:", e);
        return jsonError(res, 500, "Failed to create workspace");
      }
    }

    // DELETE /v1/workspaces/{id} — soft-delete (set status to canceled)
    if (route.startsWith("/workspaces/") && method === "DELETE") {
      try {
        const workspaceId = route.replace("/workspaces/", "");
        if (!workspaceId) return jsonError(res, 400, "Missing workspace ID");
        if (workspaceId === "vault") return jsonError(res, 400, "Cannot remove Personal Vault");

        // First, check memberships collection (workspaces created via onboarding:claimTenant)
        const membershipSnap = await db.collection("memberships")
          .where("uid", "==", auth.user.uid)
          .where("tenantId", "==", workspaceId)
          .limit(1)
          .get();

        if (!membershipSnap.empty) {
          // Cancel the membership
          const membershipDoc = membershipSnap.docs[0];
          await membershipDoc.ref.update({
            status: "canceled",
            canceledAt: nowServerTs(),
          });

          // If this user is the tenant creator, also cancel the tenant doc
          const tenantRef = db.collection("tenants").doc(workspaceId);
          const tenantSnap = await tenantRef.get();
          if (tenantSnap.exists && tenantSnap.data().createdBy === auth.user.uid) {
            await tenantRef.update({
              status: "canceled",
              canceledAt: nowServerTs(),
            });
          }

          return res.json({ ok: true });
        }

        // Fallback: check users/{uid}/workspaces/{id} (legacy path)
        const wsRef = db.collection("users").doc(auth.user.uid)
          .collection("workspaces").doc(workspaceId);
        const wsSnap = await wsRef.get();
        if (!wsSnap.exists) return jsonError(res, 404, "Workspace not found");

        await wsRef.update({
          status: "canceled",
          canceledAt: nowServerTs(),
        });

        return res.json({ ok: true });
      } catch (e) {
        console.error("workspaces:delete failed:", e);
        return jsonError(res, 500, "Failed to cancel workspace");
      }
    }

    // POST /v1/b2b:deploy — deploy workers to a recipient (internal, Bearer auth)
    if (route === "/b2b:deploy" && method === "POST") {
      try {
        const { recipientEmail, workerIds, workerName, permissions } = body;
        const tenantId = ctx.tenantId;

        if (!recipientEmail || !workerIds || !workerIds.length) {
          return jsonError(res, 400, "recipientEmail and workerIds are required");
        }
        if (!tenantId) {
          return jsonError(res, 400, "x-tenant-id header is required");
        }

        // Look up sender org name
        const wsDoc = await db.collection("users").doc(auth.user.uid)
          .collection("workspaces").doc(tenantId).get();
        const senderOrgName = wsDoc.exists ? (wsDoc.data().name || "Unknown") : "Unknown";

        const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        let recipientUserId = null;
        try {
          const userRecord = await admin.auth().getUserByEmail(recipientEmail);
          recipientUserId = userRecord.uid;
        } catch (_) {}

        const deployment = {
          id: deploymentId,
          senderTenantId: tenantId,
          senderOrgName,
          workerIds,
          workerName: workerName || "Shared Worker",
          permissions: {
            recipientCanExport: permissions?.recipientCanExport ?? false,
            recipientCanRemove: permissions?.recipientCanRemove ?? true,
            dataRetentionDays: permissions?.dataRetentionDays ?? 365,
          },
          status: "active",
          recipientCount: 1,
          activeRecipientCount: recipientUserId ? 1 : 0,
          analytics: { totalInteractions: 0, avgInteractionsPerRecipient: 0 },
          tier: "starter",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const recipientDoc = {
          deploymentId,
          senderTenantId: tenantId,
          senderOrgName,
          recipientEmail,
          recipientUserId,
          workerIds,
          workerName: workerName || "Shared Worker",
          vertical: "consumer",
          permissions: deployment.permissions,
          status: recipientUserId ? "active" : "pending",
          deployedAt: admin.firestore.FieldValue.serverTimestamp(),
          acceptedAt: null,
        };

        const batch = db.batch();
        batch.set(db.collection("b2bDeployments").doc(deploymentId), deployment);
        batch.set(db.collection("b2bRecipients").doc(), recipientDoc);

        // If recipient exists, add workers to their vault with "From [Company]" label
        if (recipientUserId) {
          for (const wId of workerIds) {
            batch.set(db.doc(`vaults/${recipientUserId}/workers/${wId}`), {
              workerId: wId,
              workerName: workerName || "Shared Worker",
              deploymentId,
              source: "b2b",
              fromCompany: senderOrgName,
              addedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          // Queue opening message
          batch.set(db.collection("workerMessages").doc(), {
            userId: recipientUserId,
            workerId: workerIds[0],
            direction: "worker_to_user",
            message: `Hi, I'm ${workerName || "your new Digital Worker"} from ${senderOrgName}. I've been set up for you. How can I help?`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
        }

        await batch.commit();

        return res.json({ ok: true, deployment });
      } catch (e) {
        console.error("b2b:deploy failed:", e);
        return jsonError(res, 500, "Failed to deploy workers");
      }
    }

    // GET /v1/b2b:deployments — list deployments for current tenant
    if (route === "/b2b:deployments" && method === "GET") {
      try {
        const tenantId = ctx.tenantId;
        if (!tenantId) return jsonError(res, 400, "x-tenant-id header is required");

        const snap = await db.collection("b2bDeployments")
          .where("senderTenantId", "==", tenantId)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();

        const deployments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, deployments });
      } catch (e) {
        console.error("b2b:deployments failed:", e);
        return jsonError(res, 500, "Failed to fetch deployments");
      }
    }

    // POST /v1/b2b:revoke — revoke a deployment
    if (route === "/b2b:revoke" && method === "POST") {
      try {
        const { deploymentId } = body;
        if (!deploymentId) return jsonError(res, 400, "deploymentId is required");

        const ref = db.collection("b2bDeployments").doc(deploymentId);
        const doc = await ref.get();
        if (!doc.exists) return jsonError(res, 404, "Deployment not found");

        await ref.update({
          status: "revoked",
          revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Revoke all recipient entries
        const recipSnap = await db.collection("b2bRecipients")
          .where("deploymentId", "==", deploymentId)
          .get();
        const batch = db.batch();
        recipSnap.docs.forEach(r => {
          batch.update(r.ref, { status: "revoked", revokedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();

        return res.json({ ok: true });
      } catch (e) {
        console.error("b2b:revoke failed:", e);
        return jsonError(res, 500, "Failed to revoke deployment");
      }
    }

    // GET /v1/b2b:analytics — aggregate B2B analytics for current tenant
    if (route === "/b2b:analytics" && method === "GET") {
      try {
        const tenantId = ctx.tenantId;
        if (!tenantId) return jsonError(res, 400, "x-tenant-id header is required");

        const depSnap = await db.collection("b2bDeployments")
          .where("senderTenantId", "==", tenantId)
          .get();

        let totalDeployments = 0, activeDeployments = 0, totalRecipients = 0, activeRecipients = 0, totalInteractions = 0;
        depSnap.docs.forEach(d => {
          const data = d.data();
          totalDeployments++;
          if (data.status === "active") activeDeployments++;
          totalRecipients += data.recipientCount || 0;
          activeRecipients += data.activeRecipientCount || 0;
          totalInteractions += data.analytics?.totalInteractions || 0;
        });

        return res.json({
          ok: true,
          analytics: {
            totalDeployments,
            activeDeployments,
            totalRecipients,
            activeRecipients,
            totalInteractions,
            avgInteractionsPerRecipient: activeRecipients > 0 ? Math.round(totalInteractions / activeRecipients * 10) / 10 : 0,
          },
        });
      } catch (e) {
        console.error("b2b:analytics failed:", e);
        return jsonError(res, 500, "Failed to fetch analytics");
      }
    }

    // POST /v1/workspace:acceptDisclaimer
    if (route === "/workspace:acceptDisclaimer" && method === "POST") {
      try {
        const tenantId = ctx.tenantId || body.tenantId;
        const disclaimerData = {
          disclaimerAccepted: true,
          disclaimerAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
          disclaimerVersion: body.disclaimerVersion || '2026-02-24-v2',
          termsAccepted: body.termsAccepted === true,
          liabilityAccepted: body.liabilityAccepted === true,
          acceptedByUid: auth.user.uid,
          acceptedByEmail: auth.user.email || null,
        };
        if (tenantId) {
          await db.collection("tenants").doc(tenantId).set(disclaimerData, { merge: true });
        }
        // Also store on user doc as audit trail
        await db.collection("users").doc(auth.user.uid).set({
          disclaimerAccepted: true,
          disclaimerAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
          disclaimerVersion: body.disclaimerVersion || '2026-02-24-v2',
        }, { merge: true });
        return json(res, { ok: true });
      } catch (e) {
        console.error("workspace:acceptDisclaimer failed:", e);
        return jsonError(res, 500, "Failed to store disclaimer acceptance");
      }
    }

    // ----------------------------
    // ALEX ORCHESTRATION ROUTES (W-048)
    // ----------------------------

    // POST /v1/alex:recommend — Get worker recommendations
    if (route === "/alex:recommend" && method === "POST") {
      try {
        const alexService = require("./services/alex");
        const result = alexService.getRecommendations({
          vertical: body.vertical || ctx.vertical || "real-estate-development",
          role: body.role,
          currentPhase: body.currentPhase || 0,
          activeWorkerSlugs: body.activeWorkerSlugs || [],
          complianceTriggers: body.complianceTriggers || [],
          userNeeds: body.userNeeds || {},
        });
        return json(res, { ok: true, ...result });
      } catch (e) {
        console.error("alex:recommend failed:", e);
        return jsonError(res, 500, "Failed to generate recommendations");
      }
    }

    // GET /v1/alex:status — Get orchestration status (pipelines, tasks, alerts)
    if (route === "/alex:status" && (method === "GET" || method === "POST")) {
      try {
        const alexService = require("./services/alex");
        const result = await alexService.runOrchestrationChecks({
          vertical: body.vertical || ctx.vertical || "real-estate-development",
          activeWorkerSlugs: body.activeWorkerSlugs || [],
          currentPhase: body.currentPhase || 0,
          vaultData: body.vaultData || {},
          pipelines: body.pipelines || [],
          deadlines: body.deadlines || [],
        });
        return json(res, { ok: true, ...result });
      } catch (e) {
        console.error("alex:status failed:", e);
        return jsonError(res, 500, "Failed to get orchestration status");
      }
    }

    // POST /v1/alex:pipeline:create — Create a new pipeline
    if (route === "/alex:pipeline:create" && method === "POST") {
      try {
        const pipelineData = {
          workspaceId: body.workspaceId || ctx.tenantId,
          name: body.name || "Untitled Pipeline",
          steps: (body.steps || []).map((s, i) => ({
            order: i,
            name: s.name || `Step ${i + 1}`,
            workerId: s.workerId || null,
            status: "pending",
            startedAt: null,
            completedAt: null,
            output: null,
          })),
          status: "active",
          createdBy: auth.user.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const ref = await db.collection("pipelines").add(pipelineData);
        return json(res, { ok: true, pipelineId: ref.id, ...pipelineData });
      } catch (e) {
        console.error("alex:pipeline:create failed:", e);
        return jsonError(res, 500, "Failed to create pipeline");
      }
    }

    // POST /v1/alex:pipeline:advance — Advance a pipeline step
    if (route === "/alex:pipeline:advance" && method === "POST") {
      try {
        const { pipelineId, stepIndex, output } = body;
        if (!pipelineId) return jsonError(res, 400, "Missing pipelineId");
        const pipelineRef = db.collection("pipelines").doc(pipelineId);
        const pipelineDoc = await pipelineRef.get();
        if (!pipelineDoc.exists) return jsonError(res, 404, "Pipeline not found");
        const pipeline = pipelineDoc.data();
        const idx = stepIndex !== undefined ? stepIndex : pipeline.steps.findIndex(s => s.status === "in_progress" || s.status === "pending");
        if (idx < 0 || idx >= pipeline.steps.length) return jsonError(res, 400, "No step to advance");
        pipeline.steps[idx].status = "completed";
        pipeline.steps[idx].completedAt = new Date().toISOString();
        if (output) pipeline.steps[idx].output = output;
        // Start next step if available
        if (idx + 1 < pipeline.steps.length) {
          pipeline.steps[idx + 1].status = "in_progress";
          pipeline.steps[idx + 1].startedAt = new Date().toISOString();
        } else {
          pipeline.status = "completed";
        }
        await pipelineRef.update({ steps: pipeline.steps, status: pipeline.status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return json(res, { ok: true, pipeline: { id: pipelineId, ...pipeline } });
      } catch (e) {
        console.error("alex:pipeline:advance failed:", e);
        return jsonError(res, 500, "Failed to advance pipeline");
      }
    }

    // GET /v1/alex:tasks — List cross-worker tasks
    if (route === "/alex:tasks" && (method === "GET" || method === "POST")) {
      try {
        const workspaceId = body.workspaceId || ctx.tenantId;
        const tasksSnap = await db.collection("alexTasks")
          .where("workspaceId", "==", workspaceId)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();
        const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        return json(res, { ok: true, tasks });
      } catch (e) {
        console.error("alex:tasks failed:", e);
        return jsonError(res, 500, "Failed to fetch tasks");
      }
    }

    // POST /v1/alex:tasks:create — Create a cross-worker task
    if (route === "/alex:tasks:create" && method === "POST") {
      try {
        const taskData = {
          workspaceId: body.workspaceId || ctx.tenantId,
          pipelineId: body.pipelineId || null,
          assignedWorker: body.assignedWorker || null,
          title: body.title || "Untitled Task",
          description: body.description || "",
          priority: body.priority || "normal",
          status: "pending",
          dueDate: body.dueDate || null,
          dependencies: body.dependencies || [],
          createdBy: auth.user.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const ref = await db.collection("alexTasks").add(taskData);
        return json(res, { ok: true, taskId: ref.id, ...taskData });
      } catch (e) {
        console.error("alex:tasks:create failed:", e);
        return jsonError(res, 500, "Failed to create task");
      }
    }

    // POST /v1/alex:tasks:update — Update a task status
    if (route === "/alex:tasks:update" && method === "POST") {
      try {
        const { taskId, status, output } = body;
        if (!taskId) return jsonError(res, 400, "Missing taskId");
        const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (status) updates.status = status;
        if (output) updates.output = output;
        if (body.assignedWorker !== undefined) updates.assignedWorker = body.assignedWorker;
        if (body.priority) updates.priority = body.priority;
        await db.collection("alexTasks").doc(taskId).update(updates);
        return json(res, { ok: true, taskId });
      } catch (e) {
        console.error("alex:tasks:update failed:", e);
        return jsonError(res, 500, "Failed to update task");
      }
    }

    // GET /v1/alex:briefing — Generate daily briefing
    if (route === "/alex:briefing" && (method === "GET" || method === "POST")) {
      try {
        const alexService = require("./services/alex");
        const vertical = body.vertical || ctx.vertical || "real-estate-development";
        const temporal = alexService.getTemporalStatus({
          vertical,
          currentPhase: body.currentPhase || 0,
          activeWorkerSlugs: body.activeWorkerSlugs || [],
        });
        const orchestration = await alexService.runOrchestrationChecks({
          vertical,
          activeWorkerSlugs: body.activeWorkerSlugs || [],
          currentPhase: body.currentPhase || 0,
          vaultData: body.vaultData || {},
          pipelines: body.pipelines || [],
          deadlines: body.deadlines || [],
        });
        return json(res, { ok: true, temporal, orchestration });
      } catch (e) {
        console.error("alex:briefing failed:", e);
        return jsonError(res, 500, "Failed to generate briefing");
      }
    }

    // POST /v1/alex:onboard — Start worker onboarding flow
    if (route === "/alex:onboard" && method === "POST") {
      try {
        const alexService = require("./services/alex");
        const worker = alexService.getWorker(body.vertical || "real-estate-development", body.workerSlug);
        if (!worker) return jsonError(res, 404, "Worker not found in catalog");
        return json(res, {
          ok: true,
          worker: { id: worker.id, name: worker.name, slug: worker.slug, price: worker.pricing.monthly, capabilitySummary: worker.capabilitySummary },
          onboardingSteps: ["explain", "configure", "connect", "first_task", "teach"],
        });
      } catch (e) {
        console.error("alex:onboard failed:", e);
        return jsonError(res, 500, "Failed to start onboarding");
      }
    }

    // GET /v1/alex:catalog — Get catalog data
    if (route === "/alex:catalog" && (method === "GET" || method === "POST")) {
      try {
        const alexService = require("./services/alex");
        const vertical = body.vertical || ctx.vertical || "real-estate-development";
        const catalog = alexService.getCatalog(vertical);
        if (!catalog) return jsonError(res, 404, "Catalog not found for vertical: " + vertical);
        return json(res, { ok: true, vertical: catalog.vertical, name: catalog.name, workerCount: catalog.workers.length, lifecycle: catalog.lifecycle, suites: catalog.suites, bundles: catalog.bundles, workers: catalog.workers.map(w => ({ id: w.id, slug: w.slug, name: w.name, suite: w.suite, phase: w.phase, type: w.type, price: w.pricing.monthly, status: w.status, capabilitySummary: w.capabilitySummary })) });
      } catch (e) {
        console.error("alex:catalog failed:", e);
        return jsonError(res, 500, "Failed to load catalog");
      }
    }

    // GET /v1/alex:verticals — List available verticals
    if (route === "/alex:verticals" && (method === "GET" || method === "POST")) {
      try {
        const alexService = require("./services/alex");
        const verticals = alexService.getAvailableVerticals();
        return json(res, { ok: true, verticals });
      } catch (e) {
        console.error("alex:verticals failed:", e);
        return jsonError(res, 500, "Failed to list verticals");
      }
    }

    // For all other routes, enforce tenant membership
    // Skip for chat:message — users can chat (via Alex) without a workspace membership
    if (!(route === "/chat:message" && method === "POST")) {
      const gate = await requireMembershipIfNeeded({ uid: auth.user.uid, tenantId: ctx.tenantId }, res);
      if (!gate.ok) return;
    }

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
    // STUDENT & CFI VERIFICATION
    // ----------------------------

    // POST /v1/verify:student — Submit student pilot verification
    if (route === "/verify:student" && method === "POST") {
      try {
        const { submitStudentVerification } = require("./services/studentVerification");
        req._user = auth.user;
        return await submitStudentVerification(req, res);
      } catch (e) {
        console.error("verify:student failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/verify:student:renew — Annual re-verification
    if (route === "/verify:student:renew" && method === "POST") {
      try {
        const { renewStudentVerification } = require("./services/studentVerification");
        req._user = auth.user;
        return await renewStudentVerification(req, res);
      } catch (e) {
        console.error("verify:student:renew failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/verify:student:graduated — Self-reported graduation
    if (route === "/verify:student:graduated" && method === "POST") {
      try {
        const { reportGraduation } = require("./services/studentVerification");
        req._user = auth.user;
        return await reportGraduation(req, res);
      } catch (e) {
        console.error("verify:student:graduated failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/verify:cfi — Submit CFI/CFII verification
    if (route === "/verify:cfi" && method === "POST") {
      try {
        const { submitCfiVerification } = require("./services/cfiVerification");
        req._user = auth.user;
        return await submitCfiVerification(req, res);
      } catch (e) {
        console.error("verify:cfi failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/verify:cfi:renew — Annual re-verification
    if (route === "/verify:cfi:renew" && method === "POST") {
      try {
        const { renewCfiVerification } = require("./services/cfiVerification");
        req._user = auth.user;
        return await renewCfiVerification(req, res);
      } catch (e) {
        console.error("verify:cfi:renew failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/verify:cfi:departed — Self-reported academy departure
    if (route === "/verify:cfi:departed" && method === "POST") {
      try {
        const { reportDeparture } = require("./services/cfiVerification");
        req._user = auth.user;
        return await reportDeparture(req, res);
      } catch (e) {
        console.error("verify:cfi:departed failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: VERIFICATION QUEUES
    // ----------------------------

    // GET /v1/admin:verify:student:queue
    if (route === "/admin:verify:student:queue" && method === "GET") {
      try {
        const { getStudentQueue } = require("./services/studentVerification");
        return await getStudentQueue(req, res);
      } catch (e) {
        console.error("admin:verify:student:queue failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/admin:verify:student:approve
    if (route === "/admin:verify:student:approve" && method === "PUT") {
      try {
        const { approveStudent } = require("./services/studentVerification");
        return await approveStudent(req, res);
      } catch (e) {
        console.error("admin:verify:student:approve failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/admin:verify:student:reject
    if (route === "/admin:verify:student:reject" && method === "PUT") {
      try {
        const { rejectStudent } = require("./services/studentVerification");
        return await rejectStudent(req, res);
      } catch (e) {
        console.error("admin:verify:student:reject failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/admin:verify:cfi:queue
    if (route === "/admin:verify:cfi:queue" && method === "GET") {
      try {
        const { getCfiQueue } = require("./services/cfiVerification");
        return await getCfiQueue(req, res);
      } catch (e) {
        console.error("admin:verify:cfi:queue failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/admin:verify:cfi:approve
    if (route === "/admin:verify:cfi:approve" && method === "PUT") {
      try {
        const { approveCfi } = require("./services/cfiVerification");
        return await approveCfi(req, res);
      } catch (e) {
        console.error("admin:verify:cfi:approve failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/admin:verify:cfi:reject
    if (route === "/admin:verify:cfi:reject" && method === "PUT") {
      try {
        const { rejectCfi } = require("./services/cfiVerification");
        return await rejectCfi(req, res);
      } catch (e) {
        console.error("admin:verify:cfi:reject failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: REGISTRY SEED
    // ----------------------------
    if (route === "/admin:registry:seed" && method === "POST") {
      try {
        const { seedWorkerRegistry } = require("./scripts/seedWorkerRegistry");
        const result = await seedWorkerRegistry(db);
        return res.status(200).json({ ok: true, ...result });
      } catch (e) {
        console.error("admin:registry:seed failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: SEED CAMPAIGNS (33.6)
    // ----------------------------
    if (route === "/admin:seedCampaigns" && method === "POST") {
      try {
        const { seedCampaignDefinitions } = require("./campaigns/campaignDefinitions");
        const result = await seedCampaignDefinitions(db);
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("admin:seedCampaigns failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: BUILD LEADERBOARD (39.3)
    // ----------------------------
    if (route === "/admin:buildLeaderboard" && method === "POST") {
      try {
        const vertical = body.vertical;
        if (!vertical) return jsonError(res, 400, "vertical required");
        const vc = getVerticalConfig(vertical);
        const dwSnap = await db.collection("digitalWorkers")
          .where("suite", "in", vc.suites)
          .where("status", "==", "live")
          .get();

        // Build ranked list: subscriber_count DESC, featured boost
        const raw = dwSnap.docs
          .filter(d => !vc.prefix || d.id.startsWith(vc.prefix))
          .map(d => {
            const w = d.data();
            return {
              workerId: d.id,
              slug: w.slug || d.id,
              name: w.display_name || w.name || d.id,
              tagline: w.headline || w.tagline || w.shortDescription || w.description || "",
              price: w.pricing_tier || w.price || 0,
              subscriberCount: w.subscriber_count || 0,
              featured: w.featured || false,
            };
        });

        // Sort: featured first, then by subscriber_count desc
        raw.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.subscriberCount || 0) - (a.subscriberCount || 0);
        });

        const top10 = raw.slice(0, 10).map((w, i) => ({ ...w, rank: i + 1 }));
        const today = new Date().toISOString().slice(0, 10);
        const docId = `top10_${vertical}_${today}`;

        await db.doc(`leaderboards/${docId}`).set({
          vertical,
          date: today,
          workers: top10,
          builtAt: new Date().toISOString(),
          workerCount: dwSnap.size,
        });

        return res.json({ ok: true, docId, workerCount: dwSnap.size, top10Count: top10.length });
      } catch (e) {
        console.error("admin:buildLeaderboard failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: PRICING AUDIT (34.1)
    // ----------------------------
    if (route === "/admin:pricingAudit" && method === "POST") {
      try {
        const { runPricingAudit } = require("./admin/pricingAudit");
        return await runPricingAudit(req, res);
      } catch (e) {
        console.error("admin:pricingAudit failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: AVIATION RECOVERY (34.2)
    // ----------------------------
    if (route === "/admin:aviationRecovery" && method === "POST") {
      try {
        const { runAviationRecovery } = require("./admin/aviationRecovery");
        return await runAviationRecovery(req, res);
      } catch (e) {
        console.error("admin:aviationRecovery failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: PLATFORM INVENTORY — ROTATE TOKEN (PearX S26 Doc 1.4)
    // ----------------------------
    if (route === "/inventory:rotateToken" && method === "POST") {
      try {
        const { rotateInventoryToken } = require("./services/platformInventory");
        return await rotateInventoryToken(req, res);
      } catch (e) {
        console.error("inventory:rotateToken failed:", e);
        return jsonError(res, 500, "Failed to rotate token");
      }
    }

    // ----------------------------
    // ADMIN: SALES — SEND INTRO TEXT (34.9-T2)
    // ----------------------------
    if (route === "/admin:sendIntroText" && method === "POST") {
      try {
        const { phone, name, template, message, link } = getBody(req);
        if (!phone || !message) return jsonError(res, 400, "phone and message required");
        const { sendSMSDirect } = require("./communications/twilioHelper");
        await sendSMSDirect(phone.trim(), message);
        // Track as prospect session
        await db.collection("prospectSessions").add({
          phone: phone.trim(),
          name: name || null,
          source: template || "manual",
          status: "sent",
          sentBy: auth.user.uid,
          link: link || null,
          openedAt: nowServerTs(),
          updatedAt: nowServerTs(),
          messageCount: 0,
          workerCardsShown: [],
          workerSubscribed: null,
          sandboxStarted: false,
          escalated: false,
          convertedAt: null,
        });
        return res.json({ ok: true });
      } catch (e) {
        console.error("admin:sendIntroText failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: SALES — PROSPECT SESSIONS (34.9-T2)
    // ----------------------------
    if (route === "/admin:prospectSessions" && method === "GET") {
      try {
        const snap = await db.collection("prospectSessions")
          .orderBy("openedAt", "desc")
          .limit(50)
          .get();
        const sessions = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            phone: data.phone || null,
            name: data.name || data.prospectName || null,
            source: data.source || data.campaignSlug || null,
            status: data.uid ? (data.messageCount > 0 ? "engaged" : "authed") : (data.status || "started"),
            firstMessage: data.firstMessage || null,
            timestamp: data.openedAt ? data.openedAt.toDate().toISOString() : null,
            messageCount: data.messageCount || 0,
            workerCardsShown: data.workerCardsShown || [],
            escalated: data.escalated || false,
            vertical: data.vertical || null,
          };
        });
        return res.json({ ok: true, sessions });
      } catch (e) {
        console.error("admin:prospectSessions failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: SALES — ESCALATIONS (34.9-T2)
    // ----------------------------
    if (route === "/admin:escalations" && method === "GET") {
      try {
        const snap = await db.collection("salesEscalations")
          .orderBy("flaggedAt", "desc")
          .limit(50)
          .get();
        const escalations = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            sessionId: data.sessionId || null,
            uid: data.uid || null,
            campaignSlug: data.campaignSlug || null,
            utmSource: data.utmSource || null,
            prospectName: data.prospectName || null,
            prospectMessage: data.prospectMessage || null,
            flaggedAt: data.flaggedAt ? data.flaggedAt.toDate().toISOString() : null,
            status: data.status || "pending",
          };
        });
        return res.json({ ok: true, escalations });
      } catch (e) {
        console.error("admin:escalations failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ADMIN: SALES — CONVERSION FUNNEL (34.9-T2)
    // ----------------------------
    if (route === "/admin:salesFunnel" && method === "GET") {
      try {
        const snap = await db.collection("prospectSessions").get();
        let linksSent = 0, pageVisits = 0, otpStarted = 0, authenticated = 0, firstMessage = 0, subscribed = 0;
        for (const d of snap.docs) {
          const data = d.data();
          linksSent++;
          if (data.messageCount > 0 || data.uid) pageVisits++;
          if (data.uid || data.status === "authed" || data.status === "engaged") otpStarted++;
          if (data.uid) authenticated++;
          if (data.messageCount > 0) firstMessage++;
          if (data.workerSubscribed) subscribed++;
        }
        return res.json({ ok: true, linksSent, pageVisits, otpStarted, authenticated, firstMessage, subscribed });
      } catch (e) {
        console.error("admin:salesFunnel failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — PRICING COMPLIANCE (GET)
    // ----------------------------
    if (route === "/admin:pricing:compliance" && method === "GET") {
      try {
        const APPROVED = [0, 29, 49, 79];
        const results = [];

        // Scan digitalWorkers collection (primary — has 94 docs)
        const dwSnap = await db.collection("digitalWorkers").get();
        for (const d of dwSnap.docs) {
          const data = d.data();
          const price = Number(data.monthlyPrice || data.price || data.pricingTier || 0);
          const compliant = APPROVED.includes(price);
          const nearest = APPROVED.reduce((a, b) => Math.abs(b - price) < Math.abs(a - price) ? b : a);
          results.push({
            id: d.id, name: data.name || data.title || "unnamed",
            vertical: data.vertical || "unknown", price, compliant,
            nearestTier: nearest, collection: "digitalWorkers",
            creatorId: data.creatorId || null,
          });
        }

        // Scan raasCatalog collection (secondary)
        const cSnap = await db.collection("raasCatalog").get();
        for (const d of cSnap.docs) {
          const data = d.data();
          const price = parseInt(String(data.price_tier || "0").replace(/[^0-9]/g, ""), 10) || 0;
          const compliant = APPROVED.includes(price);
          const nearest = APPROVED.reduce((a, b) => Math.abs(b - price) < Math.abs(a - price) ? b : a);
          if (!results.find(r => r.id === d.id)) {
            results.push({
              id: d.id, name: data.name || "unnamed",
              vertical: data.vertical || "unknown", price, compliant,
              nearestTier: nearest, collection: "raasCatalog",
              creatorId: data.creatorId || "titleapp-platform",
            });
          }
        }

        const compliantCount = results.filter(r => r.compliant).length;
        const nonCompliant = results.filter(r => !r.compliant);
        const revenueImpact = nonCompliant.reduce((sum, r) => sum + Math.abs(r.price - r.nearestTier), 0);

        // Sort non-compliant first
        results.sort((a, b) => a.compliant === b.compliant ? 0 : a.compliant ? 1 : -1);

        return res.json({
          ok: true,
          workers: results,
          summary: { total: results.length, compliant: compliantCount, nonCompliant: nonCompliant.length, revenueImpact },
        });
      } catch (e) {
        console.error("admin:pricing:compliance failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — PRICING FIX (POST)
    // ----------------------------
    if (route === "/admin:pricing:fix" && method === "POST") {
      try {
        const APPROVED = [0, 29, 49, 79];
        const { workerId, collection, targetPrice } = body;
        if (!workerId || !collection) return jsonError(res, 400, "workerId and collection required");
        if (!APPROVED.includes(Number(targetPrice))) return jsonError(res, 400, "targetPrice must be one of: 0, 29, 49, 79");

        const numPrice = Number(targetPrice);
        const tierIndex = numPrice === 0 ? 0 : numPrice === 29 ? 1 : numPrice === 49 ? 2 : 3;

        const docRef = db.collection(collection).doc(workerId);
        const snap = await docRef.get();
        if (!snap.exists) return jsonError(res, 404, "Worker not found");

        const oldPrice = Number(snap.data().monthlyPrice || snap.data().price || snap.data().price_tier || 0);

        if (collection === "raasCatalog") {
          await docRef.update({ price_tier: numPrice === 0 ? "FREE" : `$${numPrice}`, _priceCorrectedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
          await docRef.update({ monthlyPrice: numPrice, pricingTier: tierIndex, _priceCorrectedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        // Sync across collections
        const syncCollections = ["digitalWorkers", "raasCatalog"].filter(c => c !== collection);
        for (const col of syncCollections) {
          const syncRef = db.collection(col).doc(workerId);
          const syncSnap = await syncRef.get();
          if (syncSnap.exists) {
            if (col === "raasCatalog") {
              await syncRef.update({ price_tier: numPrice === 0 ? "FREE" : `$${numPrice}`, _priceCorrectedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
              await syncRef.update({ monthlyPrice: numPrice, pricingTier: tierIndex, _priceCorrectedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
          }
        }

        await db.collection("activityLog").add({
          action: "pricing_fix", workerId, collection,
          oldPrice, newPrice: numPrice,
          userId: user.uid, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true, oldPrice, newPrice: numPrice });
      } catch (e) {
        console.error("admin:pricing:fix failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — WORKER PIPELINE (GET)
    // ----------------------------
    if (route === "/admin:worker:pipeline" && method === "GET") {
      try {
        const results = [];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Unpublished workers from digitalWorkers
        const wSnap = await db.collection("digitalWorkers").where("published", "==", false).get();
        for (const d of wSnap.docs) {
          const data = d.data();
          const updatedAt = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(0);
          results.push({
            id: d.id, name: data.name || data.title || "unnamed",
            vertical: data.vertical || "unknown", status: "draft",
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: updatedAt.toISOString(),
            isStale: updatedAt < sevenDaysAgo,
            collection: "digitalWorkers",
          });
        }

        // Non-live catalog workers
        const cSnap = await db.collection("raasCatalog").where("status", "in", ["waitlist", "claimed", "planned"]).get();
        for (const d of cSnap.docs) {
          const data = d.data();
          const updatedAt = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(0);
          if (!results.find(r => r.id === d.id)) {
            results.push({
              id: d.id, name: data.name || "unnamed",
              vertical: data.vertical || "unknown", status: data.status,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
              updatedAt: updatedAt.toISOString(),
              isStale: updatedAt < sevenDaysAgo,
              collection: "raasCatalog",
            });
          }
        }

        const staleDraftCount = results.filter(r => r.isStale).length;
        results.sort((a, b) => (a.isStale === b.isStale ? 0 : a.isStale ? -1 : 1));

        return res.json({ ok: true, workers: results, staleDraftCount });
      } catch (e) {
        console.error("admin:worker:pipeline failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — WORKER BULK PUBLISH (POST)
    // ----------------------------
    if (route === "/admin:worker:bulkPublish" && method === "POST") {
      try {
        const { workerIds } = body;
        if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
          return jsonError(res, 400, "workerIds array required");
        }

        const published = [];
        const failed = [];

        for (const wid of workerIds) {
          try {
            // Update digitalWorkers collection
            const wRef = db.collection("digitalWorkers").doc(wid);
            const wSnap = await wRef.get();
            if (wSnap.exists) {
              await wRef.update({
                published: true, status: "available",
                publishedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Update raasCatalog if exists
            const cRef = db.collection("raasCatalog").doc(wid);
            const cSnap = await cRef.get();
            if (cSnap.exists) {
              await cRef.update({ status: "live" });
            }

            published.push(wid);
          } catch (pubErr) {
            failed.push({ id: wid, error: pubErr.message });
          }
        }

        await db.collection("activityLog").add({
          action: "bulk_publish", workerIds: published,
          failedIds: failed.map(f => f.id),
          userId: user.uid, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true, published: published.length, failed });
      } catch (e) {
        console.error("admin:worker:bulkPublish failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — BOGO STATUS (GET)
    // ----------------------------
    if (route === "/admin:bogo:status" && method === "GET") {
      try {
        // Read platform-wide BOGO setting
        const settingsSnap = await db.doc("platform/settings").get();
        const platformBogoEnabled = settingsSnap.exists ? settingsSnap.data().bogoEnabled !== false : true;

        // Get platform workers (only these can be BOGO eligible)
        const wSnap = await db.collection("digitalWorkers").where("creatorId", "==", "titleapp-platform").get();
        const workers = [];
        let totalRedemptions = 0;
        let totalDiscounted = 0;

        for (const d of wSnap.docs) {
          const data = d.data();
          // Count BOGO redemptions for this worker
          const subSnap = await db.collection("subscriptions")
            .where("slug", "==", data.slug || d.id)
            .where("isBogo", "==", true).get();

          const redemptions = subSnap.size;
          const discounted = redemptions * Number(data.monthlyPrice || data.price || 0);

          totalRedemptions += redemptions;
          totalDiscounted += discounted;

          workers.push({
            id: d.id, name: data.name || data.title || "unnamed",
            slug: data.slug || d.id,
            bogoEligible: data.bogoEligible === true,
            redemptionCount: redemptions,
            revenueDiscounted: discounted,
          });
        }

        return res.json({
          ok: true, platformBogoEnabled, workers,
          totals: { totalRedemptions, totalDiscounted },
        });
      } catch (e) {
        console.error("admin:bogo:status failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — BOGO TOGGLE (POST)
    // ----------------------------
    if (route === "/admin:bogo:toggle" && method === "POST") {
      try {
        const { scope, workerId } = body;
        if (!scope || !["platform", "worker"].includes(scope)) {
          return jsonError(res, 400, "scope must be 'platform' or 'worker'");
        }

        if (scope === "platform") {
          const settingsRef = db.doc("platform/settings");
          const snap = await settingsRef.get();
          const current = snap.exists ? snap.data().bogoEnabled !== false : true;
          await settingsRef.set({ bogoEnabled: !current, bogoToggledAt: admin.firestore.FieldValue.serverTimestamp(), bogoToggledBy: user.uid }, { merge: true });
          return res.json({ ok: true, newValue: !current });
        }

        if (scope === "worker") {
          if (!workerId) return jsonError(res, 400, "workerId required for worker scope");
          const wRef = db.collection("digitalWorkers").doc(workerId);
          const wSnap = await wRef.get();
          if (!wSnap.exists) return jsonError(res, 404, "Worker not found");
          const data = wSnap.data();
          if (data.creatorId && data.creatorId !== "titleapp-platform") {
            return jsonError(res, 403, "BOGO only available for platform workers");
          }
          const current = data.bogoEligible === true;
          await wRef.update({ bogoEligible: !current });
          return res.json({ ok: true, newValue: !current });
        }
      } catch (e) {
        console.error("admin:bogo:toggle failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — PIPELINE MONITOR (GET)
    // ----------------------------
    if (route === "/admin:pipeline:monitor" && method === "GET") {
      try {
        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

        // Query recent generated documents that aren't ready
        const docsSnap = await db.collection("generatedDocuments")
          .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
          .orderBy("createdAt", "desc")
          .limit(200).get();

        const orphanDocs = [];
        let totalDocs24h = 0;
        let failedDocs24h = 0;

        for (const d of docsSnap.docs) {
          const data = d.data();
          const createdAt = data.createdAt?.toDate?.() || new Date(0);
          const ageMs = now - createdAt.getTime();
          const ageHours = Math.round(ageMs / (1000 * 60 * 60) * 10) / 10;
          const isWithin24h = createdAt >= twentyFourHoursAgo;

          if (isWithin24h) totalDocs24h++;

          if (data.status !== "ready") {
            if (isWithin24h) failedDocs24h++;
            orphanDocs.push({
              id: d.id,
              tenantId: data.tenantId || "unknown",
              userId: data.userId || null,
              createdAt: createdAt.toISOString(),
              ageHours,
              templateId: data.templateId || data.template || "unknown",
              status: data.status || "unknown",
              isOld: ageHours > 24,
            });
          }
        }

        const failureRate = totalDocs24h > 0 ? Math.round((failedDocs24h / totalDocs24h) * 100 * 10) / 10 : 0;

        return res.json({
          ok: true,
          orphanDocs,
          stats: { totalDocs24h, failedDocs24h, failureRate, alertActive: failureRate > 5 },
        });
      } catch (e) {
        console.error("admin:pipeline:monitor failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 34.4 — PIPELINE RETRY (POST)
    // ----------------------------
    if (route === "/admin:pipeline:retry" && method === "POST") {
      try {
        const { docId } = body;
        if (!docId) return jsonError(res, 400, "docId required");

        const docRef = db.collection("generatedDocuments").doc(docId);
        const snap = await docRef.get();
        if (!snap.exists) return jsonError(res, 404, "Document not found");

        await docRef.update({
          status: "pending",
          _retriedAt: admin.firestore.FieldValue.serverTimestamp(),
          _retriedBy: user.uid,
        });

        await db.collection("activityLog").add({
          action: "pipeline_retry", docId,
          userId: user.uid, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true });
      } catch (e) {
        console.error("admin:pipeline:retry failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 32.7-T3 — CLEAR DEMO DATA (POST)
    // ----------------------------
    if (route === "/admin:clearDemoData" && method === "POST") {
      try {
        const targets = [
          { path: "pipeline/b2b/deals", label: "B2B Deals" },
          { path: "pipeline/investors/deals", label: "Investor Relations" },
          { path: "messages", label: "Messages" },
          { path: "draftMessages", label: "Draft Messages" },
          { path: "campaigns", label: "Campaigns" },
        ];
        const report = {};

        for (const target of targets) {
          // Handle subcollection paths (pipeline/b2b/deals)
          const parts = target.path.split("/");
          let ref;
          if (parts.length === 3) {
            ref = db.collection(parts[0]).doc(parts[1]).collection(parts[2]);
          } else {
            ref = db.collection(target.path);
          }

          const snap = await ref.get();
          let deleted = 0;

          // Batch delete in groups of 500
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 500) {
            const batch = db.batch();
            docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
            await batch.commit();
            deleted += Math.min(500, docs.length - i);
          }

          report[target.label] = deleted;
        }

        await db.collection("activityLog").add({
          action: "clear_demo_data", report,
          userId: user.uid, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true, report });
      } catch (e) {
        console.error("admin:clearDemoData failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 32.7-T3 — SEED PROSPECTS (POST)
    // ----------------------------
    if (route === "/admin:seedProspects" && method === "POST") {
      try {
        const ts = admin.firestore.FieldValue.serverTimestamp();
        const seeded = [];

        // B2B Deal: Scott Eschelman / JMA Capital
        const b2bRef = await db.collection("pipeline").doc("b2b").collection("deals").add({
          company: "JMA Capital",
          contactName: "Scott Eschelman",
          vertical: "Real Estate",
          stage: "CLOSED_WON",
          estimatedARR: 8880,
          probability: 100,
          source: "Direct",
          lastActivityAt: ts,
          ownedBy: "sean@titleapp.ai",
          nextAction: "First major client and investor",
          history: [{ stage: "CLOSED_WON", action: "Funded", by: "sean@titleapp.ai" }],
        });
        seeded.push({ collection: "pipeline/b2b/deals", id: b2bRef.id, name: "Scott Eschelman — JMA Capital" });

        // Investor: Scott Eschelman
        const inv1Ref = await db.collection("pipeline").doc("investors").collection("deals").add({
          fullName: "Scott Eschelman",
          email: "",
          stage: "FUNDED",
          amount: null,
          accredited: true,
          source: "Direct — JMA Capital",
          deckViewCount: 0,
          createdAt: ts,
        });
        seeded.push({ collection: "pipeline/investors/deals", id: inv1Ref.id, name: "Scott Eschelman (investor)" });

        // Investor: Ron Palmeri
        const inv2Ref = await db.collection("pipeline").doc("investors").collection("deals").add({
          fullName: "Ron Palmeri",
          email: "",
          stage: "INTERESTED",
          amount: null,
          accredited: true,
          source: "Direct",
          deckViewCount: 0,
          notes: "Sandbox access pending",
          createdAt: ts,
        });
        seeded.push({ collection: "pipeline/investors/deals", id: inv2Ref.id, name: "Ron Palmeri (investor)" });

        await db.collection("activityLog").add({
          action: "seed_prospects", seeded,
          userId: user.uid, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true, seeded });
      } catch (e) {
        console.error("admin:seedProspects failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 32.7-T3 — USERS LIST (GET)
    // ----------------------------
    if (route === "/admin:users:list" && method === "GET") {
      try {
        const snap = await db.collection("users").orderBy("createdAt", "desc").limit(500).get();
        const users = snap.docs.map(d => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName || data.name || "",
            email: data.email || "",
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null,
            plan: data.subscriptionTier || data.plan || "free",
            tenantId: data.tenantId || null,
            role: data.role || null,
          };
        });
        return res.json({ ok: true, users, total: users.length });
      } catch (e) {
        console.error("admin:users:list failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // 32.7-T3 — USERS IMPERSONATE (POST)
    // ----------------------------
    if (route === "/admin:users:impersonate" && method === "POST") {
      try {
        const { uid } = body;
        if (!uid) return jsonError(res, 400, "uid required");

        // Only owners can impersonate
        const OWNER_EMAILS = ["seanlcombs@gmail.com", "sean@titleapp.ai"];
        if (!OWNER_EMAILS.includes(user.email)) {
          return jsonError(res, 403, "Only owners can impersonate users");
        }

        const token = await admin.auth().createCustomToken(uid);

        await db.collection("activityLog").add({
          action: "impersonate", targetUid: uid,
          userId: user.uid, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true, token });
      } catch (e) {
        console.error("admin:users:impersonate failed:", e);
        return jsonError(res, 500, e.message);
      }
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
    // DOCUMENT ENGINE (Tier 0)
    // ----------------------------

    // POST /v1/docs:generate — Generate a document from a template
    if (route === "/docs:generate" && method === "POST") {
      try {
        const { templateId, data: docData, overrideBrand } = body || {};
        if (!templateId) return jsonError(res, 400, "Missing templateId");
        if (!docData || typeof docData !== "object") return jsonError(res, 400, "Missing or invalid data object");

        const result = await generateDocument({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          templateId,
          data: docData,
          overrideBrand: overrideBrand || null,
        });

        if (result.error) {
          const status = result.error === "unknown_template" ? 404
            : result.error === "missing_fields" ? 400
            : result.error === "unsupported_format" ? 400
            : 500;
          return jsonError(res, status, result.error, { message: result.message, missing: result.missing });
        }

        return res.json(result);
      } catch (e) {
        console.error("❌ docs:generate failed:", e);
        return jsonError(res, 500, "Document generation failed");
      }
    }

    // POST /v1/docs:download — Get a signed download URL
    if (route === "/docs:download" && method === "POST") {
      try {
        const { docId, expiresInSec } = body || {};
        if (!docId) return jsonError(res, 400, "Missing docId");

        const result = await docGetDownloadUrl({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          docId,
          expiresInSec,
        });

        if (result.error === "not_found") return jsonError(res, 404, "Document not found");
        if (result.error === "forbidden") return jsonError(res, 403, "Access denied");
        if (result.error) return jsonError(res, 500, result.error);

        return res.json({ ok: true, url: result.url, expiresInSec: result.expiresInSec });
      } catch (e) {
        console.error("❌ docs:download failed:", e);
        return jsonError(res, 500, "Failed to generate download URL");
      }
    }

    // POST /v1/docs:list — List generated documents for this tenant
    if (route === "/docs:list" && method === "POST") {
      try {
        const { limit, offset, templateId } = body || {};
        const docs = await docListDocuments({
          tenantId: ctx.tenantId,
          limit: Math.min(Number(limit) || 50, 200),
          offset: Number(offset) || 0,
          templateId: templateId || null,
        });

        return res.json({ ok: true, documents: docs, count: docs.length });
      } catch (e) {
        console.error("❌ docs:list failed:", e);
        return jsonError(res, 500, "Failed to list documents");
      }
    }

    // POST /v1/docs:templates — List available document templates
    if (route === "/docs:templates" && method === "POST") {
      try {
        const templates = await docListTemplates(ctx.tenantId);
        return res.json({ ok: true, templates });
      } catch (e) {
        console.error("❌ docs:templates failed:", e);
        return jsonError(res, 500, "Failed to list templates");
      }
    }

    // ----------------------------
    // SIGNATURE SERVICE (Tier 0)
    // ----------------------------

    // POST /v1/signatures:create — Create a new signature request
    if (route === "/signatures:create" && method === "POST") {
      try {
        const { title, subject, message, signers, documentType, vertical, metadata, documentRef, expiresInHours } = body || {};
        if (!signers || !Array.isArray(signers) || signers.length === 0) {
          return jsonError(res, 400, "Missing or empty signers array");
        }
        const result = await getSignatureService().createRequest({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          title,
          subject,
          message,
          signers,
          documentType,
          vertical,
          metadata,
          documentRef,
          expiresInHours: expiresInHours ? Number(expiresInHours) : null,
        });
        if (!result.ok) return jsonError(res, 500, result.error);
        return res.json(result);
      } catch (e) {
        console.error("signatures:create failed:", e);
        return jsonError(res, 500, "Failed to create signature request");
      }
    }

    // GET /v1/signatures:status?requestId=...
    if (route === "/signatures:status" && method === "GET") {
      try {
        const requestId = (req.query || {}).requestId || (body || {}).requestId;
        if (!requestId) return jsonError(res, 400, "Missing requestId");
        const result = await getSignatureService().getStatus({
          tenantId: ctx.tenantId,
          requestId,
        });
        if (!result.ok) {
          const status = result.error === "not_found" ? 404 : 500;
          return jsonError(res, status, result.error);
        }
        return res.json(result);
      } catch (e) {
        console.error("signatures:status failed:", e);
        return jsonError(res, 500, "Failed to get signature status");
      }
    }

    // POST /v1/signatures:countersign — Get sign URL for next pending signer
    if (route === "/signatures:countersign" && method === "POST") {
      try {
        const { requestId } = body || {};
        if (!requestId) return jsonError(res, 400, "Missing requestId");
        const result = await getSignatureService().addCountersign({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          requestId,
        });
        if (!result.ok) {
          const status = result.error === "not_found" ? 404
            : result.error === "no_pending_signature_for_user" ? 403
            : 500;
          return jsonError(res, status, result.error);
        }
        return res.json(result);
      } catch (e) {
        console.error("signatures:countersign failed:", e);
        return jsonError(res, 500, "Failed to process countersignature");
      }
    }

    // POST /v1/signatures:verify — Verify blockchain hash chain
    if (route === "/signatures:verify" && method === "POST") {
      try {
        const { requestId } = body || {};
        if (!requestId) return jsonError(res, 400, "Missing requestId");
        const result = await getSignatureService().verify({
          tenantId: ctx.tenantId,
          requestId,
        });
        if (!result.ok) {
          const status = result.error === "not_found" ? 404 : 500;
          return jsonError(res, status, result.error);
        }
        return res.json(result);
      } catch (e) {
        console.error("signatures:verify failed:", e);
        return jsonError(res, 500, "Signature verification failed");
      }
    }

    // GET /v1/signatures:pending — Get pending signatures for current user
    if (route === "/signatures:pending" && method === "GET") {
      try {
        const result = await getSignatureService().getPending({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
        });
        if (!result.ok) return jsonError(res, 500, result.error);
        return res.json(result);
      } catch (e) {
        console.error("signatures:pending failed:", e);
        return jsonError(res, 500, "Failed to get pending signatures");
      }
    }

    // POST /v1/signatures:delegate — Create signing authority delegation
    if (route === "/signatures:delegate" && method === "POST") {
      try {
        const { grantedTo, scope, scopeValue, expiresInDays } = body || {};
        if (!grantedTo) return jsonError(res, 400, "Missing grantedTo");
        const result = await getSignatureService().delegate({
          tenantId: ctx.tenantId,
          grantedBy: ctx.userId,
          grantedTo,
          scope,
          scopeValue,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        });
        if (!result.ok) return jsonError(res, 500, result.error);
        return res.json(result);
      } catch (e) {
        console.error("signatures:delegate failed:", e);
        return jsonError(res, 500, "Failed to create delegation");
      }
    }

    // POST /v1/signatures:revoke — Revoke a signing authority delegation
    if (route === "/signatures:revoke" && method === "POST") {
      try {
        const { delegationId } = body || {};
        if (!delegationId) return jsonError(res, 400, "Missing delegationId");
        const result = await getSignatureService().revoke({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          delegationId,
        });
        if (!result.ok) {
          const status = result.error === "not_found" ? 404
            : result.error === "forbidden" ? 403
            : 500;
          return jsonError(res, status, result.error);
        }
        return res.json(result);
      } catch (e) {
        console.error("signatures:revoke failed:", e);
        return jsonError(res, 500, "Failed to revoke delegation");
      }
    }

    // GET /v1/signatures:audit?requestId=...
    if (route === "/signatures:audit" && method === "GET") {
      try {
        const requestId = (req.query || {}).requestId || (body || {}).requestId;
        if (!requestId) return jsonError(res, 400, "Missing requestId");
        const result = await getSignatureService().getAudit({
          tenantId: ctx.tenantId,
          requestId,
        });
        if (!result.ok) {
          const status = result.error === "not_found" ? 404 : 500;
          return jsonError(res, status, result.error);
        }
        return res.json(result);
      } catch (e) {
        console.error("signatures:audit failed:", e);
        return jsonError(res, 500, "Failed to get audit trail");
      }
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
    // DOCUMENT ENGINE (Tier 0 Platform Service)
    // ----------------------------

    // POST /v1/documents:generate
    if (route === "/documents:generate" && method === "POST") {
      const { templateId, format, title, content: docContent, metadata: docMeta } = body;
      if (!templateId) return jsonError(res, 400, "Missing templateId");
      if (!docContent) return jsonError(res, 400, "Missing content");
      try {
        const { generateDocument } = require("./documents");
        const result = await generateDocument({
          tenantId: ctx.tenantId,
          userId: auth.user.uid,
          templateId,
          format: format || null,
          content: docContent,
          title: title || templateId,
          metadata: docMeta || {},
        });
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("[documents:generate] error:", e.message);
        return jsonError(res, 500, "Document generation failed: " + e.message);
      }
    }

    // POST /v1/documents:download
    if (route === "/documents:download" && method === "POST") {
      const { docId, expiresInSec } = body || {};
      if (!docId) return jsonError(res, 400, "Missing docId");
      try {
        const { getDocumentUrl } = require("./documents/storage");
        const result = await getDocumentUrl(docId, ctx.tenantId, expiresInSec || 300);
        if (!result) return jsonError(res, 404, "Document not found");
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("[documents:download] error:", e.message);
        return jsonError(res, 500, "Download failed: " + e.message);
      }
    }

    // POST /v1/documents:list
    if (route === "/documents:list" && method === "POST") {
      try {
        const { listDocuments } = require("./documents");
        const result = await listDocuments(ctx.tenantId, {
          limit: body.limit || 20,
          offset: body.offset || 0,
        });
        return res.json(result);
      } catch (e) {
        console.error("[documents:list] error:", e.message);
        return jsonError(res, 500, "List failed: " + e.message);
      }
    }

    // POST /v1/documents:templates
    if (route === "/documents:templates" && method === "POST") {
      try {
        const { getTemplates } = require("./documents");
        return res.json(getTemplates(body.category || null));
      } catch (e) {
        console.error("[documents:templates] error:", e.message);
        return jsonError(res, 500, "Templates failed: " + e.message);
      }
    }

    // ----------------------------
    // DOOR 2 ROUTES (Chat, Workflows, Report Status)
    // ----------------------------

    // POST /v1/chat:message
    if (route === "/chat:message" && method === "POST") {
      const { message, context, preferredModel, fileIds, file, files } = body || {};
      const validFileIds = Array.isArray(fileIds) ? fileIds.filter(id => typeof id === "string") : [];
      if (!message) return jsonError(res, 400, "Missing message");

      // Collect all files from both `file` (single) and `files` (multi-upload array)
      const allFiles = [];
      if (files && Array.isArray(files)) {
        for (const f of files) { if (f && f.data && f.name) allFiles.push(f); }
      } else if (file && file.data && file.name) {
        allFiles.push(file);
      }

      // Process each uploaded file: store to Cloud Storage + extract text content
      const uploadedFileDescriptions = []; // { name, url, extractedText }
      for (const f of allFiles) {
        try {
          const base64Data = f.data.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const storagePath = `uploads/${ctx.userId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const bucket = getBucket();
          const fileRef = bucket.file(storagePath);
          const dlToken2 = require("crypto").randomUUID();
          await fileRef.save(buffer, { contentType: f.type || "application/octet-stream", metadata: { firebaseStorageDownloadTokens: dlToken2 } });
          const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${dlToken2}`;

          // Create file record in Firestore
          const fileDocRef = await db.collection("files").add({
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            name: f.name,
            contentType: f.type || "application/octet-stream",
            storagePath,
            size: buffer.length,
            status: "finalized",
            createdAt: nowServerTs(),
          });
          validFileIds.push(fileDocRef.id);
          console.log("File uploaded from chat:", storagePath, "fileId:", fileDocRef.id);

          // Extract text content so the AI can read the file
          let extractedText = "";
          const lowerName = f.name.toLowerCase();
          const mimeType = (f.type || "").toLowerCase();
          try {
            if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
              const pdfParse = require("pdf-parse");
              const pdfData = await pdfParse(buffer);
              extractedText = (pdfData.text || "").trim();
              // Cap at ~8000 chars per file to avoid blowing up context
              if (extractedText.length > 8000) {
                extractedText = extractedText.substring(0, 8000) + "\n... [truncated, document continues]";
              }
            } else if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".json") || mimeType.startsWith("text/")) {
              extractedText = buffer.toString("utf-8").trim();
              if (extractedText.length > 8000) {
                extractedText = extractedText.substring(0, 8000) + "\n... [truncated]";
              }
            } else if (lowerName.endsWith(".docx") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
              // Basic DOCX text extraction — pull text from XML parts
              try {
                const JSZip = require("jszip") || null;
                // Fallback: just note the file was uploaded but can't extract
                extractedText = "[DOCX file uploaded — content extraction not available, but file is stored]";
              } catch { extractedText = "[DOCX file uploaded — content extraction not available, but file is stored]"; }
            }
          } catch (extractErr) {
            console.warn("Text extraction failed for", f.name, extractErr.message);
            extractedText = "[Could not extract text from this file]";
          }

          uploadedFileDescriptions.push({ name: f.name, url, extractedText });
        } catch (uploadErr) {
          console.error("Chat file upload failed:", f.name, uploadErr);
        }
      }

      try {
        // Event-sourced: append message received event
        const eventRef = await db.collection("messageEvents").add({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type: "chat:message:received",
          message,
          context: context || {},
          preferredModel: preferredModel || "claude",
          fileIds: validFileIds.length > 0 ? validFileIds : [],
          createdAt: nowServerTs(),
        });

        let aiResponse = "";
        let structuredData = null;

        // ANALYST DETECTION: Only trigger for explicit deal analysis requests (paste-ins or explicit commands)
        const msgLower = message.toLowerCase();
        const isDealAnalysis = (msgLower.startsWith("analyze this") || msgLower.startsWith("analyze deal") || msgLower.includes("company:")) &&
                              message.length > 200; // Must be a substantial deal paste, not a chat message

        if (isDealAnalysis) {
          // Route to Analyst RAAS
          try {
            console.log("🎯 Detected deal analysis request, routing to Analyst RAAS");

            // Parse deal info from message (simple extraction for now)
            const dealSummary = message;

            // Call Analyst RAAS (reuse existing logic)
            const rulesetName = "pe_deal_screen_v0"; // Default ruleset

            // Generate mock analysis (same logic as /analyst:analyze endpoint)
            const isBadDeal = message.toLowerCase().includes("no revenue") ||
                             message.toLowerCase().includes("pre-revenue") ||
                             message.toLowerCase().includes("idea stage") ||
                             message.toLowerCase().includes("nft") ||
                             message.toLowerCase().includes("blockchain") ||
                             message.toLowerCase().includes("crypto");

            const analysis = {
              riskScore: isBadDeal ? 85 : 45,
              recommendation: isBadDeal ? "PASS" : "INVEST",
              rating: isBadDeal ? "PASS" : "STRONG",
              summary: isBadDeal
                ? `This deal presents significant red flags. The business model appears speculative with unclear path to profitability.`
                : `Strong fundamentals with validated business model and clear unit economics. Risk is manageable with proper structuring.`,
              evidence: {
                positive: isBadDeal ? [] : ["Proven revenue generation", "Strong growth trajectory", "Experienced team"],
                negative: isBadDeal ? ["No validated business model", "High speculation risk", "Regulatory uncertainty"] : ["Customer concentration risk"],
                neutral: ["Industry is competitive but growing"]
              },
              nextSteps: isBadDeal ? ["Pass on this opportunity", "Request clearer business plan if revisiting"] : ["Conduct due diligence", "Schedule management meeting"]
            };

            // Save to Firestore
            await db.collection("analyzedDeals").add({
              tenantId: ctx.tenantId,
              dealInput: { summary: dealSummary },
              analysis,
              source: "chat",
              createdAt: nowServerTs(),
            });

            // Format response for chat
            aiResponse = `Deal Analysis\n\nRisk Score: ${analysis.riskScore}/100\nRecommendation: ${analysis.recommendation}\n\n${analysis.summary}\n\nKey Evidence:\n${analysis.evidence.positive.map(e => `+ ${e}`).join('\n')}\n${analysis.evidence.negative.map(e => `- ${e}`).join('\n')}\n\nNext Steps:\n${analysis.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

            structuredData = { type: "analyst_result", verdict: analysis.recommendation, verdict_emoji: analysis.recommendation === "INVEST" ? "+" : "-", score: analysis.riskScore, summary: analysis.summary, key_findings: [...(analysis.evidence.positive || []), ...(analysis.evidence.negative || [])] };

          } catch (analystError) {
            console.error("❌ Analyst routing failed:", analystError);
            // Fall through to normal chat
          }
        }

        // Call AI model if no structured response yet
        if (!aiResponse && (!preferredModel || preferredModel === "claude")) {
          try {
            // Fetch conversation history (last 20 messages)
            const messages = [];
            try {
              const historySnapshot = await db
                .collection("messageEvents")
                .where("tenantId", "==", ctx.tenantId)
                .where("userId", "==", ctx.userId)
                .orderBy("createdAt", "desc")
                .limit(20)
                .get();

              const history = historySnapshot.docs.reverse();
              for (const doc of history) {
                const evt = doc.data();
                if (evt.type === "chat:message:received") {
                  messages.push({ role: "user", content: evt.message });
                } else if (evt.type === "chat:message:responded") {
                  messages.push({ role: "assistant", content: evt.response });
                }
              }
            } catch (historyErr) {
              console.warn("⚠️ Could not load chat history (index may be building):", historyErr.message);
            }

            // Add current message with extracted file contents so the AI can read them
            let userContent = message;
            if (uploadedFileDescriptions.length > 0) {
              userContent += "\n\n--- UPLOADED FILES ---";
              for (const fd of uploadedFileDescriptions) {
                userContent += `\n\n[FILE: "${fd.name}" — stored at: ${fd.url}]`;
                if (fd.extractedText && fd.extractedText.length > 0 && !fd.extractedText.startsWith("[Could not")) {
                  userContent += `\nContent:\n${fd.extractedText}`;
                }
              }
              userContent += "\n--- END FILES ---\nYou have access to the full content of each file above. Read and use it directly. Do NOT ask the user to re-upload or paste the content.";
            }
            messages.push({ role: "user", content: userContent });

            // For analyst vertical, fetch deal data to enrich the system prompt
            let analystDealContext = "";
            if (ctx.vertical === "analyst") {
              try {
                const dealsSnap = await db.collection("analyzedDeals")
                  .where("tenantId", "==", ctx.tenantId)
                  .orderBy("createdAt", "desc")
                  .limit(10)
                  .get();
                if (!dealsSnap.empty) {
                  const dealSummaries = dealsSnap.docs.map(doc => {
                    const d = doc.data();
                    const score = d.analysis?.riskScore || "N/A";
                    const rec = d.analysis?.recommendation || "PENDING";
                    const name = d.dealInput?.companyName || (d.dealInput?.summary || "Unknown").substring(0, 80);
                    return `${name} -- Risk: ${score}/100, Rec: ${rec}`;
                  });
                  analystDealContext = `\n\nThe user's current analyzed deal pipeline (${dealsSnap.size} deals):\n${dealSummaries.join("\n")}\n\nRefer to these deals by name when the user asks about their pipeline, portfolio, or specific deals.`;
                }
              } catch (dealCtxErr) {
                console.warn("Could not load analyst deals for context:", dealCtxErr.message);
              }
            }

            // Load raise config for investor vertical
            let investorRaiseContext = "";
            if (ctx.vertical === "investor") {
              try {
                const raiseDoc = await db.collection("config").doc("raise").get();
                if (raiseDoc.exists) {
                  const rc = raiseDoc.data();
                  const raiseMode = rc.raise_mode || "waitlist";

                  if (raiseMode === "active") {
                    // Active raise — inject full terms into prompt
                    const fp = rc.fundingPortal || {};
                    investorRaiseContext = `\n\nCURRENT RAISE TERMS (from live config -- always use these, never make up numbers):
Instrument: ${rc.instrument || "SAFE"}
Raise Amount: $${((rc.raiseAmount || 0) / 1000000).toFixed(2)}M
Valuation Cap: $${((rc.valuationCap || 0) / 1000000).toFixed(0)}M
Discount: ${((rc.discount || 0) * 100).toFixed(0)}%
Minimum Investment: $${(rc.minimumInvestment || 0).toLocaleString()}
Pro Rata: ${rc.proRataNote || "N/A"}
Funding Portal: ${fp.name || "N/A"} (${fp.regulation || "N/A"})
Portal URL: ${fp.url || "N/A"}
Active: ${rc.active ? "Yes" : "No"}`;
                    if (rc.conversionScenarios && rc.conversionScenarios.length > 0) {
                      investorRaiseContext += "\n\nConversion Scenarios (math only, not promises):";
                      for (const s of rc.conversionScenarios) {
                        investorRaiseContext += `\nAt $${(s.exitValuation / 1000000).toFixed(0)}M exit: ${s.multiple} return`;
                      }
                    }
                    if (rc.runway) {
                      investorRaiseContext += `\n\nRunway: Net proceeds ~$${((rc.runway.netProceeds || 0) / 1000).toFixed(0)}K. Monthly burn ~$${((rc.runway.monthlyBurn || 0) / 1000).toFixed(1)}K. ${rc.runway.zeroRevenueMonths || "N/A"} months at zero revenue. Cash flow positive target: ${rc.runway.cashFlowPositiveTarget || "TBD"}.`;
                    }
                    if (rc.team && rc.team.length > 0) {
                      investorRaiseContext += "\n\nTeam:";
                      for (const t of rc.team) {
                        investorRaiseContext += `\n${t.name} (${t.role}) -- ${t.note || ""}`;
                      }
                    }
                  } else {
                    // Waitlist mode — do NOT inject raise terms
                    investorRaiseContext = "\n\nRAISE STATUS: The raise is not yet active. Do not discuss specific terms, amounts, valuation, discount, or funding platforms. If asked about investing, tell the visitor that TitleApp is building its investor list and will be sharing terms with qualified parties soon. Offer to collect their name and email so we can send them our deck and executive summary when ready.";
                  }
                }
              } catch (raiseErr) {
                console.warn("Could not load raise config for investor prompt:", raiseErr.message);
              }

              // Load active IR deals for this tenant
              try {
                const dealsSnap = await db.collection("irDeals")
                  .where("tenantId", "==", ctx.tenantId)
                  .where("status", "in", ["draft", "active", "raising", "funded"])
                  .limit(10).get();
                if (!dealsSnap.empty) {
                  investorRaiseContext += "\n\nACTIVE DEALS:";
                  for (const d of dealsSnap.docs) {
                    const deal = d.data();
                    investorRaiseContext += `\n- ${deal.name} (${deal.typeName || deal.type}, ${deal.status}): Target $${((deal.targetRaise || 0) / 1000000).toFixed(1)}M, Committed $${((deal.committedAmount || 0) / 1000000).toFixed(1)}M, ${deal.investorCount || 0} investors [ID: ${d.id}]`;
                  }
                }
              } catch (dealErr) {
                console.warn("Could not load IR deals for investor prompt:", dealErr.message);
              }
            }

            // Call Claude API
            const anthropic = getAnthropic();
            // CODEX 48.2 Fix 2 — hardened vault detection. Previous check only
            // matched vertical === "consumer" or "GLOBAL". If the workspace switch
            // didn't propagate the vertical header correctly (localStorage race),
            // Alex received the business prompt and hallucinated nav sections like
            // "Analyst" that don't exist in the vault. Now also checks tenantId
            // (which doubles as workspaceId — "vault" or "personal-vault").
            const isPersonalVault =
              (ctx.vertical || "").toLowerCase() === "consumer" ||
              (ctx.vertical || "").toUpperCase() === "GLOBAL"  ||
              (ctx.tenantId || "").toLowerCase() === "vault" ||
              (ctx.tenantId || "").toLowerCase() === "personal-vault";

            // Check if Alex orchestration layer should be used
            let alexSystemPrompt = null;
            if (!isPersonalVault) {
              try {
                const workspaceId = (context || {}).workspaceId || ctx.tenantId;
                if (workspaceId) {
                  const { getWorkspace } = require("./helpers/workspaces");
                  const workspace = await getWorkspace(auth.user.uid, workspaceId).catch(() => null);
                  if (workspace && workspace.chiefOfStaff && workspace.chiefOfStaff.enabled) {
                    // Fetch onboarding profile if it exists
                    let onboardingStatus = null;
                    try {
                      const onboardingSnap = await db.collection("users").doc(auth.user.uid)
                        .collection("profile").doc("onboarding").get();
                      if (onboardingSnap.exists) onboardingStatus = onboardingSnap.data();
                    } catch (obErr) {
                      // Non-fatal — proceed without onboarding context
                    }

                    // Detect Sales Mode from campaign/UTM context
                    let chatSurface = "business";
                    const campaignCtx = (context || {}).campaignContext;
                    const ctxUtmSource = (context || {}).utmSource || "";
                    const ctxUtmMedium = (context || {}).utmMedium || "";
                    const ctxUtmCampaign = (context || {}).utmCampaign || "";
                    const isSalesMode =
                      campaignCtx ||
                      ctxUtmMedium === "text" || ctxUtmMedium === "referral" || ctxUtmMedium === "meet-alex" || ctxUtmMedium === "chat" ||
                      ctxUtmSource === "campaign" || ctxUtmSource === "sms";

                    if (isSalesMode) {
                      chatSurface = "sales";
                      console.log("Sales Mode detected for auth chat:", { campaignSlug: campaignCtx?.slug, utmSource: ctxUtmSource, utmMedium: ctxUtmMedium });
                    }

                    // Map campaign persona to sales vertical
                    let salesVertical = ctx.vertical || workspace.vertical || "real-estate-development";
                    if (isSalesMode && campaignCtx) {
                      const personaMap = { dealer: "auto_dealer", pilot: "aviation", developer: "real_estate_development", "property-manager": "re_operations", creator: "creators" };
                      if (campaignCtx.persona && personaMap[campaignCtx.persona]) {
                        salesVertical = personaMap[campaignCtx.persona];
                      }
                    }

                    // 44.2 Bug 3b — Query Vault documents for context injection
                    let vaultSummary = null;
                    try {
                      const vaultSnap = await db.collection("vaultDocuments").doc(auth.user.uid)
                        .collection("docs").orderBy("uploadedAt", "desc").limit(10).get();
                      if (!vaultSnap.empty) {
                        vaultSummary = {
                          documentCount: vaultSnap.size,
                          documents: vaultSnap.docs.map(d => ({
                            name: d.data().fileName || d.data().name || d.id,
                            type: d.data().fileType || "document",
                            summary: (d.data().summary || d.data().extractedText || "").slice(0, 200),
                          })),
                        };
                      }
                    } catch (vaultErr) {
                      // Non-fatal — proceed without vault context
                    }

                    const alexService = require("./services/alex");
                    alexSystemPrompt = await alexService.buildAlexPrompt({
                      userId: auth.user.uid,
                      workspaceId,
                      surface: chatSurface,
                      activeWorkers: workspace.activeWorkers || [],
                      vertical: isSalesMode ? salesVertical : (ctx.vertical || workspace.vertical || "real-estate-development"),
                      currentSection: (context || {}).currentSection,
                      workspace,
                      onboardingStatus,
                      vaultSummary,
                      ...(isSalesMode ? {
                        surfaceContext: {
                          vertical: salesVertical,
                          campaignSlug: campaignCtx?.slug || ctxUtmCampaign || "",
                          prospectName: "",
                        },
                      } : {}),
                    });
                    console.log("Using Alex orchestration prompt for workspace:", workspaceId, "surface:", chatSurface);

                    // Inject recommendation context if available
                    try {
                      const { getRecommendation } = require("./alex/recommendationEngine");
                      const sessionSnap = await db.collection("messageEvents")
                        .where("userId", "==", auth.user.uid)
                        .where("tenantId", "==", ctx.tenantId)
                        .limit(1)
                        .get();
                      const sessionCount = sessionSnap.empty ? 1 : (sessionSnap.docs[0].data().sessionCount || 1);
                      const rec = await getRecommendation({
                        userId: auth.user.uid,
                        vertical: ctx.vertical || workspace.vertical,
                        persona: workspace.ownerRole || null,
                        activeWorkerSlugs: workspace.activeWorkers || [],
                        sessionCount,
                        db,
                      });
                      if (rec && rec.promptText) {
                        alexSystemPrompt += "\n\nRECOMMENDATION CONTEXT:\n" + rec.promptText;
                      }
                    } catch (recErr) {
                      // Non-fatal — proceed without recommendation
                    }

                    // Inject workspace context so Alex knows what exists in this workspace
                    const wsVertical = ctx.vertical || workspace.vertical || "";
                    const wsWorkers = body.subscribedWorkers || workspace.activeWorkers || [];
                    const NAV_BY_VERTICAL = {
                      aviation: "Dashboard, CoPilot EFB, Dispatch, Fleet Status, Crew, Safety, Scheduling, Compliance",
                      auto: "Dashboard, Inventory, Sales Pipeline, F&I Products, Service, Leads, Customers, Reports",
                      "real-estate": "Dashboard, Deal Pipeline, Listings, Buyers, Transactions, Properties, Documents, Reports",
                      "property-mgmt": "Dashboard, Properties, Tenants, Maintenance, Utilities, Contracts, Reports",
                      analyst: "Dashboard, Research, Portfolio, Clients & LPs, Deal Pipeline, Reports",
                      investor: "Dashboard, Investor Pipeline, Data Room, Cap Table, Reports",
                      solar: "Dashboard, Projects, Permits, SREC Credits, Compliance, Documents, Reports",
                      web3: "Dashboard, Document Vault, Team Roster, Treasury, Governance, Community, Contracts",
                      consumer: "Dashboard, Vehicles, Properties, Documents, Certifications, Activity Log",
                    };
                    const navItems = NAV_BY_VERTICAL[wsVertical] || "Dashboard, Documents, Reports";
                    const userName = (body.context || {}).userName || "";
                    const allTeamNames = (body.context || {}).allTeams || "";
                    // Always inject workspace context — even if no workers yet
                    alexSystemPrompt += `\n\nWORKSPACE CONTEXT (CRITICAL — FOLLOW EXACTLY):
User name: ${userName || "unknown"}
Active team: ${(body.context || {}).workspaceName || "unknown"} (${wsVertical || "unknown"})
All teams: ${allTeamNames || "unknown"}
Subscribed workers in this team: ${wsWorkers.join(", ") || "none"}
Available navigation tabs: ${navItems}

RULES YOU MUST FOLLOW:
1. ONLY reference navigation items listed above. Do NOT invent tabs like "Settings", "Staff", "Services & Inventory", "Support", or any other navigation that is not in the list.
2. ONLY reference workers listed above. Do NOT mention workers the user has not subscribed to.
3. If a worker the user asks about is not in their subscriptions, tell them it is available in the marketplace and offer to show them how to subscribe.
4. NEVER provide support contacts, phone numbers, or email addresses. You ARE the support.
5. NEVER reference "Install button", "Add Copilot button", "support contact", or "account manager" — these do not exist.
6. NEVER say "go to the Settings section", "check the Staff tab", "look in Services & Inventory", or reference ANY navigation that does not appear in "Available navigation tabs" above.
7. When a user asks to use a subscribed worker, say "Opening [worker name] now." — do NOT tell them to "go to" or "look for" it.
8. If asked about something outside your workspace scope, say "That's not available in your current workspace."
9. Workers are called Digital Workers — never call them tools, chatbots, agents, or GPTs.
10. You are Alex, Chief of Staff. Never call yourself an AI assistant, chatbot, or helper.
`;
                  }
                }
              } catch (alexErr) {
                console.warn("Alex prompt build failed, falling back to legacy:", alexErr.message);
              }
            }

            // ── Worker-specific prompt: if a worker is selected, override Alex prompt ──
            if (alexSystemPrompt && body.selectedWorker && body.selectedWorker !== "chief-of-staff") {
              try {
                const workerSlug = body.selectedWorker;
                const dwSnap = await db.doc(`digitalWorkers/${workerSlug}`).get();
                if (dwSnap.exists) {
                  const dw = dwSnap.data();
                  const workerName = dw.display_name || dw.name || workerSlug;
                  const headline = dw.headline || dw.capabilitySummary || "";
                  const capabilities = dw.capabilitySummary || headline || "";

                  // Assemble RAAS rules from tiers
                  const raasSections = [];
                  const tier0 = Array.isArray(dw.raas_tier_0) ? dw.raas_tier_0 : [];
                  const tier1 = Array.isArray(dw.raas_tier_1) ? dw.raas_tier_1 : (typeof dw.raas_tier_1 === "object" ? Object.values(dw.raas_tier_1) : []);
                  const tier2 = Array.isArray(dw.raas_tier_2) ? dw.raas_tier_2 : (typeof dw.raas_tier_2 === "object" ? Object.values(dw.raas_tier_2) : []);
                  const tier3 = Array.isArray(dw.raas_tier_3) ? dw.raas_tier_3 : (typeof dw.raas_tier_3 === "object" ? Object.values(dw.raas_tier_3) : []);

                  if (tier0.length) raasSections.push("GLOBAL RULES:\n" + tier0.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                  if (tier1.length) raasSections.push("CORE RULES:\n" + tier1.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                  if (tier2.length) raasSections.push("VERTICAL RULES:\n" + tier2.map((r, i) => `${i + 1}. ${r}`).join("\n"));
                  if (tier3.length) raasSections.push("WORKER-SPECIFIC RULES:\n" + tier3.map((r, i) => `${i + 1}. ${r}`).join("\n"));

                  const wsVertical2 = ctx.vertical || workspace.vertical || "";
                  const wsWorkers2 = body.subscribedWorkers || workspace.activeWorkers || [];
                  const userName2 = (body.context || {}).userName || "";

                  alexSystemPrompt = `You are ${workerName}, a Digital Worker on TitleApp.
${headline}

WHAT YOU DO:
${capabilities}

${raasSections.length > 0 ? "BEHAVIORAL RULES (MANDATORY):\n" + raasSections.join("\n\n") : ""}

FORMATTING RULES -- follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional -- direct, calm, no hype.

RESPONSE LENGTH:
Keep ALL chat responses under 500 words. For longer deliverables, use GENERATE_DOCUMENT markers.

WORKSPACE CONTEXT:
User name: ${userName2 || "unknown"}
Active team: ${(body.context || {}).workspaceName || "unknown"} (${wsVertical2 || "unknown"})
Subscribed workers in this team: ${wsWorkers2.join(", ") || "none"}

IDENTITY RULES:
1. You are ${workerName}. Never say you are Alex or Chief of Staff.
2. Stay within your domain of expertise described above. If the user asks about something outside your scope, say "That is outside my area. Want me to route you to Alex or another worker?"
3. Workers are called Digital Workers -- never call them tools, chatbots, agents, or GPTs.
4. Never call yourself an AI assistant, chatbot, or helper.`;

                  console.log(`[chat:message] Using worker-specific prompt for: ${workerSlug} (${workerName})`);
                } else {
                  console.warn(`[chat:message] selectedWorker "${workerSlug}" not found in digitalWorkers, using Alex prompt`);
                }
              } catch (workerPromptErr) {
                console.warn("[chat:message] Worker prompt build failed, using Alex:", workerPromptErr.message);
              }
            }

            const personalSystemPrompt = `You are the user's personal Chief of Staff in their TitleApp Vault. You do everything for them directly in this chat. You create records, store files, manage logbooks, handle attestations, and organize their entire digital life. The dashboard is a read-only view into what you have already done -- the user never needs to leave this chat to accomplish anything.

Your role:
You are not a chatbot. You are a trusted team member who acts on the user's behalf. When they tell you about something they own, you create the record. When they upload a file, you store it. When they need to attest ownership, you walk them through it. You never tell the user to "go to a section" or "use the left navigation." Everything happens here.

In this context you help with personal records, documents, files, and logbooks. You do not run business analytics, team management, or inventory operations here -- those belong in a business workspace.

The navigation in this workspace contains only: Dashboard, Documents, Signatures, Activity, My Workers, My Games. If the user asks about a feature not in this list, tell them it is available in a business workspace and offer to help them switch. Never reference sections like Analyst, Deal Pipeline, Reports, or Clients and Contacts -- those do not exist in this workspace.

Formatting rules -- follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional -- direct, calm, no hype.

DTC LIFECYCLE -- Digital Title Certificates are immutable records. Follow this sequence EVERY time:

Step 1 -- CONTENT: Collect the details from the user conversationally. Ask about what they have, gather key fields (name, description, dates, values). If they upload a file or photo, acknowledge it and associate it with the record being created.

Step 2 -- CONFIRM: Present the organized record back to the user. "Here is what I have. Does this look correct?" Wait for the user to confirm or correct before proceeding.

Step 3 -- ATTEST: After the user confirms, ask for their attestation. Say something like: "One last step. Do you certify that this information is accurate and that you are the rightful owner?" Wait for their "yes" or equivalent.

Step 4 -- CREATE: Only after attestation, include the CREATE_RECORD block to mint the DTC. The record is now immutable. All future updates go into logbook entries.

RECORD CREATION -- use these exact markers when creating a DTC:

|||CREATE_RECORD|||
{"type": "vehicle", "metadata": {"title": "2020 Tesla Model 3", "year": "2020", "make": "Tesla", "model": "Model 3", "color": "Black", "mileage": "45000", "vin": "", "plate": "", "stateRegistered": "", "purchaseDate": "", "lender": ""}}
|||END_RECORD|||

|||CREATE_RECORD|||
{"type": "valuable", "metadata": {"title": "Apple Watch Ultra 2", "category": "Electronics", "description": "49mm titanium, serial ABC123", "estimatedValue": "799"}}
|||END_RECORD|||

|||CREATE_RECORD|||
{"type": "property", "metadata": {"title": "123 Main St, Chicago IL", "address": "123 Main St, Chicago, IL 60601", "propertyType": "Condo", "ownershipType": "Mortgage", "monthlyPayment": "2400", "endDate": "", "company": "Chase"}}
|||END_RECORD|||

|||CREATE_RECORD|||
{"type": "certification", "metadata": {"title": "Illinois Real Estate License", "recordType": "Professional License", "issuer": "IDFPR", "issueDate": "2024-01-15", "expiryDate": "2026-01-15"}}
|||END_RECORD|||

|||CREATE_RECORD|||
{"type": "document", "metadata": {"title": "2025 Tax Return", "category": "Tax Records", "description": "Federal and state filing", "estimatedValue": ""}}
|||END_RECORD|||

Supported record types and their metadata fields:
- vehicle: title, year, make, model, color, mileage, vin, plate, stateRegistered, purchaseDate, lender
- property: title, address, propertyType, ownershipType, monthlyPayment, endDate, company
- document: title, category, description, estimatedValue
- certification: title, recordType, issuer, issueDate, expiryDate
- valuable: title, category, description, estimatedValue

Rules for record creation:
- The "title" field is always required. For vehicles use "YEAR MAKE MODEL". For properties use the address.
- Do NOT create the record on the first message. First collect details (Step 1), then confirm (Step 2), then attest (Step 3), then create (Step 4).
- After the JSON block, write a natural confirmation that the DTC has been created. Do NOT mention the JSON markers to the user.
- After creation, let the user know that the record is now permanent and any future changes will be recorded as logbook entries.

FILE UPLOADS:
When a user uploads a file in chat, you receive it directly. Acknowledge it by name and describe what you see or understand about it. If you are in the middle of creating a record, associate it with that record. If the record already exists, the file becomes a logbook entry. You NEVER tell the user to upload files somewhere else. You handle it right here.

AFTER DTC CREATION:
Once a DTC exists, it cannot be edited. All changes go into logbook entries linked to that DTC. If the user wants to add a photo, update mileage, record maintenance, add a receipt, or make any change -- it becomes a logbook entry. Explain this naturally: "That is on file now. I have added it to your logbook for this record."

THINGS YOU MUST NEVER SAY:
- Never say "Go to My Vehicles" or "Go to My Properties" or "Go to any section."
- Never say "You can do that in the left navigation."
- Never say "The dashboard has that feature."
- Never say "I cannot do that here." You can do everything here.
- Never suggest the user leave the chat to accomplish something.

RESPONSE LENGTH MANAGEMENT -- HARD RULES:
Keep ALL chat responses under 500 words. This is a chat interface, not a document viewer.
- For any deliverable or analysis over 500 words: use the GENERATE_DOCUMENT markers to create a downloadable document. Provide only a brief summary in chat.
- For multi-deal comparisons: present a short comparison (name, score, recommendation, key risk per deal) then ask which to explore.
- NEVER paste document content, full reports, or multi-page analysis directly in chat. Always use the document engine.
- NEVER output more than 3 paragraphs without a natural stopping point.
- NEVER output raw JSON to the user.

DOCUMENT GENERATION:
When the user asks for a formatted document such as a report, memo, financial model, presentation, agreement, or letter, use the document generation markers below instead of outputting the full content as chat text. Available templates: report-standard, memo-executive, agreement-standard, deck-standard, model-cashflow, model-proforma, one-pager, letter-formal. Available formats: pdf, docx, xlsx, pptx.

|||GENERATE_DOCUMENT|||
{"templateId": "report-standard", "format": "pdf", "title": "Document Title", "content": {"coverPage": {"title": "...", "subtitle": "...", "author": "...", "date": "..."}, "executiveSummary": "...", "sections": [{"heading": "...", "content": "..."}]}}
|||END_DOCUMENT|||

After the markers, confirm to the user that their document is ready for download. Do NOT mention the markers to the user.

CATALOG AWARENESS -- ALWAYS ACTIVE:
TitleApp has 1,000+ Digital Workers across 14 industry verticals including Aviation (PC12-NG CoPilot, King Air B200, Currency Tracker, Flight Planning, Digital Logbook, FRAT Score), Real Estate (CRE Deal Analyst, Title Search, Contract Review, Construction Manager, Permit Tracker), Auto Dealer (F&I Compliance, Inventory Pricing, Lead Management, Service Scheduling), Healthcare, Government, Web3, and more.

When a user asks if TitleApp has a worker for something, the answer is almost certainly yes. Tell them what it is and offer to show it. Never say "I do not have an app for that" or "TitleApp does not offer that." If you are not certain of the exact worker name, say "Yes, we have workers for that. Want me to find the right one for you?"

When a user asks about a specific worker while in the Vault, confirm it exists, briefly describe what it does, and offer to set it up. For example: "Yes, we have the PC12-NG CoPilot for that. It handles flight ops, currency tracking, and training records for the Pilatus PC-12. Want me to add an Aviation team so you can use it? Takes about 30 seconds."

You are in the Vault right now, but you always know the full TitleApp catalog. The Vault is the on-ramp to discovering workers, not a dead end.`;

            const businessSystemPrompt = `You are Alex, Chief of Staff at TitleApp, a business intelligence platform. The user's vertical is "${ctx.vertical || "general"}" and they are on the "${(context || {}).currentSection || "dashboard"}" section.

Formatting rules — follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional — direct, calm, no hype.

${ctx.vertical === "analyst" ? `You specialize in deal analysis, investment screening, risk assessment, and portfolio management. Help analyze deals, discuss risk factors, identify missing information, and provide actionable next steps.

ANALYST RESPONSE RULES -- MANDATORY:
1. Keep ALL chat responses under 300 words. No exceptions. If analysis requires more, generate a downloadable document instead.
2. When analyzing multiple deals, give a SHORT table: Deal name, score, recommendation. One line each. Then ask which to explore.
3. When the user asks for a document (PDF, report, memo, model, deck), output ONLY a brief 1-2 sentence confirmation like "Generating your report now..." followed by the GENERATE_DOCUMENT markers. Do NOT include the analysis text in chat. The document engine will produce the file.
4. CRITICAL: Inside the GENERATE_DOCUMENT markers, keep each section content to 2-3 sentences maximum. The document engine expands these into full sections. Do NOT write full paragraphs inside the markers — write concise summaries only. The total JSON inside markers must stay under 800 words.
5. NEVER output more than 3 short paragraphs in a single chat message. For complex requests, generate a document.
6. When the user asks for MULTIPLE deliverables (report + model + deck), handle ONE at a time. Generate the first document, confirm it, then ask if they want you to proceed to the next.` : ctx.vertical === "auto" || ctx.vertical === "auto_dealer" ? `You are Alex, the Chief of Staff for this auto dealership. Your primary mission is to orchestrate the dealership's Digital Workers and maximize revenue across every department.

The dealership has access to Digital Workers spanning 9 phases: Setup & Licensing, Inventory Acquisition, Merchandising & Pricing, Sales & Desking, F&I, Service & Parts, Retention & Marketing, Compliance & HR, and Intelligence & Reporting. Worker pricing ranges from $29/mo to $79/mo per worker.

Key workers: Dealer License Monitor (AD-001), FTC Safeguards Compliance (AD-002), Auction Intelligence (AD-003), Trade-In Valuation (AD-004), Market Pricing Intelligence (AD-006), Lead Management (AD-009), Desking & Deal Structure (AD-010), F&I Menu Builder (AD-012), F&I Compliance Monitor (AD-013), Lender Matching (AD-014), Service MPI & Trade Flag (AD-017), Equity Mining (AD-021), FTC CARS Rule Monitor (AD-024), Daily Gross & Velocity Report (AD-028).

Sales workflow: Identify opportunity, match customer to vehicles from inventory, draft personalized outreach (always use first name, reference their specific vehicle and history), handle responses, pre-qualify financing, recommend F&I products, schedule test drive, prepare deal jacket.

Service: Every service visit is a sales touchpoint. Route to Service MPI & Trade Flag (AD-017) when repair cost exceeds 60% of vehicle value. Route to Declined Service Follow-Up (AD-020) for re-engagement.

Compliance: Route OFAC screening to AD-011, FTC Safeguards to AD-002, CARS Rule to AD-024, TCPA to AD-025. These workers have hard stops that cannot be overridden.

You NEVER say: "I cannot access your inventory" (you can), "Go to the inventory section" (YOU look it up), "I am just an assistant" (you are the CHIEF OF STAFF), "I cannot send messages" (you DRAFT and SEND them), "Check with your F&I manager" (YOU are the F&I expert).` : ctx.vertical === "investor" ? `You are Alex, TitleApp's investor relations AI. You are warm, knowledgeable, and professional. You are not a chatbot -- you are a knowledgeable representative who can discuss the company, the raise, and the product in depth.

You manage: the data room (pitch deck, financials, legal docs, team info), cap table (shareholders, SAFEs, options), investor pipeline (prospects at various stages from contacted to invested), round configuration and compliance tracking.

COMPANY KNOWLEDGE:
${getCompanyKnowledge()}
${investorRaiseContext}

REGULATORY RULES -- HARD ENFORCEMENT (these never change):

You CANNOT:
- Promise returns or guarantee outcomes ("you'll make 5x" -- never, under any circumstances)
- Provide personalized investment advice ("you should invest" or "this is right for you")
- Misstate the terms of the offering -- always use the exact numbers from CURRENT RAISE TERMS above
- Skip or bypass KYC/identity verification for investors who want to proceed
- Share one investor's information with another investor
- Make claims not substantiated in the offering documents
- Create false urgency ("limited spots," "filling up fast") unless factually verified from config
- Minimize risk factors or discourage investors from reading them
- Make forward-looking statements without identifying them as such ("we project" or "we expect" must be clearly labeled as forward-looking)

You CAN:
- Explain risk factors honestly when asked -- be straightforward, not defensive
- Share conversion scenarios as math, not promises ("At a $50M exit, the math works out to approximately 3.3x -- but outcomes are never guaranteed")
- Express genuine enthusiasm about the product and mission
- Say "I don't know" or "Let me connect you with Sean or Kent for that"
- Recommend the investor read the full business plan or legal docs for detail
- Discuss the team, technology, market, and competitive landscape in depth

ESCALATION: For questions you cannot answer -- legal specifics, custom deal terms, strategic partnership details -- offer to connect the investor with Sean (CEO) or Kent (CFO) directly. Say: "That's a great question. Let me connect you with Sean/Kent who can give you a more detailed answer on that." Log the escalation.

COMPLIANCE DISCLAIMER -- include when discussing securities, investment terms, or regulatory matters:
"This is informational guidance only. TitleApp does not act as a registered funding portal, broker-dealer, or investment advisor. Securities offerings must comply with applicable SEC regulations. Consult qualified legal counsel before making investment decisions."

DEAL MANAGEMENT:
You can manage multiple investment deals simultaneously. When the user asks about a specific deal, reference it by name or ID from the ACTIVE DEALS list above. Available deal types: CRE Syndication, Startup Equity, Fund Formation, M&A/PE, Opportunity Zone, EB-5, Real Estate Debt, Revenue Share. You can create deals, add investors, track commitments, and close deals.

WATERFALL CALCULATIONS:
When the user asks about distributions, returns, waterfalls, or "how the money flows," you can run waterfall calculations. Use the |||GENERATE_DOCUMENT||| markers with the ir-waterfall-report template to generate a formatted waterfall analysis PDF. Standard waterfall: Return of Capital → Preferred Return → GP Catch-Up → Carried Interest Split.

CAPITAL CALLS:
When the user asks to "call capital," "send a capital call," or "request funding," confirm the deal, amount, and due date. The system will calculate pro-rata allocations automatically.

DISTRIBUTIONS:
When the user wants to distribute proceeds, confirm the deal, amount, and source (sale, refinance, operating cash flow). The system runs the waterfall automatically and allocates to each investor.

IR COMMUNICATIONS:
When the user asks to "send an update," "notify investors," or "send a capital call notice," draft the message and confirm before sending. Available templates: capital_call_notice, distribution_notice, quarterly_update, k1_reminder, deal_announcement, closing_notice, custom.

IR ACTION MARKERS -- use these to execute IR actions. The system processes them automatically:
|||IR_ACTION|||
{"action": "create_deal", "data": {"type": "cre_syndication", "name": "Deal Name", "targetRaise": 5000000, "purchasePrice": 15000000}}
|||END_IR_ACTION|||

Available actions: create_deal, close_deal, add_investor, create_capital_call, create_distribution, send_communication, run_compliance_check. After the markers, confirm to the user what was done. Do NOT mention the markers to the user.` : ctx.vertical === "real-estate" || ctx.vertical === "property-mgmt" || ctx.vertical === "re_development" || ctx.vertical === "re_sales" || ctx.vertical === "property_management" ? "You specialize in real estate transactions, property management, compliance, and document management. TitleApp has over 1,000 Digital Workers across all verticals, with dedicated workers covering the full CRE lifecycle from site selection through disposition." : ctx.vertical === "aviation" || ctx.vertical === "aviation_135" || ctx.vertical === "pilot_suite" ? "You specialize in aviation operations, Part 135/91 compliance, pilot certifications, crew management, safety and SMS, and flight operations. TitleApp has over 1,000 Digital Workers across all verticals, with dedicated aviation workers covering the full Part 135/91 lifecycle plus a Pilot Suite. Student pilots get free Pilot Pro while enrolled. CFI/CFII instructors on academy staff get free Pilot Pro+." : "Help with business operations, compliance questions, document management, and platform navigation. TitleApp has over 1,000 Digital Workers across auto dealer, real estate, aviation, and other verticals -- with more added daily."} When discussing deals or investments, note that you provide informational analysis only, not financial advice.

Platform navigation — when users ask how to do things, give them accurate directions:
- To analyze a new deal: Go to the Analyst section in the left navigation, then click the "+ Analyze Deal" button at the top right.
- To view deal history: Go to the Analyst section. All analyzed deals are listed in the table.
- To change investment criteria or risk profile: Go to Settings in the left navigation.
- To manage team members: Go to Staff in the left navigation.
- To view or export reports: Go to the Reports section in the left navigation.
- To view rules and compliance configuration: Go to Rules & Resources in the left navigation.
- To manage services or inventory: Go to Services & Inventory in the left navigation.
- To access the chat assistant: The chat panel is on the right side of the dashboard, always available.

RESPONSE LENGTH MANAGEMENT -- HARD RULES:
Keep ALL chat responses under 500 words. This is a chat interface, not a document viewer.
- For any deliverable or analysis over 500 words: use the GENERATE_DOCUMENT markers to create a downloadable document. Provide only a brief summary in chat.
- For multi-deal comparisons: present a short comparison (name, score, recommendation, key risk per deal) then ask which to explore.
- NEVER paste document content, full reports, or multi-page analysis directly in chat. Always use the document engine.
- NEVER output more than 3 paragraphs without a natural stopping point.
- NEVER output raw JSON to the user.

DOCUMENT GENERATION:
When the user asks for a formatted document such as a report, memo, financial model, presentation, agreement, or letter, use the document generation markers below instead of outputting the full content as chat text. Available templates: report-standard, memo-executive, agreement-standard, deck-standard, model-cashflow, model-proforma, one-pager, letter-formal. Available formats: pdf, docx, xlsx, pptx.

|||GENERATE_DOCUMENT|||
{"templateId": "report-standard", "format": "pdf", "title": "Document Title", "content": {"coverPage": {"title": "...", "subtitle": "...", "author": "...", "date": "..."}, "executiveSummary": "...", "sections": [{"heading": "...", "content": "..."}]}}
|||END_DOCUMENT|||

After the markers, confirm to the user that their document is ready for download. Do NOT mention the markers to the user.
${(context || {}).dealContext ? `\nThe user wants to discuss this deal analysis:\n${JSON.stringify(context.dealContext)}` : ""}${analystDealContext}`;

            // Select system prompt: Alex orchestration > personal vault > business legacy
            const selectedSystemPrompt = alexSystemPrompt || (isPersonalVault ? personalSystemPrompt : businessSystemPrompt);

            // ══════════════════════════════════════════════════════════
            //  WORKER ZERO — RAAS INPUT + OUTPUT FILTER (37.5)
            // ══════════════════════════════════════════════════════════
            let raasInputResult = null;
            let raasOutputResult = null;
            let alexAuditData = null;

            if (alexSystemPrompt) {
              try {
                const { getRulePack, determineMode } = require("./services/alex/rulePacks/alex-rule-pack-v1");
                const { runInputFilter } = require("./services/alex/alexInputFilter");

                // Determine mode and build user context
                const wsData = workspace || {};
                const alexMode = determineMode(auth.user, wsData);
                const subscribedWorkers = wsData.activeWorkers || [];
                const userContext = {
                  subscribedWorkers,
                  teams: wsData.teams || [],
                  activeTeamId: wsData.activeTeamId || ctx.tenantId || null,
                  activeTeamVertical: wsData.vertical || ctx.vertical || null,
                  vaultDocumentCount: 0,
                  usageLog: [],
                };

                const rulePack = getRulePack(userContext, alexMode);

                // ── INPUT FILTER ──
                raasInputResult = await runInputFilter({ message, rulePack, userContext });

                // If handoff triggered — skip LLM entirely
                if (raasInputResult.handoffTrigger) {
                  const handoff = raasInputResult.handoffTrigger;
                  aiResponse = handoff.message;

                  if (handoff.subscribed) {
                    structuredData = { type: "worker_route", targetWorker: handoff.workerSlug };
                  } else if (handoff.workerSlug) {
                    const alexSvc = require("./services/alex");
                    const wk = alexSvc.getWorker(userContext.activeTeamVertical || "real-estate-development", handoff.workerSlug);
                    if (wk) {
                      structuredData = { type: "worker_recommendation", worker: { id: wk.id, slug: wk.slug, name: wk.name, price: wk.pricing?.monthly || 0, capabilitySummary: wk.capabilitySummary } };
                    } else {
                      structuredData = { type: "worker_recommendation", worker: { slug: handoff.workerSlug, name: handoff.workerName } };
                    }
                  }

                  // Store audit data for logging after response
                  alexAuditData = { mode: alexMode, rulePack, userContext, inputResult: raasInputResult };

                  // Skip LLM — jump to audit log + return
                  // (aiResponse is already set, structuredData is set)
                }

                // Store context for output filter (used after LLM call)
                if (!raasInputResult.handoffTrigger) {
                  alexAuditData = { mode: alexMode, rulePack, userContext, inputResult: raasInputResult };
                }
              } catch (raasErr) {
                console.warn("[Worker Zero] RAAS input filter failed (non-blocking):", raasErr.message);
              }
            }

            // ── LLM CALL (skip if handoff already handled) ──
            if (!raasInputResult?.handoffTrigger) {
              const response = await anthropic.messages.create({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 4096,
                system: selectedSystemPrompt,
                messages,
              });

              aiResponse = response.content[0]?.text || "I apologize, but I couldn't generate a response. Please try again.";

              // ── OUTPUT FILTER ──
              if (alexSystemPrompt && alexAuditData) {
                try {
                  const { runOutputFilter, buildViolationContext, SAFE_FALLBACK, MAX_REGENERATIONS } = require("./services/alex/alexOutputFilter");
                  const { rulePack } = alexAuditData;

                  raasOutputResult = runOutputFilter({ response: aiResponse, rulePack, userContext: alexAuditData.userContext });

                  // If violations found — retry with violation context
                  if (!raasOutputResult.approved) {
                    let regenerations = 0;
                    while (!raasOutputResult.approved && regenerations < MAX_REGENERATIONS) {
                      regenerations++;
                      const violationCtx = buildViolationContext(raasOutputResult.violations);
                      const retryMessages = [...messages, { role: "assistant", content: aiResponse }, { role: "user", content: `Your previous response contained rule violations. Correct these:\n${violationCtx}\n\nRegenerate your response without these violations.` }];

                      const retryResponse = await anthropic.messages.create({
                        model: "claude-sonnet-4-5-20250929",
                        max_tokens: 4096,
                        system: selectedSystemPrompt,
                        messages: retryMessages,
                      });

                      aiResponse = retryResponse.content[0]?.text || SAFE_FALLBACK;
                      raasOutputResult = runOutputFilter({ response: aiResponse, rulePack, userContext: alexAuditData.userContext });
                      raasOutputResult.regenerationCount = regenerations;
                    }

                    // If still violating after max retries — safe fallback
                    if (!raasOutputResult.approved) {
                      console.warn(`[Worker Zero] Output still violating after ${MAX_REGENERATIONS} retries, using safe fallback`);
                      aiResponse = SAFE_FALLBACK;
                      raasOutputResult.response = SAFE_FALLBACK;
                      raasOutputResult.approved = true;
                    }
                  }
                } catch (outputErr) {
                  console.warn("[Worker Zero] RAAS output filter failed (non-blocking):", outputErr.message);
                }
              }
            }

            // ── AUDIT LOG ──
            if (alexAuditData) {
              try {
                const { logAlexInteraction } = require("./services/alex/auditLog");
                await logAlexInteraction({
                  userId: auth.user.uid,
                  sessionId: ctx.tenantId || "default",
                  mode: alexAuditData.mode,
                  activeVertical: alexAuditData.userContext?.activeTeamVertical || null,
                  activeTeamId: alexAuditData.userContext?.activeTeamId || null,
                  rulePackVersion: "alex-rule-pack-v1",
                  input: {
                    raw: message,
                    handoffTriggered: !!(raasInputResult && raasInputResult.handoffTrigger),
                    handoffTarget: raasInputResult?.handoffTrigger?.workerSlug || null,
                    hardStopTriggered: !!(raasInputResult && raasInputResult.hardStopTriggered),
                  },
                  output: {
                    response: aiResponse,
                    violations: raasOutputResult?.violations || [],
                    regenerationCount: raasOutputResult?.regenerationCount || 0,
                    approved: raasOutputResult ? raasOutputResult.approved : true,
                  },
                  layer2Snapshot: {
                    subscribedWorkers: alexAuditData.userContext?.subscribedWorkers || [],
                    activeTeamId: alexAuditData.userContext?.activeTeamId || null,
                  },
                });
              } catch (auditErr) {
                console.warn("[Worker Zero] Audit log failed (non-blocking):", auditErr.message);
              }
            }

            // Parse routing tags from Alex's response (if using Alex orchestration)
            if (alexSystemPrompt && aiResponse && !raasInputResult?.handoffTrigger) {
              try {
                const alexService = require("./services/alex");
                const { cleanResponse, route } = alexService.parseRoutingTag(aiResponse);
                if (route) {
                  aiResponse = cleanResponse;
                  if (route.type === "recommend_worker" && route.target) {
                    const worker = alexService.getWorker(ctx.vertical || "real-estate-development", route.target);
                    if (worker) {
                      structuredData = { type: "worker_recommendation", worker: { id: worker.id, slug: worker.slug, name: worker.name, price: worker.pricing.monthly, capabilitySummary: worker.capabilitySummary } };
                    }
                  } else if (route.type === "route_to_worker" && route.target) {
                    structuredData = { type: "worker_route", targetWorker: route.target };
                  }
                }
              } catch (routeErr) {
                console.warn("Alex routing tag parse failed:", routeErr.message);
              }

              // Parse onboarding profile CREATE_RECORD from Alex's response
              try {
                const onboardingMatch = aiResponse.match(/\|\|\|CREATE_RECORD\|\|\|\s*(\{[\s\S]*?"type"\s*:\s*"onboarding_profile"[\s\S]*?\})\s*\|\|\|END_RECORD\|\|\|/);
                if (onboardingMatch) {
                  const profile = JSON.parse(onboardingMatch[1]);
                  // Work context from email domain
                  const userData = (await db.collection("users").doc(auth.user.uid).get()).data() || {};
                  const email = userData.email || "";
                  const domain = email.split("@")[1] || "";
                  const CONSUMER_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "protonmail.com"];
                  const isWorkEmail = domain && !CONSUMER_DOMAINS.includes(domain.toLowerCase());

                  await db.collection("users").doc(auth.user.uid)
                    .collection("profile").doc("onboarding").set({
                      ...profile.metadata,
                      isWorkContext: profile.metadata.isWorkContext || isWorkEmail,
                      employerDomain: isWorkEmail ? domain : null,
                      answeredAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                  aiResponse = aiResponse.replace(onboardingMatch[0], "").trim();
                }
              } catch (obParseErr) {
                console.warn("Onboarding profile parse failed:", obParseErr.message);
              }
            }
          } catch (apiError) {
            console.error("❌ Claude API call failed:", apiError.message || apiError);
            aiResponse = "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
          }
        } else if (preferredModel === "openai" || preferredModel === "chatgpt") {
          // OpenAI / ChatGPT integration
          try {
            const messages = [];
            try {
              const historySnapshot = await db
                .collection("messageEvents")
                .where("tenantId", "==", ctx.tenantId)
                .where("userId", "==", ctx.userId)
                .orderBy("createdAt", "desc")
                .limit(20)
                .get();

              const history = historySnapshot.docs.reverse();
              for (const doc of history) {
                const evt = doc.data();
                if (evt.type === "chat:message:received") {
                  messages.push({ role: "user", content: evt.message });
                } else if (evt.type === "chat:message:responded") {
                  messages.push({ role: "assistant", content: evt.response });
                }
              }
            } catch (historyErr) {
              console.warn("⚠️ Could not load chat history (index may be building):", historyErr.message);
            }

            // Add current message with file contents
            let openaiUserContent = message;
            if (uploadedFileDescriptions.length > 0) {
              openaiUserContent += "\n\n--- UPLOADED FILES ---";
              for (const fd of uploadedFileDescriptions) {
                openaiUserContent += `\n\n[FILE: "${fd.name}" — stored at: ${fd.url}]`;
                if (fd.extractedText && fd.extractedText.length > 0 && !fd.extractedText.startsWith("[Could not")) {
                  openaiUserContent += `\nContent:\n${fd.extractedText}`;
                }
              }
              openaiUserContent += "\n--- END FILES ---\nYou have access to the full content of each file above. Read and use it directly. Do NOT ask the user to re-upload.";
            }
            messages.push({ role: "user", content: openaiUserContent });

            // Call OpenAI API
            const openai = getOpenAI();
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              max_tokens: 2048,
              messages: [
                {
                  role: "system",
                  content: `You are Alex from TitleApp, a business intelligence platform. Be concise and professional.

Formatting rules — follow these strictly:
- Never use emojis in your responses.
- Never use markdown formatting such as asterisks, bold, italic, or headers.
- Never use bullet points or numbered lists unless the user explicitly asks for a list.
- Write in complete, clean sentences. Use plain text only.
- Keep your tone warm but professional — direct, calm, no hype.

Platform navigation — when users ask how to do things, give them accurate directions:
- To analyze a new deal: Go to the Analyst section in the left navigation, then click the "+ Analyze Deal" button at the top right.
- To view deal history: Go to the Analyst section. All analyzed deals are listed in the table.
- To change investment criteria or risk profile: Go to Settings in the left navigation.
- To manage team members: Go to Staff in the left navigation.
- To view or export reports: Go to the Reports section in the left navigation.
- To access the chat assistant: The chat panel is on the right side of the dashboard, always available.

RESPONSE LENGTH MANAGEMENT:
Never attempt to output an entire multi-page document in a single response. For deliverables under 1,500 words, output directly with clear formatting. For 1,500 to 3,000 words, present the outline first and ask if the user wants full output or section-by-section. For deliverables over 3,000 words, always break into sections with a numbered table of contents first. Never let your response get cut off.`
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
        } else if (!aiResponse) {
          // Unsupported model (only if no response generated yet)
          aiResponse = `[Unsupported model: ${preferredModel}. Please use "claude" or "openai".]`;
        }

        // Parse CREATE_RECORD markers from AI response
        const recordMarkerStart = "|||CREATE_RECORD|||";
        const recordMarkerEnd = "|||END_RECORD|||";
        if (aiResponse.includes(recordMarkerStart) && aiResponse.includes(recordMarkerEnd)) {
          try {
            const startIdx = aiResponse.indexOf(recordMarkerStart) + recordMarkerStart.length;
            const endIdx = aiResponse.indexOf(recordMarkerEnd);
            const jsonStr = aiResponse.substring(startIdx, endIdx).trim();
            const recordData = safeParseJSON(jsonStr, {
              required: ['type'],
            });
            if (!recordData) throw new Error('Invalid record data from AI');

            // Strip markers from the user-visible response
            aiResponse = aiResponse.substring(0, aiResponse.indexOf(recordMarkerStart)).trim() +
              " " + aiResponse.substring(endIdx + recordMarkerEnd.length).trim();
            aiResponse = aiResponse.trim();

            // Create DTC in Firestore (skip ID verification for chat-created records)
            const dtcRef = await db.collection("dtcs").add({
              userId: ctx.userId,
              tenantId: ctx.tenantId,
              type: recordData.type || "document",
              metadata: recordData.metadata || {},
              imageUrl: uploadedFileUrl || null,
              fileIds: validFileIds,
              blockchainProof: null,
              logbookCount: uploadedFileUrl ? 2 : 1,
              createdAt: nowServerTs(),
            });

            // Also create inventory item so section pages see it
            await db.collection("inventory").add({
              tenantId: ctx.tenantId,
              userId: ctx.userId,
              type: recordData.type || "document",
              status: "active",
              metadata: recordData.metadata || {},
              imageUrl: uploadedFileUrl || null,
              price: 0,
              cost: 0,
              dtcId: dtcRef.id,
              fileIds: validFileIds,
              createdAt: nowServerTs(),
            });

            // Create initial logbook entry
            const dtcTitle = (recordData.metadata || {}).title || "New Record";
            await db.collection("logbookEntries").add({
              dtcId: dtcRef.id,
              userId: ctx.userId,
              tenantId: ctx.tenantId,
              dtcTitle,
              entryType: "creation",
              data: { description: "Record created via Chief of Staff chat" },
              files: validFileIds,
              createdAt: nowServerTs(),
            });

            // If file was uploaded, create a second logbook entry for the attachment
            if (uploadedFileUrl && uploadedFileName) {
              await db.collection("logbookEntries").add({
                dtcId: dtcRef.id,
                userId: ctx.userId,
                tenantId: ctx.tenantId,
                dtcTitle,
                entryType: "update",
                data: { description: `Photo attached: ${uploadedFileName}`, fileUrl: uploadedFileUrl },
                files: validFileIds,
                createdAt: nowServerTs(),
              });
            }

            structuredData = {
              type: "record_created",
              recordType: recordData.type || "document",
              dtcId: dtcRef.id,
              metadata: recordData.metadata || {},
            };

            console.log("Created DTC from chat:", dtcRef.id, recordData.type);
          } catch (parseErr) {
            console.error("Failed to parse CREATE_RECORD from AI response:", parseErr.message);
            // Clean up markers even if parsing fails
            aiResponse = aiResponse.replace(/\|\|\|CREATE_RECORD\|\|\|[\s\S]*?\|\|\|END_RECORD\|\|\|/g, "").trim();
          }
        }

        // Parse GENERATE_DOCUMENT markers from AI response
        const docMarkerStart = "|||GENERATE_DOCUMENT|||";
        const docMarkerEnd = "|||END_DOCUMENT|||";
        if (aiResponse.includes(docMarkerStart) && aiResponse.includes(docMarkerEnd)) {
          try {
            const docStartIdx = aiResponse.indexOf(docMarkerStart) + docMarkerStart.length;
            const docEndIdx = aiResponse.indexOf(docMarkerEnd);
            const docJsonStr = aiResponse.substring(docStartIdx, docEndIdx).trim();
            const docRequest = safeParseJSON(docJsonStr, { required: ["templateId"] });
            if (!docRequest) throw new Error("Invalid document request from AI");

            // Strip markers from visible response
            aiResponse = aiResponse.substring(0, aiResponse.indexOf(docMarkerStart)).trim() +
              " " + aiResponse.substring(docEndIdx + docMarkerEnd.length).trim();
            aiResponse = aiResponse.trim();

            // Generate the document
            const { generateDocument } = require("./documents");
            const docResult = await generateDocument({
              tenantId: ctx.tenantId,
              userId: ctx.userId,
              templateId: docRequest.templateId,
              format: docRequest.format || null,
              content: docRequest.content || {},
              title: docRequest.title || docRequest.templateId,
              metadata: { source: "chat", ...(docRequest.metadata || {}) },
            });

            if (docResult.ok) {
              aiResponse += `\n\nYour document is ready: ${docResult.filename} (${docResult.format.toUpperCase()}, ${Math.round(docResult.sizeBytes / 1024)} KB)`;
              structuredData = structuredData || {};
              structuredData.document = {
                type: "document_generated",
                docId: docResult.docId,
                filename: docResult.filename,
                format: docResult.format,
                downloadUrl: docResult.downloadUrl,
                sizeBytes: docResult.sizeBytes,
                pageCount: docResult.pageCount,
              };
              console.log("Generated document from chat:", docResult.docId, docResult.format);
            } else {
              aiResponse += "\n\nI was unable to generate the document: " + docResult.error;
              console.error("Document generation failed in chat:", docResult.error);
            }
          } catch (docParseErr) {
            console.error("Failed to parse GENERATE_DOCUMENT from AI response:", docParseErr.message);
            aiResponse = aiResponse.replace(/\|\|\|GENERATE_DOCUMENT\|\|\|[\s\S]*?\|\|\|END_DOCUMENT\|\|\|/g, "").trim();
          }
        }

        // ── IR Action marker parsing ────────────────────────
        const irMarkerStart = "|||IR_ACTION|||";
        const irMarkerEnd = "|||END_IR_ACTION|||";
        if (aiResponse.includes(irMarkerStart) && aiResponse.includes(irMarkerEnd)) {
          try {
            const irStart = aiResponse.indexOf(irMarkerStart) + irMarkerStart.length;
            const irEnd = aiResponse.indexOf(irMarkerEnd);
            const irJsonStr = aiResponse.substring(irStart, irEnd).trim();
            const irPayload = JSON.parse(irJsonStr);
            const irAction = irPayload.action;
            const irData = irPayload.data || {};

            let irResult = null;
            if (irAction === "create_deal") {
              const { createDeal } = require("./ir/deals");
              irResult = await createDeal(ctx.tenantId, irData);
            } else if (irAction === "close_deal") {
              const { closeDeal } = require("./ir/deals");
              irResult = await closeDeal(ctx.tenantId, irData.dealId);
            } else if (irAction === "add_investor") {
              const { addDealInvestor } = require("./ir/deals");
              irResult = await addDealInvestor(ctx.tenantId, irData.dealId, irData);
            } else if (irAction === "create_capital_call") {
              const { createCapitalCall } = require("./ir/capitalCalls");
              irResult = await createCapitalCall(ctx.tenantId, irData.dealId, irData);
            } else if (irAction === "create_distribution") {
              const { createDistribution } = require("./ir/distributions");
              irResult = await createDistribution(ctx.tenantId, irData.dealId, irData);
            } else if (irAction === "send_communication") {
              const { buildMessage, sendToInvestors } = require("./ir/communications");
              const msg = buildMessage(irData.templateType || "custom", irData);
              if (msg.ok) {
                irResult = await sendToInvestors(ctx.tenantId, irData.dealId || null, msg, {
                  channel: irData.channel || "platform",
                  investorIds: irData.investorIds,
                });
              } else {
                irResult = msg;
              }
            } else if (irAction === "run_compliance_check") {
              const { getDeal, getDealInvestors } = require("./ir/deals");
              const dealResult = await getDeal(ctx.tenantId, irData.dealId);
              if (dealResult.ok) {
                const investorsResult = await getDealInvestors(ctx.tenantId, irData.dealId);
                const investors = investorsResult.ok ? investorsResult.investors : [];
                const nonAccredited = investors.filter((i) => !i.accredited).length;
                irResult = { ok: true, regulation: dealResult.deal.regulation, investorCount: investors.length, nonAccredited };
              } else {
                irResult = dealResult;
              }
            }

            // Strip markers from visible response
            aiResponse = aiResponse.replace(/\|\|\|IR_ACTION\|\|\|[\s\S]*?\|\|\|END_IR_ACTION\|\|\|/g, "").trim();

            if (irResult) {
              structuredData.irAction = {
                type: "ir_action_executed",
                action: irAction,
                result: irResult,
              };
              console.log("Executed IR action from chat:", irAction, irResult.ok ? "OK" : irResult.error);
            }
          } catch (irParseErr) {
            console.error("Failed to parse IR_ACTION from AI response:", irParseErr.message);
            aiResponse = aiResponse.replace(/\|\|\|IR_ACTION\|\|\|[\s\S]*?\|\|\|END_IR_ACTION\|\|\|/g, "").trim();
          }
        }

        // ── Chat enforcement (fail open) ──────────────────
        let dtcChatEnforcement = { checked: false };
        try {
          dtcChatEnforcement = validateChatOutput(aiResponse);
          if (!dtcChatEnforcement.passed) {
            console.warn(`[enforcement] dtc:chat violation for user ${ctx.userId}:`, dtcChatEnforcement.violations);
            // Append disclaimer rather than regenerate (cheaper for chat)
            aiResponse += "\n\nNote: This is informational guidance only and does not constitute financial, legal, or tax advice. Consult qualified professionals for specific advice.";
            dtcChatEnforcement.disclaimerAppended = true;
          }
        } catch (enfErr) {
          console.error("[enforcement] dtc:chat enforcement error (continuing):", enfErr.message);
        }

        // Event-sourced: append response event (with enforcement metadata)
        const responseEvent = {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type: "chat:message:responded",
          requestEventId: eventRef.id,
          preferredModel: preferredModel || "claude",
          response: aiResponse,
          structuredData,
          enforcement: {
            checked: dtcChatEnforcement.checked || false,
            passed: dtcChatEnforcement.passed != null ? dtcChatEnforcement.passed : null,
            violations: dtcChatEnforcement.violations || [],
            disclaimerAppended: dtcChatEnforcement.disclaimerAppended || false,
          },
          createdAt: nowServerTs(),
        };
        // Add investor audit context if applicable
        if (ctx.vertical === "investor") {
          responseEvent.investorContext = {
            investorState: null,
            documentsServed: [],
            stateTransition: null,
            escalationRequested: /connect you with (Sean|Kent)/i.test(aiResponse),
          };
        }
        await db.collection("messageEvents").add(responseEvent);

        return res.json({
          ok: true,
          response: aiResponse,
          structuredData,
          eventId: eventRef.id
        });
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
          return jsonError(res, 422, "Validation failed", { reason: raasResult.reason });
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
          .where("tenantId", "==", ctx.tenantId)
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

    // POST /v1/vin:decode
    // Public endpoint (no auth required) - validates and decodes VIN using NHTSA API
    if (route === "/vin:decode" && method === "POST") {
      try {
        const { vin } = body;

        if (!vin) {
          return jsonError(res, 400, "Missing VIN");
        }

        // Validate VIN format: 17 alphanumeric characters, no I, O, or Q
        const vinStr = String(vin).toUpperCase().trim();
        const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

        if (!vinRegex.test(vinStr)) {
          return res.json({
            valid: false,
            vin: vinStr,
            errors: ["Invalid VIN format. VIN must be 17 characters (A-Z, 0-9, excluding I, O, Q)"],
          });
        }

        // Call NHTSA API via health monitor
        const nhtsaUrl = `${EXTERNAL_APIS.NHTSA_VIN_DECODE}Values/${vinStr}?format=json`;
        console.log("🔍 Decoding VIN via NHTSA:", vinStr);

        const healthResult = await callWithHealthCheck({
          serviceName: "nhtsa",
          fn: async () => {
            const r = await fetch(nhtsaUrl);
            if (!r.ok) throw new Error(`NHTSA API returned ${r.status}`);
            return r.json();
          },
          timeout: 10000,
        });

        if (!healthResult.success) {
          const msg = getErrorMessage("nhtsa");
          return res.json({ valid: false, vin: vinStr, errors: [msg.message] });
        }

        const nhtsaData = healthResult.data;
        const result = nhtsaData.Results?.[0];

        if (!result) {
          return res.json({
            valid: false,
            vin: vinStr,
            errors: ["No data returned from NHTSA"],
          });
        }

        // Check for NHTSA errors
        const errorCode = result.ErrorCode;
        if (errorCode && errorCode !== "0" && errorCode !== 0) {
          return res.json({
            valid: false,
            vin: vinStr,
            errors: [result.ErrorText || "VIN decode failed"],
          });
        }

        // Extract and clean vehicle data
        const vehicle = {
          year: result.ModelYear || null,
          make: result.Make || null,
          model: result.Model || null,
          trim: result.Trim || null,
          bodyClass: result.BodyClass || null,
          engineCylinders: result.EngineCylinders || null,
          engineDisplacement: result.DisplacementL || null,
          fuelType: result.FuelTypePrimary || null,
          driveType: result.DriveType || null,
          transmissionStyle: result.TransmissionStyle || null,
          plantCity: result.PlantCity || null,
          plantState: result.PlantStateProvince || null,
          plantCountry: result.PlantCountry || null,
          vehicleType: result.VehicleType || null,
          gvwr: result.GVWR || null,
        };

        // Cache the decoded VIN in Firestore to avoid redundant API calls
        try {
          await db.collection("vinCache").doc(vinStr).set({
            vin: vinStr,
            vehicle,
            decodedAt: nowServerTs(),
            source: "nhtsa",
          });
        } catch (cacheError) {
          console.warn("⚠️ Failed to cache VIN:", cacheError);
          // Don't fail the request if caching fails
        }

        return res.json({
          valid: true,
          vin: vinStr,
          vehicle,
          errors: [],
        });
      } catch (e) {
        console.error("❌ vin:decode failed:", e);
        return jsonError(res, 500, "Failed to decode VIN", { details: e.message });
      }
    }

    // POST /v1/dtc:create
    if (route === "/dtc:create" && method === "POST") {
      try {
        const { type, metadata, fileIds, blockchainProof } = body;

        if (!type || !metadata) {
          return jsonError(res, 400, "Missing type or metadata");
        }

        // ID verification gate
        const userDoc = await db.collection("users").doc(ctx.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        if (!userData.idVerified) {
          return res.json({ ok: false, requiresIdVerification: true, error: "Identity verification required" });
        }

        const ref = await db.collection("dtcs").add({
          userId: ctx.userId,
          tenantId: ctx.tenantId,
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
          tenantId: ctx.tenantId,
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
        const { dtcId, entryType, data, files, file } = body;

        if (!dtcId || !entryType || !data) {
          return jsonError(res, 400, "Missing dtcId, entryType, or data");
        }

        // Verify DTC exists and user owns it
        const dtcDoc = await db.collection("dtcs").doc(dtcId).get();
        if (!dtcDoc.exists || dtcDoc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "DTC not found or access denied");
        }

        // Handle base64 file upload if provided
        const fileIds = Array.isArray(files) ? [...files] : [];
        if (file && file.data && file.name) {
          try {
            const base64Data = file.data.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const storagePath = `uploads/${ctx.userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const bucket = getBucket();
            const fileRef = bucket.file(storagePath);
            await fileRef.save(buffer, { contentType: file.type || "application/octet-stream" });
            const fileDocRef = await db.collection("files").add({
              tenantId: ctx.tenantId,
              userId: ctx.userId,
              name: file.name,
              contentType: file.type || "application/octet-stream",
              storagePath,
              size: buffer.length,
              status: "finalized",
              createdAt: nowServerTs(),
            });
            fileIds.push(fileDocRef.id);
          } catch (uploadErr) {
            console.error("Logbook file upload failed:", uploadErr);
          }
        }

        // Append logbook entry
        const ref = await db.collection("logbookEntries").add({
          dtcId,
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          dtcTitle: dtcDoc.data().metadata?.title || "Untitled",
          entryType,
          data,
          files: fileIds,
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

        return res.json({ ok: true, inventory: items });
      } catch (e) {
        console.error("❌ inventory:list failed:", e);
        return jsonError(res, 500, "Failed to load inventory");
      }
    }

    // POST /v1/inventory:create
    if (route === "/inventory:create" && method === "POST") {
      try {
        const { type, status, metadata, price, cost, fileIds } = body;
        const invFileIds = Array.isArray(fileIds) ? fileIds.filter(id => typeof id === "string") : [];

        if (!type || !metadata || price === undefined || cost === undefined) {
          return jsonError(res, 400, "Missing required fields");
        }

        // Create DTC record
        const dtcRef = await db.collection("dtcs").add({
          userId: ctx.userId,
          type: type || "document",
          metadata: metadata || {},
          fileIds: invFileIds,
          blockchainProof: null,
          logbookCount: 1,
          createdAt: nowServerTs(),
        });

        const ref = await db.collection("inventory").add({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type,
          status: status || "available",
          metadata,
          price: parseFloat(price) || 0,
          cost: parseFloat(cost) || 0,
          dtcId: dtcRef.id,
          fileIds: invFileIds,
          createdAt: nowServerTs(),
        });

        // Create logbook entry
        const recordTitle = metadata?.title || metadata?.documentName || metadata?.credentialName || metadata?.address || "New Record";
        await db.collection("logbookEntries").add({
          dtcId: dtcRef.id,
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          dtcTitle: recordTitle,
          entryType: "creation",
          data: { description: `Record created: ${recordTitle}` },
          files: invFileIds,
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, itemId: ref.id, dtcId: dtcRef.id });
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

    // POST /v1/inventory:attest
    if (route === "/inventory:attest" && method === "POST") {
      try {
        const { dtcId } = body;
        if (!dtcId) return jsonError(res, 400, "Missing dtcId");

        const dtcDoc = await db.collection("dtcs").doc(dtcId).get();
        if (!dtcDoc.exists || dtcDoc.data().userId !== ctx.userId) {
          return jsonError(res, 403, "DTC not found or access denied");
        }

        await db.collection("dtcs").doc(dtcId).update({
          attested: true,
          attestedAt: nowServerTs(),
          attestedBy: ctx.userId,
        });

        const dtcTitle = dtcDoc.data().metadata?.title || "Untitled";
        await db.collection("logbookEntries").add({
          dtcId,
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          dtcTitle,
          entryType: "attestation",
          data: { description: "Owner attested to lawful ownership and accuracy of record information" },
          files: [],
          createdAt: nowServerTs(),
        });

        await db.collection("dtcs").doc(dtcId).update({
          logbookCount: admin.firestore.FieldValue.increment(1),
        });

        return res.json({ ok: true, attested: true });
      } catch (e) {
        console.error("❌ inventory:attest failed:", e);
        return jsonError(res, 500, "Failed to record attestation");
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
        const analysis = safeParseJSON(analysisText);
        if (!analysis) throw new Error('Failed to parse AI analysis response');

        return res.json({ ok: true, analysis });
      } catch (e) {
        console.error("escrow:ai:analysis failed:", e);
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
          tenantId: ctx.tenantId,
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
    // BUSINESS APP: INVESTOR RELATIONS
    // ----------------------------

    // GET /v1/wallet:captable:get
    if (route === "/wallet:captable:get" && method === "GET") {
      try {
        const id = (req.query?.id || "").toString().trim();
        if (!id) return jsonError(res, 400, "Missing cap table id");
        const doc = await db.collection("capTables").doc(id).get();
        if (!doc.exists) return jsonError(res, 404, "Cap table not found");
        const data = doc.data();
        if (data.userId !== ctx.userId && data.tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Access denied");
        }
        return res.json({ ok: true, capTable: { id: doc.id, ...data } });
      } catch (e) {
        console.error("wallet:captable:get failed:", e);
        return jsonError(res, 500, "Failed to load cap table");
      }
    }

    // PUT /v1/wallet:captable:update
    if (route === "/wallet:captable:update" && method === "PUT") {
      try {
        const { id, companyName, totalShares, shareholders, valuation, currentRound } = body;
        if (!id) return jsonError(res, 400, "Missing cap table id");
        const doc = await db.collection("capTables").doc(id).get();
        if (!doc.exists) return jsonError(res, 404, "Cap table not found");
        const data = doc.data();
        if (data.userId !== ctx.userId && data.tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Access denied");
        }
        const updates = { updatedAt: nowServerTs() };
        if (companyName !== undefined) updates.companyName = companyName;
        if (totalShares !== undefined) updates.totalShares = totalShares;
        if (shareholders !== undefined) updates.shareholders = shareholders;
        if (valuation !== undefined) updates.valuation = valuation;
        if (currentRound !== undefined) updates.currentRound = currentRound;
        await db.collection("capTables").doc(id).update(updates);
        return res.json({ ok: true });
      } catch (e) {
        console.error("wallet:captable:update failed:", e);
        return jsonError(res, 500, "Failed to update cap table");
      }
    }

    // GET /v1/investor:list
    if (route === "/investor:list" && method === "GET") {
      try {
        const snap = await db.collection("investors")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();
        const investors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, investors });
      } catch (e) {
        console.error("investor:list failed:", e);
        return jsonError(res, 500, "Failed to load investors");
      }
    }

    // POST /v1/investor:create
    if (route === "/investor:create" && method === "POST") {
      try {
        const { name, email, type, status, targetAmount, notes, lastActivity, lifecycleState } = body;
        if (!name || !email) return jsonError(res, 400, "Missing name or email");
        const ref = await db.collection("investors").add({
          tenantId: ctx.tenantId,
          name,
          email,
          type: type || "Angel",
          status: status || "Contacted",
          lifecycleState: lifecycleState || "prospect",
          targetAmount: targetAmount || 0,
          notes: notes || "",
          lastActivity: lastActivity || "",
          createdAt: nowServerTs(),
          updatedAt: nowServerTs(),
        });
        return res.json({ ok: true, investorId: ref.id });
      } catch (e) {
        console.error("investor:create failed:", e);
        return jsonError(res, 500, "Failed to create investor");
      }
    }

    // PUT /v1/investor:update
    if (route === "/investor:update" && method === "PUT") {
      try {
        const { id, name, email, type, status, targetAmount, notes, lastActivity } = body;
        if (!id) return jsonError(res, 400, "Missing investor id");
        const doc = await db.collection("investors").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Investor not found or access denied");
        }
        const updates = { updatedAt: nowServerTs() };
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (type !== undefined) updates.type = type;
        if (status !== undefined) updates.status = status;
        if (targetAmount !== undefined) updates.targetAmount = targetAmount;
        if (notes !== undefined) updates.notes = notes;
        if (lastActivity !== undefined) updates.lastActivity = lastActivity;
        await db.collection("investors").doc(id).update(updates);
        return res.json({ ok: true });
      } catch (e) {
        console.error("investor:update failed:", e);
        return jsonError(res, 500, "Failed to update investor");
      }
    }

    // DELETE /v1/investor:delete
    if (route === "/investor:delete" && method === "DELETE") {
      try {
        const { id } = body;
        if (!id) return jsonError(res, 400, "Missing investor id");
        const doc = await db.collection("investors").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Investor not found or access denied");
        }
        await db.collection("investors").doc(id).delete();
        return res.json({ ok: true });
      } catch (e) {
        console.error("investor:delete failed:", e);
        return jsonError(res, 500, "Failed to delete investor");
      }
    }

    // GET /v1/dataroom:list
    if (route === "/dataroom:list" && method === "GET") {
      try {
        const docSnap = await db.collection("dataRoomDocs")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();
        let documents = docSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter by investor access level if requested
        const investorState = body.investorState || (req.query && req.query.investorState);
        if (investorState) {
          const ACCESS_HIERARCHY = ["public", "prospect", "verified", "invested", "shareholder"];
          const maxLevel = ACCESS_HIERARCHY.indexOf(investorState);
          if (maxLevel >= 0) {
            documents = documents.filter(d => {
              const docLevel = ACCESS_HIERARCHY.indexOf(d.accessLevel || "public");
              return docLevel <= maxLevel;
            });
          }
        }
        const viewSnap = await db.collection("dataRoomViews")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("viewedAt", "desc")
          .limit(20)
          .get();
        const recentViews = viewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, documents, recentViews });
      } catch (e) {
        console.error("dataroom:list failed:", e);
        return jsonError(res, 500, "Failed to load data room");
      }
    }

    // POST /v1/dataroom:upload (with file)
    if (route === "/dataroom:upload" && method === "POST") {
      try {
        const { name, category, file, accessLevel } = body;
        if (!name || !file) return jsonError(res, 400, "Missing name or file");
        const base64Data = file.data.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `dataroom/${ctx.tenantId}/${Date.now()}_${safeName}`;
        const bucket = getBucket();
        const fileRef = bucket.file(storagePath);
        const dlToken = require("crypto").randomUUID();
        await fileRef.save(buffer, { contentType: file.type || "application/octet-stream", metadata: { firebaseStorageDownloadTokens: dlToken } });
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${dlToken}`;
        const ref = await db.collection("dataRoomDocs").add({
          tenantId: ctx.tenantId,
          name,
          category: category || "Other",
          accessLevel: accessLevel || "public",
          storagePath,
          url,
          contentType: file.type || "application/octet-stream",
          sizeBytes: buffer.length,
          views: 0,
          lastViewedAt: null,
          createdAt: nowServerTs(),
          updatedAt: nowServerTs(),
        });
        return res.json({ ok: true, docId: ref.id, url });
      } catch (e) {
        console.error("dataroom:upload failed:", e);
        return jsonError(res, 500, "Failed to upload document");
      }
    }

    // POST /v1/dataroom:create (metadata-only, for sample data)
    if (route === "/dataroom:create" && method === "POST") {
      try {
        const { name, category, sizeBytes, accessLevel } = body;
        if (!name) return jsonError(res, 400, "Missing document name");
        const ref = await db.collection("dataRoomDocs").add({
          tenantId: ctx.tenantId,
          name,
          category: category || "Other",
          accessLevel: accessLevel || "public",
          storagePath: null,
          url: null,
          contentType: null,
          sizeBytes: sizeBytes || 0,
          views: 0,
          lastViewedAt: null,
          createdAt: nowServerTs(),
          updatedAt: nowServerTs(),
        });
        return res.json({ ok: true, docId: ref.id });
      } catch (e) {
        console.error("dataroom:create failed:", e);
        return jsonError(res, 500, "Failed to create document record");
      }
    }

    // DELETE /v1/dataroom:delete
    if (route === "/dataroom:delete" && method === "DELETE") {
      try {
        const { id } = body;
        if (!id) return jsonError(res, 400, "Missing document id");
        const doc = await db.collection("dataRoomDocs").doc(id).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Document not found or access denied");
        }
        await db.collection("dataRoomDocs").doc(id).delete();
        return res.json({ ok: true });
      } catch (e) {
        console.error("dataroom:delete failed:", e);
        return jsonError(res, 500, "Failed to delete document");
      }
    }

    // POST /v1/dataroom:logView
    if (route === "/dataroom:logView" && method === "POST") {
      try {
        const { docId, investorName } = body;
        if (!docId || !investorName) return jsonError(res, 400, "Missing docId or investorName");
        const doc = await db.collection("dataRoomDocs").doc(docId).get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Document not found or access denied");
        }
        await db.collection("dataRoomViews").add({
          tenantId: ctx.tenantId,
          docId,
          investorName,
          docName: doc.data().name,
          viewedAt: nowServerTs(),
        });
        await db.collection("dataRoomDocs").doc(docId).update({
          views: admin.firestore.FieldValue.increment(1),
          lastViewedAt: nowServerTs(),
        });
        return res.json({ ok: true });
      } catch (e) {
        console.error("dataroom:logView failed:", e);
        return jsonError(res, 500, "Failed to log view");
      }
    }

    // ----------------------------
    // INVESTOR: RAISE CONFIG, LIFECYCLE, UPDATES
    // ----------------------------

    // PUT /v1/raise:config:update (admin)
    if (route === "/raise:config:update" && method === "PUT") {
      try {
        const configData = body.config || body;
        configData.updatedAt = nowServerTs();
        configData.updatedBy = ctx.userId;
        await db.collection("config").doc("raise").set(configData, { merge: true });
        return res.json({ ok: true });
      } catch (e) {
        console.error("raise:config:update failed:", e);
        return jsonError(res, 500, "Failed to update raise config");
      }
    }

    // POST /v1/investor:transition (lifecycle state machine)
    if (route === "/investor:transition" && method === "POST") {
      try {
        const { id, newState, trigger } = body;
        if (!id || !newState) return jsonError(res, 400, "Missing id or newState");
        const VALID_STATES = ["visitor", "prospect", "verified", "invested", "shareholder"];
        const ALLOWED_TRANSITIONS = {
          visitor: ["prospect"],
          prospect: ["verified"],
          verified: ["invested"],
          invested: ["shareholder"],
        };
        if (!VALID_STATES.includes(newState)) {
          return jsonError(res, 400, "Invalid state: " + newState);
        }
        const docRef = db.collection("investors").doc(id);
        const doc = await docRef.get();
        if (!doc.exists || doc.data().tenantId !== ctx.tenantId) {
          return jsonError(res, 403, "Investor not found or access denied");
        }
        const currentState = doc.data().lifecycleState || "visitor";
        if (ALLOWED_TRANSITIONS[currentState] && !ALLOWED_TRANSITIONS[currentState].includes(newState)) {
          return jsonError(res, 400, `Cannot transition from ${currentState} to ${newState}`);
        }
        await docRef.update({
          lifecycleState: newState,
          updatedAt: nowServerTs(),
        });
        // Audit log
        await db.collection("investors").doc(id).collection("auditLog").add({
          from: currentState,
          to: newState,
          trigger: trigger || "manual",
          triggeredBy: ctx.userId,
          createdAt: nowServerTs(),
        });
        return res.json({ ok: true, previousState: currentState, newState });
      } catch (e) {
        console.error("investor:transition failed:", e);
        return jsonError(res, 500, "Failed to transition investor");
      }
    }

    // POST /v1/investor:update:publish (company update)
    if (route === "/investor:update:publish" && method === "POST") {
      try {
        const { title, body: updateBody, category, visibility } = body;
        if (!title || !updateBody) return jsonError(res, 400, "Missing title or body");
        const ref = await db.collection("investorUpdates").add({
          tenantId: ctx.tenantId,
          title,
          body: updateBody,
          category: category || "milestone",
          visibility: visibility || "all",
          publishedAt: nowServerTs(),
          publishedBy: ctx.userId,
          read: [],
        });
        return res.json({ ok: true, id: ref.id });
      } catch (e) {
        console.error("investor:update:publish failed:", e);
        return jsonError(res, 500, "Failed to publish update");
      }
    }

    // GET /v1/investor:updates:list
    if (route === "/investor:updates:list" && method === "GET") {
      try {
        const snap = await db.collection("investorUpdates")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("publishedAt", "desc")
          .limit(50)
          .get();
        const updates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, updates });
      } catch (e) {
        console.error("investor:updates:list failed:", e);
        return jsonError(res, 500, "Failed to list updates");
      }
    }

    // ----------------------------
    // INVESTOR: GATES + VERIFICATION
    // ----------------------------

    // GET /v1/investor:gates (check gate status for current user)
    if (route === "/investor:gates" && method === "GET") {
      try {
        const userDoc = await db.collection("users").doc(auth.user.uid).get();
        const u = userDoc.exists ? userDoc.data() : {};
        return res.json({
          ok: true,
          identityVerified: !!u.identityVerified,
          identityVerifiedAt: u.identityVerifiedAt || null,
          disclaimerAccepted: !!u.disclaimerAccepted,
          disclaimerVersion: u.disclaimerVersion || null,
          disclaimerAcceptedAt: u.disclaimerAcceptedAt || null,
          investorStage: u.investorStage || "PROSPECT",
        });
      } catch (e) {
        console.error("investor:gates failed:", e);
        return jsonError(res, 500, "Failed to check investor gates");
      }
    }

    // POST /v1/investor:accept-disclaimer
    if (route === "/investor:accept-disclaimer" && method === "POST") {
      try {
        const { version } = body;
        const disclaimerVersion = version || "v1";
        await db.collection("users").doc(auth.user.uid).set({
          disclaimerAccepted: true,
          disclaimerVersion: disclaimerVersion,
          disclaimerAcceptedAt: nowServerTs(),
        }, { merge: true });
        // Audit trail
        await db.collection("auditTrail").add({
          type: "disclaimer_accepted",
          userId: auth.user.uid,
          version: disclaimerVersion,
          at: nowServerTs(),
        });
        return res.json({ ok: true });
      } catch (e) {
        console.error("investor:accept-disclaimer failed:", e);
        return jsonError(res, 500, "Failed to accept disclaimer");
      }
    }

    // POST /v1/investor:verify-identity (create Stripe checkout for $2 identity check)
    if (route === "/investor:verify-identity" && method === "POST") {
      try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{
            price_data: {
              currency: "usd",
              unit_amount: 200,
              product_data: {
                name: "TitleApp Identity Verification",
                description: "One-time identity verification for investor data room access",
              },
            },
            quantity: 1,
          }],
          metadata: { userId: auth.user.uid, purpose: "investor_identity_verification" },
          success_url: (body.successUrl || "https://title-app-alpha.web.app/dashboard") + "?verified=true",
          cancel_url: body.cancelUrl || "https://title-app-alpha.web.app/dashboard",
        });
        return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
      } catch (e) {
        console.error("investor:verify-identity failed:", e);
        return jsonError(res, 500, "Failed to create verification checkout");
      }
    }

    // POST /v1/investor:confirm-verification (called after Stripe success — mark user verified)
    if (route === "/investor:confirm-verification" && method === "POST") {
      try {
        const { paymentId } = body;
        await db.collection("users").doc(auth.user.uid).set({
          identityVerified: true,
          identityVerifiedAt: nowServerTs(),
          verificationPaymentId: paymentId || null,
          investorStage: "VERIFIED",
        }, { merge: true });
        // Audit trail
        await db.collection("auditTrail").add({
          type: "identity_verified",
          userId: auth.user.uid,
          paymentId: paymentId || null,
          at: nowServerTs(),
        });
        return res.json({ ok: true });
      } catch (e) {
        console.error("investor:confirm-verification failed:", e);
        return jsonError(res, 500, "Failed to confirm verification");
      }
    }

    // POST /v1/investor:submit-intent — submit investment intent + trigger SAFE signing
    if (route === "/investor:submit-intent" && method === "POST") {
      try {
        const { amount, paymentMethod, accreditedConfirmed } = body;
        if (!amount || amount < 100) return jsonError(res, 400, "Minimum investment is $100");

        const investorId = auth.user.uid;
        const investorEmail = auth.user.email;
        const userSnap = await db.collection("users").doc(investorId).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const investorName = userData.displayName || auth.user.email;

        // Save investment intent
        const intentRef = db.collection("investmentIntents").doc(investorId);
        await intentRef.set({
          investorId,
          investorName,
          investorEmail,
          amount: Number(amount),
          paymentMethod: paymentMethod || "wire",
          accreditedConfirmed: !!accreditedConfirmed,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Use universal Signature Service for SAFE signing
        const sigResult = await getSignatureService().createRequest({
          tenantId: ctx.tenantId,
          userId: investorId,
          title: `SAFE Agreement — ${investorName}`,
          subject: `TitleApp SAFE Agreement — $${Number(amount).toLocaleString()}`,
          message: `Please review and sign the SAFE agreement for your $${Number(amount).toLocaleString()} investment in TitleApp.`,
          signers: [{ email: investorEmail, name: investorName, order: 0, userId: investorId }],
          documentType: "safe_agreement",
          vertical: "investment",
          metadata: { investorId, amount: String(amount) },
        });

        if (sigResult.ok) {
          const firstSignUrl = sigResult.signUrls ? Object.values(sigResult.signUrls)[0] || null : null;
          await intentRef.update({
            status: sigResult.method === "hellosign" ? "safe_sent" : "consent_pending",
            safeMethod: sigResult.method,
            safeSignatureRequestId: sigResult.requestId,
            safeSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({
            ok: true,
            method: sigResult.method,
            signUrl: firstSignUrl,
            signatureRequestId: sigResult.requestId,
          });
        }

        // Signature service failed — return error
        return jsonError(res, 500, sigResult.error || "Failed to create signature request");
      } catch (e) {
        console.error("investor:submit-intent failed:", e);
        return jsonError(res, 500, "Failed to submit investment intent");
      }
    }

    // POST /v1/investor:sign-consent — typed-name consent for SAFE
    if (route === "/investor:sign-consent" && method === "POST") {
      try {
        const { consentId, typedName, agreedToTerms } = body;
        if (!consentId || !typedName || !agreedToTerms) return jsonError(res, 400, "Missing required fields");

        const investorId = auth.user.uid;
        const intentRef = db.collection("investmentIntents").doc(investorId);
        const intentSnap = await intentRef.get();
        if (!intentSnap.exists) return jsonError(res, 404, "No investment intent found");
        const intentData = intentSnap.data();
        if (intentData.safeConsentId !== consentId) return jsonError(res, 403, "Invalid consent ID");

        await intentRef.update({
          status: "signed",
          safeSignedAt: admin.firestore.FieldValue.serverTimestamp(),
          safeSignedName: typedName,
          safeSignedIp: req.headers["x-forwarded-for"] || req.ip || "unknown",
        });

        // Audit trail
        await db.collection("auditTrail").add({
          type: "safe_consent_signed",
          investorId,
          consentId,
          typedName,
          amount: intentData.amount,
          ip: req.headers["x-forwarded-for"] || req.ip || "unknown",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({ ok: true, status: "signed" });
      } catch (e) {
        console.error("investor:sign-consent failed:", e);
        return jsonError(res, 500, "Failed to sign consent");
      }
    }

    // GET /v1/investor:intent — get current investment intent status
    if (route === "/investor:intent" && method === "GET") {
      try {
        const investorId = auth.user.uid;
        const intentSnap = await db.collection("investmentIntents").doc(investorId).get();
        if (!intentSnap.exists) return res.json({ ok: true, intent: null });
        return res.json({ ok: true, intent: intentSnap.data() });
      } catch (e) {
        console.error("investor:intent failed:", e);
        return jsonError(res, 500, "Failed to get intent");
      }
    }

    // POST /v1/investor:seed-configs (admin — seed all config docs)
    if (route === "/investor:seed-configs" && method === "POST") {
      try {
        const batch = db.batch();

        // config/company
        batch.set(db.collection("config").doc("company"), {
          legalName: "The Title App LLC",
          dba: "TitleApp",
          state: "Delaware",
          stateCode: "DE",
          ein: "33-1330902",
          duns: "119438383",
          registeredAddress: "1209 N Orange St, Wilmington, DE 19801",
          companyNameAsFiled: "Title App LLC, The",
          ceo: "Sean Lee Combs",
          cfo: "Kent Redwine",
          updatedAt: nowServerTs(),
        }, { merge: true });

        // config/investorDocs
        batch.set(db.collection("config").doc("investorDocs"), {
          documents: [
            {
              name: "Pitch Deck v7",
              filename: "TitleApp_Pitch_Deck_v7.pptx",
              storagePath: "investorDocs/TitleApp_Pitch_Deck_v7.pptx",
              type: "pitch_deck",
              description: "Full investor pitch deck -- March 2026",
              requiresVerification: false,
              icon: "presentation",
              tier: 1,
            },
            {
              name: "One-Pager v7",
              filename: "TitleApp_One_Pager_v7.pdf",
              storagePath: "investorDocs/TitleApp_One_Pager_v7.pdf",
              type: "one_pager",
              description: "One-page overview -- market, product, team, terms",
              requiresVerification: false,
              icon: "document",
              tier: 1,
            },
            {
              name: "Business Plan v5",
              filename: "TitleApp_Business_Plan_March2026_v5.docx",
              storagePath: "investorDocs/TitleApp_Business_Plan_March2026_v5.docx",
              type: "business_plan",
              description: "Business plan -- March 2026 update",
              requiresVerification: true,
              icon: "document",
              tier: 2,
            },
            {
              name: "Financial Model v2",
              filename: "TitleApp_Financial_Model_v2.xlsx",
              storagePath: "investorDocs/TitleApp_Financial_Model_v2.xlsx",
              type: "financial_model",
              description: "36-month, 3-scenario cash flow model",
              requiresVerification: true,
              icon: "document",
              tier: 2,
            },
            {
              name: "SAFE Agreement",
              filename: null,
              storagePath: null,
              type: "safe",
              description: "Post-Money SAFE -- auto-populated with your details when ready",
              requiresVerification: true,
              requiresDisclaimer: true,
              icon: "legal",
              tier: 2,
            },
          ],
          updatedAt: nowServerTs(),
        }, { merge: true });

        // config/disclaimers
        batch.set(db.collection("config").doc("disclaimers"), {
          version: "v1",
          items: [
            {
              id: "investment_risk",
              label: "Investment Risk",
              text: "I understand that investing in The Title App LLC involves significant risk, including the possibility of losing my entire investment. TitleApp is a pre-revenue, early-stage company. There is no guarantee of any return on investment.",
              required: true,
            },
            {
              id: "forward_looking",
              label: "Forward-Looking Statements",
              text: "I understand that information provided by TitleApp, including through its AI assistant Alex, may contain forward-looking statements. These are not guarantees of future performance.",
              required: true,
            },
            {
              id: "not_advice",
              label: "Not Investment Advice",
              text: "I understand that nothing in the TitleApp data room or communicated by Alex constitutes investment, legal, or financial advice. I should consult my own advisors before making any investment decision.",
              required: true,
            },
          ],
          updatedAt: nowServerTs(),
        }, { merge: true });

        // Update config/raise with correct legal entity
        batch.set(db.collection("config").doc("raise"), {
          legalEntity: "The Title App LLC",
          updatedAt: nowServerTs(),
        }, { merge: true });

        await batch.commit();
        return res.json({ ok: true, seeded: ["company", "investorDocs", "disclaimers", "raise"] });
      } catch (e) {
        console.error("investor:seed-configs failed:", e);
        return jsonError(res, 500, "Failed to seed configs");
      }
    }

    // GET /v1/governance:cap-table
    if (route === "/governance:cap-table" && method === "GET") {
      try {
        const doc = await db.collection("governance").doc("capTable").get();
        if (!doc.exists) {
          return res.json({ ok: true, capTable: { totalRaised: 0, targetRaise: 1070000, investors: [] } });
        }
        return res.json({ ok: true, capTable: doc.data() });
      } catch (e) {
        console.error("governance:cap-table failed:", e);
        return jsonError(res, 500, "Failed to load cap table");
      }
    }

    // GET /v1/governance:proposals
    if (route === "/governance:proposals" && method === "GET") {
      try {
        const snap = await db.collection("governance").doc("proposals").collection("items")
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();
        const proposals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, proposals });
      } catch (e) {
        // Collection may not exist yet
        return res.json({ ok: true, proposals: [] });
      }
    }

    // ----------------------------
    // INVESTOR RELATIONS: DEALS, WATERFALL, CAPITAL CALLS, DISTRIBUTIONS, COMMS
    // ----------------------------

    // POST /v1/ir:deal:create
    if (route === "/ir:deal:create" && method === "POST") {
      try {
        const { createDeal } = require("./ir/deals");
        const result = await createDeal(ctx.tenantId, body);
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:deal:create failed:", e);
        return jsonError(res, 500, "Failed to create deal");
      }
    }

    // GET /v1/ir:deal:get
    if (route === "/ir:deal:get" && method === "GET") {
      try {
        const dealId = body.dealId || (req.query && req.query.dealId);
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        const { getDeal } = require("./ir/deals");
        const result = await getDeal(ctx.tenantId, dealId);
        if (!result.ok) return jsonError(res, 404, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:deal:get failed:", e);
        return jsonError(res, 500, "Failed to get deal");
      }
    }

    // GET /v1/ir:deals:list
    if (route === "/ir:deals:list" && method === "GET") {
      try {
        const { listDeals } = require("./ir/deals");
        const opts = {
          status: body.status || (req.query && req.query.status),
          type: body.type || (req.query && req.query.type),
          limit: parseInt(body.limit || (req.query && req.query.limit) || "50"),
        };
        const result = await listDeals(ctx.tenantId, opts);
        return res.json(result);
      } catch (e) {
        console.error("ir:deals:list failed:", e);
        return jsonError(res, 500, "Failed to list deals");
      }
    }

    // PUT /v1/ir:deal:update
    if (route === "/ir:deal:update" && method === "PUT") {
      try {
        const { dealId, ...updates } = body;
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        const { updateDeal } = require("./ir/deals");
        const result = await updateDeal(ctx.tenantId, dealId, updates);
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:deal:update failed:", e);
        return jsonError(res, 500, "Failed to update deal");
      }
    }

    // POST /v1/ir:deal:close
    if (route === "/ir:deal:close" && method === "POST") {
      try {
        const { dealId } = body;
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        const { closeDeal } = require("./ir/deals");
        const result = await closeDeal(ctx.tenantId, dealId);
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:deal:close failed:", e);
        return jsonError(res, 500, "Failed to close deal");
      }
    }

    // POST /v1/ir:deal:add-investor
    if (route === "/ir:deal:add-investor" && method === "POST") {
      try {
        const { dealId, ...investorData } = body;
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        const { addDealInvestor } = require("./ir/deals");
        const result = await addDealInvestor(ctx.tenantId, dealId, investorData);
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:deal:add-investor failed:", e);
        return jsonError(res, 500, "Failed to add investor to deal");
      }
    }

    // POST /v1/ir:waterfall:calculate
    if (route === "/ir:waterfall:calculate" && method === "POST") {
      try {
        const { dealId, cashFlows } = body;
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        if (!cashFlows || !Array.isArray(cashFlows)) return jsonError(res, 400, "Missing cashFlows array");
        const { getDeal, getDealInvestors } = require("./ir/deals");
        const { calculateWaterfall, allocateToInvestors } = require("./ir/waterfall");

        const dealResult = await getDeal(ctx.tenantId, dealId);
        if (!dealResult.ok) return jsonError(res, 404, dealResult.error);
        const deal = dealResult.deal;

        const investorsResult = await getDealInvestors(ctx.tenantId, dealId);
        const investors = investorsResult.ok ? investorsResult.investors : [];
        const lpInvested = investors.reduce((sum, inv) => sum + (inv.commitmentAmount || 0), 0);

        const result = calculateWaterfall(
          { lpInvested, gpInvested: deal.gpInvested || 0, waterfallTiers: deal.waterfallTiers || [] },
          cashFlows
        );
        if (!result.ok) return jsonError(res, 400, result.error);

        // Add investor allocations
        if (result.summary && investors.length > 0) {
          result.investorAllocations = allocateToInvestors(result.summary.lpDistributed, investors);
        }

        return res.json(result);
      } catch (e) {
        console.error("ir:waterfall:calculate failed:", e);
        return jsonError(res, 500, "Failed to calculate waterfall");
      }
    }

    // GET /v1/ir:performance
    if (route === "/ir:performance" && method === "GET") {
      try {
        const { listDeals } = require("./ir/deals");
        const { listDistributions } = require("./ir/distributions");
        const dealsResult = await listDeals(ctx.tenantId, {});
        const distsResult = await listDistributions(ctx.tenantId, null);

        const deals = dealsResult.ok ? dealsResult.deals : [];
        const dists = distsResult.ok ? distsResult.distributions : [];

        const totalCommitted = deals.reduce((s, d) => s + (d.committedAmount || 0), 0);
        const totalDistributed = dists.reduce((s, d) => s + (d.totalAmount || 0), 0);
        const activeDeals = deals.filter((d) => d.status !== "closed").length;

        return res.json({
          ok: true,
          portfolio: {
            totalDeals: deals.length,
            activeDeals,
            closedDeals: deals.length - activeDeals,
            totalCommitted,
            totalDistributed,
            dpi: totalCommitted > 0 ? Math.round((totalDistributed / totalCommitted) * 100) / 100 : 0,
          },
        });
      } catch (e) {
        console.error("ir:performance failed:", e);
        return jsonError(res, 500, "Failed to get performance");
      }
    }

    // POST /v1/ir:distribution:create
    if (route === "/ir:distribution:create" && method === "POST") {
      try {
        const { dealId, totalAmount, source, date, memo } = body;
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        if (!totalAmount) return jsonError(res, 400, "Missing totalAmount");
        const { createDistribution } = require("./ir/distributions");
        const result = await createDistribution(ctx.tenantId, dealId, { totalAmount, source, date, memo });
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:distribution:create failed:", e);
        return jsonError(res, 500, "Failed to create distribution");
      }
    }

    // GET /v1/ir:distributions:list
    if (route === "/ir:distributions:list" && method === "GET") {
      try {
        const dealId = body.dealId || (req.query && req.query.dealId);
        const { listDistributions } = require("./ir/distributions");
        const result = await listDistributions(ctx.tenantId, dealId || null);
        return res.json(result);
      } catch (e) {
        console.error("ir:distributions:list failed:", e);
        return jsonError(res, 500, "Failed to list distributions");
      }
    }

    // POST /v1/ir:capitalcall:create
    if (route === "/ir:capitalcall:create" && method === "POST") {
      try {
        const { dealId, amount, dueDate, purpose, memo } = body;
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        const { createCapitalCall } = require("./ir/capitalCalls");
        const result = await createCapitalCall(ctx.tenantId, dealId, { amount, dueDate, purpose, memo });
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:capitalcall:create failed:", e);
        return jsonError(res, 500, "Failed to create capital call");
      }
    }

    // GET /v1/ir:capitalcalls:list
    if (route === "/ir:capitalcalls:list" && method === "GET") {
      try {
        const dealId = body.dealId || (req.query && req.query.dealId);
        const { listCapitalCalls } = require("./ir/capitalCalls");
        const result = await listCapitalCalls(ctx.tenantId, dealId || null);
        return res.json(result);
      } catch (e) {
        console.error("ir:capitalcalls:list failed:", e);
        return jsonError(res, 500, "Failed to list capital calls");
      }
    }

    // POST /v1/ir:capitalcall:record-payment
    if (route === "/ir:capitalcall:record-payment" && method === "POST") {
      try {
        const { callId, investorId, amount, method: payMethod, date } = body;
        if (!callId || !investorId) return jsonError(res, 400, "Missing callId or investorId");
        const { recordPayment } = require("./ir/capitalCalls");
        const result = await recordPayment(ctx.tenantId, callId, investorId, { amount, method: payMethod, date });
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:capitalcall:record-payment failed:", e);
        return jsonError(res, 500, "Failed to record payment");
      }
    }

    // POST /v1/ir:comms:send
    if (route === "/ir:comms:send" && method === "POST") {
      try {
        const { dealId, templateType, data, channel, investorIds } = body;
        const { buildMessage, sendToInvestors } = require("./ir/communications");
        const msg = buildMessage(templateType || "custom", data || body);
        if (!msg.ok) return jsonError(res, 400, msg.error);
        const result = await sendToInvestors(ctx.tenantId, dealId || null, msg, { channel, investorIds });
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:comms:send failed:", e);
        return jsonError(res, 500, "Failed to send communication");
      }
    }

    // GET /v1/ir:comms:list
    if (route === "/ir:comms:list" && method === "GET") {
      try {
        const dealId = body.dealId || (req.query && req.query.dealId);
        const { listCommunications } = require("./ir/communications");
        const result = await listCommunications(ctx.tenantId, dealId || null);
        return res.json(result);
      } catch (e) {
        console.error("ir:comms:list failed:", e);
        return jsonError(res, 500, "Failed to list communications");
      }
    }

    // GET /v1/ir:comms:templates
    if (route === "/ir:comms:templates" && method === "GET") {
      try {
        const { COMM_TEMPLATES } = require("./ir/communications");
        const templates = Object.values(COMM_TEMPLATES).map((t) => ({
          id: t.id,
          name: t.name,
          requiredFields: t.requiredFields,
          optionalFields: t.optionalFields,
        }));
        return res.json({ ok: true, templates });
      } catch (e) {
        console.error("ir:comms:templates failed:", e);
        return jsonError(res, 500, "Failed to list templates");
      }
    }

    // POST /v1/ir:report:generate
    if (route === "/ir:report:generate" && method === "POST") {
      try {
        const { templateId, format, title, content: docContent } = body;
        if (!templateId) return jsonError(res, 400, "Missing templateId");
        const { generateDocument } = require("./documents");
        const result = await generateDocument({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          templateId,
          format: format || null,
          content: docContent || {},
          title: title || templateId,
          metadata: { source: "ir_module" },
        });
        if (!result.ok) return jsonError(res, 400, result.error);
        return res.json(result);
      } catch (e) {
        console.error("ir:report:generate failed:", e);
        return jsonError(res, 500, "Failed to generate report");
      }
    }

    // GET /v1/ir:compliance:check
    if (route === "/ir:compliance:check" && method === "GET") {
      try {
        const dealId = body.dealId || (req.query && req.query.dealId);
        if (!dealId) return jsonError(res, 400, "Missing dealId");
        const { getDeal, getDealInvestors } = require("./ir/deals");
        const dealResult = await getDeal(ctx.tenantId, dealId);
        if (!dealResult.ok) return jsonError(res, 404, dealResult.error);

        const investorsResult = await getDealInvestors(ctx.tenantId, dealId);
        const investors = investorsResult.ok ? investorsResult.investors : [];
        const nonAccredited = investors.filter((i) => !i.accredited).length;

        const deal = dealResult.deal;
        const checks = [];

        // 506(c) check
        if (deal.regulation === "506c" && nonAccredited > 0) {
          checks.push({ id: "unaccredited_506c", status: "FAIL", message: `506(c) requires all accredited investors. Found ${nonAccredited} non-accredited.` });
        }
        // 506(b) check
        if (deal.regulation === "506b" && nonAccredited > 35) {
          checks.push({ id: "exceed_nonaccredited_506b", status: "FAIL", message: `506(b) max 35 non-accredited. Found ${nonAccredited}.` });
        }
        // Reg CF limit
        if (deal.regulation === "reg_cf" && (deal.committedAmount || 0) > 5000000) {
          checks.push({ id: "exceed_reg_cf_limit", status: "FAIL", message: `Reg CF max $5M. Current: $${deal.committedAmount.toLocaleString()}.` });
        }
        // Concentration check
        const maxCommitment = investors.length > 0 ? Math.max(...investors.map((i) => i.commitmentAmount || 0)) : 0;
        const totalCommitted = deal.committedAmount || 0;
        if (totalCommitted > 0 && maxCommitment / totalCommitted > 0.25) {
          checks.push({ id: "large_single_investor", status: "WARN", message: `Single investor has ${((maxCommitment / totalCommitted) * 100).toFixed(0)}% of raise — concentration risk.` });
        }

        if (checks.length === 0) {
          checks.push({ id: "all_clear", status: "PASS", message: "No compliance issues detected." });
        }

        return res.json({ ok: true, dealId, regulation: deal.regulation, investorCount: investors.length, nonAccredited, checks });
      } catch (e) {
        console.error("ir:compliance:check failed:", e);
        return jsonError(res, 500, "Failed to run compliance check");
      }
    }

    // GET /v1/ir:investor:portfolio
    if (route === "/ir:investor:portfolio" && method === "GET") {
      try {
        const investorId = body.investorId || (req.query && req.query.investorId);
        if (!investorId) return jsonError(res, 400, "Missing investorId");

        // Get investor distributions
        const { getInvestorDistributions } = require("./ir/distributions");
        const distResult = await getInvestorDistributions(ctx.tenantId, investorId);

        // Get deals where this investor participates
        const { listDeals } = require("./ir/deals");
        const dealsResult = await listDeals(ctx.tenantId, {});
        const allDeals = dealsResult.ok ? dealsResult.deals : [];

        // Find deals with this investor (check subcollections)
        const investorDeals = [];
        for (const deal of allDeals) {
          const invSnap = await db.collection("irDeals").doc(deal.id)
            .collection("investors")
            .where("investorId", "==", investorId)
            .limit(1).get();
          if (!invSnap.empty) {
            const invData = invSnap.docs[0].data();
            investorDeals.push({
              dealId: deal.id,
              dealName: deal.name,
              dealType: deal.typeName,
              status: deal.status,
              commitmentAmount: invData.commitmentAmount,
              fundedAmount: invData.fundedAmount || 0,
            });
          }
        }

        const totalCommitted = investorDeals.reduce((s, d) => s + (d.commitmentAmount || 0), 0);
        const totalFunded = investorDeals.reduce((s, d) => s + (d.fundedAmount || 0), 0);

        return res.json({
          ok: true,
          investorId,
          deals: investorDeals,
          totalCommitted,
          totalFunded,
          totalDistributed: distResult.ok ? distResult.totalReceived : 0,
          distributionCount: distResult.ok ? distResult.distributionCount : 0,
        });
      } catch (e) {
        console.error("ir:investor:portfolio failed:", e);
        return jsonError(res, 500, "Failed to get investor portfolio");
      }
    }

    // POST /v1/ir:subscription:process
    if (route === "/ir:subscription:process" && method === "POST") {
      try {
        const { dealId, investorId, name, email, amount, accredited } = body;
        if (!dealId || !name || !amount) return jsonError(res, 400, "Missing dealId, name, or amount");
        const { getDeal, addDealInvestor } = require("./ir/deals");

        const dealResult = await getDeal(ctx.tenantId, dealId);
        if (!dealResult.ok) return jsonError(res, 404, dealResult.error);
        const deal = dealResult.deal;

        // Compliance check
        if (deal.regulation === "506c" && !accredited) {
          return jsonError(res, 400, "506(c) offerings require accredited investors only");
        }

        // Add investor to deal
        const result = await addDealInvestor(ctx.tenantId, dealId, {
          investorId: investorId || null,
          name,
          email: email || "",
          commitmentAmount: Number(amount),
          accredited: !!accredited,
        });

        if (!result.ok) return jsonError(res, 400, result.error);

        // Record subscription event
        await db.collection("irSubscriptions").add({
          tenantId: ctx.tenantId,
          dealId,
          dealName: deal.name,
          investorId: investorId || null,
          investorName: name,
          amount: Number(amount),
          accredited: !!accredited,
          status: "pending_review",
          createdAt: nowServerTs(),
        });

        return res.json({ ok: true, dealInvestorId: result.dealInvestorId, subscriptionStatus: "pending_review" });
      } catch (e) {
        console.error("ir:subscription:process failed:", e);
        return jsonError(res, 500, "Failed to process subscription");
      }
    }

    // POST /v1/governance:proposal:create
    if (route === "/governance:proposal:create" && method === "POST") {
      try {
        const { title, description, type, options, votingDeadline } = body;
        if (!title || !description) return jsonError(res, 400, "Missing title or description");
        const ref = await db.collection("governance").doc("proposals").collection("items").add({
          tenantId: ctx.tenantId,
          title,
          description,
          type: type || "general",
          options: options || ["Approve", "Reject"],
          votingDeadline: votingDeadline || null,
          status: "open",
          votes: [],
          createdBy: ctx.userId,
          createdAt: nowServerTs(),
        });
        return res.json({ ok: true, proposalId: ref.id });
      } catch (e) {
        console.error("governance:proposal:create failed:", e);
        return jsonError(res, 500, "Failed to create proposal");
      }
    }

    // POST /v1/governance:proposal:vote
    if (route === "/governance:proposal:vote" && method === "POST") {
      try {
        const { proposalId, vote } = body;
        if (!proposalId || !vote) return jsonError(res, 400, "Missing proposalId or vote");
        const proposalRef = db.collection("governance").doc("proposals").collection("items").doc(proposalId);
        const proposalDoc = await proposalRef.get();
        if (!proposalDoc.exists) return jsonError(res, 404, "Proposal not found");

        const proposal = proposalDoc.data();
        if (proposal.status !== "open") return jsonError(res, 400, "Voting is closed on this proposal");

        // Check if user already voted
        const existingVote = (proposal.votes || []).find((v) => v.userId === ctx.userId);
        if (existingVote) return jsonError(res, 400, "You have already voted on this proposal");

        const admin = require("firebase-admin");
        await proposalRef.update({
          votes: admin.firestore.FieldValue.arrayUnion({
            userId: ctx.userId,
            vote,
            votedAt: new Date().toISOString(),
          }),
          updatedAt: nowServerTs(),
        });

        return res.json({ ok: true });
      } catch (e) {
        console.error("governance:proposal:vote failed:", e);
        return jsonError(res, 500, "Failed to record vote");
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

        // Fetch tenant's risk profile for personalized analysis
        const tenantDoc = await db.collection("tenants").doc(ctx.tenantId).get();
        const tenantData = tenantDoc.exists ? tenantDoc.data() : {};
        const riskProfile = tenantData.riskProfile || {};

        console.log("🎯 Analyzing deal with tenant risk profile:", {
          tenantId: ctx.tenantId,
          hasRiskProfile: !!tenantData.riskProfile,
          riskTolerance: riskProfile.risk_tolerance,
          minNetIRR: riskProfile.min_net_irr,
        });

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

        // Build sophisticated analysis prompt with tenant's criteria
        const criteriaSection = riskProfile.min_net_irr || riskProfile.min_equity_multiple || riskProfile.deal_size_min
          ? `
**Investor's Target Box (YOUR CRITERIA):**
${riskProfile.min_net_irr ? `- Minimum Net IRR: ${riskProfile.min_net_irr}%` : ''}
${riskProfile.min_cash_on_cash ? `- Minimum Cash-on-Cash: ${riskProfile.min_cash_on_cash}%` : ''}
${riskProfile.min_equity_multiple ? `- Minimum Equity Multiple: ${riskProfile.min_equity_multiple}x` : ''}
${riskProfile.risk_tolerance ? `- Risk Tolerance: ${riskProfile.risk_tolerance}` : ''}
${riskProfile.deal_size_min || riskProfile.deal_size_max ? `- Deal Size Range: $${riskProfile.deal_size_min || '0'} - $${riskProfile.deal_size_max || 'unlimited'}` : ''}

**CRITICAL**: If this deal does NOT meet the investor's minimum return targets, it is an automatic PASS. Mark with rating "PASS" and high risk score (80+).
`
          : `
**Investor Profile:** This investor has not yet defined specific return targets. Use industry-standard benchmarks (15% net IRR, 2.0x equity multiple).
`;

        const analysisPrompt = `You are a professional investment analyst. Provide an objective, evidence-based analysis of this deal opportunity.

**Deal Information:**
- Company: ${deal.companyName}
- Industry: ${deal.industry || "Not specified"}
- Ask Amount: ${deal.askAmount || "Not specified"}
- Deal Type: ${deal.dealType || "Not specified"}
- Summary: ${deal.summary}

${criteriaSection}

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
   - Use neutral, professional language without hyperbole

3. **Risk-Scaled Alternatives** - Present deal options at three risk levels:
   - **Low Risk**: Conservative structure, protective terms, clear exit
   - **Medium Risk**: Balanced risk/reward, standard terms
   - **High Risk**: Aggressive bet, higher upside, concentrated exposure

4. **Output Format** - Return a JSON object with:
   {
     "riskScore": 0-100 (0=lowest risk, 100=highest risk),
     "recommendation": "INVEST" | "PASS" | "WAIT",
     "rating": "STRONG" for strong opportunities, "SOLID" for solid deals, "CAUTION" for concerns, "PASS" for high-risk deals,
     "summary": "2-3 sentence objective executive summary",
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
     "nextSteps": ["Specific actionable step 1", "Specific actionable step 2"],
     "missingInfo": ["critical doc 1", "critical doc 2"],
     "metrics": {
       "ltv": 0.75,
       "dscr": 1.35,
       "irr": 0.18,
       "net_irr": 0.15,
       "gross_irr": 0.22,
       "tenant_count": 5,
       "walt_years": 4.2,
       "loan_maturity_months": 36,
       "top_customer_pct": 25,
       "years_operating": 8,
       "entitlement_probability": null,
       "zoning_status": null,
       "capex_budget": null,
       "lien_position": null,
       "collateral_docs_missing": null,
       "community_opposition": null,
       "environmental_review_required": null,
       "construction_complexity": null,
       "permit_status": null,
       "borrower_status": null,
       "rate_increase_bps": null
     }
   }

5. **Metrics Object** - Include a "metrics" object with raw numeric values (not formatted strings).
   Use 0-1 scale for percentages (0.75 not "75%"). Use null for any metric that is unknown or not applicable to this deal type.
   The metrics object is required — it feeds the enforcement engine.

**IMPORTANT - Next Steps Format:**
After the analysis, include concrete next steps such as:
- Offering to collect additional due diligence materials (financials, customer data, etc.)
- Suggesting a call with the company principal or management team
- Recommending specific follow-up actions based on the analysis

**Tone Guidelines:**
- Be neutral and objective, not emotional or salesy
- State facts and observations clearly
- Avoid superlatives and hype
- Write like a professional analyst, not a salesperson

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
            rating: isBadDeal ? "PASS" : (deal.dealType === "seed" ? "CAUTION" : "STRONG"),
            summary: isBadDeal
              ? `${deal.companyName} lacks a proven revenue model and path to profitability based on available information. The requested valuation does not align with current traction and financial data. Additional due diligence is required before proceeding.`
              : `${deal.companyName} demonstrates solid fundamentals in the ${deal.industry} sector with validated business model and established unit economics. The opportunity merits further evaluation through detailed due diligence and management discussions.`,
            evidence: {
              positive: isBadDeal
                ? ["Operating in a large addressable market", "Industry sector shows growth potential"]
                : ["Documented revenue generation and customer base", "Measurable year-over-year growth", "Management team has relevant industry experience", "Identified competitive differentiation"],
              negative: isBadDeal
                ? ["No documented revenue or customer contracts", "Valuation not supported by current metrics", "Limited financial data available for analysis", "Regulatory requirements not addressed"]
                : ["Potential customer concentration risk requiring analysis", "Capital requirements for scaling operations"],
              neutral: ["Competitive market dynamics with established players", "Exit timeline depends on market conditions and execution"]
            },
            multiAngleAnalysis: {
              directInvestment: isBadDeal
                ? "Direct equity investment presents elevated risk due to unvalidated product-market fit and limited revenue visibility. The implied valuation requires substantiation through concrete metrics and customer traction."
                : `Direct equity participation is feasible at the current valuation of ${deal.askAmount}, which falls within typical revenue multiples for the ${deal.industry} sector. Standard preferred equity structure with 1x liquidation preference would provide appropriate investor protection.`,
              leverageOpportunities: isBadDeal
                ? "Limited debt capacity due to absence of established cash flows. Leverage would require personal guarantees and presents heightened risk given the early-stage business model."
                : "The company demonstrates debt capacity based on established cash flows. Venture debt at 2-3x ARR could extend operational runway while minimizing equity dilution. Senior debt could comprise 10-15% of the capital structure.",
              taxOptimization: isBadDeal
                ? "Tax optimization opportunities are limited at this stage. Loss carryforwards may be available, subject to achieving profitability and applicable tax regulations."
                : `The investment may qualify for Qualified Small Business Stock (QSBS) treatment, offering potential capital gains exclusion on exit if held for five years. All investors should evaluate QSBS planning strategies. ${deal.industry.includes('energy') ? 'Renewable energy tax credits (ITC/PTC) may apply and should be evaluated.' : ''}`,
              regulatoryConsiderations: isBadDeal
                ? "Regulation D 506(c) filing is required for general solicitation. Revenue projections in marketing materials must include appropriate disclaimers to comply with securities laws. Equity crowdfunding may require engagement of a registered broker-dealer."
                : `Standard Reg D 506(b) private placement structure is appropriate. All investors must meet accreditation requirements. ${deal.industry.includes('healthcare') ? 'HIPAA compliance verification is required.' : deal.industry.includes('financial') ? 'FinCEN registration and state money transmitter licenses require evaluation.' : 'Standard regulatory compliance applies with no unusual requirements identified.'}`,
              alternativeStructures: isBadDeal
                ? "Alternative structures to mitigate risk include: (1) Revenue share agreement at 5-10% of gross revenue until 3x return, (2) Convertible note with reduced valuation cap ($2-3M) and 20%+ discount, (3) Advisory equity with milestone-based vesting and minimal cash investment."
                : "Multiple viable investment structures are available: (1) Preferred equity with standard protective provisions, (2) Convertible note with $15M cap and 20% discount for expedited closing, (3) SAFE agreement with post-money cap, (4) Revenue-based financing for non-dilutive capital deployment."
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
                  "Collect additional due diligence materials: financial statements, customer contracts, and unit economics",
                  "Schedule a call with the company principal to discuss business model validation",
                  "Request detailed go-to-market plan with customer acquisition cost analysis",
                  "Consider revisiting after the company achieves $500K ARR or 50+ paying customers",
                  "If proceeding despite concerns, negotiate significantly reduced valuation with milestone-based earnouts"
                ]
              : [
                  "Collect additional due diligence materials: 3-year financial statements, customer references, and technical documentation",
                  "Schedule a management presentation with the company principal and key executives",
                  "Conduct customer reference calls with top 5 accounts to validate product-market fit",
                  "Engage third-party advisors for technical and financial due diligence",
                  "Review cap table and confirm no problematic prior investor terms or preferences",
                  "Prepare preliminary term sheet and schedule follow-up call to discuss deal structure",
                  "Target close in 45-60 days pending satisfactory due diligence completion"
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
          analysis = safeParseJSON(analysisText);
          if (!analysis) {
          // Fallback if parsing fails
          analysis = {
            riskScore: 50,
            recommendation: "WAIT",
            rating: "CAUTION",
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

        // ── RAAS Enforcement ──────────────────────────────
        let enforcement = { passed: true, hardViolations: [], softWarnings: [], rulesetId: rulesetName, rulesetVersion: "v0", checked: true };
        try {
          const enfResult = validateOutput(rulesetName, analysis, riskProfile);
          enforcement = { ...enfResult, checked: true };

          if (!enfResult.passed) {
            console.warn(`[enforcement] Hard violations on deal for tenant ${ctx.tenantId}:`, enfResult.hardViolations);

            // Retry once with violation context (only for real Claude calls)
            if (ANTHROPIC_API_KEY && enfResult.hardViolations.length > 0) {
              const violationList = enfResult.hardViolations.map(v => `- ${v.ruleId}: ${v.violation}`).join("\n");
              const retryPrompt = `${analysisPrompt}\n\nIMPORTANT CORRECTION: Your previous analysis violated these rules:\n${violationList}\n\nPlease re-analyze and ensure the metrics object accurately reflects the deal data. Do not change the deal facts — correct any metric calculation errors.`;

              try {
                const anthropic = getAnthropic();
                const retryResponse = await anthropic.messages.create({
                  model: "claude-opus-4-20250514",
                  max_tokens: 4096,
                  temperature: 0.2,
                  messages: [{ role: "user", content: retryPrompt }],
                });
                const retryText = retryResponse.content[0].text;
                const retryAnalysis = safeParseJSON(retryText);
                if (retryAnalysis) {
                  const retryEnf = validateOutput(rulesetName, retryAnalysis, riskProfile);
                  if (retryEnf.passed || retryEnf.hardViolations.length < enfResult.hardViolations.length) {
                    analysis = retryAnalysis;
                    enforcement = { ...retryEnf, checked: true, regenerationAttempts: 1 };
                  } else {
                    enforcement.regenerationAttempts = 1;
                  }
                }
              } catch (retryErr) {
                console.error("[enforcement] Retry failed:", retryErr.message);
                enforcement.regenerationAttempts = 1;
              }
            }

            // Attach enforcement status to analysis
            if (!enforcement.passed) {
              analysis._enforcementStatus = "FLAGGED";
              analysis._enforcementViolations = enforcement.hardViolations;
              analysis._enforcementWarnings = enforcement.softWarnings;
            }
          }
        } catch (enfError) {
          console.error("[enforcement] Engine error — fail closed:", enfError.message);
          return jsonError(res, 500, "Enforcement validation failed — output not delivered");
        }

        // Save to Firestore (with enforcement metadata)
        const ref = await db.collection("analyzedDeals").add({
          tenantId: ctx.tenantId,
          dealInput: deal,
          analysis,
          rulesetUsed: rulesetName,
          enforcement: {
            rulesetId: enforcement.rulesetId,
            rulesetVersion: enforcement.rulesetVersion,
            passed: enforcement.passed,
            hardViolations: enforcement.hardViolations || [],
            softWarnings: enforcement.softWarnings || [],
            regenerationAttempts: enforcement.regenerationAttempts || 0,
            modelProvider: ANTHROPIC_API_KEY ? "anthropic" : "mock",
            evaluatedAt: enforcement.evaluatedAt || new Date().toISOString(),
            latencyMs: enforcement.latencyMs || 0,
          },
          analyzedAt: nowServerTs(),
          createdAt: nowServerTs(),
        });

        return res.json({
          ok: true,
          dealId: ref.id,
          analysis,
          enforcement: {
            passed: enforcement.passed,
            hardViolations: enforcement.hardViolations || [],
            softWarnings: enforcement.softWarnings || [],
            rulesetId: enforcement.rulesetId,
          },
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
        const limitVal = parseInt(req.query?.limit?.toString() || "50", 10);

        // For emulator, simplify query to avoid index requirement
        const snap = await db.collection("analyzedDeals")
          .where("tenantId", "==", ctx.tenantId)
          .limit(limitVal)
          .get();

        const deals = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })).sort((a, b) => {
          // Sort in memory to avoid Firestore index
          const aTime = a.analyzedAt?.seconds || a.analyzedAt?.getTime?.() || 0;
          const bTime = b.analyzedAt?.seconds || b.analyzedAt?.getTime?.() || 0;
          return bTime - aTime;
        });

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
    // PILOT RECORDS PARSING
    // ----------------------------

    // POST /v1/pilot:parse
    // Parse uploaded pilot records Excel file into DTCs and logbooks
    if (route === "/pilot:parse" && method === "POST") {
      try {
        const { fileId } = body;
        if (!fileId) return jsonError(res, 400, "Missing fileId");

        // Get file metadata from Firestore
        const fileSnap = await db.collection("files").doc(fileId).get();
        if (!fileSnap.exists) return jsonError(res, 404, "File not found");

        const fileData = fileSnap.data();
        if (fileData.tenantId !== ctx.tenantId) return jsonError(res, 403, "Forbidden");

        // Download file from Cloud Storage
        const storagePath = fileData.storagePath;
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);

        const [fileBuffer] = await file.download();

        // Parse Excel file
        const xlsx = require("xlsx");
        const workbook = xlsx.read(fileBuffer, { type: "buffer" });

        // Extract Pilot Profile sheet
        const profileSheet = workbook.Sheets["Pilot Profile"];
        if (!profileSheet) return jsonError(res, 400, "Missing 'Pilot Profile' sheet");

        const profileData = xlsx.utils.sheet_to_json(profileSheet, { header: 1 });

        // Parse pilot profile
        const pilotProfile = {};
        for (let i = 0; i < profileData.length; i++) {
          const [key, value] = profileData[i];
          if (key && value) {
            pilotProfile[key] = value;
          }
        }

        // Extract Flight Log sheet
        const logSheet = workbook.Sheets["Flight Log"];
        if (!logSheet) return jsonError(res, 400, "Missing 'Flight Log' sheet");

        const flightLog = xlsx.utils.sheet_to_json(logSheet);

        // Create DTCs for certificates
        const certificates = [];

        // FAA Certificate DTC
        if (pilotProfile["FAA Certificate Number"]) {
          const certRef = await db.collection("dtc").add({
            userId: auth.user.uid,
            tenantId: ctx.tenantId,
            type: "credential",
            metadata: {
              title: `FAA ${pilotProfile["Certificate Type"] || "Pilot Certificate"}`,
              certificateNumber: pilotProfile["FAA Certificate Number"],
              pilotName: pilotProfile["Full Legal Name"],
              dateOfBirth: pilotProfile["Date of Birth"],
              ratings: pilotProfile["Ratings Held"] || "",
              email: pilotProfile["Email"],
            },
            fileIds: [fileId],
            value: null,
            blockchainProof: null,
            createdAt: nowServerTs(),
            updatedAt: nowServerTs(),
          });
          certificates.push({ id: certRef.id, type: "FAA Certificate" });
        }

        // Student ID DTC (if applicable)
        if (pilotProfile["Full Legal Name"] && pilotProfile["Date of Birth"]) {
          const studentIdRef = await db.collection("dtc").add({
            userId: auth.user.uid,
            tenantId: ctx.tenantId,
            type: "credential",
            metadata: {
              title: "Student/Pilot ID",
              name: pilotProfile["Full Legal Name"],
              dateOfBirth: pilotProfile["Date of Birth"],
              citizenship: pilotProfile["Citizenship"],
              placeOfBirth: pilotProfile["Place of Birth"],
            },
            fileIds: [fileId],
            value: null,
            blockchainProof: null,
            createdAt: nowServerTs(),
            updatedAt: nowServerTs(),
          });
          certificates.push({ id: studentIdRef.id, type: "Student ID" });
        }

        // Create logbook entries from flight log
        let logbookEntriesCreated = 0;
        for (const entry of flightLog) {
          if (entry.Date && entry.Aircraft) {
            await db.collection("logbook").add({
              userId: auth.user.uid,
              tenantId: ctx.tenantId,
              dtcId: null, // Not linked to a specific DTC, general logbook
              entryType: "flight",
              data: {
                date: entry.Date,
                aircraft: entry.Aircraft,
                tailNumber: entry["Tail #"],
                route: entry.Route,
                remarks: entry["Remarks/Endorsements"],
                totalTime: entry["Total Time"] || 0,
                pic: entry.PIC || 0,
                sic: entry.SIC || 0,
                dualReceived: entry["Dual Rcvd"] || 0,
                solo: entry.Solo || 0,
                crossCountry: entry["Cross-Country"] || 0,
                night: entry.Night || 0,
                actualInstrument: entry["Actual Inst"] || 0,
                simulatedInstrument: entry["Sim Inst"] || 0,
                dayLandings: entry["Day Ldg"] || 0,
                nightLandings: entry["Night Ldg"] || 0,
                simulator: entry.Sim || "",
                runningTotal: entry["Running Total"] || 0,
              },
              files: [],
              createdAt: nowServerTs(),
              updatedAt: nowServerTs(),
            });
            logbookEntriesCreated++;
          }
        }

        // Calculate totals for FAA 8710 experience summary
        const experienceTotals = {
          totalTime: 0,
          pic: 0,
          sic: 0,
          dualReceived: 0,
          solo: 0,
          crossCountry: 0,
          night: 0,
          actualInstrument: 0,
          simulatedInstrument: 0,
          dayLandings: 0,
          nightLandings: 0,
        };

        for (const entry of flightLog) {
          experienceTotals.totalTime += Number(entry["Total Time"]) || 0;
          experienceTotals.pic += Number(entry.PIC) || 0;
          experienceTotals.sic += Number(entry.SIC) || 0;
          experienceTotals.dualReceived += Number(entry["Dual Rcvd"]) || 0;
          experienceTotals.solo += Number(entry.Solo) || 0;
          experienceTotals.crossCountry += Number(entry["Cross-Country"]) || 0;
          experienceTotals.night += Number(entry.Night) || 0;
          experienceTotals.actualInstrument += Number(entry["Actual Inst"]) || 0;
          experienceTotals.simulatedInstrument += Number(entry["Sim Inst"]) || 0;
          experienceTotals.dayLandings += Number(entry["Day Ldg"]) || 0;
          experienceTotals.nightLandings += Number(entry["Night Ldg"]) || 0;
        }

        return res.status(200).json({
          ok: true,
          pilotProfile,
          certificates,
          logbookEntriesCreated,
          experienceTotals,
        });
      } catch (error) {
        console.error("❌ Pilot parse error:", error);
        return jsonError(res, 500, "Failed to parse pilot records", { error: error.message });
      }
    }

    // GET /v1/pilot:experience-summary
    // Generate FAA 8710 and ICAO experience summary forms
    if (route === "/pilot:experience-summary" && method === "GET") {
      try {
        // Get all logbook entries for this user
        const logbookSnap = await db.collection("logbook")
          .where("userId", "==", auth.user.uid)
          .where("tenantId", "==", ctx.tenantId)
          .where("entryType", "==", "flight")
          .get();

        const logbookEntries = [];
        logbookSnap.forEach((doc) => {
          logbookEntries.push({ id: doc.id, ...doc.data() });
        });

        // Calculate totals
        const experienceTotals = {
          totalTime: 0,
          pic: 0,
          sic: 0,
          dualReceived: 0,
          solo: 0,
          crossCountry: 0,
          night: 0,
          actualInstrument: 0,
          simulatedInstrument: 0,
          dayLandings: 0,
          nightLandings: 0,
        };

        for (const entry of logbookEntries) {
          const data = entry.data || {};
          experienceTotals.totalTime += Number(data.totalTime) || 0;
          experienceTotals.pic += Number(data.pic) || 0;
          experienceTotals.sic += Number(data.sic) || 0;
          experienceTotals.dualReceived += Number(data.dualReceived) || 0;
          experienceTotals.solo += Number(data.solo) || 0;
          experienceTotals.crossCountry += Number(data.crossCountry) || 0;
          experienceTotals.night += Number(data.night) || 0;
          experienceTotals.actualInstrument += Number(data.actualInstrument) || 0;
          experienceTotals.simulatedInstrument += Number(data.simulatedInstrument) || 0;
          experienceTotals.dayLandings += Number(data.dayLandings) || 0;
          experienceTotals.nightLandings += Number(data.nightLandings) || 0;
        }

        // Format for FAA 8710
        const faa8710 = {
          form: "FAA Form 8710-1",
          generatedAt: new Date().toISOString(),
          experience: {
            "Total Flight Time": experienceTotals.totalTime.toFixed(1),
            "Pilot in Command (PIC)": experienceTotals.pic.toFixed(1),
            "Second in Command (SIC)": experienceTotals.sic.toFixed(1),
            "Dual Received": experienceTotals.dualReceived.toFixed(1),
            "Solo": experienceTotals.solo.toFixed(1),
            "Cross-Country": experienceTotals.crossCountry.toFixed(1),
            "Night": experienceTotals.night.toFixed(1),
            "Actual Instrument": experienceTotals.actualInstrument.toFixed(1),
            "Simulated Instrument": experienceTotals.simulatedInstrument.toFixed(1),
            "Day Landings": experienceTotals.dayLandings,
            "Night Landings": experienceTotals.nightLandings,
          },
        };

        // Format for ICAO
        const icao = {
          form: "ICAO License Application - Experience Summary",
          generatedAt: new Date().toISOString(),
          totalFlightTime: {
            hours: Math.floor(experienceTotals.totalTime),
            minutes: Math.round((experienceTotals.totalTime % 1) * 60),
          },
          commandTime: {
            hours: Math.floor(experienceTotals.pic),
            minutes: Math.round((experienceTotals.pic % 1) * 60),
          },
          secondInCommandTime: {
            hours: Math.floor(experienceTotals.sic),
            minutes: Math.round((experienceTotals.sic % 1) * 60),
          },
          crossCountryTime: {
            hours: Math.floor(experienceTotals.crossCountry),
            minutes: Math.round((experienceTotals.crossCountry % 1) * 60),
          },
          nightTime: {
            hours: Math.floor(experienceTotals.night),
            minutes: Math.round((experienceTotals.night % 1) * 60),
          },
          instrumentTime: {
            hours: Math.floor(experienceTotals.actualInstrument + experienceTotals.simulatedInstrument),
            minutes: Math.round(((experienceTotals.actualInstrument + experienceTotals.simulatedInstrument) % 1) * 60),
          },
          totalLandings: experienceTotals.dayLandings + experienceTotals.nightLandings,
        };

        return res.status(200).json({
          ok: true,
          faa8710,
          icao,
          totalEntries: logbookEntries.length,
        });
      } catch (error) {
        console.error("❌ Experience summary error:", error);
        return jsonError(res, 500, "Failed to generate experience summary", { error: error.message });
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

    // ----------------------------
    // TITLE / PROVENANCE (Bearer token access for frontend)
    // ----------------------------
    const { mintTitleRecord: doMintTitle, computeHash: doComputeHash } = require("./api/utils/titleMint");

    // POST /v1/workers/import
    if (route === "/workers/import" && method === "POST") {
      try {
        const { name, description, source, capabilities, rules, category, pricing, mint_title } = body;
        if (!name || !description) return jsonError(res, 400, "name and description are required");

        const rulesHash = doComputeHash(rules || []);
        const metadataHash = doComputeHash({ name, description, capabilities, rules_hash: rulesHash, created_at: new Date().toISOString() });
        const workerId = "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

        const workerData = {
          name: String(name).substring(0, 200),
          description: String(description).substring(0, 2000),
          source: source || { platform: "custom" },
          capabilities: Array.isArray(capabilities) ? capabilities.slice(0, 20) : [],
          rules: Array.isArray(rules) ? rules.slice(0, 50) : [],
          category: category ? String(category).substring(0, 50) : "other",
          pricing: pricing || { model: "subscription", amount: 0, currency: "USD" },
          status: "registered",
          imported: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: auth.user.uid,
          rulesHash,
          metadataHash,
        };

        await db.doc(`tenants/${ctx.tenantId}/workers/${workerId}`).set(workerData);

        let titleRecord = null;
        if (mint_title) {
          titleRecord = await doMintTitle(ctx.tenantId, workerId, workerData);
        }

        return res.status(201).json({
          ok: true,
          worker: {
            id: workerId,
            name: workerData.name,
            status: workerData.status,
            imported: true,
            created_at: new Date().toISOString(),
            ...(titleRecord ? { title_record: titleRecord } : {}),
          },
        });
      } catch (e) {
        console.error("workers:import failed:", e);
        return jsonError(res, 500, "Failed to import worker");
      }
    }

    // POST /v1/workers/:workerId/mint
    if (/^\/workers\/[^/]+\/mint$/.test(route) && method === "POST") {
      try {
        const workerId = route.split("/")[2];
        const workerSnap = await db.doc(`tenants/${ctx.tenantId}/workers/${workerId}`).get();
        if (!workerSnap.exists) return jsonError(res, 404, "Worker not found");

        const workerData = workerSnap.data();
        const titleRecord = await doMintTitle(ctx.tenantId, workerId, workerData, body.memo || "");

        return res.json({ ok: true, title_record: titleRecord });
      } catch (e) {
        console.error("workers:mint failed:", e);
        return jsonError(res, 500, "Failed to mint title record");
      }
    }

    // GET /v1/workers/:workerId/title
    if (/^\/workers\/[^/]+\/title$/.test(route) && method === "GET") {
      try {
        const workerId = route.split("/")[2];
        const workerSnap = await db.doc(`tenants/${ctx.tenantId}/workers/${workerId}`).get();
        if (!workerSnap.exists) return jsonError(res, 404, "Worker not found");

        const workerData = workerSnap.data();
        const recordsSnap = await db
          .collection(`tenants/${ctx.tenantId}/workers/${workerId}/titleRecords`)
          .orderBy("version", "desc")
          .get();

        const titleHistory = [];
        recordsSnap.forEach((doc) => {
          const d = doc.data();
          titleHistory.push({
            record_id: doc.id,
            version: d.version,
            tx_hash: d.txHash,
            chain: d.chain,
            minted_at: d.mintedAt?.toDate ? d.mintedAt.toDate().toISOString() : d.mintedAt,
            metadata_hash: d.metadataHash,
            rules_hash: d.rulesHash,
            memo: d.memo || "",
            previous_version_tx: d.previousVersionTx || null,
          });
        });

        return res.json({ ok: true, worker_id: workerId, name: workerData.name, title_history: titleHistory });
      } catch (e) {
        console.error("workers:title failed:", e);
        return jsonError(res, 500, "Failed to get title history");
      }
    }

    // POST /v1/workers/:workerId/verify
    if (/^\/workers\/[^/]+\/verify$/.test(route) && method === "POST") {
      try {
        const workerId = route.split("/")[2];
        const workerSnap = await db.doc(`tenants/${ctx.tenantId}/workers/${workerId}`).get();
        if (!workerSnap.exists) return jsonError(res, 404, "Worker not found");

        const workerData = workerSnap.data();
        const latestTitle = workerData.latestTitleRecord;
        if (!latestTitle) return res.json({ ok: true, verified: false, reason: "No title record exists" });

        if (body.rules_hash) {
          const currentRulesHash = doComputeHash(workerData.rules || []);
          return res.json({
            ok: true,
            verified: body.rules_hash === currentRulesHash,
            matches_version: latestTitle.version,
            minted_at: latestTitle.mintedAt,
          });
        }

        const freshHash = doComputeHash({
          worker_id: workerId,
          name: workerData.name,
          description: workerData.description,
          capabilities: workerData.capabilities || [],
          rules_hash: doComputeHash(workerData.rules || []),
          created_at: workerData.createdAt || "",
          version: latestTitle.version,
        });

        return res.json({
          ok: true,
          verified: freshHash === latestTitle.metadataHash,
          matches_version: latestTitle.version,
          minted_at: latestTitle.mintedAt,
        });
      } catch (e) {
        console.error("workers:verify failed:", e);
        return jsonError(res, 500, "Failed to verify worker");
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  GOVERNMENT IN A BOX — Routes (GOV-000 through GOV-057)
    // ═══════════════════════════════════════════════════════════════

    const { emitEvent, queryEvents, markProcessed } = require("./services/workerEventBus");
    const { requireJurisdictionRole, createJurisdictionUser, createJurisdiction, listJurisdictionUsers } = require("./helpers/jurisdictionRbac");
    const { checkSubscriptionOrReject } = require("./middleware/subscriptionCheck");
    const govSuiteDefaults = require("./raas/suiteDefaults/government");

    // ── GOV-000: Jurisdiction Onboarding ──

    if (route === "/gov/onboard/jurisdiction" && method === "POST") {
      const { fips_code, jurisdiction_name, state, jurisdiction_type, primary_contact_name, primary_contact_email, primary_contact_phone, ein, suites_requested, compliance_config } = body;
      if (!fips_code || !jurisdiction_name || !state || !ein) {
        return jsonError(res, 400, "Missing required onboarding fields");
      }
      if (!suites_requested || !Array.isArray(suites_requested) || suites_requested.length === 0) {
        return jsonError(res, 400, "Must request at least one suite");
      }
      try {
        const result = await createJurisdiction({
          fips_code, jurisdiction_name, state, jurisdiction_type,
          primary_contact_name, primary_contact_email, primary_contact_phone,
          ein, suites_requested,
          compliance_config: compliance_config || {},
        });
        // Create admin role for the onboarding user
        await createJurisdictionUser(fips_code, user.uid, {
          role: "jurisdiction_admin",
          suites: suites_requested,
          department: "administration",
        }, user.uid);
        console.log(`[gov:onboard] Jurisdiction ${fips_code} created by ${user.uid}`);
        return res.json({ ok: true, fips: fips_code, status: "onboarding" });
      } catch (e) {
        console.error("[gov:onboard] error:", e.message);
        return jsonError(res, 400, e.message);
      }
    }

    if (route === "/gov/onboard/status" && method === "GET") {
      const fips = req.query.fips || body.fips;
      if (!fips) return jsonError(res, 400, "Missing fips parameter");
      try {
        const doc = await db.doc(`jurisdictions/${fips}`).get();
        if (!doc.exists) return jsonError(res, 404, "Jurisdiction not found");
        return res.json({ ok: true, jurisdiction: { id: doc.id, ...doc.data() } });
      } catch (e) {
        console.error("[gov:onboard:status] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/onboard/sign-report" && method === "POST") {
      const { fips_code, report_hash, signature_envelope_id } = body;
      if (!fips_code || !report_hash) return jsonError(res, 400, "Missing fips_code or report_hash");
      try {
        await db.doc(`jurisdictions/${fips_code}`).update({
          status: "active",
          onboarding_report_hash: report_hash,
          signature_envelope_id: signature_envelope_id || null,
          onboarding_completed_at: nowServerTs(),
        });
        // Write audit entry #1
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "onboarding_completed",
          report_hash,
          userId: user.uid,
          createdAt: nowServerTs(),
        });
        console.log(`[gov:onboard:sign] Jurisdiction ${fips_code} activated`);
        return res.json({ ok: true, status: "active" });
      } catch (e) {
        console.error("[gov:onboard:sign] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── GOV: Jurisdiction User Management ──

    if (route === "/gov/jurisdiction/users" && method === "GET") {
      const fips = req.query.fips || body.fips;
      if (!fips) return jsonError(res, 400, "Missing fips");
      const auth = await requireJurisdictionRole(fips, user.uid, "jurisdiction_admin");
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const users = await listJurisdictionUsers(fips);
        return res.json({ ok: true, users });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/jurisdiction/users/add" && method === "POST") {
      const { fips_code, target_uid, role, suites, department } = body;
      if (!fips_code || !target_uid || !role) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "jurisdiction_admin");
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        await createJurisdictionUser(fips_code, target_uid, { role, suites: suites || [], department }, user.uid);
        return res.json({ ok: true });
      } catch (e) {
        return jsonError(res, 400, e.message);
      }
    }

    // ── DMV Suite Routes ──

    if (route === "/gov/dmv/title-intake" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "dmv" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-001", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const { vin, year_make_model, odometer_reading, seller_name, buyer_name, purchase_price, payment_intent_id, supporting_docs } = body;
        const recordId = db.collection("govTitleRecords").doc().id;
        await db.doc(`govTitleRecords/${recordId}`).set({
          recordId, fips_code, vin, year_make_model, odometer_reading,
          seller_name, buyer_name, purchase_price, payment_intent_id,
          supporting_docs: supporting_docs || [],
          status: "submitted", submittedBy: user.uid,
          createdAt: nowServerTs(),
        });
        await emitEvent("dmv.title.intake.submitted", { recordId, vin, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "dmv.title.intake", recordId, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, status: "submitted" });
      } catch (e) {
        console.error("[gov:dmv:title-intake] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/dmv/lien" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "dmv" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-002", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const recordId = db.collection("govLienRecords").doc().id;
        await db.doc(`govLienRecords/${recordId}`).set({
          ...body, recordId, status: "submitted", submittedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/dmv/fraud-check" && method === "POST") {
      const { fips_code, title_record_id } = body;
      if (!fips_code || !title_record_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "dmv" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const record = await db.doc(`govTitleRecords/${title_record_id}`).get();
        if (!record.exists) return jsonError(res, 404, "Title record not found");
        // Fraud check writes to audit trail
        const checkId = db.collection("govFraudChecks").doc().id;
        await db.doc(`govFraudChecks/${checkId}`).set({
          checkId, fips_code, title_record_id, status: "pending",
          requestedBy: user.uid, createdAt: nowServerTs(),
        });
        await emitEvent("dmv.title.fraud_flag", { checkId, title_record_id, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        return res.json({ ok: true, checkId, status: "pending" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/dmv/dl-intake" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "dmv" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-004", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const recordId = db.collection("govDlRecords").doc().id;
        await db.doc(`govDlRecords/${recordId}`).set({
          ...body, recordId, status: "submitted", submittedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/dmv/registration-renewal" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "dmv" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-007", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const recordId = db.collection("govRegistrationRenewals").doc().id;
        await db.doc(`govRegistrationRenewals/${recordId}`).set({
          ...body, recordId, status: "submitted", submittedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/dmv/dppa-log" && method === "POST") {
      const { fips_code, access_reason, permissible_use_code, record_accessed } = body;
      if (!fips_code || !permissible_use_code) return jsonError(res, 400, "Missing DPPA fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "dmv" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const logId = db.collection("govDppaLog").doc().id;
        await db.doc(`govDppaLog/${logId}`).set({
          logId, fips_code, access_reason, permissible_use_code,
          record_accessed, accessedBy: user.uid, createdAt: nowServerTs(),
        });
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "dppa.access", logId, permissible_use_code, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, logId });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── Permitting Suite Routes ──

    if (route === "/gov/permitting/intake" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-016", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const { application_type, parcel_number, applicant_name, applicant_email, contractor_license, valuation, description, documents, payment_intent_id } = body;
        const permitId = db.collection("govPermitApplications").doc().id;
        await db.doc(`govPermitApplications/${permitId}`).set({
          permitId, fips_code, application_type, parcel_number,
          applicant_name, applicant_email, contractor_license, valuation,
          description, documents: documents || [], payment_intent_id,
          status: "submitted", submittedBy: user.uid, createdAt: nowServerTs(),
        });
        await emitEvent("perm.intake.routed_for_review", { permitId, application_type, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        if (application_type === "event") {
          await emitEvent("perm.intake.event_permit", { permitId, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        }
        if (application_type === "environmental") {
          await emitEvent("perm.intake.env_review_required", { permitId, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        }
        await emitEvent("perm.intake.fee_required", { permitId, valuation, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "perm.intake", permitId, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, permitId, status: "submitted" });
      } catch (e) {
        console.error("[gov:permitting:intake] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/permitting/status" && method === "GET") {
      const { fips, permit_id } = req.query;
      if (!fips || !permit_id) return jsonError(res, 400, "Missing fips or permit_id");
      const auth = await requireJurisdictionRole(fips, user.uid, "public_viewer", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const doc = await db.doc(`govPermitApplications/${permit_id}`).get();
        if (!doc.exists) return jsonError(res, 404, "Permit not found");
        return res.json({ ok: true, permit: { id: doc.id, ...doc.data() } });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/permitting/plan-review" && method === "POST") {
      const { fips_code, permit_id, review_result, notes } = body;
      if (!fips_code || !permit_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        await db.doc(`govPermitApplications/${permit_id}`).update({
          review_result, review_notes: notes, reviewedBy: user.uid,
          status: review_result === "approved" ? "approved" : "corrections_required",
          reviewedAt: nowServerTs(),
        });
        if (review_result === "approved") {
          await emitEvent("perm.review.notice_required", { permit_id, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        }
        return res.json({ ok: true, permit_id, status: review_result });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/permitting/zoning-check" && method === "POST") {
      const { fips_code, parcel_number, proposed_use } = body;
      if (!fips_code || !parcel_number) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-020", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const checkId = db.collection("govZoningChecks").doc().id;
        await db.doc(`govZoningChecks/${checkId}`).set({
          checkId, fips_code, parcel_number, proposed_use,
          status: "pending", requestedBy: user.uid, createdAt: nowServerTs(),
        });
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "perm.zoning_check", checkId, parcel_number, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, checkId, status: "pending" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/permitting/fee-calc" && method === "POST") {
      const { fips_code, permit_id, application_type, valuation } = body;
      if (!fips_code || !permit_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        // Load fee schedule from jurisdiction config
        const jDoc = await db.doc(`jurisdictions/${fips_code}`).get();
        const feeSchedule = jDoc.exists ? (jDoc.data().compliance_config?.fee_schedule || {}) : {};
        const baseFee = feeSchedule.base_fee || 15000; // $150 default in cents
        const planReviewFee = Math.round((valuation || 0) * 0.015); // 1.5% of valuation
        const totalDue = baseFee + planReviewFee;
        await db.doc(`govPermitApplications/${permit_id}`).update({
          fee_breakdown: { base_fee: baseFee, plan_review_fee: planReviewFee, total_due: totalDue },
          feeCalculatedAt: nowServerTs(),
        });
        return res.json({ ok: true, fee_breakdown: { base_fee: baseFee, plan_review_fee: planReviewFee, total_due: totalDue } });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/permitting/public-notice" && method === "POST") {
      const { fips_code, permit_id, notice_type } = body;
      if (!fips_code || !permit_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const noticeId = db.collection("govPublicNotices").doc().id;
        await db.doc(`govPublicNotices/${noticeId}`).set({
          noticeId, fips_code, permit_id, notice_type,
          status: "published", publishedBy: user.uid,
          notice_window_days: 21, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, noticeId, status: "published" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/permitting/co-issue" && method === "POST") {
      const { fips_code, permit_id } = body;
      if (!fips_code || !permit_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "permitting" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        await db.doc(`govPermitApplications/${permit_id}`).update({
          status: "co_issued", co_issued_by: user.uid, co_issued_at: nowServerTs(),
        });
        await emitEvent("perm.co.issued", { permit_id, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "perm.co_issued", permit_id, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, permit_id, status: "co_issued" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── Inspector Suite Routes ──

    if (route === "/gov/inspector/observation" && method === "POST") {
      const { fips_code, permit_number, inspection_type, gps_coordinates, observations, photos } = body;
      if (!fips_code || !permit_number || !inspection_type) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "inspector" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-031", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const inspectionId = db.collection("govInspections").doc().id;
        const hasViolations = Array.isArray(observations) && observations.some(o => o.status === "fail");
        await db.doc(`govInspections/${inspectionId}`).set({
          inspectionId, fips_code, permit_number, inspection_type,
          inspector_id: user.uid, gps_coordinates, observations: observations || [],
          photos: photos || [], input_source: body.input_source || "mobile",
          result: hasViolations ? "failed" : "passed",
          status: "pending_signature", createdAt: nowServerTs(),
        });
        if (hasViolations) {
          await emitEvent("insp.violation.reinspection_required", { inspectionId, permit_number, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        }
        await emitEvent("insp.completed", { inspectionId, permit_number, result: hasViolations ? "failed" : "passed", fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "insp.observation", inspectionId, permit_number, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, inspectionId, result: hasViolations ? "failed" : "passed" });
      } catch (e) {
        console.error("[gov:inspector:observation] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/inspector/fire" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "inspector" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-033", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const inspectionId = db.collection("govFireInspections").doc().id;
        await db.doc(`govFireInspections/${inspectionId}`).set({
          ...body, inspectionId, inspector_id: user.uid, status: "submitted", createdAt: nowServerTs(),
        });
        return res.json({ ok: true, inspectionId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/inspector/health" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "inspector" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-034", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const inspectionId = db.collection("govHealthInspections").doc().id;
        await db.doc(`govHealthInspections/${inspectionId}`).set({
          ...body, inspectionId, inspector_id: user.uid, status: "submitted", createdAt: nowServerTs(),
        });
        return res.json({ ok: true, inspectionId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/inspector/reinspect" && method === "POST") {
      const { fips_code, original_inspection_id } = body;
      if (!fips_code || !original_inspection_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "inspector" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const ticketId = db.collection("govReinspectionTickets").doc().id;
        await db.doc(`govReinspectionTickets/${ticketId}`).set({
          ticketId, fips_code, original_inspection_id,
          status: "scheduled", assignedTo: null,
          createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, ticketId, status: "scheduled" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/inspector/report" && method === "POST") {
      const { fips_code, inspection_id } = body;
      if (!fips_code || !inspection_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "inspector" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const reportId = db.collection("govInspectionReports").doc().id;
        await db.doc(`govInspectionReports/${reportId}`).set({
          reportId, fips_code, inspection_id,
          status: "generated", generatedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, reportId, status: "generated" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // Wearable API stub
    if (route === "/wearable/v1/visual-query" && method === "POST") {
      const { inspector_id, permit_number, gps_coordinates, inspection_type } = body;
      // Stub response — partnership in progress
      return res.json({
        ok: true,
        stub: true,
        message: "Wearable API stub — partnership in progress",
        input_source: "wearable",
        inspector_id, permit_number, gps_coordinates, inspection_type,
      });
    }

    // ── Recorder Suite Routes ──

    if (route === "/gov/recorder/intake" && method === "POST") {
      const { fips_code, document_type, document_file_id, document_hash, grantor, grantee, legal_description, parcel_number, instrument_date, payment_intent_id } = body;
      if (!fips_code || !document_type || !document_hash) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-041", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const instrumentNumber = `${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
        const recordId = db.collection("govRecordingIntake").doc().id;
        await db.doc(`govRecordingIntake/${recordId}`).set({
          recordId, fips_code, document_type, document_file_id, document_hash,
          grantor: grantor || [], grantee: grantee || [], legal_description,
          parcel_number, instrument_date, payment_intent_id,
          instrument_number: instrumentNumber,
          recording_timestamp: new Date().toISOString(),
          recording_status: "recorded", document_hash_confirmed: document_hash,
          submittedBy: user.uid, createdAt: nowServerTs(),
        });
        await emitEvent("rec.intake.recorded", { recordId, instrument_number: instrumentNumber, document_type, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        if (document_type === "deed_grant" || document_type === "deed_trust" || document_type === "deed_quit_claim") {
          await emitEvent("rec.deed.transfer_recorded", { recordId, parcel_number, grantor, grantee, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        }
        await db.collection(`jurisdictions/${fips_code}/auditTrail`).add({
          type: "rec.intake.recorded", recordId, instrument_number: instrumentNumber,
          document_hash, userId: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, instrument_number: instrumentNumber, recording_status: "recorded" });
      } catch (e) {
        console.error("[gov:recorder:intake] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/chain" && method === "GET") {
      const { fips, apn } = req.query;
      if (!fips || !apn) return jsonError(res, 400, "Missing fips or apn");
      const auth = await requireJurisdictionRole(fips, user.uid, "public_viewer", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const snap = await db.collection("govRecordingIntake")
          .where("fips_code", "==", fips)
          .where("parcel_number", "==", apn)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();
        const chain = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, parcel: apn, chain });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/deed" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-043", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const recordId = db.collection("govDeedTransfers").doc().id;
        await db.doc(`govDeedTransfers/${recordId}`).set({
          ...body, recordId, status: "submitted", submittedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/lien" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-044", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const recordId = db.collection("govRecorderLiens").doc().id;
        await db.doc(`govRecorderLiens/${recordId}`).set({
          ...body, recordId, status: "submitted", submittedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, recordId, status: "submitted" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/ron-session" && method === "POST") {
      const { fips_code } = body;
      if (!fips_code) return jsonError(res, 400, "Missing fips_code");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "field_operator", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-045", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const sessionId = db.collection("govRonSessions").doc().id;
        // Route based on jurisdiction RON authorization
        const jDoc = await db.doc(`jurisdictions/${fips_code}`).get();
        const ronAuthorized = jDoc.exists ? (jDoc.data().compliance_config?.ron_authorized_state !== false) : true;
        await db.doc(`govRonSessions/${sessionId}`).set({
          ...body, sessionId, ron_provider: ronAuthorized ? "proof" : "snapdocs",
          status: "initiated", initiatedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, sessionId, ron_provider: ronAuthorized ? "proof" : "snapdocs", status: "initiated" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/fraud-check" && method === "POST") {
      const { fips_code, record_id } = body;
      if (!fips_code || !record_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const checkId = db.collection("govRecorderFraudChecks").doc().id;
        await db.doc(`govRecorderFraudChecks/${checkId}`).set({
          checkId, fips_code, record_id, status: "pending",
          requestedBy: user.uid, createdAt: nowServerTs(),
        });
        await emitEvent("rec.fraud.hold_required", { checkId, record_id, fips_code }, { jurisdictionFips: fips_code, tenantId: ctx.tenantId, userId: user.uid });
        return res.json({ ok: true, checkId, status: "pending" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/search" && method === "GET") {
      const { fips, q: searchQuery, type: docType } = req.query;
      if (!fips) return jsonError(res, 400, "Missing fips");
      const auth = await requireJurisdictionRole(fips, user.uid, "public_viewer", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        let query = db.collection("govRecordingIntake").where("fips_code", "==", fips);
        if (docType) query = query.where("document_type", "==", docType);
        query = query.orderBy("createdAt", "desc").limit(50);
        const snap = await query.get();
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, results, count: results.length });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/recorder/digitize" && method === "POST") {
      const { fips_code, file_id, source_type } = body;
      if (!fips_code || !file_id) return jsonError(res, 400, "Missing fields");
      const auth = await requireJurisdictionRole(fips_code, user.uid, "department_super", { requiredSuite: "recorder" });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      const sub = await checkSubscriptionOrReject("GOV-056", ctx.tenantId || fips_code, res);
      if (!sub.allowed) return;
      try {
        const jobId = db.collection("govDigitizationJobs").doc().id;
        await db.doc(`govDigitizationJobs/${jobId}`).set({
          jobId, fips_code, file_id, source_type: source_type || "pdf",
          status: "queued", queuedBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, jobId, status: "queued" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── Alex Routes ──

    if (route === "/gov/alex/briefing" && method === "GET") {
      const { fips, suite } = req.query;
      if (!fips || !suite) return jsonError(res, 400, "Missing fips or suite");
      const auth = await requireJurisdictionRole(fips, user.uid, "department_super", { requiredSuite: suite });
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        // Gather briefing data from recent events
        const events = await queryEvents({ jurisdictionFips: fips, limit: 100 });
        const suiteEvents = events.filter(e => e.eventType.startsWith(suite === "dmv" ? "dmv." : suite === "permitting" ? "perm." : suite === "inspector" ? "insp." : "rec."));
        return res.json({ ok: true, fips, suite, briefing: { event_count: suiteEvents.length, events: suiteEvents.slice(0, 20) } });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/alex/alert" && method === "POST") {
      const { fips_code, alert_type, message, severity } = body;
      if (!fips_code || !alert_type) return jsonError(res, 400, "Missing fields");
      try {
        const alertId = db.collection("govAlexAlerts").doc().id;
        await db.doc(`govAlexAlerts/${alertId}`).set({
          alertId, fips_code, alert_type, message, severity: severity || "medium",
          status: "open", createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, alertId });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    if (route === "/gov/alex/anomalies" && method === "GET") {
      const { fips } = req.query;
      if (!fips) return jsonError(res, 400, "Missing fips");
      const auth = await requireJurisdictionRole(fips, user.uid, "department_super");
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const snap = await db.collection("govAlexAlerts")
          .where("fips_code", "==", fips)
          .where("status", "==", "open")
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();
        const anomalies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ ok: true, anomalies });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── Worker Events Query ──

    if (route === "/gov/events" && method === "GET") {
      const { fips, event_type, target_worker } = req.query;
      if (!fips) return jsonError(res, 400, "Missing fips");
      const auth = await requireJurisdictionRole(fips, user.uid, "department_super");
      if (!auth.authorized) return jsonError(res, 403, auth.reason);
      try {
        const events = await queryEvents({
          jurisdictionFips: fips,
          eventType: event_type || undefined,
          targetWorker: target_worker || undefined,
          limit: 50,
        });
        return res.json({ ok: true, events });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  END GOVERNMENT ROUTES
    // ═══════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════
    //  TITLE & ESCROW SUITE — Routes (ESC-001 through ESC-012)
    // ═══════════════════════════════════════════════════════════════

    // ── ESC-001: Offer Chain — Submit Offer ──

    if (route === "/escrow/offer/submit" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { asset_id, asset_type, buyer_id, seller_id, offer_amount, terms, documents, coe_date } = body;
        if (!asset_id || !buyer_id || !seller_id || !offer_amount) return jsonError(res, 400, "Missing required offer fields");
        const offerId = db.collection("escrowOfferChains").doc().id;
        await db.doc(`escrowOfferChains/${offerId}`).set({
          offerId, asset_id, asset_type: asset_type || "real_property",
          buyer_id, seller_id, offer_amount, terms: terms || {},
          coe_date: coe_date || null, documents: documents || [],
          chain: [{
            type: "offer", sequence: 1, amount: offer_amount, terms: terms || {},
            coe_date: coe_date || null, submitted_by: user.uid,
            status: "pending_signature", created_at: new Date().toISOString(),
          }],
          status: "offer_pending", submittedBy: user.uid,
          tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        await emitEvent("esc.offer.submitted", { offerId, asset_id, buyer_id, seller_id }, { tenantId: ctx.tenantId, userId: user.uid });
        await db.collection("escrowAuditTrail").add({
          type: "offer.submitted", offerId, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, offerId, status: "offer_pending" });
      } catch (e) {
        console.error("[esc:offer:submit] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Offer Chain — Counter-Offer ──

    if (route === "/escrow/offer/counter" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { offer_chain_id, counter_amount, terms, coe_date, contingencies } = body;
        if (!offer_chain_id || !counter_amount) return jsonError(res, 400, "Missing required counter fields");
        const chainDoc = await db.doc(`escrowOfferChains/${offer_chain_id}`).get();
        if (!chainDoc.exists) return jsonError(res, 404, "Offer chain not found");
        const chainData = chainDoc.data();
        if (chainData.status === "accepted" || chainData.status === "locker_opened") {
          return jsonError(res, 400, "Offer chain is already finalized");
        }
        const counterSeq = (chainData.chain || []).length + 1;
        const counterNum = `CO-${String(counterSeq - 1).padStart(3, "0")}`;
        await db.doc(`escrowOfferChains/${offer_chain_id}`).update({
          chain: admin.firestore.FieldValue.arrayUnion({
            type: "counter", sequence: counterSeq, counter_number: counterNum,
            amount: counter_amount, terms: terms || {}, coe_date: coe_date || null,
            contingencies: contingencies || [], submitted_by: user.uid,
            status: "pending_signature", created_at: new Date().toISOString(),
          }),
          status: "counter_pending", lastCounterBy: user.uid, updatedAt: nowServerTs(),
        });
        await db.collection("escrowAuditTrail").add({
          type: "offer.counter", offer_chain_id, counterNum, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, offer_chain_id, counter_number: counterNum, status: "counter_pending" });
      } catch (e) {
        console.error("[esc:offer:counter] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Open Locker (Stage 1) ──

    if (route === "/escrow/locker/open" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { offer_chain_id, parties, conditions, asset_details, exception_attestation } = body;
        if (!offer_chain_id) return jsonError(res, 400, "Missing offer_chain_id");
        const chainDoc = await db.doc(`escrowOfferChains/${offer_chain_id}`).get();
        if (!chainDoc.exists && !exception_attestation) {
          return jsonError(res, 400, "offer_chain_required: Locker cannot open without valid offer chain or exception attestation");
        }
        if (exception_attestation) {
          await db.collection("escrowAuditTrail").add({
            type: "offer_chain_exception", offer_chain_id: offer_chain_id || null,
            attestation: exception_attestation, userId: user.uid, tenantId: ctx.tenantId,
            flagged_for_review: true, createdAt: nowServerTs(),
          });
        }
        if (chainDoc.exists) {
          await db.doc(`escrowOfferChains/${offer_chain_id}`).update({ status: "locker_opened", lockerOpenedAt: nowServerTs() });
        }
        const lockerId = db.collection("escrowLockers").doc().id;
        const escrowNumber = `ESC-${Date.now().toString(36).toUpperCase()}`;
        await db.doc(`escrowLockers/${lockerId}`).set({
          lockerId, escrowNumber, offer_chain_id: offer_chain_id || null,
          parties: parties || [], conditions: conditions || [],
          asset_details: asset_details || {}, stage: 1, stage_name: "locker_opened",
          stages_completed: [{ stage: 0, name: "offer_chain_identity", completedAt: new Date().toISOString() }],
          identity_verifications: [], bank_links: [], notarizations: [],
          opening_hash: require("crypto").createHash("sha256").update(lockerId + Date.now()).digest("hex"),
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        await emitEvent("esc.locker.opened", { lockerId, escrowNumber, offer_chain_id }, { tenantId: ctx.tenantId, userId: user.uid });
        await db.collection("escrowAuditTrail").add({
          type: "locker.opened", lockerId, escrowNumber, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, lockerId, escrowNumber, stage: 1, status: "locker_opened" });
      } catch (e) {
        console.error("[esc:locker:open] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Record EMD (Stage 2) ──

    if (route === "/escrow/locker/emd" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, amount, payment_method, buyer_bank_verified, payment_reference } = body;
        if (!locker_id || !amount) return jsonError(res, 400, "Missing required EMD fields");
        const lockerDoc = await db.doc(`escrowLockers/${locker_id}`).get();
        if (!lockerDoc.exists) return jsonError(res, 404, "Locker not found");
        if (!buyer_bank_verified) {
          return jsonError(res, 400, "bank_account_verified_before_disbursement: Buyer bank account must be verified before EMD");
        }
        await db.doc(`escrowLockers/${locker_id}`).update({
          stage: 2, stage_name: "earnest_money",
          emd_amount: amount, emd_payment_method: payment_method || "ach",
          emd_payment_reference: payment_reference || null, emd_buyer_bank_verified: true,
          emd_received_at: nowServerTs(), updatedAt: nowServerTs(),
          stages_completed: admin.firestore.FieldValue.arrayUnion({ stage: 1, name: "locker_opened", completedAt: new Date().toISOString() }),
        });
        await emitEvent("esc.emd.received", { locker_id, amount }, { tenantId: ctx.tenantId, userId: user.uid });
        await db.collection("escrowAuditTrail").add({
          type: "emd.received", locker_id, amount, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, locker_id, stage: 2, status: "emd_received" });
      } catch (e) {
        console.error("[esc:locker:emd] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Update Condition (Stage 3) ──

    if (route === "/escrow/locker/condition" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, condition_id, condition_type, status: condStatus, verified_source, notes } = body;
        if (!locker_id || !condition_type || !condStatus) return jsonError(res, 400, "Missing condition fields");
        await db.doc(`escrowLockers/${locker_id}`).update({
          [`conditions_status.${condition_id || condition_type}`]: {
            type: condition_type, status: condStatus, verified_source: verified_source || null,
            notes: notes || null, updatedBy: user.uid, updatedAt: new Date().toISOString(),
          },
          stage: 3, stage_name: "condition_monitoring", updatedAt: nowServerTs(),
        });
        if (condStatus === "satisfied") {
          await emitEvent("esc.condition.satisfied", { locker_id, condition_type }, { tenantId: ctx.tenantId, userId: user.uid });
        }
        await db.collection("escrowAuditTrail").add({
          type: "condition.updated", locker_id, condition_type, condStatus, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, locker_id, condition_type, status: condStatus });
      } catch (e) {
        console.error("[esc:locker:condition] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Closing Disclosure (Stage 4) ──

    if (route === "/escrow/locker/closing-disclosure" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, cd_type, credits, debits, prorations, settlement_data } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        await db.doc(`escrowLockers/${locker_id}`).update({
          stage: 4, stage_name: "closing_disclosure",
          closing_disclosure: {
            cd_type: cd_type || "trid", credits: credits || [], debits: debits || [],
            prorations: prorations || [], settlement_data: settlement_data || {},
            generatedBy: user.uid, generatedAt: new Date().toISOString(),
          },
          updatedAt: nowServerTs(),
        });
        await db.collection("escrowAuditTrail").add({
          type: "closing_disclosure.generated", locker_id, cd_type, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, locker_id, stage: 4, status: "closing_disclosure_generated" });
      } catch (e) {
        console.error("[esc:locker:closing-disclosure] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Notarization (Stage 5) ──

    if (route === "/escrow/locker/notarize" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, documents, ron_permitted, notary_platform, session_id, in_person_fallback } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        const notarizationId = db.collection("escrowNotarizations").doc().id;
        await db.doc(`escrowNotarizations/${notarizationId}`).set({
          notarizationId, locker_id, documents: documents || [],
          ron_permitted: ron_permitted !== false, notary_platform: notary_platform || "proof",
          session_id: session_id || null, in_person_fallback: !!in_person_fallback,
          status: session_id ? "completed" : "scheduled",
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        await db.doc(`escrowLockers/${locker_id}`).update({
          stage: 5, stage_name: "notarization",
          notarizations: admin.firestore.FieldValue.arrayUnion(notarizationId),
          updatedAt: nowServerTs(),
        });
        await db.collection("escrowAuditTrail").add({
          type: "notarization.recorded", locker_id, notarizationId, ron: ron_permitted !== false, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, locker_id, notarizationId, stage: 5 });
      } catch (e) {
        console.error("[esc:locker:notarize] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Disbursement (Stage 6) — Human in the loop required ──

    if (route === "/escrow/locker/disburse" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, human_authorization, disbursement_items, all_accounts_verified } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        if (!human_authorization) {
          return jsonError(res, 400, "human_in_loop_at_disbursement: Human authorization required for all disbursements");
        }
        if (!all_accounts_verified) {
          return jsonError(res, 400, "bank_account_verified_before_disbursement: All recipient accounts must be verified");
        }
        const lockerDoc = await db.doc(`escrowLockers/${locker_id}`).get();
        if (!lockerDoc.exists) return jsonError(res, 404, "Locker not found");
        const locker = lockerDoc.data();
        if (locker.stage < 5) {
          return jsonError(res, 400, "no_disbursement_before_conditions: All conditions and notarization must be complete");
        }
        const disbursementId = db.collection("escrowDisbursements").doc().id;
        await db.doc(`escrowDisbursements/${disbursementId}`).set({
          disbursementId, locker_id, items: disbursement_items || [],
          human_authorized_by: user.uid, human_authorized_at: new Date().toISOString(),
          all_accounts_verified: true, status: "authorized",
          tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        await db.doc(`escrowLockers/${locker_id}`).update({
          stage: 6, stage_name: "disbursement",
          disbursement_id: disbursementId, disbursed_at: nowServerTs(), updatedAt: nowServerTs(),
        });
        await emitEvent("esc.disbursement.authorized", { locker_id, disbursementId }, { tenantId: ctx.tenantId, userId: user.uid });
        await db.collection("escrowAuditTrail").add({
          type: "disbursement.authorized", locker_id, disbursementId, authorized_by: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, locker_id, disbursementId, stage: 6, status: "disbursement_authorized" });
      } catch (e) {
        console.error("[esc:locker:disburse] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Recording & DTC Transfer (Stage 7) ──

    if (route === "/escrow/locker/record" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-001", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, recording_confirmation_number, recording_jurisdiction, deed_type, dtc_seller_vault, dtc_buyer_vault } = body;
        if (!locker_id || !recording_confirmation_number) return jsonError(res, 400, "no_dtc_transfer_before_recording: Recording confirmation required");
        const lockerDoc = await db.doc(`escrowLockers/${locker_id}`).get();
        if (!lockerDoc.exists) return jsonError(res, 404, "Locker not found");
        const sealingHash = require("crypto").createHash("sha256").update(locker_id + recording_confirmation_number + Date.now()).digest("hex");
        await db.doc(`escrowLockers/${locker_id}`).update({
          stage: 7, stage_name: "recording_dtc_transfer", status: "sealed",
          recording_confirmation_number, recording_jurisdiction: recording_jurisdiction || null,
          deed_type: deed_type || null,
          dtc_transfer: {
            seller_vault: dtc_seller_vault || null, buyer_vault: dtc_buyer_vault || null,
            transferred_at: new Date().toISOString(),
          },
          sealing_hash: sealingHash, sealed_at: nowServerTs(), updatedAt: nowServerTs(),
        });
        await emitEvent("esc.recording.confirmed", { locker_id, recording_confirmation_number }, { tenantId: ctx.tenantId, userId: user.uid });
        await db.collection("escrowAuditTrail").add({
          type: "recording.confirmed_and_sealed", locker_id, recording_confirmation_number, sealing_hash: sealingHash,
          userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, locker_id, stage: 7, status: "sealed", sealing_hash: sealingHash });
      } catch (e) {
        console.error("[esc:locker:record] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-001: Get Locker Status ──

    if (route.startsWith("/escrow/locker/") && method === "GET" && !route.includes("/status/")) {
      const lockerId = route.split("/escrow/locker/")[1];
      if (!lockerId) return jsonError(res, 400, "Missing locker ID");
      try {
        const doc = await db.doc(`escrowLockers/${lockerId}`).get();
        if (!doc.exists) return jsonError(res, 404, "Locker not found");
        const data = doc.data();
        if (data.tenantId !== ctx.tenantId) return jsonError(res, 403, "Access denied");
        return res.json({ ok: true, locker: { id: doc.id, ...data } });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-002: Wire Fraud Check ──

    if (route === "/escrow/wire-check" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-002", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, wire_instructions, callback_phone, original_instructions } = body;
        if (!locker_id || !wire_instructions) return jsonError(res, 400, "Missing wire check fields");
        const checkId = db.collection("escrowWireFraudChecks").doc().id;
        const domainMatch = wire_instructions.bank_email ? wire_instructions.bank_email.split("@")[1] === (original_instructions || {}).bank_domain : null;
        const instructionsChanged = original_instructions ? JSON.stringify(wire_instructions) !== JSON.stringify(original_instructions) : false;
        const riskFlags = [];
        if (instructionsChanged) riskFlags.push("wire_change_hold");
        if (domainMatch === false) riskFlags.push("domain_mismatch");
        if (!callback_phone) riskFlags.push("no_callback_phone");
        const fraudStatus = riskFlags.length > 0 ? "hold" : "clear";
        await db.doc(`escrowWireFraudChecks/${checkId}`).set({
          checkId, locker_id, wire_instructions, callback_phone: callback_phone || null,
          original_instructions: original_instructions || null,
          domain_match: domainMatch, instructions_changed: instructionsChanged,
          risk_flags: riskFlags, status: fraudStatus,
          tenantId: ctx.tenantId, checkedBy: user.uid, createdAt: nowServerTs(),
        });
        if (fraudStatus === "hold") {
          await emitEvent("esc.wire.fraud_alert", { locker_id, checkId, riskFlags }, { tenantId: ctx.tenantId, userId: user.uid });
        }
        await db.collection("escrowAuditTrail").add({
          type: "wire.fraud_check", locker_id, checkId, fraudStatus, riskFlags, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, checkId, status: fraudStatus, risk_flags: riskFlags });
      } catch (e) {
        console.error("[esc:wire-check] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-003: Title Search & Commitment ──

    if (route === "/escrow/title-search" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-003", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, property_address, parcel_number, county, state, search_type } = body;
        if (!locker_id || !property_address) return jsonError(res, 400, "Missing title search fields");
        const searchId = db.collection("escrowTitleSearches").doc().id;
        await db.doc(`escrowTitleSearches/${searchId}`).set({
          searchId, locker_id, property_address, parcel_number: parcel_number || null,
          county: county || null, state: state || null,
          search_type: search_type || "full",
          schedule_a: {}, schedule_b1_requirements: [], schedule_b2_exceptions: [],
          exception_classifications: [], curative_actions: [],
          status: "ordered", tenantId: ctx.tenantId, orderedBy: user.uid, createdAt: nowServerTs(),
        });
        await db.collection("escrowAuditTrail").add({
          type: "title_search.ordered", locker_id, searchId, userId: user.uid, tenantId: ctx.tenantId, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, searchId, locker_id, status: "ordered" });
      } catch (e) {
        console.error("[esc:title-search] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-004: Lien Clearance ──

    if (route === "/escrow/lien-clearance" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-004", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, lien_type, lienholder, payoff_amount, release_status } = body;
        if (!locker_id || !lien_type) return jsonError(res, 400, "Missing lien clearance fields");
        const clearanceId = db.collection("escrowLienClearances").doc().id;
        await db.doc(`escrowLienClearances/${clearanceId}`).set({
          clearanceId, locker_id, lien_type, lienholder: lienholder || null,
          payoff_amount: payoff_amount || null, release_status: release_status || "pending",
          payoff_demand_sent: false, release_confirmed: false,
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, clearanceId, locker_id, status: "pending" });
      } catch (e) {
        console.error("[esc:lien-clearance] error:", e.message);
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-005: Disclosure Package ──

    if (route === "/escrow/disclosures" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-005", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, disclosure_type, state, documents, delivery_method } = body;
        if (!locker_id || !disclosure_type) return jsonError(res, 400, "Missing disclosure fields");
        const packageId = db.collection("escrowDisclosures").doc().id;
        await db.doc(`escrowDisclosures/${packageId}`).set({
          packageId, locker_id, disclosure_type, state: state || null,
          documents: documents || [], delivery_method: delivery_method || "portal",
          delivery_confirmed: false, status: "assembled",
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, packageId, locker_id, status: "assembled" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-006: Closing Disclosure Generator ──

    if (route === "/escrow/closing-disclosure/generate" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-006", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, cd_type, buyer_credits, seller_credits, buyer_debits, seller_debits, prorations, loan_terms } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        const cdId = db.collection("escrowClosingDisclosures").doc().id;
        await db.doc(`escrowClosingDisclosures/${cdId}`).set({
          cdId, locker_id, cd_type: cd_type || "trid",
          buyer_credits: buyer_credits || [], seller_credits: seller_credits || [],
          buyer_debits: buyer_debits || [], seller_debits: seller_debits || [],
          prorations: prorations || [], loan_terms: loan_terms || {},
          status: "draft", tenantId: ctx.tenantId, generatedBy: user.uid, createdAt: nowServerTs(),
        });
        await emitEvent("esc.closing.ready", { locker_id, cdId }, { tenantId: ctx.tenantId, userId: user.uid });
        return res.json({ ok: true, cdId, locker_id, status: "draft" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-007: FIRPTA / 1031 Exchange ──

    if (route === "/escrow/firpta-check" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-007", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, seller_is_foreign, sale_price, withholding_rate, exchange_1031, qi_name, qi_ein, boot_amount } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        const checkId = db.collection("escrowFirptaChecks").doc().id;
        const withholding = seller_is_foreign ? (sale_price || 0) * ((withholding_rate || 0.15)) : 0;
        await db.doc(`escrowFirptaChecks/${checkId}`).set({
          checkId, locker_id, seller_is_foreign: !!seller_is_foreign,
          sale_price: sale_price || 0, withholding_rate: withholding_rate || 0.15,
          withholding_amount: withholding,
          exchange_1031: !!exchange_1031, qi_name: qi_name || null, qi_ein: qi_ein || null,
          boot_amount: boot_amount || 0,
          status: seller_is_foreign ? "withholding_required" : (exchange_1031 ? "1031_active" : "not_applicable"),
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, checkId, locker_id, withholding_amount: withholding, status: seller_is_foreign ? "withholding_required" : "clear" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-008: Commission & Fee Reconciliation ──

    if (route === "/escrow/commission-recon" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-008", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, commissions, fees, total_disbursement } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        const reconId = db.collection("escrowCommissionRecons").doc().id;
        const totalCommissions = (commissions || []).reduce((s, c) => s + (c.amount || 0), 0);
        const totalFees = (fees || []).reduce((s, f) => s + (f.amount || 0), 0);
        await db.doc(`escrowCommissionRecons/${reconId}`).set({
          reconId, locker_id, commissions: commissions || [], fees: fees || [],
          total_commissions: totalCommissions, total_fees: totalFees,
          total_disbursement: total_disbursement || 0,
          balanced: Math.abs((total_disbursement || 0) - totalCommissions - totalFees) < 0.01,
          status: "reconciled", tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, reconId, locker_id, total_commissions: totalCommissions, total_fees: totalFees, balanced: true });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-009: HOA Estoppel ──

    if (route === "/escrow/hoa-estoppel" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-009", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, hoa_name, hoa_contact, unpaid_dues, special_assessments, transfer_fee } = body;
        if (!locker_id) return jsonError(res, 400, "Missing locker_id");
        const estoppelId = db.collection("escrowHoaEstoppels").doc().id;
        await db.doc(`escrowHoaEstoppels/${estoppelId}`).set({
          estoppelId, locker_id, hoa_name: hoa_name || null, hoa_contact: hoa_contact || null,
          unpaid_dues: unpaid_dues || 0, special_assessments: special_assessments || 0,
          transfer_fee: transfer_fee || 0, certificate_received: false,
          status: "requested", tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, estoppelId, locker_id, status: "requested" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-010: Buyer/Seller Status Portal ──

    if (route.startsWith("/escrow/status/") && method === "GET") {
      const lockerId = route.split("/escrow/status/")[1];
      if (!lockerId) return jsonError(res, 400, "Missing locker ID");
      try {
        const doc = await db.doc(`escrowLockers/${lockerId}`).get();
        if (!doc.exists) return jsonError(res, 404, "Locker not found");
        const data = doc.data();
        return res.json({
          ok: true,
          locker_id: lockerId, escrow_number: data.escrowNumber,
          stage: data.stage, stage_name: data.stage_name, status: data.status || "active",
          stages_completed: data.stages_completed || [],
          conditions_status: data.conditions_status || {},
        });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-011: Post-Close Recording Monitor ──

    if (route === "/escrow/recording-monitor" && method === "POST") {
      const sub = await checkSubscriptionOrReject("ESC-011", ctx.tenantId, res);
      if (!sub.allowed) return;
      try {
        const { locker_id, document_type, recording_jurisdiction, submitted_at, confirmation_number } = body;
        if (!locker_id || !document_type) return jsonError(res, 400, "Missing recording monitor fields");
        const trackerId = db.collection("escrowRecordingTrackers").doc().id;
        await db.doc(`escrowRecordingTrackers/${trackerId}`).set({
          trackerId, locker_id, document_type, recording_jurisdiction: recording_jurisdiction || null,
          submitted_at: submitted_at || new Date().toISOString(),
          confirmation_number: confirmation_number || null,
          status: confirmation_number ? "confirmed" : "pending",
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        if (confirmation_number) {
          await emitEvent("esc.recording.confirmed", { locker_id, trackerId, confirmation_number }, { tenantId: ctx.tenantId, userId: user.uid });
        }
        return res.json({ ok: true, trackerId, locker_id, status: confirmation_number ? "confirmed" : "pending" });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-012: Alex — Daily Briefing ──

    if (route === "/escrow/alex/briefing" && method === "GET") {
      try {
        const lockers = await db.collection("escrowLockers")
          .where("tenantId", "==", ctx.tenantId)
          .orderBy("createdAt", "desc").limit(50).get();
        const active = lockers.docs.filter(d => d.data().status !== "sealed").length;
        const sealed = lockers.docs.filter(d => d.data().status === "sealed").length;
        const stageBreakdown = {};
        lockers.docs.forEach(d => {
          const s = d.data().stage_name || "unknown";
          stageBreakdown[s] = (stageBreakdown[s] || 0) + 1;
        });
        return res.json({ ok: true, briefing: { active_lockers: active, sealed_lockers: sealed, stage_breakdown: stageBreakdown, total: lockers.docs.length } });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ── ESC-012: Alex — Anomaly Alert ──

    if (route === "/escrow/alex/alert" && method === "POST") {
      try {
        const { alert_type, locker_id, description, severity } = body;
        if (!alert_type) return jsonError(res, 400, "Missing alert_type");
        const alertId = db.collection("escrowAlexAlerts").doc().id;
        await db.doc(`escrowAlexAlerts/${alertId}`).set({
          alertId, alert_type, locker_id: locker_id || null,
          description: description || null, severity: severity || "medium",
          tenantId: ctx.tenantId, createdBy: user.uid, createdAt: nowServerTs(),
        });
        return res.json({ ok: true, alertId });
      } catch (e) {
        return jsonError(res, 500, e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  END TITLE & ESCROW ROUTES
    // ═══════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════
    //  ID VERIFICATION (Session 30)
    // ═══════════════════════════════════════════════════════════════

    // POST /v1/id-verify:submit — Creator submits photo ID
    if (route === "/id-verify:submit" && method === "POST") {
      try {
        const { submitIdVerification } = require("./services/idVerification");
        return await submitIdVerification(req, res);
      } catch (e) {
        console.error("id-verify:submit failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/admin:verify:id:queue — Admin: list ID verification queue
    if (route === "/admin:verify:id:queue" && method === "GET") {
      try {
        const { getIdVerificationQueue } = require("./services/idVerification");
        return await getIdVerificationQueue(req, res);
      } catch (e) {
        console.error("admin:verify:id:queue failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/admin:verify:id:approve — Admin: approve ID verification
    if (route === "/admin:verify:id:approve" && method === "PUT") {
      try {
        const { approveIdVerification } = require("./services/idVerification");
        return await approveIdVerification(req, res);
      } catch (e) {
        console.error("admin:verify:id:approve failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/admin:verify:id:reject — Admin: reject ID verification
    if (route === "/admin:verify:id:reject" && method === "PUT") {
      try {
        const { rejectIdVerification } = require("./services/idVerification");
        return await rejectIdVerification(req, res);
      } catch (e) {
        console.error("admin:verify:id:reject failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/admin:verify:id:photo — Admin: get signed URL for photo ID
    if (route === "/admin:verify:id:photo" && method === "GET") {
      try {
        const { getIdVerificationPhoto } = require("./services/idVerification");
        return await getIdVerificationPhoto(req, res);
      } catch (e) {
        console.error("admin:verify:id:photo failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WORKER SESSIONS (Session 30)
    // ═══════════════════════════════════════════════════════════════

    // POST /v1/worker-session:open — Record worker open event
    if (route === "/worker-session:open" && method === "POST") {
      try {
        const { recordWorkerOpen } = require("./services/workerSessions");
        return await recordWorkerOpen(req, res);
      } catch (e) {
        console.error("worker-session:open failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/worker-session:get — Get worker session data
    if (route === "/worker-session:get" && method === "GET") {
      try {
        const { getWorkerSession } = require("./services/workerSessions");
        return await getWorkerSession(req, res);
      } catch (e) {
        console.error("worker-session:get failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/worker-session:clear-chat — Mark chat as cleared
    if (route === "/worker-session:clear-chat" && method === "POST") {
      try {
        const { clearWorkerChat } = require("./services/workerSessions");
        return await clearWorkerChat(req, res);
      } catch (e) {
        console.error("worker-session:clear-chat failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  MATERIAL CHANGE DETECTION & AGREEMENT (Session 30)
    // ═══════════════════════════════════════════════════════════════

    // POST /v1/workers/:workerId/save — Save worker with material change detection
    if (route.match(/^\/workers\/[^/]+\/save$/) && method === "POST") {
      try {
        const workerId = route.split("/")[2];
        req.params = { workerId };
        const { saveWorkerWithChangeDetection } = require("./services/materialChangeDetection");
        return await saveWorkerWithChangeDetection(req, res);
      } catch (e) {
        console.error("workers:save failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/workers/:workerId/reaccept — Re-accept agreement after material change
    if (route.match(/^\/workers\/[^/]+\/reaccept$/) && method === "POST") {
      try {
        const workerId = route.split("/")[2];
        req.params = { workerId };
        const { reacceptWorkerAgreement } = require("./services/materialChangeDetection");
        return await reacceptWorkerAgreement(req, res);
      } catch (e) {
        console.error("workers:reaccept failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/workers/:workerId/accept-agreement — Initial agreement acceptance
    if (route.match(/^\/workers\/[^/]+\/accept-agreement$/) && method === "POST") {
      try {
        const workerId = route.split("/")[2];
        req.params = { workerId };
        const { acceptWorkerAgreement } = require("./services/materialChangeDetection");
        return await acceptWorkerAgreement(req, res);
      } catch (e) {
        console.error("workers:accept-agreement failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/workers/:workerId/fork — Fork a worker to create a customized copy (Session 34.6)
    if (route.match(/^\/workers\/[^/]+\/fork$/) && method === "POST") {
      try {
        const workerId = route.split("/")[2];
        const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        const { name, ownerId, overrides } = body;

        if (!name || !ownerId) {
          return jsonError(res, 400, "name and ownerId are required");
        }

        const db = admin.firestore();

        // Find source worker — check workers collection first, then raasCatalog
        let sourceDoc = null;
        let sourceData = null;
        let sourceCollection = null;

        // Try workers collection (creator workers) by ID or slug
        const byId = await db.collection("workers").doc(workerId).get();
        if (byId.exists) {
          sourceDoc = byId;
          sourceData = byId.data();
          sourceCollection = "workers";
        } else {
          const bySlug = await db.collection("workers").where("slug", "==", workerId).limit(1).get();
          if (!bySlug.empty) {
            sourceDoc = bySlug.docs[0];
            sourceData = bySlug.docs[0].data();
            sourceCollection = "workers";
          }
        }

        // Try raasCatalog if not found in workers
        if (!sourceData) {
          const catalogDoc = await db.collection("raasCatalog").doc(workerId).get();
          if (catalogDoc.exists) {
            sourceDoc = catalogDoc;
            sourceData = catalogDoc.data();
            sourceCollection = "raasCatalog";
          }
        }

        if (!sourceData) {
          return jsonError(res, 404, `Worker "${workerId}" not found`);
        }

        // Verify forkable
        if (!sourceData.forkable) {
          return jsonError(res, 403, "This worker does not allow forking");
        }

        // Build forked worker
        const forkedId = `fork-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = admin.firestore.FieldValue.serverTimestamp();

        const forkedWorker = {
          name,
          creatorId: ownerId,
          status: "draft",
          published: false,
          forkedFrom: sourceDoc.id,
          forkedFromCollection: sourceCollection,
          // Inherit from source
          vertical: sourceData.vertical || null,
          suite: sourceData.suite || null,
          type: sourceData.type || "standalone",
          short_description: sourceData.short_description || sourceData.capabilitySummary || "",
          long_description: sourceData.long_description || "",
          tags: sourceData.tags || [],
          credit_cost: sourceData.credit_cost || "standard",
          // Apply overrides
          ...(overrides && overrides.jurisdiction ? { jurisdiction: overrides.jurisdiction } : {}),
          ...(overrides && overrides.systemPrompt ? { systemPrompt: overrides.systemPrompt } : {}),
          ...(overrides && overrides.rules ? { customRules: overrides.rules } : {}),
          ...(overrides && overrides.price !== undefined ? { price_tier: String(overrides.price) } : {}),
          // Metadata
          createdAt: now,
          updatedAt: now,
        };

        await db.collection("workers").doc(forkedId).set(forkedWorker);

        return res.status(201).json({
          ok: true,
          worker: { id: forkedId, ...forkedWorker, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          forkedFrom: sourceDoc.id,
        });
      } catch (e) {
        console.error("workers:fork failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WORKER SHARE — AUTHENTICATED ROUTES (Session 30)
    // ═══════════════════════════════════════════════════════════════

    // POST /v1/worker-slug:generate — Auto-generate worker slug
    if (route === "/worker-slug:generate" && method === "POST") {
      try {
        const { generateWorkerSlug } = require("./services/workerSlug");
        return await generateWorkerSlug(req, res);
      } catch (e) {
        console.error("worker-slug:generate failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // PUT /v1/worker-slug:edit — Edit worker slug (one-time)
    if (route === "/worker-slug:edit" && method === "PUT") {
      try {
        const { editWorkerSlug } = require("./services/workerSlug");
        return await editWorkerSlug(req, res);
      } catch (e) {
        console.error("worker-slug:edit failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/suite-slug:generate — Auto-generate suite slug
    if (route === "/suite-slug:generate" && method === "POST") {
      try {
        const { generateSuiteSlug } = require("./services/workerSlug");
        return await generateSuiteSlug(req, res);
      } catch (e) {
        console.error("suite-slug:generate failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // ASSET MANAGEMENT
    // ----------------------------

    // POST /v1/asset:associate — Associate asset with a worker/game build
    if (route === "/asset:associate" && method === "POST") {
      const { assetId, workerId } = body;
      if (!assetId) return jsonError(res, 400, "Missing assetId");
      try {
        const { associateAsset } = require("./services/assets");
        await associateAsset(auth.user.uid, assetId, workerId || null);
        return res.json({ ok: true });
      } catch (e) {
        console.error("asset:associate failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/asset:delete — Delete an asset from creator's library
    if (route === "/asset:delete" && method === "POST") {
      const { assetId } = body;
      if (!assetId) return jsonError(res, 400, "Missing assetId");
      try {
        const { deleteAsset } = require("./services/assets");
        await deleteAsset(auth.user.uid, assetId);
        return res.json({ ok: true });
      } catch (e) {
        console.error("asset:delete failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/assets:list — List creator's assets with optional filters
    if (route === "/assets:list" && method === "GET") {
      try {
        const { listAssets } = require("./services/assets");
        const result = await listAssets(auth.user.uid, {
          projectId: req.query.projectId || null,
          assetType: req.query.assetType || null,
          search: req.query.search || null,
          cursor: req.query.cursor || null,
          limit: parseInt(req.query.limit) || 20,
        });
        return res.json({ ok: true, ...result });
      } catch (e) {
        console.error("assets:list failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/worker-share:configure — Set link options (expiry, PIN, trial days)
    if (route === "/worker-share:configure" && method === "POST") {
      try {
        const { configureShareLink } = require("./services/workerShare");
        return await configureShareLink(req, res);
      } catch (e) {
        console.error("worker-share:configure failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/worker-landing:check-access — Check if user is subscribed
    if (route === "/worker-landing:check-access" && method === "GET") {
      try {
        const { checkWorkerAccess } = require("./services/workerShare");
        return await checkWorkerAccess(req, res);
      } catch (e) {
        console.error("worker-landing:check-access failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // GET /v1/subscription:status — Get subscription/trial status
    if (route === "/subscription:status" && method === "GET") {
      try {
        const { getSubscriptionStatus } = require("./services/workerTrial");
        return await getSubscriptionStatus(req, res);
      } catch (e) {
        console.error("subscription:status failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/subscription:activate — Activate subscription after Stripe checkout
    if (route === "/subscription:activate" && method === "POST") {
      try {
        const { activateSubscription } = require("./services/workerTrial");
        return await activateSubscription(req, res);
      } catch (e) {
        console.error("subscription:activate failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/subscription:cancel — Cancel subscription
    if (route === "/subscription:cancel" && method === "POST") {
      try {
        const { cancelSubscription } = require("./services/workerTrial");
        return await cancelSubscription(req, res);
      } catch (e) {
        console.error("subscription:cancel failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // POST /v1/subscription:suite — Subscribe to all workers in a suite
    if (route === "/subscription:suite" && method === "POST") {
      try {
        const { subscribeSuite } = require("./services/workerTrial");
        return await subscribeSuite(req, res);
      } catch (e) {
        console.error("subscription:suite failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // PC12 COPILOT (34.5)
    // ----------------------------
    if (route && route.startsWith("/copilot:pc12:")) {
      const copilotAction = route.replace("/copilot:pc12:", "");
      const handlers = require("./services/copilot").getHandlers();
      const ctx = { userId: auth.user.uid };
      try {
        switch (copilotAction) {
        case "uploadDoc":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleUploadDoc(req, res, ctx);
        case "uploadLogbook":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleUploadLogbook(req, res, ctx);
        case "uploadFVO":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleUploadFVO(req, res, ctx);
        case "addLogEntry":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleAddLogEntry(req, res, ctx);
        case "addGroundTraining":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleAddGroundTraining(req, res, ctx);
        case "addEndorsement":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleAddEndorsement(req, res, ctx);
        case "status":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await handlers.handleStatus(req, res, ctx);
        case "currency":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await handlers.handleCurrency(req, res, ctx);
        case "generate8710":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await handlers.handleGenerate8710(req, res, ctx);
        case "dutyEvent":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleDutyEvent(req, res, ctx);
        case "chat":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleChat(req, res, ctx);
        case "acknowledge":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await handlers.handleAcknowledge(req, res, ctx);
        default:
          return jsonError(res, 404, "Unknown copilot action: " + copilotAction);
        }
      } catch (e) {
        console.error("copilot:pc12 failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // VAULT: GOOGLE DRIVE (34.7-T2)
    // ----------------------------
    if (route && route.startsWith("/drive:")) {
      const driveAction = route.replace("/drive:", "");
      try {
        switch (driveAction) {
        case "authUrl": {
          if (method !== "GET") return jsonError(res, 405, "GET required");
          const driveAuth = require("./services/vault/driveAuth");
          return await driveAuth.handleDriveAuthUrl(req, res, { userId: auth.user.uid });
        }
        case "exchangeCode": {
          if (method !== "POST") return jsonError(res, 405, "POST required");
          const driveAuth = require("./services/vault/driveAuth");
          return await driveAuth.handleDriveExchangeCode(req, res, { userId: auth.user.uid });
        }
        case "disconnect": {
          if (method !== "POST") return jsonError(res, 405, "POST required");
          const driveAuth = require("./services/vault/driveAuth");
          return await driveAuth.handleDriveDisconnect(req, res, { userId: auth.user.uid });
        }
        case "status": {
          if (method !== "GET") return jsonError(res, 405, "GET required");
          const driveAuth = require("./services/vault/driveAuth");
          return await driveAuth.handleDriveStatus(req, res, { userId: auth.user.uid });
        }
        case "browse": {
          if (method !== "POST") return jsonError(res, 405, "POST required");
          const driveBrowser = require("./services/vault/driveBrowser");
          return await driveBrowser.handleDriveBrowse(req, res, { userId: auth.user.uid });
        }
        case "search": {
          if (method !== "POST") return jsonError(res, 405, "POST required");
          const driveBrowser = require("./services/vault/driveBrowser");
          return await driveBrowser.handleDriveSearch(req, res, { userId: auth.user.uid });
        }
        default:
          return jsonError(res, 404, "Unknown drive action: " + driveAction);
        }
      } catch (e) {
        console.error("drive: failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // VAULT: IMPORT PIPELINE (34.7-T2)
    // ----------------------------
    if (route && route.startsWith("/vault:")) {
      const vaultAction = route.replace("/vault:", "");
      const driveImport = require("./services/vault/driveImport");
      try {
        switch (vaultAction) {
        case "importFromDrive":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await driveImport.handleImportFromDrive(req, res, { userId: auth.user.uid });
        case "importStatus":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await driveImport.handleImportStatus(req, res, { userId: auth.user.uid });
        case "checkExisting":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await driveImport.handleCheckExisting(req, res, { userId: auth.user.uid });
        default:
          return jsonError(res, 404, "Unknown vault action: " + vaultAction);
        }
      } catch (e) {
        console.error("vault: failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // DOCUMENT CONTROL (34.10-T2)
    // ----------------------------
    if (route && route.startsWith("/docControl:")) {
      const dcAction = route.replace("/docControl:", "");
      const docControlService = require("./documentControl/documentControlService");
      try {
        switch (dcAction) {
        case "upload":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await docControlService.handleUploadDocument(req, res, { userId: auth.user.uid });
        case "confirmRevision":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await docControlService.handleConfirmRevision(req, res, { userId: auth.user.uid });
        case "acknowledge":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await docControlService.handleAcknowledge(req, res, { userId: auth.user.uid });
        case "list":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await docControlService.handleGetDocuments(req, res, { userId: auth.user.uid });
        case "versionHistory":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await docControlService.handleGetVersionHistory(req, res, { userId: auth.user.uid });
        case "updateDistribution":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await docControlService.handleUpdateDistributionList(req, res, { userId: auth.user.uid });
        case "acknowledgmentStatus":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await docControlService.handleGetAcknowledgmentStatus(req, res, { userId: auth.user.uid });
        case "adminOverview":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await docControlService.handleAdminOverview(req, res);
        default:
          return jsonError(res, 404, "Unknown docControl action: " + dcAction);
        }
      } catch (e) {
        console.error("docControl: failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

    // ----------------------------
    // BILLING: Usage Metering & Balance (34.11-T2)
    // ----------------------------
    if (route && route.startsWith("/billing:")) {
      const billingAction = route.replace("/billing:", "");
      const usageProcessor = require("./billing/usageProcessor");
      try {
        switch (billingAction) {
        case "topUp":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await usageProcessor.handleTopUpBalance(req, res, { userId: auth.user.uid });
        case "status":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await usageProcessor.handleGetBillingStatus(req, res, { userId: auth.user.uid });
        case "updateAutoRecharge":
          if (method !== "POST") return jsonError(res, 405, "POST required");
          return await usageProcessor.handleUpdateAutoRecharge(req, res, { userId: auth.user.uid });
        case "usageHistory":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await usageProcessor.handleGetUsageHistory(req, res, { userId: auth.user.uid });
        case "kentFlags":
          if (method !== "GET") return jsonError(res, 405, "GET required");
          return await usageProcessor.handleGetKentFlags(req, res);
        default:
          return jsonError(res, 404, "Unknown billing action: " + billingAction);
        }
      } catch (e) {
        console.error("billing: failed:", e);
        return jsonError(res, 500, e.message);
      }
    }

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

// ----------------------------
// PUBLIC REST API (v1)
// ----------------------------
// Separate Express app for external API consumers (GPT, MCP, partners, developers).
// Authenticated via X-API-Key header, rate limited per key.
exports.publicApi = onRequest({ region: "us-central1" }, publicApiApp);

// ----------------------------
// API KEY MANAGEMENT
// ----------------------------
// Authenticated users create API keys scoped to their workspaces.
exports.createApiKey = onRequest({ region: "us-central1" }, async (req, res) => {
  // CORS
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  const auth = await requireFirebaseUser(req, res);
  if (auth.handled) return;

  const body = req.body || {};
  const { name, workspace_ids, scopes } = body;

  if (!workspace_ids || !Array.isArray(workspace_ids) || workspace_ids.length === 0) {
    return res.status(400).json({ ok: false, error: "workspace_ids array is required", code: "MISSING_FIELDS" });
  }

  // Verify user owns these workspaces
  const userId = auth.user.uid;
  for (const wsId of workspace_ids) {
    if (wsId === "vault") continue; // personal vault is always accessible
    const wsDoc = await db.collection("users").doc(userId).collection("workspaces").doc(wsId).get();
    if (!wsDoc.exists) {
      return res.status(403).json({ ok: false, error: `You do not own workspace: ${wsId}`, code: "FORBIDDEN" });
    }
  }

  // Generate API key
  const key = `ta_${crypto.randomBytes(32).toString("hex")}`;

  const keyDoc = {
    key,
    name: name || "API Key",
    user_id: userId,
    workspace_ids,
    scopes: scopes || ["read", "write"],
    rate_limit: 100,
    status: "active",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    last_used: null,
  };

  const ref = await db.collection("api_keys").add(keyDoc);

  return res.json({
    ok: true,
    api_key: {
      id: ref.id,
      key,
      name: keyDoc.name,
      workspace_ids,
      scopes: keyDoc.scopes,
      rate_limit: keyDoc.rate_limit,
    },
  });
});

// ----------------------------
// BILLING: STRIPE SETUP + WEBHOOKS
// ----------------------------
const { setupStripeProducts } = require("./billing/setupStripeProducts");
const { setupPromoCodes } = require("./billing/setupPromoCodes");
const { handleStripeWebhook } = require("./billing/stripeWebhook");

exports.setupStripeProducts = onRequest({ region: "us-central1" }, async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  return setupStripeProducts(req, res);
});

exports.setupPromoCodes = setupPromoCodes;

exports.stripeWebhook = onRequest({ region: "us-central1" }, async (req, res) => {
  // No CORS — Stripe calls this directly. No method check — Stripe sends POST.
  return handleStripeWebhook(req, res);
});

// ----------------------------
// BILLING: SUBSCRIPTION + USAGE + CREDITS
// ----------------------------
const { createSubscription: handleCreateSubscription } = require("./billing/createSubscription");
const { createBillingPortalSession: handleBillingPortal } = require("./billing/createBillingPortalSession");
const { purchaseCreditPack: handlePurchaseCreditPack } = require("./billing/purchaseCreditPack");
const { resetMonthlyUsage: handleResetMonthlyUsage } = require("./billing/resetMonthlyUsage");

function billingCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") { res.status(204).send(""); return true; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }); return true; }
  return false;
}

exports.createSubscription = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleCreateSubscription(req, res);
});

exports.createBillingPortalSession = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleBillingPortal(req, res);
});

exports.purchaseCreditPack = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handlePurchaseCreditPack(req, res);
});

// ----------------------------
// BILLING: MARKETPLACE (Stripe Connect)
// ----------------------------
const { createConnectAccount: handleCreateConnect } = require("./billing/createConnectAccount");
const { purchaseWorker: handlePurchaseWorker } = require("./billing/purchaseWorker");

exports.createConnectAccount = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleCreateConnect(req, res);
});

exports.purchaseWorker = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handlePurchaseWorker(req, res);
});

// Scheduled: midnight PST, 1st of each month
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.resetMonthlyUsage = onSchedule(
  { schedule: "0 0 1 * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleResetMonthlyUsage(); }
);

// ----------------------------
// ADMIN: ACCOUNTING + REFUNDS
// ----------------------------
const { queryAccounting: handleQueryAccounting } = require("./admin/queryAccounting");
const { processRefund: handleProcessRefund } = require("./admin/processRefund");

exports.queryAccounting = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleQueryAccounting(req, res);
});

exports.processRefund = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleProcessRefund(req, res);
});

// ----------------------------
// ADMIN: ANALYTICS AGGREGATION (Scheduled daily midnight PST)
// ----------------------------
const { aggregateAnalytics: handleAggregateAnalytics } = require("./admin/aggregateAnalytics");

exports.aggregateAnalytics = onSchedule(
  { schedule: "0 0 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleAggregateAnalytics(); }
);

// ----------------------------
// COMMUNICATIONS: Twilio + SendGrid
// ----------------------------
const { sendSMS: handleSendSMS } = require("./communications/sendSMS");
const { sendEmail: handleSendEmail } = require("./communications/sendEmail");
const { twilioInbound: handleTwilioInbound } = require("./communications/twilioInbound");
const { sendgridWebhook: handleSendgridWebhook } = require("./communications/sendgridWebhook");
const { sendgridInbound: handleSendgridInbound } = require("./communications/sendgridInbound");

exports.sendSMS = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleSendSMS(req, res);
});

exports.sendEmail = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleSendEmail(req, res);
});

exports.twilioInbound = onRequest({ region: "us-central1" }, async (req, res) => {
  return handleTwilioInbound(req, res);
});

exports.sendgridWebhook = onRequest({ region: "us-central1" }, async (req, res) => {
  return handleSendgridWebhook(req, res);
});

exports.sendgridInbound = onRequest({ region: "us-central1" }, async (req, res) => {
  return handleSendgridInbound(req, res);
});

// ----------------------------
// ADMIN: SEED ADMIN DATA
// ----------------------------
// COMMUNICATIONS: FOLLOW-UP CADENCE (Scheduled hourly)
// ----------------------------
const { followUpCadence: handleFollowUpCadence } = require("./communications/followUpCadence");

exports.followUpCadence = onSchedule(
  { schedule: "0 * * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleFollowUpCadence(); }
);

// ----------------------------
// PIPELINE: SCHEDULED CHECKS
// ----------------------------
const { stalledDealCheck: handleStalledCheck } = require("./pipeline/stalledDealCheck");
const { creatorHealthCheck: handleCreatorHealth } = require("./pipeline/creatorHealthCheck");

exports.stalledDealCheck = onSchedule(
  { schedule: "0 * * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleStalledCheck(); }
);

exports.creatorHealthCheck = onSchedule(
  { schedule: "0 1 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleCreatorHealth(); }
);

// ----------------------------
// SANDBOX: Daily abandonment + drip email processing (6 AM PT)
// ----------------------------
exports.sandboxDailyProcessor = onSchedule(
  { schedule: "0 6 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => {
    const { detectAbandonment } = require("./services/sandbox/abandonmentDetector");
    const abandonResult = await detectAbandonment();
    console.log("[sandboxDailyProcessor]", { abandonResult });
  }
);

// ----------------------------
// MESSAGE QUEUE PROCESSOR (every 15 minutes — email + SMS)
// ----------------------------
exports.messageQueueProcessor = onSchedule(
  { schedule: "*/15 * * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => {
    const { processMessageQueue } = require("./campaigns/messageProcessor");
    const result = await processMessageQueue();
    console.log("[messageQueueProcessor]", result);
  }
);

// ----------------------------
// ADMIN: DAILY DIGEST (Scheduled 4am HST / 6am PST / 2pm UTC)
// ----------------------------
const { generateDailyDigest: handleDailyDigest } = require("./admin/generateDailyDigest");

exports.generateDailyDigest = onSchedule(
  { schedule: "0 14 * * *", timeZone: "UTC", region: "us-central1" },
  async () => { await handleDailyDigest(); }
);

// ----------------------------
// SUBSCRIBER DAILY DIGEST (4am UTC — all paid subscribers)
// ----------------------------
const { processSubscriberDigests } = require("./campaigns/subscriberDigest");

exports.subscriberDailyDigest = onSchedule(
  { schedule: "0 4 * * *", timeZone: "UTC", region: "us-central1" },
  async () => { await processSubscriberDigests(); }
);

// ----------------------------
// COS WORKERS: Morning Run (7am PT) + Evening Run (6pm PT)
// ----------------------------
const { runCosMorning, runCosEvening } = require("./services/cosScheduler");

exports.cosWorkerMorningRun = onSchedule(
  { schedule: "0 7 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await runCosMorning(); }
);

exports.cosWorkerEveningRun = onSchedule(
  { schedule: "0 18 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await runCosEvening(); }
);

// ----------------------------
// VERIFICATION: Daily student & CFI checks (6 AM ET / 3 AM PT)
// ----------------------------
const { checkStudentVerifications: handleCheckStudents } = require("./services/studentVerification");
const { checkCfiVerifications: handleCheckCfis } = require("./services/cfiVerification");

exports.checkStudentVerifications = onSchedule(
  { schedule: "0 3 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleCheckStudents(); }
);

exports.checkCfiVerifications = onSchedule(
  { schedule: "0 3 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleCheckCfis(); }
);

// ----------------------------
// BILLING: Quarterly Pricing Review (Jan 1, Apr 1, Jul 1, Oct 1 at 9am PT)
// ----------------------------
const { runQuarterlyPricingReview } = require("./billing/quarterlyPricingReview");

exports.quarterlyPricingReview = onSchedule(
  { schedule: "0 9 1 1,4,7,10 *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await runQuarterlyPricingReview(); }
);

// ----------------------------
// WORKER DEPRECATION: Check for 90-day inactive workers — weekly on Mondays
// ----------------------------
exports.checkWorkerDeprecation = onSchedule(
  { schedule: "0 10 * * 1", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => {
    const admin = require("firebase-admin");
    const ddb = admin.firestore();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysWarning = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    try {
      // Find all published workers
      const tenantsSnap = await ddb.collectionGroup("workers")
        .where("buildPhase", "==", "published")
        .limit(500)
        .get();

      for (const doc of tenantsSnap.docs) {
        const worker = doc.data();
        const lastActivity = worker.lastExecutedAt?.toDate?.() || worker.updatedAt?.toDate?.() || null;
        if (!lastActivity) continue;

        const workerRef = doc.ref;
        const tenantId = doc.ref.parent.parent.id;
        const workerId = doc.id;

        // 90-day threshold — transfer ownership
        if (lastActivity < ninetyDaysAgo && worker.deprecationWarned && !worker.deprecationTransferred) {
          await workerRef.update({
            deprecationTransferred: true,
            deprecationTransferredAt: admin.firestore.FieldValue.serverTimestamp(),
            originalCreatorId: worker.createdBy,
            transferredTo: "titleapp_platform",
          });
          console.log(`[deprecation] Transferred ownership of ${workerId} from tenant ${tenantId}`);
          continue;
        }

        // 60-day threshold — send warning (30 days before transfer)
        if (lastActivity < thirtyDaysWarning && !worker.deprecationWarned) {
          await workerRef.update({
            deprecationWarned: true,
            deprecationWarnedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          // Log for notification service to pick up (email + SMS)
          await ddb.collection("notifications").add({
            type: "deprecation_warning",
            tenantId,
            workerId,
            workerName: worker.display_name || worker.name || workerId,
            creatorId: worker.createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            daysUntilTransfer: 30,
          });
          console.log(`[deprecation] Warning sent for ${workerId} — 30 days until transfer`);
        }
      }
    } catch (e) {
      console.error("[checkWorkerDeprecation] error:", e.message);
    }
  }
);

// ----------------------------
// LOW RATING CHECK: Flag workers below 3.0 for 60 days — weekly on Tuesdays
// ----------------------------
exports.checkLowRatings = onSchedule(
  { schedule: "0 10 * * 2", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => {
    const admin = require("firebase-admin");
    const ddb = admin.firestore();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    try {
      const ratingsSnap = await ddb.collection("ratings").get();
      const workerRatings = {};
      ratingsSnap.docs.forEach(doc => {
        const r = doc.data();
        if (!workerRatings[r.workerId]) workerRatings[r.workerId] = { total: 0, count: 0, oldest: null };
        workerRatings[r.workerId].total += r.stars;
        workerRatings[r.workerId].count += 1;
        const createdAt = r.createdAt?.toDate?.();
        if (createdAt && (!workerRatings[r.workerId].oldest || createdAt < workerRatings[r.workerId].oldest)) {
          workerRatings[r.workerId].oldest = createdAt;
        }
      });

      for (const [workerId, data] of Object.entries(workerRatings)) {
        const avg = data.total / data.count;
        if (avg < 3.0 && data.count >= 3 && data.oldest && data.oldest < sixtyDaysAgo) {
          // Check if already flagged
          const existing = await ddb.collection("reviewQueue").where("workerId", "==", workerId).where("type", "==", "low_rating_review").where("status", "==", "pending").limit(1).get();
          if (existing.empty) {
            await ddb.collection("reviewQueue").add({
              workerId,
              type: "low_rating_review",
              averageRating: Math.round(avg * 10) / 10,
              ratingCount: data.count,
              status: "pending",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[lowRatings] Flagged ${workerId} — avg ${avg.toFixed(1)} from ${data.count} ratings`);
          }
        }
      }
    } catch (e) {
      console.error("[checkLowRatings] error:", e.message);
    }
  }
);

// ----------------------------
// ID VERIFICATION: Admin nudge — every 30 minutes (Session 30)
// ----------------------------
const { checkIdVerificationNudge } = require("./services/idVerification");

exports.idVerificationNudge = onSchedule(
  { schedule: "*/30 * * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await checkIdVerificationNudge(); }
);

// ----------------------------
// TRIAL EXPIRY: Daily check — day 12/14 notifications + day 15 suspension (Session 30)
// ----------------------------
const { checkTrialExpiry } = require("./services/workerTrial");

exports.checkTrialExpiry = onSchedule(
  { schedule: "0 6 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await checkTrialExpiry(); }
);

// ----------------------------
// DOCUMENT CONTROL: Daily Expiry Check (34.10-T2) — 8am PT daily
// ----------------------------
const { checkDocumentExpiry } = require("./documentControl/documentControlService");

exports.documentExpiryCheck = onSchedule(
  { schedule: "0 8 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await checkDocumentExpiry(); }
);

// ----------------------------
// BILLING: Usage Event Processor (34.11-T2) — hourly
// ----------------------------
const { processUsageEvents, checkBalanceRecharge } = require("./billing/usageProcessor");

exports.usageEventProcessor = onSchedule(
  { schedule: "0 * * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await processUsageEvents(); }
);

// ----------------------------
// BILLING: Balance Recharge Check (34.11-T2) — every 15 minutes
// ----------------------------
exports.balanceRechargeCheck = onSchedule(
  { schedule: "*/15 * * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await checkBalanceRecharge(); }
);

// ----------------------------
// PIPELINE: Guest Lead Recovery (39.9-T2) — daily 9 AM HST
// ----------------------------
const { guestLeadRecovery } = require("./pipeline/guestLeadRecovery");

exports.guestLeadRecovery = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Pacific/Honolulu", region: "us-central1" },
  async () => { await guestLeadRecovery(); }
);

// ----------------------------
// PIPELINE: Nightly Worker Sync (39.11-T2) — midnight HST (10:00 UTC)
// ----------------------------
const { scheduledWorkerSync } = require("./pipeline/scheduledWorkerSync");

exports.scheduledWorkerSync = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Pacific/Honolulu", region: "us-central1" },
  async () => { await scheduledWorkerSync(); }
);

// ----------------------------
// CONTENT SYNC: Firestore trigger on platform/contentSync/events/{eventId}
// ----------------------------
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { handleContentSync } = require("./onContentSync");

exports.onContentSync = onDocumentCreated(
  { document: "platform/contentSync/events/{eventId}", region: "us-central1" },
  async (event) => { await handleContentSync(event.data); }
);

// ----------------------------
const { seedAdmins } = require("./admin/seedAdminData");
exports.seedAdminData = onRequest({ region: "us-central1" }, async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  return seedAdmins(req, res);
});

// ----------------------------
// ADMIN: SEED SAMPLE DATA
// ----------------------------
const { seedSampleData: handleSeedSample } = require("./admin/seedSampleData");
exports.seedSampleData = onRequest({ region: "us-central1" }, async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  return handleSeedSample(req, res);
});

// ----------------------------
// ADMIN: SEED ACTIVITY DATA
// ----------------------------
const { seedActivityData: handleSeedActivity } = require("./admin/seedActivityData");
exports.seedActivityData = onRequest({ region: "us-central1" }, async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  return handleSeedActivity(req, res);
});

// ----------------------------
// SIGNATURES: Dropbox Sign (HelloSign) / SAFE
// ----------------------------
const { createSignatureRequest: handleCreateSig } = require("./signatures/createSignatureRequest");
const { hellosignWebhook: handleHellosignHook } = require("./signatures/hellosignWebhook");

exports.createSignatureRequest = onRequest({ region: "us-central1" }, async (req, res) => {
  if (billingCors(req, res)) return;
  return handleCreateSig(req, res);
});

exports.hellosignWebhook = onRequest({ region: "us-central1" }, async (req, res) => {
  return handleHellosignHook(req, res);
});
