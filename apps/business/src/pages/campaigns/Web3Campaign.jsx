import React from "react";

const S = {
  page: { minHeight: "100vh", background: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: 0, zIndex: 10 },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none" },
  navCta: { fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", padding: "8px 20px", borderRadius: 8, textDecoration: "none", border: "none", cursor: "pointer" },
  hero: { maxWidth: 720, margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" },
  h1: { fontSize: 40, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.02em" },
  subhead: { fontSize: 18, color: "#4b5563", lineHeight: 1.6, marginBottom: 40 },
  ctaRow: { display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  primaryBtn: { fontSize: 16, fontWeight: 600, color: "#fff", background: "#7c3aed", padding: "14px 32px", borderRadius: 10, border: "none", cursor: "pointer", textDecoration: "none" },
  secondaryLink: { fontSize: 14, color: "#7c3aed", textDecoration: "none", fontWeight: 500 },
  valueSection: { maxWidth: 880, margin: "0 auto", padding: "64px 24px", display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" },
  valueProp: { flex: "1 1 250px", maxWidth: 280, textAlign: "center" },
  valueIcon: { width: 48, height: 48, borderRadius: 12, background: "#f3f0ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#7c3aed" },
  valueTitle: { fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 },
  valueDesc: { fontSize: 14, color: "#6b7280", lineHeight: 1.5 },
  workerSection: { maxWidth: 960, margin: "0 auto", padding: "48px 24px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24, textAlign: "center" },
  tabs: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 },
  tab: { padding: "8px 20px", fontSize: 14, fontWeight: 500, color: "#6b7280", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 20, cursor: "pointer" },
  tabActive: { color: "#7c3aed", background: "#f3f0ff", borderColor: "#e9d5ff" },
  workerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 },
  workerCard: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fafbfc" },
  wcName: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4 },
  wcDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 8 },
  wcPrice: { fontSize: 14, fontWeight: 600, color: "#7c3aed" },
  socialProof: { textAlign: "center", padding: "32px 24px", fontSize: 15, color: "#94a3b8", fontStyle: "italic" },
  bottomCta: { textAlign: "center", padding: "64px 24px 120px" },
  bottomHeadline: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 16 },
  footer: { textAlign: "center", padding: "24px", borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#94a3b8" },
};

const WORKERS = {
  make_money: [
    { id: "W3-001", name: "Token Economics Modeler", desc: "Model tokenomics, supply curves, vesting schedules, and distribution strategies.", price: "$49/mo" },
    { id: "W3-002", name: "NFT Launch Strategist", desc: "Plan collection launches, rarity tiers, reveal mechanics, and secondary market strategy.", price: "$49/mo" },
    { id: "W3-010", name: "Community IR", desc: "Investor relations for token communities — updates, AMAs, treasury reports.", price: "$49/mo" },
    { id: "W3-012", name: "Token Code Generator", desc: "Generate SPL and ERC-20/721/1155 token contracts. Solana and EVM. You deploy.", price: "$49/mo" },
  ],
  stay_compliant: [
    { id: "W3-003", name: "Regulatory Framing", desc: "Frame tokens as collectibles/utility, not securities. Jurisdiction-aware compliance language.", price: "$79/mo" },
    { id: "W3-004", name: "Smart Contract Audit Prep", desc: "Pre-audit checklist, vulnerability scan, documentation package for auditors.", price: "$79/mo" },
    { id: "W3-005", name: "Treasury Reporter", desc: "On-chain treasury tracking, wallet reconciliation, public reporting.", price: "$29/mo" },
    { id: "W3-006", name: "Governance Docs", desc: "DAO constitution, proposal templates, voting procedures, amendment process.", price: "$49/mo" },
    { id: "W3-013", name: "Contract Auditor", desc: "Automated rugpull pattern detection, reentrancy checks, access control review.", price: "$79/mo" },
  ],
  save_money: [
    { id: "W3-007", name: "Telegram Manager", desc: "Community management, FAQ automation, scam detection, engagement analytics.", price: "$49/mo" },
    { id: "W3-008", name: "X / Social Narrative", desc: "Thread writing, announcement drafts, sentiment-aligned posting schedule.", price: "$49/mo" },
    { id: "W3-009", name: "Social Listening", desc: "Real-time mentions, sentiment tracking, competitor monitoring across platforms.", price: "$49/mo" },
  ],
};

export default function Web3Campaign() {
  const [tab, setTab] = React.useState("make_money");

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        <a href="https://app.titleapp.ai/meet-alex?vertical=web3" style={S.navCta}>Talk to Alex</a>
      </nav>

      <section style={S.hero}>
        <h1 style={S.h1}>Your Web3 Project. Verified. Compliant. Unstoppable.</h1>
        <p style={S.subhead}>TitleApp gives Web3 teams the compliance infrastructure, community operations, and technical tools to build with credibility. All receipts. All the time.</p>
        <div style={S.ctaRow}>
          <a href="https://app.titleapp.ai/meet-alex?vertical=web3" style={S.primaryBtn}>Talk to Alex</a>
          <a href="#workers" style={S.secondaryLink}>See the workers &rarr;</a>
        </div>
      </section>

      <section style={S.valueSection}>
        <div style={S.valueProp}>
          <div style={S.valueIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 22 5"/></svg>
          </div>
          <div style={S.valueTitle}>Verified Team</div>
          <div style={S.valueDesc}>Every team member identity-verified. Anonymous teams cannot use TitleApp Web3 Suite. Your community deserves to know who is building for them.</div>
        </div>
        <div style={S.valueProp}>
          <div style={S.valueIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div style={S.valueTitle}>All Receipts</div>
          <div style={S.valueDesc}>Every document signed, timestamped, and blockchain-anchored. Treasury reports, governance votes, audit prep, legal framing — all in your public Document Vault.</div>
        </div>
        <div style={S.valueProp}>
          <div style={S.valueIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <div style={S.valueTitle}>Generate. Audit. Launch.</div>
          <div style={S.valueDesc}>Token code generator for Solana and EVM. Contract auditor that catches rugpull patterns before deployment. Then mint wherever you want — we generate and audit, not mint.</div>
        </div>
      </section>

      <section style={S.workerSection} id="workers">
        <div style={S.sectionTitle}>Digital Workers for Web3</div>
        <div style={S.tabs}>
          {[{ key: "make_money", label: "Make Money" }, { key: "stay_compliant", label: "Stay Compliant" }, { key: "save_money", label: "Save Money" }].map(t => (
            <button key={t.key} style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        <div style={S.workerGrid}>
          {WORKERS[tab].map(w => (
            <div key={w.id} style={S.workerCard}>
              <div style={S.wcName}>{w.name}</div>
              <div style={S.wcDesc}>{w.desc}</div>
              <div style={S.wcPrice}>{w.price}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={S.socialProof}>Web3 projects using TitleApp operate with verified teams, transparent treasuries, and compliant communications.</div>

      <section style={S.bottomCta}>
        <div style={S.bottomHeadline}>Your community deserves receipts. Build with TitleApp.</div>
        <a href="https://app.titleapp.ai/meet-alex?vertical=web3" style={S.primaryBtn}>Start with Alex</a>
      </section>

      <footer style={S.footer}>&copy; {new Date().getFullYear()} TitleApp. All rights reserved.</footer>
    </div>
  );
}
