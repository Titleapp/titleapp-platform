"use strict";

/**
 * verticalSiblings.js — CODEX 43 §5 vertical sibling injection.
 *
 * Every worker in a vertical should know its siblings exist and what bundle
 * shapes they produce/consume, so it can propose handoffs instead of saying
 * "go to another tab." This function builds the SIBLING WORKERS block that is
 * prepended to the worker system prompt in the chat handler.
 *
 * Inject order (from CODEX 43 §2):
 *   [workspace context] → [spine KPIs] → [own-data grounding] → [vertical siblings] → WHO YOU SERVE → system prompt
 *
 * Design constraints:
 * - 2s timeout on Firestore read — sibling injection MUST NOT stall a chat turn.
 * - Cap at 8 siblings (R4 from red team).
 * - Only inject for non-platform verticals.
 * - All arithmetic stays server-side; this block is text-only.
 */

// Known bundle shapes — populated from CODEX 43 §5.3 + nursing vertical.
// Workers without an entry fall back to dw.emits / dw.accepts fields on the doc.
const BUNDLE_SHAPES = {
  // Real-estate vertical
  "cre-analyst":            { emits: "parcel-bundle/v1", accepts: "address + deal terms, parcel-bundle/v1, site-recon-bundle/v1, legal-opinion-bundle/v1, zoning-bundle/v1, feasibility-roadmap/v1" },
  "site-recon-001":         { emits: "site-recon-bundle/v1", accepts: "parcel-bundle/v1" },
  "title-abstract-001":     { emits: "title-abstract-bundle/v1", accepts: "parcel-bundle/v1" },
  "law-landuse-001":        { emits: "legal-opinion-bundle/v1", accepts: "parcel-bundle/v1, zoning-bundle/v1" },
  "zoning-001":             { emits: "zoning-bundle/v1", accepts: "parcel-bundle/v1" },
  "feasibility-001":        { emits: "feasibility-roadmap/v1", accepts: "parcel-bundle/v1, site-recon-bundle/v1, zoning-bundle/v1, legal-opinion-bundle/v1" },
  "re-marketing-001":       { emits: "listing-readiness/v1", accepts: "title-abstract-bundle/v1" },
  // Title Production Suite (CODEX 48) — real-estate / title suite
  "re-title-search-001":    { emits: "chain-of-title/v1", accepts: "address, parcel-bundle/v1" },
  "re-escrow-001":          { emits: "settlement-statement/v1", accepts: "chain-of-title/v1" },
  // Education vertical — nursing
  "nursing-education-001":  { emits: "learning-record/v1", accepts: "student-id, cohort-id" },
  "nursing-records-001":    { emits: "student-record/v1", accepts: "student-id, cohort-id" },
  "nursing-courses-001":    { emits: "course-record/v1", accepts: "student-record/v1" },
  "nursing-tutor-001":      { emits: "tutoring-session/v1", accepts: "student-record/v1, course-record/v1" },
  "nursing-comms-001":      { emits: "comms-bundle/v1", accepts: "student-record/v1" },
  "nursing-accreditation-001": { emits: "accreditation-report/v1", accepts: "student-record/v1, course-record/v1" },
  // Aviation vertical
  "av-copilot-001":         { emits: "flight-brief/v1", accepts: "route + aircraft, pilot-currency/v1" },
  "av-mx-001":              { emits: "mx-report/v1", accepts: "aircraft-id, logbook-entry/v1" },
  "av-dispatch-001":        { emits: "dispatch-release/v1", accepts: "flight-brief/v1, wx-brief/v1" },
  // DPP (EU battery / product passport) vertical
  "eu-battery-dpp-001":     { emits: "dpp-compliance-report/v1", accepts: "product-id, battery-specs" },
  "eu-passport-builder-001":{ emits: "dpp-passport/v1", accepts: "dpp-compliance-report/v1" },
  "eu-supply-chain-tracer-001": { emits: "supply-chain-bundle/v1", accepts: "product-id" },
  "eu-registry-manager-001":{ emits: "registry-record/v1", accepts: "dpp-passport/v1" },
  "eu-lifecycle-monitor-001":{ emits: "lifecycle-alert/v1", accepts: "dpp-passport/v1" },
};

const HANDOFF_LINES = {
  // Real-estate
  "cre-analyst":            "They take an address and build the full deal screen including comps and NOI.",
  "site-recon-001":         "They do a physical site survey with photos, conditions, and physical comp map.",
  "title-abstract-001":     "They pull the chain of title, liens, and easements on the parcel.",
  "law-landuse-001":        "They provide a legal opinion on land use, zoning variances, and development rights.",
  "zoning-001":             "They research current zoning classifications and overlay restrictions.",
  "feasibility-001":        "They model project feasibility including pro forma, entitlement risk, and go/no-go.",
  "re-marketing-001":       "They create the listing, showing calendar, and buyer communications.",
  // Title Production Suite
  "re-title-search-001":    "They pull the full chain of title, liens, and judgments for the parcel and open a title order.",
  "re-escrow-001":          "They manage escrow, wire instructions, funds tracking, and the closing disclosure.",
  // Education — nursing
  "nursing-education-001":  "They manage the full student learning record from enrollment through licensure.",
  "nursing-records-001":    "They track student enrollment status, clinical hours, and ATI scores.",
  "nursing-courses-001":    "They manage course schedules, weekly progress, and curriculum.",
  "nursing-tutor-001":      "They deliver targeted tutoring sessions based on each student's weak subject areas.",
  "nursing-comms-001":      "They handle all student and faculty communications, announcements, and follow-ups.",
  "nursing-accreditation-001": "They prepare accreditation reports, competency documentation, and ACEN evidence files.",
  // Aviation
  "av-copilot-001":         "They build pre-flight briefs, check pilot currency, and flag regulatory items.",
  "av-mx-001":              "They track airworthiness, maintenance-due items, and AD compliance.",
  "av-dispatch-001":        "They issue the dispatch release with weather and NOTAMs cleared.",
  // DPP
  "eu-battery-dpp-001":     "They run EU Battery Regulation compliance checks and generate the compliance report.",
  "eu-passport-builder-001":"They build the digital product passport from a compliance report.",
  "eu-supply-chain-tracer-001": "They trace supply chain provenance for a product.",
  "eu-registry-manager-001":"They submit and manage records in the EU product registry.",
  "eu-lifecycle-monitor-001":"They monitor battery lifecycle events and alert on threshold breaches.",
};

/**
 * Builds the SIBLING WORKERS context block for the active worker's vertical.
 *
 * @param {object}  args
 * @param {object}  args.db           Firestore admin db
 * @param {string}  args.tenantId     caller's tenant (used for future subscription filtering)
 * @param {string}  args.vertical     dw.vertical of the active worker
 * @param {string}  [args.suite]      dw.suite (optional, for label only)
 * @param {string}  args.currentSlug  active worker slug — excluded from sibling list
 * @returns {Promise<string>}  context block ("" if no siblings found or timeout)
 */
async function buildVerticalSiblingBlock({ db, tenantId, vertical, suite, currentSlug }) {
  if (!db || !vertical || vertical === "platform" || !currentSlug) return "";
  try {
    // 2s hard timeout — sibling inject MUST NOT stall chat.
    const snap = await Promise.race([
      db.collection("digitalWorkers")
        .where("vertical", "==", vertical)
        .where("status", "in", ["active", "live"])
        .limit(20)
        .get(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("sibling-timeout")), 2000)),
    ]);

    // Priority order: workers with known bundle shapes first (these are the
    // important handoff targets), then alphabetical by slug. This ensures that
    // when the vertical has > 8 workers, the most architecturally significant
    // siblings are always chosen rather than Firestore's arbitrary return order.
    const workers = (snap.docs || [])
      .map(d => ({ slug: d.id, ...d.data() }))
      .filter(w => w.slug !== currentSlug)
      .sort((a, b) => {
        const aKnown = BUNDLE_SHAPES[a.slug] ? 0 : 1;
        const bKnown = BUNDLE_SHAPES[b.slug] ? 0 : 1;
        return aKnown - bKnown || a.slug.localeCompare(b.slug);
      })
      .slice(0, 8);

    if (!workers.length) return "";

    const vertLabel = vertical.replace(/-/g, " ");
    const suiteLabel = suite ? ` / ${suite} suite` : "";
    const lines = [`SIBLING WORKERS IN THIS VERTICAL (${vertLabel}${suiteLabel}):\n`];

    for (const w of workers) {
      const shapes = BUNDLE_SHAPES[w.slug] || {
        emits:   w.emits   || "—",
        accepts: w.accepts || "—",
      };
      const handoff = HANDOFF_LINES[w.slug] || (w.description || w.tagline || "").slice(0, 100);
      lines.push(`- ${w.name || w.display_name || w.slug} (${w.slug})`);
      lines.push(`  accepts: ${shapes.accepts}`);
      lines.push(`  emits:   ${shapes.emits}`);
      if (handoff) lines.push(`  say: "Want me to pass this to ${w.name || w.slug}? ${handoff}"`);
    }

    lines.push(
      "\nSIBLING RULE: When your output matches another worker's accepted input, propose the handoff" +
      " by name. Never say 'go to another tab.' Never claim a handoff already happened." +
      " Phase 1 = suggest only. The user navigates; Alex routes.\n"
    );
    return lines.join("\n") + "\n";
  } catch (e) {
    // Timeout or Firestore error — graceful degradation, chat still works.
    if (e.message !== "sibling-timeout") console.warn("[verticalSiblings]", e.message);
    return "";
  }
}

module.exports = { buildVerticalSiblingBlock };
