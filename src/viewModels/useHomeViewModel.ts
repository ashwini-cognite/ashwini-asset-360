import { useQuery } from '@tanstack/react-query';

import { MIN_SEARCH_LENGTH } from '../domain/cdm';
import { isAccessDenied, readStatus } from '../domain/values';
import { useInvestigationService } from '../state/investigationService';
import { useInvestigationState } from '../state/investigationState';

export function useHomeViewModel() {
  const service = useInvestigationService();
  const { state, recent, setSearchQuery, openAsset } = useInvestigationState();
  const queryText = state.searchQuery.trim();
  const search = useQuery({
    queryKey: ['asset-search', queryText],
    queryFn: () => service.searchAssets(queryText),
    enabled: queryText.length >= MIN_SEARCH_LENGTH,
    retry: false,
  });

  return {
    query: state.searchQuery,
    setSearchQuery,
    recent,
    openAsset,
    searchStatus: panelStatus(search.isLoading, search.isError, search.error),
    results: search.data ?? [],
    retrySearch: () => {
      void search.refetch();
    },
  };
}

export type PanelStatus = 'loading' | 'denied' | 'error' | 'ready';

export function panelStatus(isLoading: boolean, isError: boolean, error: unknown): PanelStatus {
  if (isLoading) return 'loading';
  if (isError && isAccessDenied(error)) return 'denied';
  if (isError && readStatus(error) !== 404) return 'error';
  return 'ready';
}
