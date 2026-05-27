import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';
import { buildPublishReadiness } from '../utils/publishReadiness';

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2UpgradeGuidance = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
};

export const buildBuilderV2UpgradeGuidance = (
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: { isDirty?: boolean },
): BuilderV2UpgradeGuidance => {
  const pages = project.pages ?? [];
  const visibleSections = pages.reduce(
    (count, page) => count + page.sections.filter((section) => section.enabled).length,
    0,
  );
  const hiddenSections = pages.reduce(
    (count, page) => count + page.sections.filter((section) => !section.enabled).length,
    0,
  );
  const readiness = buildPublishReadiness(project, weddingData, { isDirty: options?.isDirty });
  const missingBasics = readiness.filter((item) => !item.done && item.id !== 'saved').length;
  const needsSave = options?.isDirty === true;

  return {
    title: missingBasics > 0
      ? 'Use V2 to carry the current structure forward while you tighten the guest-facing basics next'
      : 'Use V2 to inspect page flow, section structure, and handoff quality on a working copy of this draft',
    detail: missingBasics > 0
      ? 'The upgrade opens a working V2 copy of this Builder draft so you can keep the current structure, then review the missing launch basics without rebuilding from scratch.'
      : 'The upgrade opens a working V2 copy of this Builder draft so you can test the stronger page-map, handoff, and recovery tools on the structure you already trust.',
    bestNextMove: needsSave
      ? 'Open the V2 copy, confirm the page map and guest-facing structure first, then decide whether the V2 lane is the better place to keep refining this draft.'
      : 'Open the V2 copy, review the home page and strongest guest-facing page first, then keep shaping the document where the V2 tools are genuinely clearer.',
    decisionRule: 'Use V2 when you want stronger structure review and migration proof; stay in the current Builder only when you are still doing quick local edits that do not need the V2 workflow yet.',
    watchout: 'This opens a working copy, not a published switch. Review the imported structure before you treat the V2 draft as the new source of truth.',
    steps: [
      { label: 'Current', detail: `${pages.length} page${pages.length === 1 ? '' : 's'} and ${visibleSections} visible section${visibleSections === 1 ? '' : 's'} are ready to carry forward.` },
      { label: 'Next', detail: missingBasics > 0 ? `Review the ${missingBasics} remaining launch basic${missingBasics === 1 ? '' : 's'} after the draft opens in V2.` : 'Check the page map, preview flow, and handoff packet in V2 before editing deeper.' },
      { label: 'Then', detail: 'Keep refining in the lane that gives the clearest next move, not just the familiar one.' },
    ],
    keyStats: [
      `${pages.length} page${pages.length === 1 ? '' : 's'}`,
      `${visibleSections} visible section${visibleSections === 1 ? '' : 's'}`,
      `${hiddenSections} hidden section${hiddenSections === 1 ? '' : 's'}`,
      needsSave ? 'Unsaved Builder edits included' : 'Builder draft already saved',
    ],
  };
};
