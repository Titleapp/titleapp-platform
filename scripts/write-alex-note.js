#!/usr/bin/env node
/**
 * write-alex-note.js — write a note directly into Alex's memory (alex_notes collection).
 * Claude Code uses this to hand off context to Alex without Sean copy-pasting.
 *
 * Usage:
 *   node /tmp/write-alex-note.js "Title here" "Body content here" [tag1,tag2]
 *   node /tmp/write-alex-note.js "Shane follow-up" "Send deck to shane@x.com" "from-code,investor"
 *
 * Tags:
 *   from-code  — Claude Code → Alex (Alex reads at session start)
 *   for-code   — Alex → Claude Code (Code reads these to pick up context)
 *
 * Auth: uses `gcloud auth print-access-token` — run once if needed:
 *   gcloud auth login && gcloud auth application-default login
 */

const { execSync } = require("child_process");
const https = require("https");

const PROJECT_ID  = "title-app-alpha";
const SEAN_UID    = "WResykI56hW16silsOtvlw1UjJK2";
const TENANT_ID   = "title-app-llc";

async function getToken() {
  return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
}

function firestorePost(token, body) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/alex_notes`;
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const title   = process.argv[2];
  const content = process.argv[3];
  const tagStr  = process.argv[4] || "from-code";
  const tags    = tagStr.split(",").map(t => t.trim()).filter(Boolean);

  if (!title || !content) {
    console.error("Usage: node write-alex-note.js <title> <content> [tags]");
    process.exit(1);
  }

  const token = await getToken();

  const body = {
    fields: {
      ownerUid:   { stringValue: SEAN_UID },
      tenantId:   { stringValue: TENANT_ID },
      title:      { stringValue: title },
      content:    { stringValue: content },
      tags:       { arrayValue: { values: tags.map(t => ({ stringValue: t })) } },
      workerSlug: { stringValue: "chief-of-staff" },
      source:     { stringValue: "claude-code" },
      createdAt:  { timestampValue: new Date().toISOString() },
    },
  };

  const result = await firestorePost(token, body);
  if (result.name) {
    const id = result.name.split("/").pop();
    console.log(`Note written: ${id}`);
    console.log(`Title: ${title}`);
    console.log(`Tags:  ${tags.join(", ")}`);
  } else {
    console.error("Write failed:", JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
