# File inventory: Asset 360 Investigation Workspace

Coverage config: `vitest.config.ts`. App config: `vite.config.ts`.

| File | Structure | Quality | Patterns | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| vite.config.ts | Config | OK | Host HTTPS plugins | — | Port 3001 |
| vitest.config.ts | Config | OK | Legal coverage excludes | — | Includes all of `src/` |
| src/main.tsx | Bootstrap | OK | Query client | excluded | Allowed coverage exclude |
| src/App.tsx | Shell | OK | Host connect + DI | ✓ | Error boundary after connect |
| src/components/HomeScreen.tsx | View | OK | ViewModel, local draft only | ✓ | 166 lines, no fetch |
| src/components/AssetScreen.tsx | View | OK | ViewModel | ✓ | Shared metric tile |
| src/components/TimeSeriesPanel.tsx | View | OK | Props from view model | ✓ via AssetScreen | Aura chart, fjord series colors |
| src/components/WorkOrdersPanel.tsx | View | OK | Props from view model | ✓ via AssetScreen | DataGrid rows activate |
| src/components/DocumentsPanel.tsx | View | OK | Props from view model | ✓ via AssetScreen | DataGrid rows activate |
| src/components/InvestigationGrid.tsx | View | OK | Aura DataGrid | ✓ via screens | Row click uses the row model |
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
| src/domain/values.ts | Domain | OK | Type guards | ✓ | |
| src/domain/activity.ts | Domain | OK | Pure | ✓ | |
| src/domain/timeWindow.ts | Domain | OK | Pure | ✓ | |
| src/domain/searchRank.ts | Domain | OK | Pure | ✓ | |
| src/domain/recentAssets.ts | Domain | OK | Pure | ✓ | |
| src/domain/preview.ts | Domain | OK | Pure | ✓ | |
| src/domain/retry.ts | Domain | OK | Jitter and Retry-After | ✓ | Bounded to 3 attempts |
| src/domain/models.ts | Types | OK | Shared models | ✓ via callers | |
