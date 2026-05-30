import { useEffect } from "react";

const TITLE = "SOCIII Investor Data Room";
const DESCRIPTION = "Canonical pre-seed materials for accredited investors. Memorandum, deck, post-money SAFE, NDA, warrant, patent portfolio.";

const DOCS = [
  {
    section: "Investment thesis",
    items: [
      { title: "Investor Memorandum (v2)",       file: "SOCIII-Investor-Memorandum-v2.docx", note: "Long-form thesis + market + financials" },
      { title: "Investor Deck (v3)",             file: "SOCIII-InvestorDeck-v3.pptx",        note: "12-slide pitch" },
    ],
  },
  {
    section: "Deal documents",
    items: [
      { title: "Post-Money SAFE",                file: "SOCIII-Post-Money-SAFE.docx",        note: "Y Combinator standard, $10M cap" },
      { title: "Mutual NDA",                     file: "SOCIII-Mutual-NDA.docx",             note: "For diligence conversations" },
      { title: "HOMMIE Warrant",                 file: "SOCIII-HOMMIE-Warrant.docx",         note: "Bridge-holder warrant template" },
    ],
  },
  {
    section: "IP + technical",
    items: [
      { title: "Patent Portfolio (2026-05-24)",  file: "SOCIII-Patent-Portfolio.docx",       note: "6 provisional filings + continuation thread" },
    ],
  },
];

function setHead() {
  document.title = TITLE;
  const set = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement(sel.startsWith("meta") ? "meta" : "link");
      const matches = sel.match(/\[([^=]+)="([^"]+)"\]/g) || [];
      matches.forEach(m => {
        const [k, v] = m.replace(/[[\]"]/g, "").split("=");
        el.setAttribute(k, v);
      });
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };
  set('meta[name="description"]', "content", DESCRIPTION);
  set('meta[name="robots"]', "content", "noindex,nofollow");
}

const S = {
  page:     { minHeight: "100vh", background: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1a202c" },
  header:   { borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" },
  brand:    { color: "#7c3aed", fontWeight: 700, fontSize: 18, textDecoration: "none" },
  hero:     { maxWidth: 900, margin: "0 auto", padding: "48px 24px 32px" },
  eyebrow:  { color: "#0686D4", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" },
  h1:       { fontSize: 32, fontWeight: 800, marginTop: 8, color: "#1a202c", lineHeight: 1.15 },
  lead:     { fontSize: 15, color: "#475569", marginTop: 12, lineHeight: 1.6, maxWidth: 640 },
  body:     { maxWidth: 900, margin: "0 auto", padding: "16px 24px 80px" },
  section:  { marginTop: 40 },
  sectionH: { fontSize: 14, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 },
  list:     { display: "flex", flexDirection: "column", gap: 10 },
  row:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", textDecoration: "none", color: "#1a202c" },
  rowLeft:  { display: "flex", alignItems: "center", gap: 12 },
  icon:     { width: 32, height: 32, borderRadius: 6, background: "#ede9fe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 },
  rowTitle: { fontSize: 14, fontWeight: 600 },
  rowNote:  { fontSize: 12, color: "#64748b", marginTop: 2 },
  download: { fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.04em" },
  footnote: { marginTop: 48, padding: "20px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#475569", lineHeight: 1.6 },
};

function extLabel(file) {
  const ext = (file.split(".").pop() || "").toUpperCase();
  return ext.length <= 4 ? ext : "DOC";
}

export default function DataRoom() {
  useEffect(() => { setHead(); }, []);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <a href="/" style={S.brand}>SOCIII</a>
        <div style={{ fontSize: 13, color: "#64748b" }}>Investor data room</div>
      </div>

      <div style={S.hero}>
        <div style={S.eyebrow}>SOCIII Inc. · Pre-seed</div>
        <h1 style={S.h1}>Investor data room</h1>
        <p style={S.lead}>
          The canonical materials for the SOCIII pre-seed round. Documents are versioned
          and shared with accredited investors after onboarding. Direct any questions to
          sean@sociii.ai.
        </p>
      </div>

      <div style={S.body}>
        {DOCS.map(group => (
          <div key={group.section} style={S.section}>
            <div style={S.sectionH}>{group.section}</div>
            <div style={S.list}>
              {group.items.map(doc => (
                <a key={doc.file} href={`/data-room/${doc.file}`} style={S.row}>
                  <div style={S.rowLeft}>
                    <div style={S.icon}>{extLabel(doc.file)}</div>
                    <div>
                      <div style={S.rowTitle}>{doc.title}</div>
                      <div style={S.rowNote}>{doc.note}</div>
                    </div>
                  </div>
                  <div style={S.download}>Download →</div>
                </a>
              ))}
            </div>
          </div>
        ))}

        <div style={S.footnote}>
          <strong>Confidential.</strong> Distribution limited to accredited investors under
          mutual NDA. Do not forward without sender consent. SOCIII Inc., Delaware C-corp,
          EIN 42-2675951.
        </div>
      </div>
    </div>
  );
}
