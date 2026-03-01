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
  heading: { size: 18, font: "Helvetica-Bold" },
  subheading: { size: 14, font: "Helvetica-Bold" },
  body: { size: 11, font: "Helvetica" },
  caption: { size: 9, font: "Helvetica" },
  footer: { size: 8, font: "Helvetica" },
  metric: { size: 24, font: "Helvetica-Bold" },
  label: { size: 10, font: "Helvetica-Bold" },
};

const COLORS = {
  primary: "#7c3aed",
  secondary: "#1e1b4b",
  text: "#111827",
  textLight: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
  white: "#ffffff",
};

module.exports = { PAGE_SIZES, MARGINS, FONTS, COLORS };
