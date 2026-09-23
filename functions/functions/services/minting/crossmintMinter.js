/**
 * crossmintMinter.js — CODEX 50.14 Layer D.
 *
 * Submits a DTC to Crossmint for managed minting. Crossmint operates an
 * audited managed contract; SOCIII does not custody the signing key.
 *
 * 2026-09-21: chain is now a real per-call parameter, not a fixed module
 * constant — Crossmint natively supports both `polygon` and `base`
 * (confirmed against https://docs.crossmint.com/introduction/supported-chains:
 * mainnet ids "polygon" and "base", testnets "polygon-amoy" and
 * "base-sepolia" via the staging API). This is the SAME Crossmint
 * integration for both chains — no separate SDK/provider needed, just a
 * different collection id per chain. A collection must exist on Crossmint's
 * side for each chain before minting to it; CROSSMINT_COLLECTION_ID_BASE
 * is not yet confirmed to exist — verify/create it in the Crossmint
 * dashboard before the first real Base mint.
 *
 * v1 mints to a server-managed recipient (configurable via
 * CROSSMINT_RECIPIENT, defaulting to email:treasury@sociii.ai which
 * Crossmint resolves to a managed wallet). Future per-user or per-
 * tenant recipient routing is a Phase 2 concern.
 *
 * API reference: https://docs.crossmint.com/api-reference/minting/nfts/mint-nft
 *
 * Usage:
 *   const { mintDtc, getMintStatus } = require('./crossmintMinter');
 *   const { jobId, status } = await mintDtc({ dtcId, dtc, chain: "base" });
 *   const update = await getMintStatus(jobId, "base");
 */

const CHAINS = {
  polygon: {
    apiBase: () => process.env.CROSSMINT_USE_STAGING === "true"
      ? "https://staging.crossmint.com/api/2022-06-09"
      : "https://www.crossmint.com/api/2022-06-09",
    collectionId: () => process.env.CROSSMINT_COLLECTION_ID || "default-polygon",
  },
  base: {
    apiBase: () => process.env.CROSSMINT_USE_STAGING === "true"
      ? "https://staging.crossmint.com/api/2022-06-09"
      : "https://www.crossmint.com/api/2022-06-09",
    collectionId: () => process.env.CROSSMINT_COLLECTION_ID_BASE || "default-base",
  },
};

function resolveChain(chain) {
  const c = CHAINS[chain || "polygon"];
  if (!c) throw new Error(`crossmintMinter: unsupported chain "${chain}" — expected one of: ${Object.keys(CHAINS).join(", ")}`);
  return { apiBase: c.apiBase(), collectionId: c.collectionId() };
}

// 2026-09-21: the fallback recipient (for any tenant without their own
// coinbaseWalletAddress) is now Sean's real self-custody "Client Holding"
// wallet, not a Crossmint-managed email recipient. Since a single 0x
// address is valid across every EVM chain (same address works on both
// polygon and base — that's the whole point of EVM address reuse), it
// needs the same "<chain>:<address>" prefixing the per-tenant path already
// does, NOT a flat string used verbatim regardless of chain (that would
// point a base mint at "polygon:0x..." and vice versa). CROSSMINT_RECIPIENT
// (the old flat email: format) stays as a last-resort fallback only if
// CROSSMINT_DEFAULT_WALLET_ADDRESS is unset.
const DEFAULT_WALLET_ADDRESS = process.env.CROSSMINT_DEFAULT_WALLET_ADDRESS || null;
const DEFAULT_RECIPIENT_FLAT = process.env.CROSSMINT_RECIPIENT || "email:treasury@sociii.ai";

/**
 * Resolve who actually receives the minted NFT. Sean, 2026-09-21: "we need
 * a way for a client to have their own wallet (if they want to control the
 * records)." If the tenant has set a real wallet address (currently stored
 * as tenants/{id}.auditTrail.coinbaseWalletAddress — see /tenant:auditTrail:update),
 * mint directly to it. Otherwise fall back to SOCIII's "Client Holding"
 * wallet (custody-only — the tenant doesn't control the wallet).
 * Format per Crossmint's own docs: "<chain>:<address>" for a direct wallet.
 */
function resolveRecipient({ chain, walletAddress } = {}) {
  const addr = walletAddress || DEFAULT_WALLET_ADDRESS;
  if (addr) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      throw new Error(`crossmintMinter: walletAddress "${addr}" is not a valid 0x-prefixed 40-hex-char address`);
    }
    return `${chain || "polygon"}:${addr}`;
  }
  return DEFAULT_RECIPIENT_FLAT;
}

function getApiKey() {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY not set");
  return key;
}

function buildMetadata(dtcId, dtc, chain) {
  // Crossmint requires name, image, description fields per NFT-1155 conventions.
  const m = dtc.metadata || {};
  const title = m.title || m.name || `${dtc.type || "DTC"} ${dtcId.slice(0, 8)}`;
  const description = [
    `Digital Title Certificate.`,
    `Type: ${dtc.type || "record"}.`,
    `contentHash: ${dtc.contentHash || "(pending)"}.`,
    `Issued by SOCIII.`,
  ].join(" ");
  return {
    name: title.slice(0, 64),
    description: description.slice(0, 1024),
    // Crossmint requires an image URL; use a deterministic placeholder so
    // the platform stays visually consistent. 2026-09-21: the original
    // "dtc-placeholder.png" path was never a real static asset — it
    // resolved to the SPA's HTML fallback (200 text/html, not an image),
    // which Crossmint rejected on every real mint attempt with "non-
    // supported extension." This is why zero DTCs had ever reached a
    // confirmed mint. Using the real, existing logo.png until Phase 2
    // renders per-DTC SVGs from canonical fields (hosted at storage.sociii.ai).
    image: "https://sociii.ai/logo.png",
    attributes: [
      { trait_type: "type",         value: dtc.type || "record" },
      { trait_type: "contentHash",  value: dtc.contentHash || "" },
      { trait_type: "issuedBy",     value: "SOCIII" },
      { trait_type: "version",      value: String(dtc.version || 1) },
      { trait_type: "chain",        value: chain || "polygon" },
    ],
  };
}

/**
 * Submit a DTC for minting. Returns { ok: true, jobId, status } on
 * accept (status from Crossmint, typically 'pending'). Throws on API
 * errors so callers can transition the DTC to chain_failed.
 *
 * @param {object} a
 * @param {string} a.dtcId
 * @param {object} a.dtc
 * @param {"polygon"|"base"} [a.chain] defaults to "polygon"
 * @param {string} [a.walletAddress] tenant's own 0x wallet — mints directly
 *   to it instead of SOCIII's managed treasury recipient when present
 */
async function mintDtc({ dtcId, dtc, chain, walletAddress }) {
  const apiKey = getApiKey();
  const { apiBase, collectionId } = resolveChain(chain);
  const body = {
    recipient: resolveRecipient({ chain, walletAddress }),
    metadata: buildMetadata(dtcId, dtc, chain),
  };

  const res = await fetch(`${apiBase}/collections/${collectionId}/nfts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Crossmint mint failed (${chain || "polygon"}): ${msg}`);
  }

  // Crossmint returns { id, onChain: { status, chain, contractAddress, txId? }, ... }
  return {
    ok: true,
    jobId: data.id,
    chain: chain || "polygon",
    status: data.onChain?.status || "pending",
    raw: data,
  };
}

/**
 * Poll an in-flight mint. Returns { ok, status, txHash, chain }. Status
 * values: 'pending', 'success', 'failed', 'rejected'. Caller transitions
 * the DTC based on terminal states. Must pass the SAME chain used to
 * submit the mint — collection id (and therefore the lookup) differs per
 * chain.
 */
async function getMintStatus(jobId, chain) {
  const apiKey = getApiKey();
  const { apiBase, collectionId } = resolveChain(chain);
  const res = await fetch(`${apiBase}/collections/${collectionId}/nfts/${jobId}`, {
    method: "GET",
    headers: { "X-API-KEY": apiKey },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Crossmint status poll failed (${chain || "polygon"}): ${msg}`);
  }

  return {
    ok: true,
    status: data.onChain?.status || "pending",
    txHash: data.onChain?.txId || null,
    chain: data.onChain?.chain || chain || "polygon",
    raw: data,
  };
}

module.exports = { mintDtc, getMintStatus, buildMetadata };
