export type FollowUpQuestion = {
  key: string;
  priority: number;
  affects: string[];
  variants: [string, string, string];
};

export type FollowUpPlan = {
  askedCount: number;
  remainingBudget: number;
  questions: FollowUpQuestion[];
};

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
  return /\b(thing|something|stuff|hang|party stuff|plans)\b/.test(normalized);
};

const buildEventLocationQuestion = (eventTitle: string, index: number): FollowUpQuestion => {
  const label = humanizeEventTitle(eventTitle);
  return {
    key: `event-location-${index + 1}`,
    priority: 120 - index,
    affects: ['scheduleIntro', 'travelIntro', 'faqIntro'],
    variants: [
      `For ${label}, what time should guests show up and where is it happening?`,
      `What time is ${label}, and where should guests go for it?`,
      `For ${label}, when is it and where is it taking place?`,
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
  const rawEventLocationQuestions = rawEventTitles
    .filter((eventTitle) => !isVagueEventTitle(eventTitle))
    .map((eventTitle, index) => buildEventLocationQuestion(eventTitle, index));
  const howWeMet = (snapshot.howWeMet || '').trim();
  const storyDetail = (snapshot.storyDetail || '').trim();
  const storyWordCount = howWeMet.split(/\s+/).filter(Boolean).length;
  const isThinStory = storyWordCount < 8;
  const mentionsDigitalOrigin = /hinge|bumble|tinder|online|app|instagram|dm|texted/i.test(howWeMet);
  const hasCity = Boolean((snapshot.city || '').trim());
  const hasVenue = Boolean((snapshot.venue || '').trim()) && !/^(tbd|unknown|not sure|maybe)/i.test((snapshot.venue || '').trim());
  const hasRegistry = Boolean((snapshot.registryPosture || '').trim()) && !/^(unsure|maybe)/i.test((snapshot.registryPosture || '').trim());

  if (!hasCity && howWeMet && mentionsDigitalOrigin) neededKeys.add('meeting-city');
  if (rawEventTitles.length === 0 || hasVagueEventTitles) neededKeys.add('event-structure');
  if (howWeMet && isThinStory && rawEventLocationQuestions.length <= 1 && !hasVagueEventTitles) neededKeys.add('first-detail');
  if (!snapshot.guestFeel && (hasVenue || hasCity) && rawEventLocationQuestions.length === 0 && !hasVagueEventTitles) neededKeys.add('guest-feel');
  if (!snapshot.travelNotes && hasVenue && rawEventLocationQuestions.length === 0 && !hasVagueEventTitles) neededKeys.add('location-why');
  if (!hasRegistry && rawEventLocationQuestions.length <= 1 && rawEventTitles.length <= 1) neededKeys.add('registry-posture');

  const maxEventQuestions = rawEventLocationQuestions.length >= 3 ? 2 : rawEventLocationQuestions.length;
  const eventLocationQuestions = rawEventLocationQuestions.slice(0, Math.min(maxEventQuestions, remainingBudget));
  const nonEventQuestions = FOLLOW_UP_BANK
    .filter((q) => neededKeys.has(q.key))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(0, remainingBudget - eventLocationQuestions.length));

  const questions = [...eventLocationQuestions, ...nonEventQuestions].slice(0, Math.min(3, remainingBudget));

  return {
    askedCount,
    remainingBudget,
    questions,
  };
};
