export interface DayOfRelayStep {
  id: 'seating-drift' | 'open-seats' | 'guest-follow-up' | 'check-in' | 'coordinator' | 'steady';
  status: 'current' | 'next' | 'then' | 'steady';
  title: string;
  detail: string;
  target: 'check-drift' | 'auto-seat' | 'guests' | 'messages' | 'check-in' | 'coordinator';
  ctaLabel: string;
}

export interface DayOfRelayModel {
  headline: string;
  summary: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  steps: DayOfRelayStep[];
}

export interface DayOfRelayInput {
  daysUntilWedding: number | null;
  pendingGuestCount: number;
  invalidSeatCount: number;
  unassignedSeatCount: number;
  splitHouseholdCount: number;
  liveIssueCount: number;
  checkedInCount: number;
}

function step(status: DayOfRelayStep['status'], value: Omit<DayOfRelayStep, 'status'>): DayOfRelayStep {
  return { status, ...value };
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildDayOfRelayModel(input: DayOfRelayInput): DayOfRelayModel {
  const weddingSoon = input.daysUntilWedding !== null && input.daysUntilWedding >= 0 && input.daysUntilWedding <= 10;
  const weddingToday = input.daysUntilWedding === 0;

  if (input.invalidSeatCount > 0) {
    return {
      headline: 'The room needs truth before speed',
      summary: 'This is still a seating-truth problem first. Clear the drift now so coordinator mode is not compensating for stale room data later.',
      focusTitle: 'Restore room truth before live speed matters',
      focusDetail: 'The room cannot hand off cleanly until the seating plan matches the actual RSVP picture again.',
      bestNextMove: 'Clear the seating drift first, then finish any remaining seat placement before you let coordinator mode trust the room.',
      decisionRule: 'If seat assignments are stale, fix that truth before you ask live ops to absorb the mismatch.',
      steps: [
        step('current', {
          id: 'seating-drift',
          title: 'Clear the seating drift',
          detail: `${pluralize(input.invalidSeatCount, 'assignment')} no longer match the current RSVP truth.`,
          target: 'check-drift',
          ctaLabel: 'Check assignments',
        }),
        step('next', {
          id: 'open-seats',
          title: 'Then place the remaining open seats',
          detail: input.unassignedSeatCount > 0
            ? `${pluralize(input.unassignedSeatCount, 'guest')} still need a final seat after drift is cleared.`
            : 'Once the drift is gone, the room can settle back into a real final layout.',
          target: 'auto-seat',
          ctaLabel: 'Auto-seat guests',
        }),
        step('then', {
          id: 'coordinator',
          title: 'Then hand the room to live ops',
          detail: 'Only after the room matches reality should coordinator mode become the main surface.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  if (input.unassignedSeatCount > 0 && weddingSoon) {
    return {
      headline: 'Finish the room before the day gets tighter',
      summary: 'You do not need perfection here. You do need everyone seated so live check-in is not absorbing unfinished room work later.',
      focusTitle: 'Complete placement before the room becomes live support',
      focusDetail: 'The job now is not elegant reshuffling. It is making sure every confirmed guest is grounded in a real seat before arrival pressure rises.',
      bestNextMove: 'Place the remaining guests now, then switch the room into arrival support instead of spending another pass on layout polish.',
      decisionRule: 'Near the wedding, complete placement beats perfect layout.',
      steps: [
        step('current', {
          id: 'open-seats',
          title: 'Place the remaining guests',
          detail: `${pluralize(input.unassignedSeatCount, 'guest')} still need a final seat.`,
          target: 'auto-seat',
          ctaLabel: 'Auto-seat guests',
        }),
        step('next', {
          id: 'check-in',
          title: 'Then switch into arrival support',
          detail: 'Once the room is seated, the next live value is speed at the door, not more reshuffling.',
          target: 'check-in',
          ctaLabel: 'Open check-in mode',
        }),
        step('then', {
          id: 'coordinator',
          title: 'Then let coordinator mode lead',
          detail: 'That is when timing, questions, and live exceptions should take over the attention lane.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  if (weddingToday || input.liveIssueCount > 0 || input.checkedInCount > 0) {
    return {
      headline: 'The room is support now, not the project',
      summary: 'Seating is now here to make the door, timeline, and guest questions easier. Live coordination should lead unless the room truly breaks.',
      focusTitle: 'Use the room to support the live day',
      focusDetail: 'Once guests are already moving, seating is valuable because it reduces friction at the door and in the timeline, not because it keeps evolving.',
      bestNextMove: 'Run check-in first, then let coordinator mode absorb live exceptions unless the room itself truly breaks.',
      decisionRule: 'When the live day is underway, coordination speed beats more seating tinkering.',
      steps: [
        step('current', {
          id: 'check-in',
          title: 'Run the arrival layer',
          detail: weddingToday
            ? `${input.checkedInCount} guest${input.checkedInCount === 1 ? '' : 's'} are already in motion, so speed and clarity matter more than table perfection.`
            : 'The room is settled enough that arrival flow is the next real pressure point.',
          target: 'check-in',
          ctaLabel: 'Open check-in mode',
        }),
        step('next', {
          id: 'coordinator',
          title: 'Then let coordinator mode drive exceptions',
          detail: input.liveIssueCount > 0
            ? `${pluralize(input.liveIssueCount, 'live exception')} already want the main board.`
            : 'Use coordinator mode as the place where timing and questions get resolved.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  if (input.pendingGuestCount > 0 && weddingSoon) {
    return {
      headline: 'Guest truth still needs a final response pass',
      summary: 'This is not a room-layout issue yet. The fastest risk reduction is getting the remaining replies before the live day gets any closer.',
      focusTitle: 'Close the RSVP truth gap before you trust the room',
      focusDetail: 'A final response pass is more valuable right now than pretending the seating plan is settled while guest truth is still moving.',
      bestNextMove: 'Review the pending guests, send the last clean message nudge, and only come back to room work once the RSVP truth stops moving.',
      decisionRule: 'If replies are still materially open, guest follow-up beats room work.',
      steps: [
        step('current', {
          id: 'guest-follow-up',
          title: 'Nudge the remaining guest replies',
          detail: `${pluralize(input.pendingGuestCount, 'guest')} still need a response before the room is fully trustworthy.`,
          target: 'guests',
          ctaLabel: 'Review guests',
        }),
        step('next', {
          id: 'guest-follow-up',
          title: 'Then stage the outreach lane',
          detail: 'Use messages to turn the last reminder into a clean final nudge instead of waiting passively.',
          target: 'messages',
          ctaLabel: 'Open messages',
        }),
        step('then', {
          id: 'coordinator',
          title: 'Then keep the live layer warm',
          detail: 'That is when coordinator mode should become the default operating surface.',
          target: 'coordinator',
          ctaLabel: 'Open coordinator mode',
        }),
      ],
    };
  }

  return {
    headline: 'The room is calm enough to stay in reserve',
    summary: 'Nothing here is demanding intervention right now. Keep seating stable and only pull it forward again if guest truth or live timing changes.',
    focusTitle: 'Protect the calm without reopening the room',
    focusDetail: 'A steady seating plan is something to preserve. The best move now is leaving it available for support without inventing new churn.',
    bestNextMove: 'Leave the room stable and in reserve, and only reopen it when guest truth or live timing actually changes.',
    decisionRule: 'If the room is already calm, leave it steady until truth or live timing actually changes.',
    steps: [
      step('steady', {
        id: 'steady',
        title: 'Leave the room stable',
        detail: input.splitHouseholdCount > 0
          ? `${pluralize(input.splitHouseholdCount, 'household')} are still a little awkward, but nothing urgent is breaking the live day.`
          : 'The room can stay steady while the rest of the day continues.',
        target: 'coordinator',
        ctaLabel: 'Open coordinator mode',
      }),
    ],
  };
}
