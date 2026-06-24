const admin = require('firebase-admin');
const { isActive, normalizeLegacyStatus } = require('../config/subscriptionStatus');

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

// The 5 spine workers every OWNED business workspace gets (the owner's toolkit).
// Members/customers do NOT get these — that's the "every nursing student gets the
// department Accounting worker" lock.
const SPINE_WORKERS = ['platform-accounting', 'platform-contacts', 'platform-hr', 'platform-marketing', 'platform-control-center-pro'];
const slugOf = (d) => d.data().workerId || d.data().workerSlug || d.data().slug;
const isPersonalSpace = (ws) => ws.type === 'personal' || ws.id === 'vault';
// The tenant a subscription belongs to. New tenant-scoped subs use
// {ownerType:'tenant', ownerId} (worker:subscribe); some may use tenantId/workspaceId.
// Returns null when the sub is not bound to a business tenant.
const subOwnerTenant = (d) => {
  const x = d.data();
  if (x.ownerType === 'tenant' && x.ownerId) return x.ownerId;
  return x.tenantId || x.workspaceId || null;
};
// A sub belongs in the Personal Vault only if it is EXPLICITLY personal:
// ownerType 'user', or tagged vault/personal. Legacy untagged subs (no ownerType,
// no tenantId) are HELD — shown nowhere — until migrated to the right tenant.
const subIsPersonal = (d) => {
  const x = d.data();
  if (x.ownerType === 'tenant') return false;
  const t = x.tenantId || x.workspaceId;
  if (t && t !== 'vault' && t !== 'personal') return false;
  return x.ownerType === 'user' || t === 'vault' || t === 'personal';
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
      // Workspaces under users/{uid}/workspaces are the ones this user
      // created — they are admin by definition. The Sidebar relies on
      // ws.role === "admin" to surface the invite (+) button; without
      // this field the button was hiding for the workspace's owner.
      if (!data.role) data.role = 'admin';
      workspaces.push(data);
    }
  });

  // Merge subscriptions into workspace activeWorkers — TENANT-SCOPED.
  // A subscription belongs to ONE tenant (its tenantId). We never spray a user's
  // subs across all of their workspaces (that broke persona isolation — every
  // persona showed the same workers, and a member/customer would inherit the
  // owner's spine). Partition:
  //   • Personal Vault  → entitlement + subs NOT assigned to a business tenant (your personal workers).
  //   • Business/org ws  → ONLY subs tagged to THIS tenant; never a user-global union.
  // Untagged legacy subs are HELD as personal (show in the Vault) until they are
  // migrated to the right tenant — nothing is destroyed.
  try {
    const subSnap = await getDb().collection('subscriptions')
      .where('userId', '==', userId)
      .get();
    const activeSubs = subSnap.docs.filter(d => {
      const data = d.data();
      return isActive(data.trialStatus || normalizeLegacyStatus(data.status));
    });

    for (const ws of workspaces) {
      if (ws.type === 'shared') continue;
      let slugs;
      if (isPersonalSpace(ws)) {
        // Vault = explicitly-personal subs only. Legacy untagged subs are HELD
        // (shown nowhere) so business workers (e.g. Fundraise) never pollute it.
        slugs = activeSubs.filter(subIsPersonal).map(slugOf).filter(Boolean);
      } else {
        // Business/org workspace = ONLY subs owned by THIS tenant. Never a union.
        slugs = activeSubs.filter(d => subOwnerTenant(d) === ws.id).map(slugOf).filter(Boolean);
      }
      const merged = new Set([...(ws.activeWorkers || []), ...slugs]);
      // Owner spine-default: an OWNED business workspace is never empty — the
      // owner always gets their spine toolkit. Members/customers do NOT (the lock).
      if (merged.size === 0 && !isPersonalSpace(ws) && (ws.role === 'admin' || ws.role === 'owner')) {
        SPINE_WORKERS.forEach(s => merged.add(s));
      }
      ws.activeWorkers = [...merged];
      if (ws.activeWorkers.length >= 3 && !ws.chiefOfStaff) {
        ws.chiefOfStaff = { enabled: true, name: ws.cosConfig?.name || 'Alex', unlockedAt: new Date().toISOString() };
      }
    }
  } catch (e) {
    console.warn('workspaces: subscription merge failed:', e.message);
  }

  // Merge shared workspaces (B2B pushed workers). Wrapped in try/catch so a
  // shared-workspace lookup failure (missing collection, rules, transient
  // error) cannot 500 the entire /v1/workspaces endpoint — that breaks the
  // signup flow and the user can't even see their Personal Vault.
  try {
    const shared = await getSharedWorkspaces(userId);
    workspaces.push(...shared);
  } catch (e) {
    console.warn('workspaces: shared workspace lookup failed:', e.message);
  }

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
  if (workspaceId === 'vault') {
    // 49.27 fix — merge entitlements + active subscriptions into Personal Vault
    // so workers granted at onboarding (e.g. platform-accounting) are visible.
    const vault = { ...PERSONAL_VAULT, activeWorkers: [...PERSONAL_VAULT.activeWorkers] };
    try {
      const [entSnap, subSnap] = await Promise.all([
        getDb().collection('users').doc(userId).collection('entitlements').get(),
        getDb().collection('subscriptions').where('userId', '==', userId).get(),
      ]);
      const entSlugs = entSnap.docs
        .filter(d => (d.data().status || 'active') === 'active')
        .map(d => d.id);
      const subSlugs = subSnap.docs
        .filter(d => {
          const data = d.data();
          if (!isActive(data.trialStatus || normalizeLegacyStatus(data.status))) return false;
          // Vault = explicitly-personal subs only; legacy untagged held (not shown).
          return subIsPersonal(d);
        })
        .map(d => d.data().workerId || d.data().workerSlug || d.data().slug)
        .filter(Boolean);
      vault.activeWorkers = [...new Set([...entSlugs, ...subSlugs])];
      if (vault.activeWorkers.length >= 3 && !vault.chiefOfStaff) {
        vault.chiefOfStaff = { enabled: true, name: 'Alex', unlockedAt: new Date().toISOString() };
      }
    } catch (e) {
      console.warn('getWorkspace(vault): entitlement merge failed:', e.message);
    }
    return vault;
  }
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
