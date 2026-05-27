import { describe, expect, it } from 'vitest';

import { duplicateBuilderV2Page, moveBuilderV2SectionsToPage } from './builderV2PageOperations';
import type { LabPage } from './builderV2PageState';

type BlockLike = {
  id: string;
  type: string;
  content: string;
  data?: Record<string, unknown>;
};

const makePages = (): LabPage[] => [
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    isHome: true,
    hidden: false,
    sections: [
      { id: 'hero', type: 'hero', title: 'Hero', variant: 'default', enabled: true, density: 'comfortable' },
      { id: 'story', type: 'story', title: 'Story', variant: 'timeline', enabled: true, density: 'comfortable' },
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    slug: 'travel',
    isHome: false,
    hidden: false,
    sections: [
      { id: 'schedule', type: 'schedule', title: 'Schedule', variant: 'dayTabs', enabled: true, density: 'comfortable' },
    ],
  },
];

const makeBlocks = (): Record<string, BlockLike[]> => ({
  hero: [{ id: 'hero-title', type: 'title', content: 'Welcome' }],
  story: [{ id: 'story-text', type: 'text', content: 'How we met' }],
  schedule: [{ id: 'schedule-event', type: 'event', content: 'Ceremony' }],
});

describe('builderV2PageOperations', () => {
  it('moves selected sections onto another page and preserves block bindings', () => {
    const result = moveBuilderV2SectionsToPage({
      pages: makePages(),
      sectionBlocks: makeBlocks(),
      sourcePageId: 'home',
      targetPageId: 'travel',
      selectedIds: ['story'],
    });

    expect(result.movedSectionIds).toEqual(['story']);
    expect(result.pages.find((page) => page.id === 'home')?.sections.map((section) => section.id)).toEqual(['hero']);
    expect(result.pages.find((page) => page.id === 'travel')?.sections.map((section) => section.id)).toEqual(['schedule', 'story']);
    expect(result.sectionBlocks.story?.[0]?.id).toBe('story-text');
  });

  it('duplicates a page with unique page, section, and block ids', () => {
    const result = duplicateBuilderV2Page({
      pages: makePages(),
      sectionBlocks: makeBlocks(),
      pageId: 'travel',
    });

    expect(result.duplicatedPageId).toBeTruthy();
    expect(result.pages).toHaveLength(3);

    const duplicatedPage = result.pages[2];
    expect(duplicatedPage).toMatchObject({
      title: 'Travel Copy',
      slug: 'travel-copy',
      isHome: false,
    });
    expect(duplicatedPage?.sections.map((section) => section.title)).toEqual(['Schedule Copy']);
    expect(duplicatedPage?.sections[0]?.id).not.toBe('schedule');
    expect(result.sectionBlocks[duplicatedPage.sections[0].id]?.[0]?.id).not.toBe('schedule-event');
  });

  it('returns the original state when the move request is invalid', () => {
    const pages = makePages();
    const sectionBlocks = makeBlocks();
    const result = moveBuilderV2SectionsToPage({
      pages,
      sectionBlocks,
      sourcePageId: 'home',
      targetPageId: 'home',
      selectedIds: ['hero'],
    });

    expect(result.pages).toBe(pages);
    expect(result.sectionBlocks).toBe(sectionBlocks);
    expect(result.movedSectionIds).toEqual([]);
  });
});
