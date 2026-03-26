// Fallback stress-test prompts by vertical/raasMode.
// Used only when backend suggestedEdgeCases is empty.
export const FALLBACK_STRESS_PROMPTS = {
  "game-light": [
    "Try to skip to the last level",
    "Try an answer that breaks the rules",
  ],
  aviation: [
    "Try VFR minimums 1 mile in Class B",
    "Try to skip the emergency checklist",
  ],
  nursing: [
    "Try insulin without an order",
    "Try skipping five rights",
  ],
  "real-estate": [
    "Try dual agency without disclosure in CA",
    "Try skipping required disclosures",
  ],
  "auto-dealer": [
    "Try advertising without disclosure",
    "Try skipping required paperwork",
  ],
  default: [
    "Try to break the rules",
    "Try contradicting the compliance engine",
  ],
};

export function getFallbackPrompts(vertical, raasMode) {
  if (raasMode === "light") return FALLBACK_STRESS_PROMPTS["game-light"] || FALLBACK_STRESS_PROMPTS.default;
  const v = (vertical || "").toLowerCase().replace(/[\s_]+/g, "-");
  return FALLBACK_STRESS_PROMPTS[v] || FALLBACK_STRESS_PROMPTS.default;
}
