import { buildRegistryRepairQueue, type RegistryRepairQueueItem } from './repairState.ts';
import { buildRegistryHiddenReviewPatch, buildRegistryLinkOnlyRepairPatch, getRegistryItemMetadataState, type RegistryItem } from './registryTypes.ts';
import { buildRegistryTruthSweepPrediction, type RegistryTruthSweepPrediction } from './registryTruthSweep.ts';
import { buildRegistryCleanupGroups, type RegistryCleanupGroup } from './registryCleanupGroups.ts';

export type RegistryLegacyRepairReport = {
  candidateCount: number;
  autoConvertibleCount: number;
  hiddenReviewCount: number;
  blockedSourceCount: number;
  manualQueueCount: number;
  revalidationCandidateCount: number;
  revalidationProductCount: number;
  revalidationLinkOnlyCount: number;
  revalidationReviewOnlyCount: number;
};

export type RegistryMaintenanceSnapshot = {
  repairQueue: RegistryRepairQueueItem[];
  cleanupGroups: RegistryCleanupGroup[];
  legacyRepairReport: RegistryLegacyRepairReport;
  truthSweepPrediction: RegistryTruthSweepPrediction;
  badImportCandidateCount: number;
  actionableBadImportCount: number;
};

export function buildRegistryLegacyRepairReport(
  items: RegistryItem[],
  repairQueue = buildRegistryRepairQueue(items),
  truthSweepPrediction = buildRegistryTruthSweepPrediction(items),
): RegistryLegacyRepairReport {
  const badImportCandidates = items.filter((item) => {
    const metadataState = getRegistryItemMetadataState(item);
    return metadataState.hasBadImportTitle && metadataState.displayMode !== 'link_card';
  });

  return {
    candidateCount: badImportCandidates.length,
    autoConvertibleCount: badImportCandidates.filter((item) => Boolean(buildRegistryLinkOnlyRepairPatch(item))).length,
    hiddenReviewCount: badImportCandidates.filter((item) => !buildRegistryLinkOnlyRepairPatch(item) && Boolean(buildRegistryHiddenReviewPatch(item))).length,
    blockedSourceCount: badImportCandidates.filter((item) => String(item.metadata_fetch_status || '').toLowerCase() === 'blocked' || item.source_status === 'blocked').length,
    manualQueueCount: repairQueue.filter((item) => item.states.includes('manual-review')).length,
    revalidationCandidateCount: truthSweepPrediction.candidateCount,
    revalidationProductCount: truthSweepPrediction.productCount,
    revalidationLinkOnlyCount: truthSweepPrediction.linkOnlyCount,
    revalidationReviewOnlyCount: truthSweepPrediction.reviewOnlyCount,
  };
}

export function buildRegistryMaintenanceSnapshot(items: RegistryItem[]): RegistryMaintenanceSnapshot {
  const repairQueue = buildRegistryRepairQueue(items);
  const truthSweepPrediction = buildRegistryTruthSweepPrediction(items);
  const cleanupGroups = buildRegistryCleanupGroups(repairQueue);
  const legacyRepairReport = buildRegistryLegacyRepairReport(items, repairQueue, truthSweepPrediction);
  const badImportCandidateCount = legacyRepairReport.candidateCount;
  const actionableBadImportCount = items.filter((item) => {
    const metadataState = getRegistryItemMetadataState(item);
    return metadataState.hasBadImportTitle
      && metadataState.displayMode !== 'link_card'
      && Boolean(item.item_url || item.canonical_url);
  }).length;

  return {
    repairQueue,
    cleanupGroups,
    legacyRepairReport,
    truthSweepPrediction,
    badImportCandidateCount,
    actionableBadImportCount,
  };
}
