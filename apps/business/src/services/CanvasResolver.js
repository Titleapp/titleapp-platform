/**
 * CanvasResolver.js — Canvas Protocol Resolver (44.9)
 *
 * Reads canvasSignal from API response, looks up in registry,
 * routes to right panel (desktop) or inline card (mobile).
 * 500ms debounce prevents thrashing during rapid exchanges.
 */

import { lookupSignal } from "../config/canvasTypes";

// ── Debounce helper ─────────────────────────────────────────
let _timer = null;

function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(_timer);
    _timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Mobile detection ────────────────────────────────────────
function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

// ── Core resolve logic ──────────────────────────────────────

function _resolve(signal, context, showCanvas, addInlineCard) {
  if (!signal) return;

  const resolved = lookupSignal(signal);
  if (!resolved) {
    console.warn("Unknown canvas signal:", signal);
    return;
  }

  if (isMobileViewport() && addInlineCard) {
    // Mobile: render as inline card in chat panel
    addInlineCard(resolved, context);
    return;
  }

  // Desktop: update right panel to canvas state
  if (showCanvas) {
    showCanvas(resolved, context);
  }
}

/**
 * Debounced resolver — call after every API response.
 *
 * @param {string} signal — canonical signal string from backend
 * @param {object} context — conversation context for card rendering
 * @param {function} showCanvas — RightPanelContext.showCanvas(resolved, context)
 * @param {function} [addInlineCard] — optional callback for mobile inline card
 */
const resolve = debounce(_resolve, 500);

/**
 * Immediate resolve — skip debounce (for initial load / worker open).
 */
function resolveImmediate(signal, context, showCanvas, addInlineCard) {
  clearTimeout(_timer);
  _resolve(signal, context, showCanvas, addInlineCard);
}

export default { resolve, resolveImmediate, isMobileViewport };
