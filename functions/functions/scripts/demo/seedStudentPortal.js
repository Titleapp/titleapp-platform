"use strict";
// seedStudentPortal.js — backs GET /v1/student:customer:profile with real
// entitlement data (Sean, 2026-08-20: "a true student would probably be the
// counterparty" for the education vertical).
//
// Makai's student-sara-kahele doc already existed with rich real data
// (clinicalHours, atiScore, coursesComplete, notes) but had no uid field —
// existing endpoints only checked requireFirebaseUser (any authenticated
// user), never matched to a specific student. This adds the uid so the
// entitlement-safe portal endpoint can match her demo custom-token sign-in
// to her own record, the same fix pattern as seedTitleDemo.js's contact uid.
//
// UH Maui College's "uh-student" persona already claims uid "sara-kahele-demo" in
// PERSONAS (functions/functions/index.js), but no matching student doc
// existed in demo-uh-nursing at all — a real gap found while building this.
// Seeded here with different figures (earlier in the program) so the two
// school demos don't look like copy-pasted data.
//
// Idempotent — safe to run more than once.
//
// Run from functions/functions/:
//   node scripts/demo/seedStudentPortal.js
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const STUDENT_UID = "sara-kahele-demo";

(async () => {
  console.log("═══ seedStudentPortal.js ═══\n");

  await db.collection("tenants").doc("demo-makai-nursing")
    .collection("nursingStudents").doc("student-sara-kahele")
    .set({ uid: STUDENT_UID }, { merge: true });
  console.log("  ✓ demo-makai-nursing/nursingStudents/student-sara-kahele — added uid (rest of the record was already real)");

  await db.collection("tenants").doc("demo-uh-nursing")
    .collection("nursingStudents").doc("student-sara-kahele")
    .set({
      id: "student-sara-kahele",
      uid: STUDENT_UID,
      name: "Sara Kahele",
      status: "in-progress",
      clinicalHours: 410,
      clinicalHoursRequired: 500,
      atiScore: 82,
      coursesComplete: 3,
      notes: "On track; strong in pharmacology, working on documentation speed under time pressure.",
      tenantId: "demo-uh-nursing",
    }, { merge: true });
  console.log("  ✓ demo-uh-nursing/nursingStudents/student-sara-kahele — created (parity record, didn't exist before)");

  const comps = [
    { id: "comp-sara-uh-1a", competency: "1A - Vital signs assessment", status: "verified", attestedBy: "instructor-noa-kahananui", attestedAt: "2026-07-02", notes: "Accurate technique, good patient rapport." },
    { id: "comp-sara-uh-3c", competency: "3C - Sterile dressing change", status: "pending", attestedBy: null, notes: "Scheduled for observation next clinical rotation." },
  ];
  for (const c of comps) {
    const { id, ...data } = c;
    await db.collection("tenants").doc("demo-uh-nursing").collection("nursingCompetencies").doc(id)
      .set({ ...data, studentId: "student-sara-kahele", tenantId: "demo-uh-nursing" }, { merge: true });
    console.log(`  ✓ demo-uh-nursing/nursingCompetencies/${id} — ${c.competency}: ${c.status}`);
  }

  console.log("\n═══ Done ═══");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
