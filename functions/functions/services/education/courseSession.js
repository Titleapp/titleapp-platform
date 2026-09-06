"use strict";

/**
 * courseSession.js — CODEX 70 Surface 2, Step 2-4 backend.
 *
 * "Ephemeral per-session tenant" (doc's term) implemented as a dedicated,
 * per-course Firebase Auth identity (courseUid) — NOT the instructor's own
 * uid. This keeps the doc's isolation intent without needing a real tenant
 * concept: the Studio Locker is already scoped by uid+workerId
 * (studioLockers/{userId}/workers/{workerId}/documents), so giving each
 * course its own uid gives each course its own isolated locker for free.
 *
 * Both the instructor's Step 4 preview chat and every student's chat (via
 * GET /v1/edu:course:token, called from /course/:slug) sign in as this same
 * shared courseUid. That is an intentional, contained security trade-off —
 * identical in shape to the existing GET /v1/demo:token pattern (a public,
 * parameterized mint of a custom token for a shared, low-privilege uid).
 * Flagged clearly for review: anyone with the course link can mint a valid
 * session for courseUid and could, in principle, call other authenticated
 * routes as that uid. Because courseUid owns nothing but its own Studio
 * Locker documents and course metadata, the blast radius is small, but this
 * is a real trade-off worth a reviewer's eyes before this ships.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

const NURSING_KEYWORDS = /nurs|clinical|patient|health|medical|anatom|physiol|pharmac/i;
const MAX_SLUG_TRIES = 50;

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "course";
}

async function uniqueSlug(db, base) {
  let slug = base;
  for (let n = 1; n <= MAX_SLUG_TRIES; n++) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await db.collection("courses").doc(slug).get();
    if (!snap.exists) return slug;
    slug = `${base}-${n + 1}`;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * POST /v1/edu:course:create — authenticated as the verified instructor.
 * Body: { courseName, courseNumber, institution, level, tutorName, description }
 */
async function createCourseSession(req, res, instructorUser) {
  const db = getDb();
  const body = req.body || {};
  const { courseName, courseNumber, institution, level, tutorName, description } = body;

  if (!courseName || !String(courseName).trim()) {
    return res.status(400).json({ ok: false, error: "courseName required" });
  }

  const isNursing = NURSING_KEYWORDS.test(`${courseName} ${description || ""} ${institution || ""}`);
  const workerId = isNursing ? "nursing-courses-001" : "course-tutor-001";

  const base = slugify(`${courseName}-${institution || ""}`);
  const slug = await uniqueSlug(db, base);
  const courseUid = `course_${crypto.randomBytes(10).toString("hex")}`;

  await db.collection("courses").doc(slug).set({
    slug,
    courseUid,
    workerId,
    courseName: String(courseName).trim(),
    courseNumber: courseNumber || "",
    institution: institution || "",
    level: level || "",
    tutorName: (tutorName || "").trim() || "Your Tutor",
    description: description || "",
    instructorUid: instructorUser.uid,
    instructorEmail: instructorUser.email || null,
    status: "draft",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const courseToken = await admin.auth().createCustomToken(courseUid, { courseSlug: slug, role: "instructor_preview" });
  return res.json({ ok: true, slug, workerId, courseUid, courseToken });
}

/**
 * GET /v1/edu:course:token?slug=... — PUBLIC. Mints a custom token for the
 * course's shared courseUid. Powers /course/:slug (students, no account).
 */
async function mintCourseToken(req, res) {
  const db = getDb();
  const slug = (req.query && req.query.slug) || (req.body && req.body.slug);
  if (!slug) return res.status(400).json({ ok: false, error: "slug required" });

  const snap = await db.collection("courses").doc(String(slug)).get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Course not found" });
  const data = snap.data();

  const token = await admin.auth().createCustomToken(data.courseUid, { courseSlug: slug, role: "student" });
  return res.json({
    ok: true,
    token,
    workerId: data.workerId,
    courseName: data.courseName,
    tutorName: data.tutorName,
    description: data.description,
    institution: data.institution,
  });
}

/**
 * POST /v1/edu:course:publish — authenticated as the course session
 * (courseUid). Marks the course "live." Cosmetic status flag only — not a
 * gate anywhere else in v1.
 */
async function publishCourse(req, res, courseAuthUser) {
  const db = getDb();
  const { slug } = req.body || {};
  if (!slug) return res.status(400).json({ ok: false, error: "slug required" });

  const ref = db.collection("courses").doc(String(slug));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Course not found" });
  const data = snap.data();
  if (data.courseUid !== courseAuthUser.uid) {
    return res.status(403).json({ ok: false, error: "Not authorized for this course" });
  }

  await ref.update({ status: "live", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return res.json({ ok: true, slug, shareUrl: `/course/${slug}` });
}

module.exports = { createCourseSession, mintCourseToken, publishCourse, slugify };
