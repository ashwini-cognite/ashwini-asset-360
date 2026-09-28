# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **0 must-fix item(s)** that block approval.

### Reviewed commit

`706f8eede8456512bf65227d5b50a2a393970a7d`

The reviewed code is the uncommitted working tree on top of that initial commit. `App-Brief.md` is present. This is feedback round 3. Round 2 already had no open items. Row clicks and the time-series line were fixed after that round; this run scores the tree that includes those fixes.

## Checks performed

Hunts from `flows-review-checks` and `code-quality` on `cognitedata/builder-skills` `main`, fetched before scoring. The CLI skill pull was blocked in this environment, so both files were read from `main` via the documented curl fallback. `code-quality` fixes were not applied. Lint and `tsc --noEmit` were clean. `npx vitest run --coverage`: 12 files, 58 tests, 0 failed.

Coverage scope: `vitest.config.ts` includes `src/**/*.{ts,tsx}` and excludes only tests, `vite-env.d.ts`, and `src/main.tsx`. Line coverage is 97.38% (595/611).

## Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 5/5 | Error boundary, per-panel loading/empty/error/no-access, a visible 200-item cutoff, and a marked single chart reading. |
| User & customer | 1.3 Packages | 5/5 | `npm audit` reports zero vulnerabilities. React 18 and react-table 8 match Aura's peer ranges. |
| User & customer | 1.4 Tests & coverage | 5/5 | Honest line coverage 97.38%. Service, view models, home, and asset screens are exercised. `src/` is not excluded. |
| User & customer | 1.5 Dead code | 5/5 | No unused files, no `console.log`, lint and `tsc` clean, no production `any`. HomeScreen is 166 lines and does not fetch. |
| User & customer | 1.6 Patterns & testability | 5/5 | `InvestigationService` is injected through context. Pages use view models. `new CogniteClient` appears only in the app test. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Text search uses `instances.search`. Related records use a filtered, limited `instances.list` because reverse list relations cannot be traversed. |
| Cognite services | 2.2 Server-side filter | 5/5 | `containsAny` and the external-id prefix are in the request. Ranking reorders the capped page. |
| Cognite services | 2.3 Limits & pages | 5/5 | Search limit 25. Related pages use a cursor and stop at 200, and the panel says so. Datapoint aggregates request a limit of 1000. |
| Cognite services | 2.4 Call rate | 5/5 | Search is debounced. The chart does not poll (`staleTime` infinity, refetch on focus off). React Query dedupes by key. |
| Cognite services | 2.5 429 backoff | 5/5 | `cdfTaskRunner` caps concurrency. `withRetry` uses exponential backoff, jitter, and `Retry-After`, and stops after 3 attempts. |
| Cognite services | 2.6 CDF Raw | N/A | No Raw API usage. |
| Brand | 3.1 Aura | 5/5 | Lists are Aura DataGrid. Sections, metrics, search, badges, alerts, empty states, and the chart use Aura, including chart color tokens. |

## Must fix

None.

## Should fix

None.

## Nice to fix

None.

## Summary

- Must Fix open: 0
- Should Fix open: 0
- Nice Fix open: 0
