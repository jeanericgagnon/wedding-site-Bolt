import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';
import {
  fetchInteractiveSectionSync,
  submitInteractiveSuggestion,
  submitInteractiveVote,
} from '../../interactiveSectionService';

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
  pollPrompt: z.string().default(''),
  pollOptions: z.string().default(''),
  quizPrompt: z.string().default(''),
  quizOptions: z.string().default(''),
  correctQuizOption: z.string().default(''),
  poll: PollQuestionSchema.default({
    id: 'poll-lastname',
    prompt: 'What should our last name be?',
    options: [
      { id: 'poll-gagmann', label: 'Gagmann' },
      { id: 'poll-eric-picks-karas', label: 'Eric picks Kara\'s' },
      { id: 'poll-kara-picks-erics', label: 'Kara picks Eric\'s' },
    ],
    mode: 'single',
    minSelections: 1,
    maxSelections: 3,
  }),
  quiz: QuizQuestionSchema.default({
    id: 'quiz-cry',
    prompt: 'Who cries first at the ceremony?',
    options: [
      { id: 'quiz-eric', label: 'Eric' },
      { id: 'quiz-kara', label: 'Kara' },
      { id: 'quiz-both-at-once', label: 'Both at once' },
    ],
    correctOptionId: 'quiz-both-at-once',
  }),
  suggestionPrompt: z.string().default('Signature drink ideas'),
  suggestionPlaceholder: z.string().default('Type your idea...'),
  allowPublicResults: z.boolean().default(true),
});

export type ContactInteractiveHubData = z.infer<typeof contactInteractiveHubSchema>;

const storageKey = (siteSlug: string | undefined, key: string) => `interactive:${siteSlug || 'site'}:${key}`;
export const INTERACTIVE_HUB_STORAGE_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_INTERACTIVE_COUNT_KEYS = 40;
const MAX_INTERACTIVE_KEY_LENGTH = 120;
const MAX_INTERACTIVE_SUGGESTIONS = 20;
const MAX_INTERACTIVE_SUGGESTION_LENGTH = 180;

type StoredCountsEnvelope = {
  savedAtISO: string;
  counts: Record<string, number>;
};

type StoredSuggestionsEnvelope = {
  savedAtISO: string;
  suggestions: string[];
};

type StoredCooldownEnvelope = {
  savedAtISO: string;
  value: number;
};

function isFreshStorageDate(savedAtISO: unknown): boolean {
  if (typeof savedAtISO !== 'string') return false;
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= INTERACTIVE_HUB_STORAGE_RETENTION_MS;
}

function normalizeCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).slice(0, MAX_INTERACTIVE_COUNT_KEYS).reduce<Record<string, number>>((acc, [rawKey, rawValue]) => {
    const key = rawKey.trim().replace(/\s+/g, '-').slice(0, MAX_INTERACTIVE_KEY_LENGTH);
    const count = Math.min(Math.max(Math.floor(Number(rawValue) || 0), 0), 9999);
    if (key && count > 0) acc[key] = count;
    return acc;
  }, {});
}

function normalizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const suggestions: string[] = [];
  value.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const suggestion = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_INTERACTIVE_SUGGESTION_LENGTH);
    const key = suggestion.toLowerCase();
    if (!suggestion || seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  });
  return suggestions.slice(0, MAX_INTERACTIVE_SUGGESTIONS);
}

function writeEnvelope(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    ...(value as Record<string, unknown>),
  }));
}

export function readInteractiveCounts(key: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'savedAtISO' in parsed) {
      if (!isFreshStorageDate((parsed as StoredCountsEnvelope).savedAtISO)) {
        window.localStorage.removeItem(key);
        return {};
      }
      return normalizeCounts((parsed as StoredCountsEnvelope).counts);
    }
    const counts = normalizeCounts(parsed);
    if (Object.keys(counts).length > 0) writeEnvelope(key, { counts });
    else window.localStorage.removeItem(key);
    return counts;
  } catch {
    try { window.localStorage.removeItem(key); } catch { void 0; }
    return {};
  }
}

function writeInteractiveCounts(key: string, counts: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try { writeEnvelope(key, { counts: normalizeCounts(counts) }); } catch { void 0; }
}

export function readInteractiveSuggestions(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'savedAtISO' in parsed) {
      if (!isFreshStorageDate((parsed as StoredSuggestionsEnvelope).savedAtISO)) {
        window.localStorage.removeItem(key);
        return [];
      }
      return normalizeSuggestions((parsed as StoredSuggestionsEnvelope).suggestions);
    }
    const suggestions = normalizeSuggestions(parsed);
    if (suggestions.length > 0) writeEnvelope(key, { suggestions });
    else window.localStorage.removeItem(key);
    return suggestions;
  } catch {
    try { window.localStorage.removeItem(key); } catch { void 0; }
    return [];
  }
}

function writeInteractiveSuggestions(key: string, suggestions: string[]) {
  if (typeof window === 'undefined') return;
  try { writeEnvelope(key, { suggestions: normalizeSuggestions(suggestions) }); } catch { void 0; }
}

export function readInteractiveCooldown(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number') {
      writeEnvelope(key, { value: parsed });
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (parsed && typeof parsed === 'object' && 'savedAtISO' in parsed) {
      if (!isFreshStorageDate((parsed as StoredCooldownEnvelope).savedAtISO)) {
        window.localStorage.removeItem(key);
        return 0;
      }
      const value = Number((parsed as StoredCooldownEnvelope).value);
      return Number.isFinite(value) ? value : 0;
    }
  } catch {
    try { window.localStorage.removeItem(key); } catch { void 0; }
  }
  return 0;
}

function writeInteractiveCooldown(key: string, value: number) {
  if (typeof window === 'undefined') return;
  try { writeEnvelope(key, { value }); } catch { void 0; }
}

const optionIdFromLabel = (prefix: string, label: string, index: number) => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return `${prefix}-${slug || index + 1}`;
};

function usePersistentCounter(siteSlug: string | undefined, key: string) {
  const fullKey = storageKey(siteSlug, key);
  const [counts, setCounts] = useState<Record<string, number>>(() => readInteractiveCounts(fullKey));

  const incrementLocal = (optionId: string) => {
    setCounts((prev) => {
      const next = { ...prev, [optionId]: (prev[optionId] || 0) + 1 };
      writeInteractiveCounts(fullKey, next);
      return next;
    });
  };

  const setRemoteCounts = (remote: Record<string, number>) => {
    const normalized = normalizeCounts(remote);
    setCounts(normalized);
    writeInteractiveCounts(fullKey, normalized);
  };

  return { counts, incrementLocal, setRemoteCounts };
}

const InteractiveHub: React.FC<SectionComponentProps<ContactInteractiveHubData>> = ({ data, siteSlug }) => {
  const pollOptionsFromFields = data.pollOptions
    .split('\n')
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((label, index) => ({ id: optionIdFromLabel('poll', label, index), label }));
  const quizOptionsFromFields = data.quizOptions
    .split('\n')
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((label, index) => ({ id: optionIdFromLabel('quiz', label, index), label }));
  const pollQuestion = {
    ...data.poll,
    prompt: data.pollPrompt.trim() || data.poll.prompt,
    options: pollOptionsFromFields.length >= 2 ? pollOptionsFromFields : data.poll.options,
  };
  const correctQuizOption = data.correctQuizOption.trim().toLowerCase();
  const quizQuestion = {
    ...data.quiz,
    prompt: data.quizPrompt.trim() || data.quiz.prompt,
    options: quizOptionsFromFields.length >= 2 ? quizOptionsFromFields : data.quiz.options,
    correctOptionId: correctQuizOption
      ? (quizOptionsFromFields.find((option) => option.label.trim().toLowerCase() === correctQuizOption)?.id || data.quiz.correctOptionId)
      : data.quiz.correctOptionId,
  };
  const poll = usePersistentCounter(siteSlug, `poll:${pollQuestion.id}`);
  const quiz = usePersistentCounter(siteSlug, `quiz:${quizQuestion.id}`);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null);
  const [selectedPollMulti, setSelectedPollMulti] = useState<string[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() => readInteractiveSuggestions(storageKey(siteSlug, 'suggestions')));
  const [suggestionInput, setSuggestionInput] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!siteSlug) return;

    const sync = async () => {
      setIsSyncing(true);
      try {
        const syncResult = await fetchInteractiveSectionSync({
          siteSlug,
          pollWidgetId: pollQuestion.id,
          quizWidgetId: quizQuestion.id,
          suggestionPrompt: data.suggestionPrompt,
        });

        if (!mounted) return;

        poll.setRemoteCounts(syncResult.pollCounts);
        quiz.setRemoteCounts(syncResult.quizCounts);
        setSuggestions(syncResult.suggestions);
      } finally {
        if (mounted) setIsSyncing(false);
      }
    };

    void sync();
    return () => { mounted = false; };
  }, [siteSlug, pollQuestion.id, quizQuestion.id, data.suggestionPrompt]);

  const pollTotal = useMemo(() => Object.values(poll.counts).reduce((a, b) => a + b, 0), [poll.counts]);

  const submitSuggestion = async () => {
    const value = suggestionInput.trim();
    if (!value) return;

    const normalized = value.toLowerCase();
    if (suggestions.some((s) => s.trim().toLowerCase() === normalized)) return;

    const cooldownKey = storageKey(siteSlug, 'suggestionCooldown');
    const now = Date.now();
    const lastSubmit = readInteractiveCooldown(cooldownKey);
    if (now - lastSubmit < 8000) return;

    const next = normalizeSuggestions([value, ...suggestions]);
    setSuggestions(next);
    setSuggestionInput('');
    writeInteractiveSuggestions(storageKey(siteSlug, 'suggestions'), next);
    writeInteractiveCooldown(cooldownKey, now);

    if (siteSlug) {
      try {
        await submitInteractiveSuggestion({
          siteSlug,
          promptKey: data.suggestionPrompt,
          suggestionText: value,
        });
      } catch {
        const reverted = suggestions;
        setSuggestions(reverted);
        writeInteractiveSuggestions(storageKey(siteSlug, 'suggestions'), reverted);
      }
    }
  };

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-primary font-light mb-3">{data.eyebrow}</p>
          <h2 className="text-4xl font-light text-text-primary">{data.title}</h2>
          <p className="mt-3 text-text-secondary">{data.subtitle}</p>
          {isSyncing && <p className="mt-2 text-[11px] text-text-tertiary">Syncing latest guest responses…</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Poll</h3>
            <p className="text-sm text-text-secondary mb-3">{pollQuestion.prompt}</p>
            <div className="space-y-2">
              {pollQuestion.options.map((opt) => {
                const count = poll.counts[opt.id] || 0;
                const pct = pollTotal ? Math.round((count / pollTotal) * 100) : 0;
                const isSelected = pollQuestion.mode === 'multi'
                  ? selectedPollMulti.includes(opt.id)
                  : selectedPoll === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (pollQuestion.mode === 'multi') {
                        setSelectedPollMulti((prev) => {
                          if (prev.includes(opt.id)) return prev.filter((id) => id !== opt.id);
                          if (prev.length >= pollQuestion.maxSelections) return prev;
                          return [...prev, opt.id];
                        });
                        return;
                      }

                      void (async () => {
                        const voteCooldownKey = storageKey(siteSlug, `voteCooldown:${pollQuestion.id}`);
                        const now = Date.now();
                        const lastVote = readInteractiveCooldown(voteCooldownKey);
                        if (now - lastVote < 3000) return;

                        setSelectedPoll(opt.id);
                        poll.incrementLocal(opt.id);
                        writeInteractiveCooldown(voteCooldownKey, now);
                        if (siteSlug) {
                          await submitInteractiveVote({
                            siteSlug,
                            widgetKind: 'poll',
                            widgetId: pollQuestion.id,
                            optionId: opt.id,
                          });
                        }
                      })();
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-subtle'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        {pollQuestion.mode === 'multi' && (
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
            {pollQuestion.mode === 'multi' && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-text-tertiary">
                  Pick {pollQuestion.minSelections}–{pollQuestion.maxSelections}
                </p>
                <button
                  onClick={async () => {
                    if (selectedPollMulti.length < pollQuestion.minSelections) return;
                    const voteCooldownKey = storageKey(siteSlug, `voteCooldown:${pollQuestion.id}:multi`);
                    const now = Date.now();
                    const lastVote = readInteractiveCooldown(voteCooldownKey);
                    if (now - lastVote < 3000) return;

                    for (const optionId of selectedPollMulti) {
                      poll.incrementLocal(optionId);
                      if (siteSlug) {
                        await submitInteractiveVote({
                          siteSlug,
                          widgetKind: 'poll',
                          widgetId: pollQuestion.id,
                          optionId,
                        });
                      }
                    }
                    writeInteractiveCooldown(voteCooldownKey, now);
                    setSelectedPollMulti([]);
                  }}
                  disabled={selectedPollMulti.length < pollQuestion.minSelections}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Submit choices
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Quiz</h3>
            <p className="text-sm text-text-secondary mb-3">{quizQuestion.prompt}</p>
            <div className="space-y-2">
              {quizQuestion.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={async () => {
                    const voteCooldownKey = storageKey(siteSlug, `voteCooldown:${quizQuestion.id}`);
                    const now = Date.now();
                    const lastVote = readInteractiveCooldown(voteCooldownKey);
                    if (now - lastVote < 3000) return;

                    setSelectedQuiz(opt.id);
                    quiz.incrementLocal(opt.id);
                    writeInteractiveCooldown(voteCooldownKey, now);
                    if (siteSlug) {
                      await submitInteractiveVote({
                          siteSlug,
                          widgetKind: 'quiz',
                          widgetId: quizQuestion.id,
                          optionId: opt.id,
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
              <p className={`mt-3 text-xs font-medium ${selectedQuiz === quizQuestion.correctOptionId ? 'text-emerald-600' : 'text-amber-600'}`}>
                {selectedQuiz === quizQuestion.correctOptionId ? 'Nice one, correct!' : 'Good guess. Keep trying.'}
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
