# Technology Stack

**Analysis Date:** 2026-03-28

## Languages

**Primary:**
- JavaScript (Node.js) - Server-side API implementation in `src/server.js` and `src/provider.js`

## Runtime

**Environment:**
- Node.js 22 (Alpine Linux base)
- Specified in `Dockerfile` as `node:22-alpine`

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (v3)

## Frameworks

**Core:**
- Express.js 4.18.2 - HTTP API server framework
  - Used in `src/server.js` for routing and middleware
  - Enables three main API endpoints: `/:region/search`, `/:region/book/search`, `/:region/audiobook/search`
  - CORS middleware (`cors` 2.8.5) enabled for cross-origin requests

**Development:**
- nodemon 3.0.3 - Auto-reload during development (`npm run dev`)

**Database/Caching:**
- better-sqlite3 12.6.2 - Persistent SQLite cache layer
  - Location: `src/provider.js` initializes DB at `data/cache.db` or custom `CACHE_DB` path
  - Schema: `search_cache` table with `cache_key`, `response`, `created_at` columns
  - WAL mode enabled for concurrent access
  - Caches Storytel API search results to reduce external API calls

## Key Dependencies

**Critical:**
- axios 1.13.6 - HTTP client for Storytel API requests
  - Used in `src/provider.js` `fetchFromApi()` method
  - Configured with 30-second timeout and browser-like User-Agent header

**Infrastructure:**
- express 4.18.2 - Web framework (see Frameworks section)
- better-sqlite3 12.6.2 - Local caching (see Frameworks section)
- cors 2.8.5 - CORS middleware for cross-origin API requests

## Configuration

**Environment:**
- Configuration via environment variables:
  - `PORT` (default: 3000) - Server listening port
  - `AUTH` - Optional authentication token for API access (string comparison via `Authorization` header)
  - `CACHE_DB` - Optional custom SQLite cache database path (default: `data/cache.db`)
- Region parameter passed as URL path parameter (required in middleware `validateRegion`)

**Build:**
- Dockerfile: Multi-stage pattern
  - Builds on `node:22-alpine`
  - Installs build dependencies (python3, make, g++) for native module compilation (needed by better-sqlite3)
  - Removes build tools after `npm install --production` to reduce image size
  - Exposes port 3000

## Platform Requirements

**Development:**
- Node.js 22+
- npm for dependency management
- Build tools for native modules (python3, make, g++)

**Production:**
- Docker with Alpine Linux support
- 3000 port available for Express server
- Writable filesystem for SQLite cache directory (`/app/data`)
- External network access to `https://www.storytel.com/api/search.action`

---

*Stack analysis: 2026-03-28*
