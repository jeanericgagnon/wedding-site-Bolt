const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeRegistryDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === trimmed ? `${trimmed}T00:00:00Z` : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function toValidDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeRegistryDateInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValueOrEmpty(value: string | null | undefined): string {
  const date = toValidDateOrNull(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function parseRefreshWindowEndIso(value: string): string | null | undefined {
  if (!value.trim()) return null;
  const normalized = normalizeRegistryDateInput(value);
  if (!normalized) return undefined;

  return `${normalized.slice(0, 10)}T23:59:59.000Z`;
}

export function getWeddingRefreshWindowDate(weddingDate: string | null | undefined): Date | null {
  const date = toValidDateOrNull(weddingDate);
  if (!date) return null;
  return new Date(date.getTime() + THIRTY_DAYS_MS);
}
