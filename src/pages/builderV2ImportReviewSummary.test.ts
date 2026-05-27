import { describe, expect, it } from 'vitest';

import { buildBuilderV2ImportReviewSummary } from './builderV2ImportReviewSummary';

const baseReport = {
  pageCount: 2,
  sectionCount: 4,
  blockCount: 9,
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

describe('builderV2ImportReviewSummary', () => {
  it('frames clean native v2 imports clearly', () => {
    const summary = buildBuilderV2ImportReviewSummary(
      { ...baseReport, sourceKind: 'builder-v2' as const },
      'demo.json',
    );

    expect(summary.sourceLabel).toBe('Builder V2 export');
    expect(summary.headline).toContain('Clean Builder V2 import');
    expect(summary.toastMessage).toContain('Imported clean Builder V2 layout');
    expect(summary.keyStats).toContain('2 pages');
  });

  it('surfaces legacy migration repair notes', () => {
    const summary = buildBuilderV2ImportReviewSummary(
      {
        ...baseReport,
        sourceKind: 'builder-project' as const,
        normalizedSectionTypes: 2,
        recoveredBlockDataFromLegacyContent: 1,
        notes: ['Imported a legacy builder project and mapped it onto the Builder V2 document model.'],
      },
      'legacy-project.json',
    );

    expect(summary.headline).toContain('Legacy migration repaired mild drift');
    expect(summary.toastMessage).toContain('Migrated legacy-project.json (legacy builder project)');
    expect(summary.notesTitle).toContain('Migration repair');
    expect(summary.topNotes.some((note) => note.includes('Normalized 2 section types'))).toBe(true);
  });

  it('surfaces dropped-content migration risk clearly', () => {
    const summary = buildBuilderV2ImportReviewSummary(
      {
        ...baseReport,
        sourceKind: 'layout-config-v1' as const,
        droppedInvalidSections: 1,
        notes: ['Dropped section 3 because it had no type.'],
      },
      'legacy-layout.json',
    );

    expect(summary.headline).toContain('dropped invalid content');
    expect(summary.detail).toContain('left behind');
    expect(summary.notesTitle).toContain('Migration risk');
    expect(summary.topNotes[0]).toContain('Dropped section 3');
  });
});
