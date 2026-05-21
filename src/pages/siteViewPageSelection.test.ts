import { describe, expect, it } from 'vitest';

import {
  buildPublicSitePageHref,
  buildPublicSiteSectionAnchorHref,
  getPublicSitePageNavItems,
  normalizePublicSectionAnchorId,
  normalizeSiteViewPageSlug,
  selectPublicSitePage,
} from './siteViewPageSelection';

describe('siteViewPageSelection', () => {
  const pages = [
    { id: 'intro', slug: 'intro', meta: { isHome: false } },
    { id: 'home', slug: 'home', meta: { isHome: true } },
    { id: 'travel-page', slug: 'travel', meta: { isHome: false } },
  ];

  it('uses the home page when no dedicated page slug is requested', () => {
    expect(selectPublicSitePage(pages)?.id).toBe('home');
  });

  it('does not use hidden pages as the no-slug fallback', () => {
    expect(selectPublicSitePage([
      { id: 'vip', slug: 'vip', meta: { isHome: true, isHidden: true } },
      { id: 'travel', slug: 'travel', meta: { isHome: false } },
    ])?.id).toBe('travel');
  });

  it('uses a requested dedicated page slug when present', () => {
    expect(selectPublicSitePage(pages, 'travel')?.id).toBe('travel-page');
  });

  it('still returns explicitly requested hidden pages so the route can show not-ready state', () => {
    expect(selectPublicSitePage([
      { id: 'home', slug: 'home', meta: { isHome: true } },
      { id: 'vip', slug: 'vip', meta: { isHome: false, isHidden: true } },
    ], 'vip')?.id).toBe('vip');
  });

  it('matches requested slugs against normalized stored page slugs', () => {
    expect(selectPublicSitePage([
      { id: 'home', slug: 'home', meta: { isHome: true } },
      { id: 'travel-details', slug: 'Travel Details!', meta: { isHome: false } },
    ], '/Travel%20Details/')?.id).toBe('travel-details');
  });

  it('falls back to id matching for persisted pages without a friendly slug', () => {
    expect(selectPublicSitePage(pages, 'travel-page')?.slug).toBe('travel');
  });

  it('returns null for an unknown dedicated page instead of rendering home content', () => {
    expect(selectPublicSitePage(pages, 'missing-page')).toBeNull();
  });

  it('normalizes URL encoded and slash-padded page slugs', () => {
    expect(normalizeSiteViewPageSlug('/Travel%20Info/')).toBe('travel-info');
  });

  it('builds public navigation without hidden pages', () => {
    const nav = getPublicSitePageNavItems([
      { id: 'travel', slug: 'travel', title: 'Travel', orderIndex: 1, meta: { isHome: false } },
      { id: 'home', slug: 'home', title: 'Home', orderIndex: 0, meta: { isHome: true } },
      { id: 'vip', slug: 'vip', title: 'VIP', orderIndex: 2, meta: { isHome: false, isHidden: true } },
    ]);

    expect(nav.map((page) => page.slug)).toEqual(['home', 'travel']);
  });

  it('pins home first in public navigation even when legacy order values drift', () => {
    const nav = getPublicSitePageNavItems([
      { id: 'travel', slug: 'travel', title: 'Travel', orderIndex: '0' as unknown as number, meta: { isHome: false } },
      { id: 'home', slug: 'home', title: 'Home', orderIndex: '1' as unknown as number, meta: { isHome: true } },
      { id: 'rsvp', slug: 'rsvp', title: 'RSVP', orderIndex: '2' as unknown as number, meta: { isHome: false } },
    ]);

    expect(nav.map((page) => ({ slug: page.slug, orderIndex: page.orderIndex }))).toEqual([
      { slug: 'home', orderIndex: 0 },
      { slug: 'travel', orderIndex: 1 },
      { slug: 'rsvp', orderIndex: 2 },
    ]);
  });

  it('uses normalized slugs and id fallbacks in public navigation items', () => {
    const nav = getPublicSitePageNavItems([
      { id: 'travel-page', slug: '/Travel%20Info/', title: 'Travel Info', orderIndex: 1, meta: { isHome: false } },
      { id: 'after-party', slug: '', title: '', orderIndex: 2, meta: { isHome: false } },
    ]);

    expect(nav).toEqual([
      expect.objectContaining({
        slug: 'travel-info',
        title: 'Travel Info',
        isHome: false,
      }),
      expect.objectContaining({
        slug: 'after-party',
        title: 'After Party',
        isHome: false,
      }),
    ]);
  });

  it('uses builder value page titles in public navigation items', () => {
    const nav = getPublicSitePageNavItems([
      { id: 'home', slug: 'home', title: 'Home', orderIndex: 0, meta: { isHome: true } },
      {
        id: 'travel-page',
        slug: 'travel',
        title: { value: 'Guest Travel', source: 'user-edited' },
        orderIndex: 1,
        meta: { isHome: false },
      },
    ]);

    expect(nav[1]).toEqual(expect.objectContaining({
      slug: 'travel',
      title: 'Guest Travel',
    }));
  });

  it('dedupes visible legacy page slugs in public navigation items', () => {
    const nav = getPublicSitePageNavItems([
      { id: 'home', slug: 'home', title: 'Home', orderIndex: 0, meta: { isHome: true } },
      { id: 'travel-a', slug: 'Travel%20Info', title: 'Travel Info', orderIndex: 1, meta: { isHome: false } },
      { id: 'travel-b', slug: '/travel_info/', title: 'Travel Info', orderIndex: 2, meta: { isHome: false } },
      { id: 'home-copy', slug: 'home', title: 'Home Copy', orderIndex: 3, meta: { isHome: true } },
    ]);

    expect(nav.map((page) => ({ slug: page.slug, isHome: page.isHome }))).toEqual([
      { slug: 'home', isHome: true },
      { slug: 'travel-info', isHome: false },
      { slug: 'travel-info-2', isHome: false },
      { slug: 'home-2', isHome: false },
    ]);
  });

  it('builds home and dedicated public page hrefs', () => {
    expect(buildPublicSitePageHref('maya-leo', { slug: 'home', isHome: true })).toBe('/site/maya-leo');
    expect(buildPublicSitePageHref('maya-leo', { slug: 'travel', isHome: false })).toBe('/site/maya-leo/travel');
    expect(buildPublicSitePageHref('maya-leo', { slug: 'Travel Details!', isHome: false })).toBe('/site/maya-leo/travel-details');
    expect(buildPublicSitePageHref(' maya-leo ', { slug: 'travel', isHome: false })).toBe('/site/maya-leo/travel');
  });

  it('builds root-mounted page hrefs for wedding subdomains', () => {
    expect(buildPublicSitePageHref('maya-leo', { slug: 'home', isHome: true }, true)).toBe('/');
    expect(buildPublicSitePageHref('maya-leo', { slug: 'travel', isHome: false }, true)).toBe('/travel');
    expect(buildPublicSitePageHref('maya-leo', { slug: 'Travel Details!', isHome: false }, true)).toBe('/travel-details');
  });

  it('normalizes and builds one-page section anchor hrefs', () => {
    expect(normalizePublicSectionAnchorId(' Registry Gifts! ')).toBe('registry-gifts');
    expect(normalizePublicSectionAnchorId({ value: 'Travel Info' })).toBe('travel-info');
    expect(buildPublicSiteSectionAnchorHref('maya-leo', { anchorId: 'travel-info' })).toBe('/site/maya-leo#travel-info');
    expect(buildPublicSiteSectionAnchorHref('maya-leo', { anchorId: 'Travel Info!' })).toBe('/site/maya-leo#travel-info');
    expect(buildPublicSiteSectionAnchorHref(' maya-leo ', { anchorId: 'Travel Info!' })).toBe('/site/maya-leo#travel-info');
    expect(buildPublicSiteSectionAnchorHref('maya-leo', { anchorId: '!!!' })).toBe('/site/maya-leo');
  });

  it('builds root-mounted section anchor hrefs for wedding subdomains', () => {
    expect(buildPublicSiteSectionAnchorHref('maya-leo', { anchorId: 'Travel Info!' }, true)).toBe('/#travel-info');
    expect(buildPublicSiteSectionAnchorHref('maya-leo', { anchorId: '!!!' }, true)).toBe('/');
  });
});
