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
    expect(getBuilderV2StarterBlockTypes('menu', ['title', 'travelTip', 'story', 'text'])).toEqual(['title', 'travelTip', 'story']);
    expect(getBuilderV2StarterBlockTypes('wedding-party', ['photo', 'title', 'text'])).toEqual(['title', 'photo', 'title', 'photo']);
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

  it('builds long-tail starter summaries with the richer section spine', () => {
    const summary = buildBuilderV2SectionStarterSummary(
      'Music',
      'music',
      ['title', 'travelTip', 'story', 'text'],
      {
        title: 'Title',
        travelTip: 'Link or Track',
        story: 'Request Note',
        text: 'Text Block',
      },
    );

    expect(summary.blockTypes).toEqual(['title', 'travelTip', 'story']);
    expect(summary.headline).toContain('Title + Link or Track + Request Note');
  });

  it('builds a side-aware wedding-party starter summary', () => {
    const summary = buildBuilderV2SectionStarterSummary(
      'Wedding Party',
      'wedding-party',
      ['photo', 'title', 'text'],
      {
        title: 'Title',
        photo: 'Photo',
        text: 'Text',
      },
    );

    expect(summary.blockTypes).toEqual(['title', 'photo', 'title', 'photo']);
    expect(summary.headline).toContain('Side Heading + Party Member + Side Heading + Party Member');
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
      createDefaultData: (sectionType, type, index) => ({ sectionType, type, index, seeded: true }),
    });

    expect(blocks).toEqual([
      {
        id: 'travel-1-travelTip-starter-1',
        type: 'travelTip',
        content: 'Travel Tip',
        data: { sectionType: 'travel', type: 'travelTip', index: 0, seeded: true },
      },
      {
        id: 'travel-1-hotelCard-starter-2',
        type: 'hotelCard',
        content: 'Hotel Card',
        data: { sectionType: 'travel', type: 'hotelCard', index: 1, seeded: true },
      },
    ]);
  });

  it('passes section type into starter block default creation for long-tail sections', () => {
    const blocks = buildBuilderV2StarterBlocks({
      sectionId: 'music-1',
      sectionType: 'music',
      availableBlockTypes: ['title', 'travelTip', 'story'],
      labels: {
        title: 'Title',
        travelTip: 'Link or Track',
        story: 'Request Note',
      },
      createDefaultData: (sectionType, type) => ({ sectionType, type }),
    });

    expect(blocks.map((block) => block.data)).toEqual([
      { sectionType: 'music', type: 'title' },
      { sectionType: 'music', type: 'travelTip' },
      { sectionType: 'music', type: 'story' },
    ]);
  });

  it('supports a repeated wedding-party starter spine', () => {
    const blocks = buildBuilderV2StarterBlocks({
      sectionId: 'party-1',
      sectionType: 'wedding-party',
      availableBlockTypes: ['photo', 'title', 'text'],
      labels: {
        title: 'Title',
        photo: 'Photo',
        text: 'Text',
      },
      createDefaultData: (sectionType, type, index) => ({ sectionType, type, index }),
    });

    expect(blocks.map((block) => block.type)).toEqual(['title', 'photo', 'title', 'photo']);
    expect(blocks.map((block) => block.data)).toEqual([
      { sectionType: 'wedding-party', type: 'title', index: 0 },
      { sectionType: 'wedding-party', type: 'photo', index: 1 },
      { sectionType: 'wedding-party', type: 'title', index: 2 },
      { sectionType: 'wedding-party', type: 'photo', index: 3 },
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
        createDefaultData: (_sectionType, type) => ({ type }),
      }),
    });

    expect(result.restoredSectionIds).toEqual(['travel-1', 'faq-1']);
    expect(result.restoredBlockCount).toBe(4);
    expect(result.sectionBlocks['gallery-1']).toEqual([{ id: 'old-2', type: 'photo', content: 'Old', data: { type: 'photo' } }]);
    expect(result.sectionBlocks['travel-1'].map((block) => block.type)).toEqual(['travelTip', 'hotelCard']);
    expect(result.sectionBlocks['faq-1'].map((block) => block.type)).toEqual(['faqItem', 'qna']);
  });
});
