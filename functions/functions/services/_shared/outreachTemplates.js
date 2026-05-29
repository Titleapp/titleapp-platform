"use strict";

/**
 * services/_shared/outreachTemplates.js — Shared email scaffolding.
 *
 * Both IR advisor + IR investor outreach (and future HR + Marketing) share
 * the same Swiss-tone visual language. Centralizing the scaffolding here
 * means:
 *   - Brand color, font stack, max-width, padding are consistent
 *   - Signature block (Sean Lee Combs, Founder, SOCIII) is one source of truth
 *   - Confidentiality footer doesn't drift between contexts
 *   - When we change brand voice or palette, one edit propagates
 *
 * What this DOES NOT do: write the body copy. Each outreach flow owns its
 * own narrative (warmth, role-specific terms, audience-specific framing).
 * This is scaffolding only.
 *
 * Usage:
 *   const { emailFrame, signatureBlock, sectionHeading, confidentialityFooter } =
 *     require("../_shared/outreachTemplates");
 *
 *   return emailFrame(`
 *     ${greetingParagraph}
 *     ${termsParagraph}
 *     ${sectionHeading("What happens next")}
 *     ${stepsParagraphs}
 *     ${signatureBlock()}
 *     ${confidentialityFooter("investor")}
 *   `);
 */

const BRAND_PURPLE = "#7C3AED";
const TEXT_DARK = "#1a202c";
const TEXT_MUTED = "#64748b";
const RULE_COLOR = "#e5e7eb";
const MAX_WIDTH = 620;

/**
 * Wrap body HTML in the standard SOCIII email frame with brand header.
 */
function emailFrame(bodyHtml) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: ${MAX_WIDTH}px; margin: 0 auto; padding: 40px 20px; color: ${TEXT_DARK};">
  <div style="margin-bottom: 28px;">
    <span style="font-size: 22px; font-weight: 700; color: ${BRAND_PURPLE}; letter-spacing: -0.5px;">SOCIII</span>
  </div>
  ${bodyHtml}
</div>`;
}

/**
 * Standard signature block. Sean Lee Combs · Founder, SOCIII.
 */
function signatureBlock({ role = "Founder, SOCIII" } = {}) {
  return `
<p style="font-size: 16px; line-height: 1.7; margin: 0 0 4px 0;">Talk soon,</p>
<p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;"><strong>Sean Lee Combs</strong><br/>
  <span style="color: ${TEXT_MUTED};">${role}</span>
</p>`;
}

/**
 * Section-divider heading — uppercase eyebrow.
 */
function sectionHeading(text) {
  return `<h3 style="font-size: 14px; font-weight: 600; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 0.5px; margin: 32px 0 12px 0;">${text}</h3>`;
}

/**
 * Standard paragraph styling — use for body prose.
 */
function paragraph(html) {
  return `<p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">${html}</p>`;
}

/**
 * Confidentiality footer. Different boilerplate per audience.
 *   - "general"  — for advisors, vendors, creators
 *   - "investor" — adds securities-law non-offer language
 */
function confidentialityFooter(audience = "general") {
  const body = audience === "investor"
    ? `SOCIII, Inc. — Collaborative Intelligence. This invitation and the linked materials are confidential and intended only for the named recipient. Nothing herein constitutes an offer to sell or solicitation to buy securities; any such offer is made solely through the executed SAFE and accompanying disclosures.`
    : `SOCIII, Inc. — Collaborative Intelligence. This invitation and the linked materials are confidential. If you received this in error, please disregard.`;
  return `
<div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid ${RULE_COLOR};">
  <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0;">${body}</p>
</div>`;
}

/**
 * Inline link with brand color.
 */
function brandLink(href, text) {
  return `<a href="${href}" style="color: ${BRAND_PURPLE}; text-decoration: underline;">${text}</a>`;
}

/**
 * Pull-quote / callout box. For "heads up:" style asides.
 */
function calloutBox(html) {
  return `
<div style="margin: 28px 0; padding: 18px 22px; background: #faf5ff; border-left: 4px solid ${BRAND_PURPLE}; border-radius: 6px;">
  <p style="margin: 0; font-size: 15px; line-height: 1.6; color: ${TEXT_DARK};">${html}</p>
</div>`;
}

module.exports = {
  emailFrame,
  signatureBlock,
  sectionHeading,
  paragraph,
  confidentialityFooter,
  brandLink,
  calloutBox,
  BRAND_PURPLE,
  TEXT_DARK,
  TEXT_MUTED,
};
