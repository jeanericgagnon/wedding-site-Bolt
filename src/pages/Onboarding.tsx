import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Check } from 'lucide-react';
import { Button, Input, Textarea, Select, Card } from '../components/ui';
import { supabase } from '../lib/supabase';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';
import { SITE_VISIBILITY_COPY } from '../lib/siteVisibilityCopy';
import { useAuth } from '../hooks/useAuth';
import { demoWeddingSite } from '../lib/demoData';

type OnboardingStep = 'choice' | 'quick-1' | 'quick-2' | 'quick-3' | 'complete';
type ConciergeQuestion = 'partnerNames' | 'weddingDate' | 'venueName' | 'venueLocation' | 'story' | 'ceremonyTime' | 'receptionTime' | 'rsvpDeadline' | 'registryLink' | 'theme';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [conversationIndex, setConversationIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partnerNames: '',
    weddingDate: '',
    venueName: '',
    venueLocation: '',
    story: '',
    ceremonyTime: '',
    receptionTime: '',
    rsvpDeadline: '',
    registryLink: '',
    theme: 'garden',
  });

  const conciergeQuestions: Array<{
    key: ConciergeQuestion;
    label: string;
    prompt: string;
    helper?: string;
    type?: 'text' | 'date' | 'time' | 'textarea';
    placeholder?: string;
  }> = [
    { key: 'partnerNames', label: 'Names', prompt: 'What names should we put on the site?', helper: 'Use the names exactly how you want guests to see them.', placeholder: 'Alex & Jordan' },
    { key: 'weddingDate', label: 'Date', prompt: 'What date are you getting married?', type: 'date' },
    { key: 'venueLocation', label: 'Location', prompt: 'Where is the wedding happening?', helper: 'City and state is enough to start.', placeholder: 'San Diego, CA' },
    { key: 'venueName', label: 'Venue', prompt: 'Do you already know the venue name?', helper: 'If not, you can come back later.', placeholder: 'The Garden Estate' },
    { key: 'theme', label: 'Vibe', prompt: 'What vibe should the site lean toward?', helper: 'For now, use one clear direction.', placeholder: 'Garden Classic' },
    { key: 'story', label: 'Story', prompt: 'Anything you want us to know about your story?', type: 'textarea', helper: 'A few lines is enough for a strong first draft.', placeholder: 'We met in college and...' },
    { key: 'ceremonyTime', label: 'Ceremony', prompt: 'What time does the ceremony start?', type: 'time' },
    { key: 'receptionTime', label: 'Reception', prompt: 'What time does the reception start?', type: 'time' },
    { key: 'rsvpDeadline', label: 'RSVP deadline', prompt: 'When should guests RSVP by?', type: 'date' },
    { key: 'registryLink', label: 'Registry', prompt: 'Do you already have a registry link?', helper: 'Optional for now.', placeholder: 'https://...' },
  ];

  const currentQuestion = conciergeQuestions[conversationIndex] ?? null;

  const setupChecklist = [
    {
      id: 'names',
      label: 'Add couple names',
      done: Boolean(formData.partnerNames.trim()),
      actionLabel: 'Go',
      action: () => {
        setConversationIndex(0);
        setStep('quick-1' as OnboardingStep);
      },
    },
    {
      id: 'date',
      label: 'Set wedding date',
      done: Boolean(formData.weddingDate),
      actionLabel: 'Go',
      action: () => {
        setConversationIndex(0);
        setStep('quick-1' as OnboardingStep);
      },
    },
    {
      id: 'venue',
      label: 'Add venue/address',
      done: Boolean(formData.venueName.trim() || formData.venueLocation.trim()),
      actionLabel: 'Go',
      action: () => {
        setConversationIndex(0);
        setStep('quick-1' as OnboardingStep);
      },
    },
    {
      id: 'registry',
      label: 'Add registry link or keep moving',
      done: Boolean(formData.registryLink.trim()),
      actionLabel: 'Go',
      action: () => {
        setConversationIndex(9);
        setStep('quick-3' as OnboardingStep);
      },
    },
    {
      id: 'publish',
      label: 'Publish site',
      done: step === 'complete',
      actionLabel: 'Finish setup',
      action: () => {
        setConversationIndex(9);
        setStep('quick-3' as OnboardingStep);
      },
    },
  ];

  const completedSetupCount = setupChecklist.filter(item => item.done).length;
  const nextSetupItem = setupChecklist.find(item => !item.done) ?? null;
  const conversationProgress = Math.round(((conversationIndex + 1) / conciergeQuestions.length) * 100);

  const draftMilestones = [
    {
      id: 'foundation',
      title: 'Foundation set',
      description: 'Names, date, and location are giving the site a real identity.',
      done: Boolean(formData.partnerNames.trim() && formData.weddingDate && formData.venueLocation.trim()),
    },
    {
      id: 'look-and-feel',
      title: 'Look and feel forming',
      description: 'Theme and venue details are shaping the draft direction.',
      done: Boolean(formData.theme && (formData.venueName.trim() || formData.venueLocation.trim())),
    },
    {
      id: 'guest-ready',
      title: 'Guest-ready details',
      description: 'Schedule and RSVP details are enough to make the draft useful.',
      done: Boolean(formData.ceremonyTime && formData.receptionTime && formData.rsvpDeadline),
    },
  ];


  const checkExistingSite = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('wedding_sites')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    checkExistingSite();
  }, [checkExistingSite]);

  useEffect(() => {
    if (!isDemoMode) return;

    setFormData((prev) => ({
      ...prev,
      partnerNames: prev.partnerNames || `${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`,
      weddingDate: prev.weddingDate || demoWeddingSite.wedding_date || '',
      venueName: prev.venueName || demoWeddingSite.venue_name || '',
      venueLocation: prev.venueLocation || demoWeddingSite.venue_location || '',
      story: prev.story || 'We met on a rainy Tuesday and never stopped choosing each other.',
      ceremonyTime: prev.ceremonyTime || '16:00',
      receptionTime: prev.receptionTime || '18:00',
      rsvpDeadline: prev.rsvpDeadline || '2026-05-25',
      registryLink: prev.registryLink || 'https://www.zola.com/registry/alex-and-jordan',
    }));
  }, [isDemoMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleQuickSetup = () => {
    setConversationIndex(0);
    setStep('quick-1');
  };

  const handleOneClickStarter = async () => {
    setLoading(true);
    const fallbackNames = isDemoMode
      ? `${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`
      : 'Alex & Jordan';
    const names = (formData.partnerNames || fallbackNames).split('&').map(n => n.trim());
    const firstName = names[0] || 'Alex';
    const secondName = names[1] || 'Jordan';

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
    if (ok) navigate('/dashboard/builder');
  };

  const createWeddingSite = async (data: Record<string, unknown>) => {
    if (!user) return false;

    if (isDemoMode) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('wedding_sites')
        .insert({
          user_id: user.id,
          couple_name_1: data.couple_name_1 || '',
          couple_name_2: data.couple_name_2 || '',
          couple_first_name: data.couple_first_name || null,
          couple_second_name: data.couple_second_name || null,
          wedding_date: data.wedding_date || null,
          venue_name: data.venue_name || null,
          venue_location: data.venue_location || null,
          site_url: data.site_url || null,
          rsvp_deadline: data.rsvp_deadline || null,
        });

      if (error) throw error;
      return true;
    } catch {
      alert('Failed to create wedding site. Please try again.');
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
    if (ok) navigate('/dashboard');
  };

  const nextStep = async () => {
    if (conversationIndex < conciergeQuestions.length - 1) {
      const nextIndex = conversationIndex + 1;
      setConversationIndex(nextIndex);
      if (nextIndex < 4) setStep('quick-1');
      else if (nextIndex < 7) setStep('quick-2');
      else setStep('quick-3');
      return;
    }

    setLoading(true);

    const names = formData.partnerNames.split('&').map(n => n.trim());
    const firstName = names[0] || '';
    const secondName = names[1] || names[0] || '';

    const ok = await createWeddingSite({
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

    setLoading(false);
    if (ok) setStep('complete');
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
        <p className="text-text-secondary">Publish becomes available after you finish setup and enter the dashboard/builder.</p>
        {nextSetupItem && (
          <button type="button" onClick={nextSetupItem.action} className="text-primary font-medium hover:text-primary-hover">
            Next: {nextSetupItem.label}
          </button>
        )}
      </div>
    </Card>
  );

  const renderChoice = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Let's create your wedding site
        </h1>
        <p className="text-lg text-text-secondary">
          Choose how you'd like to get started
        </p>
      </div>

      {renderSetupChecklist()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card variant="bordered" padding="lg" className="hover:border-primary transition-colors cursor-pointer">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-2xl font-semibold text-text-primary mb-4">
                Quick Setup
              </h2>
              <p className="text-text-secondary mb-6">
                Answer a few questions and we'll build your site for you. Publish in under 10 minutes.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Auto-populate all sections</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Smart defaults based on your answers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Edit anything later</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <Button variant="accent" size="lg" fullWidth onClick={handleQuickSetup} disabled={loading}>
                Start guided setup
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={handleOneClickStarter} disabled={loading}>
                {loading ? 'Creating starter site...' : 'One-click starter (fastest)'}
              </Button>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="hover:border-primary transition-colors cursor-pointer">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-2xl font-semibold text-text-primary mb-4">
                Manual Setup
              </h2>
              <p className="text-text-secondary mb-6">
                Jump straight to the builder and customize everything from scratch. Full control.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Start with a blank canvas</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Add and arrange sections manually</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-text-secondary">Complete creative freedom</span>
                </li>
              </ul>
            </div>
            <Button variant="outline" size="lg" fullWidth onClick={handleManualSetup} disabled={loading}>
              {loading ? 'Setting up...' : 'Go to Builder'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  const getQuestionPreview = () => {
    switch (currentQuestion?.key) {
      case 'partnerNames':
        return formData.partnerNames.trim()
          ? `The homepage hero will introduce ${formData.partnerNames.trim()} right away.`
          : 'The homepage hero will introduce both of you right away.';
      case 'weddingDate':
        return formData.weddingDate
          ? `We’ll use ${formData.weddingDate} in the hero, schedule, and RSVP timing.`
          : 'Your date will drive the hero, schedule framing, and RSVP timing.';
      case 'venueLocation':
        return formData.venueLocation.trim()
          ? `Guests will immediately see ${formData.venueLocation.trim()} in the event details.`
          : 'Location helps anchor travel details, schedule copy, and guest expectations.';
      case 'venueName':
        return formData.venueName.trim()
          ? `${formData.venueName.trim()} will be called out in the event details and story sections.`
          : 'Venue name helps the draft feel more real, but you can add it later.';
      case 'theme':
        return `The draft styling will lean ${formData.theme || 'garden'} so it feels intentional from the start.`;
      case 'story':
        return formData.story.trim()
          ? 'Nice — we can turn that into warmer story copy instead of generic filler.'
          : 'A few real lines here lets the story section feel human instead of templated.';
      case 'ceremonyTime':
        return formData.ceremonyTime
          ? `Ceremony timing will show as ${formData.ceremonyTime} in the schedule draft.`
          : 'Ceremony time helps us create a useful event schedule.';
      case 'receptionTime':
        return formData.receptionTime
          ? `Reception timing will show as ${formData.receptionTime} in the schedule draft.`
          : 'Reception time rounds out the guest-facing schedule.';
      case 'rsvpDeadline':
        return formData.rsvpDeadline
          ? `Guests will see ${formData.rsvpDeadline} as the RSVP target.`
          : 'RSVP timing helps the draft feel operational, not just pretty.';
      case 'registryLink':
        return formData.registryLink.trim()
          ? 'Nice — registry can be live in the first draft instead of added later.'
          : 'No problem if this is empty. Registry can stay optional for now.';
      default:
        return 'Each answer tightens the draft before you ever touch the builder.';
    }
  };

  const renderDraftProgress = () => (
    <Card variant="bordered" padding="lg">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Draft progress</p>
          <h3 className="text-lg font-semibold text-text-primary">We’re shaping your first draft live</h3>
        </div>
        <span className="text-sm font-medium text-primary">{conversationProgress}%</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden mb-4">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${conversationProgress}%` }} />
      </div>
      <div className="space-y-3">
        {draftMilestones.map((milestone) => (
          <div key={milestone.id} className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${milestone.done ? 'border-success bg-success-light text-success' : 'border-border bg-surface text-text-tertiary'}`}>
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
        <p className="text-xs uppercase tracking-[0.22em] text-text-tertiary mb-2">{stepLabel}</p>
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="mt-2 text-text-secondary">{subtitle}</p>
      </Card>

      {renderSetupChecklist()}
      {renderDraftProgress()}

      <Card variant="default" padding="lg">
        {currentQuestion && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{currentQuestion.label}</p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary">{currentQuestion.prompt}</h3>
              {currentQuestion.helper && <p className="mt-2 text-text-secondary">{currentQuestion.helper}</p>}
              <div className="mt-4 rounded-2xl bg-primary-light/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-primary mb-1">What this shapes</p>
                <p className="text-sm text-text-primary">{getQuestionPreview()}</p>
              </div>
            </div>

            {currentQuestion.type === 'textarea' ? (
              <Textarea
                name={currentQuestion.key}
                placeholder={currentQuestion.placeholder || ''}
                value={formData[currentQuestion.key]}
                onChange={handleChange}
                rows={5}
              />
            ) : (
              <Input
                type={currentQuestion.type === 'date' || currentQuestion.type === 'time' ? currentQuestion.type : 'text'}
                name={currentQuestion.key}
                placeholder={currentQuestion.placeholder || ''}
                value={formData[currentQuestion.key]}
                onChange={handleChange}
              />
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setConversationIndex((prev) => Math.max(0, prev - 1))}
                disabled={conversationIndex === 0}
              >
                Back
              </Button>
              <Button variant="accent" size="lg" onClick={nextStep} disabled={loading}>
                {conversationIndex >= conciergeQuestions.length - 1 ? (loading ? 'Creating...' : 'Create My Site') : 'Continue'}
                {conversationIndex < conciergeQuestions.length - 1 && <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        )}
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
    "We're using these details to create a strong starting point instead of dropping you into a blank builder."
  );


  const renderComplete = () => {
    const names = formData.partnerNames.split('&').map(n => n.trim());
    const firstName = names[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const secondName = names[1]?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const subdomain = `${firstName}and${secondName}.dayof.love`;

    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-success-light rounded-full mb-6">
          <Check className="w-10 h-10 text-success" aria-hidden="true" />
        </div>

        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Your website is ready to shape
        </h1>
        <p className="text-lg text-text-secondary mb-4">
          We created a polished starting point from your answers. ${SITE_TRUST_COPY.privateEditing}
        </p>

        <Card variant="bordered" padding="lg" className="mb-8">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-2">Your website can live at:</p>
            <p className="text-xl font-semibold text-primary break-all">{subdomain}</p>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="mb-8 text-left">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">A strong first draft is in place</p>
                <p className="text-sm text-text-secondary">Your main pages and sections are already set up</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">A design direction is already applied</p>
                <p className="text-sm text-text-secondary">{formData.theme} styling is already carrying the look</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">You can refine before sharing</p>
                <p className="text-sm text-text-secondary">Edit any section, add more detail, or publish when it feels right</p>
              </div>
            </div>
          </div>
        </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="accent" size="lg" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/builder')}>
          Review website
        </Button>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-accent-light p-4 py-12">
      <div className="container-custom">
        <div className="flex items-center justify-center mb-12">
          <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
          <span className="text-2xl font-semibold text-text-primary ml-2">WeddingSite</span>
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
