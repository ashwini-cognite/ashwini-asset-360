import { Badge } from '@cognite/aura/components/badge';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Search } from '@cognite/aura/components/search';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import { MIN_SEARCH_LENGTH } from '../domain/cdm';
import type { AssetSummary } from '../domain/models';
import type { RecentAsset } from '../domain/recentAssets';
import { instanceKey } from '../domain/values';
import { useHomeViewModel } from '../viewModels/useHomeViewModel';

import { InvestigationGrid } from './InvestigationGrid';
import { MetricTile } from './MetricTile';
import { PanelBody } from './PanelBody';
import { SectionPanel } from './SectionPanel';

type AssetRow = {
  id: string;
  asset: AssetSummary | RecentAsset;
  parent: string;
};

export function HomeScreen() {
  const model = useHomeViewModel();
  return <HomeScreenView model={model} />;
}

function HomeScreenView({ model }: { model: ReturnType<typeof useHomeViewModel> }) {
  const [draft, setDraft] = useState(model.query);
  const { query, setSearchQuery } = model;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft !== query) setSearchQuery(draft);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, query, setSearchQuery]);

  const trimmed = draft.trim();
  const showPrompt = trimmed.length < MIN_SEARCH_LENGTH;
  const matchLabel = showPrompt || model.searchStatus !== 'ready' ? '—' : String(model.results.length);
  const resultRows = model.results.map((asset) => ({
    id: instanceKey(asset.ref),
    asset,
    parent: asset.parentLabel,
  }));
  const recentRows = model.recent.map((asset) => ({
    id: instanceKey(asset.ref),
    asset,
    parent: '',
  }));

  return (
    <div className="flex w-full flex-col items-stretch gap-6 text-left">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Asset 360</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Search an equipment tag, name, or description to open its time series, work orders, and documents.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Recent assets" value={String(model.recent.length)} tone="neutral" />
        <MetricTile label="Matches" value={matchLabel} tone="warning" />
      </dl>
      <SectionPanel title="Search" description="Type at least two characters of a tag, name, or description.">
        <Search
          aria-label="Search assets"
          placeholder="Tag, name, or description"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onClear={() => {
            setDraft('');
            model.setSearchQuery('');
          }}
        />
        <div aria-label="Search results">
          {showPrompt ? (
            model.recent.length === 0 ? (
              <EmptyState variant="compact" type="new-object">
                <EmptyStateTitle>Search for equipment</EmptyStateTitle>
                <EmptyStateDescription>Type at least two characters of a tag, name, or description.</EmptyStateDescription>
              </EmptyState>
            ) : null
          ) : (
            <PanelBody
              status={model.searchStatus}
              empty={model.results.length === 0}
              emptyTitle="No assets matched"
              emptyDescription="Try a different tag, name, or description."
              onRetry={model.retrySearch}
            >
              <InvestigationGrid
                label="Search results"
                data={resultRows}
                columns={searchColumns}
                getRowId={(row) => row.id}
                onRowClick={(row) => model.openAsset(row.asset)}
                rowHeight={72}
              />
            </PanelBody>
          )}
        </div>
      </SectionPanel>
      <SectionPanel title="Recently viewed" description="The last 10 assets opened on this device." count={model.recent.length}>
        {model.recent.length === 0 ? (
          <EmptyState variant="compact" type="no-results">
            <EmptyStateTitle>No recent assets</EmptyStateTitle>
            <EmptyStateDescription>Assets you open will show up here, including after a reload.</EmptyStateDescription>
          </EmptyState>
        ) : (
          <InvestigationGrid
            label="Recently viewed"
            data={recentRows}
            columns={recentColumns}
            getRowId={(row) => row.id}
            onRowClick={(row) => model.openAsset(row.asset)}
          />
        )}
      </SectionPanel>
    </div>
  );
}

const searchColumns: ColumnDef<AssetRow>[] = [
  {
    id: 'asset',
    accessorFn: (row) => row.asset.name,
    header: 'Asset',
    cell: ({ row }) => <AssetCell asset={row.original.asset} />,
  },
  {
    id: 'parent',
    accessorFn: (row) => row.parent,
    header: 'Parent',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.parent}</span>,
  },
];

const recentColumns: ColumnDef<AssetRow>[] = [
  {
    id: 'asset',
    accessorFn: (row) => row.asset.name,
    header: 'Asset',
    cell: ({ row }) => <AssetCell asset={row.original.asset} />,
  },
  {
    id: 'tag',
    accessorFn: (row) => row.asset.tag,
    header: 'Tag',
    cell: ({ row }) => <Badge variant="secondary">{row.original.asset.tag}</Badge>,
  },
];

function AssetCell({ asset }: { asset: AssetSummary | RecentAsset }) {
  return (
    <div className="min-w-0">
      <div className="font-medium">{asset.name}</div>
      <div className="text-xs text-muted-foreground">{asset.tag}</div>
      {'description' in asset && asset.description ? (
        <div className="line-clamp-1 text-xs text-secondary-foreground">{asset.description}</div>
      ) : null}
    </div>
  );
}
