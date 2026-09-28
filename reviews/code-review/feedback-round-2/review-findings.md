# Findings: Asset 360 Investigation Workspace

## Config inspected

- Coverage config file(s): `vitest.config.ts` lines 10–17. `vite.config.ts` has no `test` or `coverage` block. No Jest config.
- Production paths excluded from coverage: none. `coverage.include` is `src/**/*.{ts,tsx}`. `coverage.exclude` is test files, `src/**/vite-env.d.ts`, and `src/main.tsx`. `coverage.all` is true.
- Tests excluded from the test run: Vitest defaults plus `.claude/**` and `.agents/**`. No `src/` tests are excluded.

`npx vitest run --coverage`: 12 files, 58 tests, 0 failed. Lines 97.33% (585/601).

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/App.tsx:71`, `src/components/AppErrorBoundary.tsx:7`, `src/components/AppErrorBoundary.tsx:10`, `src/components/AppErrorBoundary.tsx:14` |
| TODO/FIXME/HACK/XXX | none |
| useEffect | `src/App.tsx:53` (cancelled flag, cleanup returns), `src/components/HomeScreen.tsx:33` (debounce timer cleared), `src/viewModels/useAsset360ViewModel.ts:94` (sync `noteVisit`, no subscription) |
| useQuery/useMutation in tsx | none. Queries live in `src/viewModels/useHomeViewModel.ts` and `src/viewModels/useAsset360ViewModel.ts` |
| coverage/test exclude | `vitest.config.ts:10`, `vitest.config.ts:16`. Does not hide production `src/` |
| CDF Raw | none |
| instances.list/query/search | `src/services/cdfInvestigationService.ts:310` search, `:315` list, `:320` retrieve. List calls pass `limit` and `cursor` |
| QueuedTaskRunner / 429 | `src/shared/utils/semaphore.ts:23`, `src/shared/utils/semaphore.ts:100`, `src/services/cdfInvestigationService.ts:306`. 429: `src/domain/retry.ts:29` (exponential delay, jitter, Retry-After, 3 attempts) |
| any / as unknown as | none |
| vi.mock | none. `vi.mocked` only, on injected services |
| lint / tsc | `npm run lint` clean. `npx tsc --noEmit` clean |
| CogniteClient / DI / ViewModel | `new CogniteClient` only in `src/App.test.tsx:34`. Production client comes from `CogniteSdkProvider`. `CdfInvestigationService` implements `InvestigationService`. View models under `src/viewModels/` |
| unused files / console.log | UNUSED: none. `console.log` / `console.debug`: none |
| components > 150 lines | none. Longest production component is `src/components/HomeScreen.tsx` at 150, and it does not fetch |
| routes | none (host state switches screens) |

## Must / should / nice

None.
