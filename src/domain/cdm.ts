export const CDM_SPACE = 'cdf_cdm';
export const CDM_VERSION = 'v1';

export const ASSET_VIEW = 'CogniteAsset';
export const ASSET_TYPE_VIEW = 'CogniteAssetType';
export const TIMESERIES_VIEW = 'CogniteTimeSeries';
export const ACTIVITY_VIEW = 'CogniteActivity';
export const FILE_VIEW = 'CogniteFile';

export const MIN_SEARCH_LENGTH = 2;
export const SEARCH_LIMIT = 25;
export const RELATED_PAGE_LIMIT = 100;
export const RELATED_MAX_ITEMS = 200;
export const RECENT_LIMIT = 10;
export const RECENT_STORAGE_KEY = 'flows-app-certification.recent-assets';

export type CdmView = {
  space: typeof CDM_SPACE;
  externalId: string;
  type: 'view';
  version: typeof CDM_VERSION;
};

export function cdmView(externalId: string): CdmView {
  return {
    space: CDM_SPACE,
    externalId,
    type: 'view',
    version: CDM_VERSION,
  };
}

export function viewProperty(viewExternalId: string, property: string): [string, string, string] {
  return [CDM_SPACE, `${viewExternalId}/${CDM_VERSION}`, property];
}
