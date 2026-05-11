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
    expect(site.render_model.pages[0]?.sections[0]?.bindings).toBeUndefined();
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

  it('only preserves bindings for section types that actually consume them in public rendering', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-bindings',
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
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: { headline: 'Welcome' },
              bindings: { venueIds: ['venue-1'], faqIds: ['faq-1'] },
            },
            {
              id: 'venue-1',
              type: 'venue',
              variant: 'default',
              enabled: true,
              orderIndex: 1,
              settings: { title: 'Venue', showTitle: true },
              bindings: { venueIds: ['venue-1'], faqIds: ['faq-1'] },
            },
            {
              id: 'schedule-1',
              type: 'schedule',
              variant: 'default',
              enabled: true,
              orderIndex: 2,
              settings: { title: 'Weekend', showTitle: true },
              bindings: { scheduleItemIds: ['schedule-1'], linkIds: ['registry-1'] },
            },
            {
              id: 'registry-1',
              type: 'registry',
              variant: 'cards',
              enabled: true,
              orderIndex: 3,
              settings: { title: 'Registry', showTitle: true },
              bindings: { linkIds: ['registry-1'], venueIds: ['venue-1'] },
            },
            {
              id: 'faq-1',
              type: 'faq',
              variant: 'accordion',
              enabled: true,
              orderIndex: 4,
              settings: { title: 'FAQ', showTitle: true },
              bindings: { faqIds: ['faq-1'], scheduleItemIds: ['schedule-1'] },
            },
          ],
          meta: { isHome: true, isHidden: false },
        }],
      },
      wedding_data: null,
      layout_config: null,
    });

    const sections = site.render_model.pages[0]?.sections ?? [];
    expect(sections[0]?.bindings).toBeUndefined();
    expect(sections[1]?.bindings).toEqual({ venueIds: ['venue-1'] });
    expect(sections[2]?.bindings).toEqual({ scheduleItemIds: ['schedule-1'] });
    expect(sections[3]?.bindings).toEqual({ linkIds: ['registry-1'] });
    expect(sections[4]?.bindings).toEqual({ faqIds: ['faq-1'] });

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

  it('applies translated legacy layout payloads through the same strict public DTO path', () => {
    const translatedSite = buildPublicSiteRenderSite(applyPublicSiteTranslation({
      id: 'site-5b',
      site_slug: 'maya-leo',
      site_url: 'maya-leo.dayof.love',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'es',
      hide_from_search: false,
      site_json: null,
      published_json: {
        pages: [],
      },
      wedding_data: null,
      layout_config: null,
    }, {
      translated_published_json: {
        pages: [],
        legacyLayoutPublished: true,
      },
      translated_layout_config: {
        version: '1',
        templateId: 'modern-luxe',
        pages: [{
          id: 'home',
          title: 'Inicio',
          slug: 'home',
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            locked: true,
            orderIndex: 0,
            settings: {
              headline: 'Bienvenidos',
              hiddenGallery: true,
              providerSecret: 'hide-me',
            },
            bindings: {
              venueIds: ['venue-1'],
              mediaAssetIds: ['asset-private'],
              internalBindings: ['hide-me'],
            },
            overrides: {
              backgroundColor: '#fff7f7',
              customCss: '.secret{display:none}',
              customClassName: 'owner-preview-only',
            },
            meta: {
              createdAtISO: '2026-04-01T00:00:00.000Z',
              updatedAtISO: '2026-05-01T00:00:00.000Z',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
    }));

    expect(translatedSite.render_model.pages[0]?.sections[0]).toMatchObject({
      id: 'hero-1',
      type: 'hero',
      variant: 'default',
      enabled: true,
      orderIndex: 0,
      settings: {
        headline: 'Bienvenidos',
      },
      styleOverrides: {
        backgroundColor: '#fff7f7',
      },
    });

    const serialized = JSON.stringify(translatedSite);
    expect(serialized).not.toContain('hiddenGallery');
    expect(serialized).not.toContain('providerSecret');
    expect(serialized).not.toContain('mediaAssetIds');
    expect(serialized).not.toContain('internalBindings');
    expect(serialized).not.toContain('customCss');
    expect(serialized).not.toContain('customClassName');
    expect(serialized).not.toContain('createdAtISO');
    expect(serialized).not.toContain('updatedAtISO');
  });

  it('drops innocent-looking sensitive fields from public section settings and translated payloads', () => {
    const translatedSite = buildPublicSiteRenderSite(applyPublicSiteTranslation({
      id: 'site-6',
      site_slug: 'maya-leo',
      site_url: 'maya-leo.dayof.love',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'es',
      hide_from_search: false,
      site_json: null,
      published_json: {
        pages: [{
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [{
            id: 'travel-1',
            type: 'travel',
            variant: 'list',
            enabled: true,
            locked: false,
            orderIndex: 0,
            settings: {
              title: 'Travel',
              showTitle: true,
              phone: '+1 555-0101',
              contactInfo: 'private concierge',
              visibilityRules: ['staff-only'],
            },
            bindings: {
              venueIds: ['venue-1'],
              roles: ['owner'],
              permissions: ['write'],
            },
            styleOverrides: {
              backgroundColor: '#fff7f7',
              customCss: '.secret{display:none}',
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
        couple: {
          partner1Name: 'Maya',
          partner2Name: 'Leo',
          displayName: 'Maya y Leo',
          guestEmail: 'hide@example.com',
        },
        event: { headline: 'Bienvenidos', plannerNotes: 'hide-me' },
        venues: [{ id: 'venue-1', name: 'Garden Hall', address: 'Portland', staffNotes: 'hide-me' }],
        schedule: [{ id: 'sch-1', label: 'Ceremony', notes: 'public', moderationState: 'hide-me' }],
        rsvp: { enabled: true },
        travel: { hotelInfo: 'Hotel block', contactInfo: 'private line' },
        registry: { links: [{ id: 'reg-1', label: 'Registry', url: 'https://registry.example.com', billingStatus: 'hide-me' }] },
        faq: [{ id: 'faq-1', q: 'Where?', a: 'Here', adminEmail: 'hide@example.com' }],
        theme: { preset: 'romantic' },
        media: { gallery: [{ id: 'g-1', url: 'https://example.com/photo.jpg', hiddenGallery: true }] },
      },
    }));

    const serialized = JSON.stringify(translatedSite);
    expect(serialized).not.toContain('guestEmail');
    expect(serialized).not.toContain('plannerNotes');
    expect(serialized).not.toContain('staffNotes');
    expect(serialized).not.toContain('contactInfo');
    expect(serialized).not.toContain('billingStatus');
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('roles');
    expect(serialized).not.toContain('permissions');
    expect(serialized).not.toContain('visibilityRules');
    expect(serialized).not.toContain('adminEmail');
    expect(serialized).not.toContain('hiddenGallery');
    expect(serialized).not.toContain('customCss');
  });

  it('drops unused public section toggles that are not read by the guest renderer', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-6b',
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
          sections: [
            {
              id: 'schedule-1',
              type: 'schedule',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: { title: 'Weekend', showTitle: true, showIcons: true },
            },
            {
              id: 'travel-1',
              type: 'travel',
              variant: 'default',
              enabled: true,
              orderIndex: 1,
              settings: { title: 'Travel', showTitle: true, showParking: true, showTimezoneBadge: true },
            },
            {
              id: 'faq-1',
              type: 'faq',
              variant: 'accordion',
              enabled: true,
              orderIndex: 2,
              settings: { title: 'Questions', showTitle: true, expandAll: true },
            },
          ],
          meta: { isHome: true, isHidden: false },
        }],
      },
      wedding_data: null,
      layout_config: null,
    });

    const serialized = JSON.stringify(site);
    const sections = site.render_model.pages[0]?.sections ?? [];
    expect(sections[0]?.settings).toMatchObject({ title: 'Weekend', showTitle: true });
    expect(sections[0]?.settings).not.toHaveProperty('showIcons');
    expect(sections[1]?.settings).toMatchObject({ title: 'Travel', showTitle: true, showTimezoneBadge: true });
    expect(sections[1]?.settings).not.toHaveProperty('showParking');
    expect(sections[2]?.settings).toMatchObject({ title: 'Questions', showTitle: true });
    expect(sections[2]?.settings).not.toHaveProperty('expandAll');
    expect(serialized).not.toContain('showIcons');
    expect(serialized).not.toContain('showParking');
    expect(serialized).not.toContain('expandAll');
  });

  it('normalizes footer cta aliases into the public renderer fields and drops stale footer keys', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-footer-cta',
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
            id: 'footer-1',
            type: 'footer-cta',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'We hope to see you there',
              subtext: 'Please reply when you can',
              ctaLabel: 'Send RSVP',
              ctaHref: '/site/maya-leo#rsvp',
              monogram: 'M & L',
              hashtag: '#MayaAndLeo',
              photoUrl: 'https://example.com/photo.jpg',
              footerNote: 'Please RSVP by August 1',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
      wedding_data: null,
      layout_config: null,
    });

    const settings = site.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      headline: 'We hope to see you there',
      subtext: 'Please reply when you can',
      buttonLabel: 'Send RSVP',
      rsvpUrl: '/site/maya-leo#rsvp',
      footerNote: 'Please RSVP by August 1',
    });
    expect(settings).not.toHaveProperty('ctaLabel');
    expect(settings).not.toHaveProperty('ctaHref');
    expect(settings).not.toHaveProperty('monogram');
    expect(settings).not.toHaveProperty('hashtag');
    expect(settings).not.toHaveProperty('photoUrl');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('ctaLabel');
    expect(serialized).not.toContain('ctaHref');
    expect(serialized).not.toContain('monogram');
    expect(serialized).not.toContain('hashtag');
    expect(serialized).not.toContain('photoUrl');
  });

  it('drops nested interactive contact payloads and innocent-looking sensitive keys from public section settings', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-contact-interactive',
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
            id: 'contact-1',
            type: 'contact',
            variant: 'interactiveHub',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Questions, polls & quizzes',
              eyebrow: 'Interactive corner',
              subtitle: 'Have fun with us while we plan the weekend.',
              introText: 'Share your ideas with us.',
              pollPrompt: 'What should our signature drink be?',
              pollOptions: 'French 75\nSpicy Margarita',
              quizPrompt: 'Who made the first move?',
              quizOptions: 'Maya\nLeo',
              correctQuizOption: 'Leo',
              suggestionPrompt: 'Song request',
              allowPublicResults: true,
              poll: {
                id: 'poll-secret',
                prompt: 'Should not survive',
                options: [{ id: 'opt-1', label: 'Hidden', adminEmail: 'hide@example.com' }],
                queueTargets: ['hide-me'],
              },
              quiz: {
                id: 'quiz-secret',
                prompt: 'Should not survive',
                options: [{ id: 'quiz-1', label: 'Hidden', staffNotes: 'hide-me' }],
                correctOptionId: 'quiz-1',
              },
              suggestionPlaceholder: 'Type your idea...',
              contacts: [{ id: 'c1', name: 'Planner', phone: '+1 555-0101' }],
              contactInfo: 'private concierge',
              visibilityRules: ['staff-only'],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
      wedding_data: null,
      layout_config: null,
    });

    const settings = site.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      title: 'Questions, polls & quizzes',
      eyebrow: 'Interactive corner',
      subtitle: 'Have fun with us while we plan the weekend.',
      introText: 'Share your ideas with us.',
      pollPrompt: 'What should our signature drink be?',
      pollOptions: 'French 75\nSpicy Margarita',
      quizPrompt: 'Who made the first move?',
      quizOptions: 'Maya\nLeo',
      correctQuizOption: 'Leo',
      suggestionPrompt: 'Song request',
      allowPublicResults: true,
    });
    expect(settings).not.toHaveProperty('poll');
    expect(settings).not.toHaveProperty('quiz');
    expect(settings).not.toHaveProperty('suggestionPlaceholder');
    expect(settings).not.toHaveProperty('contacts');
    expect(settings).not.toHaveProperty('contactInfo');
    expect(settings).not.toHaveProperty('visibilityRules');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('poll-secret');
    expect(serialized).not.toContain('quiz-secret');
    expect(serialized).not.toContain('adminEmail');
    expect(serialized).not.toContain('staffNotes');
    expect(serialized).not.toContain('queueTargets');
    expect(serialized).not.toContain('suggestionPlaceholder');
    expect(serialized).not.toContain('contactInfo');
    expect(serialized).not.toContain('visibilityRules');
  });

  it('normalizes contact form title aliases into the public renderer fields and drops stale title keys', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-contact-form',
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
            id: 'contact-form-1',
            type: 'contact',
            variant: 'form',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Questions for us?',
              subtitle: 'We are happy to help.',
              introText: 'Reach out any time.',
              contacts: [{ id: 'c1', email: 'hide@example.com' }],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
      wedding_data: null,
      layout_config: null,
    });

    const settings = site.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      headline: 'Questions for us?',
      subheadline: 'We are happy to help.',
      introText: 'Reach out any time.',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('contacts');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('"title":"Questions for us?"');
    expect(serialized).not.toContain('"subtitle":"We are happy to help."');
    expect(serialized).not.toContain('hide@example.com');
  });

  it('only uses legacy layout fallback when explicitly allowed on the published payload', () => {
    const site = buildPublicSiteRenderSite({
      id: 'site-7',
      site_slug: 'legacy-layout',
      site_url: 'legacy-layout.dayof.love',
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
        pages: [],
      },
      wedding_data: null,
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
            settings: { headline: 'Legacy headline' },
          }],
        }],
      },
    });

    expect(site.render_model.pages).toEqual([]);

    const legacyAliasOnly = buildPublicSiteRenderSite({
      id: 'site-8a',
      site_slug: 'legacy-layout-alias-only',
      site_url: 'legacy-layout-alias-only.dayof.love',
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
        pages: [],
        allowLegacyLayoutFallback: true,
      },
      wedding_data: null,
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
            settings: { headline: 'Alias should not unlock fallback' },
          }],
        }],
      },
    });

    expect(legacyAliasOnly.render_model.pages).toEqual([]);

    const legacyAllowed = buildPublicSiteRenderSite({
      id: 'site-8',
      site_slug: 'legacy-layout-allowed',
      site_url: 'legacy-layout-allowed.dayof.love',
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
        pages: [],
        legacyLayoutPublished: true,
      },
      wedding_data: null,
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
            settings: { headline: 'Legacy headline', internalNotes: 'hide-me' },
          }],
        }],
      },
    });

    expect(legacyAllowed.render_model.pages[0]?.sections[0]?.settings).toMatchObject({
      headline: 'Legacy headline',
    });
    expect(JSON.stringify(legacyAllowed)).not.toContain('internalNotes');
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
