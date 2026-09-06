import React, { useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import QRCode from "qrcode";
import {
  sendInstructorOtp,
  verifyInstructorOtp,
  createCourse,
  publishCourse,
  ingestDocument,
  listDocuments,
} from "../api/educationApi";
import EduDriveImportModal from "../components/education/EduDriveImportModal";
import CourseChat from "../components/education/CourseChat";

// CODEX 70 Surface 2 — Course Uploader wizard, mounted at /education/upload.
//
// 4 steps per the doc:
//   1. Instructor identity + credential verification (Path A only — .edu/
//      institutional email + OTP. Path B/license-API and Path C/employment-
//      letter are v2, shown as "coming soon").
//   2. Name your course.
//   3. Upload course materials — local drag-and-drop OR Google Drive import.
//   4. Done — shareable /course/:slug link + QR code + live tutor preview.
//
// What's real vs. new here: OTP send/verify and the ephemeral per-course
// session are net-new backend routes (edu:instructor:*, edu:course:*). File
// ingest (ingestDocument) is the EXISTING, live Studio Locker pipeline
// (sandbox:worker:knowledge:ingest) — unchanged, just called from a new UI.

const MAX_FILES = 10;
const MAX_CHARS_TOTAL = 120000;

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", justifyContent: "center", padding: "40px 20px" },
  card: { background: "white", borderRadius: 16, padding: "40px 36px", maxWidth: 640, width: "100%", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", height: "fit-content" },
  logo: { fontSize: 20, fontWeight: 700, color: "#7c3aed", textAlign: "center", marginBottom: 24, cursor: "pointer" },
  stepLabel: { fontSize: 12, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, textAlign: "center" },
  title: { fontSize: 22, fontWeight: 700, color: "#111827", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 28, lineHeight: 1.6 },
  field: { marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", minHeight: 70, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", background: "white", boxSizing: "border-box" },
  btn: { width: "100%", padding: "13px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "13px 24px", background: "#d1d5db", color: "#9ca3af", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "not-allowed" },
  btnRow: { display: "flex", gap: 10 },
  btnSecondary: { flex: "0 0 auto", padding: "13px 20px", background: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { color: "#dc2626", fontSize: 13, marginBottom: 12, textAlign: "center" },
  pathBox: { border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 14 },
  pathTitle: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 },
  comingSoon: { border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 14, opacity: 0.55 },
  dropzone: { border: "2px dashed #d1d5db", borderRadius: 10, padding: "32px 16px", textAlign: "center", cursor: "pointer", marginBottom: 12 },
  fileTile: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 8, fontSize: 13 },
  progressTrack: { height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", background: "#7c3aed" },
};

function institutionSlugGuess(email) {
  const domain = (email.split("@")[1] || "").toLowerCase();
  return domain;
}

export default function CourseUploader() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  // Step 1 state
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [institution, setInstitution] = useState("");

  // Step 2 state
  const [courseForm, setCourseForm] = useState({
    courseName: "", courseNumber: "", institution: "", level: "", tutorName: "Hannah", description: "",
  });
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Step 3 state
  const [slug, setSlug] = useState(null);
  const [workerId, setWorkerId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);

  // Step 4 state
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const totalChars = docs.reduce((sum, d) => sum + (d.charCount || 0), 0);

  // ── Step 1 handlers ──────────────────────────────────────────────────

  async function handleSendOtp(e) {
    e.preventDefault();
    setError(null);
    setSendingOtp(true);
    const res = await sendInstructorOtp(email.trim());
    setSendingOtp(false);
    if (res.ok) {
      setOtpSent(true);
    } else {
      setError(res.error || "Could not send verification code.");
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const res = await verifyInstructorOtp(email.trim(), code.trim());
      if (!res.ok) {
        setError(res.error || "Verification failed.");
        setVerifying(false);
        return;
      }
      await signInWithCustomToken(firebaseAuth, res.token);
      setInstitution(res.institution || institutionSlugGuess(email));
      setCourseForm((prev) => ({ ...prev, institution: res.institution || prev.institution }));
      setStep(2);
    } catch (e2) {
      setError(e2.message || "Verification failed.");
    }
    setVerifying(false);
  }

  // ── Step 2 handler ───────────────────────────────────────────────────

  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!courseForm.courseName.trim()) return;
    setError(null);
    setCreatingCourse(true);
    try {
      const res = await createCourse(courseForm);
      if (!res.ok) {
        setError(res.error || "Could not create course.");
        setCreatingCourse(false);
        return;
      }
      // Switch sessions into the course's own ephemeral identity — the
      // Studio Locker docs uploaded in Step 3 live under this uid, not the
      // instructor's personal uid. See courseSession.js for why.
      await signInWithCustomToken(firebaseAuth, res.courseToken);
      setSlug(res.slug);
      setWorkerId(res.workerId);
      setStep(3);
    } catch (e2) {
      setError(e2.message || "Could not create course.");
    }
    setCreatingCourse(false);
  }

  // ── Step 3 handlers ──────────────────────────────────────────────────

  async function refreshDocs() {
    const res = await listDocuments(workerId);
    if (res.ok) setDocs(res.documents || []);
  }

  async function handleLocalFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    if (docs.length + fileList.length > MAX_FILES) {
      setError(`Max ${MAX_FILES} files per course.`);
      return;
    }
    setError(null);
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const res = await ingestDocument({ workerId, name: file.name, sourceType: "auto", tier: 3, file });
      if (!res.ok) {
        setError(res.error || `Failed to ingest ${file.name}`);
      }
    }
    await refreshDocs();
    setUploading(false);
  }

  function handleDriveImportComplete(results) {
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      setError(`${failed.length} file(s) failed to import: ${failed.map((f) => f.fileName).join(", ")}`);
    }
    refreshDocs();
  }

  async function handleContinueToShare() {
    setStep(4);
    publishCourse(slug).catch(() => {}); // cosmetic status flag only — never blocks the UI
    const url = `${window.location.origin}/course/${slug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, errorCorrectionLevel: "M" });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error("QR generation failed:", e);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/course/${slug}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo} onClick={() => { window.location.href = "/"; }}>SOCIII</div>
        <div style={S.stepLabel}>Step {step} of 4</div>

        {step === 1 && (
          <>
            <div style={S.title}>Verify Your Credentials</div>
            <div style={S.subtitle}>First, let's confirm you're a licensed or employed instructor.</div>
            {error && <div style={S.error}>{error}</div>}

            <div style={S.pathBox}>
              <div style={S.pathTitle}>Path A — Institutional email</div>
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <div style={S.field}>
                    <input
                      style={S.input}
                      type="email"
                      placeholder="you@youruniversity.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" style={email ? S.btn : S.btnDisabled} disabled={!email || sendingOtp}>
                    {sendingOtp ? "Sending…" : "Send verification code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                    We sent a 6-digit code to <strong>{email}</strong>.
                  </div>
                  <div style={S.field}>
                    <input
                      style={S.input}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                  <div style={S.btnRow}>
                    <button type="button" style={S.btnSecondary} onClick={() => { setOtpSent(false); setCode(""); }}>Back</button>
                    <button type="submit" style={code.length === 6 ? S.btn : S.btnDisabled} disabled={code.length !== 6 || verifying}>
                      {verifying ? "Verifying…" : "Continue →"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div style={S.comingSoon}>
              <div style={S.pathTitle}>Path B — License / board credential <span style={{ fontWeight: 400, color: "#9ca3af" }}>(coming soon)</span></div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>NURSYS / state board verification — v2.</div>
            </div>
            <div style={S.comingSoon}>
              <div style={S.pathTitle}>Path C — Employment letter <span style={{ fontWeight: 400, color: "#9ca3af" }}>(coming soon)</span></div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Manual review, ~1 business day — v2.</div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={S.title}>Name Your Course</div>
            <div style={S.subtitle}>This creates your AI tutor's identity. You'll upload materials next.</div>
            {error && <div style={S.error}>{error}</div>}
            <form onSubmit={handleCreateCourse}>
              <div style={S.field}>
                <label style={S.label}>Course name</label>
                <input style={S.input} value={courseForm.courseName} onChange={(e) => setCourseForm((p) => ({ ...p, courseName: e.target.value }))} placeholder="Anatomy & Physiology I" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Course number</label>
                <input style={S.input} value={courseForm.courseNumber} onChange={(e) => setCourseForm((p) => ({ ...p, courseNumber: e.target.value }))} placeholder="BIOL 201" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Institution</label>
                <input style={S.input} value={courseForm.institution} onChange={(e) => setCourseForm((p) => ({ ...p, institution: e.target.value }))} placeholder="UH Maui College" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Level</label>
                <select style={S.select} value={courseForm.level} onChange={(e) => setCourseForm((p) => ({ ...p, level: e.target.value }))}>
                  <option value="">Select…</option>
                  <option value="pre-nursing">Pre-nursing</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="graduate">Graduate</option>
                  <option value="continuing-education">Continuing education</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Your AI tutor's name</label>
                <input style={S.input} value={courseForm.tutorName} onChange={(e) => setCourseForm((p) => ({ ...p, tutorName: e.target.value }))} placeholder="Hannah" />
              </div>
              <div style={S.field}>
                <label style={S.label}>One-sentence description</label>
                <textarea style={S.textarea} value={courseForm.description} onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))} placeholder="Quiz me on Unit 1 learning objectives and explain anatomy concepts at a nursing-student level." />
              </div>
              <div style={S.btnRow}>
                <button type="button" style={S.btnSecondary} onClick={() => setStep(1)}>Back</button>
                <button type="submit" style={courseForm.courseName.trim() ? S.btn : S.btnDisabled} disabled={!courseForm.courseName.trim() || creatingCourse}>
                  {creatingCourse ? "Creating…" : "Continue →"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <div style={S.title}>Upload Your Course Materials</div>
            <div style={S.subtitle}>These documents become your tutor's knowledge base.</div>
            {error && <div style={S.error}>{error}</div>}

            <label style={S.dropzone}>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.csv"
                style={{ display: "none" }}
                onChange={(e) => handleLocalFiles(e.target.files)}
              />
              <div style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Drop files here, or click to browse</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>PDF · DOCX · TXT</div>
            </label>

            <button
              type="button"
              onClick={() => setDriveModalOpen(true)}
              style={{ ...S.btnSecondary, width: "100%", marginBottom: 16 }}
            >
              Import from Google Drive
            </button>

            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              What to upload: syllabus, learning objectives / SLOs, grading rubrics, instructor notes or study guides.
            </div>

            {uploading && <div style={{ fontSize: 13, color: "#7c3aed", marginBottom: 10 }}>Uploading…</div>}

            {docs.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Uploaded ({docs.length} of {MAX_FILES} max)
                </div>
                {docs.map((d) => (
                  <div key={d.id} style={S.fileTile}>
                    <span>{d.ingestionStatus === "complete" ? "✓" : d.ingestionStatus === "failed" ? "✗" : "…"} {d.name}</span>
                    <span style={{ color: "#9ca3af" }}>{(d.charCount || 0).toLocaleString()} chars · {d.ingestionStatus}</span>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Total context: {totalChars.toLocaleString()} / {MAX_CHARS_TOTAL.toLocaleString()} chars ({Math.min(100, Math.round((totalChars / MAX_CHARS_TOTAL) * 100))}%)
                </div>
                <div style={S.progressTrack}>
                  <div style={{ ...S.progressFill, width: `${Math.min(100, (totalChars / MAX_CHARS_TOTAL) * 100)}%` }} />
                </div>
              </div>
            )}

            <div style={S.btnRow}>
              <button type="button" style={S.btnSecondary} onClick={() => setStep(2)}>Back</button>
              <button type="button" style={docs.length > 0 ? S.btn : S.btnDisabled} disabled={docs.length === 0} onClick={handleContinueToShare}>
                Preview your tutor →
              </button>
            </div>

            <EduDriveImportModal
              isOpen={driveModalOpen}
              onClose={() => setDriveModalOpen(false)}
              workerId={workerId}
              onImportComplete={handleDriveImportComplete}
            />
          </>
        )}

        {step === 4 && (
          <>
            <div style={S.title}>Your Course Worker Is Ready</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 16, lineHeight: 1.8 }}>
              ✓ Verified: {email} ({institution})<br />
              ✓ Course: {courseForm.courseNumber ? `${courseForm.courseNumber} — ` : ""}{courseForm.courseName}<br />
              ✓ {docs.length} document{docs.length !== 1 ? "s" : ""} loaded ({totalChars.toLocaleString()} chars)
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Share this link with your students</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#111827", wordBreak: "break-all", marginBottom: 10 }}>
                {window.location.origin}/course/{slug}
              </div>
              <button type="button" style={{ ...S.btnSecondary, width: "auto", padding: "8px 16px" }} onClick={handleCopyLink}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              {qrDataUrl && (
                <div style={{ marginTop: 16 }}>
                  <img src={qrDataUrl} alt="QR code for course link" style={{ width: 160, height: 160 }} />
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
              When a student opens the link they're signed in automatically — no account required — and see {courseForm.tutorName || "your tutor"}, loaded with your course materials. Each student's conversation is private.
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Preview your tutor</div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 16, height: 320 }}>
              <CourseChat
                workerId={workerId}
                courseName={courseForm.courseName}
                tutorName={courseForm.tutorName}
                description={courseForm.description}
                seedMessage={`Hi — I'm ${courseForm.tutorName || "your tutor"}. Ask me anything about ${courseForm.courseName}.`}
              />
            </div>

            <div style={S.btnRow}>
              <button type="button" style={S.btnSecondary} onClick={() => window.location.reload()}>Upload another course</button>
              <button type="button" style={S.btn} onClick={() => { window.location.href = `/course/${slug}`; }}>Go to your course link</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
