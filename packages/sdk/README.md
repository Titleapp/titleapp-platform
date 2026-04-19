# @titleapp/sdk

JavaScript SDK for the TitleApp Digital Worker platform.

## Current Version: v0.1.0 (BETA)

Available client modules: workers, vault, marketplace.

> **Coming in v0.2:** Spine endpoints — contacts, transactions,
> assets, documents, employees. These correspond to the Spine
> worker infrastructure being built in CODEX 49.1.

## Install

```bash
npm install @titleapp/sdk
```

## Quick Start

```javascript
import TitleApp from "@titleapp/sdk";

const client = new TitleApp();

// Browse the marketplace (no auth required)
const results = await client.marketplace.search("deal analyst");
console.log(results.workers);

// Get a specific worker
const worker = await client.workers.get("cre-deal-analyst");
console.log(worker.worker.name);
```

## Authentication

```javascript
// Public API key (for server-side use)
const client = new TitleApp({ apiKey: "ta_your_api_key" });

// Firebase ID token (for client-side use)
const client = new TitleApp({ token: firebaseIdToken });

// Update token after refresh
client.setToken(newToken);
```

## API

### workers.list(filters?)

Search and filter Digital Workers.

```javascript
const results = await client.workers.list({
  q: "construction",
  vertical: "real-estate-development",
  sort: "popular",
  limit: 10,
});
// results.workers, results.total, results.facets
```

### workers.get(slugOrId)

Get a full worker profile.

```javascript
const { worker } = await client.workers.get("cre-deal-analyst");
// worker.name, worker.price, worker.vault, worker.related
```

### workers.chat(workerId, message, options?)

Send a message to a Digital Worker. Requires authentication.

```javascript
const response = await client.workers.chat("W-002", "Analyze this deal", {
  sessionId: "existing-session-id", // optional, for follow-ups
  tenantId: "workspace-id",         // optional
});
// response.response, response.sessionId
```

### workers.compare(workerIds)

Compare up to 4 workers side-by-side.

```javascript
const comparison = await client.workers.compare(["W-002", "W-016"]);
// comparison.workers, comparison.comparisonFields
```

### marketplace.search(query, filters?)

Search the marketplace with faceted results.

```javascript
const results = await client.marketplace.search("compliance", {
  vertical: "aviation",
  sort: "price_asc",
});
```

### marketplace.featured()

Get curated featured worker lists.

```javascript
const { trending, new: newest, popular } = await client.marketplace.featured();
```

### marketplace.categories()

Browse verticals and suites with counts.

```javascript
const { verticals, suites, totalLive } = await client.marketplace.categories();
```

### vault.getSession()

Get the current user's vault session. Requires authentication.

```javascript
const { session } = await client.vault.getSession();
```

## Error Handling

```javascript
import { TitleAppError, AuthenticationError, RateLimitError, NotFoundError } from "@titleapp/sdk";

try {
  await client.workers.get("nonexistent");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Worker not found");
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${err.retryAfter}`);
  } else if (err instanceof AuthenticationError) {
    console.log("Need to authenticate first");
  }
}
```

## Configuration

```javascript
const client = new TitleApp({
  apiKey: "ta_xxx",              // API key for public API
  token: "firebase-id-token",    // Firebase auth token
  baseUrl: "https://custom.api", // Custom API URL
  retries: 3,                    // Max retry attempts (default: 3)
});
```

The SDK automatically retries on 5xx errors and 429 (rate limited) with exponential backoff.

## License

MIT
