import React, { useState } from 'react';

const VERTICAL_ABBREVS = {
  auto: 'AD',
  analyst: 'IA',
  'real-estate': 'RE',
  aviation: 'AV',
  investor: 'IR',
  builder: 'AI',
};

const VERTICALS = [
  {
    id: 'auto',
    label: 'Auto Dealer',
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
    description: 'Track aircraft, flights, and certifications',
    cosManages: [
      'Aircraft records and maintenance',
      'Flight hour tracking',
      'Certification management',
      'Compliance documentation',
    ],
  },
  {
    id: 'investor',
    label: 'Investor Relations',
    description: 'Manage fundraise, cap table, and investor communications',
    cosManages: [
      'Data room and document management',
      'Cap table and ownership tracking',
      'Investor pipeline and communications',
      'Compliance and RegCF filing assistance',
    ],
  },
  {
    id: 'builder',
    label: 'Build an AI Service',
    description: 'Turn your expertise into a subscribable AI product',
    cosManages: [
      'Conversational interview to extract your workflow',
      'Auto-generated AI Worker from your expertise',
      'Pricing and subscriber management',
      'Publish to the Marketplace',
    ],
  },
];

const VERTICAL_PLACEHOLDERS = {
  auto: {
    name: 'Demo Motors',
    tagline: 'Toyota Dealership — Houston, TX',
    stateLabel: 'What state do you operate in?',
    stateHelp: 'This determines your compliance rules and tax structure',
  },
  'real-estate': {
    name: 'Sunrise Realty',
    tagline: 'Full-service brokerage — Miami, FL',
    stateLabel: 'What state do you operate in?',
    stateHelp: 'This determines your compliance rules and commission structure',
  },
  analyst: {
    name: 'Verbier Capital',
    tagline: 'Growth equity & venture analysis',
    stateLabel: 'Where is your firm based?',
    stateHelp: 'This determines your regulatory framework',
  },
  aviation: {
    name: 'SkyOps Aviation',
    tagline: 'Part 135 Charter Operations',
    stateLabel: 'Where is your primary base?',
    stateHelp: 'This determines your FSDO jurisdiction',
  },
  investor: {
    name: 'Acme Ventures',
    tagline: 'Series A fundraise',
    stateLabel: 'Where is your company incorporated?',
    stateHelp: 'This determines your securities regulation framework',
  },
};

const JURISDICTIONS = [
  { code: 'IL', label: 'Illinois' },
  { code: 'FL', label: 'Florida' },
  { code: 'CA', label: 'California' },
  { code: 'TX', label: 'Texas' },
];

const SAMPLE_WORKERS = {
  auto: [
    { id: 'auto-inventory', name: 'Inventory Manager', price: 29, description: 'Track vehicles, aging alerts, pricing' },
    { id: 'auto-sales', name: 'Sales Assistant', price: 29, description: 'Lead gen, customer outreach, follow-ups' },
    { id: 'auto-fi', name: 'F&I Advisor', price: 49, description: 'Product recommendations, compliance' },
    { id: 'auto-service', name: 'Service Scheduler', price: 29, description: 'Appointments, upsells, customer retention' },
  ],
  analyst: [
    { id: 'cre-analyst', name: 'CRE Deal Analyst', price: 49, description: 'Deal screening and underwriting' },
    { id: 'title-escrow', name: 'Title & Escrow', price: 29, description: 'Title search and closing coordination' },
    { id: 'mortgage-broker', name: 'Mortgage Broker', price: 29, description: 'Loan structuring and rate analysis' },
    { id: 'environmental', name: 'Environmental Review', price: 29, description: 'Phase I/II assessment tracking' },
  ],
  'real-estate': [
    { id: 're-listings', name: 'Listing Agent', price: 29, description: 'MLS management, showings, offers' },
    { id: 're-transactions', name: 'Transaction Coordinator', price: 29, description: 'Closing workflows, document tracking' },
    { id: 're-property-mgmt', name: 'Property Manager', price: 49, description: 'Tenant management, maintenance, leases' },
    { id: 're-marketing', name: 'Marketing Manager', price: 29, description: 'Property marketing and lead gen' },
  ],
  investor: [
    { id: 'ir-worker', name: 'Investor Relations', price: 49, description: 'Data room, investor pipeline, comms' },
    { id: 'cap-table', name: 'Cap Table Manager', price: 29, description: 'Ownership tracking, dilution modeling' },
    { id: 'compliance', name: 'Compliance Tracker', price: 29, description: 'RegCF filing, SEC requirements' },
  ],
  aviation: [
    { id: 'aircraft-records', name: 'Aircraft Records', price: 49, description: 'Maintenance tracking, AD compliance' },
    { id: 'flight-ops', name: 'Flight Operations', price: 29, description: 'Scheduling, crew management' },
    { id: 'certification', name: 'Certification Manager', price: 29, description: 'Pilot certs, type ratings, medicals' },
  ],
};

export default function AddWorkspaceWizard({ existingWorkspaces, onCreated, onCancel, onBuilderStart }) {
  const [step, setStep] = useState(0);
  const [wsType, setWsType] = useState(null);
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const verticalInfo = VERTICALS.find(v => v.id === selectedVertical);
  const hasPersonal = existingWorkspaces.some(w => w.type === 'personal' || w.id === 'vault');
  const totalSteps = 5;
  const availableWorkers = SAMPLE_WORKERS[selectedVertical] || [];

  function handleTypeSelect(type) {
    setWsType(type);
    if (type === 'personal') {
      setSelectedVertical('consumer');
      setName('Personal Vault');
      setStep(3);
    } else {
      setStep(1);
    }
  }

  function handleSelectVertical(id) {
    if (id === 'builder') {
      if (onBuilderStart) onBuilderStart();
      return;
    }
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
      w => w.vertical === selectedVertical && w.jurisdiction === jurisdiction && w.type !== 'shared'
    );
    if (duplicate) {
      setError(`You already have a ${verticalInfo.label} workspace for ${jurisdiction}`);
      return;
    }

    setError(null);
    setStep(3);
  }

  function toggleWorker(workerId) {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
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
          onboardingComplete: false,
          type: wsType || 'org',
          workerIds: selectedWorkers.length > 0 ? selectedWorkers : undefined,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        localStorage.setItem("PENDING_ONBOARDING", selectedVertical);
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
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? '#7c3aed' : '#e2e8f0',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step 0: What is this workspace for? */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
              What is this workspace for?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                onClick={() => handleTypeSelect('org')}
                style={{
                  border: '1px solid #e2e8f0', borderRadius: 12, padding: 20,
                  cursor: 'pointer', background: 'white', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>
                  My company
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Business tools, team collaboration, client management
                </div>
              </div>
              {!hasPersonal && (
                <div
                  onClick={() => handleTypeSelect('personal')}
                  style={{
                    border: '1px solid #e2e8f0', borderRadius: 12, padding: 20,
                    cursor: 'pointer', background: 'white', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#faf5ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>
                    Personal use
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Personal finance, home projects, personal documents
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                    cursor: creating ? 'wait' : 'pointer',
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
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, backgroundColor: v.id === 'builder' ? '#f3e8ff' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: v.id === 'builder' ? '#7c3aed' : '#475569', marginBottom: 8, margin: '0 auto 8px',
                    letterSpacing: 1,
                  }}>{VERTICAL_ABBREVS[v.id] || v.id.slice(0, 2).toUpperCase()}</div>
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
        {step === 2 && (() => {
          const ph = VERTICAL_PLACEHOLDERS[selectedVertical] || VERTICAL_PLACEHOLDERS.auto;
          return (
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
                  placeholder={ph.name}
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
                  placeholder={ph.tagline}
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
                  {ph.stateLabel}
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
                  {ph.stateHelp}
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
          );
        })()}

        {/* Step 3: Pick your first Digital Workers */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              Pick your first Digital Workers
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Select workers to add to your workspace. You can add more later from the Marketplace.
            </div>

            {/* Chief of Staff unlock indicator */}
            <div style={{
              background: selectedWorkers.length >= 3
                ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                : '#f1f5f9',
              borderRadius: 12, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'all 0.3s',
            }}>
              <span style={{ fontSize: 20 }}>&#x1F916;</span>
              <div>
                <div style={{
                  fontWeight: 600, fontSize: 14,
                  color: selectedWorkers.length >= 3 ? 'white' : '#334155',
                }}>
                  {selectedWorkers.length >= 3 ? 'Alex unlocked' : `Select ${3 - selectedWorkers.length} more to unlock Alex`}
                </div>
                <div style={{
                  fontSize: 12,
                  color: selectedWorkers.length >= 3 ? 'rgba(255,255,255,0.8)' : '#94a3b8',
                }}>
                  Your free Chief of Staff coordinates all your workers
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {availableWorkers.map(w => {
                const isSelected = selectedWorkers.includes(w.id);
                return (
                  <div
                    key={w.id}
                    onClick={() => toggleWorker(w.id)}
                    style={{
                      border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      background: isSelected ? '#faf5ff' : 'white',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{w.name}</div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6,
                        border: isSelected ? 'none' : '1.5px solid #cbd5e1',
                        background: isSelected ? '#7c3aed' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>{w.description}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>${w.price}/mo</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setStep(wsType === 'personal' ? 0 : 2); setError(null); }}
                style={{
                  padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8,
                  background: 'white', cursor: 'pointer', fontSize: 14, color: '#64748b',
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  flex: 1, padding: '10px 20px', border: 'none', borderRadius: 8,
                  background: '#7c3aed', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                {selectedWorkers.length > 0 ? `Continue with ${selectedWorkers.length} worker${selectedWorkers.length > 1 ? 's' : ''}` : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm + Start Trial */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
              Ready to launch?
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, backgroundColor: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#475569', letterSpacing: 1, flexShrink: 0,
                }}>{VERTICAL_ABBREVS[selectedVertical] || (selectedVertical || '').slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>{name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {verticalInfo ? verticalInfo.label : wsType === 'personal' ? 'Personal' : 'Business'}
                    {jurisdiction ? ` \u00B7 ${jurisdictionLabel}` : ''}
                  </div>
                </div>
              </div>

              {tagline && (
                <div style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>{tagline}</div>
              )}

              {verticalInfo && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                    Your AI assistant will manage:
                  </div>
                  {verticalInfo.cosManages.map((item, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#475569', padding: '3px 0', paddingLeft: 16, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>&bull;</span>
                      {item}
                      {i === verticalInfo.cosManages.length - 1 && jurisdiction ? ` (${jurisdiction} rules)` : ''}
                    </div>
                  ))}
                </div>
              )}

              {selectedWorkers.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                    Selected Workers ({selectedWorkers.length}):
                  </div>
                  {selectedWorkers.map(wId => {
                    const w = availableWorkers.find(a => a.id === wId);
                    return w ? (
                      <div key={wId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                        <span style={{ color: '#334155' }}>{w.name}</span>
                        <span style={{ color: '#64748b' }}>${w.price}/mo</span>
                      </div>
                    ) : null;
                  })}
                  {selectedWorkers.length >= 3 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span style={{ color: '#7c3aed', fontWeight: 600 }}>Alex (Chief of Staff)</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>FREE</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#64748b',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>14-day free trial, then</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  ${(900 + selectedWorkers.reduce((sum, wId) => {
                    const w = availableWorkers.find(a => a.id === wId);
                    return sum + (w ? w.price * 100 : 0);
                  }, 0)) / 100}/mo
                </span>
              </div>

              {error && (
                <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setStep(3); setError(null); }}
                style={{
                  padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8,
                  background: 'white', cursor: 'pointer', fontSize: 14, color: '#64748b',
                }}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1, padding: '12px 20px', border: 'none', borderRadius: 8,
                  background: creating ? '#a78bfa' : '#7c3aed',
                  color: 'white', cursor: creating ? 'default' : 'pointer',
                  fontSize: 15, fontWeight: 600,
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
