# 1. Account Setup

Creating a SOCIII account takes about three minutes. You'll need an email address, a phone number, and a method of identity verification (driver's license, passport, or state ID — same documents a bank would ask for).

This section walks through what happens, why each step matters, and what to do if anything stalls.

---

## What you'll have when you're done

- A SOCIII account, accessible at **sociii.ai**, signed in via magic link.
- A personal workspace — your own corner of the platform, separate from any company workspace you might join later.
- Your identity verified to **Tier 1** (standard for most platform actions). Higher tiers unlock when you need them (Stripe payouts, blockchain audit, etc.).
- 100 free inference credits to try your first worker.

---

## Step 1 — Email and magic link

Open **sociii.ai** in any browser.

Click **Sign in**. Enter the email address you want associated with your SOCIII account.

[Screenshot: sign-in page with email field]

You'll receive a magic link by email within a few seconds. The link is valid for 15 minutes. Clicking it signs you in — no password to remember.

**Why magic links and not passwords?** Passwords are the source of more than 80% of breaches in consumer SaaS. Magic links use the security of your email account, which you've already secured. If your inbox is locked behind two-factor authentication, your SOCIII account inherits that protection.

If the magic link doesn't arrive in two minutes, check spam. If it's not there, request a new one — the previous link will be invalidated.

---

## Step 2 — Your name and persona shape

After signing in, the platform asks for your first name, last name, and a one-line description of how you'll use it. This isn't a profile-completeness ritual — what you write here is what **Alex**, your Chief of Staff, reads to decide which workers to recommend.

[Screenshot: persona setup card]

Examples of useful one-liners:
- *"I'm a pilot flying a PC-12 part-time and need help with logbook and currency tracking."*
- *"I run a small auto dealership in Illinois and want to handle the title and registration paperwork without hiring more staff."*
- *"I'm a writer working on a novel and curious about the Long-Form Author worker."*

Examples that don't work as well:
- *"I want to make money."* (too vague — Alex can't recommend anything specific)
- *"Everything."* (Alex will default to the platform tour)

You can edit this later from Settings → Persona. It's not locked in.

---

## Step 3 — Identity verification

SOCIII uses **Stripe Identity** to verify you're a real person. The flow takes ~3 minutes and asks for:

1. A government-issued photo ID (driver's license, passport, or state ID)
2. A live selfie taken from your phone or laptop camera
3. Your full legal name and date of birth

[Screenshot: Stripe Identity initial card]

**Why verify?** Three reasons:
- **Fraud prevention.** SOCIII is a financial surface — credits, payouts, blockchain records — and fraud is expensive for everyone.
- **Regulatory compliance.** Identity verification is required for parts of the platform that touch payments or compliance-regulated workflows.
- **Trust between users.** When you subscribe to a worker built by another user, you want to know that user is real.

**Tiers:**
- **Tier 0 (no verification):** browse the marketplace, view public content. No actions.
- **Tier 1 (standard):** verified ID + selfie. Most platform actions, including subscribing to workers, using chat, storing documents in your Vault.
- **Tier 2 (enhanced):** Tier 1 + verified business or professional credentials. Required for publishing workers, certain regulated verticals.

You start at Tier 0 the moment you sign in. Tier 1 verification kicks off automatically when you take an action that requires it. You don't have to do it upfront unless you want to.

**Cost:** Verification is free for users on the Investor or Advisor flows (SOCIII pays the verification fee). Creators pay a one-time $2 verification fee bundled with their annual Creator License. All other users — Tier 1 verification is free.

---

## Step 4 — Pick a plan

Plans:

| Plan | Price | Credits | Best for |
|---|---|---|---|
| Free | $0 | 100/month | Trying the platform |
| Tier 1 | $29/month | 500/month | Light personal use |
| Tier 2 | $49/month | 1,500/month | Active personal or small team |
| Tier 3 | $79/month | 3,000/month | Power user, multiple workers |
| Enterprise | Custom | Custom | Multi-seat teams, custom workflows |

You can change plans any time from Settings → Plan. Downgrades take effect at your next billing date; upgrades take effect immediately.

**On credits:** every worker action consumes credits. Simple actions cost 1 credit; complex AI generations cost 5-15; some specialized actions (eSign, OCR) cost 30-50. The catalog shows credit cost per worker action before you commit.

**Overage:** if you blow through your monthly credits, the platform doesn't lock you out. Each additional credit costs $0.02. You can cap your overage in Settings → Billing → Overage Limit.

---

## Step 5 — You're in

You land on your personal workspace home. From here:

- **Top left**: nav with your workers, your spine (Contacts, Accounting, HR, Drive, Calendar), and your Vault.
- **Center**: the chat surface with **Alex**, your Chief of Staff. Tell Alex what you're trying to do; Alex routes you to the right worker or answers directly.
- **Right**: the **Canvas** — where worker outputs, structured objects, and your in-progress work live.

For what to do next, see [Section 3 — Your First Worker](./05-your-first-worker.md).

---

## Troubleshooting account setup

| Issue | Fix |
|---|---|
| Magic link didn't arrive | Check spam. If not there, wait 60 seconds and request again. Make sure you're checking the same email you typed in. |
| Stripe Identity says my ID is unreadable | Try better lighting and a flat surface. Avoid glare on the ID. If still failing after three attempts, contact support@sociii.ai with a photo of your ID and we'll verify manually. |
| Selfie won't capture | Allow camera permissions in your browser. If on iOS Safari, force-quit and reopen. Chrome on desktop is most reliable. |
| Magic link expired | Request a new one. The previous one is invalidated automatically. |
| I get "account exists" but I don't remember signing up | Use the same email to sign in (magic link still works). If genuinely not you, email support@sociii.ai for verification. |
| Plan change didn't take effect | Upgrades are immediate; downgrades happen at the next billing date. Check Settings → Plan to see the scheduled change. |

---

*Account setup takes 3 minutes if everything goes smoothly. If anything's stuck for more than 10 minutes, email support@sociii.ai — we'd rather hear about a stuck signup than have you bounce.*
