import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const SPIN_KEYFRAMES = `
@keyframes spinKey {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

export default function WorkerPreview() {
  const auth = getAuth();
  const db = getFirestore();

  const [workerDoc, setWorkerDoc] = useState(null);
  const [workerDocId, setWorkerDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Inject keyframes for spinner
    const style = document.createElement("style");
    style.textContent = SPIN_KEYFRAMES;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    // Resolve user name from discovered context or auth
    try {
      const raw = sessionStorage.getItem("ta_discovered_context");
      if (raw) {
        const ctx = JSON.parse(raw);
        if (ctx.businessName) setUserName(ctx.businessName);
        else if (ctx.name) setUserName(ctx.name);
      }
    } catch (e) { /* ignore */ }

    if (!userName && auth.currentUser?.displayName) {
      setUserName(auth.currentUser.displayName);
    }

    loadWorkerDoc();
  }, []);

  async function loadWorkerDoc() {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "workers"),
        where("creator_id", "==", user.uid)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const first = snap.docs[0];
        setWorkerDoc(first.data());
        setWorkerDocId(first.id);
      }
    } catch (err) {
      console.error("Failed to load worker document:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!workerDocId) return;
    setPublishing(true);
    try {
      const ref = doc(db, "workers", workerDocId);
      await updateDoc(ref, { published: true });
      window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "dashboard" } }));
    } catch (err) {
      console.error("Failed to publish worker:", err);
      setPublishing(false);
    }
  }

  function handleEdit() {
    window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "creator-dashboard" } }));
  }

  function handlePreviewLink() {
    console.log("[WorkerPreview] Preview subscriber view for worker:", workerDocId, workerDoc);
  }

  // Loading state
  if (loading || !workerDoc) {
    return (
      <div>
        <div className="pageHeader">
          <div>
            <h1 className="h1">Worker Preview</h1>
            <p className="subtle">Preparing your workspace</p>
          </div>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
        }}>
          <svg width="40" height="40" viewBox="0 0 200 200" fill="none" style={{ animation: "spinKey 1.5s ease-in-out infinite" }}>
            <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
            <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
            <circle cx="100" cy="80" r="18" fill="white"/>
            <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
            <rect x="94" y="90" width="12" height="35" fill="white"/>
          </svg>
          <div style={{ marginTop: "20px", fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>
            Setting up your workspace...
          </div>
          <div style={{ marginTop: "6px", fontSize: "14px", color: "#64748b" }}>
            This usually takes a few seconds.
          </div>
        </div>
      </div>
    );
  }

  // Extract fields from the worker document
  const serviceName = workerDoc.name || workerDoc.serviceName || "Untitled Service";
  const description = workerDoc.description || "";
  const stages = workerDoc.stages || workerDoc.workflowStages || [];
  const pricing = workerDoc.pricing || {};
  const price = pricing.price || pricing.amount || 0;
  const model = pricing.model || pricing.type || "subscription";
  const trialDays = pricing.trialDays || pricing.trial_days || 0;
  const displayName = userName || "there";

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Worker Preview</h1>
          <p className="subtle">Review what your AI built before going live</p>
        </div>
      </div>

      {/* Main preview card */}
      <div style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "32px",
        maxWidth: "720px",
      }}>
        {/* Heading */}
        <div style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#1e293b",
          marginBottom: "28px",
          lineHeight: 1.4,
        }}>
          Here's what I built for you, {displayName}:
        </div>

        {/* Service name */}
        <div style={{
          fontSize: "28px",
          fontWeight: 800,
          color: "#1e293b",
          marginBottom: "12px",
          lineHeight: 1.2,
        }}>
          {serviceName}
        </div>

        {/* Description */}
        {description && (
          <div style={{
            fontSize: "15px",
            color: "#475569",
            lineHeight: 1.7,
            marginBottom: "28px",
          }}>
            {description}
          </div>
        )}

        {/* Workflow Stages */}
        {stages.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#7c3aed",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "14px",
            }}>
              Workflow Stages
            </div>
            <ol style={{
              margin: 0,
              paddingLeft: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}>
              {stages.map((stage, idx) => {
                const stageName = typeof stage === "string" ? stage : (stage.name || stage.title || `Stage ${idx + 1}`);
                return (
                  <li key={idx} style={{
                    fontSize: "15px",
                    color: "#334155",
                    lineHeight: 1.5,
                  }}>
                    <span style={{ fontWeight: 600 }}>{stageName}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Pricing card */}
        <div style={{
          padding: "20px",
          background: "#faf5ff",
          borderRadius: "12px",
          border: "1px solid #e9d5ff",
          marginBottom: "28px",
        }}>
          <div style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#7c3aed",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "12px",
          }}>
            Pricing
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
            <div style={{ fontSize: "32px", fontWeight: 900, color: "#1e293b" }}>
              ${typeof price === "number" ? price.toLocaleString() : price}
            </div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              / {model === "per-project" ? "project" : "month"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "14px", color: "#475569" }}>
              Model: <span style={{ fontWeight: 600 }}>{model === "per-project" ? "Per Project" : model.charAt(0).toUpperCase() + model.slice(1)}</span>
            </div>
            {trialDays > 0 && (
              <div style={{ fontSize: "14px", color: "#475569" }}>
                Trial: <span style={{ fontWeight: 600 }}>{trialDays} days free</span>
              </div>
            )}
          </div>
        </div>

        {/* Preview link */}
        <div style={{ marginBottom: "32px" }}>
          <button
            onClick={handlePreviewLink}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "#7c3aed",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Preview how subscribers will see it
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={{
              flex: 1,
              padding: "14px 24px",
              fontSize: "15px",
              fontWeight: 700,
              borderRadius: "10px",
              border: "none",
              cursor: publishing ? "not-allowed" : "pointer",
              color: "white",
              background: publishing
                ? "#a78bfa"
                : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              opacity: publishing ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {publishing ? "Publishing..." : "Publish to Store"}
          </button>
          <button
            onClick={handleEdit}
            style={{
              flex: 1,
              padding: "14px 24px",
              fontSize: "15px",
              fontWeight: 700,
              borderRadius: "10px",
              border: "2px solid #e2e8f0",
              cursor: "pointer",
              color: "#475569",
              background: "white",
              transition: "border-color 0.2s",
            }}
          >
            Edit First
          </button>
        </div>
      </div>
    </div>
  );
}
