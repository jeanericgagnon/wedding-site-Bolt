import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import {
  createEmptyInitialSetupAnswers,
  initialSetupAnswersToOnboardingFormShape,
  type InitialSetupAnswers,
} from '../../lib/initialSetupAnswers';
import { createEmptyInitialSetupFollowUps } from '../../lib/initialSetupFollowUps';
import { buildInitialSetupDerivedOutputs } from '../../lib/initialSetupDerivedOutputs';
import { mergeOnboardingFollowUpAnswers } from '../../lib/onboardingFollowUpMerge';
import { createClarifyingDecisionFromInitialSetup, createClarifyingPersistenceFromDecision } from '../../lib/aiOnboardingClarifyingAdapter';
import { buildClarifyingAnswerPatchSet } from '../../lib/aiClarifyingFlow';
import { mapClarifyingPersistenceToTemplateSeed } from '../../lib/aiClarifyingMapper';
import { buildOnboardingUpdateWithClarifying } from '../../lib/buildOnboardingUpdateWithClarifying';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';
import { applyQuickStartAnswer, mergeClarifyingAnswer, type ConciergeQuestion } from '../../lib/quickStartFlow';
import { writeSignupReturnPath } from '../../lib/signupContinuation';
import { clearOnboardingEntryReturnPath } from '../../lib/onboardingEntryCleanup';
import { normalizeQuickStartDraftSnapshot } from '../../lib/quickStartPersistence';
import { normalizeMeaningfulQuickStartDraftSnapshot, persistQuickStartDraftSnapshot, QUICK_START_STORAGE_KEY } from '../../lib/quickStartStateTransfer';
import { buildQuickStartEntryPath, buildQuickStartGuestsPath } from '../../lib/quickStartContinuation';
import { clearAllOnboardingContinuationState } from '../../lib/onboardingContinuationCleanup';
import { hasMeaningfulQuickStartAnswers, mergeQuickStartSeedIntoDraft } from '../../lib/quickStartHydration';
import { deriveFollowUpAnswersFromClarifyingState } from '../../lib/quickStartClarifyingRestore';
import { resolveQuickStartResumeViewState } from '../../lib/quickStartResumeState';
import { clampQuickStartQuestionIndex } from '../../lib/quickStartQuestionBounds';
import { canResumeQuickStartFollowUps } from '../../lib/quickStartFollowUpGate';
import { normalizeQuickStartClarifyingState } from '../../lib/quickStartClarifyingNormalize';
import { normalizeQuickStartClarifyingMode } from '../../lib/quickStartClarifyingMode';

type QuestionDef = {
  key: ConciergeQuestion;
  label: string;
  prompt: string;
  helper?: string;
  type?: 'text' | 'date' | 'textarea' | 'choice';
  placeholder?: string;
  choices?: Array<{ label: string; value: string }>;
  optional?: boolean;
};

const questions: QuestionDef[] = [
  { key: 'partnerNames', label: 'Who’s getting married?', prompt: 'Who’s getting married?', helper: 'Use the names exactly how you want guests to see them on the site.', placeholder: 'Alex & Jordan' },
  {
    key: 'partnerLabels',
    label: 'Labels',
    prompt: 'How should we refer to each of you on the site?',
    helper: 'Choose the simplest option that fits best.',
    type: 'choice',
    choices: [
      { label: 'Just our names', value: 'none|none' },
      { label: 'Bride & Groom', value: 'bride|groom' },
      { label: 'Bride & Bride', value: 'bride|bride' },
      { label: 'Groom & Groom', value: 'groom|groom' },
    ],
  },
  { key: 'venueLocation', label: 'When + where', prompt: 'When and where are you getting married?', helper: 'Use the date and city or region together so we can anchor the whole site in one step.', placeholder: 'January 17, 2027 — Sayulita, Mexico' },
  { key: 'venueName', label: 'Venue', prompt: 'What venue are you getting married at?', helper: 'Use the venue name or write TBD if you are still deciding.', placeholder: 'Amor Boutique Hotel or TBD', optional: true },
  { key: 'theme', label: 'Style', prompt: 'What style should the site lean into?', helper: 'A few words is enough. Tropical, modern, editorial, classic, relaxed.', placeholder: 'Tropical, relaxed' },
  { key: 'guestFeel', label: 'Tone', prompt: 'If someone lands on your site, what should they feel right away?', helper: 'Think tone, not a perfect sentence. Warm, excited, relaxed, elegant, fun, emotional, welcoming, intimate. Anything like that works.', placeholder: 'Warm, excited, relaxed' },
  { key: 'weekendEvents', label: 'Events', prompt: 'What events are happening over the wedding weekend?', type: 'textarea', helper: 'Use one short line or sentence. We will turn it into structured events.', placeholder: 'Friday welcome drinks, Saturday wedding, Sunday brunch' },
  { key: 'ceremonyTime', label: 'Ceremony arrival', prompt: 'What time should guests arrive for the ceremony?', helper: 'A simple arrival time is enough.', placeholder: '4:30 PM' },
  {
    key: 'guestCount',
    label: 'Guest count',
    prompt: 'About how many guests are you inviting?',
    helper: 'Pick the closest range.',
    type: 'choice',
    choices: [
      { label: 'Under 50', value: 'under-50' },
      { label: '50–100', value: '50-100' },
      { label: '100–150', value: '100-150' },
      { label: '150–250', value: '150-250' },
      { label: '250+', value: '250-plus' },
    ],
  },
  {
    key: 'plusOnePolicy',
    label: 'Plus-ones',
    prompt: 'What’s your plus-one policy?',
    helper: 'Choose the policy you want the RSVP flow to follow.',
    type: 'choice',
    choices: [
      { label: 'No plus-ones', value: 'none' },
      { label: 'Some plus-ones', value: 'some' },
      { label: 'Everyone gets one', value: 'all' },
    ],
  },
  {
    key: 'childrenAllowed',
    label: 'Children',
    prompt: 'Are children invited?',
    helper: 'Choose yes, no, or unsure for now.',
    type: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unsure', value: 'unsure' },
    ],
  },
  { key: 'rsvpDeadline', label: 'RSVP', prompt: 'When do you want guests to RSVP by?', helper: 'This drives the RSVP setup immediately.', type: 'date' },
  {
    key: 'mealChoice',
    label: 'Meals',
    prompt: 'Do you want to collect meal choices?',
    helper: 'Choose yes or no.',
    type: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ],
  },
  { key: 'story', label: 'Story', prompt: 'Want to add your story? (totally optional)', type: 'textarea', helper: 'Optional, but helpful for stronger copy.', placeholder: 'We met on Hinge, texted for a month, then finally met up for a concert...', optional: true },
];

const PAGE_BG = '#FAF9F7';
const TEXT = '#2B2B2B';
const MUTED = '#A0A0A0';
const TRANSCRIPT = '#B0B0B0';
const TRANSCRIPT_VALUE = '#909090';
const WARM = '#8B7355';
const SOFT = '#F5F4F2';
const SOFT_HOVER = '#EEEDEB';
const BORDER = '#E0DED9';
const STORAGE_KEY = QUICK_START_STORAGE_KEY;
const PROCESSING_STEPS = [
  'Aggregating your answers',
  'Mapping wedding details',
  'Checking for missing guest-facing info',
  'Shaping the first draft structure',
  'Tuning tone and style',
  'Deciding if we need anything else',
  'Preparing your next step',
];
const PROCESSING_STEP_MS = 90;
const PROCESSING_FINAL_STEP_MS = 140;

export const QuickStart: React.FC = () => {
  const navigate = useNavigate();
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

  const safeCurrentIndex = clampQuickStartQuestionIndex(currentIndex, questions.length);
  const currentQuestion = questions[safeCurrentIndex];
  const formData = initialSetupAnswersToOnboardingFormShape(initialSetupAnswers);
  const activeClarifyingQuestions = clarifyingState?.clarifying.questions ?? [];

  useEffect(() => {
    if (currentIndex !== safeCurrentIndex) {
      setCurrentIndex(safeCurrentIndex);
    }
  }, [currentIndex, safeCurrentIndex]);

  useEffect(() => {
    clearOnboardingEntryReturnPath();
  }, []);

  useEffect(() => {
    const shouldReset = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('resetQuickStart') === '1';
    if (shouldReset) {
      setIsResettingDraft(true);
      localStorage.removeItem(STORAGE_KEY);
      setInitialSetupAnswers(createEmptyInitialSetupAnswers());
      followUpAnswersRef.current = {};
      setFollowUpAnswers({});
      clarifyingStateRef.current = null;
      setClarifyingState(null);
      setCurrentIndex(0);
      setShowFollowUps(false);
      setViewState('question');
      setInputValue('');
      hasLocalDraftHydrationRef.current = false;
      setHasLocalDraftHydration(false);
      setHasHydratedDraft(true);
      setIsResettingDraft(false);
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setHasHydratedDraft(true);
      return;
    }
    try {
      const parsed = normalizeQuickStartDraftSnapshot(JSON.parse(saved));
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
      // Ignore malformed local draft snapshots and fall back to a fresh flow.
    }
    finally {
      setHasHydratedDraft(true);
      setIsResettingDraft(false);
    }
  }, [hasLocalDraftHydration]);

  useEffect(() => {
    if (!hasHydratedDraft || isResettingDraft) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ initialSetupAnswers, currentIndex: safeCurrentIndex, followUpAnswers, showFollowUps, clarifyingState, viewState }));
  }, [initialSetupAnswers, safeCurrentIndex, followUpAnswers, showFollowUps, clarifyingState, viewState, hasHydratedDraft, isResettingDraft]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      clearOnboardingEntryReturnPath();
      const { data } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2, wedding_date, venue_name, venue_location, onboarding_answers')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.onboarding_answers && typeof data.onboarding_answers === 'object') {
        const restored = normalizeQuickStartDraftSnapshot({ initialSetupAnswers: data.onboarding_answers }).initialSetupAnswers;
        setInitialSetupAnswers((prev) => {
          const next = hasLocalDraftHydrationRef.current ? mergeQuickStartSeedIntoDraft(prev, restored) : { ...prev, ...restored };
          return next;
        });
        return;
      }
      const seededNames = buildCoupleDisplayName(data?.couple_name_1, data?.couple_name_2);
      if (seededNames || data?.wedding_date || data?.venue_name || data?.venue_location) {
        const seededAnswers = {
          ...createEmptyInitialSetupAnswers(),
          names: seededNames,
          whenWhere: data?.wedding_date && data?.venue_location ? `${data.wedding_date} — ${data.venue_location}` : (data?.venue_location || ''),
          venueNameOrTbd: data?.venue_name || '',
        } as InitialSetupAnswers;
        setInitialSetupAnswers((prev) => {
          const next = hasLocalDraftHydrationRef.current ? mergeQuickStartSeedIntoDraft(prev, seededAnswers) : { ...prev, ...seededAnswers };
          return next;
        });
      }
    };
    void fetchWeddingSite();
  }, []);

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
    setInitialSetupAnswers((prev) => {
      const next = applyQuickStartAnswer(prev, questionKey, rawValue);
      initialSetupAnswersRef.current = next;
      return next;
    });
  };

  const finishFlow = async (
    answersOverride: InitialSetupAnswers = initialSetupAnswersRef.current,
    clarifyingOverride: ReturnType<typeof createClarifyingPersistenceFromDecision> | null = clarifyingStateRef.current,
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const carriedQuickStartDraft = normalizeMeaningfulQuickStartDraftSnapshot({
          initialSetupAnswers: answersOverride,
          currentIndex: safeCurrentIndex,
          followUpAnswers: followUpAnswersRef.current,
          showFollowUps,
          clarifyingState: clarifyingOverride,
          viewState,
        });
        persistQuickStartDraftSnapshot(carriedQuickStartDraft);
        writeSignupReturnPath(buildQuickStartEntryPath());
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
      const { data: site, error: siteError } = await supabase
        .from('wedding_sites')
        .select('id, wedding_data, active_template_id, template_id, wedding_date, venue_name, wedding_location, couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (siteError) throw siteError;
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
      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({
          onboarding_answers: derivedProfile,
          planning_status: 'quick_start_complete',
          wedding_data: nextWeddingData,
          layout_config: onboardingUpdate.layout_config,
          active_template_id: onboardingUpdate.active_template_id,
          template_id: onboardingUpdate.template_id,
          site_slug: onboardingUpdate.site_slug,
          couple_name_1: onboardingUpdate.couple_name_1,
          couple_name_2: onboardingUpdate.couple_name_2,
          wedding_date: onboardingUpdate.wedding_date,
          venue_name: onboardingUpdate.venue_name,
          wedding_location: onboardingUpdate.wedding_location,
        })
        .eq('id', site.id);
      if (updateError) throw updateError;
      localStorage.removeItem(STORAGE_KEY);
      clearOnboardingEntryReturnPath();
      navigate(buildQuickStartGuestsPath(), {
        state: { showWelcome: true, nextStep: 'guest-import' },
      });
    } catch (err) {
      console.error('QUICK_START_FINISH_FAILED', err);
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setAiDebug(`finish_failed=${err instanceof Error ? err.message : String(err)}`);
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

    applyAnswer(answeredQuestion.key, value);
    setError('');
    setAiDebug('');

    const nextAnswers = applyQuickStartAnswer(initialSetupAnswers, answeredQuestion.key, value);

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
      const clarifyingDecision = await createClarifyingDecisionFromInitialSetup(nextAnswers);
      setAiDebug(`mode=${clarifyingDecision.mode}; questions=${clarifyingDecision.questions.length}`);
      const persistence = createClarifyingPersistenceFromDecision(clarifyingDecision);
      clarifyingStateRef.current = persistence;
      setClarifyingState(persistence);
      if (clarifyingDecision.mode === 'ask' && clarifyingDecision.questions.length > 0) {
        setLoading(false);
        setShowFollowUps(true);
        setViewState('followups');
        return;
      }
      const templateSeed = mapClarifyingPersistenceToTemplateSeed(persistence);
      console.log('QUICK_START_DRAFT_TEMPLATE_SEED', templateSeed);
      await finishFlow(nextAnswers, persistence);
      return;
    } catch (err) {
      console.error('QUICK_START_AI_STEP_FAILED', err);
      setError(err instanceof Error ? err.message : 'AI step failed.');
      setAiDebug(`step=${answeredQuestion.key}; value=${value.trim().slice(0, 80)}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: PAGE_BG }}>
      <div className="w-full max-w-[560px]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <p className="mb-1 text-[13px] uppercase tracking-wide" style={{ color: WARM }}>Day of Love Setup</p>
          <p className="text-[13px]" style={{ color: MUTED }}>AI-guided, but with the real product brain behind it</p>
        </motion.div>

        {previousAnswers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 space-y-2">
            {previousAnswers.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setCurrentIndex(questions.findIndex((question) => question.key === item.key));
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
                    <div key={step} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: active ? SOFT : 'transparent', border: active ? `1px solid ${BORDER}` : '1px solid transparent' }}>
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
                      className="w-full rounded-2xl px-6 py-5 text-left transition-all duration-100"
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
                  <textarea value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !loading) {
                      event.preventDefault();
                      void goNext(inputValue);
                    }
                  }} placeholder={currentQuestion.placeholder} rows={5} className="w-full rounded-2xl border-0 px-6 py-5 outline-none transition-all duration-200 resize-none" style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT }} />
                  <div className="flex gap-3">
                    {currentQuestion.optional && <button type="button" onClick={() => void goNext('')} className="rounded-full px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>Skip</button>}
                    <button type="button" onClick={() => void goNext(inputValue)} disabled={loading || (!inputValue.trim() && !currentQuestion.optional)} className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                      {loading ? 'Building...' : safeCurrentIndex === questions.length - 1 && !showFollowUps ? 'Build my draft' : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input type="text" value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !loading && void goNext(inputValue)} placeholder={currentQuestion?.type === 'date' ? 'YYYY-MM-DD or a clear date like 2026-12-01' : currentQuestion?.placeholder} autoFocus className="w-full rounded-2xl border-0 px-6 py-5 outline-none transition-all duration-200" style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT }} />
                  <div className="flex gap-3">
                    {currentQuestion?.optional && <button type="button" onClick={() => void goNext('')} className="rounded-full px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>Skip</button>}
                    <button type="button" onClick={() => void goNext(inputValue)} disabled={loading || (!inputValue.trim() && !currentQuestion?.optional)} className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                      {loading ? 'Building...' : safeCurrentIndex === questions.length - 1 && !showFollowUps ? 'Build my draft' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </motion.div>
          ) : (
            <motion.div key="followups" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', lineHeight: '1.2', color: TEXT, fontWeight: 500 }}>
                A few smart follow-ups before we build
              </h1>
              <p className="mb-8 text-[14px]" style={{ color: MUTED }}>
                We already have enough to draft. These are just the highest-leverage details the AI still wants.
              </p>
              <div className="space-y-4">
                {activeClarifyingQuestions.slice(0, 3).map((question) => (
                  <div key={question.id}>
                    <p className="mb-2 text-[14px]" style={{ color: TEXT }}>{question.question}</p>
                    <textarea value={followUpAnswers[question.id] || ''} onChange={(event) => {
                      const nextValue = event.target.value;
                      const nextFollowUps = { ...followUpAnswersRef.current, [question.id]: nextValue };
                      followUpAnswersRef.current = nextFollowUps;
                      setFollowUpAnswers(nextFollowUps);
                      const nextClarifying = mergeClarifyingAnswer(clarifyingStateRef.current, question.id, nextValue);
                      clarifyingStateRef.current = nextClarifying;
                      if (nextClarifying) {
                        setClarifyingState(nextClarifying);
                      }
                    }} rows={3} className="w-full rounded-2xl border-0 px-6 py-4 outline-none resize-none" style={{ backgroundColor: SOFT, fontSize: '16px', color: TEXT }} />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => void finishFlow(initialSetupAnswersRef.current, clarifyingStateRef.current)} disabled={loading} className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                  {loading ? 'Building...' : 'Build my draft'}
                </button>
                <button type="button" onClick={() => {
                  setShowFollowUps(false);
                  setViewState('question');
                }} className="rounded-full px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>
                  Back
                </button>
              </div>
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              {aiDebug && <p className="mt-2 text-xs" style={{ color: MUTED }}>AI debug: {aiDebug}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 flex items-center gap-4">
          <button className="text-[13px] transition-opacity duration-200 hover:opacity-60" style={{ color: MUTED }} onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.href = `${buildQuickStartEntryPath()}&resetQuickStart=1`;
          }}>
            Start over
          </button>
          <button className="text-[13px] transition-opacity duration-200 hover:opacity-60" style={{ color: MUTED }} onClick={() => { clearAllOnboardingContinuationState(); navigate('/dashboard?bypassPayment=1'); }}>
            Switch to manual setup
          </button>
        </motion.div>
      </div>
    </div>
  );
};
