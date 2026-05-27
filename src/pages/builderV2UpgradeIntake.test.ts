import { describe, expect, it } from 'vitest';

import { buildBuilderV2UpgradeIntake } from './builderV2UpgradeIntake';

const baseReport = {
  sourceKind: 'builder-project' as const,
  pageCount: 2,
  sectionCount: 5,
  blockCount: 10,
  normalizedVersion: false,
  normalizedUpdatedAt: false,
  generatedPageIds: 0,
  dedupedPageIds: 0,
  normalizedPageTitles: 0,
  normalizedPageSlugs: 0,
  normalizedPageVisibility: 0,
  normalizedHomePage: false,
  generatedSectionIds: 0,
  generatedBlockIds: 0,
  dedupedSectionIds: 0,
  dedupedBlockIds: 0,
  normalizedSectionTypes: 0,
  normalizedBlockTypes: 0,
  defaultedVariants: 0,
  coercedEnabledFlags: 0,
  normalizedTitles: 0,
  normalizedSubtitles: 0,
  resetInvalidBlockData: 0,
  recoveredBlockDataFromLegacyContent: 0,
  droppedInvalidSections: 0,
  droppedInvalidBlocks: 0,
  notes: [] as string[],
};

describe('builderV2UpgradeIntake', () => {
  it('acknowledges hydrated wedding data when the Builder draft carries context forward', () => {
    const intake = buildBuilderV2UpgradeIntake('Alex & Jordan current builder draft', baseReport, {
      hydratedWeddingData: true,
    });

    expect(intake.title).toContain('working V2 draft');
    expect(intake.detail).toContain('wedding-data context');
    expect(intake.keyStats).toContain('Wedding data carried forward');
  });

  it('keeps preview review caution visible when hydration is missing', () => {
    const intake = buildBuilderV2UpgradeIntake('Current builder draft', {
      ...baseReport,
      normalizedBlockTypes: 2,
    }, {
      hydratedWeddingData: false,
    });

    expect(intake.bestNextMove).toContain('guest-visible secondary page');
    expect(intake.watchout).toContain('preview pass');
    expect(intake.keyStats).toContain('Preview data still needs review');
  });
});
