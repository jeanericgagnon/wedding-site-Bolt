function normalizeMessageHistoryTimeInput(value: string | null | undefined): string | null {
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

function toValidMessageHistoryDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeMessageHistoryTimeInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
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
