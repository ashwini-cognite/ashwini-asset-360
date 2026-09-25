import { describe, expect, it } from 'vitest';

import { parseInvestigationState } from './investigationState';

describe(parseInvestigationState.name, () => {
  it('falls back when the host state is missing or invalid', () => {
    expect(parseInvestigationState(undefined).screen).toBe('home');
    expect(parseInvestigationState('{').screen).toBe('home');
    expect(parseInvestigationState('[]').screen).toBe('home');
    expect(parseInvestigationState(JSON.stringify({ screen: 'asset' })).screen).toBe('home');
  });

  it('restores an asset investigation and drops series that are not refs', () => {
    const series = Array.from({ length: 14 }, (_, index) => ({ space: 'plant', externalId: `TS-${index}` }));
    const parsed = parseInvestigationState(
      JSON.stringify({
        screen: 'asset',
        asset: { space: 'plant', externalId: 'PUMP-101' },
        searchQuery: 12,
        selectedSeries: [...series, { space: 'plant' }, 'nope'],
        range: 'year',
        selectedActivity: { space: 'plant', externalId: 'WO-1' },
        selectedDocument: { nope: true },
      }),
    );
    expect(parsed.screen).toBe('asset');
    expect(parsed.asset?.externalId).toBe('PUMP-101');
    expect(parsed.searchQuery).toBe('');
    expect(parsed.selectedSeries).toHaveLength(12);
    expect(parsed.range).toBe('7d');
    expect(parsed.selectedActivity?.externalId).toBe('WO-1');
    expect(parsed.selectedDocument).toBeUndefined();
  });
});
