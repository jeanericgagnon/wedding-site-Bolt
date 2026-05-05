import { z } from 'zod';
import { WeddingProfile, WeddingProfileReadiness, evaluateWeddingProfileReadiness, createEmptyWeddingProfile, applyInitialSetupAnswersToWeddingProfile } from './weddingProfile';
import { isOpenAiConfigured, runOpenAiStructuredPrompt, getOpenAiRuntimeConfig } from './openai';
import { FollowUpQuestion, planFollowUpQuestions } from './aiFollowUpPlanner';
import type { InitialSetupAnswers } from './initialSetupAnswers';
import { buildInitialSetupSnapshot } from './initialSetupSnapshot';
import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

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
  clarifying?: ClarifyingPersistenceEnvelope;
  confidence: number;
};

export const buildIntakeSnapshot = (profile: WeddingProfile) => ({
  howWeMet: profile.story.summary,
  storyDetail: profile.story.summary,
  city: profile.event.venueLocation,
  venue: profile.event.venueName,
  guestFeel: '',
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
};

const onboardingExtractionSchema = z.object({
  updates: z.object({
    couple: z.object({
      displayNames: z.union([z.string(), z.null()]),
      partnerOne: z.union([z.string(), z.null()]),
      partnerTwo: z.union([z.string(), z.null()]),
    }).nullable(),
    event: z.object({
      date: z.union([z.string(), z.null()]),
      venueLocation: z.union([z.string(), z.null()]),
      venueName: z.union([z.string(), z.null()]),
      weekendEvents: z.union([z.string(), z.null()]),
      rsvpDeadline: z.union([z.string(), z.null()]),
    }).nullable(),
    story: z.object({ summary: z.union([z.string(), z.null()]) }).nullable(),
    registry: z.object({ url: z.union([z.string(), z.null()]), status: z.union([z.string(), z.null()]) }).nullable(),
    design: z.object({ theme: z.union([z.string(), z.null()]) }).nullable(),
    guestExperience: z.object({ summary: z.union([z.string(), z.null()]), faqTone: z.union([z.string(), z.null()]) }).nullable(),
  }),
  inferred: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

const getQuestionKeyFromNeed = (need: string): string | null => NEED_TO_QUESTION_KEY[need.toLowerCase()] ?? null;
const getSuggestedFollowUps = (
  readiness: WeddingProfileReadiness,
  clarifying: ClarifyingPersistenceEnvelope | undefined,
  fallback: FollowUpQuestion[],
): FollowUpQuestion[] => {
  const clarifyingQuestions = clarifying?.clarifying.questions ?? [];
  if (clarifyingQuestions.length) {
    return clarifyingQuestions.map((question) => ({
      key: question.id,
      priority: 100,
      affects: question.affectedSections,
      variants: [question.question, question.question, question.question] as [string, string, string],
    }));
  }

  if (readiness.hasEnoughToDraft && readiness.missingCriticalFields.length === 0) {
    return [];
  }

  return fallback;
};

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

const compactObject = <T extends Record<string, unknown>>(value: T | null | undefined): Partial<T> => {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined)) as Partial<T>;
};

const mergeProfile = (profile: WeddingProfile, updates: Partial<WeddingProfile>): WeddingProfile => ({
  ...profile,
  ...updates,
  couple: { ...profile.couple, ...compactObject(updates.couple as Record<string, unknown> | null | undefined) },
  event: { ...profile.event, ...compactObject(updates.event as Record<string, unknown> | null | undefined) },
  venue: { ...profile.venue, ...compactObject(updates.venue as Record<string, unknown> | null | undefined) },
  story: { ...profile.story, ...compactObject(updates.story as Record<string, unknown> | null | undefined) },
  registry: { ...profile.registry, ...compactObject(updates.registry as Record<string, unknown> | null | undefined) },
  design: { ...profile.design, ...compactObject(updates.design as Record<string, unknown> | null | undefined) },
  guestExperience: { ...profile.guestExperience, ...compactObject(updates.guestExperience as Record<string, unknown> | null | undefined) },
  meta: { ...profile.meta, ...compactObject(updates.meta as Record<string, unknown> | null | undefined) },
});

const normalizeDeterministicDateInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
};

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

  const normalizedDateInput = normalizeDeterministicDateInput(trimmed);
  if (normalizedDateInput) {
    const current = getProfileString(profile, 'event.date');
    if (current && normalize(current) !== normalize(normalizedDateInput)) {
      conflicts.push({ path: 'event.date', currentValue: current, nextValue: normalizedDateInput });
      requiresConfirmation = true;
      confidence = Math.max(confidence, 0.35);
    } else {
      updates.event = { ...profile.event, date: normalizedDateInput };
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

  if (!profile.guestExperience.summary && /relaxed|welcomed|welcome|taken care of|warm|excited|elegant|fun|emotional|intimate/i.test(trimmed) && trimmed.length > 12) {
    updates.guestExperience = {
      ...(updates.guestExperience ?? profile.guestExperience),
      summary: trimmed,
    };
    notes.push('Captured guest experience tone');
    confidence = Math.max(confidence, 0.7);
  }

  if (!updates.story && !(updates.guestExperience && 'summary' in updates.guestExperience) && !(updates.event && 'weekendEvents' in updates.event) && trimmed.length > 24 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !/https?:\/\//i.test(trimmed) && !/cash|gifts|both|unsure|none for now|under 50|50-100|100-150|150-250|250\+|250 plus/i.test(trimmed)) {
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
    if (import.meta.env.DEV) {
      console.info('[aiOnboarding] using deterministic fallback: OpenAI not configured');
    }
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

    const requiresConfirmation = conflicts.length > 0;
    const normalizedConfidence = requiresConfirmation
      ? Math.min(modelResult.confidence, deterministic.confidence, 0.49)
      : /https?:\/\//i.test(input)
        ? Math.max(modelResult.confidence, deterministic.confidence, 0.95)
        : Math.max(modelResult.confidence, deterministic.confidence);

    if (import.meta.env.DEV) {
      console.info('[aiOnboarding] using OpenAI extraction', getOpenAiRuntimeConfig());
    }
    return {
      updates: modelResult.updates as Partial<WeddingProfile>,
      inferred: modelResult.inferred,
      conflicts,
      notes: modelResult.notes,
      confidence: normalizedConfidence,
      requiresConfirmation,
    };
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[aiOnboarding] OpenAI extraction failed; using deterministic fallback.');
    }
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
    suggestedFollowUps: getSuggestedFollowUps(readiness, undefined, planFollowUpQuestions(buildIntakeSnapshot(profile), askedQuestions.length).questions),
    clarifying: undefined,
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
    suggestedFollowUps: getSuggestedFollowUps(readiness, session.clarifying, planFollowUpQuestions(buildIntakeSnapshot(nextProfile), session.askedQuestions.length).questions),
    clarifying: session.clarifying,
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
    suggestedFollowUps: getSuggestedFollowUps(readiness, undefined, planFollowUpQuestions(buildInitialSetupSnapshot(answers), askedQuestions.length).questions),
    clarifying: undefined,
    confidence: 0.45,
  };
};
