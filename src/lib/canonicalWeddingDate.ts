export function resolveCanonicalWeddingDate(
  weddingData: Record<string, unknown> | null,
  site: { wedding_date?: string | null; venue_date?: string | null } | null,
): string | null {
  const event = (weddingData?.event as Record<string, unknown> | undefined) ?? undefined;
  const eventWeddingDateISO = typeof event?.weddingDateISO === 'string' ? event.weddingDateISO : null;
  const legacyWeddingDate = typeof weddingData?.weddingDate === 'string' ? (weddingData.weddingDate as string) : null;
  return eventWeddingDateISO ?? legacyWeddingDate ?? site?.wedding_date ?? site?.venue_date ?? null;
}
