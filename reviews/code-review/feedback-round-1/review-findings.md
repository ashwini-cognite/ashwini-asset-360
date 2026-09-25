# Findings: Asset 360 Investigation Workspace

## Config inspected

- Coverage config file(s): `vitest.config.ts` (lines 10–15). `vite.config.ts` has no `test` or `coverage` block. No Jest config.
- Production paths excluded from coverage: none under `src/`. Excludes are `node_modules/`, `dist/`, `.claude/`, `.agents/`, `vitest.setup.ts`, `**/*.config.ts`, `**/*.d.ts`.
- Tests excluded from the test run: Vitest defaults plus `.claude/**` and `.agents/**`. No `src/` tests are excluded.
- `coverage.all` is not set, so files that no test imports (today `src/lib/utils.ts` and `src/main.tsx`) are omitted from the printed percentage. The printed line rate is already 62.08%, under the 80% gate.

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/App.tsx:71`, `src/components/AppErrorBoundary.tsx:7`, `src/components/AppErrorBoundary.tsx:10`, `src/components/AppErrorBoundary.tsx:14` |
| TODO/FIXME/HACK/XXX | none |
| useEffect | `src/App.tsx:53` (cancelled flag + cleanup), `src/viewModels/useAsset360ViewModel.ts:92` (sync `noteVisit`, no subscription), `src/components/HomeScreen.tsx:30` (debounce timer cleared on cleanup) |
| useQuery/useMutation in tsx | none. Queries live in `src/viewModels/useHomeViewModel.ts:12` and `src/viewModels/useAsset360ViewModel.ts:25` |
| coverage/test exclude | `vitest.config.ts:10`, `vitest.config.ts:14`. Does not exclude production `src/` |
| CDF Raw | none |
| instances.list/query/search | `src/services/cdfInvestigationService.ts:271` search, `:275` list, `:279` retrieve. List calls pass `limit` and `cursor` (`:241`) |
| QueuedTaskRunner / 429 | No `QueuedTaskRunner` / `cdfTaskRunner`. 429 handling: `src/domain/retry.ts:13` (exponential delay, no jitter). Test: `src/domain/domain.test.ts:91` |
| any / as unknown as | none |
| vi.mock | none. `vi.mocked` only in `src/App.test.tsx:90` |
| lint / tsc | `npm run lint` clean. `npx tsc --noEmit` clean |
| CogniteClient / DI / ViewModel | `new CogniteClient` only in `src/App.test.tsx:34`. Production client comes from `CogniteSdkProvider`. `CdfInvestigationService` at `src/services/cdfInvestigationService.ts:64`. View models under `src/viewModels/`, not `src/hooks/` |
| unused files / console.log | UNUSED: `src/lib/utils.ts`. `console.log` / `console.debug`: none (`console.error` in the error boundary is allowed) |
| routes | none (host state switches screens; no React Router) |
| components > 150 lines | none. Longest is `src/components/HomeScreen.tsx` at 147 |

## Must / should / nice

- [ ] Line coverage is 62.08% (316/509), under the 80% gate. Service `src/services/cdfInvestigationService.ts` is 41.55% lines. `src/components/TimeSeriesPanel.tsx` 21.73%, `src/components/WorkOrdersPanel.tsx` 18.18%, `src/components/DocumentsPanel.tsx` 25%. — criterion 1.4
- [ ] `src/lib/utils.ts` is never imported. `clsx` and `tailwind-merge` exist only for that file. — criterion 1.5
- [ ] 429 retry doubles the delay but does not add jitter, and CDF calls have no concurrency cap. — `src/domain/retry.ts:8` — criterion 2.5
- [ ] Work orders and documents use a custom `<table>` (`src/components/RecordList.tsx:14`) instead of Aura DataGrid. Section chrome is a custom `<section>` (`src/components/SectionPanel.tsx:11`) instead of Aura Card. — criterion 3.1
- [ ] `@tanstack/react-table` and `@tanstack/react-virtual` are production dependencies with no imports in `src/`. `react-table` is one major behind (8.21.3 vs 9.2.4). Dev dependency `vitest` has a moderate advisory GHSA-82fw-gwwq-j7x9. — criterion 1.3
- [ ] Related time series, activities, and files stop at 200 items with no message that the list was cut. — `src/services/cdfInvestigationService.ts:247` — criterion 2.3
- [ ] The metric tile markup is copied in `src/components/HomeScreen.tsx` and `src/components/AssetScreen.tsx`. — criterion 1.5
