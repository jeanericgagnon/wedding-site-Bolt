import { describe, expect, it } from 'vitest';

import { getFirstRenderablePublicBuilderPage, getPublicBuilderActivePage, getVisiblePublicBuilderPages } from './publicPageSelection';
import type { BuilderPage } from '../types/builder/project';

const makePage = (overrides: Partial<BuilderPage>): BuilderPage => ({
  id: overrides.id ?? 'page',
  title: overrides.title ?? 'Page',
  slug: overrides.slug ?? 'page',
  orderIndex: overrides.orderIndex ?? 0,
  sections: overrides.sections ?? [],
  meta: overrides.meta ?? { isHome: false, isHidden: false },
});

describe('publicPageSelection', () => {
  it('keeps only visible public pages in order', () => {
    const pages = getVisiblePublicBuilderPages([
      makePage({ id: 'photos', title: 'Photos', slug: 'photos', orderIndex: 2 }),
      makePage({ id: 'hidden', title: 'Hidden', slug: 'hidden', orderIndex: 1, meta: { isHome: false, isHidden: true } }),
      makePage({ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false } }),
    ]);

    expect(pages.map((page) => page.slug)).toEqual(['home', 'photos']);
  });

  it('prefers an explicit visible page slug', () => {
    const pages = getVisiblePublicBuilderPages([
      makePage({ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false } }),
      makePage({ id: 'travel', title: 'Travel', slug: 'travel', orderIndex: 1 }),
    ]);

    expect(getPublicBuilderActivePage(pages, 'travel')?.slug).toBe('travel');
  });

  it('falls back to the home page when the requested slug is missing', () => {
    const pages = getVisiblePublicBuilderPages([
      makePage({ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false } }),
      makePage({ id: 'travel', title: 'Travel', slug: 'travel', orderIndex: 1 }),
    ]);

    expect(getPublicBuilderActivePage(pages, 'missing')?.slug).toBe('home');
  });

  it('finds the first renderable visible page when the home page is structurally empty', () => {
    const pages = getVisiblePublicBuilderPages([
      makePage({ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false }, sections: [] }),
      makePage({
        id: 'weekend',
        title: 'Weekend',
        slug: 'weekend',
        orderIndex: 1,
        sections: [{
          id: 'story',
          type: 'story',
          variant: 'default',
          enabled: true,
          locked: false,
          orderIndex: 0,
          settings: {},
          styleOverrides: {},
          bindings: {},
          meta: {
            createdAtISO: '2026-05-27T00:00:00.000Z',
            updatedAtISO: '2026-05-27T00:00:00.000Z',
          },
        }],
      }),
    ]);

    expect(getFirstRenderablePublicBuilderPage(pages)?.slug).toBe('weekend');
    expect(getPublicBuilderActivePage(pages)?.slug).toBe('weekend');
    expect(getPublicBuilderActivePage(pages, 'home')?.slug).toBe('home');
  });
});
