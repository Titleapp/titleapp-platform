"use strict";
/**
 * auditWorkerReadiness.js — S52.45. Scans EVERY worker for the classes of bugs
 * we just hit, so they can be fixed platform-wide instead of one demo at a time.
 *
 * Per worker, checks:
 *   - grounded:        workerSystemPrompts/{slug} exists (else generic chat)
 *   - canvasDesigned:  explicit true/false flag (unset = will hit generic canvas)
 *   - hasRealCanvas:   in the designed-canvas allowlist (RE_CANVAS / CRE / spine)
 *   - status, vertical
 *
 * RISK = NOT grounded, OR (canvasDesigned !== false AND !hasRealCanvas) → it will
 *        show a generic/wrong canvas or generic chat.
 */
const admin = require(require("path").join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

// Workers that genuinely HAVE a designed/curated canvas today (frontend reality).
const DESIGNED = new Set([
  "title-abstract-001", "law-landuse-001", "zoning-001", "feasibility-001", // RE_CANVAS
  "cre-analyst", "cre-deal-analyst",                                          // CRE fixtures
  "platform-accounting", "platform-hr", "platform-marketing",                 // SPINE_FIXTURES
  "platform-control-center-pro", "fundraise",
]);

(async () => {
  const [workers, prompts] = await Promise.all([
    db.collection("digitalWorkers").get(),
    db.collection("workerSystemPrompts").get(),
  ]);
  const grounded = new Set(prompts.docs.map((d) => d.id));

  const rows = [];
  workers.forEach((d) => {
    const x = d.data();
    const slug = d.id;
    const isGrounded = grounded.has(slug);
    const cd = x.canvasDesigned; // true | false | undefined
    const hasRealCanvas = DESIGNED.has(slug);
    const canvasRisk = cd !== false && !hasRealCanvas; // will show generic/wrong canvas
    const risk = !isGrounded || canvasRisk;
    rows.push({ slug, status: x.status || "?", grounded: isGrounded, canvasDesigned: cd === undefined ? "unset" : cd, hasRealCanvas, risk });
  });

  rows.sort((a, b) => (a.risk === b.risk ? a.slug.localeCompare(b.slug) : a.risk ? -1 : 1));
  const atRisk = rows.filter((r) => r.risk);

  console.log(`\n=== Worker readiness audit — ${rows.length} workers ===`);
  console.log(`grounded: ${rows.filter((r) => r.grounded).length}/${rows.length} · real canvas: ${rows.filter((r) => r.hasRealCanvas).length}/${rows.length} · AT RISK: ${atRisk.length}\n`);
  console.log("RISK  SLUG                         STATUS    GROUNDED  canvasDesigned  realCanvas");
  rows.forEach((r) => console.log(
    `${r.risk ? "⚠️ " : "✅"}   ${r.slug.padEnd(28)} ${String(r.status).padEnd(9)} ${String(r.grounded).padEnd(9)} ${String(r.canvasDesigned).padEnd(15)} ${r.hasRealCanvas}`
  ));
  console.log(`\n${atRisk.length} workers will show a GENERIC/WRONG canvas or generic chat until fixed.`);
  console.log("FIX: set canvasDesigned:false on every worker NOT in the designed set → uniform chat-only notice.");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
