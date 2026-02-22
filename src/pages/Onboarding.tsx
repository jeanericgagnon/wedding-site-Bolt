import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Check } from 'lucide-react';
import { Button, Input, Textarea, Select, Card } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { demoWeddingSite } from '../lib/demoData';

type OnboardingStep = 'choice' | 'quick-1' | 'quick-2' | 'quick-3' | 'complete';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('choice');
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

  const setupChecklist = [
    {
      id: 'names',
      label: 'Add couple names',
      done: Boolean(formData.partnerNames.trim()),
      actionLabel: 'Go',
      action: () => setStep('quick-1' as OnboardingStep),
    },
    {
      id: 'date',
      label: 'Set wedding date',
      done: Boolean(formData.weddingDate),
      actionLabel: 'Go',
      action: () => setStep('quick-1' as OnboardingStep),
    },
    {
      id: 'venue',
      label: 'Add venue/address',
      done: Boolean(formData.venueName.trim() || formData.venueLocation.trim()),
      actionLabel: 'Go',
      action: () => setStep('quick-1' as OnboardingStep),
    },
    {
      id: 'registry',
      label: 'Add registry link',
      done: Boolean(formData.registryLink.trim()),
      actionLabel: 'Go',
      action: () => setStep('quick-3' as OnboardingStep),
    },
    {
      id: 'publish',
      label: 'Publish site',
      done: step === 'complete',
      actionLabel: 'Finish setup',
      action: () => setStep('quick-3' as OnboardingStep),
    },
  ];

  const completedSetupCount = setupChecklist.filter(item => item.done).length;
  const nextSetupItem = setupChecklist.find(item => !item.done) ?? null;

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

    await createWeddingSite({
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
    navigate('/dashboard/builder');
  };

  const createWeddingSite = async (data: Record<string, unknown>) => {
    if (!user) return;

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
    } catch {
      alert('Failed to create wedding site. Please try again.');
    }
  };

  const handleManualSetup = async () => {
    setLoading(true);
    await createWeddingSite({
      couple_name_1: 'Partner 1',
      couple_name_2: 'Partner 2',
      site_url: user?.email?.split('@')[0] || 'my-wedding',
    });
    setLoading(false);
    navigate('/dashboard');
  };

  const nextStep = async () => {
    if (step === 'quick-1') {
      setStep('quick-2');
    } else if (step === 'quick-2') {
      setStep('quick-3');
    } else if (step === 'quick-3') {
      setLoading(true);

      const names = formData.partnerNames.split('&').map(n => n.trim());
      const firstName = names[0] || '';
      const secondName = names[1] || names[0] || '';

      await createWeddingSite({
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
      setStep('complete');
    }
  };

  const renderSetupChecklist = () => (
    <Card variant="bordered" padding="lg" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">Setup checklist</h3>
        <span className="text-sm font-medium text-text-secondary">{completedSetupCount}/{setupChecklist.length} complete</span>
      </div>
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

  const renderQuickStep1 = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-primary rounded-full" />
          <div className="flex-1 h-2 bg-border rounded-full" />
          <div className="flex-1 h-2 bg-border rounded-full" />
        </div>
        <p className="text-sm text-text-secondary">Step 1 of 3</p>
      </div>

      <h1 className="text-3xl font-bold text-text-primary mb-2">The basics</h1>
      <p className="text-text-secondary mb-8">Tell us about your big day</p>

      {renderSetupChecklist()}

      <Card variant="default" padding="lg">
        <div className="space-y-6">
          <Input
            label="Partner names"
            name="partnerNames"
            placeholder="Alex & Jordan"
            value={formData.partnerNames}
            onChange={handleChange}
            helperText="How you'd like to be referred to"
            required
          />

          <Input
            label="Wedding date"
            type="date"
            name="weddingDate"
            value={formData.weddingDate}
            onChange={handleChange}
            required
          />

          <Input
            label="Venue name"
            name="venueName"
            placeholder="The Garden Estate"
            value={formData.venueName}
            onChange={handleChange}
            required
          />

          <Input
            label="Venue location"
            name="venueLocation"
            placeholder="San Francisco, CA"
            value={formData.venueLocation}
            onChange={handleChange}
            helperText="City and state"
            required
          />

          <div className="flex justify-end pt-4">
            <Button variant="accent" size="lg" onClick={nextStep}>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderQuickStep2 = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-primary rounded-full" />
          <div className="flex-1 h-2 bg-primary rounded-full" />
          <div className="flex-1 h-2 bg-border rounded-full" />
        </div>
        <p className="text-sm text-text-secondary">Step 2 of 3</p>
      </div>

      <h1 className="text-3xl font-bold text-text-primary mb-2">Your story and schedule</h1>
      <p className="text-text-secondary mb-8">Share what makes you two special</p>

      {renderSetupChecklist()}

      <Card variant="default" padding="lg">
        <div className="space-y-6">
          <Textarea
            label="Your story"
            name="story"
            placeholder="Tell guests how you met, your journey together, or what this day means to you..."
            value={formData.story}
            onChange={handleChange}
            rows={5}
            helperText="This will appear on your site's story section"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Ceremony time"
              type="time"
              name="ceremonyTime"
              value={formData.ceremonyTime}
              onChange={handleChange}
              required
            />

            <Input
              label="Reception time"
              type="time"
              name="receptionTime"
              value={formData.receptionTime}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="RSVP deadline"
            type="date"
            name="rsvpDeadline"
            value={formData.rsvpDeadline}
            onChange={handleChange}
            helperText="When should guests RSVP by?"
            required
          />

          <div className="flex justify-between pt-4">
            <Button variant="ghost" size="lg" onClick={() => setStep('quick-1')}>
              Back
            </Button>
            <Button variant="accent" size="lg" onClick={nextStep}>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderQuickStep3 = () => (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-primary rounded-full" />
          <div className="flex-1 h-2 bg-primary rounded-full" />
          <div className="flex-1 h-2 bg-primary rounded-full" />
        </div>
        <p className="text-sm text-text-secondary">Step 3 of 3</p>
      </div>

      <h1 className="text-3xl font-bold text-text-primary mb-2">Final touches</h1>
      <p className="text-text-secondary mb-8">Pick a theme and add optional details</p>

      {renderSetupChecklist()}

      <Card variant="default" padding="lg">
        <div className="space-y-6">
          <Select
            label="Choose a theme"
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            options={[
              { value: 'garden', label: 'Garden Classic' },
              { value: 'desert', label: 'Desert Sunset' },
              { value: 'lavender', label: 'Lavender Fields' },
              { value: 'coastal', label: 'Coastal Breeze' },
              { value: 'rustic', label: 'Rustic Charm' },
            ]}
          />

          <Input
            label="Registry link"
            type="url"
            name="registryLink"
            placeholder="https://registry.example.com/yournames"
            value={formData.registryLink}
            onChange={handleChange}
            helperText="Optional: Link to your gift registry"
          />

          <div className="flex justify-between pt-4">
            <Button variant="ghost" size="lg" onClick={() => setStep('quick-2')}>
              Back
            </Button>
            <Button variant="accent" size="lg" onClick={nextStep} disabled={loading}>
              {loading ? 'Creating...' : 'Create My Site'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
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
          Your site is ready!
        </h1>
        <p className="text-lg text-text-secondary mb-4">
          We've created a beautiful wedding site based on your answers. You can preview, edit, and publish it now.
        </p>

        <Card variant="bordered" padding="lg" className="mb-8">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-2">Your wedding site will be available at:</p>
            <p className="text-xl font-semibold text-primary break-all">{subdomain}</p>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="mb-8 text-left">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">All sections populated</p>
                <p className="text-sm text-text-secondary">Hero, Story, Schedule, RSVP, and more</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">Theme applied</p>
                <p className="text-sm text-text-secondary">{formData.theme} color palette and styling</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-primary">Ready to customize</p>
                <p className="text-sm text-text-secondary">Edit any section or add new content</p>
              </div>
            </div>
          </div>
        </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="accent" size="lg" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/builder')}>
          Preview Site
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
