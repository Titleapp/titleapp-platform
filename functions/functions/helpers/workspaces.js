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
  const snap = await getDb().collection('users').doc(userId)
    .collection('workspaces')
    .where('status', 'in', ['active', 'trial'])
    .orderBy('createdAt', 'asc')
    .get();

  const workspaces = [PERSONAL_VAULT];
  snap.forEach(doc => workspaces.push({ id: doc.id, ...doc.data() }));
  return workspaces;
}

async function createWorkspace(userId, { vertical, name, tagline, jurisdiction }) {
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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    billingId: null,
    cosConfig: { name: 'Alex', personality: 'professional' },
    config: {},
  };

  await getDb().collection('users').doc(userId)
    .collection('workspaces').doc(id).set(workspace);

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
