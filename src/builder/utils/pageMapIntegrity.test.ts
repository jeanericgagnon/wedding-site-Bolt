import { describe, expect, it } from 'vitest';

import {
  ensureUniquePageSlug,
  getBuilderPageIntegritySummary,
  normalizeBuilderPages,
  sanitizePageSlug,
} from './pageMapIntegrity';

describe('pageMapIntegrity', () => {
  it('creates stable unique slugs when duplicates already exist', () => {
    const pages = [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        sections: [],
        meta: { isHome: true, isHidden: false },
      },
      {
        id: 'story',
        title: 'Story',
        slug: 'story',
        orderIndex: 1,
        sections: [],
        meta: { isHome: false, isHidden: false },
      },
    ] as never[];

    expect(ensureUniquePageSlug('story', pages)).toBe('story-2');
  });

  it('normalizes imported pages into one visible home page with unique slugs', () => {
    const normalized = normalizeBuilderPages([
      {
        id: 'one',
        title: ' Welcome ',
        slug: 'home',
        orderIndex: 5,
        sections: [],
        meta: { isHome: false, isHidden: true },
      },
      {
        id: 'two',
        title: 'Travel',
        slug: 'home',
        orderIndex: 8,
        sections: [],
        meta: { isHome: true, isHidden: true },
      },
      {
        id: 'three',
        title: '  ',
        slug: '',
        orderIndex: 9,
        sections: [],
        meta: { isHome: true, isHidden: false },
      },
    ] as never[]);

    expect(normalized.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      orderIndex: page.orderIndex,
      meta: page.meta,
    }))).toEqual([
      {
        id: 'one',
        title: 'Welcome',
        slug: 'home',
        orderIndex: 0,
        meta: { isHome: false, isHidden: true },
      },
      {
        id: 'two',
        title: 'Travel',
        slug: 'home-2',
        orderIndex: 1,
        meta: { isHome: true, isHidden: false },
      },
      {
        id: 'three',
        title: 'Page 3',
        slug: 'page-3',
        orderIndex: 2,
        meta: { isHome: false, isHidden: false },
      },
    ]);
  });

  it('surfaces duplicate slugs and hidden empty pages as watchouts', () => {
    const summary = getBuilderPageIntegritySummary([
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        sections: [{ id: 'hero' }],
        meta: { isHome: true, isHidden: false },
      },
      {
        id: 'story',
        title: 'Story',
        slug: 'travel',
        orderIndex: 1,
        sections: [],
        meta: { isHome: false, isHidden: true },
      },
      {
        id: 'travel',
        title: 'Travel',
        slug: 'travel',
        orderIndex: 2,
        sections: [{ id: 'plan' }],
        meta: { isHome: false, isHidden: false },
      },
    ] as never[]);

    expect(summary.totalFlags).toBe(3);
    expect(summary.duplicateSlugCount).toBe(1);
    expect(summary.flagsByPageId.get('story')?.map((flag) => flag.kind)).toEqual(['hidden-empty', 'duplicate-slug']);
    expect(summary.flagsByPageId.get('travel')?.map((flag) => flag.kind)).toEqual(['duplicate-slug']);
  });

  it('keeps slug sanitization truthful when the raw input is noisy', () => {
    expect(sanitizePageSlug('  Our Travel + Stay!  ')).toBe('our-travel-stay');
  });
});
