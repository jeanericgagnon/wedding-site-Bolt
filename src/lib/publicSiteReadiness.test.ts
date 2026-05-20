import { describe, expect, it } from 'vitest';
import { isGuestFacingSiteRowReady, isPublicRenderModelGuestReady, pickGuestFacingReadinessRow } from './publicSiteReadiness';
import type { PublicWeddingRenderModel } from './publicSiteRenderModel';

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

  it('ignores top-level couple and venue fallback fields when checking dashboard guest readiness', () => {
    expect(isGuestFacingSiteRowReady({
      id: 'site-1',
      site_slug: 'maya-and-leo',
      is_published: true,
      privacy_mode: 'public',
      published_json: null,
      site_json: null,
      wedding_data: null,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-06-15',
      venue_name: 'Sunset Gardens',
      wedding_location: '123 Coast Highway',
    })).toBe(false);
  });

  it('projects only the shared guest-facing readiness fields from dashboard rows', () => {
    expect(pickGuestFacingReadinessRow({
      id: 'site-1',
      site_slug: 'maya-and-leo',
      site_url: 'maya-and-leo.dayof.love',
      is_published: true,
      privacy_mode: 'public',
      site_json: { pages: [] },
      published_json: { pages: [] },
      wedding_data: { event: { weddingDateISO: '2026-06-15T12:00:00.000Z' } },
      hide_from_search: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-06-15',
      venue_name: 'Sunset Gardens',
      wedding_location: '123 Coast Highway',
    })).toEqual({
      id: 'site-1',
      site_slug: 'maya-and-leo',
      site_url: 'maya-and-leo.dayof.love',
      is_published: true,
      privacy_mode: 'public',
      site_json: { pages: [] },
      published_json: { pages: [] },
      wedding_data: { event: { weddingDateISO: '2026-06-15T12:00:00.000Z' } },
      hide_from_search: true,
    });
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

  it('ignores hidden pages when checking render model guest readiness', () => {
    const readyWedding: PublicWeddingRenderModel = {
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
    };

    expect(isPublicRenderModelGuestReady({
      pages: [
        {
          id: 'hidden-home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          meta: { isHome: true, isHidden: true },
          sections: [
            {
              id: 'hidden-hero',
              type: 'hero',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      ],
      wedding: readyWedding,
      theme: { preset: null, tokens: null },
    })).toBe(false);

    expect(isPublicRenderModelGuestReady({
      pages: [
        {
          id: 'hidden-home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          meta: { isHome: true, isHidden: true },
          sections: [],
        },
        {
          id: 'welcome',
          title: 'Welcome',
          slug: 'welcome',
          orderIndex: 1,
          meta: { isHome: false, isHidden: false },
          sections: [
            {
              id: 'welcome-hero',
              type: 'hero',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      ],
      wedding: readyWedding,
      theme: { preset: null, tokens: null },
    })).toBe(true);
  });

  it('normalizes home-like public page slugs before choosing the readiness page', () => {
    const readyWedding: PublicWeddingRenderModel = {
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
    };

    expect(isPublicRenderModelGuestReady({
      pages: [
        {
          id: 'travel',
          title: 'Travel',
          slug: 'travel',
          orderIndex: 0,
          meta: { isHome: false },
          sections: [],
        },
        {
          id: 'legacy-home',
          title: 'Home',
          slug: '/Home%20/',
          orderIndex: 1,
          meta: { isHome: false },
          sections: [
            {
              id: 'home-hero',
              type: 'hero',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      ],
      wedding: readyWedding,
      theme: { preset: null, tokens: null },
    })).toBe(true);
  });

  it('treats home pages with only content-empty guest sections as not guest-ready', () => {
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
              id: 'venue-1',
              type: 'venue',
              variant: 'card',
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
        venues: [],
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
