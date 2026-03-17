// services/documentEngine/templates/layouts.js
// Design system constants for document rendering

const PAGE_SIZES = {
  letter: { width: 612, height: 792 },   // 8.5 x 11 inches in points
  a4: { width: 595.28, height: 841.89 },
};

const MARGINS = {
  standard: { top: 72, bottom: 72, left: 72, right: 72 },
  narrow: { top: 54, bottom: 54, left: 54, right: 54 },
  memo: { top: 108, bottom: 72, left: 72, right: 72 },
};

const FONTS = {
  heading: { size: 18, font: "Calibri" },
  subheading: { size: 14, font: "Calibri" },
  body: { size: 11, font: "Calibri" },
  caption: { size: 9, font: "Calibri" },
  footer: { size: 8, font: "Calibri" },
  metric: { size: 24, font: "Calibri" },
  label: { size: 10, font: "Calibri" },
};

const COLORS = {
  primary: "#6B46C1",        // Purple (TitleApp brand — matches pitch deck)
  secondary: "#0D1B2A",      // Dark navy (slide backgrounds)
  accent: "#A78BFA",         // Light purple (accents, highlights)
  lightBg: "#EEF2F6",        // Light slide background (alternating)
  text: "#0F1117",           // Near-black (body text)
  textLight: "#64748B",       // Slate gray (labels, captions)
  textMuted: "#99AABB",       // Muted gray (footers, meta)
  border: "#CBD5E1",          // Light border
  background: "#f9fafb",     // Off-white
  white: "#ffffff",
  gold: "#C9A84C",           // Gold accent (RE vertical)
  teal: "#0B7A6E",           // Teal accent (RE vertical)
};

module.exports = { PAGE_SIZES, MARGINS, FONTS, COLORS };
