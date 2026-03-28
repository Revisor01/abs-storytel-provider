# Coding Conventions

**Analysis Date:** 2026-03-28

## Naming Patterns

**Files:**
- Lowercase with `.js` extension: `server.js`, `provider.js`
- No hyphens or underscores in file names
- One class per file when appropriate

**Functions:**
- camelCase: `searchBooks()`, `formatBookMetadata()`, `ensureString()`
- Methods with clear action verbs: `fetch`, `format`, `search`, `split`, `strip`, `escape`, `upgrade`
- Getter-like pattern: `authorMatchScore()`
- Private convention: No underscore prefix used; all methods are public in class

**Variables:**
- camelCase: `searchQuery`, `formattedQuery`, `maxResults`, `cacheKey`, `baseSearchUrl`
- Descriptive names: `cleanQuery`, `seriesName`, `seriesInfo`, `rawDescription`
- Constants in UPPERCASE when module-scoped: `CACHE_DB` (environment variable)

**Types/Classes:**
- PascalCase: `StorytelProvider`
- Clear purpose in name: indicates it's a provider/service class

**Parameters:**
- Abbreviated when context is clear: `req`, `res`, `next` (Express middleware)
- Full names in complex methods: `searchQuery`, `locale`, `type`

## Code Style

**Formatting:**
- No linting or formatting tools configured
- Consistent 4-space indentation observed throughout codebase
- Line length: No strict limit enforced, typical 80-120 characters
- No trailing semicolons required but used consistently in some sections
- Newlines: Two blank lines between major sections in classes

**Linting:**
- Not configured: No `.eslintrc`, `.prettierrc`, or equivalent
- Code follows general Node.js best practices but not enforced

**Semicolons:**
- Used inconsistently (sometimes omitted in control structures)
- Recommended: Add ESLint with semicolon rule for consistency

## Import Organization

**Order:**
1. Core Node modules: `const axios = require('axios')`
2. Third-party dependencies: `const Database = require('better-sqlite3')`
3. Built-in Node modules: `const path = require('path')`
4. Custom modules: `const StorytelProvider = require('./provider')`

**Path Aliases:**
- Relative paths used: `require('./provider')`, `require('./src/provider')`
- No path aliases configured in `package.json`

**Module Export:**
- CommonJS: `module.exports = ClassName` (not ES6 syntax)
- Single export per file

## Error Handling

**Patterns:**
- Try-catch blocks used in async methods: `searchBooks()` catches errors and returns empty results
- Error logging to console: `console.error('Search error:', error.message)`
- Graceful degradation: Returns `{ matches: [] }` on error instead of throwing
- No custom error classes defined

**HTTP Error Responses:**
- Standard HTTP status codes: 400 (validation), 401 (auth), 500 (server error)
- Consistent error format: `{ error: 'Description' }` as JSON
- Error messages are user-facing and descriptive

**Validation:**
- Input validation in Express middleware: `validateRegion()`, `checkAuth()`
- Guard clauses for null/undefined: `if (!value) return '';`
- Request logging for debugging: All requests logged with timestamp and query params

## Logging

**Framework:** Native `console` object (no logging library)

**Patterns:**
- Timestamp format: ISO 8601 via `new Date().toISOString()`
- Log levels: `console.log()` (info), `console.error()` (errors)
- Structured logs for API calls: `[${timestamp}] ${method} ${url} query=${json}`
- Cache operations logged: `[cache] HIT for "{key}"` and `[cache] WRITE for "{key}"`
- Search operations logged: `Found ${count} books in search results`

**When to Log:**
- All incoming HTTP requests with method, URL, and query parameters
- API responses and retry attempts
- Cache hits/misses
- Error conditions with descriptive messages
- Search result counts for debugging

## Comments

**When to Comment:**
- Complex regex patterns documented with example: Comments above multi-language patterns explain what they match
- Algorithm explanations: Series removal logic has detailed comments explaining edge cases
- Business logic clarification: Comments explain "only cache non-empty results" reasoning
- Configuration rationale: Comments explain "Clean up empty cache entries from previous versions"

**JSDoc/TSDoc:**
- JSDoc used throughout for public methods with:
  - `@param` tags with type and description
  - `@returns` tag with type and description
  - Method purpose in summary
- Example from `src/provider.js`:
  ```javascript
  /**
   * Splits a genre by / or , and trims the resulting strings
   * @param genre {string}
   * @returns {*[]}
   */
  splitGenre(genre) { ... }
  ```

## Function Design

**Size:**
- Typical functions 15-50 lines
- Longer methods in `formatBookMetadata()` (~150 lines) due to complex multi-language pattern matching
- Prefer extracting helper methods for clarity

**Parameters:**
- Positional parameters used: `searchBooks(query, author = '', locale, type = 'all', limit = 20)`
- Default values via `= defaultValue` syntax
- No destructuring of parameters (traditional style)
- Maximum 4-5 parameters; use objects for more complex cases

**Return Values:**
- Consistent types: Functions return object, array, string, or number—never mixed
- Async functions return Promises
- Early returns for validation/guard clauses
- Object properties explicitly deleted if undefined: `delete metadata[key]`

## Module Design

**Exports:**
- Single class export: `module.exports = StorytelProvider`
- No named exports in use (CommonJS)
- Middleware functions in main server file (not extracted)

**Barrel Files:**
- Not used; only `src/server.js` and `src/provider.js` exist

**Encapsulation:**
- All methods public in class (no private convention enforced)
- Class manages its own state: `baseSearchUrl`, `locale`
- Database and cache initialization at module level (singleton pattern)

## Regex Patterns

**Documentation:**
- Multi-language regex patterns grouped by region with language names
- 20+ language patterns for title cleanup
- Patterns explained with language identifiers: `// German: "Folge" (Episode)`
- Separate pattern arrays: `patterns`, `germanPatterns`, `abridgedPatterns`

**Naming Convention for Complex Patterns:**
- Pattern arrays suffixed with `Patterns`: `abridgedPatterns`, `germanPatterns`
- Test patterns prefixed with context: `/^.*?,\s*Aflevering\s*\d+:\s*/i` (Dutch episode)

---

*Convention analysis: 2026-03-28*
