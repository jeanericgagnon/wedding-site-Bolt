import { WeddingProfile, WeddingProfileReadiness, evaluateWeddingProfileReadiness, createEmptyWeddingProfile } from './weddingProfile';

export type OnboardingIntent =
  | 'collect-critical-field'
  | 'collect-recommended-field'
  | 'confirm-conflict'
  | 'offer-draft'
  | 'refine-existing-answer';

export type OnboardingExtractionResult = {
  updates: Partial<WeddingProfile>;
  inferred: string[];
  conflicts: Array<{ path: string; currentValue: string; nextValue: string }>;
  notes: string[];
};

export type OnboardingSessionState = {
  profile: WeddingProfile;
  readiness: WeddingProfileReadiness;
  currentIntent: OnboardingIntent;
  nextQuestionKey: string | null;
  askedQuestions: string[];
  confirmedFields: string[];
  unresolvedConflicts: Array<{ path: string; currentValue: string; nextValue: string }>;
  suggestedPrompt: string | null;
  confidence: number;
};

const normalize = (value: string) => value.trim().toLowerCase();



const NEED_TO_QUESTION_KEY: Record<string, string> = {
  'couple names': 'partnerNames',
  'wedding date': 'weddingDate',
  'venue location': 'venueLocation',
  'venue name': 'venueName',
  'theme': 'theme',
  'story summary': 'story',
  'ceremony time': 'ceremonyTime',
  'reception time': 'receptionTime',
  'rsvp deadline': 'rsvpDeadline',
  'registry link': 'registryLink',
};

const QUESTION_KEY_BY_PATH: Record<string, string> = {
  'couple.displayNames': 'partnerNames',
  'event.date': 'weddingDate',
  'event.venueLocation': 'venueLocation',
  'event.venueName': 'venueName',
  'design.theme': 'theme',
  'story.summary': 'story',
  'event.ceremonyTime': 'ceremonyTime',
  'event.receptionTime': 'receptionTime',
  'event.rsvpDeadline': 'rsvpDeadline',
  'registry.url': 'registryLink',
};

const PROMPT_BY_QUESTION_KEY: Record<string, string> = {
  partnerNames: 'What names should we put on the site?',
  weddingDate: 'What date are you getting married?',
  venueLocation: 'Where is the wedding happening?',
  venueName: 'Do you already know the venue name?',
  theme: 'What vibe should the site lean toward?',
  story: 'Anything you want us to know about your story?',
  ceremonyTime: 'What time does the ceremony start?',
  receptionTime: 'What time does the reception start?',
  rsvpDeadline: 'When should guests RSVP by?',
  registryLink: 'Do you already have a registry link?',
};

const getQuestionKeyFromNeed = (need: string): string | null => {
  return NEED_TO_QUESTION_KEY[need.toLowerCase()] ?? null;
};

const getSuggestedPrompt = (questionKey: string | null) => {
  if (!questionKey) return null;
  return PROMPT_BY_QUESTION_KEY[questionKey] ?? null;
};


const getProfileString = (profile: WeddingProfile, path: string): string => {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return '';
    return (current as Record<string, unknown>)[key];
  }, profile);

  return typeof value === 'string' ? value : '';
};

const mergeProfile = (profile: WeddingProfile, updates: Partial<WeddingProfile>): WeddingProfile => ({
  ...profile,
  ...updates,
  couple: { ...profile.couple, ...(updates.couple ?? {}) },
  event: { ...profile.event, ...(updates.event ?? {}) },
  venue: { ...profile.venue, ...(updates.venue ?? {}) },
  story: { ...profile.story, ...(updates.story ?? {}) },
  registry: { ...profile.registry, ...(updates.registry ?? {}) },
  design: { ...profile.design, ...(updates.design ?? {}) },
  guestExperience: { ...profile.guestExperience, ...(updates.guestExperience ?? {}) },
  meta: { ...profile.meta, ...(updates.meta ?? {}) },
});

export const extractWeddingProfileUpdates = (
  input: string,
  profile: WeddingProfile
): OnboardingExtractionResult => {
  const updates: Partial<WeddingProfile> = {};
  const inferred: string[] = [];
  const conflicts: Array<{ path: string; currentValue: string; nextValue: string }> = [];
  const notes: string[] = [];
  const trimmed = input.trim();

  if (!trimmed) {
    return { updates, inferred, conflicts, notes };
  }

  if (trimmed.includes('&') && !profile.couple.displayNames) {
    const [partnerOne = '', partnerTwo = ''] = trimmed.split('&').map((part) => part.trim()).filter(Boolean);
    updates.couple = {
      ...profile.couple,
      displayNames: trimmed,
      partnerOne,
      partnerTwo: partnerTwo || partnerOne,
    };
    notes.push('Captured couple names');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const current = getProfileString(profile, 'event.date');
    if (current && normalize(current) !== normalize(trimmed)) {
      conflicts.push({ path: 'event.date', currentValue: current, nextValue: trimmed });
    } else {
      updates.event = { ...profile.event, date: trimmed };
      notes.push('Captured wedding date');
    }
  }

  if (/https?:\/\//i.test(trimmed)) {
    updates.registry = { ...profile.registry, url: trimmed, status: 'linked' };
    notes.push('Captured registry link');
  }

  if (!updates.event && /,/.test(trimmed) && trimmed.length >= 6 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    updates.event = { ...profile.event, venueLocation: trimmed };
    notes.push('Captured venue location');
  }

  if (/garden|coastal|desert|classic|editorial/i.test(trimmed)) {
    updates.design = { ...profile.design, theme: trimmed.toLowerCase() };
    inferred.push('design.theme');
  }

  if (!updates.story && trimmed.length > 24 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !/https?:\/\//i.test(trimmed)) {
    updates.story = { ...profile.story, summary: trimmed };
    notes.push('Captured story summary');
  }

  return { updates, inferred, conflicts, notes };
};

export const createOnboardingSessionState = (
  profile: WeddingProfile = createEmptyWeddingProfile(),
  askedQuestions: string[] = []
): OnboardingSessionState => {
  const readiness = evaluateWeddingProfileReadiness(profile);
  const nextNeed = readiness.missingCriticalFields[0] ?? readiness.missingRecommendedFields[0] ?? null;
  const nextQuestionKey = getQuestionKeyFromNeed(nextNeed ?? '');

  return {
    profile,
    readiness,
    currentIntent: readiness.missingCriticalFields.length > 0
      ? 'collect-critical-field'
      : readiness.hasEnoughToDraft
        ? 'offer-draft'
        : 'collect-recommended-field',
    nextQuestionKey,
    askedQuestions,
    confirmedFields: [],
    unresolvedConflicts: [],
    suggestedPrompt: getSuggestedPrompt(nextQuestionKey),
    confidence: readiness.hasEnoughToDraft ? 0.9 : 0.45,
  };
};

export const applyOnboardingInput = (
  session: OnboardingSessionState,
  input: string
): OnboardingSessionState => {
  const extraction = extractWeddingProfileUpdates(input, session.profile);
  const nextProfile = mergeProfile(session.profile, extraction.updates);
  const readiness = evaluateWeddingProfileReadiness(nextProfile);

  const nextNeed = extraction.conflicts[0]?.path ?? readiness.missingCriticalFields[0] ?? readiness.missingRecommendedFields[0] ?? null;
  const nextQuestionKey = extraction.conflicts[0]?.path ? QUESTION_KEY_BY_PATH[extraction.conflicts[0].path] ?? extraction.conflicts[0].path : getQuestionKeyFromNeed(nextNeed ?? '');

  return {
    profile: nextProfile,
    readiness,
    currentIntent: extraction.conflicts.length > 0
      ? 'confirm-conflict'
      : readiness.missingCriticalFields.length > 0
        ? 'collect-critical-field'
        : readiness.hasEnoughToDraft
          ? 'offer-draft'
          : 'collect-recommended-field',
    nextQuestionKey,
    askedQuestions: nextQuestionKey ? [...session.askedQuestions, nextQuestionKey] : session.askedQuestions,
    confirmedFields: session.confirmedFields,
    unresolvedConflicts: extraction.conflicts,
    suggestedPrompt: getSuggestedPrompt(nextQuestionKey),
    confidence: extraction.conflicts.length > 0 ? 0.25 : readiness.hasEnoughToDraft ? 0.9 : 0.6,
  };
};
