# Requirements: abs-storytel-provider Hardening

**Defined:** 2026-03-28
**Core Value:** Reliable, fast metadata search results from Storytel for Audiobookshelf — every search must return correct results without silent failures.

## v1 Requirements

### Error Handling

- [x] **ERR-01**: API returns specific error types instead of generic 500 responses
- [x] **ERR-02**: Search responses differentiate "no results found" from "API request failed"
- [x] **ERR-03**: Database errors are caught gracefully with fallback to direct API call

### Security

- [x] **SEC-01**: CORS is restricted via environment variable (configurable allowed origins)
- [x] **SEC-02**: Auth token comparison uses timing-safe equality check
- [x] **SEC-03**: Query parameters are validated (max length, character filtering)

### Performance

- [x] **PERF-01**: Cache has automatic TTL-based eviction and size monitoring
- [ ] **PERF-02**: Axios timeout reduced to 10-15 seconds
- [x] **PERF-03**: Concurrent identical queries are deduplicated (single API call, shared result)

### Operational

- [ ] **OPS-01**: `/health` endpoint returns service status and cache info
- [ ] **OPS-02**: Graceful shutdown on SIGTERM/SIGINT (drain requests, close DB)
- [x] **OPS-03**: Structured logging with levels (info, warn, error) replaces console.log
- [x] **OPS-04**: Magic numbers extracted to configuration constants or environment variables

### Data Quality

- [x] **DATA-01**: Regex patterns reviewed for ReDoS vulnerability and safeguarded

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
| ERR-01 | Phase 1 | Complete |
| ERR-02 | Phase 1 | Complete |
| ERR-03 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| OPS-01 | Phase 2 | Pending |
| OPS-02 | Phase 2 | Pending |
| OPS-03 | Phase 2 | Complete |
| OPS-04 | Phase 2 | Complete |
| DATA-01 | Phase 2 | Complete |
| PERF-01 | Phase 3 | Complete |
| PERF-02 | Phase 3 | Pending |
| PERF-03 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — traceability populated by roadmapper*
