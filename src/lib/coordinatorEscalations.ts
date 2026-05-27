import type { GuestLiteForCoordinator } from './coordinatorTypes';
import type { CoordinatorQnaItem, CoordinatorTimelineState } from './coordinatorModePersistence';
import { getCoordinatorDoorStatus } from './coordinatorCheckInStatus';
import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';

export type CoordinatorEscalation = {
  key: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  sequence: Array<{
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
  tone: 'warning' | 'success' | 'neutral';
};

function buildEscalationSequence(
  current: { title: string; detail: string },
  next: { title: string; detail: string },
  then: { title: string; detail: string },
): CoordinatorEscalation['sequence'] {
  return [
    { status: 'current', ...current },
    { status: 'next', ...next },
    { status: 'then', ...then },
  ];
}

export const buildCoordinatorEscalations = ({
  guests,
  qnaItems,
  events,
  timelineState,
}: {
  guests: GuestLiteForCoordinator[];
  qnaItems: CoordinatorQnaItem[];
  events: CoordinatorTimelineEventLite[];
  timelineState: Record<string, CoordinatorTimelineState>;
}): CoordinatorEscalation[] => {
  const items: CoordinatorEscalation[] = [];

  const reviewCount = guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'watch').length;
  if (reviewCount > 0) {
    items.push({
      key: 'door-review',
      title: 'Door exceptions waiting',
      detail: `${reviewCount} guest${reviewCount === 1 ? '' : 's'} need a coordinator decision before check-in.`,
      focusTitle: 'Clear the door decisions before the line learns bad workarounds',
      focusDetail: 'Door exceptions spread fast because every unresolved edge teaches guests and staff to improvise around the check-in path.',
      bestNextMove: 'Resolve the door exceptions first, then return the line to normal check-in flow before you touch another live lane.',
      decisionRule: 'When the door is waiting on exceptions, resolve those first so the line keeps trusting the check-in lane.',
      watchout: 'Do not let one unresolved exception train the line around the check-in process. A fast workaround can become the new unofficial flow before anyone notices.',
      sequence: buildEscalationSequence(
        {
          title: 'Clear the exceptions at the door',
          detail: 'Resolve the guests already waiting on a coordinator decision before the line spreads the uncertainty.',
        },
        {
          title: 'Re-center the check-in lane',
          detail: 'Once the exceptions are settled, return the door to its normal path so staff do not keep improvising.',
        },
        {
          title: 'Reopen other live work after the door steadies',
          detail: 'Only after the line feels normal again should you widen back out to other coordinator pressure.',
        },
      ),
      tone: 'warning',
    });
  }

  const openQna = qnaItems.filter((item) => item.status === 'new').length;
  if (openQna > 0) {
    items.push({
      key: 'open-qna',
      title: 'Guest questions still open',
      detail: `${openQna} question${openQna === 1 ? '' : 's'} still need an answer.`,
      focusTitle: 'Remove guest uncertainty before it spreads into the room',
      focusDetail: 'Open questions rarely stay isolated on the live day; they usually turn into repeated explanations, hallway confusion, or last-second redirects.',
      bestNextMove: 'Answer the open guest questions now, then let the room settle before you reopen lower-pressure coordinator work.',
      decisionRule: 'When live questions are open, answer them before they turn into repeated in-person confusion.',
      watchout: 'Do not treat unanswered questions as harmless backlog. Once guests start solving the uncertainty out loud, the room has already inherited the confusion.',
      sequence: buildEscalationSequence(
        {
          title: 'Answer the open guest questions',
          detail: 'Clear the active confusion first so guests stop carrying the same uncertainty between each other.',
        },
        {
          title: 'Check whether the room actually settled',
          detail: 'Confirm the answer stopped the repeat questions before you assume the pressure has passed.',
        },
        {
          title: 'Return to lower-pressure coordination',
          detail: 'Only after the guest lane quiets down should you reopen background coordinator work.',
        },
      ),
      tone: 'warning',
    });
  }

  const hasLiveEvent = events.some((event) => (timelineState[event.id] || 'up-next') === 'live');
  if (events.length > 0 && !hasLiveEvent) {
    items.push({
      key: 'timeline-live',
      title: 'No live event selected',
      detail: 'Mark the current event live so timeline focus and day-of messaging stay aligned.',
      focusTitle: 'Give the team one current timeline truth',
      focusDetail: 'If the active event stays ambiguous, the coordinator board, guest messaging, and floor decisions all start drifting against each other.',
      bestNextMove: 'Mark the current event live first, then let timeline and day-of messaging follow that one source of truth.',
      decisionRule: 'If the active event is unclear, fix that before sending more updates or shifting guest flow.',
      watchout: 'Do not keep compensating for a missing live event with hallway explanations or ad hoc updates. Once the timeline truth splits, every other live signal starts drifting too.',
      sequence: buildEscalationSequence(
        {
          title: 'Mark the real current event live',
          detail: 'Set the active event first so the board, floor, and guest messaging all anchor to the same moment.',
        },
        {
          title: 'Let the timeline and messaging follow it',
          detail: 'Use that live marker to steady follow-up updates instead of inventing separate explanations.',
        },
        {
          title: 'Return to guest flow once the truth is shared',
          detail: 'After the timeline is aligned again, reopen broader coordination with one clear current source of truth.',
        },
      ),
      tone: 'warning',
    });
  }

  if (items.length === 0) {
    items.push({
      key: 'all-clear',
      title: 'Ops board looks calm',
      detail: 'No urgent escalations need attention right now.',
      focusTitle: 'Keep the command board in reserve until reality changes',
      focusDetail: 'A calm board is a win, not an invitation to manufacture motion. Let the next real exception earn urgency before you reopen the live lane.',
      bestNextMove: 'Leave the board calm, review the next-best action if needed, and only reenter escalation mode when reality actually changes.',
      decisionRule: 'When nothing urgent is stacked up, preserve the calm and let the next-best action board lead.',
      watchout: 'Do not turn a calm live board into a search for new urgency. Manufactured motion usually steals attention from the next real change when it arrives.',
      sequence: buildEscalationSequence(
        {
          title: 'Keep the calm intact',
          detail: 'Treat the absence of escalations as a healthy state, not a gap that needs to be filled.',
        },
        {
          title: 'Use the next-best action only if needed',
          detail: 'If you do reopen work, let it be because a real supporting action helps the room stay calm.',
        },
        {
          title: 'Reenter escalation mode only when reality changes',
          detail: 'Wait for a true live exception before you ask the board to carry urgency again.',
        },
      ),
      tone: 'success',
    });
  }

  return items.slice(0, 4);
};
