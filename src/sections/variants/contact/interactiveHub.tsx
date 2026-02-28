import React, { useMemo, useState } from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

const PollOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const PollQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(PollOptionSchema),
});

const QuizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(PollOptionSchema),
  correctOptionId: z.string(),
});

export const contactInteractiveHubSchema = z.object({
  eyebrow: z.string().default('Interactive corner'),
  title: z.string().default('Questions, polls & quizzes'),
  subtitle: z.string().default('Have fun with us while we plan the weekend.'),
  poll: PollQuestionSchema.default({
    id: 'poll-lastname',
    prompt: 'What should our last name be?',
    options: [
      { id: 'opt1', label: 'Gagmann' },
      { id: 'opt2', label: 'Eric picks Kara\'s' },
      { id: 'opt3', label: 'Kara picks Eric\'s' },
    ],
  }),
  quiz: QuizQuestionSchema.default({
    id: 'quiz-cry',
    prompt: 'Who cries first at the ceremony?',
    options: [
      { id: 'a', label: 'Eric' },
      { id: 'b', label: 'Kara' },
      { id: 'c', label: 'Both at once' },
    ],
    correctOptionId: 'c',
  }),
  suggestionPrompt: z.string().default('Signature drink ideas'),
  suggestionPlaceholder: z.string().default('Type your idea...'),
  allowPublicResults: z.boolean().default(true),
});

export type ContactInteractiveHubData = z.infer<typeof contactInteractiveHubSchema>;

const storageKey = (siteSlug: string | undefined, key: string) => `interactive:${siteSlug || 'site'}:${key}`;

function usePersistentCounter(siteSlug: string | undefined, key: string) {
  const fullKey = storageKey(siteSlug, key);
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    try {
      const raw = window.localStorage.getItem(fullKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const increment = (optionId: string) => {
    setCounts((prev) => {
      const next = { ...prev, [optionId]: (prev[optionId] || 0) + 1 };
      try { window.localStorage.setItem(fullKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { counts, increment };
}

const InteractiveHub: React.FC<SectionComponentProps<ContactInteractiveHubData>> = ({ data, siteSlug }) => {
  const poll = usePersistentCounter(siteSlug, `poll:${data.poll.id}`);
  const quiz = usePersistentCounter(siteSlug, `quiz:${data.quiz.id}`);
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(siteSlug, 'suggestions'));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [suggestionInput, setSuggestionInput] = useState('');

  const pollTotal = useMemo(() => Object.values(poll.counts).reduce((a, b) => a + b, 0), [poll.counts]);

  const submitSuggestion = () => {
    const value = suggestionInput.trim();
    if (!value) return;
    const next = [value, ...suggestions].slice(0, 20);
    setSuggestions(next);
    setSuggestionInput('');
    try { window.localStorage.setItem(storageKey(siteSlug, 'suggestions'), JSON.stringify(next)); } catch {}
  };

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-primary font-medium mb-3">{data.eyebrow}</p>
          <h2 className="text-4xl font-light text-text-primary">{data.title}</h2>
          <p className="mt-3 text-text-secondary">{data.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Poll</h3>
            <p className="text-sm text-text-secondary mb-3">{data.poll.prompt}</p>
            <div className="space-y-2">
              {data.poll.options.map((opt) => {
                const count = poll.counts[opt.id] || 0;
                const pct = pollTotal ? Math.round((count / pollTotal) * 100) : 0;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedPoll(opt.id);
                      poll.increment(opt.id);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedPoll === opt.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-subtle'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{opt.label}</span>
                      {data.allowPublicResults && <span className="text-xs text-text-tertiary">{pct}%</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Quiz</h3>
            <p className="text-sm text-text-secondary mb-3">{data.quiz.prompt}</p>
            <div className="space-y-2">
              {data.quiz.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedQuiz(opt.id);
                    quiz.increment(opt.id);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedQuiz === opt.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-subtle'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {selectedQuiz && (
              <p className={`mt-3 text-xs font-medium ${selectedQuiz === data.quiz.correctOptionId ? 'text-emerald-600' : 'text-amber-600'}`}>
                {selectedQuiz === data.quiz.correctOptionId ? 'Nice one — correct!' : 'Good guess. Keep trying 😄'}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Open prompt</h3>
            <p className="text-sm text-text-secondary mb-3">{data.suggestionPrompt}</p>
            <div className="flex gap-2 mb-3">
              <input
                value={suggestionInput}
                onChange={(e) => setSuggestionInput(e.target.value)}
                placeholder={data.suggestionPlaceholder}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button onClick={submitSuggestion} className="rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90">Send</button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {suggestions.length === 0 ? (
                <p className="text-xs text-text-tertiary">No suggestions yet.</p>
              ) : suggestions.map((s, idx) => (
                <div key={`${s}-${idx}`} className="rounded-md bg-surface-subtle px-2.5 py-1.5 text-xs text-text-secondary">{s}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const contactInteractiveHubDefinition: SectionDefinition<ContactInteractiveHubData> = {
  type: 'contact',
  variant: 'interactiveHub',
  schema: contactInteractiveHubSchema,
  defaultData: contactInteractiveHubSchema.parse({}),
  Component: InteractiveHub,
};
