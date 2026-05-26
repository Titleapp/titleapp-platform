# Advisor Invitation Letter — Template

**Used by:** IR Worker advisor flow
**Sent from:** sean@sociii.ai
**Delivery:** Platform send via SendGrid (gated on sociii.ai domain auth); fallback to Sean's Workspace if SendGrid not ready
**Effective:** 2026-05-26 first sends

---

## Subject line variants (A/B testing)

- "Joining SOCIII as an advisor"
- "Would you advise SOCIII?"
- "An advisor seat at SOCIII"

---

## Letter body

```
Dear {{advisor_first_name}},

I'm writing to ask if you'd be willing to formally advise SOCIII — the
platform I've been building since 2024, now operating as a clean Delaware
C-corp.

The short version of what we're doing: SOCIII is an AI agent platform
that's different from the ChatGPT-wrappers and agent frameworks shipping
this year in three specific ways. Every output carries a verifiable
audit trail. Every worker runs inside a rules engine that domain experts
configure to enforce their professional rules — RAAS guardrails. And the
Sandbox lets anyone — including people who can barely open their phone —
build a worker by describing what they do. The platform's accessibility
moat is the people who know the work, not the people who know to code.

Six provisional patents filed last week covering the core architecture.
The pre-seed round is open now; Storyhouse Ventures is doing the friendly
first walkthrough this Thursday.

What I'm asking, specifically:

  • A formal advisor relationship for {{vesting_period}}.
  • Two percent equity in SOCIII Inc., vesting on a {{vesting_schedule}}.
    {{#legacy_titleapp_relationship}}
  • A mutual release of any prior relationship with TitleApp LLC, attached
    as a separate section of the advisor agreement. This is administrative
    — we want the SOCIII advisor relationship to start clean.
    {{/legacy_titleapp_relationship}}
  • Approximately one hour of your time per month, plus our quarterly
    investor + advisor call (next one is {{next_quarterly_call_date}}).

What you'd be helping with, specifically:

  {{personalized_role_description}}

If this is interesting, the next step is short. The platform will send
you a magic link, you'll do a brief identity verification (about three
minutes, SOCIII covers the fee), you'll review the advisor agreement in
Dropbox Sign, and you'll sign. The executed agreement files in your own
SOCIII Vault for your records. Total time end to end is about fifteen
minutes.

If you'd rather talk first, my calendar is here: {{office_hours_url}}.
Happy to walk through the deck and answer any questions before you commit.

Either way — thank you for considering it. The work this past year has
been the most interesting of my career, and the advisors I'm inviting are
the ones whose judgment I want to operate inside.

With aloha,

Sean
```

---

## Merge fields the template uses

| Field | Source |
|---|---|
| `advisor_first_name` | Investor record |
| `vesting_period` | Default "two years"; per-advisor override possible |
| `vesting_schedule` | Default "monthly vesting with a one-year cliff" — confirm with counsel |
| `legacy_titleapp_relationship` | Boolean — true if advisor had a prior TitleApp LLC relationship (Scott Eschelman and others); triggers the mutual-release clause |
| `next_quarterly_call_date` | Pulled from `quarterlyCalls` Firestore doc |
| `personalized_role_description` | Sean-authored per advisor — 2-3 sentences describing the specific thing this advisor brings (e.g., for Scott: "Commercial real estate development, the BuildSF playbook, and the specific intersection of CRE workflows and platform incentives that has shaped your career"). Mandatory per-advisor customization. |
| `office_hours_url` | Cal.com (stopgap) → native booker |

---

## The advisor agreement (Dropbox Sign template)

This letter announces the agreement. The agreement itself is **Kent's warrant template, counsel-approved** — see `Pre-Formation-Creditor-Warrants-Memo-2026-05-22.md` for the structural decisions.

Template environment variable: `DROPBOX_SIGN_TEMPLATE_ADVISOR_WARRANT`. Sean uploads the PDF to Dropbox Sign and sets the env var (task #278).

The agreement carries an optional `include_legacy_titleapp_release: bool` field — set true for any advisor with a prior TitleApp LLC relationship to include the mutual-release section. Default false.

---

## Sending priority order (for Monday 2026-05-26)

Sean confirms the final list before send. Suggested initial batch:

1. **Scott Eschelman** — first send. Long relationship, BuildSF, gets the commercial RE Development worker bundle on wind-down. Legacy TitleApp release required.
2. (Sean's remaining ~4 advisor slots — Sean to name)

Hard rule: each letter requires Sean's personalized `personalized_role_description`. No template-blank sends.

---

## When SendGrid is not ready

If sociii.ai domain auth is still pending Monday:

1. Sean copies the rendered letter from the platform's preview surface (with merge fields filled).
2. Sean sends from sean@sociii.ai via Google Workspace manually.
3. The advisor magic link in the letter still works — they click, land on the platform, do KYC, sign.
4. Once SendGrid is verified, switch back to platform-send for subsequent advisors.

The signing flow itself is independent of email delivery. Manual email + platform signing is a clean fallback.

---

*Drafted 2026-05-25 for Monday 2026-05-26 send. Sean reviews + approves per advisor before send.*
