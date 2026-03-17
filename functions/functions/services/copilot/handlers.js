"use strict";

/**
 * handlers.js — 11 route handlers for PC12-47E CoPilot
 *
 * All handlers receive (req, res, { db, auth, userId }) from the route wiring.
 * Firestore collections:
 *   logbooks/{userId}/entries/{id}
 *   logbooks/{userId}/groundTraining/{id}
 *   logbooks/{userId}/endorsements/{id}
 *   dutyPeriods/{userId}/{id}
 *   vaultDocs/{userId}/private/{id}
 *   copilotProfiles/{userId}
 */

const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

// ============================================================
// 1. uploadDoc — Upload operator doc, extract text, store
// ============================================================
async function handleUploadDoc(req, res, { userId }) {
  const db = getDb();
  const { fileName, mimeType, fileData, docType } = req.body || {};

  if (!fileData) return res.status(400).json({ ok: false, error: "fileData required (base64)" });
  if (!docType) return res.status(400).json({ ok: false, error: "docType required (gom/sop/mmel/oph/afm)" });

  const buffer = Buffer.from(fileData, "base64");
  let extractedText = "";

  // Extract text from PDF
  if (mimeType === "application/pdf" || (fileName && fileName.endsWith(".pdf"))) {
    try {
      const pdfParse = require("pdf-parse");
      const result = await pdfParse(buffer);
      extractedText = result.text || "";
    } catch (e) {
      console.error("PDF parse failed:", e.message);
    }
  } else {
    extractedText = buffer.toString("utf8");
  }

  const docRef = db.collection("vaultDocs").doc(userId).collection("private").doc();
  await docRef.set({
    type: docType,
    fileName: fileName || "unknown",
    mimeType: mimeType || "application/octet-stream",
    extractedText,
    textLength: extractedText.length,
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    userId,
  });

  return res.json({
    ok: true,
    docId: docRef.id,
    type: docType,
    fileName,
    textLength: extractedText.length,
  });
}

// ============================================================
// 2. uploadLogbook — Parse ForeFlight CSV, deduplicate, write
// ============================================================
async function handleUploadLogbook(req, res, { userId }) {
  const db = getDb();
  const { fileData } = req.body || {};

  if (!fileData) return res.status(400).json({ ok: false, error: "fileData required (base64 CSV)" });

  const csvBuffer = Buffer.from(fileData, "base64");
  const { parseForeFlight } = require("./parsers/foreflightParser");
  const newEntries = parseForeFlight(csvBuffer);

  if (newEntries.length === 0) {
    return res.json({ ok: true, imported: 0, message: "No valid entries found in CSV" });
  }

  // Load existing entries for deduplication
  const existingSnap = await db.collection("logbooks").doc(userId)
    .collection("entries").get();
  const existing = existingSnap.docs.map(d => ({ _firestoreId: d.id, ...d.data() }));

  const { deduplicateEntries } = require("./parsers/deduplicator");
  const { toWrite, duplicates, conflicts, merged } = deduplicateEntries(newEntries, existing);

  // Write new entries
  const batch = db.batch();
  for (const entry of toWrite) {
    const ref = db.collection("logbooks").doc(userId).collection("entries").doc();
    batch.set(ref, { ...entry, userId, importedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  // Write merged entries (update existing)
  for (const m of merged) {
    if (m.existingId) {
      const ref = db.collection("logbooks").doc(userId).collection("entries").doc(m.existingId);
      batch.update(ref, { ...m.entry, mergedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }

  await batch.commit();

  return res.json({
    ok: true,
    imported: toWrite.length,
    merged: merged.length,
    duplicatesSkipped: duplicates.length,
    conflicts: conflicts.length,
    totalParsed: newEntries.length,
    conflictDetails: conflicts.length > 0 ? conflicts : undefined,
  });
}

// ============================================================
// 3. uploadFVO — Parse FVO report, write logbook + duty periods
// ============================================================
async function handleUploadFVO(req, res, { userId }) {
  const db = getDb();
  const { fileData, mimeType } = req.body || {};

  if (!fileData) return res.status(400).json({ ok: false, error: "fileData required (base64)" });

  const buffer = Buffer.from(fileData, "base64");
  const { parseFVO } = require("./parsers/fvoParser");
  const { entries: newEntries, dutyPeriods, parseConfidence } = await parseFVO(buffer, mimeType);

  // Deduplicate logbook entries
  const existingSnap = await db.collection("logbooks").doc(userId)
    .collection("entries").get();
  const existing = existingSnap.docs.map(d => ({ _firestoreId: d.id, ...d.data() }));

  const { deduplicateEntries } = require("./parsers/deduplicator");
  const { toWrite, duplicates, conflicts, merged } = deduplicateEntries(newEntries, existing);

  const batch = db.batch();

  // Write new logbook entries
  for (const entry of toWrite) {
    const ref = db.collection("logbooks").doc(userId).collection("entries").doc();
    batch.set(ref, { ...entry, userId, importedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  // Write merged entries
  for (const m of merged) {
    if (m.existingId) {
      const ref = db.collection("logbooks").doc(userId).collection("entries").doc(m.existingId);
      batch.update(ref, { ...m.entry, mergedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }

  // Write duty periods
  for (const dp of dutyPeriods) {
    const ref = db.collection("dutyPeriods").doc(userId).collection("periods").doc();
    batch.set(ref, { ...dp, userId, importedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  await batch.commit();

  return res.json({
    ok: true,
    logbookImported: toWrite.length,
    logbookMerged: merged.length,
    logbookDuplicates: duplicates.length,
    dutyPeriodsImported: dutyPeriods.length,
    parseConfidence,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  });
}

// ============================================================
// 4. addLogEntry — Manual single logbook entry
// ============================================================
async function handleAddLogEntry(req, res, { userId }) {
  const db = getDb();
  const entry = req.body || {};

  if (!entry.date) return res.status(400).json({ ok: false, error: "date required" });
  if (!entry.totalTime && entry.totalTime !== 0) {
    return res.status(400).json({ ok: false, error: "totalTime required" });
  }

  const doc = {
    date: entry.date,
    aircraft: entry.aircraft || "PC12",
    tailNumber: entry.tailNumber || "",
    aircraftCategory: entry.aircraftCategory || "airplane",
    aircraftClass: entry.aircraftClass || "multi-engine land",
    departure: entry.departure || "",
    destination: entry.destination || "",
    route: entry.route || `${entry.departure || ""}-${entry.destination || ""}`,
    totalTime: Number(entry.totalTime) || 0,
    picTime: Number(entry.picTime) || 0,
    sicTime: Number(entry.sicTime) || 0,
    dualReceived: Number(entry.dualReceived) || 0,
    dualGiven: Number(entry.dualGiven) || 0,
    nightTime: Number(entry.nightTime) || 0,
    actualInstrument: Number(entry.actualInstrument) || 0,
    simulatedInstrument: Number(entry.simulatedInstrument) || 0,
    crossCountry: Number(entry.crossCountry) || 0,
    landingsDay: Number(entry.landingsDay) || 0,
    landingsNight: Number(entry.landingsNight) || 0,
    approachCount: Number(entry.approachCount) || 0,
    approachTypes: entry.approachTypes || [],
    holds: Number(entry.holds) || 0,
    turbineTime: Number(entry.turbineTime) || Number(entry.totalTime) || 0,
    complexTime: Number(entry.complexTime) || Number(entry.totalTime) || 0,
    highPerformanceTime: Number(entry.highPerformanceTime) || Number(entry.totalTime) || 0,
    remarks: entry.remarks || "",
    source: "manual",
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = db.collection("logbooks").doc(userId).collection("entries").doc();
  await ref.set(doc);

  return res.json({ ok: true, entryId: ref.id });
}

// ============================================================
// 5. addGroundTraining — Ground training record
// ============================================================
async function handleAddGroundTraining(req, res, { userId }) {
  const db = getDb();
  const gt = req.body || {};

  if (!gt.date || !gt.type) {
    return res.status(400).json({ ok: false, error: "date and type required" });
  }

  const doc = {
    date: gt.date,
    type: gt.type,
    subject: gt.subject || "",
    hours: Number(gt.hours) || 0,
    instructorName: gt.instructorName || "",
    instructorCertNumber: gt.instructorCertNumber || "",
    signatureStatus: "placeholder",
    applicableTo: gt.applicableTo || "PC-12/47E",
    courseProvider: gt.courseProvider || "",
    remarks: gt.remarks || "",
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = db.collection("logbooks").doc(userId).collection("groundTraining").doc();
  await ref.set(doc);

  return res.json({ ok: true, trainingId: ref.id });
}

// ============================================================
// 6. addEndorsement — AC 61-65 format endorsement
// ============================================================
async function handleAddEndorsement(req, res, { userId }) {
  const db = getDb();
  const end = req.body || {};

  if (!end.date || !end.type) {
    return res.status(400).json({ ok: false, error: "date and type required" });
  }

  const doc = {
    date: end.date,
    type: end.type,
    endorsementText: end.endorsementText || "",
    instructorName: end.instructorName || "",
    instructorCertNumber: end.instructorCertNumber || "",
    signatureStatus: "placeholder",
    applicableTo: end.applicableTo || "PC-12/47E",
    remarks: end.remarks || "",
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = db.collection("logbooks").doc(userId).collection("endorsements").doc();
  await ref.set(doc);

  return res.json({ ok: true, endorsementId: ref.id });
}

// ============================================================
// 7. status — Profile + doc status + overall readiness
// ============================================================
async function handleStatus(req, res, { userId }) {
  const db = getDb();

  // Load profile
  const profileSnap = await db.collection("copilotProfiles").doc(userId).get();
  const profile = profileSnap.exists ? profileSnap.data() : null;

  // Count docs
  const docsSnap = await db.collection("vaultDocs").doc(userId)
    .collection("private").get();
  const docsByType = {};
  docsSnap.docs.forEach(d => {
    const t = d.data().type || "other";
    docsByType[t] = (docsByType[t] || 0) + 1;
  });

  // Count logbook entries
  const entriesSnap = await db.collection("logbooks").doc(userId)
    .collection("entries").count().get();
  const entryCount = entriesSnap.data().count;

  // Count ground training
  const gtSnap = await db.collection("logbooks").doc(userId)
    .collection("groundTraining").count().get();
  const gtCount = gtSnap.data().count;

  // Count endorsements
  const endSnap = await db.collection("logbooks").doc(userId)
    .collection("endorsements").count().get();
  const endCount = endSnap.data().count;

  // Readiness checklist
  const readiness = {
    profileComplete: !!profile && !!profile.medicalExpiry && !!profile.certificateNumber,
    hasLogbookEntries: entryCount > 0,
    hasGroundTraining: gtCount > 0,
    hasOperatorDocs: docsSnap.size > 0,
    docTypes: docsByType,
  };

  return res.json({
    ok: true,
    profile: profile || {},
    counts: {
      logbookEntries: entryCount,
      groundTraining: gtCount,
      endorsements: endCount,
      vaultDocs: docsSnap.size,
    },
    readiness,
  });
}

// ============================================================
// 8. currency — 7 currency windows
// ============================================================
async function handleCurrency(req, res, { userId }) {
  const db = getDb();

  const profileSnap = await db.collection("copilotProfiles").doc(userId).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};

  const entriesSnap = await db.collection("logbooks").doc(userId)
    .collection("entries").get();
  const entries = entriesSnap.docs.map(d => d.data());

  const gtSnap = await db.collection("logbooks").doc(userId)
    .collection("groundTraining").get();
  const groundTraining = gtSnap.docs.map(d => d.data());

  const { computeCurrency } = require("./logic/currencyTracker");
  const currency = computeCurrency(profile, entries, groundTraining);

  const goCount = currency.filter(c => c.status === "GO").length;
  const noGoCount = currency.filter(c => c.status === "NO_GO").length;

  return res.json({
    ok: true,
    currency,
    summary: {
      go: goCount,
      noGo: noGoCount,
      expiring: currency.filter(c => c.status === "EXPIRING").length,
      overall: noGoCount === 0 ? "GO" : "NO_GO",
    },
  });
}

// ============================================================
// 9. generate8710 — Aggregate logbook → 8710-1 PDF
// ============================================================
async function handleGenerate8710(req, res, { userId }) {
  const db = getDb();

  const profileSnap = await db.collection("copilotProfiles").doc(userId).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};

  const entriesSnap = await db.collection("logbooks").doc(userId)
    .collection("entries").get();
  const entries = entriesSnap.docs.map(d => d.data());

  const { build8710 } = require("./logic/form8710Builder");
  const data = build8710(profile, entries);

  // Check if PDF requested
  const format = (req.query && req.query.format) || "json";

  if (format === "pdf") {
    const { generate8710PDF } = require("./generators/form8710Generator");
    const pdfBuffer = await generate8710PDF(data);

    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="8710-1_${new Date().toISOString().substring(0, 10)}.pdf"`);
    return res.send(pdfBuffer);
  }

  return res.json({ ok: true, form8710: data });
}

// ============================================================
// 10. dutyEvent — Record duty-on/off, block-out/in
// ============================================================
async function handleDutyEvent(req, res, { userId }) {
  const db = getDb();
  const { eventType, timestamp, departure, destination, remarks } = req.body || {};

  if (!eventType) {
    return res.status(400).json({ ok: false, error: "eventType required (duty_on/duty_off/block_out/block_in)" });
  }

  // Find current open duty period
  const openSnap = await db.collection("dutyPeriods").doc(userId)
    .collection("periods")
    .where("dutyEndZulu", "==", null)
    .limit(1)
    .get();

  const currentDoc = openSnap.empty ? null : { _id: openSnap.docs[0].id, ...openSnap.docs[0].data() };

  const { processDutyEvent } = require("./logic/dutyTimeTracker");

  let updatedDoc;
  try {
    updatedDoc = processDutyEvent(eventType, { timestamp, departure, destination, remarks }, currentDoc);
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }

  if (eventType === "duty_on") {
    // Create new duty period
    const ref = db.collection("dutyPeriods").doc(userId).collection("periods").doc();
    await ref.set({ ...updatedDoc, userId });
    return res.json({ ok: true, dutyPeriodId: ref.id, event: eventType });
  } else {
    // Update existing
    const ref = db.collection("dutyPeriods").doc(userId).collection("periods").doc(currentDoc._id);
    const { _id, ...writeData } = updatedDoc;
    await ref.update(writeData);
    return res.json({ ok: true, dutyPeriodId: currentDoc._id, event: eventType });
  }
}

// ============================================================
// 11. chat — 5-layer prompt + Claude, examiner mode detection
// ============================================================
async function handleChat(req, res, { userId }) {
  const db = getDb();
  const { message, conversationHistory, examinerMode: forceExaminer } = req.body || {};

  if (!message) return res.status(400).json({ ok: false, error: "message required" });

  // Load context for prompt layers
  const [profileSnap, entriesSnap, gtSnap, docsSnap, dutySnap] = await Promise.all([
    db.collection("copilotProfiles").doc(userId).get(),
    db.collection("logbooks").doc(userId).collection("entries").get(),
    db.collection("logbooks").doc(userId).collection("groundTraining").get(),
    db.collection("vaultDocs").doc(userId).collection("private").get(),
    db.collection("dutyPeriods").doc(userId).collection("periods")
      .where("dutyEndZulu", "==", null).limit(1).get(),
  ]);

  const profile = profileSnap.exists ? profileSnap.data() : {};
  const entries = entriesSnap.docs.map(d => d.data());
  const groundTraining = gtSnap.docs.map(d => d.data());
  const vaultDocs = docsSnap.docs.map(d => d.data());
  const activeDuty = dutySnap.empty ? null : dutySnap.docs[0].data();

  // Compute currency and duty for prompt injection
  const { computeCurrency } = require("./logic/currencyTracker");
  const currency = computeCurrency(profile, entries, groundTraining);

  const { computeDutyStatus } = require("./logic/dutyTimeTracker");
  const dutyPeriodSnap = await db.collection("dutyPeriods").doc(userId)
    .collection("periods").orderBy("dutyStartZulu", "desc").limit(50).get();
  const dutyPeriods = dutyPeriodSnap.docs.map(d => d.data());
  const dutyStatus = computeDutyStatus(dutyPeriods, entries, activeDuty);

  // Check examiner mode
  const { shouldActivateExaminer, detectCheckType } = require("./prompts/examinerMode");
  const isExaminer = forceExaminer || shouldActivateExaminer(message);
  const checkType = isExaminer ? detectCheckType(message) : null;

  // Build system prompt
  const { buildSystemPrompt } = require("./prompts/pc12SystemPrompt");
  const systemPrompt = buildSystemPrompt({
    currency,
    dutyStatus,
    profile,
    vaultDocs,
    examinerMode: isExaminer,
    checkType,
  });

  // Build conversation messages
  const messages = [];
  if (conversationHistory && Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory.slice(-20)) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: "user", content: message });

  // Call Claude
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const assistantMessage = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  return res.json({
    ok: true,
    message: assistantMessage,
    examinerMode: isExaminer,
    checkType,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  });
}

module.exports = {
  handleUploadDoc,
  handleUploadLogbook,
  handleUploadFVO,
  handleAddLogEntry,
  handleAddGroundTraining,
  handleAddEndorsement,
  handleStatus,
  handleCurrency,
  handleGenerate8710,
  handleDutyEvent,
  handleChat,
};
