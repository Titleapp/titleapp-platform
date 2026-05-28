# CODEX 51.20 — Advisor Signing UX, Whitepaper Route, Kent Cofounder Template

**Date:** 2026-05-28 (late session, ~00:30 PT)
**Commit:** bbca170a
**Predecessor:** 47d89d20 (S51.19 IR signing stack live)

## Context

Two-day debugging arc to make the advisor signing flow actually work end-to-end
culminated in **success** — Sean signed the SOCIII Advisor Agreement at
~23:37 PT. That unblocked the next pre-Kent UX issues:

1. **Double-email confusion.** Advisor received both the SOCIII magic-link
   invite AND the Dropbox Sign packet. Recipients clicked the wrong one (the
   magic link), which expired and broke. The Dropbox Sign email is the actual
   signing surface.

2. **Sender looks scammy.** Dropbox Sign packet shows
   `titleapp.core@gmail.com` as the sender, not `sociii.ai` — Sean handling
   the DBX Sign account-holder migration tomorrow morning out-of-band.

3. **Materials review for the data room.** Sean had Claude (separate session)
   produce a public-facing whitepaper that re-positions the platform for
   advisors/creators rather than the investor memo. Plus existing investor
   deck v3, advisor decks for Kent and Eric. All needed alignment review
   before Kent's send.

4. **Kent's terms don't fit the standard advisor template.** Kent is at
   "15% milestone-vested + 5% success fee on capital sourced" per the
   cofounder-role reframe. The standard FAST template only carries
   `equity_pct + vesting_months + cliff_months` — incompatible with three
   milestone tranches and a cash success fee.

## What shipped

### 1. Option 2 email + magic-link landing banner

`functions/functions/services/ir/advisorFlow.js`:
- New `_advisorInviteEmail` body: removes the prominent purple CTA button;
  replaces with a Dropbox Sign callout: *"Your Advisor Agreement is on its
  way from Dropbox Sign. Look for a separate email from hellosign.com or
  dropboxsign.com (check spam). No action needed on this email — it's just
  a heads-up."* Magic link demoted to footer ("Need to check your status
  after signing? View your onboarding portal").

`apps/business/src/pages/AdvisorOnboarding.jsx`:
- New top-of-page banner under the h1 (only renders when `!signed`):
  *"This page tracks your onboarding status. The Advisor Agreement itself
  is sent and signed via Dropbox Sign — look for a separate email from
  hellosign.com or dropboxsign.com in your inbox once Step 3 is reached."*

Net effect: the SOCIII email becomes pure notification. The Dropbox Sign
email is the only actionable surface. Anyone who still clicks through to
the magic-link page gets the same message reinforced.

### 2. Document alignment review + fixes (5 edits across 4 files)

Reviewed in `/tmp/sociii-review/`:
- `/Users/seancombs/Downloads/SOCIII-White-Paper.docx` (10 sections, ~2,000 words)
- `/Users/seancombs/Downloads/SOCIII-InvestorDeck-v3 (4).pptx` (18 slides)
- `/Users/seancombs/Downloads/files (34)/SOCIII-AdvisorDeck-Eric.pptx` (14 slides)
- `/Users/seancombs/Downloads/files (34)/SOCIII-AdvisorDeck-Kent.pptx` (14 slides)

Numbers were already consistent (1,000+ workers · 8 industries · $35K / 5
months · $25K/mo go-forward · $29/$49/$79/$99/$299 pricing). 5 alignment
issues found and corrected via XML surgery + re-zip:

| Issue | File | Fix |
|---|---|---|
| Whitepaper said "six U.S. provisional applications filed May 24, 2026" violating locked rule "patent-pending (no count)" — and whitepaper is the most-public doc | whitepaper § 4 | "a family of U.S. provisional applications filed May 2026" — keeps the scope narrative, drops the count |
| Investor deck slide 1 stat box read "$0 Outside Capital" while slide 13 budgets $250K debt service | InvestorDeck-v3 slide 1 | "$0 Institutional Capital" |
| Advisor deck slide 5 understated debt ("One disclosed loan") vs investor deck three-bucket framing | AdvisorDeck-Eric slide 5, AdvisorDeck-Kent slide 5 | "~$250K disclosed pre-formation obligations (Rosenberg note, Chris Dunn bridge, HOM DAO inherited AP) — cleared by the first $250K of the seed." |
| Kent deck slide 11 showed "ADVISOR EQUITY: 2.0% total" (wrong for Kent at 15%) | AdvisorDeck-Kent slide 11 | "LEAD ADVISOR EQUITY (Kent): up to 15% milestone-vested across three 5% tranches (TitleApp LLC wind-down · Storyhouse close · additional financing close). Plus 5% cash success fee on any Qualifying Financing where the lead investor was sourced by Kent. Creator-path participation, if chosen, is structured separately." |

OpenClaw / NanoClaw — Sean confirmed both are real (separate companies), so
the "OpenClaw acquired for billions" reference on investor deck slide 4 stays.

Confirmed alex@sociii.ai inbound stays for the public whitepaper footer.

Updated binaries placed at `docs/data-room/2026-05-seed/` locally
(gitignored — see "Hardening" below). Sean opens these in PowerPoint/Word
to verify and uploads to the Firestore-backed data room via the platform UI
when ready.

### 3. Kent Cofounder Advisor Agreement (bespoke document)

`docs/legal-templates/SOCIII-Cofounder-Advisor-Agreement-Kent-Redwine.md`:

Standard advisor template's `equity_pct + vesting_months + cliff_months`
merge slots are insufficient for Kent's terms. Authored a Kent-specific
document that preserves the strong legal scaffolding from the FAST template
(Sections 6 Independent Contractor, 7 Confidentiality, 8 IP Assignment,
9 No Conflict, 10 Termination, 11 Miscellaneous — verbatim or near-verbatim)
and replaces the compensation sections with:

- **Section 2 — Equity, milestone-vested.** 15% common stock options at
  $0.001 strike, split into three equal 5% tranches:
  1. TitleApp LLC wind-down completion (Certificate of Cancellation + books closed)
  2. Storyhouse Ventures closing (lead, co-lead, or substantial participation)
  3. Any additional financing ≥$250K gross proceeds, sourced by Kent or anyone

- **Section 3 — Cash success fee.** 5% of gross proceeds of any Qualifying
  Financing where the lead investor was Sourced by Kent (defined as a
  written substantive introduction acknowledged by the Company within
  10 business days). 12-month tail post-termination.

- **Section 3(e) — Securities-law acknowledgment.** Notes Kent is not a
  registered broker-dealer; parties intend compliance with applicable
  exemptions; counsel-review carve-out and good-faith restructuring
  provision if SEC concerns surface.

- **Section 4 — Change-of-Control acceleration** applies only to Tranche 3
  (additional financing); Tranches 1 and 2 vest only on their own
  milestones, not on acquisition.

- **Section 5 — Title and Public Representation.** Kent may use
  "Cofounder" externally; no officer/director authority unless Board
  separately appoints.

Send path: NOT through the IR worker auto-flow (template-bound). Kent's
agreement goes via Dropbox Sign web UI as a one-off — Sean converts the
.md to .docx tomorrow morning and uploads. (Deferred per Sean: "Let me
send Kent's stuff in the am I'm super tired.")

### 4. Public whitepaper at `/whitepaper`

`apps/business/src/pages/Whitepaper.jsx`:
- Full whitepaper rendered as semantic HTML (not iframe-served docx).
  Real `<h1>` / `<h2>` / `<p>` / `<table>` so Google can index the content.
- `useEffect` sets document.title, OG meta, canonical link, JSON-LD
  Article structured data for richer SERP entries.
- "Download .docx" button in sticky header → `/whitepaper/SOCIII-Whitepaper.docx`.
- Swiss-tone typography (max-width 720px, Times-feel serif-leaning sans,
  abstract callout, italicized pull-quotes, table for the four-tier RAAS
  hierarchy, industries grid).
- Footer disclaimer + contact (alex@sociii.ai · www.sociii.ai).

`apps/business/public/whitepaper/SOCIII-Whitepaper.docx`:
- Static download — the corrected .docx (no "six", says "a family of").

`apps/business/src/App.jsx`:
- New `isWhitepaper` route check; `React.lazy` + `Suspense` mounts
  Whitepaper component. Sits next to the other public vertical landings.

Deployed to https://title-app-alpha.web.app/whitepaper (live now). Will be
reachable at sociii.ai/whitepaper once the frontdoor lands.

### 5. Hardening

`.gitignore` adds `docs/data-room/` — confidential investor/advisor deck
binaries live as local working copies only. The actual data room is the
Firestore-backed `fundraises/` + `storageObjects` (with `fundraiseId`)
service at `functions/functions/services/fundraise/dataRoom.js`.

## Deferred to tomorrow (Sean's call — was super tired)

- **Kent send.** All preconditions are met: bespoke agreement drafted at
  `docs/legal-templates/SOCIII-Cofounder-Advisor-Agreement-Kent-Redwine.md`,
  Sean confirmed kent.redwine@gmail.com is correct, OK with
  titleapp.core@gmail.com sender for tonight (DBX Sign account migration
  is tomorrow's work). Send path: Sean converts the .md to .docx (pandoc
  is installed at `/opt/homebrew/bin/pandoc`), uploads to Dropbox Sign web
  UI, adds Kent as recipient, sends. ~5 minutes.

- **Investor + advisor deck upload into data room.** App-UI operation, not
  scriptable from here. The 3 updated .pptx files are in
  `docs/data-room/2026-05-seed/` ready to upload.

- **Dropbox Sign account migration.** `titleapp.core@gmail.com` →
  `sean@sociii.ai` as account-holder email so the "Sender" line on packets
  reads sociii.ai. Sean's job in DBX Sign dashboard.

- **sitemap.xml.** Whitepaper is live and crawlable but not in a sitemap.
  No prior sitemap in the public/ folder. Worth adding when there are
  enough public routes to justify it (about, terms, whitepaper, vertical
  landings, marketplace).

## Files touched (16)

```
.firebase/hosting.YXBwcy9idXNpbmVzcy9kaXN0.cache     # build cache update
.gitignore                                            # +docs/data-room/
apps/business/dist/index.html                         # build artifact
apps/business/public/whitepaper/SOCIII-Whitepaper.docx (new)
apps/business/src/App.jsx                             # +Whitepaper route
apps/business/src/pages/AdvisorOnboarding.jsx (new — first git commit; existed before but untracked)
apps/business/src/pages/AuthMagic.jsx                 # (from earlier in session)
apps/business/src/pages/Whitepaper.jsx (new)
docs/legal-templates/SOCIII-Cofounder-Advisor-Agreement-Kent-Redwine.md (new)
functions/functions/index.js                          # resend_signature action
functions/functions/services/identity/stripeIdentity.js  # (from earlier)
functions/functions/services/ir/advisorFlow.js (new — first git commit)
functions/functions/services/ir/investorFlow.js       # (from earlier)
functions/functions/services/magicLink.js             # (from earlier)
functions/functions/services/signatureService/hellosign.js  # logging + error bubble
functions/functions/services/signatureService/index.js      # LIVE-mode default
```

## Deploys

- Functions: `firebase deploy --only functions:api` (S51.20 email template)
- Hosting: `firebase deploy --only hosting` (advisor banner + /whitepaper)
- Both deployed and verified live ~00:30 PT 2026-05-28.

## Verifying the whitepaper edits stuck

After XML surgery + re-zip, all 5 edits confirmed via re-extraction:

```
WHITEPAPER:    "a family of U.S. provisional applications filed May 2026, covering the audit..."
INVESTOR sl1:  "Institutional Capital"
ERIC sl5:      "~$250K disclosed pre-formation obligations (Rosenberg note, Chris Dunn bridge, ..."
KENT sl5:      "~$250K disclosed pre-formation obligations (Rosenberg note, Chris Dunn bridge, ..."
KENT sl11:     "LEAD ADVISOR EQUITY (Kent): up to 15% milestone-vested across three 5% tranches..."
```

## Reference materials

- /tmp/sociii-review/ — original extracted text + updated/ folder with re-zipped files
- /tmp/sociii-review/apply_edits.py — Python script that drives the XML edits + re-zip
- ~/Downloads/SOCIII-AdvisorDeck-Kent.pptx — Sean's working copy with slide 11 fix
