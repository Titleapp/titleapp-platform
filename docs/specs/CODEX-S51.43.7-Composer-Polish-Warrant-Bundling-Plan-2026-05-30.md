# CODEX S51.43.7 — HR Composer Polish + Warrant Bundling Plan + SendGrid Multi-Tenant Architecture

**Date:** 2026-05-30 (Saturday)
**Status:** Composer polish shipped; warrant bundling + landing experience in flight for Sunday; Monday send target.
**Predecessor:** S51.43.5 (cold-invite minting + magic link, shipped) · S51.43.6 (spec'd entitled workspace onboarding, deferred to Sunday)
**Successor:** S51.43.8 will capture Sunday's warrant flow + landing experience build.

---

## Why this session exists

Saturday session pivoted multiple times. Started as "ship advisor letters tonight," then expanded as Sean surfaced the HOMMIE warrant overlap with HOM DAO contributors, then deferred to Monday with proper bundling. Codex captures: what shipped, what was decided, what's queued for Sunday.

## What shipped (code)

### 1. NoticeComposerPanel per-recipient `customBodyHtml` override

**File:** `apps/business/src/components/NoticeComposerPanel.jsx`

Added an optional textarea on each rich-recipient row in cold-invite mode. If filled, replaces the template body for THAT recipient only. Empty = standard template body. Supports `{firstName}`, `{name}`, `{magicUrl}` token interpolation. Auto-wraps plain-text in `<p>` blocks if it doesn't already contain HTML.

This is what unlocks per-recipient bespoke copy (Kent's "not sure if you're still checking with counsel" follow-up vs the 6 cold advisors' standard template).

### 2. Backend `/v1/hr:send-advisor-invite` custom body wiring

**File:** `functions/functions/index.js` (line ~13454)

Reads `r.customBodyHtml` from each recipient payload. When present, substitutes token placeholders + uses it instead of `tpl.bodyHtml(...)`. Adds `customBody: "1"|"0"` to SendGrid `custom_args` for tracking.

### 3. Per-recipient PDF deck attachment (shipped earlier in session, pre-compact)

Per-row PDF picker → FileReader.readAsDataURL → base64 → SendGrid `attachments`. 15MB client-side cap. Wired through backend.

### 4. CC default = `sean@titleapp.ai`

Shared CC field at top of cold-invite mode, defaults to `sean@titleapp.ai` so every send is BCC'd to Sean for inbox visibility. **TODO:** flip default to `sean@sociii.ai` (post-rebrand working address) before Monday send.

## What was decided (planning)

### Robert Rosenberg — two-email pattern

Robert gets **two separate threads**:

1. **Loan email** (standalone) — $100K formalization, 4% quarterly, personal guaranty, raise scenarios, warmth scaffold
2. **Advisor + warrant email** (separate) — advisor agreement + $175K warrant grant; narrative acknowledges loan thread but doesn't reattach loan paperwork

**Why two emails:** loan vs advisor/warrant are different instruments with different legal stakes. Bundling them muddies all three. See [[project_robert_loan_formalization]].

### Warrant coverage — flat 100% (overrides memo's tiered approach)

Sean locked flat 100% coverage across the board. Memo recommended 50%/75%/100% tiered. Cap table impact:

- Robert: $175K coverage ($100K stolen loan + $75K HOM contribution)
- Eric Altshuler: $75K coverage (HOM contribution)
- Scott Eschelman: $10K coverage — **services-warrant for prior HOM work** (NEW pattern; not cash contribution)
- Kim: NOT a HOM contributor — advisor agreement only
- Elise, Ruthie: net-new advisors — advisor agreement only
- Kent: bespoke cofounder track (HOMMIE Warrant in his v2 agreement, separate from creditor pool)

**New pattern flagged for counsel:** services-warrant (Scott) is distinct from cash-creditor-warrant (Eric/Robert). Different tax treatment + Reg D 506(b) recital language. Counsel review needed before Monday send.

**Pre-formation creditor memo needs update** (`docs/specs/Pre-Formation-Creditor-Warrants-Memo-2026-05-22.md`) to reflect flat-100% decision. Tracked for Sunday.

### Storyhouse $2M committed

Storyhouse Ventures committed for $2M, pending Kent's cofounder formalization (alum connection required for the fund). Kent met with them ~2026-05-22. Reference confidently in any creditor / advisor / warrant outreach.

**Kent's v2 agreement Section 3 (cash success-fee SEC-conforming language)** is on critical path — counsel must finalize before Storyhouse can wire. See [[project_storyhouse_2m_committed]] + [[project_kent_cofounder_role]].

### Warmth scaffold rule for all advisor outreach

Universal pattern: **acknowledge effort → express gratitude → state offer → explicit no-pressure opt-out**. Sean's voice is warmer than AI-default business-clinical. Relationship survives a "no". See [[feedback_advisor_outreach_warmth]].

### P.S. attribution rule for all outreach

Every personalized email ends with a P.S. crediting Alex (Sean's AI chief of staff) + the specific SOCIII Digital Worker. Two purposes: dogfooding signal + AI-error cover. See [[feedback_ai_attribution_postscript]].

**Canonical wording:**
> P.S. Alex (my AI chief of staff) drafted this using SOCIII's [HR/IR] Digital Worker — we're our own first customer. Any oddities are his; the intent is mine. Reply if something looks off and we'll fix it.

### Legal docs stay clean

NO AI disclaimers, NO "subject to AI assistance" language on the LEGAL DOCUMENTS themselves. Only the email body carries those. Documents are clean instruments. Signature flow has zero friction. Rule applies to loan agreement, warrant agreement, advisor agreement uniformly.

## What's queued for Sunday (S51.43.8)

### Templates (counsel-grade)

1. **Robert loan agreement** — $100K principal, 4% quarterly, personal guaranty, structured paydown clause on raise proceeds. Counsel review.
2. **Cash-creditor warrant agreement** — Eric ($75K), Robert ($175K). Reg D 506(b). Counsel review.
3. **Services-warrant agreement** — Scott ($10K for HOM work). Distinct recital. Counsel review.
4. **Pre-Formation Creditor Warrants memo update** — flat-100% coverage, services-warrant variant pattern.

### Backend infrastructure

5. **`initiateWarrantFlow`** in `functions/functions/services/ir/` — parallels `initiateAdvisorFlow`. Mints `warrant_holder` pendingInvite + DBX Sign packet. HOMMIE Warrant DBX template already wired (Block 2.2). Services-warrant variant gets its own DBX template ID.
6. **Composer: per-recipient `warrantCoverage` field** — optional dollar amount. If `> 0`, mints warrant pendingInvite alongside advisor pendingInvite + attaches both docs.
7. **Email template forks**:
   - $0 warrant + $0 loan = standard cold-advisor flow (Elise/Ruthie/Kim path)
   - warrant > 0 + $0 loan = advisor + warrant bundle (Eric, Scott)
   - warrant > 0 + loan > 0 = Robert's advisor+warrant email (loan handled in separate composer send)
8. **CC default flip** — `sean@titleapp.ai` → `sean@sociii.ai`

### CODEX 51.43.6 — Entitled Workspace Onboarding (Phases A-D)

Per existing spec at `docs/specs/CODEX-51.43.6-Entitled-Workspace-Onboarding.md`. Building Sunday:
- Phase A: Backend entitlement-as-workspace + accept/decline endpoints
- Phase B: Sidebar renders entitled tenants in MY WORKSPACES
- Phase C: Trust modal on first arrival
- Phase D: EntitledHomeCanvas with obligation cards (materials → KYC → warrant sign → advisor sign)

### HR worker scheduling cleanup

Sean flagged "a couple of little things with the HR worker" (scheduling among them). Calendly link `calendly.com/sean-sociii` (note: typo flagged — should be `calendly.com` not `calendy.com` — verify slug resolves). Wire `CALENDLY_URL` setting; reference in HR scheduling tab + outbound advisor templates.

### Sunday evening dry run

Send to `dev@homdao.io` as if it were Eric. Walk the landing experience: trust modal → workspace appears in MY WORKSPACES → EntitledHomeCanvas with two obligation cards (warrant + advisor). Confirm warrant + agreement both render correctly. Iterate.

## SendGrid multi-tenant architecture (scoped, post-launch infra)

Captured here so it's not lost when ops attention turns. Three approaches:

| Approach | Effort | Best for |
|---|---|---|
| **(A) Single SendGrid account + multi-domain auth** | M | First 50 tenants. Cheapest gap from current. |
| **(B) SendGrid sub-users per tenant** | L | 100+ tenants with reputation isolation. |
| **(C) Tenant-Gmail-OAuth** | L | Warm outreach (advisor invites, investor follow-ups). Real Gmail thread + replies stay in Gmail. Workspace Integration Layer (task #154). |

**Recommendation:** ship (A) first as part of tenant onboarding wizard. (C) for warm outreach is the long-game. Both coexist — (C) for warm one-to-one, (A) or (B) for templated/bulk.

**Pieces needed for (A):**
- Tenant onboarding step: collect FROM domain, generate DNS records via SendGrid API
- Verification poll: backend polls until domain authenticates
- Config: `tenants/{id}.email = { fromAddress, fromName, sendgridDomainId, status }`
- Backend FROM resolution at send-time
- Reply-to routing to tenant's actual mailbox (SendGrid honors `reply_to`)

**Effort tier:** L. Scope similar to Stripe Connect onboarding plumbing.

## Monday send roster

| Advisor | Email count | Bundle |
|---|---|---|
| Robert Rosenberg | 2 (loan separate, advisor+warrant together) | $100K loan + $175K warrant + advisor agreement |
| Eric Altshuler | 1 | $75K warrant + advisor agreement |
| Scott Eschelman | 1 | $10K services-warrant + advisor agreement |
| Elise | 1 | advisor agreement only |
| Ruthie | 1 | advisor agreement only |
| Kim | 1 | advisor agreement only |
| Kent Redwine | 1 (custom body: "final draft, sign or revise") | his v2 cofounder bespoke (HOMMIE Warrant + 15% milestone + 5% finder's fee) |

Total: 8 emails to 7 advisors.

## Open items before Monday send

- [ ] Sean: Calendly slug verification (`calendly.com/sean-sociii` actually resolves?)
- [ ] Sean: Save Kent's v2 .docx as PDF in Word/Pages (since pandoc has no LaTeX engine)
- [ ] Sean: Confirm whether to send loan/warrant docs "subject to counsel review" or hold until counsel-finalized
- [ ] Sean: Confirm Robert loan email v2 draft is final tone
- [ ] Claude: draft Robert advisor+warrant email (Email 2)
- [ ] Claude: draft Eric warrant+advisor surprise email
- [ ] Claude: draft Scott services-warrant+advisor surprise email
- [ ] Claude: draft Elise/Ruthie/Kim standard advisor cold-invite (uses default template)
- [ ] Claude: implement `initiateWarrantFlow` backend
- [ ] Claude: implement per-recipient `warrantCoverage` composer field
- [ ] Claude: implement CODEX 51.43.6 Phases A-D (entitled workspace + obligation cards)

## Related memory

- [[feedback_advisor_outreach_warmth]] — warmth scaffold rule
- [[feedback_ai_attribution_postscript]] — P.S. attribution rule
- [[project_storyhouse_2m_committed]] — raise narrative anchor
- [[project_robert_loan_formalization]] — loan structure + two-email pattern
- [[project_kent_cofounder_role]] — Kent's bespoke path
- [[project_creator_equity_structure_v2]] — overall equity architecture context
