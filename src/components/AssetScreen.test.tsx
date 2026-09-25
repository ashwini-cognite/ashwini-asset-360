import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ActivityDetail, ChartModel, DocumentSummary } from '../domain/models';
import type { InvestigationService } from '../services/cdfInvestigationService';
import { InvestigationServiceProvider } from '../state/InvestigationServiceProvider';
import type { WorkspaceHost } from '../state/investigationState';
import { InvestigationStateProvider } from '../state/InvestigationStateProvider';

import { AssetScreen } from './AssetScreen';

const asset = { space: 'plant', externalId: 'PUMP-101' };

describe(AssetScreen.name, () => {
  it('shows the asset, a cut-off list, a chart, a work order, and a document preview', async () => {
    const user = userEvent.setup();
    const api = host();
    const investigation = loadedService();
    renderScreen(investigation, api);
    expect(await screen.findByRole('heading', { name: 'Cooling water pump' })).toBeInTheDocument();
    expect(screen.getByText(/Centrifugal pump/)).toBeInTheDocument();
    expect(screen.getByText('Showing the first 200. More records exist for this asset.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Flow/ }));
    const chart = await screen.findByRole('img', { name: 'Selected time series' });
    expect(chart.getAttribute('style')).toContain('var(--chart-fjord-color-1)');
    expect(screen.getByText('Only one reading in this window. Try a longer range.')).toBeInTheDocument();
    expect(screen.getByText(/Note: no datapoints/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '1d' }));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(investigation.loadChart).toHaveBeenCalled();

    await user.click(screen.getByText('Replace seal'));
    expect(screen.getByRole('region', { name: 'Work order detail' })).toBeInTheDocument();
    expect(screen.getByText('Leaking')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Undated')).toBeInTheDocument();

    await user.click(screen.getByText('Manual.pdf'));
    expect(await screen.findByTitle('Manual.pdf')).toBeInTheDocument();
    await user.click(screen.getByText('Photo.png'));
    expect(await screen.findByRole('img', { name: 'Photo.png' })).toBeInTheDocument();
    await user.click(screen.getByText('Spec.xlsx'));
    expect(await screen.findByRole('button', { name: 'Open Spec.xlsx' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open Spec.xlsx' }));
    expect(api.navigateExternal).toHaveBeenCalledWith({ url: 'https://files.test/FILE-3', openInNewTab: true });
    await user.click(screen.getByRole('button', { name: 'Back to search' }));
    expect(api.syncInternalState).toHaveBeenCalledWith(expect.stringContaining('"screen":"home"'));
  });

  it('shows an empty asset and independent empty panels', async () => {
    const investigation = loadedService();
    vi.mocked(investigation.getAsset).mockResolvedValue({
      ref: asset,
      tag: 'PUMP-101',
      name: 'Bare pump',
      description: '',
      parentLabel: 'No parent',
      sourceId: 'PUMP-101',
      typeLabel: 'Unknown type',
    });
    vi.mocked(investigation.listTimeSeries).mockResolvedValue({ items: [], truncated: false });
    vi.mocked(investigation.listActivities).mockResolvedValue({ items: [], truncated: false });
    vi.mocked(investigation.listDocuments).mockResolvedValue({ items: [], truncated: false });
    renderScreen(investigation);
    expect(await screen.findByRole('heading', { name: 'Bare pump' })).toBeInTheDocument();
    expect(screen.getByText('No description on this asset.')).toBeInTheDocument();
    expect(screen.getByText('No time series linked')).toBeInTheDocument();
    expect(screen.getByText('No work orders linked')).toBeInTheDocument();
    expect(screen.getByText('No documents linked')).toBeInTheDocument();
  });

  it('keeps a panel error from hiding the asset', async () => {
    const user = userEvent.setup();
    const investigation = loadedService();
    vi.mocked(investigation.listActivities).mockRejectedValueOnce({ status: 500 }).mockResolvedValueOnce({ items: [], truncated: false });
    vi.mocked(investigation.getAsset).mockRejectedValueOnce({ status: 404 });
    renderScreen(investigation);
    expect(await screen.findByText('Asset not found')).toBeInTheDocument();
    expect(await screen.findByText('This panel could not load')).toBeInTheDocument();
    const retry = screen.getAllByRole('button', { name: 'Retry' })[0];
    if (!retry) throw new Error('Retry missing');
    await user.click(retry);
  });

  it('shows no access on the header', async () => {
    const investigation = loadedService();
    vi.mocked(investigation.getAsset).mockRejectedValue({ status: 403 });
    renderScreen(investigation);
    expect(await screen.findByText('Your account cannot read this data.')).toBeInTheDocument();
  });
});

function renderScreen(investigation: InvestigationService, api: WorkspaceHost = host()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const initialState = JSON.stringify({
    screen: 'asset',
    asset,
    searchQuery: '',
    selectedSeries: [],
    range: '7d',
  });
  const ui: ReactNode = (
    <QueryClientProvider client={client}>
      <InvestigationServiceProvider service={investigation}>
        <InvestigationStateProvider api={api} initialState={initialState} storage={memoryStorage()}>
          <AssetScreen />
        </InvestigationStateProvider>
      </InvestigationServiceProvider>
    </QueryClientProvider>
  );
  return render(ui);
}

function loadedService(): InvestigationService {
  const documents: DocumentSummary[] = [
    { ref: { space: 'plant', externalId: 'FILE-1' }, name: 'Manual.pdf', mimeType: 'application/pdf', modifiedMs: 3, preview: 'pdf' },
    { ref: { space: 'plant', externalId: 'FILE-2' }, name: 'Photo.png', mimeType: 'image/png', modifiedMs: 2, preview: 'image' },
    { ref: { space: 'plant', externalId: 'FILE-3' }, name: 'Spec.xlsx', mimeType: '', modifiedMs: undefined, preview: 'external' },
  ];
  return {
    searchAssets: vi.fn(() => Promise.resolve([])),
    getAsset: vi.fn(() =>
      Promise.resolve({
        ref: asset,
        tag: 'PUMP-101',
        name: 'Cooling water pump',
        description: 'Train 1',
        parentLabel: 'Unit 12',
        sourceId: 'PUMP-101',
        typeLabel: 'Centrifugal pump',
      }),
    ),
    listTimeSeries: vi.fn(() =>
      Promise.resolve({
        truncated: true,
        items: [
          { ref: { space: 'plant', externalId: 'TS-1' }, name: 'Flow', description: '', unit: 'm3/h' },
          { ref: { space: 'plant', externalId: 'TS-2' }, name: 'Note', description: '', unit: '' },
        ],
      }),
    ),
    loadChart: vi.fn((): Promise<ChartModel> =>
      Promise.resolve({
        startMs: 1,
        endMs: 2,
        series: [
          { ref: { space: 'plant', externalId: 'TS-1' }, name: 'Flow', key: 'series0', empty: false, nonNumeric: false, latestValue: '1' },
          { ref: { space: 'plant', externalId: 'TS-2' }, name: 'Note', key: 'series1', empty: true, nonNumeric: false, latestValue: '' },
        ],
        points: [{ timeMs: Date.parse('2020-01-01T00:00:00Z'), values: { series0: 1 } }],
      }),
    ),
    listActivities: vi.fn((): Promise<{ truncated: boolean; items: ActivityDetail[] }> =>
      Promise.resolve({
        truncated: false,
        items: [
          {
            ref: { space: 'plant', externalId: 'WO-1' },
            identifier: 'WO-1',
            title: 'Replace seal',
            description: 'Leaking',
            status: 'In progress',
            dateMs: 10,
            startTime: 1,
          },
          {
            ref: { space: 'plant', externalId: 'WO-2' },
            identifier: 'WO-2',
            title: 'Finished job',
            description: '',
            status: 'Completed',
            dateMs: 9,
          },
          {
            ref: { space: 'plant', externalId: 'WO-3' },
            identifier: 'WO-3',
            title: 'Future job',
            description: '',
            status: 'Scheduled',
            dateMs: 8,
          },
          {
            ref: { space: 'plant', externalId: 'WO-4' },
            identifier: 'WO-4',
            title: 'Mystery job',
            description: '',
            status: 'Undated',
            dateMs: undefined,
          },
        ],
      }),
    ),
    listDocuments: vi.fn(() => Promise.resolve({ truncated: false, items: documents })),
    getDocumentUrl: vi.fn((ref: { externalId: string }) => Promise.resolve(`https://files.test/${ref.externalId}`)),
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
