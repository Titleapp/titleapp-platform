import React, { useState, useEffect } from "react";
import { WORKER_ROUTES } from "../data/workerRoutes";
import { SUITE_COLORS } from "../utils/workerIcons";

// Derive suite list from actual worker data
const ALL_SUITES = ["All", ...Array.from(new Set(WORKER_ROUTES.filter(w => !w.internal_only).map(w => w.suite)))];

const LANGUAGES = [
  { label: "English", code: "en" }, { label: "Espanol", code: "es" }, { label: "Portugues", code: "pt" },
  { label: "Francais", code: "fr" }, { label: "Deutsch", code: "de" }, { label: "Italiano", code: "it" },
  { label: "中文", code: "zh" }, { label: "粤語", code: "zh-HK" }, { label: "日本語", code: "ja" },
  { label: "한국어", code: "ko" }, { label: "हिन्दी", code: "hi" }, { label: "العربية", code: "ar" },
  { label: "Українська", code: "uk" }, { label: "Tieng Viet", code: "vi" }, { label: "ภาษาไทย", code: "th" },
  { label: "Bahasa", code: "id" }, { label: "Filipino", code: "fil" }, { label: "Русский", code: "ru" },
  { label: "Polski", code: "pl" }, { label: "Turkce", code: "tr" }, { label: "Ελληνικά", code: "el" },
  { label: "Nederlands", code: "nl" }, { label: "Svenska", code: "sv" },
];

function formatPrice(cents) {
  if (cents === 0) return "Free";
  return `$${cents / 100}/mo`;
}

export default function RAASStore() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSuite, setActiveSuite] = useState("All");
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem("PREFERRED_LANGUAGE") || "en");

  function handleLangClick(lang) {
    setSelectedLang(lang.code);
    localStorage.setItem("PREFERRED_LANGUAGE", lang.code);
    window.dispatchEvent(new CustomEvent("ta:language-changed", { detail: { code: lang.code, label: lang.label } }));
  }
  const [expandedId, setExpandedId] = useState(null);

  const workers = WORKER_ROUTES.filter(w => !w.internal_only);

  const filtered = workers.filter((w) => {
    const matchesSuite = activeSuite === "All" || w.suite === activeSuite;
    if (!matchesSuite) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (w.name || "").toLowerCase().includes(term) ||
      (w.description || "").toLowerCase().includes(term) ||
      (w.suite || "").toLowerCase().includes(term) ||
      (w.slug || "").toLowerCase().includes(term)
    );
  });

  const liveCount = workers.filter(w => w.status === "live").length;
  const plannedCount = workers.filter(w => w.status === "planned" || w.status === "waitlist").length;

  async function handleHire(worker) {
    if (worker.status !== "live") {
      setExpandedId(expandedId === worker.slug ? null : worker.slug);
      return;
    }
    // Subscribe to worker via API
    const token = localStorage.getItem("ID_TOKEN");
    const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
    try {
      const res = await fetch(`${apiBase}/api?path=/v1/worker:subscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.slug, slug: worker.slug }),
      });
      const data = await res.json();
      if (data.ok) {
        window.dispatchEvent(new CustomEvent("ta:workspace-changed", { detail: {} }));
        alert(`${worker.name || worker.display_name || "Worker"} added to your account.`);
      } else {
        alert(data.message || data.error || "Could not add worker.");
      }
    } catch (err) {
      console.error("Subscribe failed:", err);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>
          Marketplace
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          AI-powered apps built by domain experts — browse, subscribe, or build your own.
        </p>
      </div>

      {/* Stats + Language Bar */}
      <div style={{ marginBottom: 20, padding: "14px 0", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#111827", fontWeight: 700 }}>1,000+</span> Digital Workers</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#111827", fontWeight: 700 }}>54</span> Countries</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#111827", fontWeight: 700 }}>24/7</span></span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#111827", fontWeight: 700 }}>13</span> Industry Suites</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: "#94a3b8" }}>
          {LANGUAGES.map(l => (
            <span
              key={l.code}
              onClick={() => handleLangClick(l)}
              style={{ cursor: "pointer", color: selectedLang === l.code ? "#7c3aed" : undefined, fontWeight: selectedLang === l.code ? 600 : undefined, transition: "color 0.15s" }}
            >{l.label}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>Every worker speaks your language.</div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search by name, description, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            outline: "none",
            background: "#fff",
            color: "#1e293b",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Suite filter pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {ALL_SUITES.map((suite) => {
          const isActive = activeSuite === suite;
          return (
            <button
              key={suite}
              onClick={() => setActiveSuite(suite)}
              style={{
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "9999px",
                border: isActive ? "1px solid #7c3aed" : "1px solid #e2e8f0",
                background: isActive ? "#7c3aed" : "#fff",
                color: isActive ? "#fff" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {suite}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px" }}>
        {filtered.length} worker{filtered.length !== 1 ? "s" : ""}
        {activeSuite !== "All" ? ` in ${activeSuite}` : ""}
        {searchTerm.trim() ? ` matching "${searchTerm}"` : ""}
      </div>

      {/* Empty state (only if search/filter yields nothing) */}
      {filtered.length === 0 && (
        <div style={{
          padding: "60px 24px",
          textAlign: "center",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No workers found.
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
            Try a different search or filter.
          </div>
          <button
            onClick={() => { setSearchTerm(""); setActiveSuite("All"); }}
            style={{
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Worker grid */}
      {filtered.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}>
          {filtered.map((worker) => {
            const isLive = worker.status === "live";
            const isExpanded = expandedId === worker.slug;
            const sc = SUITE_COLORS[worker.suite] || { bg: "#f1f5f9", text: "#64748b" };

            return (
              <div
                key={worker.slug}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow 0.15s ease",
                }}
              >
                {/* Name */}
                <div style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: "4px",
                  lineHeight: 1.3,
                }}>
                  {worker.name}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: "14px",
                  color: "#475569",
                  lineHeight: 1.5,
                  marginBottom: "12px",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minHeight: "63px",
                }}>
                  {worker.description}
                </div>

                {/* Suite badge + status badge */}
                <div style={{ marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "#f3e8ff",
                    color: sc || "#7c3aed",
                    letterSpacing: "0.02em",
                  }}>
                    {worker.suite}
                  </span>
                  <span style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: isLive ? "#dcfce7" : "#fef3c7",
                    color: isLive ? "#166534" : "#92400e",
                  }}>
                    {isLive ? "Live" : "Coming Soon"}
                  </span>
                  {worker.bogoEligible && (
                    <span style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      background: "#0B7A6E",
                      color: "white",
                    }}>
                      BOGO
                    </span>
                  )}
                </div>

                {/* Price */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}>
                  <span style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#1e293b",
                  }}>
                    {formatPrice(worker.price)}
                  </span>
                </div>

                {/* Action button */}
                <div style={{ marginTop: "auto" }}>
                  {isExpanded ? (
                    <div style={{
                      padding: "10px 14px",
                      fontSize: "13px",
                      color: "#7c3aed",
                      background: "#faf5ff",
                      borderRadius: "8px",
                      border: "1px solid #e9d5ff",
                      textAlign: "center",
                      lineHeight: 1.4,
                    }}>
                      This worker is in development. You'll be notified when it launches.
                    </div>
                  ) : (
                    <button
                      onClick={() => handleHire(worker)}
                      style={{
                        width: "100%",
                        padding: "10px 0",
                        fontSize: "14px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: isLive ? "none" : "2px solid #7c3aed",
                        background: isLive ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "transparent",
                        color: isLive ? "#fff" : "#7c3aed",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isLive ? "Add to Vault" : "Notify Me"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
