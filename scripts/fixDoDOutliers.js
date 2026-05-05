// CODEX 50.10-T1 outlier cleanup. Backfills capabilitySummary on 9 live
// workers from their existing description field, and brings alex-worker-zero
// up to DoD where the criteria apply (it's a platform-entitlement worker that
// uses rulePackId + master Alex prompt, so raas + workerSystemPrompts are
// intentionally absent — those are recognized as exceptions in the audit).
const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");

const PROMPT_FAILURES = [
  "av-daily-ops-report", "av-dispatch-board",
  "business-intelligence", "client-communication",
  "control-center", "re-daily-portfolio-report",
  "solar-customer-proposal", "solar-site-assessment",
  "marketing-content",
];

function firstSentence(s, max = 200) {
  if (!s) return null;
  const idx = s.indexOf(". ");
  let out = idx > 0 ? s.slice(0, idx + 1) : s;
  if (out.length > max) out = out.slice(0, max - 1).trimEnd() + "…";
  return out.trim();
}

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — fix DoD outliers\n`);

  // 1. Backfill capabilitySummary on 9 live workers from description
  for (const slug of PROMPT_FAILURES) {
    const ref = db.collection("digitalWorkers").doc(slug);
    const d = await ref.get();
    if (!d.exists) {
      console.log(`  ${slug}: MISSING DOC, skipping`);
      continue;
    }
    const w = d.data();
    if (w.capabilitySummary) {
      console.log(`  ${slug}: already has capabilitySummary — skipping`);
      continue;
    }
    const summary = firstSentence(w.description);
    if (!summary) {
      console.log(`  ${slug}: no description to copy from — skipping`);
      continue;
    }
    console.log(`  ${slug}:`);
    console.log(`    capabilitySummary ← "${summary}"`);
    if (!DRY) await ref.update({ capabilitySummary: summary });
  }

  // 2. alex-worker-zero — set price 0 (free per platform entitlement),
  //    add headline + capabilitySummary derived from workspaceLaunchPage
  const azRef = db.collection("digitalWorkers").doc("alex-worker-zero");
  const az = await azRef.get();
  if (az.exists) {
    const w = az.data();
    const updates = {};
    if (typeof w.price !== "number") {
      updates.price = 0;
      console.log(`  alex-worker-zero:\n    price ← 0 (Alex is free platform entitlement)`);
    }
    if (!w.headline) {
      updates.headline = w.workspaceLaunchPage?.tagline
        || "Your Chief of Staff — coordinates the platform";
      console.log(`    headline ← "${updates.headline}"`);
    }
    if (!w.capabilitySummary) {
      const cs = firstSentence(w.workspaceLaunchPage?.valueProp)
        || "Alex orchestrates platform actions across vault, document control, and worker delegation.";
      updates.capabilitySummary = cs;
      console.log(`    capabilitySummary ← "${cs}"`);
    }
    if (Object.keys(updates).length === 0) {
      console.log(`  alex-worker-zero: already onboarded — skipping`);
    } else if (!DRY) {
      await azRef.update(updates);
    }
  }

  console.log(`\n${DRY ? "DRY RUN — no writes performed. Re-run with --apply." : "Done."}\n`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
