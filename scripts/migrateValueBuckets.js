// scripts/migrateValueBuckets.js — Populate valueBucket field on marketplace workers
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'title-app-alpha' });
const db = admin.firestore();

const MAKE = /revenue|sales|pricing|deal|lead|profit|earn|roi|quote|invoice|billing|commission|closing|buyer|seller|listing/i;
const SAVE = /cost|automat|efficien|time|overhead|streamlin|reduce|optimize|schedule|dispatch|maintenance|manage|monitor|track/i;
const COMPLY = /complian|regulat|permit|licens|audit|safety|legal|certif|inspection|insurance|faa|osha|frat|currency|endorsement/i;

async function migrate() {
  const collections = ['digitalWorkers', 'raasCatalog'];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    let updated = 0;
    let batches = [db.batch()];
    let batchCount = 0;

    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.valueBucket && d.valueBucket.length > 0) continue;
      const text = `${d.name || ''} ${d.headline || ''} ${d.description || ''} ${d.shortDescription || ''}`;
      const buckets = [];
      if (MAKE.test(text)) buckets.push('make_money');
      if (SAVE.test(text)) buckets.push('save_money');
      if (COMPLY.test(text)) buckets.push('stay_compliant');
      if (buckets.length === 0) buckets.push('save_money');
      batches[batches.length - 1].update(doc.ref, { valueBucket: buckets });
      batchCount++;
      updated++;
      if (batchCount >= 490) {
        batches.push(db.batch());
        batchCount = 0;
      }
    }
    for (const b of batches) {
      await b.commit();
    }
    console.log(`${col}: updated ${updated}/${snap.size} docs`);
  }
  console.log('valueBucket migration complete');
}
migrate().catch(console.error);
