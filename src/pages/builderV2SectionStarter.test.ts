import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2SectionStarterSummary,
  getBuilderV2StarterBlockTypes,
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
});
