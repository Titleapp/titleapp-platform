"use strict";

const admin = require("firebase-admin");
const { emitCreatorEvent, CREATOR_EVENT_TYPES } = require("./creatorEvents");

function getDb() { return admin.firestore(); }

/**
 * Route handler: GET /v1/sandbox:preview?slug=xxx
 * Public — no auth required.
 */
async function getPreviewData(req, res) {
  const db = getDb();
  const slug = req.query.slug;
  if (!slug) return res.status(400).json({ ok: false, error: "Missing slug parameter" });

  const slugSnap = await db.collection("previewSlugs").doc(slug).get();
  if (!slugSnap.exists) return res.status(404).json({ ok: false, error: "Preview not found" });

  const slugData = slugSnap.data();
  const sessionSnap = await db.collection("sandboxSessions").doc(slugData.sessionId).get();
  if (!sessionSnap.exists) return res.status(404).json({ ok: false, error: "Session not found" });

  const session = sessionSnap.data();
  const spec = session.spec || {};

  // Return sanitized public-facing data only
  return res.json({
    ok: true,
    preview: {
      name: spec.name || "",
      tagline: spec.tagline || "",
      description: spec.description || "",
      category: spec.category || "general",
      targetAudience: spec.targetAudience || "",
      capabilities: spec.capabilities || [],
      pricingTier: spec.pricingTier,
      subscriberCount: slugData.subscriberCount || 0,
      creatorDisplayName: null, // privacy: do not expose creator identity
    },
  });
}

/**
 * Route handler: POST /v1/sandbox:preview:interest
 * Public — no auth required.
 * Body: { slug, email, name? }
 */
async function capturePreviewInterest(req, res) {
  const db = getDb();
  const { slug, email, name } = req.body || {};

  if (!slug || !email) return res.status(400).json({ ok: false, error: "Missing slug or email" });

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email format" });
  }

  const slugRef = db.collection("previewSlugs").doc(slug);
  const slugSnap = await slugRef.get();
  if (!slugSnap.exists) return res.status(404).json({ ok: false, error: "Preview not found" });

  const slugData = slugSnap.data();
  const wasPreviouslyZero = (slugData.subscriberCount || 0) === 0;

  // Write subscriber
  await db.collection("workerInterest").doc(slug).collection("subscribers").add({
    email: String(email).slice(0, 254),
    name: name ? String(name).slice(0, 100) : null,
    subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: "preview_page",
  });

  // Increment counter
  await slugRef.update({
    subscriberCount: admin.firestore.FieldValue.increment(1),
  });

  // Emit first_subscriber event if this is the first one
  if (wasPreviouslyZero) {
    emitCreatorEvent(slugData.userId, CREATOR_EVENT_TYPES.FIRST_SUBSCRIBER, {
      sessionId: slugData.sessionId,
      slug,
      subscriberEmail: email,
    });
  }

  return res.json({ ok: true });
}

module.exports = { getPreviewData, capturePreviewInterest };
