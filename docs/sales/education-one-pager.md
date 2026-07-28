# Nursing Programs Are Turning Away Qualified Applicants. The Infrastructure Is the Constraint.

91,938 qualified applicants were turned away from US nursing programs in 2021. The shortage is not students who want to become nurses. It is faculty hours — specifically the ratio problem. One faculty member can safely supervise 20 students. With the right infrastructure, that same faculty member can supervise 40. The gap between those two numbers is not a policy question or a hiring question. It is an infrastructure question.

---

## The Wave

The NextGen NCLEX increased in difficulty in 2023. ACEN accreditation standards keep tightening. Incoming cohorts expect individualized support that 1:20 ratios cannot provide. Programs that cannot document competency evidence at scale are programs at risk in their next review cycle. Harvard and Johns Hopkins have dedicated accreditation staff, faculty bandwidth, and clinical infrastructure to absorb all of this. A 70-student program in a mid-size city does not — until now.

---

## What SOCIII Does

- **Tracks clinical hours, competency milestones, and learning records continuously.** Every tutoring session, clinical event, and evaluation is logged in an append-only record. Accreditation documentation is always current.
- **Runs AI tutoring continuously across the cohort.** Students get individualized support outside clinical hours without consuming faculty time. The Tutor worker is always on.
- **Monitors NCLEX prep progression at the individual and cohort level.** Alex flags students who are falling behind on competency benchmarks before the outcome is at risk.
- **Produces accreditation-ready reports on demand.** Clinical hour summaries, competency distributions, and outcome documentation are generated from the running record — not assembled manually at the end of the cycle.

---

## What You Are Paying Now vs. SOCIII

| What you pay now | SOCIII |
|---|---|
| ATI Comprehensive Review (70 students): $28,000–42,000/year | $449/month ($5,388/year) |
| Manual accreditation assembly: months of staff time per cycle | Automatic — record is always current |
| Tutoring coordination overhead: 3–5 hrs/faculty/week | Alex handles scheduling and follow-through |
| Disconnected tool subscriptions: $8,000–15,000/year | Included |
| **Total: $36,000–57,000/year + significant staff-time cost** | **$5,388/year** |

---

## Force Multiplier

**Before:** 1 faculty member supervises 20 students. Tracking and documentation consume a substantial portion of available time.

**After:** 1 faculty member supervises 40 or more students. Alex handles tutoring coordination, clinical hour tracking, and documentation continuously. Faculty time goes to teaching.

---

## Workers in This Deployment

| Worker | Record Type |
|---|---|
| Student Evaluation | `learning-record/v1` |
| Student Records | `student-record/v1` |
| Tutor | `tutoring-session/v1` |
| Course Manager | `course-record/v1` |
| Accreditation | `accreditation-report/v1` |
| Alex — Chief of Staff | Cohort monitor, milestone tracker |

---

## Just Talk to It

"I have 70 nursing students. My biggest problem is tracking clinical hours for accreditation."

Alex has the cohort and is monitoring clinical hours before you finish the sentence. Within minutes, you see which students have gaps, which are on track, and what the accreditation documentation looks like against your current cycle requirements.

---

## Next Step

An active Q2–Q4 2026 pilot is underway with a nursing education program, with an IRB-governed outcome study in progress. If you run a clinical program with 30 or more students and want to see how the documentation infrastructure maps to your accreditation cycle, the conversation takes 30 minutes.

**sean@sociii.ai**

---

*Patent pending (USPTO filings May 2026) · sean@sociii.ai · sociii.ai*
