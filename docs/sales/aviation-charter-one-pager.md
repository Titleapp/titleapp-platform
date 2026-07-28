# The FAA Does Not Issue Second Chances

One missed currency check. One maintenance discrepancy handled informally. One training record that was "somewhere in email." These are the events that end Part 135 certificates — not fraud, not mechanical failure, but coordination gaps in operations that were running fine until they weren't.

In a 5–15 aircraft charter operation, the person keeping your certificate intact is your Chief Pilot. He is tracking it in his head, across CAMP Systems, a spreadsheet, and his own calendar. He is also your Director of Operations. He is also your de facto Training Director. When he has a bad week — or takes another job — the institutional knowledge that kept you compliant goes with him.

---

## The Wave

The FAA's Part 135 enforcement posture is not softening. Certificate actions for documentation failures — currency lapses, training record gaps, maintenance discrepancies — are increasing. The operators who scale past 15 aircraft without a coordination system are not being careful. They are being lucky. Luck is not a compliance strategy.

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
