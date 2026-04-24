export function getNameChangeExecutionTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

export function sortNameChangeExecutionActivity<T extends { timestamp: string | null | undefined }>(items: T[]): T[] {
  return [...items].sort((a, b) => getNameChangeExecutionTimestamp(b.timestamp) - getNameChangeExecutionTimestamp(a.timestamp));
}
