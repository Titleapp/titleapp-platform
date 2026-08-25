const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'title-app-alpha'
});

const db = admin.firestore();

async function fix() {
  const ref = db.collection('digitalWorkers').doc('platform-marketing');
  const snap = await ref.get();
  if (!snap.exists) { console.log('ERROR: document not found'); process.exit(1); }
  console.log('Current buildStatus:', snap.data().buildStatus);
  await ref.update({ buildStatus: 'live' });
  const confirm = await ref.get();
  console.log('Updated buildStatus:', confirm.data().buildStatus);
  console.log('DONE: platform-marketing is now live');
  process.exit(0);
}

fix().catch(err => { console.error('Fatal:', err); process.exit(1); });
