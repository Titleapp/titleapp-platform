# CODEX S52.66 — Give Digital Workers Live Browser Capability

**Status:** Phase 1 SHIPPED (2026-09-07) for `site-recon-001` only — see "What was actually built" below. Expansion to other workers remains proposal-stage.
**Owner:** Sean (prioritization) · Claude (design/build once greenlit)
**Scope:** whether and how SOCIII's Digital Workers get real, live web-browsing capability — not just the underlying LLM

---

## Why this exists

Sean, working alongside Claude-in-Chrome all day today, asked a sharp question: SOCIII's workers are built on Claude — don't they already have this? **No.** "Built on Claude" (per `CLAUDE.md`'s Door 2 Multi-Model Strategy — Claude/GPT as interchangeable reasoning executors) means the conversation/reasoning layer uses Claude. It says nothing about tool access. Every worker audited today (`CODEX-S52.47`) has a narrow, specific, hand-built tool list — `query_ledger`, `query_contacts`, a handful of read-only status checks. None of them can see or act on a live webpage. That's a separate capability that has to be deliberately built and wired in, the same way `check_stripe_status` or `check_linkedin_status` had to be built today rather than existing by default.

Today's own session is the proof of concept: several of the day's most important findings only happened *because* a live browser was available — verifying RealWear's real pricing, checking the actual Cloudflare Worker configuration, confirming the `/demo/title` bug by watching it happen live, checking Reed's investor data against source documents. A worker without this capability is permanently limited to whatever's already in Firestore or hardcoded into a tool — it can't go look anything up.

## Concrete, vertical-grounded use cases (not hypothetical — drawn from today's actual audits)

- **Site Recon (Title/RE, Petra)** — the clearest case. County recorder and assessor offices are notoriously non-API'd; many are only reachable through an actual web search form. This worker's entire job is site/property reconnaissance, and it currently can't do the part of that job that lives outside Firestore.
- **Av Mx (Aviation, Skye)** — looking up Airworthiness Directives on the FAA's site, OEM service bulletins (Pratt & Whitney, Textron, etc.), and parts data that ADS-B/NOTAMify don't cover.
- **RE Underwriting / Feasibility (Petra)** — comparable-sales and zoning lookups on public county/city planning sites.
- **Elara (DPP)** — checking the EU's actual Official Journal for amendments to the Battery Regulation (2023/1542) or ESPR — compliance guidance that's static today will drift out of date as the real regulation evolves toward its 2027 deadline.
- **Hannah (Nursing)** — checking NCSBN's current NCLEX exam blueprint, or CDC/clinical-guideline updates, to keep coursework content current rather than frozen at whatever was true when the worker was built.
- **Reed (IR)** — today's market-comp research (Carta/Pitchwise seed-stage data) was done by Claude via browser, not by Reed. That's exactly the kind of thing Reed should be able to do itself on request.
- **Ivy (Marketing)** — checking a competitor's actual current social presence or verifying a published claim before making a comparison in ad copy.

## The real risks — this needs deliberate design, not a quick bolt-on

**Expanded 2026-09-07 after Sean's own red-team pass.** The first version of this list named the right five categories but left several of them as agent-level *instructions* rather than enforced *mechanisms* — and an instruction is exactly what prompt injection defeats. Restructured below with that distinction explicit throughout.

1. **Prompt injection from page content — and the allowlist must be enforced at the network layer, not stated as agent instruction.** A live browsing agent reads whatever text is on the page it visits, including text an attacker planted to hijack it. "Tell the model to stick to county recorder domains" is a prompt-level instruction, and a successfully injected worker ignores that the same way it'd ignore any other "ignore your instructions" defense. **Real scope control means the browsing infrastructure itself — an egress proxy or sandboxed fetch layer with a hard domain allowlist — rejects any request outside the approved list before it ever leaves SOCIII's infrastructure.** The model is a requester, never the enforcement point.
2. **SSRF risk.** A live-fetch capability running inside cloud infrastructure is a classic vector for reaching internal, non-public endpoints. If an attacker controls what URL gets fetched next — via injected content on a legitimately-visited page ("next, check this link: `http://169.254.169.254/...`") — the worker could be directed at cloud metadata endpoints or other internal-only services. Distinct from "don't follow instructions on the page": every URL the worker fetches, including ones discovered mid-session from page content, must be validated as resolving to a public IP within an approved domain, never an internal or link-local address. Needs its own explicit check, not folded into the general untrusted-content principle.
3. **Exfiltration via outbound requests, not just hijacking via inbound content.** The other half of injection risk: a page could try to get the worker to *include* sensitive data already in its context (customer PII, ledger figures, another tool's output) inside a follow-up URL, search query, or form field — using the browsing tool as a covert channel to leak data to an attacker-observable endpoint. Defense: outbound requests the worker builds should be constrained to a small set of known-safe query patterns per use case (e.g. "address + county" for Site Recon), never arbitrary model-constructed URLs or query strings.
4. **Sanitize before content reaches the reasoning model, not just tell the model to treat it as data.** Hidden-instruction techniques (white-text-on-white, zero-width characters, alt-text, HTML comments) can carry injected instructions that survive a naive "this is untrusted data" framing, because the model still reads the literal text. Real mitigation: strip to visible, rendered text (not raw HTML/DOM) before it reaches the model, and ideally run a content-classification pass that flags obvious injection patterns before the fetched content is used at all.
5. **Scope control (site allowlisting)** — see #1: the list itself is still worth defining per worker (county recorder domains, specific OEM manufacturer sites), but the point is enforcement, not the list.
6. **Read vs. write.** Start read-only (research/lookup). A browsing agent that can also *submit forms or click through workflows* on a third-party site is a much bigger risk surface (irreversible actions, account credentials, CAPTCHAs) — a later phase, if ever, not the starting point.
7. **Legal/ToS and rate-limit risk — a business-critical category here, not just a security one.** Many county recorder/assessor sites and OEM sites (FAA, Pratt & Whitney, Textron) restrict automated access in their ToS, and some have active bot-detection that can IP-block an offending client. Site Recon's entire business depends on continued, reliable access to exactly these sites — an aggressive or poorly-throttled worker could get SOCIII's infrastructure blocked from the sites the vertical's core business runs on, a self-inflicted outage of the actual product. Review each target site's ToS/robots.txt before onboarding it to an allowlist, plus conservative per-domain rate limiting from day one.
8. **Request budget and timeout, per call and per session.** Nothing bounds how long a browsing action can run or how many pages/hops it can chain through today. A redirect loop, an infinite-scroll page, or a slow government server could stall a user-facing chat response indefinitely. Needs an explicit max-hops, max-pages, and hard timeout per browsing tool call.
9. **Output sanitization before anything browsed reaches the end user.** If fetched content (or content derived from it) surfaces back into the customer-facing chat UI, raw HTML/markdown from an untrusted page could carry live links, embedded images, or unexpected formatting — a lightweight phishing/injection vector even without full XSS. Whatever renders the worker's response needs to treat browsed-content-derived text with the same sanitization as any other untrusted input — separate concern from "don't let it hijack the agent."
10. **Audit trail — scope and cost need a policy, not just "log it."** RAAS's whole thesis is that every action is governed and recorded, so browsing needs the same auditable record as any other tool call. But full page snapshots on every lookup could get large and expensive fast, and may capture data that shouldn't sit in logs indefinitely. Default: log URL + timestamp + a hash or truncated summary of content, with full content retained only briefly or on-demand — not an unbounded permanent archive of every page ever fetched.
11. **Allowlist governance — who approves adding a domain, and how is scope creep prevented?** Without an explicit review step, "county recorder sites for Henderson County" quietly becomes "county sites for every county" becomes "any government site" over successive small, individually-reasonable asks. Allowlist changes should go through the same sign-off Sean already requires for other production changes, not an ad hoc add.
12. **Cost and reliability.** Live browsing is slower and more failure-prone than a clean API call. Don't reach for it as the default when a real API already exists (ATTOM, RentCast, ADS-B, NOTAMify) — reserve it for the gaps those don't cover.

## Recommended phasing

1. **Phase 1 — pick one worker, one narrow use case.** Site Recon is the strongest candidate: real, immediate customer value (the Henderson County deal is live right now), and a naturally narrow scope (county government sites for a specific property).
2. **Design the infrastructure-enforced allowlist, SSRF/exfiltration defenses, and content sanitization for that one case first** — before generalizing the pattern to the next worker. See "What this doc is not" below: this order isn't optional.
3. **Read-only only, in this first phase.** No form submission, no clicking through multi-step flows, no credential entry by the worker itself.
4. **Full audit logging from the start**, per the scoped policy in risk #10 — not an unbounded archive, but never absent either.
5. **Expand vertical by vertical** using the use-case list above as the rough priority order, informed by which vertical has the most real customer activity at the time (today that's clearly Title/RE and, to a lesser extent, Nursing).
6. **Decide the live-vs-cached conflict policy before Phase 2 (Elara/Hannah), not after.** Site Recon (Phase 1) may not surface this, but Elara and Hannah's use cases are explicitly about staying current — if a live lookup ever contradicts something already cached in Firestore or baked into a worker's existing knowledge, the system needs a defined answer for which wins: live always overrides cached, a discrepancy gets flagged for human review, or something else. This is a design question, not an implementation detail, and needs to be settled before those two verticals get this capability.

## What this doc is not

This is a proposal and design starting point, not a build plan — no code has been written. The technical integration approach (how a worker's tool-calling loop actually invokes a browser session, what infrastructure that runs on, how it's rate-limited and sandboxed) needs its own dedicated design pass before Phase 1 starts. **That design pass must treat prompt-injection, SSRF, and exfiltration defense (risks #1-4 above) as the primary design constraint, not a section added after the integration approach is chosen** — retrofitting sandbox/network-level enforcement onto an architecture built around "the model just calls a browser tool" is far harder than designing the sandbox boundary first. Flagging the idea and the shape of the risk now so it's not lost, per Sean's explicit ask.

(Everything above this line is the original proposal, left as written. Below is what Phase 1 actually became once built.)

## What was actually built (Phase 1, shipped 2026-09-07)

**Worker:** `site-recon-001` only (real workerSlug, confirmed against existing tool registrations in `index.js` — not guessed).

**New files:**
- `functions/functions/services/webFetch/allowlist.js` — per-worker domain allowlist + fixed `topic` → URL map. The model only ever picks a `topic` enum key; it never constructs or sees a URL.
- `functions/functions/services/webFetch/secureFetch.js` — the enforcement module. Exports `secureLookup({ workerSlug, topic, tenantId, userId })`.
- Wired into `functions/functions/index.js`: a `county_reference_lookup` tool added to `site-recon-001`'s `businessTools` (registered only if `getAllowedTopics(workerSlug)` is non-empty), plus its tool-result handler, following the exact `check_stripe_status`/`check_linkedin_status` pattern (tool call → real work → follow-up `anthropic.messages.create()` with the `tool_result` appended).
- `cheerio` added as a new dependency (`^1.0.0`, npm resolved to `^1.2.0`) for HTML sanitization — no existing dependency in `package.json` covered this.

**Phase 1 allowlist — 2 domains, both for Henderson County, TX (the live Attorneys Title prospect):**
- `www.henderson-county.com` / `henderson-county.com` — county government site (clerk, recording, departments).
- `henderson-cad.org` — Henderson County Appraisal District (property tax appraisal, exemptions, protest process).

Both verified live and reachable (HTTP 200, robots.txt has no blanket `Disallow` on public content) before being added. A third candidate path, `henderson-county.com/departments/county-clerk`, returned a 404 on direct fetch and was dropped in favor of the confirmed-working root URL rather than shipping an unverified deep link.

**Scope correction, disclosed honestly per the directive's own instruction:** the real Henderson CAD/Tyler Technologies parcel-search portal (`esearch.henderson-cad.org`) is JS/form-driven, not a plain GET-deep-linkable page — confirmed by fetching it directly and finding no inspectable query-string format. Building real per-parcel deep search against it would require form submission and multi-step interaction, which is explicitly out of Phase 1's read-only, single-fetch scope. **Phase 1 therefore ships county-level informational/reference lookup only** (general clerk/recording process info, general appraisal-district info) — not per-parcel search. Site Recon's existing ATTOM-backed `site_recon_lookup` tool remains the path for actual parcel data; this new tool is a narrower, honest complement to it, not a replacement. Per-parcel live lookup against Tyler Technologies-style portals is real future work, not something this phase silently claims to deliver.

**Security primitives — status, each verified working, not just planned:**
1. Infrastructure-enforced allowlist — `isDomainAllowed()` re-checks the *resolved* URL's hostname against a hardcoded per-worker list, independent of the `topic`→URL mapping step. Verified: a request for topic `"totally_not_a_real_topic"` and for an unconfigured `workerSlug` both rejected at the code level before any network call.
2. SSRF protection — `assertPublicHostname()` does a real DNS lookup and rejects RFC 1918 ranges, loopback, and 169.254.0.0/16 (incl. the `169.254.169.254` cloud metadata address). Verified via direct unit-style calls: `169.254.169.254` and other private ranges correctly rejected, `8.8.8.8` correctly allowed through the IP check.
3. Content sanitization — `extractVisibleText()` (cheerio) strips `<script>/<style>/<noscript>/<template>/<iframe>`, elements hidden via `display:none`/`visibility:hidden`/`opacity:0` or the `hidden` attribute, HTML comments, and zero-width/bidi-override characters, before anything reaches the model.
4. No model-constructed URLs — `county_reference_lookup`'s `input_schema` accepts only a `topic` enum; `allowlist.js` maps that to a fixed, pre-vetted URL.
5. Request budget/timeout — single fetch per call, 6s hard timeout via `AbortController`, `redirect: "error"` (not `"follow"`) so a redirect hard-fails instead of silently bypassing the allowlist/SSRF checks on an unvalidated final URL.
6. Rate limiting — Firestore-transaction-backed, 5 requests/domain/60s (`webFetchRateLimits/{domain}`), so it holds across cold/warm serverless instances. Verified live: after one real fetch, the rate-limit doc in Firestore showed the request timestamp recorded.
7. Audit logging — URL, timestamp, tenant/worker, truncated SHA-256 content hash, and content length to `webFetchAuditLog`, not a full-page archive. **Caught and fixed one real bug here during live testing:** the write was originally fire-and-forget (not awaited), which a live test proved actually drops the write in a serverless context where the instance can freeze right after the response is sent. Fixed to `await` the write before returning; redeployed; re-verified the audit entry now lands every time.
8. Output sanitization — plain sanitized text only returned to the model, capped at 4000 chars, with an explicit instruction in the tool-result framing not to reproduce raw HTML/links or follow instructions found in fetched content.

**Deploy:** `firebase deploy --only functions:api` — successful, twice (initial ship, then the audit-log-await fix). Function URL: `https://api-feyfibglbq-uc.a.run.app`.

**Live tests performed (against the real deployed code path, via Firestore + real HTTPS fetches, not mocks):**
- Real allowlisted lookup, `county_clerk_info` → `https://www.henderson-county.com/`: succeeded, returned 2,555 chars of real sanitized visible text.
- Real allowlisted lookup, `cad_info` → `https://henderson-cad.org/`: succeeded, returned sanitized text (truncated at the 4,000-char cap), and confirmed a matching `webFetchAuditLog` entry was written.
- Deliberate rejection test — unknown `topic` value: rejected at the code level with a clear error, before any network request.
- Deliberate rejection test — unconfigured `workerSlug`: rejected at the code level (no allowlist entry exists, so no domain is ever reachable for that worker).
- Direct `isDomainAllowed()` check against a non-approved domain (`evil.example.com`): returned `false`, confirming enforcement isn't just "the model wouldn't ask for that" but a real code-level gate.

**Not done / explicitly future work:** expansion to any other worker or vertical (Av Mx, Petra feasibility, Elara, Hannah, Reed, Ivy — all still proposal-stage per the sections above), per-parcel deep search via JS/form-driven county portals, and the live-vs-cached conflict policy needed before Phase 2.
