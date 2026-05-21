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
    name: "Sociii",
    domain: "sociii.ai",
    legalEntity: "Sociii Inc.",
    tagline: "Collaborative Intelligence · Participation",
    supportEmail: "support@sociii.ai",
    senderEmail: "sean@sociii.ai",
    palette: {
      primary: "#6B47DC",
      primaryDark: "#4F2FB8",
      accent: "#06B6D4",
      magenta: "#EC4899",
      navy: "#1A1F2E",
      bg: "#ffffff",
      text: "#1A1F2E",
    },
    loader: "geoscape",
  },
};

export const ACTIVE_BRAND = "titleapp";

export const brand = BRANDS[ACTIVE_BRAND];

export const isSociii = () => ACTIVE_BRAND === "sociii";
