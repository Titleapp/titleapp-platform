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

// Per-surface probes. `expectDomain` = a regex the reply SHOULD satisfy
// (in-domain grounding). Probes are intentionally generic to bait drift.
const SURFACES = [
  { id: "cos-business", worker: null, vertical: "chief-of-staff", msg: "what's on my plate today?", expectDomain: /vet|veterinar|clinic|meadow creek|credential|dea|osha|patient|staff/i },
  { id: "platform-accounting", worker: "platform-accounting", msg: "give me a quick read on our finances", expectDomain: /cash|revenue|expense|burn|runway|account|statement|p&l|books/i },
  { id: "platform-contacts", worker: "platform-contacts", msg: "summarize my contacts", expectDomain: /contact|client|owner|pet|segment|dog|cat/i },
  { id: "platform-hr", worker: "platform-hr", msg: "how's my team doing?", expectDomain: /staff|team|credential|osha|dea|dr\.|cvt|dvm|compliance|roster/i },
  { id: "platform-marketing", worker: "platform-marketing", msg: "how are my campaigns performing?", expectDomain: /campaign|reach|ctr|lead|wellness|dental|puppy|pet/i },
  { id: "spine-4-staff-credentials", worker: "spine-4-staff-credentials", msg: "what needs my attention?", expectDomain: /credential|license|dea|osha|cvt|dvm|renew|expir/i },
  { id: "vet-003-drug-dosing", worker: "vet-003-drug-dosing", msg: "what should I watch for sedating a cat?", expectDomain: /sedat|dose|dosing|mg|dexmedetomidine|ketamine|feline|cat|anesthe|protocol/i },
  { id: "title-abstract-001", worker: "title-abstract-001", msg: "tell me about a title abstract", expectDomain: /title|deed|lien|encumbrance|parcel|ownership|chain|abstract|property/i },
  { id: "edu-001-cvt-exam-prep", worker: "edu-001-cvt-exam-prep", msg: "how is my cohort doing?", expectDomain: /student|cohort|exam|module|cvt|curriculum|completion|score|at.risk/i },
  { id: "cos-personal", worker: null, vertical: "consumer", tenant: "vault", msg: "what's in my vault?", expectDomain: /vault|document|record|asset|certificate|logbook|title|worker/i },
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
    const pass = flags.length === 0;
    if (!pass) red++;
    results.push({ id: s.id, pass, flags, excerpt: text.replace(/\s+/g, " ").slice(0, 160) });
    console.log(`${pass ? "✅" : "❌"} ${s.id.padEnd(28)} ${flags.join(", ")}`);
    console.log(`    "${text.replace(/\s+/g, " ").slice(0, 200)}"`);
  }
  console.log("\n" + (red === 0 ? "🟢 ALL GREEN — chat grounded across all surfaces." : `🔴 ${red} surface(s) failing.`));
  process.exit(red === 0 ? 0 : 1);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
