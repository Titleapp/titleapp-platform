import React from "react";

/**
 * FormModal - Reusable modal for forms
 */
export default function FormModal({ isOpen, onClose, title, children, onSubmit, submitLabel = "Submit" }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="backdrop"
        onClick={onClose}
        style={{ zIndex: 100 }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "90%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">{title}</div>
            <button
              className="iconBtn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: "16px" }}>{children}</div>

            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--line)",
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="iconBtn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="iconBtn"
                style={{
                  background: "var(--accent)",
                  color: "white",
                  borderColor: "var(--accent)",
                }}
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
