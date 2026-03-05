/**
 * buildRegistryContext.js — Dynamic worker registry context for Alex
 *
 * Reads live worker data from Firestore and builds context strings
 * that are injected into Alex's system prompt on every chat session.
 *
 * Sources:
 *   - alex/knowledge/workers/{worker_id} — per-worker records
 *   - platform/chatContext/{vertical} — pre-built vertical summaries
 *   - platform/pricingConfig — current pricing and promos
 *
 * Called by promptBuilder.js to augment the static prompt components.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Build the full Alex system prompt section for live worker knowledge.
 *
 * @param {object} opts
 * @param {string} [opts.vertical] — current page vertical (e.g. 'auto_dealer')
 * @param {string} [opts.uid] — current user ID
 * @returns {string} — prompt section text
 */
async function buildRegistryContext(opts = {}) {
  const { vertical } = opts;
  const db = getDb();

  // 1. Get all workers Alex knows about
  const knowledgeSnap = await db.collection("alex").doc("knowledge").collection("workers")
    .where("status", "==", "live")
    .get();

  const workers = knowledgeSnap.docs.map(d => d.data());

  // 2. Get vertical-specific context if on a vertical page
  let verticalContext = "";
  if (vertical) {
    const ctxSnap = await db.doc(`platform/chatContext/${vertical}`).get();
    if (ctxSnap.exists) {
      verticalContext = ctxSnap.data().worker_summary || "";
    }
  }

  // 3. Get current pricing config
  const pricingSnap = await db.doc("platform/pricingConfig").get();
  const pricing = pricingSnap.exists ? pricingSnap.data() : {};

  // 4. Build the prompt section
  const sections = [];

  // Worker catalog
  if (workers.length > 0) {
    sections.push(`CURRENT WORKER CATALOG (${workers.length} live workers):`);
    sections.push(workers.map(w =>
      `- ${w.name} (${w.vertical}, ${w.price_tier}/mo): ${w.short_description}`
    ).join("\n"));
  }

  // Vertical focus
  if (vertical && verticalContext) {
    sections.push(`\nCURRENT PAGE VERTICAL — ${vertical} workers:\n${verticalContext}`);
  }

  // Pricing
  sections.push(`
PRICING:
- Worker tiers: Free | $29/mo | $49/mo | $79/mo
- Volume discounts: 3+ workers = 10% off, 5-10 = 20% off, 10+ = 30% off
- Annual pricing: 2 months free (pay 10 get 12)
- Tech fee verticals: Auto ($250 or 2%), RE Sales ($500 or 1%), PM ($250 or 1%)
- Mortgage/lending: subscription only
- Alex (Chief of Staff): free with 3+ workers
${pricing.active_promos ? `Active promo codes: ${pricing.active_promos}` : ""}`);

  // Promotions
  sections.push(`
CURRENT PROMOTIONS:
- AUTOLAUNCH: 2 months free, auto dealer workers (expires Mar 23)
- TITLELAUNCH: 2 months free, title/escrow workers (expires Mar 23)
- PMLAUNCH: 2 months free, property management (expires Mar 23)
- PILOT3FREE: 3 months free, Pilot Pro (expires Apr 9)
- DEV100: Creator License free until July 1, 2026
- EARLYBIRD50: 50% off for 6 months
- DEMO30: 1 month free (post-demo)`);

  // Guarantees
  sections.push(`
GUARANTEES (lead with these):
- 14-day free trial, no credit card
- 60-day money back, no questions asked
- Cancel anytime, one click
- Pause option — stop billing, keep data
- Your data is always yours — Vault preserved forever`);

  // Programs
  sections.push(`
REFERRAL PROGRAM:
- Every paid customer gets a referral code
- 30% recurring commission on every referral's subscription
- Monthly payout via Stripe Connect for earnings over $100
- Under $100: credited to account

DEVELOPER PROGRAM:
- Build Digital Workers on TitleApp marketplace
- 75% revenue share on all subscriber revenue
- Creator License: $49/yr (free until July 1, 2026 with DEV100)
- $2 Identity Check always required
- Worker #1 governance pipeline: every worker passes intake, research, rules:save, prePublish, submit, admin review before going live

STUDENT PILOT PROGRAM:
- Free Pilot Pro while enrolled (annual re-verify, student ID upload)
- CFI/CFII at flight academies: free Pilot Pro+ while on staff`);

  // Critical rules
  sections.push(`
CRITICAL: Never make up worker names, prices, or features not in the catalog above. If asked about something not in your knowledge, say "that's coming soon" or "let me connect you with Sean" rather than inventing details.`);

  return sections.join("\n");
}

module.exports = { buildRegistryContext };
