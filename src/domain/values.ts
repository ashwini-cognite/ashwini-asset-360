import { CDM_SPACE } from './cdm';

export type InstanceRef = {
  space: string;
  externalId: string;
};

export type DmsNode = {
  instanceType: 'node';
  space: string;
  externalId: string;
  lastUpdatedTime: number;
  properties?: Record<string, Record<string, Record<string, unknown>>>;
};

export function instanceKey(ref: InstanceRef): string {
  return `${ref.space}/${ref.externalId}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDmsNode(value: unknown): value is DmsNode {
  if (!isRecord(value)) return false;
  return (
    value.instanceType === 'node' &&
    typeof value.space === 'string' &&
    typeof value.externalId === 'string' &&
    typeof value.lastUpdatedTime === 'number'
  );
}

export function readStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

export function isAccessDenied(error: unknown): boolean {
  const status = readStatus(error);
  return status === 401 || status === 403;
}

export function isUnknownPropertyError(error: unknown): boolean {
  if (readStatus(error) !== 400) return false;
  const message = error instanceof Error ? error.message : '';
  return /property/i.test(message);
}

export function viewProperties(node: DmsNode, viewExternalId: string): Record<string, unknown> | undefined {
  return node.properties?.[CDM_SPACE]?.[`${viewExternalId}/v1`];
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function readTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export function isDirectRelation(value: unknown): value is InstanceRef {
  if (!isRecord(value)) return false;
  return typeof value.space === 'string' && typeof value.externalId === 'string';
}

export function readRelation(value: unknown): InstanceRef | undefined {
  if (!isDirectRelation(value)) return undefined;
  return { space: value.space, externalId: value.externalId };
}

export function formatTimestamp(ms: number | undefined): string {
  if (ms === undefined) return 'No date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms);
}

export function formatDate(ms: number | undefined): string {
  if (ms === undefined) return 'No date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(ms);
}
