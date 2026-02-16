# TitleApp Marketing RAAS - GLOBAL

## Overview

This is TitleApp's **marketing, sales, and customer success RAAS** — the AI-powered engine that acquires, onboards, and retains TitleApp customers.

**Dogfooding:** TitleApp uses its own RAAS platform to sell TitleApp. This vertical proves that RAAS works at scale.

---

## Purpose

The Marketing RAAS handles the complete customer lifecycle:

1. **Lead Qualification** — Identify high-intent prospects via chat
2. **Sales Conversation** — Guide prospects through value prop, objection handling, demo
3. **Onboarding** — Convert trial users to paying customers
4. **Customer Success** — Monitor health scores, prevent churn, drive expansion
5. **Refund & Recovery** — Handle cancellations, win-backs, and re-engagement

---

## Architecture

### Workflows (`workflows/`)

- **lead-qualification.json** — Score leads based on intent, vertical fit, company size
- **outreach-sequences.json** — Multi-touch email/SMS/voice campaigns
- **sales-conversation.json** — In-chat sales agent flow (primary entry point)
- **onboarding.json** — Trial activation, feature adoption, payment collection
- **customer-success.json** — Health monitoring, expansion triggers, renewal campaigns
- **refund-and-recovery.json** — Churn prevention, win-back sequences

### Rules (`rules/`)

- **lead-scoring.json** — Qualification criteria (e.g., business email = +10 points)
- **campaign-routing.json** — Which vertical gets which outreach sequence
- **escalation-rules.json** — When to route to human sales rep
- **commission-calculation.json** — Affiliate/partner commission logic
- **customer-health-scoring.json** — Churn risk prediction (usage, support tickets, payment failures)

### Prompts (`prompts/`)

- **sales-agent-system-prompt.md** — Core personality, voice, positioning for sales AI
- **customer-success-prompt.md** — Proactive outreach tone, feature education
- **objection-handling.md** — Responses to common objections (price, security, competitors)
- **outreach-templates.md** — Email/SMS copy for each campaign

### Voice (`voice/`)

- **voice-agent-config.json** — Telephony integration for outbound/inbound calls
- **call-scripts.json** — Sales call flows (discovery, demo, close)
- **voice-compliance.json** — TCPA compliance, opt-out handling, recording disclosures

---

## Integration Points

### Landing Page (titleapp.ai)
- Chat widget → **sales-agent-system-prompt.md**
- Lead form → **lead-qualification.json**
- Route qualified leads → Firestore `leads` collection

### Platform (titleapp.io)
- Trial signup → **onboarding.json** workflow
- Usage tracking → **customer-health-scoring.json**
- Churn signals → **refund-and-recovery.json**

### Backend (Firebase Functions)
- **POST /v1/marketing:qualify-lead** → Runs lead scoring
- **POST /v1/marketing:send-campaign** → Triggers outreach sequence
- **POST /v1/marketing:calculate-health-score** → Computes customer health
- **POST /v1/marketing:handle-cancellation** → Runs refund/recovery flow

---

## Pricing Model

| Vertical | Price | Trial | Commission |
|----------|-------|-------|------------|
| Auto Salespeople | $9/mo | 14 days free | $2 affiliate payout |
| Auto Dealers | $300/mo pilot → 1% commission | 90-day pilot | $300 setup + 0.5% recurring |
| Real Estate Agents | $9/mo | 14 days free | $2 affiliate payout |
| Investment Analysts | $99/mo + 0.1% success fee | 14 days free | $20 recurring + 0.05% deal fee |

---

## Key Metrics (Dashboard)

- **Leads Qualified** — Chat conversations that meet qualification criteria
- **Trial Signups** — Accounts created from landing page
- **Trial → Paid Conversion** — % of trials that become paying customers
- **MRR (Monthly Recurring Revenue)** — Total subscription revenue
- **Churn Rate** — % of customers canceling per month
- **Customer Health Score** — Weighted average health (0-100)
- **Win-Back Success Rate** — % of canceled customers reactivated

---

## Voice & Tone

**Sales Agent:**
- Conversational, not corporate
- Evidence-first (show, don't tell)
- Consultative, not pushy
- "Your stuff matters. Let me show you how we protect it."

**Customer Success:**
- Proactive, helpful
- Feature education without spam
- "Hey, noticed you haven't uploaded docs yet — let me help!"

**Objection Handling:**
- Empathetic acknowledgment
- Evidence-based rebuttal
- Alternative paths (different pricing, extended trial)

---

## Files

| File | Purpose |
|------|---------|
| `workflows/lead-qualification.json` | Lead scoring and routing logic |
| `workflows/outreach-sequences.json` | Multi-touch campaigns |
| `workflows/sales-conversation.json` | In-chat sales agent flow |
| `workflows/onboarding.json` | Trial activation sequence |
| `workflows/customer-success.json` | Health monitoring and expansion |
| `workflows/refund-and-recovery.json` | Churn prevention and win-back |
| `rules/lead-scoring.json` | Qualification criteria |
| `rules/campaign-routing.json` | Vertical-specific routing |
| `rules/escalation-rules.json` | Human handoff triggers |
| `rules/commission-calculation.json` | Affiliate payouts |
| `rules/customer-health-scoring.json` | Churn risk prediction |
| `prompts/sales-agent-system-prompt.md` | Sales AI personality |
| `prompts/customer-success-prompt.md` | CS outreach tone |
| `prompts/objection-handling.md` | Common objections + responses |
| `prompts/outreach-templates.md` | Email/SMS copy |
| `voice/voice-agent-config.json` | Telephony integration |
| `voice/call-scripts.json` | Sales call flows |
| `voice/voice-compliance.json` | TCPA compliance rules |

---

## Testing

**Local Testing:**
```bash
# Trigger lead qualification
curl -X POST http://localhost:5001/titleapp-platform/us-central1/api/v1/marketing:qualify-lead \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "message": "I want to track my car title"}'

# Expected: Lead score + routing decision
```

**Chat Testing:**
1. Visit titleapp.ai
2. Type "I want to try TitleApp"
3. AI should qualify intent, ask discovery questions, route to signup

---

## Next Steps

- [ ] Complete all workflow JSON files
- [ ] Write sales-agent-system-prompt.md
- [ ] Implement backend endpoints
- [ ] Connect Stripe for payment collection
- [ ] Build customer health dashboard
- [ ] Set up voice agent (Twilio/Vapi)
- [ ] Deploy to production

---

**Last Updated:** 2026-02-16
**Owner:** TitleApp Marketing Team (dogfooding RAAS)
