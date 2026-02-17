import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, Zap, ArrowRight, ArrowLeft, Palette, Layout, Image } from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { fromOnboarding } from '../../lib/generateWeddingData';
import { generateInitialLayout } from '../../lib/generateInitialLayout';
import { generateWeddingSlug } from '../../lib/slugify';

type Step = 'basics' | 'style';

export const QuickStart: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    weddingDate: '',
    location: '',
    template: 'modern',
    colorScheme: 'romantic',
  });
  const [coupleNames, setCoupleNames] = useState({ name1: '', name2: '' });

  useEffect(() => {
    const fetchWeddingSite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCoupleNames({
          name1: data.couple_name_1 || '',
          name2: data.couple_name_2 || '',
        });
      }
    };

    fetchWeddingSite();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setCurrentStep('style');
  };

  const handleBack = () => {
    setCurrentStep('basics');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const weddingData = fromOnboarding({
        partner1Name: coupleNames.name1,
        partner2Name: coupleNames.name2,
        weddingDate: formData.weddingDate || undefined,
        location: formData.location || undefined,
        template: formData.template,
        colorScheme: formData.colorScheme,
      });

      const layoutConfig = generateInitialLayout(formData.template, weddingData);

      const siteSlug = generateWeddingSlug(coupleNames.name1, coupleNames.name2);

      const updateData: Record<string, unknown> = {
        venue_date: formData.weddingDate || null,
        wedding_location: formData.location || null,
        planning_status: 'quick_start_complete',
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
      console.error('Quick start error:', err);
      setError((err as Error).message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">The Basics</h2>
        <p className="text-text-secondary">Just the essentials to get started</p>
      </div>

      <div className="p-4 bg-surface-subtle rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-text-primary">Your names:</p>
          <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-accent">
          {coupleNames.name1} & {coupleNames.name2}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Wedding Date
          <span className="text-text-secondary ml-2 font-normal">(optional)</span>
        </label>
        <Input
          type="date"
          name="weddingDate"
          value={formData.weddingDate}
          onChange={handleChange}
          placeholder="Select date or leave blank for TBD"
        />
        <p className="text-xs text-text-secondary mt-2">
          Leave blank if you haven't set a date yet
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          City or Venue Name
          <span className="text-text-secondary ml-2 font-normal">(optional)</span>
        </label>
        <Input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g., San Francisco or The Grand Hotel"
        />
        <p className="text-xs text-text-secondary mt-2">
          Just give us a general location or venue name
        </p>
      </div>

      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          What we'll create for you:
        </h3>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            Home page with your story
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            Wedding day information & schedule
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            Travel & accommodations
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            RSVP page
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            Registry
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            FAQ section
          </li>
        </ul>
        <p className="text-xs text-primary mt-3 font-medium">
          All pages will have "coming soon" placeholders you can fill in later
        </p>
      </div>

      <Button
        variant="accent"
        size="lg"
        fullWidth
        onClick={handleNext}
      >
        Continue to Style
        <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
      </Button>
    </div>
  );

  const renderStyleStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Choose Your Style</h2>
        <p className="text-text-secondary">Pick a look for your site (you can change this later)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          <Layout className="w-4 h-4 inline mr-2" aria-hidden="true" />
          Template
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'modern', name: 'Modern', desc: 'Gallery-first, minimal' },
            { id: 'classic', name: 'Classic', desc: 'Timeless, traditional' },
            { id: 'editorial', name: 'Editorial', desc: 'Story-focused, elegant' },
            { id: 'base', name: 'Base', desc: 'Clean & simple' },
          ].map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, template: tpl.id }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.template === tpl.id
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="aspect-[3/4] bg-surface-subtle rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                <div className="space-y-1.5 w-full px-3">
                  <div className="h-2 bg-accent/20 rounded-full w-full" />
                  <div className="h-1.5 bg-border rounded-full w-3/4" />
                  <div className="h-4 bg-accent/10 rounded mt-1" />
                  <div className="h-1.5 bg-border rounded-full w-full" />
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
          Color Scheme
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Romantic', colors: ['#FFE5E5', '#FF9999', '#FF6B6B'] },
            { name: 'Ocean', colors: ['#E0F7FA', '#4DD0E1', '#0097A7'] },
            { name: 'Garden', colors: ['#F1F8E9', '#AED581', '#689F38'] },
            { name: 'Elegant', colors: ['#F5F5F5', '#9E9E9E', '#424242'] },
            { name: 'Custom', colors: ['#FFFFFF', '#CCCCCC', '#333333'] },
          ].map((scheme) => (
            <button
              key={scheme.name}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, colorScheme: scheme.name.toLowerCase() }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.colorScheme === scheme.name.toLowerCase()
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="flex gap-2 mb-2">
                {scheme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-text-primary">{scheme.name}</p>
              {scheme.name === 'Custom' && (
                <p className="text-xs text-text-secondary mt-1">Customize later</p>
              )}
            </button>
          ))}
        </div>
        {formData.colorScheme === 'custom' && (
          <p className="text-xs text-accent mt-2 font-medium">
            You can customize your color palette from the builder after completing setup
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          <Image className="w-4 h-4 inline mr-2" aria-hidden="true" />
          Upload Photos (Optional)
        </label>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
          <Image className="w-12 h-12 text-text-secondary mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-text-primary mb-1">
            Click to upload photos
          </p>
          <p className="text-xs text-text-secondary">
            Add your engagement photos or other images
          </p>
          <p className="text-xs text-accent mt-3 font-medium">
            Photo upload coming soon - you can add photos from your dashboard
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error-light text-error rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          className="flex-1"
        >
          <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
          Back
        </Button>
        <Button
          variant="accent"
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Creating...' : 'Create My Site'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">WeddingSite</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-4">
            <Zap className="w-5 h-5 text-accent" aria-hidden="true" />
            <span className="text-sm font-medium text-accent">1-Minute Quick Start</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {currentStep === 'basics' ? 'Just a few quick questions' : 'Choose your style'}
          </h1>
          <p className="text-text-secondary">
            {currentStep === 'basics'
              ? "We'll create your complete wedding site. You can add more details anytime."
              : 'Pick a template and colors that match your vision'}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">
              Step {currentStep === 'basics' ? '1' : '2'} of 2
            </span>
            <span className="text-sm text-text-secondary">
              {currentStep === 'basics' ? '50' : '100'}% complete
            </span>
          </div>
          <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: currentStep === 'basics' ? '50%' : '100%' }}
            />
          </div>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          {currentStep === 'basics' ? renderBasicsStep() : renderStyleStep()}

          <button
            type="button"
            onClick={() => navigate('/onboarding/celebration')}
            className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors mt-6"
          >
            ← Back to options
          </button>
        </Card>
      </div>
    </div>
  );
};
