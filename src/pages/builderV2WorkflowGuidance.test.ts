import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2CommandPaletteGuidance,
  buildBuilderV2ImportGuidance,
  getImportSummaryTone,
  summarizeImportRepairCount,
} from './builderV2WorkflowGuidance';

describe('builderV2WorkflowGuidance', () => {
  it('builds an empty import guidance state', () => {
    const guidance = buildBuilderV2ImportGuidance(null, 'Pasted JSON');
    expect(guidance.tone).toBe('empty');
    expect(guidance.bestNextMove).toContain('Upload or paste');
  });

  it('builds repaired import guidance from a partially normalized report', () => {
    const report = {
      pageCount: 1,
      sectionCount: 3,
      blockCount: 8,
      normalizedVersion: true,
      normalizedUpdatedAt: false,
      generatedPageIds: 0,
      dedupedPageIds: 0,
      normalizedPageTitles: 0,
      normalizedPageSlugs: 0,
      normalizedPageVisibility: 0,
      normalizedHomePage: false,
      generatedSectionIds: 1,
      generatedBlockIds: 0,
      dedupedSectionIds: 0,
      dedupedBlockIds: 0,
      normalizedSectionTypes: 1,
      normalizedBlockTypes: 1,
      defaultedVariants: 1,
      coercedEnabledFlags: 0,
      normalizedTitles: 0,
      normalizedSubtitles: 0,
      resetInvalidBlockData: 0,
      recoveredBlockDataFromLegacyContent: 1,
      droppedInvalidSections: 0,
      droppedInvalidBlocks: 0,
      notes: [],
    };

    expect(summarizeImportRepairCount(report)).toBeGreaterThan(0);
    expect(getImportSummaryTone(report)).toBe('repaired');

    const guidance = buildBuilderV2ImportGuidance(report, 'sample.json');
    expect(guidance.title).toContain('recoverable drift');
    expect(guidance.keyStats).toContain('3 sections');
  });

  it('builds caution import guidance when content was dropped', () => {
    const report = {
      pageCount: 1,
      sectionCount: 2,
      blockCount: 4,
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
      droppedInvalidSections: 1,
      droppedInvalidBlocks: 1,
      notes: ['Dropped section'],
    };

    const guidance = buildBuilderV2ImportGuidance(report, 'legacy.json');
    expect(guidance.tone).toBe('caution');
    expect(guidance.watchout).toContain('missing');
  });

  it('builds command palette guidance for empty, focused, and zero-result searches', () => {
    const baseItems = [
      { id: '1', group: 'Add', label: 'Add section: Hero' },
      { id: '2', group: 'Select', label: 'Select section: Schedule' },
    ];

    const idle = buildBuilderV2CommandPaletteGuidance('', baseItems, ['Select section: Schedule'], ['Add section: Hero']);
    expect(idle.title).toContain('ready for quick structural moves');

    const focused = buildBuilderV2CommandPaletteGuidance('add', baseItems.slice(0, 1), ['Select section: Schedule'], ['Add section: Hero']);
    expect(focused.title).toContain('add command');
    expect(focused.suggestedQueries[0]).toBe('Add section: Hero');

    const empty = buildBuilderV2CommandPaletteGuidance('hotel', [], [], []);
    expect(empty.title).toContain('No matching commands');
    expect(empty.bestNextMove).toContain('Shorten the query');
  });
});
