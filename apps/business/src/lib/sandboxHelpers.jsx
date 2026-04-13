// CODEX 48.5 — Shared sandbox helpers.
//
// Extracted from DeveloperSandbox.jsx so both DeveloperSandbox (games) and
// WorkerSandbox (workers) can share the same primitives without drift.
//
// Contents:
//   - renderMarkdown(text)          → JSX output with bold/italic/code/newlines
//   - isAffirmative(text)           → boolean: user replied "yes"/"sure"/etc
//   - isMetaQuestion(text)          → boolean: user replied with a question/plea
//   - detectPhaseIntent(text, phases) → phase id the user is asking to go to
//   - ensureAnonymousAuthForBuild() → signs in anonymously + claims a tenant
//
// Keyword maps and capture helpers live here too so workers can reuse the
// same slot-capture pattern with their own rubric.

import React from "react";
import { signInAnonymously } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// ── Markdown ────────────────────────────────────────────────────────────────

/**
 * Mini markdown renderer for chat messages.
 * Handles **bold**, *italic*, `code`, and preserves newlines.
 * Returns an array of React nodes safe to drop into any container.
 */
export function renderMarkdown(text) {
  if (!text) return null;
  const lines = String(text).split("\n");
  return lines.map((line, lineIdx) => {
    const parts = [];
    let remaining = line;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      const italicMatch = !boldMatch && remaining.match(/^\*([^*\s][^*]*)\*/);
      const codeMatch = !boldMatch && !italicMatch && remaining.match(/^`([^`]+)`/);
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
      } else if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
      } else if (codeMatch) {
        parts.push(
          <code key={key++} style={{ background: "rgba(0,0,0,0.08)", padding: "1px 5px", borderRadius: 3, fontSize: "0.92em" }}>
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
      } else {
        const nextSpecial = remaining.search(/\*\*|\*[^*\s]|`/);
        if (nextSpecial === -1) {
          parts.push(<React.Fragment key={key++}>{remaining}</React.Fragment>);
          remaining = "";
        } else {
          parts.push(<React.Fragment key={key++}>{remaining.slice(0, nextSpecial)}</React.Fragment>);
          remaining = remaining.slice(nextSpecial);
        }
      }
    }
    return (
      <React.Fragment key={lineIdx}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

// ── Text classification ─────────────────────────────────────────────────────

/** Yes-style replies. Used for accepting a recommended default. */
export function isAffirmative(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return false;
  return /\b(yes|yep|yeah|yup|sure|ok|okay|done|ready|move on|let'?s go|let'?s do it|next|continue|sounds good|good to go)\b/.test(t);
}

/**
 * Meta-questions / pleas for help / confusion. When this fires, the caller
 * should NOT capture the text as a rubric answer — instead it should offer
 * a recommended default and re-ask.
 */
export function isMetaQuestion(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return true;
  if (t.length < 3) return true;
  if (/\?\s*$/.test(t) && !/\b(yes|no|one|two|three|real.?time|simultaneous|turns?|score|time|reach|collect)\b/.test(t)) return true;
  if (/\b(i don'?t know|i'?m not sure|not sure|no idea|i'?m new|i'?ve never|first time|never (made|built|done))\b/.test(t)) return true;
  if (/\b(can you help|help me|what do you (recommend|suggest|think)|you (decide|choose|pick)|whatever you|surprise me)\b/.test(t)) return true;
  if (/\b(confused|don'?t understand|what does that mean|what'?s the difference|i don'?t get it)\b/.test(t)) return true;
  return false;
}

/** "build it" / "let's test" / "LFG" / etc. */
export function isTestTrigger(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return false;
  return /\b(build it|let'?s test|test it|test the game|test the worker|i'?m ready|play it|play now|launch it|run it|fire it up|ready to test|build (and|&) test|build the game|build the worker|lfg|let'?s go|let'?s play|let'?s do this|let'?s rock|bring it( on)?|show me|fire away|i want to play|try it)\b/.test(t);
}

// ── Slot-aware capture ──────────────────────────────────────────────────────

/**
 * Given a user's text and a keywordMap of {slotId: regex}, find which
 * UNFILLED slot the text best matches. Returns the slotId or null.
 * Falls back to the first unfilled slot in canonical order if nothing matches.
 */
export function findUnfilledSlot(text, keywordMap, filledSet) {
  const t = (text || "").toLowerCase();
  for (const [key, pattern] of Object.entries(keywordMap)) {
    if (filledSet.has(key)) continue;
    if (pattern.test(t)) return key;
  }
  for (const key of Object.keys(keywordMap)) {
    if (!filledSet.has(key)) return key;
  }
  return null;
}

// ── Auth bootstrap ──────────────────────────────────────────────────────────

/**
 * Ensure Firebase auth + tenant claim before hitting an auth-gated backend
 * route. If the user is a real account already, no-op. Otherwise sign in
 * anonymously and claim a new tenant under the hood.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export async function ensureAnonymousAuthForBuild() {
  const existingToken = localStorage.getItem("ID_TOKEN");
  const existingTenant = localStorage.getItem("TENANT_ID");
  if (firebaseAuth?.currentUser && existingToken && existingTenant) {
    return { ok: true };
  }
  try {
    if (!firebaseAuth?.currentUser) {
      await signInAnonymously(firebaseAuth);
    }
    const user = firebaseAuth.currentUser;
    if (!user) return { ok: false, error: "Anonymous sign-in returned no user" };
    const idToken = await user.getIdToken();
    localStorage.setItem("ID_TOKEN", idToken);
    if (user.uid) localStorage.setItem("USER_ID", user.uid);

    if (!localStorage.getItem("TENANT_ID")) {
      const claimRes = await fetch(`${API_BASE}/api?path=/v1/onboarding:claimTenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: "Guest Creator", surface: "sandbox" }),
      });
      const claimData = await claimRes.json().catch(() => ({}));
      if (claimData.ok && claimData.tenantId) {
        localStorage.setItem("TENANT_ID", claimData.tenantId);
      } else {
        return { ok: false, error: "Tenant claim failed: " + (claimData.error || "unknown") };
      }
    }
    return { ok: true };
  } catch (err) {
    console.error("[ensureAnonymousAuthForBuild] failed:", err);
    return { ok: false, error: err.message || "Auth bootstrap failed" };
  }
}

// ── Worker rubric + keywords (strawman from Pass 5 planning) ────────────────
//
// These are the worker-specific equivalents of the game RULE_KEYWORDS /
// INTERACTION_KEYWORDS maps. Scoped to Pass 6 capture logic — exported here
// so the worker sandbox can import and use them without another round trip.

export const WORKER_RULE_KEYWORDS = {
  identity: /\b(name|called|vertical|industry|audience|who uses|target|jurisdiction|state|country|region)\b/i,
  purpose: /\b(purpose|does|problem|solve|use case|help|goal|outcome|deliver|output|result)\b/i,
  knowledge: /\b(document|documents|pdf|sop|manual|reference|source|upload|material|content|knowledge|data)\b/i,
  rules: /\b(rule|rules|must|must not|never|always|compliance|regulat|hipaa|gdpr|safety|policy|violation)\b/i,
  tools: /\b(tool|tools|capability|capabilities|email|report|dashboard|search|generate|integration|api|lookup)\b/i,
};

export const WORKER_RULE_DEFAULTS = {
  identity: "Your worker: name TBD, vertical TBD, target audience TBD. We'll fill these in as you describe your idea.",
  purpose: "A worker that solves a specific repeatable problem for its audience with AI-generated output, validated by rules.",
  knowledge: "Upload any SOPs, reference docs, or policy files you want the worker to know. If you don't have any yet, we'll recommend templates by vertical.",
  rules: "Default rule pack for your vertical — I'll look up the current regulations (HIPAA, GDPR, state-specific) and draft a starter set you can review.",
  tools: "Starter toolkit: chat answer, document generation, web search, email send. You can add more after the first test.",
};
