"use strict";

// Rotation of finished blog/press pieces for the 3x/week (Mon/Wed/Fri)
// LinkedIn + X blog-promotion posters (blogPromoPost.js). Add new entries
// here as new stories go live at /press/<slug> — nothing else needs to
// change, the picker below just rotates through whatever's in this list.
const BLOG_ROSTER = [
  {
    slug: "rogue-ai-rewriting-history",
    caption: "The real rogue AI threat isn't a robot uprising. It's rewriting history.",
    url: "https://sociii.ai/press/rogue-ai-rewriting-history",
  },
  {
    slug: "expert-not-engineer",
    caption: "You're an expert. You just never learned to code. Now you don't have to.",
    url: "https://sociii.ai/press/expert-not-engineer",
  },
  {
    slug: "battery-passport-knockoff",
    caption: "How do you know your EV battery isn't secretly a cheap knockoff?",
    url: "https://sociii.ai/press/battery-passport-knockoff",
  },
];

// Deterministic pick by an increasing slot index (not calendar day, since
// posts only fire on Mon/Wed/Fri) so the rotation covers the whole roster
// before repeating, same pattern as dailyXPost.js's ROSTER picker.
function pickBlogForSlot(slotIndex) {
  const idx = ((slotIndex % BLOG_ROSTER.length) + BLOG_ROSTER.length) % BLOG_ROSTER.length;
  return { ...BLOG_ROSTER[idx], idx };
}

module.exports = { BLOG_ROSTER, pickBlogForSlot };
