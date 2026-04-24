export function toValidVendorDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
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
