---
type: quick-summary
slug: fix-true-crime-genres-null
status: complete
created: 2026-05-21
completed: 2026-05-21
commit: 70fa690
issue: https://github.com/Revisor01/abs-storytel-provider/issues/12
---

# Summary: True Crime genres null fix

## Outcome

Resolved GitHub issue #12. True Crime audiobooks now correctly return
`genres: ['True Crime']` instead of `null`.

## Changes

`src/provider.js`:
- Added `CATEGORY_ID_FALLBACK` map (currently only id 22 → 'True Crime')
- Use fallback when `category.title` is empty

## Verification

Live API calls after the fix:
| Test | Result |
| ---- | ------ |
| Vilhunen (Aki Linnanahde) | genres: ['True Crime'] ✓ |
| Väärän auton kyytiin (Päivi Hannula) | genres: ['True Crime'] ✓ |
| Punarutto (normal category) | genres: ['Jännitys'] (no regression) ✓ |

## Commit

`70fa690` — fix: map Storytel category.id 22 to 'True Crime' when title is empty (#12)
