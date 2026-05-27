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
      createDefaultData: (sectionType, type) => ({ sectionType, type, seeded: true }),
    });

    expect(blocks).toEqual([
      {
        id: 'travel-1-travelTip-pack-1',
        type: 'travelTip',
        content: 'Travel Tip',
        data: { sectionType: 'travel', type: 'travelTip', seeded: true },
      },
    ]);
  });

  it('passes section type into pack default creation for long-tail sections', () => {
    const blocks = buildBuilderV2BlockPack({
      sectionId: 'menu-1',
      sectionType: 'menu',
      currentBlocks: [{ id: 'headline', type: 'title' }],
      availableBlockTypes: ['title', 'travelTip', 'story'],
      labels: {
        title: 'Title',
        travelTip: 'Menu Item',
        story: 'Menu Note',
      },
      availability: {
        title: { ok: true, reason: '' },
        travelTip: { ok: true, reason: '' },
        story: { ok: true, reason: '' },
      },
      createDefaultData: (sectionType, type) => ({ sectionType, type }),
    });

    expect(blocks).toEqual([
      {
        id: 'menu-1-travelTip-pack-1',
        type: 'travelTip',
        content: 'Menu Item',
        data: { sectionType: 'menu', type: 'travelTip' },
      },
      {
        id: 'menu-1-story-pack-2',
        type: 'story',
        content: 'Menu Note',
        data: { sectionType: 'menu', type: 'story' },
      },
    ]);
  });
});
