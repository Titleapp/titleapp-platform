import React, { useEffect, useState, useCallback } from "react";
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
  document.title = "SOCIII — Cast your vote";
  const set = (sel, attr, val) => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('meta[name="description"]', "content", "Cast your vote on an open SOCIII shareholder ballot.");
}

export default function InvestorVote() {
  const params = new URLSearchParams(window.location.search);
  const fundraiseId = params.get("fundraise");
  const ballotId = params.get("ballot");
  const investorId = params.get("investor");

  const [ballot, setBallot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(!!auth.currentUser);
  const [choice, setChoice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(null);

  useEffect(() => { setHead(); }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setSignedIn(!!u));
    return () => unsub && unsub();
  }, []);

  const loadBallot = useCallback(async () => {
    if (!fundraiseId || !ballotId) {
      setError("This vote link is missing required information. Please use the link from your ballot email.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/v1/ir:ballot:get?fundraiseId=${encodeURIComponent(fundraiseId)}&ballotId=${encodeURIComponent(ballotId)}`, { method: "GET" });
      if (!data.ok) {
        setError(data.error || "Could not load the ballot.");
      } else {
        setBallot(data.ballot);
      }
    } catch (e) {
      setError("Could not reach the SOCIII voting service. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [fundraiseId, ballotId]);

  useEffect(() => {
    if (signedIn) loadBallot();
  }, [signedIn, loadBallot]);

  async function submitVote(e) {
    e.preventDefault();
    if (!choice) {
      setError("Pick an option before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = await apiFetch("/v1/ir:ballot:vote", {
        method: "POST",
        body: JSON.stringify({ fundraiseId, ballotId, investorId, choice }),
      });
      if (!data.ok) {
        setError(data.error || "Vote submission failed.");
      } else {
        setVoted({ choice, at: new Date().toISOString() });
      }
    } catch (e) {
      setError("Vote submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const S = {
    page: { minHeight: "100vh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a202c" },
    header: { borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", zIndex: 10 },
    brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
    brandText: { color: "#7c3aed", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" },
    main: { maxWidth: 640, margin: "0 auto", padding: "56px 24px 80px" },
    eyebrow: { color: "#7c3aed", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 },
    h1: { fontSize: 30, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px" },
    sub: { fontSize: 16, color: "#475569", lineHeight: 1.65, marginBottom: 24 },
    meta: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, margin: "0 0 32px", padding: "16px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
    metaItem: { textAlign: "center" },
    metaVal: { fontSize: 18, fontWeight: 700, color: "#1a202c", lineHeight: 1.2 },
    metaLbl: { fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" },
    option: { display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px", border: "1px solid #d1d5db", borderRadius: 10, marginBottom: 10, cursor: "pointer", transition: "all 0.15s" },
    optionSelected: { borderColor: "#7c3aed", background: "#faf5ff", boxShadow: "0 0 0 2px rgba(124,58,237,0.1)" },
    optionRadio: { marginTop: 3 },
    optionText: { fontSize: 15, color: "#1a202c", lineHeight: 1.5, flex: 1 },
    btn: { padding: "14px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 16 },
    btnDisabled: { background: "#94a3b8", cursor: "not-allowed" },
    err: { color: "#dc2626", fontSize: 14, margin: "8px 0", padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" },
    info: { fontSize: 14, color: "#475569", lineHeight: 1.6, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 },
    success: { padding: "32px", textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12 },
    successH: { fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#15803d" },
    successP: { fontSize: 16, color: "#475569", lineHeight: 1.6, margin: "0 0 4px" },
    loading: { padding: "60px 24px", textAlign: "center", color: "#64748b" },
    signinBox: { padding: "32px", textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 },
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

  if (!signedIn) {
    const here = window.location.pathname + window.location.search;
    return (
      <div style={S.page}>
        <Header />
        <main style={S.main}>
          <div style={S.eyebrow}>Shareholder vote</div>
          <h1 style={S.h1}>Sign in to cast your vote.</h1>
          <p style={S.sub}>Voting is restricted to verified SOCIII shareholders on record at the time the ballot opened.</p>
          <div style={S.signinBox}>
            <a href={`/login?returnTo=${encodeURIComponent(here)}`} style={{ ...S.btn, display: "inline-block", textDecoration: "none", padding: "12px 32px", width: "auto" }}>
              Sign in
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={S.page}>
        <Header />
        <main style={S.main}>
          <div style={S.loading}>Loading ballot…</div>
        </main>
      </div>
    );
  }

  if (voted) {
    return (
      <div style={S.page}>
        <Header />
        <main style={S.main}>
          <div style={S.success}>
            <div style={S.successH}>Vote recorded.</div>
            <p style={S.successP}>
              You voted <strong>{voted.choice}</strong> on "{ballot?.title}".
            </p>
            <p style={S.successP}>
              You can update your choice until the ballot closes by returning to this link.
            </p>
            <p style={{ ...S.successP, marginTop: 16 }}>
              <a href="/" style={{ color: "#7c3aed", textDecoration: "underline" }}>Return to SOCIII</a>
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!ballot) {
    return (
      <div style={S.page}>
        <Header />
        <main style={S.main}>
          <div style={S.eyebrow}>Shareholder vote</div>
          <h1 style={S.h1}>Ballot unavailable.</h1>
          {error && <div style={S.err}>{error}</div>}
          <p style={S.sub}>
            If you reached this page from a ballot email, the ballot may have closed or the link may be invalid.
            Reply to the original email and we'll send you a fresh link.
          </p>
        </main>
      </div>
    );
  }

  const closed = ballot.status === "closed";
  const yourShares = ballot.snapshotShares?.[investorId] || 0;
  const totalShares = Object.values(ballot.snapshotShares || {}).reduce((a, b) => a + Number(b || 0), 0);
  const yourWeight = totalShares > 0 ? ((yourShares / totalShares) * 100).toFixed(2) : "0.00";
  const closesAt = ballot.closesAt?.seconds
    ? new Date(ballot.closesAt.seconds * 1000).toLocaleString()
    : (ballot.closesAt ? new Date(ballot.closesAt).toLocaleString() : "—");

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <div style={S.eyebrow}>Shareholder vote</div>
        <h1 style={S.h1}>{ballot.title}</h1>
        {ballot.description && <p style={S.sub}>{ballot.description}</p>}

        <div style={S.meta}>
          <div style={S.metaItem}>
            <div style={S.metaVal}>{Number(yourShares).toLocaleString()}</div>
            <div style={S.metaLbl}>Your shares</div>
          </div>
          <div style={S.metaItem}>
            <div style={S.metaVal}>{yourWeight}%</div>
            <div style={S.metaLbl}>Voting weight</div>
          </div>
          <div style={S.metaItem}>
            <div style={S.metaVal}>{closesAt.split(",")[0]}</div>
            <div style={S.metaLbl}>Closes</div>
          </div>
        </div>

        {yourShares === 0 && (
          <div style={S.info}>
            You don't appear in the cap-table snapshot taken when this ballot opened.
            If you believe this is in error, reply to the ballot email and we'll investigate.
          </div>
        )}

        {closed && (
          <div style={S.info}>
            This ballot has closed. Voting is no longer accepted.
          </div>
        )}

        <form onSubmit={submitVote}>
          {(ballot.options || []).map((opt) => {
            const selected = choice === opt;
            return (
              <label
                key={opt}
                style={{ ...S.option, ...(selected ? S.optionSelected : {}) }}
                onClick={() => setChoice(opt)}
              >
                <input
                  type="radio"
                  name="choice"
                  value={opt}
                  checked={selected}
                  onChange={() => setChoice(opt)}
                  style={S.optionRadio}
                  disabled={closed || yourShares === 0}
                />
                <div style={S.optionText}>{opt}</div>
              </label>
            );
          })}

          {error && <div style={S.err}>{error}</div>}

          <button
            type="submit"
            disabled={submitting || closed || yourShares === 0 || !choice}
            style={{ ...S.btn, ...((submitting || closed || yourShares === 0 || !choice) ? S.btnDisabled : {}) }}
          >
            {submitting ? "Submitting…" : "Submit vote"}
          </button>
        </form>
      </main>
    </div>
  );
}
