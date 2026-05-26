import type { RegistryDisplayMode, RegistryItem } from './registryTypes.ts';
import { buildRegistrySafetyRevalidationPatch, getOwnerRegistryDisplayTitle } from './registryTypes.ts';

export type RegistryTruthSweepTargetMode =
  | 'product_card'
  | 'link_card'
  | 'review_only'
  | 'hidden'
  | 'manual_card'
  | 'cash_fund';

export type RegistryTruthSweepCandidate = {
  item: RegistryItem;
  patch: NonNullable<ReturnType<typeof buildRegistrySafetyRevalidationPatch>>;
  targetMode: RegistryTruthSweepTargetMode;
};

export type RegistryTruthSweepPreviewItem = {
  id: string;
  title: string;
  targetMode: RegistryTruthSweepTargetMode;
};

export type RegistryTruthSweepPrediction = {
  candidates: RegistryTruthSweepCandidate[];
  candidateCount: number;
  productCount: number;
  linkOnlyCount: number;
  reviewOnlyCount: number;
  previewItems: RegistryTruthSweepPreviewItem[];
};

function resolveRegistryTruthSweepTargetMode(
  item: RegistryItem,
  displayMode: RegistryDisplayMode | null | undefined,
): RegistryTruthSweepTargetMode {
  if (displayMode) return displayMode;
  return (item.display_mode ?? 'product_card') as RegistryTruthSweepTargetMode;
}

export function getRegistryTruthSweepTargetLabel(targetMode: RegistryTruthSweepTargetMode): string {
  if (targetMode === 'link_card') return 'Would become link-only';
  if (targetMode === 'review_only' || targetMode === 'hidden') return 'Would move to review-only';
  return 'Would stay detailed';
}

export function buildRegistryTruthSweepPrediction(
  items: RegistryItem[],
  previewLimit = 5,
): RegistryTruthSweepPrediction {
  const candidates: RegistryTruthSweepCandidate[] = items
    .map((item) => {
      const patch = buildRegistrySafetyRevalidationPatch(item);
      if (!patch) return null;
      return {
        item,
        patch,
        targetMode: resolveRegistryTruthSweepTargetMode(item, patch.display_mode),
      };
    })
    .filter((candidate): candidate is RegistryTruthSweepCandidate => Boolean(candidate));

  return {
    candidates,
    candidateCount: candidates.length,
    productCount: candidates.filter((candidate) => candidate.targetMode !== 'link_card' && candidate.targetMode !== 'review_only' && candidate.targetMode !== 'hidden').length,
    linkOnlyCount: candidates.filter((candidate) => candidate.targetMode === 'link_card').length,
    reviewOnlyCount: candidates.filter((candidate) => candidate.targetMode === 'review_only' || candidate.targetMode === 'hidden').length,
    previewItems: candidates.slice(0, previewLimit).map((candidate) => ({
      id: candidate.item.id,
      title: getOwnerRegistryDisplayTitle(candidate.item.item_name, candidate.item),
      targetMode: candidate.targetMode,
    })),
  };
}
