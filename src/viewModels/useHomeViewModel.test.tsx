import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { InvestigationService } from '../services/cdfInvestigationService';
import { InvestigationServiceProvider } from '../state/InvestigationServiceProvider';
import type { WorkspaceHost } from '../state/investigationState';
import { InvestigationStateProvider } from '../state/InvestigationStateProvider';

import { useHomeViewModel } from './useHomeViewModel';

describe(useHomeViewModel.name, () => {
  it('stays ready before the query is long enough to search', () => {
    const { result } = renderHook(() => useHomeViewModel(), { wrapper: wrap(service()) });
    expect(result.current.searchStatus).toBe('ready');
    expect(result.current.results).toEqual([]);
  });

  it('shows a loading search until matches arrive', async () => {
    const search = vi.fn(() => new Promise<never>(() => undefined));
    const { result } = renderHook(() => useHomeViewModel(), {
      wrapper: wrap(service({ searchAssets: search }), { searchQuery: 'PU' }),
    });
    expect(result.current.searchStatus).toBe('loading');
  });

  it('returns matches and then reports error, denied, and missing results', async () => {
    const match = {
      ref: { space: 'plant', externalId: 'PUMP-101' },
      tag: 'PUMP-101',
      name: 'Pump',
      description: '',
      parentLabel: 'Unit',
      sourceId: 'PUMP-101',
    };
    const search = vi.fn().mockResolvedValueOnce([match]).mockRejectedValueOnce({ status: 500 }).mockRejectedValueOnce({ status: 403 }).mockRejectedValueOnce({ status: 404 });
    const { result } = renderHook(() => useHomeViewModel(), {
      wrapper: wrap(service({ searchAssets: search }), { searchQuery: 'PU' }),
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    result.current.retrySearch();
    await waitFor(() => expect(result.current.searchStatus).toBe('error'));

    result.current.retrySearch();
    await waitFor(() => expect(result.current.searchStatus).toBe('denied'));

    result.current.retrySearch();
    await waitFor(() => expect(result.current.searchStatus).toBe('ready'));
  });
});

function service(overrides: Partial<InvestigationService> = {}): InvestigationService {
  return {
    searchAssets: vi.fn(() => Promise.resolve([])),
    getAsset: vi.fn(() => Promise.reject(new Error('unused'))),
    listTimeSeries: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    loadChart: vi.fn(() => Promise.resolve({ startMs: undefined, endMs: undefined, series: [], points: [] })),
    listActivities: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    listDocuments: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    getDocumentUrl: vi.fn(() => Promise.resolve('https://files.test/a')),
    ...overrides,
  };
}

function wrap(investigation: InvestigationService, state: { searchQuery?: string } = {}) {
  const api: WorkspaceHost = {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
    navigateExternal: vi.fn(() => Promise.resolve(true)),
  };
  const initialState = JSON.stringify({
    screen: 'home',
    searchQuery: state.searchQuery ?? '',
    selectedSeries: [],
    range: '7d',
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={client}>
        <InvestigationServiceProvider service={investigation}>
          <InvestigationStateProvider api={api} initialState={initialState}>
            {children}
          </InvestigationStateProvider>
        </InvestigationServiceProvider>
      </QueryClientProvider>
    );
  };
}
