import { createCanonicalContentFromDraft } from '../../lib/aiCanonicalContent';
import { generateDraftFromWeddingProfile, mergeGeneratedDraftIntoWeddingData } from '../../lib/aiDraftGenerator';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import { buildDraftSitePatchFromProfile, isWeddingProfile } from '../../lib/weddingProfile';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { type IntelligenceSuggestion } from '../../lib/invisibleIntelligence';
import {
  hideInteractiveSuggestion,
  loadOverviewDraftRefreshSeed,
  markOverviewBuilderFieldAsUserEdited,
  persistOverviewIntelligenceDismissals,
  updateOverviewDraftRefresh,
  type OverviewInteractiveSuggestion as OverviewInteractiveSuggestionRow,
} from './overviewService';

interface OverviewStatsLike {
  siteId: string | null;
}

interface UseOverviewIntelligenceActionsInput {
  dismissedIntelligenceIds: string[];
  draftBrief: Array<{ id: string; label: string; value: string; questionKey: string }>;
  isDemoMode: boolean;
  loadStats: () => Promise<void>;
  refreshingBrief: boolean;
  setDismissedIntelligenceIds: React.Dispatch<React.SetStateAction<string[]>>;
  setInteractiveSuggestions: React.Dispatch<React.SetStateAction<OverviewInteractiveSuggestionRow[]>>;
  setRefreshingBrief: React.Dispatch<React.SetStateAction<boolean>>;
  stats: OverviewStatsLike | null;
  storageKey: string;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useOverviewIntelligenceActions({
  dismissedIntelligenceIds,
  draftBrief,
  isDemoMode,
  loadStats,
  refreshingBrief,
  setDismissedIntelligenceIds,
  setInteractiveSuggestions,
  setRefreshingBrief,
  stats,
  storageKey,
  toast,
}: UseOverviewIntelligenceActionsInput) {
  async function markBuilderFieldAsUserEdited(fieldPath: string) {
    if (!stats?.siteId) return;
    await markOverviewBuilderFieldAsUserEdited(stats.siteId, fieldPath);
    await loadStats();
  }

  async function refreshDraftFromBrief() {
    if (!stats?.siteId || draftBrief.length === 0 || refreshingBrief) return;

    setRefreshingBrief(true);
    try {
      const seed = await loadOverviewDraftRefreshSeed(stats.siteId);
      if (!isWeddingProfile(seed.onboardingAnswers)) throw new Error('No saved brief found');

      const patch = buildDraftSitePatchFromProfile(seed.onboardingAnswers);
      const generatedDraft = await generateDraftFromWeddingProfile(seed.onboardingAnswers);
      const canonicalAiContent = createCanonicalContentFromDraft(generatedDraft);
      const mergedWeddingData = await mergeGeneratedDraftIntoWeddingData(
        seed.weddingData,
        seed.onboardingAnswers,
      ) as Record<string, unknown>;
      const existingSiteJson = seed.siteJson ?? {};
      const cleanedSiteJson = { ...existingSiteJson };
      if ('home' in cleanedSiteJson) {
        delete cleanedSiteJson.home;
      }
      const existingAiContent = ((((seed.weddingData?.meta as Record<string, unknown> | undefined)?.aiContent as Record<string, unknown> | undefined) ?? null));
      const patchedBuilderProject = mergeGeneratedDraftIntoBuilderProject(
        cleanedSiteJson,
        generatedDraft,
        (existingAiContent as unknown as import('../../lib/aiCanonicalContent').AiCanonicalSectionContent | null) ?? canonicalAiContent,
      );

      await updateOverviewDraftRefresh(stats.siteId, {
        ...patch,
        wedding_data: {
          ...mergedWeddingData,
          meta: {
            ...((((mergedWeddingData.meta as Record<string, unknown> | undefined) ?? {}))),
            aiDraft: generatedDraft,
            aiContent: canonicalAiContent,
            photoBuckets: ((((mergedWeddingData.meta as Record<string, unknown> | undefined) ?? {}).photoBuckets as Record<string, unknown> | undefined) ?? null),
          },
        },
        site_json: patchedBuilderProject,
      });
      await loadStats();
    } catch (err) {
      const message = customerSafeErrorMessage(err, 'Failed to refresh draft from brief');
      toast(message, 'error');
    } finally {
      setRefreshingBrief(false);
    }
  }

  function dismissInvisibleSuggestion(id: string) {
    const next = Array.from(new Set([...dismissedIntelligenceIds, id]));
    setDismissedIntelligenceIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
    if (!stats?.siteId || isDemoMode) return;

    void persistOverviewIntelligenceDismissals(stats.siteId, next).catch(() => {});
  }

  async function hideSuggestion(id: string) {
    try {
      await hideInteractiveSuggestion(id);
    } catch {
      toast('Couldn’t hide that suggestion right now.', 'error');
      return;
    }
    setInteractiveSuggestions((prev) => prev.filter((suggestion) => suggestion.id !== id));
  }

  return {
    dismissInvisibleSuggestion,
    hideSuggestion,
    markBuilderFieldAsUserEdited,
    refreshDraftFromBrief,
  };
}
