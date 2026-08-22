# CODEX S52.61 — "Add Client" Across the Business-in-a-Box Suites (Draft v1)

**Status:** Draft for red-team — not yet built. This codex exists to think the use case through before anything gets coded, per Sean's request (2026-08-22).

**Origin:** A chain of live demo QA today (DPP, Real Estate Advocate, RE Escrow/Law Landuse/Underwriting/Marketing/Commitment) surfaced the same gap independently in every vertical: there is no way to onboard a new client and get them real, scoped access to a worker — a human has to talk to Alex in chat and hope, and there's no self-serve path at all. This codex generalizes that into one capability instead of solving it per-vertical.

---

## 1. Purpose

Define a single, reusable **"add client"** capability — onboarding a person or organization and provisioning their real, scoped access to one or more workers — that works the same way across every business-in-a-box demo suite, with two entry points (manual, automated) and vertical-specific rules about what the client actually sees.

**Non-goals for this pass:** building per-vertical agreement/disclosure legal text (needs real drafting per vertical, not fabricated), building the system-to-system integrations that would drive full automation (MLS, loan origination, manufacturer ERP — architected for, not built), fixing the three unbuilt RE workers (Commitment, Underwriting, Marketing — tracked separately), or resolving Aviation/Auto-Dealer's customer-facing portals (don't exist yet, out of scope here).

---

## 2. Core concept: one capability, two triggers

There is exactly one underlying "add client" capability. It has two ways to fire:

**Manual** — a human (staff, consultant, compliance officer) clicks "+ Add Client" in a worker's UI:
1. Search the existing Contacts roster and select someone already on file, or create a new contact inline.
2. Select which worker(s) this client should have portal access to (defaults to the worker you launched from; others selectable).
3. If required, send a disclosure/agreement for e-signature.
4. On completion: a real Contacts record exists, and the client has real, working portal access to whatever was selected — not a database row that still needs someone to "actually" set them up.

**Automated** — the identical capability fires without a human clicking anything, triggered by:
- A marketing/lead-capture signup flow (a prospect fills out a form, accepts the disclosure via e-signature themselves, and lands with real portal access — no staff involvement), or
- A system-to-system integration (a manufacturer's production system creating a new SKU under an existing client relationship, a loan origination system creating a new loan+borrower, an MLS integration creating a new transaction client) — architecture only, not built in this pass.

The disclosure/agreement step applies to **both** paths. For manual, staff triggers the send. For automated self-serve, the prospect signs it themselves as part of the signup flow. For automated system-to-system, the agreement is typically signed once at the relationship level (a master services agreement) and referenced by every subsequent automated addition, not re-signed per record — this matters most for DPP (see §4.3).

---

## 3. The shared backend capability

Three pieces, all reusing infrastructure that already exists and already works — this is not new plumbing, it's wiring:

- **Contacts** — the existing, already-working CRM record (`/v1/contacts:add`, real button in `Contacts.jsx`). Every client is a Contacts record first.
- **Portal access provisioning** — grants the client real, scoped access to specific worker(s). **Correction from red-team pass:** the earlier framing here ("reusing infrastructure that already works") overstated readiness. `/v1/demo:token`'s provisioning is confirmed (CODEX S52.62 §2) to be a hardcoded demo-only mechanism (a static `PERSONAS` map keyed to fixed demo uids), not a generalized production path. What this codex actually proposes is *adapting* that pattern — same shape (membership + workspace/portal-scoped access), but generalized to accept any real client and any per-client access selection instead of a fixed map. That generalization is real new work, not pure wiring, and should be scoped/estimated as such.
- **Disclosure / e-signature** — reuses `services/esign/esignService.js` (BoldSign + native fallback, already a real working token-based signer flow, not a stub). Content is vertical-specific (see §5), not generic boilerplate.

Every onboarding — manual or automated — writes an audit-trail entry: who/what triggered it, what was agreed to, when, and what access was granted. This matches the platform's existing append-only-record invariant (CLAUDE.md) rather than being a new pattern.

**Lifecycle gaps, added per second red-team pass — both documents originally only modeled creation, not the full lifecycle:**

- **Revocation/deprovisioning has no path today, and this is a real gap, not a future nicety.** A lease terminates, a loan pays off or transfers servicers, a student graduates or withdraws, a client leaves — none of that is addressed anywhere in this codex. Given the append-only audit-trail invariant, revocation needs its own event type (an explicit "access revoked" record), not a field flipped in place. **MSR specifically has a compliance stake here, not just a design-cleanliness one:** RESPA/servicing-transfer rules require documented handling of a borrower's portal access when a loan transfers to a new servicer — "we never designed for revocation" is a real compliance gap for that vertical, not just an incomplete feature.
- **Idempotency is unaddressed.** If "add client" fires twice for the same person in the same tenant — a manual staff add followed by an automated lead-capture trigger for the same prospect, or a retry after a timeout — nothing in this design says whether the second call is a no-op, an error, or a silent duplicate Contacts row. An unhandled duplicate here defeats part of CODEX S52.62's purpose even within a single tenant, before cross-tenant matching is ever relevant. "Add client" needs to be idempotent per (tenant, person) — check for an existing or in-flight record before creating a new one.
- **No handling of partial/failed onboarding state.** The flow as described (Contacts creation → portal provisioning → e-signature) reads as atomic, but people abandon signup flows constantly. What happens if e-signature is sent but never completed, or KYC (once §3's decision above is made) fails after the Contacts row already exists? Is there a "pending"/"incomplete" status? Does an incomplete record show up in staff search with no access and no verification, looking indistinguishable from a real client? This needs an explicit status field and a defined incomplete-state behavior, not an assumption that onboarding always completes.

**Does "add client" trigger KYC (Stripe Identity verification) at all? Decided (2026-08-22, Sean).** This matters because CODEX S52.62's entire cross-tenant resolution mechanism depends on a Contacts row acquiring a `verifiedIdentityId` — which only happens if that specific contact actually goes through Stripe Identity verification during onboarding. **Decided:** KYC is **required** for MSR (borrowers) and DPP (the manufacturer's authorized signer — see CODEX S52.62 §1.5 for why this identifies the signer, not the company) since both already handle regulated/financial data; **optional / staff-discretion** everywhere else (e.g., a vet clinic's client roster, Real Estate Advocate's individual buyers) rather than a blanket requirement platform-wide. This default can be revisited per-vertical as each one actually gets built, but it's the standing rule going into Phase 1.

---

## 4. Per-vertical mapping

For each vertical: what "client" means, what manual looks like, what automated means (near-term vs. long-term), and — the question Sean raised directly — whether the client's own view is the **same as** or **different from** the business's own view.

### 4.1 Title / Real Estate suite

- **Client** = buyer/seller/borrower on a specific transaction (Title Search, Defect Tracker, Commitment, Escrow), or an individual home-buyer (Real Estate Advocate).
- **Manual:** title company staff adds a client when a new order comes in, grants portal access scoped to that order.
- **Automated (future):** an MLS or transaction-management integration auto-creates the client + order when a listing goes under contract.
- **Customer view — different** for Title Search / Defect Tracker / Commitment / Escrow: the client sees only their own order's narrow status portal (already the `ClientPortal.jsx` pattern built this session for Garcia/title), never the operator's cross-client dashboard.
- **Customer view — same, as an exception:** Real Estate Advocate. This worker is built entirely from the buyer's own point of view ("I work for you — not the agent, not the seller"). If a brokerage adds a client here, what that client sees isn't a cut-down subset of the business view — it's their own copy of the *exact* consumer experience Sarah is looking at today. This is the one vertical where "add client" grants the client the same tool, not a narrower window into it. This still depends on the still-open decision from earlier today: is Advocate sold to individual consumers directly, or to brokerages managing many clients? Either way the client's view is the full Advocate experience — the open question only affects who's doing the adding.
- **Real, unresolved conflict-of-interest question (red-team finding, not previously flagged):** Advocate's entire value proposition rests on independence from brokerages and agents ("not the agent, not the seller"). A brokerage being the party that *adds* clients to a tool premised on independence *from* brokerages is a structural tension this codex hasn't addressed — real estate already has disclosure regimes around dual agency and undisclosed-principal conflicts, and a brokerage-distributed "independent buyer's advocate" could raise a comparable question. This isn't just "who does the adding" (as the paragraph above frames it) — it likely affects what the disclosure/agreement content in §5 needs to say, and possibly whether brokerage-added clients need to be told plainly that their brokerage initiated the access. Flagged as open, not resolved here.

### 4.2 MSR Servicing

- **Client** = the borrower on a loan.
- **Manual:** compliance officer onboards a new loan/borrower (the "+ Add Loan" capability built yesterday already covers the record-creation half of this; it does not yet provision the borrower a portal login as part of that action — currently a separate manual step).
- **Automated (future):** a loan origination or servicing-transfer system integration creates the loan + borrower + portal access together, no staff step.
- **Customer view — different:** the borrower gets the narrow self-service portal (NOE/RFI, hardship, payoff request, cease-communication — built yesterday), never the compliance officer's portfolio dashboard.
- Per Sean's note: MSR needs both paths available now — a compliance officer/servicer relationship is a real, present-day manual use case, not just a future automation target.
- **Regulatory flag (red-team finding):** the automated path here isn't just "an integration to build later" — a loan origination/servicing-transfer integration touches RESPA/Reg X servicing-transfer requirements and state servicer licensing directly, not the generic "needs real drafting" caveat this codex applies to every vertical's agreement content (§5). MSR is already the vertical with the heaviest compliance lift elsewhere in this project (CODEX S52.60) — this deserves its own specific compliance review when Phase 4 work actually starts here, not a fold-in to the generic disclosure note.

### 4.3 EU DPP (Digital Product Passport)

- **Client** = a manufacturer/brand (e.g., Voltara BV), currently reached through a consultant relationship (Elise).
- **Manual (present-day, real need):** the consultant onboards a new manufacturer client and adds their product catalog/SKUs on their behalf — this is Elise's actual job today, and it needs a real "+ Add Product" (SKU) capability that does not yet exist (flagged in this session's earlier DPP walkthrough).
- **Automated (explicit target end-state, per Sean):** full automation down to the manufacturing level — a manufacturer's own production/ERP system creates new SKUs (and potentially onboards itself as a client) directly, with no consultant in the loop at all. This is the vertical where the automated path isn't a nice-to-have future — it's the actual business model target.
- **Scoping conflict with CODEX S52.62, surfaced in third red-team pass — this is the single most important cross-document finding across all review rounds.** This flagship automation target has no human present to biometrically verify, and S52.62's entire cross-tenant identity-resolution mechanism only works for natural persons who individually pass biometric KYC (see S52.62 §1.5). A manufacturer company cannot itself undergo a biometric check. Resolution proposed in S52.62 §1.5, needing Sean's explicit sign-off: cross-tenant resolution is scoped to natural-person clients only; organizational/B2B clients like a manufacturer are structurally out of scope for this specific mechanism and would need a separate one (e.g., business-registration-based) if wanted later. The literal "manufacturer's ERP onboards itself as a new client with zero human ever" case is the sharpest edge of this and isn't resolved by anything currently designed — it would be an inherently unverified, lower-trust relationship by this mechanism's own standard unless a deliberate compensating control (e.g., a human signer at initial relationship setup, even if every subsequent SKU is fully automated) is built in.
- **Agreement structure:** because of the above, DPP is the clearest case for a relationship-level agreement rather than a per-record one — Voltara BV signs one master agreement with the consultant/platform, and every subsequent automated SKU addition references that existing agreement rather than triggering a new signature request per product.
- **Customer view — different:** the manufacturer's own team would see their own passport generation queue and compliance status for their own SKUs, not the consultant's cross-client view (if the consultant serves multiple manufacturer clients, which is the expected real shape).
- **Compliance gate needed for the automated end-state (red-team finding):** a Digital Product Passport is an EU-regulated compliance artifact (Battery Regulation and related requirements), not just internal business data. The stated full-automation target — a manufacturer's ERP creating SKUs and passports with zero human/consultant review — risks publishing incomplete or incorrect regulatory disclosures with no one positioned to catch it before it's market-facing. This is a product-risk gap, not only an engineering note: Phase 4's architecture for DPP (§7) needs to scope at least an automated validation/completeness gate (e.g., required-field and evidentiary checks before a passport is marked export-ready — the existing "Cluster 3 gate" pattern already seen in the live DPP demo, requiring a carbon-footprint LCA certificate before export, is a real precedent for this kind of gate) rather than leaving review implicit or assuming it away.

### 4.4 Aviation

- **Client** — genuinely unresolved. Unclear whether this means a charter customer booking a flight, an aircraft-owner relationship, or something else. This session only built dispatch/logbook capabilities (flight release, flight logging) — no customer-facing charter concept exists yet.
- **Manual / Automated / Customer view:** all unscoped pending a decision on what "client" even means here. Flagging rather than guessing.

### 4.5 Auto Dealer

- **Client** = a car buyer / deal (the "+ New Deal" capability built yesterday covers the record-creation half).
- **Manual:** sales staff adds a new deal/buyer.
- **Automated (future):** a marketing lead or a CRM/DMS integration auto-creates the deal.
- **Customer view:** no customer-facing portal exists for auto dealer buyers yet at all — this is a real gap, separate from this codex, before "same vs. different" is even answerable here.

### 4.6 Education / Nursing

- **Client** = a student (the "+ Add Student" capability built yesterday covers the record-creation half).
- **Manual:** program staff enrolls a new student.
- **Automated (future):** a school's student-information-system integration, or a self-service enrollment form.
- **Customer view — different:** the student sees their own transcript/evaluation portal, never the program's admin roster.

---

## 5. The disclosure / agreement step

- Reuses the existing, working e-signature infrastructure (`services/esign/esignService.js` — verified directly by reading the file this session: real BoldSign integration with a native fallback, real Firestore-backed `esignRequests`/`esignEvents` collections, token-based signer flow) — not a new build.
- Content is vertical-specific and needs real drafting, not generic boilerplate manufactured by AI: an engagement letter for title services, a data-processing/consulting agreement for DPP, a loan-servicing authorization for MSR, an enrollment agreement for education. Treat this with the same citation-grade discipline applied to MSR's RAAS ruleset this session — if unsure of what a given vertical's real requirement is, say so rather than inventing legal language.
- Applies to both manual and automated paths. For DPP specifically (§4.3), the agreement should live at the relationship level (signed once by the manufacturer client), not be re-triggered per automated SKU addition — the one vertical where per-record re-signing would clearly be wrong.

**Consent-scope gap — Decided (2026-08-22, Sean).** Every disclosure described above is scoped to *that tenant's* relationship with the client (a title engagement letter, a loan authorization, an enrollment agreement). **None of them cover the distinct act of cross-tenant identity resolution** — a person consenting to a nursing school's enrollment agreement has not thereby consented to their verified identity being *resolvable* to their records at an unrelated landlord or vet clinic (CODEX S52.62's whole mechanism). Under CCPA-style frameworks, cross-tenant resolution for a purpose never disclosed at signup is arguably its own processing purpose requiring its own consent — independent of whether S52.62 §4.5's isolation boundary means no actual data crosses tenants. **Decided:** this is a distinct disclosure, captured once as a platform-level consent bundled into the KYC/verification step itself — not bolted onto each tenant's own agreement, and not re-captured per tenant. Required before Phase 1 ships with `verifiedIdentityId` reserved on the schema (§7).

**Real Estate Advocate's disclosure content needs to resolve its own conflict-of-interest question, regardless of which business model is chosen (sharpened from §4.1's general flag, per second red-team pass):** if a brokerage adds a client to a tool whose entire pitch is independence from brokerages and agents, the e-signature disclosure itself likely needs to affirmatively state "this tool was made available to you by your brokerage" as part of the agreement. Without that, the independence claim risks being deceptive by omission at the exact moment of signup — this is stronger than "decide the business model first" (§6, item 1): the disclosure content may need to say this either way.

**FERPA exposure for the education/nursing vertical, not previously flagged:** if a nursing student's verified-identity hash becomes resolvable to or from other tenant contexts, and any platform-level function can see that linkage exists (per §5.1's still-open visibility question in CODEX S52.62), that could implicate FERPA's restrictions on disclosing personally identifiable information from education records without consent — depending on whether the mere *existence* of an education-vertical link counts as an artifact of the education record itself. This wasn't on the radar in the first pass and should be, given education/nursing is one of the platform's most active current verticals, not a hypothetical future one.

---

## 6. Open questions (explicit, not resolved by this codex)

1. **Real Estate Advocate's business model** — individual-consumer vs. brokerage-managed — still Sean's call from earlier today. Determines who does the adding, not what the client sees (§4.1 already answers that: the full Advocate experience either way).
2. **Aviation's "client"** — undefined. Needs a decision before any work starts there.
3. **Default access bundles vs. individual selection** — Sean raised whether some verticals should grant a bundle of workers together by default (e.g., a title client automatically getting Escrow + Title Search together) rather than always being picked individually per worker. Not yet answered.
4. **Per-vertical agreement content** — needs real legal/compliance drafting per vertical, not AI-generated boilerplate.
5. **Auto Dealer and Aviation customer-facing portals** — don't exist yet; "add client" can't fully land there until they do.

---

## 7. Build phasing (proposed, not started)

- **Phase 1 — foundation:** the shared backend capability (Contacts integration + portal-access provisioning + e-signature gating), built once, vertical-agnostic. **Explicit line item, added per red-team pass (this was previously only stated as intent in §6's prose, not scoped as actual work — a real gap, since intent stated outside the phase list gets dropped the moment implementation starts):** reserve a `verifiedIdentityId` field on the Contacts schema now, nullable and unpopulated until CODEX S52.62's HMAC-based resolution mechanism lands. Also requires the KYC-trigger decision from §3 to be made before this phase ships, not deferred.
- **Phase 2 — manual UI, built verticals only:** wire "+ Add Client" into the RE workers that are actually built (Escrow, Law Landuse, Title Search, Defect Tracker, Real Estate Advocate), plus DPP's consultant-facing manual client/product onboarding, plus MSR's compliance-officer manual borrower-portal provisioning.
- **Phase 3 — self-serve automated path:** marketing/lead-capture signup flow with e-signature, landing the client with real access with no staff step. **Sequencing constraint, added per red-team pass:** this is precisely the path with no human present to notice "isn't this the same person as an existing contact?" — the exact duplicate-identity failure mode CODEX S52.62 documents via the Sara Kahele case. Phase 3 should not ship until at minimum the `verifiedIdentityId` field (Phase 1) is live, even if full cross-tenant HMAC-matching logic isn't yet — shipping unattended signup before that field exists guarantees the duplicate-record problem at exactly the volume self-serve is meant to enable. **Abuse/scale gap, added per second red-team pass:** an automated, no-staff signup flow that creates a real Contacts record plus portal access plus (per §3's KYC decision) presumably a KYC pass is a natural target for synthetic-identity testing or spam account creation at volume. Neither this codex nor any other has addressed rate limiting, bot/CAPTCHA-equivalent controls, or fraud monitoring on this path — normally scoped alongside any public signup form, and needs to be here too before Phase 3 ships, not treated as implicit.
- **Phase 4 — system-to-system automation (architecture only in this pass):** the real long-term target for DPP (manufacturer ERP → automatic SKU + passport generation, gated per §4.3's compliance-validation requirement) and the future-state for the other verticals (MLS, loan origination — subject to §4.2's regulatory flag — school SIS). Not built now; Phase 1's capability should be designed so this becomes a matter of wiring a new trigger, not rebuilding the core.
- **Explicitly not in this codex:** RE Commitment / RE Underwriting / RE Marketing being unbuilt stubs (separate task), Aviation and Auto Dealer customer-facing portals (don't exist).

---

## 8. What was verified vs. asserted (added per red-team pass)

CODEX S52.62 (its companion document) carries a §7 citing exact file/line evidence for every factual claim about the current codebase. This document should hold to the same standard, and on review it did not consistently:

- **Verified directly, this session:** Contacts is real and tenant-scoped (`/contacts:add` writes `tenantId: ctx.tenantId`, traced in full); `services/esign/esignService.js` is a real, working token-based signer flow (BoldSign + native fallback), not a stub, confirmed by direct file read; the DPP demo's "Cluster 3 gate" (carbon-footprint LCA certificate required before export) is a real, observed precedent for a compliance gate, not a hypothetical. The record-creation capabilities cited in §4 — MSR's "+ Add Loan" (§4.2), Auto Dealer's "+ New Deal" (§4.5), and Education's "+ Add Student" (§4.6) — were each individually built and live-verified earlier in this same session (real endpoint created, a real test record submitted through the actual UI, confirmed to persist in Firestore, then the test artifact cleaned up), not asserted from memory; citations added here per red-team finding that they were previously stated with S52.62-level confidence but no evidentiary trail.
- **Corrected after red-team review:** the portal-provisioning claim in §3 originally overstated `/v1/demo:token` as evidence that generalized client-provisioning infrastructure "already works" — it's demo-only, hardcoded to a static persona map (confirmed in S52.62 §2). The claim is corrected in §3 above.
- **Generalized from a single verified instance — flagged, not corrected, since it's a reasonable inference, just one stated with more certainty than the evidence supports:** the "customer view — different" claim in §4 for MSR, education, and auto dealer assumes the same customer-portal pattern (`ClientPortal.jsx`) transfers cleanly across verticals. Only one real instance of that pattern is actually built and verified (Garcia/title, per this session's earlier work). One working instance is good evidence the pattern *can* work — it is not evidence that it already does, for the other verticals. Treat §4's per-vertical portal claims as a design assumption carried from n=1, not a verified fact, until a second instance is actually built.
- **Not yet verified, stated as open questions rather than facts:** whether Contacts' current schema can accommodate a `verifiedIdentityId` field without migration issues; whether any per-vertical e-signature templates exist today (§5 assumes content needs drafting from scratch — this hasn't been confirmed against the codebase, only assumed).

---

## 9. Consolidated, tiered red-team findings

Four review passes across this document and its companion (CODEX S52.62) surfaced 25+ individual findings. Rather than duplicate them here as a flat list, **the full ranked breakdown lives in CODEX S52.62 §8** — it covers both documents together, tiered by what actually blocks starting the build versus what can be resolved in parallel with early work versus what's a one-line acknowledgment. Read that section before writing a Phase 1 ticket off either document. In short: three items are genuine blockers (the KYC-trigger/B2B-scoping gap, the hash construction and its anchor-type choice, and cross-tenant-resolution consent scope — none of them primarily about this document's own onboarding-flow scope, all of them about whether S52.62's mechanism can actually receive what this document produces), five are real gaps to close before Phase 1 ships, five are documented decisions rather than urgent problems, and the rest are one-line acknowledgments already reflected in the text above.

---

*Draft v4 — 2026-08-22. Four red-team passes received and corrected same day; a fifth pass concluded further rounds were reaching diminishing returns and requested consolidation instead — see §9 above, and CODEX S52.62 §8 for the full ranked result covering both documents.*

*Pass one: portal-provisioning claim corrected (§3), KYC-trigger decision surfaced as an explicit gap (§3), Phase 1/3 sequencing tightened around `verifiedIdentityId` (§7), RE Advocate conflict-of-interest flagged (§4.1), DPP compliance gate and MSR regulatory scope added (§4.2, §4.3), citation discipline added (§8).*

*Pass two (lifecycle/edge-case/consent hunt): revocation/deprovisioning, idempotency, and partial-onboarding-state gaps added (§3); cross-tenant-resolution consent-scope gap and RE Advocate's sharpened disclosure requirement added (§5); FERPA exposure for education/nursing flagged (§5); abuse/rate-limiting gap added to Phase 3 (§7); citations added for the "+ Add Loan"/"+ New Deal"/"+ Add Student" capabilities and the ClientPortal.jsx n=1 generalization flagged (§8).*

*Pass three (document-shape/scoping hunt): the flagship cross-document scoping conflict added to DPP's automated path (§4.3) — S52.62's biometric mechanism structurally cannot cover the B2B/system-to-system client case this codex names as DPP's actual target, and that resolution now needs Sean's explicit sign-off, not an assumption. See CODEX S52.62 §1.5 for the full resolution.*

*Draft v5 — Red-teaming concluded; all three Tier 1 blockers decided by Sean (2026-08-22) — see CODEX S52.62 §8 for the closed tier and §1.5/§4/§5 for the recorded decisions, and §3/§5 of this document for the KYC-trigger and consent-scope decisions specifically. Phase 1 ticket-writing can proceed. §6's remaining open questions (RE Advocate's business model, Aviation's undefined "client," default access bundles) can be resolved in parallel with early design/ticket work, not strictly before it.*
