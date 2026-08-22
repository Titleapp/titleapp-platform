/**
 * CanvasTabBar.jsx — Horizontal tab strip rendered above CanvasPanel
 * (CODEX 50.10-T3).
 *
 * Tabs come from the active worker's canvasTabs[] field. Click resolves
 * the tab's signal through the existing CANVAS_TYPES registry and pushes
 * the resolved card into RightPanelContext via showCanvas().
 *
 * If a chat turn emits its own signal, the parent finds the matching tab
 * (by signal) and passes it as activeSignal so the bar auto-selects it.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { lookupSignal } from "../../config/canvasTypes";
import SuggestImprovementButton from "../SuggestImprovementButton";
import { LogFlightModal, ReleaseFlightModal } from "./AviationWorkerCanvas";
import AutoDealerDealModal from "./AutoDealerDealModal";

// 2026-08-21 gap-audit fix — this tab bar renders ABOVE whichever card/tab is
// active (including the auto-landed default tab), so it's the one place
// guaranteed to be visible for aviation worker sessions regardless of which
// tab the user is on. AviationWorkerCanvas.jsx's own header buttons only
// render on the (less common) plain WorkerCanvas landing state — most real
// aviation worker sessions auto-land on a CanvasTabBar tab/card instead, so
// duplicating the buttons here is what actually makes them reachable live.

// 2026-08-21 (Sean) — worker tab bars with enough tabs to overflow the
// visible width (first hit: MSR Servicing's 6 tabs) had no way to discover
// the hidden ones. overflow-x:auto WAS working (scrollWidth > clientWidth),
// but macOS's overlay scrollbars are invisible until actively scrolled, so
// tabs past the fold looked like they didn't exist — reported as tabs
// silently missing / showing the generic landing card. Fix: detect overflow
// and render a right-edge fade + a scroll arrow so hidden tabs are visible
// and reachable without relying on an undiscoverable scrollbar.
export default function CanvasTabBar({ tabs, activeSignal, onSelectTab, workerSlug }) {
  const sorted = (tabs || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const defaultTab = sorted.find(t => t.default) || sorted[0];
  const [activeId, setActiveId] = useState(defaultTab?.id || null);
  const scrollRef = useRef(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  // 2026-08-21 gap-audit fix — "+ Log Flight" (CoPilot) / "+ Release Flight" (Dispatch)
  const [showLogFlight, setShowLogFlight] = useState(false);
  const [showReleaseFlight, setShowReleaseFlight] = useState(false);
  const isCopilotWorker = (workerSlug || "").startsWith("av-copilot");
  const isDispatchWorker = (workerSlug || "").startsWith("av-dispatch");
  const isAutoDeskingWorker = workerSlug === "ad-desking-deal";
  const [showNewDeal, setShowNewDeal] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setOverflow({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    el.addEventListener("scroll", updateOverflow, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateOverflow);
    };
  }, [sorted.length, updateOverflow]);

  // Sync to chat-emitted signal: if a tab matches, select it.
  // GUARD (2026-06-19): only let a chat-emitted signal override the user's
  // tab click when that signal identifies a UNIQUE tab. Platform workers
  // (HR, Marketing, …) declare every tab with the same signal
  // (card:work-product), so an unguarded find() always re-matched the FIRST
  // such tab and snapped the underline back to it on every click.
  useEffect(() => {
    if (!activeSignal) return;
    const matches = sorted.filter(t => t.signal === activeSignal);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (matches.length === 1 && matches[0].id !== activeId) setActiveId(matches[0].id);
  }, [activeSignal, sorted, activeId]);

  if (!sorted.length) return null;

  function handleClick(tab, e) {
    setActiveId(tab.id);
    e?.currentTarget?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const resolved = lookupSignal(tab.signal);
    if (typeof onSelectTab === "function") onSelectTab(tab, resolved);
  }

  function scrollByAmount(delta) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex" }}>
        <div
          ref={scrollRef}
          style={{ display: "flex", flexWrap: "nowrap", flex: 1, minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", rowGap: 0 }}
        >
          {sorted.map(t => {
            const active = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={(e) => handleClick(t, e)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#111" : "#6b7280",
                  borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#111"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#6b7280"; }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {overflow.right && (
          <button
            onClick={() => scrollByAmount(160)}
            aria-label="Show more tabs"
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer", color: "#6b7280",
              background: "linear-gradient(to right, rgba(255,255,255,0), #fff 55%)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}
        {overflow.left && (
          <button
            onClick={() => scrollByAmount(-160)}
            aria-label="Show previous tabs"
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer", color: "#6b7280",
              background: "linear-gradient(to left, rgba(255,255,255,0), #fff 55%)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
      </div>
      {isCopilotWorker && (
        <div style={{ paddingRight: 8, paddingTop: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowLogFlight(true)}
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + Log Flight
          </button>
        </div>
      )}
      {isDispatchWorker && (
        <div style={{ paddingRight: 8, paddingTop: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowReleaseFlight(true)}
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + Release Flight
          </button>
        </div>
      )}
      {isAutoDeskingWorker && (
        <div style={{ paddingRight: 8, paddingTop: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowNewDeal(true)}
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + New Deal
          </button>
        </div>
      )}
      {workerSlug && (
        <div style={{ paddingRight: 12, paddingTop: 6, flexShrink: 0 }}>
          <SuggestImprovementButton workerSlug={workerSlug} />
        </div>
      )}
      {showLogFlight && <LogFlightModal onClose={() => setShowLogFlight(false)} onLogged={() => setShowLogFlight(false)} />}
      {showReleaseFlight && <ReleaseFlightModal onClose={() => setShowReleaseFlight(false)} onReleased={() => setShowReleaseFlight(false)} />}
      {showNewDeal && <AutoDealerDealModal onClose={() => setShowNewDeal(false)} onDone={() => setShowNewDeal(false)} />}
    </div>
  );
}
