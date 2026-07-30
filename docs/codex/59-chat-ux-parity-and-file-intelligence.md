# CODEX 59 — Chat UX Parity + File Intelligence

**Session:** 2026-07-29 / 2026-07-30
**Status:** Shipped + Deployed

---

## What We Built

### 1. Alex Freeze Fix (root cause)
Alex was silently dropping tool calls on follow-up responses. When Claude received a `read_drive_file` result and made a follow-up API call with `tool_choice: { type: "auto" }`, it would return BOTH a text block ("Generating now.") AND a `generate_document` tool_use block. The backend only extracted `b.type === "text"` from follow-ups, so the nested tool call was silently dropped. Alex said it was generating — and nothing appeared.

**Fix:** All follow-up calls set `tool_choice: { type: "none" }` forcing text-only responses. Timeout bumped 30s → 60s default, 90s for drive-read follow-ups.

### 2. Frontend Timeout 55s → 120s
The frontend AbortController was killing requests after 55 seconds — too short for complex spreadsheet analysis + document generation tasks.

### 3. Stop Button
The send arrow now becomes a red square stop button the moment a request is in flight. Click it cancels immediately via `chatAbortRef.current.abort()`. Previously there was no way to escape a slow/frozen request without refreshing.

### 4. Copy Button
Every substantive Alex response (non-system, non-error, >30 chars) now shows a clipboard icon below the feedback row. Click → green checkmark for 2 seconds. Copies raw message content.

### 5. xlsx File Reading in Chat
When a user attaches an `.xlsx` directly to a chat message, the backend was setting `extractedText = "[Spreadsheet uploaded: ... — stored for reference]"`. Alex would say it couldn't see the data.

**Fix:** Parse with the `xlsx` library (already used in the Drive handler), convert each sheet to CSV, inject into the AI context. Alex now sees all rows from all sheets.

### 6. xlsx Generator Fix
The `model-cashflow` template generator was receiving data from Claude in an undocumented format — `{ assumptions: { items: "[{label, value}]" } }` (JSON array as string) instead of a flat key-value object. This produced Assumptions and Disclosure sheets only, with no real data in cells.

**Fix:**
- Detect and unpack the `items` JSON-encoded array pattern in assumptions
- Handle both projections shapes: `{months, rows}` pivot format (tool description format) and flat array `[{Month, Revenue, ...}]`
- Same resilience added to summary field

### 7. xlsx Preview in Chat
Generated xlsx documents now have a **Preview** button alongside Download. Clicking it:
1. Dynamically imports `xlsx` (lazy — doesn't add to main bundle)
2. Fetches the file from the download URL
3. Parses all sheets client-side
4. Opens a full-screen modal with sheet tabs + scrollable HTML table (purple header row, alternating rows)

Implemented as a standalone `DocPreviewModal` component. PDF iframe path unchanged.

### 8. BoldSign e-Sign Integration
Replaced the Google eSign OAuth connect flow (required Workspace, never worked for non-Gmail users) with a platform-level BoldSign API key.

- `esignService.js` rewritten: Track A = BoldSign (BOLDSIGN_API_KEY), Track B = SOCIII native fallback
- Settings row replaced with static "Platform account" badge — no connect button needed
- `handleBoldSignDocumentStatus` for checking signature status by documentId
- Cost: $0.75/document

---

## QA-001 Results

| Check | Result |
|-------|--------|
| alex-awareness | ✓ PASS |
| canvas-render | ✓ PASS |
| action-handlers | ✗ P0 × 2 (pre-existing: IR warrant step routes) |
| catalog-completeness | ✗ P1 × 1004 (pre-existing: auto-dealer + aviation structural fields) |
| dead-code | ✓ PASS |
| feature-smoke | ✓ PASS |
| hardcoded-defaults | ✓ PASS |
| state-machine | ✓ PASS |
| template-sanity | ✓ PASS |
| tool-inventory | ✓ PASS |
| chat-smoke | ✓ PASS |

**No new regressions introduced today.** Pre-existing gaps (auto-dealer catalog fields, IR warrant routes) are not in scope for this session.

---

## Open Gaps

- **Two-call problem:** Alex reads a file (tool call 1) then needs to generate a document (tool call 2). With `tool_choice: none` on follow-ups, the second tool call can't fire from the same follow-up. Alex works around this by completing the analysis in text, then user asks for the spreadsheet separately. A proper fix would allow `generate_document` specifically on the second pass.
- **Drive token refresh:** Attached files sometimes fail Drive persistence with a proxy/token error. File remains usable in chat only. Root cause is Drive OAuth token expiry.
