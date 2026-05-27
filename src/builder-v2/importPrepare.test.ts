import { describe, expect, it } from 'vitest';

import { prepareImportedBuilderV2Document } from './importPrepare';

describe('prepareImportedBuilderV2Document', () => {
  it('recovers common drift and legacy content into a usable v2 document', () => {
    const result = prepareImportedBuilderV2Document({
      version: '2',
      updatedAtISO: 'not-a-date',
      sections: [
        {
          type: 'RegistrySection',
          variant: '',
          enabled: 'false',
          blocks: [
            { type: 'FAQ', content: 'Q: Can I bring kids? A: Please follow your invite.' },
            { id: 'hero block', type: 'fund-highlight', data: 'bad-data' },
          ],
        },
      ],
    }, { nowIso: '2026-05-27T18:00:00.000Z' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.doc).toMatchObject({
      version: 'v2',
      updatedAtISO: '2026-05-27T18:00:00.000Z',
      sections: [
        {
          id: 'import-section-1',
          type: 'registry',
          variant: 'default',
          enabled: false,
          title: 'Registry',
          blocks: [
            {
              id: 'import-section-1-block-1',
              type: 'faqItem',
              data: {
                question: 'Can I bring kids?',
                answer: 'Please follow your invite.',
              },
            },
            {
              id: 'hero-block',
              type: 'fundHighlight',
              data: {},
            },
          ],
        },
      ],
    });

    expect(result.report.normalizedVersion).toBe(true);
    expect(result.report.normalizedUpdatedAt).toBe(true);
    expect(result.report.generatedSectionIds).toBe(1);
    expect(result.report.generatedBlockIds).toBe(1);
    expect(result.report.normalizedSectionTypes).toBe(1);
    expect(result.report.normalizedBlockTypes).toBe(2);
    expect(result.report.defaultedVariants).toBe(1);
    expect(result.report.coercedEnabledFlags).toBe(1);
    expect(result.report.resetInvalidBlockData).toBe(1);
    expect(result.report.recoveredBlockDataFromLegacyContent).toBe(1);
  });

  it('dedupes repeated ids and drops unusable sections or blocks', () => {
    const result = prepareImportedBuilderV2Document({
      version: 'v2',
      updatedAtISO: '2026-05-27T18:00:00.000Z',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          variant: 'default',
          enabled: true,
          blocks: [
            { id: 'block', type: 'title', data: { text: 'Hello' } },
            null,
          ],
        },
        {
          id: 'hero',
          type: 'Hero Section',
          variant: 'default',
          enabled: true,
          blocks: [
            { id: 'block', type: 'text', data: { text: 'Second' } },
          ],
        },
        null,
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.doc.sections.map((section) => section.id)).toEqual(['hero', 'hero-2']);
    expect(result.doc.sections[1]?.type).toBe('hero');
    expect(result.doc.sections[1]?.blocks[0]?.id).toBe('block');
    expect(result.report.dedupedSectionIds).toBe(1);
    expect(result.report.droppedInvalidSections).toBe(1);
    expect(result.report.droppedInvalidBlocks).toBe(1);
  });

  it('fails when there are no usable sections left after import cleanup', () => {
    const result = prepareImportedBuilderV2Document({
      version: 'v2',
      updatedAtISO: '2026-05-27T18:00:00.000Z',
      sections: [{ id: 'x' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('usable sections');
  });
});
