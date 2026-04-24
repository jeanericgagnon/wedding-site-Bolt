export function toValidTaskDueDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isTaskDueOnOrBefore(value: string | null | undefined, compareTo: Date): boolean {
  const date = toValidTaskDueDateOrNull(value);
  return date ? date.getTime() <= compareTo.getTime() : false;
}

export function isTaskDueBetween(
  value: string | null | undefined,
  start: Date,
  end: Date,
): boolean {
  const date = toValidTaskDueDateOrNull(value);
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function formatTaskDueDate(value: string | null | undefined): string {
  const date = toValidTaskDueDateOrNull(value);
  return date ? date.toLocaleDateString() : 'Unknown date';
}
