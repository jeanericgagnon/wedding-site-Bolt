import { describe, expect, it } from 'vitest';

import { cloneBuilderV2Sections } from './builderV2SectionClone';

describe('builderV2SectionClone', () => {
  it('duplicates selected sections after the last selected lane', () => {
    const result = cloneBuilderV2Sections({
      sections: [
        { id: 'hero', type: 'hero', title: 'Hero', variant: 'default', enabled: true, density: 'comfortable' as const },
        { id: 'story', type: 'story', title: 'Story', variant: 'timeline', enabled: true, density: 'comfortable' as const },
        { id: 'schedule', type: 'schedule', title: 'Schedule', variant: 'dayTabs', enabled: true, density: 'compact' as const },
      ],
      sectionBlocks: {
        story: [
          { id: 'story-title', type: 'title', content: 'Our story', data: { text: 'Our story' } },
        ],
      },
      selectedIds: ['story', 'schedule'],
    });

    expect(result.sections.map((section) => section.title)).toEqual([
      'Hero',
      'Story',
      'Schedule',
      'Story Copy',
      'Schedule Copy',
    ]);
    expect(result.duplicatedIds).toHaveLength(2);
    expect(result.sections[3]?.id).not.toBe('story');
    expect(result.sections[4]?.id).not.toBe('schedule');
  });

  it('clones block data with fresh ids', () => {
    const result = cloneBuilderV2Sections({
      sections: [
        { id: 'faq', type: 'faq', title: 'FAQ', variant: 'default', enabled: true, density: 'comfortable' as const },
      ],
      sectionBlocks: {
        faq: [
          { id: 'faq-q1', type: 'faqItem', content: 'Q', data: { question: 'Q', answer: 'A' } },
        ],
      },
      selectedIds: ['faq'],
    });

    const duplicatedSectionId = result.duplicatedIds[0];
    expect(duplicatedSectionId).toBeTruthy();
    expect(result.sectionBlocks[duplicatedSectionId]?.[0]?.id).not.toBe('faq-q1');
    expect(result.sectionBlocks[duplicatedSectionId]?.[0]?.data).toEqual({ question: 'Q', answer: 'A' });
  });

  it('returns the original state when nothing is selected', () => {
    const sections = [
      { id: 'hero', type: 'hero', title: 'Hero', variant: 'default', enabled: true, density: 'comfortable' as const },
    ];
    const sectionBlocks = {
      hero: [{ id: 'hero-title', type: 'title', content: 'Hero', data: { text: 'Hero' } }],
    };

    const result = cloneBuilderV2Sections({
      sections,
      sectionBlocks,
      selectedIds: [],
    });

    expect(result.sections).toBe(sections);
    expect(result.sectionBlocks).toBe(sectionBlocks);
    expect(result.duplicatedIds).toEqual([]);
  });
});
