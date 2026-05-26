import { describe, expect, it } from 'vitest';

import { buildRegistryTruthSweepReport, buildRegistryTruthSweepReportText } from './registryTruthSweepReport';
import type { RegistryTruthSweepPrediction } from './registryTruthSweep';

describe('registryTruthSweepReport', () => {
  const prediction: RegistryTruthSweepPrediction = {
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

  it('builds a structured saved-truth sweep preview report', () => {
    const report = buildRegistryTruthSweepReport(prediction);

    expect(report.heading).toBe('DayOf registry saved-truth sweep preview');
    expect(report.candidateCount).toBe(6);
    expect(report.productCount).toBe(2);
    expect(report.linkOnlyCount).toBe(3);
    expect(report.reviewOnlyCount).toBe(1);
    expect(report.items).toEqual([
      { id: 'gift-1', title: 'Dinner plates', outcome: 'Would become link-only' },
      { id: 'gift-2', title: 'Serving bowl', outcome: 'Would move to review-only' },
    ]);
  });

  it('builds a readable saved-truth sweep preview report', () => {
    const report = buildRegistryTruthSweepReportText(prediction);

    expect(report).toContain('DayOf registry saved-truth sweep preview');
    expect(report).toContain('Sweep candidates: 6');
    expect(report).toContain('Would keep as product cards: 2');
    expect(report).toContain('Would shift to link-only: 3');
    expect(report).toContain('Would shift to review-only: 1');
    expect(report).toContain('- Dinner plates: Would become link-only');
    expect(report).toContain('- Serving bowl: Would move to review-only');
  });

  it('tolerates missing preview items without crashing', () => {
    const report = buildRegistryTruthSweepReport({
      candidates: [],
      candidateCount: 2,
      productCount: 1,
      linkOnlyCount: 1,
      reviewOnlyCount: 0,
      previewItems: undefined as unknown as RegistryTruthSweepPrediction['previewItems'],
    });

    expect(report.items).toEqual([]);
  });
});
