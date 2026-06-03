import { useEffect, useState } from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const TITLE = "SOCIII — Investor Inquiry";
const DESCRIPTION = "Get the SOCIII investor materials. Whitepaper instantly; deck and intro from Kent Redwine shortly after.";
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function setHead() {
  document.title = TITLE;
  const set = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) return;
    el.setAttribute(attr, val);
  };
  set('meta[name="description"]', "content", DESCRIPTION);
  set('meta[property="og:title"]', "content", TITLE);
  set('meta[property="og:description"]', "content", DESCRIPTION);
}

export default function InvestorInquiry() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setHead(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("A valid email is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/leads:capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          email: form.email.trim(),
          company: form.company.trim() || null,
          message: form.message.trim() || null,
          vertical: "investor",
          source: "investor_inquiry_form",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(data.error || "Submission failed. Please email kent@sociii.ai directly.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Submission failed. Please email kent@sociii.ai directly.");
    } finally {
      setBusy(false);
    }
  }

  const S = {
    page: { minHeight: "100vh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a202c" },
    header: { borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", zIndex: 10 },
    brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
    brandText: { color: "#7c3aed", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" },
    main: { maxWidth: 640, margin: "0 auto", padding: "56px 24px 80px" },
    eyebrow: { color: "#7c3aed", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 },
    h1: { fontSize: 36, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 16px" },
    sub: { fontSize: 17, color: "#475569", lineHeight: 1.65, marginBottom: 32 },
    stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, margin: "0 0 40px", padding: "20px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
    stat: { textAlign: "center" },
    statVal: { fontSize: 22, fontWeight: 700, color: "#1a202c", lineHeight: 1.1 },
    statLbl: { fontSize: 12, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" },
    form: { display: "flex", flexDirection: "column", gap: 14, margin: "0 0 24px" },
    label: { fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
    input: { width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    textarea: { width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", minHeight: 90 },
    btn: { padding: "14px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 8 },
    err: { color: "#dc2626", fontSize: 14, marginTop: 4 },
    alt: { textAlign: "center", marginTop: 28, fontSize: 14, color: "#64748b" },
    altLink: { color: "#7c3aed", textDecoration: "none", borderBottom: "1px solid rgba(124,58,237,0.3)" },
    success: { padding: "32px", textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 },
    successH: { fontSize: 24, fontWeight: 700, marginBottom: 12 },
    successP: { fontSize: 16, color: "#475569", lineHeight: 1.6, margin: "0 0 20px" },
    successCta: { display: "inline-block", padding: "12px 24px", background: "#7c3aed", color: "#fff", borderRadius: 8, fontWeight: 600, textDecoration: "none" },
  };

  if (sent) {
    return (
      <div style={S.page}>
        <header style={S.header}>
          <a href="/" style={S.brand}>
            <img src={sociiiMarkUrl} alt="" width={28} height={28} style={{ borderRadius: 6 }} />
            <span style={S.brandText}>SOCIII</span>
          </a>
        </header>
        <main style={S.main}>
          <div style={S.success}>
            <div style={S.successH}>Thanks — materials on the way.</div>
            <p style={S.successP}>
              A confirmation just landed in your inbox with the SOCIII whitepaper. Kent Redwine,
              our Cofounder Advisor on capital formation, will follow up shortly with the deck
              and a calendar link.
            </p>
            <a href="/whitepaper" style={S.successCta}>Read the whitepaper now →</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/" style={S.brand}>
          <img src={sociiiMarkUrl} alt="" width={28} height={28} style={{ borderRadius: 6 }} />
          <span style={S.brandText}>SOCIII</span>
        </a>
      </header>
      <main style={S.main}>
        <div style={S.eyebrow}>Investors</div>
        <h1 style={S.h1}>Get the SOCIII materials.</h1>
        <p style={S.sub}>
          Tell us a little about yourself and we'll send the whitepaper now and the
          investor deck shortly. Kent Redwine (Cofounder Advisor — capital formation)
          runs point on the round and will follow up directly.
        </p>

        <div style={S.stats}>
          <div style={S.stat}><div style={S.statVal}>1,000+</div><div style={S.statLbl}>Digital workers</div></div>
          <div style={S.stat}><div style={S.statVal}>Patent</div><div style={S.statLbl}>Audit-trail substrate</div></div>
          <div style={S.stat}><div style={S.statVal}>Open</div><div style={S.statLbl}>Source SDK</div></div>
        </div>

        <form style={S.form} onSubmit={submit}>
          <div>
            <label style={S.label} htmlFor="name">Name</label>
            <input id="name" style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          </div>
          <div>
            <label style={S.label} htmlFor="email">Email *</label>
            <input id="email" style={S.input} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@firm.com" />
          </div>
          <div>
            <label style={S.label} htmlFor="company">Firm / Organization</label>
            <input id="company" style={S.input} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label style={S.label} htmlFor="message">Anything specific you'd like Kent to know?</label>
            <textarea id="message" style={S.textarea} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Optional — your thesis, check size, sector focus, etc." />
          </div>
          {error && <div style={S.err}>{error}</div>}
          <button style={{ ...S.btn, opacity: busy ? 0.7 : 1 }} type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send me the materials"}
          </button>
        </form>

        <div style={S.alt}>
          Prefer to read first? <a href="/whitepaper" style={S.altLink}>Open the public whitepaper</a>.
        </div>
      </main>
    </div>
  );
}
