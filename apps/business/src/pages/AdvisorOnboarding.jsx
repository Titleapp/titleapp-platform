import React, { useEffect, useState, useCallback, useRef } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, opts = {}) {
  let token = null;
  try {
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
  } catch (_) {}
  if (!token) token = localStorage.getItem("ID_TOKEN");

  const [bare, qs] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}${qs ? "&" + qs : ""}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

export default function AdvisorOnboarding() {
  const params = new URLSearchParams(window.location.search);
  const advisorId = params.get("advisorId");

  const [status, setStatus] = useState({ loading: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const pollingRef = useRef(false);

  const load = useCallback(async () => {
    if (!advisorId) {
      setStatus({ loading: false, error: "Missing advisorId" });
      return null;
    }
    try {
      const data = await apiFetch(`/v1/ir:advisor:status?advisorId=${encodeURIComponent(advisorId)}`, { method: "GET" });
      setStatus({ loading: false, ...data });
      return data;
    } catch (e) {
      setStatus({ loading: false, error: "Could not load advisor status" });
      return null;
    }
  }, [advisorId]);

  useEffect(() => { load(); }, [load]);

  // Always poll while KYC is in flight (Stripe Identity may not return with continue=1).
  // Triggers a server-side sync_kyc every 5s to recover from any missed webhook.
  useEffect(() => {
    if (status.loading || status.error) return;
    if (status.kycStatus === "approved") return;
    if (!status.advisor?.stripeIdentitySessionId && status.advisor?.flowStep !== "identity_pending") return;
    if (pollingRef.current) return;

    pollingRef.current = true;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        await apiFetch("/v1/ir:advisor:step", {
          method: "POST",
          body: JSON.stringify({ advisorId, action: "sync_kyc" }),
        });
      } catch (_) {}
      const fresh = await load();
      if (cancelled) return;
      if (fresh?.kycStatus === "approved") {
        pollingRef.current = false;
        setInfo("Identity verified.");
        return;
      }
      if (attempts < 30) {
        setTimeout(tick, 5000);
      } else {
        pollingRef.current = false;
      }
    };
    tick();
    return () => { cancelled = true; pollingRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.kycStatus, status.advisor?.flowStep, advisorId]);

  async function acknowledgeTerms() {
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await apiFetch("/v1/ir:advisor:step", {
        method: "POST",
        body: JSON.stringify({ advisorId, action: "acknowledge_terms" }),
      });
      if (res.ok) {
        setInfo("Terms acknowledged. Continue to identity verification.");
        await load();
      } else {
        setError(res.error || "Could not record acknowledgment");
      }
    } catch (e) {
      setError("Could not record acknowledgment");
    } finally {
      setBusy(false);
    }
  }

  async function startKyc() {
    setBusy(true); setError("");
    try {
      const returnUrl = window.location.origin + `/onboard/advisor?advisorId=${encodeURIComponent(advisorId)}`;
      const res = await apiFetch("/v1/ir:advisor:step", {
        method: "POST",
        body: JSON.stringify({ advisorId, action: "start_identity", returnUrl }),
      });
      if (res.url) {
        window.location.href = res.url;
      } else if (res.error) {
        setError(res.error);
      } else {
        setError("Could not start identity verification");
      }
    } catch (e) {
      setError("Could not start identity verification");
    } finally {
      setBusy(false);
    }
  }

  async function startSignature(opts = {}) {
    const action = opts.force ? "resend_signature" : "start_signature";
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await apiFetch("/v1/ir:advisor:step", {
        method: "POST",
        body: JSON.stringify({ advisorId, action }),
      });
      if (res.ok) {
        const recipient = res.recipientEmail || advisor.email || "your email";
        setInfo(`Advisor Agreement sent from Dropbox Sign to ${recipient}. Check that inbox (and spam). The sender is hellosign.com or dropboxsign.com — not SOCIII.`);
        await load();
      } else {
        const detail = res.dropboxSignError
          ? ` (Dropbox Sign: ${res.dropboxSignError.error_msg || JSON.stringify(res.dropboxSignError)})`
          : "";
        setError((res.error || res.instructions || "Could not start signature") + detail);
      }
    } catch (e) {
      setError("Could not start signature: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  }

  async function manualSync() {
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await apiFetch("/v1/ir:advisor:step", {
        method: "POST",
        body: JSON.stringify({ advisorId, action: "sync_kyc" }),
      });
      await load();
      if (res?.action === "approved") {
        setInfo("Identity verified.");
      } else {
        setInfo(`Status: ${res?.status || "unknown"}`);
      }
    } catch (e) {
      setError("Sync failed");
    } finally {
      setBusy(false);
    }
  }

  if (status.loading) {
    return <Shell><p style={muted}>Loading…</p></Shell>;
  }
  if (status.error) {
    return <Shell><p style={errorText}>{status.error}</p></Shell>;
  }

  const advisor = status.advisor || {};
  const kyc = advisor.kycStatus || "not_submitted";
  const step = advisor.flowStep || "created";
  // Terms are implicitly acknowledged once KYC is approved (legacy advisors who
  // verified before the terms-ack gate existed shouldn't get stuck on Step 1).
  const termsAck = !!advisor.termsAcknowledgedAt || kyc === "approved";
  const signed = step === "signature_complete" || step === "closed";
  const signaturePending = step === "signature_pending";
  const kycInFlight = !!advisor.stripeIdentitySessionId && kyc !== "approved";

  return (
    <Shell>
      <h1 style={h1}>Welcome to SOCIII, {advisor.name?.split(" ")[0] || "advisor"}.</h1>
      <p style={p}>
        Proposed terms: <strong>{advisor.equityPct}</strong> equity · vesting{" "}
        {advisor.vestingMonths || 24} months · cliff {advisor.cliffMonths || 6} months
        {advisor.advisorRole ? ` · role: ${advisor.advisorRole}` : ""}
      </p>
      {!signed && (
        <div style={{
          margin: "20px 0 28px",
          padding: "14px 18px",
          background: "#f8fafc",
          borderLeft: "4px solid #7C3AED",
          borderRadius: 6,
          fontSize: 14,
          color: "#475569",
          lineHeight: 1.6,
        }}>
          This page tracks your onboarding status. The Advisor Agreement itself
          is sent and signed via <strong>Dropbox Sign</strong> — look for a
          separate email from <strong>hellosign.com</strong> or{" "}
          <strong>dropboxsign.com</strong> in your inbox once Step 3 is reached.
        </div>
      )}

      {/* Step 1 — Review the offer */}
      <StepRow active={!termsAck} done={termsAck} label="1. Review the offer">
        <p style={muted}>
          Read the proposed terms above. When ready, confirm you agree with the offer to continue.
        </p>
        {status.deckUrl ? (
          <p style={{ ...muted, marginTop: 12 }}>
            <a href={status.deckUrl} style={link} target="_blank" rel="noreferrer">
              Open the SOCIII pre-seed deck →
            </a>
          </p>
        ) : null}
        {termsAck ? (
          <p style={{ ...muted, marginTop: 12 }}>Acknowledged.</p>
        ) : (
          <button style={btn} onClick={acknowledgeTerms} disabled={busy}>
            {busy ? "Saving…" : "I agree with the offer as proposed"}
          </button>
        )}
      </StepRow>

      {/* Step 2 — Verify identity (also captures contact info for the agreement) */}
      <StepRow active={termsAck && kyc !== "approved"} done={kyc === "approved"} label="2. Verify your identity (free, ~2 min)">
        {!termsAck ? (
          <p style={muted}>Acknowledge the terms above first.</p>
        ) : kyc === "approved" ? (
          <>
            <p style={muted}>Identity verified.</p>
            {advisor.verifiedAddress && (
              <p style={{ ...muted, marginTop: 8 }}>
                Address on file for the agreement: <strong>{advisor.verifiedAddress}</strong>
              </p>
            )}
          </>
        ) : (
          <>
            <p style={muted}>
              We use Stripe Identity to verify a government-issued ID. Verified contact information auto-fills the agreement in Step 3.
            </p>
            <button style={btn} onClick={startKyc} disabled={busy}>
              {busy ? "Opening…" : "Verify identity"}
            </button>
            {kycInFlight && (
              <p style={{ ...muted, marginTop: 12 }}>
                Verification in progress. This page checks every few seconds.{" "}
                <button type="button" onClick={manualSync} style={linkBtn} disabled={busy}>Check now</button>
              </p>
            )}
          </>
        )}
      </StepRow>

      {/* Step 3 — Sign agreement */}
      <StepRow active={kyc === "approved" && !signed} done={signed} label="3. Sign Advisor Agreement">
        {signed ? (
          <p style={muted}>Signed. A copy is in your Vault and emailed to you.</p>
        ) : kyc !== "approved" ? (
          <p style={muted}>Complete identity verification first.</p>
        ) : signaturePending ? (
          <>
            <p style={muted}>
              Signature packet sent to <strong>{advisor.email}</strong>. Open the email from{" "}
              <strong>hellosign.com</strong> or <strong>dropboxsign.com</strong> to sign (check spam).
            </p>
            <p style={{ ...muted, marginTop: 12 }}>
              Didn't get it?{" "}
              <button
                type="button"
                onClick={() => startSignature({ force: true })}
                style={linkBtn}
                disabled={busy}
              >
                {busy ? "Resending…" : "Resend signature packet"}
              </button>
            </p>
          </>
        ) : (
          <>
            <p style={muted}>
              The agreement is pre-filled with your verified name and address. You'll receive an email from Dropbox Sign with the document.
            </p>
            <button style={btn} onClick={startSignature} disabled={busy}>
              {busy ? "Sending…" : "Send agreement to my inbox"}
            </button>
          </>
        )}
      </StepRow>

      <p style={tinyMuted}>
        Questions about the offer, identity check, or agreement?{" "}
        <a
          style={link}
          href={`/?utm_source=advisor-onboard&prompt=${encodeURIComponent(
            "I'm an incoming SOCIII advisor and I have a question about my onboarding"
          )}`}
        >
          Ask Alex →
        </a>
      </p>

      {info && <p style={infoText}>{info}</p>}
      {error && <p style={errorText}>{error}</p>}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#FFFFFF", color: "#0f172a",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "48px 24px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#7C3AED", marginBottom: 32 }}>SOCIII</div>
        {children}
      </div>
    </div>
  );
}

function StepRow({ active, done, label, children }) {
  return (
    <div style={{
      border: "1px solid " + (done ? "#16A34A" : active ? "#7C3AED" : "#e5e7eb"),
      borderRadius: 12, padding: 20, marginBottom: 16,
      background: active ? "#faf5ff" : "#fff",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: done ? "#16A34A" : "#1f2937", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

const h1 = { fontSize: 24, fontWeight: 700, marginBottom: 8 };
const p = { fontSize: 15, color: "#334155", lineHeight: 1.6, marginBottom: 24 };
const muted = { fontSize: 14, color: "#64748b", lineHeight: 1.6 };
const tinyMuted = { fontSize: 13, color: "#94a3b8", marginTop: 24 };
const link = { color: "#7C3AED", fontWeight: 600, textDecoration: "none" };
const linkBtn = {
  background: "none", border: "none", color: "#7C3AED", fontWeight: 600,
  cursor: "pointer", padding: 0, fontSize: 14, textDecoration: "underline",
};
const btn = {
  background: "#7C3AED", color: "#fff", border: "none",
  padding: "12px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600,
  cursor: "pointer", marginTop: 12,
};
const errorText = { color: "#dc2626", fontSize: 14, marginTop: 16 };
const infoText = { color: "#16A34A", fontSize: 14, marginTop: 16 };
