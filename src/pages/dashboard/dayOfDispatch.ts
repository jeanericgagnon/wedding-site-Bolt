export interface DayOfDispatchSnapshot {
  daysUntilWedding: number | null;
  venueName?: string | null;
  pendingGuests: number;
  itineraryAudienceCount: number;
  scheduledDayOfCount: number;
  sentDayOfCount: number;
  overdueDayOfCount: number;
}

export interface DayOfDispatchModel {
  title: string;
  detail: string;
  badges: string[];
  sequence: Array<{
    id: 'stage' | 'send' | 'settle';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
  primaryAction: {
    label: string;
    action: 'compose-day-of-update' | 'run-due-scheduled' | 'none';
  };
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildDayOfDispatchModel(snapshot: DayOfDispatchSnapshot): DayOfDispatchModel {
  const weddingSoon = snapshot.daysUntilWedding !== null && snapshot.daysUntilWedding >= 0 && snapshot.daysUntilWedding <= 7;
  const weddingToday = snapshot.daysUntilWedding === 0;

  if (!weddingSoon && !weddingToday) {
    return {
      title: 'Day-of messaging can stay in the background for now',
      detail: 'You do not need a live update plan yet. Keep guest contact clean and let the itinerary mature before you stage a true day-of note.',
      badges: [
        snapshot.daysUntilWedding === null ? 'Wedding date not set' : `${snapshot.daysUntilWedding} days out`,
        pluralize(snapshot.pendingGuests, 'pending RSVP'),
      ],
      sequence: [
        {
          id: 'stage',
          status: 'current',
          title: 'Keep the list honest first',
          detail: 'Finish RSVP and contact cleanup before you worry about operational updates.',
        },
        {
          id: 'send',
          status: 'next',
          title: 'Let the itinerary settle',
          detail: 'Once the public schedule and venue details are trustworthy, stage a day-of draft from that reality.',
        },
        {
          id: 'settle',
          status: 'then',
          title: 'Use the live note only when the weekend is close',
          detail: 'Day-of messaging works best as a short operational cue, not a substitute for earlier guest communication.',
        },
      ],
      primaryAction: {
        label: 'Hold off on day-of draft',
        action: 'none',
      },
    };
  }

  if (snapshot.overdueDayOfCount > 0) {
    return {
      title: 'A day-of update is already due and should go out first',
      detail: 'The most helpful move now is sending the overdue operational update before you draft anything new.',
      badges: [
        pluralize(snapshot.overdueDayOfCount, 'due update'),
        snapshot.venueName ? snapshot.venueName : 'Venue still flexible',
      ],
      sequence: [
        {
          id: 'stage',
          status: 'current',
          title: 'Send the queued day-of note',
          detail: 'Clear the already-scheduled update first so guests do not receive two overlapping operational messages.',
        },
        {
          id: 'send',
          status: 'next',
          title: 'Review the itinerary against the note',
          detail: 'Make sure the schedule, venue, and arrival guidance still match what the message promises.',
        },
        {
          id: 'settle',
          status: 'then',
          title: 'Stay in live follow-through mode',
          detail: 'Once the update is out, only send another if the real event flow changes.',
        },
      ],
      primaryAction: {
        label: 'Run due day-of send',
        action: 'run-due-scheduled',
      },
    };
  }

  if (snapshot.scheduledDayOfCount > 0 || snapshot.sentDayOfCount > 0) {
    return {
      title: 'The day-of message lane is already staged',
      detail: 'You have a live operational note in motion, so the next best move is checking whether the itinerary and guest list still support it cleanly.',
      badges: [
        snapshot.scheduledDayOfCount > 0 ? pluralize(snapshot.scheduledDayOfCount, 'scheduled update') : pluralize(snapshot.sentDayOfCount, 'sent update'),
        `${snapshot.itineraryAudienceCount} itinerary audience${snapshot.itineraryAudienceCount === 1 ? '' : 's'}`,
      ],
      sequence: [
        {
          id: 'stage',
          status: 'current',
          title: 'Keep the active draft or send aligned',
          detail: 'Do not restart the message unless the schedule or arrival truth changed.',
        },
        {
          id: 'send',
          status: 'next',
          title: 'Use itinerary and guest gaps as the check',
          detail: 'Confirm that the public schedule and the audience filters still match the real guest plan.',
        },
        {
          id: 'settle',
          status: 'then',
          title: 'Let coordinator mode carry the rest',
          detail: 'After the live note is steady, the board should move to coordination and exceptions, not extra campaign churn.',
        },
      ],
      primaryAction: {
        label: 'Keep the live note steady',
        action: 'none',
      },
    };
  }

  return {
    title: weddingToday
      ? 'Stage one calm operational update for today'
      : 'You are close enough now to stage the day-of update',
    detail: snapshot.itineraryAudienceCount > 0
      ? 'The itinerary audience and guest list are ready enough that one short operational note can carry the day without extra clutter.'
      : 'Before sending anything operational, make sure the itinerary and audience segments are specific enough to support a clear guest update.',
    badges: [
      weddingToday ? 'Wedding day' : `${snapshot.daysUntilWedding} days left`,
      snapshot.itineraryAudienceCount > 0 ? `${snapshot.itineraryAudienceCount} itinerary audience${snapshot.itineraryAudienceCount === 1 ? '' : 's'}` : 'No itinerary segments yet',
    ],
    sequence: [
      {
        id: 'stage',
        status: 'current',
        title: 'Draft the operational note',
        detail: 'Keep it short: arrival timing, venue orientation, and where guests should check for the latest schedule truth.',
      },
      {
        id: 'send',
        status: 'next',
        title: 'Schedule or send once the details are stable',
        detail: 'Use the itinerary and venue context to decide whether the note should go out now or wait a little longer.',
      },
      {
        id: 'settle',
        status: 'then',
        title: 'Let live coordination do the rest',
        detail: 'After the operational note is staged, keep extra messaging to true exceptions or last-minute changes.',
      },
    ],
    primaryAction: {
      label: 'Stage day-of update',
      action: 'compose-day-of-update',
    },
  };
}
