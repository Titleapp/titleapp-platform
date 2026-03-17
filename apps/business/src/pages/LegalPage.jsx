import { useState, useEffect } from "react";

const LEGAL_DOCS = {
  "privacy-policy": { title: "Privacy Policy", updated: "March 2026" },
  "subscriber-data-rights": { title: "Subscriber Data Rights", updated: "March 2026" },
  "creator-agreement": { title: "Creator Agreement", updated: "March 2026" },
  "business-associate-agreement": { title: "Business Associate Agreement", updated: "March 2026" },
  "terms-of-service": { title: "Terms of Service", updated: "March 2026" },
};

export default function LegalPage({ slug }) {
  const doc = LEGAL_DOCS[slug];

  if (!doc) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", color: "#1a202c", marginBottom: "8px" }}>Document Not Found</h1>
          <a href="/" style={{ color: "#7c3aed", textDecoration: "none" }}>Back to TitleApp</a>
        </div>
      </div>
    );
  }

  const pdfUrl = `/legal/${slug}.pdf`;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{ color: "#7c3aed", fontWeight: 700, fontSize: "18px", textDecoration: "none" }}>TitleApp</a>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ color: "#64748b", fontSize: "14px" }}>Legal</span>
        </div>
        <a href="/" style={{ color: "#64748b", fontSize: "14px", textDecoration: "none" }}>Back</a>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1a202c", marginBottom: "4px" }}>{doc.title}</h1>
        <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>Last updated: {doc.updated}</p>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "24px" }}>
          <iframe
            src={pdfUrl}
            style={{ width: "100%", height: "80vh", border: "none" }}
            title={doc.title}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", background: "#7c3aed", color: "white",
              borderRadius: "8px", fontSize: "14px", fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Download PDF
          </a>
        </div>

        {/* Other legal documents */}
        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Other Legal Documents</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.entries(LEGAL_DOCS).filter(([s]) => s !== slug).map(([s, d]) => (
              <a key={s} href={`/legal/${s}`} style={{ color: "#7c3aed", fontSize: "14px", textDecoration: "none", padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>{d.title}</a>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
        &copy; 2026 TitleApp LLC
      </footer>
    </div>
  );
}
