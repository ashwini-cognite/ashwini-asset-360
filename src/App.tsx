import { connectToHostApp as connectToHostAppImpl } from '@cognite/app-sdk';
import { CogniteSdkProvider, useCogniteSdk } from '@cognite/app-sdk/react';
import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Card, CardContent } from '@cognite/aura/components/card';
import { Loader } from '@cognite/aura/components/loader';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';

import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AssetScreen } from './components/AssetScreen';
import { HomeScreen } from './components/HomeScreen';
import { CdfInvestigationService, gatewayFromClient, type InvestigationService } from './services/cdfInvestigationService';
import { InvestigationServiceProvider } from './state/InvestigationServiceProvider';
import { useInvestigationState, type WorkspaceHost } from './state/investigationState';
import { InvestigationStateProvider } from './state/InvestigationStateProvider';

const loadingFallback = (
  <main className="min-h-screen overflow-x-hidden bg-muted text-foreground">
    <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center p-4">
      <Card aria-label="Loading project" aria-live="polite">
        <CardContent>
          <div className="inline-flex items-center gap-3 text-muted-foreground">
            <Loader size={20} />
            <span>Loading project...</span>
          </div>
        </CardContent>
      </Card>
    </section>
  </main>
);

const errorFallback = (
  <main className="min-h-screen bg-muted p-8 text-foreground">
    <Alert>
      <AlertDescription>Failed to connect to Fusion host</AlertDescription>
    </Alert>
  </main>
);

type AppApi = WorkspaceHost;
type AppConnectResult = { api: AppApi; initialState?: string };

type AppProps = {
  deps?: ComponentProps<typeof CogniteSdkProvider>['deps'];
  connectToHostApp?: () => Promise<AppConnectResult>;
  service?: InvestigationService;
};

function App({ deps, connectToHostApp = deps?.connectToHostApp ?? defaultConnect, service }: AppProps) {
  const [connection, setConnection] = useState<AppConnectResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void connectToHostApp()
      .then((result) => {
        if (!cancelled) setConnection(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [connectToHostApp]);

  if (failed) return errorFallback;

  return (
    <CogniteSdkProvider loadingFallback={loadingFallback} errorFallback={errorFallback} deps={deps}>
      <AppErrorBoundary>
        {connection ? (
          <Workspace api={connection.api} initialState={connection.initialState} service={service} />
        ) : (
          loadingFallback
        )}
      </AppErrorBoundary>
    </CogniteSdkProvider>
  );
}

function defaultConnect(): Promise<AppConnectResult> {
  return connectToHostAppImpl().then((result) => ({
    api: result.api,
    initialState: result.initialState,
  }));
}

function Workspace({
  api,
  initialState,
  service: serviceOverride,
}: {
  api: AppApi;
  initialState?: string;
  service?: InvestigationService;
}) {
  const client = useCogniteSdk();
  const service = useMemo(
    () => serviceOverride ?? new CdfInvestigationService(gatewayFromClient(client)),
    [client, serviceOverride],
  );
  return (
    <InvestigationServiceProvider service={service}>
      <InvestigationStateProvider api={api} initialState={initialState}>
        <WorkspaceBody />
      </InvestigationStateProvider>
    </InvestigationServiceProvider>
  );
}

function WorkspaceBody() {
  const { state } = useInvestigationState();
  const investigating = state.screen === 'asset';
  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background px-6 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        {investigating ? <AssetScreen /> : <HomeScreen />}
      </div>
    </main>
  );
}

export default App;
