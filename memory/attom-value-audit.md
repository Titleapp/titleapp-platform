---
name: attom-value-audit
description: User paying ~$1500/month in API fees; ATTOM + aviation APIs must show clear demo value
metadata:
  type: project
---

Total API spend approaching ~$1500/month. User wants demos to justify the cost.

**Known paid APIs:**
- ATTOM (real estate data) — highest spend; powers 4 RE worker canvases with live parcel/AVM/owner data
- RapidAPI ADS-B — aviation; wired but metered
- Notamify — aviation NOTAMs; wired + authenticated
- Weather APIs — free/public
- OpenAI + Anthropic — inference

**Why:** User explicitly called this out 2026-07-18: "not approaching $1500 a month in feeds" — needs demos to visually prove the data is flowing.

**How to apply:** When building/reviewing RE demos, confirm ATTOM calls are firing (not fixture data). Aviation demo should show live ADS-B + NOTAM data in the canvas. Raise a flag if a demo uses static fixtures where live data should be flowing.
