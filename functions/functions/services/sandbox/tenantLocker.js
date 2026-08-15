"use strict";

/**
 * Tenant Studio Locker — per-tenant knowledge layer for published workers.
 *
 * Tenants (subscribers) can add context documents to any worker they have
 * access to. These docs are injected into that worker's chat system prompt
 * for that tenant's session only. Completely independent of the creator's
 * knowledge base.
 *
 * Collection:
 *   tenantLockers/{tenantId}/workers/{workerId}/documents/{docId}
 *
 * Each doc: { name, text (capped), type, charCount, createdAt }
 *
 * System docs (readOnly: true) are injected at list time from RAAS rulesets
 * on disk — they are never written to Firestore and cannot be deleted by tenants.
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

// Map worker slug → RAAS rules source + legal references shown as system docs.
// CODEX S52.48 (2026-08-15): "moduleId" is the new live path — reads the same
// constraintRaasModules content that's actually injected into the model's
// system prompt (services/raas/workerPromptComposer.js), so what a user sees
// here is guaranteed to match what actually binds the worker. "rulesetFile"
// is the legacy path (static JSON on disk) — kept as a fallback for workers
// that haven't been migrated to a constraintRaasModules entry yet. Migrate
// each worker by adding a moduleId here once its module exists; remove
// rulesetFile once migrated so there's exactly one source per worker.
const WORKER_SYSTEM_DOCS = {
  "platform-accounting": {
    moduleId: "accounting_gaap_v1",
    rulesetFile: "platform_accounting_v1.json", // legacy fallback only — superseded by moduleId above
    legalRefs: [
      { name: "US GAAP — Generally Accepted Accounting Principles", url: "https://fasb.org/standards" },
      { name: "IRS Publication 334 — Tax Guide for Small Business", url: "https://irs.gov/pub/irs-pdf/p334.pdf" },
      { name: "IRS Publication 535 — Business Expenses", url: "https://irs.gov/pub/irs-pdf/p535.pdf" },
    ],
  },
  "platform-hr": {
    rulesetFile: "platform_hr_compliance_v1.json",
    legalRefs: [
      { name: "FLSA — Fair Labor Standards Act (DOL)", url: "https://dol.gov/agencies/whd/flsa" },
      { name: "EEOC — Equal Employment Opportunity Commission", url: "https://eeoc.gov/laws/statutes" },
      { name: "FMLA — Family & Medical Leave Act", url: "https://dol.gov/agencies/whd/fmla" },
      { name: "ADA — Americans with Disabilities Act", url: "https://eeoc.gov/disability-discrimination" },
    ],
  },
  "platform-contacts": {
    rulesetFile: "platform_contacts_v1.json",
    legalRefs: [
      { name: "CAN-SPAM Act — FTC", url: "https://ftc.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business" },
      { name: "GDPR Summary — European Commission", url: "https://commission.europa.eu/law/law-topic/data-protection_en" },
      { name: "CCPA — California Consumer Privacy Act", url: "https://oag.ca.gov/privacy/ccpa" },
    ],
  },
  "platform-marketing": {
    rulesetFile: "platform_marketing_v1.json",
    legalRefs: [
      { name: "FTC Endorsement Guides", url: "https://ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking" },
      { name: "CAN-SPAM Act — FTC", url: "https://ftc.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business" },
      { name: "SEC Marketing Rule (advisers)", url: "https://sec.gov/investment/marketing-rule" },
    ],
  },
  "investor-relations": {
    rulesetFile: "ir_compliance_v0.json",
    legalRefs: [
      { name: "SEC Regulation D (Rule 506b / 506c)", url: "https://sec.gov/smallbusiness/exemptofferings/rulesbusiness" },
      { name: "SEC Regulation CF (Crowdfunding)", url: "https://sec.gov/smallbusiness/exemptofferings/regcrowdfunding" },
      { name: "SEC Regulation A+", url: "https://sec.gov/smallbusiness/exemptofferings/rega" },
      { name: "JOBS Act — Accredited Investor Definition", url: "https://sec.gov/education/capitalraising/building-blocks/accredited-investor" },
    ],
  },
  "ir-worker": { rulesetFile: "ir_compliance_v0.json", legalRefs: [] },
};

const RULESETS_DIR = path.join(__dirname, "../../raas/rulesets");

async function buildSystemDocs(workerId) {
  const cfg = WORKER_SYSTEM_DOCS[workerId];
  if (!cfg) return [];
  const docs = [];
  // 1. Live constraintRaasModules content (preferred — same source actually
  // injected into the model's prompt, so panel display can never drift from
  // real enforcement). Falls back to the legacy static-file ruleset only if
  // no moduleId is configured for this worker yet.
  if (cfg.moduleId) {
    try {
      const constraintModules = require("../raas/constraintModules");
      const composed = await constraintModules.composePromptText(cfg.moduleId, { maxTokens: 4000 });
      if (composed.text) {
        docs.push({
          id: `__raas__${cfg.moduleId}`,
          name: `RAAS Rules — ${cfg.moduleId} (v${composed.version})`,
          type: "system",
          readOnly: true,
          charCount: composed.text.length,
          createdAt: null,
          text: composed.text,
        });
      }
    } catch (e) {
      console.warn(`[tenantLocker] failed to load constraintRaasModule ${cfg.moduleId} for ${workerId}:`, e.message);
    }
  } else {
    // Legacy path — static JSON ruleset file on disk.
    try {
      const raw = fs.readFileSync(path.join(RULESETS_DIR, cfg.rulesetFile), "utf-8");
      const ruleset = JSON.parse(raw);
      const lines = [`RAAS RULESET — ${ruleset.id || workerId}\n`];
      if (ruleset.hard_stops?.length) {
        lines.push("HARD STOPS (never violate):");
        ruleset.hard_stops.forEach(h => lines.push(`  • ${h.logic || h.id}`));
      }
      if (ruleset.soft_flags?.length) {
        lines.push("\nSOFT FLAGS (flag for review):");
        ruleset.soft_flags.forEach(s => lines.push(`  • ${s.logic || s.id}`));
      }
      if (ruleset.chat_rules?.length) {
        lines.push("\nCHAT RULES:");
        ruleset.chat_rules.forEach(c => lines.push(`  • ${c.message || c.id}`));
      }
      if (ruleset.outputs?.length) {
        lines.push(`\nAPPROVED OUTPUTS: ${ruleset.outputs.join(", ")}`);
      }
      const text = lines.join("\n");
      docs.push({
        id: `__raas__${cfg.rulesetFile}`,
        name: `RAAS Rules — ${ruleset.domain || workerId}`,
        type: "system",
        readOnly: true,
        charCount: text.length,
        createdAt: null,
        text,
      });
    } catch (_) { /* ruleset file missing — skip */ }
  }
  // 2. Legal references as a system doc
  if (cfg.legalRefs?.length) {
    const refText = `LEGAL & REGULATORY REFERENCES\n\n` + cfg.legalRefs.map(r => `• ${r.name}\n  ${r.url}`).join("\n\n");
    docs.push({
      id: `__legal__${workerId}`,
      name: "Legal & Regulatory References",
      type: "system",
      readOnly: true,
      charCount: refText.length,
      createdAt: null,
      text: refText,
    });
  }
  return docs;
}

function db() { return admin.firestore(); }

// Per-document cap: one doc can be up to 500k chars (full CFR part, full POH/AFM).
const MAX_CHARS_PER_DOC = 500000;
// Total injection cap: sum of all locker docs injected into a single chat prompt.
// Claude's context is 200k tokens (~800k chars); leave ~200k chars for conversation
// + system prompt + tools. Aviation workers need CFRs + POH + ops specs simultaneously.
const MAX_CHARS_INJECTION = 600000;

function lockerCol(tenantId, workerId) {
  return db()
    .collection("tenantLockers").doc(tenantId)
    .collection("workers").doc(workerId)
    .collection("documents");
}

function clamp(text) {
  if (!text || text.length <= MAX_CHARS_PER_DOC) return text || "";
  return text.substring(0, MAX_CHARS_PER_DOC) + "\n... [truncated — upload full doc in sections if needed]";
}

async function parsePdf(buffer) {
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(buffer);
  return (result.text || "").trim();
}

async function parseDocx(buffer) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || "").trim();
}

function parseText(buffer) {
  return buffer.toString("utf-8").trim();
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleLockerList(req, res, user) {
  const tenantId = req.headers["x-tenant-id"] || req.body?.tenantId;
  const workerId = req.query?.workerId || req.body?.workerId;
  if (!tenantId) return res.json({ ok: false, error: "Missing tenantId" });
  if (!workerId) return res.json({ ok: false, error: "Missing workerId" });

  const snap = await lockerCol(tenantId, workerId)
    .orderBy("createdAt", "desc")
    .get();

  const documents = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.deletedAt != null) return; // skip soft-deleted docs
    documents.push({
      id: d.id,
      name: data.name,
      type: data.type,
      charCount: data.charCount,
      createdAt: data.createdAt?.toMillis?.() || null,
    });
  });

  // Append read-only system docs (RAAS rulesets + legal refs) for Back of House workers
  const systemDocs = await buildSystemDocs(workerId);
  for (const sd of systemDocs) {
    documents.push({
      id: sd.id,
      name: sd.name,
      type: sd.type,
      charCount: sd.charCount,
      createdAt: sd.createdAt,
      readOnly: true,
    });
  }

  return res.json({ ok: true, documents });
}

async function handleLockerIngest(req, res, user) {
  const tenantId = req.headers["x-tenant-id"] || req.body?.tenantId;
  const { workerId, name, text, base64, fileName, type } = req.body || {};
  if (!tenantId) return res.json({ ok: false, error: "Missing tenantId" });
  if (!workerId) return res.json({ ok: false, error: "Missing workerId" });

  let extractedText = "";
  let docType = type || "paste";
  let docName = name || "Pasted note";

  if (base64 && fileName) {
    // File upload path
    docType = "upload";
    docName = fileName;
    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return res.json({ ok: false, error: "Invalid base64" });
    }
    const lower = String(fileName).toLowerCase();
    try {
      if (lower.endsWith(".pdf")) {
        extractedText = await parsePdf(buffer);
      } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
        extractedText = await parseDocx(buffer);
      } else {
        extractedText = parseText(buffer);
      }
    } catch (e) {
      return res.json({ ok: false, error: `Could not extract text: ${e.message}` });
    }
    if (!extractedText.trim()) return res.json({ ok: false, error: "No text could be extracted from this file" });
  } else if (text) {
    extractedText = text;
  } else {
    return res.json({ ok: false, error: "Provide either text or base64+fileName" });
  }

  const clamped = clamp(extractedText);
  const docRef = lockerCol(tenantId, workerId).doc();
  await docRef.set({
    name: docName,
    text: clamped,
    type: docType,
    charCount: clamped.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: null,
    createdBy: user?.uid || null,
  });

  return res.json({ ok: true, docId: docRef.id });
}

async function handleLockerDelete(req, res, user) {
  const tenantId = req.headers["x-tenant-id"] || req.body?.tenantId;
  const { workerId, docId } = req.body || {};
  if (!tenantId || !workerId || !docId) return res.json({ ok: false, error: "Missing tenantId, workerId, or docId" });

  await lockerCol(tenantId, workerId).doc(docId).update({
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true });
}

/**
 * Read all tenant locker docs for a given tenant + worker.
 * Returns concatenated text, capped at MAX_CHARS total.
 * Used internally by the worker chat handler.
 */
async function getLockerContext(tenantId, workerId) {
  if (!tenantId || !workerId) return null;
  try {
    const parts = [];
    let total = 0;

    // Inject RAAS system docs first so they anchor the context
    const systemDocs = await buildSystemDocs(workerId);
    for (const sd of systemDocs) {
      if (sd.text && total < MAX_CHARS_INJECTION) {
        const chunk = `## ${sd.name}\n${sd.text}`;
        parts.push(chunk);
        total += chunk.length;
      }
    }

    const snap = await lockerCol(tenantId, workerId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "asc")
      .get();
    snap.forEach(d => {
      const text = d.data().text || "";
      if (text && total < MAX_CHARS_INJECTION) {
        const name = d.data().name || "Document";
        const chunk = `## ${name}\n${text}`;
        parts.push(chunk);
        total += chunk.length;
      }
    });
    return parts.length ? parts.join("\n\n") : null;
  } catch {
    return null;
  }
}

module.exports = { handleLockerList, handleLockerIngest, handleLockerDelete, getLockerContext };
