# CODEX 66 — Patch Notes Round 1

**Source:** Red-team review of v1  
**Applied to:** `66-worker-persona-and-distress-protocol.md` → v2  
**Items:** 2 blocking, 2 real risk, 2 yellow, 3 green

---

## ⛔ BLOCKING — Replace regex-only detection with classifier pipeline

**Problem:** The pattern list in §3.5 does double duty it can't handle. False positives that will fire constantly:
- "thinking of quitting" → fires on normal business pivot question
- "can't make payroll" → fires on routine accounting question (that's the accounting worker's actual job)
- "don't want to fly" → fires on travel scheduling grumble

No negation, no third-party handling ("my coworker has been drinking before flights"), no past tense ("I used to feel that way but I'm past it"). For the one category where a false negative is highest-stakes, regex is the worst tool available.

**Patch:** Two-stage pipeline.

```
Stage 1 — Regex gate (synchronous, every message, ~0ms)
  If no pattern match → pass through to normal response, done.
  If pattern match → enter classifier stage before generating response.

Stage 2 — Classifier prompt (synchronous for red path, async for yellow path)
  Input: the user's message + 3 prior turns of context
  Output (structured):
    {
      isDistress: bool,          // is this about distress at all?
      isSelf: bool,              // is it the speaker, or third-party?
      severity: "none" | "yellow" | "red",
      reason: string             // short explanation, for reviewer
    }

  Classifier prompt:
  "You are a safety classifier. Assess this message for distress signals.
   Reply ONLY with JSON.
   severity=none if this is a routine task message or a past-tense reference.
   severity=yellow if the speaker is expressing active personal stress, struggling,
     or describing a difficult ongoing situation.
   severity=red if the message contains language suggesting imminent risk to the
     speaker or others (explicit self-harm intent, active danger).
   isSelf=false if the distress is about a third party the speaker is observing.
   reason: one sentence explaining your classification."
```

**Imminent-risk tier (red) is now technically defined** — it is severity=red from the classifier output, not "imminent safety language detected" (prose-only). This closes the gap in §3.3 where the red tier had no implementation.

**For red path:** classifier runs inline. Response is held until classification completes. If red: response substitutes the imminent-safety acknowledgment (§3.3) before the normal reply.  
**For yellow path:** classifier runs async. Normal response proceeds. Alert fires after.

---

## 🔴 REAL RISK — Red severity needs its own delivery path, not just a different color

**Problem:** Both yellow and red currently land in the same alert feed queue a human may check on their own schedule. §3.3 tells the user to reach out "right now" — but on the system side, there is no difference in notification speed between a deadline-stress mention and a described imminent self-harm event. Color on a dashboard is not an escalation.

**Patch:**

| Severity | System action |
|----------|---------------|
| yellow | Write to `alertFeed/{uid}/items/` (existing path). Human reviews on their own schedule. |
| red | Write to `alertFeed/{uid}/items/` AND send immediate push notification (via existing `push_alert` → Twilio SMS path) to a designated safety contact defined per tenant. If no safety contact configured, write a `platform_safety_unconfigured` warning to the tenant admin's alert feed. |

**Required tenant config field:** `safetyContact: { name, phone, email }` — optional at setup, required before any worker with red-path capability is activated. If absent when a red flag fires, platform falls back to notifying the tenant admin and logs `safety_contact_missing` to the audit trail.

---

## 🔴 REAL RISK — Flag content: clarify what the reviewer actually sees

**Problem:** §3 says "don't log the user's words" — but a reviewer seeing `{ type, workerId, sessionId, severity, timestamp }` plus the classifier's `reason` field has almost nothing to act on. The spec also doesn't say whether a reviewer can access the session — which is a materially different privacy claim than "we don't store it."

**Patch:** Three explicit options; choose one per deployment context, disclose in consent form:

| Mode | What reviewer sees | IRB / consent language |
|------|-------------------|----------------------|
| **Metadata-only** | Flag fields + classifier reason. No session access. | "You will be notified a conversation triggered a safety flag. You will not see the content." |
| **Session-link (gated)** | Flag fields + time-limited access link to the session transcript, access logged to audit trail. | "A designated safety contact may view the conversation content if a safety flag is triggered. Access is logged." |
| **Session-copy (retained)** | Flag fields + copy of the triggering turn(s) stored separately with restricted access. | Full disclosure in consent; FERPA DPA must cover this explicitly. |

**Default for SOCIII:** Session-link (gated). The session already exists; we're not copying it, just granting time-limited access to an existing record. This is the minimum viable option that lets a human actually triage. The link expires after 48 hours and the access event writes to `auditLog`.

The IRB open item in §6 now reads: "Consent form must specify the reviewer access mode (session-link gated) and that access events are logged."

---

## 🟡 Persona warmth and disclosure risk — add standing guardrail to template

**Problem:** §3.1 notes people disclose more to AI because they feel less judged. Section 2 then optimizes personas for exactly that quality (warmth, never minimizing). The better the persona works, the more disclosure it draws — including disclosure the product isn't equipped to handle. "I'm here if you want to keep working" is fine once; it's a problem as a standing relationship pattern for an isolated user.

**Patch:** Add to the persona template block in §4:

```
**Relationship boundary:**
[PersonaName] expresses genuine care within sessions. [PersonaName] does not
present as an ongoing personal support system or substitute for human connection.
After a distress exchange, [PersonaName] does not re-open the emotional topic in
the same session unless the user does. [PersonaName] never implies it "remembers"
past distress conversations or has continuity of concern across sessions.
```

Add one line to Hannah's reference implementation (§5):
> "Hannah does not present herself as Sara's confidant across sessions. Care is in-session only."

---

## 🟡 Hannah's aviation-adjacent routing is a persona-to-persona handoff, not a safety channel

**Problem:** "Escalate to CoPilot context" sends a distress signal to another AI persona. CoPilot cannot get a human in the loop faster than Hannah. This is a circular handoff that looks like escalation but isn't.

**Patch:** Replace with:

> "If aviation-adjacent distress is detected (flight crew, air medical, operational safety), the referral is the FAA HIMS AME network and/or the operator's ASAP program — both designed for confidential self-referral. Flag severity red if operational safety is implied (e.g., impairment before a flight). Do not route to CoPilot or any other worker persona."

---

## 🟢 Imminent risk: 988 is additive, not a replacement

**Problem:** The context table in §3.2 treats 988 as the "general" category alongside domain resources. If someone disclosing payroll distress also uses imminent-risk language, SCORE mentors are not real-time crisis responders.

**Patch:** 988 (and its international equivalents) is added to any red-severity response alongside the domain resource, never instead of it. Add to §3.2:

> "For red-severity responses, 988 (Suicide and Crisis Lifeline) or the local equivalent is always included in addition to the domain-specific resource. 988 is not a substitute for domain context; it's an additive floor."

---

## 🟢 "Non-overridable" needs a technical enforcement point

**Problem:** Level 1 status is currently a documentation convention. No deploy pipeline check enforces it.

**Patch:** Add to §3.5 implementation notes:

> "Worker deploy validation (pre-deploy hook) must confirm `platform_distress_v1` is present in the worker's loaded ruleset. A worker that does not load `platform_distress_v1` fails deploy with: `ERROR: platform_distress_v1 required for all workers (CODEX 66 Level 1). Add to appliesTo in your worker's ruleset.`"

This matches the pattern used for other platform invariants. The hook lives in the same deploy validation step as capability contract checks.

---

## 🟢 Classifier `reason` field threads the needle on reviewer privacy

The classifier's `reason` field ("one sentence explaining your classification") serves double duty: it gives the reviewer enough context to triage severity without requiring them to read the full session, and it's generated by the classifier — not a copy of the user's words. This makes the metadata-only mode more useful than it sounds. A reviewer seeing `reason: "User described recurring anxiety before clinical shifts and asked if it was normal"` can make a triage decision without the session transcript.

This should be called out explicitly in §3 as the designed bridge between privacy and actionability.

---

## Summary of changes to v2

| Section | Change |
|---------|--------|
| §3.3 | Imminent-risk tier now technically defined as classifier severity=red |
| §3.5 | Two-stage pipeline specified (regex gate → classifier prompt with full schema) |
| §3.2 | 988 is additive floor for red severity, not a peer category |
| §3 (new) | Reviewer access modes table (metadata-only / session-link gated / session-copy) |
| §3 new | Red-severity delivery path: Twilio SMS to safetyContact, fallback to admin alert |
| §4 template | Relationship boundary block added |
| §5 Hannah | Aviation routing fixed (HIMS/ASAP, not CoPilot); relationship boundary added |
| §6 open items | Deploy hook item added; IRB consent item updated with session-link language |
