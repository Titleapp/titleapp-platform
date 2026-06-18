"use strict";

// SOCIII marketing content registry — text + visual-style posts.
//
// Pairs with assetRegistry.js (which holds character video creative).
// This file holds text-driven posts: manifestos, dogfood-thesis posts,
// the kind of content that doesn't need a Kling clip behind it.
//
// Source of truth for the dogfood series:
//   docs/marketing/SOCIII-Dogfood-Posts-2026-06-01.md
//
// Status values match assetRegistry:
//   "draft" → "scheduled" → "posted"
//
// VisualStyle values:
//   "personal-post" — text only, posted from Sean's personal account
//   "black-card"    — black background + white text + SOCIII mark (render via blackCardRenderer when built)

const DOGFOOD_POSTS = [
  // ── Week-2 launch trio (manifesto thesis) ────────────────────────
  {
    contentId: "dogfood-x-001",
    campaign: "dogfood",
    platform: "x",
    type: "manifesto",
    visualStyle: "personal-post",
    persona: "sean-personal",
    title: "Dogfood thesis — X launch",
    text:
      "We build SOCIII on SOCIII.\n\n" +
      "Every worker you see in the marketplace — accounting, HR, marketing, IR — we run our own company on it.\n\n" +
      "I'm a medevac pilot. I build this between flights. With the workers.\n\n" +
      "Anything less is a lie.\n\n" +
      "sociii.ai #dogfood",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "dogfood-linkedin-001",
    campaign: "dogfood",
    platform: "linkedin",
    type: "manifesto",
    visualStyle: "personal-post",
    persona: "sean-personal",
    title: "Dogfood thesis — LinkedIn priority post",
    text:
      "Every AI platform says they believe in their product.\n\n" +
      "We run our company on ours. Accounting worker does our books. HR worker manages our roster. Marketing worker is scheduling the posts you're seeing this week. IR worker is running our seed raise.\n\n" +
      "I built this between medevac shifts on $35K in five months.\n\n" +
      "That's not a pitch. That's just what happened.\n\n" +
      "sociii.ai #dogfood",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "dogfood-tiktok-001",
    campaign: "dogfood",
    platform: "tiktok",
    type: "manifesto",
    visualStyle: "black-card",
    persona: "company",
    title: "Dogfood thesis — TikTok black card",
    text:
      "We built SOCIII on SOCIII.\n" +
      "Anything less is a lie.\n" +
      "sociii.ai/creator\n" +
      "#dogfood",
    renderNotes: "Black background. White text. SOCIII mark. 5-sec static. No character. No music until upload.",
    status: "draft",
    scheduledAt: null,
  },

  // ── Follow-on weekly posts (rotating worker) ──────────────────────
  {
    contentId: "dogfood-accounting-001",
    campaign: "dogfood",
    platform: "multi",  // X + LinkedIn + TikTok black card
    type: "follow-on",
    visualStyle: "black-card",
    persona: "sean-personal",
    title: "Dogfood — Accounting worker",
    text:
      "Our accounting worker does our books.\n" +
      "Built by an actual 20-year CPA.\n" +
      "Running on SOCIII.\n" +
      "$29/month if you want one for yours.\n" +
      "sociii.ai #dogfood",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "dogfood-ir-001",
    campaign: "dogfood",
    platform: "multi",
    type: "follow-on",
    visualStyle: "black-card",
    persona: "sean-personal",
    title: "Dogfood — IR worker",
    text:
      "Our IR worker is running our seed raise.\n" +
      "Built by an actual corporate-finance veteran.\n" +
      "Running on SOCIII.\n" +
      "Every investor touchpoint. Every data room request. Every follow-up.\n" +
      "sociii.ai #dogfood",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "dogfood-marketing-001",
    campaign: "dogfood",
    platform: "multi",
    type: "follow-on",
    visualStyle: "black-card",
    persona: "sean-personal",
    title: "Dogfood — Marketing worker",
    text:
      "The marketing worker scheduled this post.\n" +
      "We told it what we wanted. It wrote the copy, queued the content, tracked the engagement.\n" +
      "That's the product. That's real.\n" +
      "sociii.ai #dogfood",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "dogfood-hr-001",
    campaign: "dogfood",
    platform: "multi",
    type: "follow-on",
    visualStyle: "black-card",
    persona: "sean-personal",
    title: "Dogfood — HR worker",
    text:
      "The HR worker manages our roster.\n" +
      "Humans, contractors, digital workers — all in one place.\n" +
      "Built on SOCIII. Run on SOCIII.\n" +
      "sociii.ai #dogfood",
    status: "draft",
    scheduledAt: null,
  },

  // ── Launch manifesto trio (2026-06-01) ─────────────────────────────
  // Source doc: docs/marketing/SOCIII-Launch-Manifestos-2026-06-01.md
  // Black-card video form here; LinkedIn long-form + X expansion in source doc.
  {
    contentId: "launch-manifesto-001-category",
    campaign: "launch-manifesto",
    platform: "multi",  // YouTube Shorts + TikTok + IG Reels (video) + LinkedIn + X (text+video)
    type: "manifesto",
    visualStyle: "black-card",
    persona: "company",
    title: "Launch manifesto #1 — The category claim",
    text:
      "For a hundred years\n" +
      "expertise lived in\n" +
      "billable hours.\n\n" +
      "Now it lives in\n" +
      "digital workers.\n\n" +
      "SOCIII.",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static. No music; let platform auto-suggest.",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "launch-manifesto-002-expertise",
    campaign: "launch-manifesto",
    platform: "multi",
    type: "manifesto",
    visualStyle: "black-card",
    persona: "company",
    title: "Launch manifesto #2 — The expert thesis",
    text:
      "The model is the same.\n" +
      "The expertise isn't.\n\n" +
      "SOCIII workers\n" +
      "are built by the people\n" +
      "who actually do the work.",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft",
    scheduledAt: null,
  },
  {
    contentId: "launch-manifesto-003-sovereignty",
    campaign: "launch-manifesto",
    platform: "multi",
    type: "manifesto",
    visualStyle: "black-card",
    persona: "company",
    title: "Launch manifesto #3 — The sovereignty claim",
    text:
      "The worker works for you.\n\n" +
      "Not the platform.\n" +
      "Not the model.\n\n" +
      "You.\n\n" +
      "SOCIII.",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft",
    scheduledAt: null,
  },

  // ── S52.45 manifesto card batch (A–E) + 265 post ──────────────────
  {
    contentId: "dogfood-tiktok-002",
    campaign: "dogfood", platform: "tiktok", type: "manifesto", visualStyle: "black-card", persona: "company",
    title: "Card A — coders guess, experts build",
    text: "Coders guess.\nExperts build.\nsociii.ai",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft", scheduledAt: null,
  },
  {
    contentId: "dogfood-tiktok-003",
    campaign: "dogfood", platform: "tiktok", type: "manifesto", visualStyle: "black-card", persona: "company",
    title: "Card B — leaves a receipt",
    text: "Every AI says trust us.\nOurs leaves a receipt.\nsociii.ai",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft", scheduledAt: null,
  },
  {
    contentId: "dogfood-tiktok-004",
    campaign: "dogfood", platform: "tiktok", type: "manifesto", visualStyle: "black-card", persona: "company",
    title: "Card C — admits what it can't do",
    text: "An AI that admits\nwhat it can't do yet.\nsociii.ai",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft", scheduledAt: null,
  },
  {
    contentId: "dogfood-tiktok-005",
    campaign: "dogfood", platform: "tiktok", type: "manifesto", visualStyle: "black-card", persona: "company",
    title: "Card D — built SOCIII on SOCIII",
    text: "We built SOCIII on SOCIII.\nAnything less is a lie.\nsociii.ai",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft", scheduledAt: null,
  },
  {
    contentId: "dogfood-tiktok-006",
    campaign: "dogfood", platform: "tiktok", type: "manifesto", visualStyle: "black-card", persona: "company",
    title: "Card E — free forever for helpers",
    text: "265 workers.\nStill in development.\nFree for now.\nFree forever if you help us perfect them.\nsociii.ai",
    renderNotes: "Black background. White text. SOCIII mark bottom-center. 5-sec static.",
    status: "draft", scheduledAt: null,
  },
  {
    contentId: "dogfood-x-002",
    campaign: "dogfood", platform: "x", type: "manifesto", visualStyle: "personal-post", persona: "sean-personal",
    title: "265 workers — free forever for helpers",
    text: "265 workers, all in development. Free for now — and free forever for anyone who helps us perfect them. They'll even tell you when they're glitchy.\n\nsociii.ai #dogfood",
    status: "draft", scheduledAt: null,
  },
];

const CAMPAIGN_META = {
  dogfood: {
    label: "Dogfood thesis",
    sourceDoc: "docs/marketing/SOCIII-Dogfood-Posts-2026-06-01.md",
    weekTarget: "Week 2 — after OF for Smart People establishes the account",
    priorityPlatform: "linkedin",
    hashtag: "#dogfood",
    thesis: "We build a real company that ships real products for real people. With our own workers. Anything less is a lie.",
    rules: [
      "Sean posts personally — not the company account.",
      "Organic only. No paid behind this series.",
      "LinkedIn is priority. X same day. TikTok as palette cleanser between character videos.",
    ],
  },
  "launch-manifesto": {
    label: "Launch manifesto trio",
    sourceDoc: "docs/marketing/SOCIII-Launch-Manifestos-2026-06-01.md",
    weekTarget: "Week 1 — the thesis stack that opens the SOCIII channel base before OF drips begin",
    priorityPlatform: "all",
    hashtag: null,
    thesis: "SOCIII is the digital worker platform. Real experts build the workers. You hold the keys.",
    rules: [
      "Posts from the COMPANY account, not Sean personally (this is the platform's voice).",
      "All 3 to YouTube + X on day 1; LinkedIn staggered Sun-Mon-Tue AM (algorithm penalizes same-day clusters from new presences).",
      "Pin all 3 at top of YouTube channel as the thesis stack.",
      "Black-card video form for YouTube Shorts / TikTok / IG Reels; long-form text for LinkedIn; mid-form text for X.",
      "Don't lead the OF character drips until the manifesto stack is up — algorithm + viewer both need to calibrate from thesis first.",
    ],
  },
};

function listContent(filter = {}) {
  return DOGFOOD_POSTS.filter(p => {
    if (filter.campaign && p.campaign !== filter.campaign) return false;
    if (filter.platform && p.platform !== filter.platform) return false;
    if (filter.status && p.status !== filter.status) return false;
    if (filter.type && p.type !== filter.type) return false;
    return true;
  });
}

function getContentById(contentId) {
  return DOGFOOD_POSTS.find(p => p.contentId === contentId) || null;
}

function listCampaigns() {
  return Object.keys(CAMPAIGN_META);
}

function contentCounts() {
  return {
    total: DOGFOOD_POSTS.length,
    byCampaign: DOGFOOD_POSTS.reduce((acc, p) => { acc[p.campaign] = (acc[p.campaign] || 0) + 1; return acc; }, {}),
    byPlatform: DOGFOOD_POSTS.reduce((acc, p) => { acc[p.platform] = (acc[p.platform] || 0) + 1; return acc; }, {}),
    byStatus: DOGFOOD_POSTS.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}),
  };
}

module.exports = {
  DOGFOOD_POSTS,
  CAMPAIGN_META,
  listContent,
  getContentById,
  listCampaigns,
  contentCounts,
};
