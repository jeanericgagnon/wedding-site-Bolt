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
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  badges: string[];
  signals: DayOfBrainSignal[];
  sequence: Array<{
    id: 'stabilize' | 'check' | 'handoff';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
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

function buildDayOfSequence(
  current: { title: string; detail: string },
  next: { title: string; detail: string },
  then: { title: string; detail: string },
) {
  return [
    {
      id: 'stabilize' as const,
      status: 'current' as const,
      title: current.title,
      detail: current.detail,
    },
    {
      id: 'check' as const,
      status: 'next' as const,
      title: next.title,
      detail: next.detail,
    },
    {
      id: 'handoff' as const,
      status: 'then' as const,
      title: then.title,
      detail: then.detail,
    },
  ];
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
      focusTitle: 'Preserve what matters without restarting the machine',
      focusDetail: 'The best post-wedding move is keeping the archive and guest-facing story graceful while leaving the operations layer asleep.',
      bestNextMove: 'Use photos or the vault to preserve the strongest memories now, and leave the live operations layer quiet unless a real post-wedding need appears.',
      decisionRule: 'After the live day, preserve memories and closure before you reopen active operations.',
      badges: [
        `${confirmedCoverage}% confirmed`,
        `${checkedInCount} checked in`,
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: 'Leave the live board quiet',
          detail: 'Do not wake the operations layer back up unless a real post-wedding need actually appears.',
        },
        {
          title: 'Preserve the strongest memories',
          detail: 'Use photos or the vault to keep the wedding story graceful while the operational pressure fades.',
        },
        {
          title: 'Treat follow-up as archive work',
          detail: 'If anything else needs attention, let it happen through closure and keepsake lanes rather than live coordination.',
        },
      ),
      primaryAction: { label: 'Review photos', target: 'photos' },
      secondaryAction: { label: 'Open vault', target: 'vault' },
    };
  }

  if (weddingToday && liveFriction > 0) {
    return {
      eyebrow: 'Day-of brain',
      title: 'Stay in coordinator mode until the live exceptions settle',
      detail: 'Today is about clearing the active friction first so guests feel a smooth room even if things are moving fast behind the scenes.',
      focusTitle: 'Protect guest flow before anything else',
      focusDetail: 'When live friction is active, the room needs fast exception handling more than fresh edits or cleanup elsewhere.',
      bestNextMove: 'Stay in coordinator mode until the live exceptions settle, then only step out for the one room or message change that truly reduces friction.',
      decisionRule: 'If live exceptions are already stacked up, coordinator calm beats every other optimization.',
      badges: [
        `${pluralize(liveFriction, 'live issue')}`,
        `${checkedInCount} checked in`,
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: 'Clear the live exceptions first',
          detail: 'Treat the active questions, watch items, and escalations as the room’s real pressure right now.',
        },
        {
          title: 'Use messages or seating only for leverage',
          detail: 'Step out only when a room or messaging move clearly reduces the active friction instead of adding fresh churn.',
        },
        {
          title: 'Return to a calm support posture',
          detail: 'Once the exceptions settle, let coordinator mode stay ready without dragging the whole board back into emergency motion.',
        },
      ),
      primaryAction: { label: 'Run coordinator mode', target: 'coordinator' },
      secondaryAction: openQnaCount > 0 ? { label: 'Open messages', target: 'messages' } : { label: 'Review seating', target: 'seating' },
    };
  }

  if (invalidSeatCount > 0) {
    return {
      eyebrow: 'Day-of brain',
      title: 'Clear seating drift before you trust the room',
      detail: 'The fastest way to lower event-day risk is reconciling the stale seats first. Everything else gets calmer once the room matches the real RSVP truth.',
      focusTitle: 'Repair room truth before you run the day from it',
      focusDetail: 'A room with stale assignments forces the live team to compensate everywhere else, so this is the most leverage-heavy correction.',
      bestNextMove: 'Open seating, repair the invalid assignments first, and only then trust coordinator mode or guest flow decisions built on that room.',
      decisionRule: 'If seats no longer match RSVP reality, fix that truth before you trust downstream coordination.',
      badges: [
        `${pluralize(invalidSeatCount, 'invalid seat')}`,
        weddingSoon && input.daysUntilWedding !== null ? `${input.daysUntilWedding} days left` : `${pluralize(input.pendingGuests, 'pending RSVP')}`,
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: 'Repair the stale seats first',
          detail: 'Reconcile the assignments that no longer match RSVP truth before you trust the room in any other workflow.',
        },
        {
          title: 'Re-check the live room against coordination',
          detail: 'Once the stale seats are fixed, confirm the corrected room still supports the guest flow and handoff plan cleanly.',
        },
        {
          title: 'Let the live layer use the repaired room',
          detail: 'After the room truth is solid again, messages and coordinator moves can safely build on top of it.',
        },
      ),
      primaryAction: { label: 'Open seating', target: 'seating' },
      secondaryAction: { label: 'Open coordinator mode', target: 'coordinator' },
    };
  }

  if (unassignedSeatCount > 0 && weddingSoon) {
    return {
      eyebrow: 'Day-of brain',
      title: 'Finish the open seats before the day gets any closer',
      detail: 'You do not need a perfect room yet. You do need every confirmed guest placed so the live check-in board is not compensating for a seating gap later.',
      focusTitle: 'Turn confirmed attendance into a usable room',
      focusDetail: 'The room does not need polish yet, but it does need every confirmed guest grounded in a real seat before the date gets tighter.',
      bestNextMove: 'Finish placing the remaining confirmed guests now, then come back for comfort or balance passes only after every seat exists.',
      decisionRule: 'Near the wedding, complete placement beats perfect layout.',
      badges: [
        `${pluralize(unassignedSeatCount, 'open seat move')}`,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: 'Place every confirmed guest',
          detail: 'Use this pass to turn the remaining floating confirmations into a real room before the timeline tightens further.',
        },
        {
          title: 'Check the room for comfort after coverage exists',
          detail: 'Only move into balance or comfort passes once every confirmed guest actually has a seat.',
        },
        {
          title: 'Hand the finished room to live support',
          detail: 'After placement is complete, let coordinator mode and check-in operate from a room that no longer needs rescue.',
        },
      ),
      primaryAction: { label: 'Open seating', target: 'seating' },
      secondaryAction: { label: 'Review guests', target: 'guests' },
    };
  }

  if (weddingSoon && itineraryEventCount === 0) {
    return {
      eyebrow: 'Day-of brain',
      title: 'The weekend still needs a guest-facing schedule spine',
      detail: 'Before the live layer can truly help, guests need a real timeline to trust. Add the anchor events first, then let messages and coordinator mode build on top of that truth.',
      focusTitle: 'Give the weekend one schedule everyone can trust',
      focusDetail: 'Messages, coordination, and guest flow all get easier once the public-facing timeline exists and stops living only in someone’s head.',
      bestNextMove: 'Add the ceremony, reception, and other guest-critical anchor events first, then return to messages or coordinator work once the timeline is real.',
      decisionRule: 'If the wedding is close and the schedule is empty, itinerary truth beats every softer layer on top.',
      badges: [
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
        'No itinerary events yet',
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: 'Add the anchor events first',
          detail: 'Give guests a ceremony, reception, and other key weekend anchors before you try to support them with live tools.',
        },
        {
          title: 'Use the real timeline to steady updates',
          detail: 'Once the schedule exists, let messages and guest guidance build from that shared version of the weekend.',
        },
        {
          title: 'Return to live coordination on top of the spine',
          detail: 'After the itinerary is real, the live layer can support exceptions without compensating for a missing timeline.',
        },
      ),
      primaryAction: { label: 'Open itinerary', target: 'itinerary' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (responsePressure) {
    return {
      eyebrow: 'Day-of brain',
      title: 'The guest list still needs a final nudge before the day feels safe',
      detail: 'The right pressure move here is not more setup polish. It is getting the remaining replies and contact cleanup out of the way while there is still room to act.',
      focusTitle: 'Close the guest-response gap while there is still room to react',
      focusDetail: 'The safest next move is resolving missing replies and contact cleanup, because those gaps still change what the live day will ask of the team.',
      bestNextMove: 'Review the pending guests, send the last RSVP or contact nudge, and only come back to day-of polish after the list stops moving.',
      decisionRule: 'When RSVP pressure is still real, guest follow-through beats setup polish.',
      badges: [
        `${pluralize(input.pendingGuests, 'pending RSVP')}`,
        input.daysUntilWedding === null ? `${confirmedCoverage}% confirmed` : `${input.daysUntilWedding} days left`,
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: 'Close the reply gap first',
          detail: 'Use the remaining runway to turn the undecided or unreachable guests into a steadier live-day guest list.',
        },
        {
          title: 'Send one clean nudge pass',
          detail: 'Use guests and messages together so the follow-up is deliberate instead of passive waiting.',
        },
        {
          title: 'Return to day-of polish once the list steadies',
          detail: 'After the list stops moving, the live-day layer can focus on support instead of guesswork.',
        },
      ),
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
      focusTitle: weddingToday ? 'Use the live tools as support, not as rescue' : 'Keep the live layer warm without inventing new work',
      focusDetail: weddingToday
        ? 'The operations layer is doing its job when it helps the team move quickly through a calm room instead of creating fresh last-minute churn.'
        : 'The core setup is solid enough now that small readiness passes matter more than reopening whole systems.',
      bestNextMove: weddingToday
        ? 'Stay close to coordinator mode, check-in, and seating support, and resist broad new edits unless a live exception actually calls for them.'
        : 'Walk one readiness pass through coordinator mode and seating now, then leave the stable systems alone while they stay calm.',
      decisionRule: weddingToday
        ? 'On the wedding day, support speed and handoff instead of making broad new edits.'
        : 'When the setup is steady, tighten only the live-day edges that would actually slow the team down later.',
      badges: [
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
        `${confirmedCoverage}% confirmed`,
      ],
      signals,
      sequence: buildDayOfSequence(
        {
          title: weddingToday ? 'Stay close to the live board' : 'Do one calm readiness pass',
          detail: weddingToday
            ? 'Use coordinator mode, check-in, and seating support to keep the room moving quickly without creating extra churn.'
            : 'Walk the live-day board once so the tools stay warm without reopening stable systems.',
        },
        {
          title: weddingToday ? 'Only step out for real exceptions' : 'Tighten the few edges that slow handoff',
          detail: weddingToday
            ? 'Use messages or seating adjustments only when a real live exception calls for them.'
            : 'Keep edits limited to the details that would genuinely slow the team down later.',
        },
        {
          title: weddingToday ? 'Let the calm room stay calm' : 'Leave the stable systems alone',
          detail: weddingToday
            ? 'Once the live support layer is steady, resist dragging the whole board back into broad edit mode.'
            : 'After the readiness pass, protect the parts of the system that are already working cleanly.',
        },
      ),
      primaryAction: { label: 'Open coordinator mode', target: 'coordinator' },
      secondaryAction: { label: 'Open seating', target: 'seating' },
    };
  }

  return {
    eyebrow: 'Day-of brain',
    title: 'The live-day layer is healthy enough to stay in the background',
    detail: 'Nothing is demanding event-day intervention yet. Keep the plan moving, and only pull the operations layer forward when the wedding gets closer or the board starts to drift.',
    focusTitle: 'Let the operations layer stay quiet for now',
    focusDetail: 'The best outcome here is that the live-day tooling stays ready without stealing attention from planning that still matters more.',
    bestNextMove: 'Keep planning moving in the foreground and only pull the day-of layer forward again when the wedding gets closer or the board starts to drift.',
    decisionRule: 'If event-day pressure is not real yet, keep the live layer ready but secondary.',
    badges: [
      `${confirmedCoverage}% confirmed`,
      scheduledAlertCount > 0 ? `${pluralize(scheduledAlertCount, 'scheduled alert')}` : 'No live alerts queued',
    ],
    signals,
    sequence: buildDayOfSequence(
      {
        title: 'Keep the live layer in the background',
        detail: 'Let planning stay in front while the day-of tooling remains ready but quiet.',
      },
      {
        title: 'Watch for real drift or a closer date',
        detail: 'Bring the live layer forward again only when the wedding gets closer or the board starts showing real pressure.',
      },
      {
        title: 'Use planning to keep future handoff clean',
        detail: 'The calmer move now is improving upstream planning so the operations layer stays easy later.',
      },
    ),
    primaryAction: { label: 'Open planning', target: 'planning' },
    secondaryAction: { label: 'Review guests', target: 'guests' },
  };
}
