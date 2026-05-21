const FALLBACK_TIME = Number.NEGATIVE_INFINITY;

function normalizeVaultEntryTimeInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date.toISOString()
      : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function toValidVaultEntryDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeVaultEntryTimeInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
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
