import type { BuilderV2SetupSeed } from './builderV2SetupSeed';

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2SetupIntake = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
};

export const buildBuilderV2SetupIntake = (
  seed: BuilderV2SetupSeed,
): BuilderV2SetupIntake => {
  const pageCount = seed.pages.length;
  const sectionCount = seed.pages.reduce((total, page) => total + page.sections.length, 0);

  return {
    title: `${seed.templateName} is seeded as a V2 working draft`,
    detail: 'The setup draft carried couple, date, location, style, and template intent directly into Builder V2 so you can start from a shaped document instead of the generic lab starter.',
    bestNextMove: 'Review the home page first, then confirm the preview fields still match the actual couple, date, and location before you start deeper page edits.',
    decisionRule: 'Treat setup as a strong starting seed, not final wedding truth. Keep the inherited structure when it helps, but overwrite any placeholder copy the moment real details exist.',
    watchout: 'Template structure can be directionally right while travel, registry, FAQ, and guest-facing notes are still generic. Do not confuse a better starting page map with finished publish-ready content.',
    steps: [
      { label: 'Current', detail: `${seed.templateName} seeded ${pageCount} page${pageCount === 1 ? '' : 's'} and ${sectionCount} sections from setup draft intent.` },
      { label: 'Next', detail: 'Check the preview fields and the first two most guest-visible sections so names, date, and place read like this real couple.' },
      { label: 'Then', detail: 'Use the section guidance, page map, and handoff audit to turn the seeded structure into a fully authored V2 draft.' },
    ],
    keyStats: [
      seed.templateName,
      `${pageCount} page${pageCount === 1 ? '' : 's'}`,
      `${sectionCount} sections`,
      `${seed.hydratedFields.length} setup anchors`,
      ...seed.hydratedFields.slice(0, 3),
    ],
  };
};
