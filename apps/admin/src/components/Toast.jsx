import React, { useEffect } from "react";

/**
 * Toast - Non-blocking notification component
 *
 * Usage:
 * <Toast message="Success!" type="success" onClose={() => setToast(null)} />
 */
export default function Toast({ message, type = "info", duration = 3000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const colors = {
    success: { bg: "#10b981", border: "#059669" },
    error: { bg: "#ef4444", border: "#dc2626" },
    info: { bg: "#3b82f6", border: "#2563eb" },
    warning: { bg: "#f59e0b", border: "#d97706" },
  };

  const color = colors[type] || colors.info;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        maxWidth: "400px",
        padding: "14px 18px",
        background: color.bg,
        color: "white",
        borderRadius: "12px",
        border: `2px solid ${color.border}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        zIndex: 10000,
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: "6px",
          color: "white",
          cursor: "pointer",
          padding: "4px 8px",
          fontSize: "16px",
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ✕
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
