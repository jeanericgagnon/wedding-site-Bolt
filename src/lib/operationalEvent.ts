export interface OperationalEventCandidate {
  id: string;
}

export interface ChronologicalOperationalEventCandidate extends OperationalEventCandidate {
  event_date?: string | null;
  start_time?: string | null;
}

export function resolveOperationalEventId(args: {
  events: OperationalEventCandidate[];
  liveEventId?: string | null;
  upNextEventId?: string | null;
  selectedEventId?: string | null;
}): string | null {
  const knownIds = new Set(args.events.map((event) => event.id));
  const candidates = [args.liveEventId, args.upNextEventId, args.selectedEventId];

  for (const candidate of candidates) {
    if (candidate && knownIds.has(candidate)) return candidate;
  }

  return args.events[0]?.id ?? null;
}

export function resolveChronologicalOperationalEventId(
  events: ChronologicalOperationalEventCandidate[],
  now = new Date(),
): string | null {
  const dated = events
    .map((event) => ({
      event,
      startsAt: parseEventStart(event),
    }))
    .filter((entry): entry is { event: ChronologicalOperationalEventCandidate; startsAt: Date } => entry.startsAt instanceof Date);

  const upcoming = dated.find((entry) => entry.startsAt.getTime() >= now.getTime());
  if (upcoming) return upcoming.event.id;

  return dated[dated.length - 1]?.event.id ?? events[0]?.id ?? null;
}

function parseEventStart(event: ChronologicalOperationalEventCandidate): Date | null {
  const datePart = event.event_date?.trim();
  const timePart = event.start_time?.trim();

  if (timePart && /t/i.test(timePart)) {
    const parsed = new Date(timePart);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (datePart) {
    const parsed = new Date(`${datePart}T${normalizeClockTime(timePart)}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (timePart) {
    const parsed = new Date(`1970-01-01T${normalizeClockTime(timePart)}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizeClockTime(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '00:00:00';
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}
