# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Other

- The README is now also available in German; issue and pull request templates and the security and contributing notes are bilingual.

## [2.1.0] - 2026-10-24

### Fixed

- Storytel outages are no longer silent: API errors and timeouts now return HTTP 503 instead of an empty `{ matches: [] }`. The `StorytelApiError` class the server relied on had been lost in a merge, so the 503 branch could never trigger.
- Transient Storytel HTTP 5xx/network errors are retried once (observed live during this release).
- `limit=abc` returned an empty result list; non-numeric limits are now rejected with 400, invalid internal values fall back to `DEFAULT_LIMIT`.
- Cache stored results already cut to the requesting `limit`, so a later request with a higher limit got too few results. The full match list is now cached and sliced per request (cache keys versioned with `v2:`, old entries dropped on startup).
- Cache entries older than `CACHE_EVICTION_DAYS` are ignored on read, not only evicted at startup — long-running containers no longer serve months-old data.
- `subtitle: null` / `series: null` are omitted from responses like other empty fields.

### Added

- `isbn` query parameter (sent by Audiobookshelf): exact ISBN hits are ranked first.
- Test suite (`npm test`, `node:test`) running against the live Storytel API; CI runs it before building the image.
- Docker `HEALTHCHECK`, `.dockerignore`, and Dependabot config (grouped npm, GitHub Actions and Docker updates).

### Changed

- Default `AXIOS_TIMEOUT_MS` lowered from 15000 to 5000 — Audiobookshelf aborts provider requests after 10s, so a 15s timeout could never produce a useful answer.
- Cover URLs use `www.storytel.com` directly (saves one redirect).
- Container runs `node` directly instead of `npm start`, so SIGTERM reaches the graceful-shutdown handler; `npm ci --omit=dev` replaces the deprecated `npm install --production`.
- Search routes share one handler; title-cleanup regexes are compiled once at module load instead of per book.
- `validateQuery`: explicit `typeof` string guards for CodeQL data-flow (no behavioral change).
- Removed unused `setLocale()` and the obsolete `version` key in `docker-compose.yml`.

### Security

- Dependency updates resolving all open `npm audit` findings (1 critical, 4 high, 2 moderate): `axios` 1.20.0, `express` 4.22.3 (`proxy-addr` 2.0.8, `qs` 6.16.1, `body-parser` 1.20.9), `follow-redirects` 1.16.1, `brace-expansion` 5.0.12; also `better-sqlite3` 12.11.1, `pino` 10.4.0. Supersedes Dependabot PRs #17, #18, #19.

## [2.0.3] - 2026-07-31

### Security

Fixes for all four findings from the first CodeQL scan (enabled in 2.0.2):

- Reject non-string query parameters (`?query=a&query=b` array injection) in `validateQuery` — type confusion through parameter tampering (critical).
- `stripHtml`: strip HTML tags to a fixpoint so nested fragments like `<scr<b>ipt>` cannot survive (incomplete multi-character sanitization, high).
- `stripHtml`: decode `&amp;` last so `&amp;lt;` is no longer double-unescaped to `<` (double escaping, high).
- CI workflow: explicit least-privilege `permissions` block (`contents: read`, `packages: write`) for the GITHUB_TOKEN (medium).

## [2.0.2] - 2026-07-31

### Security

- Update `axios` 1.13.6 → 1.19.0, fixing all open Dependabot alerts against axios (DoS via unbounded decompression, SSRF-related fixes, and further advisories covered by 1.15.x–1.18.x patch releases).
- Update `express` 4.18.2 → 4.22.2 with patched transitive dependencies: `qs` 6.15.3, `body-parser` 1.20.6, `path-to-regexp` 0.1.13, `follow-redirects` 1.16.0, `form-data` 4.0.6.
- Update dev dependency chain `nodemon` 3.1.14 / `minimatch` 10.2.6 / `brace-expansion` 5.0.9 (DoS via unbounded expansion).
- Enable GitHub CodeQL code scanning (default setup) and Dependabot automated security updates for the repository.

### Added

- This changelog, following the Keep a Changelog format.

### Chore

- Ignore local runtime/tool directories (`data/`, `.claude/`, `.DS_Store`) in `.gitignore`.

## [2.0.1] - 2026-05-21

### Fixed

- `genres` field returned `null` for audiobooks in Storytel's True Crime category: Storytel returns `category.id` 22 with an empty title across all locales. Added a category-ID fallback map (22 → "True Crime"). ([#12])

## [2.0.0] - 2026-05-21

### Added

- `abridged` metadata field exposing whether an audiobook is abridged.
- Structured JSON logging with pino, request logging, and `/health` endpoint.
- Graceful shutdown on SIGTERM/SIGINT with proper resource cleanup.
- Persistent SQLite cache (`better-sqlite3`) with startup eviction of stale entries.
- In-flight request deduplication for identical concurrent searches.

### Changed

- Axios timeout reduced from 30s to 15s.
- Configuration extracted to `src/config.js`.
- Internal export shape: module now exports `{ StorytelProvider, StorytelApiError, getDbStatus, closeDb }` (no breaking change for API consumers).

### Security

- Timing-safe authentication comparison and CORS middleware.
- Stricter input validation (`validateQuery`) on all search endpoints.
- ReDoS audit of title-processing regex patterns with length guards.

## [1.6.3] - 2026-03-28

Last release before the 2.x hardening milestone. See [GitHub releases] for earlier history.

[Unreleased]: https://github.com/Revisor01/abs-storytel-provider/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/Revisor01/abs-storytel-provider/compare/v2.0.3...v2.1.0
[2.0.3]: https://github.com/Revisor01/abs-storytel-provider/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/Revisor01/abs-storytel-provider/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/Revisor01/abs-storytel-provider/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/Revisor01/abs-storytel-provider/compare/v1.6.3...v2.0.0
[1.6.3]: https://github.com/Revisor01/abs-storytel-provider/releases/tag/v1.6.3
[#12]: https://github.com/Revisor01/abs-storytel-provider/issues/12
[GitHub releases]: https://github.com/Revisor01/abs-storytel-provider/releases
