import React, { useState, useEffect, useRef } from "react";

const NAV_BY_VERTICAL = {
  consumer: [
    { id: "dashboard", label: "Dashboard" },
    { id: "vault-documents", label: "Documents" },
    { id: "vault-assets", label: "Assets" },
    { id: "vault-deadlines", label: "Deadlines" },
    { id: "vault-tools", label: "AI Tools" },
  ],
  analyst: [
    { id: "dashboard", label: "Dashboard" },
    { id: "portfolio", label: "Portfolio" },
    { id: "research", label: "Research" },
    { id: "deal-pipeline", label: "Deal Pipeline" },
  ],
  auto: [
    { id: "dashboard", label: "Dashboard" },
    { id: "inventory", label: "Inventory" },
    { id: "customers", label: "Customers" },
    { id: "sales-pipeline", label: "Sales Pipeline" },
  ],
  "real-estate": [
    { id: "dashboard", label: "Dashboard" },
    { id: "re-listings", label: "Listings" },
    { id: "re-buyers", label: "Buyers" },
    { id: "re-transactions", label: "Transactions" },
  ],
  investor: [
    { id: "dashboard", label: "Dashboard" },
    { id: "investor-data-room", label: "Data Room" },
    { id: "investor-cap-table", label: "Cap Table" },
  ],
};

export default function QuickSwitcher({ isOpen, onClose, workspaces, onNavigate, onSwitchWorkspace }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const sections = NAV_BY_VERTICAL[vertical] || NAV_BY_VERTICAL.auto;

  // Build searchable items
  const items = [];

  // Workspaces
  (workspaces || []).forEach(ws => {
    items.push({
      type: "workspace",
      label: ws.name,
      sublabel: ws.type === "shared" ? `From ${ws.senderOrgName}` : (ws.vertical || ""),
      action: () => onSwitchWorkspace(ws),
    });
  });

  // Sections
  sections.forEach(s => {
    items.push({
      type: "section",
      label: s.label,
      sublabel: "Section",
      action: () => { onNavigate(s.id); onClose(); },
    });
  });

  // Always add common sections
  [
    { id: "raas-store", label: "Marketplace" },
    { id: "settings", label: "Settings" },
    { id: "reports", label: "Reports" },
    { id: "b2b-analytics", label: "B2B Distribution" },
  ].forEach(s => {
    if (!sections.find(x => x.id === s.id)) {
      items.push({
        type: "section",
        label: s.label,
        sublabel: "Section",
        action: () => { onNavigate(s.id); onClose(); },
      });
    }
  });

  // Filter
  const q = query.toLowerCase().trim();
  const filtered = q
    ? items.filter(item => item.label.toLowerCase().includes(q) || (item.sublabel || "").toLowerCase().includes(q))
    : items;

  // Group
  const grouped = {};
  filtered.forEach(item => {
    const group = item.type === "workspace" ? "Workspaces" : "Sections";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(item);
  });

  // Flat list for keyboard nav
  const flatList = Object.values(grouped).flat();

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatList[selectedIndex]) {
        flatList[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  let flatIndex = -1;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "15vh",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxWidth: "90vw", maxHeight: "60vh",
          background: "white", borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, color: "#94a3b8" }}>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="12" y1="12" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Switch to..."
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 16,
              padding: "4px 0", background: "transparent",
            }}
          />
          <kbd style={{
            padding: "2px 6px", borderRadius: 4, background: "#f1f5f9",
            fontSize: 11, color: "#64748b", border: "1px solid #e2e8f0",
          }}>ESC</kbd>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {flatList.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              No results found
            </div>
          )}
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group}>
              <div style={{
                padding: "8px 8px 4px", fontSize: 11, fontWeight: 600,
                color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {group}
              </div>
              {groupItems.map(item => {
                flatIndex++;
                const idx = flatIndex;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.type}-${item.label}-${idx}`}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: "10px 12px", borderRadius: 10,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                      background: isSelected ? "#f1f5f9" : "transparent",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: item.type === "workspace" ? "#7c3aed" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: item.type === "workspace" ? "white" : "#475569",
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}>
                      {item.label.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>{item.label}</div>
                      {item.sublabel && (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.sublabel}</div>
                      )}
                    </div>
                    {item.type === "workspace" && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>Workspace</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
