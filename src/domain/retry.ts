import { isRecord } from './values';

const INITIAL_DELAY_MS = 250;
const MAX_ATTEMPTS = 3;
const MAX_WAIT_MS = 2000;

export type RetryOptions = {
  random?: () => number;
  now?: () => number;
  readRetryAfter?: (error: unknown, nowMs: number) => number | undefined;
};

export async function withRetry<T>(
  task: () => Promise<T>,
  readStatus: (error: unknown) => number | undefined,
  sleep: (ms: number) => Promise<void>,
  options?: RetryOptions,
): Promise<T> {
  const random = options?.random ?? Math.random;
  const now = options?.now ?? Date.now;
  const readRetryAfter = options?.readRetryAfter ?? readRetryAfterMs;
  let delayMs = INITIAL_DELAY_MS;
  let attempt = 0;
  for (;;) {
    try {
      return await task();
    } catch (error) {
      attempt += 1;
      if (readStatus(error) !== 429 || attempt >= MAX_ATTEMPTS) throw error;
      await sleep(waitFor(delayMs, random, readRetryAfter(error, now())));
      delayMs *= 2;
    }
  }
}

export function readRetryAfterMs(error: unknown, nowMs: number): number | undefined {
  const header = headerText(isRecord(error) ? error.headers : undefined, 'retry-after');
  if (header === undefined) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const when = Date.parse(header);
  if (Number.isNaN(when)) return undefined;
  return Math.max(0, when - nowMs);
}

function headerText(headers: unknown, name: string): string | undefined {
  if (isRecord(headers)) {
    const named = headers[name] ?? headers['Retry-After'];
    if (typeof named === 'string' && named.trim().length > 0) return named.trim();
    if (typeof named === 'number' && Number.isFinite(named)) return String(named);
  }
  if (!isHeaderMap(headers)) return undefined;
  const value = headers.get(name);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function isHeaderMap(value: unknown): value is { get: (name: string) => unknown } {
  return isRecord(value) && typeof value.get === 'function';
}

function waitFor(baseMs: number, random: () => number, retryAfterMs: number | undefined): number {
  const chosen = retryAfterMs ?? jitteredDelay(baseMs, random);
  if (!Number.isFinite(chosen) || chosen <= 0) return 0;
  return Math.min(chosen, MAX_WAIT_MS);
}

function jitteredDelay(baseMs: number, random: () => number): number {
  const sample = random();
  const unit = sample < 0 ? 0 : sample > 1 ? 1 : sample;
  return Math.round(baseMs * (0.5 + unit * 0.5));
}
