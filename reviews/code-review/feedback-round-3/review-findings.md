# Findings: Asset 360 Investigation Workspace

## Config inspected

- Coverage config file(s): `vitest.config.ts`
- Production paths excluded from coverage: none. Excludes are tests, `src/**/vite-env.d.ts`, and `src/main.tsx`.
- Tests excluded from the test run: Vitest defaults plus `.claude/**` and `.agents/**`. No `src/` tests are excluded.

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/App.tsx:71`, `src/components/AppErrorBoundary.tsx:7` |
| coverage/test exclude | `vitest.config.ts:10` (tests outside `src/` only), `vitest.config.ts:16` (tests, `vite-env.d.ts`, `src/main.tsx`) |
| TODO / FIXME / HACK | none |
| useEffect | `src/App.tsx:53` (cancelled flag), `src/components/HomeScreen.tsx:33` (clears the debounce timer), `src/viewModels/useAsset360ViewModel.ts:94` (sync recent-asset write, no timer or listener) |
| useQuery / useMutation in `*.tsx` | none. Fetching is in `src/viewModels/useHomeViewModel.ts:12` and `src/viewModels/useAsset360ViewModel.ts:25` |
| CDF Raw | none |
| instances.list/query/search | `src/services/cdfInvestigationService.ts:310` search, `:315` list, `:320` retrieve |
| QueuedTaskRunner / 429 | `src/shared/utils/semaphore.ts:23`, `src/shared/utils/semaphore.ts:100`, `src/domain/retry.ts:29`, `src/domain/retry.ts:48` |
| any / as unknown as | none |
| vi.mock | none. Grep hits are `vi.mocked` on injected fakes |
| lint / tsc | clean (`npm run lint`, `npx tsc --noEmit`) |
| CogniteClient / DI / ViewModel | `new CogniteClient` only in `src/App.test.tsx:34`. `CdfInvestigationService` implements `InvestigationService` at `src/services/cdfInvestigationService.ts:90`. View models live in `src/viewModels/` |
| unused files / console.log | none |
| components > 150 lines | `src/components/HomeScreen.tsx` is 166 lines. It renders a view model and a local search draft. It does not fetch |
| routes | none |

## Must / should / nice

None.
