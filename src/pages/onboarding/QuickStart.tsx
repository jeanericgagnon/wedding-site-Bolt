import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  createEmptyInitialSetupAnswers,
  initialSetupAnswersToOnboardingFormShape,
  type InitialSetupAnswers,
} from '../../lib/initialSetupAnswers';
import { createEmptyInitialSetupFollowUps } from '../../lib/initialSetupFollowUps';
import { buildInitialSetupDerivedOutputs } from '../../lib/initialSetupDerivedOutputs';
import { mergeOnboardingFollowUpAnswers } from '../../lib/onboardingFollowUpMerge';
import { createClarifyingPersistenceFromDecision } from '../../lib/aiOnboardingClarifyingAdapter';
import { buildClarifyingAnswerPatchSet } from '../../lib/aiClarifyingFlow';
import { mapClarifyingPersistenceToTemplateSeed } from '../../lib/aiClarifyingMapper';
import { buildOnboardingUpdateWithClarifying } from '../../lib/buildOnboardingUpdateWithClarifying';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';
import { applyQuickStartAnswer, mergeClarifyingAnswer, type ConciergeQuestion } from '../../lib/quickStartFlow';
import { writeSignupReturnPath } from '../../lib/signupContinuation';
import { clearOnboardingEntryReturnPath } from '../../lib/onboardingEntryCleanup';
import { normalizeQuickStartDraftSnapshot } from '../../lib/quickStartPersistence';
import { clearQuickStartDraftSnapshot, migrateQuickStartDraftSnapshotScope, normalizeMeaningfulQuickStartDraftSnapshot, persistQuickStartDraftSnapshot, readQuickStartDraftSnapshot } from '../../lib/quickStartStateTransfer';
import { buildQuickStartEntryPath, buildQuickStartGuestsPath } from '../../lib/quickStartContinuation';
import { clearAllOnboardingContinuationState } from '../../lib/onboardingContinuationCleanup';
import { hasMeaningfulQuickStartAnswers, mergeQuickStartSeedIntoDraft } from '../../lib/quickStartHydration';
import { deriveFollowUpAnswersFromClarifyingState } from '../../lib/quickStartClarifyingRestore';
import { resolveQuickStartResumeViewState } from '../../lib/quickStartResumeState';
import { clampQuickStartQuestionIndex } from '../../lib/quickStartQuestionBounds';
import { canResumeQuickStartFollowUps } from '../../lib/quickStartFollowUpGate';
import { normalizeQuickStartClarifyingState } from '../../lib/quickStartClarifyingNormalize';
import { normalizeQuickStartClarifyingMode } from '../../lib/quickStartClarifyingMode';
import { runOnboardingAiOrchestration } from '../../lib/onboardingAiOrchestrator';
import { generateDraftFromWeddingProfile, mergeGeneratedDraftIntoWeddingData } from '../../lib/aiDraftGenerator';
import { createCanonicalContentFromDraft } from '../../lib/aiCanonicalContent';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { useAuth } from '../../hooks/useAuth';
import {
  QUICK_START_PROCESSING_FINAL_STEP_MS,
  QUICK_START_PROCESSING_STEP_MS,
  quickStartProcessingSteps,
  quickStartQuestions,
  quickStartTheme,
} from './quickStartContent';
import {
  fetchQuickStartPersistSite,
  fetchQuickStartSeedSite,
  requireAuthenticatedOnboardingUser,
  updateQuickStartPersistSite,
} from './onboardingService';

function safeQuickStartError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

const {
  pageBg: PAGE_BG,
  text: TEXT,
  muted: MUTED,
  transcript: TRANSCRIPT,
  transcriptValue: TRANSCRIPT_VALUE,
  warm: WARM,
  soft: SOFT,
  softHover: SOFT_HOVER,
  border: BORDER,
} = quickStartTheme;
const questions = quickStartQuestions;
const PROCESSING_STEPS = quickStartProcessingSteps;
const PROCESSING_STEP_MS = QUICK_START_PROCESSING_STEP_MS;
const PROCESSING_FINAL_STEP_MS = QUICK_START_PROCESSING_FINAL_STEP_MS;

export const QuickStart: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const quickStartTransferSourceScope = user?.email?.trim().toLowerCase() || null;
  const quickStartStorageScope = user?.id ?? null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiDebug, setAiDebug] = useState('');
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [viewState, setViewState] = useState<'question' | 'thinking' | 'followups'>('question');
  const [processingStep, setProcessingStep] = useState(0);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [clarifyingState, setClarifyingState] = useState<ReturnType<typeof createClarifyingPersistenceFromDecision> | null>(null);
  const followUpAnswersRef = useRef<Record<string, string>>({});
  const clarifyingStateRef = useRef<ReturnType<typeof createClarifyingPersistenceFromDecision> | null>(null);
  const [initialSetupAnswers, setInitialSetupAnswers] = useState<InitialSetupAnswers>(createEmptyInitialSetupAnswers());
  const initialSetupAnswersRef = useRef<InitialSetupAnswers>(createEmptyInitialSetupAnswers());
  const [initialSetupFollowUps] = useState(createEmptyInitialSetupFollowUps());
  const [hasLocalDraftHydration, setHasLocalDraftHydration] = useState(false);
  const hasLocalDraftHydrationRef = useRef(false);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);
  const [aiLoopCount, setAiLoopCount] = useState(0);
  const [siteId, setSiteId] = useState<string | null>(null);

  const safeCurrentIndex = clampQuickStartQuestionIndex(currentIndex, questions.length);
  const currentQuestion = questions[safeCurrentIndex];
  const formData = initialSetupAnswersToOnboardingFormShape(initialSetupAnswers);
  const activeClarifyingQuestions = clarifyingState?.clarifying.questions ?? [];
  const showAiDebug = searchParams.get('quickStartDebug') === '1';

  useEffect(() => {
    if (currentIndex !== safeCurrentIndex) {
      setCurrentIndex(safeCurrentIndex);
    }
  }, [currentIndex, safeCurrentIndex]);

  useEffect(() => {
    clearOnboardingEntryReturnPath(quickStartStorageScope);
  }, [quickStartStorageScope]);

  useEffect(() => {
    if (!quickStartTransferSourceScope || !quickStartStorageScope) return;
    migrateQuickStartDraftSnapshotScope(quickStartTransferSourceScope, quickStartStorageScope);
  }, [quickStartStorageScope, quickStartTransferSourceScope]);

  useEffect(() => {
    const shouldReset = searchParams.get('resetQuickStart') === '1';
    if (shouldReset) {
      const emptyAnswers = createEmptyInitialSetupAnswers();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('resetQuickStart');
      navigate(
        {
          pathname: location.pathname,
          search: nextParams.toString() ? `?${nextParams.toString()}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
      setIsResettingDraft(true);
      clearQuickStartDraftSnapshot(quickStartStorageScope);
      initialSetupAnswersRef.current = emptyAnswers;
      setInitialSetupAnswers(emptyAnswers);
      followUpAnswersRef.current = {};
      setFollowUpAnswers({});
      clarifyingStateRef.current = null;
      setClarifyingState(null);
      setCurrentIndex(0);
      setShowFollowUps(false);
      setViewState('question');
      setInputValue('');
      setAiLoopCount(0);
      hasLocalDraftHydrationRef.current = false;
      setHasLocalDraftHydration(false);
      setHasHydratedDraft(true);
      setIsResettingDraft(false);
      return;
    }

    const parsed = readQuickStartDraftSnapshot(quickStartStorageScope);
    if (!parsed) {
      setHasHydratedDraft(true);
      return;
    }
    try {
      const normalizedClarifyingState = normalizeQuickStartClarifyingMode(normalizeQuickStartClarifyingState(parsed.clarifyingState));
      const restoredFollowUps = deriveFollowUpAnswersFromClarifyingState(normalizedClarifyingState, parsed.followUpAnswers);
      const restoredIndex = clampQuickStartQuestionIndex(parsed.currentIndex, questions.length);
      const canResumeFollowUps = canResumeQuickStartFollowUps(parsed.showFollowUps, normalizedClarifyingState);
      setInitialSetupAnswers(parsed.initialSetupAnswers);
      setCurrentIndex(restoredIndex);
      followUpAnswersRef.current = restoredFollowUps;
      setFollowUpAnswers(restoredFollowUps);
      clarifyingStateRef.current = normalizedClarifyingState;
      setClarifyingState(normalizedClarifyingState);
      setShowFollowUps(canResumeFollowUps);
      setViewState(resolveQuickStartResumeViewState({ ...parsed, showFollowUps: canResumeFollowUps }));
      const nextHasLocalDraftHydration = hasMeaningfulQuickStartAnswers(parsed.initialSetupAnswers) || Object.keys(restoredFollowUps).length > 0 || Boolean(normalizedClarifyingState);
      hasLocalDraftHydrationRef.current = nextHasLocalDraftHydration;
      setHasLocalDraftHydration(nextHasLocalDraftHydration);
    } catch {
      // Ignore malformed local draft snapshots and continue with a clean in-memory state.
    }
    finally {
      setHasHydratedDraft(true);
      setIsResettingDraft(false);
    }
  }, [hasLocalDraftHydration, location.hash, location.pathname, navigate, quickStartStorageScope, searchParams]);

  useEffect(() => {
    if (!hasHydratedDraft || isResettingDraft) return;
    persistQuickStartDraftSnapshot({ initialSetupAnswers, currentIndex: safeCurrentIndex, followUpAnswers, showFollowUps, clarifyingState, viewState }, quickStartStorageScope);
  }, [initialSetupAnswers, safeCurrentIndex, followUpAnswers, showFollowUps, clarifyingState, viewState, hasHydratedDraft, isResettingDraft, quickStartStorageScope]);

  useEffect(() => {
    followUpAnswersRef.current = followUpAnswers;
  }, [followUpAnswers]);

  useEffect(() => {
    initialSetupAnswersRef.current = initialSetupAnswers;
  }, [initialSetupAnswers]);

  useEffect(() => {
    clarifyingStateRef.current = clarifyingState;
  }, [clarifyingState]);

  useEffect(() => {
    const fetchWeddingSite = async () => {
      let user: { id: string };
      try {
        user = await requireAuthenticatedOnboardingUser();
      } catch {
        return;
      }
      clearOnboardingEntryReturnPath(quickStartStorageScope);
      const data = await fetchQuickStartSeedSite(user.id);
      setSiteId(data?.id ?? null);
      if (data?.onboarding_answers && typeof data.onboarding_answers === 'object') {
        const restored = normalizeQuickStartDraftSnapshot({ initialSetupAnswers: data.onboarding_answers }).initialSetupAnswers;
        setInitialSetupAnswers((prev) => {
          const next = hasLocalDraftHydrationRef.current ? mergeQuickStartSeedIntoDraft(prev, restored) : { ...prev, ...restored };
          initialSetupAnswersRef.current = next;
          return next;
        });
        return;
      }
      const seededNames = buildCoupleDisplayName(data?.couple_name_1, data?.couple_name_2);
      if (seededNames || data?.wedding_date || data?.venue_name || data?.venue_location) {
        const seededAnswers = {
          ...createEmptyInitialSetupAnswers(),
          names: seededNames,
          whenWhere: data?.wedding_date && data?.venue_location ? `${data.wedding_date} in ${data.venue_location}` : (data?.venue_location || ''),
          venueNameOrTbd: data?.venue_name || '',
        } as InitialSetupAnswers;
        setInitialSetupAnswers((prev) => {
          const next = hasLocalDraftHydrationRef.current ? mergeQuickStartSeedIntoDraft(prev, seededAnswers) : { ...prev, ...seededAnswers };
          initialSetupAnswersRef.current = next;
          return next;
        });
      }
    };
    void fetchWeddingSite();
  }, [quickStartStorageScope, searchParams]);

  useEffect(() => {
    if (!currentQuestion) return;
    setInputValue(getValueForQuestion(currentQuestion.key, formData));
    // Only reset when the visible question changes, not on every keystroke.
    // Otherwise the controlled input feels like it is deleting what the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCurrentIndex]);

  const getChoiceLabel = (key: ConciergeQuestion, value: string) => {
    const choice = questions.find((question) => question.key === key)?.choices?.find((item) => item.value === value);
    return choice?.label || value;
  };

  const getValueForQuestion = useCallback((key: ConciergeQuestion, data: typeof formData): string => {
    switch (key) {
      case 'partnerNames': return data.partnerNames || '';
      case 'partnerLabels': {
        const value = data.partnerLabels || 'none|none';
        const labels: Record<string, string> = {
          'none|none': 'Just our names',
          'bride|groom': 'Bride & Groom',
          'groom|bride': 'Bride & Groom',
          'bride|bride': 'Bride & Bride',
          'groom|groom': 'Groom & Groom',
        };
        return labels[value] || value;
      }
      case 'venueLocation': return data.venueLocation || '';
      case 'venueName': return data.venueName || '';
      case 'theme': return data.theme || '';
      case 'guestFeel': return data.guestExperience || '';
      case 'weekendEvents': return data.weekendEvents || '';
      case 'ceremonyTime': return data.ceremonyTime || '';
      case 'guestCount': return getChoiceLabel('guestCount', data.guestCount || '');
      case 'plusOnePolicy': return getChoiceLabel('plusOnePolicy', data.plusOnePolicy || '');
      case 'childrenAllowed': return getChoiceLabel('childrenAllowed', (data as typeof data & { childrenAllowed?: string }).childrenAllowed || '');
      case 'rsvpDeadline': return data.rsvpDeadline || '';
      case 'mealChoice': return getChoiceLabel('mealChoice', data.mealChoice || '');
      case 'story': return data.story || '';
      default: return '';
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedDraft || !currentQuestion) return;
    if (inputValue.trim().length > 0) return;
    const hydratedValue = getValueForQuestion(currentQuestion.key, formData);
    if (hydratedValue) {
      setInputValue(hydratedValue);
    }
    // Hydration can land after mount. Only patch blank inputs so we do not clobber live typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydratedDraft, safeCurrentIndex, initialSetupAnswers]);

  const previousAnswers = useMemo(
    () => questions.slice(0, safeCurrentIndex).map((q) => ({ ...q, value: getValueForQuestion(q.key, formData) })).filter((entry) => entry.value.trim()),
    [safeCurrentIndex, formData, getValueForQuestion],
  );

  const applyAnswer = (questionKey: ConciergeQuestion, rawValue: string) => {
    const next = applyQuickStartAnswer(initialSetupAnswersRef.current, questionKey, rawValue);
    initialSetupAnswersRef.current = next;
    setInitialSetupAnswers(next);
    return next;
  };

  const finishFlow = async (
    answersOverride: InitialSetupAnswers = initialSetupAnswersRef.current,
    clarifyingOverride: ReturnType<typeof createClarifyingPersistenceFromDecision> | null = clarifyingStateRef.current,
  ) => {
    setLoading(true);
    try {
      let user: { id: string };
      try {
        user = await requireAuthenticatedOnboardingUser();
      } catch {
        const carriedQuickStartDraft = normalizeMeaningfulQuickStartDraftSnapshot({
          initialSetupAnswers: answersOverride,
          currentIndex: safeCurrentIndex,
          followUpAnswers: followUpAnswersRef.current,
          showFollowUps,
          clarifyingState: clarifyingOverride,
          viewState,
        });
        persistQuickStartDraftSnapshot(carriedQuickStartDraft, quickStartStorageScope);
        writeSignupReturnPath(buildQuickStartEntryPath(), quickStartStorageScope);
        setLoading(false);
        navigate('/signup?bypassPayment=1', {
          replace: true,
          state: {
            returnTo: buildQuickStartEntryPath(),
            ...(carriedQuickStartDraft ? { quickStartDraft: carriedQuickStartDraft } : {}),
          },
        });
        return;
      }
      const mergedFollowUpState = mergeOnboardingFollowUpAnswers({
        initialSetupAnswers: answersOverride,
        initialSetupFollowUps,
        followUpAnswers: followUpAnswersRef.current,
        formData: initialSetupAnswersToOnboardingFormShape(answersOverride),
      });
      const { weddingProfile: derivedProfile } = buildInitialSetupDerivedOutputs(
        mergedFollowUpState.initialSetupAnswers,
        mergedFollowUpState.initialSetupFollowUps,
      );
      const site = await fetchQuickStartPersistSite(user.id);
      if (!site?.id) throw new Error('No wedding site found for this account');
      const clarifyingFieldPatches = clarifyingOverride ? buildClarifyingAnswerPatchSet(clarifyingOverride) : {};
      const existingWeddingData = site && 'wedding_data' in site ? ((site as { wedding_data?: Record<string, unknown> }).wedding_data || {}) : {};
      const templateSeed = clarifyingOverride ? mapClarifyingPersistenceToTemplateSeed(clarifyingOverride) : null;
      const onboardingUpdate = buildOnboardingUpdateWithClarifying({
        coupleNames: {
          name1: site?.couple_name_1 || answersOverride.names.split('&')[0]?.trim() || 'Partner One',
          name2: site?.couple_name_2 || answersOverride.names.split('&')[1]?.trim() || 'Partner Two',
        },
        planningStatus: 'quick_start_complete',
        template: (site?.active_template_id || site?.template_id || 'generated-modern-luxe') as string,
        weddingDate: site?.wedding_date || undefined,
        venue: site?.venue_name || undefined,
        city: site?.wedding_location || undefined,
        ourStory: templateSeed?.storyIntro,
        attire: templateSeed?.dressCode,
        hotelRecommendations: templateSeed?.lodgingGuidance,
        parking: templateSeed?.transportGuidance,
        customFaqs: templateSeed?.faqGuidance?.map((line) => `Guidance::${line}`).join('\n'),
        clarifying: clarifyingOverride || undefined,
      });
      const nextWeddingData = {
        ...(existingWeddingData || {}),
        ...(((onboardingUpdate.wedding_data as Record<string, unknown>) || {})),
        clarifyingFieldPatches,
        draftOutputs: clarifyingOverride?.draftOutputs || {},
      };
      const generatedDraft = await generateDraftFromWeddingProfile(derivedProfile);
      const canonicalAiContent = createCanonicalContentFromDraft(generatedDraft);
      const mergedWeddingData = await mergeGeneratedDraftIntoWeddingData(nextWeddingData, derivedProfile, generatedDraft) as Record<string, unknown>;
      const existingSiteJson = ((site.site_json as Record<string, unknown> | null) ?? {});
      const patchedBuilderProject = mergeGeneratedDraftIntoBuilderProject(
        existingSiteJson,
        generatedDraft,
        canonicalAiContent,
      );
      const persistedWeddingData = {
        ...mergedWeddingData,
        clarifyingFieldPatches,
        draftOutputs: clarifyingOverride?.draftOutputs || {},
        meta: {
          ...((((mergedWeddingData.meta as Record<string, unknown> | undefined) ?? {}))),
          aiDraft: generatedDraft,
          aiContent: canonicalAiContent,
          aiOnboarding: {
            qualityScore: clarifyingOverride?.meta?.qualityScore ?? null,
            confidence: clarifyingOverride?.meta?.confidence ?? null,
            loopCount: clarifyingOverride?.meta?.loopCount ?? null,
            maxLoopCount: clarifyingOverride?.meta?.maxLoopCount ?? null,
            fallbackUsed: clarifyingOverride?.meta?.fallbackUsed ?? false,
            source: 'quick_start_concierge',
            finalizedAt: new Date().toISOString(),
          },
          onboardingAutoAppliedAt: new Date().toISOString(),
        },
      };
      try {
        await updateQuickStartPersistSite({
          siteId: site.id,
          updateData: {
            onboarding_answers: derivedProfile,
            planning_status: 'quick_start_complete',
            wedding_data: persistedWeddingData,
            site_json: patchedBuilderProject,
            layout_config: onboardingUpdate.layout_config,
            active_template_id: onboardingUpdate.active_template_id,
            template_id: onboardingUpdate.template_id,
            site_slug: onboardingUpdate.site_slug,
            couple_name_1: onboardingUpdate.couple_name_1,
            couple_name_2: onboardingUpdate.couple_name_2,
            wedding_date: onboardingUpdate.wedding_date,
            venue_name: onboardingUpdate.venue_name,
            wedding_location: onboardingUpdate.wedding_location,
          },
        });
      } catch {
        await updateQuickStartPersistSite({
          siteId: site.id,
          updateData: {
            onboarding_answers: derivedProfile,
            wedding_data: persistedWeddingData,
            active_template_id: onboardingUpdate.active_template_id,
            site_slug: onboardingUpdate.site_slug,
            couple_name_1: onboardingUpdate.couple_name_1,
            couple_name_2: onboardingUpdate.couple_name_2,
            wedding_date: onboardingUpdate.wedding_date,
            venue_name: onboardingUpdate.venue_name,
            wedding_location: onboardingUpdate.wedding_location,
          },
        });
      }
      clearQuickStartDraftSnapshot(quickStartStorageScope);
      clearOnboardingEntryReturnPath(quickStartStorageScope);
      navigate(buildQuickStartGuestsPath(), {
        state: { showWelcome: true, nextStep: 'guest-import' },
      });
    } catch (err) {
      setError(safeQuickStartError(err, 'Couldn’t save your draft. Please try again.'));
      setAiDebug('finish_failed=retry_safe');
      setLoading(false);
    }
  };

  const runProcessingInterstitial = async () => {
    setViewState('thinking');
    for (let i = 0; i < PROCESSING_STEPS.length; i += 1) {
      setProcessingStep(i);
      await new Promise((resolve) => setTimeout(resolve, i === PROCESSING_STEPS.length - 1 ? PROCESSING_FINAL_STEP_MS : PROCESSING_STEP_MS));
    }
    setViewState(showFollowUps ? 'followups' : 'question');
  };

  const goNext = async (value: string) => {
    if (!currentQuestion) return;
    if (!value.trim() && !currentQuestion.optional) return;

    const answeredQuestion = currentQuestion;
    const answeredIndex = safeCurrentIndex;

    const nextAnswers = applyAnswer(answeredQuestion.key, value);
    setError('');
    setAiDebug('');

    const fallbackIndex = answeredIndex + 1;
    if (fallbackIndex < questions.length) {
      setCurrentIndex(fallbackIndex);
      setInputValue(getValueForQuestion(questions[fallbackIndex].key, initialSetupAnswersToOnboardingFormShape(nextAnswers)));
    }

    try {
      if (answeredIndex < questions.length - 1) {
        return;
      }

      await runProcessingInterstitial();
      const { decision: clarifyingDecision, meta } = await runOnboardingAiOrchestration({
        answers: nextAnswers,
        clarifyingState: clarifyingStateRef.current,
        followUpAnswers: followUpAnswersRef.current,
        loopCount: aiLoopCount,
        siteId,
      });
      setAiLoopCount(meta.loopCount ?? aiLoopCount);
      setAiDebug(`mode=${clarifyingDecision.mode}; questions=${clarifyingDecision.questions.length}`);
      const persistence = createClarifyingPersistenceFromDecision(clarifyingDecision, 1, {
        qualityScore: meta.qualityScore,
        loopCount: meta.loopCount,
        maxLoopCount: meta.maxLoopCount,
        fallbackUsed: meta.fallbackUsed,
      });
      clarifyingStateRef.current = persistence;
      setClarifyingState(persistence);
      if (clarifyingDecision.mode === 'ask' && clarifyingDecision.questions.length > 0) {
        setLoading(false);
        setShowFollowUps(true);
        setViewState('followups');
        return;
      }
      await finishFlow(nextAnswers, persistence);
      return;
    } catch (err) {
      setError(safeQuickStartError(err, 'That setup step did not finish. Try again in a moment.'));
      setAiDebug(`step=${answeredQuestion.key}; value=${value.trim().slice(0, 80)}`);
      setLoading(false);
    }
  };

  const continueAiLoopFromFollowUps = async () => {
    setLoading(true);
    setError('');
    setAiDebug('');
    try {
      const currentFollowUpQuestions = clarifyingStateRef.current?.clarifying.questions ?? [];
      const answeredCurrentFollowUps = currentFollowUpQuestions.length > 0 && currentFollowUpQuestions.every((question) => {
        const answer = followUpAnswersRef.current[question.id] || question.answer || '';
        return answer.trim().length > 0;
      });
      await runProcessingInterstitial();
      const nextLoopCount = aiLoopCount + 1;
      const { decision, meta } = await runOnboardingAiOrchestration({
        answers: initialSetupAnswersRef.current,
        clarifyingState: clarifyingStateRef.current,
        followUpAnswers: followUpAnswersRef.current,
        loopCount: nextLoopCount,
        siteId,
      });
      setAiLoopCount(meta.loopCount ?? nextLoopCount);
      setAiDebug(`mode=${decision.mode}; questions=${decision.questions.length}`);
      if (decision.mode === 'ask' && answeredCurrentFollowUps && nextLoopCount >= 1) {
        const finalPersistence = clarifyingStateRef.current
          ? {
              ...clarifyingStateRef.current,
              meta: {
                ...(clarifyingStateRef.current.meta || {}),
                confidence: decision.confidence,
                qualityScore: meta.qualityScore,
                loopCount: meta.loopCount,
                maxLoopCount: meta.maxLoopCount,
                fallbackUsed: meta.fallbackUsed,
              },
            }
          : createClarifyingPersistenceFromDecision(decision, nextLoopCount + 1, {
              qualityScore: meta.qualityScore,
              loopCount: meta.loopCount,
              maxLoopCount: meta.maxLoopCount,
              fallbackUsed: meta.fallbackUsed,
            });
        clarifyingStateRef.current = finalPersistence;
        setClarifyingState(finalPersistence);
        await finishFlow(initialSetupAnswersRef.current, finalPersistence);
        return;
      }
      const persistence = createClarifyingPersistenceFromDecision(decision, nextLoopCount + 1, {
        qualityScore: meta.qualityScore,
        loopCount: meta.loopCount,
        maxLoopCount: meta.maxLoopCount,
        fallbackUsed: meta.fallbackUsed,
      });
      clarifyingStateRef.current = persistence;
      setClarifyingState(persistence);
      if (decision.mode === 'ask' && decision.questions.length > 0) {
        setLoading(false);
        setShowFollowUps(true);
        setViewState('followups');
        return;
      }
      await finishFlow(initialSetupAnswersRef.current, persistence);
    } catch (err) {
      setError(safeQuickStartError(err, 'Those follow-ups did not save. Try again in a moment.'));
      setLoading(false);
      setViewState('followups');
    }
  };

  const handleQuestionInputChange = (value: string) => {
    setInputValue(value);
    setError('');
  };

  const handleFollowUpInputChange = (questionId: string, value: string) => {
    setError('');
    const nextFollowUps = { ...followUpAnswersRef.current, [questionId]: value };
    followUpAnswersRef.current = nextFollowUps;
    setFollowUpAnswers(nextFollowUps);
    const nextClarifying = mergeClarifyingAnswer(clarifyingStateRef.current, questionId, value);
    clarifyingStateRef.current = nextClarifying;
    if (nextClarifying) {
      setClarifyingState(nextClarifying);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: PAGE_BG }}>
      <div className="w-full max-w-[560px]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <p className="mb-1 text-[13px] font-medium" style={{ color: WARM }}>dayof setup</p>
          <p className="text-[13px]" style={{ color: MUTED }}>A calm path to a starter draft you can review</p>
        </motion.div>

        {previousAnswers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 space-y-2">
            {previousAnswers.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setCurrentIndex(index);
                  setShowFollowUps(false);
                  setViewState('question');
                  setError('');
                }}
                className="block text-left text-[13px] transition-opacity duration-200 hover:opacity-70"
                style={{ color: TRANSCRIPT }}
              >
                {item.prompt.replace('?', '')}: <span style={{ color: TRANSCRIPT_VALUE }}>{item.value}</span>
              </button>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {viewState === 'thinking' ? (
            <motion.div key="thinking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', lineHeight: '1.2', color: TEXT, fontWeight: 500 }}>
                One sec while I shape this
              </h1>
              <p className="mb-8 text-[14px]" style={{ color: MUTED }}>
                I’m pulling your answers together and deciding whether I need anything else before I build.
              </p>
              <div className="space-y-3">
                {PROCESSING_STEPS.map((step, index) => {
                  const active = index <= processingStep;
                  return (
                    <div key={step} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: active ? SOFT : 'transparent', border: active ? `1px solid ${BORDER}` : '1px solid transparent' }}>
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: active ? WARM : BORDER }} />
                      <p className="text-[14px]" style={{ color: active ? TEXT : MUTED }}>{step}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : viewState !== 'followups' ? (
            <motion.div key={currentQuestion?.key || 'done'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
              <h1 className="mb-8" style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', lineHeight: '1.2', color: TEXT, fontWeight: 500 }}>
                {currentQuestion?.prompt}
              </h1>
              {currentQuestion?.helper && <p className="mb-6 text-[14px]" style={{ color: MUTED }}>{currentQuestion.helper}</p>}

              {currentQuestion?.type === 'choice' ? (
                <div className="space-y-3">
                  {currentQuestion.choices?.map((choice) => (
                    <motion.button
                      key={choice.value}
                      onClick={() => void goNext(choice.value)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12 }}
                      className="w-full rounded-xl px-6 py-5 text-left transition-all duration-100"
                      style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT, border: '1px solid transparent' }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = SOFT_HOVER;
                        event.currentTarget.style.borderColor = BORDER;
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = SOFT;
                        event.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      {choice.label}
                    </motion.button>
                  ))}
                </div>
              ) : currentQuestion?.type === 'textarea' ? (
                <div className="space-y-4">
                  <textarea value={inputValue} onChange={(event) => handleQuestionInputChange(event.target.value)} onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !loading) {
                      event.preventDefault();
                      void goNext(inputValue);
                    }
                  }} placeholder={currentQuestion.placeholder} rows={5} className="w-full rounded-xl border-0 px-6 py-5 outline-none transition-all duration-200 resize-none" style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT }} />
                  <div className="flex gap-3">
                    {currentQuestion.optional && <button type="button" onClick={() => void goNext('')} className="rounded-xl px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>Skip</button>}
                    <button type="button" onClick={() => void goNext(inputValue)} disabled={loading || (!inputValue.trim() && !currentQuestion.optional)} className="rounded-xl px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                      {loading ? 'Building...' : safeCurrentIndex === questions.length - 1 && !showFollowUps ? 'Build my draft' : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input type="text" value={inputValue} onChange={(event) => handleQuestionInputChange(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !loading && void goNext(inputValue)} placeholder={currentQuestion?.type === 'date' ? 'YYYY-MM-DD or a clear date like 2026-12-01' : currentQuestion?.placeholder} autoFocus className="w-full rounded-xl border-0 px-6 py-5 outline-none transition-all duration-200" style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT }} />
                  <div className="flex gap-3">
                    {currentQuestion?.optional && <button type="button" onClick={() => void goNext('')} className="rounded-xl px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>Skip</button>}
                    <button type="button" onClick={() => void goNext(inputValue)} disabled={loading || (!inputValue.trim() && !currentQuestion?.optional)} className="rounded-xl px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                      {loading ? 'Building...' : safeCurrentIndex === questions.length - 1 && !showFollowUps ? 'Build my draft' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="mt-4 text-sm" style={{ color: MUTED }}>{error}</p>}
            </motion.div>
          ) : (
            <motion.div key="followups" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', lineHeight: '1.2', color: TEXT, fontWeight: 500 }}>
                A few useful follow-ups before we build
              </h1>
              <p className="mb-8 text-[14px]" style={{ color: MUTED }}>
                We already have enough to draft. These are the details most likely to make the first version feel personal and useful.
              </p>
              <div className="space-y-4">
                {activeClarifyingQuestions.slice(0, 3).map((question) => (
                  <div key={question.id}>
                    <p className="mb-2 text-[14px]" style={{ color: TEXT }}>{question.question}</p>
                    <textarea value={followUpAnswers[question.id] || ''} onChange={(event) => handleFollowUpInputChange(question.id, event.target.value)} rows={3} className="w-full rounded-xl border-0 px-6 py-4 outline-none resize-none" style={{ backgroundColor: SOFT, fontSize: '16px', color: TEXT }} />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => void continueAiLoopFromFollowUps()} disabled={loading} className="rounded-xl px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                  {loading ? 'Building...' : 'Build my draft'}
                </button>
                <button type="button" onClick={() => {
                  setShowFollowUps(false);
                  setViewState('question');
                }} className="rounded-xl px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>
                  Back
                </button>
              </div>
              {error && <p className="mt-4 text-sm" style={{ color: MUTED }}>{error}</p>}
              {import.meta.env.DEV && showAiDebug && aiDebug && <p className="mt-2 text-xs" style={{ color: MUTED }}>Draft details: {aiDebug}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 flex items-center gap-4">
          <button className="text-[13px] transition-opacity duration-200 hover:opacity-60" style={{ color: MUTED }} onClick={() => {
            clearQuickStartDraftSnapshot(quickStartStorageScope);
            navigate(`${buildQuickStartEntryPath()}&resetQuickStart=1`);
          }}>
            Start over
          </button>
          <button className="text-[13px] transition-opacity duration-200 hover:opacity-60" style={{ color: MUTED }} onClick={() => { clearAllOnboardingContinuationState(quickStartStorageScope); navigate('/dashboard?bypassPayment=1'); }}>
            Open the editor instead
          </button>
        </motion.div>
      </div>
    </div>
  );
};
