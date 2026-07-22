/**
 * workerTabDescriptions.js — Static tab descriptions for all workers.
 *
 * Used by TabDescription.jsx to render a dismissible BLUE blurb below the
 * tab bar whenever a tab is selected. Keyed by workerSlug → tabId.
 *
 * Descriptions are written for a new user who has never seen this tab before.
 * Keep them to one or two short sentences: what this tab shows, and what they
 * can do from here.
 *
 * RE workers define descriptions directly on their tab objects in reCanvasData.js.
 * All other workers (spine + vertical) are covered here.
 */

export const WORKER_TAB_DESCRIPTIONS = {

  // ── Accounting ────────────────────────────────────────────────────────────
  "platform-accounting": {
    "overview":       "High-level snapshot of your financial health this period — revenue, expenses, net income, and cash flow at a glance.",
    "pl":             "Full profit & loss statement broken down by revenue stream and expense category. Ask Alex to explain any line or project forward.",
    "balance-sheet":  "Assets, liabilities, and equity as of the end of the period. Ask Alex to flag anything that looks out of balance.",
    "cash-flow":      "Operating, investing, and financing cash flows for the period. Your actual cash position, not just book income.",
    "invoices":       "Open, overdue, and recently paid invoices. Ask Alex to draft a follow-up or flag anything past due.",
    "tax":            "Quarterly estimate status, upcoming filing deadlines, and open tax tasks. Ask Alex to prepare a summary for your CPA.",
  },

  // ── HR & People ───────────────────────────────────────────────────────────
  "platform-hr": {
    "people":         "Your full team roster — humans and Digital Workers — with roles and status. Ask Alex to add a new person or pull up anyone's profile.",
    "onboarding":     "In-flight onboardings and their current step. Ask Alex to draft the next onboarding task or send a welcome message.",
    "schedule":       "Today's coverage: who's on shift, who's out, and which Digital Workers are running 24×7.",
    "compliance":     "Open HR compliance obligations, hard-stops, and upcoming deadlines. Ask Alex to explain any item or draft a resolution.",
    "documents":      "Agreements, signed packets, and expiring credentials. Ask Alex to send a signature request or pull any document.",
    "notices":        "Recent and queued outbound HR communications — reminders, compliance notices, and onboarding messages.",
    "my-onboarding":  "Your personal onboarding status — what's complete and what's waiting on you.",
    "my-documents":   "Your signed HR documents and anything pending your signature.",
    "my-schedule":    "Your PTO balance, sick time, and upcoming time off.",
  },

  // ── Marketing & Content ───────────────────────────────────────────────────
  "platform-marketing": {
    "overview":          "Campaign performance at a glance — ROI, reach, and top creative across all channels.",
    "kpis":              "Your core marketing metrics: ROI, leads, email open rate, and social reach.",
    "campaigns":         "Active campaigns by channel. Ask Alex to draft a new campaign, analyze performance, or suggest improvements.",
    "creative":          "Your creative asset library. Ask Alex to generate new images, repurpose existing assets, or schedule a refresh.",
    "content-calendar":  "Your upcoming content schedule. Ask Alex to fill gaps, reschedule posts, or draft copy for any slot.",
    "email":             "Email performance metrics — sends, opens, clicks, and unsubscribes. Ask Alex to run a comparison or draft a new sequence.",
  },

  // ── Contacts ─────────────────────────────────────────────────────────────
  "platform-contacts": {
    "overview":     "Your full contact list with recent activity and follow-up status.",
    "pipeline":     "Active relationship pipeline — leads, prospects, and clients by stage.",
    "follow-ups":   "Contacts that need attention this week. Ask Alex to draft a message or log an interaction.",
    "segments":     "Contact segments and lists. Ask Alex to build a new segment or update an existing one.",
  },

  // ── Chief of Staff (Alex) ─────────────────────────────────────────────────
  "chief-of-staff": {
    "dashboard":    "Alex's situational awareness: open items across your workers, today's priorities, and anything that needs your attention.",
    "schedule":     "Your calendar for today and this week. Ask Alex to schedule, move, or cancel anything.",
    "tasks":        "Open tasks and delegated items. Ask Alex to create a new task, assign it, or mark something complete.",
    "digest":       "Your latest executive digest — weekly summary of wins, open items, and priorities.",
  },

  // ── IR / Fundraise ────────────────────────────────────────────────────────
  "fundraise": {
    "pipeline":      "Your investor pipeline — who you've approached, who's in diligence, and who's closed.",
    "progress":      "Capital raise progress toward your target: committed, received, and remaining.",
    "data-room":     "Data room documents and access log — who's viewed what, and when.",
    "cap-table":     "Fully diluted cap table with shareholder positions and 83(b) election status.",
    "governance":    "Open ballots, board observer status, and upcoming quarterly cadence.",
    "notices":       "Outbound investor communications — updates, KYC reminders, and quarterly reports.",
    "communication": "Company updates and announcements visible to your investor network.",
    "voting":        "Your open ballots and voting history.",
    "my-position":   "Your individual investor position — shares, ownership %, and instrument details.",
    "documents":     "Your investor documents — signed SAFEs, W-9s, and expected tax documents.",
  },

  // ── Veterinary — Drug Dosing ──────────────────────────────────────────────
  "vet-drug-dosing": {
    "calculator":  "Enter patient weight and drug to get weight-based dosing with route-specific adjustments. All outputs are clinical reference — verify against your formulary.",
    "history":     "Order history for this practice — recent drug calculations with patient context.",
    "protocols":   "Standing protocols for common procedures. Ask Alex to pull up a protocol or adapt one for a specific patient.",
    "schedule":    "Controlled substance log entries. Confirm and sign off directly from here.",
  },

  // ── Veterinary — Back-of-House (SPINE4) ───────────────────────────────────
  "vet-spine4": {
    "dashboard":    "Your full team roster — clinical staff plus Digital Workers — with status and active credentials.",
    "credentials":  "License expiry and CE credit status per staff member. Items expiring within 60 days are flagged.",
    "training":     "Completed and scheduled training records by staff member. Ask Alex to log a new completion or draft a reminder.",
    "calendar":     "Upcoming license renewals and mandatory re-certifications. Ask Alex to set a reminder.",
    "reminders":    "Active reminders for credentials, CE deadlines, and compliance items.",
  },

  // ── Nursing (Makai School) ────────────────────────────────────────────────
  "nursing-records-001": {
    "cohort-overview":  "Big picture of your entire cohort — who's ready, on track, or at risk. Click any student card to drill into their full record.",
    "student-record":   "Full learning record for the selected student — clinical hours, ATI score, competency attestations, and instructor notes.",
    "clinical-hours":   "Clinical hours progress for every student in the cohort. The program minimum is 500 hours before graduation.",
    "competency-log":   "All competency records across the cohort — verified attestations and items still awaiting faculty sign-off.",
    "vault-export":     "Each student's learning record lives in their personal Vault — portable, append-only, and signed. Export from here.",
  },
  "nursing-courses-001": {
    "course-roster":    "Active courses with enrollment, week-by-week progress, and the open-source textbook powering each course.",
    "module-progress":  "Week-by-week completion map for each course — green = done, purple = current, gray = upcoming.",
    "ati-integration":  "ATI Nursing integration status and test drive — see how ATI assessment scores flow automatically into student records via LTI 1.3.",
    "gradebook":        "Course grades and ATI scores across the full cohort in one table.",
    "course-content":   "The open educational resources powering each course — peer-reviewed, NCLEX-aligned, and CC BY 4.0.",
  },
  "nursing-tutor-001": {
    "nclex-domain-map": "Cohort-wide NCLEX readiness by domain — see where students are strong and where gaps remain against the 70% benchmark.",
    "active-sessions":  "Students using the AI Tutor right now, with the topic and NCLEX domain they're working on.",
    "tutor-analytics":  "Weekly tutor usage stats — sessions, questions answered, domains covered, and cohort gap alerts.",
    "content-coverage": "What percentage of each OpenStax course has appeared in tutor sessions — a proxy for content breadth.",
  },
  "nursing-comms-001": {
    "faculty-queue":          "Action items for faculty — attestations that need signing, sorted by how long they've been waiting.",
    "preceptor-portal":       "Clinical preceptors submit evaluations here — no LMS login required. Their submissions route to the instructor for final sign-off.",
    "pending-attestations":   "All competency attestations currently awaiting instructor or preceptor signature.",
    "communication-log":      "Audit trail of all faculty communications, flags, and notes attached to student records.",
  },
  "nursing-accreditation-001": {
    "cohort-dashboard":       "Accreditor-ready overview — total students, average clinical hours, ATI performance, and NCLEX readiness distribution.",
    "nclex-outcomes":         "NCLEX domain readiness scores for the cohort — used to demonstrate program preparedness to accreditors.",
    "clinical-hours-report":  "Full clinical hours ledger by student — every hour is append-only and tamper-evident.",
    "ati-performance":        "ATI Fundamentals scores ranked by student, with cohort average and benchmark comparison.",
    "accreditation-export":   "Generate the ACEN audit package — Standards 4, 5, and 6 — as a signed, time-stamped export.",
  },

  // ── UH Mānoa Nursing (same tab descriptions, UH slugs) ───────────────────────
  "uh-nursing-records-001": {
    "cohort-overview":  "Big picture of your entire cohort — who's ready, on track, or at risk. Click any student card to drill into their full record.",
    "student-record":   "Full learning record for the selected student — clinical hours, ATI score, competency attestations, and instructor notes.",
    "clinical-hours":   "Clinical hours progress for every student in the cohort. The program minimum is 500 hours before graduation.",
    "competency-log":   "All competency records across the cohort — verified attestations and items still awaiting faculty sign-off.",
    "vault-export":     "Each student's learning record lives in their personal Vault — portable, append-only, and signed. Students carry them beyond graduation.",
  },
  "uh-nursing-courses-001": {
    "course-roster":    "Active courses with enrollment, week-by-week progress, and the open-source textbook powering each course.",
    "module-progress":  "Week-by-week completion map for each course — green = done, purple = current, gray = upcoming.",
    "ati-integration":  "ATI Nursing integration status and test drive — see how ATI assessment scores flow automatically into student records via LTI 1.3.",
    "gradebook":        "Course grades and ATI scores across the full cohort in one table.",
    "course-content":   "The open educational resources powering each course — peer-reviewed, NCLEX-aligned, and CC BY 4.0.",
  },
  "uh-nursing-tutor-001": {
    "nclex-domain-map": "Cohort-wide NCLEX readiness by domain — see where students are strong and where gaps remain against the 70% benchmark.",
    "active-sessions":  "Students using the AI Tutor right now, with the topic and NCLEX domain they're working on.",
    "tutor-analytics":  "Weekly tutor usage stats — sessions, questions answered, domains covered, and cohort gap alerts.",
    "content-coverage": "What percentage of each OpenStax course has appeared in tutor sessions — a proxy for content breadth.",
  },
  "uh-nursing-comms-001": {
    "faculty-queue":          "Action items for faculty — attestations that need signing, sorted by how long they've been waiting.",
    "preceptor-portal":       "Clinical preceptors submit evaluations here — no LMS login required. Their submissions route to the instructor for final sign-off.",
    "pending-attestations":   "All competency attestations currently awaiting instructor or preceptor signature.",
    "communication-log":      "Audit trail of all faculty communications, flags, and notes attached to student records.",
  },
  "uh-nursing-accreditation-001": {
    "cohort-dashboard":       "Accreditor-ready overview — total students, average clinical hours, ATI performance, and NCLEX readiness distribution.",
    "nclex-outcomes":         "NCLEX domain readiness scores for the cohort — used to demonstrate program preparedness to CCNE accreditors.",
    "clinical-hours-report":  "Full clinical hours ledger by student — every hour is append-only and tamper-evident.",
    "ati-performance":        "ATI Fundamentals scores ranked by student, with cohort average and benchmark comparison.",
    "accreditation-export":   "Generate the CCNE audit package as a signed, time-stamped export ready for site visit.",
  },

  // ── CRE / Deal Analyst ────────────────────────────────────────────────────
  "cre-analyst": {
    "overview":     "Deal summary — property basics, key metrics, and status at a glance.",
    "underwriting": "Underwriting model inputs and NOI outputs. Ask Alex to run a sensitivity or stress-test a scenario.",
    "comparables":  "Comparable sales and lease comps for this market and asset class.",
    "risk":         "Risk flags, market risk factors, and deal-level CAS scores.",
    "documents":    "Deal documents, LOIs, and due diligence materials.",
  },

  // ── Aviation ──────────────────────────────────────────────────────────────
  "av-copilot-001": {
    "dashboard":  "Your operational status at shift start — currency, aircraft airworthiness, and any open items before your next flight.",
    "preflight":  "Alex's assembled go/no-go package: live weather at origin and destination, FRAT score, W&B, and NOTAMs. Review and approve to open the trip record.",
    "trip":       "The immutable trip record — every event from preflight release through landing, timestamped and signed. Your IRS business-purpose log and compliance record in one place.",
    "debrief":    "Post-flight debrief auto-populated from trip data. Review the FOQA questions, add remarks, and approve. Takes 90 seconds. Filed, signed, and chained to the trip record.",
    "logbook":    "Your digital pilot logbook — append-only, chain-signed, portable. Every entry includes business purpose recorded at time of flight for IRS documentation.",
  },
  "av-mx-001": {
    "airworthiness": "N662FW's complete airworthiness picture — current inspections, engine time, and any open MEL items at a glance.",
    "timeline":      "Complete maintenance history — every entry append-only and chain-signed. The full chronological story of this aircraft from acquisition to today.",
    "squawks":       "Open discrepancies and their resolution status. Tell Alex about any issue to log it immediately — timestamped and notified to your A&P.",
    "upcoming":      "What's coming due on N662FW, by hours and by calendar. Nothing should surprise you at a pre-buy or an FAA ramp check.",
  },
  "av-dispatch-001": {
    "trip-package":  "Alex's pre-assembled trip release package — every release item verified from live data before you dispatch. No manual re-entry.",
    "frat":          "Flight Risk Assessment score auto-calculated from weather, crew currency, aircraft status, and mission type.",
    "trip-record":   "The trip record, billing summary, and IRS business-purpose log. Chain-signed and exportable for your CPA.",
  },
};

/**
 * Look up a tab description. Returns the string or undefined.
 * @param {string} workerSlug
 * @param {string} tabId
 */
export function getTabDescription(workerSlug, tabId) {
  return WORKER_TAB_DESCRIPTIONS[workerSlug]?.[tabId];
}
