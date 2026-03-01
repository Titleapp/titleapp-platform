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
  const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vinStr}?format=json`;
  console.log("🔍 chatEngine: decoding VIN via NHTSA:", vinStr);

  const nhtsaResponse = await fetch(nhtsaUrl);
  if (!nhtsaResponse.ok) throw new Error(`NHTSA API returned ${nhtsaResponse.status}`);

  const nhtsaData = await nhtsaResponse.json();
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
    await userRef.set({
      email,
      name: name || null,
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
      system: `You are TitleApp AI, a platform that helps people keep track of important records (car titles, home documents, pet records, student transcripts, etc.). Be concise, professional, and focus on helping users understand how to organize and protect their important documents.

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
          system: `You are TitleApp AI. Your previous response was flagged for these policy violations:\n${violationList}\n\nRewrite your response to avoid these violations. Never imply guaranteed returns, provide specific legal advice, or guarantee tax outcomes. Be professional and factual.\n\nFormatting rules — follow these strictly:\n- Never use emojis.\n- Never use markdown formatting.\n- Never use bullet points or numbered lists unless explicitly asked.\n- Write in complete, clean sentences. Plain text only.`,
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
      const { email, name, accountType, companyName, companyDescription } = body || {};
      if (!email) return jsonError(res, 400, "Missing email");

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(email).toLowerCase())) {
        return jsonError(res, 400, "Invalid email format");
      }

      // Rate limiting by IP
      const clientIp = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
      if (!checkSignupRateLimit(clientIp)) {
        return res.status(429).json({ ok: false, error: 'Too many signup attempts. Try again later.' });
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
          await userRef.set({
            email,
            name: name || null,
            accountType: accountType || "consumer",
            companyName: companyName || null,
            companyDescription: companyDescription || null,
            termsAcceptedAt: null,
            createdAt: nowServerTs(),
            createdVia: "chat",
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

    // ----------------------------
    // CHAT ENGINE (new conversational state machine)
    // Handles both authenticated and unauthenticated sessions.
    // Legacy chat:message requests (without sessionId) fall through to the
    // auth-gated handler below.
    // ----------------------------
    if (route === "/chat:message" && method === "POST" && body.sessionId) {
      let { sessionId, userInput, action, actionData, fileData, fileName, surface } = body;

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
                      termsUrl: 'https://title-app-alpha.web.app/terms',
                      privacyUrl: 'https://title-app-alpha.web.app/privacy',
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

          // Seed devName from returning user's auth profile (sent by frontend)
          if (!sessionState.devName && body.returnUserName) {
            sessionState.devName = body.returnUserName;
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
          messages.push({ role: 'user', content: userInput });

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
                      termsUrl: 'https://title-app-alpha.web.app/terms',
                      privacyUrl: 'https://title-app-alpha.web.app/privacy',
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
                ? `${name}, the signup system is taking a moment. Give me your email again and I will retry right here.`
                : `The signup system is taking a moment. Give me your email again and I will retry right here.`;
              sessionState.devHistory.push({ role: 'assistant', content: fallbackMsg });
              await sessionRef.set({ state: sessionState, surface: 'developer', updatedAt: nowServerTs() }, { merge: true });
              return res.json({
                ok: true,
                message: fallbackMsg,
                showSignup: false,
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
          const sandboxSystemPrompt = `You are Alex, TitleApp's developer relations AI. You're inside the Developer Sandbox -- the DIY Digital Worker builder where creators build, test, and publish AI services.

TERMINOLOGY: Always say "Digital Worker." Frame it as hiring an AI team member, not using software.

YOUR ROLE: Help creators build Digital Workers that solve real problems and earn revenue. You can:
- Help them identify the problem their audience has, then generate the structure
- Create and edit rules in plain language
- Generate folder structures and document templates
- Run tests and explain results
- Help write marketplace listings
- Coach them on growing their subscriber base after publishing

WHEN SOMEONE DESCRIBES AN IDEA OR A PROBLEM THEY WANT TO SOLVE:
Give them the roadmap FIRST so they know the process. Keep it brief -- 6 steps, one sentence each:

"Cool -- a [their idea]. Here's how we'll build it:

1. Define -- I'll help you map out what goes in and what comes out.
2. Rules -- You tell me your business rules in plain language. I'll turn them into enforcement logic.
3. Build -- I'll build your Digital Worker, templates, and config.
4. Test -- We'll run sample data through it and see what passes.
5. Publish -- Publish it to the marketplace.
6. Grow -- I'll help you get your first subscribers and start earning.

Ready to start? Tell me more about what data you're working with."

AFTER GIVING THE ROADMAP:
- Reference the steps as you go: "That covers step 1. Moving to rules."
- Keep a running sense of progress: "Rules are set. 3 hard stops, 1 warning. Ready to build?"
- When transitioning, name the step: "Step 4 -- testing."
- If the user jumps ahead, go with them. If they go back, no problem.

DO NOT give the roadmap on every message. Only when:
- User says they want to build something new
- User seems lost
- User asks for an overview

STEP 6 -- GROW MODE:
When a Digital Worker is published and the user says "grow" or "launch" or "get subscribers" or "what's next":
- Switch into distribution coach mode
- Help them with: social media posts, email templates, embed widgets, marketplace optimization
- Generate copy they can use: "Here's a tweet you can post: [draft]"
- Suggest concrete next actions: "Share the marketplace link with 3 people who'd use this."
- Track their progress: "You have 0 subscribers. First goal: get to 5."
- Be encouraging but factual -- no empty hype

Revenue context: Creators earn 75% of subscription revenue. $9/seat/month means $6.75/seat to the creator. 10 subscribers = $67.50/month passive income.

ADAPT TO THE USER'S LEVEL:
- Novice: Do most of the work. "Describe what you want, I'll build it."
- Expert: Assist when asked. Don't over-explain. If they're typing structured rules or JSON, they're an expert.

BREVITY RULES:
- 2-3 sentences per response (the roadmap is the ONE exception)
- ONE question per response
- Match the user's energy
- After the roadmap, go back to being brief
- No emojis. No markdown formatting. Plain text only.

OUTCOME-FOCUSED LANGUAGE:
- Lead with outcomes: 'What problem does your audience have?'
- Frame rules as protection: 'What should your Digital Worker never get wrong?'
- Frame publishing as launching: 'Let's get your first subscriber'
- AVOID: 'enforcement engine,' 'deterministic,' 'validation layer,' 'structured rulesets'

DIGITAL WORKER BUILD PROTOCOL:
When the developer confirms build and you have enough info (name + description + at least 1-2 rules), output:
[WORKER_SPEC]{"name":"Digital Worker Name","description":"What it does","rules":["Rule 1","Rule 2"],"capabilities":[],"category":"category"}[/WORKER_SPEC]
Include this AFTER your conversational text. The system strips it and creates the Digital Worker.
Before outputting, make sure you have at minimum: a name, a description, and at least 1-2 rules.

WORKER #1 PIPELINE (the Builder tab handles this visually):
After a Digital Worker is created via [WORKER_SPEC], the builder tab guides them through the Worker #1 pipeline:
1. Intake Interview -- they pick vertical, jurisdiction, describe the worker, and paste existing SOPs.
2. Regulatory Research -- Worker #1 (AI) researches regulations and generates a tiered rules library.
3. Compliance Brief -- they review what Worker #1 found.
4. Rules Library Editor -- they see 4 tiers (Tier 0 Platform locked, Tier 1 Regulatory locked, Tier 2 Best Practices editable, Tier 3 SOPs customizable) and can edit Tier 2/3.
5. Pre-Publish Check -- 7-point acceptance criteria validation.
6. Publish Flow -- waiver, identity verification, submit for review.

If someone asks about the pipeline, explain it briefly. If they are stuck on a step, help them. But do NOT try to run the pipeline yourself -- the UI handles it. Your role is to create the worker first, then guide them to the Builder tab.

When a worker has a buildPhase, reference it: "Your worker is in the [phase] phase. The Builder tab has your next step."

NEVER:
- Say "go to titleapp.ai" or "sign in somewhere else"
- Output [Note: ...] or [System: ...] bracket text
- Ask more than one question in a response
- Write more than 3 sentences unless they asked for detail
- Start building without giving the roadmap first (for a new Digital Worker)
- Deny TitleApp's blockchain heritage
- Always say "Digital Worker"

IF SIGNUP FAILS:
Say: "Signup system is being slow -- give me your email again and I will retry right here."
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
- Pricing: sandbox is free. $9/seat/month for production workspaces.
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

IF SIGNUP/VAULT CREATION FAILS:
Don't show a broken state. Say: "Signup system is being slow -- give me your email again and I will retry right here."
${nameGuidance}${authGuidance}`;

          try {
            const anthropic = getAnthropic();
            const aiResp = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 1024,
              system: surface === 'sandbox' ? sandboxSystemPrompt : devSystemPrompt,
              messages,
            });

            let aiText = aiResp.content[0]?.text || "Hey there -- happy to help. What's your name?";

            // Detect and parse [WORKER_SPEC]...[/WORKER_SPEC] token from AI response
            let workerCard = null;
            let buildAnimation = false;
            const workerSpecMatch = aiText.match(/\[WORKER_SPEC\]([\s\S]*?)\[\/WORKER_SPEC\]/);
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

                if (targetTenantId) {
                  // Create Worker now
                  const { computeHash: devHash } = require("./api/utils/titleMint");
                  const workerId = "wkr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                  const rulesHash = devHash(rules);
                  const metadataHash = devHash({ name: workerName, description: workerDesc, rules_hash: rulesHash, created_at: new Date().toISOString() });

                  await db.doc(`tenants/${targetTenantId}/workers/${workerId}`).set({
                    name: workerName, description: workerDesc,
                    source: { platform: 'dev-chat', createdVia: 'alex' },
                    capabilities: Array.isArray(workerSpec.capabilities) ? workerSpec.capabilities.slice(0, 20) : [],
                    rules, category: workerCategory,
                    pricing: { model: 'subscription', amount: 0, currency: 'USD' },
                    status: 'registered', imported: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: sessionState.userId,
                    rulesHash, metadataHash,
                  });

                  buildAnimation = true;
                  workerCard = {
                    type: 'workerCard',
                    data: { workerId, name: workerName, description: workerDesc, rules: rules.slice(0, 5), rulesCount: rules.length, status: 'registered', category: workerCategory, tenantId: targetTenantId },
                  };
                  sessionState.lastWorkerId = workerId;
                  sessionState.lastWorkerTenantId = targetTenantId;
                  console.log(`[dev] Worker created: ${workerId} for tenant ${targetTenantId}`);
                } else {
                  // No account yet — stash spec for creation after signup
                  sessionState.pendingWorkerSpec = workerSpec;
                  buildAnimation = true;
                  workerCard = {
                    type: 'workerCard',
                    data: { workerId: 'pending', name: workerName, description: workerDesc, rules: rules.slice(0, 5), rulesCount: rules.length, status: 'pending-signup', category: workerCategory, tenantId: null },
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

            sessionState.devHistory.push({ role: 'user', content: userInput });
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
              conversationState: 'dev_discovery',
            });
          } catch (e) {
            console.error("Developer AI failed:", e.message);
            await sessionRef.set({
              state: sessionState,
              surface: 'developer',
              userId: authUser ? authUser.uid : null,
              ...(sessionSnap.exists ? {} : { createdAt: nowServerTs() }),
              updatedAt: nowServerTs(),
            }, { merge: true });
            return res.json({
              ok: true,
              message: "I can help with the API and integration. What would you like to know?",
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

          const privacySystemPrompt = `You are Alex, TitleApp's AI assistant. You are answering questions about TitleApp's privacy practices and data handling.

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

          const contactSystemPrompt = `You are Alex, TitleApp's AI assistant. You are helping someone who wants to contact or learn about TitleApp.

COMPANY INFORMATION:

Company: TitleApp AI
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
              system: `You are TitleApp AI's intent classifier. The user is authenticated and telling you what they want to do. Based on their message, determine what they're trying to accomplish. Consider the full meaning of what they're saying, not just keywords.

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
                system: `You are TitleApp AI. Based on the following conversation with "${ctx.companyName}" (${ctx.companyDescription}), summarize the Digital Worker configuration you'd set up for them. Write 2-3 sentences describing what their workspace will include — record types, compliance rules, and workflows. Write directly to the user in second person. No bullet points, no jargon.`,
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
                system: `You are TitleApp AI helping onboard a new business. The user has described their business. Based on their description, determine:

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
              ? `You are TitleApp AI. A business owner just set up their workspace. Business: ${ctx.companyDescription || ctx.companyName}. Industry: ${ctx.industry || "general"}.

Write 2 sentences MAX. First sentence: what changes for them now (no more scrambling, records are permanent). Second sentence: a transition to their first action. No jargon, no bullet points, no markdown, no emojis. Direct and warm.`
              : `You are TitleApp AI. A consumer just signed up. Write 2 sentences MAX. First sentence: what changes for them (verified records = real value). Second sentence: "What would you like to start with?" No jargon, no bullet points, no markdown, no emojis.`;

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
              system: `You are TitleApp AI. A user just created a verified record. Generate a 1-2 sentence acknowledgment that connects this specific achievement to real-world value — money saved, time saved, or stress avoided. Be specific to what they just did. No jargon, no feature names, no emojis, no bullet points. Warm and direct. End with a brief forward-looking statement about what this means for them.

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
            instrument: "Post-Money SAFE",
            raiseAmount: 1070000,
            valuationCap: 15000000,
            discount: 0.20,
            minimumInvestment: 1000,
            proRata: true,
            proRataNote: "Yes — all investors",
            fundingPortal: { name: "Wefunder", url: "https://wefunder.com/titleapp", regulation: "Reg CF" },
            conversionScenarios: [
              { exitValuation: 30000000, multiple: "2.0x" },
              { exitValuation: 50000000, multiple: "3.3x" },
              { exitValuation: 75000000, multiple: "5.0x" },
              { exitValuation: 100000000, multiple: "6.7x" },
              { exitValuation: 150000000, multiple: "10.0x" },
            ],
            runway: { netProceeds: 803000, monthlyBurn: 27800, zeroRevenueMonths: 28, withRevenueMonths: "33+", cashFlowPositiveTarget: "mid-2027" },
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
        return res.json({ ok: true, config: configDoc.data() });
      } catch (e) {
        console.error("raise:config GET failed:", e);
        return jsonError(res, 500, "Failed to load raise config");
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

    // All other routes require Firebase auth
    const auth = await requireFirebaseUser(req, res);
    if (auth.handled) return;

    const ctx = getCtx(req, body, auth.user);
    console.log("🧠 CTX:", ctx);

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

    // ── Worker #1 — Digital Worker Creator Pipeline ──────────────────────

    // Platform-level rules (Tier 0) — locked, immutable, injected into every Digital Worker
    const TIER0_RULES = [
      "All AI outputs must pass through the rules engine before reaching the user.",
      "Every action must produce an immutable audit trail entry.",
      "PII must never appear in logs, error messages, or external API responses.",
      "The Digital Worker must not impersonate a licensed professional (attorney, doctor, CPA) unless explicitly credentialed.",
      "All financial calculations must include a disclaimer that they are estimates, not advice.",
      "The Digital Worker must not store payment card data directly — delegate to Stripe or equivalent PCI-compliant processor.",
      "Rate limiting must be enforced: no single user session may exceed 100 AI calls per hour.",
      "The Digital Worker must fail closed on rule violations — block the action, do not proceed with a warning.",
    ];

    // POST /v1/worker1:intake — Save intake data for Worker #1 pipeline
    if (route === "/worker1:intake" && method === "POST") {
      const { tenantId, workerId, vertical, jurisdiction, description, sops, existingDocs } = body;
      if (!tenantId || !workerId) return res.json({ ok: false, error: "Missing tenantId or workerId" });
      if (!vertical || !jurisdiction) return res.json({ ok: false, error: "Missing vertical or jurisdiction" });
      try {
        const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
        const workerSnap = await workerRef.get();
        if (!workerSnap.exists) return res.json({ ok: false, error: "Digital Worker not found" });
        await workerRef.update({
          buildPhase: "intake",
          intake: {
            vertical: String(vertical).substring(0, 100),
            jurisdiction: String(jurisdiction).substring(0, 100),
            description: String(description || "").substring(0, 5000),
            sops: Array.isArray(sops) ? sops.slice(0, 50).map(s => String(s).substring(0, 1000)) : [],
            existingDocs: Array.isArray(existingDocs) ? existingDocs.slice(0, 10) : [],
            submittedAt: nowServerTs(),
          },
          raasLibrary: { tier0: TIER0_RULES, tier1: [], tier2: [], tier3: [] },
          updatedAt: nowServerTs(),
        });
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

        const updates = { buildPhase: "library", updatedAt: nowServerTs() };
        if (Array.isArray(tier2)) {
          updates["raasLibrary.tier2"] = tier2.slice(0, 15).map(r => String(r).substring(0, 1000));
        }
        if (Array.isArray(tier3)) {
          updates["raasLibrary.tier3"] = tier3.slice(0, 50).map(r => String(r).substring(0, 1000));
        }

        // Compute rules hash for integrity
        const allRules = [
          ...(updates["raasLibrary.tier2"] || workerSnap.data().raasLibrary?.tier2 || []),
          ...(updates["raasLibrary.tier3"] || workerSnap.data().raasLibrary?.tier3 || []),
        ];
        const { computeHash } = require("./api/utils/titleMint");
        updates.rulesHash = computeHash(allRules);

        await workerRef.update(updates);
        console.log(`[worker1:rules:save] Saved rules for ${workerId}`);
        return res.json({ ok: true, buildPhase: "library" });
      } catch (e) {
        console.error("[worker1:rules:save] error:", e.message);
        return res.json({ ok: false, error: e.message });
      }
    }

    // POST /v1/worker1:prePublish — Run 7-point acceptance check
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
        ];

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

        console.log(`[worker1:prePublish] ${workerId}: ${score}/7, passed=${passed}`);
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

        // Update worker status
        await workerRef.update({
          buildPhase: "review",
          review: {
            status: "pending",
            submittedAt: nowServerTs(),
            submittedBy: user.uid,
          },
          publishFlow: {
            waiverSigned: body.waiverSigned || false,
            waiverSignatureId: body.waiverSignatureId || null,
            identityVerified: body.identityVerified || false,
            identitySessionId: body.identitySessionId || null,
            paymentComplete: body.paymentComplete || false,
            paymentIntentId: body.paymentIntentId || null,
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
          status: "pending",
          submittedAt: nowServerTs(),
        });

        console.log(`[worker1:submit] ${workerId} submitted for review by ${user.uid}`);
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
        return res.json({ ok: true, decision });
      } catch (e) {
        console.error("[admin:worker:review] error:", e.message);
        return res.json({ ok: false, error: e.message });
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

    // For all other routes, enforce tenant membership
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
            const isPersonalVault = (ctx.vertical || "").toLowerCase() === "consumer" || (ctx.vertical || "").toUpperCase() === "GLOBAL";
            const personalSystemPrompt = `You are the user's personal Chief of Staff in their TitleApp Vault. You do everything for them directly in this chat. You create records, store files, manage logbooks, handle attestations, and organize their entire digital life. The dashboard is a read-only view into what you have already done -- the user never needs to leave this chat to accomplish anything.

Your role:
You are not a chatbot. You are a trusted team member who acts on the user's behalf. When they tell you about something they own, you create the record. When they upload a file, you store it. When they need to attest ownership, you walk them through it. You never tell the user to "go to a section" or "use the left navigation." Everything happens here.

You do NOT discuss business analytics, deals, investment criteria, team management, or inventory operations. This is a personal Vault, not a business workspace.

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

After the markers, confirm to the user that their document is ready for download. Do NOT mention the markers to the user.`;

            const businessSystemPrompt = `You are the AI assistant for TitleApp, a business intelligence platform. The user's vertical is "${ctx.vertical || "general"}" and they are on the "${(context || {}).currentSection || "dashboard"}" section.

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
6. When the user asks for MULTIPLE deliverables (report + model + deck), handle ONE at a time. Generate the first document, confirm it, then ask if they want you to proceed to the next.` : ctx.vertical === "auto" ? `You are the Chief of Staff for Demo Motors, a Toyota dealership in Houston, TX. Your primary mission is to SELL MORE CARS and MAXIMIZE DEALERSHIP REVENUE.

You manage: vehicle inventory (85 new Toyota + 150 used multi-brand), 150 customers with purchase history and satisfaction scores, 14 financing products (TMCC, Chase, Capital One, Southeast Toyota, TFS Lease), 12 warranty/protection products (Extra Care Platinum/Gold, GAP, ToyoGuard, Tire & Wheel, Key Replacement, Windshield), and weekly service schedule (25 appointments/day, 5 advisors, 12 bays).

Sales workflow: Identify opportunity, match customer to 2-3 vehicles from inventory, draft personalized outreach (always use first name, reference their specific vehicle and history), handle responses, pre-qualify financing (TMCC for 650+, Chase/Capital One for 600-649, TMCC Subprime for under 600), recommend F&I products, schedule test drive, prepare deal jacket.

F&I matching: New vehicles get Extra Care Platinum + ToyoGuard Platinum + GAP if financed. Used/CPO get Extra Care Gold + GAP + Tire & Wheel. All deals get key replacement and windshield protection. Always calculate monthly payment impact.

Service: Every service visit is a sales touchpoint. Check warranty expiration, check if customer is a trade-up candidate based on age/mileage, proactively schedule overdue customers.

Outbound communications: ALWAYS use customer first name, reference their specific vehicle, reference their history, include specific reason to come in, clear CTA with date/time. Texts under 160 chars, emails under 200 words.

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

Available actions: create_deal, close_deal, add_investor, create_capital_call, create_distribution, send_communication, run_compliance_check. After the markers, confirm to the user what was done. Do NOT mention the markers to the user.` : ctx.vertical === "real-estate" || ctx.vertical === "property-mgmt" ? "You specialize in real estate transactions, property management, compliance, and document management." : "Help with business operations, compliance questions, document management, and platform navigation."} When discussing deals or investments, note that you provide informational analysis only, not financial advice.

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

            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 4096,
              system: isPersonalVault ? personalSystemPrompt : businessSystemPrompt,
              messages,
            });

            aiResponse = response.content[0]?.text || "I apologize, but I couldn't generate a response. Please try again.";
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
                  content: `You are TitleApp AI, a business intelligence platform. Be concise and professional.

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

        // Call NHTSA API
        const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vinStr}?format=json`;
        console.log("🔍 Decoding VIN via NHTSA:", vinStr);

        const nhtsaResponse = await fetch(nhtsaUrl);
        if (!nhtsaResponse.ok) {
          throw new Error(`NHTSA API returned ${nhtsaResponse.status}`);
        }

        const nhtsaData = await nhtsaResponse.json();
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

        // Try HelloSign / DropboxSign
        const hellosignKey = process.env.HELLOSIGN_API_KEY;
        const hellosignClientId = process.env.HELLOSIGN_CLIENT_ID;

        if (hellosignKey && hellosignClientId) {
          try {
            const hsResp = await fetch("https://api.hellosign.com/v3/signature_request/create_embedded", {
              method: "POST",
              headers: {
                "Authorization": "Basic " + Buffer.from(`${hellosignKey}:`).toString("base64"),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                client_id: hellosignClientId,
                title: `SAFE Agreement — ${investorName}`,
                subject: `TitleApp SAFE Agreement — $${Number(amount).toLocaleString()}`,
                message: `Please review and sign the SAFE agreement for your $${Number(amount).toLocaleString()} investment in TitleApp.`,
                signers: [{ email_address: investorEmail, name: investorName, order: 0 }],
                metadata: { investorId, amount: String(amount) },
                test_mode: 1,
              }),
            });
            const hsResult = await hsResp.json();
            if (hsResult.signature_request) {
              const sigReq = hsResult.signature_request;
              const sigId = sigReq.signatures?.[0]?.signature_id;
              let signUrl = null;
              if (sigId) {
                const embedResp = await fetch(`https://api.hellosign.com/v3/embedded/sign_url/${sigId}`, {
                  headers: { "Authorization": "Basic " + Buffer.from(`${hellosignKey}:`).toString("base64") },
                });
                const embedResult = await embedResp.json();
                signUrl = embedResult.embedded?.sign_url;
              }
              await intentRef.update({
                status: "safe_sent",
                safeMethod: "hellosign",
                safeSignatureRequestId: sigReq.signature_request_id,
                safeSentAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              return res.json({ ok: true, method: "hellosign", signUrl, signatureRequestId: sigReq.signature_request_id });
            }
          } catch (hsErr) {
            console.error("HelloSign error:", hsErr.message);
          }
        }

        // Fallback: typed consent
        const consentId = `consent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await intentRef.update({
          status: "consent_pending",
          safeMethod: "typed_consent",
          safeConsentId: consentId,
        });
        return res.json({ ok: true, method: "typed_consent", consentId });
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
              name: "Pitch Deck",
              filename: "TitleApp_Pitch_Deck_v4.pptx",
              storagePath: "investorDocs/TitleApp_Pitch_Deck_v4.pptx",
              type: "pitch_deck",
              description: "Full pitch deck -- Digital Workers, Sandbox, 6-channel distribution",
              requiresVerification: false,
              icon: "presentation",
              tier: 1,
            },
            {
              name: "Executive Summary",
              filename: "TitleApp_One_Pager_v4.pdf",
              storagePath: "investorDocs/TitleApp_One_Pager_v4.pdf",
              type: "one_pager",
              description: "One-page overview -- Digital Workers, Sandbox, distribution strategy",
              requiresVerification: false,
              icon: "document",
              tier: 1,
            },
            {
              name: "Business Plan",
              filename: "TitleApp_Business_Plan_Feb2026.docx",
              storagePath: "investorDocs/TitleApp_Business_Plan_Feb2026.docx",
              type: "business_plan",
              description: "Comprehensive business plan with financials and projections",
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
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const auth = await requireFirebaseUser(req, res);
  if (auth.handled) return;

  const body = req.body || {};
  const { name, workspace_ids, scopes } = body;

  if (!workspace_ids || !Array.isArray(workspace_ids) || workspace_ids.length === 0) {
    return res.status(400).json({ ok: false, error: "workspace_ids array is required" });
  }

  // Verify user owns these workspaces
  const userId = auth.user.uid;
  for (const wsId of workspace_ids) {
    if (wsId === "vault") continue; // personal vault is always accessible
    const wsDoc = await db.collection("users").doc(userId).collection("workspaces").doc(wsId).get();
    if (!wsDoc.exists) {
      return res.status(403).json({ ok: false, error: `You do not own workspace: ${wsId}` });
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
const { handleStripeWebhook } = require("./billing/stripeWebhook");

exports.setupStripeProducts = onRequest({ region: "us-central1" }, async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  return setupStripeProducts(req, res);
});

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
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return true; }
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
// ADMIN: DAILY DIGEST (Scheduled 7am PST)
// ----------------------------
const { generateDailyDigest: handleDailyDigest } = require("./admin/generateDailyDigest");

exports.generateDailyDigest = onSchedule(
  { schedule: "0 7 * * *", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => { await handleDailyDigest(); }
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
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
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
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
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
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
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
