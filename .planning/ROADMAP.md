# Roadmap: abs-storytel-provider Hardening

## Overview

Three phases harden an existing, working metadata provider: first making failures visible and safe, then making the service observable and configurable, then eliminating unnecessary load and latency. Every phase is verifiable against the live Storytel API.

## Phases

- [ ] **Phase 1: Robustheit** - Fehlerbehandlung und Sicherheit: korrekte Fehlermeldungen, DB-Fallback, Input-Validierung, sichere Auth
- [ ] **Phase 2: Observability** - Betrieb sichtbar machen: strukturiertes Logging, Health-Endpoint, Graceful Shutdown, Config-Konstanten, Regex-Safety
- [ ] **Phase 3: Performance** - Unnötige Last eliminieren: Cache-Eviction, Timeout-Reduktion, Request-Deduplication

## Phase Details

### Phase 1: Robustheit
**Goal**: Fehler sind sichtbar, sicher und behandelt — kein Silent Failure, keine offensichtlichen Sicherheitslücken
**Depends on**: Nothing (first phase)
**Requirements**: ERR-01, ERR-02, ERR-03, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Eine fehlgeschlagene Storytel-API-Anfrage liefert eine unterscheidbare Fehlerantwort (kein leeres `matches: []` das wie "kein Ergebnis" aussieht)
  2. Ein Datenbankfehler (z. B. korrupte DB) bricht die Suche nicht ab — der Service liefert trotzdem Ergebnisse direkt von der API
  3. Eine Suchanfrage mit mehr als 200 Zeichen oder unerlaubten Sonderzeichen wird mit 400 abgewiesen, bevor sie die Storytel API erreicht
  4. CORS-Ursprünge sind über `ALLOWED_ORIGINS` env var konfigurierbar (kein wildcard `*` im Default)
  5. Auth-Token-Vergleich ist timing-safe (kein direkter String-Vergleich)
**Plans**: TBD

### Phase 2: Observability
**Goal**: Der Service ist im Betrieb lesbar, konfigurierbar und sauber herunterfahrbar
**Depends on**: Phase 1
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, DATA-01
**Success Criteria** (what must be TRUE):
  1. `GET /health` antwortet mit HTTP 200 und gibt Service-Status sowie Cache-Größe zurück
  2. Log-Ausgaben haben ein Level (`info`, `warn`, `error`) und einen strukturierten Kontext — kein nacktes `console.log`
  3. `SIGTERM` beendet den Server sauber: laufende Anfragen werden abgeschlossen, die DB wird geschlossen
  4. Alle Magic Numbers (Timeout, Default-Limit, Max-Limit) sind als benannte Konstanten oder env vars definiert
  5. Regex-Patterns sind auf ReDoS-Anfälligkeit geprüft und ggf. abgesichert
**Plans**: TBD
**UI hint**: no

### Phase 3: Performance
**Goal**: Unnecessary load on the Storytel API is eliminated and response latency is reduced
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Der SQLite-Cache hat eine automatische Eviction: Einträge älter als 30 Tage werden beim Start bereinigt und ein Vacuum ausgeführt
  2. Der Axios-Timeout für Storytel-Anfragen beträgt maximal 15 Sekunden (messbar im Log)
  3. Zwei gleichzeitige identische Suchanfragen lösen nur einen einzigen Storytel-API-Call aus — das zweite Request teilt das Ergebnis des ersten
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Robustheit | 0/? | Not started | - |
| 2. Observability | 0/? | Not started | - |
| 3. Performance | 0/? | Not started | - |
