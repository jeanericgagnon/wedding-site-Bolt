export function formatCoordinatorEventDateTime(
  value: string | null | undefined,
  fallback = 'Time TBD',
): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString();
}
