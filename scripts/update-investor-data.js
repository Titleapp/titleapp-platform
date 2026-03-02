#!/usr/bin/env node
/**
 * Update investor data room: Firestore config docs + Cloud Storage file uploads.
 * Uses Firebase CLI's stored refresh token → access token → REST APIs.
 * Run from repo root: node scripts/update-investor-data.js
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");

const PROJECT_ID = "title-app-alpha";
const STORAGE_BUCKET = "title-app-alpha.firebasestorage.app";
const FIREBASE_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const DOCS_DIR = path.join(__dirname, "..", "docs", "investor", "current");

// --- Helpers ---

function httpReq(url, opts, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: opts.method || "GET",
      headers: opts.headers || {},
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function uploadFile(url, filePath, contentType, accessToken) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": contentType,
        "Content-Length": fileData.length,
      },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    req.write(fileData);
    req.end();
  });
}

async function getAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }).toString();

  const res = await httpReq("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }, body);

  if (res.data.access_token) return res.data.access_token;
  throw new Error("Failed to get access token: " + JSON.stringify(res.data));
}

// Convert JS value to Firestore REST format
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function firestorePatch(accessToken, docPath, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "_serverTimestamp") continue;
    fields[k] = toFirestoreValue(v);
  }
  // Add server timestamp for updatedAt
  fields.updatedAt = { timestampValue: new Date().toISOString() };

  const fieldMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?${fieldMask}`;

  const res = await httpReq(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }, JSON.stringify({ fields }));

  if (res.status >= 400) throw new Error(`Firestore PATCH ${docPath} failed (${res.status}): ${JSON.stringify(res.data)}`);
  return res;
}

// --- Main ---

async function main() {
  console.log("=== Updating Investor Data Room ===\n");

  // Load Firebase CLI refresh token
  const cfgPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const refreshToken = cfg.tokens && cfg.tokens.refresh_token;
  if (!refreshToken) { console.error("No refresh token. Run `firebase login`."); process.exit(1); }

  console.log("Getting access token...");
  const accessToken = await getAccessToken(refreshToken);
  console.log("   Authenticated.\n");

  // 1. Update config/investorDocs
  console.log("1. Updating config/investorDocs...");
  await firestorePatch(accessToken, "config/investorDocs", {
    documents: [
      {
        name: "Pitch Deck v6",
        filename: "TitleApp_Pitch_Deck_v6.pptx",
        storagePath: "investorDocs/TitleApp_Pitch_Deck_v6.pptx",
        type: "pitch_deck",
        description: "Full investor pitch deck -- March 2026",
        requiresVerification: false,
        icon: "presentation",
        tier: 1,
      },
      {
        name: "One-Pager v6",
        filename: "TitleApp_One_Pager_v6.pdf",
        storagePath: "investorDocs/TitleApp_One_Pager_v6.pdf",
        type: "one_pager",
        description: "One-page overview -- market, product, team, terms",
        requiresVerification: false,
        icon: "document",
        tier: 1,
      },
      {
        name: "Business Plan v4",
        filename: "TitleApp_Business_Plan_March2026_v4.docx",
        storagePath: "investorDocs/TitleApp_Business_Plan_March2026_v4.docx",
        type: "business_plan",
        description: "Business plan -- March 2026 update",
        requiresVerification: true,
        icon: "document",
        tier: 2,
      },
      {
        name: "Financial Model v1",
        filename: "TitleApp_Financial_Model_v1.xlsx",
        storagePath: "investorDocs/TitleApp_Financial_Model_v1.xlsx",
        type: "financial_model",
        description: "36-month, 3-scenario cash flow model",
        requiresVerification: true,
        icon: "document",
        tier: 2,
      },
      {
        name: "SAFE Agreement",
        filename: null,
        storagePath: null,
        type: "safe",
        description: "Post-Money SAFE -- auto-populated with your details when ready",
        requiresVerification: true,
        requiresDisclaimer: true,
        icon: "legal",
        tier: 2,
      },
    ],
  });
  console.log("   Done.\n");

  // 2. Update config/raise runway
  console.log("2. Updating config/raise (runway)...");
  await firestorePatch(accessToken, "config/raise", {
    runway: {
      netProceeds: 803000,
      monthlyBurn: 27800,
      zeroRevenueMonths: 29,
      withRevenueMonths: "33+",
      displayText: "29 months (zero revenue) | 33+ with revenue",
      cashFlowPositiveTarget: "mid-2027",
    },
  });
  console.log("   Done.\n");

  // 3. Upload files to Cloud Storage
  console.log("3. Uploading files to Cloud Storage...");
  const files = [
    { local: "TitleApp_Pitch_Deck_v6.pptx", remote: "investorDocs/TitleApp_Pitch_Deck_v6.pptx", contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
    { local: "TitleApp_One_Pager_v6.pdf", remote: "investorDocs/TitleApp_One_Pager_v6.pdf", contentType: "application/pdf" },
    { local: "TitleApp_Business_Plan_March2026_v4.docx", remote: "investorDocs/TitleApp_Business_Plan_March2026_v4.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { local: "TitleApp_Financial_Model_v1.xlsx", remote: "investorDocs/TitleApp_Financial_Model_v1.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  ];

  for (const f of files) {
    const localPath = path.join(DOCS_DIR, f.local);
    if (!fs.existsSync(localPath)) {
      console.log(`   SKIP: ${f.local} not found`);
      continue;
    }
    const stats = fs.statSync(localPath);
    console.log(`   Uploading ${f.local} (${(stats.size / 1024).toFixed(1)} KB)...`);

    const encodedName = encodeURIComponent(f.remote);
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedName}`;
    const res = await uploadFile(uploadUrl, localPath, f.contentType, accessToken);

    if (res.status >= 400) {
      console.log(`   ERROR uploading ${f.local}: ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
    } else {
      console.log(`   Uploaded -> gs://${STORAGE_BUCKET}/${f.remote}`);
    }
  }

  console.log("\n=== All done. ===");
  console.log("Firestore: config/investorDocs and config/raise updated.");
  console.log("Storage: files uploaded to investorDocs/.");
  process.exit(0);
}

main().catch(e => {
  console.error("Script failed:", e.message || e);
  process.exit(1);
});
