import { buildPublicAccessArtifacts } from '../lib/publicAccessArtifacts';
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

type InteractiveSectionResponse = {
  pollCounts?: Record<string, number>;
  quizCounts?: Record<string, number>;
  suggestions?: string[];
  error?: string;
};

function getInteractivePublicAccess(siteSlug: string) {
  return buildPublicAccessArtifacts(siteSlug, new URLSearchParams(window.location.search));
}

async function invokeInteractiveSectionPublic(body: Record<string, unknown>): Promise<InteractiveSectionResponse> {
  const { data, error } = await supabase.functions.invoke('interactive-section-public', { body });
  if (error) throw error;
  return (data ?? {}) as InteractiveSectionResponse;
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
  const data = await invokeInteractiveSectionPublic({
    action: 'sync',
    siteSlug: params.siteSlug,
    pollWidgetId: params.pollWidgetId,
    quizWidgetId: params.quizWidgetId,
    suggestionPrompt: params.suggestionPrompt,
    ...getInteractivePublicAccess(params.siteSlug),
  });

  return {
    pollCounts: data.pollCounts ?? {},
    quizCounts: data.quizCounts ?? {},
    suggestions: Array.isArray(data.suggestions) ? data.suggestions.filter((item): item is string => typeof item === 'string') : [],
  };
}

export async function submitInteractiveSuggestion(params: {
  siteSlug: string;
  promptKey: string;
  suggestionText: string;
}): Promise<void> {
  await invokeInteractiveSectionPublic({
    action: 'suggest',
    siteSlug: params.siteSlug,
    promptKey: params.promptKey,
    suggestionText: params.suggestionText,
    ...getInteractivePublicAccess(params.siteSlug),
  });
}

export async function submitInteractiveVote(params: {
  siteSlug: string;
  widgetKind: InteractiveVoteKind;
  widgetId: string;
  optionId: string;
}): Promise<void> {
  await invokeInteractiveSectionPublic({
    action: 'vote',
    siteSlug: params.siteSlug,
    widgetKind: params.widgetKind,
    widgetId: params.widgetId,
    optionId: params.optionId,
    ...getInteractivePublicAccess(params.siteSlug),
  });
}
