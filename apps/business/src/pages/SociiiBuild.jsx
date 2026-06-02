import React, { useState } from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function postPublic(path, body) {
  const [bare] = String(path).split("?");
  const url = `${API_BASE}/api?path=${encodeURIComponent(bare)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function SociiiBuild() {
  const [form, setForm] = useState({
    name: "", email: "", company: "", role: "",
    problem: "", budget: "", timeframe: "",
  });
  const [status, setStatus] = useState({ idle: true });

  React.useEffect(() => {
    document.title = "Sociii Build — Concierge Worker Engineering for Fortune 500";
    const desc = "Sociii Build is the concierge engineering tier of SOCIII — bespoke Digital Workers authored by the platform team for enterprise customers. $500/hr engagement. For organizations that need custom workflow automation governed by audit + compliance.";
    function setMeta(selector, attr, value, createWith) {
      let el = document.querySelector(selector);
      if (!el && createWith) {
        el = document.createElement(createWith.tag);
        Object.entries(createWith.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
        document.head.appendChild(el);
      }
      if (el) el.setAttribute(attr, value);
    }
    setMeta('meta[name="description"]', "content", desc, { tag: "meta", attrs: { name: "description" } });
    setMeta('meta[property="og:title"]', "content", "Sociii Build — Concierge Worker Engineering", { tag: "meta", attrs: { property: "og:title" } });
    setMeta('meta[property="og:description"]', "content", desc, { tag: "meta", attrs: { property: "og:description" } });
    setMeta('meta[property="og:url"]', "content", "https://sociii.ai/build", { tag: "meta", attrs: { property: "og:url" } });
    setMeta('meta[property="og:type"]', "content", "website", { tag: "meta", attrs: { property: "og:type" } });
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image", { tag: "meta", attrs: { name: "twitter:card" } });
    setMeta('meta[name="twitter:title"]', "content", "Sociii Build — Concierge Worker Engineering", { tag: "meta", attrs: { name: "twitter:title" } });
    setMeta('meta[name="twitter:description"]', "content", desc, { tag: "meta", attrs: { name: "twitter:description" } });
    setMeta('link[rel="canonical"]', "href", "https://sociii.ai/build", { tag: "link", attrs: { rel: "canonical" } });

    // JSON-LD Service schema for the concierge offer
    let ld = document.querySelector('script[type="application/ld+json"][data-build="1"]');
    if (!ld) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.setAttribute("data-build", "1");
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Sociii Build",
      provider: { "@type": "Organization", name: "SOCIII Inc.", url: "https://sociii.ai" },
      serviceType: "Concierge Digital Worker engineering",
      description: desc,
      areaServed: "United States",
      url: "https://sociii.ai/build",
      offers: { "@type": "Offer", priceCurrency: "USD", price: "500", priceSpecification: { "@type": "UnitPriceSpecification", price: "500", priceCurrency: "USD", unitText: "per hour" } },
    });
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.problem) {
      setStatus({ error: "Please complete the required fields (name, email, problem)." });
      return;
    }
    setStatus({ submitting: true });
    try {
      const r = await postPublic("/v1/studio:intake", form);
      if (r.ok) {
        setStatus({ submitted: true, intakeId: r.intakeId });
      } else {
        setStatus({ error: r.error || "Submission failed. Please email build@sociii.ai directly." });
      }
    } catch (e) {
      setStatus({ error: "Network error. Please email build@sociii.ai directly." });
    }
  }

  if (status.submitted) {
    return (
      <div style={S.page}>
        <Header />
        <main style={S.main}>
          <div style={S.successCard}>
            <h1 style={S.successH1}>We received your inquiry.</h1>
            <p style={S.successBody}>
              A member of the Sociii Build team will reach out within one business day to schedule
              an intake call. The intake call takes about 45 minutes and we'll come prepared with
              questions about your problem space and audience.
            </p>
            <p style={S.successBody}>
              Reference ID: <code>{status.intakeId}</code>
            </p>
            <p style={S.successBody}>
              If you need to reach us before that call: <a href="mailto:build@sociii.ai">build@sociii.ai</a>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={S.page}>
      <Header />
      <main style={S.main}>
        <section style={S.hero}>
          <div style={S.heroBadge}>SOCIII BUILD</div>
          <h1 style={S.h1}>Concierge worker engineering for organizations that pay for outcome certainty.</h1>
          <p style={S.heroSub}>
            For practices, firms, and enterprises where the expertise is already in-house but the time to
            build a Digital Worker is not. We scope, build, deploy, and hand off — your Worker lives in your
            account on the SOCIII Marketplace from Day 1.
          </p>
        </section>

        <section style={S.howSection}>
          <h2 style={S.h2}>How it works</h2>
          <ol style={S.howList}>
            <li>
              <strong>Intake call</strong> — A 45-minute scoping call. We come prepared. You bring the expertise.
            </li>
            <li>
              <strong>Engagement proposal</strong> — Custom-scoped against your specific need. Hourly bid rate ($500/hour),
              fixed engagement scope. No package tiers.
            </li>
            <li>
              <strong>Build phase (1-3 weeks)</strong> — Our team authors the Worker. You review at key checkpoints.
            </li>
            <li>
              <strong>Delivery</strong> — Worker ships to the SOCIII Marketplace under your Creator account, with the
              "Built by Sociii Build" trust mark. You own it. 75% revenue split applies on all subscriptions.
            </li>
            <li>
              <strong>60 days of post-launch support</strong> included. Anything after that is renewal scope.
            </li>
          </ol>
        </section>

        <section style={S.whoSection}>
          <h2 style={S.h2}>Who Sociii Build is for</h2>
          <p style={S.whoBody}>
            Solo practices and small firms with established workflows and an existing client base — attorneys, CPAs,
            real estate brokers, title officers, aviation instructors, insurance specialists, family medicine practices.
            You have expertise. You have a list. You don't have a Saturday to install Git.
          </p>
          <p style={S.whoBody}>
            <strong>Sociii Build is NOT a self-service path.</strong> If you're comfortable in a terminal and want to build
            your Worker yourself, the <a href="/creators" style={S.inlineLink}>standard SOCIII creator path</a> is faster
            and free.
          </p>
        </section>

        <section style={S.formSection}>
          <h2 style={S.h2}>Tell us about your engagement</h2>
          <form onSubmit={submit} style={S.form}>
            <Field label="Name" value={form.name} onChange={(v) => update("name", v)} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
            <Field label="Company / Practice" value={form.company} onChange={(v) => update("company", v)} />
            <Field label="Your role" value={form.role} onChange={(v) => update("role", v)} placeholder="e.g. Managing Partner, Owner, COO" />
            <Field
              label="The problem you want a Worker to solve"
              value={form.problem}
              onChange={(v) => update("problem", v)}
              multiline
              required
              placeholder="What's the workflow? Who uses it today? What would success look like in 6 months?"
            />
            <div style={S.formRow}>
              <Field label="Budget range" value={form.budget} onChange={(v) => update("budget", v)} placeholder="e.g. $15-30K, $50K+, TBD" />
              <Field label="Timeframe" value={form.timeframe} onChange={(v) => update("timeframe", v)} placeholder="e.g. Q1 2027, ASAP, no rush" />
            </div>
            {status.error && <div style={S.formError}>{status.error}</div>}
            <button type="submit" disabled={status.submitting} style={S.submitBtn}>
              {status.submitting ? "Submitting…" : "Request an intake call"}
            </button>
            <div style={S.formFooter}>
              Or email <a href="mailto:build@sociii.ai" style={S.inlineLink}>build@sociii.ai</a> directly.
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline, required, placeholder }) {
  return (
    <label style={fS.label}>
      <span style={fS.labelText}>
        {label}{required && <span style={fS.required}> *</span>}
      </span>
      {multiline ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          rows={4} style={fS.textarea}
        />
      ) : (
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required} style={fS.input}
        />
      )}
    </label>
  );
}

function Header() {
  return (
    <header style={S.header}>
      <a href="/" style={S.logoLink}>
        <img src={sociiiMarkUrl} alt="" width={28} height={28} />
        <span style={S.logoText}>SOCIII</span>
      </a>
      <div style={S.headerRight}>
        <a href="/creators" style={S.headerLink}>Self-service path</a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={S.footer}>
      <span>SOCIII, Inc.</span>
      <span style={S.footerDot}>·</span>
      <a href="/legal/privacy-policy" style={S.footerLink}>Privacy</a>
      <span style={S.footerDot}>·</span>
      <a href="/legal/terms-of-service" style={S.footerLink}>Terms</a>
    </footer>
  );
}

const fS = {
  label: { display: "flex", flexDirection: "column", flex: 1 },
  labelText: { fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 },
  required: { color: "#dc2626" },
  input: {
    padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
    fontSize: 15, fontFamily: "inherit", outline: "none",
  },
  textarea: {
    padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
    fontSize: 15, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 100,
  },
};

const S = {
  page: {
    minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#0f172a",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", borderBottom: "1px solid #f0f0f0",
  },
  logoLink: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" },
  logoText: { fontSize: 20, fontWeight: 700 },
  headerRight: { display: "flex", gap: 24 },
  headerLink: { fontSize: 14, color: "#475569", textDecoration: "none" },

  main: { flex: 1, maxWidth: 720, margin: "0 auto", width: "100%", padding: "56px 32px" },

  hero: { marginBottom: 56 },
  heroBadge: {
    display: "inline-block", fontSize: 11, fontWeight: 700,
    color: "#fff", background: "#0f172a",
    padding: "5px 12px", borderRadius: 999, letterSpacing: "0.15em",
    marginBottom: 24,
  },
  h1: { fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-1px", marginBottom: 20 },
  heroSub: { fontSize: 18, color: "#475569", lineHeight: 1.55, maxWidth: 640 },

  h2: { fontSize: 22, fontWeight: 700, marginBottom: 20 },

  howSection: { marginBottom: 56 },
  howList: { paddingLeft: 24, lineHeight: 1.6, fontSize: 15, color: "#334155" },

  whoSection: { marginBottom: 56 },
  whoBody: { fontSize: 16, color: "#475569", lineHeight: 1.6, marginBottom: 16 },
  inlineLink: { color: "#7c3aed", textDecoration: "underline" },

  formSection: { marginBottom: 32 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formRow: { display: "flex", gap: 16 },
  formError: {
    fontSize: 14, color: "#dc2626", background: "#fee2e2",
    padding: 12, borderRadius: 8, marginTop: 4,
  },
  submitBtn: {
    background: "#7c3aed", color: "#fff", border: "none",
    padding: "14px 28px", borderRadius: 10, fontSize: 15,
    fontWeight: 600, cursor: "pointer", marginTop: 8,
  },
  formFooter: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8 },

  successCard: {
    maxWidth: 560, margin: "60px auto", padding: 40,
    background: "#f0fdf4", border: "1.5px solid #16a34a33", borderRadius: 16,
  },
  successH1: { fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#0f172a" },
  successBody: { fontSize: 15, color: "#334155", lineHeight: 1.6, marginBottom: 12 },

  footer: {
    padding: "24px 32px", borderTop: "1px solid #f0f0f0",
    fontSize: 13, color: "#94a3b8",
    display: "flex", justifyContent: "center", gap: 4,
  },
  footerDot: { color: "#cbd5e1" },
  footerLink: { color: "#64748b", textDecoration: "none" },
};
