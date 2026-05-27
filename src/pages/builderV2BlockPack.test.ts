import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2BlockPack,
  buildBuilderV2BlockPackSummary,
} from './builderV2BlockPack';

describe('builderV2BlockPack', () => {
  it('summarizes missing recommended blocks as a one-click pack', () => {
    const summary = buildBuilderV2BlockPackSummary({
      sectionTitle: 'Travel',
      sectionType: 'travel',
      currentBlocks: [{ id: 'one', type: 'text' }],
      availableBlockTypes: ['travelTip', 'hotelCard', 'text'],
      labels: {
        travelTip: 'Travel Tip',
        hotelCard: 'Hotel Card',
        text: 'Text Block',
      },
      availability: {
        travelTip: { ok: true, reason: '' },
        hotelCard: { ok: true, reason: '' },
        text: { ok: true, reason: '' },
      },
    });

    expect(summary.missingRecommendedTypes).toEqual(['travelTip', 'hotelCard']);
    expect(summary.buildableTypes).toEqual(['travelTip', 'hotelCard']);
    expect(summary.headline).toContain('Travel Tip + Hotel Card');
  });

  it('surfaces when a pack is blocked by availability limits', () => {
    const summary = buildBuilderV2BlockPackSummary({
      sectionTitle: 'Registry',
      sectionType: 'registry',
      currentBlocks: [{ id: 'one', type: 'title' }],
      availableBlockTypes: ['registryItem', 'fundHighlight', 'title'],
      labels: {
        registryItem: 'Registry Item',
        fundHighlight: 'Fund Highlight',
        title: 'Title',
      },
      availability: {
        registryItem: { ok: false, reason: 'Cap reached' },
        fundHighlight: { ok: false, reason: 'Cap reached' },
        title: { ok: true, reason: '' },
      },
    });

    expect(summary.buildableTypes).toEqual([]);
    expect(summary.blockedTypes).toEqual(['registryItem', 'fundHighlight']);
    expect(summary.headline).toContain('blocked');
  });

  it('builds default blocks only for currently buildable recommended types', () => {
    const blocks = buildBuilderV2BlockPack({
      sectionId: 'travel-1',
      sectionType: 'travel',
      currentBlocks: [{ id: 'intro', type: 'text' }],
      availableBlockTypes: ['travelTip', 'hotelCard', 'text'],
      labels: {
        travelTip: 'Travel Tip',
        hotelCard: 'Hotel Card',
        text: 'Text Block',
      },
      availability: {
        travelTip: { ok: true, reason: '' },
        hotelCard: { ok: false, reason: 'Cap reached' },
        text: { ok: true, reason: '' },
      },
      createDefaultData: (type) => ({ type, seeded: true }),
    });

    expect(blocks).toEqual([
      {
        id: 'travel-1-travelTip-pack-1',
        type: 'travelTip',
        content: 'Travel Tip',
        data: { type: 'travelTip', seeded: true },
      },
    ]);
  });
});
