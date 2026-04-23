"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const ESSENTIAL_WORKERS = [
  "alex-chief-of-staff",
  "platform-marketing",
  "platform-accounting",
];

// Industry → recommended worker slugs
const INDUSTRY_WORKERS = {
  "auto-dealer": ["car-sales", "auto-title-clerk", "auto-fi-manager"],
  "real-estate": ["cre-analyst", "property-management", "investor-relations"],
  "aviation": ["av-digital-logbook", "av-currency-tracker", "av-flight-planning"],
  "healthcare": [],
  "government": ["gov-jurisdiction-onboarding", "gov-permit-intake"],
  "web3": ["w3-tokenomics-advisor"],
  "solar": [],
};

/**
 * Set up a new business and activate essential workers.
 * @param {string} userId
 * @param {object} data — { name, industry, size, email, website, dataSources }
 * @returns {{ ok, activatedWorkers }}
 */
async function setupBusiness(userId, data) {
  if (!data.name) return { ok: false, error: "Business name is required" };

  const db = getDb();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Save business profile
  await db.doc(`users/${userId}`).set({
    businessProfile: {
      name: data.name || "",
      industry: data.industry || "",
      size: data.size || "just-me",
      email: data.email || "",
      website: data.website || "",
      dataSources: data.dataSources || [],
      setupCompletedAt: now,
    },
    subscriberProfile: {
      businessName: data.name,
      industry: data.industry,
    },
    updatedAt: now,
  }, { merge: true });

  // Activate essential workers
  const workersToActivate = [...ESSENTIAL_WORKERS];

  // Add HR if they have employees
  if (data.size && data.size !== "just-me") {
    workersToActivate.push("platform-hr");
  }

  const activatedWorkers = [];
  for (const slug of workersToActivate) {
    try {
      const entRef = db.doc(`users/${userId}/entitlements/${slug}`);
      const existing = await entRef.get();
      if (!existing.exists) {
        await entRef.set({
          slug,
          activatedAt: now,
          source: "onboarding",
          status: "active",
        });
        activatedWorkers.push(slug);
      }
    } catch (e) {
      console.warn(`Failed to activate worker ${slug}:`, e.message);
    }
  }

  // Set up Alex briefing config
  await setupAlexBriefing(userId, data);

  return { ok: true, activatedWorkers };
}

/**
 * Configure Alex daily briefing with business context.
 */
async function setupAlexBriefing(userId, data) {
  const db = getDb();
  await db.doc(`users/${userId}/settings/alexBriefing`).set({
    businessName: data.name || "",
    industry: data.industry || "",
    focusAreas: ["revenue", "marketing", "operations"],
    briefingTime: "07:00",
    enabled: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * Import contacts from CSV data.
 * @param {string} userId
 * @param {object[]} contacts — [{ email, firstName, lastName, phone, company }]
 * @returns {{ ok, importedCount }}
 */
async function importContacts(userId, contacts) {
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return { ok: false, error: "No contacts to import" };
  }

  const db = getDb();
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  let count = 0;

  for (const contact of contacts.slice(0, 500)) {
    if (!contact.email) continue;
    const ref = db.collection(`users/${userId}/contacts`).doc();
    batch.set(ref, {
      email: contact.email.toLowerCase().trim(),
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      phone: contact.phone || "",
      company: contact.company || "",
      source: "csv_import",
      createdAt: now,
    });
    count++;

    // Firestore batch limit is 500
    if (count % 499 === 0) {
      await batch.commit();
    }
  }

  if (count % 499 !== 0) {
    await batch.commit();
  }

  return { ok: true, importedCount: count };
}

module.exports = { setupBusiness, importContacts, setupAlexBriefing };
