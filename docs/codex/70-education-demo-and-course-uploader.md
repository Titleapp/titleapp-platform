# CODEX 70 — Education Demo Shell + Course Uploader
## Focused Demo + Credentialed Course Creation

**Status:** 🔴 planning — not built yet  
**Owner:** Sean  
**Date:** 2026-08-07  
**Trigger:** Show Ruthie a working nursing demo; prove the "upload curriculum → course worker" story without developer involvement

---

## Architecture Clarification (Important)

**The Studio Locker is the RAAS substrate — not a UI element.**  
Documents in the Studio Locker are injected into the worker's system prompt automatically. The RAAS engine and chat run on top of that content. Users don't need to see or manage the locker to benefit from it. Ruthie's nursing evaluator (Hannah) already has 13 documents in her locker. The demo page just needs to surface Hannah in chat — the locker is the backend mechanism, invisible to end users.

---

## Surface 1 — Focused Demo Shell

**Where:** `/demo/nursing` and `/demo/nursing/student`  
**Who:** Ruthie, her colleagues, anyone Sean is pitching to  
**What it is:** A clean, full-screen chat page. No sidebar. No app navigation. Just Hannah.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  [Makai School of Nursing wordmark]        [Hannah · AI Clinical Education Worker] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                   CHAT WITH HANNAH                           │
│                                                              │
│   (seeded with a persona-specific first message)             │
│                                                              │
│   User input at bottom, full-height conversation above       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**No right rail. No locker panel. No document list.** The content is loaded — the chat just works.

**Faculty seed message (nursing-admin persona):**
> "Hi — I'm Hannah. Tell me about a student's CET entry and I'll help you write substantive faculty feedback, or coach you on applying the Tanner Clinical Judgment Model."

**Student seed message (nursing-student persona):**
> "Hi — I'm Hannah. I can coach you on writing a strong CET reflection, quiz you on the Tanner phases, or help you understand what your instructor is looking for. What are you working on today?"

**Routes:**
- `/demo/nursing` → faculty (nursing-admin persona, Dr. Kealani Moku)
- `/demo/nursing/student` → student (nursing-student persona, Sara Kahele)

These already auto-sign in via the demo token system. The shell replaces the current redirect into the full app.

**What this is NOT:**
- Not the full app (no sidebar, nav, or vault)
- Not a dashboard showing cohort data (NursingEducationPanel handles that in the full app)
- Not a locker management UI (locker is backend-only from the user's perspective)

---

## Surface 2 — Course Uploader

**Where:** `/education/upload`  
**Who:** Instructors and educators — NOT students  
**What it is:** A step-by-step wizard that lets a credentialed instructor go from zero to a working AI course worker in under 10 minutes. No code. No developer needed.

**The core thesis:** The Studio Locker is the mechanism. The uploader is the on-ramp. Instructor uploads their syllabus and rubrics → locker stores the content → worker runs on it → students get a tutor that knows their specific course.

---

### Step 1 — Who Are You? (Instructor Identity + Credential Verification)

Before anything is created, the instructor must verify:
1. **Identity** — who they are as a person
2. **Credential** — that they are actually a licensed or employed educator

This is not optional. A worker built on unverified instructor curriculum has no academic integrity anchor. Credential verification is how SOCIII stamps the provenance of the course content.

**UI:**
```
  Build Your Course Worker
  ─────────────────────────────────────────
  Step 1 of 4 — Verify your credentials
  
  First, let's confirm you're a licensed or 
  employed instructor.
  
  [ ] I have an institutional email (.edu or issued by my institution)
  [ ] I have a professional teaching license or nursing board credential
  [ ] I can upload a letter of employment or faculty appointment
  
  (choose one — you only need one verification path)
  
  ────────────────────────────────
  Path A — Institutional email
    Enter your institutional email:
    [dr.clearwater@maui.edu       ]
    [Send verification code]
  ────────────────────────────────
  Path B — License / board credential
    State:  [Hawaii ▾]
    License type:  [RN ▾]
    License number:  [RN-123456   ]
    [Verify via NURSYS / board API]
  ────────────────────────────────
  Path C — Employment letter
    [Upload PDF or image]
    Reviewed manually — expect 1 business day
  ────────────────────────────────
  
  [Continue →]  (unlocks after verification)
```

**Verification paths:**
- **Path A (institutional email):** Send OTP to the .edu address. Instant. This is the v1 default — simplest to ship.
- **Path B (license number):** NURSYS API for nursing; state teaching license boards for K-12/higher ed. More robust but requires API integrations. v2.
- **Path C (employment letter):** Manual review queue. Fallback for instructors at institutions without .edu. v2.

**Ship v1 with Path A only.** Institutional email OTP is fast to build, covers most cases, and is a recognized standard (every university uses it). Flag Path B and C as "coming soon."

**What verification produces:**
A `verifiedInstructor` record in Firestore:
```
instructors/{uid}: {
  verificationMethod: "institutional_email",
  verifiedEmail: "dr.clearwater@maui.edu",
  institution: "UH Maui College",   // extracted from email domain
  verifiedAt: timestamp,
  status: "active"
}
```
This record anchors every course worker they create. The locker content is stamped with `createdByVerifiedInstructor: uid`.

---

### Step 2 — Name Your Course + Set Up Your Chat

```
  Step 2 of 4 — Name your course
  
  Course name:    [Anatomy & Physiology I               ]
  Course number:  [BIOL 201                             ]
  Institution:    [UH Maui College                      ]  (pre-filled from verification)
  Level:          [Pre-nursing ▾]
  
  Your AI tutor's name:  [Hannah                        ]
  (students will see this name in chat)
  
  One-sentence description of what this tutor helps with:
  [                                                      ]
  e.g. "Quiz me on Unit 1 learning objectives and 
   explain anatomy concepts at a nursing-student level."
  
  [← Back]  [Continue →]
```

This creates the worker config. No backend call yet — held in component state until Step 3.

---

### Step 3 — Upload Your Course Materials

```
  Step 3 of 4 — Upload your materials
  
  These documents become your tutor's knowledge base.
  
  ┌─────────────────────────────────────────────────────┐
  │          Drop files here, or click to browse        │
  │                  PDF · DOCX · TXT                   │
  └─────────────────────────────────────────────────────┘
  
  What to upload:
  • Syllabus
  • Learning objectives or SLOs
  • Grading rubrics
  • Instructor notes or study guides
  • Any document you want the tutor to know
  
  Uploaded (2 of 10 max):
  ✓ BIOL201_Syllabus_F26.pdf        · 14,200 chars · ready
  ✓ Unit1_LearningObjectives.pdf    ·  4,300 chars · ready
  
  Total context: 18,500 / 120,000 chars (15%)
  
  [← Back]  [Preview your tutor →]
```

Each file goes to `POST /v1/worker:locker:ingest` on drop (base64 + fileName path). Server-side PDF extraction already works. Show extracted char count per file. Cap at 10 files or 120,000 chars total (matches the MAX_CHARS limit).

**Worker slug for v1:** `nursing-courses-001` for nursing-category instructors. Generic `course-tutor-001` for other disciplines (v2). The slot for the locker is `{tenantId}/workers/nursing-courses-001/documents`.

For v1, the instructor's upload goes into a **per-session ephemeral tenant** (`course_upload_{sessionId}`) so different instructors don't share lockers. Their content is isolated. When they share the student link, that link uses their session tenant.

---

### Step 4 — Done: Share With Students

```
  Step 4 of 4 — Your course worker is ready
  
  ✓  Verified: dr.clearwater@maui.edu (UH Maui College)
  ✓  Course: BIOL 201 — Anatomy & Physiology I
  ✓  2 documents loaded (18,500 chars)
  
  Share this link with your students:
  
  ┌─────────────────────────────────────────────────────┐
  │  sociii.ai/course/biol201-maui-f26                  │
  │                   [Copy]                            │
  └─────────────────────────────────────────────────────┘
  
  ┌────────────┐
  │  [QR code] │  (for classroom display)
  └────────────┘
  
  What happens when a student opens the link:
  • They're signed in automatically — no account required
  • They see Hannah, loaded with your course materials
  • Each student's conversation is private
  
  [Upload another course]   [Go to your dashboard]
```

The shareable URL maps to a `/course/:courseSlug` route that auto-signs in as a student persona against the instructor's session tenant. No account required for students in v1.

---

## What Already Exists (Do Not Rebuild)

| Capability | Status |
|---|---|
| Studio Locker ingest (`POST /v1/worker:locker:ingest`) | ✅ live |
| Server-side PDF text extraction | ✅ live |
| Locker context injection into worker chat | ✅ live |
| Demo token system (`/demo:token`) | ✅ live |
| Hannah (nursing-education-001) with 13 locker docs | ✅ ingested |
| A&P tutor (nursing-courses-001) with 6 locker docs | ✅ ingested |
| MAX_CHARS = 120,000 in `getLockerContext` | ✅ deployed |

---

## What Needs to Be Built

### Surface 1 (ship first — Ruthie needs this)
| Item | Complexity |
|---|---|
| `NursingDemoShell.jsx` — full-screen chat, no sidebar | Low |
| Seed message by persona (faculty vs. student) | Trivial |
| Route wiring: `/demo/nursing` and `/demo/nursing/student` | Trivial |

### Surface 2 (ship second)
| Item | Complexity | Notes |
|---|---|---|
| `CourseUploader.jsx` — 4-step wizard shell | Medium | State machine for steps |
| Step 1: institutional email OTP verification | Medium | Need OTP send/verify backend route |
| Step 2: course naming form | Low | Client state only |
| Step 3: file upload → locker ingest | Low | Reuses existing API |
| Step 3: ephemeral per-session tenant creation | Medium | New backend: `POST /v1/course:session:create` |
| Step 4: shareable course URL generation | Low | `/course/:slug` route |
| `/course/:slug` — student landing page | Low | Like demo sign-in but tenant-scoped |

---

## What We Are NOT Building

- Full teacher accounts or dashboards (that's normal SOCIII sign-up)
- Nursing license verification via NURSYS (v2, Path B)
- Employment letter manual review queue (v2, Path C)
- Multi-course management per instructor (v2)
- Student roster or progress tracking (NursingEducationPanel handles that)
- Marketplace-publishable workers (full creator sandbox handles that)
- Analytics on student conversations (v2)

---

## Build Order

1. **Surface 1 — Demo Shell** (1–2 hours). Ship today. Ruthie needs it.
2. **Surface 2 — Course Uploader** (1–2 days).
   - Step 1 OTP route is the only new backend work; everything else is existing APIs.
   - Ship Step 1–3 first. Step 4 (shareable URL) can be a hard-coded demo link while the dynamic URL system catches up.
