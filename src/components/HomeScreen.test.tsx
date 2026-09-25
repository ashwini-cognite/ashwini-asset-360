import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RECENT_STORAGE_KEY } from '../domain/cdm';
import type { InvestigationService } from '../services/cdfInvestigationService';
import { InvestigationServiceProvider } from '../state/InvestigationServiceProvider';
import type { WorkspaceHost } from '../state/investigationState';
import { InvestigationStateProvider } from '../state/InvestigationStateProvider';

import { HomeScreen } from './HomeScreen';

describe(HomeScreen.name, () => {
  it('asks for a search when nothing has been opened', async () => {
    renderScreen(service());
    expect(await screen.findByRole('heading', { name: 'Asset 360' })).toBeInTheDocument();
    expect(screen.getByText('Search for equipment')).toBeInTheDocument();
    expect(screen.getByText('No recent assets')).toBeInTheDocument();
    expect(screen.getByText('Recent assets')).toBeInTheDocument();
  });

  it('opens a match and a recent asset', async () => {
    const user = userEvent.setup();
    const api = host();
    const investigation = service();
    vi.mocked(investigation.searchAssets).mockResolvedValue([
      {
        ref: { space: 'plant', externalId: 'PUMP-101' },
        tag: 'PUMP-101',
        name: 'Cooling water pump',
        description: 'Train 1',
        parentLabel: 'Unit 12',
        sourceId: 'PUMP-101',
      },
    ]);
    const storage = memoryStorage();
    storage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify([{ ref: { space: 'plant', externalId: 'VALVE-1' }, tag: 'VALVE-1', name: 'Valve' }]),
    );
    renderScreen(investigation, api, storage);
    expect(await screen.findByRole('row', { name: /VALVE-1/ })).toBeInTheDocument();
    expect(screen.queryByText('Search for equipment')).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search assets' });
    await user.type(search, 'PU');
    expect(await screen.findByRole('row', { name: /PUMP-101/ })).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    await user.click(screen.getByText('Unit 12'));
    expect(api.syncInternalState).toHaveBeenCalledWith(expect.stringContaining('PUMP-101'));
    await user.click(search);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByRole('row', { name: /VALVE-1/ })).toBeInTheDocument();
    await user.click(screen.getByText('Valve'));
    expect(api.syncInternalState).toHaveBeenCalledWith(expect.stringContaining('VALVE-1'));
  });

  it('shows an empty result and retries a failed search', async () => {
    const user = userEvent.setup();
    const investigation = service();
    vi.mocked(investigation.searchAssets).mockRejectedValueOnce({ status: 500 }).mockResolvedValueOnce([]);
    renderScreen(investigation);
    await user.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'ZZ');
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No assets matched')).toBeInTheDocument();
  });

  it('shows no access when search is forbidden', async () => {
    const user = userEvent.setup();
    const investigation = service();
    vi.mocked(investigation.searchAssets).mockRejectedValue({ status: 401 });
    renderScreen(investigation);
    await user.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'ZZ');
    expect(await screen.findByText('No access')).toBeInTheDocument();
  });
});

function renderScreen(investigation: InvestigationService, api: WorkspaceHost = host(), storage?: Storage) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui: ReactNode = (
    <QueryClientProvider client={client}>
      <InvestigationServiceProvider service={investigation}>
        <InvestigationStateProvider api={api} storage={storage}>
          <HomeScreen />
        </InvestigationStateProvider>
      </InvestigationServiceProvider>
    </QueryClientProvider>
  );
  return render(ui);
}

function service(): InvestigationService {
  return {
    searchAssets: vi.fn(() => Promise.resolve([])),
    getAsset: vi.fn(() => Promise.reject(new Error('unused'))),
    listTimeSeries: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    loadChart: vi.fn(() => Promise.resolve({ startMs: undefined, endMs: undefined, series: [], points: [] })),
    listActivities: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    listDocuments: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    getDocumentUrl: vi.fn(() => Promise.resolve('https://files.test/a')),
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
