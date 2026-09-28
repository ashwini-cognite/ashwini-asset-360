import { describe, expect, it, vi } from 'vitest';

import type { DmsNode } from '../domain/values';

import { AssetNotFoundError, CdfInvestigationService, gatewayFromClient, type CdfGateway } from './cdfInvestigationService';

function createGateway(overrides: Partial<CdfGateway> = {}): CdfGateway {
  return {
    searchInstances: vi.fn(() => Promise.resolve({ items: [] })),
    listInstances: vi.fn(() => Promise.resolve({ items: [] })),
    retrieveInstances: vi.fn(() => Promise.resolve({ items: [] })),
    retrieveLatest: vi.fn(() => Promise.resolve([])),
    retrieveAggregates: vi.fn(() => Promise.resolve([])),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://files.test/a')),
    ...overrides,
  };
}

function manyNodes(prefix: string, start: number, count: number): DmsNode[] {
  return Array.from({ length: count }, (_, index) => viewNode('CogniteTimeSeries', `${prefix}-${start + index}`, { name: `${prefix}-${start + index}` }));
}

function viewNode(view: string, externalId: string, props: Record<string, unknown>, lastUpdatedTime = 10): DmsNode {
  return {
    instanceType: 'node',
    space: 'plant',
    externalId,
    lastUpdatedTime,
    properties: { cdf_cdm: { [`${view}/v1`]: props } },
  };
}

function assetNode(externalId: string, name: string, parent?: string, extra: Record<string, unknown> = {}): DmsNode {
  return {
    instanceType: 'node',
    space: 'plant',
    externalId,
    lastUpdatedTime: 10,
    properties: {
      cdf_cdm: {
        'CogniteAsset/v1': {
          name,
          description: `${name} description`,
          parent: parent ? { space: 'plant', externalId: parent } : undefined,
          ...extra,
        },
      },
    },
  };
}

describe('CdfInvestigationService', () => {
  it('searches assets by text and external id, then labels the parent', async () => {
    const gateway: CdfGateway = {
      searchInstances: vi.fn(() => Promise.resolve({ items: [assetNode('PUMP-200', 'Second pump', 'UNIT-1')] })),
      listInstances: vi.fn(() => Promise.resolve({ items: [assetNode('PUMP-101', 'First pump', 'UNIT-1')] })),
      retrieveInstances: vi.fn(() => Promise.resolve({ items: [assetNode('UNIT-1', 'Unit 1')] })),
      retrieveLatest: vi.fn(() => Promise.resolve([])),
      retrieveAggregates: vi.fn(() => Promise.resolve([])),
      getDownloadUrl: vi.fn(() => Promise.resolve('https://files.test/a')),
    };
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    const results = await service.searchAssets('PUMP');
    expect(results.map((item) => item.tag)).toEqual(['PUMP-101', 'PUMP-200']);
    expect(results[0]?.parentLabel).toBe('Unit 1');
    expect(gateway.searchInstances).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'PUMP',
        view: expect.objectContaining({ externalId: 'CogniteAsset', space: 'cdf_cdm', version: 'v1' }),
      }),
    );
  });

  it('anchors the chart to the latest datapoint and does not call aggregates when the series is empty', async () => {
    const gateway: CdfGateway = {
      searchInstances: vi.fn(),
      listInstances: vi.fn(),
      retrieveInstances: vi.fn(),
      retrieveLatest: vi.fn(() =>
        Promise.resolve([
          { instanceId: { space: 'plant', externalId: 'TS-1' }, isString: false, datapoints: [] },
        ]),
      ),
      retrieveAggregates: vi.fn(() => Promise.resolve([])),
      getDownloadUrl: vi.fn(),
    };
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    const chart = await service.loadChart(
      [{ ref: { space: 'plant', externalId: 'TS-1' }, name: 'Flow', description: '', unit: 'm3/h' }],
      '7d',
    );
    expect(chart.series[0]?.empty).toBe(true);
    expect(chart.points).toEqual([]);
    expect(gateway.retrieveAggregates).not.toHaveBeenCalled();
  });

  it('returns nothing for a short query and keeps text hits when the prefix lookup fails', async () => {
    const gateway = createGateway({
      searchInstances: vi.fn(() => Promise.resolve({ items: [assetNode('PUMP-200', 'Second pump')] })),
      listInstances: vi.fn(() => Promise.reject({ status: 500 })),
    });
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    expect(await service.searchAssets('P')).toEqual([]);
    expect(gateway.searchInstances).not.toHaveBeenCalled();
    const results = await service.searchAssets('PUMP');
    expect(results.map((item) => item.tag)).toEqual(['PUMP-200']);
    expect(results[0]?.parentLabel).toBe('No parent');
  });

  it('rethrows when the prefix lookup is forbidden', async () => {
    const gateway = createGateway({
      searchInstances: vi.fn(() => Promise.resolve({ items: [] })),
      listInstances: vi.fn(() => Promise.reject({ status: 403 })),
    });
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    await expect(service.searchAssets('PUMP')).rejects.toEqual({ status: 403 });
  });

  it('retries a throttled asset read and labels type from code', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const gateway = createGateway({
      retrieveInstances: vi.fn((refs: { externalId: string }[]) => {
        calls += 1;
        if (calls === 1) return Promise.reject({ status: 429, headers: { 'retry-after': '0' } });
        const ref = refs[0];
        if (ref?.externalId === 'PUMP-101') {
          return Promise.resolve({
            items: [assetNode('PUMP-101', 'Pump', 'UNIT-1', { type: { space: 'plant', externalId: 'TYPE-1' } })],
          });
        }
        return Promise.resolve({
          items: [viewNode('CogniteAssetType', 'TYPE-1', { code: 'CP' })],
        });
      }),
    });
    const service = new CdfInvestigationService(gateway, () => 0, (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    }, () => 0);
    const asset = await service.getAsset({ space: 'plant', externalId: 'PUMP-101' });
    expect(asset.typeLabel).toBe('CP');
    expect(asset.parentLabel).toBe('UNIT-1');
    expect(sleeps).toEqual([0]);
  });

  it('throws when the asset is missing', async () => {
    const service = new CdfInvestigationService(createGateway(), () => 0, () => Promise.resolve());
    await expect(service.getAsset({ space: 'plant', externalId: 'GONE' })).rejects.toBeInstanceOf(AssetNotFoundError);
  });

  it('stops related lists at 200 and says when another page remains', async () => {
    const pages = [
      { items: manyNodes('TS', 0, 100), nextCursor: 'p2' },
      { items: manyNodes('TS', 100, 100), nextCursor: 'p3' },
    ];
    const gateway = createGateway({
      listInstances: vi.fn(() => Promise.resolve(pages.shift() ?? { items: [] })),
    });
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    const listed = await service.listTimeSeries({ space: 'plant', externalId: 'PUMP-101' });
    expect(listed.items).toHaveLength(200);
    expect(listed.truncated).toBe(true);
    expect(listed.items[0]?.name).toBe('TS-0');
    expect(gateway.listInstances).toHaveBeenCalledTimes(2);
  });

  it('stops when a page contains no nodes and falls back from an unknown file property', async () => {
    const unknown = new Error('Unknown property assets');
    Object.assign(unknown, { status: 400 });
    const gateway = createGateway({
      listInstances: vi.fn()
        .mockResolvedValueOnce({ items: [{ not: 'a node' }], nextCursor: 'skip' })
        .mockRejectedValueOnce(unknown)
        .mockResolvedValueOnce({
          items: [
            viewNode('CogniteFile', 'OLD', { name: 'Old', mimeType: 'application/pdf', sourceUpdatedTime: 10 }),
            viewNode('CogniteFile', 'NEW', { mimeType: 'image/png' }, 50),
          ],
        }),
    });
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    const empty = await service.listActivities({ space: 'plant', externalId: 'PUMP-101' });
    expect(empty).toEqual({ items: [], truncated: false });
    const documents = await service.listDocuments({ space: 'plant', externalId: 'PUMP-101' });
    expect(documents.items.map((item) => item.name)).toEqual(['NEW', 'Old']);
    expect(documents.items[0]?.preview).toBe('image');
    expect(documents.items[1]?.preview).toBe('pdf');
    expect(documents.truncated).toBe(false);
  });

  it('does not fall back when the file query fails for another reason', async () => {
    const gateway = createGateway({
      listInstances: vi.fn(() => Promise.reject(Object.assign(new Error('Unknown property assets'), { status: 500 }))),
    });
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    await expect(service.listDocuments({ space: 'plant', externalId: 'PUMP-101' })).rejects.toThrow('Unknown property');
  });

  it('builds a chart from numeric aggregates and skips series that cannot be plotted', async () => {
    const gateway = createGateway({
      retrieveLatest: vi.fn(() =>
        Promise.resolve([
          { instanceId: { space: 'plant', externalId: 'TS-1' }, isString: false, datapoints: [{ timestamp: new Date('2020-01-02T00:00:00Z'), value: 5 }] },
          { instanceId: { space: 'plant', externalId: 'TS-2' }, isString: true, datapoints: [{ timestamp: new Date('2020-01-02T00:00:00Z'), value: 'hot' }] },
          { instanceId: { space: 'plant', externalId: 'TS-3' }, isString: false, datapoints: [{ timestamp: new Date('2020-01-02T00:00:00Z'), average: 4 }] },
          { instanceId: { space: 'plant', externalId: 'TS-4' }, isString: false, datapoints: [{ timestamp: new Date('2020-01-02T00:00:00Z') }] },
          { bad: true },
        ]),
      ),
      retrieveAggregates: vi.fn(() =>
        Promise.resolve([
          {
            instanceId: { space: 'plant', externalId: 'TS-1' },
            datapoints: [
              { timestamp: new Date('2020-01-01T00:00:00Z'), average: 1 },
              { timestamp: new Date('2020-01-02T00:00:00Z'), average: 2 },
              { timestamp: 'nope', average: 3 },
            ],
          },
          { datapoints: [{ timestamp: new Date('2020-01-01T00:00:00Z'), average: 9 }] },
          { instanceId: { space: 'plant' }, datapoints: [] },
          null,
        ]),
      ),
    });
    const service = new CdfInvestigationService(gateway, () => 0, () => Promise.resolve());
    expect(await service.loadChart([], '7d')).toEqual({ startMs: undefined, endMs: undefined, series: [], points: [] });
    const chart = await service.loadChart(
      [
        { ref: { space: 'plant', externalId: 'TS-1' }, name: 'Flow', description: '', unit: '' },
        { ref: { space: 'plant', externalId: 'TS-2' }, name: 'Note', description: '', unit: '' },
        { ref: { space: 'plant', externalId: 'TS-3' }, name: 'Avg', description: '', unit: '' },
        { ref: { space: 'plant', externalId: 'TS-4' }, name: 'Blank', description: '', unit: '' },
      ],
      '30d',
    );
    expect(chart.series.map((item) => item.latestValue)).toEqual(['5', 'hot', '4', '']);
    expect(chart.series[1]?.nonNumeric).toBe(true);
    expect(chart.points).toHaveLength(2);
    expect(chart.points[0]?.values.series0).toBe(1);
  });

  it('sorts work orders by recency', async () => {
    const gateway = createGateway({
      listInstances: vi.fn(() =>
        Promise.resolve({
          items: [
            viewNode('CogniteActivity', 'OLD', { name: 'Old job', endTime: 10, description: 'done' }),
            viewNode('CogniteActivity', 'NEW', { description: 'Fresh', endTime: 50 }),
          ],
        }),
      ),
    });
    const service = new CdfInvestigationService(gateway, () => 100, () => Promise.resolve());
    const activities = await service.listActivities({ space: 'plant', externalId: 'PUMP-101' });
    expect(activities.items.map((item) => item.identifier)).toEqual(['NEW', 'OLD']);
    expect(activities.items[0]?.title).toBe('Fresh');
    expect(activities.items[0]?.status).toBe('Completed');
  });

  it('reads a download link through the shared CDF queue', async () => {
    const scheduled: string[] = [];
    const download = vi.fn(() => Promise.resolve([{ downloadUrl: 'https://files.test/a' }]));
    const client = {
      instances: {
        search: vi.fn(() => Promise.resolve({ items: [assetNode('PUMP-101', 'Pump')] })),
        list: vi.fn(() => Promise.resolve({ items: [], nextCursor: undefined })),
        retrieve: vi.fn(() => Promise.resolve({ items: [] })),
      },
      datapoints: {
        retrieveLatest: vi.fn(() => Promise.resolve([])),
        retrieve: vi.fn(() => Promise.resolve([])),
      },
      files: {
        getDownloadUrls: download,
      },
    };
    const gateway = gatewayFromClient(client, {
      schedule: (task) => {
        scheduled.push('queued');
        return task();
      },
    });
    expect(await gateway.getDownloadUrl({ space: 'plant', externalId: 'FILE-1' })).toBe('https://files.test/a');
    expect(await gateway.searchInstances({ view: { type: 'view', space: 'cdf_cdm', externalId: 'CogniteAsset', version: 'v1' }, query: 'P', instanceType: 'node' })).toEqual({
      items: [assetNode('PUMP-101', 'Pump')],
    });
    expect(await gateway.listInstances({ instanceType: 'node' })).toEqual({ items: [], nextCursor: undefined });
    expect(await gateway.retrieveInstances([{ space: 'plant', externalId: 'PUMP-101' }], 'CogniteAsset')).toEqual({ items: [] });
    expect(await gateway.retrieveLatest([{ space: 'plant', externalId: 'TS-1' }])).toEqual([]);
    expect(await gateway.retrieveAggregates([{ space: 'plant', externalId: 'TS-1' }], new Date(0), new Date(1), '1h')).toEqual([]);
    expect(scheduled.length).toBeGreaterThan(0);
    download.mockResolvedValueOnce([]);
    await expect(gateway.getDownloadUrl({ space: 'plant', externalId: 'FILE-1' })).rejects.toThrow('No download URL');
  });
});
