function toValidMessageHistoryDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getMessageHistoryTimestamp(value: string | null | undefined): number {
  const date = toValidMessageHistoryDateOrNull(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}

export function formatMessageHistoryDateTime(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Unknown time',
): string {
  const date = toValidMessageHistoryDateOrNull(value);
  return date ? date.toLocaleString('en-US', options) : fallback;
}

export function formatMessageHistoryDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Unknown date',
): string {
  const date = toValidMessageHistoryDateOrNull(value);
  return date ? date.toLocaleDateString('en-US', options) : fallback;
}
