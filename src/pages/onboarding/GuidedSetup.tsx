import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, ArrowLeft, Check, Sparkles, Palette, Layout, Image } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { fromOnboarding } from '../../lib/generateWeddingData';
import { generateInitialLayout } from '../../lib/generateInitialLayout';
import { generateWeddingSlug } from '../../lib/slugify';

type Step =
  | 'welcome'
  | 'basics'
  | 'events'
  | 'travel'
  | 'rsvp'
  | 'faq'
  | 'design'
  | 'photos'
  | 'complete';

interface FormData {
  weddingDate: string;
  venue: string;
  city: string;
  ourStory: string;
  ceremonyTime: string;
  receptionTime: string;
  attire: string;
  hotelRecommendations: string;
  parking: string;
  rsvpDeadline: string;
  mealOptions: string;
  registryLinks: string;
  customFaqs: string;
  template: string;
  colorScheme: string;
}

export const GuidedSetup: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupleNames, setCoupleNames] = useState({ name1: '', name2: '' });
  const [formData, setFormData] = useState<FormData>({
    weddingDate: '',
    venue: '',
    city: '',
    ourStory: '',
    ceremonyTime: '',
    receptionTime: '',
    attire: '',
    hotelRecommendations: '',
    parking: '',
    rsvpDeadline: '',
    mealOptions: '',
    registryLinks: '',
    customFaqs: '',
    template: 'modern',
    colorScheme: 'romantic',
  });

  const steps: Step[] = ['welcome', 'basics', 'events', 'travel', 'rsvp', 'faq', 'design', 'photos', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    const fetchWeddingSite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2, venue_date, venue_name, wedding_location')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCoupleNames({
          name1: data.couple_name_1 || '',
          name2: data.couple_name_2 || '',
        });
        setFormData(prev => ({
          ...prev,
          weddingDate: data.venue_date || '',
          venue: data.venue_name || '',
          city: data.wedding_location || '',
        }));
      }
    };

    fetchWeddingSite();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'weddingDate' && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError('Wedding date must be in the future');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const weddingData = fromOnboarding({
        partner1Name: coupleNames.name1,
        partner2Name: coupleNames.name2,
        weddingDate: formData.weddingDate || undefined,
        venueName: formData.venue || undefined,
        city: formData.city || undefined,
        ourStory: formData.ourStory || undefined,
        ceremonyTime: formData.ceremonyTime || undefined,
        receptionTime: formData.receptionTime || undefined,
        attire: formData.attire || undefined,
        hotelRecommendations: formData.hotelRecommendations || undefined,
        parking: formData.parking || undefined,
        rsvpDeadline: formData.rsvpDeadline || undefined,
        registryLinks: formData.registryLinks || undefined,
        customFaqs: formData.customFaqs || undefined,
        colorScheme: formData.colorScheme,
      });

      const layoutConfig = generateInitialLayout(formData.template, weddingData);

      const siteSlug = generateWeddingSlug(coupleNames.name1, coupleNames.name2);

      const updateData: Record<string, unknown> = {
        venue_date: formData.weddingDate || null,
        venue_name: formData.venue || null,
        wedding_location: formData.city || null,
        planning_status: 'guided_setup_complete',
        active_template_id: formData.template,
        wedding_data: weddingData,
        layout_config: layoutConfig,
        site_slug: siteSlug,
        couple_name_1: coupleNames.name1,
        couple_name_2: coupleNames.name2,
      };

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      navigate('/dashboard', {
        state: {
          showWelcome: true,
        }
      });
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                <Heart className="w-10 h-10 text-primary" fill="currentColor" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                Let's Build Your Wedding Site
              </h2>
              <p className="text-text-secondary max-w-md mx-auto">
                We'll walk through each section step-by-step. Skip anything you're not ready for - you can always come back later.
              </p>
            </div>

            <div className="bg-surface-subtle rounded-lg p-6">
              <h3 className="font-semibold text-text-primary mb-4">What we'll cover:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Wedding Basics</p>
                    <p className="text-sm text-text-secondary">Date, location, your story</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Events & Schedule</p>
                    <p className="text-sm text-text-secondary">Ceremony, reception, timeline</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Travel & Accommodations</p>
                    <p className="text-sm text-text-secondary">Hotels, parking, getting around</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">RSVP Details</p>
                    <p className="text-sm text-text-secondary">Deadline, meal choices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Registry</p>
                    <p className="text-sm text-text-secondary">Add your registry links</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">6</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">FAQ</p>
                    <p className="text-sm text-text-secondary">Common questions answered</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">7</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Template & Design</p>
                    <p className="text-sm text-text-secondary">Choose your style and colors</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">8</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Photos</p>
                    <p className="text-sm text-text-secondary">Upload your favorite images</p>
                  </div>
                </div>
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
              Let's Get Started
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>
          </div>
        );

      case 'basics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Wedding Basics</h2>
              <p className="text-text-secondary">Tell us about your big day</p>
            </div>

            <div className="p-4 bg-surface-subtle rounded-lg">
              <p className="text-sm font-medium text-text-primary mb-1">Getting married:</p>
              <p className="text-lg font-semibold text-accent">
                {coupleNames.name1} & {coupleNames.name2}
              </p>
            </div>

            <Input
              label="Wedding Date"
              type="date"
              name="weddingDate"
              value={formData.weddingDate}
              onChange={handleChange}
              helperText="Leave blank if you haven't set a date"
            />

            <Input
              label="City or Location"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., San Francisco, CA"
            />

            <Input
              label="Venue Name"
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="e.g., The Grand Hotel"
              helperText="Optional"
            />

            <Textarea
              label="Your Story (Optional)"
              name="ourStory"
              value={formData.ourStory}
              onChange={handleChange}
              placeholder="How did you meet? What's your story?"
              rows={4}
              helperText="This will appear on your home page"
            />
          </div>
        );

      case 'events':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Events & Schedule</h2>
              <p className="text-text-secondary">When are things happening?</p>
            </div>

            <Input
              label="Ceremony Time"
              type="time"
              name="ceremonyTime"
              value={formData.ceremonyTime}
              onChange={handleChange}
              helperText="Optional - skip if not ready"
            />

            <Input
              label="Reception Time"
              type="time"
              name="receptionTime"
              value={formData.receptionTime}
              onChange={handleChange}
              helperText="Optional"
            />

            <Input
              label="Dress Code / Attire"
              type="text"
              name="attire"
              value={formData.attire}
              onChange={handleChange}
              placeholder="e.g., Cocktail attire, Black tie optional"
              helperText="Optional"
            />

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Tip:</span> You can add more events and details from your dashboard later
              </p>
            </div>
          </div>
        );

      case 'travel':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Travel & Accommodations</h2>
              <p className="text-text-secondary">Help your guests get there</p>
            </div>

            <Textarea
              label="Hotel Recommendations"
              name="hotelRecommendations"
              value={formData.hotelRecommendations}
              onChange={handleChange}
              placeholder="List recommended hotels or add booking links..."
              rows={4}
              helperText="Optional - you can skip this for now"
            />

            <Textarea
              label="Parking Information"
              name="parking"
              value={formData.parking}
              onChange={handleChange}
              placeholder="Where should guests park? Any special instructions?"
              rows={3}
              helperText="Optional"
            />

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Note:</span> You can add airport info, transportation options, and local attractions from your dashboard
              </p>
            </div>
          </div>
        );

      case 'rsvp':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">RSVP Details</h2>
              <p className="text-text-secondary">Set up your RSVP page</p>
            </div>

            <Input
              label="RSVP Deadline"
              type="date"
              name="rsvpDeadline"
              value={formData.rsvpDeadline}
              onChange={handleChange}
              helperText="When do you need responses by?"
            />

            <Textarea
              label="Meal Options (Optional)"
              name="mealOptions"
              value={formData.mealOptions}
              onChange={handleChange}
              placeholder="e.g., Chicken, Beef, Vegetarian"
              rows={3}
              helperText="Leave blank if not offering meal choices"
            />

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-primary">Coming soon:</span> You'll be able to manage all RSVPs from your guest list dashboard
              </p>
            </div>
          </div>
        );


      case 'faq':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">FAQ</h2>
              <p className="text-text-secondary">Answer common questions</p>
            </div>

            <div className="p-4 bg-surface-subtle rounded-lg">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                Suggested FAQs we'll add:
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>What should I wear?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Can I bring a plus one?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Will there be parking?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Is the wedding indoors or outdoors?</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Will the ceremony and reception be at the same location?</span>
                </li>
              </ul>
            </div>

            <Textarea
              label="Add Your Own Questions (Optional)"
              name="customFaqs"
              value={formData.customFaqs}
              onChange={handleChange}
              placeholder="Add any specific questions you want to answer..."
              rows={4}
              helperText="You can edit all FAQs from your dashboard"
            />
          </div>
        );

      case 'design':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Design Your Site</h2>
              <p className="text-text-secondary">Choose your template and colors</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                <Layout className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Template Style
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'base', name: 'Base', desc: 'Clean & simple, all essentials' },
                  { id: 'modern', name: 'Modern', desc: 'Gallery-first, minimal' },
                  { id: 'editorial', name: 'Editorial', desc: 'Story-focused, elegant' },
                  { id: 'classic', name: 'Classic', desc: 'Timeless, traditional' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, template: tpl.id }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.template === tpl.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-surface-subtle rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <div className="space-y-1.5 w-full px-3">
                        <div className="h-2 bg-primary/20 rounded-full w-full" />
                        <div className="h-1.5 bg-border rounded-full w-3/4" />
                        <div className="h-4 bg-primary/10 rounded mt-2" />
                        <div className="h-1.5 bg-border rounded-full w-full" />
                        <div className="h-1.5 bg-border rounded-full w-2/3" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{tpl.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{tpl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                <Palette className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Color Palette
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Romantic', colors: ['#FFE5E5', '#FF9999', '#FF6B6B'], description: 'Soft pinks & reds' },
                  { name: 'Ocean', colors: ['#E0F7FA', '#4DD0E1', '#0097A7'], description: 'Blues & aquas' },
                  { name: 'Garden', colors: ['#F1F8E9', '#AED581', '#689F38'], description: 'Fresh greens' },
                  { name: 'Elegant', colors: ['#F5F5F5', '#9E9E9E', '#424242'], description: 'Classic neutrals' },
                  { name: 'Sunset', colors: ['#FFF3E0', '#FFB74D', '#F57C00'], description: 'Warm oranges' },
                  { name: 'Lavender', colors: ['#F3E5F5', '#BA68C8', '#7B1FA2'], description: 'Purple hues' },
                  { name: 'Custom', colors: ['#FFFFFF', '#CCCCCC', '#333333'], description: 'Create your own' },
                ].map((scheme) => (
                  <button
                    key={scheme.name}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, colorScheme: scheme.name.toLowerCase() }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.colorScheme === scheme.name.toLowerCase()
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex gap-2 mb-3">
                      {scheme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="flex-1 h-10 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-text-primary">{scheme.name}</p>
                    <p className="text-xs text-text-secondary mt-1">{scheme.description}</p>
                  </button>
                ))}
              </div>
              {formData.colorScheme === 'custom' && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-primary">Custom palette:</span> You'll be able to choose your own colors from the builder after setup
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'photos':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Add Your Photos</h2>
              <p className="text-text-secondary">Upload engagement photos or other images (optional)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                <Image className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Upload Photos
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Image className="w-16 h-16 text-text-secondary mx-auto mb-4" aria-hidden="true" />
                <p className="text-base font-medium text-text-primary mb-2">
                  Click to upload photos
                </p>
                <p className="text-sm text-text-secondary mb-4">
                  Add engagement photos, venue images, or other pictures
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg">
                  <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                  <p className="text-sm text-primary font-medium">
                    Photo upload coming soon
                  </p>
                </div>
                <p className="text-xs text-text-secondary mt-4">
                  You can add and manage photos from your dashboard
                </p>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                Tips for great photos:
              </h3>
              <ul className="space-y-1 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  Use high-resolution images (at least 1920px wide)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  Choose photos that reflect your personality
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  Mix candid and posed shots for variety
                </li>
              </ul>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/20 rounded-full mb-4">
              <Check className="w-10 h-10 text-accent" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              You're All Set!
            </h2>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              Your wedding site is ready. We've created all your pages with the information you provided. You can edit everything from your dashboard.
            </p>

            <div className="bg-surface-subtle rounded-lg p-6 text-left">
              <h3 className="font-semibold text-text-primary mb-4">What's next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Preview your site</p>
                    <p className="text-sm text-text-secondary">See how it looks to your guests</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Add your guests</p>
                    <p className="text-sm text-text-secondary">Start building your guest list</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Customize & publish</p>
                    <p className="text-sm text-text-secondary">Make it yours and share with guests</p>
                  </div>
                </li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-error-light text-error rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? 'Creating Your Site...' : 'Go to Dashboard'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-2xl">
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">
                Step {currentStepIndex} of {steps.length - 2}
              </span>
              <span className="text-sm text-text-secondary">
                {Math.round(progress)}% complete
              </span>
            </div>
            <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Card variant="default" padding="lg" className="shadow-lg">
          {renderStep()}

          {currentStep !== 'welcome' && currentStep !== 'complete' && (
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 1}
              >
                <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Skip for now
                </button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {(currentStep === 'welcome' || currentStep === 'complete') && (
          <button
            type="button"
            onClick={() => navigate('/onboarding/celebration')}
            className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors mt-4"
          >
            ← Back to options
          </button>
        )}
      </div>
    </div>
  );
};
