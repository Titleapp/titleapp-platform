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
