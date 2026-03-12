import React, { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function isTestMode() {
  return window.location.pathname.includes("/sandbox") || window.location.search.includes("testMode=true");
}

const SPOTLIGHT_ENABLED = import.meta.env.VITE_CREATOR_SPOTLIGHT_ENABLED === "true" || isTestMode();

const TEAL = "#0B7A6E";

export default function CreatorSpotlight({ worker, workerCardData }) {
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [bio, setBio] = useState("");
  const [workerDesc, setWorkerDesc] = useState("");
  const [releaseAgreed, setReleaseAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const workerName = workerCardData?.name || worker?.name || "Your Worker";
  const workerUrl = `https://titleapp.ai/w/${(worker?.slug || workerName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const email = localStorage.getItem("USER_EMAIL") || "";

  // Auto-populate worker description on mount
  useEffect(() => {
    if (workerCardData?.description && !workerDesc) {
      setWorkerDesc(workerCardData.description);
    }
  }, [workerCardData?.description]);

  if (!SPOTLIGHT_ENABLED) return null;

  function handleFile(file) {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      setPhotoError("Please upload a JPG or PNG image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 500 || img.height < 500) {
          setPhotoError("Image must be at least 500x500 pixels.");
          return;
        }
        setPhoto(file);
        setPhotoPreview(e.target.result);
      };
      img.onerror = () => setPhotoError("Could not read image. Try another file.");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const testMode = isTestMode();
    try {
      const payload = {
        bio,
        workerDescription: workerDesc,
        workerId: worker?.id || "",
        workerName,
        workerUrl,
        photoDataUrl: photoPreview,
        releaseAgreed: true,
      };

      if (testMode) {
        // Sandbox: save locally and skip Stripe
        localStorage.setItem("ta_spotlight_submission", JSON.stringify({ ...payload, submittedAt: new Date().toISOString(), status: "pending" }));
        setSubmitted(true);
      } else {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID");
        const res = await fetch(`${API_BASE}/api?path=/v1/creator:submitSpotlight`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Tenant-Id": tenantId,
            "X-Vertical": "developer",
            "X-Jurisdiction": "GLOBAL",
          },
          body: JSON.stringify({ tenantId, ...payload }),
        });
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        setSubmitted(true);
      }
    } catch (err) {
      if (testMode) {
        setSubmitted(true);
      } else {
        setPhotoError(err.message || "Something went wrong. Please try again.");
      }
    }
    setSubmitting(false);
  }

  function resetModal() {
    setShowModal(false);
    setModalStep(1);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setBio("");
    setWorkerDesc(workerCardData?.description || "");
    setReleaseAgreed(false);
    setSubmitting(false);
    setSubmitted(false);
  }

  // --- Styles ---
  const sectionStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16, marginTop: 32 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "block" };

  const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 };
  const modalCard = { background: "white", borderRadius: 16, maxWidth: 520, width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" };
  const modalHeader = { padding: "20px 24px 0", fontSize: 16, fontWeight: 700, color: "#1a1a2e" };
  const modalBody = { padding: "16px 24px", flex: 1, overflowY: "auto" };
  const modalFooter = { padding: "16px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #F1F5F9" };
  const btnTeal = { padding: "12px 24px", background: TEAL, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };
  const btnOutline = { padding: "12px 24px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };

  // --- Card ---
  const card = (
    <div style={sectionStyle}>
      <span style={labelStyle}>Marketing Tools</span>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>{"\u25B6"} Creator Spotlight</span>
            <span style={{ padding: "3px 10px", background: "rgba(11,122,110,0.1)", color: TEAL, borderRadius: 20, fontSize: 13, fontWeight: 700 }}>$29</span>
          </div>
          <div style={{ fontSize: 14, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
            Your expertise. On camera. Shareable forever.
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 16 }}>
            Alex interviews your avatar about the worker you built. You get a finished video to share with your audience. We post it to our channels. Your knowledge, your face, your audience — amplified.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {[
              "AI-generated animated avatar from your photo",
              "Shareable video asset delivered to you",
              "Posted to TitleApp TikTok, LinkedIn + your worker listing",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: TEAL, fontSize: 13, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>{"\u2713"}</span>
                <span style={{ fontSize: 13, color: "#475569" }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setShowModal(true)} style={btnTeal}>
              Get Your Spotlight
            </button>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13, color: TEAL, fontWeight: 600, textDecoration: "none" }}>
              See an example {"\u2192"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Modal Steps ---
  function renderStep() {
    if (submitted) {
      return (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2713"}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: TEAL, marginBottom: 8 }}>You're in.</div>
          <div style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
            We'll produce your Creator Spotlight within 5 business days.
          </div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
            You'll receive your finished video{email ? ` at ${email}` : ""} and we'll notify you when it goes live on our channels.
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 16 }}>
            In the meantime, check out your worker listing at{" "}
            <a href={workerUrl} target="_blank" rel="noopener noreferrer" style={{ color: TEAL }}>{workerUrl}</a>
          </div>
        </div>
      );
    }

    switch (modalStep) {
      case 1:
        return (
          <>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
              Upload a clear, forward-facing photo. Passport style works great. Minimum 500x500px.
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? TEAL : "#E2E8F0"}`,
                borderRadius: 12, padding: photoPreview ? 16 : 40, textAlign: "center",
                cursor: "pointer", background: dragOver ? "rgba(11,122,110,0.04)" : "#FAFBFC",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              {photoPreview ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img src={photoPreview} alt="Preview" style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover" }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{photo?.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>Click to change</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>{"\uD83D\uDCF7"}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>Drag and drop your photo here</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>or click to browse — JPG or PNG</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
            {photoError && <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{photoError}</div>}
          </>
        );

      case 2:
        return (
          <>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
              Tell us about your expertise in 3-5 sentences. What have you done? How long? What do you know that others don't?
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 600))}
              placeholder="I've spent 18 years as a flight nurse in trauma and critical care. I've worked rural Hawaii, night flights, and some of the most complex calls you'll ever see..."
              style={{
                width: "100%", minHeight: 140, padding: "12px 14px", background: "#FAFBFC", border: "1px solid #E2E8F0",
                borderRadius: 8, color: "#1a1a2e", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: 12, color: bio.length >= 580 ? "#f87171" : "#94A3B8", textAlign: "right", marginTop: 4 }}>
              {bio.length}/600
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
              Describe what your worker does and who it's for in 2-3 sentences.
            </div>
            {workerCardData?.name && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Worker</label>
                <div style={{ padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, color: "#1a1a2e" }}>
                  {workerCardData.name}
                </div>
              </div>
            )}
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Description</label>
            <textarea
              value={workerDesc}
              onChange={(e) => setWorkerDesc(e.target.value.slice(0, 400))}
              placeholder="This worker helps real estate teams analyze CRE deals in minutes instead of hours. It pulls comps, runs pro formas, and flags compliance issues before they become problems."
              style={{
                width: "100%", minHeight: 120, padding: "12px 14px", background: "#FAFBFC", border: "1px solid #E2E8F0",
                borderRadius: 8, color: "#1a1a2e", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: 12, color: workerDesc.length >= 380 ? "#f87171" : "#94A3B8", textAlign: "right", marginTop: 4 }}>
              {workerDesc.length}/400
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Review your submission before proceeding.</div>

            {/* Summary */}
            <div style={{ background: "#F8F9FC", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {photoPreview && <img src={photoPreview} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover" }} />}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{workerName}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{bio.length > 100 ? bio.slice(0, 100) + "..." : bio}</div>
                </div>
              </div>
            </div>

            {/* Release terms */}
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>Creator Avatar Release</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {[
                "You grant TitleApp a limited license to animate your likeness to promote your worker listing only.",
                "You keep full rights to your own image.",
                "You'll receive a copy of the finished video.",
                "You can revoke this at any time by removing your worker or contacting legal@titleapp.ai.",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13, marginTop: 1, flexShrink: 0 }}>{"\u2022"}</span>
                  <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <a href="/legal/creator-avatar-release.pdf" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: TEAL, marginBottom: 16, display: "inline-block" }}>
              Read full agreement (PDF)
            </a>

            {/* Checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginTop: 8 }}>
              <input type="checkbox" checked={releaseAgreed} onChange={(e) => setReleaseAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: TEAL }} />
              <span style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.5 }}>I have read and agree to the Creator Avatar Release Agreement</span>
            </label>
          </>
        );

      default:
        return null;
    }
  }

  function canAdvance() {
    switch (modalStep) {
      case 1: return !!photoPreview;
      case 2: return bio.length >= 20;
      case 3: return workerDesc.length >= 20;
      case 4: return releaseAgreed;
      default: return false;
    }
  }

  const modal = showModal && (
    <div style={modalOverlay} onClick={() => { if (!submitting) submitted ? resetModal() : setShowModal(false); }}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          {submitted ? "Creator Spotlight" : `Step ${modalStep} of 4 — ${["Your Photo", "Your Background", "Your Worker", "Review & Release"][modalStep - 1]}`}
        </div>

        {/* Body */}
        <div style={modalBody}>
          {renderStep()}
        </div>

        {/* Footer */}
        {!submitted && (
          <div style={modalFooter}>
            {modalStep > 1 && (
              <button onClick={() => setModalStep(modalStep - 1)} style={btnOutline}>Back</button>
            )}
            <div style={{ flex: 1 }} />
            {modalStep < 4 ? (
              <button onClick={() => setModalStep(modalStep + 1)} disabled={!canAdvance()} style={{ ...btnTeal, opacity: canAdvance() ? 1 : 0.5, cursor: canAdvance() ? "pointer" : "not-allowed" }}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canAdvance() || submitting} style={{ ...btnTeal, opacity: canAdvance() && !submitting ? 1 : 0.5, cursor: canAdvance() && !submitting ? "pointer" : "not-allowed" }}>
                {submitting ? "Processing..." : "Complete Purchase & Submit"}
              </button>
            )}
          </div>
        )}
        {submitted && (
          <div style={modalFooter}>
            <div style={{ flex: 1 }} />
            <button onClick={resetModal} style={btnTeal}>Close</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {card}
      {modal}
    </>
  );
}
