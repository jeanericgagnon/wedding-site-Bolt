function normalizeTaskDueDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === trimmed ? `${trimmed}T00:00:00.000Z` : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function toValidTaskDueDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeTaskDueDateInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
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
