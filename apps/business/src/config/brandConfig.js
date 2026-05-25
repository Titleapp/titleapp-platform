// Brand configuration — central source of truth for the one-flip rebrand.
// When SOCIII formation is complete, change ACTIVE_BRAND to "sociii".
// Every consumer reads from `brand` below — no hard-coded "TitleApp" strings in UI.

const BRANDS = {
  titleapp: {
    name: "TitleApp",
    domain: "titleapp.ai",
    legalEntity: "TitleApp LLC",
    tagline: "Digital Workers for Modern Business",
    supportEmail: "support@titleapp.ai",
    senderEmail: "sean@titleapp.ai",
    palette: {
      primary: "#7c3aed",
      primaryDark: "#6d28d9",
      accent: "#0ea5e9",
      bg: "#ffffff",
      text: "#111827",
    },
    loader: "key",
  },
  sociii: {
    // Brand name is all-caps "SOCIII" per canonical brand system (OpenAI-generated
    // brand board, JPG references in apps/business/src/assets/sociii-brand/raw/).
    name: "SOCIII",
    domain: "sociii.ai",
    legalEntity: "SOCIII, Inc.",
    tagline: "Collaborative Intelligence · Participation",
    strapline: "SOCIII is a platform where people create, share, and earn from AI workers.",
    supportEmail: "support@sociii.ai",
    senderEmail: "sean@sociii.ai",
    // Canonical palette per brand board (2026-05-22). Primary purple matches
    // titleapp purple to ease the cutover. Green and cyan are SOCIII-specific
    // accents tied to status indicators (live, AI worker, online).
    palette: {
      primary: "#7C3AED",
      primaryDark: "#6D28D9",
      accentGreen: "#16A34A",
      accentCyan: "#0686D4",
      // Legacy accent key preserved so existing consumers don't break on flip
      // — points to cyan since most accent uses in code expect a blue-ish tone.
      accent: "#0686D4",
      navy: "#0F172A",
      bg: "#ffffff",
      text: "#1A1F2E",
    },
    loader: "geoscape",
  },
};

export const ACTIVE_BRAND = "sociii";

export const brand = BRANDS[ACTIVE_BRAND];

export const isSociii = () => ACTIVE_BRAND === "sociii";
