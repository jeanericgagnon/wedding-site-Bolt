import { describe, expect, it } from 'vitest';

import { buildRegistryCleanupReportText } from './registryCleanupReport';

describe('buildRegistryCleanupReportText', () => {
  it('includes legacy repair counts, sweep prediction, cleanup groups, and last-run details', () => {
    const report = buildRegistryCleanupReportText({
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
    });

    expect(report).toContain('DayOf registry cleanup report');
    expect(report).toContain('Legacy bad imports: 7');
    expect(report).toContain('Saved-truth sweep candidates: 6');
    expect(report).toContain('Would shift to link-only: 3');
    expect(report).toContain('Cleanup queue: 8');
    expect(report).toContain('Needs review: 3');
    expect(report).toContain('Store drift: 2');
    expect(report).toContain('Last cleanup: 2026-05-21T18:00:00.000Z');
    expect(report).toContain('Converted to link-only: 2');
    expect(report).toContain('Repaired total: 4/4');
  });

  it('falls back missing legacy repair counts to zero instead of crashing', () => {
    const report = buildRegistryCleanupReportText({
      legacyRepairReport: {
        blockedSourceCount: 2,
      },
      cleanupQueueCount: 1,
      cleanupGroups: [{ label: 'Needs review', count: 1 }],
    });

    expect(report).toContain('Legacy bad imports: 0');
    expect(report).toContain('Auto-convertible: 0');
    expect(report).toContain('Blocked source: 2');
    expect(report).toContain('Saved-truth sweep candidates: 0');
  });
});
