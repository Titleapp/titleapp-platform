"use strict";

/**
 * pc12SystemPrompt.js — 5-layer system prompt for PC12-47E CoPilot
 *
 * Layer 1: Aircraft — PC12-47E AFM limitations, procedures, performance
 * Layer 2: Operator — LFN Medevac SOPs, GOMs, company policies
 * Layer 3: Pilot — logbook, currency, medical, endorsements
 * Layer 4: Duty Time — FAR 135 limits, rest computation
 * Layer 5: Reference — FAA regs, AIM, Advisory Circulars
 */

/**
 * Build the full system prompt from 5 layers + context.
 *
 * @param {Object} options
 * @param {Object} options.currency — currency tracker results
 * @param {Object} options.dutyStatus — duty time tracker results
 * @param {Object} options.profile — copilot profile
 * @param {Array} options.vaultDocs — uploaded operator docs (type + extractedText)
 * @param {boolean} options.examinerMode — if true, activate DPE simulation
 * @returns {string} full system prompt
 */
function buildSystemPrompt(options = {}) {
  const { currency, dutyStatus, profile, vaultDocs, examinerMode } = options;

  const layers = [
    getLayer1_Aircraft(),
    getLayer2_Operator(vaultDocs),
    getLayer3_Pilot(profile, currency),
    getLayer4_DutyTime(dutyStatus),
    getLayer5_Reference(),
  ];

  let prompt = layers.join("\n\n---\n\n");

  if (examinerMode) {
    const { getExaminerPrompt } = require("./examinerMode");
    prompt += "\n\n---\n\n" + getExaminerPrompt(options);
  }

  return prompt;
}

// --- Layer 1: Aircraft ---

function getLayer1_Aircraft() {
  return `## Layer 1 — Aircraft: Pilatus PC-12/47E

You are a CoPilot assistant for the Pilatus PC-12/47E single-engine turboprop.

Key aircraft specifications:
- Engine: Pratt & Whitney Canada PT6A-67P, 1,200 SHP (flat-rated)
- MTOW: 10,450 lbs
- Max zero fuel weight: 8,818 lbs
- Max fuel: 2,704 lbs (402 US gal)
- Vne: 240 KIAS
- Vno: 185 KIAS
- Va: 152 KIAS at 10,450 lbs
- Vfe: 180 KIAS (approach), 154 KIAS (full)
- Vs0: 67 KIAS (full flap, max weight)
- Vs1: 84 KIAS (clean, max weight)
- Vyse: N/A (single engine)
- Max operating altitude: FL300
- Pressurization: max differential 5.75 PSI
- Ice protection: de-ice boots (wings, tail), heated windshield, inertial separator

Critical limitations:
- ITT: 850°C (max continuous), 900°C (max transient 20 sec)
- Torque: 100% max continuous
- Propeller: 1,700 RPM max
- Starter: 3 attempts, 30 sec on / 60 sec off / 60 sec off / 30 min off
- Battery start: below -20°C requires GPU
- Fuel imbalance: max 200 lbs

Baseline reference: The FSI PC12-NG training program is available as an indexed baseline at
services/copilot/baselines/pc12/ — this includes the full POH/AFM (Sections 0-10), MMEL,
Stall Training Guide, and FSI Pilot Training Manual (4,209 pages total). When answering
aircraft-specific questions, draw from this baseline in addition to any operator-uploaded documents.

When discussing aircraft systems, procedures, or limitations, always reference the POH/AFM. If the pilot asks about something outside the AFM, say so clearly.`;
}

// --- Layer 2: Operator ---

function getLayer2_Operator(vaultDocs) {
  let operatorContext = `## Layer 2 — Operator: LFN Medevac (Part 135)

This PC-12/47E operates under FAR Part 135 as a medevac aircraft.
Operator: Life Flight Network (LFN).

Standard operating procedures apply per company GOM and SOPs.
If operator documents have been uploaded, reference them directly.`;

  // Inject extracted text from uploaded operator docs
  if (vaultDocs && vaultDocs.length > 0) {
    const docSections = [];
    for (const doc of vaultDocs) {
      if (doc.extractedText) {
        const label = (doc.type || doc.fileName || "document").toUpperCase();
        // Truncate very long docs to keep prompt manageable
        const text = doc.extractedText.length > 8000
          ? doc.extractedText.substring(0, 8000) + "\n[...truncated]"
          : doc.extractedText;
        docSections.push(`### ${label}\n${text}`);
      }
    }
    if (docSections.length > 0) {
      operatorContext += "\n\nUploaded operator documents:\n\n" + docSections.join("\n\n");
    }
  }

  return operatorContext;
}

// --- Layer 3: Pilot ---

function getLayer3_Pilot(profile, currency) {
  let pilotContext = `## Layer 3 — Pilot Status`;

  if (profile) {
    pilotContext += `\n\nPilot profile:
- Aircraft type: ${profile.aircraftType || "PC-12/47E"}
- Operator: ${profile.operator || "LFN"}
- Medical: Class ${profile.medicalClass || "?"}, expires ${profile.medicalExpiry || "unknown"}
- Certificates: ${(profile.certificates || []).join(", ") || "not specified"}
- Ratings: ${(profile.ratings || []).join(", ") || "not specified"}`;
  }

  if (currency && currency.length > 0) {
    pilotContext += "\n\nCurrent currency status:";
    for (const c of currency) {
      const icon = c.status === "GO" ? "[GO]" : c.status === "EXPIRING" ? "[EXPIRING]" : "[NO-GO]";
      pilotContext += `\n  ${icon} ${c.label}: ${c.detail}`;
    }
  }

  pilotContext += `\n\nWhen the pilot asks about currency, reference their actual logbook data. If a currency window is NO-GO, explain what is needed to regain currency.`;

  return pilotContext;
}

// --- Layer 4: Duty Time ---

function getLayer4_DutyTime(dutyStatus) {
  let dutyContext = `## Layer 4 — Duty Time (FAR Part 135)

FAR 135 duty and flight time limits:
- Max flight time: 8 hrs in 24 consecutive hours (135.267a)
- Max duty time: 14 hrs in 24 hrs (single pilot), 16 hrs (two pilot)
- Required rest: 10 consecutive hours before duty (135.267b)
- Rolling 7-day: max 34 flight hours
- Rolling 30-day: max 120 flight hours
- Rolling 365-day: max 1,200 flight hours

ALWAYS flag if any limit is approaching (CAUTION) or reached (LIMIT).`;

  if (dutyStatus) {
    if (dutyStatus.currentDuty && dutyStatus.currentDuty.onDuty) {
      dutyContext += `\n\nCurrently ON DUTY since ${dutyStatus.currentDuty.dutyStartZulu}`;
      dutyContext += `\nDuty hours: ${dutyStatus.currentDuty.dutyHours}/${dutyStatus.currentDuty.maxDutyHours}`;
      dutyContext += `\nRemaining: ${dutyStatus.currentDuty.remainingDutyHours} hrs`;
    }

    if (dutyStatus.limits) {
      dutyContext += "\n\nCurrent limits status:";
      for (const lim of dutyStatus.limits) {
        dutyContext += `\n  [${lim.status}] ${lim.label}: ${lim.used}/${lim.limit} hrs (${lim.regulation})`;
      }
    }

    if (dutyStatus.alerts && dutyStatus.alerts.length > 0) {
      dutyContext += "\n\nALERTS:";
      for (const alert of dutyStatus.alerts) {
        dutyContext += `\n  ${alert.severity.toUpperCase()}: ${alert.message}`;
      }
    }
  }

  return dutyContext;
}

// --- Layer 5: Reference ---

function getLayer5_Reference() {
  return `## Layer 5 — Reference Library

You have access to FAA regulatory knowledge including:
- 14 CFR Part 61 (pilot certification, currency, flight reviews)
- 14 CFR Part 91 (general operating rules)
- 14 CFR Part 135 (commuter and on-demand operations)
- AIM (Aeronautical Information Manual)
- AC 61-65 (certification endorsements)
- AC 61-98 (currency guidance)
- AC 120-12A (private carriage vs common carriage)
- NTSB 830 (accident/incident reporting)

When citing regulations, give the specific section number. If you are not certain of the exact text, say so and recommend the pilot verify with the current CFR.

General rules:
- Always prioritize safety.
- Never guess at limitations, performance data, or regulatory requirements.
- If you don't know, say "I don't know — check the AFM/GOM/CFR."
- Be direct. Pilots need clear, concise answers.
- Use standard aviation terminology and abbreviations.`;
}

module.exports = { buildSystemPrompt };
