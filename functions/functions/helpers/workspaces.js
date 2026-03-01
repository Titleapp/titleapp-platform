const admin = require('firebase-admin');

function getDb() {
  return admin.firestore();
}

const PERSONAL_VAULT = {
  id: 'vault',
  type: 'personal',
  vertical: 'consumer',
  name: 'Personal Vault',
  tagline: 'Your digital life, organized',
  status: 'active',
  plan: 'free',
  monthlyPrice: 0,
  isDefault: true,
  workerGroups: [],
  activeWorkers: [],
  chiefOfStaff: null,
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

  // Merge shared workspaces (B2B pushed workers)
  const shared = await getSharedWorkspaces(userId);
  workspaces.push(...shared);

  // Sort by creation time (Personal Vault stays first, shared at end)
  workspaces.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    if (a.type === 'shared' && b.type !== 'shared') return 1;
    if (a.type !== 'shared' && b.type === 'shared') return -1;
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?._seconds ? a.createdAt._seconds * 1000 : 0);
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?._seconds ? b.createdAt._seconds * 1000 : 0);
    return aTime - bTime;
  });

  return workspaces;
}

async function getSharedWorkspaces(userId) {
  const snap = await getDb().collection('b2bRecipients')
    .where('recipientUserId', '==', userId)
    .where('status', '==', 'active')
    .get();

  const workspaces = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    workspaces.push({
      id: `shared_${doc.id}`,
      type: 'shared',
      name: data.workerName || 'Shared Worker',
      senderOrgName: data.senderOrgName || 'Unknown',
      senderTenantId: data.senderTenantId,
      deploymentId: data.deploymentId,
      vertical: data.vertical || 'consumer',
      tagline: `From ${data.senderOrgName || 'Unknown'}`,
      status: 'active',
      plan: 'shared',
      monthlyPrice: 0,
      workerIds: data.workerIds || [],
      permissions: data.permissions || {},
      deployedAt: data.deployedAt,
      acceptedAt: data.acceptedAt,
      workerGroups: [],
      activeWorkers: data.workerIds || [],
      chiefOfStaff: null,
    });
  }
  return workspaces;
}

async function createWorkspace(userId, { vertical, name, tagline, jurisdiction, onboardingComplete, type, workerIds }) {
  const id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const workspace = {
    id,
    type: type || 'org',
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
    workerGroups: [],
    activeWorkers: workerIds || [],
    chiefOfStaff: (workerIds && workerIds.length >= 3)
      ? { enabled: true, name: 'Alex', unlockedAt: new Date().toISOString() }
      : null,
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

async function updateWorkspace(userId, workspaceId, updates) {
  if (workspaceId === 'vault') {
    throw new Error('Cannot update Personal Vault');
  }

  const ALLOWED_FIELDS = ['name', 'tagline', 'workerGroups', 'chiefOfStaff', 'config', 'jurisdiction'];
  const filtered = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) {
      filtered[key] = updates[key];
    }
  }

  if (Object.keys(filtered).length === 0) return null;

  filtered.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const ref = getDb().collection('users').doc(userId)
    .collection('workspaces').doc(workspaceId);
  await ref.update(filtered);

  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

async function addWorkerToWorkspace(userId, workspaceId, workerId, groupId) {
  if (workspaceId === 'vault') {
    throw new Error('Cannot modify Personal Vault workers directly');
  }

  const ref = getDb().collection('users').doc(userId)
    .collection('workspaces').doc(workspaceId);

  const doc = await ref.get();
  if (!doc.exists) throw new Error('Workspace not found');

  const data = doc.data();
  const activeWorkers = data.activeWorkers || [];

  // Avoid duplicates
  if (activeWorkers.includes(workerId)) return data;

  const updates = {
    activeWorkers: admin.firestore.FieldValue.arrayUnion(workerId),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // If groupId provided, add worker to that group
  if (groupId && data.workerGroups) {
    const groups = [...data.workerGroups];
    const group = groups.find(g => g.id === groupId);
    if (group && !group.workerIds.includes(workerId)) {
      group.workerIds.push(workerId);
      updates.workerGroups = groups;
    }
  }

  // Auto-enable Chief of Staff at 3+ workers
  const newCount = activeWorkers.length + 1;
  if (newCount >= 3 && !data.chiefOfStaff) {
    updates.chiefOfStaff = {
      enabled: true,
      name: data.cosConfig?.name || 'Alex',
      unlockedAt: new Date().toISOString(),
    };
  }

  await ref.update(updates);

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

async function removeWorkerFromWorkspace(userId, workspaceId, workerId) {
  if (workspaceId === 'vault') {
    throw new Error('Cannot modify Personal Vault workers directly');
  }

  const ref = getDb().collection('users').doc(userId)
    .collection('workspaces').doc(workspaceId);

  const doc = await ref.get();
  if (!doc.exists) throw new Error('Workspace not found');

  const data = doc.data();

  const updates = {
    activeWorkers: admin.firestore.FieldValue.arrayRemove(workerId),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Remove from any groups
  if (data.workerGroups) {
    const groups = data.workerGroups.map(g => ({
      ...g,
      workerIds: g.workerIds.filter(id => id !== workerId),
    }));
    updates.workerGroups = groups;
  }

  // Disable Chief of Staff if dropping below 3
  const remaining = (data.activeWorkers || []).filter(id => id !== workerId);
  if (remaining.length < 3 && data.chiefOfStaff) {
    updates.chiefOfStaff = null;
  }

  await ref.update(updates);
}

async function getWorkspace(userId, workspaceId) {
  if (workspaceId === 'vault') return PERSONAL_VAULT;
  const doc = await getDb().collection('users').doc(userId)
    .collection('workspaces').doc(workspaceId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

module.exports = {
  getUserWorkspaces,
  getSharedWorkspaces,
  createWorkspace,
  updateWorkspace,
  addWorkerToWorkspace,
  removeWorkerFromWorkspace,
  getWorkspace,
  PERSONAL_VAULT,
};
