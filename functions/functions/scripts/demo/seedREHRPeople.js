// Seed Merritt Capital Group + Merritt Property Group staff roster into the RE demo tenant.
// 15-person mixed-entity workforce (W2, 1099, contract) with assignedTo per building.
// Idempotent — clears all demo=true members, then writes fresh.
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

const STAFF = [
  {
    name: "Scott Harrington",
    email: "re-demo@sociii.ai",
    role: "Principal",
    entity: "MCG",
    type: "W2",
    assignedTo: "All",
    status: "active",
    note: "Demo user — principal of Merritt Capital Group",
    demo: true,
  },
  {
    name: "Dana Reyes",
    email: "dana.reyes@merrittpropertygroup.com",
    role: "Principal Broker",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 1 + Bldg 2",
    status: "active",
    note: "Licensed CA + NV + TX — oversees all brokerage + PM operations",
    demo: true,
  },
  {
    name: "Marcus Webb",
    email: "marcus.webb@merrittpropertygroup.com",
    role: "Buyer's Agent",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 1 — The Meridian at Flamingo",
    status: "active",
    note: "Active on 3 buyer files — Unit 1901 negotiation in progress",
    demo: true,
  },
  {
    name: "Taylor Oakes",
    email: "taylor.oakes@merrittpropertygroup.com",
    role: "Buyer's Agent",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 1 — The Meridian at Flamingo",
    status: "active",
    note: "New hire — 60-day ramp review due June 30",
    demo: true,
  },
  {
    name: "Andrea Solis",
    email: "andrea.solis@merrittpropertygroup.com",
    role: "Property Manager",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 2 — Creekwood Commons",
    status: "active",
    note: "Full-time on-site at Creekwood — primary tenant contact",
    demo: true,
  },
  {
    name: "Kenji Park",
    email: "kenji.park@merrittpropertygroup.com",
    role: "Maintenance Coordinator",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 2 + Bldg 1 HOA",
    status: "active",
    note: "On-call — manages vendor dispatch for both properties",
    demo: true,
  },
  {
    name: "Ray Estevez",
    email: "ray.estevez@merrittpropertygroup.com",
    role: "HVAC Technician",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 2 — Creekwood Commons",
    status: "active",
    note: "OSHA 30 cert expires September 2026 — renewal required",
    demo: true,
  },
  {
    name: "Luis Morales",
    email: "luis.morales@merrittpropertygroup.com",
    role: "Maintenance Technician",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 2 — Creekwood Commons",
    status: "active",
    note: "Rotating weekends coverage",
    demo: true,
  },
  {
    name: "Pat Nguyen",
    email: "pat.nguyen@contractor.com",
    role: "Groundskeeper",
    entity: "MPG",
    type: "1099",
    assignedTo: "Bldg 2 — Creekwood Commons",
    status: "active",
    note: "Weekly contract — landscaping + exterior",
    demo: true,
  },
  {
    name: "Carmen Vega",
    email: "carmen.vega@merrittpropertygroup.com",
    role: "Property Admin / Leasing",
    entity: "MPG",
    type: "W2",
    assignedTo: "Bldg 2 — Creekwood Commons",
    status: "active",
    note: "Front office — lease intake, prospective tenant tours",
    demo: true,
  },
  {
    name: "Jordan Blake",
    email: "jordan.blake@merrittpropertygroup.com",
    role: "Transaction Coordinator",
    entity: "MPG",
    type: "1099",
    assignedTo: "Bldg 1 — The Meridian at Flamingo",
    status: "active",
    note: "Manages closings admin — currently on Unit 704 + Unit 1901",
    demo: true,
  },
  {
    name: "Derek Cho",
    email: "derek.cho@westbrookgc.com",
    role: "Construction Superintendent",
    entity: "MCG",
    type: "Contract",
    assignedTo: "Bldg 3 — Domain Point",
    status: "active",
    note: "Westbrook General Contractors — on-site; contract ends Oct 1, 2026",
    demo: true,
  },
  {
    name: "Sofia Restrepo",
    email: "sofia.restrepo@merrittcapitalgroup.com",
    role: "Permitting Specialist",
    entity: "MCG",
    type: "Contract",
    assignedTo: "Bldg 3 — Domain Point",
    status: "active",
    note: "Austin permit pipeline — structural + MEP (#AUS-2026-004821)",
    demo: true,
  },
  {
    name: "Elena Marchetti",
    email: "elena.marchetti@marchettilegal.com",
    role: "General Counsel",
    entity: "MCG",
    type: "1099",
    assignedTo: "All",
    status: "active",
    note: "Retainer basis — real estate + entity law",
    demo: true,
  },
  {
    name: "Carlos Rivera",
    email: "carlos.rivera@riveraassociates.com",
    role: "Architect (AOR)",
    entity: "MCG",
    type: "1099",
    assignedTo: "Bldg 3 — Domain Point",
    status: "active",
    note: "Rivera & Associates — Architect of Record for Domain Point",
    demo: true,
  },
];

(async () => {
  const col = db.collection("tenants").doc(RE_DEMO_TENANT).collection("teamMembers");

  // Clear existing demo members
  const existing = await col.where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo members`);

  // Write all 15 staff
  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const person of STAFF) {
    await col.add({ ...person, createdAt: now, tenantId: RE_DEMO_TENANT, ownerUid: RE_DEMO_UID });
    console.log(`  ✓ ${person.name} (${person.role} / ${person.entity})`);
  }

  console.log(`\n✓ Seeded ${STAFF.length} staff members into Merritt Capital Group`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
