import type { BadgeProps } from '../../components/ui';
import type { ControlTowerActionTarget } from './controlTowerIntelligence';

export interface DayOfBrainAction {
  label: string;
  target: ControlTowerActionTarget;
}

export interface DayOfBrainSignal {
  label: string;
  value: string;
  detail: string;
  variant: BadgeProps['variant'];
}

export interface DayOfBrainBriefing {
  eyebrow: string;
  title: string;
  detail: string;
  badges: string[];
  signals: DayOfBrainSignal[];
  primaryAction?: DayOfBrainAction;
  secondaryAction?: DayOfBrainAction;
}

export interface DayOfBrainInput {
  daysUntilWedding: number | null;
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  itineraryEventCount?: number | null;
  checkedInCount?: number | null;
  liveIssueCount?: number | null;
  watchCount?: number | null;
  openQnaCount?: number | null;
  scheduledAlertCount?: number | null;
  invalidSeatCount?: number | null;
  unassignedSeatCount?: number | null;
  splitHouseholdCount?: number | null;
  isArchiveLike?: boolean;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function pct(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function getSignalVariant(value: number, calmThreshold: number, watchThreshold: number): BadgeProps['variant'] {
  if (value <= calmThreshold) return 'success';
  if (value <= watchThreshold) return 'warning';
  return 'error';
}

export function buildDayOfBrainBriefing(input: DayOfBrainInput): DayOfBrainBriefing {
  const checkedInCount = Math.max(input.checkedInCount ?? 0, 0);
  const itineraryEventCount = Math.max(input.itineraryEventCount ?? 0, 0);
  const liveIssueCount = Math.max(input.liveIssueCount ?? 0, 0);
  const watchCount = Math.max(input.watchCount ?? 0, 0);
  const openQnaCount = Math.max(input.openQnaCount ?? 0, 0);
  const scheduledAlertCount = Math.max(input.scheduledAlertCount ?? 0, 0);
  const invalidSeatCount = Math.max(input.invalidSeatCount ?? 0, 0);
  const unassignedSeatCount = Math.max(input.unassignedSeatCount ?? 0, 0);
  const splitHouseholdCount = Math.max(input.splitHouseholdCount ?? 0, 0);
  const respondedGuests = Math.min(input.confirmedGuests + Math.max(input.totalGuests - input.confirmedGuests - input.pendingGuests, 0), input.totalGuests);
  const responseRate = pct(respondedGuests, input.totalGuests);
  const confirmedCoverage = pct(input.confirmedGuests, input.totalGuests);
  const weddingToday = input.daysUntilWedding === 0;
  const weddingSoon = input.daysUntilWedding !== null && input.daysUntilWedding >= 0 && input.daysUntilWedding <= 14;
  const responsePressure = input.daysUntilWedding !== null && input.daysUntilWedding <= 21 && (input.pendingGuests >= 8 || pct(input.pendingGuests, input.totalGuests || 1) >= 12);
  const liveFriction = liveIssueCount + watchCount + openQnaCount;

  const signals: DayOfBrainSignal[] = [
    {
      label: 'Guest follow-through',
      value: input.totalGuests > 0 ? `${responseRate}%` : 'Quiet',
      detail: input.totalGuests === 0
        ? 'Guest list is still empty, so day-of pressure has not started yet.'
        : input.pendingGuests > 0
          ? `${pluralize(input.pendingGuests, 'guest')} still need a final reply.`
          : 'Every invited guest has already replied.',
      variant: input.totalGuests === 0 ? 'neutral' : responseRate >= 88 ? 'success' : responseRate >= 70 ? 'warning' : 'error',
    },
    {
      label: 'Seating readiness',
      value: input.totalGuests === 0 && unassignedSeatCount === 0 && invalidSeatCount === 0
        ? 'Later'
        : invalidSeatCount > 0
          ? `${pluralize(invalidSeatCount, 'drift')}`
          : unassignedSeatCount > 0
            ? `${pluralize(unassignedSeatCount, 'open seat')}`
            : 'Ready',
      detail: invalidSeatCount > 0
        ? `${pluralize(invalidSeatCount, 'assignment')} no longer match RSVP truth.`
        : unassignedSeatCount > 0
          ? `${pluralize(unassignedSeatCount, 'guest')} still need a seat.`
          : splitHouseholdCount > 0
            ? `${pluralize(splitHouseholdCount, 'household')} still feel split across the room.`
            : 'The room is calm enough to support the live day.',
      variant: invalidSeatCount > 0 ? 'error' : unassignedSeatCount > 0 || splitHouseholdCount > 0 ? 'warning' : 'success',
    },
    {
      label: 'Live coordination',
      value: weddingToday ? `${checkedInCount} in` : liveFriction === 0 ? 'Calm' : `${pluralize(liveFriction, 'live issue')}`,
      detail: liveFriction > 0
        ? `${pluralize(watchCount, 'door watch')}, ${pluralize(openQnaCount, 'open question')}, and ${pluralize(liveIssueCount, 'board escalation')} are in play.`
        : weddingToday
          ? `${pluralize(checkedInCount, 'guest')} already checked in and no live exceptions are stacked up.`
          : scheduledAlertCount > 0
            ? `${pluralize(scheduledAlertCount, 'scheduled alert')} are already lined up for the day.`
            : 'No live coordination pressure is building right now.',
      variant: getSignalVariant(liveFriction, 0, 2),
    },
  ];

  if (input.isArchiveLike || (input.daysUntilWedding !== null && input.daysUntilWedding < 0)) {
    return {
      eyebrow: 'Day-of brain',
      title: 'The live day is behind you, so the board can stay quiet now',
      detail: 'This is the moment to keep the site graceful, preserve memories, and avoid spinning the operations layer back up unless you truly need it.',
      badges: [
        `${confirmedCoverage}% confirmed`,
        `${checkedInCount} checked in`,
      ],
      signals,
      primaryAction: { label: 'Review photos', target: 'photos' },
      secondaryAction: { label: 'Open vault', target: 'vault' },
    };
  }

  if (weddingToday && liveFriction > 0) {
    return {
      eyebrow: 'Day-of brain',
      title: 'Stay in coordinator mode until the live exceptions settle',
      detail: 'Today is about clearing the active friction first so guests feel a smooth room even if things are moving fast behind the scenes.',
      badges: [
        `${pluralize(liveFriction, 'live issue')}`,
        `${checkedInCount} checked in`,
      ],
      signals,
      primaryAction: { label: 'Run coordinator mode', target: 'coordinator' },
      secondaryAction: openQnaCount > 0 ? { label: 'Open messages', target: 'messages' } : { label: 'Review seating', target: 'seating' },
    };
  }

  if (invalidSeatCount > 0) {
    return {
      eyebrow: 'Day-of brain',
      title: 'Clear seating drift before you trust the room',
      detail: 'The fastest way to lower event-day risk is reconciling the stale seats first. Everything else gets calmer once the room matches the real RSVP truth.',
      badges: [
        `${pluralize(invalidSeatCount, 'invalid seat')}`,
        weddingSoon && input.daysUntilWedding !== null ? `${input.daysUntilWedding} days left` : `${pluralize(input.pendingGuests, 'pending RSVP')}`,
      ],
      signals,
      primaryAction: { label: 'Open seating', target: 'seating' },
      secondaryAction: { label: 'Open coordinator mode', target: 'coordinator' },
    };
  }

  if (unassignedSeatCount > 0 && weddingSoon) {
    return {
      eyebrow: 'Day-of brain',
      title: 'Finish the open seats before the day gets any closer',
      detail: 'You do not need a perfect room yet. You do need every confirmed guest placed so the live check-in board is not compensating for a seating gap later.',
      badges: [
        `${pluralize(unassignedSeatCount, 'open seat move')}`,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals,
      primaryAction: { label: 'Open seating', target: 'seating' },
      secondaryAction: { label: 'Review guests', target: 'guests' },
    };
  }

  if (weddingSoon && itineraryEventCount === 0) {
    return {
      eyebrow: 'Day-of brain',
      title: 'The weekend still needs a guest-facing schedule spine',
      detail: 'Before the live layer can truly help, guests need a real timeline to trust. Add the anchor events first, then let messages and coordinator mode build on top of that truth.',
      badges: [
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
        'No itinerary events yet',
      ],
      signals,
      primaryAction: { label: 'Open planning', target: 'planning' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (responsePressure) {
    return {
      eyebrow: 'Day-of brain',
      title: 'The guest list still needs a final nudge before the day feels safe',
      detail: 'The right pressure move here is not more setup polish. It is getting the remaining replies and contact cleanup out of the way while there is still room to act.',
      badges: [
        `${pluralize(input.pendingGuests, 'pending RSVP')}`,
        input.daysUntilWedding === null ? `${confirmedCoverage}% confirmed` : `${input.daysUntilWedding} days left`,
      ],
      signals,
      primaryAction: { label: 'Review guests', target: 'guests' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (weddingSoon) {
    return {
      eyebrow: 'Day-of brain',
      title: 'The core setup is steady, so keep the live tools warm',
      detail: weddingToday
        ? 'The room is calm enough that speed and handoff matter more than major edits. Stay close to check-in, timeline, and guest updates.'
        : 'You are close enough now that the best use of time is walking the live-day board and tightening only the things that would slow the team down later.',
      badges: [
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
        `${confirmedCoverage}% confirmed`,
      ],
      signals,
      primaryAction: { label: 'Open coordinator mode', target: 'coordinator' },
      secondaryAction: { label: 'Open seating', target: 'seating' },
    };
  }

  return {
    eyebrow: 'Day-of brain',
    title: 'The live-day layer is healthy enough to stay in the background',
    detail: 'Nothing is demanding event-day intervention yet. Keep the plan moving, and only pull the operations layer forward when the wedding gets closer or the board starts to drift.',
    badges: [
      `${confirmedCoverage}% confirmed`,
      scheduledAlertCount > 0 ? `${pluralize(scheduledAlertCount, 'scheduled alert')}` : 'No live alerts queued',
    ],
    signals,
    primaryAction: { label: 'Open planning', target: 'planning' },
    secondaryAction: { label: 'Review guests', target: 'guests' },
  };
}
