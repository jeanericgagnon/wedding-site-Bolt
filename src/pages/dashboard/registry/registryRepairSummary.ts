export interface RegistryRepairRunSummary {
  candidateCount: number;
  repairedCount: number;
  revalidatedCount: number;
  revalidatedProductCount: number;
  revalidatedLinkOnlyCount: number;
  revalidatedReviewOnlyCount: number;
  convertedCount: number;
  hiddenForReviewCount: number;
  refreshedCount: number;
  completedAt: string;
}

export function buildRegistryRepairRunSummary(summary: RegistryRepairRunSummary): RegistryRepairRunSummary {
  return summary;
}

export function buildRegistryRepairRunSummaryParts(summary: RegistryRepairRunSummary): string[] {
  return [
    summary.revalidatedCount > 0 ? `${summary.revalidatedCount} revalidated` : null,
    summary.revalidatedProductCount > 0 ? `${summary.revalidatedProductCount} kept as product cards` : null,
    summary.revalidatedLinkOnlyCount > 0 ? `${summary.revalidatedLinkOnlyCount} set to link-only` : null,
    summary.revalidatedReviewOnlyCount > 0 ? `${summary.revalidatedReviewOnlyCount} set to review-only` : null,
    summary.convertedCount > 0 ? `${summary.convertedCount} converted to link-only` : null,
    summary.hiddenForReviewCount > 0 ? `${summary.hiddenForReviewCount} hidden for review` : null,
    summary.refreshedCount > 0 ? `${summary.refreshedCount} refreshed` : null,
  ].filter((value): value is string => Boolean(value));
}

export function buildRegistryRepairRunToast(summary: RegistryRepairRunSummary): string {
  const parts = [
    summary.revalidatedCount > 0
      ? `Revalidated ${summary.revalidatedCount} saved gift${summary.revalidatedCount === 1 ? '' : 's'}`
      : null,
    summary.convertedCount > 0
      ? `Converted ${summary.convertedCount} into clean link-only gift${summary.convertedCount === 1 ? '' : 's'}`
      : null,
    summary.hiddenForReviewCount > 0
      ? `hid ${summary.hiddenForReviewCount} for owner review`
      : null,
  ].filter((value): value is string => Boolean(value));

  if (parts.length > 0) {
    return `${parts.join(' and ')}; repaired ${summary.repairedCount}/${summary.candidateCount} total.`;
  }

  return `Refreshed ${summary.repairedCount}/${summary.candidateCount} gift detail${summary.candidateCount === 1 ? '' : 's'}.`;
}
