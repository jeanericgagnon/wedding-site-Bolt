import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, Calendar } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import confetti from 'canvas-confetti';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [coupleName, setCoupleName] = useState('');

  useEffect(() => {
    const fetchWeddingDetails = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wedding } = await supabase
        .from('wedding_sites')
        .select('venue_date, couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wedding) {
        setCoupleName(`${wedding.couple_name_1} & ${wedding.couple_name_2}`);

        if (wedding.venue_date) {
          const weddingDate = new Date(wedding.venue_date);
          const today = new Date();
          const diffTime = weddingDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysUntil(diffDays);
        }
      }
    };

    fetchWeddingDetails();
  }, []);

  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleManualSetup = () => {
    navigate('/onboarding/status');
  };

  const handleSetupLater = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white mb-4 animate-bounce">
            <Heart className="w-10 h-10 fill-current" />
          </div>

          <h1 className="text-5xl font-bold text-text-primary">
            Welcome to Your Wedding Journey!
          </h1>

          <p className="text-xl text-text-secondary max-w-xl mx-auto">
            We're so excited to help you plan your special day. Let's make it unforgettable!
          </p>

          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Your wedding planning hub is ready</span>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <Card className="p-8 space-y-6 bg-white/80 backdrop-blur-sm border-2 border-primary/20">
          {daysUntil !== null && daysUntil > 0 && (
            <div className="text-center p-6 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-primary/20 mb-6">
              <p className="text-sm text-text-secondary mb-2">The Big Day</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-primary">{daysUntil}</span>
                <span className="text-xl text-text-secondary">{daysUntil === 1 ? 'day' : 'days'} to go!</span>
              </div>
              {coupleName && (
                <p className="text-sm text-text-secondary mt-2">
                  {coupleName}
                </p>
              )}
            </div>
          )}

          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary">
              Let's Get Started
            </h2>
            <p className="text-text-secondary">
              Choose how you'd like to begin your wedding planning journey
            </p>
          </div>

          <div className="grid gap-4">
            <button
              onClick={handleManualSetup}
              className="group p-6 rounded-xl border-2 border-border hover:border-primary bg-surface hover:bg-primary/5 transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    Set Up My Wedding Details
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Tell us about your venue, date, and guest list. This helps us personalize your experience and unlock all features.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleSetupLater}
              className="group p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-surface hover:bg-surface-subtle transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-text-tertiary/10 group-hover:bg-text-tertiary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Heart className="w-6 h-6 text-text-tertiary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    I'll Set This Up Later
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Skip for now and explore the dashboard. You can always add your wedding details later from settings.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-text-tertiary text-center">
              You can update these details anytime from your dashboard
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
