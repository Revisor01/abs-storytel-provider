---
phase: 03-performance
plan: 02
subsystem: database
tags: [sqlite, caching, deduplication, performance]

# Dependency graph
requires:
  - phase: 02-observability
    provides: pino logger, config constants module (CACHE_DB_PATH, AXIOS_TIMEOUT_MS etc.)
  - phase: 03-performance-01
    provides: AXIOS_TIMEOUT_MS updated to 15000ms
provides:
  - SQLite cache eviction on server startup (PERF-01)
  - Request deduplication via inFlight Map for concurrent identical queries (PERF-03)
  - CACHE_EVICTION_DAYS config constant
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "inFlight Map pattern: module-level Map stores in-progress Promises, keyed by cacheKey, cleaned in finally block"
    - "TTL eviction: startup-time cleanup of SQLite rows older than configurable threshold with conditional VACUUM"

key-files:
  created: []
  modified:
    - src/config.js
    - src/provider.js

key-decisions:
  - "inFlight Map defined at module level (not class property) so all StorytelProvider instances share the same deduplication state"
  - "Eviction uses Date.now() milliseconds threshold directly matching created_at column type (INTEGER ms)"
  - "VACUUM only executed when rows were actually deleted — avoids unnecessary I/O on clean startup"

patterns-established:
  - "In-flight deduplication pattern: check Map before API call, register Promise, delete in finally"
  - "Startup eviction pattern: DELETE + conditional VACUUM + structured log at info level"

requirements-completed: [PERF-01, PERF-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 3 Plan 02: Cache Eviction and Request Deduplication Summary

**SQLite TTL eviction on startup (30-day configurable threshold) and inFlight Map deduplication preventing duplicate Storytel API calls for concurrent identical queries**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T22:49:47Z
- **Completed:** 2026-03-28T22:51:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `CACHE_EVICTION_DAYS` constant to `config.js` (default 30, overridable via env var)
- Cache entries older than 30 days are deleted on every server startup; VACUUM is run only if rows were removed
- Concurrent identical search requests now share a single in-flight Promise — the second caller receives the same result without triggering a second Storytel API call
- `finally` block guarantees `inFlight` Map cleanup regardless of success or error

## Task Commits

Each task was committed atomically:

1. **Task 1: CACHE_EVICTION_DAYS Konstante in config.js** - `e301461` (feat)
2. **Task 2: Cache-Eviction beim DB-Init und Request-Deduplication in searchBooks** - `b98c4e4` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/config.js` - Added `CACHE_EVICTION_DAYS: parseInt(process.env.CACHE_EVICTION_DAYS || '30', 10)`
- `src/provider.js` - Added eviction block in DB init try, `inFlight` Map declaration, deduplication check and async IIFE wrapper in `searchBooks()`

## Decisions Made
- `inFlight` Map is module-level (not class property) so a single shared map handles deduplication even if multiple `StorytelProvider` instances were ever created
- Eviction threshold uses milliseconds to match `created_at` column storage format directly
- VACUUM only runs when `evicted.changes > 0` to avoid unnecessary I/O on clean startups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The worktree was based on `master` commit `99c4a1f` (pre-Phase-02), missing `config.js`, `logger.js` and the updated `provider.js`. Resolved by merging `374077f` (current main HEAD) into the worktree branch before starting task execution.

## Next Phase Readiness
- Phase 03 complete — both plans executed
- Cache DB bounded in size via eviction; concurrent search load handled without redundant API calls
- Ready for production deployment / Docker rebuild

## Self-Check: PASSED

- src/config.js: FOUND
- src/provider.js: FOUND
- 03-02-SUMMARY.md: FOUND
- Commit e301461: FOUND
- Commit b98c4e4: FOUND

---
*Phase: 03-performance*
*Completed: 2026-03-28*
