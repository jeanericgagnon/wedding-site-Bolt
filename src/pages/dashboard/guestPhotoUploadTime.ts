export function toValidGuestPhotoDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGuestPhotoDate(value: string | null | undefined): string {
  const date = toValidGuestPhotoDateOrNull(value);
  return date ? date.toLocaleDateString() : 'Unknown date';
}

export function formatGuestPhotoDateTime(value: string | null | undefined): string {
  const date = toValidGuestPhotoDateOrNull(value);
  return date ? date.toLocaleString() : 'Unknown date';
}

export function toGuestPhotoCsvTimestamp(value: string | null | undefined): string {
  const date = toValidGuestPhotoDateOrNull(value);
  return date ? date.toISOString() : '';
}

export function getGuestPhotoSortTime(value: string | null | undefined): number {
  const date = toValidGuestPhotoDateOrNull(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}
