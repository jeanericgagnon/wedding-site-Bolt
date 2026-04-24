export function toValidGuestEventDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGuestEventDate(value: string | null | undefined): string {
  const date = toValidGuestEventDateOrNull(value);
  return date
    ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Unknown date';
}
