// Seed Meadow Creek's client book (pet owners) into DEMO SPACE contacts.
// ~160 clients so the Contacts (Salesforce) canvas shows a real number + list.
// Idempotent: clears prior demo:true contacts first.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TENANT = "ws_1781920656122_tl9dhn";

const FIRST = ["Sarah","James","Maria","David","Emily","Michael","Jessica","Daniel","Ashley","Chris","Amanda","Ryan","Nicole","Kevin","Rachel","Brandon","Megan","Justin","Lauren","Tyler","Hannah","Aaron","Olivia","Eric","Sophia","Nathan","Grace","Adam","Chloe","Sean","Ava","Luke","Mia","Ian","Zoe","Cole","Ruby","Owen","Lily","Max"];
const LAST = ["Mitchell","Nguyen","Patel","Johnson","Garcia","Brown","Lee","Martinez","Davis","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","White","Harris","Clark","Lewis","Walker","Hall","Allen","Young","King","Wright","Scott","Green","Adams","Baker","Hill","Reyes","Cruz","Foster","Bennett","Murphy","Rivera","Cook","Bell","Ward","Cooper"];
const PETS = [
  ["Dog","Bella"],["Dog","Max"],["Cat","Luna"],["Dog","Charlie"],["Cat","Oliver"],["Dog","Cooper"],
  ["Rabbit","Clover"],["Dog","Daisy"],["Cat","Milo"],["Bird","Kiwi"],["Dog","Rocky"],["Cat","Simba"],
  ["Reptile","Spike"],["Dog","Lucy"],["Cat","Nala"],["Dog","Bailey"],["Rabbit","Pepper"],["Dog","Buddy"],
  ["Cat","Cleo"],["Bird","Sunny"],["Dog","Zeus"],["Cat","Shadow"],["Dog","Sadie"],["Reptile","Rex"],
];

(async () => {
  const prior = await db.collection("contacts").where("tenantId","==",TENANT).where("demo","==",true).get();
  let b = db.batch(), n = 0;
  prior.forEach(doc => { b.delete(doc.ref); if (++n % 400 === 0) {} });
  if (!prior.empty) { await b.commit(); console.log(`cleared ${prior.size} demo contacts`); }

  const TOTAL = 160;
  // ~16 "new this month" (June 2026), rest spread over the past ~2 years.
  let batch = db.batch(), count = 0, newThisMonth = 0;
  for (let i = 0; i < TOTAL; i++) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7) % LAST.length];
    const [species, petName] = PETS[i % PETS.length];
    const isNew = i < 16;
    if (isNew) newThisMonth++;
    const created = isNew
      ? new Date(Date.UTC(2026, 5, 2 + (i % 17)))           // June 2026
      : new Date(Date.UTC(2024 + (i % 2), (i * 5) % 12, 1 + (i % 27)));
    batch.set(db.collection("contacts").doc(), {
      tenantId: TENANT, demo: true, schema_version: "spine_v2.1", status: "active",
      name: `${first} ${last}`, first_name: first, last_name: last,
      email: `${first}.${last}@example.com`.toLowerCase(),
      phone: `(555) ${String(200 + i).padStart(3,"0")}-${String(1000 + i*3 % 9000).padStart(4,"0")}`,
      company: null, title: `${species} owner`,
      species, petInfo: `${species} · ${petName}`,
      segments: ["clients", species.toLowerCase() + "-owners", ...(isNew ? ["new-this-month"] : [])],
      type: "customer", personas: [], tiers_index: {},
      createdAt: created, source: "demo-seed",
    });
    if (++count % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();
  console.log(`✓ seeded ${TOTAL} Meadow Creek clients (${newThisMonth} new this month)`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
