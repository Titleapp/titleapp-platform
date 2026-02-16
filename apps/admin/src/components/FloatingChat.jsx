import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import './FloatingChat.css';

// ── Session management ──
function getSessionId() {
  let id = sessionStorage.getItem('ta_platform_sid');
  if (!id) {
    id = 'plat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8);
    sessionStorage.setItem('ta_platform_sid', id);
  }
  return id;
}

// ── Card components ──

function CardShell({ gradient, title, subtitle, children }) {
  return (
    <div className="chat-card">
      <div className="chat-card-header" style={{ background: gradient || 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)' }}>
        <h3 className="chat-card-header-title">{title}</h3>
        {subtitle && <p className="chat-card-header-subtitle">{subtitle}</p>}
      </div>
      <div className="chat-card-body">{children}</div>
    </div>
  );
}

function MagicLinkCard({ data, onAction }) {
  return (
    <CardShell title="Your Magic Link">
      <p style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: 500, marginBottom: '1.25rem', textAlign: 'center' }}>Click below to sign in and get started.</p>
      <button className="chat-card-btn-primary" onClick={() => onAction('magic_link_clicked', {}, 'Magic link clicked')} style={{ marginBottom: '1rem' }}>
        Sign In to TitleApp AI &rarr;
      </button>
      <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>We also sent a link to <strong style={{ color: '#64748b' }}>{data.email}</strong> if you'd prefer.</p>
    </CardShell>
  );
}

function TermsCard({ data, onAction }) {
  return (
    <CardShell title="Terms of Service">
      <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        By using TitleApp AI, you agree to our{' '}
        <a href={data.termsUrl} target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>Terms of Service</a>
        {' '}and{' '}
        <a href={data.privacyUrl} target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>Privacy Policy</a>.
      </p>
      <p style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 8 }}>
        {data.summary}
      </p>
      <button className="chat-card-btn-primary" onClick={() => onAction('terms_accepted', {}, 'I agree')}>I Agree</button>
    </CardShell>
  );
}

function WelcomeCard({ data }) {
  return (
    <div className="chat-card">
      <div className="chat-card-header" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h3 className="chat-card-header-title" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Welcome to TitleApp AI, {data.name || 'friend'}.</h3>
        <p className="chat-card-header-subtitle">{data.subtitle}</p>
      </div>
      <div className="chat-card-body">
        <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{data.bodyText}</p>
      </div>
    </div>
  );
}

function OwnershipCard({ data, onAction }) {
  return (
    <CardShell title="Ownership Status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {(data.options || []).map(opt => (
          <button key={opt.value} className="chat-card-btn-option" onClick={() => onAction('ownership_selected', { type: opt.value }, opt.label)}>
            {opt.label}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

function FileUploadCard({ data, onAction }) {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);

  function handleFiles(fileList) {
    setFiles(Array.from(fileList));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <CardShell title={data.title || 'Upload Documents'}>
      <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1rem' }}>{data.description || 'Add your documents'}</p>
      <div
        className="chat-card-dropzone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#f3e8ff'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" multiple accept={data.acceptedTypes || '.pdf,.jpg,.jpeg,.png,.doc,.docx'} style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        <div style={{ color: '#1e293b', fontWeight: 600, marginBottom: '0.25rem' }}>Click to upload or drag files here</div>
        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>PDF, images, Word, Excel, CSV up to 10MB</div>
      </div>
      {files.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: 6, marginBottom: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: '#1a202c', fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{(f.size / 1024).toFixed(1)} KB</div>
              </div>
              <span style={{ color: '#10b981', fontSize: '0.85rem' }}>Ready</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="chat-card-btn-secondary" style={{ flex: 1 }} onClick={() => { onAction('file_upload_skipped', {}, 'Skip for now'); }}>Skip for now</button>
        <button className="chat-card-btn-primary" style={{ flex: 2 }} disabled={files.length === 0} onClick={() => {
          onAction('files_uploaded', { files: files.map(f => ({ name: f.name, size: f.size })) }, files.length + ' file(s) ready to upload');
        }}>Continue</button>
      </div>
    </CardShell>
  );
}

function AttestationCard({ data, onAction }) {
  const gradients = {
    vehicle: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)',
    student: 'linear-gradient(135deg, #1e40af 0%, #4338ca 100%)',
    pilot: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  };
  const gradient = gradients[data.category] || 'linear-gradient(135deg, #334155 0%, #7c3aed 100%)';
  const titles = { vehicle: 'Confirm Ownership', student: 'Confirm Academic Record', pilot: 'Confirm Pilot Credential' };
  const title = titles[data.category] || 'Confirm Credential';
  const btnColor = data.category === 'pilot' ? '#1e3a5f' : '#7c3aed';

  let detailText = '';
  if (data.category === 'vehicle') {
    const mDisplay = data.mileage ? ` · ${data.mileage} mi` : '';
    const lenderLine = data.lender ? ` · ${data.lender}` : '';
    detailText = `${data.vehicleDetails} · VIN: ${data.vin}${mDisplay}${lenderLine}`;
  } else if (data.category === 'student') {
    detailText = `${data.type || 'Record'} -- ${data.school || ''} -- ${data.program || ''} -- ${data.year || ''}`;
  } else if (data.category === 'pilot') {
    detailText = `${data.certName || ''} -- FAA ${data.certNumber || ''}\nIssued: ${data.dateIssued || ''} -- ${data.totalHours || '0'} total hours\nType ratings: ${data.typeRatings || 'None'}`;
  } else {
    const expiryText = data.expiry && data.expiry !== 'Does not expire' ? ` -- Expires: ${data.expiry}` : '';
    detailText = `${data.name || ''} -- ${data.issuer || ''} -- Earned: ${data.dateEarned || ''}${expiryText}`;
  }

  const confirmTexts = {
    vehicle: `I confirm that I am the ${data.ownershipLabel || 'owner'} of this vehicle and the information provided is accurate. This will be permanently recorded.`,
    student: 'I confirm that the following academic record is accurate and belongs to me. This will be permanently recorded.',
    pilot: 'I confirm that the following pilot credential is accurate and belongs to me. This will be permanently recorded.',
  };

  return (
    <CardShell gradient={gradient} title={title}>
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
        <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          {confirmTexts[data.category] || 'I confirm that the following credential is accurate and belongs to me. This will be permanently recorded.'}
        </p>
        <p style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{detailText}</p>
      </div>
      <button className="chat-card-btn-primary" style={{ background: btnColor }} onClick={() => onAction('attestation_confirmed', {}, 'Confirmed')}>I Confirm</button>
    </CardShell>
  );
}

function DtcGridField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#1a202c', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function DtcCard({ data }) {
  const vehicleGradients = {
    black: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    white: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
    silver: 'linear-gradient(135deg, #94a3b8 0%, #64748b 50%, #475569 100%)',
    red: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 50%, #dc2626 100%)',
    blue: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)',
    green: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
    default: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)',
  };

  const categoryGradients = {
    student: 'linear-gradient(135deg, #1e40af 0%, #4338ca 100%)',
    credential: 'linear-gradient(135deg, #334155 0%, #7c3aed 100%)',
    pilot: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  };

  const d = data;
  const gradient = d.category === 'vehicle'
    ? (vehicleGradients[d.colorTheme] || vehicleGradients.default)
    : (categoryGradients[d.category] || vehicleGradients.default);
  const isWhite = d.colorTheme === 'white';
  const textColor = d.category === 'vehicle' && isWhite ? '#1e293b' : 'white';

  const heroTitle = d.category === 'vehicle' ? (((d.make || '') + ' ' + (d.model || '')).trim() || d.vehicleName)
    : d.category === 'student' ? (d.school || 'Institution')
    : d.category === 'pilot' ? d.certName
    : (d.name || 'Credential');

  const heroSub = d.category === 'vehicle' ? `${d.year}${d.trim ? ' -- ' + d.trim : ''}${d.color ? ' -- ' + d.color : ''}`
    : d.category === 'student' ? `${d.program || ''}${d.year ? ' -- ' + d.year : ''}`
    : d.category === 'pilot' ? `FAA ${d.certNumber}`
    : (d.issuer || '');

  const badgeBg = d.category === 'pilot' ? '#dbeafe' : '#ede9fe';
  const badgeColor = d.category === 'pilot' ? '#1e3a5f' : '#7c3aed';

  let fields = [];
  if (d.category === 'vehicle') {
    const mileageNum = Number((d.mileage || '0').replace(/[^0-9]/g, '') || 0).toLocaleString();
    fields = [
      { label: 'Owner', value: d.owner }, { label: 'Mileage', value: `${mileageNum} mi` },
      { label: 'Status', value: d.ownershipStatus }, { label: 'Created', value: d.createdAt },
    ];
  } else if (d.category === 'student') {
    fields = [
      { label: 'Holder', value: d.holder }, { label: 'Year', value: d.year },
      { label: 'School', value: d.school }, { label: 'Created', value: d.createdAt },
    ];
  } else if (d.category === 'pilot') {
    fields = [
      { label: 'Certificate', value: d.certName }, { label: 'Issued', value: d.dateIssued },
      { label: 'Total Hours', value: d.totalHours }, { label: 'Type Ratings', value: d.typeRatings },
    ];
  } else {
    fields = [
      { label: 'Holder', value: d.holder }, { label: 'Earned', value: d.dateEarned },
      { label: 'Issuer', value: d.issuer }, { label: 'Expires', value: d.expiry || 'N/A' },
    ];
  }

  const nameRow = d.category === 'vehicle' ? d.vehicleName
    : d.category === 'student' ? (d.type || 'Academic Record')
    : d.category === 'pilot' ? d.holder
    : (d.type || 'Credential');

  return (
    <div className="chat-card">
      <div className="chat-card-dtc-hero" style={{ background: gradient, textAlign: 'center', padding: '2.5rem 1.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', transform: 'translate(30px, -30px)' }} />
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: textColor, position: 'relative' }}>{heroTitle}</div>
        <div style={{ fontSize: '1rem', color: isWhite ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.75)', marginTop: '0.25rem', position: 'relative' }}>{heroSub}</div>
      </div>
      <div className="chat-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a202c' }}>{nameRow}</div>
          <span style={{ background: badgeBg, color: badgeColor, fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified</span>
        </div>
        {d.category === 'vehicle' && <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '1.25rem' }}>VIN {d.vin}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          {fields.map(f => <DtcGridField key={f.label} label={f.label} value={f.value} />)}
        </div>
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <DtcGridField label="Record" value={<span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>{d.recordId}</span>} />
          <DtcGridField label="Hash" value={<span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>{d.hash}</span>} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
          {d.docCount} document{d.docCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

function VaultCard({ data }) {
  const [detailIdx, setDetailIdx] = useState(null);
  const records = data.records || [];
  const typeGradients = {
    vehicle: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
    student: 'linear-gradient(135deg, #1e40af, #4338ca)',
    credential: 'linear-gradient(135deg, #334155, #7c3aed)',
  };

  if (detailIdx !== null && records[detailIdx]) {
    const r = records[detailIdx];
    const typeLabels = { vehicle: 'Vehicle', student: 'Academic Record', credential: 'Credential' };
    return (
      <div className="chat-card">
        <div className="chat-card-header" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="chat-card-header-title">{r.details}</h3>
              <p className="chat-card-header-subtitle">{typeLabels[r.type] || 'Record'} -- {r.id}</p>
            </div>
            <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 20 }}>VERIFIED</span>
          </div>
        </div>
        <div className="chat-card-body">
          <button onClick={() => setDetailIdx(null)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', padding: 0 }}>&larr; Back to vault</button>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', fontWeight: 600 }}>Logbook</div>
          {(r.logbook || []).length > 0 ? (r.logbook || []).map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', marginTop: '0.4rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{e.entry}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{e.date}{e.time ? ' at ' + e.time : ''}</div>
              </div>
            </div>
          )) : <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No logbook entries yet.</p>}
          {r.documents && r.documents.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', fontWeight: 600 }}>Documents</div>
              {r.documents.map((doc, i) => <div key={i} style={{ fontSize: '0.85rem', color: '#475569', padding: '0.25rem 0' }}>{doc.name}</div>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-card">
      <div className="chat-card-header" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)' }}>
        <h3 className="chat-card-header-title">{data.name || 'Your'}'s Vault</h3>
        <p className="chat-card-header-subtitle">{records.length} record{records.length !== 1 ? 's' : ''} -- {data.totalLogEntries} logbook entr{data.totalLogEntries !== 1 ? 'ies' : 'y'}</p>
      </div>
      <div className="chat-card-body">
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '0.5rem' }}>My Stuff</div>
        {records.length > 0 ? records.map((r, idx) => {
          const isPilot = r.subtype === 'pilot';
          const gradient = isPilot ? 'linear-gradient(135deg, #0f172a, #1e3a5f)' : (typeGradients[r.type] || typeGradients.vehicle);
          const meta = [r.subtitle, r.docCount ? r.docCount + ' doc' + (r.docCount > 1 ? 's' : '') : '', r.logCount ? r.logCount + ' log entr' + (r.logCount > 1 ? 'ies' : 'y') : ''].filter(Boolean).join(' -- ');
          return (
            <div key={idx} onClick={() => setDetailIdx(idx)} className="chat-card-vault-item">
              <div style={{ width: 48, height: 48, borderRadius: 8, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.details}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{meta}</div>
              </div>
              <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 20, flexShrink: 0 }}>VERIFIED</span>
            </div>
          );
        }) : <p style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>Your vault is empty. Want to create your first record?</p>}
      </div>
    </div>
  );
}

function LogbookCard({ data }) {
  return (
    <CardShell title="Logbook" subtitle={`${(data.entries || []).length} entr${(data.entries || []).length !== 1 ? 'ies' : 'y'} across ${data.recordCount} record${data.recordCount !== 1 ? 's' : ''}`}>
      {(data.entries || []).map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', marginTop: '0.4rem', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{e.entry}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{e.recordDetails} -- {e.date}{e.time ? ' at ' + e.time : ''}</div>
          </div>
        </div>
      ))}
    </CardShell>
  );
}

function BusinessDashboardCard({ data }) {
  const m = data.metrics || {};
  return (
    <CardShell title={data.companyName} subtitle={data.industry}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[{ label: 'Inventory', val: m.inventory }, { label: 'Pipeline', val: m.pipeline }, { label: 'Team', val: m.team }, { label: 'Documents', val: m.documents }].map(item => (
          <div key={item.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{item.label}</span><br />
            <span style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>{item.val || 0}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function IdVerificationCard() {
  return (
    <CardShell title="Identity Verification">
      <p style={{ marginBottom: '1rem', color: '#475569', fontSize: '0.9rem' }}>Secure payment via Stripe</p>
      <div style={{ marginBottom: '1rem' }}>
        <input type="text" placeholder="Card number" readOnly value="4242 4242 4242 4242" style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: '0.5rem', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="text" placeholder="MM/YY" readOnly value="12/28" style={{ flex: 1, padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8 }} />
          <input type="text" placeholder="CVC" readOnly value="123" style={{ flex: 1, padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8 }} />
        </div>
      </div>
      <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#475569' }}>Identity Verification</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>$2.00</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', color: '#7c3aed', fontWeight: 600 }}>Processing... (Simulation)</div>
    </CardShell>
  );
}

// ── Prompt chips ──

function PromptChips({ chips, onChipClick }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div className="chat-prompt-chips">
      {chips.map((chip, i) => (
        <button key={i} className="chat-prompt-chip" onClick={() => onChipClick(chip)}>{chip}</button>
      ))}
    </div>
  );
}

// ── Card dispatcher ──

function ChatCard({ card, onAction }) {
  switch (card.type) {
    case 'magicLink': return <MagicLinkCard data={card.data} onAction={onAction} />;
    case 'terms': return <TermsCard data={card.data} onAction={onAction} />;
    case 'welcome': return <WelcomeCard data={card.data} />;
    case 'ownership': return <OwnershipCard data={card.data} onAction={onAction} />;
    case 'fileUpload': return <FileUploadCard data={card.data} onAction={onAction} />;
    case 'attestation': return <AttestationCard data={card.data} onAction={onAction} />;
    case 'dtc': return <DtcCard data={card.data} />;
    case 'vault': return <VaultCard data={card.data} />;
    case 'logbook': return <LogbookCard data={card.data} />;
    case 'businessDashboard': return <BusinessDashboardCard data={card.data} />;
    case 'idVerification': return <IdVerificationCard data={card.data} />;
    default: return null;
  }
}

// ── Main component ──

export default function FloatingChat({ demoMode = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const conversationRef = useRef(null);
  const sessionIdRef = useRef(getSessionId());

  const auth = getAuth();
  const currentUser = auth?.currentUser;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const sendToBackend = useCallback(async (payload) => {
    const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
    const headers = { 'Content-Type': 'application/json' };

    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = { sessionId: sessionIdRef.current, surface: 'platform', ...payload };
    const resp = await fetch(`${apiBase}/api/v1/chat:message`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return await resp.json();
  }, [getToken]);

  const handleResponse = useCallback((result) => {
    if (!result || !result.ok) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again in a moment.", isError: true }]);
      return;
    }

    // Backend may return a different sessionId if it resumed an existing session
    if (result.sessionId && result.sessionId !== sessionIdRef.current) {
      sessionIdRef.current = result.sessionId;
      sessionStorage.setItem('ta_platform_sid', result.sessionId);
    }

    const newMessages = [];

    if (result.message) {
      newMessages.push({ role: 'assistant', content: result.message });
    }

    if (result.cards && result.cards.length > 0) {
      newMessages.push({ role: 'assistant', cards: result.cards });
    }

    if (result.followUpMessage) {
      newMessages.push({ role: 'assistant', content: result.followUpMessage });
    }

    if (result.promptChips && result.promptChips.length > 0) {
      newMessages.push({ role: 'assistant', promptChips: result.promptChips });
    }

    setMessages(prev => [...prev, ...newMessages]);
  }, []);

  const sendMessage = useCallback(async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const result = await sendToBackend({ userInput: userMessage });
      setIsTyping(false);
      handleResponse(result);
    } catch (error) {
      console.error('Send failed:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to send message. Please try again.', isError: true }]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sendToBackend, handleResponse]);

  const sendAction = useCallback(async (action, actionData, userMsg) => {
    if (userMsg) {
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    }
    setIsTyping(true);

    try {
      const result = await sendToBackend({ action, actionData: actionData || {} });
      setIsTyping(false);
      handleResponse(result);
    } catch (error) {
      console.error('Action error:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', isError: true }]);
    }
  }, [sendToBackend, handleResponse]);

  const handleChipClick = useCallback(async (chip) => {
    setMessages(prev => [...prev, { role: 'user', content: chip }]);
    setIsTyping(true);

    try {
      const result = await sendToBackend({ userInput: chip });
      setIsTyping(false);
      handleResponse(result);
    } catch (error) {
      console.error('Chip error:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', isError: true }]);
    }
  }, [sendToBackend, handleResponse]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <button
        className={`floating-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      <div className={`floating-chat-panel ${isOpen ? 'open' : ''}`}>
        <div className="chat-panel-header">
          <div className="chat-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>AI Assistant</span>
          </div>
          <button className="chat-panel-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="chat-panel-conversation" ref={conversationRef}>
          {messages.length === 0 && !isTyping && (
            <div className="chat-welcome">
              <p>Hi. I'm your TitleApp AI assistant.</p>
              {currentUser ? (
                <p>Ask me anything about your records, documents, credentials, logbooks, or digital assets.</p>
              ) : (
                <p>Please sign in to start chatting.</p>
              )}
            </div>
          )}

          {messages.map((msg, idx) => {
            if (msg.cards) {
              return (
                <div key={idx} className="chat-message assistant">
                  {msg.cards.map((card, ci) => (
                    <ChatCard key={ci} card={card} onAction={sendAction} />
                  ))}
                </div>
              );
            }

            if (msg.promptChips) {
              return <PromptChips key={idx} chips={msg.promptChips} onChipClick={handleChipClick} />;
            }

            return (
              <div key={idx} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                <div className="chat-bubble">{msg.content}</div>
              </div>
            );
          })}

          {isTyping && (
            <div className="chat-message assistant">
              <div className="chat-typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        <form className="chat-panel-input" onSubmit={sendMessage}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            disabled={isSending}
          />
          <button type="submit" disabled={isSending || !input.trim()} aria-label="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {isOpen && <div className="floating-chat-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}
