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
  device = "mobile",
}) {
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [plays, setPlays] = useState(0);
  // CODEX 47.1 Fix 5 — character select → playing flow.
  // "select" shows the character grid + Start Game; "playing" shows the active board.
  const [phase, setPhase] = useState("select");
  const [selectedCharIdx, setSelectedCharIdx] = useState(0);

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

  // Character noun — derived from game type so the label fits the game
  const characterNoun = (() => {
    const t = (workerCardData?.gameConfig?.characterNoun || workerCardData?.name || "").toLowerCase();
    if (/shark/.test(t)) return "Shark";
    if (/pilot|plane|jet/.test(t)) return "Pilot";
    if (/robot/.test(t)) return "Robot";
    if (/hero/.test(t)) return "Hero";
    if (/animal|pet|creature/.test(t)) return "Creature";
    return "Character";
  })();

  // Device-aware container — desktop wider, mobile narrower
  const containerMaxWidth = device === "desktop" ? 900 : device === "tablet" ? 720 : 480;

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
      maxWidth: containerMaxWidth,
      margin: "0 auto",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>
            {phase === "select" ? `Choose Your ${characterNoun}` : "Game Board"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{gameName}</div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          padding: "6px 14px", borderRadius: 20,
          fontSize: 12, fontWeight: 700,
        }}>
          {phase === "select" ? device.toUpperCase() : `Plays: ${plays}`}
        </div>
      </div>

      {/* Character grid (select phase) */}
      {phase === "select" && characters.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${characters.length === 1 ? 220 : 140}px, 1fr))`,
          gap: 14,
          marginBottom: 20,
        }}>
          {characters.map((c, i) => {
            const isSel = selectedCharIdx === i;
            return (
              <div
                key={c.id || c.assetId || i}
                onClick={() => setSelectedCharIdx(i)}
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 10,
                  padding: 8,
                  cursor: "pointer",
                  boxShadow: isSel ? "0 0 0 4px var(--accent, #16A34A), 0 4px 12px rgba(0,0,0,0.25)" : "0 4px 12px rgba(0,0,0,0.25)",
                  transition: "all 0.15s ease",
                }}
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
            );
          })}
        </div>
      )}

      {/* Playing phase: selected character only, larger, with tap-to-play */}
      {phase === "playing" && characters.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div
            onClick={() => setPlays(p => p + 1)}
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: 12,
              padding: 12,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              maxWidth: 280,
            }}
          >
            <img
              src={(characters[selectedCharIdx] || characters[0]).imageUrl}
              alt="Player character"
              className={`ta-anim-${(characters[selectedCharIdx] || characters[0]).animationConfig?.defaultAnimation || "idle"}`}
              style={{ width: "100%", display: "block", borderRadius: 8, objectFit: "contain", maxHeight: 240 }}
            />
          </div>
        </div>
      )}

      {/* Start Game button — select phase only */}
      {phase === "select" && characters.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <button
            onClick={() => setPhase("playing")}
            style={{
              padding: "12px 32px", fontSize: 15, fontWeight: 800,
              background: "var(--accent, #16A34A)", color: "#fff",
              border: "none", borderRadius: 10, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              letterSpacing: 0.5, textTransform: "uppercase",
            }}
          >
            Start Game
          </button>
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
