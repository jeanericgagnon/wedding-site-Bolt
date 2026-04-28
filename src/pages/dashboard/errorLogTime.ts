function normalizeErrorLogTimeInput(value: string | null | undefined): string | null {
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

export function toValidErrorLogDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeErrorLogTimeInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
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
