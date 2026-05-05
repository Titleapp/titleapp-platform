"use strict";

/**
 * canvasAutoWrap.js — Last-resort safety net for chat ↔ canvas separation (49.31).
 *
 * If the model writes a structured deliverable (markdown table, multi-section
 * report, long structured response) into chat instead of emitting a
 * |||CANVAS_RENDER||| marker, this module detects that pattern and synthesizes
 * a card:work-product canvas render around it. The chat reply is replaced
 * with a short acknowledgment so the user sees the canvas and not a giant
 * dump of markdown in chat.
 *
 * Runs AFTER the delivery-rules retry. Only fires when:
 *  - user asked for a deliverable (breakdown, summary, table, plan, etc.)
 *  - response has no canvas marker
 *  - response looks like structured work (has markdown table OR multiple ## headers OR is quite long)
 */

const DELIVERABLE_REQUEST_PATTERNS = /\b(breakdown|summary|summari[sz]e|table|spreadsheet|list (of|out|the)|plan|schedule|timeline|model|forecast|projection|chart|bar chart|heat ?map|funnel|graphic|graphical|visual|visuali[sz]e|report|template|framework|comparison|analysis|analyze|chart of accounts|p ?& ?l|profit and loss|income statement|balance sheet|cash ?flow|budget|calendar|register|ledger|dashboard|kpi|kpis|metric|metrics|pipeline|deal flow|performance|review|recap|categori[sz]e|categori[sz]ation|extract (the|all|line items)|pull (the|all|out)|reconcile|reconciliation|build|draft|generate|create|show me|give me|what are my|how is my)\b/i;

const FALSE_CANVAS_CLAIM_RE = /\b(on (the |your )?(right(-side)? )?canvas|on the right(-side)?|showing on (the )?canvas|rendered on (the )?canvas|now (showing|on) (your |the )?canvas|ready in (the |your )?canvas)\b/i;

const CANVAS_MARKER_RE = /\|\|\|CANVAS_RENDER\|\|\|/;

// Markdown structure detection.
const MD_TABLE_LINE = /^\s*\|.+\|\s*$/m;       // any markdown table row
const MD_HEADER_LINE = /^#{1,3}\s+\S/m;        // a ##-style header
const MD_BOLD_LABEL = /^\s*\*\*[^*]+:\*\*/m;   // **Section:** label
const PLACEHOLDER_RE = /\[\s*(amount|merchant name|day of week|date|mm\/dd|x|reason|category)\s*\]/i;

/**
 * Strip leading markdown for the chat acknowledgment text.
 */
function firstNonHeaderLine(text) {
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (/^#{1,6}\s/.test(t)) continue;
    if (/^[-*]\s/.test(t)) continue;
    if (/^\|/.test(t)) continue;
    if (t.length < 20) continue;
    return t.length > 220 ? t.slice(0, 220) + "..." : t;
  }
  return null;
}

/**
 * Try to extract a title from the response — first ## or # header.
 */
function extractTitle(text) {
  const m = text.match(/^#{1,3}\s+(.+?)\s*$/m);
  if (m) return m[1].replace(/[#*_`]/g, "").trim().slice(0, 100);
  return null;
}

/**
 * Split markdown into sections by ## headers.
 */
function splitSections(text) {
  const sections = [];
  // Split on ##/### headers.
  const parts = text.split(/^(#{2,3}\s+.+)$/m).filter(s => s != null);
  // parts is [intro, header1, body1, header2, body2, ...] — recombine.
  let i = 0;
  // Skip intro if it doesn't look like content
  if (parts[0] && !/^#{2,3}\s/.test(parts[0])) {
    const intro = parts[0].trim();
    if (intro.length > 30) sections.push({ heading: "Overview", body: intro });
    i = 1;
  }
  for (; i < parts.length - 1; i += 2) {
    const heading = (parts[i] || "").replace(/^#{1,6}\s+/, "").replace(/[#*_`]/g, "").trim();
    const body = (parts[i + 1] || "").trim();
    if (heading && body) sections.push({ heading: heading.slice(0, 80), body });
  }
  return sections;
}

/**
 * Decide whether the response is a "deliverable in chat" we should auto-wrap.
 * Two trigger modes:
 *   A) Long structured deliverable pasted into chat (table, multi-header, bold labels, placeholders, or >700 chars).
 *   B) "False canvas claim" — model says "on the canvas" / "on the right" but emitted no marker, while
 *      the user asked for a deliverable. This catches the short-claim hallucination
 *      where the model lies about rendering.
 */
function looksLikeDeliverable(text, userInput) {
  if (!text) return false;
  if (CANVAS_MARKER_RE.test(text)) return false; // already wrapped
  const ask = String(userInput || "");
  const userAsked = DELIVERABLE_REQUEST_PATTERNS.test(ask);
  if (!userAsked) return false;

  // Mode B — false canvas claim. Always wrap, regardless of length.
  if (FALSE_CANVAS_CLAIM_RE.test(text)) return true;

  if (text.length < 250) return false;

  const hasTable = MD_TABLE_LINE.test(text);
  const hasMultipleHeaders = (text.match(/^#{1,3}\s+\S/gm) || []).length >= 2;
  const hasBoldLabels = (text.match(/^\s*\*\*[^*]+:\*\*/gm) || []).length >= 3;
  const hasPlaceholders = PLACEHOLDER_RE.test(text);
  const isLong = text.length > 700;

  return hasTable || hasMultipleHeaders || hasBoldLabels || hasPlaceholders || isLong;
}

/**
 * Pick a sensible card type and title from the user's request when we have to
 * synthesize a card from a false-canvas claim with no real content from the model.
 */
function pickTypeAndTitleFromAsk(userInput) {
  const ask = String(userInput || "").toLowerCase();
  if (/\bbalance sheet\b/.test(ask)) return { type: "card:accounting-balance-sheet", title: "Balance Sheet" };
  if (/\bcash ?flow( statement)?\b/.test(ask)) return { type: "card:accounting-cashflow", title: "Cash Flow Statement" };
  if (/\b(p ?& ?l|profit and loss|income statement)\b/.test(ask)) return { type: "card:accounting-pl", title: "P&L Summary" };
  if (/\bchart of accounts\b/.test(ask)) return { type: "card:accounting-coa", title: "Chart of Accounts" };
  if (/\binvoice/.test(ask)) return { type: "card:accounting-invoice", title: "Invoices" };
  if (/\bcontent calendar\b/.test(ask)) return { type: "card:marketing-content-calendar", title: "Content Calendar" };
  if (/\b(email (campaign|sequence|nurture)|nurture campaign)\b/.test(ask)) return { type: "card:marketing-email", title: "Email Campaign" };
  if (/\bemployee/.test(ask)) return { type: "card:hr-employee-register", title: "Employee Register" };
  if (/\b(performance|review)\b/.test(ask)) return { type: "card:hr-performance", title: "Performance Review" };
  if (/\b(comp|comparable)/.test(ask)) return { type: "card:re-comp-analysis", title: "Comp Analysis" };
  if (/\bmarket report\b/.test(ask)) return { type: "card:re-market-report", title: "Market Report" };
  if (/\bproperty (analysis|valuation)\b/.test(ask)) return { type: "card:re-property-analysis", title: "Property Analysis" };
  if (/\b(closing|escrow)\b/.test(ask)) return { type: "card:real-estate-closing", title: "Closing Status" };
  if (/\bheat ?map\b/.test(ask)) return { type: "card:chart-heatmap", title: "Heatmap" };
  if (/\bfunnel\b/.test(ask)) return { type: "card:chart-funnel", title: "Pipeline Funnel" };
  if (/\b(bar chart|graphical|graphic|visual|visuali[sz]e)\b/.test(ask)) return { type: "card:chart-bar", title: "Chart" };
  return { type: "card:work-product", title: "Work Product" };
}

/**
 * Synthesize a starter payload that matches the shape the target card expects.
 * Without this, the type-specific cards (ContentCalendarCard, EmailCampaignCard,
 * RealEstateClosingCard) render their empty state because they don't read
 * `summary` / `sections`.
 */
function placeholderPayloadFor(type, title) {
  const base = {
    title,
    summary: `${title} placeholder — provide your details and I will populate the card.`,
  };
  switch (type) {
    case "card:marketing-content-calendar":
      return {
        ...base,
        calendar: [
          { date: "Day 1", posts: [{ platform: "linkedin", content: "Sample post — replace with your topic.", time: "9:00 AM" }] },
          { date: "Day 2", posts: [{ platform: "instagram", content: "Sample reel idea — replace with your topic.", time: "12:00 PM" }] },
        ],
      };
    case "card:marketing-email":
      return {
        ...base,
        campaigns: [
          { subject: "Sample subject — replace", preview: "Preview text goes here", status: "draft", recipients: 0 },
        ],
      };
    case "card:real-estate-closing":
      return {
        ...base,
        closingData: {
          address: "Address pending",
          milestones: [
            { label: "Offer accepted", status: "pending" },
            { label: "Inspection", status: "pending" },
            { label: "Loan approval", status: "pending" },
            { label: "Closing", status: "pending" },
          ],
        },
      };
    case "card:accounting-balance-sheet":
      return {
        ...base,
        balanceSheet: { asOf: "TBD", currentAssets: [], nonCurrentAssets: [], currentLiabilities: [], longTermLiabilities: [], equity: [] },
      };
    case "card:accounting-cashflow":
      return {
        ...base,
        cashFlow: { period: "TBD", beginningCash: 0, operating: [], investing: [], financing: [] },
      };
    case "card:chart-bar":
      return {
        ...base,
        chartType: "bar",
        data: [
          { label: "Category A", value: 0 },
          { label: "Category B", value: 0 },
          { label: "Category C", value: 0 },
        ],
      };
    case "card:chart-funnel":
      return {
        ...base,
        chartType: "funnel",
        data: [
          { label: "Stage 1", count: 0, value: 0 },
          { label: "Stage 2", count: 0, value: 0 },
          { label: "Stage 3", count: 0, value: 0 },
        ],
      };
    case "card:chart-heatmap":
      return {
        ...base,
        chartType: "heatmap",
        data: [],
      };
    default:
      return {
        ...base,
        sections: [{ heading: "Awaiting input", body: "Tell me what numbers, line items, or details you want here." }],
      };
  }
}

/**
 * Build a synthetic CANVAS_RENDER for the deliverable.
 * @returns {{ aiText: string, canvasRender: object } | null}
 */
function autoWrap({ aiText, userInput, defaultTitle }) {
  if (!looksLikeDeliverable(aiText, userInput)) return null;

  // False canvas claim mode — model said "on the canvas" but produced no real content.
  // Synthesize a typed placeholder card so the user actually sees something.
  const isFalseClaim = FALSE_CANVAS_CLAIM_RE.test(aiText) && aiText.length < 700;
  if (isFalseClaim) {
    const { type, title } = pickTypeAndTitleFromAsk(userInput);
    return {
      aiText: `${title} is on the canvas — this is a starting structure. Tell me which numbers you want me to swap in.`,
      canvasRender: {
        type,
        payload: placeholderPayloadFor(type, title),
      },
    };
  }

  const title = extractTitle(aiText) || defaultTitle || "Work Product";
  const sections = splitSections(aiText);
  const summary = firstNonHeaderLine(aiText) || `${title} ready for review.`;

  // If we couldn't extract sections, fall back to summary + raw body.
  if (sections.length === 0) {
    return {
      aiText: `${title} is ready in the canvas on the right. Let me know if you want adjustments.`,
      canvasRender: {
        type: "card:work-product",
        payload: {
          title,
          summary,
          sections: [{ heading: "Details", body: aiText.slice(0, 4000) }],
        },
      },
    };
  }

  return {
    aiText: `${title} is ready in the canvas on the right. Let me know if you want adjustments.`,
    canvasRender: {
      type: "card:work-product",
      payload: {
        title,
        summary,
        sections: sections.slice(0, 12),
      },
    },
  };
}

module.exports = { autoWrap, looksLikeDeliverable };
