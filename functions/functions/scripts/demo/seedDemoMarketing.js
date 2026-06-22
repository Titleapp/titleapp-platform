// Seed Meadow Creek marketing campaigns (creative + performance) so the
// Marketing worker renders a VISUAL campaign-performance board showing which
// creative is winning. Also re-syncs digitalWorkers/platform-marketing.canvasTabs
// to the new 3-tab board (Overview / Campaigns / Creative) — a GLOBAL change
// that fixes SOCIII's own marketing worker too. Idempotent (demo:true).
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TENANT = "ws_1781920656122_tl9dhn"; // Meadow Creek Veterinary Clinic

const CAMPAIGNS = [
  { name: "New Puppy & Kitten Package", channel: "instagram", headline: "First-year wellness, one easy plan 🐾",
    gradient: "linear-gradient(135deg,#f472b6,#fb7185)",
    impressions: 42000, clicks: 2100, spend: 1200, conversions: 184, revenue: 9200, trend: [12,15,18,22,26,31,40] },
  { name: "Spring Wellness Reminders", channel: "email", headline: "Time for Bella's spring check-up",
    gradient: "linear-gradient(135deg,#34d399,#10b981)",
    impressions: 8800, clicks: 2600, spend: 200, conversions: 142, revenue: 7100, trend: [20,22,19,24,26,25,28] },
  { name: "Senior Pet Dental Month", channel: "facebook", headline: "20% off dental cleanings all June",
    gradient: "linear-gradient(135deg,#60a5fa,#3b82f6)",
    impressions: 31000, clicks: 930, spend: 800, conversions: 76, revenue: 5300, trend: [10,11,9,12,13,11,12] },
  { name: "Exotic Pet Care Awareness", channel: "google", headline: "Expert care for reptiles, birds & rabbits",
    gradient: "linear-gradient(135deg,#fbbf24,#f59e0b)",
    impressions: 19500, clicks: 585, spend: 650, conversions: 61, revenue: 4200, trend: [7,8,9,8,10,9,11] },
  { name: "Heartworm Prevention Push", channel: "email", headline: "Protect your dog before summer",
    gradient: "linear-gradient(135deg,#fb7185,#ef4444)",
    impressions: 7200, clicks: 1500, spend: 150, conversions: 54, revenue: 2700, trend: [9,10,8,11,10,9,12] },
  { name: "Adopt-a-Thon Partnership", channel: "instagram", headline: "Meet your new best friend this weekend",
    gradient: "linear-gradient(135deg,#a78bfa,#8b5cf6)",
    impressions: 26000, clicks: 780, spend: 400, conversions: 38, revenue: 0, trend: [6,5,7,6,8,7,6] },
];

const MARKETING_TABS = [
  { id: "overview",  label: "Overview",  signal: "card:marketing-board", default: true, order: 0 },
  { id: "campaigns", label: "Campaigns", signal: "card:marketing-board", order: 1 },
  { id: "creative",  label: "Creative",  signal: "card:marketing-board", order: 2 },
];

(async () => {
  // Clear prior demo campaigns for this tenant
  const prior = await db.collection("campaigns").where("tenantId", "==", TENANT).where("demo", "==", true).get();
  if (!prior.empty) {
    const b = db.batch();
    prior.docs.forEach(d => b.delete(d.ref));
    await b.commit();
    console.log(`cleared ${prior.size} prior demo campaigns`);
  }

  const batch = db.batch();
  for (const c of CAMPAIGNS) {
    batch.set(db.collection("campaigns").doc(), {
      tenantId: TENANT, demo: true, status: "active", ...c,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`✓ seeded ${CAMPAIGNS.length} marketing campaigns for Meadow Creek`);

  // Re-sync the spine marketing worker's tabs to the visual board (global doc).
  await db.collection("digitalWorkers").doc("platform-marketing").set(
    { canvasTabs: MARKETING_TABS }, { merge: true }
  );
  console.log("✓ re-synced digitalWorkers/platform-marketing canvasTabs → board (Overview/Campaigns/Creative)");
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
