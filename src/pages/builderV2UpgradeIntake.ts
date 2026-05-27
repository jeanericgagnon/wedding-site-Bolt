import type { BuilderV2ImportReport } from '../builder-v2/importPrepare';
import { summarizeImportRepairCount } from './builderV2WorkflowGuidance';

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2UpgradeIntake = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
};

export const buildBuilderV2UpgradeIntake = (
  sourceName: string,
  report: BuilderV2ImportReport,
  options?: { hydratedWeddingData?: boolean },
): BuilderV2UpgradeIntake => {
  const repairs = summarizeImportRepairCount(report);
  const hasHydratedWeddingData = options?.hydratedWeddingData === true;

  return {
    title: `${sourceName} is open as a working V2 draft`,
    detail: hasHydratedWeddingData
      ? 'The current Builder draft came forward with its wedding-data context, so page review in V2 should already reflect the real couple, date, travel, registry, and RSVP anchors.'
      : 'The current Builder draft came forward into V2, but some preview fields are still using fallback lab data and should be checked before you trust the guest-facing read.',
    bestNextMove: repairs > 0
      ? 'Review the home page and the most guest-visible secondary page first so you confirm the repaired structure still tells the right story.'
      : 'Review the home page and the most guest-visible secondary page first, then use the V2 page map and handoff packet to judge whether this should become the stronger editing lane.',
    decisionRule: 'Treat this as a working upgrade draft. Confirm the imported structure and preview truth before you keep editing in V2 long enough to make it your new steady lane.',
    watchout: repairs > 0
      ? 'A usable upgrade can still hide subtle meaning drift in normalized sections or starter blocks, so do not skip the first preview pass.'
      : 'Even a clean upgrade can still carry over weak copy or stale launch basics from the old draft, so do not mistake “opened cleanly” for “already finished.”',
    steps: [
      { label: 'Current', detail: `${report.pageCount} page${report.pageCount === 1 ? '' : 's'}, ${report.sectionCount} sections, and ${report.blockCount} blocks came forward into V2.` },
      { label: 'Next', detail: hasHydratedWeddingData ? 'Confirm the guest-facing page flow and preview content while the real wedding data is still loaded into the V2 working copy.' : 'Check the preview fields before you trust the guest-facing read, then review the page flow.' },
      { label: 'Then', detail: 'Use the V2 handoff, audit, and recovery tools to decide whether this draft is stronger here than in the old Builder.' },
    ],
    keyStats: [
      `${report.pageCount} page${report.pageCount === 1 ? '' : 's'}`,
      `${report.sectionCount} sections`,
      `${report.blockCount} blocks`,
      `${repairs} repairs`,
      hasHydratedWeddingData ? 'Wedding data carried forward' : 'Preview data still needs review',
    ],
  };
};
