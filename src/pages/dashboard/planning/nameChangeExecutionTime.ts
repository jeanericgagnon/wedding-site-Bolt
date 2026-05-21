function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function toValidNameChangeExecutionDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = isDateOnly ? parseDateOnly(trimmed) : new Date(trimmed);
  if (!date) return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getNameChangeExecutionTimestamp(value: string | null | undefined): number {
  return toValidNameChangeExecutionDateOrNull(value)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

export function formatNameChangeExecutionDateTime(value: string | null | undefined): string {
  const timestamp = getNameChangeExecutionTimestamp(value);
  if (timestamp === Number.NEGATIVE_INFINITY) return 'Unknown time';
  return new Date(timestamp).toLocaleString();
}

export function sortNameChangeExecutionActivity<T extends { timestamp: string | null | undefined }>(items: T[]): T[] {
  return [...items].sort((a, b) => getNameChangeExecutionTimestamp(b.timestamp) - getNameChangeExecutionTimestamp(a.timestamp));
}
