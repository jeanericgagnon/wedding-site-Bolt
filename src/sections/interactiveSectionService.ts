import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase.generated';

type InteractiveSuggestionInsert = Database['public']['Tables']['interactive_suggestions']['Insert'];
type InteractiveVoteInsert = Database['public']['Tables']['interactive_votes']['Insert'];

export type InteractiveVoteKind = 'poll' | 'quiz';

export type InteractiveSyncResult = {
  pollCounts: Record<string, number>;
  quizCounts: Record<string, number>;
  suggestions: string[];
};

const INTERACTIVE_VOTE_SELECT = 'option_id';
const INTERACTIVE_SUGGESTION_SELECT = 'suggestion_text';

function countOptionIds(rows: Array<{ option_id?: string | null }> | null | undefined): Record<string, number> {
  return (rows ?? []).reduce<Record<string, number>>((acc, row) => {
    const id = String(row.option_id || '');
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
}

function mapSuggestions(rows: Array<{ suggestion_text?: string | null }> | null | undefined): string[] {
  return (rows ?? [])
    .map((row) => String(row.suggestion_text || '').trim())
    .filter(Boolean);
}

export function buildInteractiveSuggestionInsert(
  siteSlug: string,
  promptKey: string,
  suggestionText: string,
): InteractiveSuggestionInsert {
  return {
    site_slug: siteSlug,
    prompt_key: promptKey,
    suggestion_text: suggestionText,
  };
}

export function buildInteractiveVoteInsert(
  siteSlug: string,
  widgetKind: InteractiveVoteKind,
  widgetId: string,
  optionId: string,
): InteractiveVoteInsert {
  return {
    site_slug: siteSlug,
    widget_kind: widgetKind,
    widget_id: widgetId,
    option_id: optionId,
  };
}

export async function fetchInteractiveSectionSync(params: {
  siteSlug: string;
  pollWidgetId: string;
  quizWidgetId: string;
  suggestionPrompt: string;
}): Promise<InteractiveSyncResult> {
  const [pollRes, quizRes, suggestionsRes] = await Promise.all([
    supabase
      .from('interactive_votes')
      .select(INTERACTIVE_VOTE_SELECT)
      .eq('site_slug', params.siteSlug)
      .eq('widget_kind', 'poll')
      .eq('widget_id', params.pollWidgetId),
    supabase
      .from('interactive_votes')
      .select(INTERACTIVE_VOTE_SELECT)
      .eq('site_slug', params.siteSlug)
      .eq('widget_kind', 'quiz')
      .eq('widget_id', params.quizWidgetId),
    supabase
      .from('interactive_suggestions')
      .select(INTERACTIVE_SUGGESTION_SELECT)
      .eq('site_slug', params.siteSlug)
      .eq('prompt_key', params.suggestionPrompt)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    pollCounts: pollRes.error ? {} : countOptionIds(pollRes.data),
    quizCounts: quizRes.error ? {} : countOptionIds(quizRes.data),
    suggestions: suggestionsRes.error ? [] : mapSuggestions(suggestionsRes.data),
  };
}

export async function submitInteractiveSuggestion(params: {
  siteSlug: string;
  promptKey: string;
  suggestionText: string;
}): Promise<void> {
  await supabase
    .from('interactive_suggestions')
    .insert(buildInteractiveSuggestionInsert(params.siteSlug, params.promptKey, params.suggestionText));
}

export async function submitInteractiveVote(params: {
  siteSlug: string;
  widgetKind: InteractiveVoteKind;
  widgetId: string;
  optionId: string;
}): Promise<void> {
  await supabase
    .from('interactive_votes')
    .insert(buildInteractiveVoteInsert(params.siteSlug, params.widgetKind, params.widgetId, params.optionId));
}
