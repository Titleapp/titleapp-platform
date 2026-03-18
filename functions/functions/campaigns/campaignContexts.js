"use strict";

/**
 * campaignContexts.js — Campaign context definitions for targeted landing pages.
 * GET /v1/campaign/:slug returns vertical-specific context for sandbox pre-load.
 */

const CAMPAIGN_CONTEXTS = {
  "auto-dealer": {
    slug: "auto-dealer",
    vertical: "auto_dealer",
    persona: "dealer",
    sandboxContext: {
      openingMessage: "Hey — I'm Alex. TitleApp's Auto Dealer suite starts in your service drive and follows the customer all the way through F&I. And it's free for dealers. Want to see how it works?",
      suggestedWorkers: ["AD-017", "AD-013", "AD-001", "AD-009"],
      ctaLabel: "Start for Free",
    },
  },
  "aviation": {
    slug: "aviation",
    vertical: "aviation",
    persona: "pilot",
    sandboxContext: {
      openingMessage: "Hey — I'm Alex. Think of me as your personal aviation CoPilot. Your logbook, your training records, your regs — all in one place, on blockchain, forever. What aircraft are you flying?",
      suggestedWorkers: ["AV-P01", "AV-011", "AV-014", "AV-P03"],
      ctaLabel: "Start for Free",
    },
  },
  "real-estate": {
    slug: "real-estate",
    vertical: "real_estate_development",
    persona: "developer",
    sandboxContext: {
      openingMessage: "Hey — I'm Alex. For real estate developers and property managers, TitleApp puts an entire A-team on your project — permitting, construction management, property ops, title and escrow. For less than a few lattes a day. Want to walk through a deal?",
      suggestedWorkers: ["W-021", "W-012", "W-033", "W-002", "W-044"],
      ctaLabel: "Start for Free",
    },
  },
  "creators": {
    slug: "creators",
    vertical: null,
    persona: "creator",
    sandboxContext: {
      openingMessage: "Hey — I'm Alex. You've built an audience because you know your field better than anyone. Now your followers can hire you. Forever. Tell me what you do and I'll show you how to build your first Digital Worker in under 10 minutes.",
      suggestedWorkers: [],
      ctaLabel: "Start for Free",
    },
  },
};

function getCampaignContext(req, res) {
  const route = req._route || req.path || "";
  const slug = route.replace(/^\/campaign\//, "").replace(/^\//, "");

  const campaign = CAMPAIGN_CONTEXTS[slug];
  if (!campaign) {
    return res.status(404).json({ ok: false, error: "Campaign not found", code: "NOT_FOUND" });
  }

  // Passthrough UTM params from query string
  const q = req.query || {};
  const result = {
    ...campaign,
    utmSource: q.utm_source || "",
    utmMedium: q.utm_medium || "",
    utmCampaign: q.utm_campaign || "",
    utmContent: q.utm_content || "",
  };

  return res.json({ ok: true, campaign: result });
}

module.exports = { getCampaignContext, CAMPAIGN_CONTEXTS };
