import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingDraftOutputs, ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';
import { normalizeQuickStartClarifyingMode } from './quickStartClarifyingMode';
import { normalizeQuickStartClarifyingState } from './quickStartClarifyingNormalize';
import { hasMeaningfulQuickStartAnswers } from './quickStartHydration';

export type QuickStartDraftSnapshot = {
  initialSetupAnswers: InitialSetupAnswers;
  currentIndex: number;
  followUpAnswers: Record<string, string>;
  showFollowUps: boolean;
  clarifyingState: ClarifyingPersistenceEnvelope | null;
  viewState: 'question' | 'thinking' | 'followups';
};

const RESTORABLE_SETUP_STEPS: Array<{ key: keyof InitialSetupAnswers; optional?: boolean }> = [
  { key: 'names' },
  { key: 'labelPreference' },
  { key: 'whenWhere' },
  { key: 'venueNameOrTbd', optional: true },
  { key: 'style' },
  { key: 'guestFeel' },
  { key: 'weekendEventsRaw' },
  { key: 'ceremonyArrivalTime' },
  { key: 'guestCountBand' },
  { key: 'plusOnePolicy' },
  { key: 'childrenAllowed' },
  { key: 'rsvpDeadline' },
  { key: 'mealChoice' },
  { key: 'optionalStory', optional: true },
];

const clampRestorableCurrentIndex = (currentIndex: number): number => (
  Math.min(currentIndex, RESTORABLE_SETUP_STEPS.length)
);

const parseRecoverableClosedCurrentIndex = (currentIndex: unknown): number | null => {
  if (typeof currentIndex === 'number') {
    return Number.isFinite(currentIndex)
      && Number.isInteger(currentIndex)
      && Number.isSafeInteger(currentIndex)
      && currentIndex >= 0
      ? currentIndex
      : null;
  }

  if (typeof currentIndex !== 'string') return null;

  const trimmed = currentIndex.trim();
  if (!/^\d+(?:\.0+)?$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const resolveRestorableCurrentIndex = (currentIndex: number, answers: InitialSetupAnswers): number => {
  let maxIndex = 0;

  for (let index = 0; index < RESTORABLE_SETUP_STEPS.length; index += 1) {
    const step = RESTORABLE_SETUP_STEPS[index];
    const value = answers[step.key];
    const isAnswered = typeof value === 'string' && value.trim().length > 0;

    if (!step.optional && !isAnswered) {
      break;
    }

    maxIndex = index + 1;
  }

  return Math.min(clampRestorableCurrentIndex(currentIndex), maxIndex);
};

export const normalizeQuickStartDraftSnapshot = (value: unknown): QuickStartDraftSnapshot => {
  const base: QuickStartDraftSnapshot = {
    initialSetupAnswers: createEmptyInitialSetupAnswers(),
    currentIndex: 0,
    followUpAnswers: {},
    showFollowUps: false,
    clarifyingState: null,
    viewState: 'question',
  };

  if (!value || typeof value !== 'object') return base;
  const parsed = value as Partial<QuickStartDraftSnapshot>;

  const followUpAnswers = parsed.followUpAnswers && typeof parsed.followUpAnswers === 'object' && !Array.isArray(parsed.followUpAnswers)
    ? Object.fromEntries(
        Object.entries(parsed.followUpAnswers)
          .filter(([key, val]) => key.trim().length > 0 && typeof val === 'string' && val.trim().length > 0)
          .map(([key, val]) => [key.trim(), val.trim()]),
      )
    : {};

  const allowedInitialSetupValues: Partial<Record<keyof InitialSetupAnswers, readonly string[]>> = {
    labelPreference: ['names-only', 'bride-groom', 'bride-bride', 'groom-groom', 'custom'],
    guestCountBand: ['under-50', '50-100', '100-150', '150-250', '250-plus', ''],
    plusOnePolicy: ['none', 'some', 'all', ''],
    childrenAllowed: ['yes', 'no', 'unsure', ''],
    mealChoice: ['yes', 'no', ''],
    registryIntent: ['cash', 'gifts', 'both', 'unsure', 'none-for-now', ''],
  };

  const initialSetupAnswers = parsed.initialSetupAnswers && typeof parsed.initialSetupAnswers === 'object' && !Array.isArray(parsed.initialSetupAnswers)
    ? Object.fromEntries(
        Object.entries(parsed.initialSetupAnswers).flatMap(([key, val]) => {
          if (typeof val !== 'string') return [];
          const trimmedValue = val.trim();
          const allowedValues = allowedInitialSetupValues[key as keyof InitialSetupAnswers];
          return !allowedValues || allowedValues.includes(trimmedValue) ? [[key, trimmedValue]] : [];
        }),
      ) as Partial<InitialSetupAnswers>
    : {};

  const isStoredClarifyingQuestion = (value: unknown): value is StoredClarifyingQuestion => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const question = value as Record<string, unknown>;
    return typeof question.id === 'string'
      && question.id.trim().length > 0
      && typeof question.category === 'string'
      && question.category.trim().length > 0
      && typeof question.question === 'string'
      && question.question.trim().length > 0
      && typeof question.expectedAnswerType === 'string'
      && question.expectedAnswerType.trim().length > 0
      && Array.isArray(question.targetFields)
      && question.targetFields.every((field) => typeof field === 'string' && field.trim().length > 0)
      && Array.isArray(question.affectedSections)
      && question.affectedSections.every((section) => typeof section === 'string' && section.trim().length > 0)
      && typeof question.skippable === 'boolean'
      && typeof question.round === 'number'
      && Number.isFinite(question.round)
      && Number.isInteger(question.round)
      && Number.isSafeInteger(question.round)
      && typeof question.status === 'string'
      && ['pending', 'answered', 'skipped', 'unresolved'].includes(question.status)
      && typeof question.answer === 'string'
      && (question.status !== 'answered' || question.answer.trim().length > 0);
  };

  const sanitizeTrimmedString = (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
  };

  const withEntries = <T extends Record<string, unknown>>(section: T) => (
    Object.keys(section).length > 0 ? section : undefined
  );

  const sanitizeDraftOutputs = (value: unknown): ClarifyingDraftOutputs => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const draftOutputs = value as ClarifyingDraftOutputs;

    const hero = draftOutputs.hero && typeof draftOutputs.hero === 'object' && !Array.isArray(draftOutputs.hero)
      ? withEntries(Object.fromEntries(
          Object.entries({
            headline: sanitizeTrimmedString(draftOutputs.hero.headline),
            subheadline: sanitizeTrimmedString(draftOutputs.hero.subheadline),
            toneNote: sanitizeTrimmedString(draftOutputs.hero.toneNote),
          }).filter(([, fieldValue]) => fieldValue !== undefined),
        ))
      : undefined;

    const schedule = draftOutputs.schedule && typeof draftOutputs.schedule === 'object' && !Array.isArray(draftOutputs.schedule)
      ? withEntries(Object.fromEntries(
          Object.entries({
            intro: sanitizeTrimmedString(draftOutputs.schedule.intro),
            eventSummary: sanitizeTrimmedString(draftOutputs.schedule.eventSummary),
          }).filter(([, fieldValue]) => fieldValue !== undefined),
        ))
      : undefined;

    const faqGuidance = draftOutputs.faq && typeof draftOutputs.faq === 'object' && !Array.isArray(draftOutputs.faq) && Array.isArray(draftOutputs.faq.guidance)
      ? draftOutputs.faq.guidance
          .map((item) => sanitizeTrimmedString(item))
          .filter((item): item is string => item !== undefined)
      : undefined;
    const faq = faqGuidance && faqGuidance.length > 0 ? { guidance: faqGuidance } : undefined;

    const travel = draftOutputs.travel && typeof draftOutputs.travel === 'object' && !Array.isArray(draftOutputs.travel)
      ? withEntries(Object.fromEntries(
          Object.entries({
            intro: sanitizeTrimmedString(draftOutputs.travel.intro),
          }).filter(([, fieldValue]) => fieldValue !== undefined),
        ))
      : undefined;

    const story = draftOutputs.story && typeof draftOutputs.story === 'object' && !Array.isArray(draftOutputs.story)
      ? withEntries(Object.fromEntries(
          Object.entries({
            intro: sanitizeTrimmedString(draftOutputs.story.intro),
          }).filter(([, fieldValue]) => fieldValue !== undefined),
        ))
      : undefined;

    const guestGuidance = draftOutputs.guestGuidance && typeof draftOutputs.guestGuidance === 'object' && !Array.isArray(draftOutputs.guestGuidance)
      ? withEntries(Object.fromEntries(
          Object.entries({
            dressCode: sanitizeTrimmedString(draftOutputs.guestGuidance.dressCode),
            children: sanitizeTrimmedString(draftOutputs.guestGuidance.children),
            lodging: sanitizeTrimmedString(draftOutputs.guestGuidance.lodging),
            transport: sanitizeTrimmedString(draftOutputs.guestGuidance.transport),
          }).filter(([, fieldValue]) => fieldValue !== undefined),
        ))
      : undefined;

    const siteTone = draftOutputs.siteTone && typeof draftOutputs.siteTone === 'object' && !Array.isArray(draftOutputs.siteTone)
      ? withEntries(Object.fromEntries(
          Object.entries({
            summary: sanitizeTrimmedString(draftOutputs.siteTone.summary),
          }).filter(([, fieldValue]) => fieldValue !== undefined),
        ))
      : undefined;

    return {
      ...(hero ? { hero } : {}),
      ...(schedule ? { schedule } : {}),
      ...(faq ? { faq } : {}),
      ...(travel ? { travel } : {}),
      ...(story ? { story } : {}),
      ...(guestGuidance ? { guestGuidance } : {}),
      ...(siteTone ? { siteTone } : {}),
    };
  };

  const rawClarifyingState = normalizeQuickStartClarifyingState(
    parsed.clarifyingState
      && typeof parsed.clarifyingState === 'object'
      && !Array.isArray(parsed.clarifyingState)
      && (
        (
          'clarifying' in parsed.clarifyingState
          && parsed.clarifyingState.clarifying
          && typeof parsed.clarifyingState.clarifying === 'object'
          && !Array.isArray(parsed.clarifyingState.clarifying)
          && (
            Array.isArray(parsed.clarifyingState.clarifying.questions)
            || Array.isArray(parsed.clarifyingState.clarifying.history)
          )
        )
        || (
          parsed.clarifyingState.draftOutputs
          && typeof parsed.clarifyingState.draftOutputs === 'object'
          && !Array.isArray(parsed.clarifyingState.draftOutputs)
        )
      )
        ? {
            ...parsed.clarifyingState,
            draftOutputs: sanitizeDraftOutputs(
              parsed.clarifyingState.draftOutputs
              && typeof parsed.clarifyingState.draftOutputs === 'object'
              && !Array.isArray(parsed.clarifyingState.draftOutputs)
                ? parsed.clarifyingState.draftOutputs
                : {},
            ),
            clarifying: {
              mode: parsed.clarifyingState.clarifying
                && typeof parsed.clarifyingState.clarifying === 'object'
                && !Array.isArray(parsed.clarifyingState.clarifying)
                && parsed.clarifyingState.clarifying.mode === 'ask'
                  ? 'ask'
                  : 'draft',
              questions: parsed.clarifyingState.clarifying
                && typeof parsed.clarifyingState.clarifying === 'object'
                && !Array.isArray(parsed.clarifyingState.clarifying)
                && Array.isArray(parsed.clarifyingState.clarifying.questions)
                ? parsed.clarifyingState.clarifying.questions
                    .filter(isStoredClarifyingQuestion)
                    .map((question) => ({
                      ...question,
                      id: question.id.trim(),
                      category: question.category.trim(),
                      question: question.question.trim(),
                      expectedAnswerType: question.expectedAnswerType.trim(),
                      targetFields: question.targetFields.map((field) => field.trim()),
                      affectedSections: question.affectedSections.map((section) => section.trim()),
                      answer: question.answer.trim(),
                    }))
                : [],
              history: parsed.clarifyingState.clarifying
                && typeof parsed.clarifyingState.clarifying === 'object'
                && !Array.isArray(parsed.clarifyingState.clarifying)
                && Array.isArray(parsed.clarifyingState.clarifying.history)
                ? parsed.clarifyingState.clarifying.history
                    .filter(isStoredClarifyingQuestion)
                    .map((question) => ({
                      ...question,
                      id: question.id.trim(),
                      category: question.category.trim(),
                      question: question.question.trim(),
                      expectedAnswerType: question.expectedAnswerType.trim(),
                      targetFields: question.targetFields.map((field) => field.trim()),
                      affectedSections: question.affectedSections.map((section) => section.trim()),
                      answer: question.answer.trim(),
                    }))
                : [],
            },
          } as ClarifyingPersistenceEnvelope
        : null,
  );
  const clarifyingState = normalizeQuickStartClarifyingMode(rawClarifyingState);

  const hasStoredClarifyingState = parsed.clarifyingState !== undefined;
  const hasMalformedClarifyingEnvelope = parsed.clarifyingState !== undefined
    && parsed.clarifyingState !== null
    && rawClarifyingState === null;
  const hasClarifyingDraftOutputs = Boolean(
    clarifyingState && Object.keys(clarifyingState.draftOutputs).length > 0
  );
  const viewState = parsed.viewState === 'thinking' || parsed.viewState === 'followups' ? parsed.viewState : 'question';
  const hasOpenFollowUps = (clarifyingState?.clarifying.questions.some((question) => (
    question.status === 'pending' || question.status === 'unresolved'
  )) || false);
  const hasExplicitShowFollowUps = parsed.showFollowUps === true || parsed.showFollowUps === false;
  const activeClarifyingDraftIds = new Set(
    clarifyingState?.clarifying.questions
      .filter((question) => question.status === 'pending' || question.status === 'unresolved')
      .map((question) => question.id) ?? [],
  );
  const hasDraftedFollowUpAnswers = Object.keys(followUpAnswers).length > 0;
  const hasActiveDraftedFollowUpAnswers = Object.keys(followUpAnswers).some((key) => activeClarifyingDraftIds.has(key));
  const hasTypedClarifyingDraftAnswers = Boolean(
    clarifyingState?.clarifying.questions.some((question) => (
      (question.status === 'pending' || question.status === 'unresolved')
      && question.answer.trim().length > 0
    ))
  );
  const hasAnsweredClarifyingHistory = Boolean(
    clarifyingState && [...clarifyingState.clarifying.questions, ...clarifyingState.clarifying.history]
      .some((question) => question.status === 'answered' && question.answer.trim().length > 0)
  );
  const hasMissingResumeFlagForOpenClarifyingWork = !hasExplicitShowFollowUps
    && hasOpenFollowUps
    && clarifyingState?.clarifying.mode === 'ask'
    && (
      parsed.viewState === 'question'
      || rawClarifyingState?.clarifying.mode === 'ask'
    );
  const isThinkingGenerationInFlight = parsed.showFollowUps !== false
    && viewState === 'thinking'
    && rawClarifyingState !== null
    && (rawClarifyingState.clarifying.questions.length === 0)
    && (rawClarifyingState.clarifying.history.length === 0)
    && Object.keys(rawClarifyingState.draftOutputs).length === 0
    && Object.keys(followUpAnswers).length === 0;
  const showFollowUps = isThinkingGenerationInFlight || (hasOpenFollowUps && (
    parsed.showFollowUps === true
    || hasMissingResumeFlagForOpenClarifyingWork
    || (!hasExplicitShowFollowUps && (
      parsed.viewState === 'followups'
      || parsed.viewState === 'thinking'
      || hasTypedClarifyingDraftAnswers
      || hasActiveDraftedFollowUpAnswers
      || (hasDraftedFollowUpAnswers && !hasAnsweredClarifyingHistory)
    ))
  ));
  const activeClarifyingIds = clarifyingState
    ? new Set([
        ...clarifyingState.clarifying.questions
          .filter((question) => (
            question.status === 'pending'
            || question.status === 'unresolved'
            || (question.status === 'answered' && question.answer.trim().length > 0)
          ))
          .map((question) => question.id),
        ...clarifyingState.clarifying.history
          .filter((question) => question.status === 'answered' && question.answer.trim().length > 0)
          .map((question) => question.id),
      ])
    : null;
  const shouldDropOrphanedFollowUpAnswers = hasMalformedClarifyingEnvelope || (
    parsed.clarifyingState === null
    && (
      viewState === 'thinking'
      || viewState === 'followups'
      || parsed.showFollowUps === true
      || parsed.showFollowUps === false
    )
  ) || (
    hasStoredClarifyingState
    && (
      !hasClarifyingDraftOutputs
      || viewState === 'thinking'
      || viewState === 'followups'
      || parsed.showFollowUps === true
    )
    && rawClarifyingState !== null
    && rawClarifyingState.clarifying.questions.length === 0
    && rawClarifyingState.clarifying.history.length === 0
  );
  const hasOnlyDraftOutputs = Boolean(
    clarifyingState
    && clarifyingState.clarifying.questions.length === 0
    && clarifyingState.clarifying.history.length === 0
    && Object.keys(clarifyingState.draftOutputs).length > 0
  );
  const hasSkippedClarifyingRecords = Boolean(
    clarifyingState
    && [...clarifyingState.clarifying.questions, ...clarifyingState.clarifying.history]
      .some((question) => question.status === 'skipped')
  );
  const normalizedFollowUpAnswers = activeClarifyingIds && activeClarifyingIds.size > 0
    ? Object.fromEntries(Object.entries(followUpAnswers).filter(([key]) => activeClarifyingIds.has(key)))
    : hasSkippedClarifyingRecords
      ? {}
      : hasOnlyDraftOutputs && !shouldDropOrphanedFollowUpAnswers
        ? followUpAnswers
        : shouldDropOrphanedFollowUpAnswers
          ? {}
          : followUpAnswers;
  const reopenedClarifyingIds = clarifyingState
    ? new Set(
        clarifyingState.clarifying.questions
          .filter((question) => question.status === 'pending' || question.status === 'unresolved')
          .map((question) => question.id),
      )
    : new Set<string>();
  const answeredClarifyingAnswers = clarifyingState
    ? Object.fromEntries(
        [...clarifyingState.clarifying.questions, ...clarifyingState.clarifying.history]
          .filter((question) => (
            question.status === 'answered'
            && question.answer.trim().length > 0
            && !reopenedClarifyingIds.has(question.id)
          ))
          .map((question) => [question.id, question.answer.trim()]),
      )
    : {};
  const inProgressClarifyingAnswers = clarifyingState
    ? Object.fromEntries(
        clarifyingState.clarifying.questions
          .filter((question) => (
            (question.status === 'pending' || question.status === 'unresolved')
            && question.answer.trim().length > 0
          ))
          .map((question) => [question.id, question.answer.trim()]),
      )
    : {};
  const restoredFollowUpAnswers = {
    ...normalizedFollowUpAnswers,
    ...answeredClarifyingAnswers,
    ...inProgressClarifyingAnswers,
  };

  const normalizedViewState = showFollowUps
    ? viewState === 'thinking' && isThinkingGenerationInFlight
      ? 'thinking'
      : 'followups'
    : viewState === 'followups' || viewState === 'thinking'
      ? 'question'
      : viewState;
  const normalizedClarifyingState = clarifyingState && !showFollowUps && normalizedViewState === 'question'
    ? {
        ...clarifyingState,
        clarifying: {
          ...clarifyingState.clarifying,
          mode: 'draft',
        },
      }
    : clarifyingState;

  const normalizedInitialSetupAnswers = { ...base.initialSetupAnswers, ...initialSetupAnswers };
  const hasMeaningfulRestoreState = isThinkingGenerationInFlight
    || Object.keys(restoredFollowUpAnswers).length > 0
    || Boolean(normalizedClarifyingState && (
      normalizedClarifyingState.clarifying.questions.some((question) => question.status !== 'skipped')
      || normalizedClarifyingState.clarifying.history.some((question) => question.status !== 'skipped')
      || Object.keys(normalizedClarifyingState.draftOutputs).length > 0
    ));
  const hasSafeCurrentIndex = typeof parsed.currentIndex === 'number'
    && Number.isFinite(parsed.currentIndex)
    && Number.isInteger(parsed.currentIndex)
    && Number.isSafeInteger(parsed.currentIndex)
    && parsed.currentIndex >= 0;
  const recoverableClosedCurrentIndex = parseRecoverableClosedCurrentIndex(parsed.currentIndex);
  const recoveredClosedCurrentIndex = hasMeaningfulQuickStartAnswers(normalizedInitialSetupAnswers)
    ? resolveRestorableCurrentIndex(RESTORABLE_SETUP_STEPS.length, normalizedInitialSetupAnswers)
    : 0;
  const normalizedCurrentIndex = hasSafeCurrentIndex
    ? hasMeaningfulRestoreState && (showFollowUps || normalizedViewState !== 'question')
      ? clampRestorableCurrentIndex(Math.max(parsed.currentIndex ?? 0, RESTORABLE_SETUP_STEPS.length))
      : hasMeaningfulQuickStartAnswers(normalizedInitialSetupAnswers)
        ? resolveRestorableCurrentIndex(parsed.currentIndex ?? 0, normalizedInitialSetupAnswers)
        : 0
    : hasMeaningfulRestoreState && (showFollowUps || normalizedViewState !== 'question')
      ? RESTORABLE_SETUP_STEPS.length
      : recoverableClosedCurrentIndex !== null && hasMeaningfulQuickStartAnswers(normalizedInitialSetupAnswers)
        ? resolveRestorableCurrentIndex(recoverableClosedCurrentIndex, normalizedInitialSetupAnswers)
      : hasMeaningfulQuickStartAnswers(normalizedInitialSetupAnswers)
        ? recoveredClosedCurrentIndex
        : 0;

  const normalizedClarifyingEnvelope: ClarifyingPersistenceEnvelope | null = normalizedClarifyingState
    ? {
        clarifying: {
          ...normalizedClarifyingState.clarifying,
          mode: normalizedClarifyingState.clarifying.mode === 'draft' ? 'draft' : 'ask',
        },
        draftOutputs: normalizedClarifyingState.draftOutputs,
      }
    : null;

  return {
    initialSetupAnswers: normalizedInitialSetupAnswers,
    currentIndex: normalizedCurrentIndex,
    followUpAnswers: restoredFollowUpAnswers,
    showFollowUps,
    clarifyingState: normalizedClarifyingEnvelope,
    viewState: normalizedViewState,
  };
};
