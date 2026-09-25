import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RECENT_STORAGE_KEY } from '../domain/cdm';
import type { ActivityDetail, DocumentSummary } from '../domain/models';
import type { InvestigationService } from '../services/cdfInvestigationService';
import { InvestigationServiceProvider } from '../state/InvestigationServiceProvider';
import type { WorkspaceHost } from '../state/investigationState';
import { InvestigationStateProvider } from '../state/InvestigationStateProvider';

import { useAsset360ViewModel } from './useAsset360ViewModel';

const asset = { space: 'plant', externalId: 'PUMP-101' };

describe(useAsset360ViewModel.name, () => {
  it('does not fetch when no asset is selected', () => {
    const investigation = service();
    const { result } = renderHook(() => useAsset360ViewModel(), { wrapper: wrap(investigation) });
    expect(result.current.headerStatus).toBe('ready');
    expect(investigation.getAsset).not.toHaveBeenCalled();
  });

  it('loads the asset, records the visit, and surfaces a header error', async () => {
    const storage = memoryStorage();
    const investigation = service();
    const { result } = renderHook(() => useAsset360ViewModel(), { wrapper: wrap(investigation, storage, true) });
    expect(result.current.headerStatus).toBe('loading');
    await waitFor(() => expect(result.current.headerStatus).toBe('ready'));
    expect(result.current.header?.name).toBe('Pump');
    expect(storage.getItem(RECENT_STORAGE_KEY)).toContain('PUMP-101');
    expect(result.current.seriesTruncated).toBe(true);
    expect(result.current.activities[0]?.title).toBe('Seal');
    expect(result.current.documents).toHaveLength(1);

    vi.mocked(investigation.getAsset).mockRejectedValueOnce({ status: 500 });
    act(() => result.current.retryHeader());
    await waitFor(() => expect(result.current.headerStatus).toBe('error'));

    vi.mocked(investigation.listTimeSeries).mockRejectedValueOnce({ status: 403 });
    act(() => result.current.retrySeries());
    await waitFor(() => expect(result.current.seriesStatus).toBe('denied'));
  });

  it('plots a selected series and opens an external file', async () => {
    const api = host();
    const investigation = service();
    const { result } = renderHook(() => useAsset360ViewModel(), { wrapper: wrap(investigation, memoryStorage(), true, api) });
    await waitFor(() => expect(result.current.seriesStatus).toBe('ready'));
    act(() => result.current.toggleSeries({ space: 'plant', externalId: 'TS-1' }));
    await waitFor(() => expect(investigation.loadChart).toHaveBeenCalled());
    act(() => result.current.setRange('1d'));
    act(() => result.current.refreshChart());
    act(() => result.current.selectActivity({ space: 'plant', externalId: 'WO-1' }));
    expect(result.current.selectedActivity?.identifier).toBe('WO-1');

    const document = result.current.documents[0];
    if (!document) throw new Error('Document missing');
    act(() => result.current.openDocument({ ...document, preview: 'external' }));
    await waitFor(() => expect(api.navigateExternal).toHaveBeenCalled());

    vi.mocked(investigation.getDocumentUrl).mockRejectedValueOnce({ status: 401 });
    act(() => result.current.retryExternalOpen());
    await waitFor(() => expect(result.current.externalOpenStatus).toBe('denied'));
  });
});

function service(): InvestigationService {
  return {
    searchAssets: vi.fn(() => Promise.resolve([])),
    getAsset: vi.fn(() =>
      Promise.resolve({
        ref: asset,
        tag: 'PUMP-101',
        name: 'Pump',
        description: '',
        parentLabel: 'Unit',
        sourceId: 'PUMP-101',
        typeLabel: 'Pump',
      }),
    ),
    listTimeSeries: vi.fn(() =>
      Promise.resolve({
        truncated: true,
        items: [{ ref: { space: 'plant', externalId: 'TS-1' }, name: 'Flow', description: '', unit: 'm3/h' }],
      }),
    ),
    loadChart: vi.fn(() =>
      Promise.resolve({
        startMs: 1,
        endMs: 2,
        series: [],
        points: [{ timeMs: 1, values: { series0: 1 } }],
      }),
    ),
    listActivities: vi.fn((): Promise<{ truncated: boolean; items: ActivityDetail[] }> =>
      Promise.resolve({
        truncated: false,
        items: [
          {
            ref: { space: 'plant', externalId: 'WO-1' },
            identifier: 'WO-1',
            title: 'Seal',
            description: '',
            status: 'Completed',
            dateMs: 1,
          },
        ],
      }),
    ),
    listDocuments: vi.fn((): Promise<{ truncated: boolean; items: DocumentSummary[] }> =>
      Promise.resolve({
        truncated: false,
        items: [
          {
            ref: { space: 'plant', externalId: 'FILE-1' },
            name: 'Manual.pdf',
            mimeType: 'application/pdf',
            modifiedMs: 1,
            preview: 'pdf',
          },
        ],
      }),
    ),
    getDocumentUrl: vi.fn(() => Promise.resolve('https://files.test/manual.pdf')),
  };
}

function wrap(investigation: InvestigationService, storage: Storage = memoryStorage(), investigating = false, api: WorkspaceHost = host()) {
  const initialState = JSON.stringify({
    screen: investigating ? 'asset' : 'home',
    asset: investigating ? asset : undefined,
    searchQuery: '',
    selectedSeries: [],
    range: '7d',
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={client}>
        <InvestigationServiceProvider service={investigation}>
          <InvestigationStateProvider api={api} initialState={initialState} storage={storage}>
            {children}
          </InvestigationStateProvider>
        </InvestigationServiceProvider>
      </QueryClientProvider>
    );
  };
}

function host(): WorkspaceHost {
  return {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
    navigateExternal: vi.fn(() => Promise.resolve(true)),
  };
}

function memoryStorage(): Storage {
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
