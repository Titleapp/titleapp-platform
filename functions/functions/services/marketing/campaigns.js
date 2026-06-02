"use strict";

// Marketing worker — campaign orchestration service.
//
// Given a creator's asset library + campaign routing table, produces a
// posting calendar with platform-specific copy (TikTok, X, LinkedIn).
//
// S52.8 — first real capability for the platform-marketing-content worker.
// Pending task #186 ("Marketing worker actually working") starts here.
//
// Inputs:
//   - assetRegistry: from ./assetRegistry.js
//   - campaignRoutes: matching codes from apps/business/src/lib/campaignRouting.js
//   - cadence: { startDate, days, postsPerDay, platforms }
//
// Output:
//   - Posting calendar (array of {day, platform, assetId, caption, hashtags, landingUrl})

const registry = require("./assetRegistry");

// Brand voice — pulled from the SOCIII Brand Voice Locker (task #132).
// Mirrors the irreverent / "tell the truth" tone of the campaign creative.
const BRAND_VOICE = {
  tone: "irreverent, smart, slightly sardonic. The joke is the value prop.",
  forbidden: [
    "AI-powered", "leverage", "synergy", "ecosystem", "revolutionary",
    "game-changing", "unleash", "unlock potential",
  ],
  signature: "sociii.ai",
  cta: "Start free.",
};

// Platform-specific caption budgets + hashtag conventions.
const PLATFORMS = {
  tiktok: {
    captionMax: 280,
    hashtagsMax: 8,
    style: "punchy, hook in first line, hashtags as call-stack at end",
    landingPathTemplate: "/start/<campaign>",
  },
  x: {
    captionMax: 280,
    hashtagsMax: 3,
    style: "single sharp line, no hashtag soup, URL gets the click",
    landingPathTemplate: "/start/<campaign>",
  },
  linkedin: {
    captionMax: 1200,
    hashtagsMax: 5,
    style: "professional but with edge, 2-3 short paragraphs, URL at end",
    landingPathTemplate: "/start/<campaign>?utm_source=linkedin",
  },
  instagram: {
    captionMax: 2200,
    hashtagsMax: 12,
    style: "story-shaped, hashtags as final block, link in bio reference",
    landingPathTemplate: "/start/<campaign>",
  },
};

/**
 * Build a posting calendar from the current asset registry.
 *
 * @param {object} opts
 * @param {string} [opts.startDate]   ISO date — first post day. Default: tomorrow.
 * @param {number} [opts.days]        Number of days to schedule. Default: 7.
 * @param {number} [opts.postsPerDay] Posts per day per platform. Default: 1.
 * @param {string[]} [opts.platforms] Which platforms. Default: ["tiktok", "x"].
 * @param {string[]} [opts.campaigns] Filter to specific campaigns. Default: all staged.
 * @returns {object} { calendar, gaps, summary }
 */
function buildPostingCalendar(opts = {}) {
  const {
    startDate = null,
    days = 7,
    postsPerDay = 1,
    platforms = ["tiktok", "x"],
    campaigns = null,
  } = opts;

  // Pull staged assets — anything in "needs_reclip" gets excluded.
  let pool = registry.listAssets({ status: "staged" });
  if (campaigns && campaigns.length > 0) {
    pool = pool.filter(a => campaigns.includes(a.campaign));
  }

  // Sort assets into a rotation: alternate campaigns + asset types so the
  // feed doesn't post 5 Fred videos in a row.
  const rotation = _interleaveByCampaign(pool);

  const calendar = [];
  const gaps = [];

  // Build the day-by-day schedule.
  const _startMs = _parseStartDate(startDate);
  let assetIdx = 0;

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const dayDate = new Date(_startMs + dayOffset * 24 * 60 * 60 * 1000);
    const dayISO = dayDate.toISOString().slice(0, 10);

    for (const platform of platforms) {
      for (let i = 0; i < postsPerDay; i++) {
        if (assetIdx >= rotation.length) {
          gaps.push({ day: dayISO, platform, reason: "asset_pool_exhausted" });
          continue;
        }
        const asset = rotation[assetIdx++];
        const pf = PLATFORMS[platform];
        if (!pf) {
          gaps.push({ day: dayISO, platform, reason: `unknown_platform:${platform}` });
          continue;
        }
        calendar.push({
          day: dayISO,
          platform,
          assetId: asset.assetId,
          assetType: asset.type,
          character: asset.character,
          campaign: asset.campaign,
          caption: _draftCaption(asset, platform, pf),
          hashtags: _hashtagsFor(asset, platform, pf),
          landingUrl: `https://sociii.ai${pf.landingPathTemplate.replace("<campaign>", asset.campaign)}`,
          assetDescription: asset.description,
        });
      }
    }
  }

  // Summary stats for the founder.
  const counts = registry.assetCounts();
  return {
    calendar,
    gaps,
    summary: {
      totalPosts: calendar.length,
      windowDays: days,
      platforms,
      assetsUsed: new Set(calendar.map(c => c.assetId)).size,
      assetsAvailable: pool.length,
      assetsNeedingReclip: counts.needsReclip,
      gapCount: gaps.length,
    },
  };
}

// ── helpers ─────────────────────────────────────────────────────

function _parseStartDate(iso) {
  // Tomorrow at noon UTC by default. Defensive default since we don't trust Date.now in test envs.
  if (iso) return new Date(iso).getTime();
  const todayUtc = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00Z");
  return todayUtc.getTime() + 24 * 60 * 60 * 1000;
}

function _interleaveByCampaign(assets) {
  // Group by campaign, then round-robin pop one from each so consecutive posts
  // are from different campaigns. Mixes the feed naturally.
  const byCamp = {};
  for (const a of assets) {
    (byCamp[a.campaign] = byCamp[a.campaign] || []).push(a);
  }
  const out = [];
  let pulled = true;
  while (pulled) {
    pulled = false;
    for (const camp of Object.keys(byCamp)) {
      if (byCamp[camp].length > 0) {
        out.push(byCamp[camp].shift());
        pulled = true;
      }
    }
  }
  return out;
}

function _draftCaption(asset, platform, pf) {
  // Per-campaign caption skeleton. Real platform copy varies by character
  // and asset type; this v1 ships the hook + CTA. Marketing worker v2 will
  // pull from a per-character voice register and add A/B variants.
  const character = asset.character || "this one";
  const campaign = asset.campaign || "";

  if (campaign.startsWith("of-")) {
    // OF for Smart People — captions are strictly: Name — Subject — $29/mo.
    // The visual carries the "OF for Smart People" headline; the caption just
    // identifies the worker. Anything more dilutes the joke (Sean, 2026-06-01).
    const subjects = {
      "of-fred":    "International Tax",
      "of-nancy":   "HR",
      "of-brandon": "Tax Code",
      "of-madison": "HIPAA Compliance",
      "of-katie":   "Legal Compliance",
      "of-darnell": "Family Law",
      "of-manpreet":"Tax Compliance",
      "of-monty":   "Used Car F&I",
      "of-captain-lisa": "Boeing 777 CoPilot",
      "of-brad":    "Biotech Gene Mapping",
      "of-katarzyna": "EU Digital Passport Compliance",
      "of-maria":    "ER Nursing",
      "of-julia":    "Performance Reviews",
      "of-michael":  "Personal Finance",
      "of-dietrich": "Estate Planning",
      "of-clint":    "IT Admin",
      "of-randy":    "Aviation MX",
    };
    const subject = subjects[campaign] || "Worker";
    return `${character} — ${subject} — $29/mo`;
  }

  // Hate Boss + Workers Unite — the visual already carries the headline and
  // CTA. Caption is silent except for the signature URL. Less is more — let
  // the uncomfortable visual do the lifting (Sean, 2026-06-01).
  if (campaign.startsWith("hate-boss-") || campaign === "workers-unite") {
    return BRAND_VOICE.signature;
  }

  return BRAND_VOICE.signature;
}

function _pickByPlatform(arr, platform, pf) {
  // Trim platform variants by pf.captionMax. v2: A/B variants per platform.
  for (const candidate of arr) {
    if (candidate.length <= pf.captionMax) return candidate;
  }
  return arr[0].slice(0, pf.captionMax - 3) + "...";
}

function _hashtagsFor(asset, platform, pf) {
  const baseByCampaign = {
    "of-fred":           ["#InternationalTax", "#CrossBorderTax", "#TransferPricing"],
    "of-nancy":          ["#HR", "#WorkLife", "#PeopleOps"],
    "of-brandon":        ["#Tax", "#TaxSeason", "#TaxTok"],
    "of-madison":        ["#HIPAA", "#Healthcare", "#PrivacyCompliance"],
    "of-katie":          ["#LegalCompliance", "#ContractsLaw", "#Employment"],
    "of-darnell":        ["#FamilyLaw", "#Custody", "#Divorce"],
    "of-manpreet":       ["#TaxCompliance", "#IRS", "#Audit"],
    "of-monty":          ["#UsedCars", "#FandI", "#Dealership"],
    "of-captain-lisa":   ["#Aviation", "#Boeing777", "#Pilots"],
    "of-brad":           ["#Biotech", "#Genomics", "#Bioinformatics"],
    "of-katarzyna":      ["#ESPR", "#DigitalProductPassport", "#EUCompliance"],
    "of-maria":          ["#ERNursing", "#NurseLife", "#PatientCare"],
    "of-julia":          ["#PerformanceReviews", "#PeopleOps", "#ManagerLife"],
    "of-michael":        ["#PersonalFinance", "#Investing", "#FIRE"],
    "of-dietrich":       ["#EstatePlanning", "#RetirementPlanning", "#WealthTransfer"],
    "of-clint":          ["#ITAdmin", "#SysAdmin", "#SMBTech"],
    "of-randy":          ["#AviationMX", "#AircraftMaintenance", "#APMechanic"],
    "hate-boss-dealer":  ["#AutoSales", "#CarSales", "#Dealership"],
    "hate-boss-synergy": ["#Corporate", "#WorkTwitter"],
    "hate-boss-vc":      ["#Startups", "#VC", "#FoundersJourney"],
    "hate-boss-tech":    ["#PM", "#ProductManagement", "#TechTwitter"],
    "workers-unite":     ["#BuildInPublic", "#SmallBusiness", "#SoloPreneur"],
  };
  const base = baseByCampaign[asset.campaign] || [];
  const universal = ["#SOCIII", "#DigitalWorkers"];
  const combined = [...base, ...universal].slice(0, pf.hashtagsMax);
  return combined;
}

module.exports = {
  buildPostingCalendar,
  BRAND_VOICE,
  PLATFORMS,
};
