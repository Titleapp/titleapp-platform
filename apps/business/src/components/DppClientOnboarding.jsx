import React, { useCallback, useEffect, useState } from 'react';

/**
 * DppClientOnboarding.jsx — real onboarding for a brand/manufacturer
 * signing up as a SOCIII "DPP advocate" client (2026-09-05).
 *
 * Shown by App.jsx in place of the generic OnboardingWizard when
 * onboardingVertical === 'dpp' (AddWorkspaceWizard.jsx's new vertical).
 * Deliberately a separate, small component rather than another branch
 * inside OnboardingWizard.jsx — that component is a large, shared,
 * multi-vertical wizard (investor/analyst/real-estate/education sample
 * data seeding); this flow's shape (identity verification + document
 * upload, no sample-data seeding at all) is different enough, and the
 * blast radius of touching that file for every other vertical isn't
 * worth it for one addition.
 *
 * Two steps, both backed by real, already-existing platform primitives —
 * nothing here is a new verification or storage mechanism:
 *   1. Stripe Identity KYC of the person signing up, via the same
 *      POST /v1/identity:session:create route every other vertical's KYC
 *      goes through (services/identity/identitySession.js). Stripe's own
 *      hosted page does the actual camera/ID capture — this just starts
 *      the session and does a plain full-page redirect to it (the same
 *      pattern this app already uses for Stripe Checkout — CartDrawer.jsx,
 *      WorkspaceObligationsBanner.jsx — since nothing in apps/business
 *      loads Stripe.js/Elements).
 *   2. Business registration document upload, via the fully generic
 *      /v1/files:sign + /v1/files:finalize pair every file upload on this
 *      platform already uses — tagged purpose: "business_registration_doc"
 *      so it's identifiable later, not a new storage mechanism.
 *
 * Status is read back from GET /v1/dpp:workspace:onboardingStatus, which
 * combines both real signals server-side rather than this component
 * tracking completion itself in localStorage only.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';

function authHeaders(tenantId, extra) {
  const token = localStorage.getItem('ID_TOKEN');
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    ...(extra || {}),
  };
}

export default function DppClientOnboarding({ onComplete }) {
  // Same source every sibling component in this codebase reads the active
  // workspace id from (CommsPreferences.jsx, CartDrawer.jsx, etc.) — App.jsx
  // sets this in handleWorkspaceLaunch() before this component ever renders.
  const [tenantId] = useState(() => localStorage.getItem('TENANT_ID'));
  const [workspaceName] = useState(() => localStorage.getItem('WORKSPACE_NAME') || 'your DPP workspace');
  const [status, setStatus] = useState(null); // { kycStatus, docUploaded, ready }
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [kycStarting, setKycStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const refreshStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const resp = await fetch(`${API_BASE}/api?path=${encodeURIComponent('/v1/dpp:workspace:onboardingStatus')}`, {
        headers: authHeaders(tenantId),
      });
      const data = await resp.json();
      if (data.ok) setStatus(data);
    } catch (e) {
      console.error('DppClientOnboarding: status fetch failed', e);
    } finally {
      setLoadingStatus(false);
    }
  }, [tenantId]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  async function startKyc() {
    if (!consentChecked) {
      setError('Please confirm you accept the identity-verification consent below before continuing.');
      return;
    }
    setError(null);
    setKycStarting(true);
    try {
      const resp = await fetch(`${API_BASE}/api?path=${encodeURIComponent('/v1/identity:session:create')}`, {
        method: 'POST',
        headers: authHeaders(tenantId, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          purpose: 'dpp_workspace_owner',
          returnUrl: window.location.href,
          identityConsent: {
            accepted: true,
            acceptedAt: new Date().toISOString(),
            text: CROSS_TENANT_CONSENT_TEXT,
          },
        }),
      });
      const data = await resp.json();
      if (!data.ok || !data.url) {
        setError(data.error || 'Could not start identity verification. Please try again.');
        setKycStarting(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      console.error('DppClientOnboarding: kyc start failed', e);
      setError('Could not start identity verification. Please try again.');
      setKycStarting(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const signResp = await fetch(`${API_BASE}/api?path=${encodeURIComponent('/v1/files:sign')}`, {
        method: 'POST',
        headers: authHeaders(tenantId, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          purpose: 'business_registration_doc',
          tags: ['dpp_onboarding'],
          related: { onboarding: true },
        }),
      });
      const signData = await signResp.json();
      if (!signData.ok) {
        setError(signData.error || 'Could not prepare the upload. Please try again.');
        setUploading(false);
        return;
      }

      const putResp = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putResp.ok) {
        setError('Upload failed — please try again.');
        setUploading(false);
        return;
      }

      const finalizeResp = await fetch(`${API_BASE}/api?path=${encodeURIComponent('/v1/files:finalize')}`, {
        method: 'POST',
        headers: authHeaders(tenantId, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ fileId: signData.fileId, storagePath: signData.storagePath, contentType: file.type, sizeBytes: file.size }),
      });
      const finalizeData = await finalizeResp.json();
      if (!finalizeData.ok) {
        setError(finalizeData.error || 'Could not finalize the upload. Please try again.');
        setUploading(false);
        return;
      }

      await refreshStatus();
    } catch (e) {
      console.error('DppClientOnboarding: document upload failed', e);
      setError('Upload failed — please try again.');
    } finally {
      setUploading(false);
    }
  }

  const kycVerified = status?.kycStatus === 'verified';
  const kycPending = status?.kycStatus === 'pending';
  const docUploaded = !!status?.docUploaded;
  const ready = kycVerified && docUploaded;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>SOCIII</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Finish setting up {workspaceName}
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.5 }}>
        As your Digital Product Passport advocate, SOCIII verifies who's signing up and confirms your business
        before your workspace goes live. Two quick steps.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Step 1 — identity verification */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>1. Verify your identity</div>
          <StatusPill state={kycVerified ? 'done' : kycPending ? 'pending' : 'todo'} />
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
          Real, camera-based ID verification via Stripe Identity — you'll be redirected to Stripe's own secure
          verification page and brought back here when you're done.
        </p>
        {!kycVerified && (
          <>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#475569', marginBottom: 12 }}>
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} style={{ marginTop: 2 }} />
              <span>{CROSS_TENANT_CONSENT_TEXT}</span>
            </label>
            <button
              onClick={startKyc}
              disabled={kycStarting || kycPending}
              style={{
                background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: kycStarting ? 'default' : 'pointer',
                opacity: kycStarting || kycPending ? 0.6 : 1,
              }}
            >
              {kycPending ? 'Verification in progress…' : kycStarting ? 'Starting…' : 'Verify your identity'}
            </button>
          </>
        )}
      </div>

      {/* Step 2 — business registration document */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>2. Upload your business registration document</div>
          <StatusPill state={docUploaded ? 'done' : 'todo'} />
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
          A photo or PDF of your business's real registration certificate (e.g. Chamber of Commerce extract,
          Certificate of Incorporation). Take a photo with your phone or upload a file.
        </p>
        {!docUploaded && (
          <label style={{
            display: 'inline-block', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: 8,
            padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#334155', cursor: 'pointer',
          }}>
            {uploading ? 'Uploading…' : 'Choose file or take a photo'}
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      <button
        onClick={onComplete}
        disabled={!ready || loadingStatus}
        style={{
          width: '100%', background: ready ? '#16a34a' : '#e2e8f0', color: ready ? 'white' : '#94a3b8',
          border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700,
          cursor: ready ? 'pointer' : 'default',
        }}
      >
        {ready ? 'Continue to your workspace' : 'Complete both steps to continue'}
      </button>
    </div>
  );
}

function StatusPill({ state }) {
  const cfg = {
    done: { bg: '#dcfce7', color: '#166534', label: 'Verified' },
    pending: { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
    todo: { bg: '#f1f5f9', color: '#64748b', label: 'Not started' },
  }[state];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
      {cfg.label}
    </span>
  );
}

// CODEX S52.62 §1.5/§4 item 9 — same platform-level cross-tenant-identity
// consent language used by services/clients/clientOnboarding.js's
// CROSS_TENANT_CONSENT_TEXT. [PLACEHOLDER wording — not yet reviewed by
// counsel; see this session's report for the compliance-review flag.]
const CROSS_TENANT_CONSENT_TEXT =
  "By checking this box, you consent to SOCIII's verified-identity cross-tenant resolution: a one-time " +
  "biometric identity check performed by our verification provider (Stripe Identity) is used to compute a " +
  "cryptographic hash of your verified legal name, date of birth, and document number. SOCIII stores only " +
  "that hash — never biometric data, never the raw name/DOB/document values — and may use it to recognize " +
  "that the same real person has separately, independently verified with other SOCIII-powered businesses, " +
  "without ever sharing your data between them.";
