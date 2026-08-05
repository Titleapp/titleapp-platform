# CODEX 66 — Patch Notes Round 2

**Source:** Red-team review of v2  
**Applied to:** `66-worker-persona-and-distress-protocol.md` → v3  
**Items:** 1 blocking, 2 real risk, 1 yellow, 2 green

---

## ⛔ BLOCKING — Classifier timing: always synchronous; async describes the alert pipeline only

**Problem:** §3.2 says "inline for red path; async for yellow" — but severity is the classifier's *output*. You cannot make the inline/async decision before the classifier runs. If a system guesses "async" on a message that turns out red, the safety acknowledgment in §3.4 goes out after the normal response has already been delivered. The entire point of the classifier is to gate the response before the user sees it.

**Patch:** The classifier always runs synchronously, immediately after a regex match, before any response is generated. This is a single fast call (~300ms) — not a bottleneck.

What is legitimately async is the *downstream pipeline* after severity is known:
- **Yellow confirmed:** normal response is released; alert write and reviewer notification run async after.
- **Red confirmed:** safety acknowledgment substitutes the response (inline); alert write + SMS run async after — but the response gate happened synchronously.
- **None confirmed (classifier overrides regex):** normal response released immediately; no alert.

Rewritten timing block:

```
After any regex match, the classifier runs synchronously before the response is generated.

Severity output determines:
  none   → release normal response. Done.
  yellow → release normal response; write alert + notify reviewer async.
  red    → substitute safety acknowledgment (§3.4); write alert + SMS async.

"Async for yellow" describes the alert pipeline, not the classification step.
```

**Fail-safe:** If the classifier call errors or times out (rate limit, network blip, malformed JSON), fail closed:
- Treat the message as severity=yellow minimum
- Hold the response; do not deliver the normal reply
- Write a `distress_classifier_error` flag to the alert feed
- Release a generic acknowledgment: "I want to make sure you're doing okay — is there anything you need right now?"

Fail-open (deliver normal response, log nothing) is not acceptable on a safety path. This default must be stated explicitly in `platform_distress_v1.json` and not left to implementer discretion.

---

## 🔴 REAL RISK — Add third-party-red branch with its own script

**Problem:** §3.4's imminent-risk script is entirely self-referral voice: "I want to make sure *you're* safe... reach out to 988 right now." The case `isSelf: false` AND `severity: red` — e.g., "My classmate just told me they're going to hurt themselves tonight" — is arguably the highest-urgency scenario in the whole protocol. Responding with self-referral language wastes the critical seconds where the correct action is activating emergency response for someone else. The person talking to Hannah can act; they need to know how.

**Patch:** §3.4 branches on `isSelf`:

**Self-referral red (`isSelf: true`)** — unchanged from v2:
> "What you're describing sounds serious and I want to make sure you're safe. Please reach out to [domain resource] and 988 right now. I'll be here when you're ready."

**Third-party red (`isSelf: false`)**:
> "This sounds urgent. If [the person] is in immediate danger, call 911 [or campus emergency: xxx-xxxx] right now — don't wait. If you're not sure whether it's an emergency, you can also call 988 and they'll help you decide what to do. You're doing the right thing by taking this seriously."

Key differences from self-referral script:
- Lead with action the *listener* can take, not resources for themselves
- Name 911 / campus emergency explicitly as the first option for imminent third-party risk
- 988 framed as a decision support tool ("help you decide"), not a primary crisis line for the third party
- No "I'll be here when you're ready" — the listener needs to act now, not return to Hannah

**Alert flag for third-party-red:** `isSelf: false` in the flag document. The SMS to `safetyContact` fires the same as self-referral red, since a third party may be at risk. Reviewer context: the `reason` field will indicate this is a report about another person.

---

## 🔴 REAL RISK — `safetyContact` needs a production-activation gate, not just a fallback

**Problem:** §3.6 calls `safetyContact` "required before any worker... can be fully activated in a production context" — but the only enforcement described is a fallback (log `safety_contact_missing`, alert admin). A fallback catches the failure after it has already happened. Given the pattern established in CODEX 65 (duty-limit gate ships as enforced, not aspirational), this needs the same treatment.

**Patch:** Add a second check to the deploy/activation validation hook (alongside the `platform_distress_v1` ruleset check in §6):

```
Worker activation check — production only:
  IF worker loads platform_distress_v1
  AND tenant.safetyContact is null or missing required fields (name + phone)
  THEN block activation with:
    ERROR: safetyContact required for workers using platform_distress_v1.
    Configure tenant.safetyContact (name, phone) before activating this worker
    in a production context. (CODEX 66 §3.6)
```

Development/staging contexts exempt (safetyContact not required for non-production tenants). The `safety_contact_missing` fallback behavior in §3.6 remains — it handles the case where a contact is removed after activation — but it is a net, not a gate.

---

## 🟡 FERPA — Mode 2 (session-link gated) may also require DPA language

**Problem:** §3.5's table flags "FERPA DPA must cover explicitly" only for mode 3 (session-copy retained). But session-link-gated access grants a human — plausibly campus or faculty staff — access to a student's actual conversation transcript. Whether that constitutes an educational-record disclosure under FERPA does not depend on whether the mechanism is a link or a copy; it depends on the content and who is accessing it.

**Patch:** Add a FERPA note to mode 2's consent language:

> "A designated safety contact may view the conversation if a safety flag is triggered. Access is logged. **Note for institutional deployments (K-12, higher education):** conversation content accessed via this mechanism may constitute an educational record under FERPA. Confirm with your institution's privacy office and Data Processing Agreement before activating session-link-gated review for student-facing workers."

The table no longer implies that only mode 3 requires FERPA attention. This should also be a named item in the IRB consent for Ruthie's study.

---

## 🟢 Regex cleanup — remove redundant patterns

`thinking of (quitting|ending|giving up)` already covers `thinking of ending` and `want to give up` as they appeared in the v2 pattern list. Remove the redundant entries before the pattern is copy-pasted into downstream rulesets.

Cleaned pattern list:
```
(panic attack|can't cope|thinking of (quitting|ending|giving up)|
suicid|self.harm|can't make (payroll|rent)|drinking (before|to cope)|
don't want to (fly|go in|be here)|can't go on|feeling hopeless|
harming (myself|themselves|himself|herself))
```

---

## 🟢 Third-party guidance — generalize "supervisor" to avoid Hannah-specific language in a Level 1 rule

**Problem:** §3.2's third-party guidance example says "how to approach a supervisor" — but a nursing student worried about a classmate has no supervisor to approach in that context. Level 1 rules should not bake in role-specific language.

**Patch:** Replace "how to approach a supervisor" with:

> "the appropriate person or authority for this situation — an instructor, an RA, a clinical coordinator, or emergency services depending on the context"

---

## Summary of changes to v3

| Section | Change |
|---------|--------|
| §3.2 timing | Classifier always synchronous after regex match; "async" = alert pipeline only |
| §3.2 fail-safe | Fail-closed on classifier error: hold response, write `distress_classifier_error`, release generic acknowledgment |
| §3.4 | Third-party-red branch added with distinct script (911 first, 988 as decision support) |
| §3.5 mode 2 | FERPA DPA note added; table no longer implies mode 3 is the only FERPA concern |
| §3.6 | safetyContact production-activation gate added to deploy hook |
| §3.2 regex | Redundant patterns removed |
| §3.2 third-party example | "supervisor" generalized to "appropriate person or authority" |
| §6 open items | safetyContact activation gate added; FERPA/IRB note updated |
