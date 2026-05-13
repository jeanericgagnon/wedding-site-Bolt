import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, ArrowRight, Check } from 'lucide-react';
import { Button, Input, Textarea, Card } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';
import { useAuth } from '../hooks/useAuth';
import { demoWeddingSite } from '../lib/demoData';
import { applyInitialSetupAnswersToWeddingProfile, createEmptyWeddingProfile, evaluateWeddingProfileReadiness, getWeddingProfileFieldStatus, isWeddingProfile } from '../lib/weddingProfile';
import { createOnboardingSessionStateFromInitialSetup } from '../lib/aiOnboarding';
import { createEmptyInitialSetupAnswers, createEmptyOnboardingFormShapeFromInitialSetup, initialSetupAnswersToOnboardingFormShape, type InitialSetupAnswers } from '../lib/initialSetupAnswers';
import { createEmptyInitialSetupFollowUps } from '../lib/initialSetupFollowUps';
import { buildInitialSetupDerivedOutputs } from '../lib/initialSetupDerivedOutputs';
import { buildOnboardingUpdateWithClarifying } from '../lib/buildOnboardingUpdateWithClarifying';
import { hasActiveOnboardingDraftSnapshot, hasStoredOnboardingDraftPayload, persistOnboardingDraftSnapshot, readOnboardingDraftSnapshot, type OnboardingStep } from '../lib/onboardingDraftPersistence';
import { mergeOnboardingFollowUpAnswers } from '../lib/onboardingFollowUpMerge';
import { resolveOnboardingResumeIndex } from '../lib/onboardingResumeIndex';
import { clearOnboardingResumeStorage, readOnboardingResumeState } from '../lib/onboardingResumeStorage';
import { clearAllOnboardingContinuationState } from '../lib/onboardingContinuationCleanup';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import {
  createOnboardingWeddingSite,
  fetchExistingOnboardingSite,
  mergeOnboardingSeedsIntoWeddingData,
  syncOnboardingEventSeeds,
  updateExistingOnboardingSite,
} from './onboarding/onboardingService';

type ConciergeQuestion = 'partnerNames' | 'partnerLabels' | 'venueLocation' | 'venueName' | 'theme' | 'weekendEvents' | 'ceremonyTime' | 'guestCount' | 'plusOnePolicy' | 'childrenAllowed' | 'rsvpDeadline' | 'mealChoice' | 'story';

export function parsePartnerNames(value: string): string[] {
  return value
    .split('&')
    .map((name) => name.trim())
    .filter(Boolean);
}

export function getDemoPartnerNamesFallback(): string {
  return buildCoupleDisplayName(demoWeddingSite.couple_name_1, demoWeddingSite.couple_name_2, 'Alex & Jordan');
}

export function getOnboardingSubdomain(partnerNames: string): string {
  const parts = parsePartnerNames(partnerNames)
    .map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);

  const slug = parts.join('and') || 'my-wedding';
  return `${slug}.dayof.love`;
}

export function getCreateSiteRsvpDeadline(
  onboardingUpdate: Record<string, unknown>,
  data: Record<string, unknown>,
): string | null {
  return (onboardingUpdate.rsvp_deadline as string | null | undefined)
    || (data.rsvp_deadline as string | null | undefined)
    || null;
}


export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [conversationIndex, setConversationIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [hasSavedDraftNotice, setHasSavedDraftNotice] = useState(false);
  const [weddingProfile, setWeddingProfile] = useState(createEmptyWeddingProfile());
  const [initialSetupAnswers, setInitialSetupAnswers] = useState<InitialSetupAnswers>(createEmptyInitialSetupAnswers());
  const [showFollowUpReview, setShowFollowUpReview] = useState(false);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [initialSetupFollowUps, setInitialSetupFollowUps] = useState(createEmptyInitialSetupFollowUps());
  const hasSeededDemoDraftRef = useRef(false);
  const formData = initialSetupAnswersToOnboardingFormShape(initialSetupAnswers);
  const forceShowChooser = searchParams.get('showChooser') === '1';

  const conciergeQuestions: Array<{
    key: ConciergeQuestion;
    label: string;
    prompt: string;
    helper?: string;
    type?: 'text' | 'date' | 'time' | 'textarea';
    placeholder?: string;
  }> = [
    { key: 'partnerNames', label: 'Who’s getting married?', prompt: 'Who’s getting married?', helper: 'Use the names exactly how you want guests to see them on the site.', placeholder: 'Alex & Jordan' },
    { key: 'partnerLabels', label: 'Labels', prompt: 'How should we refer to each of you on the site?', helper: 'Choose the simplest option that fits best.', placeholder: 'groom|bride' },
    { key: 'venueLocation', label: 'When and where', prompt: 'When and where are you getting married?', helper: 'Use the date and city or region together so we can anchor the whole site in one step.', placeholder: 'January 17, 2027 in Sayulita, Mexico' },
    { key: 'venueName', label: 'Venue', prompt: 'What venue are you getting married at?', helper: 'Use the venue name or write TBD if you are still deciding.', placeholder: 'Amor Boutique Hotel or TBD' },
    { key: 'theme', label: 'Style', prompt: 'What style should the site lean into?', helper: 'A few words is enough. Tropical, modern, editorial, classic, relaxed.', placeholder: 'Tropical, relaxed' },
    { key: 'weekendEvents', label: 'Events', prompt: 'What events are happening over the wedding weekend?', type: 'textarea', helper: 'Use one short line or sentence. We will turn it into structured events.', placeholder: 'Friday pickleball tournament and welcome dinner, Saturday rehearsal dinner, Sunday wedding' },
    { key: 'ceremonyTime', label: 'Ceremony arrival', prompt: 'What time should guests arrive for the ceremony?', helper: 'A simple arrival time is enough.', placeholder: '4:30 PM' },
    { key: 'guestCount', label: 'Guest count', prompt: 'About how many guests are you inviting?', helper: 'Pick the closest range.', placeholder: '50-100' },
    { key: 'plusOnePolicy', label: 'Plus-ones', prompt: 'What’s your plus-one policy?', helper: 'Choose the policy you want the RSVP flow to follow.', placeholder: 'some' },
    { key: 'childrenAllowed', label: 'Children', prompt: 'Are children invited?', helper: 'Choose yes, no, or unsure for now.', placeholder: 'unsure' },
    { key: 'rsvpDeadline', label: 'RSVP', prompt: 'When do you want guests to RSVP by?', helper: 'This drives the RSVP setup immediately.', type: 'date' },
    { key: 'mealChoice', label: 'Meals', prompt: 'Do you want to collect meal choices?', helper: 'Choose yes or no.', placeholder: 'yes' },
    { key: 'story', label: 'Story', prompt: 'Want to add your story? (totally optional)', type: 'textarea', helper: 'Optional, but helpful for stronger copy.', placeholder: 'We met on Hinge, texted for a month, then finally met up for a concert...' },
  ];

  const currentQuestion = conciergeQuestions[conversationIndex] ?? null;
  const optionalQuestionKeys: ConciergeQuestion[] = ['venueName', 'story'];
  const isCurrentQuestionOptional = currentQuestion ? optionalQuestionKeys.includes(currentQuestion.key) : false;

  const getStepForIndex = (index: number): OnboardingStep => {
    if (index < 4) return 'quick-1';
    if (index < 7) return 'quick-2';
    return 'quick-3';
  };

  const getQuestionIndexByKey = (key: string | null) => {
    if (!key) return 0;
    const index = conciergeQuestions.findIndex((question) => question.key === key);
    return index >= 0 ? index : 0;
  };

  const getFirstIncompleteQuestionIndex = () => {
    const checks = [
      !formData.partnerNames.trim(),
      false,
      !formData.venueLocation.trim(),
      !formData.venueName.trim(),
      !formData.theme.trim(),
      !formData.story.trim(),
      !formData.guestCount?.trim(),
      !formData.weekendEvents.trim(),
      !formData.plusOnePolicy?.trim(),
      !formData.rsvpDeadline,
    ];

    const firstIncomplete = checks.findIndex(Boolean);
    return firstIncomplete === -1 ? conciergeQuestions.length - 1 : firstIncomplete;
  };

  const setupChecklist = [
    {
      id: 'names',
      label: 'Add couple names',
      done: Boolean(formData.partnerNames.trim()),
      actionLabel: 'Go',
      action: () => {
        goToQuestionIndex(getQuestionIndexByKey(onboardingSession.nextQuestionKey));
      },
    },
    {
      id: 'date',
      label: 'Set wedding date',
      done: Boolean(formData.weddingDate || formData.venueLocation.trim()),
      actionLabel: 'Go',
      action: () => {
        goToQuestionIndex(getQuestionIndexByKey(onboardingSession.nextQuestionKey));
      },
    },
    {
      id: 'venue',
      label: 'Add venue/address',
      done: Boolean(formData.venueName.trim() || formData.venueLocation.trim()),
      actionLabel: 'Go',
      action: () => {
        goToQuestionIndex(getQuestionIndexByKey(onboardingSession.nextQuestionKey));
      },
    },
    {
      id: 'registry',
      label: 'Add registry link or keep moving',
      done: true,
      actionLabel: 'Go',
      action: () => {
        goToQuestionIndex(9);
      },
    },
    {
      id: 'publish',
      label: 'Publish site',
      done: step === 'complete',
      actionLabel: 'Finish setup',
      action: () => {
        goToQuestionIndex(9);
      },
    },
  ];

  const completedSetupCount = setupChecklist.filter(item => item.done).length;
  const nextSetupItem = setupChecklist.find(item => !item.done) ?? null;
  const conversationProgress = Math.round(((conversationIndex + 1) / conciergeQuestions.length) * 100);
  const readiness = evaluateWeddingProfileReadiness(weddingProfile);
  const fieldStatuses = getWeddingProfileFieldStatus(weddingProfile);
  const onboardingSession = createOnboardingSessionStateFromInitialSetup(
    initialSetupAnswers,
    currentQuestion ? [currentQuestion.key] : [],
  );
  const answeredFollowUpCount = Object.keys(followUpAnswers).filter((key) => followUpAnswers[key]?.trim()).length;
  const remainingFollowUpBudget = Math.max(0, 5 - answeredFollowUpCount);

  const draftMilestones = [
    {
      id: 'foundation',
      title: 'Foundation set',
      description: 'Names, date, and location are giving the site a real identity.',
      done: Boolean(formData.partnerNames.trim() && formData.venueLocation.trim()),
    },
    {
      id: 'look-and-feel',
      title: 'Look and feel forming',
      description: 'Theme, story, and venue details are shaping the draft direction.',
      done: Boolean(formData.theme.trim() && formData.story.trim() && (formData.venueName.trim() || formData.venueLocation.trim())),
    },
    {
      id: 'guest-ready',
      title: 'Guest-ready details',
      description: 'Guest experience, weekend plans, and RSVP details are enough to make the draft useful.',
      done: Boolean(formData.guestCount?.trim() && formData.weekendEvents.trim() && formData.plusOnePolicy?.trim() && formData.rsvpDeadline),
    },
  ];


  const derivedNames = parsePartnerNames(formData.partnerNames);
  const suggestedSiteSlug = derivedNames.length
    ? derivedNames.map((name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '')).filter(Boolean).join('and')
    : (user?.email?.split('@')[0] || 'my-wedding');

  const getThemeHint = () => {
    if (formData.venueLocation.toLowerCase().includes('beach') || formData.venueLocation.toLowerCase().includes('coast')) {
      return 'coastal';
    }
    if (formData.venueLocation.toLowerCase().includes('desert') || formData.venueLocation.toLowerCase().includes('scottsdale')) {
      return 'desert';
    }
    if (formData.venueLocation.toLowerCase().includes('garden') || formData.venueName.toLowerCase().includes('garden')) {
      return 'garden';
    }
    return formData.theme;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || isDemoMode) {
      setHasHydratedDraft(true);
      return;
    }

    const hadSavedDraft = hasStoredOnboardingDraftPayload();
    const parsed = readOnboardingDraftSnapshot();
    if (!parsed) {
      setHasSavedDraftNotice(false);
      if (hadSavedDraft) clearAllOnboardingContinuationState();
      setHasHydratedDraft(true);
      return;
    }

    try {
      const hydratedAnswers = parsed.initialSetupAnswers;
      setInitialSetupAnswers(hydratedAnswers);
      setInitialSetupFollowUps(parsed.initialSetupFollowUps);
      setFollowUpAnswers(parsed.followUpAnswers);
      setShowFollowUpReview(parsed.showFollowUpReview);
      setHasSavedDraftNotice(true);
      setWeddingProfile(isWeddingProfile(parsed.weddingProfile) ? parsed.weddingProfile : applyInitialSetupAnswersToWeddingProfile(hydratedAnswers));
      const { hint: resumeHint, index: resumeIndex } = readOnboardingResumeState();
      if (forceShowChooser) {
        setConversationIndex(0);
        setStep('choice');
        clearOnboardingResumeStorage();
      } else if (resumeHint === 'question' && resumeIndex !== null) {
        const nextResumeIndex = resolveOnboardingResumeIndex({
          savedIndex: resumeIndex,
          firstIncompleteIndex: getFirstIncompleteQuestionIndex(),
          questionCount: conciergeQuestions.length,
        });
        setConversationIndex(nextResumeIndex);
        setStep(getStepForIndex(nextResumeIndex));
        clearOnboardingResumeStorage();
      } else if (resumeHint === 'first-incomplete') {
        const firstIncompleteIndex = getFirstIncompleteQuestionIndex();
        const resumeIndex = resolveOnboardingResumeIndex({
          savedIndex: firstIncompleteIndex,
          firstIncompleteIndex,
          questionCount: conciergeQuestions.length,
        });
        setConversationIndex(resumeIndex);
        setStep(getStepForIndex(resumeIndex));
        clearOnboardingResumeStorage();
      } else if (typeof parsed.conversationIndex === 'number') {
        const resumeIndex = resolveOnboardingResumeIndex({
          savedIndex: parsed.conversationIndex,
          firstIncompleteIndex: getFirstIncompleteQuestionIndex(),
          questionCount: conciergeQuestions.length,
        });
        setConversationIndex(resumeIndex);
        setStep(parsed.showFollowUpReview ? 'quick-3' : getStepForIndex(resumeIndex));
      } else if (parsed.step && parsed.step !== 'complete') {
        setStep(parsed.step);
      }
    } catch {
      clearAllOnboardingContinuationState();
    } finally {
      setHasHydratedDraft(true);
    }
  }, [forceShowChooser, isDemoMode]);

  useEffect(() => {
    if (!forceShowChooser) return;
    const next = new URLSearchParams(searchParams);
    next.delete('showChooser');
    setSearchParams(next, { replace: true });
  }, [forceShowChooser, searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window === 'undefined' || isDemoMode || step === 'complete' || !hasHydratedDraft) return;

    const persisted = persistOnboardingDraftSnapshot({
      step,
      conversationIndex,
      weddingProfile,
      initialSetupAnswers,
      initialSetupFollowUps,
      followUpAnswers,
      showFollowUpReview,
    });
    setHasSavedDraftNotice(Boolean(persisted));
  }, [conversationIndex, followUpAnswers, hasHydratedDraft, initialSetupAnswers, initialSetupFollowUps, isDemoMode, showFollowUpReview, step, weddingProfile]);

  const clearSavedOnboardingDraft = () => {
    clearAllOnboardingContinuationState();
    setHasSavedDraftNotice(false);
  };

  const hydrateProfile = useCallback((partial: Partial<ReturnType<typeof initialSetupAnswersToOnboardingFormShape>>) => {
    const nextForm = {
      ...createEmptyOnboardingFormShapeFromInitialSetup(),
      ...formData,
      ...partial,
    };
    const nextAnswers = {
      ...initialSetupAnswers,
      names: nextForm.partnerNames,
      whenWhere: nextForm.weddingDate && nextForm.venueLocation ? `${nextForm.weddingDate} in ${nextForm.venueLocation}` : nextForm.venueLocation,
      venueNameOrTbd: nextForm.venueName,
      style: nextForm.theme,
      weekendEventsRaw: nextForm.weekendEvents,
      ceremonyArrivalTime: nextForm.ceremonyTime || '',
      guestCountBand: (nextForm.guestCount || '') as InitialSetupAnswers['guestCountBand'],
      plusOnePolicy: (nextForm.plusOnePolicy || '') as InitialSetupAnswers['plusOnePolicy'],
      childrenAllowed: (nextForm.childrenAllowed || '') as InitialSetupAnswers['childrenAllowed'],
      rsvpDeadline: nextForm.rsvpDeadline,
      mealChoice: (nextForm.mealChoice || '') as InitialSetupAnswers['mealChoice'],
      optionalStory: nextForm.story,
    };
    const nextProfile = applyInitialSetupAnswersToWeddingProfile(nextAnswers);
    setInitialSetupAnswers(nextAnswers);
    setWeddingProfile(nextProfile);
    return nextProfile;
  }, [formData]);

  const getStoryPrompt = () => {
    if (derivedNames.length >= 2) {
      return `Tell guests a little about ${derivedNames[0]} and ${derivedNames[1]}.`; 
    }
    return 'Tell guests how you met, what this season feels like, or what this day means to you.';
  };

  const fetchExistingSite = useCallback(async () => {
    if (!user || isDemoMode) return null;

    return fetchExistingOnboardingSite(user.id);
  }, [isDemoMode, user]);

  useEffect(() => {
    void (async () => {
      const hasLocalDraft = hasActiveOnboardingDraftSnapshot();
      if (hasLocalDraft) return;

      const data = await fetchExistingSite();
      if (data?.onboarding_answers && isWeddingProfile(data.onboarding_answers)) {
        setWeddingProfile(data.onboarding_answers);
      }
    })();
  }, [fetchExistingSite]);

  useEffect(() => {
    if (!isDemoMode || hasSeededDemoDraftRef.current) return;
    hasSeededDemoDraftRef.current = true;

    const prevFormData = initialSetupAnswersToOnboardingFormShape(initialSetupAnswers);

    hydrateProfile({
      partnerNames: prevFormData.partnerNames || getDemoPartnerNamesFallback(),
      weddingDate: prevFormData.weddingDate || demoWeddingSite.wedding_date || '',
      venueName: prevFormData.venueName || demoWeddingSite.venue_name || '',
      venueLocation: prevFormData.venueLocation || demoWeddingSite.venue_location || '',
      story: prevFormData.story || 'We met on a rainy Tuesday and never stopped choosing each other.',
      theme: prevFormData.theme || getThemeHint(),
      guestCount: prevFormData.guestCount || '50-100',
      weekendEvents: prevFormData.weekendEvents || 'Friday welcome drinks, Saturday wedding, Sunday brunch.',
      rsvpDeadline: prevFormData.rsvpDeadline || '2026-05-25',
      plusOnePolicy: prevFormData.plusOnePolicy || 'some',
      childrenAllowed: (prevFormData.childrenAllowed || 'unsure') as InitialSetupAnswers['childrenAllowed'],
      mealChoice: prevFormData.mealChoice || 'yes',
    });
  }, [hydrateProfile, initialSetupAnswers, isDemoMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const nextAnswers = { ...initialSetupAnswers, [e.target.name]: e.target.value };
    setInitialSetupAnswers(nextAnswers);
    setWeddingProfile(applyInitialSetupAnswersToWeddingProfile(nextAnswers));
    if (e.target.name === 'venueLocation' && !formData.weddingDate) {
      const parts = e.target.value.split(/\s+[—-]\s+/);
      if (parts.length >= 2) {
        hydrateProfile({ weddingDate: parts[0].trim(), venueLocation: parts.slice(1).join(' in ').trim() });
        return;
      }
    }
    hydrateProfile({ [e.target.name]: e.target.value });
  };

  const applyFollowUpAnswers = () => {
    const merged = mergeOnboardingFollowUpAnswers({
      initialSetupAnswers,
      initialSetupFollowUps,
      followUpAnswers,
      formData,
    });

    setInitialSetupAnswers(merged.initialSetupAnswers);
    setInitialSetupFollowUps(merged.initialSetupFollowUps);
    setWeddingProfile(merged.weddingProfile);
    return merged;
  };

  const handleQuickSetup = useCallback(() => {
    goToQuestionIndex(getQuestionIndexByKey(onboardingSession.nextQuestionKey));
  }, [onboardingSession.nextQuestionKey]);

  const handleOneClickStarter = async () => {
    setLoading(true);
    const fallbackNames = isDemoMode
      ? getDemoPartnerNamesFallback()
      : 'Alex & Jordan';
    const names = parsePartnerNames(formData.partnerNames || fallbackNames);
    const firstName = names[0] || 'Alex';
    const secondName = names[1] || '';

    const ok = await createWeddingSite({
      couple_name_1: firstName,
      couple_name_2: secondName,
      couple_first_name: firstName,
      couple_second_name: secondName,
      wedding_date: formData.weddingDate || demoWeddingSite.wedding_date || null,
      venue_name: formData.venueName || demoWeddingSite.venue_name || null,
      venue_location: formData.venueLocation || demoWeddingSite.venue_location || null,
      site_url: user?.email?.split('@')[0] || 'my-wedding',
      rsvp_deadline: formData.rsvpDeadline || null,
    });

    setLoading(false);
    if (ok) {
      clearSavedOnboardingDraft();
      navigate('/dashboard/builder');
    }
  };

  const saveWeddingProfileToExistingSite = async (
    answersOverride: InitialSetupAnswers = initialSetupAnswers,
    followUpsOverride = initialSetupFollowUps,
  ) => {
    if (!user || isDemoMode) return false;

    const existingSite = await fetchExistingSite();
    if (!existingSite?.id) return false;

    const { itinerarySeeds, rsvpEventSeeds, weddingProfile: derivedProfile } = buildInitialSetupDerivedOutputs(answersOverride, followUpsOverride);
    const nextWeddingData = mergeOnboardingSeedsIntoWeddingData(existingSite.wedding_data, itinerarySeeds, rsvpEventSeeds);

    try {
      await updateExistingOnboardingSite({
        siteId: existingSite.id,
        userId: user.id,
        onboardingAnswers: derivedProfile,
        weddingData: nextWeddingData,
      });
    } catch {
      toast('Couldn’t update your setup brief. Please try again.', 'error');
      return false;
    }

    await syncOnboardingEventSeeds(existingSite.id, itinerarySeeds);

    clearSavedOnboardingDraft();
    return true;
  };

  const createWeddingSite = async (data: Record<string, unknown>) => {
    const answersOverride = (data.initialSetupAnswersOverride as InitialSetupAnswers | undefined) || initialSetupAnswers;
    const followUpsOverride = (data.initialSetupFollowUpsOverride as typeof initialSetupFollowUps | undefined) || initialSetupFollowUps;
    const { weddingProfile: profile, itinerarySeeds, rsvpEventSeeds } = buildInitialSetupDerivedOutputs(answersOverride, followUpsOverride);

    if (!user) return false;

    if (isDemoMode) {
      return true;
    }

    try {
      const onboardingUpdate = buildOnboardingUpdateWithClarifying({
        coupleNames: {
          name1: String(data.couple_name_1 || ''),
          name2: String(data.couple_name_2 || ''),
        },
        planningStatus: 'guided_setup_complete',
        template: 'generated-modern-luxe',
        weddingDate: (data.wedding_date as string | null) || undefined,
        rsvpDeadline: (data.rsvp_deadline as string | null) || undefined,
        venue: (data.venue_name as string | null) || undefined,
        city: (data.venue_location as string | null) || undefined,
      });
      const nextWeddingData = {
        ...(((onboardingUpdate.wedding_data as Record<string, unknown>) || {})),
        meta: {
          ...((((onboardingUpdate.wedding_data as Record<string, unknown>) || {}).meta as Record<string, unknown>) || {}),
          onboardingEventSeeds: itinerarySeeds,
          rsvpEventSeeds,
        },
      };

      await createOnboardingWeddingSite({
        userId: user.id,
        insertRow: {
          user_id: user.id,
          couple_name_1: onboardingUpdate.couple_name_1 || data.couple_name_1 || '',
          couple_name_2: onboardingUpdate.couple_name_2 || data.couple_name_2 || '',
          couple_first_name: data.couple_first_name || null,
          couple_second_name: data.couple_second_name || null,
          wedding_date: onboardingUpdate.wedding_date || data.wedding_date || null,
          venue_name: onboardingUpdate.venue_name || data.venue_name || null,
          venue_location: data.venue_location || null,
          wedding_location: onboardingUpdate.wedding_location || data.venue_location || null,
          active_template_id: onboardingUpdate.active_template_id,
          template_id: onboardingUpdate.template_id,
          layout_config: onboardingUpdate.layout_config,
          site_slug: onboardingUpdate.site_slug,
          site_url: data.site_url || null,
          rsvp_deadline: getCreateSiteRsvpDeadline(onboardingUpdate, data),
          onboarding_answers: profile,
          wedding_data: nextWeddingData,
        },
        fallbackRow: {
          user_id: user.id,
          couple_name_1: data.couple_name_1 || '',
          couple_name_2: data.couple_name_2 || '',
          couple_first_name: data.couple_first_name || null,
          couple_second_name: data.couple_second_name || null,
          wedding_date: data.wedding_date || null,
          venue_name: data.venue_name || null,
          venue_location: data.venue_location || null,
          site_url: data.site_url || null,
          rsvp_deadline: getCreateSiteRsvpDeadline(onboardingUpdate, data),
        },
        itinerarySeeds,
      });
      return true;
    } catch {
      toast('Couldn’t create your wedding site. Please try again.', 'error');
      return false;
    }
  };

  const handleManualSetup = async () => {
    setLoading(true);
    const ok = await createWeddingSite({
      couple_name_1: 'Partner 1',
      couple_name_2: 'Partner 2',
      site_url: user?.email?.split('@')[0] || 'my-wedding',
    });
    setLoading(false);
    if (ok) {
      clearSavedOnboardingDraft();
      navigate('/dashboard');
    }
  };

  const goToQuestionIndex = (index: number) => {
    setConversationIndex(index);
    setStep(getStepForIndex(index));
  };

  const nextStep = async () => {
    if (conversationIndex < conciergeQuestions.length - 1) {
      goToQuestionIndex(conversationIndex + 1);
      return;
    }

    if (!showFollowUpReview && onboardingSession.suggestedFollowUps.length > 0) {
      setShowFollowUpReview(true);
      return;
    }

    const merged = applyFollowUpAnswers();

    setLoading(true);
    try {
      const existingSite = await fetchExistingSite();
      if (existingSite?.id) {
        const updated = await saveWeddingProfileToExistingSite(merged.initialSetupAnswers, merged.initialSetupFollowUps);
        if (updated) {
          setStep('complete');
          return;
        }
      }

      const names = parsePartnerNames(formData.partnerNames);
      const firstName = names[0] || '';
      const secondName = names[1] || '';

      const ok = await createWeddingSite({
        initialSetupAnswersOverride: merged.initialSetupAnswers,
        initialSetupFollowUpsOverride: merged.initialSetupFollowUps,
        couple_name_1: firstName,
        couple_name_2: secondName,
        couple_first_name: firstName,
        couple_second_name: secondName,
        wedding_date: formData.weddingDate || null,
        venue_name: formData.venueName || null,
        venue_location: formData.venueLocation || null,
        site_url: user?.email?.split('@')[0] || 'my-wedding',
        rsvp_deadline: formData.rsvpDeadline || null,
      });

      if (ok) {
        clearSavedOnboardingDraft();
        setStep('complete');
      }
    } catch {
      toast('Something went wrong while finishing setup. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const renderSetupChecklist = () => (
    <Card variant="bordered" padding="lg" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">Setup checklist</h3>
        <span className="text-sm font-medium text-text-secondary">{completedSetupCount}/{setupChecklist.length} complete</span>
      </div>
      <p className="mb-3 text-xs text-text-secondary">If you're moving over from another wedding platform, start with the essentials first. You can keep filling things in once the site is yours.</p>
      <div className="space-y-2">
        {setupChecklist.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-text-primary">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={item.done} readOnly className="h-4 w-4 rounded border-border" />
              <span className={item.done ? 'line-through text-text-secondary' : ''}>{item.label}</span>
            </label>
            {!item.done && (
              <button
                type="button"
                onClick={item.action}
                className="text-xs text-primary hover:text-primary-hover font-medium"
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <p className="text-text-secondary">Publishing opens after setup, once your site editor has enough detail for a first draft.</p>
        {nextSetupItem && (
          <button type="button" onClick={nextSetupItem.action} className="text-primary font-medium hover:text-primary-hover">
            Next: {nextSetupItem.label}
          </button>
        )}
      </div>
    </Card>
  );

  const renderChoice = () => (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Let's create your wedding site
        </h1>
        <p className="text-lg text-text-secondary">
          Choose the setup path that gets you to a solid first draft fastest
        </p>
        {hasSavedDraftNotice && (
          <p className="mt-3 text-sm text-primary">You have a saved draft here, so you can pick up where you left off.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card variant="bordered" padding="lg" className="hover:border-primary transition-colors cursor-pointer">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-2xl font-semibold text-text-primary mb-4">
                Quick Setup
              </h2>
              <p className="text-text-secondary mb-6">
                Answer a few questions and we will generate a strong starting draft. You can keep refining it in your wedding home before you decide to publish.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Pre-fill the main site sections from your answers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Use guided defaults instead of starting from a blank page</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Edit anything later</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <Button variant="accent" size="lg" fullWidth onClick={handleQuickSetup} disabled={loading}>
                Start guided setup
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={handleOneClickStarter} disabled={loading}>
                {loading ? 'Creating starter draft...' : 'Starter draft only (fastest)'}
              </Button>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="hover:border-primary transition-colors cursor-pointer">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-2xl font-semibold text-text-primary mb-4">
                Open the editor
              </h2>
              <p className="text-text-secondary mb-6">
                Go straight to the site editor and shape the details at your own pace.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Start with a blank canvas</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Choose and arrange each section yourself</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Complete creative freedom</span>
                </li>
              </ul>
            </div>
            <Button variant="outline" size="lg" fullWidth onClick={handleManualSetup} disabled={loading}>
              {loading ? 'Setting up...' : 'Go to site editor'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        {renderSetupChecklist()}
      </div>
    </div>
  );

  const getQuestionPreview = () => {
    switch (currentQuestion?.key) {
      case 'partnerNames':
        return formData.partnerNames.trim()
          ? `The homepage hero will introduce ${formData.partnerNames.trim()} right away, and your suggested URL becomes ${suggestedSiteSlug}.dayof.love.`
          : 'The homepage hero will introduce both of you right away.';
      case 'venueLocation':
        return formData.venueLocation.trim()
          ? `Guests will immediately see ${formData.venueLocation.trim()} in the event details.`
          : 'Location helps anchor travel details, schedule copy, and guest expectations.';
      case 'venueName':
        return formData.venueName.trim()
          ? `${formData.venueName.trim()} will be called out in the event details and story sections.`
          : 'Venue name is optional right now. We can still build a solid draft without it.';
      case 'theme':
        return `The draft styling will lean ${formData.theme || 'garden'} so the whole site feels intentional from the start. Based on what you have shared, ${getThemeHint()} looks like the best starting direction.`;
      case 'story':
        return formData.story.trim()
          ? 'Nice. We can turn that into warmer story copy instead of generic filler.'
          : `You can skip this for now, or use a quick starting angle like: ${getStoryPrompt()}`;
      case 'guestCount':
        return formData.guestCount?.trim()
          ? `We’ll use the ${formData.guestCount.trim()} guest count range to tune RSVP defaults and overall site assumptions.`
          : 'Guest count helps us tune RSVP defaults and overall site assumptions.';
      case 'plusOnePolicy':
        return formData.plusOnePolicy?.trim()
          ? `We’ll carry a ${formData.plusOnePolicy.trim()} plus-one policy into RSVP setup.`
          : 'Plus-one policy sets the RSVP defaults.';
      case 'weekendEvents':
        return formData.weekendEvents.trim()
          ? 'Nice. We can frame the weekend as an experience, not just a single ceremony.'
          : 'A quick outline helps us draft a more useful schedule and guest flow.';
      case 'rsvpDeadline':
        return formData.rsvpDeadline
          ? `Guests will see ${formData.rsvpDeadline} as the RSVP target.`
          : 'RSVP timing helps the draft feel useful for guests, not just pretty.';
      case 'mealChoice':
        return formData.mealChoice?.trim()
          ? `RSVP meal collection is set to ${formData.mealChoice.trim()}.`
          : 'Meal collection can be switched on or off here.';
      default:
        return 'Each answer tightens the draft before you ever touch the site editor.';
    }
  };

  const renderDraftProgress = () => (
    <Card variant="bordered" padding="lg">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm text-text-tertiary">Draft progress</p>
          <h3 className="text-lg font-semibold text-text-primary">We’re shaping your first draft live</h3>
        </div>
        <span className="text-sm font-medium text-primary">{conversationProgress}%</span>
      </div>
      <div className="h-2 rounded-lg bg-border overflow-hidden mb-4">
        <div className="h-full rounded-lg bg-primary transition-all" style={{ width: `${conversationProgress}%` }} />
      </div>
      <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-tertiary">Draft detail</p>
            <p className="mt-1 text-sm font-medium text-text-primary">{readiness.hasEnoughToDraft ? 'Enough detail to draft' : 'A few details would make this stronger'}</p>
          </div>
          <span className="text-sm font-semibold text-primary">{readiness.score}%</span>
        </div>
        {readiness.missingCriticalFields.length > 0 && (
          <p className="mt-2 text-xs text-text-secondary">Still needed: {readiness.missingCriticalFields.join(', ')}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {fieldStatuses.map((field) => (
            <span
              key={field.path}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${field.complete ? 'bg-surface-secondary text-text-primary border border-border-subtle' : field.requiredForDraft ? 'bg-surface text-text-secondary border border-border' : 'bg-surface text-text-secondary border border-border'}`}
            >
              {field.label}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {draftMilestones.map((milestone) => (
          <div key={milestone.id} className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${milestone.done ? 'border-primary bg-surface-secondary text-primary' : 'border-border bg-surface text-text-tertiary'}`}>
              {milestone.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="text-[10px] font-semibold">•</span>}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{milestone.title}</p>
              <p className="text-xs text-text-secondary">{milestone.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderQuestionCard = (stepLabel: string, title: string, subtitle: string) => (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card variant="bordered" padding="lg">
        <p className="text-sm text-text-tertiary mb-2">{stepLabel}</p>
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="mt-2 text-text-secondary">{subtitle}</p>
      </Card>

      {renderSetupChecklist()}
      {renderDraftProgress()}

      <Card variant="default" padding="lg" className="border border-border bg-white/90">
        {showFollowUpReview ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-text-tertiary">Optional refinement</p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary">A few smart follow-ups before we build</h3>
              <p className="mt-2 text-text-secondary">We already have enough to generate a strong baseline site. These are the highest-leverage details that would make it feel more personal.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-surface px-4 py-3 border border-border">
                  <p className="text-xs text-text-tertiary mb-1">This round</p>
                  <p className="text-sm font-medium text-text-primary">Up to {Math.min(3, remainingFollowUpBudget)} questions</p>
                </div>
                <div className="rounded-lg bg-surface px-4 py-3 border border-border">
                  <p className="text-xs text-text-tertiary mb-1">Asked so far</p>
                  <p className="text-sm font-medium text-text-primary">{answeredFollowUpCount} of 5</p>
                </div>
                <div className="rounded-lg bg-surface px-4 py-3 border border-border">
                  <p className="text-xs text-text-tertiary mb-1">When we stop</p>
                  <p className="text-sm font-medium text-text-primary">Build once it feels ready</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {onboardingSession.suggestedFollowUps.slice(0, 3).map((question, index) => (
                <div key={question.key} className="rounded-lg border border-border bg-surface px-4 py-4">
                  <p className="text-sm font-medium text-text-primary">{index + 1}. {question.variants[0]}</p>
                  <p className="mt-1 text-xs text-text-secondary">Other gentle ways to ask: {question.variants[1]} / {question.variants[2]}</p>
                  <Textarea
                    className="mt-3 min-h-[132px] rounded-lg border-border/70 bg-white/90 text-base"
                    placeholder="Optional answer"
                    value={followUpAnswers[question.key] || ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFollowUpAnswers((prev) => ({ ...prev, [question.key]: value }));
                      if (question.key.startsWith('event-location-') || question.key.startsWith('event-time-')) {
                        const prefix = question.key.startsWith('event-location-') ? 'event-location-' : 'event-time-';
                        const index = Number.parseInt(question.key.replace(prefix, ''), 10) - 1;
                        const eventKey = weddingProfile.event.structuredWeekendEvents[index]?.id || question.key;
                        setInitialSetupFollowUps((prev) => ({
                          ...prev,
                          eventLocations: question.key.startsWith('event-location-') ? { ...prev.eventLocations, [eventKey]: value } : prev.eventLocations,
                          eventTimes: question.key.startsWith('event-time-') ? { ...prev.eventTimes, [eventKey]: value } : prev.eventTimes,
                        }));
                        return;
                      }
                      if (question.key === 'venue-clarity') {
                        setInitialSetupFollowUps((prev) => ({ ...prev, venueClarification: value }));
                        return;
                      }
                      if (question.key === 'rsvp-config') {
                        setInitialSetupFollowUps((prev) => ({ ...prev, rsvpClarification: value }));
                        return;
                      }
                      if (question.key === 'story-detail') {
                        setInitialSetupFollowUps((prev) => ({ ...prev, storyClarification: value }));
                      }
                    }}
                    rows={3}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-3 border-t border-border/60 pt-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" size="lg" onClick={() => setShowFollowUpReview(false)}>Back to answers</Button>
                <Button variant="outline" size="lg" onClick={handleManualSetup} disabled={loading}>Open the editor instead</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" onClick={nextStep} disabled={loading}>
                  {loading ? 'Building...' : 'Skip these and build'}
                </Button>
                <Button variant="accent" size="lg" onClick={nextStep} disabled={loading}>
                  {loading ? 'Building...' : 'Use these answers and build'}
                </Button>
              </div>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-text-tertiary">{currentQuestion.label}</p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary">{currentQuestion.prompt}</h3>
              {currentQuestion.helper && <p className="mt-2 text-text-secondary">{currentQuestion.helper}</p>}
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-surface-secondary border border-border-subtle px-4 py-3">
                  <p className="text-xs text-text-tertiary mb-1">What this shapes</p>
                  <p className="text-sm text-text-primary">{getQuestionPreview()}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-text-tertiary mb-1">Draft guidance</p>
                  <p className="text-sm text-text-primary">Focus: {onboardingSession.currentIntent}</p>
                  <p className="mt-1 text-xs text-text-secondary">Enough detail to draft: {Math.round(onboardingSession.confidence * 100)}%</p>
                  {onboardingSession.suggestedPrompt && (
                    <p className="mt-1 text-xs text-text-secondary">Suggested next ask: {onboardingSession.suggestedPrompt}</p>
                  )}
                  {onboardingSession.suggestedFollowUps.length > 0 && (
                    <div className="mt-3 rounded-lg bg-surface-secondary border border-border-subtle px-3 py-3">
                      <p className="text-xs text-text-tertiary mb-2">Helpful follow-ups</p>
                      <ul className="space-y-2">
                        {onboardingSession.suggestedFollowUps.map((question, index) => (
                          <li key={question.key} className="text-xs text-text-secondary">
                            <span className="font-medium text-text-primary">{index + 1}.</span>{' '}
                            {question.variants[0]}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-text-tertiary">We cap follow-ups and only surface the highest-leverage missing details.</p>
                    </div>
                  )}
                </div>
                {currentQuestion.key === 'partnerNames' && (
                  <div className="rounded-lg bg-surface px-4 py-3 border border-border">
                    <p className="text-xs text-text-tertiary mb-1">Suggested URL</p>
                    <p className="text-sm font-medium text-text-primary">{suggestedSiteSlug}.dayof.love</p>
                  </div>
                )}
                {currentQuestion.key === 'theme' && getThemeHint() !== formData.theme && (
                  <div className="rounded-lg bg-surface px-4 py-3 border border-border">
                    <p className="text-xs text-text-tertiary mb-1">Suggested starting point</p>
                    <p className="text-sm text-text-primary">Based on the venue details so far, <span className="font-medium">{getThemeHint()}</span> looks like the best starting direction.</p>
                  </div>
                )}
              </div>
            </div>

            {currentQuestion.key === 'partnerLabels' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'partnerOneLabel', label: 'Your label' },
                  { key: 'partnerTwoLabel', label: 'Partner label' },
                ].map((field, index) => {
                  const parts = (formData.partnerLabels || 'none|none').split('|');
                  const value = parts[index] || 'none';
                  return (
                    <label key={field.key} className="rounded-lg border border-border bg-surface p-4">
                      <p className="mb-2 text-sm font-medium text-text-primary">{field.label}</p>
                      <select
                        className="w-full rounded-lg border border-border/70 bg-white/90 px-4 py-3 text-sm text-text-primary"
                        value={value}
                        onChange={(event) => {
                          const next = [...parts];
                          next[index] = event.target.value;
                          handleChange({ target: { name: 'partnerLabels', value: `${next[0] || 'none'}|${next[1] || 'none'}` } } as React.ChangeEvent<HTMLInputElement>);
                        }}
                      >
                        <option value="none">No label / just use names</option>
                        <option value="bride">Bride</option>
                        <option value="groom">Groom</option>
                        <option value="partner">Partner</option>
                      </select>
                    </label>
                  );
                })}
              </div>
            ) : currentQuestion.type === 'textarea' ? (
              <Textarea
                className="min-h-[132px] rounded-lg border-border/70 bg-white/90 text-base"
                name={currentQuestion.key}
                placeholder={currentQuestion.key === 'story' ? getStoryPrompt() : (currentQuestion.placeholder || '')}
                value={formData[currentQuestion.key as keyof typeof formData]}
                onChange={handleChange}
                rows={5}
              />
            ) : (
              <Input
                className="h-14 rounded-lg border-border/70 bg-white/90 text-base"
                type={currentQuestion.type === 'date' || currentQuestion.type === 'time' ? currentQuestion.type : 'text'}
                name={currentQuestion.key}
                placeholder={currentQuestion.placeholder || ''}
                value={formData[currentQuestion.key as keyof typeof formData]}
                onChange={handleChange}
              />
            )}

            <div className="flex flex-wrap justify-between gap-3 border-t border-border/60 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => goToQuestionIndex(Math.max(0, conversationIndex - 1))}
                  disabled={conversationIndex === 0}
                >
                  Back
                </Button>
                {isCurrentQuestionOptional && conversationIndex < conciergeQuestions.length - 1 && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => goToQuestionIndex(conversationIndex + 1)}
                    disabled={loading}
                  >
                    Skip for now
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" onClick={handleManualSetup} disabled={loading}>
                  Open the editor instead
                </Button>
                <Button variant="accent" size="lg" onClick={nextStep} disabled={loading}>
                  {conversationIndex >= conciergeQuestions.length - 1 ? (loading ? 'Saving...' : (readiness.hasEnoughToDraft ? 'Save brief' : 'Save draft anyway')) : 'Continue'}
                  {conversationIndex < conciergeQuestions.length - 1 && <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );

  const renderQuickStep1 = () => renderQuestionCard(
    'Step 1 of 3',
    'Start with the essentials',
    "We'll use the basics to create your first draft direction."
  );

  const renderQuickStep2 = () => renderQuestionCard(
    'Step 2 of 3',
    'Add the setting and personality',
    'This helps us shape layout and content direction intelligently.'
  );

  const renderQuickStep3 = () => renderQuestionCard(
    'Step 3 of 3',
    'Finish the first draft inputs',
    "We're using these details to create a strong starting point instead of dropping you into a blank editor."
  );


  const renderComplete = () => {
    const subdomain = getOnboardingSubdomain(formData.partnerNames);

    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-secondary border border-border-subtle rounded-lg mb-6">
          <Check className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>

        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Your starter draft is ready to shape
        </h1>
        <p className="text-lg text-text-secondary mb-4">
          We created a polished starting point from your answers. {SITE_TRUST_COPY.privateEditing}
        </p>

        <Card variant="bordered" padding="lg" className="mb-8">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-2">When you publish, your site can live at:</p>
            <p className="text-xl font-semibold text-primary break-all">{subdomain}</p>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="mb-8 text-left">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">A strong first draft is in place</p>
                <p className="text-sm text-text-secondary">Your main pages and sections are already set up</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">A design direction is already applied</p>
                <p className="text-sm text-text-secondary">{formData.theme || getThemeHint()} styling is already carrying the look</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">The draft tone is already anchored</p>
                <p className="text-sm text-text-secondary">{formData.guestCount || 'Your guest count'} and {formData.weekendEvents ? 'your weekend plans are already informing the draft.' : 'your weekend flow can be layered in next.'}</p>
              </div>
            </div>
          </div>
        </Card>

      <Card variant="bordered" padding="lg" className="mb-8 text-left">
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">Recommended next step</p>
          <p className="text-sm text-text-secondary">Bring in your guest list now so invites, RSVP events, and guest-specific links are ready to go.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="accent" size="lg" onClick={() => navigate('/dashboard/guests')}>
              Import guest CSV
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/builder')}>
              Review website first
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')}>
          Go to wedding home
        </Button>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-app p-4 py-12">
      <div className="container-custom">
        <div className="flex items-center justify-center mb-12">
          <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
          <span className="text-2xl font-semibold text-text-primary ml-2">dayof</span>
        </div>

        {step === 'choice' && renderChoice()}
        {step === 'quick-1' && renderQuickStep1()}
        {step === 'quick-2' && renderQuickStep2()}
        {step === 'quick-3' && renderQuickStep3()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  );
};
