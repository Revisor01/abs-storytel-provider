# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js REST API that serves as a metadata provider for Audiobookshelf, acting as a bridge between Audiobookshelf and Storytel's API. The service fetches and processes book/audiobook metadata with intelligent title processing and multi-region support.

## Development Commands

**Start development server (with auto-reload):**
```bash
npm run dev
```

**Start production server:**
```bash
npm start
```

**Docker development:**
```bash
docker-compose up -d
```

**No testing framework is currently configured** - tests would need to be set up if needed.

## Architecture

### Core Components

**src/server.js** - Express server with three main API endpoints:
- `/:region/search` - General search (all media types)  
- `/:region/book/search` - E-book specific search (filters out audiobooks)
- `/:region/audiobook/search` - Audiobook specific search with enhanced metadata

**src/provider.js** - `StorytelProvider` class containing:
- Storytel API integration (`baseSearchUrl`) - all data comes from the search endpoint
- Metadata processing and cleanup with extensive regex patterns
- Multi-language title/series processing (20+ language patterns)
- Cover image URL enhancement (upgrades to 640x640 resolution)
- 10-minute TTL caching via node-cache

### Key Features

**Authentication**: Optional via `AUTH` environment variable, checked in `checkAuth` middleware
**Input Validation**: Region and query parameter validation in middleware
**Caching**: 10-minute cache to reduce API calls to Storytel
**Internationalization**: Extensive regex patterns for title cleanup across multiple languages/regions
**Smart Processing**: 
- Removes series information from titles and extracts to separate field
- Handles subtitle extraction
- Processes narrator, duration, and audiobook-specific metadata

### External Dependencies

**Storytel API Integration:**
- Search: `https://www.storytel.com/api/search.action` (returns all needed metadata directly)

**Audiobookshelf Integration:**
- Designed as custom metadata provider
- Returns standardized metadata format expected by Audiobookshelf

### Environment Variables

- `PORT` (default: 3000) - Server port
- `AUTH` - Optional authentication token for API access

### Development Notes

- No linting or type checking commands are currently configured
- The provider has extensive language-specific title processing regex patterns
- Cover images are automatically upgraded from 320x320 to 640x640 resolution
- Series information is intelligently extracted and formatted as "Series Name, Number"
- Maximum 5 results per search as per Storytel API limitations

<!-- GSD:project-start source:PROJECT.md -->
## Project

**abs-storytel-provider Hardening**

A Node.js REST API that serves as metadata provider for Audiobookshelf, bridging Audiobookshelf and Storytel's search API. Fetches and processes book/audiobook metadata with intelligent title processing and multi-region support. Deployed as Docker container on Synology NAS.

**Core Value:** Reliable, fast metadata search results from Storytel for Audiobookshelf — every search must return correct results without silent failures.

### Constraints

- **Verification**: Every change must be tested against the live Storytel API — no mocks
- **Downtime**: Minimal — runs as Docker container, restarts should be fast
- **Compatibility**: Must remain compatible with Audiobookshelf's expected response format
- **Dependencies**: Keep dependency count low — no large frameworks for simple improvements
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (Node.js) - Server-side API implementation in `src/server.js` and `src/provider.js`
## Runtime
- Node.js 22 (Alpine Linux base)
- Specified in `Dockerfile` as `node:22-alpine`
- npm
- Lockfile: `package-lock.json` present (v3)
## Frameworks
- Express.js 4.18.2 - HTTP API server framework
- nodemon 3.0.3 - Auto-reload during development (`npm run dev`)
- better-sqlite3 12.6.2 - Persistent SQLite cache layer
## Key Dependencies
- axios 1.13.6 - HTTP client for Storytel API requests
- express 4.18.2 - Web framework (see Frameworks section)
- better-sqlite3 12.6.2 - Local caching (see Frameworks section)
- cors 2.8.5 - CORS middleware for cross-origin API requests
## Configuration
- Configuration via environment variables:
- Region parameter passed as URL path parameter (required in middleware `validateRegion`)
- Dockerfile: Multi-stage pattern
## Platform Requirements
- Node.js 22+
- npm for dependency management
- Build tools for native modules (python3, make, g++)
- Docker with Alpine Linux support
- 3000 port available for Express server
- Writable filesystem for SQLite cache directory (`/app/data`)
- External network access to `https://www.storytel.com/api/search.action`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Lowercase with `.js` extension: `server.js`, `provider.js`
- No hyphens or underscores in file names
- One class per file when appropriate
- camelCase: `searchBooks()`, `formatBookMetadata()`, `ensureString()`
- Methods with clear action verbs: `fetch`, `format`, `search`, `split`, `strip`, `escape`, `upgrade`
- Getter-like pattern: `authorMatchScore()`
- Private convention: No underscore prefix used; all methods are public in class
- camelCase: `searchQuery`, `formattedQuery`, `maxResults`, `cacheKey`, `baseSearchUrl`
- Descriptive names: `cleanQuery`, `seriesName`, `seriesInfo`, `rawDescription`
- Constants in UPPERCASE when module-scoped: `CACHE_DB` (environment variable)
- PascalCase: `StorytelProvider`
- Clear purpose in name: indicates it's a provider/service class
- Abbreviated when context is clear: `req`, `res`, `next` (Express middleware)
- Full names in complex methods: `searchQuery`, `locale`, `type`
## Code Style
- No linting or formatting tools configured
- Consistent 4-space indentation observed throughout codebase
- Line length: No strict limit enforced, typical 80-120 characters
- No trailing semicolons required but used consistently in some sections
- Newlines: Two blank lines between major sections in classes
- Not configured: No `.eslintrc`, `.prettierrc`, or equivalent
- Code follows general Node.js best practices but not enforced
- Used inconsistently (sometimes omitted in control structures)
- Recommended: Add ESLint with semicolon rule for consistency
## Import Organization
- Relative paths used: `require('./provider')`, `require('./src/provider')`
- No path aliases configured in `package.json`
- CommonJS: `module.exports = ClassName` (not ES6 syntax)
- Single export per file
## Error Handling
- Try-catch blocks used in async methods: `searchBooks()` catches errors and returns empty results
- Error logging to console: `console.error('Search error:', error.message)`
- Graceful degradation: Returns `{ matches: [] }` on error instead of throwing
- No custom error classes defined
- Standard HTTP status codes: 400 (validation), 401 (auth), 500 (server error)
- Consistent error format: `{ error: 'Description' }` as JSON
- Error messages are user-facing and descriptive
- Input validation in Express middleware: `validateRegion()`, `checkAuth()`
- Guard clauses for null/undefined: `if (!value) return '';`
- Request logging for debugging: All requests logged with timestamp and query params
## Logging
- Timestamp format: ISO 8601 via `new Date().toISOString()`
- Log levels: `console.log()` (info), `console.error()` (errors)
- Structured logs for API calls: `[${timestamp}] ${method} ${url} query=${json}`
- Cache operations logged: `[cache] HIT for "{key}"` and `[cache] WRITE for "{key}"`
- Search operations logged: `Found ${count} books in search results`
- All incoming HTTP requests with method, URL, and query parameters
- API responses and retry attempts
- Cache hits/misses
- Error conditions with descriptive messages
- Search result counts for debugging
## Comments
- Complex regex patterns documented with example: Comments above multi-language patterns explain what they match
- Algorithm explanations: Series removal logic has detailed comments explaining edge cases
- Business logic clarification: Comments explain "only cache non-empty results" reasoning
- Configuration rationale: Comments explain "Clean up empty cache entries from previous versions"
- JSDoc used throughout for public methods with:
- Example from `src/provider.js`:
## Function Design
- Typical functions 15-50 lines
- Longer methods in `formatBookMetadata()` (~150 lines) due to complex multi-language pattern matching
- Prefer extracting helper methods for clarity
- Positional parameters used: `searchBooks(query, author = '', locale, type = 'all', limit = 20)`
- Default values via `= defaultValue` syntax
- No destructuring of parameters (traditional style)
- Maximum 4-5 parameters; use objects for more complex cases
- Consistent types: Functions return object, array, string, or number—never mixed
- Async functions return Promises
- Early returns for validation/guard clauses
- Object properties explicitly deleted if undefined: `delete metadata[key]`
## Module Design
- Single class export: `module.exports = StorytelProvider`
- No named exports in use (CommonJS)
- Middleware functions in main server file (not extracted)
- Not used; only `src/server.js` and `src/provider.js` exist
- All methods public in class (no private convention enforced)
- Class manages its own state: `baseSearchUrl`, `locale`
- Database and cache initialization at module level (singleton pattern)
## Regex Patterns
- Multi-language regex patterns grouped by region with language names
- 20+ language patterns for title cleanup
- Patterns explained with language identifiers: `// German: "Folge" (Episode)`
- Separate pattern arrays: `patterns`, `germanPatterns`, `abridgedPatterns`
- Pattern arrays suffixed with `Patterns`: `abridgedPatterns`, `germanPatterns`
- Test patterns prefixed with context: `/^.*?,\s*Aflevering\s*\d+:\s*/i` (Dutch episode)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Two-layer architecture: HTTP server layer and data processing layer
- External API integration with persistent caching
- Metadata normalization and transformation pipeline
- Multi-region and multi-language support with locale-aware patterns
- Stateless request handling with shared state in SQLite cache
## Layers
- Purpose: Expose three search endpoints with region-specific routing
- Location: `src/server.js`
- Contains: Express routes, request validation, middleware
- Depends on: StorytelProvider class, environment configuration
- Used by: Audiobookshelf (external consumer)
- Purpose: Orchestrate Storytel API calls, cache management, and metadata transformation
- Location: `src/provider.js`
- Contains: StorytelProvider class with search logic, formatting, caching
- Depends on: Storytel API, SQLite database
- Used by: HTTP server routes
- Purpose: Reduce API calls through 10-minute TTL caching
- Location: `data/cache.db` (SQLite database)
- Contains: Search cache table with key, response, and created_at
- Depends on: better-sqlite3 driver
- Used by: StorytelProvider for cache lookups/writes
## Data Flow
- Cache state: Persistent SQLite database with WAL mode enabled
- Request state: Stateless (no session state maintained)
- Provider state: Single shared StorytelProvider instance per server instance
- Locale state: Set per-provider but not actively used in current implementation
## Key Abstractions
- Purpose: Encapsulate all Storytel API interactions and metadata processing
- Examples: `src/provider.js` (entire class)
- Pattern: Singleton instance created once on server startup and reused for all requests
- Purpose: Transform raw Storytel API responses into standardized Audiobookshelf metadata format
- Examples: `formatBookMetadata()` method (lines 129-377 of `src/provider.js`)
- Pattern: Multi-stage transformation with language-specific regex patterns applied sequentially
- Purpose: Extract subtitles and remove series/volume information in 20+ languages
- Examples: Patterns for German (Folge, Band, Teil), Spanish (Episodio, Volumen), French (Épisode, Tome), etc.
- Pattern: Comprehensive regex arrays (lines 169-268) applied in order to clean titles
- Purpose: Create deterministic cache keys for lookup consistency
- Examples: Format `{formattedQuery}-{locale}-{type}`
- Pattern: Simple concatenation of search parameters with delimiter
## Entry Points
- Location: `src/server.js` (lines 1-110)
- Triggers: npm start or nodemon dev
- Responsibilities: Initialize Express app, configure middleware, register routes, listen on PORT
- `/:region/search` - General search across all media types (audiobooks + ebooks)
- `/:region/book/search` - E-book only search, filters out audiobooks
- `/:region/audiobook/search` - Audiobook only search with enhanced statistics
- Exposes `data/cache.db` SQLite database creation
- Creates search_cache table if not exists
- Cleans up empty cache entries from previous versions
- Configures WAL pragma for better concurrent access
## Error Handling
- Invalid region/query: Return 400 JSON error before API call
- Missing authentication: Return 401 JSON error
- API timeouts: Catch axios timeout (30 second limit), log error, return empty matches array
- API errors: Return empty matches array `{ matches: [] }` instead of error response
- Cache errors: Gracefully skip caching, still return results from API
- Metadata formatting: Return null from formatBookMetadata() if no valid ebook or audiobook found for requested type
- Request logging: All incoming requests logged with timestamp, method, URL, and query params (line 30-33)
## Cross-Cutting Concerns
- Request logging: Timestamp, method, URL, query string
- Cache hits/misses: `[cache] HIT/WRITE` prefixed logs
- API retries: Log retry attempts without author
- Error logging: Prefixed with console.error
- Region parameter: Required, validated in middleware
- Query parameter: Required (either query or title field), checked before API call
- Author parameter: Optional, used for relevance sorting
- Limit parameter: Optional, parsed to int, clamped 1-50
- If AUTH env var set: Requires Authorization header matching exact value
- If AUTH not set: No authentication required
- Checked in checkAuth middleware before route execution
- TTL: 10 minutes via application logic (cache never expires in SQLite, only in memory via node-cache if used)
- Key: Deterministic based on query, locale, and type
- Non-empty requirement: Only cache results with at least 1 match
- Persistent: SQLite database survives server restarts
- Manual cleanup: Empty result sets cleaned on startup
- Original: Storytel serves images at 320x320 or 1200x1200
- Processed: Upgraded to 1200x1200 resolution for higher quality
- Method: Regex replace of dimension pattern in URL
- Extraction: Series name taken from book.series[0].name
- Subtitle generation: Formatted as "Series Name Number"
- Removal from title: Intelligent pattern matching to avoid removing series names that are actual titles
- Fallback behavior: If title becomes only a number/label after processing, swap with subtitle
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
