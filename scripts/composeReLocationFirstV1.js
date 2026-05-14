/**
 * Compose `re_location_first_v1` constraint RAAS module.
 *
 * Enforces the Real Estate location-first UX rule (Sean's call 2026-05-11):
 *   - Every RE worker output that references a property must lead with a
 *     Google Maps link (NOT third-party photos — IP claim exposure)
 *   - Street View link acceptable when street-level context is needed
 *   - Auto-pulling property photos from MLS / Zillow / Redfin is forbidden
 *
 * The module loads on every RE worker (sales, listing, leasing, title,
 * escrow, inspection, showing, etc.). Status: live (no counsel review
 * required — this is a platform-side UX + IP rule, not a regulatory claim).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/composeReLocationFirstV1.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/composeReLocationFirstV1.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const cm = require(path.join(__dirname, "..", "functions", "functions", "services", "raas", "constraintModules"));

const DRY = !process.argv.includes("--apply");
const MODULE_ID = "re_location_first_v1";

const SECTIONS = [
  {
    sectionId: "location-first-lead",
    priority: "critical",
    section_type: "sop",
    title: "Every property reference leads with a Google Maps link",
    body_markdown:
      "When a Real Estate worker output references a specific property (by address, parcel ID, or coordinates), the FIRST interactive element in the output must be a Google Maps link to that property.\n\n" +
      "Format the link as:\n" +
      "  `https://maps.google.com/?q={ADDRESS_URL_ENCODED}`\n\n" +
      "Render in chat output as inline markdown link: `[123 Main St, San Francisco, CA 94123](https://maps.google.com/?q=123+Main+St+San+Francisco+CA+94123)`.\n\n" +
      "In canvas tab content, the Location section must appear before any other property information. The address renders as the visible link text; clicking opens Google Maps.\n\n" +
      "In PDF / DOCX reports, page 1 must include a location card with the address printed alongside the Maps URL.\n\n" +
      "DISPOSITION: block_with_explanation if output references a property without a Maps link.",
    source_refs: [{ docId: "feedback_re_location_first_ux.md", section: "Rule" }],
  },
  {
    sectionId: "no-third-party-photos",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Never auto-pull property photos from third-party sources",
    body_markdown:
      "Photos of property exteriors, interiors, aerial views, or any other property imagery sourced from MLS, Zillow, Redfin, broker websites, listing aggregators, or any third-party photographer are PROHIBITED in worker output.\n\n" +
      "Reason: photographers, MLS, sellers, and brokerages hold IP rights over property imagery. Auto-pulling photos for an AI-generated output creates downstream liability for the user (the brokerage / agent using the platform).\n\n" +
      "If the user uploads their own photos (with appropriate license — their own MLS subscription, their own photographer's release, their own listing as agent of record), the worker may include them in output. This is a user-attested-license path, not an auto-pull.\n\n" +
      "DISPOSITION: block_with_explanation if output contains any image URL from a known property-photo domain (mlspin.com, zillowstatic.com, redfin.com, realtor.com, har.com, etc.) OR any image scraped from a property-listing page.",
    source_refs: [{ docId: "feedback_re_location_first_ux.md", section: "Rule (Never:)" }],
  },
  {
    sectionId: "street-view-acceptable",
    priority: "standard",
    section_type: "guidance",
    title: "Google Street View link is acceptable for street-level context",
    body_markdown:
      "When street-level visual context is needed (e.g., the worker is explaining curb appeal, frontage, or street features), a Google Street View link is acceptable as a SECONDARY link after the primary Maps link.\n\n" +
      "Format the Street View link as:\n" +
      "  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={LAT},{LNG}`\n\n" +
      "Or, for an address-based panorama:\n" +
      "  `https://www.google.com/maps/place/{ADDRESS_URL_ENCODED}/@{LAT},{LNG},3a,75y,0h,90t`\n\n" +
      "Street View links are still Google-sourced — no third-party imagery, no IP claim exposure.\n\n" +
      "DISPOSITION: guidance only (no automatic block). Worker may include Street View link when context warrants.",
    source_refs: [{ docId: "feedback_re_location_first_ux.md", section: "Rule (Street View)" }],
  },
  {
    sectionId: "canvas-location-section",
    priority: "standard",
    section_type: "sop",
    title: "Canvas tabs include a Location section as the first content block",
    body_markdown:
      "Every Real Estate worker's canvas tab content must include a 'Location' section that appears before any other property information. The Location section contains:\n\n" +
      "  - Full address (street, city, state, ZIP)\n" +
      "  - Google Maps link (rendered as styled link)\n" +
      "  - Optional: parcel ID / APN, county, jurisdictional notes\n" +
      "  - Optional: Street View link if street-level context is relevant\n\n" +
      "The Location section must NOT contain auto-pulled images.\n\n" +
      "DISPOSITION: guidance (canvas-tab authors enforce this at content time; the constraint module flags violations but does not block).",
    source_refs: [{ docId: "feedback_re_location_first_ux.md", section: "How to apply (Canvas tab content)" }],
  },
  {
    sectionId: "user-uploaded-photos-allowed",
    priority: "reference",
    section_type: "exemption_note",
    title: "User-uploaded photos with attested license are permitted",
    body_markdown:
      "Photos uploaded by the user (the agent, broker, or owner of record) ARE permitted in worker output when accompanied by an implicit license attestation (the user uploading their own MLS-sourced photos under their own subscription, their own listing photographer's photos with release, or photos of their own property as owner).\n\n" +
      "The platform does not verify license at upload time — the user attests by uploading. The worker may use these photos in output.\n\n" +
      "This is distinct from auto-pulling photos from third-party URLs, which is prohibited.\n\n" +
      "DISPOSITION: informational only.",
    source_refs: [{ docId: "feedback_re_location_first_ux.md", section: "How to apply (user-uploaded path)" }],
  },
];

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Compose ${MODULE_ID}\n`);

  // Step 1: Create the module (or skip if already exists)
  let moduleExists = false;
  try {
    const db = admin.firestore();
    const ref = db.collection("constraintRaasModules").doc(MODULE_ID);
    const snap = await ref.get();
    moduleExists = snap.exists;
  } catch (_) {}

  if (!moduleExists) {
    if (DRY) {
      console.log(`Would CREATE module: ${MODULE_ID}`);
    } else {
      await cm.createModule({
        moduleId: MODULE_ID,
        name: "Real Estate — Location-First UX",
        description:
          "Enforces the Real Estate location-first output rule: every property reference leads with a Google Maps link; no third-party property photos auto-pulled. Protects users from IP claims and standardizes the user experience across all RE workers.",
        domain: "real_estate",
        jurisdiction_scope: ["US-federal", "US-state-all"],
        disposition_default: "block_with_explanation",
        createdBy: "system_compose_2026-05-11",
      });
      console.log(`✅ Created module: ${MODULE_ID}`);
    }
  } else {
    console.log(`Module ${MODULE_ID} already exists — adding/updating sections only`);
  }

  // Step 2: Add sections
  for (const s of SECTIONS) {
    if (DRY) {
      console.log(`Would ADD section: ${s.sectionId} (${s.section_type}, ${s.priority})`);
    } else {
      try {
        await cm.addSection({ moduleId: MODULE_ID, ...s });
        console.log(`✅ Added section: ${s.sectionId}`);
      } catch (e) {
        if (e.message.includes("already exists")) {
          console.log(`(section ${s.sectionId} already exists — skipping)`);
        } else {
          throw e;
        }
      }
    }
  }

  // Step 3: Transition to live (no counsel review needed — UX + IP rule, not regulatory claim)
  if (!DRY) {
    try {
      await cm.transitionStatus({
        moduleId: MODULE_ID,
        newStatus: "live",
        transitionedBy: "system_compose_2026-05-11",
        approvalNotes: "Platform-side UX + IP rule, no external counsel required. Sean's call 2026-05-11.",
      });
      console.log(`✅ Module transitioned to live`);
    } catch (e) {
      if (e.message.includes("already") || e.message.includes("invalid")) {
        console.log(`(module already at target status — skipping transition)`);
      } else {
        console.log(`⚠ transition warning: ${e.message}`);
      }
    }
  }

  console.log(`\n${DRY ? "DRY RUN COMPLETE. Re-run with --apply." : "DONE."}\n`);
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
