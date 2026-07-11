// Seed 100 buyer contacts + 8 LP contacts + key vendors for the RE demo.
// Collection: contacts with tenantId field.
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

// Generate buyer contacts with realistic segment distribution
const BUYER_FIRST = ["James","Maria","David","Sarah","Michael","Jennifer","Robert","Linda","William","Elizabeth","Charles","Susan","Thomas","Karen","Mark","Nancy","Daniel","Lisa","Paul","Sandra","Andrew","Ashley","Joshua","Kimberly","Kevin","Donna","Brian","Carol","George","Michelle","Edward","Dorothy","Kenneth","Amanda","Ronald","Melissa","Anthony","Deborah","Kevin","Stephanie","Jason","Rebecca","Gary","Laura","Timothy","Helen","Jose","Sharon","Larry","Cynthia","Eric","Kathleen","Aaron","Amy","Frank","Angela","Patrick","Christine","Raymond","Brenda","Jack","Emma","Dennis","Olivia","Jerry","Chloe","Tyler","Madison","Aaron","Victoria","Jose","Samantha","Adam","Alexis","Nathan","Jessica","Peter","Emily","Zachary","Hannah","Harold","Lauren","Carl","Mia","Arthur","Ava","Ryan","Isabella","Roger","Grace","Joe","Sofia","Juan","Lily","Albert","Ella"];
const BUYER_LAST  = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Park","Chen","Kim","Osei","Patel","Singh","Sharma","Ali","Hassan","Osei","Mensah","Diallo","Tremblay","Dubois","Legrand","Schmidt","Mueller","Weber","Fischer","Becker","Koch","Bauer","Richter","Hoffman","Schäfer","Braun","Wagner","Zimmermann","Hartmann","Krueger","Schulz","Lehmann","Weiss","Kowalski","Nowak","Wisniewska","Kubiak","Zielinski","Wojtyla","Kozlowski","Kaminska","Witek","Pawlak","Kowalczyk","Wrobel","Stepien","Adamczyk","Dudek"];
const SEGMENTS = ["luxury-buyer","investor","upgrade","first-time","relocation","broker-referral","new-this-month","returning"];

const segmentFor = (i) => {
  if (i < 15) return ["luxury-buyer","new-this-month"];
  if (i < 30) return ["investor"];
  if (i < 50) return ["upgrade","broker-referral"];
  if (i < 70) return ["relocation"];
  if (i < 85) return ["first-time"];
  return ["returning"];
};

const BUYERS = Array.from({ length: 100 }, (_, i) => {
  const obj = {
    id: `re_buyer_${String(i + 1).padStart(3, "0")}`,
    name: `${BUYER_FIRST[i % BUYER_FIRST.length]} ${BUYER_LAST[i % BUYER_LAST.length]}`,
    email: `${BUYER_FIRST[i % BUYER_FIRST.length].toLowerCase()}.${BUYER_LAST[i % BUYER_LAST.length].toLowerCase()}${i}@email.com`,
    phone: `702-${String(400 + i).padStart(3, "0")}-${String(1000 + (i * 7) % 9000).padStart(4, "0")}`,
    type: "buyer",
    segments: segmentFor(i),
    property: "meridian-flamingo",
    status: i < 10 ? "active" : i < 30 ? "warm" : "cold",
    source: i < 5 ? "open-house" : i < 20 ? "google-ads" : i < 40 ? "broker-referral" : i < 60 ? "instagram" : "organic",
    demo: true,
  };
  if (i < 5) obj.notes = `Attended Unit 1901 open house June 28 — ${i < 2 ? "offer in negotiation" : "follow-up pending"}`;
  return obj;
});

const LP_CONTACTS = [
  { id: "re_lp_c_001", name: "Howard Finch",          email: "howard.finch@finchtrust.com",     type: "investor", segments: ["lp","domain-point"], demo: true },
  { id: "re_lp_c_002", name: "Diana Park",            email: "diana@parkequity.com",            type: "investor", segments: ["lp","domain-point"], demo: true },
  { id: "re_lp_c_003", name: "Robert Simmons",        email: "robert.simmons@simmonsventures.com", type: "investor", segments: ["lp","domain-point"], demo: true },
  { id: "re_lp_c_004", name: "Yusef Osman",           email: "yusef@osmanholdings.com",         type: "investor", segments: ["lp","domain-point"], demo: true },
  { id: "re_lp_c_005", name: "Patricia Liang",        email: "patricia.liang@liangcapital.com", type: "investor", segments: ["lp","domain-point"], demo: true },
  { id: "re_lp_c_006", name: "Marcus Eaton",          email: "meaton@merealassets.com",         type: "investor", segments: ["lp","domain-point","no-response"], demo: true },
  { id: "re_lp_c_007", name: "Sunrise Ridge Partners",email: "ir@sunriseridge.com",             type: "investor", segments: ["lp","domain-point"], demo: true },
  { id: "re_lp_c_008", name: "The Nguyen Group",      email: "partners@nguyengroup.com",        type: "investor", segments: ["lp","domain-point","no-response"], demo: true },
];

const VENDOR_CONTACTS = [
  { id: "re_vnd_001", name: "Westbrook GC",        email: "ops@westbrookgc.com",           type: "vendor", segments: ["contractor","domain-point"], demo: true },
  { id: "re_vnd_002", name: "Rivera & Associates", email: "carlos.rivera@riveraassociates.com", type: "vendor", segments: ["architect","domain-point"], demo: true },
  { id: "re_vnd_003", name: "ACE Plumbing",        email: "dispatch@aceplumbing.com",      type: "vendor", segments: ["vendor","creekwood"], demo: true },
  { id: "re_vnd_004", name: "Cool Air HVAC",       email: "service@coolair.com",           type: "vendor", segments: ["vendor","creekwood"], demo: true },
];

const ALL_CONTACTS = [...BUYERS, ...LP_CONTACTS, ...VENDOR_CONTACTS];

(async () => {
  // Clear existing demo contacts for this tenant
  const existing = await db.collection("contacts")
    .where("tenantId", "==", RE_DEMO_TENANT).where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo contacts`);

  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const c of ALL_CONTACTS) {
    await db.collection("contacts").doc(c.id).set({
      ...c,
      tenantId: RE_DEMO_TENANT,
      ownerUid: RE_DEMO_UID,
      createdAt: now,
    });
  }

  console.log(`✓ Seeded ${BUYERS.length} buyers + ${LP_CONTACTS.length} LPs + ${VENDOR_CONTACTS.length} vendors`);
  console.log(`  Total: ${ALL_CONTACTS.length} contacts`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
