import { getBuilderSectionRecoverySummary, type BuilderSectionLike } from './builderSectionRecoverySummary';

export interface RailSummary {
  total: number;
  visible: number;
  hidden: number;
  locked: number;
  missingEssentials: string[];
}

export function summarizeBuilderSectionRail(activeSections: BuilderSectionLike[]): RailSummary {
  const recoverySummary = getBuilderSectionRecoverySummary(activeSections);
  return {
    total: recoverySummary.total,
    visible: recoverySummary.visible,
    hidden: recoverySummary.hidden,
    locked: recoverySummary.locked,
    missingEssentials: recoverySummary.missingEssentialLabels,
  };
}
