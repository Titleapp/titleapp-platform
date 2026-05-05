/**
 * crossmintMinter.js — CODEX 50.14 Layer D.
 *
 * Submits a DTC to Crossmint for managed minting on Polygon mainnet.
 * Crossmint operates an audited managed contract; TitleApp does not
 * custody the signing key. The architecture is chain-agnostic — adding
 * Base, BNB Chain, or Solana later means adding another minter
 * implementation; the DTC schema and Vault UI do not change.
 *
 * v1 mints to a server-managed recipient (configurable via
 * CROSSMINT_RECIPIENT, defaulting to email:treasury@titleapp.ai which
 * Crossmint resolves to a managed wallet). Future per-user or per-
 * tenant recipient routing is a Phase 2 concern.
 *
 * API reference: https://docs.crossmint.com/server-side/v1/mint-an-nft
 *
 * Usage:
 *   const { mintDtc, getMintStatus } = require('./crossmintMinter');
 *   const { jobId, status } = await mintDtc({ dtcId, dtc });
 *   const update = await getMintStatus(jobId);
 */

const API_BASE = "https://www.crossmint.com/api/2022-06-09";
const COLLECTION_ID = process.env.CROSSMINT_COLLECTION_ID || "default-polygon";
const RECIPIENT = process.env.CROSSMINT_RECIPIENT || "email:treasury@titleapp.ai";

function getApiKey() {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY not set");
  return key;
}

function buildMetadata(dtcId, dtc) {
  // Crossmint requires name, image, description fields per NFT-1155 conventions.
  const m = dtc.metadata || {};
  const title = m.title || m.name || `${dtc.type || "DTC"} ${dtcId.slice(0, 8)}`;
  const description = [
    `Digital Title Certificate.`,
    `Type: ${dtc.type || "record"}.`,
    `contentHash: ${dtc.contentHash || "(pending)"}.`,
    `Issued by TitleApp.`,
  ].join(" ");
  return {
    name: title.slice(0, 64),
    description: description.slice(0, 1024),
    // Crossmint requires an image URL; use a deterministic placeholder so
    // the platform stays visually consistent. Phase 2 can render per-DTC
    // SVGs from canonical fields and host them at storage.titleapp.ai.
    image: "https://titleapp.ai/dtc-placeholder.png",
    attributes: [
      { trait_type: "type",         value: dtc.type || "record" },
      { trait_type: "contentHash",  value: dtc.contentHash || "" },
      { trait_type: "issuedBy",     value: "TitleApp" },
      { trait_type: "version",      value: String(dtc.version || 1) },
    ],
  };
}

/**
 * Submit a DTC for minting. Returns { ok: true, jobId, status } on
 * accept (status from Crossmint, typically 'pending'). Throws on API
 * errors so callers can transition the DTC to chain_failed.
 */
async function mintDtc({ dtcId, dtc }) {
  const apiKey = getApiKey();
  const body = {
    recipient: RECIPIENT,
    metadata: buildMetadata(dtcId, dtc),
  };

  const res = await fetch(`${API_BASE}/collections/${COLLECTION_ID}/nfts`, {
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
    throw new Error(`Crossmint mint failed: ${msg}`);
  }

  // Crossmint returns { id, onChain: { status, chain, contractAddress, txId? }, ... }
  return {
    ok: true,
    jobId: data.id,
    status: data.onChain?.status || "pending",
    raw: data,
  };
}

/**
 * Poll an in-flight mint. Returns { ok, status, txHash, chain }. Status
 * values: 'pending', 'success', 'failed', 'rejected'. Caller transitions
 * the DTC based on terminal states.
 */
async function getMintStatus(jobId) {
  const apiKey = getApiKey();
  const res = await fetch(`${API_BASE}/collections/${COLLECTION_ID}/nfts/${jobId}`, {
    method: "GET",
    headers: { "X-API-KEY": apiKey },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Crossmint status poll failed: ${msg}`);
  }

  return {
    ok: true,
    status: data.onChain?.status || "pending",
    txHash: data.onChain?.txId || null,
    chain: data.onChain?.chain || "polygon",
    raw: data,
  };
}

module.exports = { mintDtc, getMintStatus, buildMetadata };
