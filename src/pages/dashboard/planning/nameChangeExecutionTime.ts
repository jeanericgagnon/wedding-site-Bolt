export function getNameChangeExecutionTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

export function formatNameChangeExecutionDateTime(value: string | null | undefined): string {
  const timestamp = getNameChangeExecutionTimestamp(value);
  if (timestamp === Number.NEGATIVE_INFINITY) return 'Unknown time';
  return new Date(timestamp).toLocaleString();
}

export function sortNameChangeExecutionActivity<T extends { timestamp: string | null | undefined }>(items: T[]): T[] {
  return [...items].sort((a, b) => getNameChangeExecutionTimestamp(b.timestamp) - getNameChangeExecutionTimestamp(a.timestamp));
}
