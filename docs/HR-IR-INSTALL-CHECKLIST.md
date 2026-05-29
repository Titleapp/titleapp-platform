# HR + IR — Install & test checklist for sean@sociii.ai

**Status:** Ready to subscribe. Code deployed 2026-05-29; canvas tabs, fixtures,
emails, voting UI, and HR people aggregator all live.

## One-time setup — sync catalog to Firestore

The catalog edits in `services/alex/catalogs/*.json` need to be mirrored to the
`digitalWorkers/{slug}` Firestore docs the frontend reads. Run once after deploy:

```js
// In browser dev tools at https://title-app-alpha.web.app while logged in as
// titleapp.core@gmail.com (admin):

const token = await firebase.auth().currentUser.getIdToken();
const r = await fetch(
  "https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/admin:workers:sync",
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ workerIds: ["PLAT-005", "BANK-FUND-001"], dryRun: false }),
  },
);
console.log(await r.json());
```

Expected output: `{ ok: true, synced: 2, ... }`.

Confirm in Firestore console:
- `digitalWorkers/hr-people` — status: live, canvasTabs has 9 entries
- `digitalWorkers/fundraise` — status: live, canvasTabs has 10 entries

## Subscribe sean@sociii.ai workspace

1. Sign in as `sean@sociii.ai` at https://app.sociii.ai (or title-app-alpha.web.app).
2. Confirm you're in the SOCIII workspace (top-left workspace switcher).
3. Open Marketplace → search "HR & People" → Subscribe ($29/mo).
4. Same for "Investor Relations" / fundraise ($79/mo).
5. Both should appear in left nav under MY WORKERS.

## Smoke test — HR worker

Click HR & People in nav. Expected:

- [ ] Canvas renders with 9 tabs visible in tab bar: **People · Onboarding · Schedule · Compliance · Documents · Notices · My Onboarding · My Documents · My Schedule**
- [ ] First-visit auto-fires sample fixtures (SAMPLE chip in header)
- [ ] **People** tab shows roster with Kent (closed), Eric (signature_pending), Scott (identity_complete), plus 4 digital workers
- [ ] **Onboarding** tab shows in-flight pipeline
- [ ] **Compliance** tab shows obligations + federal coverage + CA augmentation
- [ ] Click "Clear demo data" — tabs should show empty states cleanly (no console errors)
- [ ] Open chat for HR worker, type "Show me the roster" — response should reference advisors + digital workers (not fall through to Alex generic)

## Smoke test — IR worker (fundraise)

Click Investor Relations in nav. Expected:

- [ ] 10 canvas tabs: **Pipeline · Capital Raised · Data Room · Cap Table · Governance · Notices · Updates · Vote · My Position · Documents**
- [ ] Pipeline tab shows Storyhouse / Rosenberg / Kent network
- [ ] Cap Table tab shows 60/15/12/10/3 split
- [ ] Open chat, ask "What's our raise status?" — response should reference live numbers

## End-to-end advisor invite (HR namespace)

Use the new HR endpoint to invite a test advisor:

```js
const token = await firebase.auth().currentUser.getIdToken();
const r = await fetch(
  "https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/hr:advisor:initiate",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-tenant-id": "<YOUR_SOCIII_TENANT_ID>",
    },
    body: JSON.stringify({
      email: "sean+hrtest@sociii.ai",
      name: "HR Test Advisor",
      equityPct: "0.5%",
      advisorRole: "Test Advisor",
      vestingMonths: 24,
      cliffMonths: 6,
    }),
  },
);
console.log(await r.json());
```

Expected:
- Email arrives at sean+hrtest@sociii.ai with the new warm 4-section prose
- Subject: "Welcome to the SOCIII ohana, HR"
- Body sections: warm intro + terms, ID check, deck + whitepaper, Sean Lee Combs / Dropbox Sign heads-up
- Magic link in email opens onboarding portal

## End-to-end ballot vote (IR voting)

Create a test ballot (admin-only):

```js
const token = await firebase.auth().currentUser.getIdToken();
const r = await fetch(
  "https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/ir:ballot:create",
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fundraiseId: "sociii-pre-seed-2026",
      title: "Test ballot — approve revised advisor pool size",
      description: "Test only. Increase pool from 12% to 15%.",
      options: ["Approve", "Reject", "Abstain"],
      closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  },
);
const { ballotId } = await r.json();
console.log("ballotId:", ballotId);
```

Then `/v1/ir:ballot:notify` to fan out emails. Recipients land at `/invest/vote?fundraise=...&ballot=...&investor=...`.

Expected vote page:
- [ ] Header with SOCIII brand
- [ ] Ballot title + description rendered
- [ ] Three metric cells: Your shares · Voting weight % · Closes date
- [ ] Three radio options
- [ ] Submit button disabled until choice picked
- [ ] After submit: green success card with chosen option
- [ ] Re-vote before close updates the choice

## Known gaps (post-test)

These are the items I'd queue for the next pass once you've kicked the tires:

- HR worker chat handler: needs a worker-specific prompt block (currently falls through to Alex baseline). Will add platform-hr to the per-worker prompt registry.
- HR onboarding state machine for *employees* (only advisors today). Vendors too — flagged from Sean's earlier note.
- Vote audit trail link to Crossmint/Coinbase chain anchor (Phase 5 IR).
- Real cap-table integration on the IR tabs (currently fixtures); wire `fundraises/{id}/investors` reads.
- Demo fixtures use real names (Kent, Eric, Scott, Storyhouse) — consider swapping to generic "Advisor A/B/C" if any prospect lands in demo mode.
