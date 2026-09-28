import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RECENT_STORAGE_KEY } from '../domain/cdm';

import { useInvestigationState, type WorkspaceHost } from './investigationState';
import { InvestigationStateProvider } from './InvestigationStateProvider';

describe(InvestigationStateProvider.name, () => {
  it('throws when the provider is missing', () => {
    function Probe() {
      useInvestigationState();
      return null;
    }
    expect(() => render(<Probe />)).toThrow('Investigation state is unavailable.');
  });

  it('publishes search, asset, series, and external navigation', async () => {
    const user = userEvent.setup();
    const api: WorkspaceHost = {
      syncInternalState: vi.fn(() => Promise.resolve(true)),
      navigateExternal: vi.fn(() => Promise.resolve(true)),
    };
    const storage = memoryStorage();
    render(
      <InvestigationStateProvider api={api} storage={storage}>
        <Controls />
      </InvestigationStateProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('query:PU')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('screen:asset')).toBeInTheDocument();
    expect(storage.getItem(RECENT_STORAGE_KEY)).toContain('PUMP-101');
    for (let index = 0; index < 9; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Toggle' }));
    }
    expect(screen.getByText('series:8')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Toggle same' }));
    await user.click(screen.getByRole('button', { name: 'Toggle same' }));
    await user.click(screen.getByRole('button', { name: 'Range' }));
    await user.click(screen.getByRole('button', { name: 'Activity' }));
    await user.click(screen.getByRole('button', { name: 'Document' }));
    await user.click(screen.getByRole('button', { name: 'External' }));
    expect(api.navigateExternal).toHaveBeenCalledWith({ url: 'https://files.test/a', openInNewTab: true });
    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByText('screen:home')).toBeInTheDocument();
    expect(api.syncInternalState).toHaveBeenCalled();
  });

  it('uses an in-memory store when browser storage is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });
    try {
      render(
        <InvestigationStateProvider api={host()}>
          <span>ready</span>
        </InvestigationStateProvider>,
      );
      expect(screen.getByText('ready')).toBeInTheDocument();
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });
});

function Controls() {
  const model = useInvestigationState();
  return (
    <div>
      <span>screen:{model.state.screen}</span>
      <span>query:{model.state.searchQuery}</span>
      <span>series:{model.state.selectedSeries.length}</span>
      <button type="button" onClick={() => model.setSearchQuery('PU')}>
        Search
      </button>
      <button
        type="button"
        onClick={() => model.openAsset({ ref: { space: 'plant', externalId: 'PUMP-101' }, tag: 'PUMP-101', name: 'Pump' })}
      >
        Open
      </button>
      <button type="button" onClick={() => model.toggleSeries({ space: 'plant', externalId: `TS-${model.state.selectedSeries.length}` })}>
        Toggle
      </button>
      <button type="button" onClick={() => model.toggleSeries({ space: 'plant', externalId: 'TS-SAME' })}>
        Toggle same
      </button>
      <button type="button" onClick={() => model.setRange('30d')}>
        Range
      </button>
      <button type="button" onClick={() => model.selectActivity({ space: 'plant', externalId: 'WO-1' })}>
        Activity
      </button>
      <button type="button" onClick={() => model.selectDocument({ space: 'plant', externalId: 'FILE-1' })}>
        Document
      </button>
      <button type="button" onClick={() => void model.openExternal('https://files.test/a')}>
        External
      </button>
      <button type="button" onClick={model.goHome}>
        Home
      </button>
    </div>
  );
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
