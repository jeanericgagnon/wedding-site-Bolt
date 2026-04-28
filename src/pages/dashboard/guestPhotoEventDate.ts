function normalizeGuestPhotoEventDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

export function toValidGuestPhotoEventDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeGuestPhotoEventDateInput(value);
  if (!normalized) return null;

  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGuestPhotoEventDate(value: string | null | undefined): string {
  const date = toValidGuestPhotoEventDateOrNull(value);
  return date ? date.toLocaleDateString() : 'Unknown date';
}

export function getSuggestedGuestPhotoWindowStart(value: string | null | undefined, fallback = new Date()): Date {
  return toValidGuestPhotoEventDateOrNull(value) ?? fallback;
}
