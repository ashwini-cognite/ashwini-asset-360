import { describe, expect, it } from 'vitest';

import { activityStatus, compareActivitiesByRecency } from './activity';
import { cdmView, viewProperty } from './cdm';
import { previewKind } from './preview';
import { readRecent, rememberAsset } from './recentAssets';
import { readRetryAfterMs, withRetry } from './retry';
import { rankAssets } from './searchRank';
import { isRangePreset, rangeGranularity, windowEndingAtLatest } from './timeWindow';
import {
  formatDate,
  formatTimestamp,
  isAccessDenied,
  isDmsNode,
  isUnknownPropertyError,
  readRelation,
  readString,
  readTimestamp,
} from './values';

describe('windowEndingAtLatest', () => {
  it('ends at the newest datapoint instead of wall-clock now', () => {
    const now = Date.parse('2026-09-25T12:00:00Z');
    const latest = Date.parse('2026-01-01T00:00:00Z');
    const window = windowEndingAtLatest([latest, latest - 1000], '7d');
    expect(window?.endMs).toBe(latest);
    expect(window?.startMs).toBe(latest - 7 * 24 * 60 * 60 * 1000);
    expect(window?.endMs).not.toBe(now);
  });

  it('returns undefined when no series has a datapoint', () => {
    expect(windowEndingAtLatest([], '7d')).toBeUndefined();
  });
});

describe('activityStatus', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');

  it('marks a past end time as completed', () => {
    expect(activityStatus({ endTime: now - 1 }, now)).toBe('Completed');
  });

  it('marks a started activity without an end as in progress', () => {
    expect(activityStatus({ startTime: now - 1 }, now)).toBe('In progress');
  });

  it('marks a future schedule, a past schedule, and a blank record', () => {
    expect(activityStatus({ scheduledStartTime: now + 1 }, now)).toBe('Scheduled');
    expect(activityStatus({ scheduledEndTime: now - 1 }, now)).toBe('Scheduled');
    expect(activityStatus({}, now)).toBe('Undated');
    expect(activityStatus({ endTime: now + 1, startTime: now - 1 }, now)).toBe('In progress');
  });

  it('sorts newer end times first', () => {
    const older = { endTime: 10 };
    const newer = { endTime: 50 };
    expect(compareActivitiesByRecency(older, newer)).toBeGreaterThan(0);
    expect(compareActivitiesByRecency({}, { scheduledStartTime: 5 })).toBeGreaterThan(0);
  });
});

describe('rankAssets', () => {
  it('puts an exact tag match ahead of a text hit', () => {
    const ranked = rankAssets(
      'PUMP-101',
      [{ ref: { space: 'a', externalId: 'other' }, tag: 'other', name: 'PUMP-101 motor', description: '', sourceId: '' }],
      [{ ref: { space: 'a', externalId: 'PUMP-101' }, tag: 'PUMP-101', name: 'Pump', description: '', sourceId: '' }],
    );
    expect(ranked.map((item) => item.tag)).toEqual(['PUMP-101', 'other']);
  });

  it('dedupes the same asset and ranks a source id prefix ahead of a text hit', () => {
    const shared = { ref: { space: 'a', externalId: 'P-1' }, tag: 'P-1', name: 'Pump', description: '', sourceId: 'SRC-9' };
    const text = { ref: { space: 'a', externalId: 'other' }, tag: 'other', name: 'src pump', description: '', sourceId: '' };
    const ranked = rankAssets('src', [text, shared], [shared]);
    expect(ranked.map((item) => item.tag)).toEqual(['P-1', 'other']);
    const exactSource = { ref: { space: 'a', externalId: 'x' }, tag: 'x', name: '', description: '', sourceId: 'SRC' };
    expect(rankAssets('SRC', [], [exactSource]).map((item) => item.tag)).toEqual(['x']);
  });
});

describe('recent assets', () => {
  it('keeps the ten newest visits and drops the oldest', () => {
    const storage = createMemoryStorage();
    for (let index = 0; index < 12; index += 1) {
      rememberAsset(storage, 'recent', {
        ref: { space: 'a', externalId: `A-${index}` },
        tag: `A-${index}`,
        name: `Asset ${index}`,
      });
    }
    const recent = readRecent(storage, 'recent');
    expect(recent).toHaveLength(10);
    expect(recent[0]?.tag).toBe('A-11');
    expect(recent.some((item) => item.tag === 'A-0')).toBe(false);
  });

  it('ignores a missing, invalid, or non-asset payload', () => {
    const storage = createMemoryStorage();
    expect(readRecent(storage, 'missing')).toEqual([]);
    storage.setItem('bad', '{');
    expect(readRecent(storage, 'bad')).toEqual([]);
    storage.setItem('object', '{}');
    expect(readRecent(storage, 'object')).toEqual([]);
    storage.setItem('mixed', JSON.stringify([{ tag: 'A', name: 'A', ref: { space: 's', externalId: 'A' } }, { tag: 1 }]));
    expect(readRecent(storage, 'mixed')).toHaveLength(1);
  });
});

describe('access and preview', () => {
  it('treats 403 as no access and keeps other failures as errors', () => {
    expect(isAccessDenied({ status: 403 })).toBe(true);
    expect(isAccessDenied({ status: 500 })).toBe(false);
  });

  it('previews pdf and images and sends other types outside', () => {
    expect(previewKind('application/pdf')).toBe('pdf');
    expect(previewKind(' image/jpeg ')).toBe('image');
    expect(previewKind('image/gif')).toBe('image');
    expect(previewKind('image/webp')).toBe('image');
    expect(previewKind('application/vnd.ms-excel')).toBe('external');
  });

  it('reads epoch and ISO timestamps and rejects other values', () => {
    expect(readTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(readTimestamp('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(readTimestamp('not-a-date')).toBeUndefined();
    expect(readTimestamp(Number.NaN)).toBeUndefined();
    expect(readString(12)).toBe('');
  });

  it('recognizes nodes, relations, and unknown-property failures', () => {
    expect(isDmsNode(null)).toBe(false);
    expect(isDmsNode({ instanceType: 'node', space: 's', externalId: 'e' })).toBe(false);
    expect(readRelation({ space: 's' })).toBeUndefined();
    expect(readRelation({ space: 's', externalId: 'e' })).toEqual({ space: 's', externalId: 'e' });
    const missing = new Error('nope');
    expect(isUnknownPropertyError(missing)).toBe(false);
    const unknown = new Error('Unknown property assets');
    Object.assign(unknown, { status: 400 });
    expect(isUnknownPropertyError(unknown)).toBe(true);
    expect(isAccessDenied(null)).toBe(false);
  });
});

describe('time window and views', () => {
  it('describes each preset and ignores non-finite timestamps', () => {
    expect(isRangePreset('7d')).toBe(true);
    expect(isRangePreset('year')).toBe(false);
    expect(rangeGranularity('1d')).toBe('5m');
    expect(rangeGranularity('30d')).toBe('6h');
    expect(rangeGranularity('90d')).toBe('1d');
    expect(windowEndingAtLatest([Number.NaN], '1d')).toBeUndefined();
    expect(cdmView('CogniteAsset').version).toBe('v1');
    expect(viewProperty('CogniteAsset', 'name')).toEqual(['cdf_cdm', 'CogniteAsset/v1', 'name']);
  });
});

describe('withRetry', () => {
  const readStatus = (error: unknown) =>
    typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : undefined;

  it('retries a 429 and then returns the value', async () => {
    let calls = 0;
    const result = await withRetry(
      () => {
        calls += 1;
        if (calls < 3) return Promise.reject({ status: 429 });
        return Promise.resolve('ok');
      },
      readStatus,
      () => Promise.resolve(),
      { random: () => 0 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('waits with jitter unless Retry-After says otherwise, and stops after three 429s', async () => {
    const waits: number[] = [];
    const sleep = (ms: number) => {
      waits.push(ms);
      return Promise.resolve();
    };
    await expect(
      withRetry(() => Promise.reject({ status: 429 }), readStatus, sleep, { random: () => 0 }),
    ).rejects.toEqual({ status: 429 });
    expect(waits).toEqual([125, 250]);

    const capped: number[] = [];
    await expect(
      withRetry(
        () => Promise.reject({ status: 429, headers: { 'Retry-After': '10' } }),
        readStatus,
        (ms) => {
          capped.push(ms);
          return Promise.resolve();
        },
        { random: () => 1 },
      ),
    ).rejects.toEqual({ status: 429, headers: { 'Retry-After': '10' } });
    expect(capped).toEqual([2000, 2000]);
    expect(readRetryAfterMs({ headers: { get: (name: string) => (name === 'retry-after' ? '0' : null) } }, 0)).toBe(0);
    expect(readRetryAfterMs({ headers: { 'retry-after': 2 } }, 0)).toBe(2000);
    const later = Date.parse('2026-01-01T00:00:02Z');
    expect(readRetryAfterMs({ headers: { 'retry-after': 'Thu, 01 Jan 2026 00:00:01 GMT' } }, later)).toBe(0);
    expect(readRetryAfterMs({ headers: { 'retry-after': 'soon' } }, 0)).toBeUndefined();
    expect(readRetryAfterMs('nope', 0)).toBeUndefined();

    const immediate: number[] = [];
    await expect(
      withRetry(() => Promise.reject(new Error('down')), readStatus, (ms) => {
        immediate.push(ms);
        return Promise.resolve();
      }),
    ).rejects.toThrow('down');
    expect(immediate).toEqual([]);
  });
});

describe('formatDate', () => {
  it('omits the clock time that a full timestamp includes', () => {
    const ms = Date.UTC(2015, 4, 29, 5, 30);
    expect(formatDate(undefined)).toBe('No date');
    expect(formatDate(ms)).not.toBe('No date');
    expect(formatDate(ms).length).toBeLessThan(formatTimestamp(ms).length);
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
