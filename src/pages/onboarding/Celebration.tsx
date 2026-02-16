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

  const handleManualSetup = () => {
    navigate('/onboarding');
  };

  const handleSetupLater = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-accent-light to-background p-4 relative overflow-hidden">
      {showConfetti && <ConfettiEffect />}

      <div className="w-full max-w-3xl relative z-10">
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
              Your wedding site is ready to go!
            </p>
          )}

          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Your account is all set up. Now, let's bring your wedding vision to life.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Card
            variant="default"
            padding="lg"
            className="hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-accent"
            onClick={handleManualSetup}
          >
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-3">
                  Start Setup Now
                </h2>
                <p className="text-text-secondary mb-4">
                  Walk through our guided setup to create your perfect wedding site. We'll help you add all the details your guests need.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Add your story and photos</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Set up your schedule and venue</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                    <span>Customize your site's look</span>
                  </li>
                </ul>
              </div>
              <Button variant="accent" size="lg" fullWidth>
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </div>
          </Card>

          <Card
            variant="default"
            padding="lg"
            className="hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-primary"
            onClick={handleSetupLater}
          >
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-3">
                  Setup Later
                </h2>
                <p className="text-text-secondary mb-4">
                  Skip the setup for now and explore your dashboard. You can add details whenever you're ready.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Explore all features at your own pace</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Come back to setup anytime</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span>Jump straight to what you need</span>
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
