// Seed 10 operating feed items into alertFeed/{RE_DEMO_UID}/items for Scott Harrington.
// These are the principal-level morning brief items — high-priority, actionable.
// Collection is UID-scoped (not tenant-scoped).
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

const ts = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return admin.firestore.Timestamp.fromDate(d);
};

const FEED_ITEMS = [
  {
    id: "re_feed_001",
    title: "Domain Point capital call — $130K outstanding",
    body: "2 LPs (Marcus Eaton + The Nguyen Group) have not responded to the July 30 call. $380K total due; $250K received. 21 days remaining.",
    severity: "HIGH",
    category: "investor_relations",
    source: "investor-relations",
    actionLabel: "Draft reminder",
    actionSlug: "investor-relations",
    resolved: false,
    demo: true,
    createdAt: ts(0),
  },
  {
    id: "re_feed_002",
    title: "HVAC down — Unit 214, Creekwood Commons (Day 4)",
    body: "Ray Estevez dispatched but awaiting condenser coil part. Tenant in Unit 214 (Maria Santos) has requested hotel accommodation. Summer heat advisory in effect.",
    severity: "HIGH",
    category: "maintenance",
    source: "re-property-manager",
    actionLabel: "View ticket",
    actionSlug: "re-property-manager",
    resolved: false,
    demo: true,
    createdAt: ts(0),
  },
  {
    id: "re_feed_003",
    title: "Unit 704 clear to close July 8",
    body: "Jordan Blake confirms all contingencies removed. Buyer: Howard Reeves. Gross: $875,000. Dana Reyes to coordinate final walk-through.",
    severity: "INFO",
    category: "brokerage",
    source: "re-marketing-001",
    actionLabel: "View listing",
    actionSlug: "re-marketing-001",
    resolved: false,
    demo: true,
    createdAt: ts(1),
  },
  {
    id: "re_feed_004",
    title: "Marcus Webb — 2 active negotiations from Unit 1901 open house",
    body: "June 28 event: 22 attendees. Post-event drip triggered. 7 follow-up replies; Marcus tracking Howard Finch Jr. ($920K offer) and Ana Gutierrez ($885K offer).",
    severity: "INFO",
    category: "brokerage",
    source: "re-marketing-001",
    resolved: false,
    demo: true,
    createdAt: ts(1),
  },
  {
    id: "re_feed_005",
    title: "Domain Point permit inspection — Thursday",
    body: "City of Austin structural + MEP inspection (#AUS-2026-004821). Derek Cho confirmed on-site. Sofia Restrepo has permit file ready.",
    severity: "MEDIUM",
    category: "construction",
    source: "chief-of-staff",
    actionLabel: "View permit",
    actionSlug: "zoning-001",
    resolved: false,
    demo: true,
    createdAt: ts(1),
  },
  {
    id: "re_feed_006",
    title: "GC contract extension vote still open — 3 of 8 pending",
    body: "Westbrook GC contract ends Oct 1. Extension to Dec 1 ($85K) or self-perform punch list ($30K est.). 5 LPs voted; Eaton, Nguyen Group, Sunrise Ridge still pending.",
    severity: "MEDIUM",
    category: "investor_relations",
    source: "investor-relations",
    resolved: false,
    demo: true,
    createdAt: ts(2),
  },
  {
    id: "re_feed_007",
    title: "Ray Estevez OSHA 30 certification expires in 97 days",
    body: "Cert expires September 14, 2026. Renewal course required before expiration — OSHA 30 Construction, 2-day in-person. Recommend scheduling now.",
    severity: "MEDIUM",
    category: "hr_compliance",
    source: "platform-hr",
    actionLabel: "View HR record",
    actionSlug: "platform-hr",
    resolved: false,
    demo: true,
    createdAt: ts(2),
  },
  {
    id: "re_feed_008",
    title: "Unit 116 turnover — July 1 move-in target",
    body: "Vacated June 1. Carpet replacement + fresh paint in progress. Carmen Vega has 3 qualified applicants. Target: new tenant in place July 1.",
    severity: "MEDIUM",
    category: "maintenance",
    source: "re-property-manager",
    actionLabel: "View maintenance",
    actionSlug: "re-property-manager",
    resolved: false,
    demo: true,
    createdAt: ts(3),
  },
  {
    id: "re_feed_009",
    title: "Creekwood annual inspection due August 14",
    body: "City of Sacramento annual habitability inspection. 12 units flagged for pre-inspection prep (3 with minor violations from last cycle). Andrea Solis managing prep checklist.",
    severity: "LOW",
    category: "compliance",
    source: "re-property-manager",
    resolved: false,
    demo: true,
    createdAt: ts(4),
  },
  {
    id: "re_feed_010",
    title: "Taylor Oakes 60-day ramp review due June 30",
    body: "New buyer's agent, started May 1. 1 closed deal ($780K), 2 active buyer clients. Review: quota attainment 65% of target. Dana Reyes recommends extend ramp 30 days.",
    severity: "LOW",
    category: "hr",
    source: "platform-hr",
    actionLabel: "View HR record",
    actionSlug: "platform-hr",
    resolved: false,
    demo: true,
    createdAt: ts(5),
  },
];

(async () => {
  const col = db.collection("alertFeed").doc(RE_DEMO_UID).collection("items");

  // Clear existing demo feed items
  const existing = await col.where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo feed items`);

  // Write all feed items
  for (const item of FEED_ITEMS) {
    await col.doc(item.id).set({ ...item, tenantId: RE_DEMO_TENANT });
    console.log(`  ✓ [${item.severity}] ${item.title.slice(0, 60)}…`);
  }

  console.log(`\n✓ Seeded ${FEED_ITEMS.length} operating feed items for Scott Harrington`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
