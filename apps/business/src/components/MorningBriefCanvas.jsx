import React, { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";

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

export default function MorningBriefCanvas({ hasAviationWorker, notes, priorities }) {
  const auth = getAuth();
  const user = auth.currentUser;

  const [metars, setMetars]           = useState([]);
  const [weather, setWeather]         = useState(null);
  const [weatherLoading, setWL]       = useState(true);
  const [metarLoading, setML]         = useState(true);
  const [customizing, setCustomizing] = useState(false);
  const [prefs, setPrefs]             = useState(() => ({
    showWeather: true,
    showAviation: true,
    showPriorities: true,
    city: null,
    ...loadPrefs(),
  }));

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

  // Structured priorities from Alex take precedence; fall back to note-tagged items
  const structuredPriorities = Array.isArray(priorities) && priorities.length > 0 ? priorities : null;
  const notePriorities = (notes || []).filter(n =>
    n.tags?.some(t => ["today", "priority", "urgent", "from-code"].includes(t))
  ).slice(0, 5).map(n => ({ id: n.id, title: n.title, detail: n.content?.slice(0, 120) || null }));
  const todayPriorities = structuredPriorities || notePriorities;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.displayName?.split(" ")[0] || "";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, height: "100%", overflowY: "auto" }}>

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
            { key: "showPriorities", label: "Today's priorities" },
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
              href="https://aviationweather.gov/metar/data?ids=PHOG+PHNL+PHKO+PHTO+PHNY+PHJH&format=decoded&hours=0&taf=on"
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
              style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
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

      {/* Today's priorities */}
      {prefs.showPriorities && (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "16px 20px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Today&apos;s Priorities
          </div>
          {todayPriorities.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayPriorities.map((n, i) => {
                const dotColor = n.priority === "high" ? "#dc2626" : n.priority === "low" ? "#94a3b8" : "#7c3aed";
                return (
                  <div key={n.id || i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0",
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{n.title}</div>
                      {n.detail && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{n.detail}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {n.deadline && (
                          <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600, background: "#fef2f2", borderRadius: 4, padding: "1px 6px" }}>{n.deadline}</span>
                        )}
                        {n.sourceWorker && (
                          <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 500, background: "#f5f3ff", borderRadius: 4, padding: "1px 6px" }}>{n.sourceWorker}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              No priorities yet. Tell Alex what&apos;s on your plate — it will appear here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
