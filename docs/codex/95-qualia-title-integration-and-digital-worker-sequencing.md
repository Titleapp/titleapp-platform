# CODEX 95 — Qualia Integration & Title-Vertical Digital Worker Sequencing

**Status:** Scoping doc only. Nothing built yet. Blocked on Qualia's own response to the pending capability/access request.

**Client:** Attorneys Title, Athens TX (Chad Hardgrave & Troy Garris, via Mike Lee intro). Real, signed customer — first live PETRA/title deployment outside demo tenants.

**Confidentiality note (read before sharing this doc anywhere):** §6 of this doc contains a long-term strategic thesis that must never reach Qualia, and should not go in front of Chad/Troy, an investor deck, or any external channel until Sean has explicitly decided it's real strategy rather than a hypothesis worth tracking. The working plan in §1-5 is what's actually being built and communicated externally; §6 is a separate, internal-only note.

**Inputs to this doc:** an external memo (*Dev Memo: Qualia Integration & Digital Worker Roadmap*) from a separate Claude session, scoped against the Hardgrave/Garris engagement. Two of its central factual claims were independently verified this session before being trusted (per standing practice — don't act on secondhand AI research without checking ground truth):
- **Qualia has native RON already built in** (launched 2020) — confirmed via ALTA, HousingWire, Inman, and Qualia's own site; described as "the only remote online notarization solution natively built into a title production software." Texas was one of the six original launch states. **This corrects an earlier outbound email to Chad/Troy that pitched Proof.com as a separate RON vendor to lead with — that email is likely solving a problem they don't have.**
- **This item went through two rounds of red-team review without a decision getting made — flagged explicitly as a pattern, not just an open fact.** The plan was "wait for the Qualia rep to confirm RON package status before correcting," which could take days through a two-hop relay (§5), while Chad/Troy — experienced title/mortgage people — could notice the mismatch themselves in the meantime. **Owner: Sean. Deadline: today, 2026-09-18, independent of when the rep responds.** A ready-to-send holding note (below) doesn't require the pricing answer, doesn't correct anything yet, and only acknowledges that a recommendation is being double-checked — this converts an open-ended "wait for confirmation" into a same-day action, decoupled from the actual correction.

> **Draft holding note (ready to send, not yet sent — awaiting Sean's go-ahead):**
> "Chad, Troy — quick note before we go further on the RON vendor conversation: we're double-checking your Qualia RON configuration and package details before finalizing our recommendation on notary tooling. Didn't want that to sit unaddressed — will follow up shortly with the full picture."
- **Nango (nango.dev) has a real, documented pre-built Qualia connector** (`nango.dev/docs/api-integrations/qualia`) handling GraphQL auth for both Qualia's Partner and Platform APIs — confirmed real, worth evaluating against a native GraphQL client build.

Everything else attributed to the external memo below is relayed, not independently verified against Qualia's actual (partner-gated) documentation — flagged inline where it matters.

---

## 1. Executive summary

- **The integration question is not "how do we attach RON" — Qualia already has it.** The real opportunity is putting a Digital Worker into the coordination and audit work that still requires a human today, around infrastructure Qualia already runs.
- **Qualia API access is not self-serve.** It's capability-gated, contact-sales, HTTP Basic auth over GraphQL, split across a Partner API (`connect.qualia.io`) and a Platform API (`{subdomain}.qualia.io}`). Sean has submitted the access request; it must route through Chad/Troy as the actual account holders. **Blocking, in progress** — a consolidated question list has already gone to Chad/Troy (separate email, sent 2026-09-18) covering exactly what capabilities are requested, which API track, pricing, RON package status, underwriter data source, and Qualia Connect/accounting API access.
- **Fee structure for API access is a real unknown, not a research gap.** No published metered/per-call pricing exists anywhere public. This is now part of the question list sent to Chad/Troy's rep — do not model integration economics until a real quote comes back.
- **The scaling bottleneck at real volume (30 → 3,000 closings/month) is notary signing capacity, not automation** — a live, synchronous human event with a hard practical ceiling. **Caveat added after red-team review:** the ~8-12 RON signings/notary/day figure originated as a reasoning estimate in the external memo, not a sourced industry number. Treat it as directional only — before it's load-bearing for any real capacity model or a claim made to Chad/Troy, it needs an actual source (a RON vendor, a working notary marketplace, or industry data). This reframes the Digital Worker's role at scale as *dispatcher* (matching ready files to available notary capacity via a marketplace), not notary replacement. See §4.
- **The demand side matters as much as the supply side, and this doc's own sections disagreed on sequencing until this revision.** §3 originally listed the marketing/AI-discovery worker third, after both ops workers, while this summary argued it should be phase 1 given the AEO/GEO discovery-window advantage decays over time while the ops-automation value doesn't. **Resolved:** the marketing/AI-discovery worker (CODEX 94 §4/§4A) should be scoped and started in parallel with the closing-coordination worker (§3.1), not sequenced after it or after the audit-trail worker — see §3 for the corrected ordering.

---

## 2. Qualia platform context (relayed, needs direct verification once access clears)

- **Core** — title & escrow production, the system of record.
- **Connect** — client-facing closing portal (messaging, document sharing, e-sign, status updates).
- **Marketplace** — vendor ordering layer: title search, surveys, release tracking, RON-authorized notaries.
- **RON** — Qualia's own native remote online notarization (confirmed real, see above).
- **Accounting/Reconciliation** — escrow accounting, fraud protection, an "Audit Readiness Dashboard" and "SAFER Daily Update" reporting (flags: file shortages, stale overages, uncleared credits, lienable outstanding items).
- Client underwrites with **Stewart** (via Stewart Access) and **Old Republic Title** (via ezJacket), both integrated directly into Qualia. **Not yet confirmed which one (or both) is the actual day-to-day title-report source** — on the question list sent to their rep.

---

## 3. Where Digital Workers plug in (near-term, real plan)

Ordered by build sequence, matching the lowest-data-integration-complexity-first principle already used elsewhere in this codebase. **Corrected after red-team review — the marketing worker runs in parallel with track A, not after it, since sequencing it third undercut this doc's own urgency argument (§1):**

**Track A — ops, sequential:**
1. **Closing-coordination / customer-service worker (build first).** Scheduling RON sessions, sending prep instructions/reminders, handling client-facing status updates via Qualia Connect. This is the direct "2-person team scales" proof point — a human currently coordinates each signing manually; a worker carries that load while Chad/Troy (or their notary) still perform the actual signing. Lowest integration complexity — mostly Connect-adjacent messaging/scheduling, not deep accounting data.
2. **Audit-trail / compliance worker (build second).** Sits on top of Qualia's existing Audit Readiness Dashboard / SAFER Daily Update data — does not rebuild it. Auto-triages flagged items, drafts resolution notes, keeps a standing compliance log. Directly in Troy's regulatory wheelhouse. Genuinely demonstrable to investors as risk-reduction, which makes it a strong RegCF-adjacent proof point independent of this specific client.
3. **Title search / curative worker (defer, after Track A).** Highest-value, highest-complexity build. Do not start until Qualia API access and the real underwriter/Marketplace data path are confirmed (§2's open question).

**Track B — demand side, starts now, in parallel with Track A, not after it:**
1. **Marketing / AI-discovery worker.** GBP/profile hygiene, review response, citation-ready content — this is the same capability as CODEX 94 §4/§4A, built against this client as the pilot. Runs on its own timeline (content/entity work, not Qualia-API-dependent) so it isn't blocked waiting on Qualia's access approval the way Track A is.

*(Renumbered per red-team review — the original draft kept the pre-split build-order numbers 1/2/4 on Track A with Track B as "3," which read fine with context but would confuse anyone skimming just the numbers later. Each track now numbers independently.)*

---

## 4. Scaling model: 30 → 3,000 closings/month (relayed, logic checked, not independently re-derived)

| Stage | Scales with headcount today? | How it scales at 100x volume |
|---|---|---|
| Order intake | Yes | Fully automatable — Digital Worker, near-zero marginal cost |
| Title search / exam | Yes | Worker assembles it; licensed examiner/attorney signs off only on flagged defects |
| Curative | Yes, heavily | Worker drafts curative requirements; human review limited to actual exceptions |
| Commitment / policy issuance | Somewhat | Automatable via underwriter integrations (Stewart Access, Old Republic ezJacket) |
| Closing doc prep & QC | Yes | Fully automatable (RESPA/TRID checks) |
| Scheduling & client coordination | Yes | Fully automatable |
| **Signing / notarization** | **Yes — hard floor** | **Cannot be automated away — a RON session is a live, synchronous human event. Solved by capacity (a distributed notary marketplace), not AI.** |
| Post-closing accounting | Yes | Worker sits on top of Qualia's existing Audit Readiness/SAFER data |

**Where the ceiling actually moves:**
1. **~30 → ~300/mo:** intake, doc prep, and scheduling automation alone covers most of this jump.
2. **~300 → ~1,000/mo:** notary capacity becomes the binding constraint — this is where an on-demand notary marketplace layer needs to be live (Qualia's own Marketplace already has RON-notary vendor relationships — evaluate plugging into that before building a separate one). Curative volume needs real triage so Chad only sees genuinely defective files.
3. **~1,000 → ~3,000/mo:** underwriter relationship limits become the real ceiling, not tech — Stewart/Old Republic agency agreements typically carry volume expectations, E&O coverage tied to production levels, and state licensing/appointment caps. Needs Chad/Troy looping in their underwriter reps early; SOCIII can build unlimited software capacity and still hit a wall here.

**Gap flagged after red-team review, not urgent now but don't lose it: this entire model is implicitly Texas-only.** Attorneys Title operates in Athens, TX, and RON commissioning/notary licensing is state-specific. If reaching 3,000/month ever implies expanding beyond Texas — which a volume target that large plausibly does — each new state adds its own RON/notary licensing and appointment complexity that isn't modeled here at all. Revisit this the moment the volume conversation gets concrete rather than assuming the Texas model just extends.

---

## 5. Open questions (already sent to Chad/Troy's Qualia rep, 2026-09-18)

- What capabilities does the access request actually cover — orders, documents, messaging, contacts, accounting/reporting, or all of it?
- Partner API vs. Platform API track, or both?
- Is API access included in the current subscription, or separately priced — and what's the real quote?
- Real docs.qualia.io access once approved.
- Is RON included in their package or a paid add-on, and at what price?
- Is RON session data (scheduling, recordings, status) exposed via API/Marketplace, or UI-only? (Determines whether the coordination worker in §3.1 can be fully API-driven.)
- Stewart Access vs. Old Republic ezJacket — which is the actual day-to-day title-report source?
- Is Qualia Connect accessible via API for automated client messaging?
- Is Audit Readiness/SAFER data accessible via API?

**Bottleneck flagged after red-team review:** all nine of the above are routed through Chad/Troy as the relay to their own Qualia rep — a two-hop chain through two busy founders who are themselves new to this engagement, several of whom may not know the answers offhand (their own subscription's capability scope, whether RON is a paid add-on) and have to go ask. **Owner: Sean. Action, not yet done:** check whether he can get a direct Qualia partnerships/BD contact, given the API access request is already independently pending with Qualia on a separate track — that could accelerate the capability-quote and RON-status questions specifically without waiting on client bandwidth. No deadline set yet since this depends on whether such a contact is findable at all — first step is simply Sean checking his own network/LinkedIn for one before treating this as a dead end.

---

## 6. INTERNAL ONLY — do not share externally, do not put in any Qualia-facing, client-facing, or investor-facing material

Sean's stated longer-term thesis (2026-09-18): use this engagement to learn Qualia's workflow deeply, then move toward SOCIII becoming the primary production system for a title company, reducing Qualia to a property-data source rather than the system of record.

**Why this needs to stay internal and unstated for now:**
- Qualia's API access request is currently pending, gated on their own sales/partnership approval. Any signal that the requesting party's actual goal is to disintermediate Qualia's core product would very reasonably get that request denied outright.
- "Just pulling property data" undersells what Qualia's Core product actually does — closing document generation and RESPA/TRID compliance, escrow accounting/disbursement, e-recording, state-certified RON, and direct underwriter relationships (Stewart Access, Old Republic ezJacket) that carry their own licensing, E&O, and agency-agreement requirements independent of software. Replacing all of that is a company-level bet on the scale of building a second Qualia (1M+ users, years of regulatory relationships) — not a natural extension of the current pre-seed engineering roadmap.
- The near-term plan in §1-5 is fundable and buildable now specifically because it does NOT require replacing Qualia — it's a Digital Worker layer on top of infrastructure that already works. Conflating the two plans risks scope creep into a multi-year, capital-intensive build that the current raise doesn't fund and the deck doesn't describe.
- **Added after red-team review — the blast radius is bigger than just the Qualia relationship.** SOCIII's whole growth model depends on getting access requests approved by incumbent gatekeeper platforms across multiple regulated verticals — not just Qualia in title, but whatever the equivalent platform is in MSR, nursing education, DPP, and any future vertical. If it ever became known — even informally, even without an actual leak, just through industry chatter among platform partnership teams who talk to each other — that SOCIII's standing playbook is "get inside a platform's workflow, then plan to replace it," that's a pattern every future gatekeeper in every vertical would be right to be wary of, not just Qualia. This isn't an argument against having the thought; it's an argument for it staying explicitly hypothesis-labeled and tightly held.
- **Also added after red-team review — a future-hire risk, not just an external one.** A future SOCIII employee who finds this doc without the context of today's conversation could easily read §6 as established company strategy rather than a flagged, speculative thought Sean had once. Whoever owns this doc long-term should make sure that distinction survives — re-label or re-confirm this section's status periodically, don't let it go stale as settled fact by default.

**Operational security note, added after red-team review:** "internal only, don't share externally" is a labeling convention on a plain markdown file in a shared repo — not a real access control. This file has already been read by more than one AI session as ordinary context. If the actual sensitivity level is "this must never reach Qualia or become discoverable," a tracked repo file co-located with the client-facing working plan (§1-5) may not be the right home for it. **Flagged to Sean directly, his call to make:** consider moving this section out of the committed doc entirely — into a private note, a system with real access restriction, or nowhere written down at all — rather than relying on the header label to do that work.

**If this becomes real strategy rather than a hypothesis:** it needs its own separate scoping doc, its own capital/timeline conversation, and an explicit decision about whether SOCIII actually wants to become a title-production-system competitor — not something to back into by extension of the current Attorneys Title Digital Worker build.
