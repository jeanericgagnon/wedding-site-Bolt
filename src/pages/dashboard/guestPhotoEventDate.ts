export function toValidGuestPhotoEventDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGuestPhotoEventDate(value: string | null | undefined): string {
  const date = toValidGuestPhotoEventDateOrNull(value);
  return date ? date.toLocaleDateString() : 'Unknown date';
}

export function getSuggestedGuestPhotoWindowStart(value: string | null | undefined, fallback = new Date()): Date {
  return toValidGuestPhotoEventDateOrNull(value) ?? fallback;
}
