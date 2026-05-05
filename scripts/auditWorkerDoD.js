// CODEX 50.10-T1 DoD audit v3 — recognizes intentional exceptions:
//   - draft/waitlist workers don't fail "marketplace" (intentional pre-launch)
//   - alex-worker-zero uses rulePackId + master Alex prompt (raas + workerSystemPrompts exempt)
//   - fixtures live client-side in sampleData.js (criterion 6 collapses into canvasTabs)
const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const VALID_TIERS = [0, 29, 49, 79];
const VALID_TIMING = new Set(["session_open", "per_message", "per_action", "none"]);
const PRELAUNCH_STATUSES = new Set(["draft", "waitlist", "planned"]);

(async () => {
  const dwSnap = await db.collection("digitalWorkers").get();
  const promptsSnap = await db.collection("workerSystemPrompts").get();
  const havePrompt = new Set(promptsSnap.docs.map(d => d.id));

  const partials = [];
  const prelaunch = [];
  let fullyOnboarded = 0;
  for (const doc of dwSnap.docs) {
    const w = doc.data();
    const slug = doc.id;
    const isAlexZero = !!w.isWorkerZero;

    if (PRELAUNCH_STATUSES.has(w.status)) {
      prelaunch.push({ slug, vertical: w.vertical, status: w.status });
      continue;
    }

    const f = {
      creditCost: typeof w.creditCost === "number",
      creditTiming: !!(w.creditTiming && VALID_TIMING.has(w.creditTiming)),
      price: typeof w.price === "number" && VALID_TIERS.includes(w.price),
      creatorId: !!(w.creatorId && typeof w.creatorId === "string"),
      raas: isAlexZero
        ? !!w.rulePackId
        : [w.raas_tier_0, w.raas_tier_1, w.raas_tier_2, w.raas_tier_3]
            .some(t => Array.isArray(t) && t.length > 0),
      systemPrompt: isAlexZero
        ? !!(w.headline && w.capabilitySummary)
        : (havePrompt.has(slug)
            || !!(w.headline && w.capabilitySummary)
            || !!(w.description && (w.role || w.purpose))),
      canvasTabs: Array.isArray(w.canvasTabs) && w.canvasTabs.length > 0,
      marketplace: w.status === "live" && typeof w.price === "number",
    };
    const ok = Object.values(f).every(Boolean);
    if (ok) fullyOnboarded++;
    else partials.push({
      slug,
      vertical: w.vertical || "unknown",
      status: w.status || "unknown",
      missing: Object.entries(f).filter(([_, v]) => !v).map(([k]) => k),
    });
  }

  const liveTotal = dwSnap.size - prelaunch.length;
  console.log(`\nDoD v3 — ${dwSnap.size} digitalWorkers/* docs`);
  console.log(`Pre-launch (draft/waitlist/planned, intentional): ${prelaunch.length}`);
  console.log(`Live workers fully onboarded: ${fullyOnboarded}/${liveTotal}`);
  console.log(`Live workers with gaps:        ${partials.length}/${liveTotal}\n`);

  if (partials.length) {
    console.log("Live outliers still failing:");
    for (const p of partials) {
      console.log(`  ${p.slug.padEnd(38)} ${p.vertical.padEnd(24)} ${p.missing.join(", ")}`);
    }
    console.log();
  }

  console.log("Pre-launch (informational, not failures):");
  const byStatus = {};
  for (const p of prelaunch) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  for (const [s, n] of Object.entries(byStatus)) console.log(`  ${s}: ${n}`);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
