import { describe, expect, it } from 'vitest';
import { applyPublicSiteTranslation, buildPublicSiteRenderSite } from './publicSiteRenderModel';

describe('publicSiteRenderModel', () => {
  it('builds a strict public render model without leaking raw blob keys to the browser contract', () => {
    const row = {
      id: 'site-1',
      site_slug: 'maya-leo',
      site_url: 'maya-leo.dayof.love',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      hide_from_search: false,
      site_json: {
        id: 'draft-project',
        weddingId: 'site-1',
        templateId: 'modern-luxe',
        themeId: 'romantic',
        pages: [{ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, sections: [], meta: { isHome: true, isHidden: false } }],
        draftVersion: 2,
        publishedVersion: 1,
        publishStatus: 'published',
        lastPublishedAt: '2026-05-01T00:00:00.000Z',
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      published_json: {
        id: 'published-project',
        weddingId: 'site-1',
        templateId: 'modern-luxe',
        themeId: 'romantic',
        pages: [{
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            locked: false,
            orderIndex: 0,
            settings: {
              headline: 'Published headline',
              privateToken: 'secret',
              internalNotes: 'hide me',
            },
            bindings: {},
            styleOverrides: {},
            meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        draftVersion: 2,
        publishedVersion: 1,
        publishStatus: 'published',
        lastPublishedAt: '2026-05-01T00:00:00.000Z',
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      wedding_data: {
        version: '1',
        couple: {
          partner1Name: 'Maya',
          partner2Name: 'Leo',
          displayName: 'Maya & Leo',
          secretDraftNotes: 'hide me',
        },
        event: {},
        venues: [],
        schedule: [],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        theme: {},
        media: { gallery: [] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      layout_config: {
        version: '1',
        templateId: 'modern-luxe',
        pages: [{
          id: 'home',
          title: 'Home',
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            settings: {
              title: 'Welcome',
              draftPasswordHint: 'hide me',
            },
          }],
        }],
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
    };

    const site = buildPublicSiteRenderSite(row);
    const serialized = JSON.stringify(site);

    expect(site.render_model.pages[0]?.sections[0]?.settings).toMatchObject({
      headline: 'Published headline',
    });
    expect(site.render_model.wedding?.couple.displayName).toBe('Maya & Leo');
    expect(site.render_model.theme.preset).toBe('romantic');
    expect(serialized).not.toContain('privateToken');
    expect(serialized).not.toContain('internalNotes');
    expect(serialized).not.toContain('secretDraftNotes');
    expect(serialized).not.toContain('draftPasswordHint');
    expect(serialized).not.toContain('builderProject');
    expect(serialized).not.toContain('weddingData');
    expect(serialized).not.toContain('layoutConfig');
    expect((site as unknown as Record<string, unknown>).site_json).toBeUndefined();
    expect((site as unknown as Record<string, unknown>).published_json).toBeUndefined();
    expect((site as unknown as Record<string, unknown>).wedding_data).toBeUndefined();
    expect((site as unknown as Record<string, unknown>).layout_config).toBeUndefined();
  });

  it('applies translated blobs before building the public render model', () => {
    const baseRow = {
      id: 'site-1',
      site_slug: 'maya-leo',
      site_url: 'maya-leo.dayof.love',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      site_json: {
        id: 'draft-project',
        weddingId: 'site-1',
        templateId: 'modern-luxe',
        themeId: 'romantic',
        pages: [{ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, sections: [], meta: { isHome: true, isHidden: false } }],
        draftVersion: 1,
        publishedVersion: null,
        publishStatus: 'draft',
        lastPublishedAt: '2026-05-01T00:00:00.000Z',
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      published_json: {
        id: 'published-project',
        weddingId: 'site-1',
        templateId: 'modern-luxe',
        themeId: 'romantic',
        pages: [{ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, sections: [], meta: { isHome: true, isHidden: false } }],
        draftVersion: 2,
        publishedVersion: 1,
        publishStatus: 'published',
        lastPublishedAt: '2026-05-01T00:00:00.000Z',
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      wedding_data: {
        version: '1',
        couple: { partner1Name: 'Maya', partner2Name: 'Leo', displayName: 'Maya & Leo' },
        event: {},
        venues: [],
        schedule: [],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        theme: {},
        media: { gallery: [] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      layout_config: null,
    };

    const translated = applyPublicSiteTranslation(baseRow, {
      translated_wedding_data: {
        version: '1',
        couple: { partner1Name: 'Maya', partner2Name: 'Leo', displayName: 'Maya y Leo' },
        event: { headline: 'Bienvenidos' },
        venues: [],
        schedule: [],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        theme: {},
        media: { gallery: [] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
    });

    expect(buildPublicSiteRenderSite(translated).render_model.wedding?.event.headline).toBe('Bienvenidos');
  });

  it('does not fall back to draft builder pages when a published site has no published page payload', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-2',
      site_slug: 'maya-leo',
      site_url: 'maya-leo.dayof.love',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      hide_from_search: false,
      site_json: {
        id: 'draft-project',
        weddingId: 'site-2',
        templateId: 'modern-luxe',
        themeId: 'romantic',
        pages: [{
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [{
            id: 'hero-draft',
            type: 'hero',
            variant: 'default',
            enabled: true,
            locked: false,
            orderIndex: 0,
            settings: { headline: 'Draft-only headline', internalQueueConfig: 'hide me' },
            bindings: {},
            styleOverrides: {},
            meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
      published_json: {
        id: 'published-project',
        weddingId: 'site-2',
        templateId: 'modern-luxe',
        themeId: 'romantic',
        pages: [],
      },
      wedding_data: {
        version: '1',
        couple: { partner1Name: 'Maya', partner2Name: 'Leo', displayName: 'Maya & Leo' },
        event: {},
        venues: [],
        schedule: [],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        theme: {},
        media: { gallery: [] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      layout_config: null,
    });

    expect(site.render_model.pages).toEqual([]);
    expect(JSON.stringify(site)).not.toContain('Draft-only headline');
    expect(JSON.stringify(site)).not.toContain('internalQueueConfig');
  });

  it('uses canonical row identity over stale embedded wedding payload values', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-3',
      site_slug: 'maya-and-leo',
      site_url: 'maya-and-leo.dayof.love',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2027-06-06',
      venue_name: 'Sunlit Orchard',
      wedding_location: 'Sonoma, CA',
      template_id: 'modern-luxe',
      default_language: 'en',
      hide_from_search: false,
      site_json: null,
      published_json: { pages: [] },
      wedding_data: {
        version: '1',
        couple: { partner1Name: 'Eric', partner2Name: 'Kara', displayName: 'Eric & Kara' },
        event: { weddingDateISO: '2027-01-17T12:00:00.000Z' },
        venues: [{ id: 'venue-1', name: 'Old Venue', address: 'Old Address' }],
        schedule: [],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        theme: {},
        media: { gallery: [] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      layout_config: null,
    });

    expect(site.render_model.wedding?.couple.displayName).toBe('Maya & Leo');
    expect(site.render_model.wedding?.event.weddingDateISO).toBe('2027-06-06T12:00:00.000Z');
    expect(site.render_model.wedding?.venues[0]).toMatchObject({
      name: 'Sunlit Orchard',
      address: 'Sonoma, CA',
    });
    expect(JSON.stringify(site)).not.toContain('Eric & Kara');
    expect(JSON.stringify(site)).not.toContain('2027-01-17');
  });
});
