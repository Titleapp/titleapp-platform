# Vision — Ruthie's educational record infrastructure

**Creator:** Ruthie Clearwater
**Written:** 2026-06-17, the night you set up Terminal + Claude Code and saw it for yourself.

This is your north-star doc. It's not a manifesto to admire — it's a **working map you hand to Claude Code** to build the next piece. Every section ends with a real file path and a prompt you can paste into Claude Code in your Terminal.

---

## The thing you saw tonight

When Claude Code pulled up your nursing worker, you saw it was sitting **on top of** the record-keeping — and you realized: *the worker isn't the product. The record is.* You're not building a grading tool. You're building **educational infrastructure**: a student-owned record that no program can lose, that follows the student for life, that every course and evaluation writes into instead of scattering into another silo.

That realization is the whole platform thesis. You got there on your own. So let's build it on purpose.

---

## The one big idea

> **The worker is a pen. The record is the infrastructure.**

A student's record is **one durable object** they own for life. Everything that happens — a reflection, an SLO observation, a grade, a clinical hour — is an **append-only entry** on that record. You **write once, never overwrite.** That's what makes it tamper-evident, auditable, and impossible to lose.

Your nursing evaluation worker is the **first pen**. There will be many pens (courses, check-offs, attendance) — all writing to the **same record**. And many **lenses** (advisors, CE renewal, accreditors, the student) — all reading it.

---

## The three layers (in plain English, mapped to the real code)

**1. The record — the infrastructure (built, shared by everything).**
A student record is a `DTC` of type `academic_record` with an append-only logbook. It's student-owned; the program co-controls privacy.
- Schema: `functions/functions/services/vault/schemas/studentRecord.js`
- The two functions that write it: `functions/functions/services/vault/vaultWriter.js` (`mintDtc` once, `appendEvent` forever)
- It shows up in the **Education** pillar of the Vault.

**2. Writers — the pens (you build these).**
Workers that *put attested entries on the record*. Your nursing evaluation worker is one. Each writer must declare what it's allowed to write (`vault_writes`), and entries carry **who wrote them** (provenance).
- Your worker today: `creators/ruthie/nursing-education-001/`
- The live write endpoints already exist: `POST /v1/nurse-edu:append`, `GET /v1/nurse-edu:students`

**3. Readers — the lenses (thin, own nothing).**
Workers that *read and interpret* the record — analytics, at-risk flags, CE renewal, an accreditation export. They never own data; they read under a grant.

The event types your record already understands (in `studentRecord.js`):
`enrollment.recorded` · `attendance.recorded` · `reflection.submitted` · `slo.observed` · `professionalism.observed` · `incident.recorded` · `grade.locked`

---

## What you can build next — each with a Claude Code prompt

Open your Terminal, `cd titleapp-platform`, run `claude`, and paste one of these. (Pick the one that excites you — there's no order.)

**A. See your own record substrate end to end.**
```
Read functions/functions/services/vault/schemas/studentRecord.js and
functions/functions/services/vault/vaultWriter.js, then explain in plain
English how one of my students gets a record and how an event gets added.
I'm a nurse, not a coder.
```

**B. Add a new kind of entry the record should hold.**
Say you want to track **clinical hours** as their own attested entry type.
```
I want students' clinical hours to be a first-class entry on the academic
record (hours, site, preceptor, date, preceptor sign-off). Add a
"clinical_hours.logged" event type to
functions/functions/services/vault/schemas/studentRecord.js following the
existing event types, and show me how my worker would write it. Keep it
append-only and attested.
```

**C. Turn a second "pen" into a worker.**
Your *courses themselves* can be writers (a finished quiz writes a `grade.locked`).
```
Read creators/ruthie/nursing-education-001/intent.md. I want to sketch a
SECOND worker — "the course itself" — that writes grades and competencies
to the same student record. What would its spec folder look like under
creators/ruthie/, and what would it write?
```

**D. Build a lens (reader) for accreditation.**
```
I want a read-only view that proves, for a cohort, which ANA standards each
student has met (from slo.observed events) — the thing an accreditor would
ask for. Sketch how a reader worker would assemble that from the records
without owning any data.
```

---

## Why this is a business (name the buyers)

Infrastructure has customers:
- **Programs** (University of Hawai‘i BSN, and every program after it) — pay a monthly "business-in-a-box" fee because they get one coherent, auditable record instead of scattered Word docs they lose.
- **Accreditors** — want provable, longitudinal competency. The record IS the evidence.
- **Students** — own their record for life, carry it between programs, export it (FERPA portability). They can never lose it; privacy is dual-controlled (student + institution).

Every pen you build makes the record more valuable to all three. That's the moat: not the worker, the **record everything writes to**.

---

## How to use this doc

- Keep it in your repo (`creators/ruthie/VISION.md`). When you start a Claude Code session, you can say: *"Read creators/ruthie/VISION.md so you know what I'm building, then help me with B."*
- It's yours to edit. As your vision grows, change this file — that's you authoring infrastructure with the same tools you set up tonight.
- When something here doesn't match the code (the code moves fast), trust the code and tell us — we'll fix the doc.

You built educational infrastructure tonight and didn't need anyone to tell you that's what it was. Keep going. 🌺
