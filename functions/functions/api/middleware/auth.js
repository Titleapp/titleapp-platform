const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Validate API key from X-API-Key header.
 * Attaches req.apiKey with key metadata on success.
 */
async function validateApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      error: { code: "unauthorized", message: "Missing X-API-Key header", status: 401 },
    });
  }

  try {
    // Look up key in Firestore
    const snap = await getDb().collection("api_keys").where("key", "==", apiKey).limit(1).get();

    if (snap.empty) {
      return res.status(401).json({
        error: { code: "unauthorized", message: "Invalid API key", status: 401 },
      });
    }

    const keyDoc = snap.docs[0];
    const keyData = keyDoc.data();

    // Check if key is active
    if (keyData.status === "revoked") {
      return res.status(401).json({
        error: { code: "unauthorized", message: "API key has been revoked", status: 401 },
      });
    }

    // Rate limiting
    const rateLimited = await checkRateLimit(apiKey, keyData.rate_limit || 100);
    if (rateLimited.exceeded) {
      res.set("X-RateLimit-Limit", String(rateLimited.limit));
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", String(rateLimited.resetAt));
      return res.status(429).json({
        error: { code: "rate_limited", message: "Rate limit exceeded", status: 429 },
      });
    }

    // Set rate limit headers
    res.set("X-RateLimit-Limit", String(rateLimited.limit));
    res.set("X-RateLimit-Remaining", String(rateLimited.remaining));
    res.set("X-RateLimit-Reset", String(rateLimited.resetAt));

    // Attach key data to request
    req.apiKey = {
      id: keyDoc.id,
      user_id: keyData.user_id,
      workspace_ids: keyData.workspace_ids || [],
      scopes: keyData.scopes || ["read"],
    };

    // Update last_used (fire-and-forget)
    keyDoc.ref.update({ last_used: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});

    next();
  } catch (err) {
    console.error("API key validation error:", err);
    return res.status(500).json({
      error: { code: "internal_error", message: "Failed to validate API key", status: 500 },
    });
  }
}

/**
 * Rate limiter using Firestore counters.
 * Tracks calls per API key per hour.
 */
async function checkRateLimit(apiKey, limit) {
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}_${String(now.getUTCHours()).padStart(2, "0")}`;
  const resetAt = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime() / 1000);

  // Use a short hash of the API key for the doc ID (don't store full key in path)
  const keyHash = apiKey.substring(0, 16);
  const counterRef = getDb().collection("rate_limits").doc(`${keyHash}_${hourKey}`);

  try {
    const result = await getDb().runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      const current = doc.exists ? (doc.data().count || 0) : 0;

      if (current >= limit) {
        return { exceeded: true, limit, remaining: 0, resetAt };
      }

      t.set(counterRef, { count: current + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return { exceeded: false, limit, remaining: limit - current - 1, resetAt };
    });

    return result;
  } catch (err) {
    // If rate limit check fails, allow the request (fail open)
    console.warn("Rate limit check failed:", err.message);
    return { exceeded: false, limit, remaining: limit, resetAt };
  }
}

/**
 * Check if API key has a specific scope.
 */
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: { code: "unauthorized", message: "No API key", status: 401 },
      });
    }
    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes("admin")) {
      return res.status(403).json({
        error: { code: "forbidden", message: `Missing required scope: ${scope}`, status: 403 },
      });
    }
    next();
  };
}

/**
 * Verify API key has access to the workspace in :workspace_id param.
 */
function requireWorkspaceAccess(req, res, next) {
  const workspaceId = req.params.workspace_id || req.params.id;
  if (!workspaceId) {
    return res.status(400).json({
      error: { code: "bad_request", message: "Missing workspace_id", status: 400 },
    });
  }
  if (!req.apiKey.workspace_ids.includes(workspaceId) && !req.apiKey.scopes.includes("admin")) {
    return res.status(403).json({
      error: { code: "forbidden", message: "Access denied to this workspace", status: 403 },
    });
  }
  next();
}

module.exports = { validateApiKey, requireScope, requireWorkspaceAccess };
