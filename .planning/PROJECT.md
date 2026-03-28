# abs-storytel-provider Hardening

## What This Is

A Node.js REST API that serves as metadata provider for Audiobookshelf, bridging Audiobookshelf and Storytel's search API. Fetches and processes book/audiobook metadata with intelligent title processing and multi-region support. Deployed as Docker container on Synology NAS.

## Core Value

Reliable, fast metadata search results from Storytel for Audiobookshelf — every search must return correct results without silent failures.

## Requirements

### Validated

- ✓ Multi-region Storytel search (audiobook, book, general) — existing
- ✓ Intelligent title/subtitle extraction with 20+ language patterns — existing
- ✓ Series information extraction and formatting — existing
- ✓ Cover image URL enhancement (640x640) — existing
- ✓ SQLite caching with 10-minute TTL — existing
- ✓ Optional AUTH token authentication — existing
- ✓ Fallback search retry for diacritics/encoding issues — v1.6.0
- ✓ Unicode NFD author name normalization — v1.6.3
- ✓ Docker deployment with Node 22 Alpine — existing

### Active

- [ ] Meaningful error responses instead of generic 500s
- [ ] Differentiate "no results" from "API failed" in search responses
- [ ] Graceful database error handling with fallback to API
- [ ] CORS restriction to known origins or environment-based config
- [ ] Rate limiting and timing-safe auth comparison
- [ ] Cache cleanup strategy (TTL-based eviction, size limits)
- [ ] Reduced axios timeout (10-15s instead of 30s)
- [ ] Request deduplication for concurrent identical queries
- [ ] Input validation for query parameters (length limits, character filtering)
- [ ] Health check endpoint (`/health`)
- [ ] Graceful shutdown (SIGTERM/SIGINT handlers)
- [ ] Structured logging with log levels (replace console.log)
- [ ] Configuration constants (extract magic numbers)
- [ ] Regex safety review (ReDoS prevention)

### Out of Scope

- Unit/integration test suite — user decision: nicht nötig für dieses Projekt
- TypeScript migration — zu viel Aufwand für wenig Mehrwert
- Async SQLite driver — better-sqlite3 reicht für die Last
- Request queuing/circuit breaker — Overengineering für Single-User-Szenario

## Context

- Deployed on Synology DS920+ NAS via Docker (abs.eulogie.de)
- Single consumer: Audiobookshelf instance
- Low traffic: personal use, not a public API
- Storytel API is the only external dependency
- All changes must be verified against the real Storytel API
- Current version: v1.6.3

## Constraints

- **Verification**: Every change must be tested against the live Storytel API — no mocks
- **Downtime**: Minimal — runs as Docker container, restarts should be fast
- **Compatibility**: Must remain compatible with Audiobookshelf's expected response format
- **Dependencies**: Keep dependency count low — no large frameworks for simple improvements

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No test suite | Personal project, low traffic, real API verification preferred | — Pending |
| Keep better-sqlite3 sync | Single-user load doesn't justify async complexity | — Pending |
| Verify against real API | Mocks can diverge from actual Storytel behavior | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after initialization*
