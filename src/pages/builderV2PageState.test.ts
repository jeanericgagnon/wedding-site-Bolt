import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2DocumentPages,
  ensureUniqueBuilderV2PageSlug,
  getLabPagesFromBuilderV2Document,
  normalizeBuilderV2Pages,
} from './builderV2PageState';

describe('builder v2 page state', () => {
  it('keeps one visible home page and unique slugs', () => {
    const pages = normalizeBuilderV2Pages([
      {
        id: 'story',
        title: 'Story',
        slug: 'home',
        isHome: false,
        hidden: true,
        sections: [],
      },
      {
        id: 'home',
        title: 'Welcome',
        slug: 'home',
        isHome: true,
        hidden: true,
        sections: [],
      },
    ]);

    expect(pages.map((page) => ({ id: page.id, slug: page.slug, isHome: page.isHome, hidden: page.hidden }))).toEqual([
      { id: 'story', slug: 'home-2', isHome: false, hidden: true },
      { id: 'home', slug: 'home', isHome: true, hidden: false },
    ]);
  });

  it('hydrates legacy single-page documents into one home page', () => {
    const pages = getLabPagesFromBuilderV2Document({
      version: 'v2',
      updatedAtISO: '2026-05-27T18:00:00.000Z',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          variant: 'default',
          enabled: true,
          title: 'Hero',
          blocks: [],
        },
      ],
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      id: 'home',
      title: 'Home',
      slug: 'home',
      isHome: true,
      hidden: false,
    });
    expect(pages[0]?.sections[0]?.id).toBe('hero');
  });

  it('builds export-ready document pages with normalized slugs', () => {
    const pages = buildBuilderV2DocumentPages(
      [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [{ id: 'hero', type: 'hero', title: 'Hero', variant: 'default', enabled: true }],
        },
        {
          id: 'travel',
          title: 'Travel Details',
          slug: 'home',
          isHome: false,
          hidden: false,
          sections: [{ id: 'travel-section', type: 'travel', title: 'Travel', variant: 'default', enabled: true }],
        },
      ],
      (page) => page.sections.map((section) => ({
        id: section.id,
        type: section.type,
        variant: section.variant,
        enabled: section.enabled,
        title: section.title,
        blocks: [],
      })),
    );

    expect(pages.map((page) => page.slug)).toEqual(['home', 'home-2']);
  });

  it('makes clean fallback slugs for new pages', () => {
    const slug = ensureUniqueBuilderV2PageSlug('Travel & Stay', [
      { id: 'home', slug: 'home' },
      { id: 'travel', slug: 'travel-stay' },
    ]);

    expect(slug).toBe('travel-stay-2');
  });
});
