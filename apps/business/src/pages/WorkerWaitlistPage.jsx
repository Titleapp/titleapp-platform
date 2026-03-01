import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const S = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  nav: { padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" },
  logo: { fontSize: 18, fontWeight: 700, color: "#7c3aed", textDecoration: "none", cursor: "pointer" },
  navLink: { fontSize: 13, color: "#6b7280", textDecoration: "none", cursor: "pointer" },
  hero: { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", padding: "80px 32px 60px", textAlign: "center", color: "white" },
  badge: { display: "inline-block", padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 20, textTransform: "uppercase" },
  title: { fontSize: 36, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 },
  suiteLabel: { fontSize: 14, opacity: 0.85, marginBottom: 16 },
  description: { fontSize: 18, opacity: 0.9, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 },
  main: { maxWidth: 480, margin: "0 auto", padding: "48px 32px" },
  card: { background: "white", borderRadius: 16, padding: 32, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", textAlign: "center" },
  cardTitle: { fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 },
  cardDesc: { fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 },
  input: { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 },
  btn: { width: "100%", padding: "14px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "14px 24px", background: "#c4b5fd", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "not-allowed" },
  success: { padding: "20px 24px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" },
  successText: { fontSize: 16, fontWeight: 600, color: "#166534", marginBottom: 4 },
  successSub: { fontSize: 14, color: "#4ade80" },
  backLink: { display: "inline-block", marginTop: 32, fontSize: 14, color: "#7c3aed", textDecoration: "none", cursor: "pointer" },
  footer: { textAlign: "center", padding: "24px 32px", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 13, marginTop: 40 },
};

export default function WorkerWaitlistPage({ name, description, slug, suite }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleJoinWaitlist(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "waitlist"), {
        workerSlug: slug,
        email: email.trim().toLowerCase(),
        joinedAt: serverTimestamp(),
        source: "direct_url",
      });
      setJoined(true);
    } catch (err) {
      console.error("Waitlist signup failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={S.logo}>TitleApp</a>
        <a href="/workers" style={S.navLink}>Browse all workers</a>
      </nav>

      <div style={S.hero}>
        <div style={S.badge}>Coming Soon</div>
        <h1 style={S.title}>{name}</h1>
        <div style={S.suiteLabel}>Part of the {suite} Suite</div>
        <p style={S.description}>{description}</p>
      </div>

      <div style={S.main}>
        <div style={S.card}>
          {!joined ? (
            <>
              <div style={S.cardTitle}>Get early access</div>
              <div style={S.cardDesc}>
                Be the first to know when this Digital Worker launches. We'll send you one email — no spam.
              </div>
              <form onSubmit={handleJoinWaitlist}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={S.input}
                  required
                />
                <button
                  type="submit"
                  style={submitting ? S.btnDisabled : S.btn}
                  disabled={submitting}
                >
                  {submitting ? "Joining..." : "Join Waitlist"}
                </button>
              </form>
              {error && (
                <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{error}</div>
              )}
            </>
          ) : (
            <div style={S.success}>
              <div style={S.successText}>You're on the list.</div>
              <div style={S.successSub}>We'll notify you when {name} launches.</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <a href="/workers" style={S.backLink}>← Browse all Digital Workers</a>
        </div>
      </div>

      <footer style={S.footer}>TitleApp — Digital Workers for every industry</footer>
    </div>
  );
}
