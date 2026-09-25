import type { InstanceRef } from './values';

export type AssetSummary = {
  ref: InstanceRef;
  tag: string;
  name: string;
  description: string;
  parentLabel: string;
  sourceId: string;
};

export type AssetDetail = AssetSummary & {
  typeLabel: string;
};

export type TimeSeriesSummary = {
  ref: InstanceRef;
  name: string;
  description: string;
  unit: string;
};

export type ActivityDetail = {
  ref: InstanceRef;
  identifier: string;
  title: string;
  description: string;
  status: 'Completed' | 'In progress' | 'Scheduled' | 'Undated';
  dateMs: number | undefined;
  startTime?: number;
  endTime?: number;
  scheduledStartTime?: number;
  scheduledEndTime?: number;
};

export type DocumentSummary = {
  ref: InstanceRef;
  name: string;
  mimeType: string;
  modifiedMs: number | undefined;
  preview: 'pdf' | 'image' | 'external';
};

export type ChartSeries = {
  ref: InstanceRef;
  name: string;
  key: string;
  empty: boolean;
  nonNumeric: boolean;
  latestValue: string;
};

export type ChartPoint = {
  timeMs: number;
  values: Record<string, number | undefined>;
};

export type ChartModel = {
  startMs: number | undefined;
  endMs: number | undefined;
  series: ChartSeries[];
  points: ChartPoint[];
};

export type CappedList<T> = {
  items: T[];
  truncated: boolean;
};
