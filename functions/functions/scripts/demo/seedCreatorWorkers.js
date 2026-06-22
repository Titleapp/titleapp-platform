// Seed Dr. Maya Chen's PUBLISHED creator workers (demo@sociii.ai) so the
// Creator Dashboard (/creators/dashboard?tab=workers) shows her catalog +
// earnings instead of "No Digital Workers yet". This is demo pillar #3:
// "she built workers to help other vets and earns income from them."
//
// The dashboard (apps/business/src/sections/CreatorDashboard.jsx) reads the
// top-level `workers` collection filtered by creator_id == auth uid, and the
// per-worker detail panel computes Monthly Revenue = subscriber_count *
// pricing.price. Idempotent (demo:true, cleared + re-seeded each run).
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2"; // demo@sociii.ai

// 3 workers Dr. Chen built from her own expertise. Revenue sums to ~$27,324/mo:
//   312×$29=9,048  +  258×$45=11,610  +  246×$27=6,642  =  $27,300/mo.
const WORKERS = [
  {
    slug: "vet-exotic-triage-001",
    workerId: "VET-EXOTIC-TRIAGE-001",
    name: "Exotic Species Triage Advisor",
    description: "Rapid first-response triage for exotic and pocket pets — reptiles, birds, rabbits, ferrets. Species-specific red flags, weight-based dosing ranges, and when-to-refer guidance, grounded in current exotic-animal practice.",
    short_description: "Triage advisor for exotic & pocket pets.",
    category: "healthcare",
    vertical: "Healthcare",
    subscriber_count: 312,
    subscriber_delta: 18,
    price: 29,
    rating: 4.9,
    knowledge_base: ["Exotic Companion Mammal formulary", "Avian & reptile triage red-flags", "Species weight-dosing tables"],
    workflow_stages: ["Intake species + presenting signs", "Flag emergencies", "Dosing range + refer/treat call"],
  },
  {
    slug: "vet-ce-license-001",
    workerId: "VET-CE-LICENSE-001",
    name: "Veterinary CE & License Tracker",
    description: "Never miss a renewal. Tracks DVM/CVT license expiries, AVMA CE hour requirements, DEA registration, and controlled-substance handling certs — with deadline reminders and a tamper-evident record of every completed credit.",
    short_description: "CE hours, license + DEA renewals, on autopilot.",
    category: "healthcare",
    vertical: "Healthcare",
    subscriber_count: 258,
    subscriber_delta: 12,
    price: 45,
    rating: 4.8,
    knowledge_base: ["State DVM/CVT renewal rules", "AVMA CE requirements", "DEA 21 CFR 1304"],
    workflow_stages: ["Import credentials", "Watch deadlines", "Log completed CE as logbook entries"],
  },
  {
    slug: "vet-tech-onboarding-001",
    workerId: "VET-TECH-ONBOARDING-001",
    name: "Vet Tech Onboarding & OSHA Trainer",
    description: "Onboards new veterinary technicians and assistants: OSHA 1910.1030 bloodborne-pathogen training, radiation safety, controlled-substance logging, and a signed competency checklist — the next generation, trained and documented.",
    short_description: "Onboard + OSHA-train new vet techs.",
    category: "education",
    vertical: "Healthcare",
    subscriber_count: 246,
    subscriber_delta: -4,
    price: 27,
    rating: 4.9,
    knowledge_base: ["OSHA 1910.1030", "Radiation safety basics", "Controlled-substance log SOP"],
    workflow_stages: ["Assign training modules", "Track completion", "Sign competency checklist"],
  },
];

(async () => {
  // Clear prior demo creator workers
  const prior = await db.collection("workers").where("creator_id", "==", UID).where("demo", "==", true).get();
  if (!prior.empty) {
    const b = db.batch();
    prior.docs.forEach(d => b.delete(d.ref));
    await b.commit();
    console.log(`cleared ${prior.size} prior demo creator workers`);
  }

  let totalMrr = 0;
  const batch = db.batch();
  for (const w of WORKERS) {
    totalMrr += w.subscriber_count * w.price;
    const ref = db.collection("workers").doc(w.slug);
    batch.set(ref, {
      creator_id: UID,            // ← the field CreatorDashboard filters on
      demo: true,
      slug: w.slug,
      workerId: w.workerId,
      name: w.name,
      description: w.description,
      short_description: w.short_description,
      category: w.category,
      vertical: w.vertical,
      status: "published",
      published: true,
      subscriber_count: w.subscriber_count,
      subscriber_delta: w.subscriber_delta,
      pricing: { model: "subscription", price: w.price, trial_days: 7 },
      rating: w.rating,
      raas: { workflow_stages: w.workflow_stages, knowledge_base: w.knowledge_base },
      builtIn: "repo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`✓ seeded ${WORKERS.length} published creator workers for Dr. Chen`);
  console.log(`  Combined monthly revenue ≈ $${totalMrr.toLocaleString()}/mo across her catalog`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
