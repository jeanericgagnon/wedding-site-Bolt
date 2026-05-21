function normalizeVaultDateInput(value: string): string | null {
  const trimmed = value.trim();
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

export function toValidDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;

  const date = value instanceof Date
    ? new Date(value.getTime())
    : (() => {
        const normalized = normalizeVaultDateInput(value);
        return normalized ? new Date(normalized) : null;
      })();

  if (!date) return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getVaultUnlockDate(weddingDate: Date | string | null | undefined, durationYears: number): Date | null {
  const date = toValidDateOrNull(weddingDate);
  if (!date) return null;
  date.setFullYear(date.getFullYear() + durationYears);
  return date;
}

export function formatVaultUnlockDate(value: Date | string | null | undefined, fallback = 'Unknown date'): string {
  const date = toValidDateOrNull(value);
  if (!date) return fallback;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
