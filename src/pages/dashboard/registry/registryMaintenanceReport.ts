import {
  buildRegistryCleanupReport,
  buildRegistryCleanupReportText,
  type RegistryCleanupReportGroup,
  type RegistryCleanupReportLegacySummary,
} from './registryCleanupReport.ts';
import { type RegistryRepairRunSummary } from './registryRepairSummary.ts';
import {
  buildRegistryTruthSweepReport,
  buildRegistryTruthSweepReportText,
  type RegistryTruthSweepReport,
} from './registryTruthSweepReport.ts';
import type { RegistryTruthSweepPrediction } from './registryTruthSweep.ts';

export type RegistryMaintenanceReport = {
  heading: string;
  cleanup: ReturnType<typeof buildRegistryCleanupReport>;
  truthSweep: RegistryTruthSweepReport;
};

export function buildRegistryMaintenanceReport(input: {
  legacyRepairReport: RegistryCleanupReportLegacySummary;
  cleanupQueueCount: number;
  cleanupGroups: RegistryCleanupReportGroup[];
  lastRepairRunSummary?: RegistryRepairRunSummary | null;
  truthSweepPrediction: RegistryTruthSweepPrediction;
}): RegistryMaintenanceReport {
  return {
    heading: 'DayOf registry maintenance report',
    cleanup: buildRegistryCleanupReport({
      legacyRepairReport: input.legacyRepairReport,
      cleanupQueueCount: input.cleanupQueueCount,
      cleanupGroups: input.cleanupGroups,
      lastRepairRunSummary: input.lastRepairRunSummary,
    }),
    truthSweep: buildRegistryTruthSweepReport(input.truthSweepPrediction),
  };
}

export function buildRegistryMaintenanceReportText(input: {
  legacyRepairReport: RegistryCleanupReportLegacySummary;
  cleanupQueueCount: number;
  cleanupGroups: RegistryCleanupReportGroup[];
  lastRepairRunSummary?: RegistryRepairRunSummary | null;
  truthSweepPrediction: RegistryTruthSweepPrediction;
}) {
  const maintenance = buildRegistryMaintenanceReport(input);

  return [
    maintenance.heading,
    '',
    buildRegistryCleanupReportText({
      legacyRepairReport: input.legacyRepairReport,
      cleanupQueueCount: input.cleanupQueueCount,
      cleanupGroups: input.cleanupGroups,
      lastRepairRunSummary: input.lastRepairRunSummary,
    }),
    '',
    buildRegistryTruthSweepReportText(input.truthSweepPrediction),
  ].join('\n');
}
