import { z } from 'zod';
import { WeddingProfile, WeddingProfileReadiness, evaluateWeddingProfileReadiness, createEmptyWeddingProfile, applyInitialSetupAnswersToWeddingProfile } from './weddingProfile';
import { isOpenAiConfigured, runOpenAiStructuredPrompt, getOpenAiRuntimeConfig } from './openai';
import { FollowUpQuestion, planFollowUpQuestions } from './aiFollowUpPlanner';
import type { InitialSetupAnswers } from './initialSetupAnswers';
import { buildInitialSetupSnapshot } from './initialSetupSnapshot';

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
  confidence: number;
  requiresConfirmation: boolean;
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
  suggestedFollowUps: FollowUpQuestion[];
  confidence: number;
};

export const buildIntakeSnapshot = (profile: WeddingProfile) => ({
  howWeMet: profile.story.summary,
  storyDetail: profile.story.summary,
  city: profile.event.venueLocation,
  venue: profile.event.venueName,
  guestFeel: '',
  registryPosture: profile.registry.status,
  rsvpDeadline: profile.event.rsvpDeadline,
  travelNotes: profile.event.weekendEvents || profile.event.venueLocation,
  eventLocationGaps: (profile.event.structuredWeekendEvents || [])
    .filter((event) => !event.locationName?.trim())
    .map((event) => `${event.dateLabel ? `${event.dateLabel} ` : ''}${event.title}`.trim()),
});

const normalize = (value: string) => value.trim().toLowerCase();

const NEED_TO_QUESTION_KEY: Record<string, string> = {
  'couple names': 'partnerNames',
  'wedding date': 'weddingDate',
  'venue location': 'venueLocation',
  'venue name': 'venueName',
  'theme': 'theme',
  'story summary': 'story',
  'guest count': 'guestCount',
  'plus one policy': 'plusOnePolicy',
  'weekend events': 'weekendEvents',
  'rsvp deadline': 'rsvpDeadline',
  'registry intent': 'registryIntent',
};

const QUESTION_KEY_BY_PATH: Record<string, string> = {
  'couple.displayNames': 'partnerNames',
  'event.date': 'weddingDate',
  'event.venueLocation': 'venueLocation',
  'event.venueName': 'venueName',
  'design.theme': 'theme',
  'story.summary': 'story',
  'guestExperience.summary': 'guestCount',
  'guestExperience.faqTone': 'plusOnePolicy',
  'event.weekendEvents': 'weekendEvents',
  'event.rsvpDeadline': 'rsvpDeadline',
  'registry.url': 'registryIntent',
};

const PROMPT_BY_QUESTION_KEY: Record<string, string> = {
  partnerNames: 'What names should we put on the site?',
  weddingDate: 'What date are you getting married?',
  venueLocation: 'Where is the wedding happening?',
  venueName: 'Do you already know the venue name?',
  theme: 'What vibe should the site lean toward?',
  story: 'Anything you want us to know about your story?',
  guestCount: 'About how many guests are you inviting?',
  plusOnePolicy: "What's your plus-one policy?",
  weekendEvents: 'What else is happening around the wedding weekend?',
  rsvpDeadline: 'When should guests RSVP by?',
  registryIntent: "What's the registry plan?",
};

const onboardingExtractionSchema = z.object({
  updates: z.object({
    couple: z.object({
      displayNames: z.string().optional(),
      partnerOne: z.string().optional(),
      partnerTwo: z.string().optional(),
    }).partial().optional(),
    event: z.object({
      date: z.string().optional(),
      venueLocation: z.string().optional(),
      venueName: z.string().optional(),
      weekendEvents: z.string().optional(),
      rsvpDeadline: z.string().optional(),
    }).partial().optional(),
    story: z.object({ summary: z.string().optional() }).partial().optional(),
    registry: z.object({ url: z.string().optional(), status: z.string().optional() }).partial().optional(),
    design: z.object({ theme: z.string().optional() }).partial().optional(),
    guestExperience: z.object({ summary: z.string().optional(), faqTone: z.string().optional() }).partial().optional(),
  }).partial(),
  inferred: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

const getQuestionKeyFromNeed = (need: string): string | null => NEED_TO_QUESTION_KEY[need.toLowerCase()] ?? null;
const getSuggestedPrompt = (questionKey: string | null, profile?: WeddingProfile) => {
  if (!questionKey) return null;

  const base = PROMPT_BY_QUESTION_KEY[questionKey] ?? null;
  if (!base) return null;

  if (!profile) return base;

  switch (questionKey) {
    case 'venueName':
      return profile.event.venueLocation
        ? `Do you already know the venue name for ${profile.event.venueLocation}?`
        : base;
    case 'story':
      return profile.couple.displayNames
        ? `What should we say about ${profile.couple.displayNames} on the site?`
        : base;
    case 'weekendEvents':
      return profile.event.date
        ? `What else is happening around ${profile.event.date} besides the wedding itself?`
        : base;
    case 'rsvpDeadline':
      return profile.event.date
        ? `What RSVP date should we show if the wedding is on ${profile.event.date}?`
        : base;
    default:
      return base;
  }
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

const deterministicExtractWeddingProfileUpdates = (
  input: string,
  profile: WeddingProfile
): OnboardingExtractionResult => {
  const updates: Partial<WeddingProfile> = {};
  const inferred: string[] = [];
  const conflicts: Array<{ path: string; currentValue: string; nextValue: string }> = [];
  const notes: string[] = [];
  let confidence = 0.2;
  let requiresConfirmation = false;
  const trimmed = input.trim();

  if (!trimmed) return { updates, inferred, conflicts, notes, confidence, requiresConfirmation };

  if (trimmed.includes('&') && !profile.couple.displayNames) {
    const [partnerOne = '', partnerTwo = ''] = trimmed.split('&').map((part) => part.trim()).filter(Boolean);
    updates.couple = {
      ...profile.couple,
      displayNames: trimmed,
      partnerOne,
      partnerTwo: partnerTwo || partnerOne,
    };
    notes.push('Captured couple names');
    confidence = Math.max(confidence, 0.92);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const current = getProfileString(profile, 'event.date');
    if (current && normalize(current) !== normalize(trimmed)) {
      conflicts.push({ path: 'event.date', currentValue: current, nextValue: trimmed });
      requiresConfirmation = true;
      confidence = Math.max(confidence, 0.35);
    } else {
      updates.event = { ...profile.event, date: trimmed };
      notes.push('Captured wedding date');
      confidence = Math.max(confidence, 0.95);
    }
  }

  if (/https?:\/\//i.test(trimmed)) {
    updates.registry = { ...profile.registry, url: trimmed, status: 'linked' };
    notes.push('Captured registry link');
    confidence = Math.max(confidence, 0.97);
  }

  if (!updates.event && /,/.test(trimmed) && trimmed.length >= 6 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    updates.event = { ...profile.event, venueLocation: trimmed };
    notes.push('Captured venue location');
    confidence = Math.max(confidence, 0.78);
  }

  if (/garden|coastal|desert|classic|editorial/i.test(trimmed)) {
    updates.design = { ...profile.design, theme: trimmed.toLowerCase() };
    inferred.push('design.theme');
    confidence = Math.max(confidence, 0.62);
  }

  if (!profile.guestExperience.summary && /under 50|50-100|100-150|150-250|250\+|250 plus|small wedding|big wedding/i.test(trimmed)) {
    updates.guestExperience = {
      ...profile.guestExperience,
      summary: trimmed,
    };
    notes.push('Captured guest count context');
    confidence = Math.max(confidence, 0.72);
  }

  if (!profile.guestExperience.faqTone && /none|some|all/i.test(trimmed)) {
    updates.guestExperience = {
      ...profile.guestExperience,
      faqTone: trimmed,
    };
    notes.push('Captured plus-one policy');
    confidence = Math.max(confidence, 0.72);
  }

  if (!profile.event.weekendEvents && /welcome|rehearsal|brunch|dinner|party|pool|pickleball|boat|after[- ]party/i.test(trimmed)) {
    updates.event = { ...(updates.event ?? profile.event), weekendEvents: trimmed };
    notes.push('Captured weekend events');
    confidence = Math.max(confidence, 0.72);
  }

  if (!updates.story && !updates.guestExperience && !(updates.event && 'weekendEvents' in updates.event) && trimmed.length > 24 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !/https?:\/\//i.test(trimmed) && !/cash|gifts|both|unsure|none for now|under 50|50-100|100-150|150-250|250\+|250 plus/i.test(trimmed)) {
    updates.story = { ...profile.story, summary: trimmed };
    notes.push('Captured story summary');
    confidence = Math.max(confidence, 0.58);
  }

  if (!updates.event?.venueName && trimmed.length > 3 && /venue|garden|estate|hotel|club|barn|beach/i.test(trimmed) && !/,/.test(trimmed)) {
    updates.event = { ...(updates.event ?? profile.event), venueName: trimmed };
    notes.push('Captured venue name');
    confidence = Math.max(confidence, 0.7);
  }

  return { updates, inferred, conflicts, notes, confidence, requiresConfirmation };
};

export const extractWeddingProfileUpdates = async (
  input: string,
  profile: WeddingProfile
): Promise<OnboardingExtractionResult> => {
  const deterministic = deterministicExtractWeddingProfileUpdates(input, profile);

  if (!isOpenAiConfigured()) {
    console.info('[aiOnboarding] using deterministic fallback: OpenAI not configured');
    return deterministic;
  }

  try {
    const modelResult = await runOpenAiStructuredPrompt({
      system: 'Extract structured wedding planning facts from user messages. Be conservative, return only what is actually supported.',
      user: `Profile:\n${JSON.stringify(profile, null, 2)}\n\nUser message:\n${input}`,
      schemaName: 'wedding_onboarding_extraction',
      schema: onboardingExtractionSchema,
      model: getOpenAiRuntimeConfig().model,
    });

    const candidate = mergeProfile(createEmptyWeddingProfile(), modelResult.updates as Partial<WeddingProfile>);
    const conflicts: Array<{ path: string; currentValue: string; nextValue: string }> = [];

    for (const path of Object.keys(QUESTION_KEY_BY_PATH)) {
      const currentValue = getProfileString(profile, path);
      const nextValue = getProfileString(candidate, path);
      if (currentValue && nextValue && normalize(currentValue) !== normalize(nextValue)) {
        conflicts.push({ path, currentValue, nextValue });
      }
    }

    console.info('[aiOnboarding] using OpenAI extraction', getOpenAiRuntimeConfig());
    return {
      updates: modelResult.updates as Partial<WeddingProfile>,
      inferred: modelResult.inferred,
      conflicts,
      notes: modelResult.notes,
      confidence: modelResult.confidence,
      requiresConfirmation: conflicts.length > 0,
    };
  } catch (error) {
    console.warn('[aiOnboarding] OpenAI extraction failed, falling back to deterministic extractor', error);
    return deterministic;
  }
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
    suggestedPrompt: getSuggestedPrompt(nextQuestionKey, profile),
    suggestedFollowUps: planFollowUpQuestions(buildIntakeSnapshot(profile), askedQuestions.length).questions,
    confidence: readiness.hasEnoughToDraft ? 0.9 : 0.45,
  };
};

export const applyOnboardingInput = async (
  session: OnboardingSessionState,
  input: string
): Promise<OnboardingSessionState> => {
  const extraction = await extractWeddingProfileUpdates(input, session.profile);
  const nextProfile = mergeProfile(session.profile, extraction.updates);
  const readiness = evaluateWeddingProfileReadiness(nextProfile);

  const nextNeed = extraction.conflicts[0]?.path ?? readiness.missingCriticalFields[0] ?? readiness.missingRecommendedFields[0] ?? null;
  const nextQuestionKey = extraction.conflicts[0]?.path ? QUESTION_KEY_BY_PATH[extraction.conflicts[0].path] ?? extraction.conflicts[0].path : getQuestionKeyFromNeed(nextNeed ?? '');

  return {
    profile: nextProfile,
    readiness,
    currentIntent: extraction.conflicts.length > 0 || extraction.requiresConfirmation
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
    suggestedPrompt: getSuggestedPrompt(nextQuestionKey, nextProfile),
    suggestedFollowUps: planFollowUpQuestions(buildIntakeSnapshot(nextProfile), session.askedQuestions.length).questions,
    confidence: extraction.conflicts.length > 0 || extraction.requiresConfirmation ? extraction.confidence : readiness.hasEnoughToDraft ? Math.max(extraction.confidence, 0.9) : Math.max(extraction.confidence, 0.6),
  };
};


export const createOnboardingSessionStateFromInitialSetup = (
  answers: InitialSetupAnswers,
  askedQuestions: string[] = []
): OnboardingSessionState => {
  const profile = applyInitialSetupAnswersToWeddingProfile(answers);
  const readiness = evaluateWeddingProfileReadiness(profile);
  return {
    profile,
    readiness,
    currentIntent: readiness.missingCriticalFields.length > 0
      ? 'collect-critical-field'
      : readiness.hasEnoughToDraft
        ? 'offer-draft'
        : 'collect-recommended-field',
    nextQuestionKey: null,
    askedQuestions,
    confirmedFields: [],
    unresolvedConflicts: [],
    suggestedPrompt: null,
    suggestedFollowUps: planFollowUpQuestions(buildInitialSetupSnapshot(answers), askedQuestions.length).questions,
    confidence: 0.45,
  };
};
