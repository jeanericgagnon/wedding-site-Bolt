import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { buildOnboardingUpdateData } from '../../lib/onboardingMapper';

type Question = {
  id: 'names' | 'title' | 'date' | 'location';
  question: string;
  type: 'text' | 'choice';
  placeholder?: string;
  choices?: string[];
};

const questions: Question[] = [
  {
    id: 'names',
    question: 'What are your names?',
    type: 'text',
    placeholder: 'e.g. Eric & Kara',
  },
  {
    id: 'title',
    question: 'How should we refer to you on the site?',
    type: 'choice',
    choices: ['Just our names', 'Bride & Groom', 'Bride & Bride', 'Groom & Groom'],
  },
  {
    id: 'date',
    question: 'When is the big day?',
    type: 'text',
    placeholder: 'e.g. January 17, 2027',
  },
  {
    id: 'location',
    question: 'Where will it be?',
    type: 'text',
    placeholder: 'e.g. Sayulita, Mexico',
  },
];

const PAGE_BG = '#FAF9F7';
const TEXT = '#2B2B2B';
const MUTED = '#A0A0A0';
const TRANSCRIPT = '#B0B0B0';
const TRANSCRIPT_VALUE = '#909090';
const WARM = '#8B7355';
const SOFT = '#F5F4F2';
const SOFT_HOVER = '#EEEDEB';
const BORDER = '#E0DED9';

export const QuickStart: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;

  useEffect(() => {
    const fetchWeddingSite = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2, wedding_date, venue_name, location')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const seededNames = [data.couple_name_1, data.couple_name_2].filter(Boolean).join(' & ');
      const seededAnswers: Record<string, string> = {
        ...(seededNames ? { names: seededNames } : {}),
        ...(data.wedding_date ? { date: data.wedding_date } : {}),
        ...((data.venue_name || data.location) ? { location: data.venue_name || data.location } : {}),
      };

      setAnswers((prev) => ({ ...prev, ...seededAnswers }));
      if (seededAnswers.names && currentQuestion.id === 'names') {
        setInputValue(seededAnswers.names);
      }
    };

    fetchWeddingSite();
  }, []);

  useEffect(() => {
    setInputValue(answers[currentQuestion.id] || '');
  }, [answers, currentQuestion.id]);

  const previousAnswers = useMemo(
    () =>
      Object.entries(answers).filter(([key]) => questions.findIndex((q) => q.id === key) < currentStep && String(answers[key]).trim()),
    [answers, currentStep],
  );

  const submitAnswer = async (value: string) => {
    if (!value.trim()) return;

    const nextAnswers = { ...answers, [currentQuestion.id]: value.trim() };
    setAnswers(nextAnswers);
    setError('');

    if (!isLastQuestion) {
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setInputValue('');
      }, currentQuestion.type === 'choice' ? 300 : 0);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const nameParts = nextAnswers.names
        .split('&')
        .map((value) => value.trim())
        .filter(Boolean);

      const updateData = buildOnboardingUpdateData({
        coupleNames: {
          name1: nameParts[0] || '',
          name2: nameParts[1] || '',
        },
        planningStatus: 'quick_start_complete',
        template: 'modern',
        colorScheme: 'romantic',
        weddingDate: nextAnswers.date || '',
        location: nextAnswers.location || '',
      });

      const { error: updateError } = await supabase.from('wedding_sites').update(updateData).eq('user_id', user.id);
      if (updateError) throw updateError;

      navigate('/dashboard?bypassPayment=1', {
        state: {
          showWelcome: true,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: PAGE_BG }}>
      <div className="w-full max-w-[560px]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <p className="mb-1 text-[13px] uppercase tracking-wide" style={{ color: WARM }}>
            Day of Love Setup
          </p>
          <p className="text-[13px]" style={{ color: MUTED }}>
            About 2 minutes to get your site live
          </p>
        </motion.div>

        {previousAnswers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 space-y-2">
            {previousAnswers.map(([key, value]) => {
              const question = questions.find((item) => item.id === key);
              return (
                <div key={key} className="text-[13px]" style={{ color: TRANSCRIPT }}>
                  {question?.question.replace('?', '')}: <span style={{ color: TRANSCRIPT_VALUE }}>{value}</span>
                </div>
              );
            })}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1
              className="mb-8"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '42px',
                lineHeight: '1.2',
                color: TEXT,
                fontWeight: 500,
              }}
            >
              {currentQuestion.question}
            </h1>

            {currentQuestion.type === 'text' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && !loading && submitAnswer(inputValue)}
                  placeholder={currentQuestion.placeholder}
                  autoFocus
                  className="w-full rounded-2xl border-0 px-6 py-5 outline-none transition-all duration-200"
                  style={{
                    backgroundColor: SOFT,
                    fontSize: '17px',
                    color: TEXT,
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
                <button
                  onClick={() => submitAnswer(inputValue)}
                  disabled={!inputValue.trim() || loading}
                  className="rounded-full px-8 py-4 transition-all duration-200 disabled:opacity-30"
                  style={{
                    backgroundColor: TEXT,
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {loading ? 'Building...' : 'Continue'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuestion.choices?.map((choice, index) => (
                  <motion.button
                    key={choice}
                    onClick={() => submitAnswer(choice)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full rounded-2xl px-6 py-5 text-left transition-all duration-200 hover:scale-[1.01]"
                    style={{
                      backgroundColor: SOFT,
                      fontSize: '17px',
                      fontFamily: "'Inter', sans-serif",
                      color: TEXT,
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = SOFT_HOVER;
                      event.currentTarget.style.borderColor = BORDER;
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = SOFT;
                      event.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    {choice}
                  </motion.button>
                ))}
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </motion.div>
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16">
          <button
            className="text-[13px] transition-opacity duration-200 hover:opacity-60"
            style={{ color: MUTED }}
            onClick={() => navigate('/dashboard?bypassPayment=1')}
          >
            Switch to manual setup
          </button>
        </motion.div>
      </div>
    </div>
  );
};
