import { describe, expect, it } from 'vitest';
import { applyPublicSiteTranslation, buildPublicSiteRenderSite } from './publicSiteRenderModel';

describe('publicSiteRenderModel', () => {
  it('builds a public render model without leaking raw blob keys to the browser contract', () => {
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

    expect(site.render_model.builderProject?.pages[0].sections[0].settings).toMatchObject({
      headline: 'Published headline',
    });
    expect(serialized).not.toContain('privateToken');
    expect(serialized).not.toContain('internalNotes');
    expect(serialized).not.toContain('secretDraftNotes');
    expect(serialized).not.toContain('draftPasswordHint');
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

    expect(buildPublicSiteRenderSite(translated).render_model.weddingData?.event.headline).toBe('Bienvenidos');
  });
});
