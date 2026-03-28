# Phase 2: Observability - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Der Service ist im Betrieb lesbar, konfigurierbar und sauber herunterfahrbar. Covers OPS-01, OPS-02, OPS-03, OPS-04, DATA-01.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from user:
- Every change must be verified against the live Storytel API
- Must remain compatible with Audiobookshelf's expected response format
- Keep dependency count low — prefer lightweight solutions (e.g. pino over winston)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server.js` — Express server, now with improved error handling from Phase 1
- `src/provider.js` — StorytelProvider with StorytelApiError, DB fallback
- Current logging: `console.log()` with ISO timestamps

### Established Patterns
- Environment variables for config (PORT, AUTH, ALLOWED_ORIGINS, CACHE_DB)
- Express middleware pattern (checkAuth, validateRegion, validateQuery)
- JSON error responses: `{ error: 'message' }`

### Integration Points
- `src/server.js`: console.log calls need structured logger
- `src/server.js`: no /health endpoint, no SIGTERM handler
- `src/provider.js`: console.log/error calls need structured logger
- Magic numbers: port 3000, limit defaults 5/20/50, timeout 30000, cache TTL

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
