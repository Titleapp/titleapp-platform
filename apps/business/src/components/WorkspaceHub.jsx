import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
const VERTICAL_ABBREVS = {
  consumer: 'PV',
  analyst: 'IA',
  auto: 'AD',
  'real-estate': 'RE',
  aviation: 'AV',
};

function daysLeft(trialEndsAt) {
  if (!trialEndsAt) return 14;
  const end = trialEndsAt.toDate ? trialEndsAt.toDate()
    : trialEndsAt._seconds ? new Date(trialEndsAt._seconds * 1000)
    : new Date(trialEndsAt);
  if (isNaN(end.getTime())) return 14;
  const diff = end - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function WorkspaceCard({ workspace, onLaunch }) {
  const [hovered, setHovered] = useState(false);

  const statusBadge = {
    active: {
      label: workspace.monthlyPrice === 0 ? 'FREE' : `$${workspace.monthlyPrice / 100}/mo`,
      color: '#16a34a',
    },
    trial: {
      label: `Trial \u00B7 ${daysLeft(workspace.trialEndsAt)} days left`,
      color: '#d97706',
    },
    suspended: { label: 'Suspended', color: '#dc2626' },
  }[workspace.status] || { label: workspace.status, color: '#6b7280' };

  const abbrev = VERTICAL_ABBREVS[workspace.vertical] || workspace.vertical?.slice(0, 2).toUpperCase() || '??';

  return (
    <div
      style={{
        border: hovered ? '1px solid #7c3aed' : '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: hovered ? '#faf5ff' : 'white',
        minWidth: 180,
        flex: '1 1 180px',
        maxWidth: 240,
      }}
      onClick={() => onLaunch(workspace)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 8, backgroundColor: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8,
        letterSpacing: 1,
      }}>{abbrev}</div>
      <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>{workspace.name}</div>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12, minHeight: 18 }}>
        {workspace.tagline || ''}
      </div>
      <div
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: statusBadge.color + '15',
          color: statusBadge.color,
        }}
      >
        {statusBadge.label}
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          style={{
            width: '100%',
            padding: '8px 0',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Launch &rarr;
        </button>
      </div>
    </div>
  );
}

function BillingSummary({ workspaces }) {
  const billable = workspaces.filter(w => w.status === 'active' && w.monthlyPrice > 0);
  const total = billable.reduce((sum, w) => sum + w.monthlyPrice, 0);

  return (
    <div style={{ marginTop: 32, padding: 20, backgroundColor: '#f8fafc', borderRadius: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>Monthly Summary</div>
      {workspaces.map(w => (
        <div
          key={w.id}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}
        >
          <span style={{ color: '#334155' }}>{w.name}</span>
          <span style={{ color: '#64748b' }}>
            {w.monthlyPrice === 0
              ? 'FREE'
              : w.status === 'trial'
                ? `Trial (${daysLeft(w.trialEndsAt)} days)`
                : `$${w.monthlyPrice / 100}/mo`}
          </span>
        </div>
      ))}
      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          marginTop: 8,
          paddingTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        <span style={{ color: '#1e293b' }}>Total</span>
        <span style={{ color: '#1e293b' }}>${total / 100}/mo</span>
      </div>
    </div>
  );
}

export default function WorkspaceHub({ userName, onLaunch, onBuilderStart, onAdminLaunch, onAddWorker }) {
  const [workspaces, setWorkspaces] = useState(null);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        getDoc(doc(db, 'admins', user.uid))
          .then(snap => {
            console.log('[AdminCheck] uid:', user.uid, 'exists:', snap.exists());
            if (snap.exists()) setIsAdmin(true);
          })
          .catch(err => {
            console.warn('[AdminCheck] Firestore read failed:', err.message);
            // Firestore rules may block — try hardcoded UID fallback
            const ADMIN_UIDS = ['4WHjuUgEseQfBr0Tg92YXXhu6Mj1', 'fPlJ76VM5kQaEtxlMVifVlzeOmq1'];
            if (ADMIN_UIDS.includes(user.uid)) setIsAdmin(true);
          });
      }
    });
    return () => unsub();
  }, []);

  async function loadWorkspaces() {
    try {
      const token = localStorage.getItem('ID_TOKEN');
      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
      const resp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.ok) {
        setWorkspaces(data.workspaces);
      } else {
        setError(data.error || 'Failed to load workspaces');
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e);
      setError('Failed to load workspaces');
    }
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  function handleLaunch(workspace) {
    localStorage.setItem('VERTICAL', workspace.vertical);
    localStorage.setItem('WORKSPACE_ID', workspace.id);
    localStorage.setItem('WORKSPACE_NAME', workspace.name);
    localStorage.setItem('COMPANY_NAME', workspace.name);
    localStorage.setItem('TENANT_NAME', workspace.name);

    if (workspace.jurisdiction) {
      localStorage.setItem('JURISDICTION', workspace.jurisdiction);
    } else {
      localStorage.removeItem('JURISDICTION');
    }

    if (workspace.cosConfig) {
      localStorage.setItem('COS_CONFIG', JSON.stringify(workspace.cosConfig));
    }

    onLaunch(workspace);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>
            TitleApp AI
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
            {userName ? `Welcome back, ${userName}` : 'Welcome back'}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            Your Workspaces
          </div>

          {workspaces === null && !error && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</div>
          )}

          {error && (
            <div style={{ textAlign: 'center', color: '#dc2626', padding: 40 }}>{error}</div>
          )}

          {workspaces && (() => {
            const personal = workspaces.filter(w => w.type === 'personal' || w.id === 'vault');
            const org = workspaces.filter(w => (w.type === 'org' || (!w.type && w.id !== 'vault')) && w.type !== 'shared');
            const shared = workspaces.filter(w => w.type === 'shared');

            return (
              <>
                {personal.length > 0 && (
                  <>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase',
                      letterSpacing: 1, marginBottom: 12,
                    }}>Personal</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                      {personal.map(w => (
                        <WorkspaceCard key={w.id} workspace={w} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </>
                )}

                {org.length > 0 && (
                  <>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase',
                      letterSpacing: 1, marginBottom: 12,
                    }}>Your Workspaces</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                      {org.map(w => (
                        <WorkspaceCard key={w.id} workspace={w} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </>
                )}

                {shared.length > 0 && (
                  <>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase',
                      letterSpacing: 1, marginBottom: 12,
                    }}>Shared With You</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                      {shared.map(w => (
                        <div key={w.id} style={{ flex: '1 1 180px', maxWidth: 240 }}>
                          <WorkspaceCard workspace={w} onLaunch={handleLaunch} />
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, paddingLeft: 4 }}>
                            From {w.senderOrgName || 'Unknown'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            );
          })()}

          {/* Investor Data Room card — show if any workspace is investor vertical */}
          {workspaces && workspaces.some(w => w.vertical === 'investor' || w.vertical === 'Investor') && (
            <div style={{ marginTop: 16 }}>
              <div
                onClick={() => { window.location.href = '/invest/room'; }}
                style={{
                  border: '1px solid #5b21b6',
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#a78bfa'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#5b21b6'; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8, backgroundColor: '#7c3aed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1,
                  flexShrink: 0,
                }}>DR</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#e2e8f0' }}>Investor Data Room</div>
                  <div style={{ color: '#a5b4fc', fontSize: 13 }}>Investment documents, governance, and portfolio</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#a78bfa', fontWeight: 600, fontSize: 14 }}>&rarr;</div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 16 }}>
              <div
                onClick={() => { if (onAdminLaunch) onAdminLaunch(); }}
                style={{
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8, backgroundColor: '#7c3aed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1,
                  flexShrink: 0,
                }}>CC</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#e2e8f0' }}>Command Center</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Admin operations, analytics, pipeline</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#7c3aed', fontWeight: 600, fontSize: 14 }}>&rarr;</div>
              </div>
            </div>
          )}
        </div>

        <div
          onClick={() => onAddWorker ? onAddWorker() : (window.location.href = "/workers")}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            padding: '20px 24px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s',
            marginBottom: 8,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#7c3aed';
            e.currentTarget.style.background = '#faf5ff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>
            + Add a Business Workspace
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            $9/month per workspace &middot; 14-day trial
          </div>
        </div>

        {workspaces && workspaces.length > 0 && <BillingSummary workspaces={workspaces} />}
      </div>
    </div>
  );
}
