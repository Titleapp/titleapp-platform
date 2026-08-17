"use strict";

/**
 * priorityReportJob.js — CODEX S52.50
 *
 * Weekly DPP priority report + per-supplier data-request drafting.
 * Built to fix the specific failure diagnosed live: asking one chat turn
 * for a report + an Excel template + N supplier emails at once is too
 * much for a single non-agentic turn. This job does the same work as a
 * sequence of small, separate steps instead of one big prompt.
 *
 * Collections:
 *   dppPriorityReports/{reportId}          — one per tenant per run
 *   dppPendingSupplierRequests/{requestId} — one per drafted email, review
 *                                            queue for Elise (or any tenant
 *                                            admin) before anything sends
 *
 * Cluster ownership model (new — did not exist before this spec):
 * dppSuppliers gains `email`, `role` ("supplier" | "assessor"), and
 * `clusters` (which cluster numbers this contact is responsible for,
 * tenant-wide). This is coarser than a per-product mapping but matches
 * the real demo narrative (one assessor handles Cluster 3 LCA across all
 * of a tenant's SKUs; one supplier handles Clusters 4-5 across theirs).
 */

const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const { generateDocument } = require("../../documents");

function getDb() { return admin.firestore(); }
function getAnthropic() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

// Fallback names only — real product docs carry each cluster's actual name
// (`clusters.cN.name`) already, which missingClustersFor() reads directly.
// This map is only used if a product is missing that field.
const CLUSTER_NAMES_FALLBACK = {
  1: "General Product Information",
  2: "Compliance, Labels & Certifications",
  3: "Battery Carbon Footprint (LCA)",
  4: "Supply Chain Due Diligence",
  5: "Battery Materials & Composition",
  6: "Circularity & Resource Efficiency",
  7: "Performance & Durability",
};

/**
 * Distinct tenantIds with at least one dppProducts doc. Proposed default
 * from CODEX S52.50 — mirrors checkTrialExpiry's shape (derive the working
 * set from real data) rather than a separate "active tenants" registry.
 * Known edge case, documented in the spec: a tenant with zero products
 * currently in the system is invisible to this job, not just empty —
 * acceptable since there's nothing to prioritize for them either way.
 */
async function getActiveDppTenantIds() {
  const snap = await getDb().collection("dppProducts").select("tenantId").get();
  const ids = new Set();
  snap.docs.forEach(d => { const t = d.data().tenantId; if (t) ids.add(t); });
  return Array.from(ids);
}

/**
 * Priority ranking. Prefers the product's own `priority` boolean when it's
 * present (real tenant data already carries this — set upstream by however
 * that tenant curates it) over a computed heuristic, so this job doesn't
 * second-guess a human/existing-process judgment call with its own guess.
 * Fallback for products with no `priority` field at all (proposed default,
 * flagged in CODEX S52.50 as needing sign-off): among incomplete products,
 * rank by overallPct descending — closest to done first, since finishing it
 * fastest reduces the total blocked count soonest. Ties broken by SKU.
 */
function rankProducts(products) {
  const incomplete = products.filter(p => (p.overallPct ?? 0) < 100);
  const hasPriorityField = incomplete.some(p => typeof p.priority === "boolean");
  if (hasPriorityField) {
    return incomplete.sort((a, b) => {
      const pa = a.priority ? 1 : 0, pb = b.priority ? 1 : 0;
      return pb - pa || (b.overallPct ?? 0) - (a.overallPct ?? 0) || (a.sku || "").localeCompare(b.sku || "");
    });
  }
  return incomplete.sort((a, b) => (b.overallPct ?? 0) - (a.overallPct ?? 0) || (a.sku || "").localeCompare(b.sku || ""));
}

function missingClustersFor(product) {
  const clusters = product.clusters || {};
  const missing = [];
  for (let i = 1; i <= 7; i++) {
    const c = clusters[`c${i}`];
    const pct = c?.pct ?? 0;
    if (pct < 100) missing.push({ cluster: i, name: c?.name || CLUSTER_NAMES_FALLBACK[i] || `Cluster ${i}`, pct, note: c?.note || null });
  }
  return missing;
}

function findResponsibleContact(clusterNum, suppliers) {
  return suppliers.find(s => Array.isArray(s.clusters) && s.clusters.includes(clusterNum)) || null;
}

/**
 * Build the priority report for one tenant. Pure computation, no writes —
 * callers decide what to do with the result.
 */
async function computeTenantReport(tenantId) {
  const db = getDb();
  const [productsSnap, suppliersSnap] = await Promise.all([
    db.collection("dppProducts").where("tenantId", "==", tenantId).get(),
    db.collection("dppSuppliers").where("tenantId", "==", tenantId).get(),
  ]);
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const suppliers = suppliersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const ranked = rankProducts(products);
  const priorityProducts = ranked.map(p => {
    const missing = missingClustersFor(p);
    return {
      sku: p.sku,
      name: p.name || p.sku,
      overallPct: p.overallPct ?? 0,
      missingClusters: missing.map(m => {
        const contact = findResponsibleContact(m.cluster, suppliers);
        return {
          ...m,
          responsibleContact: contact
            ? { id: contact.id, name: contact.name, email: contact.email || null, role: contact.role || "supplier" }
            : null, // no contact on file — surfaced honestly, not fabricated
        };
      }),
    };
  });

  return { tenantId, generatedAt: new Date().toISOString(), priorityProducts };
}

/**
 * Run the job for every active DPP tenant, writing one report doc each.
 * Returns the written report docs (with their new IDs) for the caller to
 * optionally chain into draftSupplierEmails.
 */
async function generateWeeklyReports() {
  const db = getDb();
  const tenantIds = await getActiveDppTenantIds();
  const results = [];
  for (const tenantId of tenantIds) {
    const report = await computeTenantReport(tenantId);
    const ref = await db.collection("dppPriorityReports").add({
      ...report,
      status: "pending_review",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    results.push({ id: ref.id, ...report });
  }
  return results;
}

/**
 * Draft one email per (product, missing cluster, contact) tuple — one
 * model call per email, sequenced in job code. This is the direct fix for
 * the compound-request failure: never ask one prompt to draft N emails.
 * Contacts with no email on file are skipped (surfaced in the return value
 * as `skipped`, not silently dropped) rather than drafting into a void.
 */
async function draftSupplierEmails(report) {
  const db = getDb();
  const anthropic = getAnthropic();
  const drafted = [];
  const skipped = [];

  // One draft per contact, covering every missing item that contact owns —
  // not one email per missing item, so a supplier responsible for two
  // clusters on the same SKU gets one email, not two.
  const byContact = new Map();
  for (const product of report.priorityProducts) {
    for (const item of product.missingClusters) {
      const contact = item.responsibleContact;
      if (!contact || !contact.email) {
        skipped.push({ sku: product.sku, cluster: item.cluster, reason: contact ? "no email on file" : "no responsible contact on file" });
        continue;
      }
      const key = contact.id;
      if (!byContact.has(key)) byContact.set(key, { contact, items: [] });
      byContact.get(key).items.push({ sku: product.sku, skuName: product.name, cluster: item.cluster, clusterName: item.name, pct: item.pct, note: item.note });
    }
  }

  for (const { contact, items } of byContact.values()) {
    const draftPrompt = `Draft a brief, professional follow-up email to ${contact.name} (a ${contact.role === "assessor" ? "third-party compliance assessor" : "component supplier"}) requesting the following missing EU Battery Regulation (2023/1542) Digital Product Passport data. Be specific about what's needed and why it's blocking. Items:\n${items.map(i => `- ${i.skuName} (${i.sku}): ${i.clusterName} at ${i.pct}%${i.note ? ` — ${i.note}` : ""}`).join("\n")}\n\nReturn ONLY the email body text, no subject line, no preamble.`;

    const aiResp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: draftPrompt }],
    });
    const body = (aiResp.content.find(b => b.type === "text") || {}).text || "";
    const subject = `Data request — ${items.length > 1 ? `${items.length} items` : items[0].skuName} — EU Battery Regulation DPP`;

    let attachment = null;
    try {
      const docResult = await generateDocument({
        tenantId: report.tenantId,
        userId: "system-dpp-priority-report-job",
        templateId: "dpp-supplier-data-request",
        format: "xlsx",
        title: `Data Request — ${contact.name}`,
        content: {
          items: items.map(i => ({
            sku: i.sku,
            cluster: `Cluster ${i.cluster}`,
            attribute: i.clusterName,
            currentStatus: `${i.pct}% complete`,
            notes: i.note || "",
          })),
        },
        metadata: { source: "dppPriorityReportJob", tenantId: report.tenantId },
      });
      if (docResult.ok) attachment = { downloadUrl: docResult.downloadUrl, docId: docResult.docId, format: "xlsx" };
    } catch (docErr) {
      console.warn("[dppPriorityReportJob] Excel template generation failed:", docErr.message);
    }

    const ref = await db.collection("dppPendingSupplierRequests").add({
      tenantId: report.tenantId,
      reportId: report.id || null,
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      contactRole: contact.role,
      items,
      subject,
      body,
      attachment,
      status: "draft",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    drafted.push({ id: ref.id, contact: contact.name, subject });
  }

  return { drafted, skipped };
}

module.exports = {
  CLUSTER_NAMES_FALLBACK,
  getActiveDppTenantIds,
  computeTenantReport,
  generateWeeklyReports,
  draftSupplierEmails,
};
