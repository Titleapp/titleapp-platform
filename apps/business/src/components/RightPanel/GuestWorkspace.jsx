import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Default bucket per vertical
const DEFAULT_BUCKET = {
  solar_vpp: "stay_compliant",
  aviation: "stay_compliant",
  auto_dealer: "make_money",
  real_estate_development: "make_money",
  re_operations: "save_money",
  creators: "make_money",
};

const VERTICAL_MAP = {
  "auto-dealer": "auto_dealer", auto: "auto_dealer", dealer: "auto_dealer",
  solar: "solar_vpp", "solar-vpp": "solar_vpp",
  "real-estate": "real_estate_development", re: "real_estate_development",
  "property-management": "re_operations", pm: "re_operations",
  aviation: "aviation", pilot: "aviation",
  creator: "creators", creators: "creators", developer: "creators",
};

const BUCKETS = [
  { key: "make_money", label: "Make Money" },
  { key: "save_money", label: "Save Money" },
  { key: "stay_compliant", label: "Stay Compliant" },
];

const LANGUAGES = [
  "English", "Espanol", "Portugues", "Francais", "Deutsch", "Italiano",
  "中文", "粤語", "日本語", "한국어", "हिन्दी", "العربية", "Українська",
  "Tieng Viet", "ภาษาไทย", "Bahasa", "Filipino", "Русский", "Polski",
  "Turkce", "Ελληνικά", "Nederlands", "Svenska",
];

const S = {
  wrap: { height: "100%", display: "flex", flexDirection: "column", background: "#0f172a", color: "#e2e8f0", overflowY: "auto" },
  statsBar: { padding: "16px 20px", borderBottom: "1px solid #1e293b", flexShrink: 0 },
  statsRow: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 600, color: "#94a3b8" },
  statItem: { display: "flex", alignItems: "center", gap: 4 },
  statNum: { color: "#e2e8f0", fontWeight: 700 },
  langRow: { display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: "#475569", marginTop: 10 },
  langNote: { fontSize: 11, color: "#64748b", marginTop: 6, fontStyle: "italic" },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid #1e293b", flexShrink: 0 },
  tab: { flex: 1, padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#64748b", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", textAlign: "center", transition: "color 0.2s" },
  tabActive: { color: "#e2e8f0", borderBottomColor: "#7c3aed" },
  cardList: { flex: 1, padding: 16, overflowY: "auto" },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer", transition: "border-color 0.2s" },
  cardHighlight: { borderColor: "#7c3aed", boxShadow: "0 0 0 1px rgba(124,58,237,0.3)" },
  cardName: { fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  priceBadge: { fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12, background: "rgba(124,58,237,0.15)", color: "#a78bfa" },
  statusBadge: { fontSize: 11, fontWeight: 600 },
  statusLive: { color: "#10b981" },
  statusSoon: { color: "#f59e0b" },
  detailPanel: { padding: 20, borderTop: "1px solid #1e293b" },
  detailTitle: { fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 },
  detailDesc: { fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 16 },
  detailMeta: { fontSize: 12, color: "#64748b", marginBottom: 16 },
  subscribeBtn: { padding: "10px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
  backBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 },
  empty: { padding: 40, textAlign: "center", color: "#64748b", fontSize: 14 },
};

function formatPrice(price) {
  if (!price || price === 0) return "Free";
  return `$${price}/mo`;
}

export default function GuestWorkspace({ vertical }) {
  const mappedVertical = VERTICAL_MAP[vertical] || vertical || "";
  const [activeBucket, setActiveBucket] = useState(DEFAULT_BUCKET[mappedVertical] || "make_money");
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWorker, setActiveWorker] = useState(null);

  useEffect(() => {
    async function loadWorkers() {
      if (!mappedVertical) { setLoading(false); return; }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/catalog:byVertical&vertical=${encodeURIComponent(mappedVertical)}&limit=24`);
        const data = await res.json();
        if (data.ok) setWorkers(data.workers || []);
      } catch (err) {
        console.error("Failed to load catalog:", err);
      }
      setLoading(false);
    }
    loadWorkers();
  }, [mappedVertical]);

  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxWorkerName, setSandboxWorkerName] = useState("");

  // Listen for Alex panel sync events
  useEffect(() => {
    function onHighlight(e) {
      const { workerId } = e.detail || {};
      if (workerId) {
        const w = workers.find(w => w.workerId === workerId);
        if (w) setActiveWorker(w);
      }
    }
    function onSandbox(e) {
      setSandboxWorkerName(e.detail?.workerName || "");
      setSandboxOpen(true);
    }
    window.addEventListener("ta:panel-open-sandbox", onSandbox);
    window.addEventListener("ta:panel-highlight-worker", onHighlight);
    return () => {
      window.removeEventListener("ta:panel-highlight-worker", onHighlight);
      window.removeEventListener("ta:panel-open-sandbox", onSandbox);
    };
  }, [workers]);

  const filteredWorkers = workers.filter(w =>
    !w.valueBucket || w.valueBucket.length === 0 || w.valueBucket.includes(activeBucket)
  );

  if (sandboxOpen) {
    return (
      <div style={S.wrap}>
        <StatsHeader />
        <div style={S.detailPanel}>
          <button style={S.backBtn} onClick={() => setSandboxOpen(false)}>&larr; Back to workers</button>
          <div style={S.detailTitle}>Vibe Coding Sandbox</div>
          {sandboxWorkerName && <div style={{ fontSize: 14, color: "#a78bfa", fontWeight: 600, marginBottom: 12 }}>Building: {sandboxWorkerName}</div>}
          <div style={S.detailDesc}>
            Alex is helping you scope a custom worker suite. Answer her questions in the chat and she will build a full spec — rules, workflows, compliance, pricing — in about 15 minutes.
          </div>
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginTop: 16, border: "1px solid #334155" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>What happens next</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              1. Alex asks about your workflows and rules{"\n"}
              2. She generates a full worker spec{"\n"}
              3. You review and approve{"\n"}
              4. Workers go live in your Vault
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeWorker) {
    return (
      <div style={S.wrap}>
        <StatsHeader />
        <div style={S.detailPanel}>
          <button style={S.backBtn} onClick={() => setActiveWorker(null)}>&larr; Back to workers</button>
          <div style={S.detailTitle}>{activeWorker.name}</div>
          <div style={S.detailDesc}>{activeWorker.shortDescription}</div>
          <div style={S.detailMeta}>
            {activeWorker.languages && activeWorker.languages.length > 1
              ? `Speaks ${activeWorker.languages.length} languages`
              : "English"}
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={S.priceBadge}>{formatPrice(activeWorker.price)}</span>
          </div>
          <button style={S.subscribeBtn}>Start Free Trial</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <StatsHeader />
      <div style={S.tabs}>
        {BUCKETS.map(b => (
          <button
            key={b.key}
            style={{ ...S.tab, ...(activeBucket === b.key ? S.tabActive : {}) }}
            onClick={() => setActiveBucket(b.key)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div style={S.cardList}>
        {loading ? (
          <div style={S.empty}>Loading workers...</div>
        ) : filteredWorkers.length === 0 ? (
          <div style={S.empty}>No workers in this category yet</div>
        ) : (
          filteredWorkers.map(w => (
            <div
              key={w.workerId}
              style={S.card}
              onClick={() => {
                setActiveWorker(w);
                window.dispatchEvent(new CustomEvent("ta:panel-worker-tapped", { detail: { workerId: w.workerId, name: w.name } }));
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; }}
            >
              <div style={S.cardName}>{w.name}</div>
              <div style={S.cardDesc}>{w.shortDescription}</div>
              <div style={S.cardFooter}>
                <span style={S.priceBadge}>{formatPrice(w.price)}</span>
                <span style={{ ...S.statusBadge, ...(w.status === "live" ? S.statusLive : S.statusSoon) }}>
                  {w.status === "live" ? "LIVE" : "COMING SOON"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatsHeader() {
  return (
    <div style={S.statsBar}>
      <div style={S.statsRow}>
        <span style={S.statItem}><span style={S.statNum}>1,000+</span> Digital Workers</span>
        <span style={S.statItem}><span style={S.statNum}>54</span> Countries</span>
        <span style={S.statItem}><span style={S.statNum}>24/7</span></span>
        <span style={S.statItem}><span style={S.statNum}>13</span> Industry Suites</span>
      </div>
      <div style={S.langRow}>
        {LANGUAGES.map(l => <span key={l}>{l}</span>)}
      </div>
      <div style={S.langNote}>Every worker speaks your language.</div>
    </div>
  );
}
