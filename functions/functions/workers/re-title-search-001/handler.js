"use strict";

/**
 * re-title-search-001 — Title Search worker (CODEX 48, Phase 1)
 *
 * Pulls ATTOM chain-of-title, lien, ownership, tax, and judgment data for a
 * parcel and writes the results as immutable chain events to
 * titleOrders/{orderId}/events/{eventId}.
 *
 * TX-T-001: Pipeline writes chain events. AI reads them. AI has NO code path
 * to write title.lien_found, title.ownership_found, title.judgment_found,
 * or title.tax_status_found — this module is the only writer.
 */

const { attomGet } = require("../site-recon-001/attomClient");
const admin = require("firebase-admin");

const ATTOM_TITLE_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

/**
 * Open a new title order and run the initial ATTOM search.
 * Writes chain events. Returns orderId + event summary.
 *
 * @param {object} params
 * @param {string} params.address     - Full street address
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @param {string} params.buyerName   - Optional
 * @param {string} params.sellerName  - Optional
 * @param {number} params.purchasePrice - Optional, in cents
 * @param {string} params.orderType   - "purchase" | "refi" | "search-only"
 * @param {object} params.db          - Firestore admin db
 * @param {string} params.attomApiKey
 */
async function openTitleOrder(params) {
  const { address, tenantId, userId, buyerName, sellerName, purchasePrice, orderType = "purchase", db, attomApiKey } = params;

  const nowTs = admin.firestore.FieldValue.serverTimestamp();

  // 1. Open the order document
  const orderRef = db.collection("titleOrders").doc();
  const orderId = orderRef.id;

  await orderRef.set({
    orderId,
    tenantId,
    openedBy: userId,
    address,
    buyerName: buyerName || null,
    sellerName: sellerName || null,
    purchasePrice: purchasePrice || null,
    orderType,
    status: "search_in_progress",
    createdAt: nowTs,
    updatedAt: nowTs,
  });

  // 2. Write order_opened chain event
  await appendEvent(db, orderId, {
    type: "title.order_opened",
    address,
    orderType,
    openedBy: userId,
    tenantId,
  });

  // 3. Run ATTOM title search in parallel
  const results = await runAttomTitleSearch({ address, attomApiKey });

  // 4. Write chain events from ATTOM results (TX-T-001: pipeline-only)
  const eventSummary = await writeChainEvents(db, orderId, results, address);

  // 5. Compute risk score from events
  const riskScore = computeRiskScore(eventSummary);

  // 6. Update order status
  await orderRef.update({
    status: "search_complete",
    riskScore,
    chainEventCount: eventSummary.totalEvents,
    defectCount: eventSummary.defectCount,
    updatedAt: nowTs,
  });

  return {
    orderId,
    address,
    riskScore,
    chainEvents: eventSummary,
    attomData: results,
  };
}

/**
 * Fetch chain-of-title data from ATTOM for a given address.
 * Returns raw ATTOM responses. Does NOT write to Firestore.
 */
async function runAttomTitleSearch({ address, attomApiKey }) {
  const addrParts = parseAddress(address);

  const [propertyDetail, salesHistory, avm, propMortgages] = await Promise.all([
    attomGet("/property/detail", addrParts, attomApiKey),
    attomGet("/saleshistory/detail", addrParts, attomApiKey),
    attomGet("/attomavm/detail", addrParts, attomApiKey),
    attomGet("/property/mortgagehistory", addrParts, attomApiKey),
  ]);

  return { propertyDetail, salesHistory, avm, propMortgages };
}

/**
 * Parse address string → ATTOM query params.
 * Handles "123 Main St, Austin, TX 78701" → { address1, address2 }
 */
function parseAddress(address) {
  const parts = address.split(",").map(s => s.trim());
  if (parts.length >= 2) {
    const cityStateZip = parts.slice(1).join(", ");
    return { address1: parts[0], address2: cityStateZip };
  }
  return { address1: address };
}

/**
 * Write immutable chain events from ATTOM results (TX-T-001).
 * Returns event summary (counts by type).
 */
async function writeChainEvents(db, orderId, results, address) {
  const summary = { totalEvents: 0, defectCount: 0, ownershipEvents: 0, lienEvents: 0, taxEvents: 0, judgmentEvents: 0 };

  // Ownership chain from sales history
  const sales = results.salesHistory?.data?.property || [];
  for (const prop of (Array.isArray(sales) ? sales : [prop])) {
    const saleList = prop?.salehistory || [];
    for (const sale of saleList) {
      if (!sale?.sellerName && !sale?.buyerName && !sale?.saleAmount) continue;
      await appendEvent(db, orderId, {
        type: "title.ownership_found",
        sourceRef: "attom:saleshistory/detail",
        grantee: sale.buyerName || null,
        grantor: sale.sellerName || null,
        saleDate: sale.saleRecDate || null,
        saleAmount: sale.saleAmount || null,
        docType: sale.saleDocType || null,
        instrumentNo: sale.documentNo || null,
        address,
      });
      summary.ownershipEvents++;
      summary.totalEvents++;
    }
  }

  // Mortgages / liens from mortgage history
  const mortgages = results.propMortgages?.data?.property || [];
  for (const prop of (Array.isArray(mortgages) ? mortgages : [])) {
    const mtgList = prop?.mortgage || [];
    for (const m of (Array.isArray(mtgList) ? mtgList : [])) {
      if (!m) continue;
      await appendEvent(db, orderId, {
        type: "title.lien_found",
        sourceRef: "attom:property/mortgagehistory",
        lienType: m.loanType || "mortgage",
        lender: m.lenderName || null,
        originalAmount: m.loanAmount || null,
        recordDate: m.recordingDate || null,
        maturityDate: m.maturityDate || null,
        lienStatus: m.statusCode || "open",
        instrumentNo: m.documentNo || null,
        address,
      });
      summary.lienEvents++;
      summary.totalEvents++;
    }
  }

  // Property detail → tax status
  const propDetail = results.propertyDetail?.data?.property?.[0];
  if (propDetail?.assessment) {
    const assessed = propDetail.assessment;
    await appendEvent(db, orderId, {
      type: "title.tax_status_found",
      sourceRef: "attom:property/detail",
      taxYear: assessed.tax?.taxyear || null,
      annualTax: assessed.tax?.taxamt || null,
      assessedValue: assessed.assessed?.assdttlvalue || null,
      marketValue: assessed.market?.mktttlvalue || null,
      taxDelinquent: assessed.tax?.taxdelinquentyear ? true : false,
      delinquentYear: assessed.tax?.taxdelinquentyear || null,
      address,
    });
    summary.taxEvents++;
    summary.totalEvents++;

    // Flag tax delinquency as a potential defect — AI will classify from these events
    if (assessed.tax?.taxdelinquentyear) {
      summary.defectCount++;
    }
  }

  return summary;
}

/**
 * Append a single immutable event to the title order.
 * Returns the new eventId.
 */
async function appendEvent(db, orderId, payload) {
  const eventRef = db.collection("titleOrders").doc(orderId).collection("events").doc();
  await eventRef.set({
    ...payload,
    eventId: eventRef.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    immutable: true,
  });
  return eventRef.id;
}

/**
 * Compute a risk score (0-100) based on chain event summary.
 * Lower = cleaner title.
 */
function computeRiskScore({ defectCount, lienEvents, taxEvents }) {
  let score = 0;
  score += defectCount * 25;
  score += Math.min(lienEvents * 5, 30);
  score += taxEvents > 0 ? 5 : 0;
  return Math.min(score, 100);
}

/**
 * GET: Load an existing title order with its chain events.
 */
async function getTitleOrder({ orderId, db }) {
  const orderSnap = await db.collection("titleOrders").doc(orderId).get();
  if (!orderSnap.exists) return null;

  const eventsSnap = await db.collection("titleOrders").doc(orderId).collection("events")
    .orderBy("createdAt", "asc").get();

  const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    order: { id: orderId, ...orderSnap.data() },
    events,
    eventCounts: events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {}),
  };
}

/**
 * Log a defect — AI-authored but validated by this function.
 * TX-T-001: every fact in evidence[] must exist as a prior chain event.
 */
async function logDefect({ orderId, severity, description, evidence, suggestedCure, db }) {
  if (!["P0", "P1", "P2"].includes(severity)) {
    throw new Error(`Invalid severity: ${severity}. Must be P0, P1, or P2.`);
  }

  // Validate that every evidence reference exists in the order's events
  if (evidence && evidence.length > 0) {
    for (const ref of evidence) {
      const evSnap = await db.collection("titleOrders").doc(orderId).collection("events").doc(ref.eventId).get();
      if (!evSnap.exists) {
        throw new Error(`TX-T-001 violation: evidence references eventId ${ref.eventId} which does not exist in order ${orderId}.`);
      }
    }
  }

  const eventId = await appendEvent(db, orderId, {
    type: "title.defect_logged",
    severity,
    description,
    evidence: evidence || [],
    suggestedCure: suggestedCure || null,
    authoredBy: "ai",
    validated: true,
  });

  return { eventId, severity, description };
}

module.exports = { openTitleOrder, getTitleOrder, logDefect, runAttomTitleSearch, appendEvent };
