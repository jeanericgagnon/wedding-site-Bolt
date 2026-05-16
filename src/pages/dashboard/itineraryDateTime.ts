export function combineDateAndTimeISO(date: string, time: string | null): string | undefined {
  if (!date) return undefined;
  const normalizedTime = time && time.trim().length > 0 ? time.trim() : '';
  if (!normalizedTime) return undefined;
  const parsed = new Date(`${date}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
