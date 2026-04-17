import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import {
  applyInitialSetupAnswersToWeddingProfile,
  createEmptyWeddingProfile,
  evaluateWeddingProfileReadiness,
} from '../../lib/weddingProfile';
import {
  createEmptyInitialSetupAnswers,
  initialSetupAnswersToOnboardingFormShape,
  type InitialSetupAnswers,
} from '../../lib/initialSetupAnswers';
import { createEmptyInitialSetupFollowUps } from '../../lib/initialSetupFollowUps';
import { buildInitialSetupSnapshot } from '../../lib/initialSetupSnapshot';
import { buildInitialSetupDerivedOutputs } from '../../lib/initialSetupDerivedOutputs';
import { createOnboardingSessionStateFromInitialSetup, applyOnboardingInput } from '../../lib/aiOnboarding';
import { createClarifyingDecisionFromInitialSetup, createClarifyingPersistenceFromDecision } from '../../lib/aiOnboardingClarifyingAdapter';
import { answerClarifyingQuestion, buildClarifyingAnswerPatchSet } from '../../lib/aiClarifyingFlow';
import { mapClarifyingPersistenceToTemplateSeed } from '../../lib/aiClarifyingMapper';
import { buildOnboardingUpdateWithClarifying } from '../../lib/buildOnboardingUpdateWithClarifying';

type ConciergeQuestion =
  | 'partnerNames'
  | 'partnerLabels'
  | 'venueLocation'
  | 'venueName'
  | 'theme'
  | 'guestFeel'
  | 'weekendEvents'
  | 'ceremonyTime'
  | 'guestCount'
  | 'plusOnePolicy'
  | 'rsvpDeadline'
  | 'mealChoice'
  | 'story';

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
const STORAGE_KEY = 'dayoflove:quickstart-shell';
const PROCESSING_STEPS = [
  'Aggregating your answers',
  'Mapping wedding details',
  'Checking for missing guest-facing info',
  'Shaping the first draft structure',
  'Tuning tone and style',
  'Deciding if we need anything else',
  'Preparing your next step',
];

export const QuickStart: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [clarifyingState, setClarifyingState] = useState<ReturnType<typeof createClarifyingPersistenceFromDecision> | null>(null);
  const [initialSetupAnswers, setInitialSetupAnswers] = useState<InitialSetupAnswers>(createEmptyInitialSetupAnswers());
  const [initialSetupFollowUps] = useState(createEmptyInitialSetupFollowUps());
  const [weddingProfile, setWeddingProfile] = useState(createEmptyWeddingProfile());

  const currentQuestion = questions[currentIndex];
  const formData = initialSetupAnswersToOnboardingFormShape(initialSetupAnswers);
  const readiness = evaluateWeddingProfileReadiness(weddingProfile);
  const onboardingSession = createOnboardingSessionStateFromInitialSetup(initialSetupAnswers, currentQuestion ? [currentQuestion.key] : []);
  const activeClarifyingQuestions = clarifyingState?.clarifying.questions ?? [];

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.initialSetupAnswers) {
        setInitialSetupAnswers(parsed.initialSetupAnswers);
        setWeddingProfile(applyInitialSetupAnswersToWeddingProfile(parsed.initialSetupAnswers));
      }
      if (typeof parsed.currentIndex === 'number') setCurrentIndex(parsed.currentIndex);
      if (parsed.followUpAnswers) setFollowUpAnswers(parsed.followUpAnswers);
      if (parsed.showFollowUps) setShowFollowUps(true);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ initialSetupAnswers, currentIndex, followUpAnswers, showFollowUps }));
  }, [initialSetupAnswers, currentIndex, followUpAnswers, showFollowUps]);

  useEffect(() => {
    const fetchWeddingSite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2, wedding_date, venue_name, venue_location, onboarding_answers')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.onboarding_answers && typeof data.onboarding_answers === 'object') {
        const restored = data.onboarding_answers as InitialSetupAnswers;
        setInitialSetupAnswers((prev) => ({ ...prev, ...restored }));
        setWeddingProfile(applyInitialSetupAnswersToWeddingProfile(restored));
        return;
      }
      const seededNames = [data?.couple_name_1, data?.couple_name_2].filter(Boolean).join(' & ');
      if (seededNames || data?.wedding_date || data?.venue_name || data?.venue_location) {
        const seededAnswers = {
          ...createEmptyInitialSetupAnswers(),
          names: seededNames,
          whenWhere: data?.wedding_date && data?.venue_location ? `${data.wedding_date} — ${data.venue_location}` : (data?.venue_location || ''),
          venueNameOrTbd: data?.venue_name || '',
        } as InitialSetupAnswers;
        setInitialSetupAnswers((prev) => ({ ...prev, ...seededAnswers }));
      }
    };
    void fetchWeddingSite();
  }, []);

  useEffect(() => {
    setWeddingProfile(applyInitialSetupAnswersToWeddingProfile(initialSetupAnswers));
  }, [initialSetupAnswers]);

  useEffect(() => {
    if (!currentQuestion) return;
    setInputValue(getValueForQuestion(currentQuestion.key, formData));
    // Only reset when the visible question changes, not on every keystroke.
    // Otherwise the controlled input feels like it is deleting what the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const getValueForQuestion = (key: ConciergeQuestion, data: typeof formData): string => {
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
      case 'guestCount': return data.guestCount || '';
      case 'plusOnePolicy': return data.plusOnePolicy || '';
      case 'rsvpDeadline': return data.rsvpDeadline || '';
      case 'mealChoice': return data.mealChoice || '';
      case 'story': return data.story || '';
      default: return '';
    }
  };

  const previousAnswers = useMemo(
    () => questions.slice(0, currentIndex).map((q) => ({ ...q, value: getValueForQuestion(q.key, formData) })).filter((entry) => entry.value.trim()),
    [currentIndex, formData],
  );

  const applyAnswer = (questionKey: ConciergeQuestion, rawValue: string) => {
    const value = rawValue.trim();
    setInitialSetupAnswers((prev) => {
      const next = { ...prev };
      switch (questionKey) {
        case 'partnerNames': next.names = value; break;
        case 'partnerLabels':
          if (value === 'bride|groom') next.labelPreference = 'bride-groom';
          else if (value === 'bride|bride') next.labelPreference = 'bride-bride';
          else if (value === 'groom|groom') next.labelPreference = 'groom-groom';
          else next.labelPreference = 'names-only';
          break;
        case 'venueLocation': next.whenWhere = value; break;
        case 'venueName': next.venueNameOrTbd = value; break;
        case 'theme': next.style = value; break;
        case 'guestFeel': next.guestFeel = value; break;
        case 'weekendEvents': next.weekendEventsRaw = value; break;
        case 'ceremonyTime': next.ceremonyArrivalTime = value; break;
        case 'guestCount': next.guestCountBand = value as InitialSetupAnswers['guestCountBand']; break;
        case 'plusOnePolicy': next.plusOnePolicy = value as InitialSetupAnswers['plusOnePolicy']; break;
        case 'rsvpDeadline': next.rsvpDeadline = value; break;
        case 'mealChoice': next.mealChoice = value as InitialSetupAnswers['mealChoice']; break;
        case 'story': next.optionalStory = value; break;
      }
      return next;
    });
  };

  const finishFlow = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { weddingProfile: derivedProfile } = buildInitialSetupDerivedOutputs(initialSetupAnswers, initialSetupFollowUps);
      const { data: site, error: siteError } = await supabase
        .from('wedding_sites')
        .select('id, wedding_data, active_template_id, template_id, wedding_date, venue_name, wedding_location, couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (siteError) throw siteError;
      if (!site?.id) throw new Error('No wedding site found for this account');
      const clarifyingFieldPatches = clarifyingState ? buildClarifyingAnswerPatchSet(clarifyingState) : {};
      const existingWeddingData = site && 'wedding_data' in site ? ((site as { wedding_data?: Record<string, unknown> }).wedding_data || {}) : {};
      const templateSeed = clarifyingState ? mapClarifyingPersistenceToTemplateSeed(clarifyingState) : null;
      const onboardingUpdate = buildOnboardingUpdateWithClarifying({
        coupleNames: {
          name1: site?.couple_name_1 || initialSetupAnswers.names.split('&')[0]?.trim() || 'Partner One',
          name2: site?.couple_name_2 || initialSetupAnswers.names.split('&')[1]?.trim() || 'Partner Two',
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
        clarifying: clarifyingState || undefined,
      });
      const nextWeddingData = {
        ...(existingWeddingData || {}),
        ...(((onboardingUpdate.wedding_data as Record<string, unknown>) || {})),
        clarifyingFieldPatches,
        draftOutputs: clarifyingState?.draftOutputs || {},
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
      navigate('/dashboard/guests?bypassPayment=1&fromQuickStart=1&next=photos', {
        state: { showWelcome: true, nextStep: 'guest-import' },
      });
    } catch (err) {
      console.error('QUICK_START_FINISH_FAILED', err);
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setLoading(false);
    }
  };

  const runProcessingInterstitial = async () => {
    setIsThinking(true);
    for (let i = 0; i < PROCESSING_STEPS.length; i += 1) {
      setProcessingStep(i);
      await new Promise((resolve) => setTimeout(resolve, i === PROCESSING_STEPS.length - 1 ? 380 : 220));
    }
    setIsThinking(false);
  };

  const goNext = async (value: string) => {
    if (!currentQuestion) return;
    if (!value.trim() && !currentQuestion.optional) return;
    applyAnswer(currentQuestion.key, value);
    setError('');

    const nextAnswers = (() => {
      const draft = { ...initialSetupAnswers };
      switch (currentQuestion.key) {
        case 'partnerNames': draft.names = value.trim(); break;
        case 'partnerLabels':
          if (value.trim() === 'bride|groom') draft.labelPreference = 'bride-groom';
          else if (value.trim() === 'bride|bride') draft.labelPreference = 'bride-bride';
          else if (value.trim() === 'groom|groom') draft.labelPreference = 'groom-groom';
          else draft.labelPreference = 'names-only';
          break;
        case 'venueLocation': draft.whenWhere = value.trim(); break;
        case 'venueName': draft.venueNameOrTbd = value.trim(); break;
        case 'theme': draft.style = value.trim(); break;
        case 'weekendEvents': draft.weekendEventsRaw = value.trim(); break;
        case 'ceremonyTime': draft.ceremonyArrivalTime = value.trim(); break;
        case 'guestCount': draft.guestCountBand = value.trim() as InitialSetupAnswers['guestCountBand']; break;
        case 'plusOnePolicy': draft.plusOnePolicy = value.trim() as InitialSetupAnswers['plusOnePolicy']; break;
        case 'rsvpDeadline': draft.rsvpDeadline = value.trim(); break;
        case 'mealChoice': draft.mealChoice = value.trim() as InitialSetupAnswers['mealChoice']; break;
        case 'story': draft.optionalStory = value.trim(); break;
      }
      return draft;
    })();

    const aiSession = await applyOnboardingInput(
      createOnboardingSessionStateFromInitialSetup(initialSetupAnswers, questions.slice(0, currentIndex).map((q) => q.key)),
      value.trim(),
    );

    const shouldRunProcessing = currentIndex >= questions.length - 1;
    if (shouldRunProcessing) {
      await runProcessingInterstitial();
    }

    if (aiSession.currentIntent === 'offer-draft' || currentIndex >= questions.length - 1) {
      const clarifyingDecision = await createClarifyingDecisionFromInitialSetup(nextAnswers);
      const persistence = createClarifyingPersistenceFromDecision(clarifyingDecision);
      setClarifyingState(persistence);
      if (clarifyingDecision.mode === 'ask' && clarifyingDecision.questions.length > 0) {
        setShowFollowUps(true);
        return;
      }
      const templateSeed = mapClarifyingPersistenceToTemplateSeed(persistence);
      console.log('QUICK_START_DRAFT_TEMPLATE_SEED', templateSeed);
      await finishFlow();
      return;
    }

    const aiNextIndex = questions.findIndex((question) => question.key === aiSession.nextQuestionKey);
    const fallbackIndex = currentIndex + 1;
    const nextIndex = aiNextIndex >= 0 && aiNextIndex > currentIndex ? aiNextIndex : fallbackIndex;

    if (nextIndex >= questions.length) {
      const clarifyingDecision = await createClarifyingDecisionFromInitialSetup(nextAnswers);
      const persistence = createClarifyingPersistenceFromDecision(clarifyingDecision);
      setClarifyingState(persistence);
      if (clarifyingDecision.mode === 'ask' && clarifyingDecision.questions.length > 0) {
        setShowFollowUps(true);
        return;
      }
      const templateSeed = mapClarifyingPersistenceToTemplateSeed(persistence);
      console.log('QUICK_START_DRAFT_TEMPLATE_SEED', templateSeed);
      await finishFlow();
      return;
    }

    setCurrentIndex(nextIndex);
    setInputValue(getValueForQuestion(questions[nextIndex].key, initialSetupAnswersToOnboardingFormShape(nextAnswers)));
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
            {previousAnswers.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setCurrentIndex(index);
                  setShowFollowUps(false);
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
          {isThinking ? (
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
          ) : !showFollowUps ? (
            <motion.div key={currentQuestion?.key || 'done'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
              <h1 className="mb-8" style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', lineHeight: '1.2', color: TEXT, fontWeight: 500 }}>
                {currentQuestion?.prompt}
              </h1>
              {currentQuestion?.helper && <p className="mb-6 text-[14px]" style={{ color: MUTED }}>{currentQuestion.helper}</p>}

              {currentQuestion?.type === 'choice' ? (
                <div className="space-y-3">
                  {currentQuestion.choices?.map((choice, index) => (
                    <motion.button
                      key={choice.value}
                      onClick={() => void goNext(choice.value)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="w-full rounded-2xl px-6 py-5 text-left transition-all duration-200 hover:scale-[1.01]"
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
                  <textarea value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder={currentQuestion.placeholder} rows={5} className="w-full rounded-2xl border-0 px-6 py-5 outline-none transition-all duration-200 resize-none" style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT }} />
                  <div className="flex gap-3">
                    {currentQuestion.optional && <button onClick={() => void goNext('')} className="rounded-full px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>Skip</button>}
                    <button onClick={() => void goNext(inputValue)} disabled={loading || (!inputValue.trim() && !currentQuestion.optional)} className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                      {loading ? 'Building...' : currentIndex === questions.length - 1 && !showFollowUps ? 'Build my draft' : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input type="text" value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !loading && void goNext(inputValue)} placeholder={currentQuestion?.type === 'date' ? 'YYYY-MM-DD or a clear date like 2026-12-01' : currentQuestion?.placeholder} autoFocus className="w-full rounded-2xl border-0 px-6 py-5 outline-none transition-all duration-200" style={{ backgroundColor: SOFT, fontSize: '17px', color: TEXT }} />
                  <div className="flex gap-3">
                    {currentQuestion?.optional && <button onClick={() => void goNext('')} className="rounded-full px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>Skip</button>}
                    <button onClick={() => void goNext(inputValue)} disabled={loading || (!inputValue.trim() && !currentQuestion?.optional)} className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                      {loading ? 'Building...' : currentIndex === questions.length - 1 && !showFollowUps ? 'Build my draft' : 'Continue'}
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
                      setFollowUpAnswers((prev) => ({ ...prev, [question.id]: nextValue }));
                      if (clarifyingState) {
                        setClarifyingState(answerClarifyingQuestion(clarifyingState, question.id, nextValue, nextValue.trim() ? 'answered' : 'pending'));
                      }
                    }} rows={3} className="w-full rounded-2xl border-0 px-6 py-4 outline-none resize-none" style={{ backgroundColor: SOFT, fontSize: '16px', color: TEXT }} />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => void finishFlow()} disabled={loading} className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30" style={{ backgroundColor: TEXT, color: '#FFFFFF', fontSize: '15px', fontWeight: 500 }}>
                  {loading ? 'Building...' : 'Build my draft'}
                </button>
                <button onClick={() => setShowFollowUps(false)} className="rounded-full px-6 py-4" style={{ backgroundColor: SOFT, color: TEXT }}>
                  Back
                </button>
              </div>
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16">
          <button className="text-[13px] transition-opacity duration-200 hover:opacity-60" style={{ color: MUTED }} onClick={() => navigate('/dashboard?bypassPayment=1')}>
            Switch to manual setup
          </button>
        </motion.div>
      </div>
    </div>
  );
};
