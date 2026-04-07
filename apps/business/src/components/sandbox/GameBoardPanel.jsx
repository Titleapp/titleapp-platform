import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * GameBoardPanel — Test/Play mode for game sandbox.
 *
 * CODEX 47.2 Fix 11 — Now interactive:
 *  - Touch / mouse / keyboard movement of selected character
 *  - Collision detection against icon items (recruit/score) and hazards (background-tagged "hazard" via prompt match)
 *  - Real-time score in top-right
 *  - 10-minute countdown timer
 *  - Game-over state
 *
 * Reads `gameInteractions` from workerCardData to configure controls + speed.
 */
export default function GameBoardPanel({
  assets = [],
  includedAssetIds = [],
  workerCardData,
  device = "mobile",
}) {
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [phase, setPhase] = useState("select"); // select | playing | gameover
  const [selectedCharIdx, setSelectedCharIdx] = useState(0);

  // Build the asset payload — included assets first, fall back to all canvas assets
  const { backgrounds, characters, icons, displayed } = useMemo(() => {
    const includedSet = new Set(includedAssetIds);
    let pool = assets.filter(a => includedSet.has(a.assetId || a.id));
    if (pool.length === 0) pool = assets;

    const backgrounds = pool.filter(a => a.useAs === "background");
    const characters = pool.filter(a => a.useAs === "character");
    const icons = pool.filter(a => a.useAs === "icon");

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
  const gameInteractions = workerCardData?.gameInteractions || {};
  const gameRules = workerCardData?.gameRules || {};

  // Character noun for "Choose Your X" label
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
  // Play area dimensions
  const PLAY_W = device === "desktop" ? 800 : device === "tablet" ? 640 : 380;
  const PLAY_H = device === "desktop" ? 480 : device === "tablet" ? 420 : 460;

  // ── Game engine state ──────────────────────────────────────────────────────
  const SESSION_SECONDS = 10 * 60;
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [playerPos, setPlayerPos] = useState({ x: PLAY_W / 2, y: PLAY_H / 2 });
  const playerPosRef = useRef({ x: PLAY_W / 2, y: PLAY_H / 2 });
  const playerVelRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({});
  const tickRef = useRef(null);
  const playAreaRef = useRef(null);
  const [entities, setEntities] = useState([]); // { id, type, x, y, asset }
  const [gameOverReason, setGameOverReason] = useState(null);

  // Speed by interactions config
  const baseSpeed = (() => {
    const s = (gameInteractions.speed || "").toLowerCase();
    if (/fast|frantic|quick/.test(s)) return 4.2;
    if (/slow|deliberate|chill/.test(s)) return 1.8;
    return 2.8; // default
  })();

  // Categorize icons into points/hazards by prompt keywords (best-effort, no extra config required)
  function classifyIcon(asset) {
    const p = ((asset.prompt || "") + " " + (asset.label || "")).toLowerCase();
    if (/squid|shark|enemy|hazard|boss|villain|sub|yacht|trap|bomb|mine|oil/.test(p)) return "hazard";
    return "point";
  }

  // Spawn entities when game starts
  useEffect(() => {
    if (phase !== "playing") return;
    if (entities.length > 0) return;
    const seed = [];
    // Drop icons across the field (or character non-selected as filler)
    const pool = icons.length > 0 ? icons : characters.filter((_, i) => i !== selectedCharIdx);
    pool.slice(0, 8).forEach((asset, i) => {
      seed.push({
        id: `e-${i}`,
        type: classifyIcon(asset),
        x: 40 + Math.random() * (PLAY_W - 80),
        y: 40 + Math.random() * (PLAY_H - 80),
        asset,
      });
    });
    setEntities(seed);
  }, [phase, icons, characters, selectedCharIdx, entities.length, PLAY_W, PLAY_H]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "playing") return;
    const i = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(i);
          setPhase("gameover");
          setGameOverReason("Time up!");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [phase]);

  // Keyboard listeners (desktop)
  useEffect(() => {
    if (phase !== "playing") return;
    const down = e => { keysRef.current[e.key.toLowerCase()] = true; };
    const up = e => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  // Game loop — runs while playing
  useEffect(() => {
    if (phase !== "playing") return;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      // Apply keyboard velocity
      const k = keysRef.current;
      let vx = playerVelRef.current.x;
      let vy = playerVelRef.current.y;
      if (k["arrowleft"] || k["a"])  vx = -baseSpeed;
      else if (k["arrowright"] || k["d"]) vx = baseSpeed;
      else if (Math.abs(vx) > 0.1) vx *= 0.85; else vx = 0;
      if (k["arrowup"] || k["w"])    vy = -baseSpeed;
      else if (k["arrowdown"] || k["s"])  vy = baseSpeed;
      else if (Math.abs(vy) > 0.1) vy *= 0.85; else vy = 0;
      playerVelRef.current = { x: vx, y: vy };

      // Update position with bounds
      const next = {
        x: Math.max(24, Math.min(PLAY_W - 24, playerPosRef.current.x + vx)),
        y: Math.max(24, Math.min(PLAY_H - 24, playerPosRef.current.y + vy)),
      };
      playerPosRef.current = next;
      setPlayerPos(next);

      // Collision detection
      setEntities(prev => {
        let changed = false;
        let scoreDelta = 0;
        let hitHazard = false;
        const remaining = prev.filter(e => {
          const dx = e.x - next.x;
          const dy = e.y - next.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 38) {
            changed = true;
            if (e.type === "point") {
              scoreDelta += 10;
              return false;
            } else {
              scoreDelta -= 5;
              hitHazard = true;
              return false;
            }
          }
          return true;
        });
        if (scoreDelta !== 0) setScore(s => Math.max(0, s + scoreDelta));
        if (hitHazard && score + scoreDelta <= -20) {
          // Hard fail after sustained losses (rare)
          setPhase("gameover");
          setGameOverReason("Eliminated by hazard");
        }
        // Re-spawn if board is clear
        if (changed && remaining.length === 0) {
          const pool = icons.length > 0 ? icons : characters.filter((_, i) => i !== selectedCharIdx);
          return pool.slice(0, 6).map((asset, i) => ({
            id: `r-${Date.now()}-${i}`,
            type: classifyIcon(asset),
            x: 40 + Math.random() * (PLAY_W - 80),
            y: 40 + Math.random() * (PLAY_H - 80),
            asset,
          }));
        }
        return changed ? remaining : prev;
      });

      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
  }, [phase, baseSpeed, PLAY_W, PLAY_H, icons, characters, selectedCharIdx, score]);

  // Touch / mouse — tap-to-move (target seek)
  function handlePointerMove(clientX, clientY) {
    if (phase !== "playing" || !playAreaRef.current) return;
    const rect = playAreaRef.current.getBoundingClientRect();
    const tx = clientX - rect.left;
    const ty = clientY - rect.top;
    const dx = tx - playerPosRef.current.x;
    const dy = ty - playerPosRef.current.y;
    const mag = Math.hypot(dx, dy) || 1;
    playerVelRef.current = {
      x: (dx / mag) * baseSpeed,
      y: (dy / mag) * baseSpeed,
    };
  }

  function startGame() {
    setScore(0);
    setSecondsLeft(SESSION_SECONDS);
    setEntities([]);
    setPlayerPos({ x: PLAY_W / 2, y: PLAY_H / 2 });
    playerPosRef.current = { x: PLAY_W / 2, y: PLAY_H / 2 };
    playerVelRef.current = { x: 0, y: 0 };
    setGameOverReason(null);
    setPhase("playing");
  }

  function resetGame() {
    setPhase("select");
    setEntities([]);
    setScore(0);
    setSecondsLeft(SESSION_SECONDS);
  }

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Render ────────────────────────────────────────────────────────────────
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

  const playerAsset = characters[selectedCharIdx] || characters[0];

  return (
    <div style={{
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      background: bgUrl
        ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${bgUrl}) center/cover`
        : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      minHeight: 580,
      padding: 20,
      color: "#fff",
      maxWidth: containerMaxWidth,
      margin: "0 auto",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>
            {phase === "select" ? `Choose Your ${characterNoun}` : phase === "gameover" ? "Game Over" : "Playing"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{gameName}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "playing" && (
            <>
              <div style={{
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                Score: {score}
              </div>
              <div style={{
                background: secondsLeft < 60 ? "rgba(220,38,38,0.7)" : "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                {fmtTime(secondsLeft)}
              </div>
            </>
          )}
          {phase === "select" && (
            <div style={{
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            }}>
              {device.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* SELECT phase — character grid */}
      {phase === "select" && characters.length > 0 && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${characters.length === 1 ? 220 : 140}px, 1fr))`,
            gap: 14, marginBottom: 16,
          }}>
            {characters.map((c, i) => {
              const isSel = selectedCharIdx === i;
              return (
                <div
                  key={c.id || c.assetId || i}
                  onClick={() => setSelectedCharIdx(i)}
                  style={{
                    background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: 8,
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
                      width: "100%", display: "block", borderRadius: 6,
                      objectFit: "contain", maxHeight: 180,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <button
              onClick={startGame}
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
        </>
      )}

      {/* PLAYING phase — interactive board */}
      {phase === "playing" && playerAsset && (
        <div
          ref={playAreaRef}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseLeave={() => { playerVelRef.current = { x: 0, y: 0 }; }}
          onTouchStart={e => {
            const t = e.touches[0];
            if (t) handlePointerMove(t.clientX, t.clientY);
          }}
          onTouchMove={e => {
            const t = e.touches[0];
            if (t) handlePointerMove(t.clientX, t.clientY);
          }}
          onTouchEnd={() => { playerVelRef.current = { x: 0, y: 0 }; }}
          style={{
            position: "relative",
            width: PLAY_W, height: PLAY_H,
            margin: "0 auto",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            overflow: "hidden",
            touchAction: "none",
            cursor: "crosshair",
          }}
        >
          {/* Entities */}
          {entities.map(e => (
            <img
              key={e.id}
              src={e.asset.imageUrl}
              alt=""
              style={{
                position: "absolute",
                left: e.x - 24, top: e.y - 24,
                width: 48, height: 48,
                objectFit: "contain",
                pointerEvents: "none",
                filter: e.type === "hazard" ? "drop-shadow(0 0 8px rgba(220,38,38,0.6))" : "drop-shadow(0 0 6px rgba(255,255,255,0.4))",
              }}
            />
          ))}
          {/* Player */}
          <img
            src={playerAsset.imageUrl}
            alt="Player"
            style={{
              position: "absolute",
              left: playerPos.x - 32, top: playerPos.y - 32,
              width: 64, height: 64,
              objectFit: "contain",
              pointerEvents: "none",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
              transition: "none",
            }}
          />
          {/* Mobile control hint */}
          {device !== "desktop" && (
            <div style={{
              position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center",
              fontSize: 11, color: "rgba(255,255,255,0.6)", pointerEvents: "none",
            }}>
              Drag anywhere to move
            </div>
          )}
          {device === "desktop" && (
            <div style={{
              position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center",
              fontSize: 11, color: "rgba(255,255,255,0.6)", pointerEvents: "none",
            }}>
              Arrow keys / WASD or move your mouse
            </div>
          )}
        </div>
      )}

      {/* GAME OVER */}
      {phase === "gameover" && (
        <div style={{
          padding: 24, textAlign: "center",
          background: "rgba(0,0,0,0.5)", borderRadius: 12,
          marginTop: 12,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{gameOverReason || "Game Over"}</div>
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 16 }}>Final score: <strong>{score}</strong></div>
          <button
            onClick={resetGame}
            style={{
              padding: "10px 24px", fontSize: 13, fontWeight: 700,
              background: "var(--accent, #16A34A)", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}
          >
            Play Again
          </button>
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
