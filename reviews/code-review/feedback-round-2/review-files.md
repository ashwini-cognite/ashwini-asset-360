# File inventory: Asset 360 Investigation Workspace

Reviewed working tree on top of commit `706f8eede8456512bf65227d5b50a2a393970a7d`. Application source is still uncommitted.

| File | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| src/main.tsx | Boot | OK | QueryClient at entry | excluded | Allowed untested entry |
| src/App.tsx | Shell | OK | Host connect + DI | ✓ | Error boundary after connect |
| src/components/HomeScreen.tsx | View | OK | ViewModel, local draft only | ✓ | 150 lines, no fetch |
| src/components/AssetScreen.tsx | View | OK | ViewModel | ✓ | Shared metric tile |
| src/components/TimeSeriesPanel.tsx | View | OK | Props from view model | ✓ via AssetScreen | Aura chart |
| src/components/WorkOrdersPanel.tsx | View | OK | Props from view model | ✓ via AssetScreen | Aura DataGrid |
| src/components/DocumentsPanel.tsx | View | OK | Props from view model | ✓ via AssetScreen | Aura DataGrid |
| src/components/InvestigationGrid.tsx | View | OK | Aura DataGrid wrapper | ✓ via screens | Rows are named by their cells |
| src/components/SectionPanel.tsx | View | OK | Aura Card | ✓ via screens | |
| src/components/MetricTile.tsx | View | OK | Aura Card | ✓ via screens | Shared by home and asset |
| src/components/TruncationNote.tsx | View | OK | Aura Alert | ✓ via AssetScreen | Shown when a list is cut at 200 |
| src/components/PanelBody.tsx | View | OK | Loading, empty, error, denied | ✓ via screens | |
| src/components/AppErrorBoundary.tsx | View | OK | Class boundary | ✓ | Reload |
| src/viewModels/useHomeViewModel.ts | Hook | OK | Context + useQuery | ✓ | Loading, success, error, denied |
| src/viewModels/useAsset360ViewModel.ts | Hook | OK | Context + useQuery | ✓ | Chart refresh, external open |
| src/state/investigationState.ts | State | OK | Host-synced shape | ✓ | |
| src/state/InvestigationStateProvider.tsx | State | OK | syncInternalState | ✓ | Recents in localStorage |
| src/state/investigationService.ts | DI | OK | Context | ✓ | |
| src/state/InvestigationServiceProvider.tsx | DI | OK | Context | ✓ via screens | |
| src/services/cdfInvestigationService.ts | Service | OK | Interface + gateway | ✓ | Queued CDF calls, capped lists |
| src/shared/utils/semaphore.ts | Util | OK | Concurrency cap | ✓ | |
| src/domain/cdm.ts | Domain | OK | Constants | ✓ | |
| src/domain/models.ts | Domain | OK | Types | n/a | |
| src/domain/values.ts | Domain | OK | Type guards | ✓ | |
| src/domain/activity.ts | Domain | OK | Pure | ✓ | |
| src/domain/timeWindow.ts | Domain | OK | Pure | ✓ | |
| src/domain/searchRank.ts | Domain | OK | Pure | ✓ | |
| src/domain/recentAssets.ts | Domain | OK | Pure | ✓ | |
| src/domain/preview.ts | Domain | OK | Pure | ✓ | |
| src/domain/retry.ts | Domain | OK | Jitter and Retry-After | ✓ | Bounded to 3 attempts |
| vitest.config.ts | Config | OK | | — | Coverage include is all of `src/` |
| vite.config.ts | Config | OK | | — | No test or coverage exclude of `src/` |
