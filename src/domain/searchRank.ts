import type { InstanceRef } from './values';
import { instanceKey } from './values';

export type RankedAsset = {
  ref: InstanceRef;
  tag: string;
  name: string;
  description: string;
  sourceId: string;
};

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function rankScore(asset: RankedAsset, query: string): number {
  const needle = normalized(query);
  const tag = normalized(asset.tag);
  const source = normalized(asset.sourceId);
  if (tag === needle || source === needle) return 0;
  if (tag.startsWith(needle) || source.startsWith(needle)) return 1;
  return 2;
}

export function rankAssets(query: string, textHits: RankedAsset[], identifierHits: RankedAsset[]): RankedAsset[] {
  const ordered = [...identifierHits, ...textHits];
  const seen = new Set<string>();
  const unique: RankedAsset[] = [];
  for (const hit of ordered) {
    const key = instanceKey(hit.ref);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(hit);
  }
  return unique
    .map((hit, index) => ({ hit, index, score: rankScore(hit, query) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((entry) => entry.hit);
}
