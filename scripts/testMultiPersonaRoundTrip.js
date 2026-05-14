/**
 * CODEX 50.18 smoke test — multi-persona round-trip via admin SDK.
 *
 * Exercises the schema end-to-end against real Firestore:
 *   1. POST a 3-persona contact (friend + client + collaborator)
 *   2. Read it back; verify shape (personas[], primary mirrors, tiers_index)
 *   3. Cross-persona query: find by tiers_index "customer"
 *   4. PUT-style patch: change one persona's lifecycle, verify others untouched
 *   5. Apollo simulation: add a 4th "prospect" persona to existing contact
 *   6. Cleanup
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/testMultiPersonaRoundTrip.js
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const {
  normalizePersonasForCreate,
  mergePersonaPatch,
  derivePrimaryMirrors,
  derivePersonaIndex,
  addPersonaToExisting,
} = require(path.join(__dirname, "..", "functions", "functions", "api", "routes", "_contactsHelpers"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TEST_TENANT = "smoke-test-codex-50-18";
const TEST_NAME = "Test Multi-Persona Contact";

function pass(label) { console.log(`✅ ${label}`); }
function fail(label, detail) { console.error(`❌ ${label}`, detail || ""); process.exit(1); }

(async () => {
  console.log("\n=== CODEX 50.18 multi-persona round-trip test ===\n");

  // STEP 1 — POST a 3-persona contact
  const norm = normalizePersonasForCreate([
    { role_label: "friend", type: "personal", tier: "personal", lifecycle_stage: "engaged" },
    { role_label: "client", type: "customer", tier: "customer", lifecycle_stage: "converted", lead_score: 90 },
    { role_label: "collaborator", type: "contractor", tier: "partner", lifecycle_stage: "engaged", project_bindings: ["projX"] },
  ], "test-user");
  if (!norm.ok) fail("Step 1 normalize", norm.reason);
  pass(`Step 1a — normalized 3 personas (ids: ${norm.personas.map(p => p.id).join(", ")})`);

  const primaryId = norm.personas[1].id; // client = primary
  const mirrors = derivePrimaryMirrors(norm.personas, primaryId);
  const tiers_index = derivePersonaIndex(norm.personas);
  const types_index = Array.from(new Set(norm.personas.map(p => p.type)));

  const ref = await db.collection("contacts").add({
    tenantId: TEST_TENANT,
    schema_version: "spine_v2.1",
    name: TEST_NAME,
    personas: norm.personas,
    primary_persona_id: primaryId,
    tiers_index,
    types_index,
    type: mirrors.type,
    contact_tier: mirrors.contact_tier,
    lifecycle_stage: mirrors.lifecycle_stage,
    lead_score: mirrors.lead_score,
    workspaces: [TEST_TENANT],
    source: { primary: "smoke_test", captured_at: new Date().toISOString() },
    segments: [],
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  pass(`Step 1b — wrote contact ${ref.id} with personas=3, primary=${primaryId}, tiers_index=[${tiers_index.join(",")}]`);

  // STEP 2 — Read back, verify shape
  const snap = await ref.get();
  const data = snap.data();
  if (!Array.isArray(data.personas) || data.personas.length !== 3) fail("Step 2 personas count", data.personas);
  if (data.primary_persona_id !== primaryId) fail("Step 2 primary id", data.primary_persona_id);
  if (data.contact_tier !== "customer") fail("Step 2 mirrored tier (should be customer)", data.contact_tier);
  if (data.lifecycle_stage !== "converted") fail("Step 2 mirrored lifecycle (should be converted)", data.lifecycle_stage);
  if (!data.tiers_index.includes("partner")) fail("Step 2 tiers_index missing partner", data.tiers_index);
  pass("Step 2 — read-back shape verified");

  // STEP 3 — Cross-persona query (find this contact by ANY persona tier = "personal")
  const xq = await db.collection("contacts")
    .where("tenantId", "==", TEST_TENANT)
    .where("tiers_index", "array-contains", "personal")
    .get();
  if (xq.empty) fail("Step 3 cross-persona query returned empty");
  const found = xq.docs.find(d => d.id === ref.id);
  if (!found) fail("Step 3 query did not return our test contact");
  pass(`Step 3 — cross-persona query (tiers_index contains "personal") returned ${xq.size} doc(s) including ours`);

  // STEP 4 — PUT-style patch: change client persona lifecycle to "churned"
  const merged = mergePersonaPatch(data.personas, [
    { id: primaryId, lifecycle_stage: "churned" },
  ]);
  if (!merged.ok) fail("Step 4 merge", merged.reason);
  const newMirrors = derivePrimaryMirrors(merged.personas, primaryId);
  await ref.update({
    personas: merged.personas,
    lifecycle_stage: newMirrors.lifecycle_stage,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  const after = await ref.get();
  const friendPersona = after.data().personas.find(p => p.role_label === "friend");
  if (after.data().lifecycle_stage !== "churned") fail("Step 4 mirror not updated", after.data().lifecycle_stage);
  if (friendPersona.lifecycle_stage !== "engaged") fail("Step 4 friend persona was changed", friendPersona);
  pass(`Step 4 — patched client lifecycle→churned; friend.lifecycle still "engaged" (unaffected)`);

  // STEP 5 — Apollo simulation: add a "prospect" persona to existing contact
  const apolloPersona = {
    role_label: "prospect",
    type: "customer",
    tier: "prospect",
    lifecycle_stage: "cold",
    owner: "test-user",
  };
  const ape = addPersonaToExisting(after.data().personas, apolloPersona);
  if (ape.action !== "added") fail("Step 5 add action", ape.action);
  const newTiersIdx = derivePersonaIndex(ape.personas);
  await ref.update({
    personas: ape.personas,
    tiers_index: newTiersIdx,
    types_index: Array.from(new Set(ape.personas.map(p => p.type))),
    schema_version: "spine_v2.1",
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  const afterApollo = await ref.get();
  if (afterApollo.data().personas.length !== 4) fail("Step 5 personas length after Apollo", afterApollo.data().personas.length);
  if (!afterApollo.data().tiers_index.includes("prospect")) fail("Step 5 prospect not in tiers_index", afterApollo.data().tiers_index);
  pass(`Step 5 — Apollo-style add brought personas to ${afterApollo.data().personas.length}, tiers_index=[${afterApollo.data().tiers_index.join(",")}]`);

  // STEP 5b — Apollo dedup: same role_label/type/owner should NOT add a 5th
  const ape2 = addPersonaToExisting(afterApollo.data().personas, apolloPersona);
  if (ape2.action !== "refreshed") fail("Step 5b dedup action (should be refreshed)", ape2.action);
  if (ape2.personas.length !== 4) fail("Step 5b dedup personas length", ape2.personas.length);
  pass("Step 5b — Apollo re-run with same prospect dedupes (refreshed, not added)");

  // STEP 6 — Cleanup
  await ref.delete();
  pass(`Step 6 — cleaned up test contact ${ref.id}`);

  console.log("\n✅ All multi-persona round-trip tests passed.\n");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
