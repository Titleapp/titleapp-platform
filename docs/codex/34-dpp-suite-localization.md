# CODEX 34 — DPP Suite Localization: Client (NL/DE) + Supplier (ZH)

**Status:** SPEC — for demo readiness
**Suite:** EU DPP · cross-cutting (touches CODEX 29, 30, 31)
**Trigger:** Demo requirement — worker must present in Dutch, German, Mandarin, and English
**Owner:** Elise / Volta Advisory — build support via Claude Code

---

## 1. Scope Correction: This Is Two Localization Scopes, Not One

Mandarin is not an EU language, which is the tell that this isn't a single flat "translate into 4 languages" task. It splits along the suite's own access-mode boundary:

| Scope | Languages | Worker | Audience |
|---|---|---|---|
| **Client demo** | Dutch, German, English | CODEX 29 (Compliance Auditor) + CODEX 30 (Passport Builder) | Voltara, HOPPECKE — EU battery manufacturers, client-mode users |
| **Supplier demo** | Mandarin, English | CODEX 31 (Supply Chain Tracer) — Supplier Portal | Upstream cell/materials suppliers, typically China-based, supplier-mode users |

Treat these as two separate build tasks with two separate string sets. Do not build one shared translation table across both scopes — the vocabulary is different (client-facing compliance language vs. supplier-facing data-request language) and the access mode is already separately gated per CODEX 30/31's Firebase custom claims.

---

## 2. What's Already Free — No Build Required

**Elara's conversational responses are multilingual today, with no new infrastructure.** This is native LLM capability — the chat persona can detect or accept the user's language and respond in kind in Dutch, German, Mandarin, or English right now. Add a one-line system-prompt instruction (e.g., "respond in the language the user writes in; default to English if unclear") and this is done.

**Do not spend engineering time building a translation layer for chat.** If Claude Code is asked to "localize Elara," the correct answer is a prompt instruction, not a string-translation pipeline.

---

## 3. What Actually Needs Building

Two distinct categories, with different risk profiles:

### 3a. Static UI chrome (translate now — low risk, finite scope)
Tab labels, button text, tooltip copy, charge-bar state labels ("Ready for advisor review," not "Ready for submission" — the exact wording matters and must be preserved across every language, not loosely re-translated), form field labels, error messages.

This is fixed-string translation. Externalize every UI string to a locale key (`i18n` pattern — do not hardcode English strings anywhere in canvas components) and provide translation tables for `nl`, `de`, `zh`, `en`.

### 3b. Generated content (flag as a bigger lift — do not treat as equivalent to 3a)
Gap-analysis reports, compliance memos, and other dynamically generated prose are a different problem than translating fixed UI strings — this is the exact capability the original codex flagged as **not built** ("24 EU languages, automated — not built"). For the demo, generated reports can reasonably stay in the operator's language (Elise reviews in English) with the *client-facing summary* translated — but full automated multilingual report generation is out of scope for this demo pass. State this explicitly to whoever is running the demo so nobody discovers the gap live in front of a client.

### 3c. Explicitly out of scope: the JSON-LD passport itself
Annex XIII attribute names, units, and ISO 8601 dates are standardized structured data, not prose — the passport export does **not** get localized regardless of demo language. Confirm this is the shared understanding before build; if there's any expectation the actual registry submission changes by language, that needs to be raised separately (and would likely be wrong — the registry format is fixed by regulation, not by client locale).

---

## 4. Translation Quality — Compliance Copy Needs Native Review, Not Just MT

Machine-translating compliance/regulatory terminology carries real risk — a mistranslated attribute name or a garbled compliance-status label isn't just an embarrassing demo bug, it's the kind of error that could confuse an actual compliance lead about what their obligation is. Recommend:

- **Dutch and German** (Voltara and HOPPECKE's actual languages, not just demo languages): native-speaker review of every string in category 3a before the demo, especially anything touching compliance status or the charge-bar labels.
- **Mandarin**: same standard for Supplier Portal strings — a supplier misreading what data is being requested of them is a real operational failure mode, not just a demo polish issue.
- Machine translation is fine as a first draft; do not ship untreated MT output for compliance-facing copy.

---

## 5. Language Selection Mechanism

Add a `locale` preference field, scoped to the user session/profile — not tied to access-mode claims (locale and role are independent; a client-mode Dutch user and a client-mode German user both use the same `role: "client"` claim with different `locale` values). Default detection order: explicit user selection > browser locale > `en` fallback. Keep this simple for the demo — a manual language switcher in the canvas header is sufficient; auto-detection can come later.

---

## 6. Build Prerequisites

**Client scope (CODEX 29 + CODEX 30):**
- Externalize all Tab 1–4 UI strings (Compliance Auditor + Passport Builder canvases) to locale keys
- Dutch and German translation tables, native-reviewed
- Locale switcher in canvas header
- Confirm charge-bar label wording ("Ready for advisor review") is translated consistently and reviewed — this exact phrase exists because of a prior compliance-framing fix; a sloppy translation could reintroduce the "implies submission-readiness" problem in a different language

**Supplier scope (CODEX 31):**
- Externalize Supplier Portal UI strings (Tab 1–4) to locale keys
- Mandarin translation table, native-reviewed
- Locale switcher scoped to supplier-mode canvas

**Both scopes:**
- One-line system prompt addition for Elara: respond in the user's language, default English
- `locale` field added to user profile/session schema

---

## 7. Build Steps

1. Add `locale` field to user session schema; wire locale switcher UI (client canvas)
2. Externalize CODEX 29/30 UI strings to locale keys; build `en`/`nl`/`de` tables
3. Native-speaker review pass on `nl`/`de` tables, with explicit sign-off on charge-bar and compliance-status wording
4. Add Elara system-prompt instruction for multilingual chat response (no separate build needed — one prompt line)
5. Add locale switcher to supplier-mode canvas (CODEX 31)
6. Externalize CODEX 31 Supplier Portal UI strings to locale keys; build `en`/`zh` table
7. Native-speaker review pass on `zh` table
8. Explicitly confirm with whoever runs the demo: generated reports (3b) and the JSON-LD export (3c) are NOT localized — brief the demo narrative accordingly so this isn't discovered live

---

## 8. Sign-off Gate

- [ ] Client canvas (CODEX 29/30) fully navigable in Dutch and German — no untranslated English strings remaining in Tab 1–4
- [ ] Supplier Portal canvas (CODEX 31) fully navigable in Mandarin — no untranslated English strings remaining in Tab 1–4
- [ ] Charge-bar and compliance-status wording specifically reviewed by a native speaker in each language — not just generically translated
- [ ] Elara responds correctly in Dutch, German, Mandarin, and English in live chat with no additional tooling beyond the system-prompt instruction
- [ ] Locale switcher present and functional in both client and supplier canvases
- [ ] Demo runner briefed that generated reports and the JSON-LD export remain unlocalized in this pass

---

*This codex is scoped to demo readiness. Full automated multilingual report generation (3b) remains a future build item, not part of this pass — do not conflate the two when estimating effort.*
