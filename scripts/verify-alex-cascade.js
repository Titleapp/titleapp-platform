#!/usr/bin/env node
/**
 * verify-alex-cascade.js
 *
 * Smoke-test for S52.28b/c — confirm that the strategy-lock cascade
 * (core.js → assemblePrompt() / sovereign.js → hand-rolled prompts)
 * actually reaches each Alex surface in production.
 *
 * Hits the public Frontdoor at /v1/chat:message with a series of
 * canary questions tied to specific strategy markers. Surfaces tested
 * are the unauthenticated ones — landing/discovery, invest, developer,
 * contact, sandbox. Authenticated surfaces (business workspace COS Alex,
 * creator-journey middle panel, per-worker chat) need a bearer token —
 * those are skipped in this harness; run Sean's manual QA for those.
 *
 * Each canary has:
 *   - prompt: what to ask Alex
 *   - mustInclude: phrases or regexes that MUST appear in the reply
 *     (markers of the refreshed strategy lock)
 *   - mustNotInclude: phrases that MUST NOT appear (markers of stale
 *     pre-S52.20 framing — RE-broker-tool, Zillow replacement, "crypto
 *     company", magic-link auto-reply, etc.)
 *
 * Each surface uses a unique sessionId per run to bypass any
 * server-side state continuity.
 *
 * Usage:
 *   node scripts/verify-alex-cascade.js
 *
 * Exit code 0 if all surfaces pass. Non-zero if any surface fails.
 * A pass means the surface's reply contained every mustInclude marker
 * and none of the mustNotInclude markers. AI replies are non-
 * deterministic — markers are chosen to be ones the refreshed system
 * prompt should make highly likely. If you get false positives, tune
 * the markers.
 */

"use strict";

const FRONTDOOR = process.env.FRONTDOOR || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function askAlex({ surface, prompt, sessionId }) {
  const url = `${FRONTDOOR}/api?path=/v1/chat:message`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId || uuid(),
      userInput: prompt,
      surface,
      context: { source: "verify-alex-cascade-script" },
    }),
  });
  const json = await res.json().catch(() => ({ ok: false, message: "(non-JSON response)" }));
  return json;
}

function check(reply, mustInclude, mustNotInclude) {
  const lowered = (reply || "").toLowerCase();
  const includes = mustInclude.map(needle => {
    const present = lowered.includes(needle.toLowerCase());
    return { needle, present };
  });
  const excludes = mustNotInclude.map(needle => {
    const present = lowered.includes(needle.toLowerCase());
    return { needle, present };
  });
  const allIncludesOk = includes.every(c => c.present);
  const anyExcludesFound = excludes.some(c => c.present);
  return {
    pass: allIncludesOk && !anyExcludesFound,
    includes,
    excludes,
  };
}

const CANARIES = [
  // Each canary tests ONE strategy marker, since AI replies are
  // probabilistic and over-stuffed canaries produce flaky results.
  {
    surface: "landing",
    label: "landing/discovery — strategy lock",
    prompt: "what is sociii actually?",
    mustInclude: ["audit"],
    mustNotInclude: ["zillow replacement", "real estate broker tool"],
  },
  {
    surface: "landing",
    label: "landing/discovery — chain framing",
    prompt: "is sociii a crypto project?",
    mustInclude: [],
    // Should NOT lead with crypto / Solana / our own chain
    mustNotInclude: ["solana", "our own chain", "our l1"],
  },
  {
    surface: "invest",
    label: "invest — positioning + audit substrate",
    prompt: "I'm an investor. What does SOCIII actually do?",
    mustInclude: ["audit"],
    mustNotInclude: ["zillow replacement", "real estate broker tool"],
  },
  {
    surface: "invest",
    label: "invest — language rule (digital worker, not chatbot/agent)",
    prompt: "tell me about the AI bots you offer",
    mustInclude: [],
    mustNotInclude: ["chatbot", "agents"],
  },
  {
    surface: "developer",
    label: "developer — chain neutrality",
    prompt: "What chains do you support?",
    mustInclude: ["polygon"],
    mustNotInclude: ["solana"],
  },
  {
    surface: "contact",
    label: "contact — entity / brand",
    prompt: "What's the legal entity name?",
    mustInclude: ["sociii, inc."],
    mustNotInclude: ["titleapp llc is the current entity"],
  },
];

async function main() {
  console.log(`verify-alex-cascade — Frontdoor: ${FRONTDOOR}`);
  console.log(`Running ${CANARIES.length} canaries…\n`);

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const canary of CANARIES) {
    process.stdout.write(`[${canary.surface}] ${canary.label}\n   q: "${canary.prompt}"\n   `);
    let reply = "";
    try {
      const json = await askAlex({ surface: canary.surface, prompt: canary.prompt });
      reply = json.message || json.response || "(no reply)";
    } catch (e) {
      reply = `(error: ${e.message})`;
    }
    const result = check(reply, canary.mustInclude, canary.mustNotInclude);
    if (result.pass) {
      pass++;
      console.log("✓ PASS");
    } else {
      fail++;
      const missingIncludes = result.includes.filter(c => !c.present).map(c => c.needle);
      const presentExcludes = result.excludes.filter(c => c.present).map(c => c.needle);
      console.log("✗ FAIL");
      console.log(`     missing required: [${missingIncludes.join(", ")}]`);
      console.log(`     forbidden found:  [${presentExcludes.join(", ")}]`);
      failures.push({ canary, reply, missingIncludes, presentExcludes });
    }
    console.log(`   reply: ${reply.slice(0, 240).replace(/\n/g, " ⏎ ")}${reply.length > 240 ? "…" : ""}\n`);
  }

  console.log(`\n${pass}/${pass + fail} passed.`);

  if (fail > 0) {
    console.log("\nDETAIL — failures:");
    for (const f of failures) {
      console.log(`\n  [${f.canary.surface}] ${f.canary.label}`);
      console.log(`  q: "${f.canary.prompt}"`);
      if (f.missingIncludes.length) console.log(`  expected (missing): ${JSON.stringify(f.missingIncludes)}`);
      if (f.presentExcludes.length) console.log(`  forbidden (found):  ${JSON.stringify(f.presentExcludes)}`);
      console.log(`  full reply: ${f.reply}`);
    }
    process.exit(1);
  }
}

main().catch(e => {
  console.error("FATAL:", e.stack);
  process.exit(2);
});
