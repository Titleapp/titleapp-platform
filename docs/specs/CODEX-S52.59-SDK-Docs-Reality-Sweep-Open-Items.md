# CODEX S52.59 — SDK/Docs Reality Sweep: Fixed Today, and What's Still Open

**Status:** AUDIT + partial fix (2026-08-20). Most of what this sweep found was fixed same-day; this codex tracks what wasn't, so it doesn't disappear.
**Author:** Sean Lee Combs + Claude Code
**Predecessor:** CODEX S52.58 (RAAS enforcement audit, same day). This one is "does the SDK/docs reflect reality" instead of "do the guardrails work."

---

## Fixed today (for reference — not the point of this doc)

Sandbox-retirement contradiction in Alex's own system prompt; worker-anatomy.md's fictional six-file structure rewritten against the real SDK template; SDK's own README undercounting its template folder; a leaked personal `~/Downloads` path and dead internal cross-references in the SDK's public `intent.md`; a fourth stale `github.com/sociii`-family URL (`index.html`'s JSON-LD); `llms.txt`'s broken creator-guide link and four worker slugs that don't exist at all (verified directly against Firestore); `sitemap.xml` missing `/marketplace`; `capabilities.js`'s capability menu out of sync with the doc it claims to mirror (missing `generate_document`); and the biggest one — `/docs/**` (18 pages, previously invisible to any non-JS-executing crawler) now gets real server-rendered HTML via an extension of the existing `publicSeoRenderer.js`, the same proven pattern already used for `/`, `/marketplace`, `/c/**`.

## Open — real gaps, not yet touched

**The sandbox's own code only generates 3 of the 7 real SDK files.** Verified directly: `LiveCodePanel.jsx` hardcodes exactly `intent.md`, `canvas-tabs.json`, `rules.yaml` — regardless of which of the 9 sandbox steps you're on. It never generates `service.js`, `sample-data.js`, `worker-spec.json`, or `tests/assertions.md`, and uses `.yaml` for rules where the real SDK template uses `.md`. Fixing the *docs* to describe the real 7-file structure (done today) doesn't fix this — a creator who scopes a worker in the sandbox still gets an incomplete, wrongly-named starting point relative to what the SDK repo actually expects. This is real feature work in the sandbox's own code generation, not a doc fix.

**Internal rule nicknames are exposed verbatim in the public SDK repo.** `template/intent.md`'s "Platform RAAS Invariants" section names internal principles as "Trump Rule," "Britney Rule," "Reagan Rule." This is real, substantive content (not touched today — only the dead cross-references around it were fixed) sitting in a public, open-source GitHub repo. Worth an explicit decision: keep as-is, or rename to professional-sounding equivalents for public consumption. Not something to rename unilaterally.

**`/whitepaper` and `/creators/journey` are listed in `sitemap.xml` but still not server-rendered** — same invisible-to-crawlers problem `/docs/**` had, not yet extended to these two. Lower priority than docs (which is done), but real.

**Homepage title tag showed generic "SOCIII" instead of the full `HOMEPAGE_COPY.title` during today's verification** — inconsistent with the h1 body content, which was correct. Likely a caching artifact (5-minute Cache-Control on the `publicSeo` function) rather than a regression from today's changes, since the title-injection regex wasn't touched — but not independently confirmed as merely cache, worth a clean re-check once cache has cycled.

## Open — Business in a Box pricing (verified against actual Stripe/billing code)

**Seat count discrepancy: the actual system uses 5 included seats everywhere, not 4.** `config/pricing.js` and the live pricing page both say 5 and agree with each other — neither matches the 4 stated when this was asked about. Worth confirming which number is actually intended before treating either as correct.

**Base $99/mo + included seats: fully implemented, real Stripe Price IDs, genuinely wired at Checkout.** Not a gap.

**$5/seat overage: partially implemented, one real gap.** The price object exists, but nothing re-syncs a subscription's seat quantity after signup when a workspace's membership count grows — `seatCount` is set once at Checkout and never updated. A tenant that grows from 5 to 10 seats keeps paying the 5-seat price indefinitely. Real under-billing risk as teams grow, not a display issue.

**100% markup on pass-through fees: the mechanism is real and already used correctly for most sources — but e-signatures were never wired into it.** `services/billing/dataFee.js` is a genuine, live system already applying 2.0× markup to Apollo, ATTOM, MLS, NOTAMIFY, and Kling video generation. Dropbox Sign (the real e-signature integration, confirmed to exist) has zero references to this system — signature costs are not currently passed through with any markup, or billed separately at all.

## Recommended sequencing

None of this is urgent overnight-blocking work — flagging it so it has a home, not asking for immediate action. If prioritizing: the seat-count sync gap and the e-signature markup gap are the two with direct revenue impact (under-billing), so probably first if this list gets picked up again.
