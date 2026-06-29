# CODEX Surface 15 — Alex Persistent Memory + Social Publishing + Image Governance + Vault Completion

**Status:** 🟢 shipped · 2026-06-28 · **Owner:** Sean  
**Branch:** surface-5-advisor-affirm

---

## Objective

Close out the "things that were built but don't stick" class of bugs — primarily Alex amnesia — and ship a batch of adjacent platform completions: image governance, social media pipeline, vault substrates, and the client portal.

---

## 1. Alex Persistent Memory (the real fix)

### The Root Cause (Three Prior Misses)

Alex "forgot" everything between sessions despite the `alex_notes` system being built. Three previous sessions touched this without finding the root:

1. Session 1 — built `alex_notes` collection + server-side injection into COS system prompt
2. Session 2 — deployed Firestore composite index (`ownerUid ASC + createdAt DESC`)
3. Session 3 — added `recall_notes`/`save_note` tools to the worker tool list

None worked. The actual cause:

**Sean's browser stores `TENANT_ID = title-app-llc` in localStorage.** The COS block in `index.js` does:
```js
const _ws = await db.collection("users").doc(uid).collection("workspaces").doc("title-app-llc").get()
```
The document `users/{uid}/workspaces/title-app-llc` **does not exist** — it predates the subcollection pattern. `_ws = null`. The entire COS block (including notes injection) is behind `if (_ws && ...)` and gets skipped entirely.

### The Fix

Added fallback at `index.js` ~line 5202:
```js
if (!_ws) {
  try {
    const _tDoc = await db.collection("tenants").doc(_cosTenantId).get();
    if (_tDoc.exists) _ws = _tDoc.data() || null;
  } catch (_) {}
}
if (_ws) {  // was: if (_ws && (_ws.onboardingComplete || _ws.vertical))
```

`tenants/title-app-llc` exists with `{vertical: "GLOBAL", name: "Title App LLC"}` → `_ws` found → COS block runs → notes injected.

### Current Memory Architecture

Two layers:

**Layer 1 — Server-side injection (system prompt):** On every COS request, the last 10 notes are pre-fetched and prepended to the COS system prompt. Alex speaks from them as if recalling naturally ("I remember from our last session…"). Notes injected at conversation start appear as "earlier in this session" — expected behavior.

**Layer 2 — Tool-driven recall:** `recall_notes` / `save_note` tools in the worker tool list let Alex explicitly search and write notes mid-conversation. Used when the user references something specific or Alex needs to save a decision.

### alex:learn endpoint

`POST /v1/alex:learn` — called when Sean edits an Alex email draft before sending. Captures the diff and saves a structured learning note. Builds voice/style understanding over time without requiring Sean to explicitly teach.

---

## 2. RAAS W-IMG-001 — Image Governance (#80)

All image generation paths now run a governance pre-flight before calling fal.ai:

```js
const govCheck = validateImagePrompt(prompt, vertical, { workerId, userId, tenantId });
if (!govCheck.ok) {
  // blocked — set error message, skip fal.ai call
}
```

**Where it runs:**
- Worker chat tool handler (`index.js` ~line 3449)
- Sandbox image generation path (`index.js` ~line 6238)

**Rule file:** `raas/horizontal/GLOBAL/W-IMG-001-image-governance-rules.md`

**What it checks:** Prompt content against vertical-specific rules (e.g., clinical images in healthcare context require patient-consent flag; explicit content blocked globally). Returns `{ ok, reason, rule }`.

This is the moat: platform-level content governance that survives model swaps. Rules are RAAS-resident, not prompt-resident.

---

## 3. Worker Chat Tool Additions

Three new tools added to the business worker tool list (available to all authenticated worker chats):

| Tool | Purpose |
|---|---|
| `anchor_signed_document` | Records a completed signing as an immutable SOCIII chain record. Calls the `esign:anchor` side-effect. (#62 partial) |
| `lookup_vault_assets` | Resolves `dtcId` from the user's Vault before emitting `logbook:append`. Fixes the "never guess a dtcId" invariant. |
| `recall_notes` / `save_note` | Layer 2 memory (explicit recall/write, in addition to server-side injection). |

**Invariant:** `logbook:append` side-effect instructions now say "call `lookup_vault_assets` first if dtcId not known." Prevents fabricated IDs reaching the Firestore append path.

---

## 4. Vault Substrate Completion (#55)

`VaultGate` (Firebase re-auth + idle timeout lock screen) is now wrapping all vault substrates in `AdminShell`:

```jsx
case "vault-documents":  return <VaultGate><VaultDocuments /></VaultGate>;
case "vault-learning-record": return <VaultGate><LearningRecord /></VaultGate>;
case "vault-assets":     return <VaultGate><VaultAssets /></VaultGate>;
case "vault-deadlines":  return <VaultGate><VaultDeadlines /></VaultGate>;
```

Previously only `vault-dtcs` and the Vault landing had the gate.

---

## 5. Learning Record — Logbook Granularity (#74)

**Frontend:** `LearningRecord.jsx` hydrates from real Firestore `dtcs` (type `education_record`) + per-DTC `logbookEntries`. Falls back to SAMPLE when no real education DTCs exist.

**Backend:** New `GET /v1/nurse-edu:transcript?dtcId=xxx` endpoint groups all logbook entries by course:
- Clinical hours totaled per category
- Final grade / GPA from `course.graded` events
- Assignments, assessments, competencies, reflections in per-course sub-lists

**Schema:** `services/vault/schemas/studentRecord.js` extended with full `EVENT_TYPES` map and `validateEvent()` function. `nurse-edu:append` now validates against this schema before writing.

**Canvas card:** `StudentTranscriptCard.jsx` — accordion per course, drill into entries.

---

## 6. Social Publishing Pipeline (#64 extension)

**YouTube OAuth** in Settings: popup-based Google OAuth flow → token exchange → stored encrypted. Workers can now publish video via `YouTube → Studio → upload`.

**TikTok:** `services/social/tiktok.js` — auth flow + upload endpoint. Callback page at `public/auth/tiktok-callback.html`.

**`mediaUrl` on social posts:** `scheduleSocialPost` side-effect now accepts `mediaUrl`. When an image is generated in the same conversation, Alex includes the URL — attaching it to the X/TikTok post. Workers instruct: "if a generate_image result returned a URL, include it as mediaUrl."

**Social platform ordering** in UI: YouTube → X → LinkedIn → TikTok → Telegram → Instagram → Facebook → Google Business (reflects current live status).

---

## 7. Client Portal (#76)

`/portal` route — white-label customer-facing page with two skins:
- `?company=meadow-vet` — Dr. Maya Chen consumer demo (Meadow Creek Veterinary)
- `?company=sociii-advisors` — SOCIII advisors client intake

Lazy-loaded via `React.lazy`. No public nav link — accessed by direct URL or QR code from demo materials.

---

## 8. canvas:listing-readiness (#38 partial)

`card:listing-readiness` type added to:
- `canvasTypes.js` (new type definition)
- COS system prompt (Alex knows when to emit it)
- `CanvasComponentMap.jsx` (renders to `ListingScorecardCard`)

Payload shape: `{ address, overallReadiness, verdict, band, categories, flags, punchList, summary, nextSteps }`.

The real estate workers now have an explicit scorecard canvas type vs falling back to `card:work-product`.

---

## Known Gaps / Still Open

| # | Gap | Status |
|---|---|---|
| #38 | Duplicate `showCanvas` drivers (6 copies in App.jsx/RightPanel) | Still open |
| #45 | `dtcs.attested` mutation violates append-only invariant | Sean's design call pending |
| #62 | Frontend hook on sign-complete → auto-emit esign:anchor | Unbuilt |
| #72 | Women's boutique pilot | Not started |
| #88 | Shopify Partner app | Blocked on Sean |

---

## QA001 Result

- Build: ✅ clean (`npm run build`)
- New-file lint errors: ✅ resolved (4 errors fixed: unused imports, empty catch bindings, redundant useEffect)
- Pre-existing lint errors: 465 — pre-date this session, not introduced here
- Deployed: hosting + `api` Cloud Run function both updated
