# External Integrations

**Analysis Date:** 2026-03-28

## APIs & External Services

**Storytel API:**
- Storytel Search API - Metadata provider for books and audiobooks
  - Endpoint: `https://www.storytel.com/api/search.action`
  - SDK/Client: axios (raw HTTP via `src/provider.js` `fetchFromApi()` method)
  - Auth: None (public API, no authentication required)
  - Queried with parameters: `request_locale` (region), `q` (search query)
  - Returns: Complete metadata including book/ebook/audiobook data, covers, narrators, series info
  - Rate limiting: Not documented; default 5 results returned to reduce API load
  - User-Agent: Browser user-agent required (Chrome 131.0.0.0 on Windows)
  - Timeout: 30 seconds per request

**Audiobookshelf Integration:**
- Target consumer of this provider API
- Expected metadata format: Defined by Audiobookshelf custom metadata provider interface
- No direct API calls to Audiobookshelf; provider serves data to Audiobookshelf instances

## Data Storage

**Databases:**
- SQLite (better-sqlite3)
  - Connection: File-based at `data/cache.db` or custom `CACHE_DB` path
  - Client: better-sqlite3 native bindings
  - Purpose: Search result caching (10-minute TTL conceptually, but actually TTL is not enforced in current implementation)
  - Schema: Single table `search_cache(cache_key TEXT PRIMARY KEY, response TEXT, created_at INTEGER)`
  - WAL (Write-Ahead Logging) enabled for concurrent reads
  - No cleanup mechanism for expired entries (manual cleanup in migrations)

**File Storage:**
- Local filesystem only
  - SQLite database file: `./data/cache.db` (relative to project root, or `$CACHE_DB`)
  - Dockerfile creates `/app/data` directory with `RUN mkdir -p /app/data`
  - Docker volume: `./data:/app/data` mounts host directory for persistence

**Caching:**
- SQLite persistent cache (see Databases section)
- Cache key format: `{searchQuery}-{locale}-{type}` (e.g., `harry+potter-en-audiobook`)
- Cache storage: Only non-empty results cached (empty results excluded)
- Cache invalidation: Manual via database cleanup (see cleanup in `src/provider.js` line 23)

## Authentication & Identity

**Auth Provider:**
- Custom token-based authentication (optional)
- Implementation: `checkAuth` middleware in `src/server.js` (lines 14-19)
  - Checks `Authorization` request header against `AUTH` environment variable
  - Returns 401 Unauthorized if AUTH is set but header doesn't match
  - If AUTH not set, endpoint is public (no authentication required)
  - Simple string comparison (no JWT or OAuth)

**Storytel API:**
- No authentication required (public search endpoint)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, DataDog, etc.)

**Logs:**
- Console logging approach
  - Request logging: All incoming requests logged with timestamp, method, URL, query params (lines 30-33 `src/server.js`)
  - Cache hits/misses: Logged with `[cache] HIT` / `[cache] WRITE` prefixes in `src/provider.js`
  - Search results count logged for debugging
  - Errors logged to console with `console.error()`
  - No structured logging or log aggregation

## CI/CD & Deployment

**Hosting:**
- Docker container deployment
- Network: External `abs_network` (defined in `docker-compose.yml`)
- Container restart: `unless-stopped` policy
- Port mapping: 3000:3000

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, Jenkins, etc.)

## Environment Configuration

**Required env vars:**
- None strictly required; all have sensible defaults
- `PORT` - Optional (default: 3000)
- `AUTH` - Optional (omit for public access)
- `CACHE_DB` - Optional (default: `data/cache.db`)

**Secrets location:**
- No secrets stored in repository
- AUTH token (if needed) must be provided via environment variable at runtime
- No `.env` files committed to repository

## Webhooks & Callbacks

**Incoming:**
- None (provider is request-response only)

**Outgoing:**
- None (only outbound calls are to Storytel API)

---

*Integration audit: 2026-03-28*
