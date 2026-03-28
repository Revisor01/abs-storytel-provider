# Codebase Structure

**Analysis Date:** 2026-03-28

## Directory Layout

```
abs-storytel-provider/
├── src/                    # Application source code
│   ├── server.js          # Express HTTP server and route definitions
│   └── provider.js        # StorytelProvider class with search and formatting logic
├── data/                  # Runtime data directory
│   └── cache.db           # SQLite persistent cache database
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
│       └── docker-build-deploy.yml
├── Dockerfile             # Container image definition
├── docker-compose.yml     # Local development container orchestration
├── package.json           # Node.js dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── .gitignore             # Git ignore patterns
├── CLAUDE.md              # Project development guidelines
├── LICENSE                # Apache 2.0 license
└── README.md              # Project documentation
```

## Directory Purposes

**src/:**
- Purpose: All application source code
- Contains: JavaScript modules for HTTP server and data processing
- Key files: `server.js` (entry point), `provider.js` (business logic)

**data/:**
- Purpose: Runtime data storage
- Contains: SQLite database file for search result caching
- Key files: `cache.db` (persistent cache)
- Generated: Yes (created at runtime if not exists)
- Committed: No (git ignored)

**.github/workflows/:**
- Purpose: Continuous integration and deployment pipelines
- Contains: GitHub Actions workflow definitions
- Key files: `docker-build-deploy.yml` (automated Docker build on push/tag)

**root:**
- Purpose: Project configuration and documentation
- Contains: Package manifests, Docker definitions, license, README
- Key files: `package.json` (dependencies), `Dockerfile`, `docker-compose.yml`

## Key File Locations

**Entry Points:**
- `src/server.js`: HTTP server entry point (specified in package.json main field)
  - Command: `npm start` or `node src/server.js`
  - Initializes: Express app, middleware, routes, port listener

**Configuration:**
- `package.json`: Node.js project metadata and script definitions
- `.env`: Environment variables (not checked in)
  - Required vars: `PORT` (default 3000), `AUTH` (optional)
  - Optional vars: `CACHE_DB` (default `data/cache.db`)
- `Dockerfile`: Production container image with node:22-alpine base
- `docker-compose.yml`: Local development setup with volume mounts

**Core Logic:**
- `src/provider.js`: StorytelProvider class (462 lines)
  - Storytel API integration
  - Metadata formatting with language-specific patterns
  - Cache management
  - Search orchestration

- `src/server.js`: Express HTTP routes (110 lines)
  - Three search endpoints with type filtering
  - Middleware: CORS, auth, region validation, request logging
  - Error handling and response formatting

**Testing:**
- No test framework configured
- No test files present

## Naming Conventions

**Files:**
- Snake case for Node.js files: `server.js`, `provider.js`
- Upper case for config/docs: `Dockerfile`, `LICENSE`, `README.md`, `CLAUDE.md`
- YAML for container configs: `docker-compose.yml`

**Directories:**
- Lowercase plural for source: `src/`
- Lowercase singular for data: `data/`
- Dot-prefixed for hidden configs: `.github/`, `.gitignore`

**Functions:**
- Camel case: `searchBooks()`, `formatBookMetadata()`, `ensureString()`, `checkAuth()`
- Prefix middleware with verb: `checkAuth`, `validateRegion`

**Variables:**
- Camel case: `formattedQuery`, `cacheKey`, `searchQuery`, `maxResults`
- Constants all caps: `PORT` (environment), `AUTH` (environment)
- Temporary loop vars: single letter `b` for book, `s` for series, `t` for tag

**Types/Classes:**
- Pascal case: `StorytelProvider`
- Database: `better-sqlite3` variable named `db`

**Database:**
- Snake case for tables: `search_cache`
- Snake case for columns: `cache_key`, `response`, `created_at`

## Where to Add New Code

**New Feature (Search Enhancement):**
- Primary code: `src/provider.js` (new methods on StorytelProvider class)
- Server routes: `src/server.js` (new endpoints if needed)
- Example: Adding author biography fetching would go in StorytelProvider

**New Endpoint:**
- Route definition: `src/server.js` (add app.get() route)
- Business logic: `src/provider.js` (add public method)
- Validation: Add validateRegion and checkAuth middleware to new route
- Example: `/:region/author/search` would use existing provider.searchBooks() or new method

**New Processing/Formatting:**
- Static helper methods: `src/provider.js` (utility methods in StorytelProvider)
- Example: `upgradeCoverUrl()`, `stripHtml()`, `ensureString()` patterns
- Keep processing methods on provider class for code organization

**Environment Configuration:**
- Variables: Use `process.env.VARIABLE_NAME` with defaults
- Location: Define in route handlers or provider constructor
- Default fallbacks: PORT=3000, CACHE_DB=data/cache.db

**Cache Enhancement:**
- Schema changes: Modify SQL CREATE TABLE in `src/provider.js` (lines 14-20)
- Query changes: Update prepared statements (getCache, setCache on lines 25-26)
- TTL logic: Currently handled by application (no expiry in DB), change in searchBooks() logic

**Error Handling:**
- Server errors: Catch in try-catch in route handlers, return 500 + error message
- Provider errors: Return graceful defaults (empty matches array)
- Validation errors: Return 400 with descriptive error message in route middleware

## Special Directories

**data/:**
- Purpose: Runtime cache storage
- Generated: Yes (created by SQLite at first run)
- Committed: No (git ignored)
- Volume mount: Yes (docker-compose.yml volumes mounts for persistence)

**.github/workflows/:**
- Purpose: CI/CD automation
- Generated: No (manually created)
- Committed: Yes (source controlled)
- Trigger: On push to master, tags v*.*.*, PRs, or manual workflow_dispatch

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (npm install creates it)
- Committed: No (git ignored)
- Files: Dependencies listed in package.json and locked in package-lock.json

## Import/Module Organization

**src/server.js:**
1. Core dependencies: `express`, `cors`
2. Local modules: `./provider`
3. Exports: None (direct execution)

**src/provider.js:**
1. External dependencies: `axios`, `better-sqlite3`, `path`, `fs`
2. Exports: `StorytelProvider` class as default
3. No internal module imports (self-contained)

**Dependency Flow:**
```
server.js
  ├── require('express')
  ├── require('cors')
  └── require('./provider')
        ├── require('axios')
        ├── require('better-sqlite3')
        ├── require('path')
        └── require('fs')
```

**No circular dependencies** - Clean unidirectional dependency graph.
