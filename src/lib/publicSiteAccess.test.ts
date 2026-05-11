import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { safePublicSiteAccessError, sanitizePublicSiteSafeRow } from './publicSiteAccess';

describe('public site access client contract', () => {
  it('keeps only the explicit public-safe site fields from resolver payloads', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-1',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: { headline: 'Welcome', hiddenCopy: 'should not survive' },
            bindings: { venueIds: ['venue-1'], mediaAssetIds: ['asset-private'] },
            styleOverrides: { backgroundColor: '#ffffff', fontFamily: 'private-font' },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: {
          couple: { displayName: 'Maya & Leo', adminEmail: 'hide@example.com' },
          registry: { links: [{ id: 'r1', label: 'Registry', url: 'https://registry.example.com', queueTargets: ['hide-me'] }] },
          meta: { createdAtISO: '2026-01-01T00:00:00.000Z', updatedAtISO: '2026-02-01T00:00:00.000Z', staffNotes: ['hide-me'] },
        },
        theme: { preset: 'romantic', tokens: { colorPrimary: '#123456', providerSecrets: 'hide-me' } },
      },
      site_password_hash: 'never-send-this',
      guest_access_token: 'never-send-this-either',
      user_id: 'owner-id',
      notification_prefs: { rsvp: true },
      billing_customer_id: 'cus_private',
      privacy_mode: 'password',
      hide_from_search: true,
    });

    expect(site).toEqual({
      id: 'site-1',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: { headline: 'Welcome', overlayOpacity: 40 },
            styleOverrides: { backgroundColor: '#ffffff' },
          }],
          meta: { isHome: true },
        }],
        wedding: {
          couple: { displayName: 'Maya & Leo' },
          event: {},
          venues: [],
          schedule: [],
          rsvp: { enabled: true },
          travel: {},
          registry: { links: [{ id: 'r1', label: 'Registry', url: 'https://registry.example.com' }] },
          faq: [],
          theme: {},
          media: { gallery: [] },
        },
        theme: { preset: 'romantic', tokens: { colorPrimary: '#123456' } },
      },
    });
    expect(site?.render_model.pages).toEqual([{
      id: 'home',
      slug: 'home',
      title: 'Home',
      orderIndex: 0,
      sections: [{
        id: 'hero-1',
        type: 'hero',
        variant: 'default',
        enabled: true,
        orderIndex: 0,
        settings: { headline: 'Welcome', overlayOpacity: 40 },
        styleOverrides: { backgroundColor: '#ffffff' },
      }],
      meta: { isHome: true },
    }]);
    expect(site?.render_model.wedding).toEqual({
      couple: { displayName: 'Maya & Leo' },
      event: {},
      venues: [],
      schedule: [],
      rsvp: { enabled: true },
      travel: {},
      registry: { links: [{ id: 'r1', label: 'Registry', url: 'https://registry.example.com' }] },
      faq: [],
      theme: {},
      media: { gallery: [] },
    });
    expect(site?.render_model.theme).toEqual({ preset: 'romantic', tokens: { colorPrimary: '#123456' } });
    expect(JSON.stringify(site)).not.toContain('mediaAssetIds');
    expect(JSON.stringify(site)).not.toContain('fontFamily');
    expect(JSON.stringify(site)).not.toContain('adminEmail');
    expect(JSON.stringify(site)).not.toContain('queueTargets');
    expect(JSON.stringify(site)).not.toContain('providerSecrets');
    expect(JSON.stringify(site)).not.toContain('hiddenCopy');
    expect(site).not.toHaveProperty('site_password_hash');
    expect(site).not.toHaveProperty('guest_access_token');
    expect(site).not.toHaveProperty('user_id');
    expect(site).not.toHaveProperty('notification_prefs');
    expect(site).not.toHaveProperty('billing_customer_id');
    expect(site).not.toHaveProperty('privacy_mode');
    expect(site).not.toHaveProperty('hide_from_search');
    expect(site).not.toHaveProperty('site_json');
    expect(site).not.toHaveProperty('published_json');
    expect(site).not.toHaveProperty('wedding_data');
    expect(site).not.toHaveProperty('layout_config');
  });

  it('normalizes hero settings into the client-safe resolved public hero contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-hero',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'fullBleed',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'We are getting married',
              subtitle: 'June 14, 2026 · The Grand Pavilion, New York',
              headline: 'Kara & Eric',
              ctaLabel: 'Send RSVP',
              ctaHref: '#rsvp',
              showDivider: false,
              secretDraftNotes: 'hide me',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      headline: 'Kara & Eric',
      eyebrow: 'We are getting married',
      subheadline: 'June 14, 2026 · The Grand Pavilion, New York',
      overlayOpacity: 40,
      ctaLabel: 'Send RSVP',
      ctaHref: '#rsvp',
      showDivider: false,
    });
    expect(JSON.stringify(site)).not.toContain('"title":"We are getting married"');
    expect(JSON.stringify(site)).not.toContain('"subtitle":"June 14, 2026 · The Grand Pavilion, New York"');
    expect(JSON.stringify(site)).not.toContain('secretDraftNotes');
  });

  it('normalizes story settings into the client-safe resolved public story contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-story',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'story-1',
            type: 'story',
            variant: 'timeline',
            enabled: true,
            orderIndex: 1,
            settings: {
              title: 'How we met',
              storyText: 'We met on a rainy Tuesday.',
              photo: 'https://example.com/couple.jpg',
              showTitle: false,
              secretDraftNotes: 'hide me',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      headline: 'How we met',
      body: 'We met on a rainy Tuesday.',
      image: 'https://example.com/couple.jpg',
      showDivider: false,
    });
    expect(JSON.stringify(site)).not.toContain('"title":"How we met"');
    expect(JSON.stringify(site)).not.toContain('"storyText":"We met on a rainy Tuesday."');
    expect(JSON.stringify(site)).not.toContain('"photo":"https://example.com/couple.jpg"');
    expect(JSON.stringify(site)).not.toContain('secretDraftNotes');
  });

  it('normalizes travel settings into the client-safe resolved public travel contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-travel',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'travel-1',
            type: 'travel',
            variant: 'hotelBlock',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Where to stay',
              subheadline: 'Book soon.',
              showTimezoneBadge: true,
              hotels: [{
                id: 'hotel-1',
                name: 'Harbor Hotel',
                distance: '0.3 miles',
                bookingCode: 'MAYALEO',
                url: 'https://example.com/stay',
                adminEmail: 'hide@example.com',
              }],
              internalQueueConfig: { id: 'hide-me' },
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      headline: 'Where to stay',
      subheadline: 'Book soon.',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        distance: '0.3 miles',
        bookingCode: 'MAYALEO',
        url: 'https://example.com/stay',
      }],
    });
    expect(JSON.stringify(site)).not.toContain('showTimezoneBadge');
    expect(JSON.stringify(site)).not.toContain('adminEmail');
    expect(JSON.stringify(site)).not.toContain('internalQueueConfig');
  });

  it('normalizes accommodations settings into the client-safe public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-accommodations',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'accommodations-1',
            type: 'accommodations',
            variant: 'featured',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Accommodations',
              headline: 'Places to stay',
              layoutStyle: 'featured',
              hotels: [{
                id: 'hotel-1',
                name: 'Harbor Hotel',
                stars: 4,
                distance: '0.3 miles',
                bookingCode: 'MAYALEO',
                bookingDeadline: 'May 20',
                image: 'https://example.com/stay.jpg',
                hiddenGallery: true,
              }],
              providerSecret: 'hide-me',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      showTitle: true,
      title: 'Accommodations',
      headline: 'Places to stay',
      eyebrow: 'Where to stay',
      layoutStyle: 'featured',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        stars: 4,
        distance: '0.3 miles',
        bookingCode: 'MAYALEO',
        bookingDeadline: 'May 20',
        image: 'https://example.com/stay.jpg',
      }],
    });
    expect(JSON.stringify(site)).not.toContain('hiddenGallery');
    expect(JSON.stringify(site)).not.toContain('providerSecret');
  });

  it('normalizes directions settings into the client-safe public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-directions',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'directions-1',
            type: 'directions',
            variant: 'pin',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'Directions & Parking',
              showTransport: true,
              transport: [{
                id: 'transport-1',
                icon: 'train',
                label: 'By train',
                description: 'Red line to Oak Station.',
                internalSchema: { secret: true },
              }],
              ownerPreview: true,
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'Travel details',
      headline: 'Directions & Parking',
      drivingTimeFrom: 'downtown',
      showTransport: true,
      transport: [{
        id: 'transport-1',
        icon: 'train',
        label: 'By train',
        description: 'Red line to Oak Station.',
      }],
    });
    expect(JSON.stringify(site)).not.toContain('internalSchema');
    expect(JSON.stringify(site)).not.toContain('ownerPreview');
  });

  it('normalizes music playlist settings into the client-safe public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-music',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'music-1',
            type: 'music',
            variant: 'playlist',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'Music for our day',
              playlists: [{
                id: 'playlist-1',
                label: 'Reception',
                spotifyUrl: 'https://open.spotify.com/playlist/dayof',
                tracks: [{
                  id: 'track-1',
                  title: 'September',
                  artist: 'Earth, Wind & Fire',
                  moment: 'Reception',
                  ownerPreview: true,
                }],
              }],
              queueTargets: ['hide-me'],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'The Soundtrack',
      headline: 'Music for our day',
      showRequestNote: true,
      playlists: [{
        id: 'playlist-1',
        label: 'Reception',
        spotifyUrl: 'https://open.spotify.com/playlist/dayof',
        tracks: [{
          id: 'track-1',
          title: 'September',
          artist: 'Earth, Wind & Fire',
          moment: 'Reception',
        }],
      }],
    });
    expect(JSON.stringify(site)).not.toContain('ownerPreview');
    expect(JSON.stringify(site)).not.toContain('queueTargets');
  });

  it('normalizes video card settings into the client-safe public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-video',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'video-1',
            type: 'video',
            variant: 'card',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'Our videos',
              background: 'soft',
              videos: [{
                id: 'video-1',
                title: 'Save the date',
                description: 'A little sneak peek.',
                videoUrl: 'https://vimeo.com/123456789',
                thumbnailUrl: 'https://example.com/poster.jpg',
                videoType: 'vimeo',
                providerSecret: 'hide-me',
              }],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      headline: 'Our videos',
      background: 'soft',
      videos: [{
        id: 'video-1',
        title: 'Save the date',
        description: 'A little sneak peek.',
        videoUrl: 'https://vimeo.com/123456789',
        thumbnailUrl: 'https://example.com/poster.jpg',
      }],
    });
    expect(JSON.stringify(site)).not.toContain('providerSecret');
  });

  it('normalizes gallery settings into the client-safe resolved public gallery contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-gallery',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'gallery-1',
            type: 'gallery',
            variant: 'masonry',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Weekend photos',
              galleryImages: [{
                id: 'img-1',
                url: 'https://example.com/photo.jpg',
                caption: 'Ceremony',
                alt: 'Ceremony flowers',
                hiddenGallery: true,
              }],
              providerSecret: 'hide-me',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'Our moments',
      headline: 'Weekend photos',
      animation: 'fade',
      showCaptions: true,
      enableLightbox: true,
      autoScroll: false,
      continuousGlide: true,
      glideSpeed: 42,
      images: [{
        id: 'img-1',
        url: 'https://example.com/photo.jpg',
        caption: 'Ceremony',
        alt: 'Ceremony flowers',
      }],
    });
    expect(JSON.stringify(site)).not.toContain('galleryImages');
    expect(JSON.stringify(site)).not.toContain('hiddenGallery');
    expect(JSON.stringify(site)).not.toContain('providerSecret');
  });

  it('normalizes countdown settings into the client-safe resolved public countdown contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-countdown',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'countdown-1',
            type: 'countdown',
            variant: 'photo',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Kara & Eric',
              showTitle: true,
              eyebrow: 'Counting down to',
              targetDate: '2026-06-14',
              message: 'See you there.',
              messageAfter: 'Today is the day!',
              showSeconds: false,
              background: 'dark',
              layoutStyle: 'photo',
              imageUrl: 'https://example.com/countdown.jpg',
              privateToken: 'hide-me',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'Counting down to',
      headline: 'Kara & Eric',
      targetDate: '2026-06-14',
      message: 'See you there.',
      messageAfter: 'Today is the day!',
      showSeconds: false,
      background: 'dark',
      layoutStyle: 'photo',
      imageUrl: 'https://example.com/countdown.jpg',
    });
    const serializedSettings = JSON.stringify(site?.render_model.pages[0]?.sections[0]?.settings);
    expect(serializedSettings).not.toContain('title');
    expect(serializedSettings).not.toContain('showTitle');
    expect(serializedSettings).not.toContain('privateToken');
  });

  it('normalizes RSVP settings into the client-safe resolved public RSVP contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-rsvp',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'rsvp-1',
            type: 'rsvp',
            variant: 'multiEvent',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Please reply',
              showTitle: true,
              eyebrow: 'Kindly reply by',
              deadlineText: 'August 1, 2026',
              deadline: '2026-08-01',
              events: [{
                id: 'event-1',
                label: 'Ceremony',
                description: 'Main celebration',
                date: '2026-09-12',
                location: 'Garden Hall',
                hiddenTimeline: true,
              }],
              confirmationMessage: 'Thanks for celebrating with us.',
              declineMessage: 'We will miss you.',
              guestNote: 'Please share any dietary needs.',
              mode: 'embed',
              embedUrl: 'https://example.com/rsvp',
              embedHeight: 820,
              layoutStyle: 'illustrated',
              imageUrl: 'https://example.com/rsvp-hero.jpg',
              visibilityRules: ['staff-only'],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'Kindly reply by',
      headline: 'Please reply',
      deadlineText: 'August 1, 2026',
      deadline: '2026-08-01',
      events: [{
        id: 'event-1',
        label: 'Ceremony',
        description: 'Main celebration',
        date: '2026-09-12',
        location: 'Garden Hall',
      }],
      confirmationMessage: 'Thanks for celebrating with us.',
      declineMessage: 'We will miss you.',
      guestNote: 'Please share any dietary needs.',
      mode: 'embed',
      embedUrl: 'https://example.com/rsvp',
      embedHeight: 820,
      layoutStyle: 'illustrated',
      imageUrl: 'https://example.com/rsvp-hero.jpg',
    });
    const serializedSettings = JSON.stringify(site?.render_model.pages[0]?.sections[0]?.settings);
    expect(serializedSettings).not.toContain('title');
    expect(serializedSettings).not.toContain('showTitle');
    expect(serializedSettings).not.toContain('hiddenTimeline');
    expect(serializedSettings).not.toContain('visibilityRules');
  });

  it('normalizes wedding-party settings into the client-safe resolved public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-party',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'party-1',
            type: 'wedding-party',
            variant: 'storyBios',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Meet our people',
              subtitle: 'The friends and family who mean the world to us.',
              bridalTitle: 'Team Kara',
              groomTitle: 'Team Eric',
              eyebrow: 'Our people',
              groupBySide: true,
              members: [{
                id: 'member-1',
                name: 'Avery Planner',
                role: 'Maid of Honor',
                photo: 'https://example.com/avery.jpg',
                note: 'Always first on the dance floor.',
                side: 'partner1',
                staffNotes: 'hide-me',
              }],
              hiddenGallery: true,
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'Our people',
      headline: 'Meet our people',
      subheadline: 'The friends and family who mean the world to us.',
      groupBySide: true,
      partner1Label: 'Team Kara',
      partner2Label: 'Team Eric',
      members: [{
        id: 'member-1',
        name: 'Avery Planner',
        role: 'Maid of Honor',
        photo: 'https://example.com/avery.jpg',
        note: 'Always first on the dance floor.',
        side: 'partner1',
      }],
    });
    const serializedSettings = JSON.stringify(site?.render_model.pages[0]?.sections[0]?.settings);
    expect(serializedSettings).not.toContain('title');
    expect(serializedSettings).not.toContain('subtitle');
    expect(serializedSettings).not.toContain('bridalTitle');
    expect(serializedSettings).not.toContain('groomTitle');
    expect(serializedSettings).not.toContain('staffNotes');
    expect(serializedSettings).not.toContain('hiddenGallery');
  });

  it('normalizes dress-code settings into the client-safe resolved public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-dress-code',
      site_slug: 'kara-eric',
      site_url: 'kara-eric',
      is_published: true,
      couple_name_1: 'Kara',
      couple_name_2: 'Eric',
      wedding_date: '2026-06-14',
      venue_name: 'Grand Pavilion',
      wedding_location: 'New York',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'dress-1',
            type: 'dress-code',
            variant: 'moodBoard',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'What to wear',
              showTitle: true,
              eyebrow: 'Dress your best',
              presetCode: 'cocktail',
              dressCodeLabel: 'Cocktail Attire',
              dressCode: 'Cocktail',
              description: 'Elegant and comfortable.',
              colorPalette: [{
                id: 'swatch-1',
                color: '#d4c5a9',
                label: 'Sand',
                providerSecret: 'hide-me',
              }],
              moodImages: [{
                id: 'img-1',
                url: 'https://example.com/look.jpg',
                alt: 'Style inspiration',
                adminEmail: 'hide@example.com',
              }],
              colorNote: 'Avoid white.',
              additionalNote: 'Grass lawn ceremony.',
              avoidNote: 'No denim.',
              layoutStyle: 'moodBoard',
              formalityLevel: 3,
              plannerNotes: 'private',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      eyebrow: 'Dress your best',
      headline: 'What to wear',
      presetCode: 'cocktail',
      dressCodeLabel: 'Cocktail Attire',
      dressCode: 'Cocktail',
      description: 'Elegant and comfortable.',
      colorPalette: [{
        id: 'swatch-1',
        color: '#d4c5a9',
        label: 'Sand',
      }],
      moodImages: [{
        id: 'img-1',
        url: 'https://example.com/look.jpg',
        alt: 'Style inspiration',
      }],
      colorNote: 'Avoid white.',
      additionalNote: 'Grass lawn ceremony.',
      avoidNote: 'No denim.',
      layoutStyle: 'moodBoard',
      formalityLevel: 3,
    });
    const serializedSettings = JSON.stringify(site?.render_model.pages[0]?.sections[0]?.settings);
    expect(serializedSettings).not.toContain('title');
    expect(serializedSettings).not.toContain('showTitle');
    expect(serializedSettings).not.toContain('providerSecret');
    expect(serializedSettings).not.toContain('adminEmail');
    expect(serializedSettings).not.toContain('plannerNotes');
  });

  it('rejects malformed public site payloads instead of passing them through', () => {
    expect(sanitizePublicSiteSafeRow(null)).toBeNull();
    expect(sanitizePublicSiteSafeRow([])).toBeNull();
    expect(sanitizePublicSiteSafeRow({ site_slug: 'missing-id' })).toBeNull();
  });

  it('keeps bindings only for public section families that actually consume them', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-2',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
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
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const sections = site?.render_model.pages[0]?.sections ?? [];
    expect(sections[0]?.bindings).toBeUndefined();
    expect(sections[1]?.bindings).toEqual({ venueIds: ['venue-1'] });
    expect(sections[2]?.bindings).toEqual({ scheduleItemIds: ['schedule-1'] });
    expect(sections[3]?.bindings).toEqual({ linkIds: ['registry-1'] });
    expect(sections[4]?.bindings).toEqual({ faqIds: ['faq-1'] });
  });

  it('keeps only the explicit public contact fields in client-safe render payloads', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-contacts',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'contact-1',
            type: 'contact',
            variant: 'form',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Need help?',
              subtitle: 'Reach out any time.',
              contacts: [{
                id: 'planner-1',
                name: 'Avery Planner',
                role: 'Planner',
                email: 'avery@example.com',
                phone: '+1 212 555 1111',
                instagram: '@averyplans',
                collaborator_permissions: ['owner'],
                adminEmail: 'private@example.com',
              }],
              quizPrompt: 'should not survive',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    expect(site?.render_model.pages[0]?.sections[0]?.settings).toEqual({
      showTitle: true,
      eyebrow: 'Need help?',
      emailSubject: 'Wedding Question',
      headline: 'Need help?',
      subheadline: 'Reach out any time.',
      contacts: [{
        id: 'planner-1',
        name: 'Avery Planner',
        role: 'Planner',
        email: 'avery@example.com',
        phone: '+1 212 555 1111',
        instagram: '@averyplans',
      }],
    });
    expect(JSON.stringify(site)).not.toContain('collaborator_permissions');
    expect(JSON.stringify(site)).not.toContain('adminEmail');
    expect(JSON.stringify(site)).not.toContain('quizPrompt');
  });

  it('normalizes footer cta aliases into the client-safe public footer contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-3',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'footer-1',
            type: 'footer-cta',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'We hope to see you there',
              ctaLabel: 'Send RSVP',
              ctaHref: '/site/maya-leo#rsvp',
              monogram: 'M & L',
              photoUrl: 'https://example.com/photo.jpg',
              footerNote: 'Please RSVP by August 1',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      headline: 'We hope to see you there',
      buttonLabel: 'Send RSVP',
      rsvpUrl: '/site/maya-leo#rsvp',
      footerNote: 'Please RSVP by August 1',
    });
    expect(settings).not.toHaveProperty('ctaLabel');
    expect(settings).not.toHaveProperty('ctaHref');
    expect(settings).not.toHaveProperty('monogram');
    expect(settings).not.toHaveProperty('photoUrl');
  });

  it('drops nested interactive contact payloads from the client-safe public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-4',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
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
              poll: { id: 'poll-secret', queueTargets: ['hide-me'] },
              quiz: { id: 'quiz-secret', staffNotes: 'hide-me' },
              suggestionPlaceholder: 'Type your idea...',
              contacts: [{ id: 'c1', phone: '+1 555-0101' }],
              contactInfo: 'private concierge',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
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

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('poll-secret');
    expect(serialized).not.toContain('quiz-secret');
    expect(serialized).not.toContain('queueTargets');
    expect(serialized).not.toContain('staffNotes');
    expect(serialized).not.toContain('suggestionPlaceholder');
    expect(serialized).not.toContain('contactInfo');
  });

  it('normalizes contact form title aliases into the client-safe resolved renderer fields', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-5',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
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
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      headline: 'Questions for us?',
      subheadline: 'We are happy to help.',
      introText: 'Reach out any time.',
      contacts: [{ id: 'c1', email: 'hide@example.com' }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('"title":"Questions for us?"');
    expect(serialized).not.toContain('"subtitle":"We are happy to help."');
  });

  it('allowlists menu tab courses into the client-safe public contract without stale aliases or nested private fields', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-menu-tabs',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'menu-1',
            type: 'menu',
            variant: 'tabs',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Dinner menu',
              subtitle: 'What we are serving',
              note: 'Please tell us about allergies.',
              showDietaryIcons: true,
              showDietaryKey: true,
              courses: [{
                id: 'course-1',
                label: 'Main course',
                items: [{
                  id: 'item-1',
                  name: 'Herb-Crusted Salmon',
                  description: 'Lemon butter and asparagus.',
                  dietary: ['gluten-free'],
                  adminEmail: 'hide@example.com',
                }],
              }],
              footerNote: 'Legacy footer',
              queueTargets: ['hide-me'],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toEqual({
      eyebrow: 'Dining',
      headline: 'Dinner menu',
      subtitle: 'What we are serving',
      note: 'Please tell us about allergies.',
      showDietaryIcons: true,
      courses: [{
        id: 'course-1',
        label: 'Main course',
        items: [{
          id: 'item-1',
          name: 'Herb-Crusted Salmon',
          description: 'Lemon butter and asparagus.',
          dietary: ['gluten-free'],
        }],
      }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showDietaryKey');
    expect(settings).not.toHaveProperty('footerNote');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('adminEmail');
    expect(serialized).not.toContain('queueTargets');
    expect(serialized).not.toContain('"title":"Dinner menu"');
  });

  it('allowlists venue, schedule, registry, and FAQ settings into the client-safe public contract without stale aliases or nested private fields', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-core-families',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [
            {
              id: 'venue-1',
              type: 'venue',
              variant: 'detailsFirst',
              enabled: true,
              orderIndex: 0,
              settings: {
                title: 'Where to go',
                subtitle: 'One beautiful place.',
                venues: [{ id: 'venue-card', name: 'Garden Hall', details: [{ id: 'detail-1', label: 'Time', value: '4:00 PM', adminEmail: 'hide@example.com' }] }],
              },
            },
            {
              id: 'schedule-1',
              type: 'schedule',
              variant: 'dayTabs',
              enabled: true,
              orderIndex: 1,
              settings: {
                title: 'Weekend plans',
                days: [{ id: 'day-1', label: 'Friday', events: [{ id: 'event-1', label: 'Welcome drinks', time: '6:00 PM', internalNotes: 'hide-me' }] }],
              },
            },
            {
              id: 'registry-1',
              type: 'registry',
              variant: 'featured',
              enabled: true,
              orderIndex: 2,
              settings: {
                title: 'Registry',
                storeLinks: [{ id: 'store-1', store: 'Crate & Barrel', url: 'https://example.com/store', adminEmail: 'hide@example.com' }],
                featuredGifts: [{ id: 'gift-1', name: 'Dinner plates', url: 'https://example.com/gift', billingStatus: 'private' }],
              },
            },
            {
              id: 'faq-1',
              type: 'faq',
              variant: 'tabbed',
              enabled: true,
              orderIndex: 3,
              settings: {
                title: 'Guest questions',
                subtitle: 'Helpful notes.',
                items: [{ id: 'faq-1', question: 'Where should I stay?', answer: 'Harbor Hotel.', queueTargets: ['hide-me'] }],
              },
            },
          ],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const sections = site?.render_model.pages[0]?.sections ?? [];
    expect(sections[0]?.settings).toMatchObject({
      headline: 'Where to go',
      subheadline: 'One beautiful place.',
      venues: [{ id: 'venue-card', name: 'Garden Hall', details: [{ id: 'detail-1', label: 'Time', value: '4:00 PM' }] }],
    });
    expect(sections[1]?.settings).toMatchObject({
      headline: 'Weekend plans',
      days: [{ id: 'day-1', label: 'Friday', events: [{ id: 'event-1', label: 'Welcome drinks', time: '6:00 PM' }] }],
    });
    expect(sections[2]?.settings).toMatchObject({
      headline: 'Registry',
      storeLinks: [{ id: 'store-1', store: 'Crate & Barrel', url: 'https://example.com/store' }],
      featuredGifts: [{ id: 'gift-1', name: 'Dinner plates', url: 'https://example.com/gift' }],
    });
    expect(sections[3]?.settings).toMatchObject({
      headline: 'Guest questions',
      subheadline: 'Helpful notes.',
      items: [{ id: 'faq-1', question: 'Where should I stay?', answer: 'Harbor Hotel.' }],
    });

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('"title":"Where to go"');
    expect(serialized).not.toContain('"title":"Weekend plans"');
    expect(serialized).not.toContain('adminEmail');
    expect(serialized).not.toContain('internalNotes');
    expect(serialized).not.toContain('billingStatus');
    expect(serialized).not.toContain('queueTargets');
  });

  it('hides raw public access backend errors', () => {
    expect(safePublicSiteAccessError('Supabase policy denied access to site_password_hash token')).toBe(
      'Could not check this wedding site right now. Please try again.',
    );
    expect(safePublicSiteAccessError('Too many password attempts. Please wait a minute and try again.')).toBe(
      'Too many password attempts. Please wait a minute and try again.',
    );
  });

  it('keeps public-site gate artifacts in session storage only', () => {
    const siteView = readFileSync('src/pages/SiteView.tsx', 'utf8');
    const artifacts = readFileSync('src/lib/publicAccessArtifacts.ts', 'utf8');

    expect(artifacts).toContain('sessionStorage.getItem(getPublicInviteTokenStorageKey(slug))');
    expect(artifacts).toContain('sessionStorage.getItem(getPublicPasswordSessionStorageKey(slug))');
    expect(artifacts).toContain('sessionStorage.setItem(getPublicInviteTokenStorageKey(slug), token)');
    expect(artifacts).toContain('sessionStorage.setItem(getPublicPasswordSessionStorageKey(slug), value)');
    expect(siteView).toContain('clearStoredPublicInviteToken(resolvedSlug)');
    expect(artifacts).toContain('passwordSession: readStoredPublicPasswordSession(slug)');
    expect(siteView).toContain('writeStoredPublicPasswordSession(resolvedSlug, result.passwordSession)');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.getItem(INVITE_TOKEN_KEY)');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.setItem(INVITE_TOKEN_KEY');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.getItem(PASSWORD_SESSION_KEY)');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.setItem(PASSWORD_SESSION_KEY');
  });
});
