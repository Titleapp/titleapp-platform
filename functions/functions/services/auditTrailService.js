/**
 * auditTrailService.js — Blockchain audit trail fee tracking
 *
 * Every worker execution generates one immutable compliance record.
 * Users are charged $0.005 per record. Gas cost is ~$0.001 (simulated
 * in Phase 1, real Venly/Polygon in Phase 2).
 *
 * This is patented platform IP — surface it as a premium product, not overhead.
 */

"use strict";

const crypto = require("crypto");
const admin = require("firebase-admin");
const { auditTrailFeePerRecord, auditTrailGasCostAlert } = require("../config/pricing");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

async function sendAlert(to, subject, body) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — alert skipped:", subject);
    return;
  }
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alerts@titleapp.ai", name: "TitleApp Alerts" },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });
}

/**
 * Write an audit record for a worker execution.
 *
 * Phase 1: Simulated blockchain (SHA-256 hash chain, mock gas cost).
 * Phase 2: Venly API → Polygon on-chain write.
 *
 * @param {object} executionData — { worker_id, user_id, org_id, event_id, execution_type, timestamp }
 * @returns {{ txHash: string, gasCost: number, fee: number }}
 */
async function writeAuditRecord(executionData) {
  const db = getDb();

  // ── Compute deterministic hash of execution data ─────────────
  const payload = JSON.stringify({
    event_id: executionData.event_id,
    worker_id: executionData.worker_id,
    user_id: executionData.user_id,
    execution_type: executionData.execution_type,
    timestamp: executionData.timestamp || new Date().toISOString(),
  });
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  const txHash = "0x" + hash;

  // Phase 1: Simulated gas cost (~$0.001 per record on Polygon)
  const gasCost = 0.001;

  // ── Write to auditRecords collection (append-only) ───────────
  await db.collection("auditRecords").add({
    event_id: executionData.event_id,
    worker_id: executionData.worker_id,
    user_id: executionData.user_id,
    org_id: executionData.org_id || null,
    execution_type: executionData.execution_type,
    txHash,
    chain: "polygon",
    gas_cost_actual: gasCost,
    fee_charged: auditTrailFeePerRecord,
    net_margin: auditTrailFeePerRecord - gasCost,
    _mintMethod: "stub",
    _written_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ── Alert if gas cost is approaching the fee threshold ───────
  if (gasCost >= auditTrailGasCostAlert) {
    await sendAlert(
      "kent@titleapp.ai",
      `[TitleApp] Gas cost alert: $${gasCost} per record`,
      `Gas cost $${gasCost} has reached the alert threshold of $${auditTrailGasCostAlert}.\n\nCurrent audit trail fee: $${auditTrailFeePerRecord}/record.\nNet margin: $${(auditTrailFeePerRecord - gasCost).toFixed(4)}/record.\n\nReview audit trail pricing in config/pricing.js.`
    );
  }

  return {
    txHash,
    gasCost,
    fee: auditTrailFeePerRecord,
  };
}

/**
 * Apply audit trail fee to a usage event document.
 *
 * @param {FirebaseFirestore.DocumentReference} usageEventRef
 * @param {{ txHash: string, gasCost: number, fee: number }} auditResult
 */
async function recordAuditFee(usageEventRef, auditResult) {
  await usageEventRef.update({
    audit_record_written: true,
    audit_fee_charged: auditResult.fee,
    blockchain_tx_hash: auditResult.txHash,
    gas_cost_actual: auditResult.gasCost,
    revenue_line_3: auditResult.fee - auditResult.gasCost,
  });
}

module.exports = { writeAuditRecord, recordAuditFee };
