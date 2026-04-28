const FALLBACK_TIME = Number.NEGATIVE_INFINITY;

function normalizeRegistryItemTimeInput(value: string | null | undefined): string | null {
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

function toValidRegistryItemDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeRegistryItemTimeInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getRegistryItemTimestamp(value: string | null | undefined): number {
  return toValidRegistryItemDateOrNull(value)?.getTime() ?? FALLBACK_TIME;
}

export function isRegistryItemDue(value: string | null | undefined, now = Date.now()): boolean {
  const timestamp = getRegistryItemTimestamp(value);
  return timestamp === FALLBACK_TIME || timestamp <= now;
}

export function ageExceedsMs(value: string | null | undefined, ageMs: number, now = Date.now()): boolean {
  const timestamp = getRegistryItemTimestamp(value);
  return timestamp === FALLBACK_TIME || (now - timestamp) > ageMs;
}

export function formatRegistryItemDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Unknown date',
): string {
  const date = toValidRegistryItemDateOrNull(value);
  return date ? date.toLocaleDateString('en-US', options) : fallback;
}
