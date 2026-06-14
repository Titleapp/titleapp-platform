// ----------------------------------------------------------------------------
// Daily X (Twitter) Marketing Worker
// ----------------------------------------------------------------------------
// Publishes ONE first-party SOCIII promo video per day to our own official X
// account (@SOCIIIai), rotating through the "OnlyFs for smart people" Digital
// Worker showcase clips. Organic posting only — no paid promotion (we
// Quick-Promote winners by hand). Posting is event-sourced into Firestore
// (collection `marketingPosts`) for Door-1 visibility and de-dupe.
//
// Auth: X OAuth 1.0a user-context (our own account). Keys come from Secret
// Manager when running in the cloud, or functions/.env locally:
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
//
// Kill switch: Firestore doc `config/marketingWorker` field `xDailyEnabled`
// (defaults ON; set to false to pause without redeploying).
// ----------------------------------------------------------------------------

const { TwitterApi } = require("twitter-api-v2");
const admin = require("firebase-admin");

const CREATIVE_BASE = "https://sociii.ai/launch-creative";

// The rotation. slug = file stem (of-<slug>-video-01.mp4); each is a Digital
// Worker showcase. Captions are first-party, owned by SOCIII.
const ROSTER = [
  { slug: "fred",         name: "Fred",        role: "International Tax",            caption: "Meet Fred. He handles cross-border tax so you don't lie awake over transfer pricing. Your newest Digital Worker — rule-governed, always on." },
  { slug: "brandon",      name: "Brandon",     role: "Tax & Accounting",            caption: "Brandon closes your books while you sleep. A Digital Worker that knows the rules, not just the prompts." },
  { slug: "madison",      name: "Madison",     role: "HIPAA Compliance",            caption: "Madison reads every workflow for HIPAA exposure before it ships. Compliance that never takes a day off." },
  { slug: "katie",        name: "Katie",       role: "Legal Compliance",            caption: "Katie flags the clause you'd have missed. A Digital Worker built on the laws of your field — not vibes." },
  { slug: "darnell",      name: "Darnell",     role: "Family Law",                  caption: "Darnell drafts, checks, and explains — in plain English. Family law, governed by real rules." },
  { slug: "manpreet",     name: "Manpreet",    role: "Tax Compliance",             caption: "Manpreet keeps you inside the lines, jurisdiction by jurisdiction. A Digital Worker you can actually trust with the rules." },
  { slug: "monty",        name: "Monty",       role: "Used Car F&I",               caption: "Monty runs F&I like a 20-year desk manager — every deal compliant, every number checked. Meet your Digital Worker." },
  { slug: "captain-lisa", name: "Captain Lisa",role: "Boeing 777 Co-Pilot",        caption: "Captain Lisa knows the checklist cold. When the work is too important to wing it, you want a rule-governed Digital Worker in the seat." },
  { slug: "brad",         name: "Brad",        role: "Biotech Gene Mapping",        caption: "Brad maps the genome and shows his work. Expertise that scales — a Digital Worker, not a chatbot." },
  { slug: "katarzyna",    name: "Katarzyna",   role: "EU Digital Product Passport", caption: "Katarzyna keeps your products EU-compliant — Digital Product Passport, end to end. Your newest Digital Worker." },
  { slug: "maria",        name: "Maria",       role: "ER Nursing",                  caption: "Maria triages the paperwork so clinicians can be clinicians. A Digital Worker built on the standards of care." },
  { slug: "julia",        name: "Julia",       role: "Performance Reviews",         caption: "Julia writes the review that's fair, specific, and on time. Management work, done by a rule-governed Digital Worker." },
  { slug: "michael",      name: "Michael",     role: "Personal Finance",            caption: "Michael watches your money with a fiduciary's discipline. A Digital Worker that follows the rules of advice, not the hype." },
  { slug: "dietrich",     name: "Dietrich",    role: "Estate Planning",             caption: "Dietrich gets the estate plan right the first time. Decades of practice, packaged as a Digital Worker." },
  { slug: "clint",        name: "Clint",       role: "IT Admin",                    caption: "Clint runs the helpdesk that never sleeps and never loses a ticket. Meet your IT Digital Worker." },
  { slug: "randy",        name: "Randy",       role: "Aviation Maintenance",        caption: "Randy signs off the logbook by the book — every AD, every cycle. Aviation MX as a rule-governed Digital Worker." },
];

const TAGLINE = "\n\nBuild your own at sociii.ai 🌺\n#DigitalWorkers #SOCIII";

// Deterministic rotation by day-of-year so we cover the whole roster before
// repeating. (UTC day, so cloud + local agree.)
function pickForToday(now) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86400000);
  const idx = dayOfYear % ROSTER.length;
  return { ...ROSTER[idx], idx, dayOfYear };
}

function xClientFromEnv() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    throw new Error("Missing X OAuth 1.0a credentials (X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET)");
  }
  return new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  });
}

// Post one video for the given pick. Returns { tweetId, url }.
async function postVideo(client, pick) {
  const videoUrl = `${CREATIVE_BASE}/of-${pick.slug}-video-01.mp4`;
  const resp = await fetch(videoUrl);
  if (!resp.ok) throw new Error(`Fetch video failed (${resp.status}) for ${videoUrl}`);
  const buffer = Buffer.from(await resp.arrayBuffer());

  // Chunked upload + STATUS polling handled by the lib for video/mp4.
  const mediaId = await client.v1.uploadMedia(buffer, { mimeType: "video/mp4", target: "tweet" });

  const text = `${pick.caption}${TAGLINE}`;
  const tweet = await client.v2.tweet({ text, media: { media_ids: [mediaId] } });
  const tweetId = tweet?.data?.id;
  return { tweetId, url: tweetId ? `https://x.com/SOCIIIai/status/${tweetId}` : null, text };
}

// Main entry — called by the scheduler. `opts.force` ignores the kill switch
// and same-day de-dupe (for manual/test runs).
async function runDailyXPost(opts = {}) {
  const db = admin.firestore();

  // Kill switch.
  if (!opts.force) {
    const cfgSnap = await db.doc("config/marketingWorker").get();
    if (cfgSnap.exists && cfgSnap.data().xDailyEnabled === false) {
      console.log("[dailyXPost] paused via config/marketingWorker.xDailyEnabled=false");
      return { skipped: "paused" };
    }
  }

  const now = new Date();
  const pick = pickForToday(now);
  const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

  // De-dupe: one post per UTC day (deterministic doc id).
  const postRef = db.collection("marketingPosts").doc(`x-${dayKey}`);
  if (!opts.force) {
    const existing = await postRef.get();
    if (existing.exists && existing.data().status === "posted") {
      console.log(`[dailyXPost] already posted for ${dayKey}: ${existing.data().url}`);
      return { skipped: "already-posted", url: existing.data().url };
    }
  }

  const client = xClientFromEnv();
  try {
    const result = await postVideo(client, pick);
    await postRef.set({
      channel: "x",
      status: "posted",
      dayKey,
      slug: pick.slug,
      workerName: pick.name,
      role: pick.role,
      tweetId: result.tweetId || null,
      url: result.url || null,
      text: result.text,
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[dailyXPost] posted ${pick.slug} (${pick.role}): ${result.url}`);
    return { posted: true, ...result, slug: pick.slug };
  } catch (err) {
    await postRef.set({
      channel: "x",
      status: "error",
      dayKey,
      slug: pick.slug,
      error: String(err && err.message ? err.message : err),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.error(`[dailyXPost] FAILED for ${pick.slug}:`, err);
    throw err;
  }
}

module.exports = { runDailyXPost, pickForToday, ROSTER };
