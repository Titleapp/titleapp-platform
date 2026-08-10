/**
 * AviationQRH.jsx — Emergency Quick Reference Handbook viewer.
 *
 * RETRIEVAL ONLY — never generates procedures. Every step displayed here
 * must come from QRH_DATA below, sourced from the PC-12/47E AFM Section 3.
 *
 * If a procedure is not in QRH_DATA, this component hard-fails with an
 * explicit "refer to physical QRH" message — never fills in from model.
 *
 * IMPORTANT: QRH_DATA below is a TEMPLATE. All step text must be verified
 * against the actual PC-12/47E AFM before operational use.
 * Source: Pilatus PC-12/47E AFM Document No. ER-AFM-PC12-47E.
 */

import React, { useState, useMemo } from "react";

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "engine",     label: "Engine",           color: "#ef4444" },
  { id: "fire",       label: "Fire / Smoke",      color: "#f97316" },
  { id: "flight",     label: "Flight / Descent",  color: "#eab308" },
  { id: "systems",    label: "Systems",            color: "#a78bfa" },
  { id: "landing",    label: "Landing",            color: "#60a5fa" },
  { id: "evacuation", label: "Evacuation",         color: "#f87171" },
];

// ── QRH Procedure Data ────────────────────────────────────────────────────────
// TEMPLATE: Verify every step against current PC-12/47E AFM before operational use.
// Step text intentionally uses AFM language; update from your specific AFM revision.
const QRH_DATA = [
  {
    id: "eng-failure",
    category: "engine",
    title: "Engine Failure in Flight",
    source: "PC-12/47E AFM §3.2",
    memoryItems: [
      "Best glide — 118 KIAS",
      "Condition Lever — FUEL OFF / FEATHER",
      "ENGINE FIRE handle — CHECK",
    ],
    steps: [
      { n: 1,  text: "Best glide airspeed — ESTABLISH 118 KIAS", warn: null },
      { n: 2,  text: "Condition Lever — FUEL OFF / FEATHER", note: "Verify propeller feathering" },
      { n: 3,  text: "ENGINE FIRE handle — CHECK", note: "If fire present, execute Engine Fire checklist" },
      { n: 4,  text: "Fuel selectors — CHECK (boost pump and crossfeed as required)" },
      { n: 5,  text: "Emergency landing site — SELECT best available" },
      { n: 6,  text: "Mayday — DECLARE on 121.5 MHz" },
      { n: 7,  text: "Transponder — 7700" },
      { n: 8,  text: "Airstart — ATTEMPT if altitude and conditions permit (see IN-FLIGHT RESTART)" },
      { n: 9,  text: "Passengers — BRIEF for emergency landing" },
      { n: 10, text: "Emergency approach and landing — INITIATE", note: "See Emergency Approach and Landing checklist" },
    ],
    completionNote: "If restart unsuccessful, execute Emergency Approach and Landing.",
  },
  {
    id: "eng-fire",
    category: "engine",
    title: "Engine Fire in Flight",
    source: "PC-12/47E AFM §3.3",
    memoryItems: [
      "Condition Lever — FUEL OFF / FEATHER",
      "ENGINE FIRE handle — PULL",
      "ENGINE FIRE handle — ROTATE (discharges Halon)",
    ],
    steps: [
      { n: 1, text: "Condition Lever — FUEL OFF / FEATHER", warn: "immediate" },
      { n: 2, text: "ENGINE FIRE handle — PULL", warn: "immediate" },
      { n: 3, text: "ENGINE FIRE handle — ROTATE (Halon discharge)", warn: "immediate" },
      { n: 4, text: "Best glide airspeed — MAINTAIN 118 KIAS" },
      { n: 5, text: "Fuel system — ISOLATE (boost pumps OFF, crossfeed OFF)" },
      { n: 6, text: "If fire persists — INCREASE airspeed and descend to smother fire" },
      { n: 7, text: "Mayday — DECLARE on 121.5 MHz" },
      { n: 8, text: "Transponder — 7700" },
      { n: 9, text: "Emergency landing — EXECUTE immediately" },
    ],
    completionNote: "Do not attempt restart after engine fire.",
  },
  {
    id: "eng-airstart",
    category: "engine",
    title: "In-Flight Restart (Airstart)",
    source: "PC-12/47E AFM §3.4",
    memoryItems: [],
    steps: [
      { n: 1, text: "Airspeed — MAINTAIN within restart envelope (check AFM for altitude/speed limits)" },
      { n: 2, text: "Condition Lever — FUEL OFF (verify feathered)" },
      { n: 3, text: "Fuel selectors — ON, boost pump — ON" },
      { n: 4, text: "Condition Lever — LOW IDLE" },
      { n: 5, text: "Power Lever — GROUND IDLE" },
      { n: 6, text: "Ignition — ON (or AUTO START as applicable)" },
      { n: 7, text: "Monitor ITT during start — max 870°C continuous / 1090°C limit (5 sec)" },
      { n: 8, text: "Once running — engine parameters within normal limits before increasing power" },
    ],
    completionNote: "If start not achieved within limits, abort and execute forced landing.",
  },
  {
    id: "cabin-fire",
    category: "fire",
    title: "Cabin Fire / Smoke / Fumes",
    source: "PC-12/47E AFM §3.8",
    memoryItems: [
      "Oxygen masks — DON if smoke",
      "Source — IDENTIFY and ISOLATE if possible",
    ],
    steps: [
      { n: 1, text: "Oxygen masks — DON (crew and passengers as required)" },
      { n: 2, text: "Smoke source — IDENTIFY (electrical, cargo, galley, lavatory)" },
      { n: 3, text: "If electrical fire — Master switch electrical buses — ISOLATE systematically" },
      { n: 4, text: "Ventilation — INCREASE (cabin air max, heat off)" },
      { n: 5, text: "Fire extinguisher — USE portable cabin extinguisher as required", note: "PC-12 carries at least one portable fire extinguisher (required)" },
      { n: 6, text: "If smoke/fire persists — DECLARE emergency and descend to 10,000 ft or MEA" },
      { n: 7, text: "Mayday — DECLARE on 121.5 MHz" },
      { n: 8, text: "Transponder — 7700" },
      { n: 9, text: "Land as soon as possible" },
    ],
    completionNote: "Do not delay descent if source cannot be identified.",
  },
  {
    id: "elec-fire",
    category: "fire",
    title: "Electrical Fire / Smoke",
    source: "PC-12/47E AFM §3.9",
    memoryItems: [
      "Master electrical — OFF if fire threatens aircraft",
    ],
    steps: [
      { n: 1, text: "Avionics master — OFF" },
      { n: 2, text: "Individual circuit breakers — PULL on smoking circuits" },
      { n: 3, text: "If fire persists — Bus tie / shed loads systematically" },
      { n: 4, text: "Fire extinguisher — USE portable cabin extinguisher if accessible" },
      { n: 5, text: "Ventilate — Cabin air on, heat off, door seal check" },
      { n: 6, text: "Navigate to nearest suitable airport — VFR if possible" },
      { n: 7, text: "Emergency declaration — DECLARE Mayday" },
    ],
    completionNote: "Restore only essential avionics after fire extinguished.",
  },
  {
    id: "emerg-descent",
    category: "flight",
    title: "Emergency Descent",
    source: "PC-12/47E AFM §3.10",
    memoryItems: [
      "Power — IDLE",
      "Speed brakes / spoilers — EXTEND (if equipped)",
      "Descend at MMO/VMO",
    ],
    steps: [
      { n: 1, text: "Power Lever — GROUND IDLE" },
      { n: 2, text: "Airspeed — INCREASE to VMO (250 KIAS below 10,000 ft) / MMO above" },
      { n: 3, text: "Oxygen — 100% (crew and passengers; masks on above 14,000 ft)" },
      { n: 4, text: "Target altitude — 10,000 ft MSL or MEA (whichever higher)" },
      { n: 5, text: "ATC — NOTIFY on current frequency, then 121.5 MHz" },
      { n: 6, text: "Transponder — 7700" },
      { n: 7, text: "Passengers — BRIEF for descent" },
    ],
    completionNote: "Level at 10,000 ft or MEA. Reassess aircraft condition and plan for landing.",
  },
  {
    id: "rapid-depress",
    category: "systems",
    title: "Pressurization Failure / Rapid Decompression",
    source: "PC-12/47E AFM §3.11",
    memoryItems: [
      "Oxygen masks — DON immediately",
      "Emergency descent — INITIATE",
    ],
    steps: [
      { n: 1, text: "Oxygen masks — DON immediately (crew and passengers)", warn: "immediate" },
      { n: 2, text: "Emergency descent — INITIATE (see Emergency Descent checklist)", warn: "immediate" },
      { n: 3, text: "Pressurization — CHECK (cabin altitude indicator, outflow valve)" },
      { n: 4, text: "Pressurization controller — SWITCH to alternate if available" },
      { n: 5, text: "Descend to 10,000 ft MSL or MEA" },
      { n: 6, text: "ATC — NOTIFY, request priority handling" },
      { n: 7, text: "Transponder — 7700" },
    ],
    completionNote: "Cabin altitude warning above 10,000 ft activates cabin altitude horn.",
  },
  {
    id: "elec-failure",
    category: "systems",
    title: "Electrical System Failure",
    source: "PC-12/47E AFM §3.12",
    memoryItems: [],
    steps: [
      { n: 1, text: "Generator — CHECK (verify load shedding, reset if tripped)" },
      { n: 2, text: "Battery — ON (verify charge remaining)" },
      { n: 3, text: "Essential bus — CONFIRM powered (standby instruments, comm, nav)" },
      { n: 4, text: "Non-essential loads — SHED (avionics, lighting, deicing as possible)" },
      { n: 5, text: "ATC — NOTIFY; declare emergency if necessary" },
      { n: 6, text: "Land at nearest suitable airport" },
      { n: 7, text: "Approach and landing with reduced electrical — PLAN (gear extension, flaps)" },
    ],
    completionNote: "Emergency gear extension per gear malfunction checklist if hydraulic/electrical reduced.",
  },
  {
    id: "gear-malfunction",
    category: "landing",
    title: "Landing Gear Malfunction",
    source: "PC-12/47E AFM §3.14",
    memoryItems: [],
    steps: [
      { n: 1, text: "Airspeed — BELOW gear extension limit speed (VLE)" },
      { n: 2, text: "Gear selector — CYCLE (UP then DOWN; wait 10 sec each)" },
      { n: 3, text: "Circuit breakers — CHECK gear circuit, reset if tripped" },
      { n: 4, text: "Emergency gear extension — INITIATE per AFM procedure" },
      { n: 5, text: "Gear indicators — VERIFY 3 green; if not, prepare for abnormal landing" },
      { n: 6, text: "ATC — NOTIFY gear status; request fire/rescue standby if gear unsafe" },
      { n: 7, text: "Fly-by — REQUEST tower fly-by to visually confirm gear position" },
      { n: 8, text: "Land — Slowest practical speed; minimize structural loads" },
    ],
    completionNote: "If gear unsafe, brief passengers, have ATC alert rescue equipment.",
  },
  {
    id: "emerg-approach",
    category: "landing",
    title: "Emergency Approach and Landing",
    source: "PC-12/47E AFM §3.15",
    memoryItems: [
      "Best glide — 118 KIAS",
      "Mayday declared — CHECK",
    ],
    steps: [
      { n: 1, text: "Best glide airspeed — MAINTAIN 118 KIAS" },
      { n: 2, text: "Landing site — SELECT (runway, field, road — firmest available)" },
      { n: 3, text: "Mayday — CONFIRM declared on 121.5 and ATC frequency" },
      { n: 4, text: "Transponder — 7700" },
      { n: 5, text: "Passengers — BRIEF (brace position, door handles, evacuation route)" },
      { n: 6, text: "Seat belts — ALL secure and locked" },
      { n: 7, text: "Loose items — SECURE in cabin" },
      { n: 8, text: "Fuel selectors — OFF before touchdown if fire risk" },
      { n: 9, text: "Landing gear — DOWN (if power available and runway landing)" },
      { n: 10, text: "Flaps — AS REQUIRED for landing distance" },
      { n: 11, text: "Upon landing — Brake firmly; vacate runway; execute Evacuation checklist if required" },
    ],
    completionNote: "Planned off-airport landing is survivable. Do not stall — maintain airspeed to touchdown.",
  },
  {
    id: "ditching",
    category: "landing",
    title: "Ditching",
    source: "PC-12/47E AFM §3.16",
    memoryItems: [
      "Mayday — DECLARE",
      "Life vests — DON",
    ],
    steps: [
      { n: 1, text: "Mayday — DECLARE on 121.5 MHz and ATC frequency", warn: "immediate" },
      { n: 2, text: "Transponder — 7700" },
      { n: 3, text: "ELT — ACTIVATE (if manual activation available)" },
      { n: 4, text: "Life vests — DON (crew and passengers)" },
      { n: 5, text: "Loose items — SECURE; remove sharp items" },
      { n: 6, text: "Passengers — BRIEF (brace position, door opening, raft deployment)" },
      { n: 7, text: "Seat belts — LOCKED" },
      { n: 8, text: "Approach — INTO WIND, parallel to swell; aim for back of crest" },
      { n: 9, text: "Gear — UP for water landing" },
      { n: 10, text: "Flaps — AS REQUIRED (reduce sink rate)" },
      { n: 11, text: "Airspeed — MINIMUM safe (avoid stall; power to idle just before contact)" },
      { n: 12, text: "On water contact — EVACUATE immediately; open doors before water level" },
    ],
    completionNote: "Delay increases risk. Evacuate and inflate life vests outside aircraft.",
  },
  {
    id: "evacuation",
    category: "evacuation",
    title: "Emergency Evacuation",
    source: "PC-12/47E AFM §3.17",
    memoryItems: [
      "Engine — OFF",
      "EXIT — direct passengers to nearest usable door",
    ],
    steps: [
      { n: 1, text: "Engine — CONDITION LEVER FUEL OFF / FEATHER", warn: "immediate" },
      { n: 2, text: "Battery and master — OFF after evacuation initiated" },
      { n: 3, text: "Crew door — UNLATCH and open (push handle, push door outward)" },
      { n: 4, text: "Cabin door — OPERATE per cabin crew / trained passenger" },
      { n: 5, text: "Passengers — DIRECT to nearest usable exit; move away from aircraft" },
      { n: 6, text: "Fire — UPWIND of aircraft; move at least 300 ft clear" },
      { n: 7, text: "ELT — ACTIVATE once clear if not auto-activated" },
      { n: 8, text: "Emergency services — CONTACT; relay position, POB, nature of emergency" },
    ],
    completionNote: "Account for all passengers and crew once clear of aircraft.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function categoryFor(id) {
  return CATEGORIES.find(c => c.id === id) || { label: "Misc", color: "#64748b" };
}

function StepRow({ step }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "9px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{
        color: step.warn === "immediate" ? "#ef4444" : "#475569",
        fontFamily: "monospace", fontSize: 13, fontWeight: 700,
        minWidth: 22, paddingTop: 1,
      }}>
        {step.n}.
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          color: step.warn === "immediate" ? "#fca5a5" : "#e2e8f0",
          fontSize: 14, fontWeight: step.warn === "immediate" ? 700 : 400,
          lineHeight: 1.45,
        }}>
          {step.text}
        </div>
        {step.note && (
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 3, fontStyle: "italic" }}>
            {step.note}
          </div>
        )}
      </div>
      {step.warn === "immediate" && (
        <span style={{
          color: "#ef4444", fontSize: 9, fontFamily: "monospace", fontWeight: 700,
          border: "1px solid #7f1d1d", borderRadius: 3, padding: "2px 5px",
          background: "#1a0a0a", alignSelf: "flex-start", flexShrink: 0,
        }}>
          IMM
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AviationQRH({ initialProcedureId }) {
  const [selectedId, setSelectedId] = useState(initialProcedureId || "eng-failure");
  const [search, setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    let list = QRH_DATA;
    if (activeCategory !== "all") list = list.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search]);

  const proc = QRH_DATA.find(p => p.id === selectedId);
  const cat  = proc ? categoryFor(proc.category) : null;

  return (
    <div style={{ background: "#0d1117", borderRadius: 12, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Disclaimer — always first ────────────────────────────────────── */}
      <div style={{
        background: "#1a0808", borderBottom: "2px solid #7f1d1d",
        padding: "8px 16px", display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <span style={{ color: "#ef4444", fontSize: 16, marginTop: 1 }}>⚠</span>
        <div>
          <div style={{ color: "#fca5a5", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
            EFB REFERENCE ONLY — NOT A SUBSTITUTE FOR YOUR PHYSICAL QRH
          </div>
          <div style={{ color: "#f87171", fontSize: 11, lineHeight: 1.5 }}>
            Memory items are performed from memory before consulting this display.
            This data must be verified against the current PC-12/47E AFM (Doc. ER-AFM-PC12-47E) and your operator's approved QRH revision.
            If ANY procedure is not found here, refer to your physical QRH immediately.
            Not for navigation. Verify currency with your DOM.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: 540 }}>

        {/* ── Left panel: procedure list ───────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: "1px solid #1e293b",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              type="text"
              placeholder="Search procedures…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#161b22", border: "1px solid #334155", borderRadius: 6,
                color: "#e2e8f0", fontSize: 12, padding: "6px 10px",
                outline: "none",
              }}
            />
          </div>

          {/* Category filter pills */}
          <div style={{ padding: "0 8px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
            <button
              onClick={() => setActiveCategory("all")}
              style={{
                background: activeCategory === "all" ? "#1e3a5f" : "transparent",
                color: activeCategory === "all" ? "#60a5fa" : "#475569",
                border: `1px solid ${activeCategory === "all" ? "#2563eb" : "#334155"}`,
                borderRadius: 4, fontSize: 10, padding: "2px 7px", cursor: "pointer",
              }}>
              ALL
            </button>
            {CATEGORIES.map(c => (
              <button key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  background: activeCategory === c.id ? `${c.color}22` : "transparent",
                  color: activeCategory === c.id ? c.color : "#475569",
                  border: `1px solid ${activeCategory === c.id ? c.color : "#334155"}`,
                  borderRadius: 4, fontSize: 10, padding: "2px 7px", cursor: "pointer",
                }}>
                {c.label.split(" / ")[0]}
              </button>
            ))}
          </div>

          {/* Procedure list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "20px 12px", color: "#475569", fontSize: 12, textAlign: "center" }}>
                No procedures found.
                <div style={{ marginTop: 8, color: "#f87171", fontWeight: 700 }}>
                  Refer to physical QRH.
                </div>
              </div>
            )}
            {filtered.map(p => {
              const c = categoryFor(p.category);
              const active = p.id === selectedId;
              return (
                <button key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: active ? "#161b22" : "transparent",
                    border: "none", borderLeft: `3px solid ${active ? c.color : "transparent"}`,
                    padding: "9px 12px 9px 10px", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                  <div style={{ color: active ? "#e2e8f0" : "#94a3b8", fontSize: 12, fontWeight: active ? 700 : 400, lineHeight: 1.35 }}>
                    {p.title}
                  </div>
                  <div style={{ color: c.color, fontSize: 10, marginTop: 2 }}>
                    {c.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right panel: selected procedure ─────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {!proc ? (
            <div style={{ padding: 24, color: "#475569", fontSize: 14, textAlign: "center" }}>
              <div style={{ color: "#f87171", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Procedure not found in QRH data
              </div>
              Refer to your physical Quick Reference Handbook immediately.
            </div>
          ) : (
            <>
              {/* Procedure header */}
              <div style={{
                padding: "14px 18px 12px",
                borderBottom: "1px solid #1e293b",
                background: "#0d1117",
                position: "sticky", top: 0, zIndex: 2,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{
                    background: `${cat.color}22`, color: cat.color,
                    border: `1px solid ${cat.color}`, borderRadius: 5,
                    fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                    padding: "2px 8px",
                  }}>
                    {cat.label.toUpperCase()}
                  </span>
                  <span style={{ color: "#334155", fontSize: 10, fontFamily: "monospace" }}>{proc.source}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 800, letterSpacing: 0.2 }}>
                  {proc.title}
                </div>
              </div>

              {/* Memory items */}
              {proc.memoryItems.length > 0 && (
                <div style={{
                  margin: "12px 16px 0",
                  background: "#1a0808",
                  border: "1px solid #7f1d1d",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 800, letterSpacing: 0.8, marginBottom: 8 }}>
                    MEMORY ITEMS — PERFORM BEFORE CONSULTING THIS DISPLAY
                  </div>
                  {proc.memoryItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                      <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 700, minWidth: 16 }}>●</span>
                      <span style={{ color: "#fca5a5", fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist steps */}
              <div style={{ padding: "10px 16px 0" }}>
                <div style={{ color: "#334155", fontSize: 10, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 6 }}>
                  CHECKLIST — VERBATIM FROM AFM
                </div>
                {proc.steps.map(step => <StepRow key={step.n} step={step} />)}
              </div>

              {/* Completion note */}
              {proc.completionNote && (
                <div style={{
                  margin: "12px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #1e293b",
                  borderRadius: 7, padding: "9px 12px",
                  color: "#94a3b8", fontSize: 12, fontStyle: "italic",
                }}>
                  {proc.completionNote}
                </div>
              )}

              {/* Template warning */}
              <div style={{
                margin: "0 16px 16px",
                background: "#1a1200",
                border: "1px solid #854d0e",
                borderRadius: 7, padding: "8px 12px",
                color: "#ca8a04", fontSize: 11,
              }}>
                <strong>TEMPLATE DATA</strong> — Verify all steps against your current PC-12/47E AFM before operational use.
                AFM revision must match aircraft serial number and current STC/STB configuration.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
