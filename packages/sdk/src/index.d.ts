/**
 * @titleapp/sdk — TypeScript declarations
 */

// ── Errors ──

export declare class TitleAppError extends Error {
  code: string;
  status: number;
  constructor(message: string, code?: string, status?: number);
}

export declare class AuthenticationError extends TitleAppError {
  constructor(message?: string);
}

export declare class RateLimitError extends TitleAppError {
  retryAfter: string | null;
  constructor(message?: string, retryAfter?: string);
}

export declare class NotFoundError extends TitleAppError {
  constructor(message?: string);
}

// ── Types ──

export interface Worker {
  id: string;
  slug: string | null;
  name: string;
  suite: string | null;
  phase: number | null;
  type: "standalone" | "pipeline" | "composite" | "copilot";
  status: "live" | "waitlist" | "draft";
  vertical: string | null;
  price: number;
  capabilitySummary: string;
  temporalType: string;
  source: "platform" | "creator";
  forkable?: boolean;
  forkedFrom?: string;
}

export interface WorkerProfile extends Worker {
  marketplaceSlug?: string;
  headline: string;
  vault: { reads: string[]; writes: string[] };
  referrals: Array<{ event: string; routesTo: string }>;
  pricing: { monthly: number };
  mandatoryWhen: string[];
  related: Worker[];
  creatorName?: string | null;
}

export interface Facets {
  verticals: Record<string, number>;
  suites: Record<string, number>;
  types: Record<string, number>;
  priceRanges: {
    free: number;
    under_30: number;
    "30_to_59": number;
    "60_to_99": number;
    "100_plus": number;
  };
}

export interface SearchResult {
  ok: boolean;
  workers: Worker[];
  total: number;
  limit: number;
  offset: number;
  facets: Facets;
}

export interface WorkerProfileResult {
  ok: boolean;
  worker: WorkerProfile;
}

export interface FeaturedResult {
  ok: boolean;
  trending: Worker[];
  new: Worker[];
  popular: Worker[];
}

export interface CategoriesResult {
  ok: boolean;
  verticals: Array<{
    id: string;
    name: string;
    workerCount: number;
    liveCount: number;
    suites: string[];
  }>;
  suites: Record<string, number>;
  priceRanges: Facets["priceRanges"];
  totalLive: number;
  totalAll: number;
}

export interface CompareResult {
  ok: boolean;
  workers: WorkerProfile[];
  comparisonFields: string[];
}

export interface ForkOptions {
  name: string;
  ownerId: string;
  overrides?: {
    rules?: Record<string, unknown>;
    systemPrompt?: string;
    jurisdiction?: string;
    price?: 0 | 29 | 49 | 79;
  };
}

export interface ForkResult {
  ok: boolean;
  worker: Worker;
  forkedFrom: string;
}

export interface ChatResult {
  ok: boolean;
  response: string;
  sessionId: string;
}

export interface VaultSession {
  ok: boolean;
  session: Record<string, unknown>;
}

export interface VaultRecords {
  ok: boolean;
  records: Array<Record<string, unknown>>;
}

export interface SearchFilters {
  q?: string;
  vertical?: string;
  suite?: string;
  type?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "popular" | "newest";
  limit?: number;
  offset?: number;
}

export interface ChatOptions {
  sessionId?: string;
  tenantId?: string;
}

// ── Clients ──

export declare class WorkersClient {
  list(filters?: SearchFilters): Promise<SearchResult>;
  get(slugOrId: string): Promise<WorkerProfileResult>;
  chat(workerId: string, message: string, options?: ChatOptions): Promise<ChatResult>;
  compare(workerIds: string[]): Promise<CompareResult>;
  fork(workerId: string, options: ForkOptions): Promise<ForkResult>;
}

export declare class VaultClient {
  getSession(): Promise<VaultSession>;
  listRecords(filters?: { type?: string; limit?: number }): Promise<VaultRecords>;
}

export declare class MarketplaceClient {
  search(query: string, filters?: Omit<SearchFilters, "q">): Promise<SearchResult>;
  featured(): Promise<FeaturedResult>;
  categories(): Promise<CategoriesResult>;
}

// ── Main Client ──

export interface TitleAppOptions {
  apiKey?: string;
  token?: string;
  baseUrl?: string;
  retries?: number;
}

export declare class TitleApp {
  workers: WorkersClient;
  vault: VaultClient;
  marketplace: MarketplaceClient;

  constructor(options?: TitleAppOptions);
  setToken(token: string): void;
}

export default TitleApp;
