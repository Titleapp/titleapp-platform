#!/usr/bin/env node
// IndexNow submission script.
//
// Notifies Bing + Yandex + Naver that URLs on sociii.ai have changed.
// Crawlers re-index within minutes (vs days for sitemap-based discovery).
//
// Usage:
//   node scripts/indexnowSubmit.js                    # submit all sitemap URLs
//   node scripts/indexnowSubmit.js <url1> <url2>...   # submit specific URLs
//
// Run after:
//   - Shipping new /docs page
//   - Updating ad landing copy
//   - Publishing a new Creator Profile
//
// Docs: https://www.indexnow.org/documentation

const https = require("https");
const { URL } = require("url");

const HOST = "sociii.ai";
const KEY = "a22a17ab4e3947a035d29fbe0e0efacf";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Default URLs — synced from public/sitemap.xml. Update when sitemap changes.
const DEFAULT_URLS = [
  "https://sociii.ai/",
  "https://sociii.ai/docs",
  "https://sociii.ai/docs/what-is-sociii",
  "https://sociii.ai/docs/install",
  "https://sociii.ai/docs/your-first-worker",
  "https://sociii.ai/docs/sdk",
  "https://sociii.ai/docs/worker-anatomy",
  "https://sociii.ai/docs/intent-spec",
  "https://sociii.ai/docs/canvas-tabs",
  "https://sociii.ai/docs/raas",
  "https://sociii.ai/docs/qa-001",
  "https://sociii.ai/docs/three-lanes",
  "https://sociii.ai/docs/earnings",
  "https://sociii.ai/docs/creator-agreement",
  "https://sociii.ai/docs/review-cycle",
  "https://sociii.ai/docs/api",
  "https://sociii.ai/docs/glossary",
  "https://sociii.ai/whitepaper",
  "https://sociii.ai/creators/journey",
  "https://sociii.ai/auto",
  "https://sociii.ai/pilot",
  "https://sociii.ai/property-management",
  "https://sociii.ai/title-escrow",
  "https://sociii.ai/build",
];

function postJSON(host, path, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body), "utf8");
    const req = https.request({
      method: "POST",
      host,
      path,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": data.length,
      },
    }, (res) => {
      let chunks = "";
      res.on("data", (c) => { chunks += c; });
      res.on("end", () => resolve({ status: res.statusCode, body: chunks }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const argUrls = process.argv.slice(2).filter(a => a.startsWith("http"));
  const urlList = argUrls.length > 0 ? argUrls : DEFAULT_URLS;

  console.log(`[indexnow] submitting ${urlList.length} URLs from host ${HOST}`);
  console.log(`[indexnow] key file: ${KEY_LOCATION}`);

  const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };

  // Submit to the generic IndexNow endpoint (relays to all participating engines).
  const targets = [
    { name: "api.indexnow.org", host: "api.indexnow.org", path: "/IndexNow" },
    { name: "Bing", host: "www.bing.com", path: "/indexnow" },
  ];

  for (const t of targets) {
    try {
      const r = await postJSON(t.host, t.path, payload);
      const ok = r.status >= 200 && r.status < 300;
      console.log(`[indexnow] ${t.name}: ${r.status} ${ok ? "OK" : "FAIL"}${r.body ? " — " + r.body.slice(0, 200) : ""}`);
    } catch (e) {
      console.error(`[indexnow] ${t.name}: ERROR ${e.message}`);
    }
  }

  console.log("[indexnow] done. Recrawl typically happens within minutes for Bing.");
}

main().catch(e => { console.error(e); process.exit(1); });
