const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

export function toValidDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValueOrEmpty(value: string | null | undefined): string {
  const date = toValidDateOrNull(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function parseRefreshWindowEndIso(value: string): string | null | undefined {
  if (!value.trim()) return null;
  const date = new Date(`${value}T23:59:59.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function getWeddingRefreshWindowDate(weddingDate: string | null | undefined): Date | null {
  const date = toValidDateOrNull(weddingDate);
  if (!date) return null;
  return new Date(date.getTime() + THIRTY_DAYS_MS);
}
