---
phase: 01-robustheit
plan: 02
subsystem: server
tags: [security, cors, auth, validation, error-handling]
dependency_graph:
  requires:
    - 01-01 (StorytelApiError export from provider.js)
  provides:
    - SEC-01: CORS restriction via ALLOWED_ORIGINS env var
    - SEC-02: timing-safe auth comparison
    - SEC-03: query validation middleware
    - ERR-01/ERR-02: StorytelApiError routed to HTTP 503
  affects:
    - All three search endpoints (/:region/search, /:region/book/search, /:region/audiobook/search)
tech_stack:
  added:
    - crypto (Node.js built-in, timingSafeEqual)
  patterns:
    - CORS origin callback with ALLOWED_ORIGINS env var
    - timing-safe string comparison via Buffer + timingSafeEqual
    - Express middleware chain: checkAuth, validateRegion, validateQuery
    - instanceof error discrimination for 503 vs 500
key_files:
  modified:
    - src/server.js
decisions:
  - "CORS allows all origins when ALLOWED_ORIGINS unset (dev mode, single-user tool)"
  - "timingSafeEqual uses Buffer.alloc to pad shorter input and separate length check for full protection"
  - "validateQuery positioned after validateRegion to maintain middleware order: auth → region → query"
metrics:
  duration: 2m
  completed_date: "2026-03-28T22:14:00Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase 01 Plan 02: server.js Security Hardening Summary

**One-liner:** CORS einschränkbar via ALLOWED_ORIGINS, Auth timing-safe via crypto.timingSafeEqual, Query-Validierung blockt >200 Zeichen und Sonderzeichen, StorytelApiError gibt HTTP 503 zurück.

## What Was Built

`src/server.js` erhielt vier Sicherheits- und Robustheitsverbesserungen:

1. **CORS-Konfiguration (SEC-01):** `app.use(cors())` durch einen konfigurierbaren Origin-Callback ersetzt. Wenn `ALLOWED_ORIGINS` als kommagetrennte Liste gesetzt ist, werden nur diese Origins erlaubt. Ohne `ALLOWED_ORIGINS` funktioniert die API wie bisher (alle Origins erlaubt) — für das Single-User-Szenario korrekt.

2. **Timing-sicherer Auth-Vergleich (SEC-02):** `req.headers.authorization !== auth` (direkter String-Vergleich, timing-angreifbar) durch `crypto.timingSafeEqual` mit Buffer-Padding ersetzt. Zusätzlich separater Längen-Check, da `timingSafeEqual` nur gleich lange Buffer vergleicht.

3. **Query-Validierung (SEC-03):** Neue `validateQuery`-Middleware blockiert Anfragen mit Query-Strings über 200 Zeichen (HTTP 400) oder mit unerlaubten Sonderzeichen `<>{|}\` (HTTP 400). In alle drei Endpoint-Definitionen als drittes Middleware-Glied eingefügt.

4. **StorytelApiError als 503 (ERR-01/ERR-02):** Alle drei catch-Blöcke prüfen jetzt `instanceof StorytelApiError` und geben HTTP 503 mit `details`-Feld zurück. Andere Fehler geben weiterhin HTTP 500.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CORS konfigurierbar und Auth timing-safe | e53d6ad | src/server.js |
| 2 | Query-Validierung und StorytelApiError als 503 | 560488f | src/server.js |

## Verification Results

| Requirement | Check | Result |
|-------------|-------|--------|
| SEC-01 | `grep -n "ALLOWED_ORIGINS" src/server.js` | Gefunden (Zeilen 11-23) |
| SEC-02 | `grep -n "timingSafeEqual" src/server.js` | Gefunden (Zeile 38) |
| SEC-03 | `grep -n "validateQuery" src/server.js` | 4 Treffer (Definition + 3 Endpoints) |
| ERR-01 | `grep -n "StorytelApiError" src/server.js` | Gefunden (Import + 3 instanceof-Checks) |
| ERR-02 | `grep -n "503" src/server.js` | 3 Treffer (ein pro Endpoint) |
| Syntax | `node --check src/server.js src/provider.js` | OK |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all implementations are fully wired.

## Self-Check: PASSED
