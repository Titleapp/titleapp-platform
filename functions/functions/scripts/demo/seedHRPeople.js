// Seed Meadow Creek Veterinary Clinic staff into the demo tenant's teamMembers
// collection so the HR worker shows real vet clinic people instead of the
// SOCIII bootstrap defaults (Sean + Kent). Idempotent — clears all existing
// members tagged demo=true, then writes the clinic roster.
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT_ID = "ws_1781920656122_tl9dhn"; // Meadow Creek Veterinary Clinic (demo)

const STAFF = [
  {
    name: "Dr. Maya Chen",
    email: "demo@sociii.ai",
    role: "Veterinarian / Practice Owner",
    type: "W2",
    schedule: "M–Sa 8am–6pm MT",
    timeOff: [],
    status: "active",
    demo: true,
  },
  {
    name: "Alex Torres",
    email: "alex.torres@meadowcreekvet.com",
    role: "Lead Veterinary Technician",
    type: "W2",
    schedule: "M–F 8am–5pm MT",
    timeOff: [
      { id: "pto_at_2026_jul", label: "Family vacation", start: "2026-07-21", end: "2026-07-25" },
    ],
    status: "active",
    note: "OSHA Bloodborne Pathogen training overdue 22 days",
    demo: true,
  },
  {
    name: "Sam Reyes",
    email: "sam.reyes@meadowcreekvet.com",
    role: "Veterinary Technician / Surgical Assist",
    type: "W2",
    schedule: "Tu–Sa 9am–6pm MT",
    timeOff: [],
    status: "active",
    demo: true,
  },
  {
    name: "Jordan Kim",
    email: "jordan.kim@meadowcreekvet.com",
    role: "Receptionist / Client Coordinator",
    type: "W2",
    schedule: "M–F 8am–5pm MT",
    timeOff: [],
    status: "active",
    demo: true,
  },
  {
    name: "Casey Nguyen",
    email: "casey.nguyen@meadowcreekvet.com",
    role: "Veterinary Assistant",
    type: "1099",
    schedule: "Weekends + on-call",
    timeOff: [],
    status: "active",
    demo: true,
  },
];

(async () => {
  const colRef = db.collection("tenants").doc(TENANT_ID).collection("teamMembers");

  // Clear all existing demo members (including the SOCIII bootstrap defaults)
  const existing = await colRef.get();
  if (!existing.empty) {
    const batch = db.batch();
    existing.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`cleared ${existing.size} existing team members`);
  }

  // Write vet clinic staff
  const batch = db.batch();
  for (const person of STAFF) {
    const ref = colRef.doc();
    batch.set(ref, {
      ...person,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: "seed_script",
    });
  }
  await batch.commit();
  console.log(`✓ seeded ${STAFF.length} clinic staff for Meadow Creek Veterinary Clinic`);
  console.log("  " + STAFF.map(s => s.name).join(", "));
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
