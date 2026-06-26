// Shared first-name extraction for greetings.
//
// Previously four surfaces (WorkerHome, ChatPanel, TeamHome, VaultDashboard)
// each did `displayName.split(" ")[0]`, which turns "Dr. Maya Chen" into "Dr."
// — the honorific eats the actual name. This single helper strips leading
// honorifics so the greeting reads "Maya", and falls back to the email prefix.

const HONORIFICS = new Set([
  "dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "miss",
  "prof", "prof.", "sir", "dame", "rev", "rev.", "fr", "fr.",
  "capt", "capt.", "lt", "lt.", "sgt", "sgt.", "col", "col.",
  "hon", "hon.", "st", "st.",
]);

/**
 * Extract a friendly first name from a full display name, skipping any
 * leading honorific (Dr., Mr., Prof., …). Falls back to the email local-part.
 * Returns "" when nothing usable is found (callers guard on truthiness).
 *
 * @param {string} [rawName] full display name, e.g. "Dr. Maya Chen"
 * @param {string} [email]   fallback, e.g. "maya@clinic.com"
 * @returns {string} first name, e.g. "Maya" (or "" )
 */
export function firstNameFrom(rawName, email) {
  const raw = (rawName || "").trim();
  if (raw) {
    const tokens = raw.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length && HONORIFICS.has(tokens[i].toLowerCase())) i++;
    const first = tokens[i] || "";
    if (first && first.length >= 2) return first;
  }
  const fromEmail = (email || "").split("@")[0] || "";
  if (fromEmail && fromEmail.length >= 2) return fromEmail;
  return "";
}

// Acronyms that should render uppercase, not Title-cased, in worker names.
const WORKER_ACRONYMS = new Set([
  "cvt", "dvm", "vtne", "osha", "dea", "hr", "ir", "cre", "re", "hoa",
  "mep", "kpi", "ce", "cpa", "ar", "ap", "id", "qa", "ai", "us", "tmk",
]);

/**
 * Turn a worker SLUG into a human display name WITHOUT leaking the internal
 * codename. Catalog/demo workers carry scaffolding in their slug —
 * "vet-003-drug-dosing", "edu-001-cvt-exam-prep", "spine-4-staff-credentials",
 * "title-abstract-001" — which naive title-casing rendered verbatim on screen
 * ("Spine 4 Staff Credentials"). This strips the leading "vertical-NNN-" /
 * "spine-N-" prefix and trailing "-NNN" / "-vN" version suffix, then fixes
 * known acronyms. Always prefer a real display_name/name field when you have
 * one; this is the LAST-resort fallback.
 *
 * @param {string} slug e.g. "edu-001-cvt-exam-prep"
 * @returns {string} e.g. "CVT Exam Prep"
 */
export function prettyWorkerName(slug) {
  if (!slug || typeof slug !== "string") return "";
  let s = slug
    .replace(/^[a-z]+-\d+-/i, "")   // vet-003-, edu-001-
    .replace(/^spine-\d+-/i, "")     // spine-4-
    .replace(/-\d+$/i, "")            // title-abstract-001 -> title-abstract
    .replace(/-v\d+$/i, "");          // -v2
  if (!s) s = slug;
  return s
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => WORKER_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
