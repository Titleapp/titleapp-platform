"use strict";

/**
 * testIvyPrPitch.js — One-shot QA: ask Ivy (platform-marketing worker, real
 * SOCIII Inc. tenant) to draft the NurseDot Podcast pitch for Ruthie, to
 * verify the new PR/podcast-outreach knowledge (pr-podcast-outreach.md)
 * actually reaches her in a live chat call. Uses a throwaway sessionId so
 * it doesn't touch Sean's real ongoing Ivy conversation.
 *
 *   node scripts/testIvyPrPitch.js
 */

const path = require("path");
const https = require("https");

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const WEB_API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const UID = "WResykI56hW16silsOtvlw1UjJK2"; // Sean
const TENANT_ID = "ws_1779846027006_hc71aw"; // SOCIII, Inc.
const WORKER_SLUG = "platform-marketing"; // Ivy
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";

function postJson(hostname, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path: urlPath,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(data) }); } catch (e) { resolve({ status: res.statusCode, raw: data }); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const customToken = await admin.auth().createCustomToken(UID);
  const exch = await postJson("identitytoolkit.googleapis.com", `/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, {
    token: customToken,
    returnSecureToken: true,
  });
  const idToken = exch.json && exch.json.idToken;
  if (!idToken) throw new Error("Failed to mint idToken: " + JSON.stringify(exch));

  const sessionId = `ivy-pr-skill-test-${Date.now()}`;
  const prompt =
    "Draft a pitch email to NurseDot Podcast for Ruthie about the 'Expert, Not Engineer' story. " +
    "Who exactly should it go to, and what's the pitch?";

  const res = await postJson("api-feyfibglbq-uc.a.run.app", "/v1/chat:message", {
    sessionId,
    userInput: prompt,
    selectedWorker: WORKER_SLUG,
    tenantId: TENANT_ID,
    context: { source: "testIvyPrPitch-script" },
  }, { Authorization: `Bearer ${idToken}`, "x-tenant-id": TENANT_ID });

  console.log("Status:", res.status);
  console.log(JSON.stringify(res.json || res.raw, null, 2));
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
