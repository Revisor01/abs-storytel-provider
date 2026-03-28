# Codebase Concerns

**Analysis Date:** 2026-03-28

## Error Handling & Resilience

**Vague HTTP Error Responses:**
- Issue: Generic 500 errors mask real problems. All exceptions in search endpoints catch and return `{ error: 'Internal server error' }` without details about what failed.
- Files: `src/server.js` (lines 51-54, 71-74, 103-106)
- Impact: Makes debugging difficult. Callers (Audiobookshelf) cannot distinguish between network failures, API rate limits, malformed queries, or server bugs.
- Fix approach: Implement specific error types and return more meaningful error messages. Log full error stack to console, return client-safe error type in response.

**Silent API Failures:**
- Issue: Storytel API errors (timeouts, rate limits, 403/404) catch all exceptions and return empty matches with `{ matches: [] }` (line 460 in `src/provider.js`). No retry logic or backoff strategy.
- Files: `src/provider.js` (lines 418-461)
- Impact: User cannot tell if search found nothing or if API is down. Repeated requests during outages cause unnecessary Storytel load.
- Fix approach: Differentiate between "no results" and "API failed". Implement exponential backoff for retries. Cache failed requests differently than successful ones.

**Unhandled Database Errors:**
- Issue: SQLite operations (`getCache`, `setCache`) run synchronously without error handling. If database is corrupted or disk is full, entire service crashes.
- Files: `src/provider.js` (lines 12-26, 412-416, 453)
- Impact: Container restart required on database corruption. No graceful fallback.
- Fix approach: Wrap cache operations in try-catch. Fall through to API call if cache fails.

## Security Concerns

**Query Injection via URL Parameters:**
- Issue: User-provided `query` and `author` parameters are passed directly to Storytel API after basic string replacement (line 406: `searchQuery.replace(/\s+/g, '+')`). No validation beyond checking existence.
- Files: `src/server.js` (lines 40-41, 59-60, 78-79), `src/provider.js` (line 404-406)
- Impact: Malicious queries could exploit Storytel API or cause unexpected behavior. XSS if response is echoed without sanitization.
- Fix approach: Implement query length limits (e.g., max 200 chars). Add character whitelist or reject special characters. Sanitize before use.

**CORS Enabled for All Origins:**
- Issue: `app.use(cors())` allows any origin to make requests without restriction (line 10 in `src/server.js`).
- Files: `src/server.js` (line 10)
- Impact: If AUTH is not configured, service is open to public abuse. Users can spam searches to your Storytel API quota from any website.
- Fix approach: Restrict CORS to known origins (Audiobookshelf hostname). Make CORS configuration environment-based.

**Weak Authentication:**
- Issue: AUTH token is compared as plain string (line 15 in `src/server.js`). No rate limiting, timing attack protection, or token rotation mechanism.
- Files: `src/server.js` (lines 14-19)
- Impact: Token exposed in process logs and environment variables. If compromised, no way to revoke without restart. Brute force protection missing.
- Fix approach: Hash AUTH token and compare hashes. Implement rate limiting per IP. Add request logging that masks sensitive headers.

## Performance & Scaling

**Unbounded Cache Growth:**
- Issue: SQLite cache has no TTL, size limit, or cleanup strategy. Every unique query is stored permanently.
- Files: `src/provider.js` (lines 6-26, 453-454)
- Impact: Database grows indefinitely. Query performance degrades over months/years. Disk space consumed by stale data.
- Fix approach: Implement age-based cleanup (delete entries > 30 days old). Add vacuum command on startup. Monitor cache size.

**Synchronous Database Reads/Writes Block Event Loop:**
- Issue: better-sqlite3 is synchronous. Cache lookups and writes block the entire Node.js process.
- Files: `src/provider.js` (lines 25-26, 412-416, 453)
- Impact: Under high concurrent load, database operations will cause response latency spikes. Multiple requests for different queries are serialized.
- Fix approach: Consider async wrapper library or move to async SQLite variant for high-traffic deployments. Profile under production load.

**Timeout Too Long:**
- Issue: Axios timeout is 30 seconds (line 392 in `src/provider.js`). Long-running requests tie up resources.
- Files: `src/provider.js` (line 392)
- Impact: If Storytel API is slow, responses are delayed and Audiobookshelf's search modal hangs.
- Fix approach: Reduce timeout to 10-15 seconds. Implement request queuing to prevent cascade failures.

**No Request Deduplication:**
- Issue: Same query from multiple concurrent requests triggers multiple Storytel API calls instead of sharing results.
- Files: `src/provider.js` (lines 412-430)
- Impact: Unnecessary Storytel API load during concurrent searches. Wastes bandwidth and API quota.
- Fix approach: Implement request deduplication with promise-based locking. Use cache immediately while fetching in background.

## Data Quality & Processing

**Regex Patterns Without Input Validation:**
- Issue: `formatBookMetadata` applies 40+ regex patterns (lines 169-268) to user-provided data. No bounds on pattern complexity.
- Files: `src/provider.js` (lines 169-325)
- Impact: ReDoS vulnerability possible if Storytel returns pathological strings. Slow processing of malformed metadata.
- Fix approach: Add regex timeout. Test patterns with OWASP regex fuzzer. Consider hardcoding strings instead of regex where possible.

**Hardcoded Language Patterns May Become Stale:**
- Issue: Extensive list of language-specific patterns (lines 169-247) must be manually updated when Storytel changes title formats.
- Files: `src/provider.js` (lines 169-247)
- Impact: New Storytel regions or title formats not recognized. Series/subtitle extraction fails silently.
- Fix approach: Log when title cleanup removes content. Add observability to detect pattern mismatches. Implement feedback loop from Audiobookshelf.

**Limited Metadata Validation:**
- Issue: No validation that `formatBookMetadata` returns sensible data. Empty strings become included fields. No null checks on deeply nested Storytel API response.
- Files: `src/provider.js` (lines 129-377)
- Impact: Audiobookshelf receives metadata with empty titles, missing required fields. Could cause UI errors.
- Fix approach: Implement schema validation (e.g., Zod or JSON Schema). Enforce minimum title length. Provide fallback values.

## Testing & Coverage

**No Test Suite:**
- Issue: No unit, integration, or end-to-end tests configured. Package.json has no test script.
- Files: `package.json` (no test script)
- Impact: Refactors risk breaking functionality silently. Regressions in title processing, caching, or error handling undetected.
- Fix approach: Add Jest/Vitest. Write tests for `formatBookMetadata` with real Storytel API responses. Test error scenarios.

**No Type Safety:**
- Issue: Vanilla JavaScript with no TypeScript. Function parameters lack documentation about expected types/shapes.
- Files: `src/provider.js`, `src/server.js`
- Impact: Easy to pass wrong types. IDE autocomplete doesn't help. Debugging harder.
- Fix approach: Add TypeScript or JSDoc type hints. Use TypeScript for new features.

## Operational & Deployment

**Single Point of Failure:**
- Issue: No health check endpoint. Container restart loses cache. No database backup strategy.
- Files: `src/server.js` (no health endpoint)
- Impact: Load balancers cannot detect hung instances. Data loss if container crashes before cache persists.
- Fix approach: Add `/health` endpoint. Implement graceful shutdown to flush pending cache writes. Add pre-start database integrity check.

**No Logging Framework:**
- Issue: Logging uses `console.log()` directly. Timestamps, log levels, structured format missing. Not suitable for production monitoring.
- Files: `src/server.js` (lines 30-32), `src/provider.js` (lines 414, 421, 426, 454, 459)
- Impact: Hard to aggregate logs across multiple container instances. Cannot filter by severity.
- Fix approach: Use Winston or Pino. Add request IDs for tracing. Log structured JSON for easier parsing.

**Database Location Hardcoded in Docker:**
- Issue: Database path is `./data/cache.db` relative to working directory. If WORKDIR changes or volume not mounted, cache silently fails.
- Files: `src/provider.js` (line 7)
- Impact: Cache doesn't persist if volume mount is misconfigured. No warning to user.
- Fix approach: Validate on startup that CACHE_DB path is writable. Log cache path to console. Provide helpful error if path doesn't exist.

**No Graceful Shutdown:**
- Issue: No signal handlers for SIGTERM/SIGINT. Express server can be killed mid-request.
- Files: `src/server.js` (no shutdown handler)
- Impact: In-flight requests interrupted. Cache writes lost. Database corruption possible.
- Fix approach: Add SIGTERM handler that stops accepting new requests, waits for pending requests, then closes database before exit.

## Dependency & Maintenance

**Indirect Dependencies at Risk:**
- Issue: `better-sqlite3` version 12.6.2 is pinned. Large transitive dependency tree through axios/node ecosystem. No audit before deployment.
- Files: `package.json`, `package-lock.json`
- Impact: Security vulnerabilities in transitive deps not caught. Version conflicts when updating.
- Fix approach: Run `npm audit` in CI. Use exact versions in lock file. Monitor CVE feeds.

**Node.js Version Pinned to 22:**
- Issue: Dockerfile uses `node:22-alpine` without patch version. No constraint on where minor upgrades happen.
- Files: `Dockerfile` (line 1)
- Impact: Breaking changes in Node.js minor versions could surface unexpectedly.
- Fix approach: Pin to specific Node.js LTS version (e.g., `node:20.10-alpine`).

## Maintainability Issues

**Complex Subtitle Extraction Logic:**
- Issue: Lines 305-317 in `src/provider.js` contain intricate logic to swap numeric titles with subtitles. Multi-level regex patterns hard to understand.
- Files: `src/provider.js` (lines 305-317)
- Impact: Difficult to add region-specific rules or debug title extraction. Easy to break with changes.
- Fix approach: Extract into separate function with clear comments. Add test cases for edge cases.

**Magic Numbers and Strings:**
- Issue: HTTP status codes (401, 400, 500) hardcoded. Port 3000, 5-result default, 20-result new default scattered across code.
- Files: `src/server.js` (lines 16, 24, 53, 72, 105), `src/provider.js` (line 407)
- Impact: Configuration changes require hunting through code. Risk of inconsistency.
- Fix approach: Move to config constants. Use environment variables for limits.

---

*Concerns audit: 2026-03-28*
