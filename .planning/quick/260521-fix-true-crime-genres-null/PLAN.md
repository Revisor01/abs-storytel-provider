---
type: quick-plan
slug: fix-true-crime-genres-null
created: 2026-05-21
issue: https://github.com/Revisor01/abs-storytel-provider/issues/12
---

# Fix: `genres` null for True Crime category audiobooks

## Problem

GitHub Issue #12 (AnttiKaleva): Audiobooks in Storytel's True Crime category return `genres: null` even though the website shows `Kategoria: True Crime`.

Examples (Finnish locale):
- *Vilhunen* (Aki Linnanahde) — `genres: null`, tags include "True crime"
- *Väärän auton kyytiin* (Päivi Hannula) — `genres: null`, tags include "True crime"

## Root cause

Verified against the live Storytel API across 6 locales (en, de, sv, fi, nl, es): the True Crime category is returned with `category.id: 22` but **`category.title` is an empty string** (`""`) for every locale. Every other category returns a populated localized title.

Existing code at `src/provider.js:370-372`:
```js
const genres = book.category
    ? this.splitGenre(this.ensureString(book.category.title))
    : [];
```

When `category.title` is `""`, `splitGenre` returns `[]`, which serializes as `genres: undefined` in the response.

## Fix

Add a `CATEGORY_ID_FALLBACK` map and use it when `category.title` is empty:

```js
const CATEGORY_ID_FALLBACK = {
    22: 'True Crime',
};
```

And:
```js
this.splitGenre(this.ensureString(book.category.title || CATEGORY_ID_FALLBACK[book.category.id]))
```

Minimal, no behavioral change for categories that already have a title.

## Verification

Tested live against Storytel API after fix:
- `Vilhunen` → `genres: ['True Crime']` ✓
- `Väärän auton kyytiin` → `genres: ['True Crime']` ✓
- Regression check `Punarutto` → `genres: ['Jännitys']` (unchanged) ✓

## Tasks

- [x] Add `CATEGORY_ID_FALLBACK` constant
- [x] Use fallback when `category.title` is empty
- [x] Verify against live API for issue examples
- [x] Regression test with a normal-category title
- [ ] Commit + push
- [ ] Comment on issue #12 with resolution
