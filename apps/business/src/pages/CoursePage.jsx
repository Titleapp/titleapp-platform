import React, { useEffect, useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";
import { getCourseToken } from "../api/educationApi";
import CourseChat from "../components/education/CourseChat";

// CODEX 70 Surface 2, Step 4 destination — the student landing page. Public,
// no auth required: fetches a custom token scoped to the course's shared
// courseUid (see courseSession.js), signs in silently, then hands off to the
// same standalone CourseChat used in the wizard's live-preview step.
//
// Mirrors DemoSignIn.jsx's shape (public slug/route -> mint token -> sign in
// -> render) rather than inventing a new auth pattern.

export default function CoursePage({ slug }) {
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCourseToken(slug);
        if (!res.ok) throw new Error(res.error || "Course not found.");
        await signInWithCustomToken(firebaseAuth, res.token);
        if (cancelled) return;
        setCourse(res);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load this course.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 15 }}>Loading your course…</div>
      </Shell>
    );
  }

  if (error || !course) {
    return (
      <Shell>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Course not found</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{error || "This course link may have expired."}</div>
        </div>
      </Shell>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{course.courseName}</div>
          {course.institution && <div style={{ fontSize: 12, color: "#9ca3af" }}>{course.institution}</div>}
        </div>
        <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>{course.tutorName} · AI Course Tutor</div>
      </div>
      <div style={{ flex: 1, maxWidth: 760, width: "100%", margin: "0 auto", padding: "24px 16px", display: "flex" }}>
        <div style={{ flex: 1, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <CourseChat
            workerId={course.workerId}
            courseName={course.courseName}
            tutorName={course.tutorName}
            description={course.description}
            seedMessage={`Hi — I'm ${course.tutorName}. I can coach you through ${course.courseName}${course.description ? ": " + course.description : ""}. What are you working on today?`}
          />
        </div>
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <div style={{ maxWidth: 420 }}>{children}</div>
    </div>
  );
}
