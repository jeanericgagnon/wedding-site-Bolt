export function toValidItineraryEventDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatItineraryEventDate(value: string | null | undefined): string {
  const date = toValidItineraryEventDateOrNull(value);
  if (!date) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
