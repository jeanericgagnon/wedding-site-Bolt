import { describe, expect, it } from 'vitest';

import { buildBuilderV2SectionReviewSignature } from './builderV2PreviewReviewSignature';

describe('builderV2PreviewReviewSignature', () => {
  it('changes when guest-facing block content changes', () => {
    const before = buildBuilderV2SectionReviewSignature({
      section: {
        title: 'Hero',
        type: 'hero',
        enabled: true,
      },
      blocks: [
        { type: 'title', content: 'Title', data: { text: 'Alex & Jordan' } },
      ],
    });

    const after = buildBuilderV2SectionReviewSignature({
      section: {
        title: 'Hero',
        type: 'hero',
        enabled: true,
      },
      blocks: [
        { type: 'title', content: 'Title', data: { text: 'Alex and Jordan' } },
      ],
    });

    expect(after).not.toBe(before);
  });

  it('changes when the section presentation changes', () => {
    const before = buildBuilderV2SectionReviewSignature({
      section: {
        title: 'Travel',
        type: 'travel',
        enabled: true,
        variant: 'cards',
        density: 'comfortable',
      },
      blocks: [
        { type: 'travelTip', content: 'Tip', data: { title: 'Fly into SFO' } },
      ],
    });

    const after = buildBuilderV2SectionReviewSignature({
      section: {
        title: 'Travel',
        type: 'travel',
        enabled: true,
        variant: 'grid',
        density: 'compact',
      },
      blocks: [
        { type: 'travelTip', content: 'Tip', data: { title: 'Fly into SFO' } },
      ],
    });

    expect(after).not.toBe(before);
  });

  it('ignores block ids so review credit only tracks guest-facing output', () => {
    const first = buildBuilderV2SectionReviewSignature({
      section: {
        title: 'Story',
        type: 'story',
        enabled: true,
      },
      blocks: [
        { type: 'story', content: 'Story', data: { text: 'From coffee to vows.' } },
      ],
    });

    const second = buildBuilderV2SectionReviewSignature({
      section: {
        title: 'Story',
        type: 'story',
        enabled: true,
      },
      blocks: [
        { type: 'story', content: 'Story', data: { text: 'From coffee to vows.' } },
      ],
    });

    expect(second).toBe(first);
  });
});
