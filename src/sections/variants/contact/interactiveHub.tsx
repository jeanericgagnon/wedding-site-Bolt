import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { supabase } from '../../../lib/supabase';

const PollOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const PollQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(PollOptionSchema),
  mode: z.enum(['single', 'multi']).default('single'),
  minSelections: z.number().min(1).max(10).default(1),
  maxSelections: z.number().min(1).max(10).default(3),
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
    mode: 'single',
    minSelections: 1,
    maxSelections: 3,
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

  const incrementLocal = (optionId: string) => {
    setCounts((prev) => {
      const next = { ...prev, [optionId]: (prev[optionId] || 0) + 1 };
      try { window.localStorage.setItem(fullKey, JSON.stringify(next)); } catch { void 0; }
      return next;
    });
  };

  const setRemoteCounts = (remote: Record<string, number>) => {
    setCounts(remote);
    try { window.localStorage.setItem(fullKey, JSON.stringify(remote)); } catch { void 0; }
  };

  return { counts, incrementLocal, setRemoteCounts };
}

const InteractiveHub: React.FC<SectionComponentProps<ContactInteractiveHubData>> = ({ data, siteSlug }) => {
  const poll = usePersistentCounter(siteSlug, `poll:${data.poll.id}`);
  const quiz = usePersistentCounter(siteSlug, `quiz:${data.quiz.id}`);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null);
  const [selectedPollMulti, setSelectedPollMulti] = useState<string[]>([]);
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

  useEffect(() => {
    let mounted = true;
    if (!siteSlug) return;

    const sync = async () => {
      setIsSyncing(true);
      try {
        const [pollRes, quizRes, suggestionsRes] = await Promise.all([
          supabase
            .from('interactive_votes')
            .select('option_id')
            .eq('site_slug', siteSlug)
            .eq('widget_kind', 'poll')
            .eq('widget_id', data.poll.id),
          supabase
            .from('interactive_votes')
            .select('option_id')
            .eq('site_slug', siteSlug)
            .eq('widget_kind', 'quiz')
            .eq('widget_id', data.quiz.id),
          supabase
            .from('interactive_suggestions')
            .select('suggestion_text')
            .eq('site_slug', siteSlug)
            .eq('prompt_key', data.suggestionPrompt)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (!mounted) return;

        if (!pollRes.error) {
          const counts = (pollRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
            const id = String((row as { option_id?: string }).option_id || '');
            if (!id) return acc;
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {});
          poll.setRemoteCounts(counts);
        }

        if (!quizRes.error) {
          const counts = (quizRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
            const id = String((row as { option_id?: string }).option_id || '');
            if (!id) return acc;
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {});
          quiz.setRemoteCounts(counts);
        }

        if (!suggestionsRes.error) {
          setSuggestions((suggestionsRes.data ?? []).map((row) => String((row as { suggestion_text?: string }).suggestion_text || '')).filter(Boolean));
        }
      } finally {
        if (mounted) setIsSyncing(false);
      }
    };

    void sync();
    return () => { mounted = false; };
  }, [siteSlug, data.poll.id, data.quiz.id, data.suggestionPrompt]);

  const pollTotal = useMemo(() => Object.values(poll.counts).reduce((a, b) => a + b, 0), [poll.counts]);

  const submitSuggestion = async () => {
    const value = suggestionInput.trim();
    if (!value) return;

    const normalized = value.toLowerCase();
    if (suggestions.some((s) => s.trim().toLowerCase() === normalized)) return;

    const cooldownKey = storageKey(siteSlug, 'suggestionCooldown');
    const now = Date.now();
    const lastSubmit = Number(window.localStorage.getItem(cooldownKey) || 0);
    if (now - lastSubmit < 8000) return;

    const next = [value, ...suggestions].slice(0, 20);
    setSuggestions(next);
    setSuggestionInput('');
    try {
      window.localStorage.setItem(storageKey(siteSlug, 'suggestions'), JSON.stringify(next));
      window.localStorage.setItem(cooldownKey, String(now));
    } catch { void 0; }

    if (siteSlug) {
      await supabase.from('interactive_suggestions').insert({
        site_slug: siteSlug,
        prompt_key: data.suggestionPrompt,
        suggestion_text: value,
      });
    }
  };

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-primary font-medium mb-3">{data.eyebrow}</p>
          <h2 className="text-4xl font-light text-text-primary">{data.title}</h2>
          <p className="mt-3 text-text-secondary">{data.subtitle}</p>
          {isSyncing && <p className="mt-2 text-[11px] text-text-tertiary">Syncing latest guest responses…</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Poll</h3>
            <p className="text-sm text-text-secondary mb-3">{data.poll.prompt}</p>
            <div className="space-y-2">
              {data.poll.options.map((opt) => {
                const count = poll.counts[opt.id] || 0;
                const pct = pollTotal ? Math.round((count / pollTotal) * 100) : 0;
                const isSelected = data.poll.mode === 'multi'
                  ? selectedPollMulti.includes(opt.id)
                  : selectedPoll === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (data.poll.mode === 'multi') {
                        setSelectedPollMulti((prev) => {
                          if (prev.includes(opt.id)) return prev.filter((id) => id !== opt.id);
                          if (prev.length >= data.poll.maxSelections) return prev;
                          return [...prev, opt.id];
                        });
                        return;
                      }

                      void (async () => {
                        const voteCooldownKey = storageKey(siteSlug, `voteCooldown:${data.poll.id}`);
                        const now = Date.now();
                        const lastVote = Number(window.localStorage.getItem(voteCooldownKey) || 0);
                        if (now - lastVote < 3000) return;

                        setSelectedPoll(opt.id);
                        poll.incrementLocal(opt.id);
                        try { window.localStorage.setItem(voteCooldownKey, String(now)); } catch { void 0; }
                        if (siteSlug) {
                          await supabase.from('interactive_votes').insert({
                            site_slug: siteSlug,
                            widget_kind: 'poll',
                            widget_id: data.poll.id,
                            option_id: opt.id,
                          });
                        }
                      })();
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-subtle'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        {data.poll.mode === 'multi' && (
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${isSelected ? 'border-primary bg-primary text-white' : 'border-border text-transparent'}`}>✓</span>
                        )}
                        {opt.label}
                      </span>
                      {data.allowPublicResults && <span className="text-xs text-text-tertiary">{pct}%</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {data.poll.mode === 'multi' && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-text-tertiary">
                  Pick {data.poll.minSelections}–{data.poll.maxSelections}
                </p>
                <button
                  onClick={async () => {
                    if (selectedPollMulti.length < data.poll.minSelections) return;
                    const voteCooldownKey = storageKey(siteSlug, `voteCooldown:${data.poll.id}:multi`);
                    const now = Date.now();
                    const lastVote = Number(window.localStorage.getItem(voteCooldownKey) || 0);
                    if (now - lastVote < 3000) return;

                    for (const optionId of selectedPollMulti) {
                      poll.incrementLocal(optionId);
                      if (siteSlug) {
                        await supabase.from('interactive_votes').insert({
                          site_slug: siteSlug,
                          widget_kind: 'poll',
                          widget_id: data.poll.id,
                          option_id: optionId,
                        });
                      }
                    }
                    try { window.localStorage.setItem(voteCooldownKey, String(now)); } catch { void 0; }
                    setSelectedPollMulti([]);
                  }}
                  disabled={selectedPollMulti.length < data.poll.minSelections}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Submit choices
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Quiz</h3>
            <p className="text-sm text-text-secondary mb-3">{data.quiz.prompt}</p>
            <div className="space-y-2">
              {data.quiz.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={async () => {
                    const voteCooldownKey = storageKey(siteSlug, `voteCooldown:${data.quiz.id}`);
                    const now = Date.now();
                    const lastVote = Number(window.localStorage.getItem(voteCooldownKey) || 0);
                    if (now - lastVote < 3000) return;

                    setSelectedQuiz(opt.id);
                    quiz.incrementLocal(opt.id);
                    try { window.localStorage.setItem(voteCooldownKey, String(now)); } catch { void 0; }
                    if (siteSlug) {
                      await supabase.from('interactive_votes').insert({
                        site_slug: siteSlug,
                        widget_kind: 'quiz',
                        widget_id: data.quiz.id,
                        option_id: opt.id,
                      });
                    }
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
