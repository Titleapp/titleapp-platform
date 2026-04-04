import React, { useState, useEffect, useCallback, useRef } from "react";
import CanvasImageCard from "./canvas/CanvasImageCard";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const ASSET_TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "character", label: "Character" },
  { value: "background", label: "Background" },
  { value: "icon", label: "Icon" },
];

export default function MyImagesPanel({ onClose }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [toast, setToast] = useState(null);
  const debounceRef = useRef(null);

  const fetchAssets = useCallback(async (opts = {}) => {
    const token = localStorage.getItem("ID_TOKEN");
    if (!token) return;

    const params = new URLSearchParams();
    if (opts.assetType) params.set("assetType", opts.assetType);
    if (opts.search && opts.search.length >= 2) params.set("search", opts.search);
    if (opts.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString();

    try {
      const resp = await fetch(`${API_BASE}/api?path=/v1/assets:list${qs ? `&${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.ok) {
        return { assets: data.assets || [], nextCursor: data.nextCursor || null };
      }
    } catch (e) {
      console.warn("[MyImagesPanel] fetch failed:", e.message);
    }
    return { assets: [], nextCursor: null };
  }, []);

  // Initial load + filter changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const doFetch = async () => {
      const result = await fetchAssets({ assetType: typeFilter, search });
      if (cancelled) return;
      setAssets(result.assets);
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
      setLoading(false);
    };

    if (search.length >= 2 || search.length === 0) {
      debounceRef.current = setTimeout(doFetch, search.length >= 2 ? 300 : 0);
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [typeFilter, search, fetchAssets]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchAssets({ assetType: typeFilter, search, cursor });
    setAssets(prev => [...prev, ...result.assets]);
    setCursor(result.nextCursor);
    setHasMore(!!result.nextCursor);
    setLoadingMore(false);
  };

  const handleDelete = async (asset) => {
    const token = localStorage.getItem("ID_TOKEN");
    if (!token) return;
    setAssets(prev => prev.filter(a => a.id !== asset.id && a.assetId !== asset.assetId));
    try {
      await fetch(`${API_BASE}/api?path=/v1/asset:delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.assetId || asset.id }),
      });
    } catch (e) {
      console.warn("[MyImagesPanel] delete failed:", e.message);
    }
  };

  const handleLedger = (asset) => {
    setToast("Ledger integration coming soon.");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>My Images</div>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "var(--accent, #6B46C1)",
              background: "var(--accent-light, rgba(107,70,193,0.08))",
              padding: "2px 8px", borderRadius: 10,
            }}>
              {assets.length}{hasMore ? "+" : ""}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, color: "#64748b", cursor: "pointer" }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search prompts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 8,
            border: "1px solid #e2e8f0", outline: "none", background: "#f8fafc",
          }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: "8px 12px", fontSize: 13, borderRadius: 8,
            border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer",
          }}
        >
          {ASSET_TYPE_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Loading images...
        </div>
      )}

      {/* Grid */}
      {!loading && assets.length > 0 && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12, marginBottom: 16,
          }}>
            {assets.map(asset => (
              <CanvasImageCard
                key={asset.id || asset.assetId}
                asset={asset}
                onDelete={handleDelete}
                savedToLibrary={true}
                showLedgerButton={true}
                onLedgerClick={handleLedger}
              />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: "8px 24px", fontSize: 13, fontWeight: 600,
                  borderRadius: 8, cursor: loadingMore ? "default" : "pointer",
                  background: "#fff", border: "1px solid #e2e8f0", color: "#64748b",
                }}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && assets.length === 0 && (
        <div style={{
          padding: "40px 20px", textAlign: "center",
          background: "#f8fafc", borderRadius: 10, border: "1px dashed #d4d4d8",
        }}>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
            No images yet. Generate artwork in any project to start your library.
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a2e", color: "#fff", padding: "10px 20px", borderRadius: 10,
          zIndex: 1000, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontSize: 13,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
