# Requirements: abs-storytel-provider Hardening

**Defined:** 2026-03-28
**Core Value:** Reliable, fast metadata search results from Storytel for Audiobookshelf — every search must return correct results without silent failures.

## v1 Requirements

### Error Handling

- [ ] **ERR-01**: API returns specific error types instead of generic 500 responses
- [ ] **ERR-02**: Search responses differentiate "no results found" from "API request failed"
- [ ] **ERR-03**: Database errors are caught gracefully with fallback to direct API call

### Security

- [ ] **SEC-01**: CORS is restricted via environment variable (configurable allowed origins)
- [ ] **SEC-02**: Auth token comparison uses timing-safe equality check
- [ ] **SEC-03**: Query parameters are validated (max length, character filtering)

### Performance

- [ ] **PERF-01**: Cache has automatic TTL-based eviction and size monitoring
- [ ] **PERF-02**: Axios timeout reduced to 10-15 seconds
- [ ] **PERF-03**: Concurrent identical queries are deduplicated (single API call, shared result)

### Operational

- [ ] **OPS-01**: `/health` endpoint returns service status and cache info
- [ ] **OPS-02**: Graceful shutdown on SIGTERM/SIGINT (drain requests, close DB)
- [ ] **OPS-03**: Structured logging with levels (info, warn, error) replaces console.log
- [ ] **OPS-04**: Magic numbers extracted to configuration constants or environment variables

### Data Quality

- [ ] **DATA-01**: Regex patterns reviewed for ReDoS vulnerability and safeguarded

## v2 Requirements

### Future Improvements

- **FUT-01**: Rate limiting per IP/token
- **FUT-02**: Prometheus metrics endpoint
- **FUT-03**: Database backup strategy

## Out of Scope

| Feature | Reason |
|---------|--------|
| Unit/integration tests | User decision — nicht nötig für persönliches Projekt |
| TypeScript migration | Zu viel Aufwand für wenig Mehrwert bei dieser Codebasis |
| Async SQLite driver | better-sqlite3 reicht für Single-User-Last |
| Circuit breaker / request queuing | Overengineering für persönliches Nutzungsszenario |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmapper) | | |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14 (pending roadmap)

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after initial definition*
