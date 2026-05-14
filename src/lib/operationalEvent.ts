export interface OperationalEventCandidate {
  id: string;
}

export interface ChronologicalOperationalEventCandidate extends OperationalEventCandidate {
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
}

export function resolveOperationalEventId(args: {
  events: ChronologicalOperationalEventCandidate[];
  liveEventId?: string | null;
  upNextEventId?: string | null;
  selectedEventId?: string | null;
  now?: Date;
}): string | null {
  const knownIds = new Set(args.events.map((event) => event.id));
  const now = args.now ?? new Date();

  if (args.liveEventId && knownIds.has(args.liveEventId)) return args.liveEventId;

  const liveEventId = resolveLiveOperationalEventId(args.events, now);
  if (liveEventId) return liveEventId;

  const candidates = [args.upNextEventId, args.selectedEventId];

  for (const candidate of candidates) {
    if (candidate && knownIds.has(candidate)) return candidate;
  }

  return resolveChronologicalOperationalEventId(args.events, now);
}

export function resolveChronologicalOperationalEventId(
  events: ChronologicalOperationalEventCandidate[],
  now = new Date(),
): string | null {
  const liveEventId = resolveLiveOperationalEventId(events, now);
  if (liveEventId) return liveEventId;

  const dated = events
    .map((event) => ({
      event,
      startsAt: parseEventStart(event),
    }))
    .filter((entry): entry is { event: ChronologicalOperationalEventCandidate; startsAt: Date } => entry.startsAt instanceof Date);

  if (dated.length === 0) return events[0]?.id ?? null;

  const upcoming = dated.find((entry) => entry.startsAt.getTime() >= now.getTime());
  if (upcoming) return upcoming.event.id;

  return dated[dated.length - 1]?.event.id ?? events[0]?.id ?? null;
}

function resolveLiveOperationalEventId(
  events: ChronologicalOperationalEventCandidate[],
  now: Date,
): string | null {
  const dated = events
    .map((event) => {
      const startsAt = parseEventStart(event);
      const endsAt = parseEventEnd(event, startsAt);
      return { event, startsAt, endsAt };
    })
    .filter((entry): entry is { event: ChronologicalOperationalEventCandidate; startsAt: Date; endsAt: Date } => (
      entry.startsAt instanceof Date && entry.endsAt instanceof Date
    ))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  const live = dated.find((entry) => now.getTime() >= entry.startsAt.getTime() && now.getTime() <= entry.endsAt.getTime());
  return live?.event.id ?? null;
}

function parseEventEnd(
  event: ChronologicalOperationalEventCandidate,
  startsAt: Date | null,
): Date | null {
  if (!startsAt) return null;
  const endTime = event.end_time?.trim();
  if (endTime) {
    if (/t/i.test(endTime)) {
      const parsed = new Date(endTime);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    } else if (event.event_date?.trim()) {
      const parsed = new Date(`${event.event_date.trim()}T${normalizeClockTime(endTime)}`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  const durationMinutes = typeof event.duration_minutes === 'number' && event.duration_minutes > 0
    ? event.duration_minutes
    : 360;
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
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
