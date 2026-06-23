# CODEX Surface 5 — Consumer Surfaces (white-label portal + advisor affirm)

**Status:** 🟡 prototype built, unwired, un-deployed · **depends on Surface 1** · 2026-06-22
**Full detail + 9-point red-team:** [`../CODEX-CUSTOMER-PORTAL.md`](../CODEX-CUSTOMER-PORTAL.md)
**Why it matters:** the demo showed the operator (Dr. Chen running her business) but not the
**customer** — "a huge miss." The customer surface is where "why should you care" lives, on both
sides, and it leads the videos.

---

## Objective
A white-label, chat-first customer surface — pet owner / advisor / any client — onboarded by a
link or QR, skinned by the door (not the person), records owned for life. One primitive, skinned
per company. The customer never sees the operator cockpit.

## What's built vs. the gap (audit 2026-06-22)
**Built (unwired):** `apps/business/src/pages/ClientPortal.jsx` prototype (skinned by `?company=`,
persona by `?persona=`) + the `/portal` route block in `App.jsx` (stashed, **un-deployed** per
Sean). Reuses `ChatPanel` + the canvas. Pet-owner: chocolate-toxicity triage (safety-in-reply),
booking, owned records. Advisor: affirm agreement + 83(b) already in Vault.

**The gap + risk:** it's scripted/unwired, and it **inherits the cross-tenant leakage bug
(R2 = Surface 1)** plus R1 (vet medical advice) and R3 (silent-port takeover). Cannot touch real
customer data until Surface 1's cross-tenant suite is green.

## Turn-on tasks (summary — see CUSTOMER-PORTAL for phases)
- [ ] **T0 — (dependency)** Surface 1 cross-tenant suite green (R2).
- [ ] **T1 — R1 safety-in-reply** (Sean's fix): triage info only + conservative escalation +
      disclaimer + human handoff, the way OpenAI/Anthropic put safety in the answer. Vet owns the rules.
- [ ] **T2 — Wire the portal** read-path to only records explicitly shared into *that* relationship.
- [ ] **T3 — R3 OTP** on silent-port (phone/email match ≠ unverified access).
- [ ] **T4 — Advisor affirm** flow: dormant-until-activated, agreement pre-placed in Vault, affirm
      = attestation (real — Scott signed; advisors onboard for actual paperwork).
- [ ] **T5 — Label demo-grade** in the video; never represented as a live medical service.

## RED TEAM (pointers — full 9 in CUSTOMER-PORTAL.md)
- 🔴 **R1** vet advice = practicing medicine → safety-in-reply, vet-owned rules, escalation.
- 🔴 **R2** cross-tenant leakage → **Surface 1 is the hard dependency.**
- 🟠 **R3** silent-port takeover → OTP.
- 🟠 **R4** comms "no approval hell" over-promised → "zero approval *for them*, we run the rails."
- 🟡 **R5** CRM auto-account may be unlawful → provisioned-but-dormant until user activates.
- 🟡 **R6** cross-sell can anger the business → tenant setting, footer not interstitial.
- 🟡 **R7** scripted-demo vs. safe-shippable → ship bounded (curated Q&A + escalation) first.
- 🟡 **R8** voice = separate harder CODEX → out of v1.
- 🟡 **R9** reputational transfer to the vet → "powered by, not authored by" + easy handoff.

## Sign-off gate
Per 100-DAY §7: plan approved · portal labeled demo-grade with R1 safety-in-reply · Surface 1
green before real data. Route stays wired-but-undeployed until then.
