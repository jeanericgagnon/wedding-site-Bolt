function toValidRsvpDeadlineOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, yearValue, monthValue, dayValue] = dateOnlyMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const localDate = new Date(year, month - 1, day);
    return localDate.getFullYear() === year && localDate.getMonth() === month - 1 && localDate.getDate() === day
      ? localDate
      : null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isRsvpDeadlinePassed(value: string | null | undefined, now = new Date()): boolean {
  if (!value) return false;

  const deadline = toValidRsvpDeadlineOrNull(value);
  if (!deadline) return true;

  return deadline < now;
}

export function formatRsvpDeadline(value: string | null | undefined, fallback = 'Unknown date'): string {
  const deadline = toValidRsvpDeadlineOrNull(value);
  return deadline
    ? deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : fallback;
}
