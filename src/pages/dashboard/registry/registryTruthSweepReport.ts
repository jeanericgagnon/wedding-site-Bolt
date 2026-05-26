import type { RegistryTruthSweepPrediction } from './registryTruthSweep.ts';
import { getRegistryTruthSweepTargetLabel } from './registryTruthSweep.ts';

export type RegistryTruthSweepReportItem = {
  id: string;
  title: string;
  outcome: string;
};

export type RegistryTruthSweepReport = {
  heading: string;
  candidateCount: number;
  productCount: number;
  linkOnlyCount: number;
  reviewOnlyCount: number;
  items: RegistryTruthSweepReportItem[];
};

export function buildRegistryTruthSweepReport(prediction: RegistryTruthSweepPrediction): RegistryTruthSweepReport {
  return {
    heading: 'DayOf registry saved-truth sweep preview',
    candidateCount: prediction.candidateCount,
    productCount: prediction.productCount,
    linkOnlyCount: prediction.linkOnlyCount,
    reviewOnlyCount: prediction.reviewOnlyCount,
    items: (prediction.previewItems ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      outcome: getRegistryTruthSweepTargetLabel(item.targetMode),
    })),
  };
}

export function buildRegistryTruthSweepReportText(prediction: RegistryTruthSweepPrediction) {
  const report = buildRegistryTruthSweepReport(prediction);
  const lines = [
    report.heading,
    '',
    `Sweep candidates: ${report.candidateCount}`,
    `Would keep as product cards: ${report.productCount}`,
    `Would shift to link-only: ${report.linkOnlyCount}`,
    `Would shift to review-only: ${report.reviewOnlyCount}`,
  ];

  if (report.items.length > 0) {
    lines.push('', 'Likely changes:');
    report.items.forEach((item) => {
      lines.push(`- ${item.title}: ${item.outcome}`);
    });
  }

  return lines.join('\n');
}
