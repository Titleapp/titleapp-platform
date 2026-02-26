import React, { useState, useEffect } from "react";

const CATEGORIES = ["All", "Healthcare", "Real Estate", "Auto", "Finance", "Consulting", "Other"];

export default function RAASStore() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [comingSoonId, setComingSoonId] = useState(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const resp = await fetch(`${apiBase}/api?path=/v1/raas:catalog`);
      const data = await resp.json();
      if (data.ok && data.workers) {
        setWorkers(data.workers);
      } else {
        setWorkers([]);
      }
    } catch (e) {
      console.error("Failed to load RAAS Store workers:", e);
      setError("");
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddToVault(workerId) {
    setComingSoonId(workerId);
  }

  function navigateToDashboard() {
    window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "dashboard" } }));
  }

  const filtered = workers.filter((w) => {
    const matchesCategory = activeCategory === "All" || (w.category || "Other").toLowerCase() === activeCategory.toLowerCase();
    if (!matchesCategory) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (w.name || "").toLowerCase();
    const description = (w.description || "").toLowerCase();
    const category = (w.category || "").toLowerCase();
    return name.includes(term) || description.includes(term) || category.includes(term);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#1e293b", margin: "0 0 6px 0" }}>
          Marketplace
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          AI-powered services built by experts. Hire them for your workspace.
        </p>
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

      {/* Category filter pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "9999px",
              border: activeCategory === cat ? "1px solid #7c3aed" : "1px solid #e2e8f0",
              background: activeCategory === cat ? "#7c3aed" : "#fff",
              color: activeCategory === cat ? "#fff" : "#64748b",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          padding: "48px",
          textAlign: "center",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: "15px", color: "#64748b" }}>Loading services...</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          padding: "20px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          color: "#dc2626",
          fontSize: "14px",
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{
          padding: "60px 24px",
          textAlign: "center",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No services published yet.
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
            Be the first to build one.
          </div>
          <button
            onClick={navigateToDashboard}
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
            Build a Service
          </button>
        </div>
      )}

      {/* Worker grid */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "16px",
        }}>
          {filtered.map((worker) => {
            const subscriberCount = worker.subscriber_count || 0;
            const rating = worker.rating;
            const price = worker.price || "Free";
            const category = worker.category || "Other";
            const showComingSoon = comingSoonId === worker.id;

            return (
              <div
                key={worker.id}
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
                {/* Service name */}
                <div style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: "4px",
                  lineHeight: 1.3,
                }}>
                  {worker.name || "Untitled Service"}
                </div>

                {/* Creator */}
                <div style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  marginBottom: "10px",
                }}>
                  by {worker.creator_name || "Unknown"}
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
                  {worker.description || "No description provided."}
                </div>

                {/* Category badge + titled badge */}
                <div style={{ marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "#f3e8ff",
                    color: "#7c3aed",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}>
                    {category}
                  </span>
                  {worker.titled && (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#7c3aed",
                      background: "#f5f3ff",
                      padding: "3px 8px",
                      borderRadius: "9999px",
                    }}>
                      Titled on Polygon
                    </span>
                  )}
                </div>

                {/* Price + subscribers + rating row */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}>
                  <span style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#1e293b",
                  }}>
                    {price}
                  </span>
                  <span style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    fontWeight: 500,
                  }}>
                    {subscriberCount > 0
                      ? `${subscriberCount} subscriber${subscriberCount !== 1 ? "s" : ""}`
                      : "New"}
                  </span>
                  <span style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    fontWeight: 500,
                    marginLeft: "auto",
                  }}>
                    {rating != null ? `${rating} / 5` : "No reviews yet"}
                  </span>
                </div>

                {/* Add to Vault button */}
                <div style={{ marginTop: "auto" }}>
                  {showComingSoon ? (
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
                      Coming soon -- hire notifications launching next month
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToVault(worker.id)}
                      style={{
                        width: "100%",
                        padding: "10px 0",
                        fontSize: "14px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: "2px solid #7c3aed",
                        background: "transparent",
                        color: "#7c3aed",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Hire
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
