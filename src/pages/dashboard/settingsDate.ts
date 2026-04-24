export function toValidSettingsDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSettingsDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Unknown date',
): string {
  const date = toValidSettingsDateOrNull(value);
  return date ? date.toLocaleDateString('en-US', options) : fallback;
}
