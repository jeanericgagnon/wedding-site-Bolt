export function getDaysUntilGuestWedding(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
}
