// BioCourseCanvas — Makai School of Nursing, BIOL 201 Anatomy & Physiology I
// Slug: makai-bio-101 — student-facing course canvas with body-systems visual map.
import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

// One image per unit — generated via Fal.ai and cached in sessionStorage.
const UNIT_IMAGE_PROMPTS = {
  1: "Scientific illustration of an animal cell cross-section showing nucleus, mitochondria with cristae, endoplasmic reticulum, Golgi apparatus, lysosomes, and cell membrane. Detailed educational biology diagram, vivid colors, clean white background.",
  6: "Human heart anatomy cross-section showing chambers, valves, coronary arteries and veins. Educational medical illustration, realistic diagram, labeled, clean white background.",
  7: "Human brain and central nervous system diagram showing cerebral cortex regions, cerebellum, brainstem and spinal cord with labeled areas. Educational neuroscience illustration, vibrant purple and blue palette, clean background.",
};

const ACCENT = "#7c3aed";
const ACCENT_LIGHT = "#ede9fe";
const GREEN = "#16a34a";
const GREEN_LIGHT = "#dcfce7";
const AMBER = "#d97706";
const AMBER_LIGHT = "#fef3c7";
const GREY = "#94a3b8";
const GREY_LIGHT = "#f1f5f9";

const COURSE = {
  code: "BIOL 201",
  name: "Anatomy & Physiology I",
  school: "Makai School of Nursing",
  instructor: "Prof. Hana Miyamoto, PhD",
  semester: "Fall 2026",
  credits: 4,
  currentGrade: "A−",
  gradePercent: 91,
  currentUnit: 7,
  totalUnits: 12,
  unitTitle: "The Nervous System",
};

const UPCOMING = [
  { type: "Quiz", title: "Module 7 — Neuron Structure & Action Potentials", date: "Fri, Jul 25", points: 20, color: ACCENT_LIGHT, textColor: "#5b21b6" },
  { type: "Lab", title: "Cardiac Anatomy Practical (Unit 6 make-up)", date: "Tue, Jul 29", points: 50, color: AMBER_LIGHT, textColor: "#92400e" },
  { type: "Assignment", title: "Unit 7 Learning Journal", date: "Sun, Aug 3", points: 15, color: GREEN_LIGHT, textColor: "#15803d" },
];

const GRADES = [
  { item: "Unit 6 Quiz — Cardiovascular System", score: 94, max: 100, date: "Jul 14" },
  { item: "Unit 5 Exam — Respiratory System", score: 88, max: 100, date: "Jun 30" },
  { item: "Unit 5 Lab Practical", score: 46, max: 50, date: "Jun 25" },
  { item: "Unit 4 Quiz — Skeletal System", score: 18, max: 20, date: "Jun 10" },
  { item: "Unit 3 Exam — Muscular System", score: 85, max: 100, date: "May 28" },
  { item: "Unit 3 Lab Practical", score: 48, max: 50, date: "May 22" },
];

// Body systems with their position, color, and completion status
const SYSTEMS = [
  { num: 1, title: "Cell Biology & Tissues",   status: "done",    score: 94, icon: "🔬", description: "The building blocks of life — cell structure, organelles, tissue types." },
  { num: 2, title: "Integumentary System",     status: "done",    score: 91, icon: "🧬", description: "Skin, hair, nails, and glands — the body's protective barrier." },
  { num: 3, title: "Muscular System",          status: "done",    score: 88, icon: "💪", description: "Skeletal, smooth, and cardiac muscle — movement and heat generation." },
  { num: 4, title: "Skeletal System",          status: "done",    score: 90, icon: "🦴", description: "206 bones, joints, and cartilage — structure and mineral storage." },
  { num: 5, title: "Respiratory System",       status: "done",    score: 89, icon: "🫁", description: "Lungs, bronchi, diaphragm — oxygen exchange and pH regulation." },
  { num: 6, title: "Cardiovascular System",    status: "done",    score: 94, icon: "❤️", description: "Heart, arteries, veins — circulation and nutrient delivery." },
  { num: 7, title: "The Nervous System",       status: "current", score: null, icon: "🧠", description: "Brain, spinal cord, neurons — the body's command and control network." },
  { num: 8, title: "The Endocrine System",     status: "upcoming", score: null, icon: "⚗️", description: "Hormones and glands — chemical messengers that regulate body functions." },
  { num: 9, title: "Digestive System",         status: "upcoming", score: null, icon: "🫄", description: "From mouth to colon — nutrient breakdown and absorption." },
  { num: 10, title: "Urinary System",          status: "upcoming", score: null, icon: "🔵", description: "Kidneys, bladder — filtration and fluid balance." },
  { num: 11, title: "Reproductive System",     status: "upcoming", score: null, icon: "🧬", description: "Anatomy, hormones, and physiology of reproduction." },
  { num: 12, title: "Comprehensive Review & Final", status: "upcoming", score: null, icon: "📋", description: "Integration of all 11 systems — cumulative exam." },
];

const TAB_STYLE = (active) => ({
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  color: active ? ACCENT : "#64748b",
  background: "none",
  border: "none",
  borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
  cursor: "pointer",
  letterSpacing: 0.1,
  whiteSpace: "nowrap",
});

const gradeColor = (pct) => pct >= 90 ? GREEN : pct >= 80 ? AMBER : "#dc2626";

// Circular progress SVG
function CircularProgress({ percent, grade, size = 80 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = gradeColor(percent);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: 18, fontWeight: 900, fill: color }}>
        {grade}
      </text>
    </svg>
  );
}

// Simplified human body SVG with highlighted systems
function BodySystemMap({ highlightUnit }) {
  const systemColors = {
    1: { fill: "#bbf7d0", stroke: "#16a34a" },  // cells - green
    2: { fill: "#fde68a", stroke: "#d97706" },  // skin - amber
    3: { fill: "#bfdbfe", stroke: "#2563eb" },  // muscle - blue
    4: { fill: "#e9d5ff", stroke: "#7c3aed" },  // skeleton - purple
    5: { fill: "#a7f3d0", stroke: "#059669" },  // respiratory - teal
    6: { fill: "#fecaca", stroke: "#dc2626" },  // cardiovascular - red
    7: { fill: "#c4b5fd", stroke: "#7c3aed" },  // nervous - bright purple (current)
  };
  const upcoming = { fill: "#f1f5f9", stroke: "#cbd5e1" };
  const col = (n) => (n <= 6 ? systemColors[n] : n === 7 ? systemColors[7] : upcoming);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 20 }}>
      {/* Body SVG */}
      <div style={{ position: "relative" }}>
        <svg width={180} height={340} viewBox="0 0 180 340">
          {/* Head */}
          <ellipse cx={90} cy={28} rx={26} ry={28} fill={col(7).fill} stroke={col(7).stroke} strokeWidth={highlightUnit === 7 ? 3 : 1.5} />

          {/* Brain highlight (current unit) */}
          {highlightUnit === 7 && (
            <ellipse cx={90} cy={24} rx={18} ry={16} fill="#7c3aed" opacity={0.3} />
          )}

          {/* Neck */}
          <rect x={81} y={54} width={18} height={16} rx={4} fill={col(2).fill} stroke={col(2).stroke} strokeWidth={1} />

          {/* Torso */}
          <path d="M55 70 Q45 80 44 130 Q44 160 55 170 Q72 178 90 178 Q108 178 125 170 Q136 160 136 130 Q135 80 125 70 Z"
            fill={col(4).fill} stroke={col(4).stroke} strokeWidth={1.5} />

          {/* Lungs (respiratory) */}
          <ellipse cx={72} cy={105} rx={16} ry={24} fill={col(5).fill} stroke={col(5).stroke} strokeWidth={1.5} opacity={0.85} />
          <ellipse cx={108} cy={105} rx={16} ry={24} fill={col(5).fill} stroke={col(5).stroke} strokeWidth={1.5} opacity={0.85} />

          {/* Heart (cardiovascular) */}
          <path d="M90 108 C86 100 77 100 77 109 C77 118 90 126 90 126 C90 126 103 118 103 109 C103 100 94 100 90 108Z"
            fill={col(6).fill} stroke={col(6).stroke} strokeWidth={1.5} />

          {/* Abdomen / digestive area */}
          {/* eslint-disable-next-line no-constant-condition */}
          <ellipse cx={90} cy={150} rx={28} ry={18} fill={col(9 <= 7 ? 9 : 9).fill || upcoming.fill} stroke={upcoming.stroke} strokeWidth={1} opacity={0.6} />

          {/* Left arm */}
          <path d="M55 75 Q36 80 30 130 Q28 150 32 165 L44 162 Q40 148 42 125 Q46 85 60 83Z"
            fill={col(3).fill} stroke={col(3).stroke} strokeWidth={1.5} />

          {/* Right arm */}
          <path d="M125 75 Q144 80 150 130 Q152 150 148 165 L136 162 Q140 148 138 125 Q134 85 120 83Z"
            fill={col(3).fill} stroke={col(3).stroke} strokeWidth={1.5} />

          {/* Left hand */}
          <ellipse cx={33} cy={170} rx={10} ry={8} fill={col(2).fill} stroke={col(2).stroke} strokeWidth={1} />
          {/* Right hand */}
          <ellipse cx={147} cy={170} rx={10} ry={8} fill={col(2).fill} stroke={col(2).stroke} strokeWidth={1} />

          {/* Pelvis */}
          <path d="M57 175 Q55 195 60 200 Q75 210 90 210 Q105 210 120 200 Q125 195 123 175Z"
            fill={col(4).fill} stroke={col(4).stroke} strokeWidth={1.5} />

          {/* Left leg */}
          <path d="M60 210 Q52 225 50 270 Q49 295 55 310 L72 308 Q66 292 68 268 Q70 228 78 215Z"
            fill={col(3).fill} stroke={col(3).stroke} strokeWidth={1.5} />

          {/* Right leg */}
          <path d="M120 210 Q128 225 130 270 Q131 295 125 310 L108 308 Q114 292 112 268 Q110 228 102 215Z"
            fill={col(3).fill} stroke={col(3).stroke} strokeWidth={1.5} />

          {/* Left foot */}
          <ellipse cx={60} cy={316} rx={14} ry={7} fill={col(2).fill} stroke={col(2).stroke} strokeWidth={1} />
          {/* Right foot */}
          <ellipse cx={120} cy={316} rx={14} ry={7} fill={col(2).fill} stroke={col(2).stroke} strokeWidth={1} />

          {/* Nervous system spine */}
          <rect x={87} y={60} width={6} height={110} rx={3} fill={col(7).fill} stroke={col(7).stroke} strokeWidth={1.5} opacity={0.9} />

          {/* Nerve branches */}
          <line x1={90} y1={80} x2={68} y2={90} stroke={col(7).stroke} strokeWidth={1} opacity={0.5} />
          <line x1={90} y1={100} x2={110} y2={108} stroke={col(7).stroke} strokeWidth={1} opacity={0.5} />
          <line x1={90} y1={120} x2={65} y2={128} stroke={col(7).stroke} strokeWidth={1} opacity={0.5} />
          <line x1={90} y1={140} x2={112} y2={145} stroke={col(7).stroke} strokeWidth={1} opacity={0.5} />

          {/* Glow on current unit (nervous / head) */}
          {highlightUnit === 7 && (
            <ellipse cx={90} cy={28} rx={30} ry={32} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="4 3" opacity={0.6}>
              <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1.5s" repeatCount="indefinite" />
            </ellipse>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
        {SYSTEMS.slice(0, 7).map((s) => (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 7, opacity: s.status === "done" ? 1 : 0.85 }}>
            <div style={{
              width: 12, height: 12, borderRadius: 3, flexShrink: 0,
              background: s.status === "done" ? GREEN : s.status === "current" ? ACCENT : GREY,
              boxShadow: s.status === "current" ? `0 0 6px ${ACCENT}` : "none",
            }} />
            <span style={{ fontSize: 11, color: s.status === "current" ? ACCENT : s.status === "done" ? "#475569" : "#94a3b8", fontWeight: s.status === "current" ? 700 : 500 }}>
              {s.title}
              {s.status === "current" && <span style={{ marginLeft: 4, fontSize: 9, background: ACCENT, color: "#fff", borderRadius: 999, padding: "1px 5px" }}>NOW</span>}
              {s.status === "done" && <span style={{ marginLeft: 4, color: GREEN, fontSize: 10 }}>✓ {s.score}%</span>}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid #e2e8f0" }}>
          {SYSTEMS.slice(7).map((s) => (
            <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: GREY_LIGHT, border: "1px solid #e2e8f0", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Neuron diagram SVG for current unit spotlight
function NeuronDiagram() {
  return (
    <div style={{ background: "#1e1b4b", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", letterSpacing: 1, marginBottom: 10 }}>UNIT 7 · THE NERVOUS SYSTEM</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width={280} height={90} viewBox="0 0 280 90">
          {/* Dendrites */}
          {[[-30, -25], [-35, -5], [-30, 15], [-20, 30]].map(([dx, dy], i) => (
            <line key={i} x1={60} y1={45} x2={60 + dx} y2={45 + dy} stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
          ))}
          {/* Cell body */}
          <ellipse cx={68} cy={45} rx={22} ry={22} fill="#3730a3" stroke="#7c3aed" strokeWidth={2} />
          <text x={68} y={49} textAnchor="middle" fontSize={9} fill="#c4b5fd" fontWeight={700}>SOMA</text>
          {/* Axon */}
          <line x1={90} y1={45} x2={230} y2={45} stroke="#7c3aed" strokeWidth={3} strokeLinecap="round" />
          {/* Myelin sheaths */}
          {[110, 145, 180, 210].map((x, i) => (
            <rect key={i} x={x - 8} y={38} width={16} height={14} rx={7} fill="#4338ca" stroke="#6d28d9" strokeWidth={1.5} />
          ))}
          {/* Nodes of Ranvier labels */}
          {[128, 163, 196].map((x, i) => (
            <text key={i} x={x} y={62} textAnchor="middle" fontSize={7} fill="#818cf8">Node</text>
          ))}
          {/* Terminal boutons */}
          {[[235, 30], [240, 45], [235, 60]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={8} ry={6} fill="#7c3aed" stroke="#a78bfa" strokeWidth={1.5} />
          ))}
          {/* Action potential pulse */}
          <circle cx={130} cy={45} r={5} fill="#fbbf24" opacity={0.9}>
            <animate attributeName="cx" from="95" to="230" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* Labels */}
          <text x={68} y={78} textAnchor="middle" fontSize={8} fill="#6366f1">Dendrites</text>
          <text x={160} y={32} textAnchor="middle" fontSize={8} fill="#818cf8">Myelin Sheath (Schwann cells)</text>
          <text x={240} y={78} textAnchor="middle" fontSize={8} fill="#6366f1">Boutons</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Motor Neuron</div>
          {[
            ["Dendrites", "Receive signals from other neurons"],
            ["Soma", "Cell body — processes the signal"],
            ["Axon", "Conducts impulses to target cells"],
            ["Myelin", "Insulation → speeds conduction 100×"],
          ].map(([term, def]) => (
            <div key={term} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", minWidth: 60 }}>{term}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook: fetch (or regenerate) an AI anatomy image for a given unit number.
// Caches per unit in sessionStorage so it survives tab switches within a session.
function useAnatomyImage(unitNum) {
  const cacheKey = `bio_anatomy_img_${unitNum}`;
  const [imgUrl, setImgUrl] = useState(() => sessionStorage.getItem(cacheKey) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fired = useRef(false);

  useEffect(() => {
    if (imgUrl || fired.current || !UNIT_IMAGE_PROMPTS[unitNum]) return;
    fired.current = true;
    (async () => {
      setLoading(true);
      try {
        const user = getAuth().currentUser;
        const token = user ? await user.getIdToken() : localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID") || "";
        const resp = await fetch(`${API_BASE}/api?path=/v1/image:generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
          },
          body: JSON.stringify({
            workerId: "makai-bio-101",
            prompt: UNIT_IMAGE_PROMPTS[unitNum],
            style: "diagram",
            size: "landscape_4_3",
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (data.imageUrl) {
          sessionStorage.setItem(cacheKey, data.imageUrl);
          setImgUrl(data.imageUrl);
        } else {
          setError("generation failed");
        }
      } catch {
        setError("network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [unitNum, imgUrl]);

  return { imgUrl, loading, error };
}

// Displays an AI-generated anatomy diagram card
function AnatomyImageCard({ unitNum, caption }) {
  const { imgUrl, loading, error } = useAnatomyImage(unitNum);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
      {loading && (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🎨</div>
          Generating study image...
        </div>
      )}
      {imgUrl && !loading && (
        <img src={imgUrl} alt={caption} style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "cover" }} />
      )}
      {error && !loading && !imgUrl && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          Image unavailable
        </div>
      )}
      <div style={{ padding: "10px 16px", background: "#f8fafc", fontSize: 12, color: "#64748b", borderTop: "1px solid #f1f5f9" }}>
        {caption}
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function isBioCourseWorker(w) {
  return (w?.workerId || w?.slug || "") === "makai-bio-101";
}

export default function BioCourseCanvas() {
  const [tab, setTab] = useState("overview");
  const [selectedSystem, setSelectedSystem] = useState(null);

  const pct = Math.round((COURSE.currentUnit - 1) / COURSE.totalUnits * 100);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "0 4px 32px" }}>

      {/* Course header */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
        {/* Background decoration */}
        <div style={{ position: "absolute", right: -20, top: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(124,58,237,0.2)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 60, bottom: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(99,102,241,0.15)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, position: "relative" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(167,139,250,0.3)", color: "#c4b5fd", letterSpacing: 0.5 }}>
                {COURSE.code}
              </span>
              <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>{COURSE.credits} credits · {COURSE.semester}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{COURSE.name}</div>
            <div style={{ fontSize: 13, color: "#a78bfa" }}>{COURSE.school} · {COURSE.instructor}</div>

            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a78bfa", marginBottom: 6 }}>
                <span>Unit {COURSE.currentUnit}: <b style={{ color: "#e2e8f0" }}>{COURSE.unitTitle}</b></span>
                <span style={{ color: "#c4b5fd" }}>{pct}% complete</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 999, width: `${pct}%`, transition: "width 0.8s ease" }} />
              </div>
              <div style={{ display: "flex", marginTop: 6, gap: 2 }}>
                {SYSTEMS.map((s) => (
                  <div key={s.num} title={s.title} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: s.status === "done" ? "#4ade80" : s.status === "current" ? "#a78bfa" : "rgba(255,255,255,0.15)",
                  }} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <CircularProgress percent={COURSE.gradePercent} grade={COURSE.currentGrade} size={90} />
            <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>overall</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 20, overflowX: "auto" }}>
        {[["overview", "Overview"], ["anatomy", "Body Systems"], ["grades", "Grades"], ["units", "Course Map"]].map(([key, label]) => (
          <button key={key} style={TAB_STYLE(tab === key)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div>
          {/* Current unit spotlight — neuron diagram */}
          <NeuronDiagram />

          {/* AI-generated anatomy study image for current unit */}
          <AnatomyImageCard unitNum={7} caption="AI-generated study image · Unit 7: The Nervous System — brain anatomy and neural pathways" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {/* Upcoming */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 10 }}>Coming Up</div>
              {UPCOMING.map((u, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${u.textColor}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: u.color, color: u.textColor }}>{u.type}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{u.date} · {u.points} pts</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{u.title}</div>
                </div>
              ))}
            </div>

            {/* Recent scores */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 10 }}>Recent Scores</div>
              {GRADES.slice(0, 4).map((g, i) => {
                const pctScore = Math.round(g.score / g.max * 100);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#334155", lineHeight: 1.3 }}>{g.item}</div>
                      <div style={{ width: "100%", height: 3, background: "#f1f5f9", borderRadius: 999, marginTop: 4 }}>
                        <div style={{ width: `${pctScore}%`, height: "100%", borderRadius: 999, background: gradeColor(pctScore) }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: gradeColor(pctScore) }}>{pctScore}%</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{g.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Body Systems tab */}
      {tab === "anatomy" && (
        <div>
          {/* Show cell image when Unit 1 is selected, brain image when 7 */}
          {(selectedSystem === 1 || selectedSystem === 7) && (
            <AnatomyImageCard
              unitNum={selectedSystem}
              caption={selectedSystem === 1
                ? "AI-generated study image · Unit 1: Animal cell cross-section — organelles and cell membrane"
                : "AI-generated study image · Unit 7: Brain and central nervous system anatomy"}
            />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }}>
            {/* Body diagram */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 16px" }}>
              <BodySystemMap highlightUnit={selectedSystem || COURSE.currentUnit} />
            </div>

            {/* System cards */}
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Click a system to highlight it on the body map</div>
              {SYSTEMS.slice(0, 9).map((s) => (
                <div
                  key={s.num}
                  onClick={() => setSelectedSystem(s.status !== "upcoming" ? s.num : null)}
                  style={{
                    background: selectedSystem === s.num ? ACCENT_LIGHT : "#fff",
                    border: `1px solid ${selectedSystem === s.num ? "#c4b5fd" : "#e2e8f0"}`,
                    borderLeft: `4px solid ${s.status === "done" ? GREEN : s.status === "current" ? ACCENT : GREY}`,
                    borderRadius: 8, padding: "10px 14px", marginBottom: 6,
                    cursor: s.status !== "upcoming" ? "pointer" : "default",
                    transition: "all 0.15s ease",
                    opacity: s.status === "upcoming" ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: s.status === "current" ? 700 : 600, color: s.status === "upcoming" ? "#94a3b8" : "#1e293b" }}>
                          Unit {s.num}: {s.title}
                          {s.status === "current" && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, background: ACCENT, color: "#fff", padding: "1px 6px", borderRadius: 999, letterSpacing: 0.5 }}>IN PROGRESS</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{s.description}</div>
                      </div>
                    </div>
                    {s.score !== null && (
                      <div style={{ fontSize: 15, fontWeight: 800, color: gradeColor(s.score), marginLeft: 12, flexShrink: 0 }}>{s.score}%</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grades tab */}
      {tab === "grades" && (
        <div>
          {/* Summary bar */}
          <div style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "1px solid #ddd6fe", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", gap: 0, flexWrap: "wrap" }}>
            {[
              ["Overall", COURSE.currentGrade, COURSE.gradePercent],
              ["Quizzes", "94%", 94],
              ["Exams", "89%", 89],
              ["Labs", "94%", 94],
            ].map(([label, val, pctV], i) => (
              <div key={i} style={{ flex: 1, minWidth: 80, textAlign: "center", borderRight: i < 3 ? "1px solid #ddd6fe" : "none", padding: "0 12px" }}>
                <div style={{ fontSize: 11, color: "#6d28d9", fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: gradeColor(pctV) }}>{val}</div>
                <div style={{ height: 4, background: "#ddd6fe", borderRadius: 999, marginTop: 6 }}>
                  <div style={{ width: `${pctV}%`, height: "100%", borderRadius: 999, background: gradeColor(pctV) }} />
                </div>
              </div>
            ))}
          </div>

          {GRADES.map((g, i) => {
            const pctScore = Math.round(g.score / g.max * 100);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{g.item}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 999, maxWidth: 160 }}>
                      <div style={{ width: `${pctScore}%`, height: "100%", borderRadius: 999, background: gradeColor(pctScore) }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{g.date}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", marginLeft: 16 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: gradeColor(pctScore) }}>{g.score}/{g.max}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{pctScore}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Units / Course Map tab */}
      {tab === "units" && (
        <div>
          <div style={{ position: "relative", paddingLeft: 32 }}>
            {/* Vertical timeline line */}
            <div style={{ position: "absolute", left: 14, top: 16, bottom: 16, width: 2, background: "linear-gradient(to bottom, #4ade80 0%, #7c3aed 58%, #e2e8f0 58%)" }} />

            {SYSTEMS.map((u, i) => {
              const isDone = u.status === "done";
              const isCurrent = u.status === "current";
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12, position: "relative" }}>
                  {/* Node */}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? GREEN : isCurrent ? ACCENT : "#fff",
                    border: `2px solid ${isDone ? GREEN : isCurrent ? ACCENT : "#e2e8f0"}`,
                    boxShadow: isCurrent ? `0 0 0 4px ${ACCENT_LIGHT}` : "none",
                    fontSize: isDone ? 13 : 11,
                    fontWeight: 700,
                    color: isDone || isCurrent ? "#fff" : "#94a3b8",
                    zIndex: 1,
                    marginLeft: -1,
                  }}>
                    {isDone ? "✓" : u.num}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1, background: isCurrent ? ACCENT_LIGHT : isDone ? "#f8fafc" : "#fff",
                    border: `1px solid ${isCurrent ? "#c4b5fd" : "#e2e8f0"}`,
                    borderRadius: 10, padding: "12px 16px",
                    opacity: u.status === "upcoming" ? 0.7 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{u.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 600, color: isCurrent ? "#3b0764" : isDone ? "#475569" : "#94a3b8" }}>
                            Unit {u.num}: {u.title}
                            {isCurrent && (
                              <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, background: ACCENT, color: "#fff", padding: "2px 6px", borderRadius: 999, letterSpacing: 0.5 }}>NOW</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{u.description}</div>
                        </div>
                      </div>
                      {u.score !== null && (
                        <div style={{ fontSize: 16, fontWeight: 800, color: gradeColor(u.score), marginLeft: 12 }}>{u.score}%</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
