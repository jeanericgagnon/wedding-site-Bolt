const FALLBACK_TIME = Number.NEGATIVE_INFINITY;

function toValidRegistryItemDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
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
