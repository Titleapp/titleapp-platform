import { useEffect } from "react";
import { auth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function logVisit(docId, action) {
  try {
    let token = null;
    try { if (auth.currentUser) token = await auth.currentUser.getIdToken(); } catch { /* ignore */ }
    if (!token) token = localStorage.getItem("ID_TOKEN");
    await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/canonical-docs:log")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ workerSlug: "fundraise", docId, action }),
    });
  } catch { /* non-blocking */ }
}

const TITLE = "SOCIII Whitepaper — Governed AI Workers for Regulated Professions";
const DESCRIPTION = "How SOCIII captures expert judgment into rule-governed AI workers with cryptographic audit trails. The four-tier RAAS rules engine, no-code authoring, and why regulation is local.";
const CANONICAL = "https://sociii.ai/whitepaper";
const DOCX_URL = "/whitepaper/SOCIII-Whitepaper.docx";

function setHead() {
  document.title = TITLE;
  const set = (selector, attr, value) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith("meta") ? "meta" : "link");
      const attrs = selector.match(/\[([^=]+)="([^"]+)"\]/g) || [];
      attrs.forEach(a => {
        const [k, v] = a.replace(/[[\]"]/g, "").split("=");
        el.setAttribute(k, v);
      });
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  set('meta[name="description"]', "content", DESCRIPTION);
  set('meta[property="og:title"]', "content", TITLE);
  set('meta[property="og:description"]', "content", DESCRIPTION);
  set('meta[property="og:url"]', "content", CANONICAL);
  set('meta[property="og:type"]', "content", "article");
  set('meta[name="twitter:title"]', "content", TITLE);
  set('meta[name="twitter:description"]', "content", DESCRIPTION);
  set('link[rel="canonical"]', "href", CANONICAL);
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#fff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1a202c",
  },
  header: {
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  brand: {
    color: "#7c3aed",
    fontWeight: 700,
    fontSize: "18px",
    textDecoration: "none",
    letterSpacing: "-0.02em",
  },
  crumbSep: { color: "#cbd5e1" },
  crumbLabel: { color: "#64748b", fontSize: "14px" },
  downloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: "#7c3aed",
    color: "white",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
  },
  main: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "56px 24px 80px",
  },
  eyebrow: {
    color: "#7c3aed",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "12px",
  },
  h1: {
    fontSize: "40px",
    lineHeight: "1.15",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: "0 0 16px",
  },
  subtitle: {
    fontSize: "18px",
    color: "#475569",
    lineHeight: "1.6",
    marginBottom: "32px",
  },
  meta: {
    color: "#94a3b8",
    fontSize: "13px",
    marginBottom: "40px",
    paddingBottom: "24px",
    borderBottom: "1px solid #e2e8f0",
  },
  abstract: {
    background: "#f8fafc",
    borderLeft: "4px solid #7c3aed",
    padding: "20px 24px",
    margin: "0 0 40px",
    borderRadius: "6px",
    fontSize: "15.5px",
    lineHeight: "1.7",
    color: "#334155",
  },
  h2: {
    fontSize: "26px",
    fontWeight: 700,
    lineHeight: "1.25",
    letterSpacing: "-0.01em",
    margin: "48px 0 16px",
  },
  p: {
    fontSize: "16px",
    lineHeight: "1.75",
    color: "#1e293b",
    margin: "0 0 18px",
  },
  callout: {
    background: "#fafafa",
    borderLeft: "3px solid #cbd5e1",
    padding: "16px 20px",
    borderRadius: "4px",
    fontSize: "15px",
    lineHeight: "1.7",
    color: "#475569",
    margin: "20px 0 28px",
    fontStyle: "italic",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "20px 0 28px",
    fontSize: "14.5px",
  },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    borderBottom: "2px solid #e2e8f0",
    color: "#64748b",
    fontWeight: 600,
    fontSize: "12.5px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    color: "#1e293b",
    lineHeight: "1.6",
  },
  tdTier: {
    fontWeight: 600,
    color: "#1a202c",
    width: "140px",
    whiteSpace: "nowrap",
  },
  industries: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
    margin: "20px 0 28px",
  },
  industryItem: {
    padding: "14px 16px",
    background: "#f8fafc",
    borderRadius: "8px",
    fontSize: "14.5px",
    lineHeight: "1.55",
  },
  industryName: {
    fontWeight: 600,
    color: "#1a202c",
    display: "block",
    marginBottom: "4px",
  },
  industryDesc: {
    color: "#64748b",
    fontSize: "13.5px",
  },
  footer: {
    marginTop: "64px",
    paddingTop: "24px",
    borderTop: "1px solid #e2e8f0",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: "1.7",
  },
  inlineLink: {
    color: "#7c3aed",
    textDecoration: "none",
    borderBottom: "1px solid rgba(124,58,237,0.3)",
  },
};

const INDUSTRIES = [
  ["Aviation", "Flight planning, logbook, and risk-assessment workers under FAR/AIM."],
  ["Real Estate", "Commercial analysis, cap-rate, and lease-review workers."],
  ["Auto Dealer", "Finance-and-insurance, VIN decode, and deal-desk workers."],
  ["Title & Escrow", "Title-search and document-control workers built on the digital-title audit layer."],
  ["Web3", "Governance, treasury, and token-analytics workers."],
  ["Government", "Recording, permitting, licensing, and inspection workflows."],
  ["Health / EMS", "Nursing-assessment and protocol-advisor workers under clinical rules."],
  ["Solar", "Site, compliance, and documentation workers."],
  ["Banking", "Coming online now; the newest industry on the platform."],
];

export default function Whitepaper() {
  useEffect(() => {
    setHead();
    logVisit("whitepaper", "page_view");
    // JSON-LD structured data for richer search indexing
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: TITLE,
      description: DESCRIPTION,
      author: { "@type": "Organization", name: "SOCIII, Inc." },
      publisher: {
        "@type": "Organization",
        name: "SOCIII, Inc.",
        url: "https://sociii.ai",
      },
      datePublished: "2026-05-01",
      dateModified: "2026-05-28",
      mainEntityOfPage: CANONICAL,
    });
    document.head.appendChild(ld);
    return () => { document.head.removeChild(ld); };
  }, []);

  return (
    <article style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <a href="/" style={styles.brand}>SOCIII</a>
          <span style={styles.crumbSep}>/</span>
          <span style={styles.crumbLabel}>Whitepaper</span>
        </div>
        <a href={DOCX_URL} style={styles.downloadBtn} download onClick={() => logVisit("whitepaper", "download")}>Download .docx</a>
      </header>

      <main style={styles.main}>
        <div style={styles.eyebrow}>White Paper · May 2026</div>
        <h1 style={styles.h1}>Governed AI Workers for Regulated Professions.</h1>
        <p style={styles.subtitle}>
          How SOCIII captures expert judgment, governs every output against the
          rules of the field, and records every decision in a cryptographic audit
          trail.
        </p>
        <div style={styles.meta}>SOCIII, Inc. · Delaware C-Corporation · Las Vegas, Nevada</div>

        <div style={styles.abstract}>
          <strong>Abstract.</strong> This paper explains what SOCIII is, the problem
          it addresses, and how the platform works. SOCIII is a platform on which
          domain experts build, govern, and earn from AI workers that operate inside
          the rules of their professions. It exists because a generation of
          practitioners holds judgment that no textbook captures, and because
          general-purpose AI — fluent but unaccountable — cannot safely do
          regulated work. The sections below describe the digital-worker model, the
          four-tier rules engine that governs every output, the cryptographic audit
          trail that makes each decision provable, the no-code authoring path that
          lets experts build without engineers, and the reasons regulation forces
          all of this to be local and verifiable rather than generic.
        </div>

        <h2 style={styles.h2}>1. The premise</h2>
        <p style={styles.p}>
          Two facts sit underneath everything SOCIII does. First, the most valuable
          knowledge in regulated work is experiential, not written down. The ICU
          nurse with twenty years at the bedside, the master mechanic who diagnoses
          by sound, the title clerk who knows a county's unwritten practices, the
          broker who has lived through three market cycles — their judgment is
          real, durable, and largely undocumented. As that generation retires, the
          judgment leaves with them.
        </p>
        <p style={styles.p}>
          Second, general-purpose AI is fluent but unaccountable. A consumer
          chatbot will answer a question about approach minima, a controlled-substance
          dose, or a securities disclosure with the same confident tone it uses for
          a dinner recipe. In a regulated setting, a confident wrong answer is not
          a harmless error — it is a safety event, a compliance breach, or a
          liability. The model has no structural obligation to the rules of the
          domain, and no record of what it decided or why.
        </p>
        <p style={styles.p}>
          SOCIII addresses both at once: it captures the expert's judgment into a
          digital worker, and it wraps every one of that worker's outputs in
          enforced rules and a permanent audit trail. The expert keeps practicing;
          the worker scales their knowledge to colleagues, juniors, and the next
          generation; and every action the worker takes is governed before it
          commits and provable after the fact.
        </p>

        <h2 style={styles.h2}>2. What a digital worker is</h2>
        <p style={styles.p}>
          A digital worker is not a chatbot with a costume. It is a scoped,
          rule-governed software agent built to do one job well inside one
          profession — flight planning for a specific aircraft type, a nursing
          assessment under a hospital's protocols, an F&amp;I close at an auto
          dealership, a cap-rate analysis for commercial real estate. Each worker
          carries the domain knowledge of the expert who authored it, the regulatory
          context of its industry, and the operating policies of the organization
          that deploys it.
        </p>
        <p style={styles.p}>
          The difference that matters is governance. A worker proposes an output;
          the rules engine evaluates that output against a composed hierarchy of
          constraints; and only a validated result reaches the user. The worker is
          therefore less like a freewheeling assistant and more like a licensed
          practitioner working inside a compliance framework — capable, but
          bounded.
        </p>
        <div style={styles.callout}>
          The unit of the platform. Built once by someone who knows the work,
          operated continuously, governed on every output, and recorded for audit.
          A worker is durable infrastructure, not a single conversation.
        </div>

        <h2 style={styles.h2}>3. RAAS — the four-tier rules engine</h2>
        <p style={styles.p}>
          SOCIII's governance layer is called RAAS: Rules + AI-as-a-Service. Every
          worker output passes through four tiers of rules, composed in order,
          before it is allowed to commit. The model proposes; the rules engine
          disposes.
        </p>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tier</th>
              <th style={styles.th}>What it governs</th>
              <th style={styles.th}>Who controls it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...styles.td, ...styles.tdTier }}>Tier 0<br />Platform Safety</td>
              <td style={styles.td}>Universal safety invariants. Violence, protected health information, and harmful content are blocked on every worker. Cannot be overridden by anyone.</td>
              <td style={styles.td}>SOCIII, immutable</td>
            </tr>
            <tr>
              <td style={{ ...styles.td, ...styles.tdTier }}>Tier 1<br />Industry Regulations</td>
              <td style={styles.td}>Real statutes and standards: FAR/AIM in aviation, NCLEX-aligned practice in nursing, state real-estate law, HIPAA, Reg D in securities. Compiled once and treated as immutable for the deployment.</td>
              <td style={styles.td}>Compiled from law</td>
            </tr>
            <tr>
              <td style={{ ...styles.td, ...styles.tdTier }}>Tier 2<br />Operator Policies</td>
              <td style={styles.td}>The deploying organization's own rules — hospital protocols, dealership SOPs, a company operations manual. Specific to one operator.</td>
              <td style={styles.td}>Creator / operator-editable</td>
            </tr>
            <tr>
              <td style={{ ...styles.td, ...styles.tdTier }}>Tier 3<br />User Preferences</td>
              <td style={styles.td}>Individual settings and context that personalize a worker, always within every tier above. Makes the worker feel personal without loosening any constraint.</td>
              <td style={styles.td}>Subscriber-editable</td>
            </tr>
          </tbody>
        </table>
        <p style={styles.p}>
          The ordering is the point. A user preference can never relax an operator
          policy; an operator policy can never relax a regulation; a regulation can
          never relax platform safety. Compliance is a property of the structure,
          not a disclaimer bolted on at the end.
        </p>

        <h2 style={styles.h2}>4. The audit trail</h2>
        <p style={styles.p}>
          Because the workers operate in regulated settings, what they did has to
          be provable later — to a regulator, a court, or a counterparty. SOCIII
          records every significant output in an append-only audit trail. Each
          record binds together the worker and its version, the input that
          triggered the decision, the exact version of the rule set in effect at
          that moment, the rule-by-rule evaluation outcome, the worker's output,
          and the final action taken — executed, blocked, or routed to a human.
        </p>
        <p style={styles.p}>
          A cryptographic hash of each record is anchored to a public blockchain,
          which provides tamper-evidence: the record is provably unchanged from the
          time of the decision. The full payload, which often contains sensitive
          data, is kept in encrypted off-chain storage accessible only to
          authorized parties. This split — hash on-chain, data off-chain — gives
          the tamper-evidence of a blockchain with the confidentiality regulated
          industries require. An authorized auditor can present a hash and
          retrieve exactly the record it corresponds to, and nothing else.
        </p>
        <p style={styles.p}>
          This architecture is the subject of SOCIII's patent filings — a family
          of U.S. provisional applications filed May 2026, covering the audit
          trail, the rules engine, the no-code authoring pipeline, document
          control, the digital-title primitive, and the knowledge-capture
          pipeline. The audit layer itself descends from earlier
          blockchain-anchored title work, now repurposed to make AI decisions
          investigable.
        </p>

        <h2 style={styles.h2}>5. Build without code</h2>
        <p style={styles.p}>
          The platform's accessibility thesis is that the people who should build
          workers are the people who know the work — not the people who know how
          to code. SOCIII offers two authoring paths. In the Sandbox, a domain
          expert describes their work and its rules in plain conversation, and the
          platform composes a worker around that description; no programming is
          required. In the Terminal, engineers pair-program with AI to build
          workers in code. Both paths emit workers governed by the same rules
          engine and recorded by the same audit trail.
        </p>
        <p style={styles.p}>
          This is what turns expertise into recurring income. A practitioner builds
          a worker in an afternoon, their colleagues subscribe, and the creator
          earns a majority share of every subscription against the worker they
          authored. The platform's growth is therefore bounded by the number of
          professionals willing to participate, not by the number of engineers a
          company can hire — a fundamentally larger pool.
        </p>

        <h2 style={styles.h2}>6. Why regulation is local</h2>
        <p style={styles.p}>
          Regulated work does not run on universal rules; it runs on jurisdictional
          ones. Nevada records a deed differently than California. A maintenance
          interval legal in one operation is out of limits in another. A
          disclosure adequate in one state is deficient next door. This is why
          every SOCIII worker is state-aware: the same worker enforces different
          constraints depending on where and for whom it operates. A generic model
          trained on the average of the internet cannot do this, because the
          correct answer is not the average — it is the specific rule that applies
          to this jurisdiction, this operator, and this moment.
        </p>

        <h2 style={styles.h2}>7. The platform builds the platform</h2>
        <p style={styles.p}>
          SOCIII runs its own company on its own workers. The functions a startup
          would normally hire for — finance, marketing, people operations, investor
          relations, customer relationship management, the chief-of-staff role
          that routes work across the team — are themselves digital workers
          deployed internally, governed by the same rules engine and recorded by
          the same audit trail as any customer's worker. There is no separate
          "internal version" of the product.
        </p>
        <p style={styles.p}>
          This has two consequences. The first is capital efficiency: the
          production platform was built across eight industries on roughly
          $35,000 of operating burn over five months, because the platform was
          building itself as it went. The second is credibility: every
          operational problem SOCIII hits is a problem its customers also hit,
          discovered from inside the work rather than guessed at from outside it.
        </p>
        <div style={styles.callout}>
          A compounding system. Every new worker, rule set, and industry adds to
          the platform rather than restarting it. The cost curve bends down as
          coverage grows, because the same governance, audit, and authoring
          machinery serves each new domain.
        </div>

        <h2 style={styles.h2}>8. Where it runs today</h2>
        <p style={styles.p}>
          SOCIII is in production, not in pilot. More than 1,000 rule-governed
          workers (state-augmented) operate across eight regulated industries
          today, with Banking coming online now and new industries added
          regularly:
        </p>
        <div style={styles.industries}>
          {INDUSTRIES.map(([name, desc]) => (
            <div key={name} style={styles.industryItem}>
              <span style={styles.industryName}>{name}</span>
              <span style={styles.industryDesc}>{desc}</span>
            </div>
          ))}
        </div>

        <h2 style={styles.h2}>9. The economic model, briefly</h2>
        <p style={styles.p}>
          SOCIII earns across five streams so that no single behavior has to
          dominate for the platform to work: Subscription, Data Credits, API
          Pass-Through, Audit Trail, and Creator License — three of which run at
          near-100% gross margin. Subscriptions span individual workers
          ($29/$49/$79 per month), a Business in a Box ($99, every worker a
          specific business needs), and all workers ($299). Data Credits meter
          usage above each subscription's baseline; API Pass-Through marks up
          third-party data and inference; the Audit Trail bills per anchored
          record; and a Creator License lets domain experts publish workers and
          keep the majority of subscription revenue. Subscriptions are how
          customers enter; compute, data, and audit records are how the platform
          earns at scale. As headline AI subscription prices fall across the
          industry, the entry barrier drops and usage volume rises — which moves
          more revenue onto the compute, data, and audit lines rather than less.
        </p>

        <h2 style={styles.h2}>10. Why it matters</h2>
        <p style={styles.p}>
          The agent-platform category is forming now, and most entrants are
          building for engineers or for general consumers. SOCIII's bet is
          narrower and, it argues, more durable: that the platforms which compound
          in regulated, high-judgment professions will be the ones where the
          practitioners themselves can build, where every output is governed by
          the actual rules of the field, and where every decision is provable
          after the fact. Expertise becomes infrastructure; compliance becomes
          structural; and the knowledge that would otherwise retire with a
          generation of professionals becomes something their communities can keep
          using.
        </p>

        <footer style={styles.footer}>
          <p style={{ margin: "0 0 8px" }}>
            This white paper is for general informational and educational
            purposes. It is not an offer to sell or a solicitation to buy any
            security, and it is not investment, legal, or tax advice. Product
            capabilities, figures, and roadmap items described here are current as
            of May 2026 and subject to change.
          </p>
          <p style={{ margin: 0 }}>
            SOCIII, Inc. — Delaware C-Corporation, Las Vegas, Nevada ·{" "}
            <a href="mailto:alex@sociii.ai" style={styles.inlineLink}>alex@sociii.ai</a> ·{" "}
            <a href="https://www.sociii.ai" style={styles.inlineLink}>www.sociii.ai</a>
          </p>
        </footer>
      </main>
    </article>
  );
}
