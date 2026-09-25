import { RECENT_LIMIT } from './cdm';
import type { InstanceRef } from './values';
import { instanceKey } from './values';

export type RecentAsset = {
  ref: InstanceRef;
  tag: string;
  name: string;
};

export function readRecent(storage: Storage, key: string): RecentAsset[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentAsset).slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function rememberAsset(storage: Storage, key: string, asset: RecentAsset): RecentAsset[] {
  const next = [
    asset,
    ...readRecent(storage, key).filter((item) => instanceKey(item.ref) !== instanceKey(asset.ref)),
  ].slice(0, RECENT_LIMIT);
  storage.setItem(key, JSON.stringify(next));
  return next;
}

function isRecentAsset(value: unknown): value is RecentAsset {
  if (typeof value !== 'object' || value === null) return false;
  if (!('tag' in value) || !('name' in value) || !('ref' in value)) return false;
  if (typeof value.tag !== 'string' || typeof value.name !== 'string') return false;
  const ref = value.ref;
  if (typeof ref !== 'object' || ref === null) return false;
  if (!('space' in ref) || !('externalId' in ref)) return false;
  return typeof ref.space === 'string' && typeof ref.externalId === 'string';
}
