# CODEX 97 — Worker Team Architecture: Robustness, Cross-Worker Comms, and Proactive Reporting

**Status:** Draft — captures Sean's 2026-09-21 direction, not yet built beyond what's noted as already-live.

**Sean, 2026-09-21:** "In order for me to make SOCIII actually scale we need the back of house workers to be more robust than they are. And they need to be able to talk to the world and talk to each other. Essentially form teams. And then report back to me with their progress and ideas."

This is the natural next stage of the platform: individual chat workers becoming an actual back office — reliable enough to trust with real tasks, able to reach outward (email, social, podcasts/press), able to reach each other (delegate, coordinate, form ad hoc teams around a goal), and proactively surfacing status and ideas rather than only answering when asked.

Four pillars, each grounded in what already exists rather than designed from a blank page.

---

## 1. Robustness (workers actually finishing the job correctly)

**Gap, not a new idea** — this is the same concern behind [Real worker functional QA (2026-09-18)](../../memory-adjacent note: see project memory `project_real_worker_functional_qa_sep2026`): assume most workers are basic/broken at real tasks until proven otherwise.

**What already exists and is NOT the same thing:** `functions/functions/monitoring/workerCanary.js` (+ `chatCanary.js`, `qualityCanary.js`) already run synthetic health checks — catching structural failures (a worker's ruleset silently failing to load and falling back to generic default rules, a catalog worker rendering a generic empty shell instead of its real canvas). That's valuable and already alerts Sean by text/email on a new failure. But it checks that a worker is *wired up correctly*, not that it *completes a real multi-step task correctly*. Those are different failure classes.

**Recommended approach:** a second, complementary layer — task-level canaries. For each back-of-house worker (Ivy/marketing, the accounting/HR/contacts platform workers, etc.), define 2-3 realistic end-to-end tasks (e.g., for Ivy: "draft a pitch for a named target from the PR knowledge base" — exactly the kind of thing tested by hand tonight) and run them on a schedule, grading the output against expected markers the same way `verify-alex-cascade.js` already does for Alex's strategy-lock canaries. A failure here means "the worker technically responded but did the wrong thing," which is the actual scaling risk — not a config error, a competence error.

**Not yet built.** Scope: moderate — mostly authoring good task canaries per worker, reusing the existing canary-and-alert infrastructure rather than building new plumbing.

---

## 2. Talk to the world (external comms identity)

**Already underway this session:**
- Outbound social: `postToX` / `postToLinkedIn`, dispatched via `socialService`, already live with human-approval gates (`marketing.schedule_social_post_v1`).
- Outbound email exists in two different shapes today, which is itself worth resolving (see below): (a) system/transactional sends via SendGrid with a fixed `from` (e.g. `alex@sociii.ai`), and (b) the interactive `send_email` chat tool, which currently rides on **whichever human's Gmail is connected to the session** — meaning a worker doesn't yet have its own outbound identity in a live chat, it borrows the human's.
- Ivy specifically just got a PR/podcast-outreach knowledge skill (`pr-podcast-outreach.md`) — drafting only, sending still gated.

**Tonight's decision — Google Workspace aliases, not new mailboxes:** to avoid ~$20/mo per persona, give each SOCIII-owned persona (Ivy first) a free "Send mail as" **alias** under the existing `alex@sociii.ai` seat (Workspace allows up to 30 free aliases per user). This gets a persona-correct `From:` address at zero incremental cost. Receiving replies still lands in the one physical mailbox, distinguishable by the `Delivered-To` header — meaning the inbound-routing build only has to happen once (one mailbox watched), not once per persona.

**Important scaling limit, flagged explicitly:** this alias trick only works for SOCIII's *own* personas, because the alias lives under SOCIII's Workspace account. It does **not** give a client's own deployed worker (their own Petra, their own Ivy-equivalent) an identity under the client's domain — that's a structurally different problem, and the 30-alias cap wouldn't survive many clients anyway. For that case, the existing SendGrid domain-verified sending path (already used for system email, no Workspace seat required) is the right mechanism: it scales to arbitrary personas × tenants because it isn't tied to mailbox seats at all, only to a verified sending domain SOCIII already controls.

**RESOLVED 2026-09-21 — sending vs. receiving are two different mechanisms, and both are needed (not either/or):**
- **Sending "as" a persona is already unlocked, no admin work required.** Confirmed via the SendGrid API: `sociii.ai` has full domain authentication (DKIM valid) already in place — SendGrid can send `From: ivy@sociii.ai` (or any `@sociii.ai` address) today, with zero incremental cost or setup, the same way `alex@sociii.ai` / `kent@sociii.ai` already work for system email.
- **Receiving replies still requires a real Workspace alias, full stop.** MX records are domain-wide, not per-address — `sociii.ai`'s root-domain MX already points at Google Workspace (for sean@/alex@/kent@'s real inboxes), so a SendGrid Inbound Parse route (which needs to own an entire subdomain's MX) cannot selectively catch just `ivy@sociii.ai` on the root domain. The only way mail *to* `ivy@sociii.ai` doesn't bounce is for it to be a real Workspace alias. Free (up to 30 aliases per Workspace user), but it's a manual admin-console step, not something code can do.

**Persona → address mapping decided 2026-09-21** (canonical persona names sourced from `scripts/demo/fixSpineWorkerPersonaNames.js`), aliases requested under `alex@sociii.ai`:
| Worker slug | Persona | Alias |
|---|---|---|
| `platform-marketing` | Ivy | `ivy@sociii.ai` |
| `platform-accounting` | Max | `max@sociii.ai` |
| `platform-hr` | Jordan | `jordan@sociii.ai` |

Recorded in `functions/functions/config/personaEmailIdentities.js` (also includes Sage/`platform-contacts` and Reed/`investor-relations`, not yet requested — add if/when those need to talk to the world too).

**Open build items (not yet done):**
- [ ] Sean: create the three Workspace aliases (`ivy@`, `max@`, `jordan@`) under the account behind `alex@sociii.ai` in the admin console — blocked tonight on a Google re-auth challenge, not yet completed.
- [ ] Extend the interactive `send_email` chat tool to accept a `from` persona identity (instead of always using the connected human's Gmail) when the calling worker has a configured alias — the real code path is still Gmail-OAuth-only today; `personaEmailIdentities.js` is groundwork, not yet wired into an actual send capability.
- [ ] Build one Gmail watch/push-notification listener on the shared `alex@sociii.ai` mailbox, routing inbound replies by `Delivered-To` into the correct worker + tenant conversation. This is the actual "receive email on its own volition" capability — doesn't exist yet.
- [ ] For the client-tenant case: design a SendGrid-domain-based per-tenant-per-persona sending scheme (e.g. `petra+<tenantId>@sociii.ai` or a dedicated subdomain), deferred until a client actually needs it.

---

## 3. Talk to each other / form teams (new)

This is the one pillar with no existing analog in the codebase — real new design.

**Recommended shape**, built on primitives that already exist rather than a new messaging system:

- **Delegation as a capability, not a new protocol.** A worker can already be reached via `/v1/chat:message` with a `selectedWorker`. A new capability, e.g. `workers.delegate_v1`, lets worker A hand a task to worker B: it's a real chat call to B's own session/context, B's answer comes back structured, and the whole exchange is written to the audit trail like any other capability invocation (`emitsEvent`/`writesAudit`, matching the existing registry pattern). This mirrors exactly how I (Claude Code) hand work to a subagent and get a report back — same shape, applied to SOCIII's own workers.
- **A "team" is a shared thread, not a new org concept.** Firestore already treats everything as append-only event history. A team is just a `workerTeams/{teamId}` doc (`goal`, `memberWorkerSlugs`, `status`, `tenantId`) with a `messages` subcollection every member worker (and Sean) can read and post to — a transcript, not a black box. Alex (as Chief of Staff) is the natural one to *form* a team when a task obviously spans verticals — e.g., "get this press release out and tracked" could spin up Ivy (drafting/outreach) + whichever analytics worker tracks results, without Sean manually wiring each handoff.
- **Governance stays consistent with the rest of the platform.** Delegation and team formation are proposals like everything else — a worker can *propose* forming a team or delegating a sub-task; whether that requires Sean's approval or runs autonomously should hang off the same oversight-tier config already used for `comms.send_email_v1` and social posting, per [[feedback_build_capability_client_owns_policy]] — SOCIII builds the mechanism, each tenant's configured oversight tier decides how much runs unsupervised.

**Not yet built.** Scope: this is the largest of the four pillars — a new capability, a new Firestore collection, and UI surface (Sean needs to actually see a team's transcript, not just its outcome) — worth its own follow-up CODEX doc once this one is reviewed, rather than folding a full spec in here.

---

## 4. Report back with progress and ideas (extend, don't replace)

**Already exists and is the wrong shape alone:** `functions/functions/admin/generateDailyDigest.js` — a real, live, scheduled (4am HST) HTML+SMS digest to Sean, but it's a *business-metrics* report (revenue, pipeline, platform health, investors, escalations) built from `sectionStyle` blocks like Revenue, Pipeline, Platform, Inventory, Investors, Needs Attention. It does not report on what individual workers *did* or *think should happen next* — that's a genuinely separate axis (business outcomes vs. worker activity/ideas).

**Recommended approach:** add a new section to the *same* digest — "Worker Activity" — rather than spinning up a second daily email Sean has to separately check. Each active worker/team writes a short structured entry when something notable happens (a post published, a pitch drafted, a task finished, an idea worth surfacing) to an events collection (mirroring the existing `marketingPosts` event-log pattern), and the digest pulls the day's entries into one short section, worker by worker. This keeps "one trusted report Sean actually reads" rather than fragmenting into N per-worker emails.

**Not yet built.** Scope: small once pillar 3 exists (team/worker activity needs somewhere to log to) — natural to build alongside it rather than before it.

---

## Suggested sequencing

1. **Now / small:** finish pillar 2's alias plumbing (`ivy@sociii.ai`, from-address support in `send_email`, one shared-mailbox inbound listener). Low cost, immediately useful, already half-designed.
2. **Next:** pillar 1's task-level canaries for the worker(s) currently doing the most real work (Ivy, whichever platform-* worker Sean leans on most) — cheap relative to value, and it's the actual scaling risk ("robust" is not a nice-to-have if workers are about to start acting with more autonomy).
3. **Then:** pillar 3 (delegation + teams) as its own CODEX doc with a real spec — this is the biggest lift and depends on 1 and 2 already being trustworthy (no point letting workers hand tasks to each other before each one reliably does its own job and has a real identity to act under).
4. **Alongside 3:** pillar 4's digest extension, since team/worker activity needs an event log to report from.

## Open decisions for Sean

- Does delegation/team-formation default to requiring approval, or can some tenants configure it to run autonomously? (Maps to existing oversight-tier config — no new consent system needed, just a decision on default.)
- Should the "Worker Activity" digest section go to Sean only, or also to whichever human owns a given tenant (for client-facing deployments later)?
- Priority check: given tonight's scope, confirm pillar 2 (alias + inbound listener) is the right next concrete build versus something else on the plate.
