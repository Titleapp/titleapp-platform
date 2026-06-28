"use strict";

/**
 * shopify.js — Shopify OAuth lifecycle + store data operations.
 *
 * Pattern mirrors services/social/gmail.js: AES-256-GCM token encryption,
 * stored at users/{uid}/integrations/shopify. Shopify uses permanent
 * access tokens (no refresh needed) — one token per shop.
 *
 * Scopes:
 *   read_orders        — revenue data for Accounting worker
 *   read_customers     — CRM enrichment for Contacts worker
 *   read_products      — catalog / inventory
 *   read_reports       — aggregate sales data
 *
 * ENV vars required:
 *   SHOPIFY_API_KEY    — app client_id (from Shopify Partner Dashboard)
 *   SHOPIFY_API_SECRET — app client_secret
 *   SHOPIFY_REDIRECT_URI — e.g. https://sociii.ai/auth/shopify-callback
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const ALGORITHM = "aes-256-gcm";
const SHOPIFY_SCOPES = "read_orders,read_customers,read_products,read_reports";

// ═══════════════════════════════════════════════════════════════
//  TOKEN ENCRYPTION — shared key with Drive/Gmail
// ═══════════════════════════════════════════════════════════════

function getEncryptionKey() {
  const key = process.env.GDRIVE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) throw new Error("GDRIVE_ENCRYPTION_KEY must be 64-char hex");
  return Buffer.from(key, "hex");
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(plaintext, "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + enc + ":" + cipher.getAuthTag().toString("hex");
}

function decrypt(ciphertext) {
  const [ivHex, enc, tagHex] = ciphertext.split(":");
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let dec = decipher.update(enc, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

// ═══════════════════════════════════════════════════════════════
//  HMAC VERIFICATION
// ═══════════════════════════════════════════════════════════════

function verifyShopifyHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;
  const message = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join("&");
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"));
}

// ═══════════════════════════════════════════════════════════════
//  TOKEN STORAGE
// ═══════════════════════════════════════════════════════════════

async function storeToken(uid, shop, accessToken) {
  await getDb().doc(`users/${uid}/integrations/shopify`).set({
    shop,
    accessToken: encrypt(accessToken),
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function loadToken(uid) {
  const snap = await getDb().doc(`users/${uid}/integrations/shopify`).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data.accessToken || !data.shop) return null;
  return {
    shop: data.shop,
    accessToken: decrypt(data.accessToken),
    connectedAt: data.connectedAt || null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  SHOPIFY API HELPER
// ═══════════════════════════════════════════════════════════════

async function shopifyFetch(shop, accessToken, endpoint, opts = {}) {
  const fetch = (await import("node-fetch")).default;
  const url = `https://${shop}/admin/api/2024-01${endpoint}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${await res.text()}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
//  HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleShopifyAuthUrl(req, res, { userId }) {
  const { shop } = req.body || {};
  if (!shop) return res.status(400).json({ ok: false, error: "shop domain required (e.g. mystore.myshopify.com)" });

  const shopDomain = shop.replace(/https?:\/\//, "").replace(/\/$/, "");
  const apiKey = process.env.SHOPIFY_API_KEY;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || "https://sociii.ai/auth/shopify-callback";
  const nonce = crypto.randomBytes(12).toString("hex");

  // Store nonce in Firestore for callback verification
  await getDb().doc(`users/${userId}/integrations/shopify_pending`).set({
    nonce, shop: shopDomain, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${apiKey}&scope=${SHOPIFY_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;
  return res.json({ ok: true, authUrl });
}

async function handleShopifyCallback(req, res, { userId }) {
  const query = req.query || {};
  const { code, shop, state, hmac } = query;

  if (!code || !shop || !state) return res.status(400).json({ ok: false, error: "Missing OAuth params" });

  // Verify HMAC (skip in dev if secret not set)
  if (process.env.SHOPIFY_API_SECRET && !verifyShopifyHmac(query)) {
    return res.status(403).json({ ok: false, error: "HMAC verification failed" });
  }

  // Verify nonce
  const pendingSnap = await getDb().doc(`users/${userId}/integrations/shopify_pending`).get();
  if (!pendingSnap.exists || pendingSnap.data().nonce !== state) {
    return res.status(403).json({ ok: false, error: "Invalid state parameter" });
  }
  await getDb().doc(`users/${userId}/integrations/shopify_pending`).delete();

  // Exchange code for access token
  const fetch = (await import("node-fetch")).default;
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) return res.status(400).json({ ok: false, error: "Token exchange failed" });
  const { access_token } = await tokenRes.json();
  await storeToken(userId, shop, access_token);

  return res.json({ ok: true, shop });
}

async function handleShopifyStatus(req, res, { userId }) {
  const creds = await loadToken(userId);
  if (!creds) return res.json({ ok: true, connected: false });
  return res.json({ ok: true, connected: true, shop: creds.shop, connectedAt: creds.connectedAt });
}

async function handleShopifyDisconnect(req, res, { userId }) {
  await getDb().doc(`users/${userId}/integrations/shopify`).delete();
  return res.json({ ok: true, disconnected: true });
}

// ═══════════════════════════════════════════════════════════════
//  DATA OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * getRecentOrders — recent orders for Accounting / revenue context.
 * Returns [{id, order_number, total_price, financial_status, created_at, customer_name, line_item_count}]
 */
async function getRecentOrders(uid, opts = {}) {
  const { limit = 20, status = "any", since } = opts;
  const creds = await loadToken(uid);
  if (!creds) throw new Error("Shopify not connected");

  let qs = `?limit=${limit}&status=${status}&order=created_at+desc`;
  if (since) qs += `&created_at_min=${since}`;

  const data = await shopifyFetch(creds.shop, creds.accessToken, `/orders.json${qs}`);
  return (data.orders || []).map(o => ({
    id: o.id,
    order_number: o.order_number,
    total_price: parseFloat(o.total_price || "0"),
    currency: o.currency,
    financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status,
    created_at: o.created_at,
    customer_name: o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : null,
    customer_email: o.customer?.email || null,
    line_item_count: (o.line_items || []).length,
    line_items: (o.line_items || []).map(li => ({ title: li.title, quantity: li.quantity, price: li.price })),
  }));
}

/**
 * getRevenueSummary — aggregate stats for a date range (for Accounting context).
 */
async function getRevenueSummary(uid, opts = {}) {
  const { days = 30 } = opts;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const orders = await getRecentOrders(uid, { limit: 250, status: "any", since });

  const paid = orders.filter(o => o.financial_status === "paid" || o.financial_status === "partially_paid");
  const totalRevenue = paid.reduce((sum, o) => sum + o.total_price, 0);
  const orderCount = paid.length;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  return {
    period_days: days,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    order_count: orderCount,
    avg_order_value: Math.round(avgOrderValue * 100) / 100,
    currency: orders[0]?.currency || "USD",
  };
}

/**
 * getCustomers — customer list for Contacts worker enrichment.
 */
async function getCustomers(uid, opts = {}) {
  const { limit = 50 } = opts;
  const creds = await loadToken(uid);
  if (!creds) throw new Error("Shopify not connected");

  const data = await shopifyFetch(creds.shop, creds.accessToken, `/customers.json?limit=${limit}&order=updated_at+desc`);
  return (data.customers || []).map(c => ({
    id: c.id,
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
    phone: c.phone,
    orders_count: c.orders_count,
    total_spent: parseFloat(c.total_spent || "0"),
    currency: c.currency,
    created_at: c.created_at,
    tags: c.tags ? c.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
  }));
}

module.exports = {
  handleShopifyAuthUrl,
  handleShopifyCallback,
  handleShopifyStatus,
  handleShopifyDisconnect,
  getRecentOrders,
  getRevenueSummary,
  getCustomers,
  loadToken,
};
