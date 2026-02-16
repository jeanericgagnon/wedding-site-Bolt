import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, Zap } from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import { supabase } from '../../lib/supabase';

export const QuickStart: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    weddingDate: '',
    location: '',
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
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        venue_date: formData.weddingDate || null,
        wedding_location: formData.location || null,
        planning_status: 'quick_start_complete',
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
    } catch (err: any) {
      console.error('Quick start error:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Just a few quick questions
          </h1>
          <p className="text-text-secondary">
            We'll create your complete wedding site. You can add more details anytime.
          </p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <span className="text-text-secondary ml-2 font-normal">(you can change this later)</span>
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

            {error && (
              <div className="p-3 bg-error-light text-error rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Creating Your Site...' : 'Create My Wedding Site'}
            </Button>

            <button
              type="button"
              onClick={() => navigate('/onboarding/celebration')}
              className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back to options
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};
