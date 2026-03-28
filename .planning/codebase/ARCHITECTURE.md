# Architecture

**Analysis Date:** 2026-03-28

## Pattern Overview

**Overall:** Layered API Provider Pattern

**Key Characteristics:**
- Two-layer architecture: HTTP server layer and data processing layer
- External API integration with persistent caching
- Metadata normalization and transformation pipeline
- Multi-region and multi-language support with locale-aware patterns
- Stateless request handling with shared state in SQLite cache

## Layers

**Presentation Layer (HTTP API):**
- Purpose: Expose three search endpoints with region-specific routing
- Location: `src/server.js`
- Contains: Express routes, request validation, middleware
- Depends on: StorytelProvider class, environment configuration
- Used by: Audiobookshelf (external consumer)

**Data Processing Layer (Provider):**
- Purpose: Orchestrate Storytel API calls, cache management, and metadata transformation
- Location: `src/provider.js`
- Contains: StorytelProvider class with search logic, formatting, caching
- Depends on: Storytel API, SQLite database
- Used by: HTTP server routes

**Persistence Layer (Cache):**
- Purpose: Reduce API calls through 10-minute TTL caching
- Location: `data/cache.db` (SQLite database)
- Contains: Search cache table with key, response, and created_at
- Depends on: better-sqlite3 driver
- Used by: StorytelProvider for cache lookups/writes

## Data Flow

**Search Request Flow:**

1. HTTP Request arrives at `/:region/search`, `/:region/book/search`, or `/:region/audiobook/search`
2. Middleware validates region parameter and checks authorization (if AUTH env var set)
3. Request parameters (query, title, author, limit) extracted and normalized
4. StorytelProvider.searchBooks() called with normalized query and type filter
5. Cache lookup in SQLite using cache key format: `{query}-{locale}-{type}`
6. If cache hit: return cached JSON response
7. If cache miss:
   - Storytel API called with formatted query and request_locale
   - Raw search results processed via formatBookMetadata() for each book
   - Results sorted by author relevance if author parameter provided
   - Limited to maxResults (1-50, default 5 or 20 depending on endpoint)
   - Non-empty results written to SQLite cache
8. Response formatted as `{ matches: [...metadata], stats: {...} }` (stats only on /audiobook/)
9. JSON returned to client

**State Management:**
- Cache state: Persistent SQLite database with WAL mode enabled
- Request state: Stateless (no session state maintained)
- Provider state: Single shared StorytelProvider instance per server instance
- Locale state: Set per-provider but not actively used in current implementation

## Key Abstractions

**StorytelProvider:**
- Purpose: Encapsulate all Storytel API interactions and metadata processing
- Examples: `src/provider.js` (entire class)
- Pattern: Singleton instance created once on server startup and reused for all requests

**Metadata Formatting Pipeline:**
- Purpose: Transform raw Storytel API responses into standardized Audiobookshelf metadata format
- Examples: `formatBookMetadata()` method (lines 129-377 of `src/provider.js`)
- Pattern: Multi-stage transformation with language-specific regex patterns applied sequentially

**Language-Specific Title Processing:**
- Purpose: Extract subtitles and remove series/volume information in 20+ languages
- Examples: Patterns for German (Folge, Band, Teil), Spanish (Episodio, Volumen), French (Épisode, Tome), etc.
- Pattern: Comprehensive regex arrays (lines 169-268) applied in order to clean titles

**Cache Key Generation:**
- Purpose: Create deterministic cache keys for lookup consistency
- Examples: Format `{formattedQuery}-{locale}-{type}`
- Pattern: Simple concatenation of search parameters with delimiter

## Entry Points

**HTTP Server:**
- Location: `src/server.js` (lines 1-110)
- Triggers: npm start or nodemon dev
- Responsibilities: Initialize Express app, configure middleware, register routes, listen on PORT

**Search Endpoints (3 routes):**
- `/:region/search` - General search across all media types (audiobooks + ebooks)
  - Returns: `{ matches: [metadata...] }`
- `/:region/book/search` - E-book only search, filters out audiobooks
  - Returns: `{ matches: [metadata...] }`
- `/:region/audiobook/search` - Audiobook only search with enhanced statistics
  - Returns: `{ matches: [metadata...], stats: { total, withNarrator, averageDuration } }`

**Startup Initialization:**
- Exposes `data/cache.db` SQLite database creation
- Creates search_cache table if not exists
- Cleans up empty cache entries from previous versions
- Configures WAL pragma for better concurrent access

## Error Handling

**Strategy:** Fail-safe with graceful degradation

**Patterns:**
- Invalid region/query: Return 400 JSON error before API call
- Missing authentication: Return 401 JSON error
- API timeouts: Catch axios timeout (30 second limit), log error, return empty matches array
- API errors: Return empty matches array `{ matches: [] }` instead of error response
- Cache errors: Gracefully skip caching, still return results from API
- Metadata formatting: Return null from formatBookMetadata() if no valid ebook or audiobook found for requested type
- Request logging: All incoming requests logged with timestamp, method, URL, and query params (line 30-33)

## Cross-Cutting Concerns

**Logging:** Console.log used throughout
- Request logging: Timestamp, method, URL, query string
- Cache hits/misses: `[cache] HIT/WRITE` prefixed logs
- API retries: Log retry attempts without author
- Error logging: Prefixed with console.error

**Validation:** Multi-layer approach
- Region parameter: Required, validated in middleware
- Query parameter: Required (either query or title field), checked before API call
- Author parameter: Optional, used for relevance sorting
- Limit parameter: Optional, parsed to int, clamped 1-50

**Authentication:** Optional header-based
- If AUTH env var set: Requires Authorization header matching exact value
- If AUTH not set: No authentication required
- Checked in checkAuth middleware before route execution

**Caching Strategy:**
- TTL: 10 minutes via application logic (cache never expires in SQLite, only in memory via node-cache if used)
- Key: Deterministic based on query, locale, and type
- Non-empty requirement: Only cache results with at least 1 match
- Persistent: SQLite database survives server restarts
- Manual cleanup: Empty result sets cleaned on startup

**Cover Image Enhancement:**
- Original: Storytel serves images at 320x320 or 1200x1200
- Processed: Upgraded to 1200x1200 resolution for higher quality
- Method: Regex replace of dimension pattern in URL

**Series Information Handling:**
- Extraction: Series name taken from book.series[0].name
- Subtitle generation: Formatted as "Series Name Number"
- Removal from title: Intelligent pattern matching to avoid removing series names that are actual titles
- Fallback behavior: If title becomes only a number/label after processing, swap with subtitle
