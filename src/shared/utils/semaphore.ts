/**
 * AbortError thrown when a queued task is cancelled.
 */
export class AbortError extends Error {
  public constructor(message: string = 'Aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

type PendingTask<AsyncFn extends () => Promise<AsyncFnResult>, AsyncFnResult> = {
  resolve: (result: AsyncFnResult) => void;
  reject: (error: unknown) => void;
  fn: AsyncFn;
  key?: string;
};

const DEFAULT_MAX_CONCURRENT_TASKS = 15;

/**
 * Limits how many CDF calls run at once so a page of panels cannot stampede the API.
 */
export default class QueuedTaskRunner<
  AsyncFn extends () => Promise<AsyncFnResult>,
  AsyncFnResult = Awaited<ReturnType<AsyncFn>>,
> {
  private pendingTasks: PendingTask<AsyncFn, AsyncFnResult>[] = [];
  private currentPendingTasks = 0;
  private readonly maxConcurrentTasks: number;
  private startTime: number | null = null;

  public constructor(maxConcurrentTasks: number = DEFAULT_MAX_CONCURRENT_TASKS) {
    this.maxConcurrentTasks = maxConcurrentTasks;
  }

  public schedule(fn: AsyncFn, options: { key?: string } = {}): Promise<AsyncFnResult> {
    this.startTrackingTime();

    return new Promise((resolve, reject) => {
      if (options.key !== undefined) {
        this.pendingTasks
          .filter((task) => task.key === options.key)
          .forEach((task) => task.reject(new AbortError()));
        this.pendingTasks = this.pendingTasks.filter((task) => task.key !== options.key);
      }

      this.pendingTasks.push({
        resolve,
        reject,
        fn,
        key: options.key,
      });

      void this.attemptConsumingNextTask();
    });
  }

  public async attemptConsumingNextTask(): Promise<void> {
    if (this.pendingTasks.length === 0) return;
    if (this.currentPendingTasks >= this.maxConcurrentTasks) return;

    const pendingTask = this.pendingTasks.shift();
    if (pendingTask === undefined) {
      throw new Error('pendingTask is undefined, this should never happen');
    }

    this.currentPendingTasks += 1;
    const { fn, resolve, reject } = pendingTask;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.currentPendingTasks -= 1;
      this.tick();
      void this.attemptConsumingNextTask();
    }
  }

  public clearQueue = (): void => {
    this.pendingTasks = [];
  };

  private startTrackingTime = (): void => {
    if (this.startTime === null) {
      this.startTime = performance.now();
    }
  };

  private tick = (): void => {
    if (this.pendingTasks.length === 0) {
      this.startTime = null;
    }
  };
}

/** Shared cap for every CDF request this app makes. */
export const cdfTaskRunner = new QueuedTaskRunner(DEFAULT_MAX_CONCURRENT_TASKS);
