import type { HostAppAPI } from '@cognite/app-sdk';
import { CogniteClient } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import type { InvestigationService } from './services/cdfInvestigationService';
import type { WorkspaceHost } from './state/investigationState';

type AppDeps = NonNullable<ComponentProps<typeof App>['deps']>;

function makeApi(): WorkspaceHost {
  return {
    syncInternalState: vi.fn<WorkspaceHost['syncInternalState']>(() => Promise.resolve(true)),
    navigateExternal: vi.fn<WorkspaceHost['navigateExternal']>(() => Promise.resolve(true)),
  };
}

function hostApi(): HostAppAPI {
  return {
    getProject: vi.fn<HostAppAPI['getProject']>(() => Promise.resolve('publicdatacdm')),
    getBaseUrl: vi.fn<HostAppAPI['getBaseUrl']>(() => Promise.resolve('https://cognite.test')),
    getAccessToken: vi.fn<HostAppAPI['getAccessToken']>(() => Promise.resolve('test-token')),
    getAppId: vi.fn<HostAppAPI['getAppId']>(() => Promise.resolve('test-app-id')),
    syncInternalState: vi.fn<HostAppAPI['syncInternalState']>(() => Promise.resolve(true)),
    navigateInternal: vi.fn<HostAppAPI['navigateInternal']>(() => Promise.resolve(true)),
    navigateExternal: vi.fn<HostAppAPI['navigateExternal']>(() => Promise.resolve(true)),
    registerAgentServer: vi.fn<HostAppAPI['registerAgentServer']>(() => Promise.resolve()),
    unregisterAgentServer: vi.fn<HostAppAPI['unregisterAgentServer']>(() => Promise.resolve()),
    sendAgentLayoutMode: vi.fn<HostAppAPI['sendAgentLayoutMode']>(() => Promise.resolve()),
    sendAgentMessage: vi.fn<HostAppAPI['sendAgentMessage']>(() => Promise.resolve()),
    sendAgentTheme: vi.fn<HostAppAPI['sendAgentTheme']>(() => Promise.resolve()),
    setActiveAgent: vi.fn<HostAppAPI['setActiveAgent']>(() => Promise.resolve()),
    setHideShell: vi.fn<HostAppAPI['setHideShell']>(() => Promise.resolve()),
  };
}

function makeDeps(): AppDeps {
  return {
    connectToHostApp: vi.fn<AppDeps['connectToHostApp']>(() => Promise.resolve({ api: hostApi() })),
    createClient: vi.fn<AppDeps['createClient']>((config) => new CogniteClient(config)),
  };
}

function makeService(): InvestigationService {
  return {
    searchAssets: vi.fn(() => Promise.resolve([])),
    getAsset: vi.fn(() =>
      Promise.resolve({
        ref: { space: 'assets', externalId: 'PUMP-101' },
        tag: 'PUMP-101',
        name: 'Cooling water pump',
        description: 'Train 1',
        parentLabel: 'Unit 12',
        sourceId: 'PUMP-101',
        typeLabel: 'Centrifugal pump',
      }),
    ),
    listTimeSeries: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    loadChart: vi.fn(() => Promise.resolve({ startMs: undefined, endMs: undefined, series: [], points: [] })),
    listActivities: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    listDocuments: vi.fn(() => Promise.resolve({ items: [], truncated: false })),
    getDocumentUrl: vi.fn(() => Promise.resolve('https://files.test/doc')),
  };
}

function renderApp(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderApp(
      <App deps={makeDeps()} connectToHostApp={() => new Promise<never>(() => undefined)} />,
    );
    expect(screen.getByText('Loading project...')).toBeInTheDocument();
  });

  it('renders the asset search home screen', async () => {
    renderApp(
      <App deps={makeDeps()} connectToHostApp={() => Promise.resolve({ api: makeApi() })} service={makeService()} />,
    );
    expect(await screen.findByRole('heading', { name: 'Ashwini Asset 360' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search assets' })).toBeInTheDocument();
    expect(screen.getByText('Search for equipment')).toBeInTheDocument();
  });

  it('syncs the selected asset into the host URL', async () => {
    const api = makeApi();
    const user = userEvent.setup();
    const service = makeService();
    vi.mocked(service.searchAssets).mockResolvedValue([
      {
        ref: { space: 'assets', externalId: 'PUMP-101' },
        tag: 'PUMP-101',
        name: 'Cooling water pump',
        description: 'Train 1',
        parentLabel: 'Unit 12',
        sourceId: 'PUMP-101',
      },
    ]);
    renderApp(<App deps={makeDeps()} connectToHostApp={() => Promise.resolve({ api })} service={service} />);
    const search = await screen.findByRole('searchbox', { name: 'Search assets' });
    await user.type(search, 'PU');
    expect(await screen.findByRole('row', { name: /PUMP-101/ })).toBeInTheDocument();
    await user.click(screen.getByText('Cooling water pump'));
    await waitFor(() => {
      expect(api.syncInternalState).toHaveBeenCalledWith(expect.stringContaining('PUMP-101'));
    });
    expect(screen.getByRole('button', { name: 'Back to search' })).toBeInTheDocument();
    expect(screen.getByText(/Centrifugal pump/)).toBeInTheDocument();
  });

  it('shows a connection error when the host rejects the app', async () => {
    renderApp(<App deps={makeDeps()} connectToHostApp={() => Promise.reject(new Error('down'))} />);
    expect(await screen.findByText('Failed to connect to Fusion host')).toBeInTheDocument();
  });

  it('builds the investigation service from the signed-in client', async () => {
    renderApp(<App deps={makeDeps()} connectToHostApp={() => Promise.resolve({ api: makeApi() })} />);
    expect(await screen.findByRole('heading', { name: 'Ashwini Asset 360' })).toBeInTheDocument();
  });
});
