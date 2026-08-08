import React, { useState, useEffect, useCallback } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, limit, onSnapshot } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Hawaii airports Sean flies to
const HI_AIRPORTS = [
  { icao: "PHOG", name: "Maui (OGG)" },
  { icao: "PHNL", name: "Honolulu (HNL)" },
  { icao: "PHKO", name: "Kona (KOA)" },
  { icao: "PHTO", name: "Hilo (ITO)" },
  { icao: "PHNY", name: "Lanai (LNY)" },
  { icao: "PHJH", name: "Kapalua (JHM)" },
];

const FLIGHT_CAT_COLOR = { VFR: "#16a34a", MVFR: "#2563eb", IFR: "#dc2626", LIFR: "#7c3aed", "": "#94a3b8" };
const FLIGHT_CAT_BG   = { VFR: "#dcfce7", MVFR: "#dbeafe", IFR: "#fee2e2", LIFR: "#ede9fe", "": "#f1f5f9" };

function windDir(deg) {
  if (deg === null || deg === undefined || deg === 0) return "calm";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function MetarCard({ m }) {
  const cat = m.fltCat || "";
  const catColor = FLIGHT_CAT_COLOR[cat] || FLIGHT_CAT_COLOR[""];
  const catBg    = FLIGHT_CAT_BG[cat]    || FLIGHT_CAT_BG[""];
  const wspd = m.wspd || 0;
  const wgst = m.wgst;
  const windStr = wspd === 0 ? "Calm" : `${windDir(m.wdir)} ${wspd}${wgst ? `G${wgst}` : ""}kt`;
  const ceilFt = m.clouds?.find(c => ["BKN","OVC","OVX"].includes(c.cover))?.base;
  const ceilStr = ceilFt != null ? `${ceilFt.toLocaleString()}ft` : "Clear";
  const tempC = m.temp != null ? `${Math.round(m.temp)}°C` : "";
  const vis = m.visib != null ? (m.visib === "10+" ? "10+SM" : `${m.visib}SM`) : "";

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "10px 12px",
      minWidth: 130,
      flex: "0 0 auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m.icaoId}</span>
        {cat && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: catColor, background: catBg,
            borderRadius: 4, padding: "2px 6px", letterSpacing: "0.04em",
          }}>{cat}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
        <div>{windStr}</div>
        <div>Ceil {ceilStr}</div>
        {vis && <div>Vis {vis}</div>}
        {tempC && <div>{tempC}</div>}
      </div>
    </div>
  );
}

function WeatherWidget({ weather, loading }) {
  if (loading) return <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading weather...</div>;
  if (!weather) return null;
  const icon = weather.code <= 1 ? "☀️" : weather.code <= 3 ? "⛅" : weather.code <= 67 ? "🌧️" : weather.code <= 77 ? "❄️" : "⛈️";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 32 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{Math.round(weather.temp)}°F</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{weather.desc} · {weather.city || "Your location"}</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>H:{Math.round(weather.high)}° L:{Math.round(weather.low)}°</div>
      </div>
    </div>
  );
}

const WMO_CODES = {
  0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
  45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
  61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",
  80:"Rain showers",81:"Rain showers",82:"Violent showers",95:"Thunderstorm",99:"Thunderstorm",
};

const PREF_KEY = "sociii_brief_prefs";
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

const THOUGHTS = [
  // Ancient wisdom
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", attr: "Marcus Aurelius" },
  { text: "It is not that I am so smart, it is just that I stay with problems longer.", attr: "Socrates" },
  { text: "The unexamined life is not worth living.", attr: "Socrates" },
  { text: "We suffer more in imagination than in reality.", attr: "Seneca" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", attr: "Marcus Aurelius" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", attr: "Epictetus" },
  { text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.", attr: "Lao Tzu" },
  { text: "The obstacle is the way.", attr: "Marcus Aurelius" },
  { text: "He who learns but does not think is lost. He who thinks but does not learn is in great danger.", attr: "Confucius" },
  { text: "The way out is through.", attr: "Seneca" },
  { text: "First, say to yourself what you would be; then do what you have to do.", attr: "Epictetus" },
  { text: "Do not go where the path may lead; go instead where there is no path and leave a trail.", attr: "Ralph Waldo Emerson" },
  { text: "The present moment always will have been.", attr: "Marcus Aurelius" },
  { text: "If you realize that all things change, there is nothing you will try to hold on to.", attr: "Lao Tzu" },
  { text: "No man ever steps in the same river twice, for it's not the same river and he's not the same man.", attr: "Heraclitus" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", attr: "Plutarch" },
  { text: "He that can have patience can have what he will.", attr: "Benjamin Franklin" },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", attr: "Anne Lamott" },
  // Modern / AI age
  { text: "For the first time in history, we have created entities that can outperform us at cognitive tasks — yet meaning remains stubbornly human.", attr: null },
  { text: "Algorithms can optimize for almost anything. They cannot tell you what is worth optimizing for.", attr: null },
  { text: "When machines can do everything we can do, the only distinctly human act left is to choose what matters.", attr: null },
  { text: "We are the first generation that must decide, consciously, what it means to be human.", attr: null },
  { text: "AI can write a symphony. It takes a human to need one.", attr: null },
  { text: "The ancient questions return with new urgency: What am I? What do I want? What should I do?", attr: null },
  { text: "Technology amplifies what we already are. If we don't know what we are, that is terrifying.", attr: null },
  { text: "The danger of AI is not that it will rebel. It is that we will outsource our judgment to it, and slowly forget how to judge.", attr: null },
  { text: "Consciousness remains unexplained. That gap — between neurons and experience — is where humans still live, fully.", attr: null },
  { text: "Community is not a product. You cannot download belonging.", attr: null },
  { text: "In a world of infinite information, the rarest thing is a person who knows what they believe and why.", attr: null },
  { text: "We built tools to extend our hands, engines to extend our muscles, computers to extend our memory. Now we build minds. What remains that is ours?", attr: null },
  { text: "Meaning is not found in optimization. It emerges from commitment to something beyond yourself.", attr: null },
  { text: "Perhaps the most human thing left is to sit with uncertainty and not reach for your phone.", attr: null },
  { text: "To know what you love — and to choose it, daily, in the face of infinite distraction — may be the defining act of the coming century.", attr: null },
];

function getDailyThought() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return THOUGHTS[dayOfYear % THOUGHTS.length];
}


const SEV_CONFIG = {
  red:   { color: "#dc2626", bg: "#fee2e2", dot: "#dc2626", label: "Critical" },
  amber: { color: "#d97706", bg: "#fef3c7", dot: "#f59e0b", label: "Heads up" },
  green: { color: "#16a34a", bg: "#dcfce7", dot: "#16a34a", label: "FYI" },
};

const FEED_CAP = 12;

function OperatingFeedItem({ item, onResolve, onSnooze }) {
  const sc = SEV_CONFIG[item.severity] || SEV_CONFIG.amber;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "9px 12px", background: "#f8fafc",
      borderRadius: 8, border: `1px solid ${item.severity === "red" ? "#fecaca" : "#e2e8f0"}`,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.title}</div>
        {item.body && (
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{item.body}</div>
        )}
        {item.action_hint && (
          <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3 }}>{item.action_hint}</div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, background: sc.bg, borderRadius: 4, padding: "1px 7px" }}>
            {sc.label}
          </span>
          {item.source_label && item.source_label !== "Alex" && (
            <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", borderRadius: 4, padding: "1px 6px" }}>
              {item.source_label}
            </span>
          )}
          <button
            onClick={() => onResolve(item.id)}
            style={{ fontSize: 10, color: "#16a34a", background: "none", border: "none", cursor: "pointer", padding: "1px 4px", fontWeight: 600 }}
          >
            Done
          </button>
          <button
            onClick={() => onSnooze(item.id, 24)}
            style={{ fontSize: 10, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "1px 4px" }}
          >
            Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MorningBriefCanvas({ hasAviationWorker }) {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const [metars, setMetars]             = useState([]);
  const [weather, setWeather]           = useState(null);
  const [weatherLoading, setWL]         = useState(true);
  const [metarLoading, setML]           = useState(true);
  const [customizing, setCustomizing]   = useState(false);
  const [alertItems, setAlertItems]     = useState([]);
  const [feedOverflow, setFeedOverflow] = useState(0);
  const [netWorth, setNetWorth]         = useState(null);
  const [prefs, setPrefs]               = useState(() => ({
    showWeather: true,
    showAviation: true,
    showPriorities: true,
    showNetWorth: true,
    showThought: true,
    city: null,
    ...loadPrefs(),
  }));

  // Real-time listener on alertFeed/{uid}/items — waits for auth to resolve
  useEffect(() => {
    let snapUnsub = null;
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (snapUnsub) { snapUnsub(); snapUnsub = null; }
      if (!user) return;
      const q = query(
        collection(db, "alertFeed", user.uid, "items"),
        where("resolved", "==", false),
        limit(50),
      );
      snapUnsub = onSnapshot(q, (snap) => {
        const now = Date.now();
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(it => !it.snoozeUntil || it.snoozeUntil.toMillis() <= now)
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        const reds = all.filter(it => it.severity === "red");
        const rest = all.filter(it => it.severity !== "red");
        const visible = [...reds, ...rest].slice(0, FEED_CAP);
        setAlertItems(visible);
        setFeedOverflow(Math.max(0, all.length - FEED_CAP));
      }, (err) => console.error("alertFeed listener:", err));
    });
    return () => { if (snapUnsub) snapUnsub(); authUnsub(); };
  }, [auth, db]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleResolve = useCallback(async (alertId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    // Optimistic remove — listener confirms via Firestore
    setAlertItems(prev => prev.filter(it => it.id !== alertId));
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE}/api?path=/v1/alertFeed:resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId }),
      });
    } catch (e) { console.warn("alertFeed resolve:", e.message); }
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [auth]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleSnooze = useCallback(async (alertId, hours) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    // Optimistic remove — listener will re-add when snooze expires
    setAlertItems(prev => prev.filter(it => it.id !== alertId));
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE}/api?path=/v1/alertFeed:snooze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, snooze_hours: hours }),
      });
    } catch (e) { console.warn("alertFeed snooze:", e.message); }
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [auth]);

  // Fetch Vault net worth (sum of DTC estimatedValue fields)
  useEffect(() => {
    if (!prefs.showNetWorth) return;
    let cancelled = false;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubAuth();
      if (!user || cancelled) return;
      try {
        const token = await user.getIdToken();
        const r = await fetch(`${API_BASE}/api?path=/v1/dtc:list`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": "vault" },
        });
        const d = await r.json();
        const items = d.dtcs || d.items || [];
        function getVal(item) {
          const m = item.metadata || {};
          return Number(m.estimatedValue) || Number(m.value) || Number(m.marketValue) || Number(m.purchasePrice) || Number(item.value) || 0;
        }
        const total = items.reduce((s, a) => s + getVal(a), 0);
        if (total > 0 && !cancelled) setNetWorth(total);
      } catch (e) { console.warn("netWorth fetch:", e.message); }
    });
    return () => { cancelled = true; unsubAuth(); };
  }, [auth, prefs.showNetWorth]);

  const updatePref = useCallback((key, val) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: val };
      savePrefs(next);
      return next;
    });
  }, []);

  // Fetch METARs from aviationweather.gov (via backend proxy to avoid CORS + add caching)
  useEffect(() => {
    if (!prefs.showAviation || !hasAviationWorker) return;
    const ids = HI_AIRPORTS.map(a => a.icao).join(",");
    fetch(`https://aviationweather.gov/api/data/metar?ids=${ids}&format=json`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMetars(data);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setML(false));
  }, [prefs.showAviation, hasAviationWorker]);

  // General weather via OpenMeteo (free, no auth, CORS open)
  useEffect(() => {
    if (!prefs.showWeather) return;
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`;
          const r = await fetch(url);
          const d = await r.json();
          const code = d.current?.weather_code ?? 0;
          // Reverse geocode city from coordinates via nominatim (free)
          let city = null;
          try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const gd = await geo.json();
            city = gd.address?.city || gd.address?.town || gd.address?.village || null;
          } catch { /* ignore */ }
          setWeather({
            temp: d.current?.temperature_2m ?? 0,
            high: d.daily?.temperature_2m_max?.[0] ?? 0,
            low:  d.daily?.temperature_2m_min?.[0] ?? 0,
            code,
            desc: WMO_CODES[code] ?? "Unknown",
            city,
          });
        } catch { /* ignore */ }
        setWL(false);
      },
      () => setWL(false)
    );
  }, [prefs.showWeather]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const _HONORIFICS = new Set(["Dr.", "Dr", "Mr.", "Mr", "Ms.", "Ms", "Mrs.", "Mrs", "Prof.", "Prof"]);
  const firstName = (user?.displayName || "").split(" ").find(p => !_HONORIFICS.has(p)) || "";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dailyThought = getDailyThought();

  return (
    <div className="morningBriefWrapper" style={{ maxWidth: 860, height: "100%", overflowY: "auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{dateStr}</div>
        </div>
        <button
          onClick={() => setCustomizing(c => !c)}
          style={{
            background: "none", border: "1px solid #e2e8f0", borderRadius: 8,
            padding: "6px 12px", fontSize: 12, color: "#64748b", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          Customize
        </button>
      </div>

      {/* Customize panel */}
      {customizing && (
        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: "14px 16px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap",
        }}>
          {[
            { key: "showWeather",    label: "Local weather" },
            { key: "showAviation",   label: "Hawaii aviation METARs", hidden: !hasAviationWorker },
            { key: "showNetWorth",   label: "Vault net worth" },
            { key: "showThought",    label: "Daily thought" },
            { key: "showPriorities", label: "Operating Feed" },
          ].filter(i => !i.hidden).map(item => (
            <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!prefs[item.key]}
                onChange={e => updatePref(item.key, e.target.checked)}
              />
              {item.label}
            </label>
          ))}
        </div>
      )}

      {/* Weather row */}
      {prefs.showWeather && (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "16px 20px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Today&apos;s Weather
          </div>
          <WeatherWidget weather={weather} loading={weatherLoading} />
        </div>
      )}

      {/* Hawaii aviation METAR strip */}
      {prefs.showAviation && hasAviationWorker && (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "16px 20px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Hawaii Aviation Weather
            </div>
            <a
              href="https://aviationweather.gov/products/taf?ids=PHOG,PHNL,PHKO,PHTO,PHNY,PHJH"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none" }}
            >
              Full TAF →
            </a>
          </div>

          {/* Hawaii radar map */}
          <div style={{ marginBottom: 14, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <img
              src="https://radar.weather.gov/ridge/standard/HAWAII_loop.gif"
              alt="Hawaii radar"
              style={{ width: "100%", maxHeight: 340, objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          </div>

          {/* METAR cards */}
          {metarLoading ? (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading METARs...</div>
          ) : metars.length > 0 ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {metars.map(m => <MetarCard key={m.icaoId} m={m} />)}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>No METAR data available</div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {Object.entries({ VFR: "VFR", MVFR: "Marginal", IFR: "IFR", LIFR: "Low IFR" }).map(([k, label]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#64748b" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: FLIGHT_CAT_COLOR[k], display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vault Net Worth */}
      {prefs.showNetWorth && netWorth !== null && (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 20,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Vault — Net Worth
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
              ${netWorth >= 1_000_000
                ? `${(netWorth / 1_000_000).toFixed(2)}M`
                : netWorth >= 1_000
                ? `${(netWorth / 1_000).toFixed(0)}K`
                : netWorth.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Across all tracked assets</div>
          </div>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#f5f3ff"/>
            <path d="M10 28l6-8 5 4 5-10 4 6" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Operating Feed — before Daily Thought so alerts are visible without scrolling */}
      {prefs.showPriorities && (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "16px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Operating Feed
              </div>
              {alertItems.some(it => it.severity === "red") && (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626" }} />
              )}
            </div>
            {feedOverflow > 0 && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{feedOverflow} more</div>
            )}
          </div>
          {alertItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alertItems.map(item => (
                <OperatingFeedItem
                  key={item.id}
                  item={item}
                  onResolve={handleResolve}
                  onSnooze={handleSnooze}
                />
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Nothing on the feed right now. Ask Alex to surface priorities here.
            </div>
          )}
        </div>
      )}

      {/* Daily Thought */}
      {prefs.showThought && (
        <div style={{
          background: "#fafafa", border: "1px solid #f1f5f9", borderRadius: 12,
          padding: "16px 20px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Today
          </div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, fontStyle: "italic" }}>
            &ldquo;{dailyThought.text}&rdquo;
          </div>
          {dailyThought.attr && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
              — {dailyThought.attr}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
