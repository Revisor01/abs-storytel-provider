# Testing Patterns

**Analysis Date:** 2026-03-28

## Test Framework

**Runner:**
- Not configured
- No testing framework installed or configured in `package.json`
- `package.json` contains no test script (only `dev` and `start` scripts)

**Assertion Library:**
- Not applicable (no testing framework in use)

**Run Commands:**
- No test commands available
- Current commands only: `npm run dev` (nodemon) and `npm start` (production)

## Current Testing Status

**No testing framework is currently configured.** The project relies entirely on manual testing and integration verification through:
- Docker integration tests (Docker Compose setup available)
- Manual endpoint verification
- GitHub Actions CI pipeline validates Docker builds and deploys

## Test File Organization

**Current State:**
- No `.test.js` or `.spec.js` files in source code
- No `tests/` or `__tests__/` directory
- Only mock test found in `node_modules/pstree.remy/tests/index.test.js` (external dependency)

**Recommended Future Pattern:**
- Co-locate tests with source: `src/server.test.js`, `src/provider.test.js`
- Or separate directory: `tests/unit/`, `tests/integration/`

## Manual Testing Approach

**Current Testing Methods:**

**API Endpoint Testing:**
- HTTP requests made directly to running server
- Port: 3000 (development), configurable via `PORT` environment variable
- Endpoints tested: `GET /:region/search`, `GET /:region/book/search`, `GET /:region/audiobook/search`

**Docker Integration Testing:**
- `docker-compose up -d` available for local testing
- `Dockerfile` builds complete container stack
- Exposed port: 3000
- Volume: `/app/data` for persistent SQLite cache

**Request Logging for Verification:**
- All requests logged with timestamp, method, URL, and query parameters
- Cache operations logged: `[cache] HIT` / `[cache] WRITE` messages
- Search result counts logged: `Found X books in search results`
- Retry attempts logged: `Retrying without author: "query"`

## Code Coverage

**Requirements:** None enforced

**Current Coverage:**
- Core search logic: Untested programmatically
- Metadata formatting: Untested programmatically
- Title cleanup regex patterns: Untested programmatically
- Error handling paths: Partially tested via manual requests

**Critical Gaps:**
- Multi-language regex pattern matching: 20+ language patterns with no automated tests
- Series extraction and title processing: Complex logic with no test coverage
- Author matching scoring algorithm: No unit tests
- Cache persistence: No automated verification
- HTML stripping edge cases: Untested

## Testing Recommendations

**Unit Test Priority:**

1. **Provider Core Methods** (`src/provider.js`):
   ```javascript
   // Should test these critical functions:
   - formatBookMetadata(bookData, type)      // Title cleanup, series extraction
   - authorMatchScore(resultAuthor, searchAuthor)  // Author matching logic
   - stripHtml(str)                          // HTML entity decoding
   - splitGenre(genre)                       // Genre parsing
   - escapeRegex(str)                        // Regex escape logic
   - upgradeCoverUrl(url)                    // URL transformation
   ```

2. **Server Endpoints** (`src/server.js`):
   ```javascript
   // Should test:
   - /:region/search with valid/invalid queries
   - /:region/book/search filtering
   - /:region/audiobook/search with narrator stats
   - Authentication middleware (AUTH header)
   - Region validation middleware
   - Error handling (400, 401, 500 responses)
   ```

3. **Cache Layer**:
   - Persistent SQLite cache writes and reads
   - Cache key generation
   - Empty result handling (should not cache)

**Integration Test Priority:**

1. End-to-end search flow with Storytel API
2. Multi-region support (en, sv, da, de, es, etc.)
3. Type filtering (audiobook vs ebook)
4. Author filtering and relevance sorting

## Suggested Testing Stack

**For this project, recommend:**
- Framework: `jest` (mature, good Node.js support) or `vitest` (faster, modern)
- HTTP testing: `supertest` (for Express endpoints)
- Mocking: `jest.mock()` or `sinon` (for Axios API calls)
- Fixtures: Create `tests/fixtures/` directory with sample Storytel API responses

## Implementation Path

**Phase 1: Setup**
```bash
npm install --save-dev jest supertest
npm install --save-dev jest --legacy-peer-deps  # if peer dependency issues
```

**Phase 2: Test File Structure**
```
src/
├── provider.js
├── provider.test.js          # Unit tests for metadata formatting
└── server.js
├── server.test.js            # Integration tests for endpoints
tests/
├── fixtures/
│   ├── storytel-response.json # Mock API response
│   └── book-data.json        # Sample book objects
└── setup.js                  # Test utilities and helpers
```

**Phase 3: Priority Tests**
- Author matching score calculation
- Title cleanup with all regex patterns
- Series extraction and subtitle generation
- HTML stripping with edge cases

## Known Testing Challenges

**Storytel API Dependency:**
- Live API calls required for integration tests
- May experience rate limiting (403 errors)
- Existing cache system helps, but not reliable for tests
- **Solution:** Mock API responses in fixtures

**Multi-Language Pattern Coverage:**
- 20+ language patterns need comprehensive test coverage
- Current patterns in `src/provider.js` lines 169-247
- Easy to break with refactoring—needs tests

**Persistent SQLite Cache:**
- Tests must handle database state cleanup
- Consider in-memory database for tests or cleanup between runs
- Volume mounting in Docker affects test isolation

---

*Testing analysis: 2026-03-28*
