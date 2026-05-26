import type { TemplateManifest } from '../builder/constants/templateSupportManifest';

export interface TemplateExperienceBrief {
  title: string;
  detail: string;
  confidenceLabel: string;
  callouts: string[];
}

export function buildTemplateExperienceBrief(args: {
  name: string;
  recommended: boolean;
  selected: boolean;
  supportManifest: TemplateManifest | null;
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
    callouts: [
      `${sectionsIncluded} starter sections · ${modulesIncluded} modules`,
      supportManifest?.templateExistsInBuilder ? 'Builder pack is already mapped.' : 'Builder pack mapping still needs a closer look.',
    ],
  };
}
