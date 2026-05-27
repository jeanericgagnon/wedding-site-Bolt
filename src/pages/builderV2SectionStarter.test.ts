import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2StarterBlocks,
  buildBuilderV2SectionStarterSummary,
  getBuilderV2StarterBlockTypes,
  restoreBuilderV2SectionStarterBlocks,
} from './builderV2SectionStarter';

describe('builderV2SectionStarter', () => {
  it('builds section-specific starter block plans', () => {
    expect(getBuilderV2StarterBlockTypes('schedule', ['event', 'title', 'text', 'photo'])).toEqual(['event', 'title']);
    expect(getBuilderV2StarterBlockTypes('gallery', ['photo', 'title', 'text'])).toEqual(['photo', 'title']);
  });

  it('falls back to the first available block types when recommendations are unavailable', () => {
    expect(getBuilderV2StarterBlockTypes('custom', ['title', 'text', 'photo'])).toEqual(['title', 'text']);
  });

  it('builds human-readable starter summaries', () => {
    const summary = buildBuilderV2SectionStarterSummary(
      'Travel',
      'travel',
      ['travelTip', 'hotelCard', 'text'],
      {
        travelTip: 'Travel Tip',
        hotelCard: 'Hotel Card',
        text: 'Text Block',
      },
    );

    expect(summary.blockTypes).toEqual(['travelTip', 'hotelCard']);
    expect(summary.headline).toContain('Travel Tip + Hotel Card');
    expect(summary.detail).toContain('seed a first readable spine');
  });

  it('builds starter blocks with deterministic starter ids and default data', () => {
    const blocks = buildBuilderV2StarterBlocks({
      sectionId: 'travel-1',
      sectionType: 'travel',
      availableBlockTypes: ['travelTip', 'hotelCard', 'text'],
      labels: {
        travelTip: 'Travel Tip',
        hotelCard: 'Hotel Card',
        text: 'Text Block',
      },
      createDefaultData: (type) => ({ type, seeded: true }),
    });

    expect(blocks).toEqual([
      {
        id: 'travel-1-travelTip-starter-1',
        type: 'travelTip',
        content: 'Travel Tip',
        data: { type: 'travelTip', seeded: true },
      },
      {
        id: 'travel-1-hotelCard-starter-2',
        type: 'hotelCard',
        content: 'Hotel Card',
        data: { type: 'hotelCard', seeded: true },
      },
    ]);
  });

  it('restores starter blocks for the selected sections only', () => {
    const result = restoreBuilderV2SectionStarterBlocks({
      sections: [
        { id: 'travel-1', type: 'travel', title: 'Travel' },
        { id: 'gallery-1', type: 'gallery', title: 'Gallery' },
        { id: 'faq-1', type: 'faq', title: 'FAQ' },
      ],
      sectionBlocks: {
        'travel-1': [{ id: 'old-1', type: 'text', content: 'Old', data: { type: 'text' } }],
        'gallery-1': [{ id: 'old-2', type: 'photo', content: 'Old', data: { type: 'photo' } }],
        'faq-1': [{ id: 'old-3', type: 'faqItem', content: 'Old', data: { type: 'faqItem' } }],
      },
      selectedIds: ['travel-1', 'faq-1'],
      availableBlockTypesBySection: {
        travel: ['travelTip', 'hotelCard', 'text'],
        gallery: ['photo', 'title', 'text'],
        faq: ['faqItem', 'qna', 'title'],
      },
      buildStarterBlocks: (sectionId, sectionType) => buildBuilderV2StarterBlocks({
        sectionId,
        sectionType,
        availableBlockTypes: {
          travel: ['travelTip', 'hotelCard', 'text'],
          gallery: ['photo', 'title', 'text'],
          faq: ['faqItem', 'qna', 'title'],
        }[sectionType] ?? ['title', 'text'],
        labels: {
          travelTip: 'Travel Tip',
          hotelCard: 'Hotel Card',
          text: 'Text Block',
          photo: 'Photo',
          title: 'Title',
          faqItem: 'FAQ Item',
          qna: 'Q&A',
        },
        createDefaultData: (type) => ({ type }),
      }),
    });

    expect(result.restoredSectionIds).toEqual(['travel-1', 'faq-1']);
    expect(result.restoredBlockCount).toBe(4);
    expect(result.sectionBlocks['gallery-1']).toEqual([{ id: 'old-2', type: 'photo', content: 'Old', data: { type: 'photo' } }]);
    expect(result.sectionBlocks['travel-1'].map((block) => block.type)).toEqual(['travelTip', 'hotelCard']);
    expect(result.sectionBlocks['faq-1'].map((block) => block.type)).toEqual(['faqItem', 'qna']);
  });
});
