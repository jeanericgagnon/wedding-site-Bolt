export function formatEventRsvpDate(value: string | null | undefined): string {
  if (!value) return 'Unknown date';

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  if (
    dateOnlyMatch
    && (date.getFullYear() !== Number(dateOnlyMatch[1])
      || date.getMonth() !== Number(dateOnlyMatch[2]) - 1
      || date.getDate() !== Number(dateOnlyMatch[3]))
  ) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
