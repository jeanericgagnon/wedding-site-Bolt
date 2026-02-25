import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { Button, Card } from '../../components/ui';

interface LocationState {
  weddingDate?: string;
  coupleNames?: string;
}

export const Celebration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [showConfetti, setShowConfetti] = useState(true);

  const calculateDaysUntil = (weddingDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilWedding = state?.weddingDate ? calculateDaysUntil(state.weddingDate) : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleQuickStart = () => {
    navigate('/onboarding/quick-start');
  };

  const handleGuidedSetup = () => {
    navigate('/onboarding/guided');
  };

  const handleManualSetup = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-accent-light to-background p-4 relative overflow-hidden">
      {showConfetti && <ConfettiEffect />}

      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-accent/20 rounded-full mb-6 animate-bounce">
            <Heart className="w-12 h-12 text-accent" fill="currentColor" aria-hidden="true" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 animate-fade-in">
            Congratulations!
          </h1>

          {daysUntilWedding !== null && daysUntilWedding > 0 && (
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-accent/10 rounded-full mb-6 animate-slide-up">
              <Calendar className="w-8 h-8 text-accent" aria-hidden="true" />
              <div className="text-left">
                <div className="text-4xl font-bold text-accent">{daysUntilWedding}</div>
                <div className="text-sm text-text-secondary">days until the big day!</div>
              </div>
            </div>
          )}

          {daysUntilWedding !== null && daysUntilWedding <= 0 && (
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-accent/10 rounded-full mb-6 animate-slide-up">
              <Sparkles className="w-8 h-8 text-accent" aria-hidden="true" />
              <div className="text-2xl font-semibold text-accent">
                Your big day is here!
              </div>
            </div>
          )}

          {!state?.weddingDate && (
            <p className="text-xl text-text-secondary mb-6">
              You're set up — now choose how you want to build and publish your site.
            </p>
          )}

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-2">
            Your account is all set up. Choose how you'd like to build your wedding site:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
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
                  1-Minute Quick Start
                </h2>
                <p className="text-xs text-accent font-medium mb-3">Minimum viable publish</p>
                <p className="text-text-secondary text-sm mb-4">
                  Answer 4 quick questions and get a complete site with all pages ready to share.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Names & date only</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>All pages created</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Fill details later</span>
                  </li>
                </ul>
              </div>
              <Button variant="accent" size="lg" fullWidth>
                Quick Start
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
                  Guided Setup
                </h2>
                <p className="text-xs text-primary font-medium mb-3">5-10 minutes, step-by-step</p>
                <p className="text-text-secondary text-sm mb-4">
                  Fill each section as you go. Skip what you don't need.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Question by question</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>See progress as you go</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Skip optional parts</span>
                  </li>
                </ul>
              </div>
              <Button variant="primary" size="lg" fullWidth>
                Start Guided Setup
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
                  I'll Edit Manually
                </h2>
                <p className="text-xs text-text-secondary font-medium mb-3">For control freaks & planners</p>
                <p className="text-text-secondary text-sm mb-4">
                  Jump straight to your dashboard and build everything yourself.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                    <span>Full control from start</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                    <span>No guided questions</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary"></div>
                    <span>Direct to dashboard</span>
                  </li>
                </ul>
              </div>
              <Button variant="outline" size="lg" fullWidth>
                Go to Dashboard
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
