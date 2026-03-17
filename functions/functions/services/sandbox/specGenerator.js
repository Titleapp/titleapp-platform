"use strict";

const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const { emitCreatorEvent, CREATOR_EVENT_TYPES } = require("./creatorEvents");

function getDb() { return admin.firestore(); }

const SYSTEM_PROMPT = `You are TitleApp's Worker Architect. Given a creator's answers to 8 discovery questions, generate a complete draft Digital Worker specification.

OUTPUT FORMAT: Return ONLY valid JSON with no markdown fencing. Schema:
{
  "name": "string (max 60 chars, concise professional name)",
  "slug": "string (URL-safe, lowercase, hyphens, max 40 chars)",
  "tagline": "string (max 120 chars, one-sentence value proposition)",
  "description": "string (max 500 chars, what the worker does)",
  "category": "string (one of: real-estate, auto, aviation, education, investment, government, construction, insurance, legal, healthcare, finance, technology, general)",
  "targetAudience": "string (who uses this)",
  "problemSolves": "string (the core problem addressed)",
  "pricingTier": number (0=free, 1=$29/mo, 2=$49/mo, 3=$79/mo),
  "capabilities": ["string array, max 8 items, each max 100 chars"],
  "sampleInteractions": [
    { "user": "string", "worker": "string" }
  ],
  "complianceRules": ["string array, max 10 items"],
  "suggestedRaasRules": ["string array, max 10 items"]
}

RULES:
- Name should be professional and descriptive, not generic.
- Slug must be URL-safe (lowercase, hyphens only, no spaces).
- PricingTier: 0 for simple/personal use, 1 for small business, 2 for professional, 3 for enterprise/complex.
- SampleInteractions: exactly 3 realistic exchanges showing the worker in action.
- ComplianceRules: derive from the creator's answers. If none mentioned, apply industry defaults.
- SuggestedRaasRules: behavioral guardrails the worker should follow.
- All text: professional tone, no emojis, no marketing fluff.`;

function buildUserMessage(vibeAnswers) {
  return `CREATOR'S VIBE ANSWERS:

EXPERTISE: ${vibeAnswers.q1_expertise || "(not provided)"}
AUDIENCE: ${vibeAnswers.q2_audience || "(not provided)"}
ACCURACY REQUIREMENTS: ${vibeAnswers.q3_accuracy || "(not provided)"}
COMPLIANCE & REGULATIONS: ${vibeAnswers.q4_compliance || "(not provided)"}
OUTPUT FORMAT: ${vibeAnswers.q5_output || "(not provided)"}
JURISDICTION: ${vibeAnswers.q6_jurisdiction || "(not provided)"}
EXISTING TOOLS: ${vibeAnswers.q7_tools || "(not provided)"}
PRICING PREFERENCE: ${vibeAnswers.q8_pricing || "(not provided)"}`;
}

function sanitizeSpec(raw) {
  return {
    name: String(raw.name || "Untitled Worker").slice(0, 60),
    slug: String(raw.slug || "untitled-worker").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40),
    tagline: String(raw.tagline || "").slice(0, 120),
    description: String(raw.description || "").slice(0, 500),
    category: String(raw.category || "general").slice(0, 40),
    targetAudience: String(raw.targetAudience || "").slice(0, 300),
    problemSolves: String(raw.problemSolves || "").slice(0, 300),
    pricingTier: [0, 1, 2, 3].includes(raw.pricingTier) ? raw.pricingTier : 1,
    capabilities: (Array.isArray(raw.capabilities) ? raw.capabilities : []).slice(0, 8).map(c => String(c).slice(0, 100)),
    sampleInteractions: (Array.isArray(raw.sampleInteractions) ? raw.sampleInteractions : []).slice(0, 3).map(s => ({
      user: String(s.user || "").slice(0, 300),
      worker: String(s.worker || "").slice(0, 500),
    })),
    complianceRules: (Array.isArray(raw.complianceRules) ? raw.complianceRules : []).slice(0, 10).map(r => String(r).slice(0, 200)),
    suggestedRaasRules: (Array.isArray(raw.suggestedRaasRules) ? raw.suggestedRaasRules : []).slice(0, 10).map(r => String(r).slice(0, 200)),
  };
}

function fallbackSpec(vibeAnswers) {
  return {
    name: (vibeAnswers.q1_expertise || "My Worker").slice(0, 60),
    slug: (vibeAnswers.q1_expertise || "my-worker").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
    tagline: "",
    description: vibeAnswers.q1_expertise || "",
    category: "general",
    targetAudience: vibeAnswers.q2_audience || "",
    problemSolves: vibeAnswers.q1_expertise || "",
    pricingTier: 1,
    capabilities: [],
    sampleInteractions: [],
    complianceRules: [],
    suggestedRaasRules: [],
  };
}

/**
 * Route handler: POST /v1/sandbox:session
 * Body: { vibeAnswers: { q1_expertise, q2_audience, ... q8_pricing } }
 */
async function handleCreateSession(req, res, user) {
  const db = getDb();
  const { vibeAnswers } = req.body || {};

  if (!vibeAnswers || typeof vibeAnswers !== "object") {
    return res.status(400).json({ ok: false, error: "Missing vibeAnswers object" });
  }

  // Generate spec via Claude
  let spec;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(vibeAnswers) }],
    });

    const text = response.content[0].text;
    const parsed = JSON.parse(text);
    spec = sanitizeSpec(parsed);
  } catch (e) {
    console.error("[specGenerator] Claude or parse failed, using fallback:", e.message);
    spec = fallbackSpec(vibeAnswers);
  }

  // Ensure slug uniqueness
  const slugRef = db.collection("previewSlugs").doc(spec.slug);
  const slugSnap = await slugRef.get();
  if (slugSnap.exists) {
    spec.slug = spec.slug + "-" + Date.now().toString(36).slice(-4);
  }

  // Write sandbox session
  const sessionRef = await db.collection("sandboxSessions").add({
    userId: user.uid,
    vibeAnswers,
    spec,
    status: "spec_generated",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    specGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    pdfDownloadedAt: null,
    previewSharedAt: null,
    abandonmentFlaggedAt: null,
    replies: [],
    lastReplyAt: null,
  });

  // Write preview slug mapping
  await slugRef.set({
    userId: user.uid,
    sessionId: sessionRef.id,
    workerName: spec.name,
    category: spec.category,
    pricingTier: spec.pricingTier,
    subscriberCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Emit funnel event
  emitCreatorEvent(user.uid, CREATOR_EVENT_TYPES.SPEC_GENERATED, { sessionId: sessionRef.id });

  // Enqueue Stage 1 drip email (lazy-load to avoid circular deps)
  try {
    const { enqueueDripEmail } = require("./dripEmailQueue");
    await enqueueDripEmail(user.uid, 1, sessionRef.id);
  } catch (e) {
    console.error("[specGenerator] drip enqueue failed (non-blocking):", e.message);
  }

  return res.json({
    ok: true,
    sessionId: sessionRef.id,
    spec,
    previewUrl: `https://app.titleapp.ai/preview/${spec.slug}`,
  });
}

module.exports = { handleCreateSession };
