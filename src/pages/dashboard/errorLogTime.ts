export function toValidErrorLogDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getErrorLogTimestamp(value: string | null | undefined): number {
  const date = toValidErrorLogDateOrNull(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}

export function formatErrorLogDateTime(value: string | null | undefined): string {
  const date = toValidErrorLogDateOrNull(value);
  return date ? date.toLocaleString() : 'Unknown time';
}
