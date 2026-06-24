import React, { useEffect, useState, useCallback, useRef } from "react";
import { auth } from "../firebase";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

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

function setHead() {
  document.title = "SOCIII — Creator onboarding";
  const set = (sel, attr, val) => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('meta[name="description"]', "content", "Finish your SOCIII creator onboarding — accept terms, verify identity, activate your license.");
}

export default function CreatorOnboard() {
  const params = new URLSearchParams(window.location.search);
  const creatorId = params.get("creatorId") || params.get("creator");
  const checkoutResult = params.get("checkout"); // "success" | "cancel" after Stripe Checkout

  const [status, setStatus] = useState({ loading: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showFullTerms, setShowFullTerms] = useState(false);
  const pollingRef = useRef(false);

  useEffect(() => { setHead(); }, []);

  const refresh = useCallback(async () => {
    if (!creatorId) {
      setStatus({ loading: false, missing: true });
      return;
    }
    try {
      const data = await apiFetch(`/v1/creator:status?creatorId=${encodeURIComponent(creatorId)}`, { method: "GET" });
      setStatus({ loading: false, ...data });
    } catch (e) {
      setStatus({ loading: false, error: "fetch_failed" });
    }
  }, [creatorId]);

  useEffect(() => { refresh(); }, [refresh]);

  // After Stripe Checkout returns, refresh + poll briefly.
  useEffect(() => {
    if (checkoutResult === "success" && !pollingRef.current) {
      pollingRef.current = true;
      setInfo("Confirming your subscription…");
      let n = 0;
      const id = setInterval(async () => {
        n++;
        await refresh();
        if (n >= 8) {
          clearInterval(id);
          pollingRef.current = false;
          setInfo("");
        }
      }, 1500);
    }
  }, [checkoutResult, refresh]);

  async function step(action, extra = {}) {
    setBusy(true);
    setError("");
    try {
      const data = await apiFetch("/v1/creator:step", {
        method: "POST",
        body: JSON.stringify({ creatorId, action, ...extra }),
      });
      if (!data.ok) {
        setError(data.error || "Action failed");
      } else if (data.identitySession?.url) {
        window.location.href = data.identitySession.url;
        return;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      } else if (data.waiver === "FIRST100") {
        setInfo("FIRST100 applied — first year on us.");
      }
      await refresh();
    } catch (e) {
      setError("Action failed; please try again.");
    } finally {
      setBusy(false);
    }
  }

  const S = {
    page: { minHeight: "100vh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a202c" },
    header: { borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", zIndex: 10 },
    brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
    brandText: { color: "#7c3aed", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" },
    main: { maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px" },
    eyebrow: { color: "#7c3aed", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 },
    h1: { fontSize: 30, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" },
    sub: { fontSize: 16, color: "#475569", lineHeight: 1.65, marginBottom: 28 },
    stepCard: { padding: "20px 22px", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 14, background: "#fff" },
    stepCardActive: { borderColor: "#7c3aed", boxShadow: "0 0 0 3px rgba(124,58,237,0.08)", background: "#faf5ff" },
    stepCardDone: { background: "#f0fdf4", borderColor: "#bbf7d0" },
    stepHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
    stepBadge: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, background: "#e2e8f0", color: "#64748b" },
    stepBadgeActive: { background: "#7c3aed", color: "#fff" },
    stepBadgeDone: { background: "#16a34a", color: "#fff" },
    stepTitle: { fontSize: 17, fontWeight: 600 },
    stepBody: { fontSize: 15, color: "#475569", lineHeight: 1.65, margin: "8px 0 12px 40px" },
    stepActions: { marginLeft: 40 },
    btn: { padding: "12px 22px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" },
    btnDisabled: { background: "#94a3b8", cursor: "not-allowed" },
    btnGhost: { padding: "10px 16px", background: "transparent", color: "#7c3aed", border: "1px solid #7c3aed", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginLeft: 8 },
    err: { color: "#dc2626", fontSize: 14, margin: "8px 0 0 40px" },
    info: { color: "#475569", fontSize: 14, margin: "8px 0 0 40px" },
    loading: { padding: "80px 24px", textAlign: "center", color: "#64748b" },
    termsBox: { padding: "18px 22px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#1a202c", maxHeight: 280, overflowY: "auto" },
    successHero: { padding: "32px", textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, marginBottom: 16 },
    successH: { fontSize: 22, fontWeight: 700, color: "#15803d", marginBottom: 8 },
    pill: { display: "inline-block", padding: "3px 10px", background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 999, color: "#7c3aed", fontSize: 12, fontWeight: 600, marginLeft: 8 },
  };

  function Header() {
    return (
      <header style={S.header}>
        <a href="/" style={S.brand}>
          <img src={sociiiMarkUrl} alt="" width={28} height={28} style={{ borderRadius: 6 }} />
          <span style={S.brandText}>SOCIII</span>
        </a>
      </header>
    );
  }

  if (status.loading) {
    return (
      <div style={S.page}><Header /><main style={S.main}><div style={S.loading}>Loading your creator onboarding…</div></main></div>
    );
  }

  if (status.missing) {
    // No token = a public visitor (the marketplace/pricing "become a creator"
    // links land here). Show a real apply/info page, not a dead end. Creator
    // access stays curated/invite-based per strategy.
    return (
      <div style={S.page}><Header /><main style={S.main}>
        <div style={S.eyebrow}>Become a SOCIII creator</div>
        <h1 style={S.h1}>Build a Digital Worker. Earn from what you know.</h1>
        <p style={S.sub}>
          SOCIII creators are domain experts — a title pro, a flight instructor, a nursing educator — who package their expertise as a governed Digital Worker. Publish it to the public marketplace, or keep it private to your own business. You own the worker; the SDK is its birth certificate.
        </p>
        <p style={S.sub}>
          Creator access is <strong>curated</strong> — we onboard a small number of excellent builders at a time, so the marketplace stays high-signal. Tell us what you'd build and we'll send you an invite with everything you need.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <a href="mailto:creators@sociii.ai?subject=I%20want%20to%20build%20a%20SOCIII%20worker&body=Who%20I%20am%3A%0AThe%20worker%20I%27d%20build%3A%0AThe%20expertise%20behind%20it%3A%0A" style={{ background: "#7c3aed", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>Apply to create →</a>
          <a href="/docs" style={{ background: "#f1f5f9", color: "#0f172a", padding: "12px 20px", borderRadius: 10, fontWeight: 600, textDecoration: "none" }}>See how creators build (SDK docs)</a>
        </div>
        <p style={{ ...S.sub, fontSize: 13, marginTop: 18, color: "#94a3b8" }}>Already have an invite? Open the link in your invitation email — it carries your secure token.</p>
      </main></div>
    );
  }

  if (!status.ok) {
    return (
      <div style={S.page}><Header /><main style={S.main}>
        <div style={S.eyebrow}>Creator onboarding</div>
        <h1 style={S.h1}>We couldn't load your record.</h1>
        <p style={S.sub}>{status.error || "Please try refreshing, or reply to your invite email and we'll help."}</p>
      </main></div>
    );
  }

  const c = status.creator;
  const firstName = (c.name || "").split(" ")[0] || "friend";
  const stepNum =
    c.flowStep === "closed" || c.subscriptionStatus === "active" ? 4 :
    c.subscriptionStatus === "pending" ? 3 :
    c.kycStatus === "approved" ? 3 :
    c.kycStatus === "submitted" ? 2 :
    c.agreementAcceptedAt ? 2 :
    1;

  const termsAccepted = !!c.agreementAcceptedAt;
  const kycDone = c.kycStatus === "approved";
  const subActive = c.subscriptionStatus === "active";

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <div style={S.eyebrow}>Creator onboarding</div>
        <h1 style={S.h1}>{subActive ? "You're live, " : "Welcome, "}{firstName}.</h1>
        <p style={S.sub}>
          {subActive
            ? "Your Creator License is active. Build something."
            : "Three quick steps. Should take less than five minutes."}
          {c.firstHundred && <span style={S.pill}>FIRST100 applied</span>}
        </p>

        {subActive && (
          <div style={S.successHero}>
            <div style={S.successH}>License active</div>
            <p style={{ margin: 0, color: "#475569" }}>
              You can now publish workers in the SOCIII marketplace.
              {c.firstHundred && " First year on us — renews $49/yr after."}
            </p>
            <a href="/" style={{ ...S.btn, display: "inline-block", marginTop: 16, textDecoration: "none" }}>Open SOCIII →</a>
          </div>
        )}

        {/* Step 1 — Terms */}
        <div style={{
          ...S.stepCard,
          ...(stepNum === 1 ? S.stepCardActive : {}),
          ...(termsAccepted ? S.stepCardDone : {}),
        }}>
          <div style={S.stepHead}>
            <div style={{ ...S.stepBadge, ...(stepNum === 1 ? S.stepBadgeActive : {}), ...(termsAccepted ? S.stepBadgeDone : {}) }}>
              {termsAccepted ? "✓" : "1"}
            </div>
            <div style={S.stepTitle}>Accept the Creator License</div>
          </div>
          <div style={S.stepBody}>
            Plain-English click-through agreement. No Dropbox Sign, no lawyer required.
            You keep 75% of every subscription to your workers and 20% margin on inference.
          </div>
          {!termsAccepted && stepNum === 1 && (
            <div style={S.stepActions}>
              {showFullTerms ? (
                <div style={S.termsBox}>
                  <strong>SOCIII Creator License v1 (2026-05-29)</strong>
                  <p>By accepting, you agree to the following plain-English terms:</p>
                  <ol style={{ paddingLeft: 20, margin: "8px 0" }}>
                    <li><strong>You own your worker logic.</strong> You grant SOCIII a license to host, distribute, and execute it on the platform. You can withdraw your worker at any time; existing subscribers get a 30-day wind-down.</li>
                    <li><strong>Revenue share:</strong> You keep 75% of subscription revenue and 20% of inference margin on your workers. SOCIII handles payments, distribution, compliance, and audit.</li>
                    <li><strong>Annual license:</strong> $49/year for publishing rights, runtime allocation, marketplace presence. First year free for the first 100 creators (FIRST100).</li>
                    <li><strong>Identity verification:</strong> Required via Stripe Identity to keep the marketplace KYC-clean and protect creators from impersonation. FIRST100 covers the ID fee.</li>
                    <li><strong>Quality &amp; compliance:</strong> Workers must pass SOCIII's published RAAS rules + QA checks before going live. We may delist workers that violate platform safety policies; you get notice and a chance to remediate.</li>
                    <li><strong>Liability:</strong> SOCIII operates as a platform; you remain responsible for the substantive correctness of your worker's outputs in your domain. We share liability for platform infrastructure failures.</li>
                    <li><strong>Termination:</strong> Either party can terminate with 30 days notice. Earned revenue is paid out through end-of-quarter following termination.</li>
                  </ol>
                  <p>Full terms version <code>{status.creatorLicenseVersion}</code> · price <code>${status.priceYearlyUsd}/yr</code></p>
                </div>
              ) : (
                <button style={S.btnGhost} onClick={() => setShowFullTerms(true)} disabled={busy}>Read full terms</button>
              )}
              <div style={{ marginTop: 12 }}>
                <button
                  style={{ ...S.btn, ...(busy ? S.btnDisabled : {}) }}
                  onClick={() => step("accept_terms")}
                  disabled={busy}
                >
                  {busy ? "Recording…" : "I accept the Creator License"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2 — Identity */}
        <div style={{
          ...S.stepCard,
          ...(stepNum === 2 ? S.stepCardActive : {}),
          ...(kycDone ? S.stepCardDone : {}),
        }}>
          <div style={S.stepHead}>
            <div style={{ ...S.stepBadge, ...(stepNum === 2 ? S.stepBadgeActive : {}), ...(kycDone ? S.stepBadgeDone : {}) }}>
              {kycDone ? "✓" : "2"}
            </div>
            <div style={S.stepTitle}>Verify your identity</div>
          </div>
          <div style={S.stepBody}>
            A 30-second ID check via Stripe Identity. Keeps the marketplace KYC-clean.
            {c.firstHundred && " Your verification fee is covered by FIRST100."}
            {c.kycStatus === "submitted" && !kycDone && " You've submitted — Stripe is processing. Refresh in a moment."}
          </div>
          {stepNum === 2 && termsAccepted && !kycDone && (
            <div style={S.stepActions}>
              {c.kycStatus === "submitted" ? (
                <button style={S.btnGhost} onClick={() => step("sync_kyc")} disabled={busy}>
                  Check status
                </button>
              ) : (
                <button
                  style={{ ...S.btn, ...(busy ? S.btnDisabled : {}) }}
                  onClick={() => step("start_identity", { returnUrl: window.location.href })}
                  disabled={busy}
                >
                  {busy ? "Starting…" : "Start ID verification"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step 3 — Subscription */}
        <div style={{
          ...S.stepCard,
          ...(stepNum === 3 ? S.stepCardActive : {}),
          ...(subActive ? S.stepCardDone : {}),
        }}>
          <div style={S.stepHead}>
            <div style={{ ...S.stepBadge, ...(stepNum === 3 ? S.stepBadgeActive : {}), ...(subActive ? S.stepBadgeDone : {}) }}>
              {subActive ? "✓" : "3"}
            </div>
            <div style={S.stepTitle}>
              Activate your Creator License
              {c.firstHundred && <span style={S.pill}>FIRST100 — first year on us</span>}
            </div>
          </div>
          <div style={S.stepBody}>
            {c.firstHundred
              ? "One click to activate. We don't bill anything for your first year as a FIRST100 creator. Card on file required for year two; we'll email you a heads-up 30 days before renewal."
              : "$49 / year. Stripe Checkout opens for secure payment."}
          </div>
          {stepNum === 3 && kycDone && !subActive && (
            <div style={S.stepActions}>
              <button
                style={{ ...S.btn, ...(busy ? S.btnDisabled : {}) }}
                onClick={() => step("start_subscription", { returnUrl: window.location.href })}
                disabled={busy}
              >
                {busy ? "Working…" : (c.firstHundred ? "Activate license (no charge)" : "Continue to checkout")}
              </button>
            </div>
          )}
        </div>

        {error && <div style={S.err}>{error}</div>}
        {info && <div style={S.info}>{info}</div>}

        {!subActive && (
          <p style={{ marginTop: 20, fontSize: 13, color: "#94a3b8" }}>
            Questions? Reply to the invite email or write to <a href="mailto:sean@sociii.ai" style={{ color: "#7c3aed" }}>sean@sociii.ai</a>.
          </p>
        )}
      </main>
    </div>
  );
}
