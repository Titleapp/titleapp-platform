# Creditor Formalization Letter — Template

**Used by:** Pre-formation creditor warrant flow
**Recipients:** Robert Rosenberg, Chris Dunn, Mike Lee (initial batch); other pre-formation creditors per `Pre-Formation-Creditor-Warrants-Memo-2026-05-22.md`
**Sent from:** sean@sociii.ai
**Delivery:** Personal send from Sean (NOT platform-send for the first batch — these are personal relationships and the warmth matters)
**Effective:** Send this week (2026-05-26 through 2026-05-30)

---

## Subject line

- "Formalizing your position at SOCIII"

Subject should be quiet and specific. These are people Sean has known for years. No marketing copy.

---

## Letter body

```
Dear {{creditor_first_name}},

I want to formally close the loop on something that's been informal for
too long.

You extended {{loan_description}} during {{prior_venture}}, and the
arrangement has been operating on a handshake since. The new corporate
structure — SOCIII Inc., a Delaware C-corp formed earlier this month —
makes this the right moment to paper it cleanly, with the patience you
showed acknowledged in the cap structure.

What I'm proposing, specifically:

  • Your existing principal of {{principal_amount}} is transferred from
    {{prior_entity}} to SOCIII Inc., on the same terms it operated under.
  • Interest accrues at {{interest_rate}} {{interest_terms}}, beginning
    {{interest_start_date}}.
  • {{#personal_guaranty}}
    My personal guaranty stays attached. SOCIII Inc. is the primary
    obligor; I remain personally responsible if the company can't pay.
    {{/personal_guaranty}}
  • You receive {{warrant_tier_description}} — warrants for
    {{warrant_basis_points}} basis points of SOCIII Inc., struck at the
    valuation cap of the upcoming round. The warrants vest immediately on
    execution of this agreement. This is the recognition piece — the
    patience deserves a share in the upside, not just a return of the
    principal.

The warrants are absorbed from my founder allocation, not from the
incoming investors' dilution. That's important to me: the people who
made the prior work possible are paid first from my own slice, before
anyone new sees the cap table.

Documents:

  • The loan transfer agreement (papers the principal moving to SOCIII).
  • The warrant agreement (papers the basis-point grant).
  • A short closing memorandum (records the structure for your files).

The whole thing takes about ten minutes through the SOCIII platform:
the system sends you a magic link, you do a brief identity verification
(about three minutes, SOCIII covers the fee), you review and sign all
three documents in Dropbox Sign, and the executed package files in your
own SOCIII Vault. You'll receive copies by email when the signing
completes.

{{#special_circumstance}}
{{special_circumstance_note}}
{{/special_circumstance}}

If you want to talk through it before signing — including the warrant
math or the personal guaranty structure — my calendar is here:
{{office_hours_url}}. Or call me directly.

Thank you for the patience. The work this past year is the most
interesting I've done, and a non-trivial part of why that work exists is
because you said yes when saying no would have been easier.

With aloha,

Sean
```

---

## Merge fields the template uses

| Field | Source / value |
|---|---|
| `creditor_first_name` | Creditor record |
| `loan_description` | Per-creditor: "a $100,000 loan during the HOM DAO buildout," "a $50,000 loan during the RealEx phase," etc. |
| `prior_venture` | "HOM DAO," "RealEx," "TitleApp LLC," etc. |
| `principal_amount` | Per-creditor |
| `prior_entity` | The LLC or arrangement under which the loan was made |
| `interest_rate` | Default "4%"; per-creditor override possible |
| `interest_terms` | Default "compounded quarterly"; per-creditor override |
| `interest_start_date` | Default "the date of this agreement"; per-creditor override (e.g., backdated for clean math) |
| `personal_guaranty` | Boolean — true for Robert Rosenberg (the stolen $100K case requires the personal guaranty to remain attached); flagged per-creditor |
| `warrant_tier_description` | "Single-venture creditor warrants" / "Two-venture creditor warrants" / "Three-venture creditor warrants" per the memo's tier structure |
| `warrant_basis_points` | Per-tier basis points calculation from the memo (e.g., 25 bps for single-venture, 50 bps for two-venture, 100 bps for three-venture — confirm with the memo's table) |
| `special_circumstance` | Boolean — true for Robert specifically; triggers a paragraph acknowledging the stolen-$100K context with directness (Sean drafts this in person per recipient, not from a template) |
| `special_circumstance_note` | Sean-authored per-creditor; mandatory for Robert |
| `office_hours_url` | Cal.com / native booker |

---

## Initial recipient list

Per `Pre-Formation-Creditor-Warrants-Memo-2026-05-22.md`, ~8 documented stakeholders totaling ~$615K exposure across three prior ventures:

- **Robert Rosenberg** — stolen $100K context, personal guaranty stays attached, special handling required. Send first; Sean drafts the special_circumstance_note in person.
- **Eric Altshuler**
- **Peter Farrelly** (HOM DAO contributor — also intended-shock audience for the *Hamilton v Che* novel; the creditor letter and the eventual novel arrive separately)
- **Mike Lee**
- **Chris Dunn**
- **Dan Bass** (with Bass family / HUB Culture follow-on framing per the memo)
- **Stan Stalknaker**
- **Tony Grenberg**

Sean confirms send order. Robert + Chris + Mike are this week per Sean's directive 2026-05-25.

---

## The three signing documents

1. **Loan Transfer Agreement** — papers the principal moving from prior entity to SOCIII Inc. Counsel-drafted; the Pre-Formation memo's structure governs.
2. **Warrant Agreement** — papers the basis-point grant, struck at the upcoming round's cap. Kent's warrant template variant works here; per-creditor warrant_basis_points is the only field that varies.
3. **Closing Memorandum** — short prose record of the structure, for the creditor's files. Cleaner than the legal documents alone; explains the logic in plain language.

Template env var: `DROPBOX_SIGN_TEMPLATE_CREDITOR_FORMALIZATION` — TBD. Three separate templates may be required (one per document), or a single combined Dropbox Sign packet.

---

## When SendGrid is not ready

For creditors specifically, the letter is **always** personal-send from Sean's Workspace, regardless of SendGrid status. Reasons:

- These are personal relationships. Sean's voice in the email matters.
- The first send for each creditor is a one-to-one conversation, not a mass send.
- The signing flow (magic link → KYC → Dropbox Sign → Vault) is independent of email delivery.

Sean composes the email in the platform's preview surface with merge fields filled, copies the rendered text, sends from sean@sociii.ai via Google Workspace.

The magic link in the email triggers the platform signing flow when clicked.

---

## Per-creditor send order (suggested)

1. **Robert** — most personal context. Sean writes the special_circumstance_note from a clean draft, in person, no template.
2. **Chris Dunn**
3. **Mike Lee**

Then in second wave:
4. Eric Altshuler
5. Peter Farrelly (separate from the Hamilton v Che novel arc; do not conflate)
6. Dan Bass
7. Stan Stalknaker
8. Tony Grenberg

Sean's call on actual order. Each letter requires the personalized fields filled — no batch-send.

---

*Drafted 2026-05-25 for this week's sends. The Pre-Formation-Creditor-Warrants-Memo-2026-05-22.md governs the structural decisions; this template renders the letter. Counsel reviews the underlying legal documents before any send.*
