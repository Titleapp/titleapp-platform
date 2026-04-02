const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'title-app-alpha'
});

const db = admin.firestore();

async function fix() {
  const snap = await db.collection('digitalWorkers')
    .where('vertical', '==', 're_professional')
    .get();

  console.log('Documents found with re_professional:', snap.size);

  if (snap.empty) {
    console.log('Nothing to fix — already clean.');
    process.exit(0);
  }

  const batch = db.batch();
  snap.forEach(doc => {
    console.log('  Updating:', doc.id);
    batch.update(doc.ref, { vertical: 'real-estate-professional' });
  });

  await batch.commit();
  console.log('DONE:', snap.size, 'documents updated');

  // Verify
  const verify = await db.collection('digitalWorkers')
    .where('vertical', '==', 're_professional')
    .get();
  console.log('Remaining re_professional docs:', verify.size, '(should be 0)');
  process.exit(0);
}

fix().catch(err => { console.error('Fatal:', err); process.exit(1); });
