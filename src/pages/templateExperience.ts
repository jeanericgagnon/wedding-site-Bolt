import type { TemplateSupportManifest } from '../builder/constants/templateSupportManifest';

export interface TemplateExperienceBrief {
  title: string;
  detail: string;
  confidenceLabel: string;
  bestNextStep: string;
  watchouts: string[];
  callouts: string[];
}

export function buildTemplateExperienceBrief(args: {
  name: string;
  recommended: boolean;
  selected: boolean;
  supportManifest: TemplateSupportManifest | null;
  compareCount: number;
}): TemplateExperienceBrief {
  const { name, recommended, selected, supportManifest, compareCount } = args;
  const previewStatus = supportManifest?.previewStatus ?? 'planned';
  const sectionsIncluded = supportManifest?.sectionsIncluded ?? 0;
  const modulesIncluded = supportManifest?.modulesIncluded ?? 0;

  if (selected) {
    return {
      title: `${name} is already carrying your setup`,
      detail: 'This design is already the one your setup draft is shaping around, so the next best move is refining it rather than restarting from scratch.',
      confidenceLabel: 'Selected',
      bestNextStep: 'Keep this direction and focus on making the guest-facing sections feel real before swapping designs.',
      watchouts: [],
      callouts: [
        `${sectionsIncluded} starter sections already mapped`,
        `${modulesIncluded} modules included in the first pass`,
      ],
    };
  }

  if (recommended) {
    return {
      title: `${name} is your strongest current fit`,
      detail: 'This design lines up best with the setup draft you have already started, so it should need less cleanup after the first draft loads.',
      confidenceLabel: previewStatus === 'verified' ? 'High confidence' : 'Good fit',
      bestNextStep: previewStatus === 'verified'
        ? 'Use this as your starting point and spend the next pass on content clarity, not design churn.'
        : 'This fit is strong, but preview it once before you fully commit so the structure feels right.',
      watchouts: supportManifest?.templateExistsInBuilder
        ? []
        : ['Builder support for this design still needs a closer look before you treat it as the easiest launch path.'],
      callouts: [
        previewStatus === 'verified' ? 'Builder preview support is already verified.' : 'Support is still growing, but the recommendation fit is strong.',
        `${sectionsIncluded} starter sections · ${modulesIncluded} modules`,
      ],
    };
  }

  return {
    title: compareCount > 0 ? `${name} is worth comparing on structure, not just style` : `${name} is viable if the visual direction feels right`,
    detail: compareCount > 0
      ? 'Use compare mode to see whether the section order and module shape actually match how you want the wedding weekend to read.'
      : 'This can still work well, but it is less likely to feel pre-aligned with the setup draft than the recommended options.',
    confidenceLabel: previewStatus === 'verified' ? 'Ready to preview' : 'Needs a closer look',
    bestNextStep: compareCount > 0
      ? 'Use compare mode, then choose the option that needs the least structural cleanup after setup.'
      : 'Open the full detail view and make sure the section flow matches how you want guests to read the weekend.',
    watchouts: supportManifest?.templateExistsInBuilder
      ? []
      : ['This design may still need extra builder cleanup compared with the stronger recommended options.'],
    callouts: [
      `${sectionsIncluded} starter sections · ${modulesIncluded} modules`,
      supportManifest?.templateExistsInBuilder ? 'Builder pack is already mapped.' : 'Builder pack mapping still needs a closer look.',
    ],
  };
}
