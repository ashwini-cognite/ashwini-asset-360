import { Badge } from '@cognite/aura/components/badge';
import { Card, CardContent } from '@cognite/aura/components/card';
import type { ColumnDef } from '@tanstack/react-table';

import type { ActivityDetail } from '../domain/models';
import { formatDate, formatTimestamp, instanceKey } from '../domain/values';
import type { useAsset360ViewModel } from '../viewModels/useAsset360ViewModel';

import { InvestigationGrid } from './InvestigationGrid';
import { PanelBody } from './PanelBody';
import { SectionPanel } from './SectionPanel';
import { TruncationNote } from './TruncationNote';

type WorkOrderRow = {
  id: string;
  activity: ActivityDetail;
  selected: boolean;
};

export function WorkOrdersPanel({ model }: { model: ReturnType<typeof useAsset360ViewModel> }) {
  const selectedKey = model.selectedActivity ? instanceKey(model.selectedActivity.ref) : undefined;
  const rows = model.activities.map((activity) => ({
    id: instanceKey(activity.ref),
    activity,
    selected: instanceKey(activity.ref) === selectedKey,
  }));
  return (
    <SectionPanel
      title="Work orders"
      description="Newest first. Select a row for the full record."
      count={model.activitiesStatus === 'ready' ? model.activities.length : undefined}
    >
      <PanelBody
        status={model.activitiesStatus}
        empty={model.activities.length === 0}
        emptyTitle="No work orders linked"
        emptyDescription="Nothing in the maintenance history is linked to this asset."
        onRetry={model.retryActivities}
      >
        <InvestigationGrid
          label="Work orders"
          data={rows}
          columns={workOrderColumns}
          getRowId={(row) => row.id}
          onRowClick={(row) => model.selectActivity(row.activity.ref)}
        />
      </PanelBody>
      <TruncationNote truncated={model.activitiesTruncated} />
      {model.selectedActivity ? <ActivityDetailCard activity={model.selectedActivity} /> : null}
    </SectionPanel>
  );
}

const workOrderColumns: ColumnDef<WorkOrderRow>[] = [
  {
    id: 'work-order',
    accessorFn: (row) => row.activity.title,
    header: 'Work order',
    cell: ({ row }) => (
      <RecordTitle title={row.original.activity.title} detail={row.original.activity.identifier} selected={row.original.selected} />
    ),
  },
  {
    id: 'status',
    accessorFn: (row) => row.activity.status,
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.activity.status)} outline background={false}>
        {row.original.activity.status}
      </Badge>
    ),
  },
  {
    id: 'date',
    accessorFn: (row) => formatDate(row.activity.dateMs),
    header: 'Date',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.activity.dateMs)}</span>,
  },
];

function ActivityDetailCard({ activity }: { activity: ActivityDetail }) {
  return (
    <Card aria-label="Work order detail" role="region" className="w-full border border-border bg-muted-background">
      <CardContent className="w-full text-left">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{activity.title}</h3>
          <Badge variant={statusVariant(activity.status)} outline background={false}>
            {activity.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{activity.identifier}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Fact label="Start" value={formatTimestamp(activity.startTime)} />
          <Fact label="End" value={formatTimestamp(activity.endTime)} />
          <Fact label="Scheduled start" value={formatTimestamp(activity.scheduledStartTime)} />
          <Fact label="Scheduled end" value={formatTimestamp(activity.scheduledEndTime)} />
        </dl>
        {activity.description ? <p className="mt-3 max-w-prose text-sm text-secondary-foreground">{activity.description}</p> : null}
      </CardContent>
    </Card>
  );
}

function RecordTitle({ title, detail, selected }: { title: string; detail: string; selected: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
      {selected ? <span className="sr-only">Selected</span> : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function statusVariant(status: ActivityDetail['status']): 'success' | 'warning' | 'inProgress' | 'gray' {
  if (status === 'Completed') return 'success';
  if (status === 'In progress') return 'warning';
  if (status === 'Scheduled') return 'inProgress';
  return 'gray';
}
