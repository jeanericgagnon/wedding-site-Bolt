function toValidRsvpDeadlineOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
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
