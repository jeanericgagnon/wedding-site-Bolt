import { describe, expect, it } from 'vitest';
import { applyPublicSiteTranslation, buildPersistedPublicFallbackPages, buildPublicSiteRenderSite } from './publicSiteRenderModel';

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
              ownerPreview: true,
            },
            bindings: {
              venueIds: ['venue-1'],
              mediaAssetIds: ['asset-private'],
              internalBindings: ['hide-me'],
            },
            styleOverrides: {
              backgroundColor: '#ffffff',
              customCss: '.hero{letter-spacing:0;}',
              fontFamily: 'private-font',
            },
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
        event: { ownerPreview: 'hide me' },
        venues: [],
        schedule: [],
        rsvp: { enabled: true },
        travel: { plannerNotes: 'hide me' },
        registry: { links: [{ id: 'reg-1', label: 'Registry', url: 'https://registry.example.com', queueTargets: ['hide'] }] },
        faq: [],
        theme: { preset: 'romantic', providerSecrets: 'hide me' },
        media: { gallery: [{ id: 'gallery-1', url: 'https://example.com/gallery.jpg', moderationQueue: 'hide me' }] },
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
    expect(site.render_model.pages[0]?.sections[0]?.settings).not.toHaveProperty('privateToken');
    expect(site.render_model.pages[0]?.sections[0]?.settings).not.toHaveProperty('internalNotes');
    expect(site.render_model.pages[0]?.sections[0]?.settings).not.toHaveProperty('ownerPreview');
    expect(site.render_model.pages[0]?.sections[0]?.bindings).toEqual({
      venueIds: ['venue-1'],
    });
    expect(site.render_model.pages[0]?.sections[0]?.styleOverrides).toEqual({
      backgroundColor: '#ffffff',
    });
    expect(site.render_model.wedding?.couple.displayName).toBe('Maya & Leo');
    expect(site.render_model.wedding).not.toHaveProperty('meta');
    expect(site.render_model.theme.preset).toBe('romantic');
    expect(serialized).not.toContain('privateToken');
    expect(serialized).not.toContain('internalNotes');
    expect(serialized).not.toContain('secretDraftNotes');
    expect(serialized).not.toContain('draftPasswordHint');
    expect(serialized).not.toContain('builderProject');
    expect(serialized).not.toContain('weddingData');
    expect(serialized).not.toContain('layoutConfig');
    expect(serialized).not.toContain('mediaAssetIds');
    expect(serialized).not.toContain('internalBindings');
    expect(serialized).not.toContain('fontFamily');
    expect(serialized).not.toContain('ownerPreview');
    expect(serialized).not.toContain('plannerNotes');
    expect(serialized).not.toContain('providerSecrets');
    expect(serialized).not.toContain('moderationQueue');
    expect(serialized).not.toContain('customCss');
    expect(serialized).not.toContain('createdAtISO');
    expect(serialized).not.toContain('updatedAtISO');
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

    const translatedSite = buildPublicSiteRenderSite(translated);
    expect(translatedSite.render_model.wedding?.event.headline).toBe('Bienvenidos');
    expect(JSON.stringify(translatedSite)).not.toContain('translated_site_json');
    expect(JSON.stringify(translatedSite)).not.toContain('translated_published_json');
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

  it('prefers published wedding snapshots over row wedding_data for published sites', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-4',
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
      published_json: {
        pages: [],
        weddingDataSnapshot: {
          version: '1',
          couple: { partner1Name: 'Snapshot Maya', partner2Name: 'Snapshot Leo', displayName: 'Snapshot Maya & Snapshot Leo' },
          event: { weddingDateISO: '2027-02-14T12:00:00.000Z', headline: 'Published welcome' },
          venues: [{ id: 'venue-1', name: 'Snapshot Venue', address: 'Snapshot Address' }],
          schedule: [],
          rsvp: { enabled: true },
          travel: {},
          registry: { links: [] },
          faq: [],
          theme: { preset: 'garden' },
          media: { gallery: [] },
          meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
        },
      },
      wedding_data: {
        version: '1',
        couple: { partner1Name: 'Draft Maya', partner2Name: 'Draft Leo', displayName: 'Draft Maya & Draft Leo' },
        event: { headline: 'Draft welcome', weddingDateISO: '2027-01-01T12:00:00.000Z' },
        venues: [{ id: 'venue-1', name: 'Draft Venue', address: 'Draft Address' }],
        schedule: [],
        rsvp: { enabled: true },
        travel: {},
        registry: { links: [] },
        faq: [],
        theme: { preset: 'sunset' },
        media: { gallery: [] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
      layout_config: null,
    });

    expect(site.render_model.wedding?.event.headline).toBe('Published welcome');
    expect(site.render_model.wedding?.theme.preset).toBe('garden');
    expect(site.render_model.wedding?.venues[0]).toMatchObject({
      name: 'Sunlit Orchard',
      address: 'Sonoma, CA',
    });
    expect(JSON.stringify(site)).not.toContain('Draft welcome');
    expect(JSON.stringify(site)).not.toContain('Draft Venue');
  });

  it('does not bypass allowlisting for translated payloads', () => {
    const translatedSite = buildPublicSiteRenderSite(applyPublicSiteTranslation({
      id: 'site-5',
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
      site_json: null,
      published_json: {
        pages: [{
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [{
            id: 'faq-1',
            type: 'faq',
            variant: 'accordion',
            enabled: true,
            locked: false,
            orderIndex: 0,
            settings: {
              title: 'Preguntas',
            },
            bindings: {
              faqIds: ['faq-1'],
              internalSchema: ['hide-me'],
            },
            styleOverrides: {
              backgroundColor: '#fff7f7',
              styleRecipeId: 'hide-me',
            },
            meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
      wedding_data: null,
      layout_config: null,
    }, {
      translated_wedding_data: {
        version: '1',
        couple: { partner1Name: 'Maya', partner2Name: 'Leo', displayName: 'Maya y Leo' },
        event: { headline: 'Bienvenidos', internalRoutes: ['hide-me'] },
        venues: [],
        schedule: [],
        rsvp: { enabled: true },
        travel: { queueTargets: ['hide-me'] },
        registry: { links: [] },
        faq: [{ id: 'faq-1', q: '¿Dónde nos hospedamos?', a: 'En el hotel del centro.', adminEmail: 'hide@example.com' }],
        theme: { preset: 'romantic', providerSecrets: 'hide-me' },
        media: { gallery: [{ id: 'g-1', url: 'https://example.com/photo.jpg', hiddenGallery: true }] },
        meta: { createdAtISO: '2026-04-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
      },
    }));

    const serialized = JSON.stringify(translatedSite);
    expect(serialized).not.toContain('internalRoutes');
    expect(serialized).not.toContain('queueTargets');
    expect(serialized).not.toContain('adminEmail');
    expect(serialized).not.toContain('providerSecrets');
    expect(serialized).not.toContain('hiddenGallery');
    expect(serialized).not.toContain('internalSchema');
    expect(serialized).not.toContain('styleRecipeId');
  });

  it('converts persisted published sections into the same allowlisted public page shape', () => {
    const pages = buildPersistedPublicFallbackPages([{
      id: 'hero-1',
      type: 'hero',
      variant: 'default',
      visible: true,
      order: 4,
      data: {
        headline: 'Welcome',
        hiddenCopy: 'hide-me',
        plannerNotes: 'hide-me-too',
      },
      style_overrides: {
        backgroundColor: '#ffffff',
        customCss: '.hero { color: red; }',
        customClassName: 'owner-preview-only',
      },
      bindings: {
        venueIds: ['venue-1'],
        mediaAssetIds: ['asset-private'],
        internalBindings: ['hide-me'],
      },
    }]);

    expect(pages).toEqual([{
      id: 'home',
      title: 'Home',
      slug: 'home',
      orderIndex: 0,
      sections: [{
        id: 'hero-1',
        type: 'hero',
        variant: 'default',
        enabled: true,
        orderIndex: 4,
        settings: {
          headline: 'Welcome',
          showTitle: true,
          overlayOpacity: 40,
        },
        bindings: {
          venueIds: ['venue-1'],
        },
        styleOverrides: {
          backgroundColor: '#ffffff',
        },
      }],
      meta: {
        isHome: true,
        isHidden: false,
      },
    }]);

    const serialized = JSON.stringify(pages);
    expect(serialized).not.toContain('hiddenCopy');
    expect(serialized).not.toContain('plannerNotes');
    expect(serialized).not.toContain('mediaAssetIds');
    expect(serialized).not.toContain('internalBindings');
    expect(serialized).not.toContain('customCss');
    expect(serialized).not.toContain('customClassName');
  });
});
