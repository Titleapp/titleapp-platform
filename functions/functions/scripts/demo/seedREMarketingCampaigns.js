// Seed all 4 marketing layers for the RE demo into the `campaigns` collection.
// CRITICAL: Without real campaigns, buildMarketingPayload() returns _demo:true
// and every card shows a SAMPLE watermark. This seed clears that flag.
// Collection: campaigns/{id} with tenantId field (not subcollection).
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

const CAMPAIGNS = [
  // Layer 1 — Brokerage Lead Gen (Meridian at Flamingo / for-sale)
  {
    id: "re_camp_01",
    name: "Google Search — Luxury Condos Las Vegas Strip",
    layer: "brokerage",
    platform: "Google",
    type: "search",
    status: "active",
    impressions: 18400,
    clicks: 589,
    conversions: 14,
    spend: 730,
    revenue: 875000,
    cpc: 12.40,
    trend: [1, 2, 1, 2, 0, 1, 3, 2, 1, 2, 3, 1, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 2, 3, 2, 3, 2],
    description: "Search ads targeting 'luxury condo las vegas', 'las vegas high-rise condos', 'panorama towers units for sale'. Primary buyer acquisition channel.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_02",
    name: "Instagram — Meridian at Flamingo Listings",
    layer: "brokerage",
    platform: "Instagram",
    type: "social",
    status: "active",
    impressions: 12300,
    clicks: 312,
    conversions: 8,
    spend: 420,
    revenue: 0,
    followers: 1840,
    trend: [2, 1, 3, 2, 1, 2, 2, 3, 1, 2, 1, 3, 2, 2, 1, 2, 3, 2, 1, 2, 2, 1, 3, 2, 2, 1, 3, 2, 2, 1],
    description: "Photo + reel ads showcasing unit interiors, Strip views, building amenities. 8 DMs converted to showing appointments last 30d.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_03",
    name: "Broker Co-Op Outreach — Q3 Agent Network",
    layer: "brokerage",
    platform: "Email",
    type: "email",
    status: "active",
    impressions: 140,
    clicks: 48,
    conversions: 6,
    spend: 0,
    revenue: 3150000,
    openRate: 0.34,
    trend: [0, 1, 0, 1, 0, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0],
    description: "Monthly email to 140 agents in the Las Vegas luxury condo network. 2.5% co-op referral fee offered. 6 showing referrals attributed to this channel.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_04",
    name: "Buyer Drip — Q3 Luxury Buyer Sequence",
    layer: "brokerage",
    platform: "Email",
    type: "drip",
    status: "active",
    impressions: 100,
    clicks: 68,
    conversions: 9,
    spend: 0,
    revenue: 0,
    openRate: 0.41,
    trend: [3, 2, 3, 4, 2, 3, 3, 2, 4, 3, 2, 3, 3, 4, 2, 3, 3, 2, 3, 4, 3, 2, 3, 3, 4, 2, 3, 3, 2, 3],
    description: "12-email sequence for qualified buyer leads. 68 of 100 subscribers active. 9 opens last 7d. Segments: first-contact, viewed-unit, post-showing, offer-stage.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_05",
    name: "Post–Open House Follow-up — Unit 1901",
    layer: "brokerage",
    platform: "Email",
    type: "event_followup",
    status: "sent",
    impressions: 22,
    clicks: 16,
    conversions: 7,
    spend: 0,
    revenue: 0,
    openRate: 0.73,
    trend: [7, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "22 attendees at June 28 showing event. Automated follow-up triggered 2hr post-event. 7 replies — 2 active offer negotiations in progress (Marcus Webb).",
    winning: false,
    demo: true,
  },

  // Layer 2 — PM Tenant Comms & Retention (Creekwood Commons)
  {
    id: "re_camp_06",
    name: "Lease Renewal Drip — Aug/Sep Expirations",
    layer: "property_management",
    platform: "Email",
    type: "drip",
    status: "active",
    impressions: 12,
    clicks: 9,
    conversions: 5,
    spend: 0,
    revenue: 0,
    openRate: 0.75,
    trend: [1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2],
    description: "60-day renewal outreach to 12 tenants with Aug/Sep expiries. 7 received 60-day notices; 5 renewals confirmed. Avg renewal increase: +4.2%.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_07",
    name: "Unit 116 Vacancy — Google + Apartments.com",
    layer: "property_management",
    platform: "Google",
    type: "listing",
    status: "active",
    impressions: 2140,
    clicks: 89,
    conversions: 14,
    spend: 180,
    revenue: 0,
    trend: [3, 4, 5, 3, 4, 4, 5, 4, 3, 5, 4, 4, 3, 4, 5, 3, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 3, 4, 4, 5],
    description: "Posted June 3. 14 inquiries, 3 showing appointments scheduled. Carmen Vega managing applicant pipeline. $2,100/mo asking (vs. current avg $1,840).",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_08",
    name: "Creekwood July Newsletter",
    layer: "property_management",
    platform: "Email",
    type: "newsletter",
    status: "sent",
    impressions: 142,
    clicks: 89,
    conversions: 0,
    spend: 0,
    revenue: 0,
    openRate: 0.63,
    trend: [0, 0, 0, 0, 0, 89, 12, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "142-unit community newsletter: pool hours extended through Labor Day, July 4 fireworks noise ordinance reminder, new laundry room schedule.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_09",
    name: "Tenant Satisfaction Survey — Q2",
    layer: "property_management",
    platform: "Email",
    type: "survey",
    status: "active",
    impressions: 142,
    clicks: 98,
    conversions: 87,
    spend: 0,
    revenue: 0,
    openRate: 0.69,
    trend: [15, 18, 22, 19, 8, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Q2 tenant satisfaction survey. 87 responses (61% response rate). Avg score: 4.2/5. Top issue: maintenance response time (HVAC incident cited by 12 respondents).",
    winning: false,
    demo: true,
  },

  // Layer 3 — HOA Comms (Meridian at Flamingo HOA)
  {
    id: "re_camp_10",
    name: "HOA July Board Meeting — Notice + Agenda",
    layer: "hoa",
    platform: "Email",
    type: "notice",
    status: "sent",
    impressions: 746,
    clicks: 312,
    conversions: 0,
    spend: 0,
    revenue: 0,
    openRate: 0.42,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 312, 18, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Board meeting notice to all 746 unit owners. July 15, 6:30pm. Agenda: reserve fund review, GC contract vote, summer hours policy.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_11",
    name: "HOA Assessment Notice — Q3",
    layer: "hoa",
    platform: "Email",
    type: "notice",
    status: "sent",
    impressions: 746,
    clicks: 621,
    conversions: 680,
    spend: 0,
    revenue: 510000,
    openRate: 0.83,
    trend: [0, 0, 0, 0, 0, 680, 12, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Q3 regular assessment notice. $750/unit due July 15. 680 of 746 paid within 5 days. 66 delinquent — late notices queued.",
    winning: false,
    demo: true,
  },

  // Layer 4 — LP IR Comms (Domain Point)
  {
    id: "re_camp_12",
    name: "Domain Point — June Construction Update",
    layer: "investor_relations",
    platform: "Email",
    type: "ir_update",
    status: "sent",
    impressions: 8,
    clicks: 7,
    conversions: 0,
    spend: 0,
    revenue: 0,
    openRate: 0.875,
    trend: [0, 0, 0, 0, 0, 7, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Monthly LP update: construction 70% complete, permit inspection Thursday, projected delivery Oct 2026 on track. Attached: photo set from Derek Cho.",
    winning: false,
    demo: true,
  },
  {
    id: "re_camp_13",
    name: "Domain Point — July 30 Capital Call",
    layer: "investor_relations",
    platform: "Email",
    type: "capital_call",
    status: "active",
    impressions: 8,
    clicks: 6,
    conversions: 6,
    spend: 0,
    revenue: 380000,
    openRate: 0.75,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Capital call #3 — $380K total, pro-rated by commitment. 6 LPs confirmed ($250K received); 2 non-responsive (Eaton + Nguyen Group, $130K outstanding).",
    winning: true,
    demo: true,
  },
];

(async () => {
  // Clear existing demo campaigns for this tenant
  const existing = await db.collection("campaigns")
    .where("tenantId", "==", RE_DEMO_TENANT).where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo campaigns`);

  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const camp of CAMPAIGNS) {
    await db.collection("campaigns").doc(camp.id).set({
      ...camp,
      tenantId: RE_DEMO_TENANT,
      ownerUid: RE_DEMO_UID,
      createdAt: now,
    });
    console.log(`  ✓ [${camp.layer}] ${camp.name.slice(0, 55)}…`);
  }

  console.log(`\n✓ Seeded ${CAMPAIGNS.length} campaigns across 4 layers`);
  console.log("  SAMPLE watermark will NOT appear — real campaigns exist");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
