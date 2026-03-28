# Phase 3: Performance - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Unnecessary load on the Storytel API is eliminated and response latency is reduced. Covers PERF-01, PERF-02, PERF-03.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

Key constraints from user:
- Every change must be verified against the live Storytel API
- Must remain compatible with Audiobookshelf's expected response format
- Keep dependency count low

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config.js` — centralized constants, env var overrides (from Phase 2)
- `src/logger.js` — pino structured logger (from Phase 2)
- `src/provider.js` — StorytelProvider with SQLite cache, StorytelApiError
- better-sqlite3 with WAL mode, getCache/setCache prepared statements

### Established Patterns
- Config constants via src/config.js
- Structured logging via pino
- SQLite cache with cache_key, response, created_at columns
- Axios HTTP client with configurable timeout

### Integration Points
- `src/provider.js`: cache eviction logic needed (currently no TTL enforcement beyond initial cleanup)
- `src/provider.js`: axios timeout currently in config.js (AXIOS_TIMEOUT_MS)
- `src/provider.js`: searchBooks() — concurrent identical queries need deduplication via in-flight promise map

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
