import { describe, expect, it } from 'vitest';

import { buildRegistryMaintenanceReport, buildRegistryMaintenanceReportText } from './registryMaintenanceReport';
import type { RegistryTruthSweepPrediction } from './registryTruthSweep';

describe('registryMaintenanceReport', () => {
  const truthSweepPrediction: RegistryTruthSweepPrediction = {
    candidates: [],
    candidateCount: 6,
    productCount: 2,
    linkOnlyCount: 3,
    reviewOnlyCount: 1,
    previewItems: [
      { id: 'gift-1', title: 'Dinner plates', targetMode: 'link_card' },
      { id: 'gift-2', title: 'Serving bowl', targetMode: 'review_only' },
    ],
  };

  const input = {
    legacyRepairReport: {
      candidateCount: 7,
      autoConvertibleCount: 4,
      hiddenReviewCount: 2,
      blockedSourceCount: 5,
      manualQueueCount: 1,
      revalidationCandidateCount: 6,
      revalidationProductCount: 2,
      revalidationLinkOnlyCount: 3,
      revalidationReviewOnlyCount: 1,
    },
    cleanupQueueCount: 8,
    cleanupGroups: [
      { label: 'Needs review', count: 3 },
      { label: 'Store drift', count: 2 },
    ],
    lastRepairRunSummary: {
      candidateCount: 4,
      repairedCount: 4,
      revalidatedCount: 1,
      revalidatedProductCount: 1,
      revalidatedLinkOnlyCount: 0,
      revalidatedReviewOnlyCount: 0,
      convertedCount: 2,
      hiddenForReviewCount: 1,
      refreshedCount: 1,
      completedAt: '2026-05-21T18:00:00.000Z',
    },
    truthSweepPrediction,
  };

  it('builds a structured registry maintenance report', () => {
    const report = buildRegistryMaintenanceReport(input);

    expect(report.heading).toBe('DayOf registry maintenance report');
    expect(report.cleanup.heading).toBe('DayOf registry cleanup report');
    expect(report.cleanup.cleanupQueueCount).toBe(8);
    expect(report.truthSweep.heading).toBe('DayOf registry saved-truth sweep preview');
    expect(report.truthSweep.linkOnlyCount).toBe(3);
    expect(report.truthSweep.items).toEqual([
      { id: 'gift-1', title: 'Dinner plates', outcome: 'Would become link-only' },
      { id: 'gift-2', title: 'Serving bowl', outcome: 'Would move to review-only' },
    ]);
  });

  it('builds a combined registry maintenance report text', () => {
    const report = buildRegistryMaintenanceReportText(input);

    expect(report).toContain('DayOf registry maintenance report');
    expect(report).toContain('DayOf registry cleanup report');
    expect(report).toContain('Legacy bad imports: 7');
    expect(report).toContain('DayOf registry saved-truth sweep preview');
    expect(report).toContain('Would shift to link-only: 3');
    expect(report).toContain('- Serving bowl: Would move to review-only');
  });
});
