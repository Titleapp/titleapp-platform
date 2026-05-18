// Stripe Financial Connections — bank/card connection without adding
// Plaid as a separate vendor (Sean's call 2026-05-18: keep vendor count
// down before SOCIII migration; existing Stripe sk_live/sk_test has FC
// scope by default).
//
// Flow:
//   1. Server calls stripe.financialConnections.sessions.create({...})
//      with permissions [balances, transactions] → returns client_secret
//   2. Client loads Stripe.js and calls
//      stripe.collectFinancialConnectionsAccounts({clientSecret}) → opens
//      Stripe's hosted modal, user picks institution + accounts
//   3. Client gets back the session with attached accounts → POSTs
//      account ids to /accounting:fc:saveAccount → server fetches each
//      account from Stripe API, writes to connectedAccounts with
//      source="stripe_fc"
//   4. /accounting:fc:sync pulls latest transactions for each FC account
//      and upserts into transactions collection
//
// Test mode: Stripe provides a "Test Institution" that returns deterministic
// fake accounts/transactions — works without real bank credentials.

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function nowTs() { return admin.firestore.FieldValue.serverTimestamp(); }

// Stripe FC account_holder requires either a customer or account.
// For unauthenticated tenants we use a Stripe Customer keyed to the
// tenant — if one exists for the tenant on Stripe we reuse it, else
// create. Stored on the tenant doc under stripeCustomerId.
async function ensureStripeCustomer({ tenantId, userEmail }) {
  const db = getDb();
  const tref = db.collection("tenants").doc(tenantId);
  const tsnap = await tref.get();
  const existing = tsnap.exists ? tsnap.data().stripeCustomerId : null;
  if (existing) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: userEmail || undefined,
    metadata: { tenantId, purpose: "financial_connections" },
  });
  await tref.set({ stripeCustomerId: customer.id }, { merge: true });
  return customer.id;
}

// Step 1 — create FC session, return client_secret for the client modal.
// Also returns the matching publishable key so the frontend can load
// Stripe.js without hardcoding test-vs-live.
async function createSession({ tenantId, userEmail }) {
  if (!tenantId) throw new Error("Missing tenantId");
  const pk = process.env.STRIPE_PUBLISHABLE_KEY || "";
  if (!pk) throw new Error("Missing STRIPE_PUBLISHABLE_KEY — set via `firebase functions:secrets:set STRIPE_PUBLISHABLE_KEY`");
  const customerId = await ensureStripeCustomer({ tenantId, userEmail });
  const stripe = getStripe();
  const session = await stripe.financialConnections.sessions.create({
    account_holder: { type: "customer", customer: customerId },
    permissions: ["balances", "transactions", "ownership"],
    filters: { countries: ["US"] },
  });
  return {
    ok: true,
    clientSecret: session.client_secret,
    sessionId: session.id,
    publishableKey: pk,
  };
}

// Step 3 — after the client modal closes with attached accounts, save
// each one to connectedAccounts. We use the FC account id as the doc
// id so re-attach is idempotent.
async function saveAccountsFromSession({ tenantId, userId, sessionId }) {
  if (!tenantId) throw new Error("Missing tenantId");
  if (!sessionId) throw new Error("Missing sessionId");
  const stripe = getStripe();
  const session = await stripe.financialConnections.sessions.retrieve(sessionId, {
    expand: ["accounts"],
  });
  const accounts = (session.accounts && session.accounts.data) || [];
  if (accounts.length === 0) return { ok: true, saved: 0, accounts: [] };

  const db = getDb();
  const batch = db.batch();
  const saved = [];
  for (const a of accounts) {
    const docRef = db.collection("connectedAccounts").doc(a.id);
    const data = {
      tenantId,
      name: a.display_name || a.institution_name || "Bank account",
      institution: a.institution_name || null,
      last4: a.last4 || null,
      type: mapStripeCategoryToType(a.category, a.subcategory),
      currency: (a.balance && a.balance.current && a.balance.current.currency) || "USD",
      balance: balanceFromAccount(a),
      balanceCents: balanceCentsFromAccount(a),
      source: "stripe_fc",
      stripeAccountId: a.id,
      stripeCategory: a.category || null,
      stripeSubcategory: a.subcategory || null,
      permissions: a.permissions || [],
      status: a.status === "active" ? "active" : a.status || "inactive",
      lastSyncedAt: nowTs(),
      createdAt: nowTs(),
      createdBy: userId || null,
    };
    batch.set(docRef, data, { merge: true });
    saved.push({ id: a.id, name: data.name, institution: data.institution });
  }
  await batch.commit();
  return { ok: true, saved: saved.length, accounts: saved };
}

function mapStripeCategoryToType(category, subcategory) {
  if (category === "cash") {
    if (subcategory === "savings") return "savings";
    return "checking";
  }
  if (category === "credit") return "credit_card";
  if (category === "investment") return "other";
  return category || "other";
}

function balanceFromAccount(a) {
  const cur = a.balance && a.balance.current;
  if (!cur) return null;
  // cur is { usd: 12345, ... } — pick first currency value as dollars
  const k = Object.keys(cur).find(k => k !== "currency" && typeof cur[k] === "number");
  return k ? cur[k] / 100 : null;
}

function balanceCentsFromAccount(a) {
  const cur = a.balance && a.balance.current;
  if (!cur) return null;
  const k = Object.keys(cur).find(k => k !== "currency" && typeof cur[k] === "number");
  return k ? cur[k] : null;
}

// Pull recent transactions for each FC account in the tenant. Idempotent
// at the transaction level: we use Stripe's txn id as the doc id so
// reruns merge rather than duplicate.
async function syncTransactions({ tenantId }) {
  if (!tenantId) throw new Error("Missing tenantId");
  const db = getDb();
  const acctSnap = await db.collection("connectedAccounts")
    .where("tenantId", "==", tenantId)
    .where("source", "==", "stripe_fc")
    .limit(50)
    .get();
  if (acctSnap.empty) return { ok: true, accounts: 0, transactions: 0 };

  const stripe = getStripe();
  let totalTxns = 0;
  const summary = [];
  for (const adoc of acctSnap.docs) {
    const acct = { id: adoc.id, ...adoc.data() };
    if (acct.status === "deleted") continue;
    let count = 0;
    try {
      const params = { account: acct.stripeAccountId, limit: 100 };
      for await (const txn of stripe.financialConnections.transactions.list(params)) {
        const tref = db.collection("transactions").doc(txn.id);
        await tref.set({
          tenantId,
          source: "stripe_fc",
          sourceTxnId: txn.id,
          connectedAccountId: acct.id,
          accountName: acct.name,
          description: txn.description || "",
          amountCents: txn.amount,
          direction: txn.amount < 0 ? "debit" : "credit",
          date: (txn.transacted_at ? new Date(txn.transacted_at * 1000) : new Date(txn.created * 1000))
            .toISOString().slice(0, 10),
          status: txn.status === "posted" ? "committed" : "pending",
          classification: null,
          categoryHint: null,
          createdAt: nowTs(),
        }, { merge: true });
        count++;
      }
      await db.collection("connectedAccounts").doc(acct.id)
        .set({ lastSyncedAt: nowTs(), lastSyncCount: count }, { merge: true });
    } catch (e) {
      console.error(`[stripe-fc] sync failed for ${acct.id}:`, e.message);
      summary.push({ accountId: acct.id, error: e.message });
      continue;
    }
    totalTxns += count;
    summary.push({ accountId: acct.id, name: acct.name, count });
  }
  return { ok: true, accounts: acctSnap.size, transactions: totalTxns, perAccount: summary };
}

// Soft-disconnect a FC account. We mark the doc deleted but keep the
// txns (history preservation). Real Stripe-side disconnection is left
// to the user via Stripe's customer portal — we don't unilaterally
// revoke their consent.
async function disconnectAccount({ tenantId, accountId }) {
  if (!tenantId) throw new Error("Missing tenantId");
  if (!accountId) throw new Error("Missing accountId");
  const db = getDb();
  const ref = db.collection("connectedAccounts").doc(accountId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Account not found");
  if (snap.data().tenantId !== tenantId) throw new Error("Forbidden");
  await ref.set({ status: "deleted", deletedAt: nowTs() }, { merge: true });
  return { ok: true };
}

module.exports = {
  createSession,
  saveAccountsFromSession,
  syncTransactions,
  disconnectAccount,
};
