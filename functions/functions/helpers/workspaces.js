const admin = require('firebase-admin');

function getDb() {
  return admin.firestore();
}

const PERSONAL_VAULT = {
  id: 'vault',
  vertical: 'consumer',
  name: 'Personal Vault',
  tagline: 'Your digital life, organized',
  status: 'active',
  plan: 'free',
  monthlyPrice: 0,
  isDefault: true,
};

async function getUserWorkspaces(userId) {
  // Simple get — no composite index needed. Max 10 business workspaces per user.
  const snap = await getDb().collection('users').doc(userId)
    .collection('workspaces')
    .get();

  const workspaces = [PERSONAL_VAULT];
  snap.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    if (data.status === 'active' || data.status === 'trial') {
      workspaces.push(data);
    }
  });

  // Sort by creation time (Personal Vault stays first)
  workspaces.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?._seconds ? a.createdAt._seconds * 1000 : 0);
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?._seconds ? b.createdAt._seconds * 1000 : 0);
    return aTime - bTime;
  });

  return workspaces;
}

async function createWorkspace(userId, { vertical, name, tagline, jurisdiction, onboardingComplete }) {
  const id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const workspace = {
    id,
    vertical,
    name,
    tagline: tagline || '',
    jurisdiction: jurisdiction || null,
    status: 'trial',
    plan: 'business',
    monthlyPrice: 900,
    onboardingComplete: onboardingComplete === true ? true : false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    billingId: null,
    cosConfig: { name: 'Alex', personality: 'professional' },
    config: {},
  };

  const batch = getDb().batch();

  // Create the workspace doc
  batch.set(
    getDb().collection('users').doc(userId).collection('workspaces').doc(id),
    workspace
  );

  // Create matching membership so tenant gate passes
  batch.set(
    getDb().collection('memberships').doc(),
    {
      userId,
      tenantId: id,
      role: 'admin',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  );

  await batch.commit();

  return workspace;
}

async function getWorkspace(userId, workspaceId) {
  if (workspaceId === 'vault') return PERSONAL_VAULT;
  const doc = await getDb().collection('users').doc(userId)
    .collection('workspaces').doc(workspaceId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

module.exports = { getUserWorkspaces, createWorkspace, getWorkspace, PERSONAL_VAULT };
