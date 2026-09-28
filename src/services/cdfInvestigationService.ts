import type { CogniteClient, NodeOrEdgeListRequestV3, NodeOrEdgeSearchRequest } from '@cognite/sdk';

import { activityRecencyMs, activityStatus, compareActivitiesByRecency } from '../domain/activity';
import {
  ACTIVITY_VIEW,
  ASSET_TYPE_VIEW,
  ASSET_VIEW,
  FILE_VIEW,
  RELATED_MAX_ITEMS,
  RELATED_PAGE_LIMIT,
  SEARCH_LIMIT,
  TIMESERIES_VIEW,
  cdmView,
  viewProperty,
 MIN_SEARCH_LENGTH } from '../domain/cdm';
import type {
  ActivityDetail,
  AssetDetail,
  AssetSummary,
  CappedList,
  ChartModel,
  ChartPoint,
  ChartSeries,
  DocumentSummary,
  TimeSeriesSummary,
} from '../domain/models';
import { previewKind } from '../domain/preview';
import { withRetry } from '../domain/retry';
import { rankAssets } from '../domain/searchRank';
import { rangeGranularity, windowEndingAtLatest, type RangePreset } from '../domain/timeWindow';
import {
  isAccessDenied,
  isDmsNode,
  isUnknownPropertyError,
  readRelation,
  readStatus,
  readString,
  readTimestamp,
  viewProperties,
  type DmsNode,
  type InstanceRef,
} from '../domain/values';
import { cdfTaskRunner } from '../shared/utils/semaphore';

export interface CdfGateway {
  searchInstances(request: NodeOrEdgeSearchRequest): Promise<{ items: unknown[] }>;
  listInstances(request: NodeOrEdgeListRequestV3): Promise<{ items: unknown[]; nextCursor?: string }>;
  retrieveInstances(refs: InstanceRef[], viewExternalId: string): Promise<{ items: unknown[] }>;
  retrieveLatest(refs: InstanceRef[]): Promise<unknown[]>;
  retrieveAggregates(refs: InstanceRef[], start: Date, end: Date, granularity: string): Promise<unknown[]>;
  getDownloadUrl(ref: InstanceRef): Promise<string>;
}

export interface InvestigationService {
  searchAssets(query: string): Promise<AssetSummary[]>;
  getAsset(ref: InstanceRef): Promise<AssetDetail>;
  listTimeSeries(asset: InstanceRef): Promise<CappedList<TimeSeriesSummary>>;
  loadChart(series: TimeSeriesSummary[], preset: RangePreset): Promise<ChartModel>;
  listActivities(asset: InstanceRef): Promise<CappedList<ActivityDetail>>;
  listDocuments(asset: InstanceRef): Promise<CappedList<DocumentSummary>>;
  getDocumentUrl(ref: InstanceRef): Promise<string>;
}

type CdfScheduler = {
  schedule: <T>(task: () => Promise<T>) => Promise<T>;
};

type CdfReadClient = {
  instances: {
    search: (request: NodeOrEdgeSearchRequest) => Promise<{ items: unknown[] }>;
    list: (request: NodeOrEdgeListRequestV3) => Promise<{ items: unknown[]; nextCursor?: string }>;
    retrieve: (request: Parameters<CogniteClient['instances']['retrieve']>[0]) => Promise<{ items: unknown[] }>;
  };
  datapoints: {
    retrieveLatest: (query: Parameters<CogniteClient['datapoints']['retrieveLatest']>[0]) => Promise<unknown[]>;
    retrieve: (query: Parameters<CogniteClient['datapoints']['retrieve']>[0]) => Promise<unknown[]>;
  };
  files: {
    getDownloadUrls: (items: Parameters<CogniteClient['files']['getDownloadUrls']>[0]) => Promise<{ downloadUrl?: string }[]>;
  };
};

type RelatedNodes = {
  nodes: DmsNode[];
  truncated: boolean;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class CdfInvestigationService implements InvestigationService {
  constructor(
    private readonly gateway: CdfGateway,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
    private readonly random: () => number = Math.random,
  ) {}

  async searchAssets(query: string): Promise<AssetSummary[]> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) return [];

    const text = await this.call(() =>
      this.gateway.searchInstances({
        view: cdmView(ASSET_VIEW),
        query: trimmed,
        instanceType: 'node',
        limit: SEARCH_LIMIT,
      }),
    );

    let identifierNodes: DmsNode[] = [];
    try {
      const listed = await this.call(() =>
        this.gateway.listInstances({
          instanceType: 'node',
          sources: [{ source: cdmView(ASSET_VIEW) }],
          filter: {
            and: [
              { hasData: [cdmView(ASSET_VIEW)] },
              { prefix: { property: ['node', 'externalId'], value: trimmed } },
            ],
          },
          limit: SEARCH_LIMIT,
        }),
      );
      identifierNodes = listed.items.filter(isDmsNode);
    } catch (error) {
      if (isAccessDenied(error)) throw error;
    }

    const textNodes = text.items.filter(isDmsNode);
    const ranked = rankAssets(trimmed, textNodes.map(toRankedAsset), identifierNodes.map(toRankedAsset));
    const parents = await this.lookupLabels(
      ranked.map((hit) => readRelation(viewProperties(nodeByKey(textNodes, identifierNodes, hit.ref), ASSET_VIEW)?.parent)),
      ASSET_VIEW,
    );

    return ranked.map((hit) => {
      const node = nodeByKey(textNodes, identifierNodes, hit.ref);
      const parent = readRelation(viewProperties(node, ASSET_VIEW)?.parent);
      return {
        ref: hit.ref,
        tag: hit.tag,
        name: hit.name || hit.tag,
        description: hit.description,
        sourceId: hit.sourceId,
        parentLabel: parent ? (parents.get(keyOf(parent)) ?? parent.externalId) : 'No parent',
      };
    });
  }

  async getAsset(ref: InstanceRef): Promise<AssetDetail> {
    const response = await this.call(() => this.gateway.retrieveInstances([ref], ASSET_VIEW));
    const node = response.items.find(isDmsNode);
    if (!node) throw new AssetNotFoundError(ref.externalId);
    const props = viewProperties(node, ASSET_VIEW);
    const parent = readRelation(props?.parent);
    const typeRef = readRelation(props?.type);
    const [parents, types] = await Promise.all([
      parent ? this.lookupLabels([parent], ASSET_VIEW) : Promise.resolve(new Map<string, string>()),
      typeRef ? this.lookupLabels([typeRef], ASSET_TYPE_VIEW) : Promise.resolve(new Map<string, string>()),
    ]);
    const summary = toSummary(node, parent ? (parents.get(keyOf(parent)) ?? parent.externalId) : 'No parent');
    const typeLabel = typeRef ? (types.get(keyOf(typeRef)) ?? typeRef.externalId) : 'Unknown type';
    return { ...summary, typeLabel };
  }

  async listTimeSeries(asset: InstanceRef): Promise<CappedList<TimeSeriesSummary>> {
    const related = await this.listRelated(TIMESERIES_VIEW, asset, ['assets']);
    return {
      truncated: related.truncated,
      items: related.nodes.map(toTimeSeries).sort((left, right) => left.name.localeCompare(right.name)),
    };
  }

  async loadChart(series: TimeSeriesSummary[], preset: RangePreset): Promise<ChartModel> {
    if (series.length === 0) {
      return { startMs: undefined, endMs: undefined, series: [], points: [] };
    }
    const latest = await this.call(() => this.gateway.retrieveLatest(series.map((item) => item.ref)));
    const latestByKey = new Map(latest.filter(isLatestSeries).map((item) => [keyOf(item.instanceId), item]));
    const chartSeries: ChartSeries[] = series.map((item, index) => {
      const found = latestByKey.get(keyOf(item.ref));
      const point = found?.datapoints[0];
      const nonNumeric = found?.isString === true;
      const empty = !point;
      return {
        ref: item.ref,
        name: item.name,
        key: `series${index}`,
        empty,
        nonNumeric,
        latestValue: point ? pointLabel(point) : '',
      };
    });
    const numeric = chartSeries.filter((item) => !item.empty && !item.nonNumeric);
    const timestamps = numeric
      .map((item) => latestByKey.get(keyOf(item.ref))?.datapoints[0])
      .filter(isTimestamped)
      .map((point) => point.timestamp.getTime());
    const window = windowEndingAtLatest(timestamps, preset);
    if (!window || numeric.length === 0) {
      return { startMs: window?.startMs, endMs: window?.endMs, series: chartSeries, points: [] };
    }
    const aggregates = await this.call(() =>
      this.gateway.retrieveAggregates(
        numeric.map((item) => item.ref),
        new Date(window.startMs),
        new Date(window.endMs),
        rangeGranularity(preset),
      ),
    );
    return {
      startMs: window.startMs,
      endMs: window.endMs,
      series: chartSeries,
      points: mergePoints(numeric, aggregates),
    };
  }

  async listActivities(asset: InstanceRef): Promise<CappedList<ActivityDetail>> {
    const related = await this.listRelated(ACTIVITY_VIEW, asset, ['assets']);
    return {
      truncated: related.truncated,
      items: related.nodes.map((node) => toActivity(node, this.now())).sort(compareActivitiesByRecency),
    };
  }

  async listDocuments(asset: InstanceRef): Promise<CappedList<DocumentSummary>> {
    const related = await this.listRelated(FILE_VIEW, asset, ['assets', 'asset']);
    return {
      truncated: related.truncated,
      items: related.nodes
        .map(toDocument)
        .sort((left, right) => (right.modifiedMs ?? 0) - (left.modifiedMs ?? 0)),
    };
  }

  async getDocumentUrl(ref: InstanceRef): Promise<string> {
    return this.call(() => this.gateway.getDownloadUrl(ref));
  }

  private async listRelated(
    viewExternalId: string,
    asset: InstanceRef,
    properties: readonly [string, ...string[]],
  ): Promise<RelatedNodes> {
    const [property, ...rest] = properties;
    try {
      return await this.listFiltered(viewExternalId, asset, property);
    } catch (error) {
      if (!isUnknownPropertyError(error) || !hasProperty(rest)) throw error;
      return this.listRelated(viewExternalId, asset, rest);
    }
  }

  private async listFiltered(viewExternalId: string, asset: InstanceRef, property: string): Promise<RelatedNodes> {
    const nodes: DmsNode[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.call(() =>
        this.gateway.listInstances({
          instanceType: 'node',
          sources: [{ source: cdmView(viewExternalId) }],
          filter: {
            and: [
              { hasData: [cdmView(viewExternalId)] },
              {
                containsAny: {
                  property: viewProperty(viewExternalId, property),
                  values: [{ space: asset.space, externalId: asset.externalId }],
                },
              },
            ],
          },
          limit: RELATED_PAGE_LIMIT,
          cursor,
        }),
      );
      const added = page.items.filter(isDmsNode);
      if (added.length === 0) break;
      nodes.push(...added);
      cursor = page.nextCursor;
    } while (cursor && nodes.length < RELATED_MAX_ITEMS);
    const items = nodes.slice(0, RELATED_MAX_ITEMS);
    return { nodes: items, truncated: items.length < nodes.length || cursor !== undefined };
  }

  private async lookupLabels(refs: Array<InstanceRef | undefined>, viewExternalId: string): Promise<Map<string, string>> {
    const unique = dedupe(refs.filter(isRef));
    const labels = new Map<string, string>();
    if (unique.length === 0) return labels;
    const response = await this.call(() => this.gateway.retrieveInstances(unique, viewExternalId));
    for (const item of response.items.filter(isDmsNode)) {
      const props = viewProperties(item, viewExternalId);
      labels.set(keyOf(item), readString(props?.name) || readString(props?.code) || item.externalId);
    }
    return labels;
  }

  private call<T>(task: () => Promise<T>): Promise<T> {
    return withRetry(task, readStatus, this.sleep, { random: this.random, now: this.now });
  }
}

export function gatewayFromClient(client: CdfReadClient, scheduler: CdfScheduler = cdfTaskRunner): CdfGateway {
  return {
    searchInstances: (request) =>
      scheduler.schedule(async () => {
        const response = await client.instances.search(request);
        return { items: response.items };
      }),
    listInstances: (request) =>
      scheduler.schedule(async () => {
        const response = await client.instances.list(request);
        return { items: response.items, nextCursor: response.nextCursor };
      }),
    retrieveInstances: (refs, viewExternalId) =>
      scheduler.schedule(async () => {
        const response = await client.instances.retrieve({
          sources: [{ source: cdmView(viewExternalId) }],
          items: refs.map((ref) => ({ space: ref.space, externalId: ref.externalId, instanceType: 'node' })),
        });
        return { items: response.items };
      }),
    retrieveLatest: (refs) =>
      scheduler.schedule(() =>
        client.datapoints.retrieveLatest(refs.map((ref) => ({ instanceId: ref, before: 'now' }))),
      ),
    retrieveAggregates: (refs, start, end, granularity) =>
      scheduler.schedule(() =>
        client.datapoints.retrieve({
          start,
          end,
          aggregates: ['average'],
          granularity,
          limit: 1000,
          items: refs.map((ref) => ({ instanceId: ref })),
        }),
      ),
    getDownloadUrl: (ref) =>
      scheduler.schedule(async () => {
        const links = await client.files.getDownloadUrls([{ instanceId: ref }]);
        const url = links[0]?.downloadUrl;
        if (!url) throw new Error(`No download URL for ${ref.externalId}.`);
        return url;
      }),
  };
}

function hasProperty(properties: readonly string[]): properties is readonly [string, ...string[]] {
  return typeof properties[0] === 'string';
}

function toRankedAsset(node: DmsNode) {
  const props = viewProperties(node, ASSET_VIEW);
  return {
    ref: { space: node.space, externalId: node.externalId },
    tag: node.externalId,
    name: readString(props?.name),
    description: readString(props?.description),
    sourceId: readString(props?.sourceId),
  };
}

function toSummary(node: DmsNode, parentLabel: string): AssetSummary {
  const ranked = toRankedAsset(node);
  return {
    ...ranked,
    name: ranked.name || ranked.tag,
    parentLabel,
  };
}

function toTimeSeries(node: DmsNode): TimeSeriesSummary {
  const props = viewProperties(node, TIMESERIES_VIEW);
  return {
    ref: { space: node.space, externalId: node.externalId },
    name: readString(props?.name) || node.externalId,
    description: readString(props?.description),
    unit: readString(props?.sourceUnit),
  };
}

function toActivity(node: DmsNode, now: number): ActivityDetail {
  const props = viewProperties(node, ACTIVITY_VIEW);
  const times = {
    startTime: readTimestamp(props?.startTime),
    endTime: readTimestamp(props?.endTime),
    scheduledStartTime: readTimestamp(props?.scheduledStartTime),
    scheduledEndTime: readTimestamp(props?.scheduledEndTime),
  };
  const dateMs = activityRecencyMs(times) || undefined;
  return {
    ref: { space: node.space, externalId: node.externalId },
    identifier: node.externalId,
    title: readString(props?.name) || readString(props?.description) || node.externalId,
    description: readString(props?.description),
    status: activityStatus(times, now),
    dateMs,
    ...times,
  };
}

function toDocument(node: DmsNode): DocumentSummary {
  const props = viewProperties(node, FILE_VIEW);
  const mimeType = readString(props?.mimeType) || 'application/octet-stream';
  return {
    ref: { space: node.space, externalId: node.externalId },
    name: readString(props?.name) || node.externalId,
    mimeType,
    modifiedMs: readTimestamp(props?.sourceUpdatedTime) ?? node.lastUpdatedTime,
    preview: previewKind(mimeType),
  };
}

function nodeByKey(textNodes: DmsNode[], identifierNodes: DmsNode[], ref: InstanceRef): DmsNode {
  const key = keyOf(ref);
  const found = [...identifierNodes, ...textNodes].find((node) => keyOf(node) === key);
  if (found) return found;
  return {
    instanceType: 'node',
    space: ref.space,
    externalId: ref.externalId,
    lastUpdatedTime: 0,
  };
}

function keyOf(ref: InstanceRef): string {
  return `${ref.space}/${ref.externalId}`;
}

function dedupe(refs: InstanceRef[]): InstanceRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = keyOf(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRef(value: InstanceRef | undefined): value is InstanceRef {
  return value !== undefined;
}

type LatestPoint = { timestamp: Date; value?: number | string; average?: number };

type LatestSeries = {
  instanceId: InstanceRef;
  isString: boolean;
  datapoints: LatestPoint[];
};

function isLatestSeries(value: unknown): value is LatestSeries {
  if (!isDmsNodeLike(value)) return false;
  if (typeof value.isString !== 'boolean' || !Array.isArray(value.datapoints)) return false;
  return isDirectInstance(value.instanceId);
}

function isDmsNodeLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDirectInstance(value: unknown): value is InstanceRef {
  if (typeof value !== 'object' || value === null) return false;
  if (!('space' in value) || !('externalId' in value)) return false;
  return typeof value.space === 'string' && typeof value.externalId === 'string';
}

function isTimestamped(value: LatestPoint | undefined): value is LatestPoint & { timestamp: Date } {
  return value !== undefined && value.timestamp instanceof Date;
}

function pointLabel(point: LatestPoint): string {
  if (typeof point.value === 'number' || typeof point.value === 'string') return String(point.value);
  if (typeof point.average === 'number') return String(point.average);
  return '';
}

function mergePoints(series: ChartSeries[], aggregates: unknown[]): ChartPoint[] {
  const byTime = new Map<number, ChartPoint>();
  for (const item of aggregates) {
    if (!isAggregateSeries(item)) continue;
    const chartSeries = series.find((entry) => item.instanceId !== undefined && keyOf(entry.ref) === keyOf(item.instanceId));
    if (!chartSeries) continue;
    for (const point of item.datapoints) {
      if (!(point.timestamp instanceof Date) || typeof point.average !== 'number') continue;
      const timeMs = point.timestamp.getTime();
      const existing = byTime.get(timeMs) ?? { timeMs, values: {} };
      existing.values[chartSeries.key] = point.average;
      byTime.set(timeMs, existing);
    }
  }
  return [...byTime.values()].sort((left, right) => left.timeMs - right.timeMs);
}

function isAggregateSeries(value: unknown): value is { instanceId?: InstanceRef; datapoints: LatestPoint[] } {
  if (typeof value !== 'object' || value === null || !('datapoints' in value)) return false;
  if (!Array.isArray(value.datapoints)) return false;
  if (!('instanceId' in value) || value.instanceId === undefined) return true;
  return isDirectInstance(value.instanceId);
}

export class AssetNotFoundError extends Error {
  readonly status = 404;

  constructor(externalId: string) {
    super(`Asset ${externalId} was not found.`);
    this.name = 'AssetNotFoundError';
  }
}
