import React, { useState } from 'react';

const VERTICALS = [
  {
    id: 'auto',
    label: 'Auto Dealer',
    icon: '\u{1F697}',
    description: 'Manage inventory, sales, service, and compliance',
    cosManages: [
      'Vehicle inventory and aging alerts',
      'Customer outreach and lead gen',
      'F&I product recommendations',
      'Service scheduling and upsells',
    ],
  },
  {
    id: 'analyst',
    label: 'Investment Analyst',
    icon: '\u{1F4CA}',
    description: 'Analyze deals, portfolio, and risk',
    cosManages: [
      'Deal screening and analysis',
      'Portfolio risk monitoring',
      'Due diligence workflows',
      'Investment memo generation',
    ],
  },
  {
    id: 'real-estate',
    label: 'Real Estate',
    icon: '\u{1F3E0}',
    description: 'Manage listings, tenants, and closings',
    cosManages: [
      'Property listings and showings',
      'Tenant management and leases',
      'Maintenance requests',
      'Closing coordination',
    ],
  },
  {
    id: 'aviation',
    label: 'Aviation',
    icon: '\u2708\uFE0F',
    description: 'Track aircraft, flights, and certifications',
    cosManages: [
      'Aircraft records and maintenance',
      'Flight hour tracking',
      'Certification management',
      'Compliance documentation',
    ],
  },
];

const JURISDICTIONS = [
  { code: 'IL', label: 'Illinois' },
  { code: 'FL', label: 'Florida' },
  { code: 'CA', label: 'California' },
  { code: 'TX', label: 'Texas' },
];

export default function AddWorkspaceWizard({ existingWorkspaces, onCreated, onCancel }) {
  const [step, setStep] = useState(1);
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const verticalInfo = VERTICALS.find(v => v.id === selectedVertical);

  function handleSelectVertical(id) {
    setSelectedVertical(id);
    setStep(2);
  }

  function handleDetailsNext() {
    if (!name.trim()) {
      setError('Business name is required');
      return;
    }
    if (!jurisdiction) {
      setError('Please select a state');
      return;
    }

    const duplicate = existingWorkspaces.find(
      w => w.vertical === selectedVertical && w.jurisdiction === jurisdiction
    );
    if (duplicate) {
      setError(`You already have a ${verticalInfo.label} workspace for ${jurisdiction}`);
      return;
    }

    setError(null);
    setStep(3);
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const token = localStorage.getItem('ID_TOKEN');
      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
      const resp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vertical: selectedVertical,
          name: name.trim(),
          tagline: tagline.trim(),
          jurisdiction,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        onCreated(data.workspace);
      } else {
        setError(data.error || 'Failed to create workspace');
        setCreating(false);
      }
    } catch (e) {
      console.error('Create workspace failed:', e);
      setError('Failed to create workspace');
      setCreating(false);
    }
  }

  const jurisdictionLabel = JURISDICTIONS.find(j => j.code === jurisdiction)?.label || jurisdiction;

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
      <div style={{ maxWidth: 640, width: '100%' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>TitleApp AI</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Add a Business Workspace</div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '6px 16px',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: 14,
            }}
          >
            Cancel
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? '#7c3aed' : '#e2e8f0',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step 1: Choose vertical */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
              What kind of business are you running?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {VERTICALS.map(v => (
                <div
                  key={v.id}
                  onClick={() => handleSelectVertical(v.id)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    background: 'white',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#7c3aed';
                    e.currentTarget.style.background = '#faf5ff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{v.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                    {v.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{v.description}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 13 }}>
              $9/month per workspace &middot; 14-day free trial &middot; Cancel anytime
            </div>
          </div>
        )}

        {/* Step 2: Business details */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
              Tell us about your business
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Demo Motors"
                  maxLength={200}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Tagline (optional)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="Toyota Dealership \u2014 Houston, TX"
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  What state do you operate in?
                </label>
                <select
                  value={jurisdiction}
                  onChange={e => setJurisdiction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    background: 'white',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select a state</option>
                  {JURISDICTIONS.map(j => (
                    <option key={j.code} value={j.code}>
                      {j.label}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                  This determines your compliance rules and tax structure
                </div>
              </div>

              {error && (
                <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setStep(1); setError(null); }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Back
              </button>
              <button
                onClick={handleDetailsNext}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#7c3aed',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm + Start Trial */}
        {step === 3 && verticalInfo && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
              Ready to launch?
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{verticalInfo.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>{name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {verticalInfo.label} &middot; {jurisdictionLabel}
                  </div>
                </div>
              </div>

              {tagline && (
                <div style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>{tagline}</div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Your AI Chief of Staff will manage:
                </div>
                {verticalInfo.cosManages.map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#475569', padding: '3px 0', paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0 }}>&bull;</span>
                    {item}
                    {i === verticalInfo.cosManages.length - 1 && jurisdiction
                      ? ` (${jurisdiction} rules)`
                      : ''}
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#64748b',
                }}
              >
                14-day free trial, then $9/month
              </div>

              {error && (
                <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setStep(2); setError(null); }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: creating ? '#a78bfa' : '#7c3aed',
                  color: 'white',
                  cursor: creating ? 'default' : 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {creating ? 'Creating...' : 'Start Free Trial'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
