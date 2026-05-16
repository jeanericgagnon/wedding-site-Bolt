import { describe, expect, it } from 'vitest';
import { isGuestFacingSiteRowReady, isPublicRenderModelGuestReady } from './publicSiteReadiness';

describe('public site readiness', () => {
  it('treats sparse published public rows as not guest-ready', () => {
    expect(isGuestFacingSiteRowReady({
      id: 'site-1',
      site_slug: 'maya-and-leo',
      is_published: true,
      privacy_mode: 'public',
      published_json: null,
      site_json: null,
      wedding_data: {
        event: { weddingDateISO: '2026-06-15T12:00:00.000Z' },
        couple: { partner1Name: 'Maya', partner2Name: 'Leo' },
      },
    })).toBe(false);
  });

  it('treats no-page but content-rich render models as guest-ready', () => {
    expect(isPublicRenderModelGuestReady({
      pages: [],
      wedding: {
        version: '1',
        couple: {
          partner1Name: 'Maya',
          partner2Name: 'Leo',
          displayName: 'Maya and Leo',
          story: 'We met on a rainy Wednesday, stayed for dinner, and never really stopped building a life together.',
        },
        event: {
          weddingDateISO: '2026-06-15T12:00:00.000Z',
        },
        venues: [{ id: 'venue-1', name: 'Sunset Gardens', address: '123 Coast Highway' }],
        schedule: [{ id: 'event-1', label: 'Ceremony' }],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        media: { gallery: [], heroImageUrl: 'https://example.com/hero.jpg' },
        theme: {},
      },
      theme: { preset: null, tokens: null },
    })).toBe(true);
  });

  it('treats render models with only disabled sections as not guest-ready', () => {
    expect(isPublicRenderModelGuestReady({
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          meta: { isHome: true },
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: false,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      ],
      wedding: {
        version: '1',
        couple: {
          partner1Name: 'Maya',
          partner2Name: 'Leo',
          displayName: 'Maya and Leo',
          story: 'We met on a rainy Wednesday, stayed for dinner, and never really stopped building a life together.',
        },
        event: {
          weddingDateISO: '2026-06-15T12:00:00.000Z',
        },
        venues: [{ id: 'venue-1', name: 'Sunset Gardens', address: '123 Coast Highway' }],
        schedule: [{ id: 'event-1', label: 'Ceremony' }],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        media: { gallery: [], heroImageUrl: 'https://example.com/hero.jpg' },
        theme: {},
      },
      theme: { preset: null, tokens: null },
    })).toBe(false);
  });

  it('treats render models with no enabled home-page sections as not guest-ready even if another page has content', () => {
    expect(isPublicRenderModelGuestReady({
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          meta: { isHome: true },
          sections: [],
        },
        {
          id: 'travel',
          title: 'Travel',
          slug: 'travel',
          orderIndex: 1,
          meta: { isHome: false },
          sections: [
            {
              id: 'travel-1',
              type: 'travel',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      ],
      wedding: {
        version: '1',
        couple: {
          partner1Name: 'Maya',
          partner2Name: 'Leo',
          displayName: 'Maya and Leo',
          story: 'We met on a rainy Wednesday, stayed for dinner, and never really stopped building a life together.',
        },
        event: {
          weddingDateISO: '2026-06-15T12:00:00.000Z',
        },
        venues: [{ id: 'venue-1', name: 'Sunset Gardens', address: '123 Coast Highway' }],
        schedule: [{ id: 'event-1', label: 'Ceremony' }],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        media: { gallery: [], heroImageUrl: 'https://example.com/hero.jpg' },
        theme: {},
      },
      theme: { preset: null, tokens: null },
    })).toBe(false);
  });
});
