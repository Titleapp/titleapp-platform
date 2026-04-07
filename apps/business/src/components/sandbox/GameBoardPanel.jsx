import React, { useEffect, useMemo, useState } from "react";

/**
 * GameBoardPanel — Test/Play mode for game sandbox.
 *
 * Renders included assets as the game's visual layer:
 *  - Background asset(s) → fills the board
 *  - Character asset(s)  → grid of cards with idle float animation
 *  - Icon/Item asset(s)  → smaller secondary grid
 *
 * Falls back to ALL canvas assets when nothing is explicitly tagged
 * "include in build" so anonymous sessions still see something visual.
 */
export default function GameBoardPanel({
  assets = [],
  includedAssetIds = [],
  workerCardData,
}) {
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [plays, setPlays] = useState(0);

  // Build the asset payload — included assets first, fall back to all canvas assets
  const { backgrounds, characters, icons, displayed } = useMemo(() => {
    const includedSet = new Set(includedAssetIds);
    let pool = assets.filter(a => includedSet.has(a.assetId || a.id));
    if (pool.length === 0) pool = assets;

    const backgrounds = pool.filter(a => a.useAs === "background");
    const characters = pool.filter(a => a.useAs === "character");
    const icons = pool.filter(a => a.useAs === "icon");

    // Anonymous-friendly fallback: if nothing tagged, treat all as characters
    if (backgrounds.length === 0 && characters.length === 0 && icons.length === 0 && pool.length > 0) {
      return { backgrounds: [], characters: pool, icons: [], displayed: pool };
    }
    return { backgrounds, characters, icons, displayed: pool };
  }, [assets, includedAssetIds]);

  // 5s loading timeout
  useEffect(() => {
    if (displayed.length > 0) return;
    const t = setTimeout(() => setLoadingTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [displayed.length]);

  const bgUrl = backgrounds[0]?.imageUrl || null;
  const gameName = workerCardData?.name || "Your game";

  if (displayed.length === 0) {
    return (
      <div style={{
        padding: "60px 24px", textAlign: "center",
        background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1",
        minHeight: 320, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
      }}>
        <div style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>
          {loadingTimedOut ? "Couldn't load your game assets." : "Loading your game..."}
        </div>
        {loadingTimedOut && (
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600,
              background: "var(--accent, #16A34A)", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer",
            }}
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      background: bgUrl
        ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${bgUrl}) center/cover`
        : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      minHeight: 520,
      padding: 24,
      color: "#fff",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>
            Game Board
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{gameName}</div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          padding: "6px 14px", borderRadius: 20,
          fontSize: 12, fontWeight: 700,
        }}>
          Plays: {plays}
        </div>
      </div>

      {/* Character grid */}
      {characters.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${characters.length === 1 ? 220 : 140}px, 1fr))`,
          gap: 14,
          marginBottom: icons.length > 0 ? 20 : 0,
        }}>
          {characters.map((c, i) => (
            <div
              key={c.id || c.assetId || i}
              onClick={() => setPlays(p => p + 1)}
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: 10,
                padding: 8,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <img
                src={c.imageUrl}
                alt={c.prompt || "Character"}
                className={`ta-anim-${c.animationConfig?.defaultAnimation || "idle"}`}
                style={{
                  width: "100%", display: "block",
                  borderRadius: 6, objectFit: "contain",
                  maxHeight: 180,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Icon row */}
      {icons.length > 0 && (
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap",
          padding: 12, background: "rgba(0,0,0,0.35)",
          borderRadius: 10,
        }}>
          {icons.map((it, i) => (
            <img
              key={it.id || it.assetId || i}
              src={it.imageUrl}
              alt={it.prompt || "Item"}
              style={{
                width: 56, height: 56, objectFit: "contain",
                background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: 4,
              }}
            />
          ))}
        </div>
      )}

      {/* Animation keyframes (defined here too in case CanvasImageCard isn't mounted) */}
      <style>{`
        @keyframes taAnimIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .ta-anim-idle { animation: taAnimIdle 3s ease-in-out infinite; }
        .ta-anim-action { animation: taAnimIdle 0.6s ease-in-out infinite; }
        .ta-anim-none { animation: none; }
      `}</style>
    </div>
  );
}
