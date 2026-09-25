import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import { IconArrowLeft } from '@tabler/icons-react';

import type { AssetDetail } from '../domain/models';
import { useAsset360ViewModel } from '../viewModels/useAsset360ViewModel';

import { DocumentsPanel } from './DocumentsPanel';
import { MetricTile } from './MetricTile';
import { PanelBody } from './PanelBody';
import { TimeSeriesPanel } from './TimeSeriesPanel';
import { WorkOrdersPanel } from './WorkOrdersPanel';

export function AssetScreen() {
  const model = useAsset360ViewModel();
  const inProgress = model.activities.filter((activity) => activity.status === 'In progress').length;
  return (
    <div className="flex w-full flex-col items-stretch gap-6 text-left">
      <div>
        <Button type="button" variant="ghost" onClick={model.goHome}>
          <IconArrowLeft aria-hidden />
          Back to search
        </Button>
      </div>
      <PanelBody
        status={model.headerStatus}
        empty={!model.header}
        emptyTitle="Asset not found"
        emptyDescription="The link may be stale, or this tag is not in the project."
        onRetry={model.retryHeader}
      >
        {model.header ? (
          <AssetSummary
            header={model.header}
            seriesCount={countLabel(model.seriesStatus, model.series.length)}
            workOrderCount={countLabel(model.activitiesStatus, model.activities.length)}
            inProgressCount={countLabel(model.activitiesStatus, inProgress)}
            documentCount={countLabel(model.documentsStatus, model.documents.length)}
          />
        ) : null}
      </PanelBody>
      <TimeSeriesPanel model={model} />
      <WorkOrdersPanel model={model} />
      <DocumentsPanel model={model} />
    </div>
  );
}

function AssetSummary({
  header,
  seriesCount,
  workOrderCount,
  inProgressCount,
  documentCount,
}: {
  header: AssetDetail;
  seriesCount: string;
  workOrderCount: string;
  inProgressCount: string;
  documentCount: string;
}) {
  const type = displayValue(header.typeLabel, 'Unknown type');
  const parent = displayValue(header.parentLabel, 'No parent');
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{header.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {header.description || 'No description on this asset.'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {header.tag} · {type} · {parent}
          </p>
        </div>
        <Badge variant="secondary">{header.tag}</Badge>
      </header>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Time series" value={seriesCount} tone="neutral" />
        <MetricTile label="Work orders" value={workOrderCount} tone="warning" />
        <MetricTile label="In progress" value={inProgressCount} tone="danger" />
        <MetricTile label="Documents" value={documentCount} tone="success" />
      </dl>
    </div>
  );
}

function countLabel(status: string, count: number): string {
  return status === 'ready' ? String(count) : '—';
}

function displayValue(value: string, placeholder: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === placeholder) return '—';
  return trimmed;
}
