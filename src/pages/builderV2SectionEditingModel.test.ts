import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2AddBlockLibrary,
  buildBuilderV2SectionEditingGuidance,
  getRecommendedBlockTypes,
} from './builderV2SectionEditingModel';

describe('builderV2SectionEditingModel', () => {
  it('recommends section-specific anchor blocks', () => {
    expect(getRecommendedBlockTypes('schedule', ['title', 'text', 'event', 'photo'])).toEqual(['event', 'title', 'text']);
    expect(getRecommendedBlockTypes('unknown', ['title', 'text', 'photo'])).toEqual(['title', 'text', 'photo']);
  });

  it('builds empty-section guidance that pushes first structure', () => {
    const guidance = buildBuilderV2SectionEditingGuidance({
      section: { id: 'schedule-1', type: 'schedule', title: 'Schedule', enabled: true, variant: 'dayTabs' },
      blocks: [],
      warningCount: 0,
      availableBlockTypes: ['event', 'title', 'text'],
      recommendedBlockTypes: ['event', 'title', 'text'],
      limitTotal: 10,
    });

    expect(guidance.title).toContain('first content spine');
    expect(guidance.bestNextMove).toContain('event + title');
    expect(guidance.suggestedBlockTypes).toEqual(['event', 'title', 'text']);
  });

  it('builds warning-first guidance when incomplete blocks exist', () => {
    const guidance = buildBuilderV2SectionEditingGuidance({
      section: { id: 'faq-1', type: 'faq', title: 'FAQ', enabled: true, variant: 'default' },
      blocks: [{ id: 'b1', type: 'faqItem' }, { id: 'b2', type: 'title' }],
      warningCount: 2,
      availableBlockTypes: ['faqItem', 'qna', 'title'],
      recommendedBlockTypes: ['faqItem', 'qna', 'title'],
      limitTotal: 12,
    });

    expect(guidance.title).toContain('incomplete block details');
    expect(guidance.bestNextMove).toContain('Finish the incomplete blocks first');
    expect(guidance.steps[0].detail).toContain('validation warnings');
  });

  it('builds add-block library guidance with recommended blocks first', () => {
    const library = buildBuilderV2AddBlockLibrary({
      query: '',
      availableBlockTypes: ['text', 'title', 'photo'],
      currentBlockTypes: ['title'],
      recommendedBlockTypes: ['title', 'photo'],
      labels: { title: 'Title', text: 'Text Block', photo: 'Photo' },
      descriptions: { title: 'Heading', text: 'Paragraph', photo: 'Image' },
      availability: {
        text: { ok: true, reason: '' },
        title: { ok: true, reason: '' },
        photo: { ok: true, reason: '' },
      },
    });

    expect(library.headline).toContain('Recommended structural blocks');
    expect(library.entries[0]?.type).toBe('photo');
    expect(library.recommendedVisibleCount).toBe(1);
  });

  it('builds empty add-block search guidance when query hides everything', () => {
    const library = buildBuilderV2AddBlockLibrary({
      query: 'hotel',
      availableBlockTypes: ['text', 'title', 'photo'],
      currentBlockTypes: [],
      recommendedBlockTypes: ['title'],
      labels: { title: 'Title', text: 'Text Block', photo: 'Photo' },
      descriptions: { title: 'Heading', text: 'Paragraph', photo: 'Image' },
      availability: {
        text: { ok: true, reason: '' },
        title: { ok: true, reason: '' },
        photo: { ok: true, reason: '' },
      },
    });

    expect(library.empty).toBe(true);
    expect(library.bestNextMove).toContain('Clear or widen the search');
  });
});
