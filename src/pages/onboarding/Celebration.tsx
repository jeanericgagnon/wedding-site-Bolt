import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { clearAllOnboardingContinuationState } from '../../lib/onboardingContinuationCleanup';
import { buildQuickStartEntryPath } from '../../lib/quickStartContinuation';

interface LocationState {
  weddingDate?: string;
  coupleNames?: string;
}

const normalizeCelebrationWeddingDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === trimmed ? `${trimmed}T00:00:00Z` : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
};

export const Celebration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [showConfetti, setShowConfetti] = useState(true);

  const calculateDaysUntil = (weddingDate: string): number | null => {
    const normalizedWeddingDate = normalizeCelebrationWeddingDate(weddingDate);
    if (!normalizedWeddingDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const wedding = new Date(normalizedWeddingDate);
    wedding.setHours(0, 0, 0, 0);
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilWedding = state?.weddingDate ? calculateDaysUntil(state.weddingDate) : null;

  useEffect(() => {
    clearAllOnboardingContinuationState();
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleQuickStart = () => {
    navigate(buildQuickStartEntryPath());
  };

  const handleGuidedSetup = () => {
    navigate('/onboarding?bypassPayment=1');
  };

  const handleManualSetup = () => {
    navigate('/dashboard?bypassPayment=1');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-accent-light to-background p-4 relative overflow-hidden">
      {showConfetti && <ConfettiEffect />}

      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-accent/20 rounded-full mb-6 animate-bounce">
            <Heart className="w-12 h-12 text-accent" fill="currentColor" aria-hidden="true" />
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-text-primary mb-4 animate-fade-in leading-tight">
            Congratulations!
          </h1>

          {daysUntilWedding !== null && daysUntilWedding > 0 && (
            <div className="inline-flex items-center gap-3 px-5 md:px-8 py-3 md:py-4 bg-accent/10 rounded-full mb-6 animate-slide-up max-w-full">
              <Calendar className="w-8 h-8 text-accent" aria-hidden="true" />
              <div className="text-left">
                <div className="text-4xl font-bold text-accent">{daysUntilWedding}</div>
                <div className="text-sm text-text-secondary">days until the big day!</div>
              </div>
            </div>
          )}

          {daysUntilWedding !== null && daysUntilWedding <= 0 && (
            <div className="inline-flex items-center gap-3 px-5 md:px-8 py-3 md:py-4 bg-accent/10 rounded-full mb-6 animate-slide-up max-w-full">
              <Sparkles className="w-8 h-8 text-accent" aria-hidden="true" />
              <div className="text-2xl font-semibold text-accent">
                Your big day is here!
              </div>
            </div>
          )}

          {!state?.weddingDate && (
            <p className="text-xl text-text-secondary mb-6">
              You’re set up — now choose how you want to shape and launch your website.
            </p>
          )}

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-2">
            Your account is ready. Choose the fastest way to get your wedding website where you want it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-10 md:mt-12">
          <Card
            variant="default"
            padding="lg"
            className="hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-accent"
            onClick={handleQuickStart}
          >
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">
                  AI-assisted setup
                </h2>
                <p className="text-xs text-accent font-medium mb-3">Fastest path to a draft with AI help</p>
                <p className="text-text-secondary text-sm mb-4">
                  Launch the AI-assisted setup flow and let it help shape your first draft fast.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>AI-assisted first draft</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Get a strong first draft quickly</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Refine details later</span>
                  </li>
                </ul>
              </div>
              <Button variant="accent" size="lg" fullWidth>
                Start AI-assisted setup
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </Card>

          <Card
            variant="default"
            padding="lg"
            className="hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-primary"
            onClick={handleGuidedSetup}
          >
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">
                  Guided setup
                </h2>
                <p className="text-xs text-primary font-medium mb-3">Current structured setup flow</p>
                <p className="text-text-secondary text-sm mb-4">
                  Use the current structured onboarding flow with more control and visible progress.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Current onboarding flow</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Step by step answers</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Skip optional parts</span>
                  </li>
                </ul>
              </div>
              <Button variant="primary" size="lg" fullWidth>
                Start guided setup
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </Card>

          <Card
            variant="default"
            padding="lg"
            className="hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-border-hover"
            onClick={handleManualSetup}
          >
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <div className="w-12 h-12 bg-surface-subtle rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-text-secondary" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">
                  Edit manually
                </h2>
                <p className="text-xs text-text-secondary font-medium mb-3">Start directly in the dashboard</p>
                <p className="text-text-secondary text-sm mb-4">
                  Jump straight into the editor and handle every detail yourself.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                    <span>Full control from the start</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                    <span>No guided steps</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                    <span>Go straight to the dashboard</span>
                  </li>
                </ul>
              </div>
              <Button variant="outline" size="lg" fullWidth>
                Open dashboard
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ConfettiEffect: React.FC = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 2,
    color: ['#FF6B9D', '#C44569', '#FFA07A', '#98D8C8', '#6C5CE7', '#A29BFE'][Math.floor(Math.random() * 6)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            top: '-10px',
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
};
