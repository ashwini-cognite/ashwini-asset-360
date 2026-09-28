import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@cognite/aura/chart';
import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import {
  SegmentedControl,
  SegmentedControlButton,
  SegmentedControlList,
} from '@cognite/aura/components/segmented-control';
import { IconRefresh } from '@tabler/icons-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { RANGE_PRESETS, type RangePreset } from '../domain/timeWindow';
import { formatTimestamp, instanceKey } from '../domain/values';
import type { useAsset360ViewModel } from '../viewModels/useAsset360ViewModel';

import { PanelBody } from './PanelBody';
import { SectionPanel } from './SectionPanel';
import { TruncationNote } from './TruncationNote';

const SERIES_COLORS = [
  'var(--chart-fjord-color-1)',
  'var(--chart-fjord-color-2)',
  'var(--chart-fjord-color-3)',
  'var(--chart-fjord-color-4)',
  'var(--chart-fjord-color-5)',
];

type AssetModel = ReturnType<typeof useAsset360ViewModel>;

export function TimeSeriesPanel({ model }: { model: AssetModel }) {
  const plotted = model.chart?.series.filter((series) => !series.empty && !series.nonNumeric) ?? [];
  const config: ChartConfig = Object.fromEntries(
    plotted.map((series, index) => [series.key, { label: series.name, color: SERIES_COLORS[index % SERIES_COLORS.length] }]),
  );
  const rows = (model.chart?.points ?? []).map((point) => ({ timeMs: point.timeMs, ...point.values }));

  return (
    <SectionPanel
      title="Time series"
      description="Nothing is plotted until you choose a series. The window ends at the latest reading."
      count={model.seriesStatus === 'ready' ? model.series.length : undefined}
    >
        <PanelBody
          status={model.seriesStatus}
          empty={model.series.length === 0}
          emptyTitle="No time series linked"
          emptyDescription="No historian series are linked to this asset."
          onRetry={model.retrySeries}
        >
          <ul className="flex flex-wrap gap-2" aria-label="Linked time series">
            {model.series.map((series) => {
              const selected = model.selectedSeries.some((ref) => instanceKey(ref) === instanceKey(series.ref));
              return (
                <li key={instanceKey(series.ref)}>
                  <Button
                    type="button"
                    variant={selected ? 'secondary' : 'outline'}
                    aria-pressed={selected}
                    className="justify-start"
                    onClick={() => model.toggleSeries(series.ref)}
                  >
                    <span>{series.name}</span>
                    {series.unit ? <Badge variant="gray">{series.unit}</Badge> : null}
                  </Button>
                </li>
              );
            })}
          </ul>
          <TruncationNote truncated={model.seriesTruncated} />
        </PanelBody>
        {model.selectedSeries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={model.range}
              onValueChange={(value) => {
                if (isPreset(value)) model.setRange(value);
              }}
            >
              <SegmentedControlList aria-label="Time range">
                {RANGE_PRESETS.map((preset) => (
                  <SegmentedControlButton key={preset} value={preset}>
                    {preset}
                  </SegmentedControlButton>
                ))}
              </SegmentedControlList>
            </SegmentedControl>
            <Button type="button" variant="outline" onClick={model.refreshChart}>
              <IconRefresh aria-hidden />
              Refresh
            </Button>
          </div>
        ) : null}
        {model.selectedSeries.length === 0 ? null : (
          <PanelBody
            status={model.chartStatus}
            empty={!model.chart || model.chart.points.length === 0}
            emptyTitle="No datapoints in this window"
            emptyDescription={emptyChartCopy(model)}
            onRetry={model.refreshChart}
          >
            <ChartContainer config={config} aria-label="Selected time series" className="h-72 w-full">
              <LineChart data={rows}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="timeMs" tickFormatter={(value) => formatTimestamp(typeof value === 'number' ? value : undefined)} minTickGap={24} />
                <YAxis width={56} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_label, payload) => formatTimestamp(readTime(payload))} />} />
                {plotted.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={`var(--color-${series.key})`}
                    strokeWidth={2}
                    dot={rows.length === 1 ? { r: 4, strokeWidth: 0 } : false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartContainer>
            {rows.length === 1 ? (
              <p className="text-sm text-muted-foreground">Only one reading in this window. Try a longer range.</p>
            ) : null}
            <QuietSeries series={model.chart?.series ?? []} />
          </PanelBody>
        )}
    </SectionPanel>
  );
}

function QuietSeries({ series }: { series: NonNullable<AssetModel['chart']>['series'] }) {
  const quiet = series.filter((item) => item.empty || item.nonNumeric);
  if (quiet.length === 0) return null;
  return <p className="text-center text-sm text-muted-foreground">{quiet.map((item) => `${item.name}: ${item.nonNumeric ? 'not a numeric series' : 'no datapoints'}`).join('. ')}</p>;
}

function emptyChartCopy(model: AssetModel): string {
  const notes = model.chart?.series.filter((series) => series.empty || series.nonNumeric) ?? [];
  if (notes.length === 0) return 'Choose another range or refresh after new data arrives.';
  return notes.map((series) => `${series.name}: ${series.nonNumeric ? 'not numeric' : 'no datapoints'}`).join('. ');
}

function isPreset(value: string | null): value is RangePreset {
  return value === '1d' || value === '7d' || value === '30d' || value === '90d';
}

function readTime(payload: Array<{ payload?: Record<string, unknown> }>): number | undefined {
  const time = payload[0]?.payload?.timeMs;
  return typeof time === 'number' ? time : undefined;
}
