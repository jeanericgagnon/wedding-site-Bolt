function normalizeVendorDateInput(value: string | null | undefined): string | null {
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

export function toValidVendorDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeVendorDateInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isVendorDateOnOrBefore(value: string | null | undefined, compareTo: Date): boolean {
  const date = toValidVendorDateOrNull(value);
  return date ? date.getTime() <= compareTo.getTime() : false;
}

export function isVendorDateBetween(value: string | null | undefined, start: Date, end: Date): boolean {
  const date = toValidVendorDateOrNull(value);
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function formatVendorDate(value: string | null | undefined, fallback = 'Unknown date'): string {
  const date = toValidVendorDateOrNull(value);
  return date ? date.toLocaleDateString() : fallback;
}
