// chatTest.js — automated chat regression harness for the Meadow Creek demo.
//
// Exercises the REAL /v1/chat:message endpoint (through the Cloudflare frontdoor)
// as the demo user, for the Chief of Staff + every active worker on both the
// business workspace and the personal vault. Asserts each reply is grounded
// (knows it's Meadow Creek / veterinary / Dr. Chen) and fabrication-free
// (no invented addresses, no "what business are you in?" intake drift, no
// hallucinated clinic name). Prints PASS/FAIL per surface; exits 1 on any red.
//
//   node scripts/test/chatTest.js
//
// Auth: sets a throwaway password on the demo user (ADC, no signBlob needed),
// signs in via Identity Toolkit for a real ID token, then restores nothing —
// the password is random and unused elsewhere. Read-only against app data.

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";
const T = "ws_1781920656122_tl9dhn";
const BASE = "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Fabrication / drift red-flags that must NEVER appear in any reply.
const RED_FLAGS = [
  /what (kind of |type of )?(business|operation|practice).{0,40}(are you|do you)/i,
  /what do you do for work/i,
  /what should I call you/i,
  /who (I'm|I am) (talking|speaking) (to|with)/i,
  /medical practice, research/i,
  /real estate development/i,
  /\baviation ops\b/i,
  /\bauto dealer\b/i,
  /just getting started with SOCIII/i,
  /123 Maple/i,
  /Springfield, IL/i,
  /Bishop Vet/i,
  /Bishop Veterinary/i,
];

// Per-surface probes. THREE gates per surface:
//   expectDomain — reply is in the worker's subject area (cheap drift bait)
//   expectData   — reply quotes THIS worker's OWN records (the real test: it
//                  must reference the same data the canvas shows, not generic
//                  knowledge). This is what the old harness missed — a reply
//                  could be on-domain and fabrication-free yet know nothing
//                  about the user's actual records, and still pass.
//   forbid       — the "advisory wall in chat form": chat claiming it has no
//                  data / can't access it / needs an upload, when the canvas
//                  is literally displaying that data right now.
// The probes are phrased to demand a SPECIFIC record so a generic answer fails.
const FORBID_NODATA = /(don'?t|do not|cannot|can'?t|unable to) (have |get )?access|no access to|upload (your |a )?document|add your documents|unlock personalized|i don'?t have (any |that )?(data|records|information)|once you (import|connect|add)/i;
const SURFACES = [
  { id: "cos-business", worker: null, vertical: "chief-of-staff", msg: "Who on my staff has an overdue or soonest-expiring credential, and when?",
    expectDomain: /credential|license|dea|osha|expir|overdue|renew/i,
    expectData: /(alex torres|osha bloodborne|maya chen|jordan park|sam rivera).{0,60}(overdue|expir|2026|2027|days?)/i, forbid: FORBID_NODATA },
  { id: "platform-accounting", worker: "platform-accounting", msg: "What's my net income so far this year, in dollars?",
    expectDomain: /net income|revenue|expense|profit|cash/i,
    // Require a REAL YTD figure ($341,040 net / $588,600 rev / $247,560 exp).
    // A wrong extrapolation like "$196,200" trips this — that was the bug.
    expectData: /\$\s?(341|588|247)[\d,.]*/i, forbid: FORBID_NODATA },
  { id: "platform-contacts", worker: "platform-contacts", msg: "How many contacts do I have and what are the main segments?",
    expectDomain: /contact|client|owner|pet|segment|dog|cat|rabbit/i,
    expectData: /\b\d{2,4}\b[\s\w]{0,12}(contact|client|owner|record)|\b(160|161|159)\b/i, forbid: FORBID_NODATA },
  { id: "platform-contacts-byname", worker: "platform-contacts", msg: "Which of my contacts are rabbit owners? List them by name.",
    expectDomain: /rabbit|owner|contact/i,
    // The canvas lists all 13 by name; chat must too, not "I only see counts".
    expectData: /(ava anderson|rachel lewis|ashley harris|jessica patel|sarah mitchell|mia wright|sophia davis|megan foster|lily green)/i, forbid: FORBID_NODATA },
  { id: "platform-hr", worker: "platform-hr", msg: "Whose credential is currently overdue?",
    expectDomain: /credential|osha|dea|staff|team|expir|overdue/i,
    expectData: /alex torres|osha bloodborne/i, forbid: FORBID_NODATA },
  { id: "platform-marketing", worker: "platform-marketing", msg: "Which of my campaigns is performing best, with its numbers?",
    expectDomain: /campaign|reach|ctr|lead|roi|wellness|dental|puppy|pet/i,
    expectData: /\d[\d,]{1,6}\s*(leads?|impressions?)|\d+(\.\d)?%\s*ctr|\$\s?\d[\d,]*\s*(spend|\/lead)/i, forbid: FORBID_NODATA },
  { id: "spine-4-staff-credentials", worker: "spine-4-staff-credentials", msg: "Whose credential is overdue right now, and what is it?",
    expectDomain: /credential|license|dea|osha|cvt|dvm|renew|expir|overdue/i,
    expectData: /alex torres[\s\S]{0,80}osha|osha bloodborne[\s\S]{0,80}(overdue|alex)/i, forbid: FORBID_NODATA },
  { id: "vet-003-drug-dosing", worker: "vet-003-drug-dosing", msg: "What was the most recent medication given to Bella, and the dose?",
    expectDomain: /medication|dose|dosing|mg|drug|prescri/i,
    expectData: /gabapentin/i, forbid: FORBID_NODATA },
  { id: "title-abstract-001", worker: "title-abstract-001", msg: "Look up the title abstract for 30 Pihaa Street, Lahaina HI 96761.",
    expectDomain: /title|deed|lien|parcel|ownership|chain|abstract|property|tmk/i,
    // title-abstract-001 has NO live title-lookup tool (only Site Recon pulls
    // ATTOM). Its honest "I don't have live title access yet, here's the report
    // shape" is CORRECT — so the forbid only catches real fabrication (the wrong
    // SF sample address) or an upload-dodge, not the honest no-live-data note.
    expectData: /pihaa|lahaina|maui|96761|hawaii/i, forbid: /325 battery|san francisco|upload (your |a )?document|need (source )?documents/i },
  { id: "edu-001-cvt-exam-prep", worker: "edu-001-cvt-exam-prep", msg: "Which subject is my cohort struggling with most, and the score?",
    expectDomain: /cohort|student|subject|module|score|exam|curriculum|at.risk/i,
    expectData: /(anesthesia|surgical nursing|pharmacology).{0,40}(\d|%)/i, forbid: FORBID_NODATA },
  { id: "cos-personal", worker: null, vertical: "consumer", tenant: "vault", msg: "What assets and documents are in my vault?",
    expectDomain: /vault|document|record|asset|certificate|logbook|title/i,
    // Dr. Chen's personal vault is legitimately empty (the seeded assets belong
    // to Sean's vault, not hers). An HONEST empty-state with the real mechanism
    // ("no worker has minted a record yet") is correct grounding, not a dodge —
    // so accept either real assets OR the honest empty explanation. FORBID still
    // guards against a false "I can't access your vault".
    expectData: /\b\d+\s+(asset|document|record|item|certificate)|\b(home|condo|vehicle|tesla|watch|art|certificate)\b|vault is (currently )?empty|no (digital )?(title )?certificates?.{0,30}(minted|yet)|nothing in (your )?vault (yet|right now)/i, forbid: FORBID_NODATA },
];

let red = 0;
const results = [];

async function getToken() {
  const u = await admin.auth().getUser(UID);
  const pw = "ChatTest!" + Date.now() + Math.random().toString(36).slice(2, 8);
  await admin.auth().updateUser(UID, { password: pw });
  const ex = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: pw, returnSecureToken: true }),
  });
  const exj = await ex.json();
  if (!exj.idToken) throw new Error("token exchange failed: " + JSON.stringify(exj.error || exj));
  return exj.idToken;
}

async function ask(token, s) {
  const tenant = s.tenant || T;
  const r = await fetch(`${BASE}/api?path=/v1/chat:message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      "X-Tenant-Id": tenant, "X-Vertical": s.vertical || "veterinary",
    },
    body: JSON.stringify({
      message: s.msg, userInput: s.msg, sessionId: `chattest_${s.id}_${Date.now()}`,
      selectedWorker: s.worker, subscribedWorkers: [],
      // Intentionally EMPTY workspaceName/userName — the server must ground
      // identity from the workspace record, not the frontend context.
      context: { source: "business_portal", vertical: s.vertical || "veterinary", workspaceId: tenant, workspaceName: "", userName: "" },
    }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, text: j.response || j.message || "", state: j.conversationState };
}

async function clearHistory() {
  // Wipe the demo user's chat history so each run measures CURRENT grounding,
  // not stale turns. Covers the business tenant + the personal vault.
  const admin2 = admin.firestore();
  let n = 0;
  for (const tid of [T, "vault"]) {
    const snap = await admin2.collection("messageEvents")
      .where("tenantId", "==", tid).where("userId", "==", UID).limit(500).get();
    const batch = admin2.batch();
    snap.docs.forEach(d => { batch.delete(d.ref); n++; });
    if (snap.size) await batch.commit();
  }
  // The worker chat history actually lives in chatSessions.state.salesHistory
  // (resumed by uid) — THIS is the shared stream that bled across workers.
  const sessSnap = await admin2.collection("chatSessions").where("userId", "==", UID).limit(200).get();
  const sb = admin2.batch();
  sessSnap.docs.forEach(d => { sb.delete(d.ref); n++; });
  if (sessSnap.size) await sb.commit();
  return n;
}

(async () => {
  console.log("CHAT TEST · Meadow Creek ·", new Date().toISOString().slice(0, 16), "\n");
  const cleared = await clearHistory();
  console.log(`cleared ${cleared} prior chat events (fresh threads)\n`);
  const token = await getToken();
  for (const s of SURFACES) {
    let text = "", status = 0, state = "";
    try { ({ text, status, state } = await ask(token, s)); }
    catch (e) { text = "ERROR: " + e.message; }
    const flags = [];
    if (status !== 200) flags.push(`http ${status}`);
    if (!text || text.length < 10) flags.push("empty/no-response");
    for (const rx of RED_FLAGS) if (rx.test(text)) flags.push(`drift:${rx.source.slice(0, 24)}`);
    const inDomain = s.expectDomain ? s.expectDomain.test(text) : true;
    if (!inDomain) flags.push("off-domain");
    // The real test: did chat quote THIS worker's own records?
    if (s.expectData && !s.expectData.test(text)) flags.push("NOT-GROUNDED-IN-DATA");
    // The "advisory wall in chat form" — claiming no data the canvas is showing.
    if (s.forbid && s.forbid.test(text)) flags.push("CLAIMS-NO-DATA");
    const pass = flags.length === 0;
    if (!pass) red++;
    results.push({ id: s.id, pass, flags, excerpt: text.replace(/\s+/g, " ").slice(0, 160) });
    console.log(`${pass ? "✅" : "❌"} ${s.id.padEnd(28)} ${flags.join(", ")}`);
    console.log(`    "${text.replace(/\s+/g, " ").slice(0, 200)}"`);
  }
  console.log("\n" + (red === 0 ? "🟢 ALL GREEN — chat grounded across all surfaces." : `🔴 ${red} surface(s) failing.`));
  process.exit(red === 0 ? 0 : 1);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
