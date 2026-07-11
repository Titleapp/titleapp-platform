// Seed 5 maintenance tickets for Creekwood Commons into the RE demo tenant.
// Schema follows CODEX 27 MX ticket lifecycle with photo slots.
// Photos are Fal.ai-generated placeholder URLs (using existing demo storage path pattern).
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

const STORAGE = "https://storage.googleapis.com/title-app-alpha.firebasestorage.app";

const tickets = [
  {
    id: "mx_creekwood_001",
    asset_id: "creekwood-commons",
    unit_id: "214",
    status: "in_progress",
    reported_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
    reported_by: "Maria Santos (tenant)",
    description: "AC not cooling — unit temperature 86°F. HVAC stopped working overnight.",
    category: "hvac",
    severity_reported: "high",
    photos_issue: [
      `${STORAGE}/demo/re/maintenance/mx_creekwood_001_issue.jpg`,
    ],
    ai_review: {
      severity: "high",
      recommendation: "Assign HVAC tech immediately. Summer heat advisory — tenant health risk. 24hr SLA required under CA Civil Code 1941.",
      suggested_assignee: "Ray Estevez",
      reviewed_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000)),
      model: "claude-sonnet-4-6",
    },
    assigned_to: "Ray Estevez",
    assigned_by: "Kenji Park",
    assigned_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)),
    target_resolution_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    resolution_description: "Condenser coil frozen — defrost in progress. Replacement coil ordered (estimated 48hr delivery).",
    photos_resolution: [],
    completed_at: null,
    completed_by: null,
    cost_estimate: 640,
    demo: true,
  },
  {
    id: "mx_creekwood_002",
    asset_id: "creekwood-commons",
    unit_id: "308",
    status: "open",
    reported_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    reported_by: "James Tran (tenant)",
    description: "Water stain appearing on ceiling near bathroom — growing over 2 days. Slight bulge in drywall.",
    category: "structural",
    severity_reported: "medium",
    photos_issue: [
      `${STORAGE}/demo/re/maintenance/mx_creekwood_002_issue.jpg`,
    ],
    ai_review: {
      severity: "high",
      recommendation: "Inspect Unit 408 above — probable plumbing leak from bathroom fixture. Mold risk if unaddressed >48hr. Assign immediately.",
      suggested_assignee: "Luis Morales",
      reviewed_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000)),
      model: "claude-sonnet-4-6",
    },
    assigned_to: "Luis Morales",
    assigned_by: "Andrea Solis",
    assigned_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)),
    target_resolution_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
    resolution_description: null,
    photos_resolution: [],
    completed_at: null,
    completed_by: null,
    cost_estimate: 800,
    demo: true,
  },
  {
    id: "mx_creekwood_003",
    asset_id: "creekwood-commons",
    unit_id: "4E",
    status: "open",
    reported_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    reported_by: "Tenant portal submission",
    description: "Kitchen sink drains very slowly — standing water after washing dishes.",
    category: "plumbing",
    severity_reported: "low",
    photos_issue: [
      `${STORAGE}/demo/re/maintenance/mx_creekwood_003_issue.jpg`,
    ],
    ai_review: {
      severity: "low",
      recommendation: "Standard drain clog — schedule within 72hr. Likely hair/grease buildup. Luis Morales can handle.",
      suggested_assignee: "Luis Morales",
      reviewed_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000)),
      model: "claude-sonnet-4-6",
    },
    assigned_to: "Luis Morales",
    assigned_by: "Kenji Park",
    assigned_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)),
    target_resolution_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    resolution_description: null,
    photos_resolution: [],
    completed_at: null,
    completed_by: null,
    cost_estimate: 120,
    demo: true,
  },
  {
    id: "mx_creekwood_004",
    asset_id: "creekwood-commons",
    unit_id: "512",
    status: "open",
    reported_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    reported_by: "Diane Osei (tenant)",
    description: "Refrigerator door doesn't seal properly — gasket is cracked, condensation on food items.",
    category: "appliance",
    severity_reported: "medium",
    photos_issue: [
      `${STORAGE}/demo/re/maintenance/mx_creekwood_004_issue.jpg`,
    ],
    ai_review: {
      severity: "medium",
      recommendation: "Cracked door gasket — food safety risk. Replace gasket within 48hr or provide replacement fridge. Check fridge age (if >10yr, full replacement may be more cost-effective).",
      suggested_assignee: "Kenji Park",
      reviewed_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000)),
      model: "claude-sonnet-4-6",
    },
    assigned_to: "Kenji Park",
    assigned_by: "Andrea Solis",
    assigned_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000)),
    target_resolution_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 0)),
    resolution_description: null,
    photos_resolution: [],
    completed_at: null,
    completed_by: null,
    cost_estimate: 180,
    demo: true,
  },
  {
    id: "mx_creekwood_005",
    asset_id: "creekwood-commons",
    unit_id: "116",
    status: "completed",
    reported_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    reported_by: "Move-out inspection — Carmen Vega",
    description: "Unit turnover: scuffed baseboards throughout, worn carpet at entryway and living room, touch-up paint needed in master bedroom.",
    category: "turnover",
    severity_reported: "low",
    photos_issue: [
      `${STORAGE}/demo/re/maintenance/mx_creekwood_005_before.jpg`,
    ],
    ai_review: {
      severity: "low",
      recommendation: "Standard Class B turnover. Full carpet replacement in living room/entry + baseboard repaint. Budget $1,800–2,200. Target 3-week timeline for July 1 move-in.",
      suggested_assignee: "Luis Morales",
      reviewed_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000)),
      model: "claude-sonnet-4-6",
    },
    assigned_to: "Luis Morales",
    assigned_by: "Andrea Solis",
    assigned_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)),
    target_resolution_date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    resolution_description: "New carpet installed (living room + entry). Baseboards repainted. Master bedroom touch-up complete. Unit ready for inspection.",
    photos_resolution: [
      `${STORAGE}/demo/re/maintenance/mx_creekwood_005_after.jpg`,
    ],
    completed_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
    completed_by: "Luis Morales",
    cost_estimate: 1950,
    reviewed_by: "Andrea Solis",
    signed_off_by: "Andrea Solis",
    signed_off_at: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    photo_signoff: null,
    demo: true,
  },
];

(async () => {
  const col = db.collection("tenants").doc(RE_DEMO_TENANT).collection("maintenanceTickets");

  // Clear existing demo tickets
  const existing = await col.where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo MX tickets`);

  // Write all tickets
  for (const ticket of tickets) {
    await col.doc(ticket.id).set({ ...ticket, tenantId: RE_DEMO_TENANT, ownerUid: RE_DEMO_UID });
    console.log(`  ✓ Unit ${ticket.unit_id}: ${ticket.description.slice(0, 50)}… [${ticket.status}]`);
  }

  console.log(`\n✓ Seeded ${tickets.length} maintenance tickets for Creekwood Commons`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
