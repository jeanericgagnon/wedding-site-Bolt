const FALLBACK_TIME = Number.NEGATIVE_INFINITY;

export function toValidVaultEntryDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getVaultEntryTimestamp(value: string | null | undefined): number {
  return toValidVaultEntryDateOrNull(value)?.getTime() ?? FALLBACK_TIME;
}

export function formatVaultEntryDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  fallback = 'Unknown date',
): string {
  const date = toValidVaultEntryDateOrNull(value);
  return date ? date.toLocaleDateString('en-US', options) : fallback;
}
