# Asset 360 Investigation Workspace — Flows code review

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **2 must-fix item(s)** that block approval. Once the must-fix items are addressed, re-run `flows-code-review`.

### Reviewed commit

`706f8eede8456512bf65227d5b50a2a393970a7d`

The application code under review is the uncommitted working tree on top of that initial commit. `App-Brief.md` is present.

## Checks performed

Hunts from `flows-review-checks` on `cognitedata/builder-skills` `main` (CLI skill pull could not clone in this environment; the two skill files were fetched with `curl` from that `main` branch). `code-quality` searches were run and not applied as fixes. Lint and `tsc --noEmit` were clean. `npx vitest run --coverage`: 4 files, 18 tests, 0 failed.

Coverage scope: `vitest.config.ts` does not exclude production files under `src/`. Printed line coverage is 62.08% of files the tests actually loaded. That number is below 80%, so the hard gate fails on the percentage itself.

## Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 4/5 | Error boundary, per-panel loading/empty/error/no-access, and host-connect cleanup are in place. No TODOs. No crash found on the reviewed paths. |
| User & customer | 1.3 Packages | 3/5 | No high or critical CVEs. Moderate Vitest advisory in devDependencies. Unused production packages include `react-table`, which is one major behind. |
| User & customer | 1.4 Tests & coverage | 2/5 | Tests run and `src/` is not excluded, but line coverage is 62.08% (316/509). Time series, work orders, documents, and most of the CDF service are barely executed. |
| User & customer | 1.5 Dead code | 2/5 | `src/lib/utils.ts` is unused. Lint and `tsc` are clean and there is no `any`. |
| User & customer | 1.6 Patterns & testability | 4/5 | Services are injected through context. Pages use view models. `new CogniteClient` appears only in the app test. Search debounce state lives in the view. |
| Cognite services | 2.1 DMS query patterns | 4/5 | Asset lookup uses `instances.search` plus a bounded `instances.list` prefix on external id. Related records are filtered with `containsAny` on `assets`. |
| Cognite services | 2.2 Server-side filter | 4/5 | Relationship filters and limits are in the request. Ranking and activity sort run on the capped page, not on an unbounded download. |
| Cognite services | 2.3 Limits & pages | 4/5 | Search limit 25. Related lists page at 100 and stop at 200. The stop is silent. |
| Cognite services | 2.4 Call rate | 5/5 | Search is debounced. The chart does not poll. React Query dedupes by key. |
| Cognite services | 2.5 429 backoff | 3/5 | `withRetry` backs off exponentially up to 3 attempts and then throws. There is no jitter and no concurrency queue. Panel queries set `retry: false`, so TanStack does not add a second retry loop. |
| Cognite services | 2.6 CDF Raw | N/A | No Raw API usage. |
| Brand | 3.1 Aura | 3/5 | Search, badges, buttons, empty states, skeletons, and the chart are Aura. The lists and section frames are custom HTML. |

## Must fix

1. Raise full-scope line coverage to at least 80%. The gap is the CDF service and the three investigation panels.
   - `src/services/cdfInvestigationService.ts:64`
   - `src/components/TimeSeriesPanel.tsx:23`
   - `src/components/WorkOrdersPanel.tsx:11`
   - `src/components/DocumentsPanel.tsx:12`
   - _Impact:_ A broken chart, work-order list, or file preview can ship because those paths are not executed by tests.

2. Delete the unused helper, or start using it.
   - `src/lib/utils.ts:4`
   - _Impact:_ Dead code makes the next change look supported when nothing in the app calls it.

## Should fix

1. Add jitter to the 429 delay and cap how many CDF calls run at once.
   - `src/domain/retry.ts:14`
   - Criterion 2.5 scored 3.

2. Use Aura DataGrid (and Card, if it fits) for work orders and documents, or document why the custom table is required. Give each activatable row a clear accessible name.
   - `src/components/RecordList.tsx:14`
   - `src/components/SectionPanel.tsx:11`
   - Criterion 3.1 scored 3.

3. Remove unused production dependencies (`@tanstack/react-table`, `@tanstack/react-virtual`, and `clsx` / `tailwind-merge` if `utils.ts` goes). Upgrade the Vitest dev toolchain past GHSA-82fw-gwwq-j7x9 when a patched release is available.
   - `package.json:31`
   - Criterion 1.3 scored 3.

## Nice to fix

1. Tell the analyst when a related list was cut at 200 items.
   - `src/services/cdfInvestigationService.ts:247`

2. Share one metric-tile component between the home and asset screens.
   - `src/components/HomeScreen.tsx`
   - `src/components/AssetScreen.tsx`

## Summary

- Must Fix open: 2
- Should Fix open: 3
- Nice Fix open: 2
