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

const buildEventLocationQuestion = (eventTitle: string, index: number): FollowUpQuestion => ({
  key: `event-location-${index + 1}` ,
  priority: 120 - index,
  affects: ['scheduleIntro', 'travelIntro', 'faqIntro'],
  variants: [
    `Where is ${eventTitle} happening?`,
    `What’s the location for ${eventTitle}?`,
    `Where should guests go for ${eventTitle}?`,
  ],
});

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
  const eventLocationQuestions = (snapshot.eventLocationGaps ?? []).slice(0, Math.min(3, remainingBudget)).map((eventTitle, index) => buildEventLocationQuestion(eventTitle, index));
  if (!snapshot.city && snapshot.howWeMet) neededKeys.add('meeting-city');
  if (!snapshot.storyDetail && snapshot.howWeMet) neededKeys.add('first-detail');
  if (!snapshot.guestFeel) neededKeys.add('guest-feel');
  if (!snapshot.travelNotes && snapshot.venue) neededKeys.add('location-why');
  if (!snapshot.registryPosture) neededKeys.add('registry-posture');

  const questions = [
    ...eventLocationQuestions,
    ...FOLLOW_UP_BANK
      .filter((q) => neededKeys.has(q.key))
      .sort((a, b) => b.priority - a.priority),
  ].slice(0, Math.min(3, remainingBudget));

  return {
    askedCount,
    remainingBudget,
    questions,
  };
};
