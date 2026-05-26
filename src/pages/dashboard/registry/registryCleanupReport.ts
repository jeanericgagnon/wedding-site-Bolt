import { type RegistryRepairRunSummary } from './registryRepairSummary.ts';

export type RegistryCleanupReportLegacySummary = {
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

export type RegistryCleanupReportGroup = {
  label: string;
  count: number;
};

export type RegistryCleanupReport = {
  heading: string;
  legacyRepairReport: RegistryCleanupReportLegacySummary;
  cleanupQueueCount: number;
  cleanupGroups: RegistryCleanupReportGroup[];
  lastRepairRunSummary?: RegistryRepairRunSummary | null;
};

export function normalizeRegistryCleanupReportLegacySummary(
  value: Partial<RegistryCleanupReportLegacySummary> | null | undefined,
): RegistryCleanupReportLegacySummary {
  return {
    candidateCount: value?.candidateCount ?? 0,
    autoConvertibleCount: value?.autoConvertibleCount ?? 0,
    hiddenReviewCount: value?.hiddenReviewCount ?? 0,
    blockedSourceCount: value?.blockedSourceCount ?? 0,
    manualQueueCount: value?.manualQueueCount ?? 0,
    revalidationCandidateCount: value?.revalidationCandidateCount ?? 0,
    revalidationProductCount: value?.revalidationProductCount ?? 0,
    revalidationLinkOnlyCount: value?.revalidationLinkOnlyCount ?? 0,
    revalidationReviewOnlyCount: value?.revalidationReviewOnlyCount ?? 0,
  };
}

export function buildRegistryCleanupReport(input: {
  legacyRepairReport: Partial<RegistryCleanupReportLegacySummary> | null | undefined;
  cleanupQueueCount: number;
  cleanupGroups: RegistryCleanupReportGroup[];
  lastRepairRunSummary?: RegistryRepairRunSummary | null;
}): RegistryCleanupReport {
  return {
    heading: 'DayOf registry cleanup report',
    legacyRepairReport: normalizeRegistryCleanupReportLegacySummary(input.legacyRepairReport),
    cleanupQueueCount: input.cleanupQueueCount,
    cleanupGroups: input.cleanupGroups,
    lastRepairRunSummary: input.lastRepairRunSummary,
  };
}

export function buildRegistryCleanupReportText(input: {
  legacyRepairReport: Partial<RegistryCleanupReportLegacySummary> | null | undefined;
  cleanupQueueCount: number;
  cleanupGroups: RegistryCleanupReportGroup[];
  lastRepairRunSummary?: RegistryRepairRunSummary | null;
}) {
  const report = buildRegistryCleanupReport(input);
  const lines = [
    report.heading,
    '',
    `Legacy bad imports: ${report.legacyRepairReport.candidateCount}`,
    `Auto-convertible: ${report.legacyRepairReport.autoConvertibleCount}`,
    `Hide for review: ${report.legacyRepairReport.hiddenReviewCount}`,
    `Blocked source: ${report.legacyRepairReport.blockedSourceCount}`,
    `Manual review queue: ${report.legacyRepairReport.manualQueueCount}`,
    `Saved-truth sweep candidates: ${report.legacyRepairReport.revalidationCandidateCount}`,
    `Would keep as product cards: ${report.legacyRepairReport.revalidationProductCount}`,
    `Would shift to link-only: ${report.legacyRepairReport.revalidationLinkOnlyCount}`,
    `Would shift to review-only: ${report.legacyRepairReport.revalidationReviewOnlyCount}`,
    '',
    `Cleanup queue: ${report.cleanupQueueCount}`,
    ...report.cleanupGroups.map((group) => `${group.label}: ${group.count}`),
  ];

  if (report.lastRepairRunSummary) {
    lines.push(
      '',
      `Last cleanup: ${report.lastRepairRunSummary.completedAt}`,
      `Revalidated: ${report.lastRepairRunSummary.revalidatedCount}`,
      `Revalidated as product cards: ${report.lastRepairRunSummary.revalidatedProductCount}`,
      `Revalidated as link-only: ${report.lastRepairRunSummary.revalidatedLinkOnlyCount}`,
      `Revalidated as review-only: ${report.lastRepairRunSummary.revalidatedReviewOnlyCount}`,
      `Converted to link-only: ${report.lastRepairRunSummary.convertedCount}`,
      `Hidden for review: ${report.lastRepairRunSummary.hiddenForReviewCount}`,
      `Refreshed: ${report.lastRepairRunSummary.refreshedCount}`,
      `Repaired total: ${report.lastRepairRunSummary.repairedCount}/${report.lastRepairRunSummary.candidateCount}`,
    );
  }

  return lines.join('\n');
}
