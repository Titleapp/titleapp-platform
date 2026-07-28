# Your Chief Pilot Should Not Be Running the Training Records

In a 5–10 aircraft charter operation, the Chief Pilot is also the Director of Operations, the de facto Training Director, and the person who knows where every currency date lives. That is not a staffing problem you can hire away — the margin is not there. It is a structural problem. One missed currency check exposes the certificate.

---

## Why This Is Happening Now

The FAA does not accept "we were busy." Currency lapses, maintenance discrepancies, and training record gaps are certificate events. The tools that exist — CAMP Systems, spreadsheets, email — require a human being to synthesize them. That human being is expensive, overloaded, and will eventually miss something. The Part 135 operators who scale past 10 aircraft are the ones who solve the coordination problem before it becomes a violation.

Palantir charges the DoD hundreds of millions of dollars for governed AI over operational data with an append-only audit trail. A 10-aircraft charter operator gets the same architecture from SOCIII for $3,600/year. The pending patent application on this architecture covers operators at every scale — not just the ones with government budgets.

---

## What SOCIII Does

- **Tracks every pilot's currency dates in real time.** Alex flags anyone within 30 days of expiration before you think to check.
- **Maintains a portable, append-only pilot record.** Every training event, checkride, and recurrent entry is logged chronologically. The record travels with the pilot.
- **Runs maintenance discrepancy tracking against the aircraft record.** MEL items, deferred maintenance, and upcoming inspections surface automatically.
- **Manages dispatch release coordination.** Flight brief, weather, NOTAMs, and go/no-go documentation in one place.

---

## What You Are Paying Now vs. SOCIII

| What you pay now | SOCIII |
|---|---|
| Chief Pilot: $120,000–180,000/year | ~$3,600/year (10-aircraft fleet) |
| Director of Operations: $90,000–120,000/year | Included in Alex (Chief of Staff) |
| Director of Training: $80,000–100,000/year | Training worker handles records |
| CAMP Systems: $50,000–200,000/year | Included |
| **Total: $340,000–600,000/year** | **~$3,600/year** |

---

## Force Multiplier

**Before:** Chief Pilot + Director of Operations + Director of Training — minimum 3 senior hires to run a 10-aircraft operation without a documentation gap.

**After:** Chief Pilot + SOCIII. The coordination, tracking, and documentation layer runs continuously in the background.

---

## Workers in This Deployment

| Worker | Record Type |
|---|---|
| CoPilot | `flight-brief/v1` |
| MX | `mx-report/v1` |
| Dispatch | `dispatch-release/v1` |
| Training | Portable pilot record |
| Alex — Chief of Staff | Currency monitor, deadline drafter |

**A note on CoPilot:** Full capability for a specific aircraft type requires uploading that aircraft's Pilot Operating Handbook. Without the POH, CoPilot runs in demo mode. With it, Alex answers questions from the actual handbook — performance data, MEL items, and systems information for your specific airframe.

---

## Just Talk to It

"I run a 5-aircraft charter operation out of Centennial. Which pilots are current this week?"

Alex pulls all currency dates, flags anyone within 30 days of expiration, and surfaces the specific certificates or recurrents that are coming due — before you have opened a single spreadsheet.

---

## Next Step

If you operate under Part 135 and want to see this run against your actual fleet data, the demo takes 30 minutes and requires nothing more than your aircraft tail numbers and a pilot roster.

**sean@sociii.ai**

---

*Patent pending (USPTO filings May 2026) · sean@sociii.ai · sociii.ai*
