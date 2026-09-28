import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { DocumentSummary } from '../domain/models';
import { instanceKey } from '../domain/values';
import { useInvestigationService } from '../state/investigationService';
import { useInvestigationState } from '../state/investigationState';

import { panelStatus, type PanelStatus } from './useHomeViewModel';

export function useAsset360ViewModel() {
  const service = useInvestigationService();
  const {
    state,
    goHome,
    toggleSeries,
    setRange,
    selectActivity,
    selectDocument,
    noteVisit,
    openExternal,
  } = useInvestigationState();
  const asset = state.asset;

  const header = useQuery({
    queryKey: ['asset', asset?.space, asset?.externalId],
    queryFn: () => {
      if (!asset) throw new Error('Asset is required.');
      return service.getAsset(asset);
    },
    enabled: asset !== undefined,
    retry: false,
  });
  const series = useQuery({
    queryKey: ['timeseries', asset?.space, asset?.externalId],
    queryFn: () => {
      if (!asset) throw new Error('Asset is required.');
      return service.listTimeSeries(asset);
    },
    enabled: asset !== undefined,
    retry: false,
  });
  const seriesItems = series.data?.items ?? [];
  const selected = seriesItems.filter((item) =>
    state.selectedSeries.some((ref) => instanceKey(ref) === instanceKey(item.ref)),
  );
  const chart = useQuery({
    queryKey: ['chart', asset?.space, asset?.externalId, selected.map((item) => instanceKey(item.ref)), state.range],
    queryFn: () => service.loadChart(selected, state.range),
    enabled: selected.length > 0,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const activities = useQuery({
    queryKey: ['activities', asset?.space, asset?.externalId],
    queryFn: () => {
      if (!asset) throw new Error('Asset is required.');
      return service.listActivities(asset);
    },
    enabled: asset !== undefined,
    retry: false,
  });
  const documents = useQuery({
    queryKey: ['documents', asset?.space, asset?.externalId],
    queryFn: () => {
      if (!asset) throw new Error('Asset is required.');
      return service.listDocuments(asset);
    },
    enabled: asset !== undefined,
    retry: false,
  });
  const documentItems = documents.data?.items ?? [];
  const selectedDocument = documentItems.find(
    (item) => state.selectedDocument && instanceKey(item.ref) === instanceKey(state.selectedDocument),
  );
  const openExternalFile = useMutation({
    mutationFn: (document: DocumentSummary) => service.getDocumentUrl(document.ref),
    onSuccess: (url) => {
      void openExternal(url);
    },
  });
  const documentUrl = useQuery({
    queryKey: ['document-url', selectedDocument?.ref.space, selectedDocument?.ref.externalId],
    queryFn: () => {
      if (!selectedDocument) throw new Error('Document is required.');
      return service.getDocumentUrl(selectedDocument.ref);
    },
    enabled: selectedDocument !== undefined && selectedDocument.preview !== 'external',
    retry: false,
  });

  useEffect(() => {
    if (!header.data) return;
    noteVisit({ ref: header.data.ref, tag: header.data.tag, name: header.data.name });
  }, [header.data, noteVisit]);

  return {
    goHome,
    range: state.range,
    setRange,
    toggleSeries,
    selectActivity,
    selectDocument,
    openExternal,
    selectedSeries: state.selectedSeries,
    headerStatus: panelStatus(header.isLoading, header.isError, header.error),
    header: header.data,
    retryHeader: () => void header.refetch(),
    seriesStatus: statusOf(series.isLoading, series.isError, series.error),
    series: seriesItems,
    seriesTruncated: series.data?.truncated ?? false,
    retrySeries: () => void series.refetch(),
    chartStatus: statusOf(chart.isLoading, chart.isError, chart.error),
    chart: chart.data,
    refreshChart: () => void chart.refetch(),
    activitiesStatus: statusOf(activities.isLoading, activities.isError, activities.error),
    activities: activities.data?.items ?? [],
    activitiesTruncated: activities.data?.truncated ?? false,
    selectedActivity: (activities.data?.items ?? []).find(
      (item) => state.selectedActivity && instanceKey(item.ref) === instanceKey(state.selectedActivity),
    ),
    retryActivities: () => void activities.refetch(),
    documentsStatus: statusOf(documents.isLoading, documents.isError, documents.error),
    documents: documentItems,
    documentsTruncated: documents.data?.truncated ?? false,
    selectedDocument,
    documentUrl: documentUrl.data,
    documentUrlStatus: statusOf(documentUrl.isLoading, documentUrl.isError, documentUrl.error),
    retryDocuments: () => void documents.refetch(),
    openDocument: (document: DocumentSummary) => {
      selectDocument(document.ref);
      if (document.preview === 'external') openExternalFile.mutate(document);
    },
    externalOpenStatus: panelStatus(openExternalFile.isPending, openExternalFile.isError, openExternalFile.error),
    retryExternalOpen: () => {
      if (selectedDocument) openExternalFile.mutate(selectedDocument);
    },
  };
}

function statusOf(isLoading: boolean, isError: boolean, error: unknown): PanelStatus {
  return panelStatus(isLoading, isError, error);
}
