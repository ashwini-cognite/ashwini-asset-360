import { createContext, useContext } from 'react';

import type { AssetSummary } from '../domain/models';
import type { RecentAsset } from '../domain/recentAssets';
import { DEFAULT_RANGE, isRangePreset, type RangePreset } from '../domain/timeWindow';
import { isRecord, type InstanceRef } from '../domain/values';

export type InvestigationState = {
  screen: 'home' | 'asset';
  asset?: InstanceRef;
  searchQuery: string;
  selectedSeries: InstanceRef[];
  range: RangePreset;
  selectedActivity?: InstanceRef;
  selectedDocument?: InstanceRef;
};

export type WorkspaceHost = {
  syncInternalState: (state: string) => Promise<boolean>;
  navigateExternal: (options: { url: string; openInNewTab?: boolean }) => Promise<boolean>;
};

export type InvestigationContextValue = {
  state: InvestigationState;
  recent: RecentAsset[];
  setSearchQuery: (query: string) => void;
  openAsset: (asset: Pick<AssetSummary, 'ref' | 'tag' | 'name'>) => void;
  noteVisit: (asset: Pick<AssetSummary, 'ref' | 'tag' | 'name'>) => void;
  goHome: () => void;
  toggleSeries: (ref: InstanceRef) => void;
  setRange: (range: RangePreset) => void;
  selectActivity: (ref: InstanceRef | undefined) => void;
  selectDocument: (ref: InstanceRef | undefined) => void;
  openExternal: (url: string) => Promise<boolean>;
};

export const InvestigationContext = createContext<InvestigationContextValue | undefined>(undefined);

export function useInvestigationState(): InvestigationContextValue {
  const value = useContext(InvestigationContext);
  if (!value) throw new Error('Investigation state is unavailable.');
  return value;
}

export function parseInvestigationState(raw: string | undefined): InvestigationState {
  const fallback: InvestigationState = {
    screen: 'home',
    searchQuery: '',
    selectedSeries: [],
    range: DEFAULT_RANGE,
  };
  if (!raw) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!isRecord(parsed)) return fallback;
  const asset = readRef(parsed.asset);
  const screen = parsed.screen === 'asset' && asset ? 'asset' : 'home';
  const selectedSeries = Array.isArray(parsed.selectedSeries)
    ? parsed.selectedSeries.filter(isInstanceRef).slice(0, 12)
    : [];
  return {
    screen,
    asset,
    searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
    selectedSeries,
    range: isRangePreset(parsed.range) ? parsed.range : DEFAULT_RANGE,
    selectedActivity: readRef(parsed.selectedActivity),
    selectedDocument: readRef(parsed.selectedDocument),
  };
}

function readRef(value: unknown): InstanceRef | undefined {
  return isInstanceRef(value) ? value : undefined;
}

function isInstanceRef(value: unknown): value is InstanceRef {
  if (!isRecord(value)) return false;
  return typeof value.space === 'string' && typeof value.externalId === 'string';
}
