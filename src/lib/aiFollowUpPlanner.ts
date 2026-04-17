export type FollowUpQuestion = {
  key: string;
  priority: number;
  affects: string[];
  variants: [string, string, string];
  kind?: 'event-cluster' | 'single';
};

export type FollowUpPlan = {
  askedCount: number;
  remainingBudget: number;
  questions: FollowUpQuestion[];
};

const EVENT_LANE_KEYS = new Set(['event-structure']);
const NON_EVENT_LANE_KEYS = new Set(['meeting-city', 'first-detail', 'guest-feel', 'location-why', 'registry-posture']);

export type IntakeSnapshot = {
  howWeMet?: string;
  storyDetail?: string;
  city?: string;
  venue?: string;
  guestFeel?: string;
  registryPosture?: string;
  rsvpDeadline?: string;
  travelNotes?: string;
  eventLocationGaps?: string[];
};

const humanizeEventTitle = (eventTitle: string) => {
  const cleaned = eventTitle
    .replace(/^(friday|saturday|sunday|thursday|monday|tuesday|wednesday)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || eventTitle.trim();
};

const isVagueEventTitle = (eventTitle: string) => {
  const normalized = eventTitle.trim().toLowerCase();
  return /\b(thing|something|stuff|hang|party stuff|plans|maybe|probably)\b/.test(normalized);
};

const isUndecidedValue = (value?: string) => /\b(tbd|not sure|still deciding|maybe|probably|if it works out|to be decided|unsure)\b/i.test((value || '').trim());

const buildEventClusterQuestion = (eventTitles: string[]): FollowUpQuestion => {
  const labels = eventTitles.map((title) => humanizeEventTitle(title)).filter(Boolean).slice(0, 2);
  const joined = labels.join(' and ');
  return {
    key: `event-cluster-${labels.map((label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-') || 'events'}`,
    priority: 120,
    affects: ['scheduleIntro', 'travelIntro', 'faqIntro'],
    kind: 'event-cluster',
    variants: [
      `For ${joined}, what time and location do you already know? Feel free to skip anything that is not finalized yet.`,
      `For ${joined}, what details should guests know already, and what is still TBD?`,
      `For ${joined}, share any time or location details you have so far, and skip anything not locked yet.`,
    ],
  };
};

const FOLLOW_UP_BANK: FollowUpQuestion[] = [
  {
    key: 'meeting-city',
    priority: 100,
    affects: ['storyBody', 'heroSubtitle'],
    variants: [
      'What city were you in when you finally met in person?',
      'Where were you both when that first real date happened?',
      'What city did you finally meet up in?',
    ],
  },
  {
    key: 'first-detail',
    priority: 95,
    affects: ['storyBody'],
    variants: [
      'What was one specific detail from that first date you still remember?',
      'What is one small detail from that concert night that still sticks with you?',
      'What is one specific thing about that first real date you would want on the site?',
    ],
  },
  {
    key: 'guest-feel',
    priority: 90,
    affects: ['heroSubtitle', 'faqIntro', 'travelIntro', 'scheduleIntro'],
    variants: [
      'What do you want guests to feel most over the weekend?',
      'If the weekend feels a certain way, what do you want that feeling to be?',
      'What’s the main vibe you want guests to walk away with?',
    ],
  },
  {
    key: 'location-why',
    priority: 85,
    affects: ['heroSubtitle', 'travelIntro', 'storyBody'],
    variants: [
      'Why did you pick this location?',
      'What made you choose this place for the wedding?',
      'What should guests understand about why this location matters to you?',
    ],
  },
  {
    key: 'registry-posture',
    priority: 70,
    affects: ['registryIntro'],
    variants: [
      'Do you want the registry note to mention travel and keep things no-pressure?',
      'Should the registry wording acknowledge that guests are traveling?',
      'What should the registry note emphasize most?',
    ],
  },
  {
    key: 'event-structure',
    priority: 110,
    affects: ['scheduleIntro', 'travelIntro', 'faqIntro'],
    variants: [
      'What events are actually happening around the wedding, and which ones should guests know about?',
      'Besides the wedding itself, what else is happening that guests should plan around?',
      'What should guests expect across the wedding weekend, if anything beyond the main event?',
    ],
  },
];

export const planFollowUpQuestions = (
  snapshot: IntakeSnapshot,
  askedCount = 0,
  maxFollowUps = 5
): FollowUpPlan => {
  const remainingBudget = Math.max(0, maxFollowUps - askedCount);
  if (remainingBudget === 0) {
    return { askedCount, remainingBudget, questions: [] };
  }

  const neededKeys = new Set<string>();
  const rawEventTitles = (snapshot.eventLocationGaps ?? []).filter((eventTitle) => {
    const normalized = eventTitle.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.length > 80) return false;
    if (/^something\s+(friday|saturday|sunday|thursday|monday|tuesday|wednesday)?$/i.test(normalized)) return false;
    return true;
  });
  const hasVagueEventTitles = rawEventTitles.some((eventTitle) => isVagueEventTitle(eventTitle));
  const hasUndecidedVenue = isUndecidedValue(snapshot.venue);
  const hasUndecidedTravel = isUndecidedValue(snapshot.travelNotes);
  const eventLocationCandidates = rawEventTitles
    .filter((eventTitle) => !isVagueEventTitle(eventTitle))
    .filter((eventTitle) => !isUndecidedValue(eventTitle));
  const howWeMet = (snapshot.howWeMet || '').trim();
  const storyDetail = (snapshot.storyDetail || '').trim();
  const storyWordCount = howWeMet.split(/\s+/).filter(Boolean).length;
  const isThinStory = storyWordCount < 8;
  const mentionsDigitalOrigin = /hinge|bumble|tinder|online|app|instagram|dm|texted/i.test(howWeMet);
  const hasCity = Boolean((snapshot.city || '').trim());
  const hasVenue = Boolean((snapshot.venue || '').trim()) && !isUndecidedValue(snapshot.venue) && !/^(unknown)/i.test((snapshot.venue || '').trim());
  const hasRegistry = Boolean((snapshot.registryPosture || '').trim()) && !/^(unsure|maybe)/i.test((snapshot.registryPosture || '').trim());

  const shouldPrioritizeEventStructure = rawEventTitles.length === 0 || hasVagueEventTitles || hasUndecidedVenue;

  const missingStorySignal = !howWeMet || isThinStory;

  if (!hasCity && howWeMet && mentionsDigitalOrigin && !shouldPrioritizeEventStructure) neededKeys.add('meeting-city');
  if (shouldPrioritizeEventStructure) neededKeys.add('event-structure');
  if (missingStorySignal && eventLocationCandidates.length <= 2 && !hasVagueEventTitles) neededKeys.add('first-detail');
  if (!snapshot.guestFeel && (hasVenue || hasCity) && eventLocationCandidates.length === 0 && !hasVagueEventTitles) neededKeys.add('guest-feel');
  if (!snapshot.travelNotes && hasVenue && !hasUndecidedTravel && eventLocationCandidates.length === 0 && !hasVagueEventTitles) neededKeys.add('location-why');
  if (!hasRegistry && eventLocationCandidates.length <= 1 && rawEventTitles.length <= 1) neededKeys.add('registry-posture');

  const needsEventStructure = neededKeys.has('event-structure');
  const shouldUseEventCluster = eventLocationCandidates.length > 0;
  const eventClusterLabels = eventLocationCandidates.slice(0, Math.min(2, eventLocationCandidates.length)).map((value) => humanizeEventTitle(value).toLowerCase());
  const shouldSuppressEventStructure = shouldUseEventCluster && !hasVagueEventTitles && eventClusterLabels.every((label) => !/wedding|ceremony|reception/.test(label));
  if (shouldSuppressEventStructure) neededKeys.delete('event-structure');
  const eventLocationQuestions = shouldUseEventCluster
    ? [buildEventClusterQuestion(eventLocationCandidates.slice(0, Math.min(2, eventLocationCandidates.length)))].slice(0, Math.min(1, remainingBudget))
    : [];
  if (!shouldUseEventCluster && rawEventTitles.length > 0 && !hasVagueEventTitles) neededKeys.add('guest-feel');
  const laneQuestions = FOLLOW_UP_BANK
    .filter((q) => neededKeys.has(q.key))
    .sort((a, b) => b.priority - a.priority);
  const eventLaneQuestions = laneQuestions.filter((q) => EVENT_LANE_KEYS.has(q.key));
  const nonEventLaneQuestions = laneQuestions.filter((q) => NON_EVENT_LANE_KEYS.has(q.key));

  const questions: FollowUpQuestion[] = [];
  if (eventLocationQuestions.length > 0) {
    questions.push(eventLocationQuestions[0]);
  } else if (eventLaneQuestions.length > 0) {
    questions.push(eventLaneQuestions[0]);
  }

  const shouldPairNonEvent = shouldUseEventCluster
    ? (!hasVenue || missingStorySignal || hasVagueEventTitles)
    : true;

  if (questions.length < remainingBudget && nonEventLaneQuestions.length > 0 && shouldPairNonEvent) {
    questions.push(nonEventLaneQuestions[0]);
  }

  if (questions.length === 0 && eventLaneQuestions.length > 0) {
    questions.push(eventLaneQuestions[0]);
  }

  return {
    askedCount,
    remainingBudget,
    questions,
  };
};
