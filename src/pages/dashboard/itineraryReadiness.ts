export interface ItineraryReadinessEvent {
  id: string;
  event_name: string;
  event_date: string;
  start_time: string;
  location_name: string;
  notes: string | null;
  is_visible: boolean;
}

export interface ItineraryReadinessModel {
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  badges: string[];
  sequence: Array<{
    id: 'details' | 'guest-view' | 'handoff';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildItineraryReadiness(events: ItineraryReadinessEvent[]): ItineraryReadinessModel {
  const visibleEvents = events.filter((event) => event.is_visible !== false);
  const hiddenEvents = events.length - visibleEvents.length;
  const missingCoreDetails = visibleEvents.filter((event) => !event.event_date || !event.start_time || !event.location_name).length;
  const missingGuestNotes = visibleEvents.filter((event) => !event.notes?.trim()).length;

  if (events.length === 0) {
    return {
      title: 'The itinerary still needs its first anchors',
      detail: 'Start with the events guests absolutely need so the weekend has a trustworthy spine before you polish the rest.',
      focusTitle: 'Give the weekend a schedule spine before you decorate it',
      focusDetail: 'Guests do not need every detail yet, but they do need the anchor moments that make the weekend feel real and trustworthy.',
      bestNextMove: 'Add the ceremony, reception, and any other guest-critical anchor events before you spend time on polish.',
      decisionRule: 'Start with the guest-critical events first; a short honest itinerary beats a fuller one that still leaves the weekend shape unclear.',
      badges: ['No events yet', 'Guest view not started'],
      sequence: [
        {
          id: 'details',
          status: 'current',
          title: 'Add the anchor events',
          detail: 'Start with the ceremony, reception, and any guest-facing welcome or farewell moments.',
        },
        {
          id: 'guest-view',
          status: 'next',
          title: 'Fill in time and place',
          detail: 'Give each visible event a date, start time, and location before you expect guests to trust it.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Preview the weekend flow',
          detail: 'Once the anchors are real, preview the public schedule and only then stage any day-of update.',
        },
      ],
    };
  }

  if (missingCoreDetails > 0) {
    return {
      title: 'Some itinerary events still need their core details',
      detail: 'The fastest way to make the weekend feel trustworthy is finishing the date, time, and location gaps before polishing anything else.',
      focusTitle: 'Complete the trust-critical details before you polish tone',
      focusDetail: 'Once an event is visible, guests should not have to guess the date, time, or location just because the schedule looks mostly done.',
      bestNextMove: 'Finish the missing date, start time, or location fields on every visible event before you rewrite notes.',
      decisionRule: 'If any visible event still lacks its basics, fix that before you invest energy in notes, copy, or day-of messaging.',
      badges: [pluralize(visibleEvents.length, 'visible event'), pluralize(missingCoreDetails, 'event') + ' incomplete'],
      sequence: [
        {
          id: 'details',
          status: 'current',
          title: 'Complete the missing event basics',
          detail: 'Every visible event should have a real date, start time, and location before guests see it.',
        },
        {
          id: 'guest-view',
          status: 'next',
          title: 'Tighten the guest notes',
          detail: 'Once the basics are in, add short notes that answer what guests should know before they arrive.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Hand the schedule to the guest path',
          detail: 'After the details are complete, preview the public site and use messages only if the updates truly changed.',
        },
      ],
    };
  }

  if (hiddenEvents > 0 || missingGuestNotes > 0) {
    return {
      title: 'The itinerary is structurally sound and ready for guest-facing cleanup',
      detail: 'The schedule exists now. This pass is about making sure guests only see the right events with just enough context to follow the weekend confidently.',
      focusTitle: 'Turn the schedule from accurate into guest-legible',
      focusDetail: 'The structure is there now, so the next improvement is relevance: show the right events and give each one just enough context to prevent questions.',
      bestNextMove: 'Hide planning-only events and add the last guest-facing notes before you treat the schedule as handoff-ready.',
      decisionRule: 'Once the event basics hold, use this pass to reduce guest confusion rather than expanding the schedule with more planning-only noise.',
      badges: [pluralize(visibleEvents.length, 'visible event'), hiddenEvents > 0 ? pluralize(hiddenEvents, 'event') + ' hidden' : pluralize(missingGuestNotes, 'event') + ' need notes'],
      sequence: [
        {
          id: 'details',
          status: 'current',
          title: 'Decide what belongs on the public schedule',
          detail: 'Keep private or planning-only events hidden so the guest path stays calm and relevant.',
        },
        {
          id: 'guest-view',
          status: 'next',
          title: 'Add the last guest-facing notes',
          detail: 'Use short notes for logistics, dress cues, or transit details where guests would otherwise have to ask.',
        },
        {
          id: 'handoff',
          status: 'then',
          title: 'Stage the live handoff',
          detail: 'Once the public schedule reads cleanly, use messaging and coordinator mode only for true day-of updates.',
        },
      ],
    };
  }

  return {
    title: 'The itinerary is ready to support the live weekend',
    detail: 'The public schedule is complete enough now that the next best move is handoff, not more timeline tinkering.',
    focusTitle: 'Protect the schedule as live truth, not an editing sandbox',
    focusDetail: 'At this point the itinerary helps most by staying steady so guests and the team can trust the same version of the weekend.',
    bestNextMove: 'Do one final public preview, then let the schedule stay steady unless the real weekend plan changes.',
    decisionRule: 'When the public schedule is complete, keep edits tied to real plan changes and let live ops handle the exceptions.',
    badges: [pluralize(visibleEvents.length, 'visible event'), 'Guest-facing timeline ready'],
    sequence: [
      {
        id: 'details',
        status: 'current',
        title: 'Keep the timeline steady',
        detail: 'Avoid reworking events unless the real weekend plan has actually changed.',
      },
      {
        id: 'guest-view',
        status: 'next',
        title: 'Preview or share the guest schedule',
        detail: 'Do one quick public check so guests see the same weekend shape you expect the team to support.',
      },
      {
        id: 'handoff',
        status: 'then',
        title: 'Use live updates sparingly',
        detail: 'Let coordinator mode and day-of messaging handle exceptions instead of pulling the whole schedule back into edit mode.',
      },
    ],
  };
}
