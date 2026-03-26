#!/usr/bin/env node
"use strict";

/**
 * backfill-worker-substrate.js — Worker Substrate Backfill (Prompt 40.1-T3)
 *
 * Backfills all digitalWorkers documents with:
 *   1. platformSubstrate (8 capabilities)
 *   2. workspaceLaunchPage (AI-generated per worker)
 *   3. verticalIntegrations (inferred from vertical)
 *   4. Quality fields (unaudited baseline)
 *
 * Usage:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/backfill-worker-substrate.js [--dry-run]
 */

const admin = require("firebase-admin");
const path = require("path");

// Load .env for ANTHROPIC_API_KEY
try { require("dotenv").config({ path: path.resolve(__dirname, "../.env") }); } catch (_) {
  // dotenv not installed — try to load .env manually
  const fs = require("fs");
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not found in environment or .env");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;
const MODEL = "claude-sonnet-4-20250514";

// ═══════════════════════════════════════════════════════════════
//  INIT FIREBASE
// ═══════════════════════════════════════════════════════════════

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
//  SUBSTRATE DEFAULTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PLATFORM_SUBSTRATE = {
  email: true,
  sms: true,
  documentGeneration: true,
  eSignatures: true,
  vault: true,
  auditTrail: true,
  payments: true,
  identityVerification: false,
};

// ═══════════════════════════════════════════════════════════════
//  VERTICAL INTEGRATION MAP
// ═══════════════════════════════════════════════════════════════

const VERTICAL_INTEGRATION_MAP = {
  Aviation: [
    { id: "foreflight", label: "ForeFlight", vertical: "aviation", required: false },
  ],
  "Real Estate": [
    { id: "attom", label: "Attom Data", vertical: "real-estate", required: false },
  ],
  Investment: [
    { id: "attom", label: "Attom Data", vertical: "real-estate", required: false },
  ],
  Finance: [
    { id: "attom", label: "Attom Data", vertical: "real-estate", required: false },
  ],
  "Property Management": [
    { id: "attom", label: "Attom Data", vertical: "real-estate", required: false },
  ],
  Web3: [
    { id: "venly", label: "Venly", vertical: "web3", required: false },
  ],
  Tokenomics: [
    { id: "venly", label: "Venly", vertical: "web3", required: false },
  ],
  "Solar Energy": [],
  Automotive: [],
  "Health & EMS Education": [],
  Government: [],
};

// ═══════════════════════════════════════════════════════════════
//  INFER ACTIVE SUBSTRATE FEATURES
// ═══════════════════════════════════════════════════════════════

function inferActiveSubstrateFeatures(worker) {
  const features = ["auditTrail", "vault"];
  const text = [
    worker.display_name || "",
    worker.headline || "",
    worker.capabilitySummary || "",
    ...(worker.document_templates || []),
    ...(worker.raas_tier_1 || []),
  ].join(" ").toLowerCase();

  // Document generation
  if (
    (worker.document_templates && worker.document_templates.length > 0) ||
    /report|document|generat|pdf|memo|letter|template|one-pager|compliance.*review|analysis/i.test(text)
  ) {
    features.push("documentGeneration");
  }

  // E-signatures
  if (/sign|agreement|contract|notari|acknowledgment|consent|authorization/i.test(text)) {
    features.push("eSignatures");
  }

  // Email + SMS notifications
  if (/alert|notif|remind|deadline|expir|schedule|monitor|track|check/i.test(text)) {
    features.push("email", "sms");
  }

  // Payments
  if (/payment|invoice|billing|subscription|charge|fee|ledger|credit/i.test(text)) {
    features.push("payments");
  }

  return [...new Set(features)];
}

// ═══════════════════════════════════════════════════════════════
//  BUILD PROMPT FOR CLAUDE
// ═══════════════════════════════════════════════════════════════

function buildWorkerPrompt(worker) {
  const tier1Rules = (worker.raas_tier_1 || []).slice(0, 5).join("; ");
  return `Generate a workspace launch page for this TitleApp Digital Worker. Return JSON only — no markdown, no code fences, no explanation.

Worker: ${worker.display_name || worker.worker_id}
Headline: ${worker.headline || "N/A"}
Capability Summary: ${worker.capabilitySummary || "N/A"}
Suite: ${worker.suite || "N/A"}
Vertical: ${worker.vertical || worker.suite || "General Business"}
Key Rules: ${tier1Rules || "Standard compliance rules"}

Return this exact JSON structure:
{
  "tagline": "One line: what this worker does for the user",
  "valueProp": "2-3 sentences: why this worker matters to the user's business. Be specific to the domain.",
  "whatYoullHave": "One line: the tangible outcome when done",
  "quickStartPrompts": [
    "A specific question or action a user would ask this worker",
    "A second specific question or action",
    "A third specific question or action"
  ]
}

Rules:
- Never use emojis
- Never use the word "AI" or "chatbot"
- Use professional, direct language
- quickStartPrompts must be specific to this worker's domain, not generic
- tagline and whatYoullHave must be one sentence each`;
}

// ═══════════════════════════════════════════════════════════════
//  CALL CLAUDE API
// ═══════════════════════════════════════════════════════════════

async function generateLaunchPage(worker) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: buildWorkerPrompt(worker) }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";

  // Extract JSON from response (handle possible markdown fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required fields
  if (!parsed.tagline || !parsed.valueProp || !parsed.whatYoullHave) {
    throw new Error("Missing required fields in Claude response");
  }
  if (!Array.isArray(parsed.quickStartPrompts) || parsed.quickStartPrompts.length !== 3) {
    throw new Error(`quickStartPrompts must have exactly 3 items, got ${parsed.quickStartPrompts?.length}`);
  }

  return parsed;
}

// ═══════════════════════════════════════════════════════════════
//  PROCESS A SINGLE WORKER
// ═══════════════════════════════════════════════════════════════

async function processWorker(doc) {
  const data = doc.data();
  const workerId = data.worker_id || doc.id;

  // Skip drafts
  if (data.status === "draft") {
    return { workerId, action: "skipped", reason: "draft" };
  }

  // Skip if already has fully populated workspaceLaunchPage
  if (
    data.workspaceLaunchPage &&
    data.workspaceLaunchPage.tagline &&
    data.workspaceLaunchPage.quickStartPrompts &&
    data.workspaceLaunchPage.quickStartPrompts.length === 3
  ) {
    return { workerId, action: "skipped", reason: "already_populated" };
  }

  try {
    // Generate launch page content via Claude
    const launchPage = await generateLaunchPage(data);
    const activeFeatures = inferActiveSubstrateFeatures(data);

    // Infer vertical integrations
    const suite = data.suite || "General Business";
    const integrations = VERTICAL_INTEGRATION_MAP[suite] || [];

    const update = {
      platformSubstrate: DEFAULT_PLATFORM_SUBSTRATE,
      workspaceLaunchPage: {
        tagline: launchPage.tagline,
        valueProp: launchPage.valueProp,
        whatYoullHave: launchPage.whatYoullHave,
        quickStartPrompts: launchPage.quickStartPrompts,
        activeSubstrateFeatures: activeFeatures,
      },
      verticalIntegrations: integrations,
      qualityStatus: "unaudited",
      qualityScore: null,
      qualityAuditedAt: null,
      certificationIssues: [],
    };

    if (!DRY_RUN) {
      await db.collection("digitalWorkers").doc(doc.id).set(update, { merge: true });
    }

    console.log(`  ✓ ${workerId} — "${launchPage.tagline}" [${activeFeatures.join(", ")}]`);
    return { workerId, action: "updated", tagline: launchPage.tagline, prompts: launchPage.quickStartPrompts };
  } catch (err) {
    console.error(`  ✗ ${workerId} — ${err.message}`);
    return { workerId, action: "error", error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Worker Substrate Backfill — 40.1-T3`);
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Model: ${MODEL}`);
  console.log(`${"═".repeat(60)}\n`);

  const snap = await db.collection("digitalWorkers").get();
  console.log(`Total digitalWorkers: ${snap.size}\n`);

  const results = { updated: 0, skipped: 0, errored: 0, draftSkipped: 0, details: [] };
  const docs = snap.docs;

  // Process in batches
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(docs.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} (workers ${i + 1}-${Math.min(i + BATCH_SIZE, docs.length)}):`);

    // Process batch sequentially (rate limiting)
    for (const doc of batch) {
      const result = await processWorker(doc);
      results.details.push(result);

      if (result.action === "updated") results.updated++;
      else if (result.action === "skipped" && result.reason === "draft") results.draftSkipped++;
      else if (result.action === "skipped") results.skipped++;
      else if (result.action === "error") results.errored++;
    }

    // Delay between batches
    if (i + BATCH_SIZE < docs.length) {
      console.log(`  (waiting ${BATCH_DELAY_MS}ms...)\n`);
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // ── REPORT ──
  console.log(`\n${"═".repeat(60)}`);
  console.log("  RESULTS");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total processed: ${docs.length}`);
  console.log(`  Updated:         ${results.updated}`);
  console.log(`  Skipped (exists): ${results.skipped}`);
  console.log(`  Skipped (draft):  ${results.draftSkipped}`);
  console.log(`  Errors:          ${results.errored}`);

  if (results.errored > 0) {
    console.log(`\n  ERRORS:`);
    results.details
      .filter((d) => d.action === "error")
      .forEach((d) => console.log(`    ${d.workerId}: ${d.error}`));
  }

  // Sample output for 3 specific workers
  const samples = ["av-pc12-ng", "cre-analyst", "solar-sales-closer"];
  console.log(`\n${"═".repeat(60)}`);
  console.log("  SAMPLE OUTPUT");
  console.log(`${"═".repeat(60)}`);
  for (const slug of samples) {
    const detail = results.details.find((d) => d.workerId === slug);
    if (detail && detail.action === "updated") {
      // Re-read from Firestore to show full data
      if (!DRY_RUN) {
        const docSnap = await db.collection("digitalWorkers").doc(slug).get();
        const d = docSnap.data();
        console.log(`\n  ${slug}:`);
        console.log(JSON.stringify({
          workspaceLaunchPage: d.workspaceLaunchPage,
          platformSubstrate: d.platformSubstrate,
          qualityStatus: d.qualityStatus,
          verticalIntegrations: d.verticalIntegrations,
        }, null, 4));
      } else {
        console.log(`\n  ${slug}: tagline="${detail.tagline}", prompts=${JSON.stringify(detail.prompts)}`);
      }
    } else if (detail) {
      console.log(`\n  ${slug}: ${detail.action} (${detail.reason || detail.error})`);
    } else {
      console.log(`\n  ${slug}: not found in results`);
    }
  }

  console.log(`\n${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
