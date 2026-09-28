export type ActivityStatus = 'Completed' | 'In progress' | 'Scheduled' | 'Undated';

export type ActivityTimes = {
  startTime?: number;
  endTime?: number;
  scheduledStartTime?: number;
  scheduledEndTime?: number;
};

export function activityStatus(times: ActivityTimes, now: number): ActivityStatus {
  if (times.endTime !== undefined && times.endTime <= now) return 'Completed';
  if (times.startTime !== undefined && times.startTime <= now) return 'In progress';
  const scheduled = times.scheduledStartTime ?? times.scheduledEndTime;
  if (scheduled !== undefined && scheduled > now) return 'Scheduled';
  if (
    times.endTime !== undefined ||
    times.startTime !== undefined ||
    times.scheduledStartTime !== undefined ||
    times.scheduledEndTime !== undefined
  ) {
    return 'Scheduled';
  }
  return 'Undated';
}

export function activityRecencyMs(times: ActivityTimes): number {
  return times.endTime ?? times.scheduledEndTime ?? times.startTime ?? times.scheduledStartTime ?? 0;
}

export function compareActivitiesByRecency(left: ActivityTimes, right: ActivityTimes): number {
  return activityRecencyMs(right) - activityRecencyMs(left);
}
