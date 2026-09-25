# File inventory: Asset 360 Investigation Workspace

Reviewed working tree on top of commit `706f8eede8456512bf65227d5b50a2a393970a7d` (Initial commit). Application source is uncommitted.

| File | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| src/main.tsx | Boot | OK | QueryClient at entry | ✗ | Allowed untested entry |
| src/App.tsx | Shell | OK | Host connect + DI | ✓ App.test.tsx | Error boundary wraps routed content |
| src/App.test.tsx | Test | OK | Injected service | — | Search, navigation, host sync |
| src/lib/utils.ts | Helper | Dead | — | ✗ | `cn` is never imported |
| src/components/HomeScreen.tsx | View | OK | ViewModel, no fetch | partial via App | 147 lines, under the 150 mix bar |
| src/components/AssetScreen.tsx | View | OK | ViewModel | partial via App | Metric tiles |
| src/components/TimeSeriesPanel.tsx | View | OK | Props from view model | ✗ | Chart + series toggles |
| src/components/WorkOrdersPanel.tsx | View | OK | Props from view model | ✗ | Custom table |
| src/components/DocumentsPanel.tsx | View | OK | Props from view model | ✗ | Preview + custom table |
| src/components/RecordList.tsx | View | OK | Presentational | ✗ | Replaces Aura DataGrid |
| src/components/SectionPanel.tsx | View | OK | Presentational | ✗ | Custom card chrome |
| src/components/PanelBody.tsx | View | OK | Loading/empty/error/denied | partial | Used by panels |
| src/components/AppErrorBoundary.tsx | View | OK | Class boundary | ✓ | Reload affordance |
| src/viewModels/useHomeViewModel.ts | Hook | OK | Context + useQuery | partial via App | |
| src/viewModels/useAsset360ViewModel.ts | Hook | OK | Context + useQuery | partial via App | Manual chart refresh |
| src/state/investigationState.ts | State | OK | Host-synced shape | partial | |
| src/state/InvestigationStateProvider.tsx | State | OK | syncInternalState | partial via App | Recents in localStorage |
| src/state/investigationService.ts | DI | OK | Context | ✗ | Thin accessor |
| src/state/InvestigationServiceProvider.tsx | DI | OK | Context | ✗ | |
| src/services/cdfInvestigationService.ts | Service | OK | Interface + gateway | ✓ partial | Line coverage 41.55% |
| src/services/cdfInvestigationService.test.ts | Test | OK | Gateway mock | — | Search rank, empty series |
| src/domain/cdm.ts | Domain | OK | Constants | partial | |
| src/domain/models.ts | Domain | OK | Types only | n/a | |
| src/domain/values.ts | Domain | OK | Type guards | ✓ domain.test | |
| src/domain/activity.ts | Domain | OK | Pure | ✓ partial | Some branches uncovered |
| src/domain/timeWindow.ts | Domain | OK | Pure | ✓ | |
| src/domain/searchRank.ts | Domain | OK | Pure | ✓ | |
| src/domain/recentAssets.ts | Domain | OK | Pure | ✓ | |
| src/domain/preview.ts | Domain | OK | Pure | ✓ | |
| src/domain/retry.ts | Domain | OK | Injected sleep | ✓ | No jitter |
| src/domain/domain.test.ts | Test | OK | | — | |
| vitest.config.ts | Config | OK | | — | Coverage exclude does not hide `src/` |
| vite.config.ts | Config | OK | | — | No test exclude of `src/` |
