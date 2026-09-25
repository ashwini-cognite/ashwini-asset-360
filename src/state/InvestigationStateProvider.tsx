import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { RECENT_STORAGE_KEY } from '../domain/cdm';
import type { AssetSummary } from '../domain/models';
import { readRecent, rememberAsset } from '../domain/recentAssets';
import { instanceKey, type InstanceRef } from '../domain/values';

import {
  InvestigationContext,
  parseInvestigationState,
  type InvestigationContextValue,
  type InvestigationState,
  type WorkspaceHost,
} from './investigationState';

export function InvestigationStateProvider({
  api,
  initialState,
  storage,
  children,
}: {
  api: WorkspaceHost;
  initialState?: string;
  storage?: Storage;
  children: ReactNode;
}) {
  const resolvedStorage = storage ?? browserStorage();
  const [state, setState] = useState(() => parseInvestigationState(initialState));
  const [recent, setRecent] = useState(() => readRecent(resolvedStorage, RECENT_STORAGE_KEY));

  const publish = useCallback(
    (recipe: (current: InvestigationState) => InvestigationState) => {
      setState((current) => {
        const next = recipe(current);
        if (next === current) return current;
        void api.syncInternalState(JSON.stringify(next));
        return next;
      });
    },
    [api],
  );

  const noteVisit = useCallback((asset: Pick<AssetSummary, 'ref' | 'tag' | 'name'>) => {
    setRecent(rememberAsset(resolvedStorage, RECENT_STORAGE_KEY, { ref: asset.ref, tag: asset.tag, name: asset.name }));
  }, [resolvedStorage]);

  const value = useMemo<InvestigationContextValue>(
    () => ({
      state,
      recent,
      setSearchQuery: (query) =>
        publish((current) => (current.searchQuery === query ? current : { ...current, searchQuery: query })),
      openAsset: (asset) => {
        noteVisit(asset);
        publish((current) => openAssetState(current, asset.ref));
      },
      noteVisit,
      goHome: () => publish((current) => ({ ...current, screen: 'home' })),
      toggleSeries: (ref) =>
        publish((current) => ({ ...current, selectedSeries: toggleRef(current.selectedSeries, ref) })),
      setRange: (range) => publish((current) => ({ ...current, range })),
      selectActivity: (ref) => publish((current) => ({ ...current, selectedActivity: ref })),
      selectDocument: (ref) => publish((current) => ({ ...current, selectedDocument: ref })),
      openExternal: (url) => api.navigateExternal({ url, openInNewTab: true }),
    }),
    [api, noteVisit, publish, recent, state],
  );

  return <InvestigationContext.Provider value={value}>{children}</InvestigationContext.Provider>;
}

function openAssetState(current: InvestigationState, asset: InstanceRef): InvestigationState {
  const same = current.asset !== undefined && instanceKey(current.asset) === instanceKey(asset);
  return {
    ...current,
    screen: 'asset',
    asset,
    selectedSeries: same ? current.selectedSeries : [],
    selectedActivity: same ? current.selectedActivity : undefined,
    selectedDocument: same ? current.selectedDocument : undefined,
  };
}

function toggleRef(current: InstanceRef[], ref: InstanceRef): InstanceRef[] {
  const exists = current.some((item) => instanceKey(item) === instanceKey(ref));
  if (exists) return current.filter((item) => instanceKey(item) !== instanceKey(ref));
  return [...current, ref].slice(0, 8);
}

function browserStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Some Node test runs expose a localStorage getter that throws.
  }
  return memoryStorage;
}

const memoryValues = new Map<string, string>();
const memoryStorage: Storage = {
  get length() {
    return memoryValues.size;
  },
  clear: () => memoryValues.clear(),
  getItem: (key) => memoryValues.get(key) ?? null,
  key: (index) => [...memoryValues.keys()][index] ?? null,
  removeItem: (key) => {
    memoryValues.delete(key);
  },
  setItem: (key, value) => {
    memoryValues.set(key, value);
  },
};
