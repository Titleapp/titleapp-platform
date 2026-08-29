// One-off script: create real Firebase test-user accounts (email/password)
// and mint their ID tokens directly via Identity Toolkit signUp — avoids
// needing iam.serviceAccounts.signBlob (which the local ADC identity lacks)
// since signUp returns an idToken in the response itself. Also writes an
// admin-role membership on demo-sociii-qa for each so instructor-gated
// routes (CODEX 82 §3) work.
//
// Run from functions/functions so node_modules resolves firebase-admin:
//   cd functions/functions && node ../../scripts/mintQaPersonaTokens.js instructor-1 instructor-2
"use strict";
const admin = require("firebase-admin");
const https = require("https");

const WEB_API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const PROJECT_ID = "title-app-alpha";
const TENANT_ID = "demo-sociii-qa";

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { hostname: "identitytoolkit.googleapis.com", path: `${path}?key=${WEB_API_KEY}`, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const personas = process.argv.slice(2); // e.g. instructor-1 instructor-2
  if (!personas.length) { console.error("Usage: node mint-qa-tokens.js persona1 persona2 ..."); process.exit(1); }
  const out = {};
  for (const p of personas) {
    const email = `${p}@sociii-qa.internal.test`;
    const password = `Qa-${Math.random().toString(36).slice(2)}-Test1!`;
    const signUp = await postJson("/v1/accounts:signUp", { email, password, returnSecureToken: true });
    if (!signUp.idToken) throw new Error(`signUp failed for ${p}: ${JSON.stringify(signUp)}`);
    const uid = signUp.localId;
    await db.collection("memberships").doc(`${uid}_${TENANT_ID}`).set({
      userId: uid, tenantId: TENANT_ID, role: "admin", status: "active",
      displayName: p, synthetic: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    out[p] = { uid, idToken: signUp.idToken, email };
    console.error(`created ${p} -> uid=${uid}, membership written`);
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
