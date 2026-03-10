/**
 * @titleapp/sdk — JavaScript SDK for the TitleApp Digital Worker platform.
 *
 * Capabilities:
 *   - workers.list(filters)     — browse/search the marketplace
 *   - workers.get(slugOrId)     — full worker profile
 *   - workers.chat(workerId, message) — send a message to a worker
 *   - vault.getSession()        — current user's vault session
 *   - marketplace.search(query) — marketplace search with facets
 */

// ═══════════════════════════════════════════════════════════════
//  ERRORS
// ═══════════════════════════════════════════════════════════════

class TitleAppError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "TitleAppError";
    this.code = code || "UNKNOWN";
    this.status = status || 0;
  }
}

class AuthenticationError extends TitleAppError {
  constructor(message) {
    super(message || "Authentication required", "UNAUTHORIZED", 401);
    this.name = "AuthenticationError";
  }
}

class RateLimitError extends TitleAppError {
  constructor(message, retryAfter) {
    super(message || "Rate limit exceeded", "RATE_LIMITED", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter || null;
  }
}

class NotFoundError extends TitleAppError {
  constructor(message) {
    super(message || "Resource not found", "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

// ═══════════════════════════════════════════════════════════════
//  HTTP CLIENT WITH RETRY
// ═══════════════════════════════════════════════════════════════

const DEFAULT_BASE_URL = "https://api-feyfibglbq-uc.a.run.app";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Rate limited — respect Retry-After header
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : INITIAL_BACKOFF_MS * Math.pow(2, attempt);

        if (attempt < retries) {
          await sleep(waitMs);
          continue;
        }

        const body = await safeJson(res);
        throw new RateLimitError(body?.error || "Rate limit exceeded", retryAfter);
      }

      // Server errors — retry with exponential backoff
      if (res.status >= 500 && attempt < retries) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }

      // Parse response
      const body = await safeJson(res);

      if (res.status === 401) {
        throw new AuthenticationError(body?.error);
      }

      if (res.status === 404) {
        throw new NotFoundError(body?.error);
      }

      if (!res.ok) {
        throw new TitleAppError(
          body?.error || `HTTP ${res.status}`,
          body?.code || "HTTP_ERROR",
          res.status,
        );
      }

      return body;
    } catch (err) {
      lastError = err;
      if (err instanceof TitleAppError) throw err;
      if (attempt < retries) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new TitleAppError("Request failed after retries", "NETWORK_ERROR");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  SDK CLIENT
// ═══════════════════════════════════════════════════════════════

class TitleApp {
  /**
   * Create a TitleApp SDK client.
   *
   * @param {Object} options
   * @param {string} [options.apiKey] - API key (ta_xxx format) for public API access
   * @param {string} [options.token] - Firebase ID token for authenticated access
   * @param {string} [options.baseUrl] - API base URL (default: production)
   * @param {number} [options.retries] - Max retry attempts (default: 3)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.token = options.token || null;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.retries = options.retries ?? MAX_RETRIES;

    this.workers = new WorkersClient(this);
    this.vault = new VaultClient(this);
    this.marketplace = new MarketplaceClient(this);
  }

  /**
   * Update the auth token (e.g., after Firebase token refresh).
   * @param {string} token
   */
  setToken(token) {
    this.token = token;
  }

  /** @internal */
  _headers(requireAuth = false) {
    const headers = { "Content-Type": "application/json" };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (requireAuth) {
      throw new AuthenticationError("Token required for this operation. Call setToken() first.");
    }

    return headers;
  }

  /** @internal */
  async _get(path, params, requireAuth = false) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    return fetchWithRetry(url.toString(), {
      method: "GET",
      headers: this._headers(requireAuth),
    }, this.retries);
  }

  /** @internal */
  async _post(path, body, requireAuth = false) {
    return fetchWithRetry(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this._headers(requireAuth),
      body: JSON.stringify(body),
    }, this.retries);
  }
}

// ═══════════════════════════════════════════════════════════════
//  WORKERS CLIENT
// ═══════════════════════════════════════════════════════════════

class WorkersClient {
  constructor(client) {
    this._client = client;
  }

  /**
   * List/search workers with filters.
   *
   * @param {Object} [filters]
   * @param {string} [filters.q] - Free-text search query
   * @param {string} [filters.vertical] - Filter by vertical
   * @param {string} [filters.suite] - Filter by suite
   * @param {string} [filters.type] - Filter by type (standalone/pipeline/composite/copilot)
   * @param {string} [filters.status] - Filter by status (live/waitlist)
   * @param {number} [filters.priceMin] - Minimum price
   * @param {number} [filters.priceMax] - Maximum price
   * @param {string} [filters.sort] - Sort order (relevance/price_asc/price_desc/popular/newest)
   * @param {number} [filters.limit] - Results per page (default: 20, max: 50)
   * @param {number} [filters.offset] - Pagination offset
   * @returns {Promise<{ok: boolean, workers: Object[], total: number, facets: Object}>}
   */
  async list(filters = {}) {
    return this._client._get("/v1/marketplace:search", filters);
  }

  /**
   * Get a full worker profile by slug or ID.
   *
   * @param {string} slugOrId - Worker slug or ID
   * @returns {Promise<{ok: boolean, worker: Object}>}
   */
  async get(slugOrId) {
    if (!slugOrId) throw new TitleAppError("slugOrId is required", "MISSING_FIELDS");
    return this._client._get("/v1/marketplace:worker", { slug: slugOrId });
  }

  /**
   * Send a message to a Digital Worker via chat.
   * Requires authentication (token).
   *
   * @param {string} workerId - Worker ID
   * @param {string} message - Message text
   * @param {Object} [options]
   * @param {string} [options.sessionId] - Existing chat session ID (for follow-ups)
   * @param {string} [options.tenantId] - Tenant/workspace ID
   * @returns {Promise<{ok: boolean, response: string, sessionId: string}>}
   */
  async chat(workerId, message, options = {}) {
    if (!workerId) throw new TitleAppError("workerId is required", "MISSING_FIELDS");
    if (!message) throw new TitleAppError("message is required", "MISSING_FIELDS");

    const body = {
      message,
      workerId,
      sessionId: options.sessionId || undefined,
    };

    const headers = { ...this._client._headers(true) };
    if (options.tenantId) {
      headers["x-tenant-id"] = options.tenantId;
    }

    return fetchWithRetry(`${this._client.baseUrl}/v1/alex:chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }, this._client.retries);
  }

  /**
   * Compare up to 4 workers side-by-side.
   *
   * @param {string[]} workerIds - Array of worker IDs or slugs (max 4)
   * @returns {Promise<{ok: boolean, workers: Object[], comparisonFields: string[]}>}
   */
  async compare(workerIds) {
    if (!Array.isArray(workerIds) || workerIds.length === 0) {
      throw new TitleAppError("workerIds array is required", "MISSING_FIELDS");
    }
    return this._client._get("/v1/marketplace:compare", {
      workerIds: workerIds.slice(0, 4).join(","),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  VAULT CLIENT
// ═══════════════════════════════════════════════════════════════

class VaultClient {
  constructor(client) {
    this._client = client;
  }

  /**
   * Get the current user's vault session summary.
   * Requires authentication.
   *
   * @returns {Promise<{ok: boolean, session: Object}>}
   */
  async getSession() {
    return this._client._get("/v1/vault:session", null, true);
  }

  /**
   * List records in the vault.
   * Requires authentication.
   *
   * @param {Object} [filters]
   * @param {string} [filters.type] - Record type filter
   * @param {number} [filters.limit] - Max results (default: 50)
   * @returns {Promise<{ok: boolean, records: Object[]}>}
   */
  async listRecords(filters = {}) {
    return this._client._get("/v1/vault:records", filters, true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  MARKETPLACE CLIENT
// ═══════════════════════════════════════════════════════════════

class MarketplaceClient {
  constructor(client) {
    this._client = client;
  }

  /**
   * Search marketplace (alias for workers.list).
   *
   * @param {string} query - Search query
   * @param {Object} [filters] - Additional filters
   * @returns {Promise<{ok: boolean, workers: Object[], total: number, facets: Object}>}
   */
  async search(query, filters = {}) {
    return this._client._get("/v1/marketplace:search", { q: query, ...filters });
  }

  /**
   * Get featured workers (trending, new, popular).
   *
   * @returns {Promise<{ok: boolean, trending: Object[], new: Object[], popular: Object[]}>}
   */
  async featured() {
    return this._client._get("/v1/marketplace:featured");
  }

  /**
   * Get marketplace categories with counts.
   *
   * @returns {Promise<{ok: boolean, verticals: Object[], suites: Object, priceRanges: Object}>}
   */
  async categories() {
    return this._client._get("/v1/marketplace:categories");
  }
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

export default TitleApp;
export {
  TitleApp,
  TitleAppError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
};
