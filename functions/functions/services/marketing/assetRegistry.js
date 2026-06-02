"use strict";

// SOCIII launch campaign asset registry — S52.8.
//
// Source of truth for which assets exist, what they are, and how they map to
// campaigns. Used by campaigns.js to draft posting calendars.
//
// Lifecycle:
//   - Creator authors metadata here (this file)
//   - Sean uploads binaries to SOCIII Drive (Marketing worker folder)
//   - Marketing worker reads binaries via storage path on calendar generation
//   - Posts get drafted with platform-specific copy + scheduled
//
// Status values:
//   - "draft"   : metadata authored, binary not yet in Drive
//   - "staged"  : binary in Drive, ready for calendar
//   - "needs_reclip" : has known issue (typo, branding); regenerate before post
//   - "approved" : reviewed by Sean, ready to post
//   - "posted"  : actually posted (with timestamp + platform)

const LAUNCH_ASSETS = [
  // ── OF for Smart People — stills (6 known, headlines have typos) ──
  {
    assetId: "of-fred-still-01",
    type: "still",
    character: "Fred",
    campaign: "of-fred",
    description: "Fred bathroom mirror selfie, underwear, bald middle-aged. Headline 'How I make $5K/month in my spare time.' Tag 'Fred — Accounting — $29/mo'.",
    drivePath: null, // TODO: Sean uploads to /My Drive/Marketing/launch/of-fred-still-01.jpg
    status: "needs_reclip",
    issue: "Headline OK. Branding inconsistent — needs SOCIII.ai treatment.",
  },
  {
    assetId: "of-fred-still-02",
    type: "still",
    character: "Fred",
    campaign: "of-fred",
    description: "Fred variant with glasses, different bathroom. '$5K/month' highlighted yellow.",
    drivePath: null,
    status: "needs_reclip",
    issue: "Yellow $5K highlight inconsistent with rest of campaign. Decide single visual treatment.",
  },
  {
    assetId: "of-nancy-still-01",
    type: "still",
    character: "Nancy",
    campaign: "of-nancy",
    description: "Nancy office bathroom selfie, floral shirt, ID badge. 'Why my coworkers can't believe I make $4K extra a month.'",
    drivePath: null,
    status: "needs_reclip",
    issue: "Headline typo: 'OnlyFans for Smart Plope'. Reclip with correct 'People'.",
  },
  {
    assetId: "of-nancy-still-02",
    type: "still",
    character: "Nancy",
    campaign: "of-nancy",
    description: "Nancy variant, same bathroom, different framing. Headline corrected to 'OnlyFans for Smart People.'",
    drivePath: null,
    status: "staged", // best of the Nancy pair
    issue: null,
  },
  {
    assetId: "of-brandon-still-01",
    type: "still",
    character: "Brandon",
    campaign: "of-brandon",
    description: "Brandon young nerdy guy in messy bedroom, button-up shirt. 'How I make $6K/month from my bedroom!' Tag 'Brandon — Tax Code — $29/mo'.",
    drivePath: null,
    status: "needs_reclip",
    issue: "Headline typo: 'OnlyFans for Smart Plople'. Reclip with correct 'People'.",
  },
  {
    assetId: "of-madison-still-01",
    type: "still",
    character: "Madison",
    campaign: "of-madison",
    description: "Madison young woman, 'I♥SPREADSHEETS' t-shirt, peace sign. 'How I make $5K/month from my dorm.' NOTE: subject re-scoped from generic Compliance to HIPAA Compliance 2026-06-01; spreadsheets visual still fits.",
    drivePath: null,
    status: "needs_reclip",
    issue: "Headline typo 'OnlyFans for Smart Plone' + subject now HIPAA Compliance — needs both fixed on reclip.",
  },
  {
    assetId: "of-madison-video-01",
    type: "video",
    character: "Madison",
    campaign: "of-madison",
    description: "Kling-generated 2026-06-02 — Madison (chubby ear visual) introduces 'OnlyFans for Smart People — HIPAA Compliance — $29/mo'. First Madison video; closes the launch-coverage gap.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Chubby_ear_1605_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },

  // ── OF for Smart People — videos (7 Kling-generated, in Sean's Downloads) ──
  // Filename hints decoded — Sean to confirm campaign mapping.
  {
    assetId: "of-maria-video-01",
    type: "video",
    character: "Maria",
    campaign: "of-maria",
    description: "Kling-generated 2026-05-26 — Maria the nurse (mask down, ID badge, locker-room mirror). Confirmed by Sean 2026-06-01 — previously misidentified as Fred. New nursing vertical.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_middle_age_3134_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-manpreet-video-01",
    type: "video",
    character: "Manpreet",
    campaign: "of-manpreet",
    description: "Kling-generated 2026-05-26 — Super nerd character. Confirmed by Sean 2026-06-01 as Manpreet / Tax Compliance.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_super_nerd_3114_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-fred-video-01",
    type: "video",
    character: "Fred",
    campaign: "of-fred",
    description: "Kling-generated 2026-05-26 — Bald middle-aged Fred (Accounting). Renamed to character-slug convention 2026-06-01.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_bald_middl_2907_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-clint-video-01",
    type: "video",
    character: "Clint",
    campaign: "of-clint",
    description: "Kling-generated 2026-05-26 — Balding office guy in shirt + tie taking bathroom selfie. Confirmed by Sean 2026-06-01 as Clint / IT Admin. (Was previously misidentified as Nancy.)",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_awkward_ov_2838_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-brandon-video-01",
    type: "video",
    character: "Brandon",
    campaign: "of-brandon",
    description: "Kling-generated 2026-05-26 — Brandon (Tax Code). Renamed to character-slug convention 2026-06-01.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_fat_nerdy__2869_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-randy-video-01",
    type: "video",
    character: "Randy",
    campaign: "of-randy",
    description: "Kling-generated 2026-05-26 — Bearded man in tank top with jet engine backdrop. Confirmed by Sean 2026-06-01 as Randy / Aviation MX (mechanic). (Was previously misidentified as Captain Lisa.)",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_rugged_air_3142_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-monty-video-01",
    type: "video",
    character: "Monty",
    campaign: "of-monty",
    description: "Kling-generated 2026-05-26 — Young character. Confirmed by Sean 2026-06-01 as Monty / Used Car F&I.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_young_jama_2912_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-julia-video-01",
    type: "video",
    character: "Julia",
    campaign: "of-julia",
    description: "Kling-generated. Woman in pole-dance studio. Confirmed by Sean 2026-06-01 — previously misidentified as Fred. New fitness vertical.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260526_作品_really_obe_2931_0 (1).mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-michael-video-01",
    type: "video",
    character: "Michael",
    campaign: "of-michael",
    description: "Kling-generated 2026-06-02 — Asian man in bathroom, glasses. Confirmed by Sean 2026-06-01 as Michael / Personal Finance.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Middle_age_1389_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-dietrich-video-01",
    type: "video",
    character: "Dietrich",
    campaign: "of-dietrich",
    description: "Kling-generated 2026-06-02 — Elderly man on beach in red speedo. Confirmed by Sean 2026-06-01 as Dietrich / Estate Planning.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Middle_age_1388_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-katie-video-01",
    type: "video",
    character: "Katie",
    campaign: "of-katie",
    description: "Kling-generated 2026-06-02 — Katie introduces 'OnlyFans for Smart People — Legal Compliance — $29/mo'. New character announced by Sean 2026-06-01.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Middle_age_1431_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: "First Katie video — confirm framing matches Legal Compliance angle.",
  },
  {
    assetId: "of-darnell-video-01",
    type: "video",
    character: "Darnell",
    campaign: "of-darnell",
    description: "Kling-generated 2026-06-02 — Darnell introduces 'OnlyFans for Smart People — Family Law — $29/mo'. New character announced by Sean 2026-06-01.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Middle_age_1469_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: "First Darnell video — confirm framing matches Family Law angle.",
  },
  {
    assetId: "of-captain-lisa-video-01",
    type: "video",
    character: "Captain Lisa",
    campaign: "of-captain-lisa",
    description: "Kling-generated 2026-06-02 — Captain Lisa introduces 'OnlyFans for Smart People — Boeing 777 CoPilot — $29/mo'. Closes the aviation-pilot orphan from QA-001.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Middle_age_1549_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-brad-video-01",
    type: "video",
    character: "Brad",
    campaign: "of-brad",
    description: "Kling-generated 2026-06-02 — Brad (skinny ear visual) introduces 'OnlyFans for Smart People — Biotech Gene Mapping — $29/mo'. New vertical (biotech) announced by Sean 2026-06-01.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Skinny_ear_1572_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "of-katarzyna-video-01",
    type: "video",
    character: "Katarzyna",
    campaign: "of-katarzyna",
    description: "Kling-generated 2026-06-02 — Katarzyna (early 20s visual) introduces 'OnlyFans for Smart People — EU Digital Passport Compliance — $29/mo'. New ESPR/DPP vertical announced by Sean 2026-06-01.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Early_20s__1586_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },

  // ── Hate Your Boss — 5 stills, clean headlines, launch-ready ──
  // Backup creative if OF gets ad-policy flagged (per original CODEX note).
  // Different boss archetypes each map to a different worker context.
  {
    assetId: "hate-boss-dealer-still-01",
    type: "still",
    character: "Dale",
    campaign: "hate-boss-dealer",
    description: "Heavyset car dealer (Dale, Floor Manager Auto Sales) at desk in showroom. 'HAS YOUR SALES MANAGER EVER MADE A SALE?' / 'BUILD WHAT THEY COULDN'T. START FREE.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
  {
    assetId: "hate-boss-dealer-video-01",
    type: "video",
    character: "Dale",
    campaign: "hate-boss-dealer",
    description: "Kling-generated 2026-06-02 — Dale (Floor Manager Auto Sales) video for Hate Your Boss sequence. First video in the hate-boss-dealer line.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Sales_Mana_1610_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "hate-boss-synergy-still-01",
    type: "still",
    character: "Corporate Boss",
    campaign: "hate-boss-synergy",
    description: "Bald man hands-behind-head at cubicle desk surrounded by 'World's Best Boss' plaques + 'Rise and Grind' + 'Hustle Harder' mugs. 'Has your manager ever made anything?' / 'Build what they couldn't. Start free.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
  {
    assetId: "hate-boss-synergy-still-02",
    type: "still",
    character: "Middle Manager",
    campaign: "hate-boss-synergy",
    description: "Stressed mid-90s middle manager at corded phone with SYNERGY poster + 'Budget FY2005' binders. 'HAS YOUR MANAGER DONE ANYTHING BESIDES FORWARD EMAILS?' / 'BUILD WHAT THEY COULDN'T. START FREE.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
  {
    assetId: "hate-boss-vc-still-01",
    type: "still",
    character: "YC Brandon",
    campaign: "hate-boss-vc",
    description: "Young guy in casual blazer (YC Brandon) perched on desk with AirPods + 'Hustle Harder' poster + Y Combinator-sticker-covered laptop. 'HAS YOUR MANAGER ACTUALLY SHIPPED ANYTHING?' / 'BUILD WHAT THEY COULDN'T. START FREE.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
  {
    assetId: "hate-boss-vc-video-01",
    type: "video",
    character: "YC Brandon",
    campaign: "hate-boss-vc",
    description: "Kling-generated 2026-06-02 — YC Brandon (founder bro boss) video for Hate Your Boss sequence. Visual tagline variant: 'Build what they can't, how you want.' (vs. original still's 'Build what they couldn't.').",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_YC_Brandon_1620_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "hate-boss-synergy-video-01",
    type: "video",
    character: "Synergy Sandra",
    campaign: "hate-boss-synergy",
    description: "Kling-generated 2026-06-02 — Synergy Sandra (corporate-speak boss) video for Hate Your Boss sequence. First video in the hate-boss-synergy line; complements the existing two corporate-archetype stills.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Synergy_Sa_1666_0.mp4",
    durationSec: 5,
    status: "draft",
    issue: null,
  },
  {
    assetId: "hate-boss-vc-video-02",
    type: "video",
    character: "YC Brandon",
    campaign: "hate-boss-vc",
    description: "Kling-generated 2026-06-02 — Second YC Brandon clip. Sean called this one 'perfect' on review (2026-06-01) — this is the hero clip for the hate-boss-vc line.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_YC_Brandon_1681_0.mp4",
    durationSec: 5,
    status: "approved",
    issue: null,
  },
  {
    assetId: "hate-boss-tech-still-01",
    type: "still",
    character: "Priya",
    campaign: "hate-boss-tech",
    description: "Young PM (Priya) with AirPods + 'Move Fast Break Things' poster + 'BIG IDEAS' notepad + chin-on-hand pose. 'Has your manager made one decision this week?' / 'Build what they couldn't. Start free.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
  {
    assetId: "hate-boss-tech-video-01",
    type: "video",
    character: "Priya",
    campaign: "hate-boss-tech",
    description: "Kling-generated 2026-06-02 — Priya (Move-Fast PM boss) video for Hate Your Boss sequence. Sean called this one 'so perfect' on review 2026-06-01 — hero clip for the hate-boss-tech line.",
    drivePath: null,
    sourcePath: "/Users/seancombs/Downloads/kling_20260602_作品_Priya___re_1710_0.mp4",
    durationSec: 5,
    status: "approved",
    issue: null,
  },

  // ── Power to the Workers — 3 propaganda-style, launch-ready ──
  // Clean creative. Use when paid OF is rejected; also evergreen for X.
  {
    assetId: "workers-unite-still-01",
    type: "still",
    character: "Builder",
    campaign: "workers-unite",
    description: "Soviet-poster silhouette: fist raised, SOLD sign in one hand, laptop in other, suburban houses behind. 'WORKERS OF THE WORLD, BUILD.' / 'JOIN THE 1,000+ ALREADY BUILDING. START NOW.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
  {
    assetId: "workers-unite-still-02",
    type: "still",
    character: "Pilot",
    campaign: "workers-unite", // also fits aviation
    description: "Pilot in uniform with cap + airplane behind, holding wrench. Star radiant background. 'SKILLED HANDS. SHARPER MINDS. BUILD.' / 'JOIN THE 1,000+ ALREADY BUILDING. START NOW.'",
    drivePath: null,
    status: "staged",
    issue: "Cross-tag for aviation campaign once that route exists.",
  },
  {
    assetId: "workers-unite-still-03",
    type: "still",
    character: "Industrial Worker",
    campaign: "workers-unite",
    description: "Factory worker in overalls, fist raised, wrench + laptop in hands, smokestacks + gears behind. 'BUILT BY HANDS. RUN BY MINDS.' / '1,000+ WORKERS AND GROWING. BUILD YOURS.'",
    drivePath: null,
    status: "staged",
    issue: null,
  },
];

function listAssets(filter = {}) {
  return LAUNCH_ASSETS.filter(a => {
    if (filter.campaign && a.campaign !== filter.campaign) return false;
    if (filter.status && a.status !== filter.status) return false;
    if (filter.type && a.type !== filter.type) return false;
    return true;
  });
}

function getAssetById(assetId) {
  return LAUNCH_ASSETS.find(a => a.assetId === assetId) || null;
}

function listCampaigns() {
  const set = new Set();
  for (const a of LAUNCH_ASSETS) if (a.campaign) set.add(a.campaign);
  return Array.from(set);
}

function assetsByCampaign() {
  const out = {};
  for (const a of LAUNCH_ASSETS) {
    if (!a.campaign) continue;
    if (!out[a.campaign]) out[a.campaign] = [];
    out[a.campaign].push(a);
  }
  return out;
}

function assetCounts() {
  return {
    total: LAUNCH_ASSETS.length,
    byType: LAUNCH_ASSETS.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {}),
    byStatus: LAUNCH_ASSETS.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}),
    byCampaign: LAUNCH_ASSETS.reduce((acc, a) => { acc[a.campaign] = (acc[a.campaign] || 0) + 1; return acc; }, {}),
    needsReclip: LAUNCH_ASSETS.filter(a => a.status === "needs_reclip").length,
  };
}

module.exports = {
  LAUNCH_ASSETS,
  listAssets,
  getAssetById,
  listCampaigns,
  assetsByCampaign,
  assetCounts,
};
