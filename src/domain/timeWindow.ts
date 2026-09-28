export type RangePreset = '1d' | '7d' | '30d' | '90d';

export const DEFAULT_RANGE: RangePreset = '7d';

export const RANGE_PRESETS: RangePreset[] = ['1d', '7d', '30d', '90d'];

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_LENGTH_MS: Record<RangePreset, number> = {
  '1d': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
};

const RANGE_GRANULARITY: Record<RangePreset, string> = {
  '1d': '5m',
  '7d': '1h',
  '30d': '6h',
  '90d': '1d',
};

export function rangeLengthMs(preset: RangePreset): number {
  return RANGE_LENGTH_MS[preset];
}

export function rangeGranularity(preset: RangePreset): string {
  return RANGE_GRANULARITY[preset];
}

export function isRangePreset(value: unknown): value is RangePreset {
  return value === '1d' || value === '7d' || value === '30d' || value === '90d';
}

export type AnchoredWindow = {
  startMs: number;
  endMs: number;
};

/** End of window is the latest datapoint, never wall-clock now. */
export function windowEndingAtLatest(
  latestTimestamps: number[],
  preset: RangePreset,
): AnchoredWindow | undefined {
  const finite = latestTimestamps.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return undefined;
  const endMs = Math.max(...finite);
  return { startMs: endMs - rangeLengthMs(preset), endMs };
}
