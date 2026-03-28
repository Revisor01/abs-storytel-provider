---
phase: 01-robustheit
plan: 01
subsystem: api
tags: [sqlite, better-sqlite3, error-handling, provider]

# Dependency graph
requires: []
provides:
  - StorytelApiError class — distinguishable API error type
  - searchBooks() throws StorytelApiError instead of returning silent { matches: [] }
  - DB initialization wrapped in try/catch with null fallback
  - Cache read/write guarded with null checks and try/catch
affects: [01-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StorytelApiError extends Error with name and cause — thrown on API failure"
    - "DB/cache initialized with nullable variables — service degrades gracefully on DB failure"
    - "Cache read/write wrapped in try/catch with explicit fallback logs"

key-files:
  created: []
  modified:
    - src/provider.js
    - src/server.js

key-decisions:
  - "Export changed to { StorytelProvider, StorytelApiError } — server.js updated in same plan to avoid breakage"
  - "DB init failure sets db/getCache/setCache to null — service runs without cache rather than crashing"

patterns-established:
  - "Throw named error subclasses instead of returning empty results — caller can distinguish failure from no-results"
  - "Nullable cache variables — null-guard before every cache access"

requirements-completed: [ERR-01, ERR-02, ERR-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 01 Plan 01: Error Differentiation and DB Fallback Summary

**StorytelApiError class introduced so API failures throw instead of silently returning empty results, and SQLite cache hardened with null-fallback on initialization failure**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T22:09:18Z
- **Completed:** 2026-03-28T22:11:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `StorytelApiError` class added — distinguishes API failures from genuine empty results
- `searchBooks()` now throws `StorytelApiError` instead of returning `{ matches: [] }` on failure
- DB initialization wrapped in try/catch — service runs without cache on DB corruption or missing path
- Cache read and write guarded with null checks and try/catch — DB errors don't interrupt API requests

## Task Commits

Each task was committed atomically:

1. **Task 1: StorytelApiError-Klasse einführen und searchBooks() Fehler werfen lassen** - `335fc67` (feat)
2. **Task 2: DB-Initialisierung und Cache-Zugriffe absichern (ERR-03)** - `bc23940` (feat)

**Plan metadata:** _(final docs commit)_

## Files Created/Modified
- `src/provider.js` - Added StorytelApiError class, hardened DB init and cache access
- `src/server.js` - Updated import to destructure { StorytelProvider, StorytelApiError }

## Decisions Made
- Export format changed from `module.exports = StorytelProvider` to `module.exports = { StorytelProvider, StorytelApiError }`. server.js was updated in the same plan to avoid a runtime breakage (Rule 3 deviation).
- DB init failure uses nullable variable pattern (`let db = null`) so all cache access points can null-guard without changing function signatures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated server.js import to match new module.exports format**
- **Found during:** Task 1 (StorytelApiError class + module.exports change)
- **Issue:** Changing `module.exports = StorytelProvider` to `module.exports = { StorytelProvider, StorytelApiError }` would break `const StorytelProvider = require('./provider')` in server.js
- **Fix:** Updated server.js line 4 to `const { StorytelProvider, StorytelApiError } = require('./provider')`
- **Files modified:** src/server.js
- **Verification:** `node -e "require('./src/server')"` loads without error
- **Committed in:** 335fc67 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to prevent runtime breakage. No scope creep.

## Issues Encountered
None — both tasks executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-02 can now import `StorytelApiError` and add 503 responses in server.js catch blocks
- DB fallback is in place — server starts cleanly even with corrupted or missing cache DB
